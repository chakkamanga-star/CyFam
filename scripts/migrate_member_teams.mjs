import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env.local');

// Parse .env.local manually
const env = {};
readFileSync(envPath, 'utf8').split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const idx = trimmed.indexOf('=');
  if (idx === -1) return;
  env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Check if member_teams already exists
const { error: checkErr } = await supabase.from('member_teams').select('id').limit(1);

if (checkErr?.code === '42P01') {
  console.log('❌ Table does not exist. Please run this SQL in your Supabase dashboard SQL Editor:\n');
  console.log(`-- ══════════════════════════════════════════
-- Multi-team support: member_teams junction
-- ══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS member_teams (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id  uuid NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  team_id    uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_at timestamp DEFAULT now(),
  UNIQUE(member_id, team_id)
);
CREATE INDEX IF NOT EXISTS idx_member_teams_member ON member_teams(member_id);
CREATE INDEX IF NOT EXISTS idx_member_teams_team   ON member_teams(team_id);
ALTER TABLE member_teams DISABLE ROW LEVEL SECURITY;
`);
} else if (checkErr) {
  console.error('DB error:', checkErr.message);
} else {
  console.log('✅ member_teams table already exists!');

  // Seed from existing team_id assignments
  const { data: members } = await supabase
    .from('admins')
    .select('id, team_id')
    .not('team_id', 'is', null);

  let seeded = 0;
  for (const m of (members || [])) {
    const { error } = await supabase
      .from('member_teams')
      .upsert({ member_id: m.id, team_id: m.team_id }, { onConflict: 'member_id,team_id' });
    if (!error) seeded++;
  }
  console.log(`✅ Seeded ${seeded} existing assignments from admins.team_id → member_teams`);
}
