export interface AuthenticatedUser {
  id: string;
  email: string;
  display_name: string;
  slack_user_id: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  source: 'slack' | 'meet' | 'calendar';
  assigned_to_user: boolean;
  urgency_signals: string[];
  mentioned_by: string | null;
  mentioned_count: number;
  deadline_hint: string | null;
  raw_quote: string;
  done?: boolean;
}

export interface NowTask {
  task_id: string;
  title: string;
  reason: string;
  estimated_minutes: number;
  source: 'slack' | 'meet' | 'calendar';
  score?: number;
  reward: number;
  status: 'pending' | 'completed';
}

export interface ContextBlock {
  name: string;
  task_ids: string[];
  do_first: boolean;
}

export interface Decision {
  now: NowTask;
  up_next: NowTask[];
  context_blocks: ContextBlock[];
  total_tasks: number;
  estimated_total_minutes: number;
}
