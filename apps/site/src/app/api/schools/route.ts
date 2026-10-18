import type { NextRequest } from 'next/server';
import { API_URL } from '@/lib/schools';

/** "Find your school" search, proxied to the API so the browser never calls it cross-origin. */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) return Response.json([]);
  try {
    const res = await fetch(`${API_URL}/schools?q=${encodeURIComponent(q)}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error(`API answered ${res.status}`);
    return Response.json(await res.json(), {
      headers: { 'Cache-Control': 'public, max-age=60' },
    });
  } catch {
    return Response.json(
      { message: 'School search is unavailable right now.' },
      { status: 502 },
    );
  }
}
