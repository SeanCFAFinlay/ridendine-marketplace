'use client';

import { useState, useEffect } from 'react';
import { Card, Badge, Button, Input } from '@ridendine/ui';
import { DashboardLayout } from '@/components/DashboardLayout';

interface TeamMember {
  id: string;
  user_id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  ops_manager: 'Ops Manager',
  ops_agent: 'Ops Agent',
  finance_admin: 'Finance Admin',
  support: 'Support',
};

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [error, setError] = useState('');

  const fetchTeam = async () => {
    try {
      const res = await fetch('/api/team');
      const data = await res.json();
      if (data.success) setMembers(data.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTeam(); }, []);

  const toggleActive = async (id: string, currentActive: boolean) => {
    try {
      await fetch('/api/team', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !currentActive }),
      });
      fetchTeam();
    } catch { setError('Failed to update'); }
  };

  const changeRole = async (id: string, newRole: string) => {
    try {
      await fetch('/api/team', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, role: newRole }),
      });
      fetchTeam();
    } catch { setError('Failed to update'); }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Team Management</h1>
            <p className="mt-1 text-gray-400">Manage ops team members and roles</p>
          </div>
          <Button onClick={() => setShowInvite(true)} className="bg-[#E85D26] hover:bg-[#d44e1e]">
            Invite Member
          </Button>
        </div>

        {error && <div className="rounded-lg bg-red-500/20 p-3 text-sm text-red-300">{error}</div>}

        <Card className="border-gray-800 bg-opsPanel overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 text-left text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className="border-b border-gray-800 hover:bg-white/5">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{member.name}</p>
                      <p className="text-xs text-gray-500">{member.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <select value={member.role} onChange={e => changeRole(member.id, e.target.value)}
                        className="rounded bg-transparent text-sm text-gray-300 border-0 focus:ring-1 focus:ring-[#E85D26]">
                        {Object.entries(ROLE_LABELS).map(([value, label]) => (
                          <option key={value} value={value} className="bg-opsPanel">{label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={member.is_active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-gray-700 text-gray-400'}>
                        {member.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {new Date(member.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="outline" size="sm" onClick={() => toggleActive(member.id, member.is_active)}
                        className="border-gray-600 text-gray-300 hover:bg-white/10">
                        {member.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {showInvite && <InviteModal onClose={() => setShowInvite(false)} onSuccess={() => { setShowInvite(false); fetchTeam(); }} />}
      </div>
    </DashboardLayout>
  );
}

function InviteModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ email: '', name: '', role: 'ops_agent', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSuccess();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl bg-opsPanel p-6 border border-gray-700">
        <h2 className="text-xl font-bold text-white">Invite Team Member</h2>
        {error && <div className="mt-2 rounded-lg bg-red-500/20 p-3 text-sm text-red-300">{error}</div>}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required className="bg-opsPanel border-gray-600 text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required className="bg-opsPanel border-gray-600 text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Role</label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="w-full rounded-lg bg-opsPanel border border-gray-600 text-white px-3 py-2 text-sm">
              <option value="ops_agent">Ops Agent</option>
              <option value="ops_manager">Ops Manager</option>
              <option value="finance_admin">Finance Admin</option>
              <option value="support">Support</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Temporary Password</label>
            <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required minLength={8} className="bg-opsPanel border-gray-600 text-white" placeholder="Min 8 characters" />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="border-gray-600 text-gray-300">Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-[#E85D26]">{loading ? 'Creating...' : 'Create Account'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
