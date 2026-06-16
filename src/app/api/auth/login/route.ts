import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { signToken, setSessionCookie } from '@/lib/auth';

const ADMIN_PHONE = '9993612014';
const ADMIN_PASSWORD = 'CyFam2026';

export async function POST(req: NextRequest) {
  try {
    const { phone, password } = await req.json();

    if (!phone || !password) {
      return NextResponse.json({ error: 'Phone and password required' }, { status: 400 });
    }

    // Normalize phone — strip country code if present
    const stripped = phone.replace(/^(\+?91)/, '').replace(/\D/g, '');

    // Validate credentials
    if (stripped !== ADMIN_PHONE || password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid phone number or password.' }, { status: 401 });
    }

    // Fetch admin record — try all stored formats
    const withCode = `91${stripped}`;
    let admin = null;

    for (const p of [stripped, withCode, `+91${stripped}`]) {
      const { data } = await supabaseAdmin
        .from('admins')
        .select('id, name, phone, role, team_id, photo_url, is_active')
        .eq('phone', p)
        .single();
      if (data) { admin = data; break; }
    }

    if (!admin) {
      return NextResponse.json({ error: 'Admin account not found. Contact your Super Admin.' }, { status: 404 });
    }

    if (!admin.is_active) {
      return NextResponse.json({ error: 'Your account has been deactivated. Contact your Super Admin.' }, { status: 403 });
    }

    // Log audit
    await supabaseAdmin.from('audit_logs').insert({
      admin_id: admin.id,
      admin_name: admin.name,
      action: 'LOGIN',
      entity: 'auth',
      detail: 'Logged in via password',
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
    console.error('login error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE() {
  // Logout — clear session cookie
  const response = NextResponse.json({ success: true });
  response.cookies.delete('cy_session');
  return response;
}
