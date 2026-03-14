import { App } from '@slack/bolt';
import fetch from 'node-fetch';
import { formatNowMessage, formatDoneMessage, formatAllTasksMessage } from './formatter';

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

export function registerCommands(app: App) {
  // /now slash command
  app.command('/now', async ({ command, ack, respond }) => {
    await ack();

    await respond({
      text: ':hourglass_flowing_sand: Scanning your Slack, calendar, and meetings...',
      response_type: 'ephemeral'
    });

    try {
      const res = await fetch(`${API_BASE}/api/now`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: command.user_id,
          user_name: command.user_name
        })
      });

      const decision = await res.json();
      const message = formatNowMessage(decision);

      await respond({
        ...message,
        response_type: 'ephemeral',
        replace_original: true
      });
    } catch (err) {
      console.error('/now error:', err);
      await respond({
        text: ':x: Something went wrong. Is the AI pipeline running?',
        response_type: 'ephemeral',
        replace_original: true
      });
    }
  });

  // Done button
  app.action('task_done', async ({ action, ack, respond }) => {
    await ack();
    const taskId = (action as any).value;

    try {
      const res = await fetch(`${API_BASE}/api/done`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId, action: 'done' })
      });

      const data = await res.json();
      const message = formatDoneMessage(data.next_task || null);
      await respond(message);
    } catch (err) {
      console.error('task_done error:', err);
      await respond({ text: ':x: Failed to mark task as done.' });
    }
  });

  // Skip button
  app.action('task_skip', async ({ action, ack, respond }) => {
    await ack();
    const taskId = (action as any).value;

    try {
      const res = await fetch(`${API_BASE}/api/done`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId, action: 'skip' })
      });

      const data = await res.json();
      const message = formatDoneMessage(data.next_task || null);
      await respond(message);
    } catch (err) {
      console.error('task_skip error:', err);
      await respond({ text: ':x: Failed to skip task.' });
    }
  });

  // See all tasks
  app.action('see_all', async ({ ack, respond }) => {
    await ack();

    try {
      const res = await fetch(`${API_BASE}/api/tasks`);
      const tasks = await res.json();
      const message = formatAllTasksMessage(tasks);
      await respond(message);
    } catch (err) {
      console.error('see_all error:', err);
      await respond({ text: ':x: Failed to fetch tasks.' });
    }
  });
}
