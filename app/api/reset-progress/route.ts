import { NextResponse } from "next/server";
import { resetProgress } from "@/lib/api";

export async function POST() {
  await resetProgress();
  return NextResponse.json({ ok: true });
}
