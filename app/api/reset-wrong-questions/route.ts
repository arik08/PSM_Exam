import { NextResponse } from "next/server";
import { resetWrongQuestions } from "@/lib/api";

export async function POST() {
  await resetWrongQuestions();
  return NextResponse.json({ ok: true });
}
