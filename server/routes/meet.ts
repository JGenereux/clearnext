import { Router, Request, Response } from 'express';
import { google } from 'googleapis';
import { getUserProviderToken } from '../supabase';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// --- Per-user auth client factory ---
async function getAuthClientForUser(userId: string) {
  const tokenData = await getUserProviderToken(userId, 'google');
  if (!tokenData) return null;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
  });
  return oauth2Client;
}

// --- Types ---

interface TranscriptEntry {
  participant: string | null;
  text: string;
  startTime: string | null;
  endTime: string | null;
  languageCode: string | null;
}

interface Transcript {
  transcriptId: string;
  entries: TranscriptEntry[];
}

// --- Helpers ---

async function resolveParticipantName(
  meet: ReturnType<typeof google.meet>,
  participantResource: string,
  cache: Map<string, string>
): Promise<string> {
  if (cache.has(participantResource)) return cache.get(participantResource)!;

  try {
    const res = await meet.conferenceRecords.participants.get({
      name: participantResource,
    });
    const p = res.data;
    const displayName =
      (p.signedinUser as any)?.displayName ||
      (p.anonymousUser as any)?.displayName ||
      (p.phoneUser as any)?.displayName ||
      participantResource;
    cache.set(participantResource, displayName);
    return displayName;
  } catch {
    cache.set(participantResource, participantResource);
    return participantResource;
  }
}

async function getTranscriptEntries(
  meet: ReturnType<typeof google.meet>,
  transcriptName: string
): Promise<TranscriptEntry[]> {
  const entries: TranscriptEntry[] = [];
  const participantCache = new Map<string, string>();
  let pageToken: string | undefined;

  do {
    const entriesRes = await meet.conferenceRecords.transcripts.entries.list({
      parent: transcriptName,
      pageSize: 100,
      ...(pageToken ? { pageToken } : {}),
    });

    for (const entry of entriesRes.data.transcriptEntries || []) {
      const participantName = entry.participant
        ? await resolveParticipantName(meet, entry.participant, participantCache)
        : null;

      entries.push({
        participant: participantName,
        text: entry.text || '',
        startTime: entry.startTime || null,
        endTime: entry.endTime || null,
        languageCode: entry.languageCode || null,
      });
    }

    pageToken = entriesRes.data.nextPageToken || undefined;
  } while (pageToken);

  return entries;
}

async function getTranscriptsForRecord(
  meet: ReturnType<typeof google.meet>,
  recordName: string
): Promise<Transcript[]> {
  const transcriptsRes = await meet.conferenceRecords.transcripts.list({
    parent: recordName,
  });

  const transcriptList = transcriptsRes.data.transcripts || [];
  const transcripts: Transcript[] = [];

  for (const t of transcriptList) {
    if (!t.name) continue;
    const entries = await getTranscriptEntries(meet, t.name);
    transcripts.push({ transcriptId: t.name, entries });
  }

  return transcripts;
}

router.get('/conferences', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const authClient = await getAuthClientForUser(authReq.userId);

  if (!authClient) {
    res.status(401).json({ error: 'No Google credentials found. Please sign in with Google.' });
    return;
  }

  try {
    const meet = google.meet({ version: 'v2', auth: authClient });

    const recordsRes = await meet.conferenceRecords.list();
    const records = recordsRes.data.conferenceRecords || [];

    const conferences = records.map(record => ({
      name: record.name || '',
      startTime: record.startTime || null,
      endTime: record.endTime || null,
      expireTime: record.expireTime || null,
      space: record.space || null,
    }));

    res.json({ conferences });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch conferences', details: String(err) });
  }
});

// Get transcripts for a specific conference by meeting code (e.g. qqn-xiih-xcs)
router.get('/conferences/:meetingCode/transcripts', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const authClient = await getAuthClientForUser(authReq.userId);

  if (!authClient) {
    res.status(401).json({ error: 'No Google credentials found. Please sign in with Google.' });
    return;
  }

  const { meetingCode } = req.params;

  try {
    const meet = google.meet({ version: 'v2', auth: authClient });

    const recordsRes = await meet.conferenceRecords.list({
      filter: `space.meeting_code="${meetingCode}"`,
    });

    const records = recordsRes.data.conferenceRecords || [];

    if (records.length === 0) {
      res.json({ message: 'No conference records found for this meeting code.', transcripts: [] });
      return;
    }

    const allTranscripts: Transcript[] = [];
    for (const record of records) {
      if (!record.name) continue;
      const transcripts = await getTranscriptsForRecord(meet, record.name);
      allTranscripts.push(...transcripts);
    }

    res.json({ meetingCode, transcripts: allTranscripts });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch transcripts', details: String(err) });
  }
});

export async function getGoogleMeetContext(userName: string = "Jace", userId: string): Promise<string> {
  const authClient = await getAuthClientForUser(userId);
  if (!authClient) return '';

  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const nameLower = userName.toLowerCase().trim();

  try {
    const meet = google.meet({ version: 'v2', auth: authClient });
    const recordsRes = await meet.conferenceRecords.list();
    const records = recordsRes.data.conferenceRecords || [];

    const recentRecords = records.filter(r => {
      if (!r.startTime) return false;
      return new Date(r.startTime) >= sixHoursAgo;
    });

    const meetingTranscripts: string[] = [];

    for (const record of recentRecords) {
      if (!record.name) continue;

      const transcriptsRes = await meet.conferenceRecords.transcripts.list({
        parent: record.name,
      });

      const transcriptList = transcriptsRes.data.transcripts || [];

      for (const t of transcriptList) {
        if (!t.name) continue;

        const entries = await getTranscriptEntries(meet, t.name);
        if (entries.length === 0) continue;

        const relevant = entries.filter(e => {
          const pName = e.participant?.toLowerCase().trim() || '';
          const textLower = e.text.toLowerCase();
          return pName.includes(nameLower) || textLower.includes(nameLower);
        });

        if (relevant.length === 0) continue;

        const lines = relevant.map(e =>
          `[${e.startTime || ''}] ${e.participant}: ${e.text}`
        );
        meetingTranscripts.push(lines.join('\n'));
      }
    }

    return meetingTranscripts.join('\n---\n');
  } catch (err) {
    console.error('Failed to fetch Meet transcript:', err);
  }

  return '';
}

export async function getGoogleCalendarContext(userId: string): Promise<string> {
  const authClient = await getAuthClientForUser(userId);
  if (!authClient) return '';

  try {
    const calendar = google.calendar({ version: 'v3', auth: authClient });

    const now = new Date();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const eventsRes = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = eventsRes.data.items || [];
    if (events.length === 0) return '';

    return events.map(event => {
      const start = event.start?.dateTime || event.start?.date || '';
      const end = event.end?.dateTime || event.end?.date || '';
      const summary = event.summary || 'No title';
      const attendees = (event.attendees || [])
        .map(a => a.displayName || a.email)
        .join(', ');
      return `[${start} - ${end}] ${summary}${attendees ? ` (${attendees})` : ''}`;
    }).join('\n');
  } catch (err) {
    console.error('Failed to fetch calendar events:', err);
  }

  return '';
}
export default router;
