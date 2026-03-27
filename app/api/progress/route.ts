import { NextResponse } from "next/server";
import { fetchProgress } from "@/lib/api";

export async function GET() {
  const progress = await fetchProgress();
  return NextResponse.json(progress);
}
