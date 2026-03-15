import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { App } from '@slack/bolt';
import { registerCommands } from './commands';
import { extractTasks } from './extract';
import { makeDecision } from './decide';
import { Task, Decision } from './types';
import { getSlackContext } from './slack-reader';
import meetRouter, { getGoogleCalendarContext, getGoogleMeetContext } from './routes/meet';
import { addTask, getTasks, saveTasks, markTaskDone, saveDecision, getLatestDecision, storeUserProviderToken, getUserProviderToken, getMoods, addMood, getCurrentMood, MoodEntry } from './supabase';

const LOW_ENERGY_THRESHOLD = 50;

function isLowEnergy(moods: MoodEntry[]): boolean {
  const current = getCurrentMood(moods);
  return !!current && current.level <= LOW_ENERGY_THRESHOLD;
}

function reverseDecisionOrder(decision: Decision): Decision {
  if (decision.up_next.length === 0) return decision;
  const reversed = [...decision.up_next].reverse();
  const [newNow, ...rest] = [decision.now, ...reversed].reverse();
  return { ...decision, now: newNow, up_next: rest };
}
import { requireAuth, AuthenticatedRequest } from './middleware/auth';

const PORT = process.env.PORT || 3000;
const REFRESH_COOLDOWN_MS = 1000; // 1 second (demo mode)

// --- Rate limiting (per user, 10 req/min) ---
const rateLimits = new Map<string, number[]>();
function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const window = 60_000;
  const maxRequests = 10;

  let timestamps = rateLimits.get(userId) || [];
  timestamps = timestamps.filter(t => now - t < window);
  if (timestamps.length >= maxRequests) return true;
  timestamps.push(now);
  rateLimits.set(userId, timestamps);
  return false;
}

interface GatherResult {
  slack: string;
  transcript: string;
  calendar: string;
  hints: string[];
}

async function gatherInputs(userId: string, userName: string, slackUserId: string | null): Promise<GatherResult> {
  const hasSlack = !!slackUserId;
  const hasGoogle = !!(await getUserProviderToken(userId, 'google'));

  const hints: string[] = [];
  let slack = '';
  let transcript = '';
  let calendar = '';

  if (hasSlack) {
    try {
      slack = await getSlackContext(slackUserId!);
    } catch (err) {
      console.error('Failed to fetch Slack context:', (err as Error).message);
    }
  } else {
    hints.push('Connect Slack to let ClearNext surface tasks buried in your messages.');
  }

  if (hasGoogle) {
    try {
      [transcript, calendar] = await Promise.all([
        getGoogleMeetContext(userName, userId),
        getGoogleCalendarContext(userId),
      ]);
    } catch (err) {
      console.error('Failed to fetch Google context:', (err as Error).message);
    }
  } else {
    hints.push('Connect Google to pull action items from meetings and your calendar.');
  }

  return { slack, transcript, calendar, hints };
}

function buildFallbackDecision(tasks: Task[]): Decision {
  const pending = tasks.filter(t => !t.done);
  if (pending.length === 0) {
    return {
      now: { task_id: '', title: 'All done!', reason: 'No pending tasks', estimated_minutes: 0, source: 'slack', reward: 0, status: 'completed' },
      up_next: [],
      context_blocks: [],
      total_tasks: 0,
      estimated_total_minutes: 0
    };
  }

  const [first, ...rest] = pending;
  return {
    now: {
      task_id: first.id,
      title: first.title,
      reason: first.description || 'Task from your connected sources',
      estimated_minutes: 15,
      source: first.source,
      reward: 0.10,
      status: 'pending'
    },
    up_next: rest.map(t => ({
      task_id: t.id,
      title: t.title,
      reason: t.description || '',
      estimated_minutes: 15,
      source: t.source,
      reward: 0.10,
      status: 'pending' as const
    })),
    context_blocks: [],
    total_tasks: pending.length,
    estimated_total_minutes: pending.length * 15
  };
}

// --- Mock data fallbacks ---
const MOCK_DECISION: Decision = {
  now: {
    task_id: 't1',
    title: 'Fix Shopify webhook',
    reason: 'Eric mentioned this 3x, blocking deploy',
    estimated_minutes: 9,
    source: 'slack',
    reward: 0.19,
    status: 'pending'
  },
  up_next: [
    { task_id: 't2', title: 'Review PR #42', reason: 'Sarah requested review this morning', estimated_minutes: 15, source: 'slack', reward: 0.10, status: 'pending' },
    { task_id: 't3', title: 'Update API docs', reason: 'Needed before client demo at 4pm', estimated_minutes: 20, source: 'meet', reward: 0.15, status: 'pending' }
  ],
  context_blocks: [
    { name: 'Shopify Integration', task_ids: ['t1', 't3'], do_first: true },
    { name: 'Code Review', task_ids: ['t2'], do_first: false }
  ],
  total_tasks: 5,
  estimated_total_minutes: 145
};

const MOCK_TASKS: Task[] = [
  { id: 't1', title: 'Fix Shopify webhook', description: 'Webhook broken since yesterday', source: 'slack', assigned_to_user: true, urgency_signals: ['today', 'ASAP', 'blocking'], mentioned_by: 'Eric', mentioned_count: 3, deadline_hint: null, raw_quote: 'Webhook is still down, this is urgent' },
  { id: 't2', title: 'Review PR #42', description: 'Sarah needs PR review', source: 'slack', assigned_to_user: true, urgency_signals: ['today'], mentioned_by: 'Sarah', mentioned_count: 1, deadline_hint: 'today', raw_quote: 'please review PR #42' },
  { id: 't3', title: 'Update API docs', description: 'Needed before client demo', source: 'meet', assigned_to_user: true, urgency_signals: ['before demo'], mentioned_by: 'Manager', mentioned_count: 2, deadline_hint: '4pm today', raw_quote: 'API docs need to be updated before then' }
];

// --- Express API server ---
const api = express();
api.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3001'], credentials: true }));
api.use(express.json());

api.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'ClearNext server is running' });
});

api.use('/meet', meetRouter);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// --- Store provider token endpoint ---
api.post('/api/auth/store-token', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const { provider_token, provider_refresh_token, provider } = req.body;

  if (!provider_token || !provider) {
    res.status(400).json({ error: 'Missing provider_token or provider' });
    return;
  }

  try {
    await storeUserProviderToken(authReq.userId, provider, provider_token, provider_refresh_token || null);
    res.json({ success: true });
  } catch (err) {
    console.error('store-token error:', (err as Error).message);
    res.status(500).json({ error: (err as Error).message });
  }
});

api.post('/api/now', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.userId;
  const userName = authReq.userName;
  if (isRateLimited(userId)) {
    res.status(429).json({ error: 'Too many requests. Try again in a minute.' });
    return;
  }

  try {
    const moods = await getMoods(userId);
    const lowEnergy = isLowEnergy(moods);

    const latest = await getLatestDecision(userId);
    if (latest) {
      const age = Date.now() - new Date(latest.created_at).getTime();
      if (age < REFRESH_COOLDOWN_MS) {
        const tasks = await getTasks(userId);
        const pendingTasks = tasks.filter(t => !t.done);

        const decision = latest.decision;
        const pendingIds = new Set(pendingTasks.map(t => t.id));

        const filteredUpNext = decision.up_next.filter(t => pendingIds.has(t.task_id));
        const nowStillPending = pendingIds.has(decision.now?.task_id);

        let adjustedDecision: Decision;
        if (nowStillPending) {
          adjustedDecision = { ...decision, up_next: filteredUpNext };
        } else if (filteredUpNext.length > 0) {
          const [newNow, ...rest] = filteredUpNext;
          adjustedDecision = { ...decision, now: newNow, up_next: rest };
        } else {
          adjustedDecision = { ...decision, now: decision.now, up_next: [] };
        }

        if (lowEnergy) adjustedDecision = reverseDecisionOrder(adjustedDecision);

        res.json({ ...adjustedDecision, cached: true, tasks: pendingTasks, fetched_at: latest.created_at });
        return;
      }
    }

    const inputs = await gatherInputs(userId, userName, authReq.slackUserId);
    const newTasks = await extractTasks(inputs.slack, inputs.transcript, inputs.calendar, userName);

    if (newTasks.length === 0) {
      const existingTasks = await getTasks(userId);
      const pendingExisting = existingTasks.filter(t => !t.done);
      if (pendingExisting.length > 0) {
        const decision = await makeDecision(pendingExisting, userName);
        let finalDecision = decision || buildFallbackDecision(pendingExisting);
        if (lowEnergy) finalDecision = reverseDecisionOrder(finalDecision);
        await saveDecision(userId, finalDecision);
        res.json({ ...finalDecision, hints: inputs.hints, tasks: pendingExisting, fetched_at: new Date().toISOString() });
        return;
      }
      res.json({ ...MOCK_DECISION, is_mock: true, hints: inputs.hints });
      return;
    }

    await saveTasks(userId, newTasks);
    const pendingTasks = newTasks;

    if (pendingTasks.length === 0) {
      const allDone = buildFallbackDecision([]);
      res.json({ ...allDone, hints: inputs.hints, tasks: [], fetched_at: new Date().toISOString() });
      return;
    }

    const decision = await makeDecision(pendingTasks, userName);
    let finalDecision = decision || buildFallbackDecision(pendingTasks);
    if (lowEnergy) finalDecision = reverseDecisionOrder(finalDecision);

    await saveDecision(userId, finalDecision);
    res.json({ ...finalDecision, hints: inputs.hints, tasks: pendingTasks, fetched_at: new Date().toISOString() });
  } catch (err) {
    console.error('/api/now error:', (err as Error).message);
    try {
      const existingTasks = await getTasks(userId);
      const pending = existingTasks.filter(t => !t.done);
      if (pending.length > 0) {
        const moods = await getMoods(userId);
        let fallback: Decision = buildFallbackDecision(pending);
        if (isLowEnergy(moods)) fallback = reverseDecisionOrder(fallback);
        res.json({ ...fallback, tasks: pending, fetched_at: new Date().toISOString() });
        return;
      }
    } catch { /* DB also failed, fall through to mock */ }
    res.json({ ...MOCK_DECISION, is_mock: true });
  }
});

api.post('/api/done', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const { task_id } = req.body;
  const userId = authReq.userId;

  if (!task_id) {
    res.status(400).json({ error: 'Missing task_id' });
    return;
  }

  const allTasks = await markTaskDone(userId, task_id);
  const pendingTasks = allTasks.filter(t => !t.done);

  // Check latest decision for ordering
  const latest = await getLatestDecision(userId);
  if (latest) {
    const decision = latest.decision;
    const pendingIds = new Set(pendingTasks.map(t => t.id));

    // Find next task from the decision's up_next that's still pending
    const nextFromDecision = decision.up_next.find(t => pendingIds.has(t.task_id) && t.task_id !== task_id);
    if (nextFromDecision) {
      res.json({ next_task: nextFromDecision, remaining: pendingTasks.length });
      return;
    }
  }

  res.json({ next_task: null, remaining: pendingTasks.length });
});

api.post('/api/later', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.userId;
  const userName = authReq.userName;
  const text = typeof req.body.text === 'string' ? req.body.text.slice(0, 500) : '';

  if (!text) {
    res.status(400).json({ error: 'Empty text' });
    return;
  }

  const taskId = `t_${Date.now()}_manual`;
  const task: Task = {
    id: taskId,
    title: text.split(' ').slice(0, 8).join(' '),
    description: text,
    source: 'slack',
    assigned_to_user: true,
    urgency_signals: [],
    mentioned_by: userName,
    mentioned_count: 1,
    deadline_hint: null,
    raw_quote: text,
    done: false
  };

  const allTasks = await addTask(userId, task);
  res.json({ task, total_tasks: allTasks.length });
});

api.get('/api/recap', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.userId;

  const allTasks = await getTasks(userId);

  if (allTasks.length === 0) {
    res.json({ done_tasks: [], remaining_tasks: [], total_minutes: 0 });
    return;
  }

  const doneTasks = allTasks.filter(t => t.done);
  const remainingTasks = allTasks.filter(t => !t.done);

  const latest = await getLatestDecision(userId);
  const totalMinutes = latest?.decision.estimated_total_minutes
    ? Math.max(0, latest.decision.estimated_total_minutes - (doneTasks.length * 15))
    : remainingTasks.length * 15;

  res.json({ done_tasks: doneTasks, remaining_tasks: remainingTasks, total_minutes: totalMinutes });
});

api.get('/api/mood', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const moods = await getMoods(authReq.userId);
  res.json({ moods, current: getCurrentMood(moods) });
});

api.post('/api/mood', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const { label, emoji, level } = req.body;

  if (!label || !emoji || typeof level !== 'number') {
    res.status(400).json({ error: 'Missing label, emoji, or level' });
    return;
  }

  const entry: MoodEntry = { label, emoji, level, timestamp: new Date().toISOString() };
  const moods = await addMood(authReq.userId, entry);
  res.json({ moods, current: getCurrentMood(moods) });
});

api.get('/api/tasks', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.userId;

  const dbTasks = await getTasks(userId);
  if (dbTasks.length > 0) {
    res.json(dbTasks);
    return;
  }

  res.json(MOCK_TASKS);
});

// --- Startup validation ---
function validateEnv() {
  const required = ['SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET', 'SLACK_APP_TOKEN'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    console.warn(`Missing env vars: ${missing.join(', ')} — Slack bot will not start`);
  }
  if (!process.env.GROQ_API_KEY) {
    console.warn('Missing GROQ_API_KEY — AI pipeline will use mock data');
  }
  if (!process.env.SUPABASE_URL || !(process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY)) {
    console.warn('Missing SUPABASE_URL/SUPABASE_KEY — tasks will only persist in memory');
  }
  if (!process.env.INTERNAL_API_KEY) {
    console.warn('Missing INTERNAL_API_KEY — Slack bot commands will fail auth');
  }
}

// --- Slack Bolt app ---
const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true
});

registerCommands(slackApp);

// --- Start both ---
async function start() {
  validateEnv();

  api.listen(PORT, () => {
    console.log(`API server listening on port ${PORT}`);
  });

  try {
    await slackApp.start();
    console.log('Slack bot connected (Socket Mode)');
  } catch (err) {
    console.error('Slack bot failed to start:', (err as Error).message);
    console.log('API server still running — Slack bot disabled');
  }
}

start();
