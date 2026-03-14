import 'dotenv/config';
import express, { Request, Response } from 'express';
import { App } from '@slack/bolt';
import { registerCommands } from './commands';
import { extractTasks } from './extract';
import { makeDecision } from './decide';
import { Task, Decision } from './types';
import { getSlackContext } from './slack-reader';

const PORT = process.env.PORT || 3000;

// --- Per-user session store ---
interface UserSession {
  tasks: Map<string, Task>;
  decision: Decision | null;
  lastUpdated: number;
}

const sessions = new Map<string, UserSession>();
const SESSION_TTL = 60 * 60 * 1000; // 1 hour

function getSession(userId: string): UserSession {
  let session = sessions.get(userId);
  if (!session || Date.now() - session.lastUpdated > SESSION_TTL) {
    session = { tasks: new Map(), decision: null, lastUpdated: Date.now() };
    sessions.set(userId, session);
  }
  return session;
}

// Cleanup old sessions every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.lastUpdated > SESSION_TTL) sessions.delete(id);
  }
}, 30 * 60 * 1000);

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

// --- Input validation ---
function validateUserId(id: unknown): string | null {
  if (typeof id !== 'string') return null;
  const clean = id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 50);
  return clean || null;
}

async function gatherInputs(userId: string) {
  const slack = await getSlackContext(userId);
  // TODO: Google Meet transcript + Calendar (Person C)
  const transcript = '';
  const calendar = '';
  return { slack, transcript, calendar };
}

// --- Mock data fallbacks ---
const MOCK_DECISION: Decision = {
  now: {
    task_id: 't1',
    title: 'Fix Shopify webhook',
    reason: 'Eric mentioned this 3x, blocking deploy',
    estimated_minutes: 9
  },
  up_next: [
    { task_id: 't2', title: 'Review PR #42', reason: 'Sarah requested review this morning', estimated_minutes: 15 },
    { task_id: 't3', title: 'Update API docs', reason: 'Needed before client demo at 4pm', estimated_minutes: 20 }
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
api.use(express.json());

api.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'ClearNext server is running' });
});

api.post('/api/now', async (req: Request, res: Response) => {
  const userId = validateUserId(req.body.user_id);
  const userName = typeof req.body.user_name === 'string' ? req.body.user_name.slice(0, 100) : 'User';

  if (!userId) {
    res.status(400).json({ error: 'Invalid user_id' });
    return;
  }

  if (isRateLimited(userId)) {
    res.status(429).json({ error: 'Too many requests. Try again in a minute.' });
    return;
  }

  try {
    const inputs = await gatherInputs(userId);
    const tasks = await extractTasks(inputs.slack, inputs.transcript, inputs.calendar, userName);

    if (tasks.length === 0) {
      res.json({ ...MOCK_DECISION, is_mock: true });
      return;
    }

    const session = getSession(userId);
    session.tasks.clear();
    tasks.forEach(t => session.tasks.set(t.id, t));
    session.lastUpdated = Date.now();

    const decision = await makeDecision(tasks, userName);
    if (!decision) {
      res.json({ ...MOCK_DECISION, is_mock: true });
      return;
    }

    session.decision = decision;
    res.json(decision);
  } catch (err) {
    console.error('/api/now error:', (err as Error).message);
    res.json({ ...MOCK_DECISION, is_mock: true });
  }
});

api.post('/api/done', async (req: Request, res: Response) => {
  const { task_id, action } = req.body;
  const userId = validateUserId(req.body.user_id);

  // Find the session that has this task
  let session: UserSession | undefined;
  if (userId) {
    session = sessions.get(userId);
  }
  // Fallback: search all sessions for the task
  if (!session) {
    for (const s of sessions.values()) {
      if (s.tasks.has(task_id)) { session = s; break; }
    }
  }

  if (session) {
    const task = session.tasks.get(task_id);
    if (task) task.done = true;

    if (session.decision && session.decision.up_next.length > 0) {
      const nextTask = session.decision.up_next.shift()!;
      session.decision.now = nextTask;
      res.json({ next_task: nextTask });
      return;
    }
  }

  res.json({ next_task: null });
});

api.post('/api/later', async (req: Request, res: Response) => {
  const userId = validateUserId(req.body.user_id);
  const userName = typeof req.body.user_name === 'string' ? req.body.user_name.slice(0, 100) : 'User';
  const text = typeof req.body.text === 'string' ? req.body.text.slice(0, 500) : '';

  if (!userId || !text) {
    res.status(400).json({ error: 'Invalid user_id or empty text' });
    return;
  }

  const session = getSession(userId);
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

  session.tasks.set(taskId, task);
  session.lastUpdated = Date.now();

  res.json({ task, total_tasks: session.tasks.size });
});

api.get('/api/tasks', async (req: Request, res: Response) => {
  const userId = validateUserId(req.query.user_id);

  if (userId) {
    const session = sessions.get(userId);
    if (session && session.tasks.size > 0) {
      res.json(Array.from(session.tasks.values()));
      return;
    }
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
  if (!process.env.GEMINI_API_KEY) {
    console.warn('Missing GEMINI_API_KEY — AI pipeline will use mock data');
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
