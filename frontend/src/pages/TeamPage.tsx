import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, Avatar, Badge, Btn, Modal, Input, Select, EmptyState, Skeleton } from '@/components/ui';
import { usersApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { fmtDate, fmtRelative } from '@/lib/utils';
import type { User } from '@/types';
import { Users, Plus, Trash2, Shield, User as UserIcon, Mail, Send } from 'lucide-react';

export function TeamPage() {
  const { isAdmin, user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addErr, setAddErr] = useState('');

  const [form, setForm] = useState({
    email: '', role: 'user', team: '',
  });

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const load = () => {
    usersApi.list()
      .then((r) => setUsers(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!form.email) {
      setAddErr('Email is required');
      return;
    }
    setSaving(true);
    setAddErr('');
    try {
      await usersApi.invite({ email: form.email, role: form.role, team: form.team || undefined });
      setShowAdd(false);
      setForm({ email: '', role: 'user', team: '' });
      load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setAddErr(err?.response?.data?.detail ?? 'Failed to send invitation');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Remove this team member?')) return;
    await usersApi.delete(id);
    load();
  };

  const handleToggleRole = async (u: User) => {
    const newRole = u.role === 'admin' ? 'user' : 'admin';
    if (!confirm(`Change ${u.full_name} to ${newRole}?`)) return;
    await usersApi.updateRole(u.id, newRole);
    load();
  };
  const adminCount = users.filter((u) => u.role === 'admin').length;
  const activeCount = users.filter((u) => u.is_active).length;

  return (
    <Layout breadcrumbs={['PatchOps', 'Team']}>
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-[10px] flex items-center justify-center"
          style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}
        >
          <Users size={18} className="text-indigo-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#E8EAF6]" style={{ fontFamily: 'var(--font-display)' }}>
            Team
          </h1>
          <p className="text-sm text-[#454C75]">Manage users and access levels</p>
        </div>
        <Btn variant="primary" size="sm" icon={<Plus size={13} />} onClick={() => setShowAdd(true)} className="ml-auto">
          Invite Member
        </Btn>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-[8px] bg-indigo-500/10 flex items-center justify-center">
            <Users size={15} className="text-indigo-400" />
          </div>
          <div>
            <div className="text-xl font-black text-[#E8EAF6]" style={{ fontFamily: 'var(--font-display)' }}>{loading ? '—' : users.length}</div>
            <div className="text-xs text-[#454C75]">Total members</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-[8px] bg-amber-500/10 flex items-center justify-center">
            <Shield size={15} className="text-amber-400" />
          </div>
          <div>
            <div className="text-xl font-black text-amber-400" style={{ fontFamily: 'var(--font-display)' }}>{loading ? '—' : adminCount}</div>
            <div className="text-xs text-[#454C75]">Admins</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-[8px] bg-emerald-500/10 flex items-center justify-center">
            <UserIcon size={15} className="text-emerald-400" />
          </div>
          <div>
            <div className="text-xl font-black text-emerald-400" style={{ fontFamily: 'var(--font-display)' }}>{loading ? '—' : activeCount}</div>
            <div className="text-xs text-[#454C75]">Active</div>
          </div>
        </Card>
      </div>

      {/* User table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1C2038]">
                {['Member', 'Role', 'Team', 'Timezone', 'Joined', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#454C75]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#1C2038]/50">
                    <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                    {Array.from({ length: 4 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-3 w-20" /></td>
                    ))}
                    <td />
                  </tr>
                ))
              ) : users.map((u) => (
                <tr key={u.id} className="border-b border-[#1C2038]/50 hover:bg-[#141828]/50 group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={u.full_name} size={30} />
                      <div>
                        <div className="text-sm font-medium text-[#C4C8E8]">{u.full_name}</div>
                        <div className="flex items-center gap-1 text-xs text-[#454C75]">
                          <Mail size={10} />
                          {u.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={u.role === 'admin' ? 'warning' : 'default'}>
                      {u.role === 'admin' ? '✦ Admin' : 'User'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#8B91BE]">{u.team ?? '—'}</td>
                  <td className="px-4 py-3 text-sm font-mono text-[#454C75]">{u.timezone ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-[#454C75]">{fmtRelative(u.created_at)}</td>
                  <td className="px-4 py-3">
                  {u.id !== currentUser?.id && (
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all">
                        <button
                          onClick={() => handleToggleRole(u)}
                          className="px-2 h-6 rounded-[5px] bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 text-[10px] font-bold transition-all"
                          title={`Switch to ${u.role === 'admin' ? 'User' : 'Admin'}`}
                        >
                          {u.role === 'admin' ? '↓ User' : '↑ Admin'}
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="w-6 h-6 rounded-[5px] bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-all"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add user modal */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); setAddErr(''); }} title="Invite Team Member">
        <div className="flex flex-col gap-4">
          <div className="p-3 rounded-[8px] text-xs" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', color: '#818CF8' }}>
            An invitation email will be sent. The user sets their own name and password when they accept.
          </div>
          <Input label="Email Address" type="email" placeholder="alex@company.com" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Role"
              options={[{ value: 'user', label: 'User' }, { value: 'admin', label: 'Admin' }]}
              value={form.role}
              onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}
            />
            <Input label="Team (optional)" placeholder="Platform Ops" value={form.team} onChange={(e) => setForm(f => ({ ...f, team: e.target.value }))} />
          </div>
          {addErr && (
            <div className="p-3 rounded-[8px] bg-red-500/10 border border-red-500/25 text-xs text-red-400">{addErr}</div>
          )}
          <div className="flex gap-2">
            <Btn variant="primary" onClick={handleAdd} loading={saving} className="flex-1">Send Invitation</Btn>
            <Btn variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Btn>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
