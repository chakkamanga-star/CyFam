import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'cy-app-secret-please-change'
);
const COOKIE_NAME = 'cy_session';

export type SessionPayload = {
  id: string;
  name: string;
  phone: string;
  role: string;
  team_id: string | null;
};

export async function signToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function getSessionFromRequest(req: NextRequest): Promise<SessionPayload | null> {
  const token =
    req.cookies.get(COOKIE_NAME)?.value ||
    req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  return verifyToken(token);
}

export function setSessionCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
  return response;
}

export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.delete(COOKIE_NAME);
  return response;
}

// Use in API route handlers: const session = await requireAuth(req);
export async function requireAuth(
  req: NextRequest,
  allowedRoles?: string[]
): Promise<SessionPayload | NextResponse> {

  // ── Mobile app shortcut ─────────────────────────────────────────
  // If the request comes from the CY mobile app with the correct secret,
  // grant App-level read access directly — no JWT needed.
  // This makes the app robust even if the token-fetch flow fails.
  const mobileSecret = process.env.MOBILE_APP_SECRET || 'cyfam-mobile-2026';
  if (
    req.headers.get('x-client') === 'cy-mobile-app' &&
    req.headers.get('x-app-secret') === mobileSecret
  ) {
    if (allowedRoles && !allowedRoles.includes('App')) {
      return NextResponse.json({ error: 'Forbidden: read-only access' }, { status: 403 });
    }
    return {
      id: 'mobile-app-service',
      name: 'CY Mobile App',
      phone: 'app-service',
      role: 'App',
      team_id: null,
    };
  }

  // ── Normal JWT / cookie auth ────────────────────────────────────
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  // 'App' role = mobile app service account — can read everything but is blocked
  // from write-only routes (those specify allowedRoles explicitly)
  if (allowedRoles && !allowedRoles.includes(session.role) && session.role !== 'App') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  // App role cannot use routes that require specific admin roles
  if (session.role === 'App' && allowedRoles && !allowedRoles.includes('App')) {
    return NextResponse.json({ error: 'Forbidden: read-only access' }, { status: 403 });
  }
  return session;
}

export function isNextResponse(val: unknown): val is NextResponse {
  return val instanceof NextResponse;
}
