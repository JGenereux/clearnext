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
      now: { task_id: '', title: 'All done!', reason: 'No pending tasks', estimated_minutes: 0, source: 'slack', reward: 0, status: 'completed' },
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

    decision.up_next = (Array.isArray(decision.up_next) ? decision.up_next : [])
      .filter(t => t && t.task_id && t.title);
    decision.context_blocks = Array.isArray(decision.context_blocks) ? decision.context_blocks : [];
    decision.total_tasks = typeof decision.total_tasks === 'number' ? decision.total_tasks : activeTasks.length;
    decision.estimated_total_minutes = typeof decision.estimated_total_minutes === 'number' ? decision.estimated_total_minutes : 0;

    // Backfill source, reward, and status from input tasks if the AI omitted them
    const taskMap = new Map(activeTasks.map(t => [t.id, t]));

    const computeFallbackReward = (task: Task | undefined): number => {
      if (!task) return 0.05;
      let reward = 0.05;
      reward += (task.urgency_signals?.length || 0) * 0.03;
      if ((task.mentioned_count || 0) >= 2) reward += 0.05;
      if (task.source === 'meet') reward += 0.05;
      if (task.deadline_hint) reward += 0.02;
      return Math.min(0.30, Math.max(0.05, parseFloat(reward.toFixed(2))));
    };

    const fillDefaults = (nt: any) => {
      if (!nt.source) {
        nt.source = taskMap.get(nt.task_id)?.source ?? 'slack';
      }
      if (typeof nt.reward !== 'number') {
        nt.reward = computeFallbackReward(taskMap.get(nt.task_id));
      }
      nt.reward = Math.min(0.30, Math.max(0.05, parseFloat(Number(nt.reward).toFixed(2))));
      if (!nt.status) {
        nt.status = 'pending';
      }
    };
    fillDefaults(decision.now);
    decision.up_next.forEach(fillDefaults);

    return decision;
  } catch (err) {
    console.error('makeDecision error:', (err as Error).message);
    return null;
  }
}
