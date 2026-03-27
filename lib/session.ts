import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "anonymous_session_id";

export async function getSessionId() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!cookie?.value) {
    throw new Error("Session cookie is missing.");
  }

  return cookie.value;
}
