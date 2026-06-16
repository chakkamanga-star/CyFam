'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import toast from 'react-hot-toast';

type Team = { id: string; name: string };
const EVENT_TYPES = ['Church Event', 'Birthday', 'Feast Day', 'Meeting', 'Special Event', 'Team Event'];

export default function EditEvent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    title: '', description: '', event_date: '', location: '',
    type: 'Church Event', team_id: '', is_recurring: false,
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/events/${id}`).then(r => r.json()),
      fetch('/api/teams').then(r => r.json()),
    ]).then(([eventData, teamsData]) => {
      const ev = eventData.data;
      setForm({
        title: ev.title, description: ev.description || '',
        event_date: ev.event_date?.slice(0, 16) || '',
        location: ev.location || '', type: ev.type,
        team_id: ev.team_id || '', is_recurring: ev.is_recurring,
      });
      setBannerPreview(ev.banner_url);
      setTeams(teamsData.data || []);
      setLoading(false);
    });
  }, [id]);

  const update = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData();
    Object.entries(form).forEach(([k, v]) => formData.append(k, String(v)));
    if (bannerFile) formData.append('banner', bannerFile);

    const res = await fetch(`/api/events/${id}`, { method: 'PATCH', body: formData });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error || 'Failed to save'); }
    else { toast.success('Event updated!'); router.push('/events'); }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" /></div>;

  return (
    <>
      <PageHeader title="Edit Event" subtitle={`Editing: ${form.title}`} />
      <div className="p-8 flex-1 overflow-auto">
        <div className="glass-card p-8 max-w-2xl mx-auto">
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-[13px] font-semibold text-slate-400 mb-2">Event Banner</label>
              <label className="block w-full cursor-pointer">
                <div className={`rounded-xl border-2 border-dashed border-white/20 hover:border-indigo-500/50 transition-colors overflow-hidden ${bannerPreview ? '' : 'p-8 text-center'}`}>
                  {bannerPreview ? (
                    <img src={bannerPreview} alt="Banner" className="w-full h-[180px] object-cover" />
                  ) : (
                    <div className="text-center"><div className="text-3xl mb-2">🖼️</div><p className="text-sm text-slate-400">Click to change banner</p></div>
                  )}
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={e => {
                  const f = e.target.files?.[0]; if (!f) return;
                  setBannerFile(f); setBannerPreview(URL.createObjectURL(f));
                }} />
              </label>
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-slate-400 mb-1.5">Event Title *</label>
              <input required type="text" className="glass-input w-full px-3 py-2.5 rounded-lg text-sm"
                value={form.title} onChange={e => update('title', e.target.value)} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-[13px] font-semibold text-slate-400 mb-1.5">Date & Time</label>
                <input type="datetime-local" className="glass-input w-full px-3 py-2.5 rounded-lg text-sm"
                  value={form.event_date} onChange={e => update('event_date', e.target.value)} />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-slate-400 mb-1.5">Location</label>
                <input type="text" className="glass-input w-full px-3 py-2.5 rounded-lg text-sm"
                  value={form.location} onChange={e => update('location', e.target.value)} />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-slate-400 mb-1.5">Event Type</label>
                <select className="glass-input w-full px-3 py-2.5 rounded-lg text-sm"
                  value={form.type} onChange={e => update('type', e.target.value)}>
                  {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-slate-400 mb-1.5">Team</label>
                <select className="glass-input w-full px-3 py-2.5 rounded-lg text-sm"
                  value={form.team_id} onChange={e => update('team_id', e.target.value)}>
                  <option value="">All members</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-slate-400 mb-1.5">Description</label>
              <textarea className="glass-input w-full px-3 py-2.5 rounded-lg text-sm resize-none" rows={4}
                value={form.description} onChange={e => update('description', e.target.value)} />
            </div>

            <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-white/5 border border-white/10">
              <div className="text-sm font-semibold">🔁 Recurring Event</div>
              <input type="checkbox" className="w-5 h-5 accent-indigo-500 cursor-pointer"
                checked={form.is_recurring} onChange={e => update('is_recurring', e.target.checked)} />
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => router.push('/events')} className="flex-1 py-3 rounded-lg bg-white/5 border border-white/10 text-sm font-medium">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 py-3 rounded-lg btn-primary-gradient text-sm font-bold disabled:opacity-60">
                {saving ? 'Saving...' : '💾 Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
