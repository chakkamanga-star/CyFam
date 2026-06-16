import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isNextResponse } from '@/lib/auth';

/**
 * Server-side download proxy.
 * Usage: GET /api/download?url=<encoded_url>&filename=<desired_filename>
 *
 * The server fetches the file (bypassing browser CORS restrictions) and
 * returns it with Content-Disposition: attachment so the browser saves it.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isNextResponse(auth)) return auth;

  const { searchParams } = req.nextUrl;
  const url = searchParams.get('url');
  const filename = searchParams.get('filename') || 'download.jpg';

  if (!url) {
    return NextResponse.json({ error: 'url param required' }, { status: 400 });
  }

  // Only allow downloads from our own R2 bucket
  const R2_PUBLIC = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '';
  if (R2_PUBLIC && !url.startsWith(R2_PUBLIC)) {
    return NextResponse.json({ error: 'URL not allowed' }, { status: 403 });
  }

  const upstream = await fetch(url);
  if (!upstream.ok) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
  const body = await upstream.arrayBuffer();

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      'Content-Length': String(body.byteLength),
    },
  });
}
