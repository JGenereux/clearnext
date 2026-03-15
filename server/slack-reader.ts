import { WebClient } from '@slack/web-api';

const ACTION_KEYWORDS = ['can you', 'please', 'today', 'asap', 'eod', 'need', 'deadline', 'urgent', 'fix', 'update', 'review', 'check', 'send', 'blocking', 'before', 'by end of'];

// Singleton WebClient
let _client: WebClient | null = null;
function getClient(): WebClient | null {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) return null;
  if (!_client) _client = new WebClient(token);
  return _client;
}

// Cache user info to avoid N+1 API calls
const userCache = new Map<string, string>();

async function getUserName(client: WebClient, userId: string): Promise<string> {
  if (userCache.has(userId)) return userCache.get(userId)!;
  try {
    const info = await client.users.info({ user: userId });
    const name = info.user?.real_name || info.user?.name || 'Someone';
    userCache.set(userId, name);
    return name;
  } catch {
    return 'Someone';
  }
}

// Cache slack context per user (60s TTL)
const contextCache = new Map<string, { text: string; timestamp: number }>();
const CACHE_TTL = 60_000;

function isActionable(text: string): boolean {
  const lower = text.toLowerCase();
  return ACTION_KEYWORDS.some(kw => lower.includes(kw));
}

// Wrap a promise with a timeout
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms))
  ]);
}

export async function getSlackContext(userId: string): Promise<string> {
  // Check cache first
  const cached = contextCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.text;
  }

  const client = getClient();
  if (!client) return '';

  const lines: string[] = [];
  const sixHoursAgo = Math.floor((Date.now() - 6 * 60 * 60 * 1000) / 1000).toString();

  try {
    // Get all channels the bot is in
    const channelList = await withTimeout(
      client.conversations.list({ types: 'public_channel,private_channel', limit: 100 }),
      10_000,
      { ok: true, channels: [] } as any
    );

    const channels = channelList.channels || [];

    // Fetch channel messages in parallel (batches of 5)
    const BATCH_SIZE = 5;
    for (let i = 0; i < channels.length; i += BATCH_SIZE) {
      const batch = channels.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (channel: any) => {
          if (!channel.id) return [];
          try {
            const history = await client.conversations.history({
              channel: channel.id,
              oldest: sixHoursAgo,
              limit: 50
            });

            const channelLines: string[] = [];
            for (const msg of history.messages || []) {
              if (!msg.text) continue;
              const mentionsUser = msg.text.includes(`<@${userId}>`);
              if (!mentionsUser && !isActionable(msg.text)) continue;

              const senderName = msg.user ? await getUserName(client, msg.user) : 'Someone';
              const channelName = channel.name || 'unknown';
              const cleanText = msg.text.replace(/<@[A-Z0-9]+>/g, '@user');
              channelLines.push(`From ${senderName} in #${channelName}: ${cleanText}`);
            }
            return channelLines;
          } catch {
            return [];
          }
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled') lines.push(...result.value);
      }
    }

    // Fetch DMs in parallel
    try {
      const dmList = await withTimeout(
        client.conversations.list({ types: 'im', limit: 50 }),
        10_000,
        { ok: true, channels: [] } as any
      );

      const dmResults = await Promise.allSettled(
        (dmList.channels || []).map(async (dm: any) => {
          if (!dm.id) return [];
          try {
            const history = await client.conversations.history({
              channel: dm.id,
              oldest: sixHoursAgo,
              limit: 20
            });

            const dmLines: string[] = [];
            for (const msg of history.messages || []) {
              if (!msg.text || msg.user === userId) continue;
              const senderName = msg.user ? await getUserName(client, msg.user) : 'Someone';
              const cleanText = msg.text.replace(/<@[A-Z0-9]+>/g, '@user');
              dmLines.push(`DM from ${senderName}: ${cleanText}`);
            }
            return dmLines;
          } catch {
            return [];
          }
        })
      );

      for (const result of dmResults) {
        if (result.status === 'fulfilled') lines.push(...result.value);
      }
    } catch {
      // skip DMs
    }

  } catch (err) {
    console.error('getSlackContext error:', (err as Error).message);
  }

  const text = lines.join('\n') || '';
  contextCache.set(userId, { text, timestamp: Date.now() });
  console.log('Slack texts: ', text)
  return text;
}
