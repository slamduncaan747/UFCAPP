import Link from "next/link";
import { ChevronLeftIcon } from "@/components/shared/Icons";
import { JoinLeagueForm } from "./JoinLeagueForm";

type Props = { searchParams: Promise<{ code?: string }> };

export default async function JoinLeaguePage({ searchParams }: Props) {
  const { code } = await searchParams;

  return (
    <div className="min-h-screen" style={{ background: "var(--ufc-bg)" }}>
      <header className="px-4 h-14 flex items-center gap-3"
        style={{ borderBottom: "1px solid var(--ufc-border)" }}>
        <Link href="/dashboard" style={{ color: "var(--ufc-text-2)" }}>
          <ChevronLeftIcon size={20} />
        </Link>
        <h1 className="font-display font-bold text-xl uppercase">Join League</h1>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        <JoinLeagueForm initialCode={code?.toUpperCase() ?? ""} />
      </main>
    </div>
  );
}
