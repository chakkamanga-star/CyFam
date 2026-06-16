'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

type Notification = {
  id: string; title: string; body: string; type: string;
  target_type: string; sent_at: string | null; created_at: string;
};

type Team = { id: string; name: string };

export default function NotificationsPage() {
  const [history, setHistory] = useState<Notification[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    title: '', body: '', type: 'info', target_type: 'all',
    target_id: '', scheduled_at: '',
  });

  useEffect(() => {
    fetch('/api/notifications').then(r => r.json()).then(d => setHistory(d.data || []));
    fetch('/api/teams').then(r => r.json()).then(d => setTeams(d.data || []));
  }, []);

  const update = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.body) { toast.error('Title and body required'); return; }
    setSending(true);

    const res = await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        target_id: form.target_id || null,
        scheduled_at: form.scheduled_at || null,
      }),
    });
    const data = await res.json();
    setSending(false);

    if (!res.ok) { toast.error(data.error || 'Failed to send'); return; }
    toast.success(form.scheduled_at ? 'Notification scheduled!' : 'Notification sent!');
    setHistory(prev => [data.data, ...prev]);
    setForm({ title: '', body: '', type: 'info', target_type: 'all', target_id: '', scheduled_at: '' });
  };

  const typeBadge: Record<string, string> = {
    info: 'bg-blue-500/15 text-blue-400',
    important: 'bg-amber-500/15 text-amber-400',
    emergency: 'bg-red-500/15 text-red-400',
  };

  return (
    <>
      <PageHeader title="Send Notification" subtitle="Communicate with your community." />
      <div className="p-8 flex-1 overflow-auto">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Compose Panel */}
          <div className="lg:col-span-3 glass-card p-6">
            <h3 className="font-semibold text-[15px] mb-5">Compose Message</h3>
            <form onSubmit={handleSend} className="space-y-5">
              <div>
                <label className="block text-[13px] font-semibold text-slate-400 mb-1.5">Title *</label>
                <input required type="text" className="glass-input w-full px-3 py-2.5 rounded-lg text-sm"
                  placeholder="e.g. Reminder: Sunday Service" value={form.title}
                  onChange={e => update('title', e.target.value)} />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-slate-400 mb-1.5">Message *</label>
                <textarea required className="glass-input w-full px-3 py-2.5 rounded-lg text-sm resize-none" rows={4}
                  placeholder="Write your notification message..." value={form.body}
                  onChange={e => update('body', e.target.value)} />
                <div className="text-right text-xs text-slate-500 mt-1">{form.body.length}/500</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[13px] font-semibold text-slate-400 mb-1.5">Priority</label>
                  <div className="flex gap-2">
                    {(['info', 'important', 'emergency'] as const).map(t => (
                      <button key={t} type="button" onClick={() => update('type', t)}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors capitalize ${
                          form.type === t ? `border-current ${typeBadge[t]}` : 'border-white/10 bg-white/5 text-slate-400'
                        }`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-slate-400 mb-1.5">Send To</label>
                  <select className="glass-input w-full px-3 py-2.5 rounded-lg text-sm"
                    value={form.target_type} onChange={e => { update('target_type', e.target.value); update('target_id', ''); }}>
                    <option value="all">All Members</option>
                    <option value="team">Specific Team</option>
                  </select>
                </div>
              </div>

              {form.target_type === 'team' && (
                <div>
                  <label className="block text-[13px] font-semibold text-slate-400 mb-1.5">Select Team</label>
                  <select className="glass-input w-full px-3 py-2.5 rounded-lg text-sm"
                    value={form.target_id} onChange={e => update('target_id', e.target.value)}>
                    <option value="">Choose team...</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[13px] font-semibold text-slate-400 mb-1.5">Schedule for later (optional)</label>
                <input type="datetime-local" className="glass-input w-full px-3 py-2.5 rounded-lg text-sm"
                  value={form.scheduled_at} onChange={e => update('scheduled_at', e.target.value)} />
              </div>

              <button type="submit" disabled={sending}
                className="btn-primary-gradient w-full py-3 rounded-lg font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                {sending && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {sending ? 'Sending...' : form.scheduled_at ? '🗓 Schedule Notification' : '🔔 Send Now'}
              </button>
            </form>
          </div>

          {/* Live Preview + History */}
          <div className="lg:col-span-2 space-y-5">
            {/* Preview */}
            <div className="glass-card p-5">
              <h3 className="font-semibold text-[13px] text-slate-400 mb-4">Live Preview</h3>
              <div className="bg-black rounded-2xl p-4 shadow-xl">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-lg shrink-0">✝</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-white">CY Admin</span>
                      <span className="text-[10px] text-white/40">now</span>
                    </div>
                    <div className="text-sm font-semibold text-white mt-0.5 truncate">{form.title || 'Notification Title'}</div>
                    <div className="text-xs text-white/60 mt-0.5 line-clamp-2">{form.body || 'Your message preview will appear here...'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* History */}
            <div className="glass-card p-5">
              <h3 className="font-semibold text-[13px] mb-4">Recent Notifications</h3>
              <div className="space-y-3 max-h-[300px] overflow-auto">
                {history.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">No notifications sent yet</p>
                ) : history.slice(0, 10).map(n => (
                  <div key={n.id} className="flex gap-3 py-2.5 border-b border-white/5 last:border-0">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.type === 'emergency' ? 'bg-red-400' : n.type === 'important' ? 'bg-amber-400' : 'bg-blue-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold truncate">{n.title}</div>
                      <div className="text-xs text-slate-500">
                        To {n.target_type} · {n.sent_at ? format(new Date(n.sent_at), 'dd MMM, hh:mm a') : 'Scheduled'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
