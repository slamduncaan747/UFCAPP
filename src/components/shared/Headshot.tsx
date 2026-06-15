"use client";

import { CSSProperties } from "react";

const DIVISION_HUES: Record<string, string> = {
  FLW: "210",
  BW:  "240",
  FW:  "270",
  LW:  "300",
  WW:  "30",
  MW:  "160",
  LHW: "190",
  HW:  "0",
};

type HeadshotProps = {
  name: string;
  photoUrl?: string | null;
  weightClass?: string;
  size?: number;
  isLive?: boolean;
  style?: CSSProperties;
  className?: string;
};

export function Headshot({ name, photoUrl, weightClass, size = 48, isLive, style, className }: HeadshotProps) {
  const hue = DIVISION_HUES[weightClass ?? ""] ?? "220";
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      className={`relative flex-shrink-0 rounded-xl overflow-hidden flex items-center justify-center ${className ?? ""}`}
      style={{
        width: size,
        height: size,
        background: photoUrl
          ? undefined
          : `linear-gradient(140deg, hsl(${hue},58%,24%) 0%, hsl(${hue},42%,11%) 100%)`,
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.10)",
        ...style,
      }}
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <>
          <div
            className="absolute inset-x-0 bottom-0 h-3/5"
            style={{ background: `linear-gradient(180deg, transparent, hsl(${hue},50%,15%))` }}
          />
          <span
            className="relative z-10 font-display font-black select-none"
            style={{ fontSize: size * 0.3, color: `hsl(${hue},70%,70%)`, letterSpacing: "-0.02em" }}
          >
            {initials}
          </span>
          {weightClass && (
            <span
              className="absolute bottom-1 left-1 font-display font-bold"
              style={{ fontSize: size * 0.16, color: `hsl(${hue},60%,55%)`, opacity: 0.8 }}
            >
              {weightClass}
            </span>
          )}
        </>
      )}
      {isLive && (
        <div className="absolute top-1 right-1">
          <div className="live-dot" style={{ width: 6, height: 6 }} />
        </div>
      )}
    </div>
  );
}
