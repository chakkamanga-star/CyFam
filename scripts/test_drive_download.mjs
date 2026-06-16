// Test Drive download for one photo from the imported members
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
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});
const drive = google.drive({ version: 'v3', auth });

// Test each photo file ID
const testFiles = [
  { name: 'Georgie jose',      id: '1b3lUQRJ_V5vmTPryQc7WRn_ZjrfiIjdr' },
  { name: 'Harshan B Antony',  id: '17tbaNslHVXTYETWOGssLJ3X1XSwz1bw9' },
  { name: 'Jesteena Thomas',   id: '136UjiLyDbekWxqosxad9dbSncksIkQbH' },
  { name: 'Siyona Maria Sony', id: '14XhD4E6PcGfKBx8yomvFzujtk-mJqjXs' },
  { name: 'Angela Aleya Sajan','id': '1-UVLE5Qrrf6Hn06NNbsd6LZNQanLZwwB' },
];

for (const f of testFiles) {
  try {
    const meta = await drive.files.get({ fileId: f.id, fields: 'mimeType,size,name' });
    const res = await drive.files.get({ fileId: f.id, alt: 'media' }, { responseType: 'arraybuffer' });
    const bytes = Buffer.from(res.data).length;
    console.log(`✅ ${f.name}: ${meta.data.mimeType} | ${bytes} bytes | "${meta.data.name}"`);
  } catch (e) {
    console.log(`❌ ${f.name}: ${e.message}`);
  }
}
