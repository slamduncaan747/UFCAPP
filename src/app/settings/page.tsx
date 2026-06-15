import { requireProfile } from "@/lib/auth/session";
import { SettingsClient } from "@/components/settings/SettingsClient";

export default async function SettingsPage() {
  const { profile, user } = await requireProfile();
  return <SettingsClient profile={profile} email={user.email ?? ""} />;
}
