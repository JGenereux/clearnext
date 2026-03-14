import { callAI } from './gemini';
import { DECISION_SYSTEM_PROMPT } from './prompts';
import { Task, Decision } from './types';

export async function makeDecision(
  tasks: Task[],
  userName: string
): Promise<Decision | null> {
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
    const text = await callAI(DECISION_SYSTEM_PROMPT, userPrompt);
    if (!text) return null;

    let decision: Decision;
    try {
      decision = JSON.parse(text);
    } catch {
      console.error('makeDecision JSON parse error. Raw:', text.slice(0, 500));
      return null;
    }

    if (!decision || !decision.now || !decision.now.task_id) {
      console.error('Invalid decision structure:', JSON.stringify(decision).slice(0, 300));
      return null;
    }

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
