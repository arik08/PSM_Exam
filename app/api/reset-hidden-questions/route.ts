import { NextResponse } from "next/server";
import { resetHiddenQuestions } from "@/lib/api";

export async function POST() {
  await resetHiddenQuestions();
  return NextResponse.json({ ok: true });
}
