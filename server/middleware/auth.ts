import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

export interface AuthenticatedRequest extends Request {
  userId: string;
  userEmail: string;
  userName: string;
  slackUserId: string | null;
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authReq = req as AuthenticatedRequest;

  // Path 1: Internal bot requests (X-Internal-Key header)
  if (req.headers['x-internal-key'] === process.env.INTERNAL_API_KEY) {
    authReq.userId = (req.body?.user_id || req.query?.user_id || 'bot') as string;
    authReq.userName = (req.body?.user_name || 'BotUser') as string;
    authReq.userEmail = '';
    authReq.slackUserId = authReq.userId;
    return next();
  }

  // Path 2: Frontend requests (Bearer token)
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    res.status(401).json({ error: 'Unauthorized: missing token' });
    return;
  }

  if (!supabase) {
    res.status(500).json({ error: 'Auth service not configured' });
    return;
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    res.status(401).json({ error: 'Unauthorized: invalid token' });
    return;
  }

  authReq.userId = user.id;
  authReq.userEmail = user.email || '';
  authReq.userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
  authReq.slackUserId = user.identities?.find(i => i.provider === 'slack_oidc')?.identity_data?.provider_id || null;
  next();
}
