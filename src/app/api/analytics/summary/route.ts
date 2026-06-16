import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, isNextResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isNextResponse(auth)) return auth;

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const [members, events, media, upcomingEvents, recentLogs, birthdaysThisWeek, upcomingEventsData] = await Promise.all([
    supabaseAdmin.from('admins').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabaseAdmin.from('events').select('id', { count: 'exact', head: true }).gte('event_date', monthStart),
    supabaseAdmin.from('media').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('events').select('id', { count: 'exact', head: true }).gte('event_date', today),
    supabaseAdmin.from('audit_logs').select('admin_name, action, entity, detail, created_at').order('created_at', { ascending: false }).limit(5),
    supabaseAdmin.from('admins')
      .select('id, name, dob, photo_url')
      .not('dob', 'is', null)
      .eq('is_active', true),
    supabaseAdmin.from('events')
      .select('id, title, event_date, type, location, banner_url')
      .gte('event_date', today)
      .order('event_date', { ascending: true })
      .limit(6),
  ]);

  // Filter birthdays in next 7 days
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const birthdays = (birthdaysThisWeek.data || []).filter((m) => {
    if (!m.dob) return false;
    const dob = new Date(m.dob);
    const thisYear = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
    return thisYear >= now && thisYear <= nextWeek;
  }).slice(0, 5);

  return NextResponse.json({
    totalMembers: members.count ?? 0,
    eventsThisMonth: events.count ?? 0,
    photosUploaded: media.count ?? 0,
    upcomingEvents: upcomingEvents.count ?? 0,
    recentActivity: recentLogs.data ?? [],
    upcomingBirthdays: birthdays,
    upcomingEventsData: upcomingEventsData.data ?? [],
  });
}
