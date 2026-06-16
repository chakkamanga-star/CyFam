import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, isNextResponse, getSessionFromRequest } from '@/lib/auth';
import { uploadToR2, generateKey } from '@/lib/r2';
import { normalizeIndianPhone } from '@/lib/phone';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isNextResponse(auth)) return auth;

  const { searchParams } = req.nextUrl;
  const search = searchParams.get('search') || '';
  const team = searchParams.get('team') || '';
  const status = searchParams.get('status') || '';
  const role = searchParams.get('role') || '';
  const sortBy = searchParams.get('sort') || 'name';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('admins')
    .select('*, teams(name, colour)', { count: 'exact' })
    .order(sortBy === 'name' ? 'name' : sortBy, { ascending: true })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
  }
  if (team) {
    const { data: teamData } = await supabaseAdmin.from('teams').select('id').eq('name', team).single();
    if (teamData) query = query.eq('team_id', teamData.id);
  }
  if (status === 'Active') query = query.eq('is_active', true).eq('is_alumni', false);
  if (status === 'Alumni') query = query.eq('is_alumni', true);
  if (status === 'Inactive') query = query.eq('is_active', false);
  if (role) query = query.eq('role', role);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data, count, page, limit });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['Super Admin', 'Secretary']);
  if (isNextResponse(auth)) return auth;

  const formData = await req.formData();
  const name = formData.get('name') as string;
  const phone = formData.get('phone') as string;
  const email = formData.get('email') as string;
  const role = formData.get('role') as string;
  const team_id = formData.get('team_id') as string;
  const dob = formData.get('dob') as string;
  const photoFile = formData.get('photo') as File | null;

  if (!name || !phone) {
    return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 });
  }

  const normalizedPhone = normalizeIndianPhone(phone);
  if (!normalizedPhone) {
    return NextResponse.json(
      { error: 'Invalid phone number. Enter a valid 10-digit Indian mobile number.' },
      { status: 400 }
    );
  }

  let photo_url: string | null = null;
  if (photoFile && photoFile.size > 0) {
    const buffer = Buffer.from(await photoFile.arrayBuffer());
    const key = generateKey('member-photos', photoFile.name);
    photo_url = await uploadToR2(buffer, key, photoFile.type);
  }

  const { data, error } = await supabaseAdmin
    .from('admins')
    .insert({
      name,
      phone: normalizedPhone,
      email: email || null,
      role: role || 'Member',
      team_id: team_id || null,
      dob: dob || null,
      photo_url,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Phone number already registered' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabaseAdmin.from('audit_logs').insert({
    admin_id: auth.id,
    admin_name: auth.name,
    action: 'CREATE_MEMBER',
    entity: 'admins',
    entity_id: data.id,
    detail: `Created member: ${name}`,
  });

  return NextResponse.json({ data }, { status: 201 });
}
