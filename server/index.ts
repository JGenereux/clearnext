import 'dotenv/config';
import express, { Request, Response } from 'express';
import { App } from '@slack/bolt';
import { registerCommands } from './commands';

const PORT = process.env.PORT || 3000;

// --- Express API server ---
const api = express();
api.use(express.json());

api.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'ClearNext server is running' });
});

// These endpoints are called by the Slack bot commands
// They proxy to the AI pipeline (Person B) once it's running

api.post('/api/now', async (req: Request, res: Response) => {
  const { user_id, user_name } = req.body;

  try {
    // Call the AI pipeline
    const pipelineRes = await fetch(`http://localhost:3002/api/now`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id, user_name })
    });
    const decision = await pipelineRes.json();
    res.json(decision);
  } catch {
    // Fallback mock for development when pipeline isn't running
    res.json({
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
    });
  }
});

api.post('/api/done', async (req: Request, res: Response) => {
  const { task_id, action } = req.body;

  try {
    const pipelineRes = await fetch(`http://localhost:3002/api/done`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id, action })
    });
    const data = await pipelineRes.json();
    res.json(data);
  } catch {
    // Fallback mock
    res.json({
      next_task: {
        task_id: 't2',
        title: 'Review PR #42',
        reason: 'Sarah requested review this morning',
        estimated_minutes: 15
      }
    });
  }
});

api.get('/api/tasks', async (_req: Request, res: Response) => {
  try {
    const pipelineRes = await fetch(`http://localhost:3002/api/tasks`);
    const tasks = await pipelineRes.json();
    res.json(tasks);
  } catch {
    // Fallback mock
    res.json([
      { id: 't1', title: 'Fix Shopify webhook', source: 'slack', urgency_signals: ['today'], done: false },
      { id: 't2', title: 'Review PR #42', source: 'slack', urgency_signals: [], done: false },
      { id: 't3', title: 'Update API docs', source: 'meet', urgency_signals: ['before demo'], done: false }
    ]);
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
