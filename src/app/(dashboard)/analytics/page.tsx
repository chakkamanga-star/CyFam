'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

type Summary = {
  totalMembers: number; eventsThisMonth: number; photosUploaded: number; upcomingEvents: number;
};
type GrowthPoint = { month: string; count: number };
type TeamPoint = { name: string; value: number; colour: string };

export default function Analytics() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [growth, setGrowth] = useState<GrowthPoint[]>([]);
  const [teamDist, setTeamDist] = useState<TeamPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/analytics/summary').then(r => r.json()),
      fetch('/api/analytics/growth').then(r => r.json()),
      fetch('/api/analytics/teams').then(r => r.json()),
    ]).then(([sum, grow, teams]) => {
      setSummary(sum);
      setGrowth(grow.data || []);
      setTeamDist(teams.data || []);
      setLoading(false);
    });
  }, []);

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([summary || {}]), 'Summary');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(growth), 'Member Growth');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(teamDist), 'Team Distribution');
    XLSX.writeFile(wb, 'CY_Analytics.xlsx');
    toast.success('Exported to Excel');
  };

  const CHART_TOOLTIP_STYLE = {
    backgroundColor: '#1e2736', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px', color: '#f1f5f9', fontSize: '12px',
  };

  const statCards = [
    { icon: '👥', label: 'Total Members', value: summary?.totalMembers ?? 0, colour: '#6366f1' },
    { icon: '📅', label: 'Events This Month', value: summary?.eventsThisMonth ?? 0, colour: '#10b981' },
    { icon: '🖼️', label: 'Photos Uploaded', value: summary?.photosUploaded ?? 0, colour: '#3b82f6' },
    { icon: '📆', label: 'Upcoming Events', value: summary?.upcomingEvents ?? 0, colour: '#f59e0b' },
  ];

  return (
    <>
      <PageHeader title="Analytics" subtitle="Insights about your community.">
        <button onClick={exportExcel} className="px-4 py-2 rounded-lg text-sm font-semibold bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
          📤 Export Excel
        </button>
        <button onClick={() => window.print()} className="px-4 py-2 rounded-lg text-sm font-semibold bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
          🖨 Print Report
        </button>
      </PageHeader>

      <div className="p-8 flex-1 overflow-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {statCards.map((card, i) => (
            <div key={i} className="glass-card p-5">
              <div className="text-2xl mb-2">{card.icon}</div>
              {loading ? (
                <div className="h-8 w-16 bg-white/5 rounded animate-pulse mb-1" />
              ) : (
                <div className="text-[28px] font-extrabold" style={{ color: card.colour }}>{card.value}</div>
              )}
              <div className="text-xs text-slate-400 mt-1">{card.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Member Growth Chart */}
          <div className="glass-card p-6">
            <h3 className="font-semibold text-[15px] mb-5">Member Growth</h3>
            {loading ? (
              <div className="h-[220px] bg-white/5 rounded-xl animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={growth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} allowDecimals={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2.5}
                    dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#818cf8' }} name="New Members" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Team Distribution */}
          <div className="glass-card p-6">
            <h3 className="font-semibold text-[15px] mb-5">Team Distribution</h3>
            {loading ? (
              <div className="h-[220px] bg-white/5 rounded-xl animate-pulse" />
            ) : teamDist.length === 0 ? (
              <div className="flex items-center justify-center h-[220px] text-slate-500 text-sm">No team data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={teamDist} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                    dataKey="value" nameKey="name" paddingAngle={3} label={({ name, value }) => `${name} (${value})`}
                    labelLine={{ stroke: 'rgba(255,255,255,0.2)' }}>
                    {teamDist.map((entry, i) => (
                      <Cell key={i} fill={entry.colour || '#6366f1'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Team Table */}
        {!loading && teamDist.length > 0 && (
          <div className="glass-card p-6">
            <h3 className="font-semibold text-[15px] mb-5">Members by Team</h3>
            <table className="data-table">
              <thead><tr><th>Team</th><th>Members</th><th>% Share</th><th>Distribution</th></tr></thead>
              <tbody>
                {[...teamDist].sort((a, b) => b.value - a.value).map((t, i) => {
                  const total = teamDist.reduce((s, x) => s + x.value, 0);
                  const pct = total ? ((t.value / total) * 100).toFixed(1) : '0';
                  return (
                    <tr key={i}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: t.colour }} />
                          {t.name}
                        </div>
                      </td>
                      <td className="font-semibold">{t.value}</td>
                      <td>{pct}%</td>
                      <td>
                        <div className="w-full bg-white/10 rounded-full h-2 max-w-[200px]">
                          <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: t.colour }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
