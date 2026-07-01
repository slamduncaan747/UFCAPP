'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface BottomNavProps {
  leagueId: string;
}

const tabs = [
  {
    id: 'roster',
    label: 'Roster',
    href: (id: string) => `/leagues/${id}/roster`,
    icon: (active: boolean) => (
      <svg
        className="w-6 h-6 text-white"
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? 2.5 : 2}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
  },
  {
    id: 'fights',
    label: 'Fights',
    href: (id: string) => `/leagues/${id}/fights`,
    icon: (active: boolean) => (
      <svg
        className="w-6 h-6 text-white"
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? 2.5 : 2}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    ),
  },
  {
    id: 'standings',
    label: 'Standings',
    href: (id: string) => `/leagues/${id}/standings`,
    icon: (active: boolean) => (
      <svg
        className="w-6 h-6 text-white"
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? 2.5 : 2}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
  {
    id: 'market',
    label: 'Market',
    href: (id: string) => `/leagues/${id}/market`,
    icon: (active: boolean) => (
      <svg
        className="w-6 h-6 text-white"
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? 2.5 : 2}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
        />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    href: (id: string) => `/leagues/${id}/settings`,
    icon: (active: boolean) => (
      <svg
        className="w-6 h-6 text-white"
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? 2.5 : 2}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export default function BottomNav({ leagueId }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#050506] border-t border-zinc-800/80 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)] z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.6)]">
      {/* Scrim so scrolling content dissolves into the bar instead of bleeding under it */}
      <div className="pointer-events-none absolute inset-x-0 -top-6 h-6 bg-gradient-to-t from-[#050506] to-transparent" />
      <div className="max-w-md mx-auto flex justify-around">
      {tabs.map((tab) => {
        const href = tab.href(leagueId);
        const active = pathname === href;
        return (
          <Link
            key={tab.id}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`relative flex flex-col items-center gap-1 px-4 min-w-[44px] min-h-[44px] justify-center active:scale-90 transition-all duration-200 ${
              active ? 'opacity-100' : 'opacity-40 hover:opacity-70'
            }`}
          >
            {/* Active accent bar */}
            <span
              className={`absolute -top-3 h-0.5 rounded-full bg-white transition-all duration-300 ${
                active ? 'w-6 opacity-100' : 'w-0 opacity-0'
              }`}
            />
            {tab.icon(active)}
            <span className="text-[9px] font-black uppercase tracking-widest text-white">
              {tab.label}
            </span>
          </Link>
        );
      })}
      </div>
    </nav>
  );
}
