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

  const sanitizedName = userName.slice(0, 100);
  const userPrompt = `User: ${sanitizedName}\n\nTasks:\n${JSON.stringify(activeTasks, null, 2)}`;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      systemInstruction: DECISION_SYSTEM_PROMPT,
      generationConfig: { responseMimeType: 'application/json' }
    });

    const text = result.response.text();
    let decision: Decision;
    try {
      decision = JSON.parse(text);
    } catch (parseErr) {
      console.error('makeDecision JSON parse error. Raw response:', text.slice(0, 500));
      return null;
    }

    // Validate required fields
    if (!decision || !decision.now || !decision.now.task_id) {
      console.error('Invalid decision structure:', JSON.stringify(decision).slice(0, 300));
      return null;
    }

    // Ensure arrays exist
    decision.up_next = Array.isArray(decision.up_next) ? decision.up_next : [];
    decision.context_blocks = Array.isArray(decision.context_blocks) ? decision.context_blocks : [];
    decision.total_tasks = typeof decision.total_tasks === 'number' ? decision.total_tasks : activeTasks.length;
    decision.estimated_total_minutes = typeof decision.estimated_total_minutes === 'number' ? decision.estimated_total_minutes : 0;

    return decision;
  } catch (err) {
    console.error('makeDecision error:', (err as Error).message);
    return null;
  }
}
