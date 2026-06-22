import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isNextResponse } from '@/lib/auth';
import { getSyroMalabarLiturgy, getLiturgicalTheme } from '@/lib/liturgy';

const MOBILE_SECRET = 'cyfam-mobile-2026';

// ── In-memory cache (resets on server restart, good enough for a day) ──
const cache: Record<string, { data: unknown; ts: number }> = {};
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function getCache(key: string) {
  const hit = cache[key];
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return hit.data;
  return null;
}
function setCache(key: string, data: unknown) {
  cache[key] = { data, ts: Date.now() };
}

// ── Types ───────────────────────────────────────────────────────
export type Reading = {
  label: string;      // e.g. "First Reading", "Gospel"
  reference: string;  // e.g. "1 Kings 21:1-16"
  text: string;
};

export type DailyReadings = {
  rite: 'latin' | 'syro-malabar';
  date: string;
  liturgicalDay: string;
  season: string;
  colour: string;
  readings: Reading[];
  feasts?: string[];
  source: string;
  sourceUrl?: string;
};

// ── Fetch Bible text from bible-api.com ─────────────────────────
async function fetchBibleText(reference: string): Promise<string> {
  const encoded = encodeURIComponent(reference);
  const res = await fetch(`https://bible-api.com/${encoded}?translation=web`, { next: { revalidate: 3600 } });
  if (!res.ok) return '';
  const json = await res.json();
  return (json.text as string || '').trim().replace(/\n+/g, '\n');
}

// ── Latin Rite: Fetch from CatholicCulture.org ─────────────────
async function fetchLatinReadings(dateStr: string): Promise<DailyReadings> {
  const url = `https://www.catholicculture.org/culture/liturgicalyear/calendar/day.cfm?date=${dateStr}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CY-App/1.0)' },
    next: { revalidate: 3600 },
  });

  let liturgicalDay = 'Ordinary Time';
  let season = 'Ordinary Time';
  let colour = 'green';
  let usccbLink = '';

  if (res.ok) {
    const html = await res.text();

    // Extract liturgical day name
    const h1Match = html.match(/<h1[^>]*><strong>([^<]+)<\/strong><\/h1>/);
    if (h1Match) season = h1Match[1].trim();

    const h2Match = html.match(/<h2>([^<]+(?:Week|Day|Solemnity|Feast|Memorial|Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)[^<]*)<\/h2>/);
    if (h2Match) liturgicalDay = h2Match[1].trim();
    else liturgicalDay = season;

    // Season/colour detection
    if (/advent/i.test(html))   { season = 'Advent';     colour = 'purple'; }
    else if (/lent/i.test(html)){ season = 'Lent';       colour = 'purple'; }
    else if (/easter/i.test(html)){ season = 'Easter';   colour = 'white';  }
    else if (/christmas/i.test(html)){ season = 'Christmas'; colour = 'white'; }
    else                        { season = 'Ordinary Time'; colour = 'green'; }

    // Get USCCB link for the date (format: MMDDYY)
    const usccbMatch = html.match(/href="(https:\/\/www\.usccb\.org\/bible\/readings\/\d+\.cfm)"/);
    if (usccbMatch) usccbLink = usccbMatch[1];
  }

  // ── Now fetch actual reading texts from USCCB page ─────────────
  const readings: Reading[] = [];

  if (usccbLink) {
    try {
      const usccbRes = await fetch(usccbLink, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CY-App/1.0)' },
        next: { revalidate: 3600 },
      });

      if (usccbRes.ok) {
        const usccbHtml = await usccbRes.text();

        // Extract reading sections using pattern matching
        // USCCB uses <div class="unitArticle"> sections
        const sectionRegex = /<div[^>]+class="[^"]*unitArticle[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?=<div[^>]+class="[^"]*unitArticle|<\/div>\s*<\/div>)/g;
        const h3Regex = /<h3[^>]*>([\s\S]*?)<\/h3>/;
        const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/g;

        let match;
        while ((match = sectionRegex.exec(usccbHtml)) !== null) {
          const section = match[1];
          const titleM  = h3Regex.exec(section);
          if (!titleM) continue;
          const title = titleM[1].replace(/<[^>]+>/g, '').trim();
          if (!title) continue;

          // Skip non-reading sections
          if (/copyright|footer|nav|menu|share/i.test(title)) continue;

          const texts: string[] = [];
          let pm;
          const tempHtml = section;
          const pReg2 = /<p[^>]*>([\s\S]*?)<\/p>/gi;
          while ((pm = pReg2.exec(tempHtml)) !== null) {
            const t = pm[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            if (t.length > 30) texts.push(t);
          }

          if (texts.length > 0 && readings.length < 5) {
            readings.push({
              label: mapReadingLabel(title),
              reference: extractReference(title),
              text: texts.join('\n\n'),
            });
          }
        }
      }
    } catch (_err) {
      // Fall through to known references
    }
  }

  // ── Fallback: fetch from bible-api.com using known references for today ──
  if (readings.length === 0) {
    const fallback = await getFallbackReadings(dateStr, 'latin');
    return { ...fallback, liturgicalDay, season, colour };
  }

  return {
    rite: 'latin',
    date: dateStr,
    liturgicalDay,
    season,
    colour,
    readings,
    source: 'Catholic Culture / USCCB',
    sourceUrl: usccbLink || `https://www.catholicculture.org/culture/liturgicalyear/calendar/day.cfm?date=${dateStr}`,
  };
}

function mapReadingLabel(title: string): string {
  if (/gospel/i.test(title))          return 'Gospel';
  if (/second reading/i.test(title))  return 'Second Reading';
  if (/first reading/i.test(title))   return 'First Reading';
  if (/psalm/i.test(title))           return 'Responsorial Psalm';
  if (/alleluia/i.test(title))        return 'Alleluia';
  return title;
}

function extractReference(title: string): string {
  const m = title.match(/([1-3]?\s?[A-Za-z]+\s+[\d:,\s-]+)/);
  return m ? m[0].trim() : title;
}

// ── Syro-Malabar: Use Local Data First, Then AI ──────────────────
async function fetchSyroMalabarReadings(dateStr: string): Promise<DailyReadings> {
  const localData = getSyroMalabarLiturgy(dateStr);
  
  if (localData) {
    const readings: Reading[] = await Promise.all(localData.readings.map(async (r, i) => {
      let text = await fetchBibleText(r.reference);
      let label = `Reading ${i + 1}`;
      if (localData.readings.length === 4) {
        if (i === 0) label = 'First Reading (Law/Prophets)';
        if (i === 1) label = 'Second Reading (Acts/Prophets)';
        if (i === 2) label = 'Third Reading (Epistle)';
        if (i === 3) label = 'Gospel';
      } else {
        if (r.reference.match(/Mt|Mk|Lk|Jn|Matthew|Mark|Luke|John/i)) label = 'Gospel';
      }
      return {
        label,
        reference: r.reference,
        text: text || r.description || 'Text unavailable.',
      };
    }));

    const theme = getLiturgicalTheme('Syro-Malabar Rite', localData.season);

    return {
      rite: 'syro-malabar',
      date: dateStr,
      liturgicalDay: localData.liturgical_day,
      season: localData.season,
      feasts: localData.feasts,
      colour: theme.color,
      readings,
      source: 'Syro-Malabar Liturgical Calendar 2026',
    };
  }

  // AI Fallback if date is not in local data
  const apiKey = process.env.GITHUB_MODELS_TOKEN || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('No AI key configured');

  const prompt = `You are an expert in the Syro-Malabar Catholic Church liturgical calendar.
Today's date is ${dateStr}.

Provide the daily Mass readings for the Syro-Malabar rite for ${dateStr}.

The Syro-Malabar Church follows the East Syriac (Chaldean) rite with 9 liturgical seasons:
Annunciation (Subaro), Nativity (Yaldo), Epiphany (Denho), Great Lent (Sawmo Rabo), Resurrection (Qyomto), Apostles (Sleeho), Summer (Qaito), Elijah-Cross-Moses (Elia-Slibo-Muse), Dedication of the Church (Qudas Idto).

Return a JSON object with this exact structure:
{
  "liturgicalDay": "name of today in Syro-Malabar calendar (season + week)",
  "season": "current Syro-Malabar season name",
  "colour": "liturgical colour (green/purple/white/red)",
  "readings": [
    { "label": "First Reading", "reference": "Book Chapter:Verse", "text": "full reading text (at least 3-4 verses)" },
    { "label": "Responsorial Psalm", "reference": "Psalm X:X-X", "text": "psalm text" },
    { "label": "Second Reading", "reference": "Book Chapter:Verse", "text": "full reading text" },
    { "label": "Gospel", "reference": "Book Chapter:Verse", "text": "full gospel text" }
  ]
}

Use accurate Syro-Malabar lectionary readings for this date. Return ONLY valid JSON, no markdown.`;

  let text = '';

  // Try GitHub Models first
  if (apiKey.startsWith('ghp_') || !apiKey.startsWith('AIza')) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch('https://models.inference.ai.azure.com/chat/completions', {
        method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], temperature: 0.1, max_tokens: 2000 }),
      });
      if (res.ok) {
        const json = await res.json();
        text = json.choices?.[0]?.message?.content || '';
      }
    } catch (_) { /* fallthrough */ }
    finally { clearTimeout(timeout); }
  }

  // Fallback to Gemini
  if (!text && process.env.GEMINI_API_KEY) {
    const key = process.env.GEMINI_API_KEY;
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 2000 } }),
      }
    );
    if (res.ok) {
      const json = await res.json();
      text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }
  }

  if (!text) throw new Error('AI unavailable');

  const cleaned = text.replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim();
  const parsed = JSON.parse(cleaned);

  return {
    rite: 'syro-malabar',
    date: dateStr,
    liturgicalDay: parsed.liturgicalDay || 'Syro-Malabar Liturgy',
    season: parsed.season || 'Ordinary Time',
    colour: parsed.colour || 'green',
    readings: (parsed.readings || []).map((r: Reading) => ({
      label: r.label,
      reference: r.reference,
      text: r.text,
    })),
    source: 'AI-assisted (Syro-Malabar Lectionary)',
    sourceUrl: 'https://syromalabarliturgy.org',
  };
}

// ── Fallback readings when scraping fails ──────────────────────
async function getFallbackReadings(dateStr: string, rite: 'latin' | 'syro-malabar'): Promise<DailyReadings> {
  // Well-known readings for common passages — fetch from bible-api.com
  const defaultRefs = [
    { label: 'First Reading', ref: '1+Kings+21:1-16' },
    { label: 'Responsorial Psalm', ref: 'Psalm+5:2-7' },
    { label: 'Gospel', ref: 'Matthew+5:38-42' },
  ];

  const readings: Reading[] = await Promise.all(
    defaultRefs.map(async ({ label, ref }) => {
      const text = await fetchBibleText(ref);
      return { label, reference: ref.replace(/\+/g, ' '), text };
    })
  );

  return {
    rite,
    date: dateStr,
    liturgicalDay: 'Daily Mass Readings',
    season: 'Ordinary Time',
    colour: 'green',
    readings,
    source: 'World English Bible (bible-api.com)',
    sourceUrl: 'https://bible-api.com',
  };
}

// ── GET /api/bible-readings?rite=latin&date=2026-06-15 ─────────
export async function GET(req: NextRequest) {
  // Allow mobile app without session auth
  const isMobile =
    req.headers.get('x-client') === 'cy-mobile-app' &&
    req.headers.get('x-app-secret') === MOBILE_SECRET;

  if (!isMobile) {
    const auth = await requireAuth(req);
    if (isNextResponse(auth)) return auth;
  }

  const { searchParams } = req.nextUrl;
  const rite = (searchParams.get('rite') || 'syro-malabar') as 'latin' | 'syro-malabar';
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

  const cacheKey = `${rite}:${date}`;
  const cached = getCache(cacheKey);
  if (cached) return NextResponse.json({ data: cached });

  try {
    let raw: DailyReadings;
    if (rite === 'syro-malabar') {
      raw = await fetchSyroMalabarReadings(date);
    } else {
      raw = await fetchLatinReadings(date);
    }
    setCache(cacheKey, raw);

    // Normalise to snake_case for mobile + web consistency
    const data = {
      rite:            raw.rite,
      date:            raw.date,
      liturgical_day:  raw.liturgicalDay,
      season:          raw.season,
      colour:          raw.colour,
      feasts:          raw.feasts ?? [],
      readings:        (raw.readings ?? []).map(r => ({
        label:       r.label,
        reference:   r.reference,
        description: r.text,   // mobile reads 'description'
        text:        r.text,
      })),
      source:          raw.source,
      source_url:      raw.sourceUrl,
    };

    return NextResponse.json({ data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const fallback = await getFallbackReadings(date, rite);
    const data = {
      rite:           fallback.rite,
      date:           fallback.date,
      liturgical_day: fallback.liturgicalDay,
      season:         fallback.season,
      colour:         fallback.colour,
      feasts:         [],
      readings:       (fallback.readings ?? []).map(r => ({
        label:       r.label,
        reference:   r.reference,
        description: r.text,
        text:        r.text,
      })),
      source:         fallback.source,
    };
    return NextResponse.json({ data, warning: msg });
  }
}
