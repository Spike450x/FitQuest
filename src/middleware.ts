import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Pages accessible without being logged in
const PUBLIC_PATHS = ["/login", "/register"];

// Pages that require auth
const AUTH_PATHS = ["/dashboard", "/character", "/character-creation", "/activities", "/combat", "/quests", "/inventory", "/shop"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Read the Firebase auth session token (set client-side — we check existence only)
  // For full SSR auth, use a session cookie strategy. For MVP this is sufficient.
  const token = request.cookies.get("__session")?.value;
  const isAuthed = Boolean(token);

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isProtected = AUTH_PATHS.some((p) => pathname.startsWith(p));

  // Redirect unauthenticated users away from protected routes
  if (!isAuthed && isProtected) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect authenticated users away from auth pages
  if (isAuthed && isPublic) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).+)",
  ],
};
