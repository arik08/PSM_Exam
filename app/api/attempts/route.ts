import { NextRequest, NextResponse } from "next/server";
import { createAttempt } from "@/lib/api";
import { AttemptPayload } from "@/lib/types";

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as AttemptPayload;

  if (!payload.questionId || !payload.selectedLabel || !payload.mode) {
    return NextResponse.json({ message: "Invalid payload." }, { status: 400 });
  }

  const result = await createAttempt(payload);
  return NextResponse.json(result);
}
