import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, isNextResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isNextResponse(auth)) return auth;

  const { data: teams } = await supabaseAdmin.from('teams').select('id, name, colour');
  if (!teams) return NextResponse.json({ data: [] });

  const result = await Promise.all(
    teams.map(async (team) => {
      const { count } = await supabaseAdmin
        .from('admins')
        .select('id', { count: 'exact', head: true })
        .eq('team_id', team.id)
        .eq('is_active', true);
      return { name: team.name, value: count ?? 0, colour: team.colour };
    })
  );

  return NextResponse.json({ data: result.filter((t) => t.value > 0) });
}
