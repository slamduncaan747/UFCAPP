import { NextResponse } from "next/server";

// Direct add/drop is disabled — all roster moves go through the waiver wire.
// (See /api/leagues/[id]/waivers and /api/jobs/process-waivers.)
export async function POST() {
  return NextResponse.json(
    { error: "Roster moves go through the waiver wire. Submit a waiver claim instead." },
    { status: 400 }
  );
}
