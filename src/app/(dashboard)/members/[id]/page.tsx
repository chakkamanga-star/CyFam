'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

type Member = {
  id: string; name: string; phone: string; email: string | null;
  role: string; team_id: string | null; dob: string | null;
  photo_url: string | null; is_active: boolean; is_alumni: boolean;
  joined_at: string; teams: { id: string; name: string } | null;
};

type Team = { id: string; name: string };
const ROLES = ['Member', 'Team Leader', 'Secretary', 'President', 'Media Admin', 'Super Admin', 'Alumni'];

export default function MemberProfile() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Member>>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/members/${id}`).then(r => r.json()),
      fetch('/api/teams').then(r => r.json()),
    ]).then(([memberData, teamsData]) => {
      setMember(memberData.data);
      setForm(memberData.data);
      setTeams(teamsData.data || []);
      setLoading(false);
    });
  }, [id]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setDirty(true);
  };

  const update = (key: keyof Member, value: unknown) => {
    setForm(f => ({ ...f, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const formData = new FormData();
    const fields = ['name', 'phone', 'email', 'role', 'team_id', 'dob', 'is_active', 'is_alumni'];
    fields.forEach(k => {
      const val = (form as Record<string, unknown>)[k];
      if (val !== undefined && val !== null) formData.append(k, String(val));
    });
    if (photoFile) formData.append('photo', photoFile);

    const res = await fetch(`/api/members/${id}`, { method: 'PATCH', body: formData });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error || 'Failed to save'); }
    else { toast.success('Member updated!'); setMember(data.data); setDirty(false); }
    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    const res = await fetch(`/api/members/${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Member deleted'); router.push('/members'); }
    else { toast.error('Failed to delete'); setDeleting(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
    </div>
  );

  if (!member) return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <div className="text-5xl">👤</div>
      <p className="text-slate-400">Member not found</p>
      <button onClick={() => router.push('/members')} className="px-4 py-2 rounded-lg bg-white/5 text-sm">← Back to Members</button>
    </div>
  );

  const avatarUrl = photoPreview || member.photo_url;

  return (
    <>
      <PageHeader title="Member Profile" subtitle={`Editing — ${member.name}`}>
        {dirty && (
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-semibold btn-primary-gradient disabled:opacity-60">
            {saving ? 'Saving...' : '💾 Save Changes'}
          </button>
        )}
        <button onClick={() => setShowDelete(true)}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25">
          🗑 Delete
        </button>
      </PageHeader>

      <div className="p-8 flex-1 overflow-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Photo & Status */}
          <div className="glass-card p-6 flex flex-col items-center gap-4">
            <div className="relative">
              {avatarUrl ? (
                <img src={avatarUrl} alt={member.name} className="w-28 h-28 rounded-full object-cover border-2 border-indigo-500/40" />
              ) : (
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-4xl font-bold text-white">
                  {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
              )}
              <label className="absolute bottom-0 right-0 w-9 h-9 bg-indigo-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-indigo-600 transition-colors">
                📷
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </label>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg">{member.name}</div>
              <div className="text-sm text-slate-400">{member.role}</div>
              <div className="text-xs text-slate-500 mt-1">
                Joined {format(new Date(member.joined_at), 'MMM yyyy')}
              </div>
            </div>
            <div className="w-full space-y-2 text-sm">
              <label className="flex items-center justify-between">
                <span className="text-slate-400">Active</span>
                <input type="checkbox" checked={!!form.is_active} onChange={e => update('is_active', e.target.checked)} className="w-4 h-4 accent-indigo-500" />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-slate-400">Alumni</span>
                <input type="checkbox" checked={!!form.is_alumni} onChange={e => update('is_alumni', e.target.checked)} className="w-4 h-4 accent-purple-500" />
              </label>
            </div>
          </div>

          {/* Edit Form */}
          <div className="lg:col-span-2 glass-card p-6">
            <h3 className="font-semibold text-[15px] mb-5">Member Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {[
                { label: 'Full Name', key: 'name', type: 'text' },
                { label: 'Phone', key: 'phone', type: 'tel' },
                { label: 'Email', key: 'email', type: 'email' },
                { label: 'Date of Birth', key: 'dob', type: 'date' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="block text-[13px] font-semibold text-slate-400 mb-1.5">{label}</label>
                  <input type={type} className="glass-input w-full px-3 py-2.5 rounded-lg text-sm"
                    value={(form as Record<string, unknown>)[key] as string || ''}
                    onChange={e => update(key as keyof Member, e.target.value)} />
                </div>
              ))}
              <div>
                <label className="block text-[13px] font-semibold text-slate-400 mb-1.5">Team</label>
                <select className="glass-input w-full px-3 py-2.5 rounded-lg text-sm"
                  value={form.team_id || ''} onChange={e => update('team_id', e.target.value || null)}>
                  <option value="">No team</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-slate-400 mb-1.5">Role</label>
                <select className="glass-input w-full px-3 py-2.5 rounded-lg text-sm"
                  value={form.role || 'Member'} onChange={e => update('role', e.target.value)}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            {dirty && (
              <div className="mt-6 pt-5 border-t border-white/10 flex justify-end">
                <button onClick={handleSave} disabled={saving}
                  className="px-6 py-2.5 rounded-lg btn-primary-gradient text-sm font-bold disabled:opacity-60">
                  {saving ? 'Saving...' : '💾 Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      {showDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-card p-8 w-[380px] text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-bold mb-2">Delete {member.name}?</h3>
            <p className="text-sm text-slate-400 mb-6">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDelete(false)} className="flex-1 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm font-medium">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-bold disabled:opacity-60">
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
