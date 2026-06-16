'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

type Team = { id: string; name: string };
const EVENT_TYPES = ['Church Event', 'Birthday', 'Feast Day', 'Meeting', 'Special Event', 'Team Event'];

export default function NewEvent() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [notify, setNotify] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', event_date: '', location: '',
    type: 'Church Event', team_id: '', is_recurring: false,
  });

  useEffect(() => {
    fetch('/api/teams').then(r => r.json()).then(d => setTeams(d.data || []));
  }, []);

  const update = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }));

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.event_date) { toast.error('Title and date are required'); return; }

    setLoading(true);
    const formData = new FormData();
    Object.entries(form).forEach(([k, v]) => formData.append(k, String(v)));
    if (bannerFile) formData.append('banner', bannerFile);

    const res = await fetch('/api/events', { method: 'POST', body: formData });
    const data = await res.json();

    if (!res.ok) {
      toast.error(data.error || 'Failed to create event');
      setLoading(false);
      return;
    }

    // Send notification if toggled
    if (notify) {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `📅 New Event: ${form.title}`,
          body: `${form.title} is scheduled for ${new Date(form.event_date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}${form.location ? ' at ' + form.location : ''}.`,
          type: 'info', target_type: 'all',
        }),
      });
    }

    toast.success('Event created!');
    router.push('/events');
    setLoading(false);
  };

  return (
    <>
      <PageHeader title="Create New Event" subtitle="Schedule an event for the community." />
      <div className="p-8 flex-1 overflow-auto">
        <div className="glass-card p-8 max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Banner Upload */}
            <div>
              <label className="block text-[13px] font-semibold text-slate-400 mb-2">Event Banner</label>
              <label className="block w-full cursor-pointer">
                <div className={`rounded-xl border-2 border-dashed border-white/20 hover:border-indigo-500/50 transition-colors overflow-hidden ${bannerPreview ? '' : 'p-8 text-center'}`}>
                  {bannerPreview ? (
                    <img src={bannerPreview} alt="Banner" className="w-full h-[180px] object-cover" />
                  ) : (
                    <div>
                      <div className="text-3xl mb-2">🖼️</div>
                      <p className="text-sm text-slate-400">Click to upload banner image</p>
                      <p className="text-xs text-slate-500 mt-1">PNG, JPG up to 5MB</p>
                    </div>
                  )}
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
              </label>
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-slate-400 mb-1.5">Event Title *</label>
              <input required type="text" className="glass-input w-full px-3 py-2.5 rounded-lg text-sm"
                placeholder="e.g. Feast of St. Francis" value={form.title}
                onChange={e => update('title', e.target.value)} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-[13px] font-semibold text-slate-400 mb-1.5">Date & Time *</label>
                <input required type="datetime-local" className="glass-input w-full px-3 py-2.5 rounded-lg text-sm"
                  value={form.event_date} onChange={e => update('event_date', e.target.value)} />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-slate-400 mb-1.5">Location</label>
                <input type="text" className="glass-input w-full px-3 py-2.5 rounded-lg text-sm"
                  placeholder="e.g. Church Hall" value={form.location}
                  onChange={e => update('location', e.target.value)} />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-slate-400 mb-1.5">Event Type</label>
                <select className="glass-input w-full px-3 py-2.5 rounded-lg text-sm"
                  value={form.type} onChange={e => update('type', e.target.value)}>
                  {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-slate-400 mb-1.5">Team (optional)</label>
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
                placeholder="Event details, schedule, what to bring..." value={form.description}
                onChange={e => update('description', e.target.value)} />
            </div>

            <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-white/5 border border-white/10">
              <div>
                <div className="text-sm font-semibold">🔁 Recurring Event</div>
                <div className="text-xs text-slate-400 mt-0.5">Mark this as a recurring weekly/monthly event</div>
              </div>
              <input type="checkbox" className="w-5 h-5 accent-indigo-500 cursor-pointer"
                checked={form.is_recurring} onChange={e => update('is_recurring', e.target.checked)} />
            </div>

            <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-white/5 border border-white/10">
              <div>
                <div className="text-sm font-semibold">🔔 Notify All Members</div>
                <div className="text-xs text-slate-400 mt-0.5">Send a push notification to all members</div>
              </div>
              <input type="checkbox" className="w-5 h-5 accent-indigo-500 cursor-pointer"
                checked={notify} onChange={e => setNotify(e.target.checked)} />
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => router.push('/events')}
                className="flex-1 py-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-medium transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 py-3 rounded-lg btn-primary-gradient text-sm font-bold disabled:opacity-60">
                {loading ? 'Creating...' : '✅ Create Event'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
