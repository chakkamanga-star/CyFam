import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, isNextResponse } from '@/lib/auth';
import { uploadToR2, generateKey } from '@/lib/r2';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isNextResponse(auth)) return auth;

  const { searchParams } = req.nextUrl;
  const album = searchParams.get('album') || '';
  const eventId = searchParams.get('event_id') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '30');
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('media')
    .select('*, events(title)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (album) query = query.eq('album_name', album);
  if (eventId) query = query.eq('event_id', eventId);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Group by album_name for album view
  const albums = data
    ? [...new Set(data.map((m) => m.album_name).filter(Boolean))]
    : [];

  return NextResponse.json({ data, count, albums, page, limit });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['Super Admin', 'Media Admin']);
  if (isNextResponse(auth)) return auth;

  const formData = await req.formData();
  const files = formData.getAll('files') as File[];
  const album_name = formData.get('album_name') as string;
  const event_id = (formData.get('event_id') as string) || null;

  if (!files || files.length === 0) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 });
  }

  const uploaded: string[] = [];
  const errors: string[] = [];

  for (const file of files) {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const key = generateKey('media', file.name);
      const file_url = await uploadToR2(buffer, key, file.type);

      await supabaseAdmin.from('media').insert({
        file_url,
        album_name: album_name || 'General',
        event_id,
        uploaded_by: auth.id,
        file_size: file.size,
      });

      uploaded.push(file_url);
    } catch (e) {
      errors.push(`${file.name}: ${String(e)}`);
    }
  }

  await supabaseAdmin.from('audit_logs').insert({
    admin_id: auth.id, admin_name: auth.name, action: 'UPLOAD_MEDIA', entity: 'media',
    detail: `Uploaded ${uploaded.length} photos to album: ${album_name}`,
  });

  return NextResponse.json({ uploaded, errors }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req, ['Super Admin', 'Media Admin']);
  if (isNextResponse(auth)) return auth;

  const { ids } = await req.json();
  if (!ids || !Array.isArray(ids)) {
    return NextResponse.json({ error: 'ids array required' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from('media').delete().in('id', ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, deleted: ids.length });
}
