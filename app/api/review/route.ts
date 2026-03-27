import { NextRequest, NextResponse } from "next/server";
import { getSessionId } from "@/lib/session";
import { ensureSessionRecord, getReviewQuestionIds } from "@/lib/storage";
import { ReviewFilter } from "@/lib/types";

export async function GET(request: NextRequest) {
  const sessionId = await getSessionId();
  await ensureSessionRecord(sessionId);
  const filter = (request.nextUrl.searchParams.get("filter") as ReviewFilter) || "active";
  const ids = await getReviewQuestionIds({ sessionId, filter });
  return NextResponse.json({ filter, ids });
}
