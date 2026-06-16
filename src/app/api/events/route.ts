import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, isNextResponse } from '@/lib/auth';
import { uploadToR2, generateKey } from '@/lib/r2';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isNextResponse(auth)) return auth;

  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabaseAdmin
    .from('events')
    .select('*, teams(name)', { count: 'exact' })
    .order('event_date', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, count, page, limit });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['Super Admin', 'President', 'Secretary']);
  if (isNextResponse(auth)) return auth;

  const contentType = req.headers.get('content-type') || '';
  let title = '', description = '', event_date = '', location = '', type = 'Church Event',
      team_id: string | null = null, is_recurring = false;
  let banner_url: string | null = null;

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData();
    title = formData.get('title') as string;
    description = formData.get('description') as string;
    event_date = formData.get('event_date') as string;
    location = formData.get('location') as string;
    type = (formData.get('type') as string) || 'Church Event';
    team_id = (formData.get('team_id') as string) || null;
    is_recurring = formData.get('is_recurring') === 'true';

    const bannerFile = formData.get('banner') as File | null;
    if (bannerFile && bannerFile.size > 0) {
      const buffer = Buffer.from(await bannerFile.arrayBuffer());
      const key = generateKey('event-banners', bannerFile.name);
      banner_url = await uploadToR2(buffer, key, bannerFile.type);
    }
  } else {
    const body = await req.json();
    ({ title, description, event_date, location, type, team_id, is_recurring } = body);
  }

  if (!title || !event_date) {
    return NextResponse.json({ error: 'Title and event date are required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('events')
    .insert({
      title, description, event_date, location, type,
      team_id: team_id || null, is_recurring, banner_url,
      created_by: auth.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseAdmin.from('audit_logs').insert({
    admin_id: auth.id, admin_name: auth.name,
    action: 'CREATE_EVENT', entity: 'events', entity_id: data.id,
    detail: `Created event: ${title}`,
  });

  return NextResponse.json({ data }, { status: 201 });
}
