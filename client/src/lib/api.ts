import { supabase } from './supabase';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });
}
