import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

const PUBLIC_PATHS = [
  '/',
  '/api/auth/login',
  '/api/app-token',   // Mobile app fetches its JWT here — auth via X-App-Secret, not session
];

const COOKIE_NAME = 'cy_session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Always allow static Next.js assets ─────────────────────────
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // ── Public paths — no auth needed ──────────────────────────────
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();

  // ── All /api/auth/* routes are public (login, OTP, etc.) ───────
  if (pathname.startsWith('/api/auth/')) return NextResponse.next();

  // ── Mobile app bearer token — auth handled per-route by requireAuth ─
  if (request.headers.get('X-Client') === 'cy-mobile-app') {
    return NextResponse.next();
  }

  // ── Everything else needs a valid session ───────────────────────
  const token =
    request.cookies.get(COOKIE_NAME)?.value ||
    request.headers.get('Authorization')?.replace('Bearer ', '');

  const session = token ? await verifyToken(token) : null;

  if (!session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
