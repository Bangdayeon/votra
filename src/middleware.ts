import { NextResponse, type NextRequest } from "next/server";

import {
  SESSION_COOKIE_NAME,
  verifySessionJwt,
} from "@/infrastructure/auth/session";

const PUBLIC_PATHS = [/^\/auth\//, /^\/api\//];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((re) => re.test(pathname))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionJwt(token) : null;

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth/sign-in";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Next.js 내부 (_next), 정적 파일, favicon 은 제외
    "/((?!_next/static|_next/image|favicon.ico|assets/).*)",
  ],
};
