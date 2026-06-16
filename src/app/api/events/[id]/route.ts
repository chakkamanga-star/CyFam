import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, isNextResponse } from '@/lib/auth';
import { uploadToR2, generateKey } from '@/lib/r2';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req);
  if (isNextResponse(auth)) return auth;
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from('events').select('*, teams(id, name)').eq('id', id).single();
  if (error || !data) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ['Super Admin', 'President', 'Secretary']);
  if (isNextResponse(auth)) return auth;
  const { id } = await params;

  const contentType = req.headers.get('content-type') || '';
  let updates: Record<string, unknown> = {};

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData();
    const bannerFile = formData.get('banner') as File | null;
    if (bannerFile && bannerFile.size > 0) {
      const buffer = Buffer.from(await bannerFile.arrayBuffer());
      updates.banner_url = await uploadToR2(buffer, generateKey('event-banners', bannerFile.name), bannerFile.type);
    }
    for (const [key, value] of formData.entries()) {
      if (key !== 'banner') updates[key] = value || null;
    }
  } else {
    updates = await req.json();
  }

  const { data, error } = await supabaseAdmin.from('events').update(updates).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseAdmin.from('audit_logs').insert({
    admin_id: auth.id, admin_name: auth.name, action: 'UPDATE_EVENT', entity: 'events', entity_id: id,
  });
  return NextResponse.json({ data });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ['Super Admin', 'President', 'Secretary']);
  if (isNextResponse(auth)) return auth;
  const { id } = await params;

  const { data: event } = await supabaseAdmin.from('events').select('title').eq('id', id).single();
  const { error } = await supabaseAdmin.from('events').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseAdmin.from('audit_logs').insert({
    admin_id: auth.id, admin_name: auth.name, action: 'DELETE_EVENT', entity: 'events', entity_id: id,
    detail: `Deleted event: ${event?.title}`,
  });
  return NextResponse.json({ success: true });
}
