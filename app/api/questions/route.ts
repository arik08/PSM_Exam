import { NextRequest, NextResponse } from "next/server";
import { fetchQuestionPayload } from "@/lib/api";
import { ReviewFilter, StudyMode } from "@/lib/types";

export async function GET(request: NextRequest) {
  const mode = (request.nextUrl.searchParams.get("mode") as StudyMode) || "all";
  const cursor = Number(request.nextUrl.searchParams.get("cursor") || "0");
  const review = (request.nextUrl.searchParams.get("review") as ReviewFilter) || "active";
  const payload = await fetchQuestionPayload(mode, cursor, review);
  return NextResponse.json(payload);
}
