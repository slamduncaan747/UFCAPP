import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/leagues';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Check if this user has already claimed a membership
        const { data: membership } = await supabase
          .from('league_memberships')
          .select('id')
          .eq('user_id', user.id)
          .eq('claimable', false)
          .maybeSingle();

        if (!membership) {
          return NextResponse.redirect(new URL('/auth/claim-team', request.url));
        }
      }
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(new URL('/auth/login', request.url));
}
