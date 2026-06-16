'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

type Team = { id: string; name: string };
const ROLES = ['Member', 'Team Leader', 'Secretary', 'President', 'Media Admin', 'Super Admin', 'Alumni'];

export default function NewMember() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    name: '', phone: '', email: '', role: 'Member', team_id: '', dob: '',
  });

  useEffect(() => {
    fetch('/api/teams').then(r => r.json()).then(d => setTeams(d.data || []));
  }, []);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) { toast.error('Name and phone are required'); return; }
    if (form.phone.length < 10) { toast.error('Enter a valid phone number'); return; }

    setLoading(true);
    const formData = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v) formData.append(k, v); });
    formData.set('phone', form.phone.startsWith('91') ? form.phone : `91${form.phone}`);
    if (photoFile) formData.append('photo', photoFile);

    const res = await fetch('/api/members', { method: 'POST', body: formData });
    const data = await res.json();

    if (!res.ok) {
      toast.error(data.error || 'Failed to add member');
    } else {
      toast.success(`${form.name} added successfully!`);
      router.push('/members');
    }
    setLoading(false);
  };

  return (
    <>
      <PageHeader title="Add New Member" subtitle="Register a new member manually." />
      <div className="p-8 flex-1 overflow-auto">
        <div className="glass-card p-8 max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Photo Upload */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-24 h-24 rounded-full object-cover border-2 border-indigo-500/40" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center text-3xl">
                    👤
                  </div>
                )}
                <label className="absolute bottom-0 right-0 w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-indigo-600 transition-colors">
                  <span className="text-sm">📷</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                </label>
              </div>
              <p className="text-xs text-slate-400">Upload profile photo (optional)</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-[13px] font-semibold text-slate-400 mb-1.5">Full Name *</label>
                <input required type="text" className="glass-input w-full px-3 py-2.5 rounded-lg text-sm"
                  placeholder="e.g. John Mathew" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-slate-400 mb-1.5">Phone Number *</label>
                <div className="flex gap-2">
                  <span className="glass-input px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-400">+91</span>
                  <input required type="tel" className="glass-input flex-1 px-3 py-2.5 rounded-lg text-sm"
                    placeholder="10-digit number" maxLength={10}
                    value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))} />
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-slate-400 mb-1.5">Email</label>
                <input type="email" className="glass-input w-full px-3 py-2.5 rounded-lg text-sm"
                  placeholder="email@example.com" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-slate-400 mb-1.5">Date of Birth</label>
                <input type="date" className="glass-input w-full px-3 py-2.5 rounded-lg text-sm"
                  value={form.dob} onChange={e => setForm(f => ({ ...f, dob: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-slate-400 mb-1.5">Team</label>
                <select className="glass-input w-full px-3 py-2.5 rounded-lg text-sm"
                  value={form.team_id} onChange={e => setForm(f => ({ ...f, team_id: e.target.value }))}>
                  <option value="">No team</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-slate-400 mb-1.5">Role</label>
                <select className="glass-input w-full px-3 py-2.5 rounded-lg text-sm"
                  value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => router.push('/members')}
                className="flex-1 py-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-medium transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 py-3 rounded-lg btn-primary-gradient text-sm font-bold disabled:opacity-60">
                {loading ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
