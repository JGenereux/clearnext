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

  const userPrompt = `Extract tasks for user "${userName}" from the following sources:

=== SLACK MESSAGES ===
${slackText || '(none)'}

=== MEETING TRANSCRIPT ===
${transcriptText || '(none)'}

=== CALENDAR EVENTS ===
${calendarText || '(none)'}`;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      systemInstruction: EXTRACTION_SYSTEM_PROMPT,
      generationConfig: { responseMimeType: 'application/json' }
    });

    const text = result.response.text();
    const tasks: Task[] = JSON.parse(text);
    return tasks.filter(t => t.id && t.title && t.source);
  } catch (err) {
    console.error('extractTasks error:', err);
    return [];
  }
}
