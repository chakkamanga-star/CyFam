import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { signToken } from '@/lib/auth';

const FALLBACK_SECRET = 'cyfam-mobile-2026';
const FALLBACK_ID     = '00000000-0000-0000-0000-cyfam-mobile';

/**
 * GET /api/app-token
 * Returns a JWT for the mobile member app (no login required).
 * Protected by a shared secret. Supabase lookup is optional — we always
 * return a token even if the DB is unavailable, using a deterministic ID.
 */
export async function GET(req: NextRequest) {
  const secret         = req.headers.get('x-app-secret') ?? req.headers.get('X-App-Secret');
  const expectedSecret = process.env.MOBILE_APP_SECRET || FALLBACK_SECRET;

  if (secret !== expectedSecret) {
    return NextResponse.json({ error: 'Invalid app secret' }, { status: 401 });
  }

  // Try to find/create service account — but give it only 3 seconds max
  // so we always respond quickly even if Supabase is slow.
  let accountId = FALLBACK_ID;

  try {
    const dbResult = await Promise.race<string>([
      (async () => {
        // Look for existing App service account
        const { data } = await supabaseAdmin
          .from('admins')
          .select('id')
          .eq('role', 'App')
          .eq('is_active', true)
          .maybeSingle();

        if (data?.id) return data.id;

        // Create one if missing
        const { data: created } = await supabaseAdmin
          .from('admins')
          .upsert(
            { name: 'CY Mobile App', phone: 'app-service', role: 'App', is_active: true },
            { onConflict: 'phone' }
          )
          .select('id')
          .single();

        return created?.id ?? FALLBACK_ID;
      })(),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('DB timeout')), 3000)
      ),
    ]);
    accountId = dbResult;
  } catch {
    // DB unavailable or slow — use deterministic fallback ID
    accountId = FALLBACK_ID;
  }

  const token = await signToken({
    id:      accountId,
    name:    'CY Mobile App',
    phone:   'app-service',
    role:    'App',
    team_id: null,
  });

  return NextResponse.json({ token, expiresIn: '7d' });
}
