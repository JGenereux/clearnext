import { WebClient } from '@slack/web-api';

const ACTION_KEYWORDS = ['can you', 'please', 'today', 'asap', 'eod', 'need', 'deadline', 'urgent', 'fix', 'update', 'review', 'check', 'send', 'blocking', 'before', 'by end of'];

function isActionable(text: string): boolean {
  const lower = text.toLowerCase();
  return ACTION_KEYWORDS.some(kw => lower.includes(kw));
}

export async function getSlackContext(userId: string): Promise<string> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) return '';

  const client = new WebClient(token);
  const lines: string[] = [];
  const sixHoursAgo = Math.floor((Date.now() - 6 * 60 * 60 * 1000) / 1000).toString();

  try {
    // Get all channels the bot is in
    const channelList = await client.conversations.list({
      types: 'public_channel,private_channel',
      limit: 100
    });

    const channels = channelList.channels || [];

    // Fetch recent messages from each channel
    for (const channel of channels) {
      if (!channel.id) continue;

      try {
        const history = await client.conversations.history({
          channel: channel.id,
          oldest: sixHoursAgo,
          limit: 50
        });

        const messages = history.messages || [];
        for (const msg of messages) {
          if (!msg.text) continue;

          // Check if user is mentioned or message is actionable
          const mentionsUser = msg.text.includes(`<@${userId}>`);
          const actionable = isActionable(msg.text);

          if (mentionsUser || actionable) {
            // Get sender name
            let senderName = 'Someone';
            if (msg.user) {
              try {
                const userInfo = await client.users.info({ user: msg.user });
                senderName = userInfo.user?.real_name || userInfo.user?.name || 'Someone';
              } catch {
                // ignore
              }
            }

            const channelName = channel.name || 'unknown';
            const cleanText = msg.text.replace(/<@[A-Z0-9]+>/g, '@user');
            lines.push(`From ${senderName} in #${channelName}: ${cleanText}`);
          }
        }
      } catch {
        // Bot might not be in this channel, skip
      }
    }

    // Fetch DMs to the user
    try {
      const dmList = await client.conversations.list({
        types: 'im',
        limit: 50
      });

      for (const dm of dmList.channels || []) {
        if (!dm.id) continue;

        try {
          const history = await client.conversations.history({
            channel: dm.id,
            oldest: sixHoursAgo,
            limit: 20
          });

          for (const msg of history.messages || []) {
            if (!msg.text || msg.user === userId) continue;

            let senderName = 'Someone';
            if (msg.user) {
              try {
                const userInfo = await client.users.info({ user: msg.user });
                senderName = userInfo.user?.real_name || userInfo.user?.name || 'Someone';
              } catch {
                // ignore
              }
            }

            const cleanText = msg.text.replace(/<@[A-Z0-9]+>/g, '@user');
            lines.push(`DM from ${senderName}: ${cleanText}`);
          }
        } catch {
          // skip
        }
      }
    } catch {
      // skip DMs
    }

  } catch (err) {
    console.error('getSlackContext error:', err);
  }

  return lines.join('\n') || '';
}
