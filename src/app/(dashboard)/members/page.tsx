'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import PageHeader from '@/components/PageHeader';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

type Member = {
  id: string; name: string; phone: string; email: string | null;
  role: string; dob: string | null; is_active: boolean; is_alumni: boolean;
  photo_url: string | null; joined_at: string;
  teams: { name: string; colour: string } | null;
};

type Team = { id: string; name: string; colour: string };

const ROLES = ['Super Admin', 'President', 'Secretary', 'Media Admin', 'Team Leader', 'Member', 'Alumni'];

/* ─── Member Profile Modal ─────────────────────────────────── */
function MemberModal({ member, onClose, onUpdated }: {
  member: Member;
  onClose: () => void;
  onUpdated: (updated: Member) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [preview, setPreview] = useState<string | null>(member.photo_url);
  const fileRef = useRef<HTMLInputElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handlePhotoChange = async (file: File) => {
    setUploading(true);
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);
    const formData = new FormData();
    formData.append('photo', file);
    const res = await fetch(`/api/members/${member.id}`, { method: 'PATCH', body: formData });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) {
      toast.error('Photo upload failed');
      setPreview(member.photo_url);
      return;
    }
    toast.success('Photo updated!');
    onUpdated({ ...member, photo_url: data.data.photo_url });
  };

  const handleDeletePhoto = async () => {
    if (!confirm('Remove this member\'s photo?')) return;
    setDeleting(true);
    const res = await fetch(`/api/members/${member.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photo_url: null }),
    });
    setDeleting(false);
    if (!res.ok) { toast.error('Failed to remove photo'); return; }
    toast.success('Photo removed');
    setPreview(null);
    onUpdated({ ...member, photo_url: null });
  };

  const initials = member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="glass-card w-full max-w-[560px] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="font-bold text-lg">Member Profile</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors text-xl leading-none">✕</button>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="flex gap-6">
            {/* Photo column */}
            <div className="flex flex-col items-center gap-3 shrink-0">
              <div className="relative group">
                {preview ? (
                  <img
                    src={preview}
                    alt={member.name}
                    className="w-28 h-28 rounded-2xl object-cover border-2 border-white/10"
                  />
                ) : (
                  <div
                    className="w-28 h-28 rounded-2xl flex items-center justify-center text-3xl font-bold text-white border-2 border-white/10"
                    style={{ background: `linear-gradient(135deg, #6366f1, #8b5cf6)` }}
                  >
                    {initials}
                  </div>
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* Photo actions */}
              <div className="flex flex-col gap-2 w-full">
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 border border-indigo-500/20 transition-colors disabled:opacity-50 w-full text-center"
                >
                  📷 {preview ? 'Change Photo' : 'Upload Photo'}
                </button>
                {preview && (
                  <button
                    onClick={handleDeletePhoto}
                    disabled={deleting}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/20 transition-colors disabled:opacity-50 w-full text-center"
                  >
                    🗑 Remove Photo
                  </button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoChange(f); e.target.value = ''; }}
                />
              </div>
            </div>

            {/* Details column */}
            <div className="flex-1 space-y-3.5 min-w-0">
              <div>
                <div className="text-xl font-bold text-white leading-tight">{member.name}</div>
                <div className="text-sm text-slate-400 mt-0.5">{member.role}</div>
              </div>

              <div className="flex flex-wrap gap-2">
                {/* Status badge */}
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                  member.is_alumni ? 'bg-purple-500/15 text-purple-400' :
                  member.is_active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                }`}>
                  {member.is_alumni ? '🎓 Alumni' : member.is_active ? '✅ Active' : '⛔ Inactive'}
                </span>
                {/* Team badge */}
                {member.teams && (
                  <span
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                    style={{ background: `${member.teams.colour}22`, color: member.teams.colour }}
                  >
                    {member.teams.name}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2.5 text-sm">
                <InfoRow icon="📱" label="Phone" value={member.phone} />
                <InfoRow icon="✉️" label="Email" value={member.email || '—'} />
                <InfoRow icon="🎂" label="Birthday" value={member.dob ? format(new Date(member.dob), 'dd MMMM yyyy') : '—'} />
                <InfoRow icon="📅" label="Joined" value={format(new Date(member.joined_at), 'dd MMM yyyy')} />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex justify-between items-center">
          <Link
            href={`/members/${member.id}`}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            ✏️ Edit Full Profile
          </Link>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-base shrink-0 w-5 text-center">{icon}</span>
      <div className="flex flex-col min-w-0">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
        <span className="text-[13.5px] text-slate-200 break-all">{value}</span>
      </div>
    </div>
  );
}

/* ─── Main Members Page ────────────────────────────────────── */
export default function Members() {
  const [members, setMembers] = useState<Member[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const limit = 20;

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    if (teamFilter) params.set('team', teamFilter);
    if (statusFilter) params.set('status', statusFilter);
    const res = await fetch(`/api/members?${params}`);
    const data = await res.json();
    setMembers(data.data || []);
    setTotal(data.count || 0);
    setLoading(false);
  }, [page, search, teamFilter, statusFilter]);

  useEffect(() => { fetch('/api/teams').then(r => r.json()).then(d => setTeams(d.data || [])); }, []);
  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await fetch(`/api/members/${deleteId}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Member deleted');
      setDeleteId(null);
      fetchMembers();
    } else {
      toast.error('Failed to delete member');
    }
  };

  const handleMemberUpdated = (updated: Member) => {
    setMembers(prev => prev.map(m => m.id === updated.id ? updated : m));
    setSelectedMember(updated);
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(members.map(m => ({
      Name: m.name, Phone: m.phone, Email: m.email || '',
      Team: m.teams?.name || '', Role: m.role,
      DOB: m.dob ? format(new Date(m.dob), 'dd MMM yyyy') : '',
      Status: m.is_alumni ? 'Alumni' : m.is_active ? 'Active' : 'Inactive',
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Members');
    XLSX.writeFile(wb, 'CY_Members.xlsx');
    toast.success('Exported to Excel');
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <>
      <PageHeader title="Members Directory" subtitle={`${total} registered members.`}>
        <button onClick={exportExcel} className="px-4 py-2 rounded-lg text-sm font-semibold bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
          📤 Export Excel
        </button>
        <Link href="/members/import" className="px-4 py-2 rounded-lg text-sm font-semibold bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
          📥 Import from Sheets
        </Link>
        <Link href="/members/new" className="px-4 py-2 rounded-lg text-sm font-semibold btn-primary-gradient">
          + Add Member
        </Link>
      </PageHeader>

      <div className="p-8 flex-1 overflow-auto">
        <div className="glass-card p-6">
          {/* Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
              <input
                type="text"
                className="glass-input pl-10 pr-4 py-2 rounded-lg w-[280px] text-sm"
                placeholder="Search by name or phone..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <div className="flex gap-2.5">
              <select
                className="glass-input px-3 py-2 rounded-lg text-sm cursor-pointer w-[160px]"
                value={teamFilter}
                onChange={(e) => { setTeamFilter(e.target.value); setPage(1); }}
              >
                <option value="">All Teams</option>
                {teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
              <select
                className="glass-input px-3 py-2 rounded-lg text-sm cursor-pointer w-[140px]"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              >
                <option value="">All Status</option>
                <option value="Active">Active</option>
                <option value="Alumni">Alumni</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <table className="data-table">
            <thead>
              <tr><th>Member</th><th>Phone</th><th>Team</th><th>DOB</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j}><div className="h-4 bg-white/5 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : members.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-slate-500 py-10">No members found</td></tr>
              ) : members.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      {/* Clickable photo/avatar opens profile modal */}
                      <button
                        onClick={() => setSelectedMember(m)}
                        title="View profile"
                        className="shrink-0 ring-2 ring-transparent hover:ring-indigo-500/60 rounded-full transition-all duration-150"
                      >
                        {m.photo_url ? (
                          <img src={m.photo_url} alt={m.name} className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center text-[13px] font-bold text-white">
                            {m.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                        )}
                      </button>
                      <div>
                        <button
                          onClick={() => setSelectedMember(m)}
                          className="font-semibold text-[13.5px] hover:text-indigo-300 transition-colors text-left"
                        >
                          {m.name}
                        </button>
                        <div className="text-xs text-slate-400">{m.email || m.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-[13.5px]">{m.phone}</td>
                  <td>
                    {m.teams ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                        style={{ background: `${m.teams.colour}22`, color: m.teams.colour }}>
                        {m.teams.name}
                      </span>
                    ) : <span className="text-slate-500 text-xs">—</span>}
                  </td>
                  <td className="text-[13.5px]">{m.dob ? format(new Date(m.dob), 'dd MMM yyyy') : '—'}</td>
                  <td>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                      m.is_alumni ? 'bg-purple-500/15 text-purple-400' :
                      m.is_active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                    }`}>
                      {m.is_alumni ? 'Alumni' : m.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <Link href={`/members/${m.id}`} className="px-3 py-1.5 rounded-md text-xs font-medium bg-white/5 hover:bg-white/10 transition-colors">
                        Edit
                      </Link>
                      <button
                        onClick={() => setDeleteId(m.id)}
                        className="px-3 py-1.5 rounded-md text-xs font-medium bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/20 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
              <span className="text-sm text-slate-400">
                Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total}
              </span>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium bg-white/5 hover:bg-white/10 disabled:opacity-40 transition-colors">
                  ← Prev
                </button>
                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium bg-white/5 hover:bg-white/10 disabled:opacity-40 transition-colors">
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Member Profile Modal */}
      {selectedMember && (
        <MemberModal
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
          onUpdated={handleMemberUpdated}
        />
      )}

      {/* Delete Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-card p-8 w-[380px] text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-bold mb-2">Delete Member?</h3>
            <p className="text-sm text-slate-400 mb-6">This action cannot be undone. The member will be permanently removed.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-medium transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete} className="flex-1 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
