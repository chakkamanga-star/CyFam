import { supabaseAdmin } from './supabase';

const TERMII_API_KEY = process.env.TERMII_API_KEY!;
const TERMII_SENDER_ID = process.env.TERMII_SENDER_ID || 'Cy_Family';
const TERMII_BASE = 'https://api.ng.termii.com/api';

// Generate a 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendOTP(phone: string): Promise<{ success: boolean; error?: string }> {
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  // Store OTP in DB (plain text for simplicity — rotate short TTL)
  await supabaseAdmin.from('otp_sessions').upsert({
    phone,
    otp_code: otp,
    expires_at: expiresAt.toISOString(),
  });

  // Dev bypass: if phone ends in 0000, accept any OTP
  if (phone.endsWith('0000')) {
    return { success: true };
  }

  // Normalize phone for SMS — Termii needs full number with country code
  const smsPhone = phone.replace(/^\+?91/, ''); // strip if present
  const fullPhone = `91${smsPhone}`;             // always add 91 for Termii

  const smsText = `Your CY Admin OTP is: ${otp}. Valid for 10 minutes. Do not share.`;

  try {
    // Use 'generic' channel first — works without Sender ID approval
    const res = await fetch(`${TERMII_BASE}/sms/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: fullPhone,
        from: 'N-Alert',          // Termii default — no registration needed
        sms: smsText,
        type: 'plain',
        channel: 'generic',
        api_key: TERMII_API_KEY,
      }),
    });

    const resData = await res.json().catch(() => ({}));

    if (!res.ok || resData.code === 404) {
      // Fallback: try dnd with registered sender ID
      const res2 = await fetch(`${TERMII_BASE}/sms/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: fullPhone,
          from: TERMII_SENDER_ID,
          sms: smsText,
          type: 'plain',
          channel: 'dnd',
          api_key: TERMII_API_KEY,
        }),
      });
      if (!res2.ok) {
        const err = await res2.text();
        return { success: false, error: `SMS failed: ${err}` };
      }
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function verifyOTP(
  phone: string,
  otp: string
): Promise<{ valid: boolean; error?: string }> {
  const { data, error } = await supabaseAdmin
    .from('otp_sessions')
    .select('otp_code, expires_at')
    .eq('phone', phone)
    .single();

  if (error || !data) {
    return { valid: false, error: 'No OTP found for this number. Please request a new one.' };
  }

  if (new Date(data.expires_at) < new Date()) {
    return { valid: false, error: 'OTP has expired. Please request a new one.' };
  }

  if (data.otp_code !== otp) {
    return { valid: false, error: 'Incorrect OTP. Please try again.' };
  }

  // Clean up used OTP
  await supabaseAdmin.from('otp_sessions').delete().eq('phone', phone);

  return { valid: true };
}
