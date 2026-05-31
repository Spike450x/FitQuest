import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Paths that do NOT require authentication
const PUBLIC_PATHS = ['/login', '/register', '/privacy', '/terms'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get('__session')?.value;
  const isAuthed = Boolean(token);

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // Every route is protected by default — no AUTH_PATHS allowlist to maintain.
  if (!isAuthed && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAuthed && isPublic) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).+)'],
};
