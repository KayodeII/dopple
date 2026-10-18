import type { NextRequest } from 'next/server';
import { API_URL } from '@/lib/schools';

/** Live "is this address free?" check for the sign-up form. */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug') ?? '';
  try {
    const res = await fetch(
      `${API_URL}/schools/availability?slug=${encodeURIComponent(slug)}`,
      { signal: AbortSignal.timeout(3000) },
    );
    if (!res.ok) throw new Error(`API answered ${res.status}`);
    return Response.json(await res.json());
  } catch {
    return Response.json(
      { message: 'Could not check the address.' },
      { status: 502 },
    );
  }
}
