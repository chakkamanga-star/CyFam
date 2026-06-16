'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

type AuditLog = {
  id: string; admin_name: string | null; action: string;
  entity: string | null; detail: string | null; created_at: string;
};

type Admin = { id: string; name: string; phone: string; role: string; is_active: boolean };

const ROLES = ['Member', 'Team Leader', 'Secretary', 'President', 'Media Admin', 'Super Admin', 'Alumni'];

export default function Settings() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'accounts' | 'logs'>('accounts');
  const [newAdmin, setNewAdmin] = useState({ name: '', phone: '', role: 'Member' });
  const [addingAdmin, setAddingAdmin] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/audit-logs').then(r => r.json()),
      fetch('/api/members?limit=100&role=Super Admin').then(r => r.json()),
    ]).then(([logsData, membersData]) => {
      setLogs(logsData.data || []);
      setAdmins(membersData.data || []);
      setLoading(false);
    });
  }, []);

  const loadAllMembers = async () => {
    const res = await fetch('/api/members?limit=200');
    const data = await res.json();
    setAdmins(data.data || []);
  };

  useEffect(() => { loadAllMembers(); }, []);

  const handleAddAdmin = async () => {
    if (!newAdmin.name || !newAdmin.phone) { toast.error('Name and phone required'); return; }
    setAddingAdmin(true);
    const formData = new FormData();
    Object.entries(newAdmin).forEach(([k, v]) => formData.append(k, v));
    formData.set('phone', `91${newAdmin.phone.replace(/\D/g, '')}`);

    const res = await fetch('/api/members', { method: 'POST', body: formData });
    const data = await res.json();
    setAddingAdmin(false);
    if (!res.ok) { toast.error(data.error || 'Failed to add'); return; }
    toast.success('Admin account created!');
    setNewAdmin({ name: '', phone: '', role: 'Member' });
    loadAllMembers();
  };

  const toggleActive = async (id: string, is_active: boolean) => {
    const res = await fetch(`/api/members/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !is_active }),
    });
    if (res.ok) {
      toast.success(is_active ? 'Account deactivated' : 'Account activated');
      loadAllMembers();
    }
  };

  const actionIcon: Record<string, string> = {
    LOGIN: '🔐', CREATE_MEMBER: '➕', DELETE_MEMBER: '🗑', UPDATE_MEMBER: '✏️',
    CREATE_EVENT: '📅', DELETE_EVENT: '🗑', UPLOAD_MEDIA: '📸',
    SEND_NOTIFICATION: '🔔', IMPORT_MEMBERS: '📥', UPDATE_SETTINGS: '⚙️',
    UPDATE_ABOUT: 'ℹ️', UPDATE_PRAYER_SCHEDULE: '🙏',
  };

  const TABS = [{ key: 'accounts', label: '👥 Admin Accounts' }, { key: 'logs', label: '📋 Audit Logs' }] as const;

  return (
    <>
      <PageHeader title="Settings" subtitle="System configuration and access management." />
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

        {tab === 'accounts' && (
          <div className="space-y-6">
            {/* Add Admin */}
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-5">Create Admin Account</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-[13px] font-semibold text-slate-400 mb-1.5">Full Name</label>
                  <input type="text" className="glass-input w-full px-3 py-2.5 rounded-lg text-sm"
                    placeholder="Admin's name" value={newAdmin.name}
                    onChange={e => setNewAdmin(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-slate-400 mb-1.5">Phone (login)</label>
                  <input type="tel" className="glass-input w-full px-3 py-2.5 rounded-lg text-sm"
                    placeholder="10-digit number" value={newAdmin.phone}
                    onChange={e => setNewAdmin(f => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))} />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-slate-400 mb-1.5">Role</label>
                  <select className="glass-input w-full px-3 py-2.5 rounded-lg text-sm"
                    value={newAdmin.role} onChange={e => setNewAdmin(f => ({ ...f, role: e.target.value }))}>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={handleAddAdmin} disabled={addingAdmin}
                className="btn-primary-gradient px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-60">
                {addingAdmin ? 'Creating...' : '+ Create Account'}
              </button>
            </div>

            {/* Admins Table */}
            <div className="glass-card">
              <div className="px-6 py-4 border-b border-white/10">
                <h3 className="font-semibold">All Members ({admins.length})</h3>
              </div>
              <table className="data-table">
                <thead><tr><th>Name</th><th>Phone</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {admins.map(a => (
                    <tr key={a.id}>
                      <td className="font-semibold text-[13.5px]">{a.name}</td>
                      <td className="text-[13.5px]">{a.phone}</td>
                      <td>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/15 text-indigo-400">
                          {a.role}
                        </span>
                      </td>
                      <td>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${a.is_active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                          {a.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <button onClick={() => toggleActive(a.id, a.is_active)}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                            a.is_active ? 'bg-red-500/15 text-red-400 border-red-500/20 hover:bg-red-500/25' : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/25'
                          }`}>
                          {a.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'logs' && (
          <div className="glass-card">
            <div className="px-6 py-4 border-b border-white/10">
              <h3 className="font-semibold">Audit Log</h3>
              <p className="text-xs text-slate-400 mt-0.5">All admin actions are tracked here</p>
            </div>
            <table className="data-table">
              <thead><tr><th>Action</th><th>By</th><th>Details</th><th>Time</th></tr></thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 4 }).map((_, j) => (
                      <td key={j}><div className="h-4 bg-white/5 rounded animate-pulse" /></td>
                    ))}</tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr><td colSpan={4} className="text-center text-slate-500 py-10">No audit logs yet</td></tr>
                ) : logs.map(log => (
                  <tr key={log.id}>
                    <td>
                      <span className="flex items-center gap-1.5 text-[13px]">
                        {actionIcon[log.action] || '🔧'}
                        <span className="font-semibold capitalize">{log.action.replace(/_/g, ' ').toLowerCase()}</span>
                      </span>
                    </td>
                    <td className="text-[13.5px]">{log.admin_name || '—'}</td>
                    <td className="text-[12px] text-slate-400 max-w-[250px] truncate">{log.detail || '—'}</td>
                    <td className="text-[12px] text-slate-400">{format(new Date(log.created_at), 'dd MMM, hh:mm a')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
