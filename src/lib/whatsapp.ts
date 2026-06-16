/**
 * WhatsApp Business API — OTP sender
 * Uses Meta's Cloud API to send authentication template messages
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/messages/template-messages
 */

import { supabaseAdmin } from './supabase';

const WA_API_VERSION = 'v19.0';
const WA_BASE = `https://graph.facebook.com/${WA_API_VERSION}`;

// Generate a 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Normalize phone: strip everything except digits, ensure 91 prefix for India
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  // If already has country code (12 digits starting with 91), use as-is
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  // If 10-digit Indian number, prepend 91
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export async function sendWhatsAppOTP(
  phone: string
): Promise<{ success: boolean; error?: string }> {
  const phoneNumberId = process.env.WA_PHONE_NUMBER_ID?.trim();
  const accessToken = process.env.WA_ACCESS_TOKEN?.trim();
  const templateName = process.env.WA_OTP_TEMPLATE_NAME?.trim() || 'cy_otp';
  const templateLang = process.env.WA_TEMPLATE_LANG?.trim() || 'en';

  if (!phoneNumberId || !accessToken) {
    return { success: false, error: 'WhatsApp credentials not configured in .env.local' };
  }

  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min
  const toPhone = normalizePhone(phone);

  // Store OTP in DB
  await supabaseAdmin.from('otp_sessions').upsert({
    phone,                        // store as-is (original format) for lookup
    otp_code: otp,
    expires_at: expiresAt.toISOString(),
  });

  // Dev bypass: if phone ends in 0000, skip actual send
  if (phone.endsWith('0000')) {
    return { success: true };
  }

  try {
    const res = await fetch(`${WA_BASE}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: toPhone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: templateLang },
          components: [
            {
              // Body component — the OTP variable {{1}}
              type: 'body',
              parameters: [
                { type: 'text', text: otp },
              ],
            },
            {
              // Button component (copy-code button) — if your template has it
              // Remove this block if your template has no button
              type: 'button',
              sub_type: 'url',
              index: '0',
              parameters: [
                { type: 'text', text: otp },
              ],
            },
          ],
        },
      }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      const errMsg = data.error?.message || JSON.stringify(data);
      console.error('WhatsApp API error:', errMsg);

      // If template has no button, retry without button component
      if (errMsg.includes('button') || errMsg.includes('component')) {
        return await sendWithoutButton(toPhone, phone, otp, phoneNumberId, accessToken, templateName, templateLang);
      }

      return { success: false, error: `WhatsApp OTP failed: ${errMsg}` };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// Retry without button component (for templates without copy-code button)
async function sendWithoutButton(
  toPhone: string, originalPhone: string, otp: string,
  phoneNumberId: string, accessToken: string, templateName: string, templateLang: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${`https://graph.facebook.com/${WA_API_VERSION}`}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: toPhone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: templateLang },
          components: [
            {
              type: 'body',
              parameters: [{ type: 'text', text: otp }],
            },
          ],
        },
      }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      return { success: false, error: `WhatsApp OTP failed: ${data.error?.message || JSON.stringify(data)}` };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// Re-export verifyOTP from termii (same DB-based logic, provider-agnostic)
export async function verifyOTP(
  phone: string,
  otp: string
): Promise<{ valid: boolean; error?: string }> {
  // Try exact phone, then stripped, then with code
  const stripped = phone.replace(/^\+?91/, '');
  const withCode = `91${stripped}`;

  let data = null;
  for (const p of [phone, stripped, withCode]) {
    const { data: row } = await supabaseAdmin
      .from('otp_sessions')
      .select('otp_code, expires_at')
      .eq('phone', p)
      .single();
    if (row) { data = row; break; }
  }

  if (!data) {
    return { valid: false, error: 'No OTP found for this number. Please request a new one.' };
  }

  if (new Date(data.expires_at) < new Date()) {
    return { valid: false, error: 'OTP has expired. Please request a new one.' };
  }

  if (data.otp_code !== otp) {
    return { valid: false, error: 'Incorrect OTP. Please try again.' };
  }

  // Clean up used OTP
  await supabaseAdmin.from('otp_sessions').delete().eq('otp_code', otp);

  return { valid: true };
}
