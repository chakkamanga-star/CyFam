import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, isNextResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isNextResponse(auth)) return auth;

  const { data, error } = await supabaseAdmin
    .from('teams')
    .select('*')
    .order('name', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['Super Admin']);
  if (isNextResponse(auth)) return auth;

  const { name, colour } = await req.json();
  if (!name) return NextResponse.json({ error: 'Team name required' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('teams')
    .insert({ name, colour: colour || '#6366f1' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
