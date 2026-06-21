import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { signToken } from '@/lib/auth';

/**
 * GET /api/app-token
 * Returns a long-lived JWT for the mobile member app (no login required).
 * The token is tied to a special "app" service account in the admins table.
 * Protected by a shared app secret from env.
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get('X-App-Secret');
  const expectedSecret = process.env.MOBILE_APP_SECRET;

  // If no secret configured, deny
  if (!expectedSecret) {
    return NextResponse.json({ error: 'App token not configured' }, { status: 503 });
  }

  if (secret !== expectedSecret) {
    return NextResponse.json({ error: 'Invalid app secret' }, { status: 401 });
  }

  // Find or create the "app" service account
  let { data: appAccount } = await supabaseAdmin
    .from('admins')
    .select('id, name, phone, role, team_id')
    .eq('role', 'App')
    .eq('is_active', true)
    .single();

  if (!appAccount) {
    // Create a read-only app service account
    const { data: created } = await supabaseAdmin
      .from('admins')
      .upsert(
        { name: 'CY Mobile App', phone: 'app-service', role: 'App', is_active: true },
        { onConflict: 'phone', ignoreDuplicates: false }
      )
      .select()
      .single();
    appAccount = created;
  }

  // Fallback: generate token with a deterministic ID if DB is unavailable
  const accountId = appAccount?.id ?? '00000000-0000-0000-0000-cyfam-mobile';

  // Sign a 30-day token
  const token = await signToken({
    id: accountId,
    name: 'CY Mobile App',
    phone: 'app-service',
    role: 'App',
    team_id: null,
  });

  return NextResponse.json({ token, expiresIn: '30d' });
}
