import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Task, Decision } from './types';

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  client = createClient(url, key);
  return client;
}

export async function saveTasks(userId: string, tasks: Task[]): Promise<void> {
  const db = getClient();
  if (!db) return;

  // Delete old tasks for this user, then insert new
  await db.from('tasks').delete().eq('user_id', userId);

  const rows = tasks.map(t => ({
    id: t.id,
    user_id: userId,
    title: t.title,
    description: t.description,
    source: t.source,
    assigned_to_user: t.assigned_to_user,
    urgency_signals: t.urgency_signals,
    mentioned_by: t.mentioned_by,
    mentioned_count: t.mentioned_count,
    deadline_hint: t.deadline_hint,
    raw_quote: t.raw_quote,
    done: t.done || false
  }));

  const { error } = await db.from('tasks').insert(rows);
  if (error) console.error('saveTasks error:', error.message);
}

export async function getTasks(userId: string): Promise<Task[]> {
  const db = getClient();
  if (!db) return [];

  const { data, error } = await db
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('getTasks error:', error.message);
    return [];
  }

  return (data || []).map(row => ({
    id: row.id,
    title: row.title,
    description: row.description,
    source: row.source,
    assigned_to_user: row.assigned_to_user,
    urgency_signals: row.urgency_signals || [],
    mentioned_by: row.mentioned_by,
    mentioned_count: row.mentioned_count,
    deadline_hint: row.deadline_hint,
    raw_quote: row.raw_quote,
    done: row.done
  }));
}

export async function markTaskDone(taskId: string): Promise<void> {
  const db = getClient();
  if (!db) return;

  const { error } = await db.from('tasks').update({ done: true }).eq('id', taskId);
  if (error) console.error('markTaskDone error:', error.message);
}

export async function saveDecision(userId: string, decision: Decision): Promise<void> {
  const db = getClient();
  if (!db) return;

  const { error } = await db.from('decisions').insert({
    user_id: userId,
    decision: decision as any
  });
  if (error) console.error('saveDecision error:', error.message);
}

export async function getLatestDecision(userId: string): Promise<Decision | null> {
  const db = getClient();
  if (!db) return null;

  const { data, error } = await db
    .from('decisions')
    .select('decision')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data.decision as Decision;
}
