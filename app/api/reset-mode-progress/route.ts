import { NextRequest, NextResponse } from "next/server";
import { resetModeProgress } from "@/lib/api";
import { ReviewFilter, StudyMode } from "@/lib/types";

const STUDY_MODES = new Set<StudyMode>([
  "all",
  "speaking",
  "sentence",
  "sentence-en-ko",
  "sentence-ko-en",
  "vocab",
  "vocab-en-ko",
  "vocab-ko-en",
  "past",
  "review"
]);

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => ({}))) as {
    mode?: StudyMode;
    review?: ReviewFilter;
  };

  if (!payload.mode || !STUDY_MODES.has(payload.mode)) {
    return NextResponse.json({ message: "Invalid mode." }, { status: 400 });
  }

  await resetModeProgress(payload.mode, payload.review ?? "active");
  return NextResponse.json({ ok: true });
}
