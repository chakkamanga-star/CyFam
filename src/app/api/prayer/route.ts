import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, isNextResponse } from '@/lib/auth';

function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay()); // Sunday
  return d.toISOString().split('T')[0];
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isNextResponse(auth)) return auth;

  const { searchParams } = req.nextUrl;
  const weekStart = searchParams.get('week') || getWeekStart();

  const { data, error } = await supabaseAdmin
    .from('prayer_schedules')
    .select('*, teams(name, colour)')
    .eq('week_start', weekStart)
    .order('day_of_week', { ascending: true })
    .order('slot_time', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, weekStart });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req, ['Super Admin', 'Secretary']);
  if (isNextResponse(auth)) return auth;

  const { slots, week_start } = await req.json();
  if (!slots || !Array.isArray(slots)) {
    return NextResponse.json({ error: 'slots array required' }, { status: 400 });
  }

  const weekStart = week_start || getWeekStart();

  // Delete existing for this week and re-insert
  await supabaseAdmin.from('prayer_schedules').delete().eq('week_start', weekStart);

  if (slots.length > 0) {
    const toInsert = slots.map((s: Record<string, unknown>) => ({ ...s, week_start: weekStart }));
    const { error } = await supabaseAdmin.from('prayer_schedules').insert(toInsert);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabaseAdmin.from('audit_logs').insert({
    admin_id: auth.id, admin_name: auth.name,
    action: 'UPDATE_PRAYER_SCHEDULE', entity: 'prayer_schedules',
    detail: `Updated prayer schedule for week: ${weekStart}`,
  });

  return NextResponse.json({ success: true });
}
