import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

const PUBLIC_PATHS = [
  '/',
  '/api/auth/login',
  '/api/app-token',        // Mobile app token endpoint — authenticated by X-App-Secret
];
const COOKIE_NAME = 'cy_session';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();

  // Allow all /api/auth/* routes
  if (pathname.startsWith('/api/auth/')) return NextResponse.next();

  // Allow mobile app client through — app-level auth handled by requireAuth in each route
  if (request.headers.get('X-Client') === 'cy-mobile-app') return NextResponse.next();

  // Allow static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check session for protected routes
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
