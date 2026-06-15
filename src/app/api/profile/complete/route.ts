import { NextResponse } from "next/server";
import { requireUser, upsertProfile } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { displayName } = await request.json();
    if (!displayName?.trim()) {
      return NextResponse.json({ error: "Display name required" }, { status: 400 });
    }
    await upsertProfile(user.id, displayName.trim(), user.user_metadata?.avatar_url);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
