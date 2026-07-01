import BottomNav from '@/components/BottomNav';

interface LeagueLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function LeagueLayout({ children, params }: LeagueLayoutProps) {
  const { id } = await params;

  return (
    <div className="fixed inset-0 flex flex-col bg-[#030303]">
      {/* Safe-area top spacer */}
      <div className="flex-shrink-0 h-[env(safe-area-inset-top)] bg-[#030303]" />

      {/* Scrollable content area — bottom nav is ~84px + safe-area */}
      <div className="flex-1 overflow-y-auto no-scrollbar scroll-area pb-[calc(84px+env(safe-area-inset-bottom))]">
        <div className="w-full max-w-md mx-auto">
          {children}
        </div>
      </div>

      <BottomNav leagueId={id} />
    </div>
  );
}
