import { NextRequest, NextResponse } from 'next/server';
import { verifyOTP } from '@/lib/whatsapp';
import { supabaseAdmin } from '@/lib/supabase';
import { signToken, setSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { phone, otp } = await req.json();

    if (!phone || !otp) {
      return NextResponse.json({ error: 'Phone and OTP required' }, { status: 400 });
    }

    const result = await verifyOTP(phone, otp);
    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    // Fetch admin record — normalize phone to handle stored format differences
    const stripped = phone.replace(/^\+?91/, '');
    const withCode = `91${stripped}`;

    let { data: admin, error } = await supabaseAdmin
      .from('admins')
      .select('id, name, phone, role, team_id, photo_url')
      .eq('phone', phone)
      .single();

    if (!admin) {
      const r2 = await supabaseAdmin.from('admins').select('id, name, phone, role, team_id, photo_url').eq('phone', stripped).single();
      if (r2.data) { admin = r2.data; error = null; }
    }
    if (!admin) {
      const r3 = await supabaseAdmin.from('admins').select('id, name, phone, role, team_id, photo_url').eq('phone', withCode).single();
      if (r3.data) { admin = r3.data; error = null; }
    }

    if (error || !admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    // Log audit
    await supabaseAdmin.from('audit_logs').insert({
      admin_id: admin.id,
      admin_name: admin.name,
      action: 'LOGIN',
      entity: 'auth',
      detail: `Logged in via OTP`,
    });

    const token = await signToken({
      id: admin.id,
      name: admin.name,
      phone: admin.phone,
      role: admin.role,
      team_id: admin.team_id,
    });

    const response = NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        name: admin.name,
        role: admin.role,
        photo_url: admin.photo_url,
      },
    });

    return setSessionCookie(response, token);
  } catch (err) {
    console.error('verify-otp error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE() {
  // Logout
  const response = NextResponse.json({ success: true });
  response.cookies.delete('cy_session');
  return response;
}
