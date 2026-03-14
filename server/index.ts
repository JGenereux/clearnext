import 'dotenv/config';
import express, { Request, Response } from 'express';
import { App } from '@slack/bolt';
import { registerCommands } from './commands';
import { extractTasks } from './extract';
import { makeDecision } from './decide';
import { Task, Decision } from './types';

const PORT = process.env.PORT || 3000;

// --- In-memory task store ---
let taskStore = new Map<string, Task>();
let currentDecision: Decision | null = null;

// Temporary sample data until integrations (Person C) are ready
async function gatherInputs(_userId: string) {
  return {
    slack: `Eric: Can someone fix the Shopify webhook? It's been broken since yesterday and blocking deploy.
Sarah: @user please review PR #42 when you get a chance, need it merged today
Eric: Webhook is still down, this is urgent, need it fixed ASAP
Manager: Team standup notes — @user owns the API docs update before client demo
DM from Sarah: Hey can you also check the staging environment? Something looks off`,
    transcript: `Meeting notes: We discussed the client demo happening at 4pm today. The API docs need to be updated before then. Eric mentioned the Shopify webhook is still broken and it's blocking the deploy pipeline. Sarah asked for PR #42 to be reviewed.`,
    calendar: `2:00 PM - Team Standup (with Eric, Sarah, Manager)
4:00 PM - Client Demo (hard deadline, with Sarah, Eric, Client Team)
5:30 PM - 1:1 with Manager`
  };
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
  const { user_id, user_name } = req.body;

  try {
    const inputs = await gatherInputs(user_id);
    const tasks = await extractTasks(inputs.slack, inputs.transcript, inputs.calendar, user_name || 'User');

    if (tasks.length === 0) {
      currentDecision = MOCK_DECISION;
      res.json(MOCK_DECISION);
      return;
    }

    // Store tasks
    taskStore.clear();
    tasks.forEach(t => taskStore.set(t.id, t));

    const decision = await makeDecision(tasks, user_name || 'User');
    if (!decision) {
      currentDecision = MOCK_DECISION;
      res.json(MOCK_DECISION);
      return;
    }

    currentDecision = decision;
    res.json(decision);
  } catch (err) {
    console.error('/api/now error:', err);
    currentDecision = MOCK_DECISION;
    res.json(MOCK_DECISION);
  }
});

api.post('/api/done', async (req: Request, res: Response) => {
  const { task_id, action } = req.body;

  const task = taskStore.get(task_id);
  if (task) {
    task.done = true;
  }

  // Return next task from decision
  if (currentDecision && currentDecision.up_next.length > 0) {
    const nextTask = currentDecision.up_next.shift()!;
    currentDecision.now = nextTask;
    res.json({ next_task: nextTask });
  } else {
    res.json({ next_task: null });
  }
});

api.get('/api/tasks', async (_req: Request, res: Response) => {
  if (taskStore.size > 0) {
    res.json(Array.from(taskStore.values()));
  } else {
    res.json(MOCK_TASKS);
  }
});

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
  api.listen(PORT, () => {
    console.log(`API server listening on port ${PORT}`);
  });

  try {
    await slackApp.start();
    console.log('Slack bot connected (Socket Mode)');
  } catch (err) {
    console.error('Slack bot failed to start (missing tokens?):', (err as Error).message);
    console.log('API server still running — Slack bot disabled');
  }
}

start();
