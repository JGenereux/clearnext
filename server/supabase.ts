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

// ── Tasks (JSON array, one row per user in `user_tasks` table) ──
// Schema: user_tasks { user_id text PK, tasks jsonb, updated_at timestamptz }

export async function getTasks(userId: string): Promise<Task[]> {
  const db = getClient();
  if (!db) return [];

  const { data, error } = await db
    .from('user_tasks')
    .select('tasks')
    .eq('user_id', userId)
    .single();

  if (error || !data) return [];
  return (data.tasks as Task[]) || [];
}

export async function saveTasks(userId: string, tasks: Task[]): Promise<void> {
  const db = getClient();
  if (!db) return;

  const { error } = await db
    .from('user_tasks')
    .upsert(
      { user_id: userId, tasks, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );

  if (error) console.error('saveTasks error:', error.message);
}

export async function markTaskDone(userId: string, taskId: string): Promise<Task[]> {
  const tasks = await getTasks(userId);
  const updated = tasks.map(t => t.id === taskId ? { ...t, done: true } : t);
  await saveTasks(userId, updated);
  return updated;
}

export async function addTask(userId: string, task: Task): Promise<Task[]> {
  const tasks = await getTasks(userId);
  tasks.push(task);
  await saveTasks(userId, tasks);
  return tasks;
}

// ── Decisions (one row per insert, latest wins) ──

export async function saveDecision(userId: string, decision: Decision): Promise<void> {
  const db = getClient();
  if (!db) return;

  const { error } = await db.from('decisions').insert({
    user_id: userId,
    decision: decision as any
  });
  if (error) console.error('saveDecision error:', error.message);
}

export async function getLatestDecision(userId: string): Promise<{ decision: Decision; created_at: string } | null> {
  const db = getClient();
  if (!db) return null;

  const { data, error } = await db
    .from('decisions')
    .select('decision, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return { decision: data.decision as Decision, created_at: data.created_at };
}

// ── Provider tokens ──

export async function getUserProviderToken(userId: string, provider: string): Promise<{ access_token: string; refresh_token: string | null } | null> {
  const db = getClient();
  if (!db) return null;

  const { data, error } = await db
    .from('user_tokens')
    .select('access_token, refresh_token')
    .eq('user_id', userId)
    .eq('provider', provider)
    .single();

  if (error || !data) return null;
  return data;
}

// ── Moods (JSON array, one row per user in `user_moods` table) ──
// Schema: user_moods { user_id text PK, moods jsonb, updated_at timestamptz }

export interface MoodEntry {
  label: string;
  emoji: string;
  level: number;
  timestamp: string;
}

export async function getMoods(userId: string): Promise<MoodEntry[]> {
  const db = getClient();
  if (!db) return [];

  const { data, error } = await db
    .from('user_moods')
    .select('moods')
    .eq('user_id', userId)
    .single();

  if (error || !data) return [];
  return (data.moods as MoodEntry[]) || [];
}

export async function addMood(userId: string, entry: MoodEntry): Promise<MoodEntry[]> {
  const db = getClient();
  if (!db) return [entry];

  const existing = await getMoods(userId);
  const moods = [entry, ...existing].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const { error } = await db
    .from('user_moods')
    .upsert(
      { user_id: userId, moods, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );

  if (error) console.error('addMood error:', error.message);
  return moods;
}

export function getCurrentMood(moods: MoodEntry[]): MoodEntry | null {
  return moods.length > 0 ? moods[0] : null;
}

// ── Provider tokens ──

export async function storeUserProviderToken(
  userId: string,
  provider: string,
  accessToken: string,
  refreshToken: string | null
): Promise<void> {
  const db = getClient();
  if (!db) throw new Error('Supabase client not configured');

  const { error } = await db
    .from('user_tokens')
    .upsert(
      {
        user_id: userId,
        provider,
        access_token: accessToken,
        refresh_token: refreshToken,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,provider' }
    );

  if (error) throw new Error(`storeUserProviderToken upsert failed: ${error.message}`);
}
