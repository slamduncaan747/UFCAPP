import { NextResponse, type NextRequest } from 'next/server';

// Authentication is wide open: there is no login, just a one-time "who are you"
// selection stored in the `ufc_user_id` cookie (see lib/identity.ts). This
// middleware only routes based on whether that selection has been made.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isSelectRoute = pathname.startsWith('/auth');
  const isPublicAsset =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js' ||
    pathname.match(/\.(ico|png|jpg|svg|webp)$/);

  if (isPublicAsset) return NextResponse.next();

  const userId = request.cookies.get('ufc_user_id')?.value;

  // No identity picked yet → send them to the picker.
  if (!userId && !isSelectRoute) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // Already picked → skip the picker and the landing page.
  if (userId && (pathname === '/' || isSelectRoute)) {
    return NextResponse.redirect(new URL('/leagues', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
