'use client';

import { useState, useEffect } from 'react';
import { Card, Badge, Button, Input } from '@ridendine/ui';
import { DashboardLayout } from '@/components/DashboardLayout';
import { fetchApiItems, fetchJson } from '@/lib/client-api';

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
      setError('');
      setMembers(await fetchApiItems<TeamMember>('/api/team', undefined, 'Failed to load team'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team');
    }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTeam(); }, []);

  const toggleActive = async (id: string, currentActive: boolean) => {
    try {
      setError('');
      await fetchJson('/api/team', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !currentActive }),
      }, 'Failed to update team member');
      fetchTeam();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to update'); }
  };

  const changeRole = async (id: string, newRole: string) => {
    try {
      setError('');
      await fetchJson('/api/team', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, role: newRole }),
      }, 'Failed to update team member');
      fetchTeam();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to update'); }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Team Management</h1>
            <p className="mt-1 text-textMuted">Manage ops team members and roles</p>
          </div>
          <Button onClick={() => setShowInvite(true)} className="bg-primary hover:bg-primaryHover">
            Invite Member
          </Button>
        </div>

        {error && <div className="rounded-lg bg-danger/20 p-3 text-sm text-danger">{error}</div>}

        <Card className="border-border bg-surface overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-textMuted">Loading...</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-textMuted">
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className="border-b border-border hover:bg-surfaceMuted">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{member.name}</p>
                      <p className="text-xs text-textMuted">{member.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <select value={member.role} onChange={e => changeRole(member.id, e.target.value)}
                        className="rounded bg-transparent text-sm text-textSubtle border-0 focus:ring-1 focus:ring-primary">
                        {Object.entries(ROLE_LABELS).map(([value, label]) => (
                          <option key={value} value={value} className="bg-surface">{label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={member.is_active ? 'bg-success/20 text-success' : 'bg-surfaceMuted text-textMuted'}>
                        {member.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-textMuted">
                      {new Date(member.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="outline" size="sm" onClick={() => toggleActive(member.id, member.is_active)}
                        className="border-border text-textSubtle hover:bg-surfaceMuted">
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
      await fetchJson('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      }, 'Failed to create account');
      onSuccess();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl bg-surface p-6 border border-border">
        <h2 className="text-xl font-bold text-white">Invite Team Member</h2>
        {error && <div className="mt-2 rounded-lg bg-danger/20 p-3 text-sm text-danger">{error}</div>}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-textSubtle mb-1">Full Name</label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required className="bg-surface border-border text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-textSubtle mb-1">Email</label>
            <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required className="bg-surface border-border text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-textSubtle mb-1">Role</label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="w-full rounded-lg bg-surface border border-border text-white px-3 py-2 text-sm">
              <option value="ops_agent">Ops Agent</option>
              <option value="ops_manager">Ops Manager</option>
              <option value="finance_admin">Finance Admin</option>
              <option value="support">Support</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-textSubtle mb-1">Temporary Password</label>
            <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required minLength={8} className="bg-surface border-border text-white" placeholder="Min 8 characters" />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="border-border text-textSubtle">Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-primary">{loading ? 'Creating...' : 'Create Account'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
