import { NextRequest, NextResponse } from "next/server";
import { savePreferences } from "@/lib/api";
import { PreferencePayload } from "@/lib/types";

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as PreferencePayload;

  if (!payload.answerRevealMode || !payload.explanationRevealMode) {
    return NextResponse.json({ message: "Invalid payload." }, { status: 400 });
  }

  const result = await savePreferences(payload);
  return NextResponse.json(result);
}
