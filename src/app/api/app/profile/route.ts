import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const APP_SECRET = 'cyfam-mobile-2026';

export async function POST(req: NextRequest) {
  // Validate mobile client
  const clientHeader = req.headers.get('x-client');
  const secretHeader = req.headers.get('x-app-secret');
  if (clientHeader !== 'cy-mobile-app' || secretHeader !== APP_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { name, designation } = body;

  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('mobile_app_users')
      .insert({
        name: name.trim(),
        designation: designation?.trim() || null,
        registered_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      // Table might not exist yet — still return success to not block onboarding
      console.error('[app/profile] Supabase error:', error.message);
      return NextResponse.json({ ok: true, saved: false, error: error.message });
    }

    return NextResponse.json({ ok: true, saved: true, data });
  } catch (err) {
    console.error('[app/profile] Error:', err);
    return NextResponse.json({ ok: true, saved: false });
  }
}
