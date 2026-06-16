import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, isNextResponse } from '@/lib/auth';
import { uploadToR2, generateKey } from '@/lib/r2';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isNextResponse(auth)) return auth;

  const { data, error } = await supabaseAdmin.from('organization').select('*').limit(1).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req, ['Super Admin']);
  if (isNextResponse(auth)) return auth;

  const contentType = req.headers.get('content-type') || '';
  let updates: Record<string, unknown> = {};

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData();
    const logoFile = formData.get('logo') as File | null;
    if (logoFile && logoFile.size > 0) {
      const buffer = Buffer.from(await logoFile.arrayBuffer());
      updates.logo_url = await uploadToR2(buffer, generateKey('org', logoFile.name), logoFile.type);
    }
    for (const [key, value] of formData.entries()) {
      if (key !== 'logo') {
        try { updates[key] = JSON.parse(value as string); }
        catch { updates[key] = value; }
      }
    }
  } else {
    updates = await req.json();
  }

  updates.updated_at = new Date().toISOString();

  const { data: existing } = await supabaseAdmin.from('organization').select('id').limit(1).single();
  let result;
  if (existing) {
    result = await supabaseAdmin.from('organization').update(updates).eq('id', existing.id).select().single();
  } else {
    result = await supabaseAdmin.from('organization').insert(updates).select().single();
  }

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });

  await supabaseAdmin.from('audit_logs').insert({
    admin_id: auth.id, admin_name: auth.name, action: 'UPDATE_ABOUT', entity: 'organization',
  });

  return NextResponse.json({ data: result.data });
}
