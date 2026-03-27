import { cookies, headers } from "next/headers";

export const SESSION_COOKIE_NAME = "anonymous_session_id";
const SESSION_HEADER_NAME = "x-anonymous-session-id";

export async function getSessionId() {
  const headerStore = await headers();
  const headerSessionId = headerStore.get(SESSION_HEADER_NAME);

  if (headerSessionId) {
    return headerSessionId;
  }

  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!cookie?.value) {
    throw new Error("Session cookie is missing.");
  }

  return cookie.value;
}
