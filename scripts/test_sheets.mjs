// Diagnostic script — run with: node scripts/test_sheets.mjs
import { readFileSync } from 'fs';
import { createRequire } from 'module';

// Load .env.local manually
const envRaw = readFileSync('.env.local', 'utf8');
const env = {};
for (const line of envRaw.split('\n')) {
  const clean = line.trim();
  if (!clean || clean.startsWith('#')) continue;
  const idx = clean.indexOf('=');
  if (idx === -1) continue;
  env[clean.slice(0, idx)] = clean.slice(idx + 1);
}

const SHEET_ID = '1w_mdu0c0fcdh66wvZCW1Sd-tefs7QRb_jDFFw3G4us0';
const SA_JSON_RAW = env['GOOGLE_SERVICE_ACCOUNT_JSON'];

console.log('--- Service Account ---');
let saJson;
try {
  saJson = JSON.parse(SA_JSON_RAW);
  console.log('✅ Service account JSON parsed OK');
  console.log('   client_email:', saJson.client_email);
  console.log('   project_id  :', saJson.project_id);
} catch (e) {
  console.error('❌ Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON:', e.message);
  process.exit(1);
}

console.log('\n--- Testing Sheets API ---');
const { google } = await import('googleapis');
const auth = new google.auth.GoogleAuth({
  credentials: saJson,
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets.readonly',
    'https://www.googleapis.com/auth/drive.readonly',
  ],
});

const sheets = google.sheets({ version: 'v4', auth });
try {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Sheet1!A1:Z500',
  });
  const rows = res.data.values || [];
  console.log('✅ Sheet read successfully!');
  console.log(`   Total rows: ${rows.length}`);
  if (rows.length > 0) {
    console.log('   Headers:', rows[0]);
  }
  if (rows.length > 1) {
    console.log('   Row 1   :', rows[1]);
  }
} catch (err) {
  console.error('❌ Google Sheets API error:');
  console.error('   Status :', err.status || err.code);
  console.error('   Message:', err.message);
  if (err.errors) console.error('   Errors :', JSON.stringify(err.errors, null, 2));

  if (err.status === 403 || err.status === 404) {
    console.log('\n⚠️  DIAGNOSIS: The sheet is NOT shared with the service account.');
    console.log('   Fix: Share the Google Sheet with:');
    console.log('   👉', saJson.client_email);
    console.log('   Permission: "Viewer" is enough.');
  }
}
