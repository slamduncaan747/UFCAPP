"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ShareIcon } from "@/components/shared/Icons";

export function InviteButton({ inviteUrl, leagueName }: { inviteUrl: string; leagueName: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = `${window.location.origin}${inviteUrl}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${leagueName} on Fantasy UFC`,
          text: `Draft UFC fighters, score real points all season. Join my league!`,
          url,
        });
      } catch { }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Button size="sm" onClick={handleShare}
      className="flex items-center gap-1.5 font-display font-bold uppercase text-xs"
      style={{ background: "var(--ufc-accent)", color: "var(--ufc-accent-ink)" }}>
      <ShareIcon size={12} />
      {copied ? "Copied!" : "Invite"}
    </Button>
  );
}
