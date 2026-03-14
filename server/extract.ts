import { getModel } from './gemini';
import { EXTRACTION_SYSTEM_PROMPT } from './prompts';
import { Task } from './types';

export async function extractTasks(
  slackText: string,
  transcriptText: string,
  calendarText: string,
  userName: string
): Promise<Task[]> {
  const model = getModel();
  if (!model) return [];

  // Sanitize inputs to prevent prompt injection
  const sanitize = (s: string) => s.slice(0, 10_000).replace(/```/g, '');

  const userPrompt = `Extract tasks for user "${sanitize(userName)}" from the following sources:

=== SLACK MESSAGES ===
${sanitize(slackText) || '(none)'}

=== MEETING TRANSCRIPT ===
${sanitize(transcriptText) || '(none)'}

=== CALENDAR EVENTS ===
${sanitize(calendarText) || '(none)'}`;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      systemInstruction: EXTRACTION_SYSTEM_PROMPT,
      generationConfig: { responseMimeType: 'application/json' }
    });

    const text = result.response.text();
    let tasks: Task[];
    try {
      tasks = JSON.parse(text);
    } catch (parseErr) {
      console.error('extractTasks JSON parse error. Raw response:', text.slice(0, 500));
      return [];
    }

    if (!Array.isArray(tasks)) return [];

    // Validate and assign unique IDs
    const timestamp = Date.now();
    return tasks
      .filter(t => t && t.title && t.source)
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
