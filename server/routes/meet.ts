import { Router, Request, Response } from 'express';
import { google } from 'googleapis';

const router = Router();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `http://localhost:${process.env.PORT || 3000}/meet/auth/callback`
);

const SCOPES = [
  'https://www.googleapis.com/auth/meetings.space.readonly',
];

/**
 * This route must be called in the browser to authenticate the user.
 */
router.get('/auth/google', (_req: Request, res: Response) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  res.redirect(url);
});

router.get('/auth/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string;
  if (!code) {
    res.status(400).json({ error: 'Missing authorization code' });
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    res.json({ message: 'Authenticated successfully. You can now fetch /meet/conferences.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to authenticate', details: String(err) });
  }
});

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

interface ConferenceRecord {
  name: string;
  startTime: string | null;
  endTime: string | null;
  expireTime: string | null;
  space: string | null;
  transcripts: Transcript[];
}

// --- Helpers ---

async function getTranscriptEntries(
  meet: ReturnType<typeof google.meet>,
  transcriptName: string
): Promise<TranscriptEntry[]> {
  const entries: TranscriptEntry[] = [];
  let pageToken: string | undefined;

  do {
    const entriesRes = await meet.conferenceRecords.transcripts.entries.list({
      parent: transcriptName,
      pageSize: 100,
      ...(pageToken ? { pageToken } : {}),
    });

    for (const entry of entriesRes.data.transcriptEntries || []) {
      entries.push({
        participant: entry.participant || null,
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

// --- Routes ---

/**
 * Lists all transcripts (w conference info) belonging to the authenticated user
 */
router.get('/transcripts', async (_req: Request, res: Response) => {
  if (!oauth2Client.credentials?.access_token) {
    res.status(401).json({ error: 'Not authenticated. Visit /meet/auth/google first.' });
    return;
  }

  try {
    const meet = google.meet({ version: 'v2', auth: oauth2Client });

    const recordsRes = await meet.conferenceRecords.list();
    const records = recordsRes.data.conferenceRecords || [];

    if (records.length === 0) {
      res.json({ message: 'No conference records found.', conferences: [] });
      return;
    }

    const conferences: ConferenceRecord[] = await Promise.all(
      records.map(async (record) => {
        const transcripts = record.name
          ? await getTranscriptsForRecord(meet, record.name).catch(() => [])
          : [];

        return {
          name: record.name || '',
          startTime: record.startTime || null,
          endTime: record.endTime || null,
          expireTime: record.expireTime || null,
          space: record.space || null,
          transcripts,
        };
      })
    );

    res.json({ conferences: conferences.filter(c => c.transcripts?.length != 0) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch conferences', details: String(err) });
  }
});

// Get transcripts for a specific conference by meeting code (e.g. qqn-xiih-xcs)
router.get('/conferences/:meetingCode/transcripts', async (req: Request, res: Response) => {
  if (!oauth2Client.credentials?.access_token) {
    res.status(401).json({ error: 'Not authenticated. Visit /meet/auth/google first.' });
    return;
  }

  const { meetingCode } = req.params;

  try {
    const meet = google.meet({ version: 'v2', auth: oauth2Client });

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

export default router;
