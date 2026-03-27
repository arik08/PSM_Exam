import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "anonymous_session_id";
const SESSION_HEADER_NAME = "x-anonymous-session-id";

export function proxy(request: NextRequest) {
  const sessionId = request.cookies.get(COOKIE_NAME)?.value ?? crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(SESSION_HEADER_NAME, sessionId);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });

  if (!request.cookies.get(COOKIE_NAME)) {
    response.cookies.set(COOKIE_NAME, sessionId, {
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
