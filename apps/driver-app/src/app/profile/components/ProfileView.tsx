'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Button } from '@ridendine/ui';
import type { Driver } from '@ridendine/db';

interface ProfileViewProps {
  driver: Driver;
}

export default function ProfileView({ driver }: ProfileViewProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    first_name: driver.first_name,
    last_name: driver.last_name,
    phone: driver.phone,
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/driver', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    const response = await fetch('/api/auth/logout', { method: 'POST' });
    if (response.ok) {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-20">
      <div className="bg-brand-500 p-6 text-white">
        <h1 className="text-[24px] font-bold">Profile</h1>
      </div>

      <div className="p-4">
        <Link
          href="/settings"
          className="mb-4 flex items-center justify-between rounded-lg border border-[#e5e7eb] bg-white px-4 py-3 text-[15px] font-medium text-[#1a1a1a] shadow-sm"
        >
          <span>Payout &amp; instant settings</span>
          <span className="text-brand-600">→</span>
        </Link>
      </div>

      <div className="p-4 space-y-4">
        <Card className="border-0 shadow-sm">
          <h2 className="text-[17px] font-semibold text-[#1a1a1a] mb-6">Driver Information</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-[#6b7280] mb-2">
                First Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="w-full rounded-lg border border-[#e5e7eb] px-4 py-3 text-[15px] focus:border-brand-500 focus:outline-none"
                />
              ) : (
                <p className="text-[15px] text-[#1a1a1a]">{driver.first_name}</p>
              )}
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#6b7280] mb-2">
                Last Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="w-full rounded-lg border border-[#e5e7eb] px-4 py-3 text-[15px] focus:border-brand-500 focus:outline-none"
                />
              ) : (
                <p className="text-[15px] text-[#1a1a1a]">{driver.last_name}</p>
              )}
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#6b7280] mb-2">
                Phone
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full rounded-lg border border-[#e5e7eb] px-4 py-3 text-[15px] focus:border-brand-500 focus:outline-none"
                />
              ) : (
                <p className="text-[15px] text-[#1a1a1a]">{driver.phone}</p>
              )}
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#6b7280] mb-2">
                Email
              </label>
              <p className="text-[15px] text-[#1a1a1a]">{driver.email}</p>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#6b7280] mb-2">
                Status
              </label>
              <span className={`inline-block rounded-full px-3 py-1 text-[13px] font-medium ${
                driver.status === 'approved' ? 'bg-[#dcfce7] text-[#166534]' :
                driver.status === 'pending' ? 'bg-[#fef3c7] text-[#92400e]' :
                'bg-[#fee2e2] text-[#991b1b]'
              }`}>
                {driver.status.charAt(0).toUpperCase() + driver.status.slice(1)}
              </span>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            {isEditing ? (
              <>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 rounded-lg bg-brand-500 py-3 text-[15px] font-semibold hover:bg-brand-600"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      first_name: driver.first_name,
                      last_name: driver.last_name,
                      phone: driver.phone,
                    });
                  }}
                  variant="secondary"
                  className="flex-1 rounded-lg py-3 text-[15px] font-semibold"
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setIsEditing(true)}
                className="w-full rounded-lg bg-brand-500 py-3 text-[15px] font-semibold hover:bg-brand-600"
              >
                Edit Profile
              </Button>
            )}
          </div>
        </Card>

        <Card className="border-0 shadow-sm">
          <Button
            onClick={handleLogout}
            variant="secondary"
            className="w-full rounded-lg border-2 border-[#ef4444] py-3 text-[15px] font-semibold text-[#ef4444] hover:bg-[#fef2f2]"
          >
            Logout
          </Button>
        </Card>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-[#e5e7eb] bg-white">
        <div className="flex justify-around py-3">
          {[
            { icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', label: 'Home', href: '/', active: false },
            { icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', label: 'History', href: '/history', active: false },
            { icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', label: 'Earnings', href: '/earnings', active: false },
            { icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', label: 'Profile', href: '/profile', active: true },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-4 py-2 ${
                item.active ? 'text-brand-600' : 'text-[#9ca3af]'
              }`}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              <span className="text-[12px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
