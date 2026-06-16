import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, isNextResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isNextResponse(auth)) return auth;

  // Fetch full admin record including photo_url
  const { data, error } = await supabaseAdmin
    .from('admins')
    .select('id, name, phone, role, photo_url, teams(name, colour)')
    .eq('id', auth.id)
    .single();

  if (error || !data) {
    // Fallback to session data if DB lookup fails
    return NextResponse.json({ data: { id: auth.id, name: auth.name, role: auth.role, photo_url: null } });
  }

  return NextResponse.json({ data });
}
