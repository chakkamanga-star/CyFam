import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, isNextResponse } from '@/lib/auth';

// ── Types ──────────────────────────────────────────────────────
export type ExtractedEvent = {
  title: string;
  description: string;
  event_date: string;
  end_date?: string;
  location: string;
  type: 'Church Event' | 'Birthday' | 'Feast Day' | 'Meeting' | 'Special Event' | 'Team Event';
};

const EVENT_TYPES = ['Church Event', 'Birthday', 'Feast Day', 'Meeting', 'Special Event', 'Team Event'];

// ── GitHub Models — OpenAI-compatible chat completions ─────────
// Free via GitHub Student Pack / GitHub account
// Models: gpt-4o, gpt-4o-mini, Meta-Llama-3.1-70B-Instruct, Mistral-large
const GH_MODELS_URL = 'https://models.inference.ai.azure.com/chat/completions';
const GH_MODELS = ['gpt-4o-mini', 'gpt-4o', 'Mistral-large', 'Meta-Llama-3.1-70B-Instruct'];

async function callGitHubModels(token: string, model: string, prompt: string): Promise<string> {
  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    const res = await fetch(GH_MODELS_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 8192,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`[${res.status}] ${body}`);
    }

    const json = await res.json();
    return (json.choices?.[0]?.message?.content ?? '') as string;
  } catch (err: unknown) {
    if ((err as Error).name === 'AbortError') {
      throw new Error('GitHub Models timeout — endpoint unreachable from this network');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

// ── Gemini fallback (if GEMINI_API_KEY is set) ─────────────────
const GEMINI_MODELS = [
  'gemini-2.5-flash-preview-05-20',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash-latest',
];

async function callGemini(apiKey: string, model: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 8192 },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[${res.status}] ${body}`);
  }

  const json = await res.json();
  return (json.candidates?.[0]?.content?.parts?.[0]?.text ?? '') as string;
}

// ── Main extraction — tries GitHub Models first, Gemini second ──
async function extractEventsWithAI(text: string, fileName: string): Promise<ExtractedEvent[]> {
  const ghToken   = process.env.GITHUB_MODELS_TOKEN;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!ghToken && !geminiKey) {
    throw new Error('No AI key configured. Set GITHUB_MODELS_TOKEN or GEMINI_API_KEY in .env.local');
  }

  const today = new Date();
  const prompt = `You are an expert at extracting event schedules from organizational calendar documents.
Today's date is ${today.toISOString().split('T')[0]}.

Extract ALL events from the calendar document "${fileName}".

Return a JSON array where each item has:
- title: string (concise name)
- description: string (brief detail, "" if none)
- event_date: string (ISO 8601 "YYYY-MM-DDTHH:mm:00"; date-only → T00:00:00; missing year → ${today.getFullYear()})
- location: string (venue, "" if unknown)
- type: one of: "Church Event" | "Birthday" | "Feast Day" | "Meeting" | "Special Event" | "Team Event"

Classification:
- Feast/patron/holy days → "Feast Day"
- Birthdays/anniversaries → "Birthday"
- Committee/staff meetings → "Meeting"
- Sports/competitions/cultural → "Special Event"
- Choir/team-specific → "Team Event"
- Everything else → "Church Event"

Rules:
- Return ONLY a valid JSON array, no markdown, no explanation
- List each occurrence of recurring events separately

Document text:
${text.slice(0, 15000)}

JSON array:`;

  let lastError: Error = new Error('No AI provider succeeded');

  // ── Try GitHub Models first ──────────────────────────────────
  if (ghToken) {
    let networkBlocked = false;
    for (const model of GH_MODELS) {
      if (networkBlocked) break;
      try {
        console.log(`[calendar-import] Trying GitHub Models: ${model}`);
        const raw  = await callGitHubModels(ghToken, model, prompt);
        const json = raw.replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim();
        return parseEvents(json);
      } catch (err: unknown) {
        const msg = String(err);
        lastError = err instanceof Error ? err : new Error(msg);
        if (msg.includes('timeout') || msg.includes('unreachable')) {
          console.log('[calendar-import] GitHub Models unreachable — falling back to Gemini');
          networkBlocked = true; // skip all remaining GH models
        } else if (msg.includes('429') || msg.toLowerCase().includes('rate')) {
          console.log(`[calendar-import] ${model} rate limited, trying next…`);
        } else if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
          // skip silently
        } else {
          console.error(`[calendar-import] GitHub Models error (${model}):`, msg);
        }
      }
    }
  }

  // ── Fallback: Gemini ─────────────────────────────────────────
  if (geminiKey) {
    for (const model of GEMINI_MODELS) {
      try {
        console.log(`[calendar-import] Trying Gemini: ${model}`);
        const raw  = await callGemini(geminiKey, model, prompt);
        const json = raw.replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim();
        return parseEvents(json);
      } catch (err: unknown) {
        const msg = String(err);
        lastError = err instanceof Error ? err : new Error(msg);
        if (msg.includes('404') || msg.toLowerCase().includes('not found')) continue;
        if (msg.includes('429') || msg.toLowerCase().includes('quota')) {
          const match  = msg.match(/retry in ([\d.]+)s/i);
          const waitMs = match ? Math.min(Math.ceil(parseFloat(match[1]) * 1000) + 2000, 65000) : 12000;
          console.log(`[calendar-import] Gemini ${model} quota, waiting ${Math.ceil(waitMs / 1000)}s…`);
          await new Promise(r => setTimeout(r, waitMs));
        } else {
          throw lastError;
        }
      }
    }
  }

  throw lastError;
}

function parseEvents(json: string): ExtractedEvent[] {
  const parsed: ExtractedEvent[] = JSON.parse(json);
  return parsed
    .filter(e => e.title && e.event_date)
    .map(e => ({
      title:       String(e.title).slice(0, 200),
      description: String(e.description || ''),
      event_date:  String(e.event_date),
      location:    String(e.location || ''),
      type:        (EVENT_TYPES.includes(e.type) ? e.type : 'Church Event') as ExtractedEvent['type'],
    }));
}

// ── Text extraction helpers ────────────────────────────────────
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const pdfParseModule = await import('pdf-parse');
  const pdfParse = (pdfParseModule as any).default || pdfParseModule;
  return (await pdfParse(buffer)).text;
}

async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth');
  return (await mammoth.extractRawText({ buffer })).value;
}

// ── POST /api/events/import-calendar ──────────────────────────
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['Super Admin', 'Secretary', 'President']);
  if (isNextResponse(auth)) return auth;

  const formData = await req.formData();
  const action   = formData.get('action') as string;
  const file     = formData.get('file') as File | null;

  // ── STEP 1: extract + AI parse ───────────────────────────────
  if (action === 'extract') {
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['pdf', 'docx', 'doc', 'txt'].includes(ext)) {
      return NextResponse.json({ error: 'Unsupported file type. Use PDF, DOCX, DOC, or TXT.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let text = '';
    try {
      if (ext === 'pdf')                        text = await extractTextFromPDF(buffer);
      else if (ext === 'docx' || ext === 'doc') text = await extractTextFromDocx(buffer);
      else                                       text = buffer.toString('utf-8');
    } catch (err) {
      return NextResponse.json({ error: `Could not read file: ${err}` }, { status: 422 });
    }

    if (text.trim().length < 20) {
      return NextResponse.json({ error: 'File appears empty or unreadable.' }, { status: 422 });
    }

    try {
      const events = await extractEventsWithAI(text, file.name);
      return NextResponse.json({ events, textLength: text.length });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('No AI key')) {
        return NextResponse.json({ error: 'No AI key configured. Set GITHUB_MODELS_TOKEN in .env.local' }, { status: 503 });
      }
      if (msg.includes('429') || msg.toLowerCase().includes('quota')) {
        return NextResponse.json({ error: 'AI quota exhausted. Please wait a minute and try again.' }, { status: 429 });
      }
      return NextResponse.json({ error: `AI extraction failed: ${msg}` }, { status: 500 });
    }
  }

  // ── STEP 2: save approved events ─────────────────────────────
  if (action === 'save') {
    const body = formData.get('events') as string;
    if (!body) return NextResponse.json({ error: 'No events provided' }, { status: 400 });

    let events: ExtractedEvent[];
    try { events = JSON.parse(body); }
    catch { return NextResponse.json({ error: 'Invalid events JSON' }, { status: 400 }); }

    const rows = events.map(e => ({
      title:       e.title,
      description: e.description || null,
      event_date:  e.event_date,
      location:    e.location || null,
      type:        EVENT_TYPES.includes(e.type) ? e.type : 'Church Event',
      created_by:  auth.id,
    }));

    const { data, error } = await supabaseAdmin.from('events').insert(rows).select('id');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabaseAdmin.from('audit_logs').insert({
      admin_id:   auth.id,
      admin_name: auth.name,
      action:     'CREATE_EVENT',
      entity:     'events',
      detail:     `Imported ${rows.length} events from calendar document`,
    });

    return NextResponse.json({ saved: data?.length ?? 0 });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
