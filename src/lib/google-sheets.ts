// Google Sheets + Drive helpers for the Import Members feature
// Uses the service account JSON from GOOGLE_SERVICE_ACCOUNT_JSON env var

export type SheetRow = (string | null)[];

export const FIELD_ALIASES: Record<string, string[]> = {
  full_name:  ['name', 'full name', 'student name', 'your name', 'member name'],
  dob:        ['date of birth', 'dob', 'birthday', 'birth date', 'date of birth (dd/mm/yyyy)'],
  phone:      ['phone', 'mobile', 'contact number', 'phone number', 'mobile number'],
  email:      ['email', 'email address', 'e-mail', 'mail'],
  team:       ['team', 'group', 'unit', 'wing', 'ministry', 'department'],
  photo_url:  ['photo', 'image', 'profile photo', 'file upload', 'profile picture'],
};

/**
 * Detect which app field each spreadsheet column maps to.
 *
 * Three-pass strategy (longest alias tried first in every pass):
 *  Pass 1 — exact match         (any alias length)
 *  Pass 2 — header starts with  (alias must be ≥5 chars to avoid generic short words)
 *  Pass 3 — header contains     (alias must be ≥5 chars)
 *
 * Short/generic aliases like "name", "dob", "team", "mail" (≤4 chars) are therefore
 * only matched when the header IS exactly that word — preventing "Name of Parish"
 * from being mistakenly mapped to full_name.
 */
export function autoDetectColumns(headers: string[]): string[] {
  // Pre-build a flat, length-sorted candidate list (longest alias = most specific, wins first)
  const candidates: { field: string; alias: string }[] = [];
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const alias of aliases) {
      candidates.push({ field, alias });
    }
  }
  candidates.sort((a, b) => b.alias.length - a.alias.length);

  return headers.map((h) => {
    const lower = (h || '').toLowerCase().trim();

    // Pass 1: exact match (handles short generics like "name", "dob", "team" safely)
    for (const { field, alias } of candidates) {
      if (lower === alias) return field;
    }
    // Pass 2: header starts with alias (5+ char aliases only)
    for (const { field, alias } of candidates) {
      if (alias.length >= 5 && lower.startsWith(alias)) return field;
    }
    // Pass 3: header contains alias (5+ char aliases only)
    for (const { field, alias } of candidates) {
      if (alias.length >= 5 && lower.includes(alias)) return field;
    }

    return 'ignore';
  });
}

export function extractSheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

export function extractDriveFileId(url: string): string | null {
  const patterns = [
    /\/file\/d\/([\w-]+)/,
    /id=([\w-]+)/,
    /\/open\?id=([\w-]+)/,
  ];
  for (const p of patterns) {
    const m = url?.match(p);
    if (m) return m[1];
  }
  return null;
}

/**
 * Reads up to 1000 rows from the FIRST tab of the spreadsheet.
 * Tab name is detected dynamically — no longer assumes "Sheet1".
 */
export async function previewSheet(sheetId: string): Promise<SheetRow[] | null> {
  try {
    const saJson = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);

    // Dynamically import googleapis (server-side only)
    const { google } = await import('googleapis');

    const auth = new google.auth.GoogleAuth({
      credentials: saJson,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets.readonly',
        'https://www.googleapis.com/auth/drive.readonly',
      ],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Fix 2: Detect the actual first tab name instead of assuming "Sheet1"
    const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const firstTab = meta.data.sheets?.[0]?.properties?.title ?? 'Sheet1';

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${firstTab}!A1:Z1000`,
    });

    return (res.data.values as SheetRow[]) || [];
  } catch {
    return null;
  }
}

/**
 * Download a file from Google Drive using the service account.
 * Works for any file shared with (or accessible by) the service account.
 * Returns { buffer, mimeType } or null on any failure.
 */
export async function downloadDriveFile(
  fileId: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  try {
    const saJson = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
    const { google } = await import('googleapis');

    const auth = new google.auth.GoogleAuth({
      credentials: saJson,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // Get MIME type from file metadata
    const meta = await drive.files.get({ fileId, fields: 'mimeType' });
    const mimeType = (meta.data.mimeType as string) || 'image/jpeg';

    // Download raw bytes
    const res = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );

    const buffer = Buffer.from(res.data as ArrayBuffer);
    return { buffer, mimeType };
  } catch {
    return null;
  }
}
