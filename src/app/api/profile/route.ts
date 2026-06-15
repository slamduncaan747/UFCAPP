import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const { displayName, timezone } = await request.json();

    await db.update(profiles)
      .set({ displayName, timezone })
      .where(eq(profiles.id, user.id));

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
