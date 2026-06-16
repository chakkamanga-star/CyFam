import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, isNextResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['Super Admin']);
  if (isNextResponse(auth)) return auth;

  const { data, error } = await supabaseAdmin
    .from('settings')
    .select('key, value');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const settings = Object.fromEntries(data.map((s) => [s.key, s.value]));
  return NextResponse.json({ data: settings });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req, ['Super Admin']);
  if (isNextResponse(auth)) return auth;

  const updates = await req.json() as Record<string, string>;
  for (const [key, value] of Object.entries(updates)) {
    await supabaseAdmin.from('settings').upsert({ key, value, updated_at: new Date().toISOString() });
  }

  await supabaseAdmin.from('audit_logs').insert({
    admin_id: auth.id, admin_name: auth.name, action: 'UPDATE_SETTINGS',
    detail: `Updated: ${Object.keys(updates).join(', ')}`,
  });

  return NextResponse.json({ success: true });
}
