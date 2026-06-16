import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, isNextResponse } from '@/lib/auth';
import { uploadToR2, generateKey } from '@/lib/r2';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if (isNextResponse(auth)) return auth;
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from('admins')
    .select('*, teams(id, name, colour)')
    .eq('id', id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  return NextResponse.json({ data });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req, ['Super Admin', 'Secretary']);
  if (isNextResponse(auth)) return auth;
  const { id } = await params;

  const contentType = req.headers.get('content-type') || '';
  let updates: Record<string, unknown> = {};

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData();
    const photoFile = formData.get('photo') as File | null;

    if (photoFile && photoFile.size > 0) {
      const buffer = Buffer.from(await photoFile.arrayBuffer());
      const key = generateKey('member-photos', photoFile.name);
      updates.photo_url = await uploadToR2(buffer, key, photoFile.type);
    }

    for (const [key, value] of formData.entries()) {
      if (key !== 'photo') updates[key] = value || null;
    }
  } else {
    updates = await req.json();
  }

  const { data, error } = await supabaseAdmin
    .from('admins')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseAdmin.from('audit_logs').insert({
    admin_id: auth.id,
    admin_name: auth.name,
    action: 'UPDATE_MEMBER',
    entity: 'admins',
    entity_id: id,
    detail: `Updated member`,
  });

  return NextResponse.json({ data });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req, ['Super Admin', 'Secretary']);
  if (isNextResponse(auth)) return auth;
  const { id } = await params;

  const { data: member } = await supabaseAdmin
    .from('admins')
    .select('name')
    .eq('id', id)
    .single();

  const { error } = await supabaseAdmin.from('admins').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseAdmin.from('audit_logs').insert({
    admin_id: auth.id,
    admin_name: auth.name,
    action: 'DELETE_MEMBER',
    entity: 'admins',
    entity_id: id,
    detail: `Deleted member: ${member?.name}`,
  });

  return NextResponse.json({ success: true });
}
