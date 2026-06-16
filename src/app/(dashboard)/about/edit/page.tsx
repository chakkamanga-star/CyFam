'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import toast from 'react-hot-toast';

type OrgData = {
  name: string; tagline: string; about_text: string;
  vision: string; mission: string; founded_year: number;
  logo_url: string | null; contact_email: string; contact_phone: string;
  facebook_url: string; instagram_url: string; youtube_url: string;
  committee: CommitteeMember[]; past_presidents: President[];
};

type CommitteeMember = { name: string; role: string; photo_url?: string };
type President = { name: string; year_from: number; year_to: number };

const EMPTY: OrgData = {
  name: 'Kristujayanti CY', tagline: '', about_text: '', vision: '', mission: '',
  founded_year: 2000, logo_url: null, contact_email: '', contact_phone: '',
  facebook_url: '', instagram_url: '', youtube_url: '',
  committee: [], past_presidents: [],
};

export default function AboutEdit() {
  const [form, setForm] = useState<OrgData>(EMPTY);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'basic' | 'committee' | 'history'>('basic');

  useEffect(() => {
    fetch('/api/organization/about').then(r => r.json()).then(d => {
      if (d.data) setForm({ ...EMPTY, ...d.data });
      setLoading(false);
    });
  }, []);

  const update = (key: keyof OrgData, value: unknown) => setForm(f => ({ ...f, [key]: value }));

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setSaving(true);
    const formData = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (k === 'logo_url') return;
      if (typeof v === 'object') formData.append(k, JSON.stringify(v));
      else formData.append(k, String(v || ''));
    });
    if (logoFile) formData.append('logo', logoFile);

    const res = await fetch('/api/organization/about', { method: 'PATCH', body: formData });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { toast.error(data.error || 'Failed to save'); return; }
    toast.success('About page saved!');
    if (data.data.logo_url) setLogoPreview(null);
    setForm({ ...EMPTY, ...data.data });
  };

  const addCommitteeMember = () => {
    update('committee', [...form.committee, { name: '', role: '' }]);
  };
  const updateCommittee = (i: number, key: keyof CommitteeMember, value: string) => {
    const c = [...form.committee];
    c[i] = { ...c[i], [key]: value };
    update('committee', c);
  };
  const removeCommittee = (i: number) => {
    update('committee', form.committee.filter((_, j) => j !== i));
  };

  const addPresident = () => {
    update('past_presidents', [...form.past_presidents, { name: '', year_from: 2020, year_to: 2021 }]);
  };
  const updatePresident = (i: number, key: keyof President, value: string | number) => {
    const p = [...form.past_presidents];
    p[i] = { ...p[i], [key]: value };
    update('past_presidents', p);
  };
  const removePresident = (i: number) => {
    update('past_presidents', form.past_presidents.filter((_, j) => j !== i));
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" /></div>;

  const TABS = [{ key: 'basic', label: '📝 Basic Info' }, { key: 'committee', label: '👥 Committee' }, { key: 'history', label: '🏛 History' }] as const;

  return (
    <>
      <PageHeader title="About Us Editor" subtitle="Manage your organisation's public profile.">
        <button onClick={handleSave} disabled={saving}
          className="px-4 py-2 rounded-lg text-sm font-semibold btn-primary-gradient disabled:opacity-60">
          {saving ? 'Saving...' : '💾 Publish Changes'}
        </button>
      </PageHeader>

      <div className="p-8 flex-1 overflow-auto">
        {/* Tabs */}
        <div className="flex bg-white/5 border border-white/10 p-0.5 rounded-xl mb-6 w-fit">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${tab === t.key ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'basic' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Logo */}
            <div className="glass-card p-6 flex flex-col items-center gap-4">
              <div className="relative">
                {logoPreview || form.logo_url ? (
                  <img src={logoPreview || form.logo_url!} alt="Logo" className="w-28 h-28 rounded-2xl object-cover border border-white/10" />
                ) : (
                  <div className="w-28 h-28 rounded-2xl bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center text-4xl">✝</div>
                )}
                <label className="absolute bottom-0 right-0 w-9 h-9 bg-indigo-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-indigo-600 transition-colors">
                  📷
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                </label>
              </div>
              <p className="text-xs text-slate-400 text-center">Organisation Logo</p>
            </div>

            {/* Basic Info */}
            <div className="lg:col-span-2 glass-card p-6 space-y-5">
              {[
                { label: 'Organisation Name', key: 'name', type: 'text' },
                { label: 'Tagline', key: 'tagline', type: 'text' },
                { label: 'Founded Year', key: 'founded_year', type: 'number' },
                { label: 'Contact Email', key: 'contact_email', type: 'email' },
                { label: 'Contact Phone', key: 'contact_phone', type: 'tel' },
                { label: 'Facebook URL', key: 'facebook_url', type: 'url' },
                { label: 'Instagram URL', key: 'instagram_url', type: 'url' },
                { label: 'YouTube URL', key: 'youtube_url', type: 'url' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="block text-[13px] font-semibold text-slate-400 mb-1.5">{label}</label>
                  <input type={type} className="glass-input w-full px-3 py-2.5 rounded-lg text-sm"
                    value={(form as Record<string, unknown>)[key] as string || ''}
                    onChange={e => update(key as keyof OrgData, e.target.value)} />
                </div>
              ))}
              {['about_text', 'vision', 'mission'].map(key => (
                <div key={key}>
                  <label className="block text-[13px] font-semibold text-slate-400 mb-1.5 capitalize">{key.replace('_text', '')}</label>
                  <textarea className="glass-input w-full px-3 py-2.5 rounded-lg text-sm resize-none" rows={4}
                    value={(form as Record<string, unknown>)[key] as string || ''}
                    onChange={e => update(key as keyof OrgData, e.target.value)} />
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'committee' && (
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold">Current Committee</h3>
              <button onClick={addCommitteeMember} className="px-3 py-1.5 rounded-lg text-xs font-semibold btn-primary-gradient">+ Add Member</button>
            </div>
            {form.committee.length === 0 ? (
              <div className="text-center text-slate-500 py-10">No committee members added yet.</div>
            ) : (
              <div className="space-y-3">
                {form.committee.map((m, i) => (
                  <div key={i} className="flex gap-3 items-center p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-sm font-bold text-indigo-300 shrink-0">
                      {m.name ? m.name[0].toUpperCase() : '?'}
                    </div>
                    <input className="glass-input flex-1 px-3 py-2 rounded-lg text-sm" placeholder="Full Name"
                      value={m.name} onChange={e => updateCommittee(i, 'name', e.target.value)} />
                    <input className="glass-input flex-1 px-3 py-2 rounded-lg text-sm" placeholder="Role / Title"
                      value={m.role} onChange={e => updateCommittee(i, 'role', e.target.value)} />
                    <button onClick={() => removeCommittee(i)} className="text-red-400 hover:text-red-300 text-lg leading-none">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'history' && (
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold">Past Presidents</h3>
              <button onClick={addPresident} className="px-3 py-1.5 rounded-lg text-xs font-semibold btn-primary-gradient">+ Add</button>
            </div>
            {form.past_presidents.length === 0 ? (
              <div className="text-center text-slate-500 py-10">No presidents added yet.</div>
            ) : (
              <table className="data-table">
                <thead><tr><th>Name</th><th>From</th><th>To</th><th></th></tr></thead>
                <tbody>
                  {form.past_presidents.map((p, i) => (
                    <tr key={i}>
                      <td>
                        <input className="glass-input w-full px-3 py-2 rounded-lg text-sm" placeholder="Name"
                          value={p.name} onChange={e => updatePresident(i, 'name', e.target.value)} />
                      </td>
                      <td>
                        <input type="number" className="glass-input w-24 px-3 py-2 rounded-lg text-sm" placeholder="2020"
                          value={p.year_from} onChange={e => updatePresident(i, 'year_from', Number(e.target.value))} />
                      </td>
                      <td>
                        <input type="number" className="glass-input w-24 px-3 py-2 rounded-lg text-sm" placeholder="2021"
                          value={p.year_to} onChange={e => updatePresident(i, 'year_to', Number(e.target.value))} />
                      </td>
                      <td>
                        <button onClick={() => removePresident(i)} className="text-red-400 hover:text-red-300">🗑</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </>
  );
}
