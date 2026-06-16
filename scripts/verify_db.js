// Quick DB verification using existing Supabase client
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ektbhxjpextknqouksnc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrdGJoeGpwZXh0a25xb3Vrc25jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTE2NjY4NCwiZXhwIjoyMDk2NzQyNjg0fQ.cqtjYNhzfIF0mGNQggacrycOxuOKmjcgaJ8r31IgAa4'
);

async function verify() {
  const tables = [
    'admins','teams','events','media','notifications',
    'prayer_schedules','bible_quotes','organization',
    'settings','audit_logs','otp_sessions'
  ];

  console.log('=== TABLE CHECK ===');
  let allOk = true;
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    const ok = !error;
    if (!ok) allOk = false;
    console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${table}${error ? ' -> ' + error.message : ''}`);
  }

  console.log('\n=== TEAMS SEEDED ===');
  const { data: teams } = await supabase.from('teams').select('name,colour').order('name');
  (teams || []).forEach(t => console.log(`  ${t.name}  (${t.colour})`));
  console.log(`  Total: ${(teams||[]).length} teams (expected 9)`);

  console.log('\n=== BIBLE QUOTES ===');
  const { data: verses } = await supabase.from('bible_quotes').select('reference');
  (verses || []).forEach(v => console.log(`  ${v.reference}`));

  console.log('\n=== ORGANIZATION ===');
  const { data: org } = await supabase.from('organization').select('name,tagline,founded_year');
  if (org && org[0]) {
    console.log(`  Name: ${org[0].name}`);
    console.log(`  Tagline: ${org[0].tagline}`);
    console.log(`  Founded: ${org[0].founded_year}`);
  } else {
    console.log('  MISSING!');
  }

  console.log('\n=== SETTINGS ===');
  const { data: settings } = await supabase.from('settings').select('key,value');
  (settings || []).forEach(s => console.log(`  ${s.key} = ${s.value}`));

  console.log('\n=== ADMINS ===');
  const { data: admins } = await supabase.from('admins').select('name,phone,role').limit(5);
  if (admins && admins.length > 0) {
    admins.forEach(a => console.log(`  ${a.name} | ${a.phone} | ${a.role}`));
  } else {
    console.log('  NO ADMINS YET - you need to add yourself!');
  }

  console.log('\n=== SUMMARY ===');
  console.log(allOk ? '✅ All tables OK!' : '❌ Some tables MISSING - re-run schema!');
}

verify().catch(console.error);
