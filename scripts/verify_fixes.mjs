// Verify both fixes against the real sheet
const fs = await import('fs');
const envRaw = fs.readFileSync('.env.local', 'utf8');
const env = {};
for (const line of envRaw.split('\n')) {
  const c = line.trim();
  if (!c || c.startsWith('#')) continue;
  const i = c.indexOf('=');
  if (i === -1) continue;
  env[c.slice(0, i)] = c.slice(i + 1);
}
const saJson = JSON.parse(env['GOOGLE_SERVICE_ACCOUNT_JSON']);
const { google } = await import('googleapis');
const auth = new google.auth.GoogleAuth({
  credentials: saJson,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});
const sheets = google.sheets({ version: 'v4', auth });
const SHEET_ID = '10TYifV6ItQg-pZIhdTNwwFIymBWcaejC6PM-q8jdjf4';

// --- FIX 2: Dynamic first tab ---
const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
const firstTab = meta.data.sheets?.[0]?.properties?.title ?? 'Sheet1';
console.log('✅ Fix 2 — First tab detected:', JSON.stringify(firstTab));

const res = await sheets.spreadsheets.values.get({
  spreadsheetId: SHEET_ID,
  range: `${firstTab}!A1:Z1000`,
});
const rows = res.data.values || [];
console.log('   Rows read:', rows.length, '(1 header +', rows.length - 1, 'data rows)');

// --- FIX 1: New column detection ---
const FIELD_ALIASES = {
  full_name:  ['name', 'full name', 'student name', 'your name', 'member name'],
  dob:        ['date of birth', 'dob', 'birthday', 'birth date', 'date of birth (dd/mm/yyyy)'],
  phone:      ['phone', 'mobile', 'contact number', 'phone number', 'mobile number'],
  email:      ['email', 'email address', 'e-mail', 'mail'],
  team:       ['team', 'group', 'unit', 'wing', 'ministry', 'department'],
  photo_url:  ['photo', 'image', 'profile photo', 'file upload', 'profile picture'],
};
const candidates = [];
for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
  for (const alias of aliases) candidates.push({ field, alias });
}
candidates.sort((a, b) => b.alias.length - a.alias.length);

function detect(h) {
  const lower = (h || '').toLowerCase().trim();
  for (const { field, alias } of candidates) { if (lower === alias) return field; }
  for (const { field, alias } of candidates) { if (alias.length >= 5 && lower.startsWith(alias)) return field; }
  for (const { field, alias } of candidates) { if (alias.length >= 5 && lower.includes(alias)) return field; }
  return 'ignore';
}

const headers = rows[0];
const detected = headers.map(detect);

console.log('\n✅ Fix 1 — Column mapping:');
let allGood = true;
headers.forEach((h, i) => {
  const d = detected[i];
  const icon = d === 'ignore' ? '  ✗ ignore' : `  ✅ => ${d}`;
  // Flag the "Name of Parish" false-positive
  if (h.toLowerCase().includes('parish') && d === 'full_name') {
    console.log(`  [${i}] "${h}" ❌ STILL WRONG => ${d}`);
    allGood = false;
  } else {
    console.log(`  [${i}] "${h}"${icon}`);
  }
});
if (allGood) console.log('\n✅ No false-positive mappings!');

console.log('\n--- Member data that would be imported ---');
rows.slice(1).forEach((row, i) => {
  const obj = {};
  detected.forEach((field, j) => { if (field !== 'ignore') obj[field] = row[j] || ''; });
  const phone = (obj.phone || '').replace(/\D/g, '');
  console.log(`\nMember ${i + 1}:`);
  console.log('  name :', obj.full_name || '❌ MISSING');
  console.log('  phone:', obj.phone, '→ cleaned:', phone, phone.length >= 10 ? '✅' : '⚠️');
  console.log('  email:', obj.email || '—');
  console.log('  dob  :', obj.dob || '—');
  console.log('  photo:', obj.photo_url ? obj.photo_url.slice(0, 55) + '...' : '—');
});
