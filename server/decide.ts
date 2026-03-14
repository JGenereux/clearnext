import { getModel } from './gemini';
import { DECISION_SYSTEM_PROMPT } from './prompts';
import { Task, Decision } from './types';

export async function makeDecision(
  tasks: Task[],
  userName: string
): Promise<Decision | null> {
  const model = getModel();
  if (!model) return null;

  const activeTasks = tasks.filter(t => !t.done);
  if (activeTasks.length === 0) {
    return {
      now: { task_id: '', title: 'All done!', reason: 'No pending tasks', estimated_minutes: 0 },
      up_next: [],
      context_blocks: [],
      total_tasks: 0,
      estimated_total_minutes: 0
    };
  }

  const userPrompt = `User: ${userName}\n\nTasks:\n${JSON.stringify(activeTasks, null, 2)}`;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      systemInstruction: DECISION_SYSTEM_PROMPT,
      generationConfig: { responseMimeType: 'application/json' }
    });

    const text = result.response.text();
    const decision: Decision = JSON.parse(text);

    if (!decision.now || !decision.now.task_id) {
      console.error('Invalid decision: missing now.task_id');
      return null;
    }

    return decision;
  } catch (err) {
    console.error('makeDecision error:', err);
    return null;
  }
}
