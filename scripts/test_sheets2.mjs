// Full end-to-end test: read sheet, detect columns, simulate import
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

const res = await sheets.spreadsheets.values.get({
  spreadsheetId: SHEET_ID,
  range: 'consolidated form!A1:Z1000',
});
const rows = res.data.values || [];
console.log('Total rows (incl header):', rows.length);
console.log('Data rows to import:', rows.length - 1);

const FIELD_ALIASES = {
  full_name: ['name', 'full name', 'student name', 'your name', 'member name'],
  dob: ['date of birth', 'dob', 'birthday', 'birth date'],
  phone: ['phone', 'mobile', 'contact number', 'phone number', 'mobile number'],
  email: ['email', 'email address', 'e-mail', 'mail'],
  team: ['team', 'group', 'unit', 'wing', 'ministry', 'department'],
  photo_url: ['photo', 'image', 'profile photo', 'file upload', 'profile picture'],
};

const headers = rows[0];
const detected = headers.map(h => {
  const lower = (h || '').toLowerCase().trim();
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.some(a => lower.includes(a))) return field;
  }
  return 'ignore';
});

console.log('\n--- Column Mapping ---');
headers.forEach((h, i) => {
  const icon = detected[i] === 'ignore' ? '  ✗ IGNORE' : '  ✅ => ' + detected[i];
  console.log(`  [${i}] "${h}" ${icon}`);
});

console.log('\n--- Extracted Member Data ---');
const members = [];
rows.slice(1).forEach((row, i) => {
  const obj = {};
  detected.forEach((field, j) => {
    if (field !== 'ignore') obj[field] = row[j] || '';
  });

  // Validate phone
  const rawPhone = (obj.phone || '').replace(/\D/g, '');
  const phoneOk = rawPhone.length >= 10;

  console.log(`\nRow ${i + 1}:`);
  console.log('  name     :', obj.full_name || '❌ MISSING');
  console.log('  phone    :', obj.phone || '❌ MISSING', phoneOk ? '✅' : '⚠️  bad format');
  console.log('  email    :', obj.email || '—');
  console.log('  dob      :', obj.dob || '—');
  console.log('  photo_url:', obj.photo_url ? obj.photo_url.slice(0, 60) + '...' : '—');

  members.push({ ...obj, phone_clean: rawPhone, phone_ok: phoneOk });
});

console.log('\n--- Summary ---');
console.log('Total members ready to import:', members.filter(m => m.phone_ok).length);
console.log('Rows with phone issues        :', members.filter(m => !m.phone_ok).length);
console.log('\nNote: photo_url values are Google Drive links — they will be stored as-is (no R2 upload during sheet import)');
