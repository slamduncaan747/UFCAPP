import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

export async function getProfile(userId: string) {
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, userId));
  return profile ?? null;
}

export async function requireProfile() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  if (!profile) redirect("/onboarding");
  return { user, profile };
}

export async function upsertProfile(userId: string, displayName: string, avatarUrl?: string) {
  await db
    .insert(profiles)
    .values({ id: userId, displayName, avatarUrl })
    .onConflictDoUpdate({
      target: profiles.id,
      set: { displayName, avatarUrl },
    });
}
