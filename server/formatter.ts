import { Decision, NowTask, Task } from './types';

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 3) + '...' : text;
}

export function formatNowMessage(decision: Decision) {
  const { now, up_next, context_blocks, total_tasks, estimated_total_minutes } = decision;

  const blocks: any[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: 'Do this RIGHT NOW', emoji: true }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${truncate(now.title, 60)}*\n${now.reason}\n:clock1: ~${now.estimated_minutes} min`
      }
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Done', emoji: true },
          style: 'primary',
          action_id: 'task_done',
          value: now.task_id
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Skip', emoji: true },
          action_id: 'task_skip',
          value: now.task_id
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: 'See all tasks', emoji: true },
          action_id: 'see_all'
        }
      ]
    },
    { type: 'divider' }
  ];

  // Up next
  if (up_next.length > 0) {
    const shown = up_next.slice(0, 3);
    const remaining = up_next.length - shown.length;
    let upNextText = shown
      .map((t, i) => `${i + 1}. *${truncate(t.title, 60)}* — ~${t.estimated_minutes} min`)
      .join('\n');
    if (remaining > 0) upNextText += `\n...and ${remaining} more`;
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*Up Next*\n${upNextText}` }
    });
  }

  // Context blocks
  if (context_blocks.length > 0) {
    const ctxText = context_blocks
      .map(b => `${b.do_first ? ':large_blue_circle:' : ':white_circle:'} ${b.name} (${b.task_ids.length} tasks)`)
      .join('\n');
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*Context*\n${ctxText}` }
    });
  }

  // Footer
  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `${total_tasks} tasks total | ~${estimated_total_minutes} min estimated`
      }
    ]
  });

  return { blocks };
}

export function formatDoneMessage(nextTask: NowTask | null) {
  if (!nextTask) {
    return {
      blocks: [
        {
          type: 'section',
          text: { type: 'mrkdwn', text: ':tada: All done! No more tasks right now.' }
        }
      ]
    };
  }

  return {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `:white_check_mark: Done! Next up: *${nextTask.title}*\n${nextTask.reason}\n:clock1: ~${nextTask.estimated_minutes} min`
        }
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Done', emoji: true },
            style: 'primary',
            action_id: 'task_done',
            value: nextTask.task_id
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Skip', emoji: true },
            action_id: 'task_skip',
            value: nextTask.task_id
          }
        ]
      }
    ]
  };
}

export function formatAllTasksMessage(tasks: Task[]) {
  if (tasks.length === 0) {
    return {
      blocks: [
        {
          type: 'section',
          text: { type: 'mrkdwn', text: 'No tasks found.' }
        }
      ]
    };
  }

  const sourceIcon: Record<string, string> = {
    slack: ':speech_balloon:',
    meet: ':video_camera:',
    calendar: ':calendar:'
  };

  const taskLines = tasks.map((t, i) => {
    const icon = sourceIcon[t.source] || ':pushpin:';
    const done = t.done ? '~' : '';
    const urgent = t.urgency_signals.length > 0 ? ' :rotating_light:' : '';
    return `${i + 1}. ${icon} ${done}${t.title}${done}${urgent}`;
  });

  const blocks: any[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: 'All Tasks', emoji: true }
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: taskLines.join('\n') }
    }
  ];

  return { blocks };
}
