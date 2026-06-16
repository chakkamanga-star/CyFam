import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, isNextResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isNextResponse(auth)) return auth;

  // Member growth: count by month for last 6 months
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = d.toISOString().split('T')[0];
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().split('T')[0];
    const { count } = await supabaseAdmin
      .from('admins')
      .select('id', { count: 'exact', head: true })
      .gte('joined_at', start)
      .lt('joined_at', end);
    months.push({
      month: d.toLocaleString('default', { month: 'short' }),
      count: count ?? 0,
    });
  }

  return NextResponse.json({ data: months });
}
