import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, isNextResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isNextResponse(auth)) return auth;

  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabaseAdmin
    .from('notifications')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, count });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['Super Admin', 'President', 'Secretary']);
  if (isNextResponse(auth)) return auth;

  const { title, body, type, target_type, target_id, scheduled_at } = await req.json();

  if (!title || !body) {
    return NextResponse.json({ error: 'Title and body are required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('notifications')
    .insert({
      title, body,
      type: type || 'info',
      target_type: target_type || 'all',
      target_id: target_id || null,
      scheduled_at: scheduled_at || null,
      sent_at: scheduled_at ? null : new Date().toISOString(),
      created_by: auth.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseAdmin.from('audit_logs').insert({
    admin_id: auth.id, admin_name: auth.name,
    action: 'SEND_NOTIFICATION', entity: 'notifications', entity_id: data.id,
    detail: `Sent: "${title}" to ${target_type}`,
  });

  return NextResponse.json({ data }, { status: 201 });
}
