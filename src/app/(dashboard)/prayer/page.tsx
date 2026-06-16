'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import toast from 'react-hot-toast';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME_SLOTS = ['05:00', '06:00', '07:00', '08:00', '09:00', '10:00', '18:00', '19:00', '20:00', '21:00'];

type Slot = {
  id?: string; member_name: string; team_id: string | null;
  day_of_week: number; slot_time: string;
};

type Team = { id: string; name: string; colour: string };

function getWeekStart(d: Date = new Date()): string {
  const date = new Date(d);
  date.setDate(date.getDate() - date.getDay());
  return date.toISOString().split('T')[0];
}

export default function PrayerSchedule() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weekStart, setWeekStart] = useState(getWeekStart());
  const [dirty, setDirty] = useState(false);
  const [editSlot, setEditSlot] = useState<{ day: number; time: string } | null>(null);
  const [newName, setNewName] = useState('');
  const [newTeam, setNewTeam] = useState('');

  const fetch_ = async (week: string) => {
    setLoading(true);
    const res = await fetch(`/api/prayer?week=${week}`);
    const data = await res.json();
    setSlots(data.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetch('/api/teams').then(r => r.json()).then(d => setTeams(d.data || []));
  }, []);

  useEffect(() => { fetch_(weekStart); }, [weekStart]);

  const getSlot = (day: number, time: string) =>
    slots.find(s => s.day_of_week === day && s.slot_time === time);

  const setSlot = (day: number, time: string, name: string, teamId: string) => {
    setSlots(prev => {
      const filtered = prev.filter(s => !(s.day_of_week === day && s.slot_time === time));
      if (name) {
        filtered.push({ member_name: name, team_id: teamId || null, day_of_week: day, slot_time: time });
      }
      return filtered;
    });
    setDirty(true);
    setEditSlot(null);
    setNewName('');
    setNewTeam('');
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch('/api/prayer', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slots, week_start: weekStart }),
    });
    setSaving(false);
    if (res.ok) { toast.success('Prayer schedule saved!'); setDirty(false); }
    else { toast.error('Failed to save'); }
  };

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d.toISOString().split('T')[0]);
  };
  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d.toISOString().split('T')[0]);
  };

  const teamColour = (teamId: string | null) =>
    teams.find(t => t.id === teamId)?.colour || '#6366f1';

  return (
    <>
      <PageHeader title="Prayer Schedule" subtitle="Assign prayer duty slots for each day.">
        {dirty && (
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-semibold btn-primary-gradient disabled:opacity-60">
            {saving ? 'Saving...' : '💾 Save Schedule'}
          </button>
        )}
        <button onClick={() => window.print()} className="px-4 py-2 rounded-lg text-sm font-semibold bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
          🖨 Print
        </button>
      </PageHeader>

      <div className="p-8 flex-1 overflow-auto">
        {/* Week Navigator */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={prevWeek} className="p-2 hover:bg-white/10 rounded-lg transition-colors">←</button>
          <span className="font-semibold text-sm">
            Week of {new Date(weekStart).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          <button onClick={nextWeek} className="p-2 hover:bg-white/10 rounded-lg transition-colors">→</button>
        </div>

        {/* Grid */}
        <div className="glass-card overflow-auto">
          <table className="data-table min-w-[800px]">
            <thead>
              <tr>
                <th className="w-[100px]">Time</th>
                {DAYS.map(d => <th key={d}>{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.map(time => (
                <tr key={time}>
                  <td className="font-semibold text-slate-400 text-[12px]">{time}</td>
                  {DAYS.map((_, day) => {
                    const slot = getSlot(day, time);
                    return (
                      <td key={day}>
                        {slot ? (
                          <div
                            className="flex items-center justify-between group cursor-pointer rounded-lg px-2 py-1"
                            style={{ background: `${teamColour(slot.team_id)}22` }}
                            onClick={() => { setEditSlot({ day, time }); setNewName(slot.member_name); setNewTeam(slot.team_id || ''); }}
                          >
                            <span className="text-[12px] font-semibold truncate"
                              style={{ color: teamColour(slot.team_id) }}>
                              🙏 {slot.member_name}
                            </span>
                            <button
                              className="opacity-0 group-hover:opacity-100 text-xs text-red-400 hover:text-red-300 ml-1"
                              onClick={e => { e.stopPropagation(); setSlot(day, time, '', ''); }}
                            >×</button>
                          </div>
                        ) : (
                          <button
                            className="w-full h-full min-h-[32px] hover:bg-white/5 rounded text-xs text-slate-600 hover:text-slate-400 transition-colors"
                            onClick={() => { setEditSlot({ day, time }); setNewName(''); setNewTeam(''); }}
                          >
                            + Assign
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Team Legend */}
        <div className="flex flex-wrap gap-3 mt-4">
          {teams.map(t => (
            <div key={t.id} className="flex items-center gap-1.5 text-xs">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: t.colour }} />
              <span className="text-slate-400">{t.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Slot Modal */}
      {editSlot && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-card p-6 w-[360px]">
            <h3 className="font-semibold mb-4">Assign {DAYS[editSlot.day]} {editSlot.time}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-semibold text-slate-400 mb-1.5">Member Name</label>
                <input type="text" className="glass-input w-full px-3 py-2.5 rounded-lg text-sm"
                  placeholder="Enter name" value={newName} onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && setSlot(editSlot.day, editSlot.time, newName, newTeam)} />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-slate-400 mb-1.5">Team</label>
                <select className="glass-input w-full px-3 py-2.5 rounded-lg text-sm"
                  value={newTeam} onChange={e => setNewTeam(e.target.value)}>
                  <option value="">No team</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setEditSlot(null)} className="flex-1 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm">Cancel</button>
              <button onClick={() => setSlot(editSlot.day, editSlot.time, newName, newTeam)}
                className="flex-1 py-2.5 rounded-lg btn-primary-gradient text-sm font-semibold">
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
