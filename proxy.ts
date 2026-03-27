import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "anonymous_session_id";

export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  if (!request.cookies.get(COOKIE_NAME)) {
    response.cookies.set(COOKIE_NAME, crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
