import { callAI } from './gemini';
import { EXTRACTION_SYSTEM_PROMPT } from './prompts';
import { Task } from './types';

export async function extractTasks(
  slackText: string,
  transcriptText: string,
  calendarText: string,
  userName: string
): Promise<Task[]> {
  const sanitize = (s: string) => s.slice(0, 10_000).replace(/```/g, '');

  const userPrompt = `Extract tasks for user "${sanitize(userName)}" from the following sources:

=== SLACK MESSAGES ===
${sanitize(slackText) || '(none)'}

=== MEETING TRANSCRIPT ===
${sanitize(transcriptText) || '(none)'}

=== CALENDAR TRANSCRIPT ===
${sanitize(calendarText) || '(none)'}
Return a JSON object with a "tasks" array.`;

  try {
    const text = await callAI(EXTRACTION_SYSTEM_PROMPT, userPrompt);
    if (!text) return [];

    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      console.error('extractTasks JSON parse error. Raw:', text.slice(0, 500));
      return [];
    }

    const tasks: Task[] = Array.isArray(parsed) ? parsed : parsed.tasks || [];
    if (!Array.isArray(tasks)) return [];

    const timestamp = Date.now();
    return tasks
      .filter(t => t && t.title && t.source && t.assigned_to_user !== false)
      .map((t, i) => ({
        ...t,
        id: t.id || `t_${timestamp}_${i}`,
        urgency_signals: Array.isArray(t.urgency_signals) ? t.urgency_signals : [],
        mentioned_count: typeof t.mentioned_count === 'number' ? t.mentioned_count : 0,
        assigned_to_user: Boolean(t.assigned_to_user),
        done: false
      }));
  } catch (err) {
    console.error('extractTasks error:', (err as Error).message);
    return [];
  }
}
