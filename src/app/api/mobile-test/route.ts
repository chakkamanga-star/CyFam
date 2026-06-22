import { NextRequest, NextResponse } from 'next/server';

// Temporary diagnostic endpoint — safe to keep (returns no sensitive data)
export async function GET(req: NextRequest) {
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => { headers[key] = value; });

  const mobileSecret = process.env.MOBILE_APP_SECRET || 'cyfam-mobile-2026';
  const xClient = req.headers.get('x-client');
  const xSecret = req.headers.get('x-app-secret');

  return NextResponse.json({
    received_x_client: xClient,
    received_x_app_secret: xSecret ? `${xSecret.slice(0, 6)}…` : null,
    secret_matches: xSecret === mobileSecret,
    is_mobile: xClient === 'cy-mobile-app' && xSecret === mobileSecret,
    env_secret_set: !!process.env.MOBILE_APP_SECRET,
    all_headers: Object.keys(headers).filter(k => k.startsWith('x-')),
  });
}
