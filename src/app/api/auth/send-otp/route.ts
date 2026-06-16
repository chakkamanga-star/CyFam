import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppOTP } from '@/lib/whatsapp';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();

    if (!phone || phone.replace(/\D/g, '').length < 10) {
      return NextResponse.json({ error: 'Valid phone number required' }, { status: 400 });
    }

    // Normalize: strip country code prefix for DB lookup
    const stripped = phone.replace(/^\+?91/, '');
    const withCode = `91${stripped}`;

    // Try all formats in DB
    let admin = null;
    for (const p of [phone, stripped, withCode]) {
      const { data } = await supabaseAdmin
        .from('admins')
        .select('id, name, role, is_active')
        .eq('phone', p)
        .single();
      if (data) { admin = data; break; }
    }

    if (!admin) {
      return NextResponse.json(
        { error: 'Phone number not registered as an admin. Contact your Super Admin.' },
        { status: 404 }
      );
    }

    if (!admin.is_active) {
      return NextResponse.json(
        { error: 'Your account has been deactivated. Contact your Super Admin.' },
        { status: 403 }
      );
    }

    // Send OTP via WhatsApp
    const result = await sendWhatsAppOTP(stripped); // always pass 10-digit
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to send OTP' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'OTP sent to your WhatsApp' });
  } catch (err) {
    console.error('send-otp error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
