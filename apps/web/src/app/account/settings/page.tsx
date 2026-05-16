'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@ridendine/auth';
import { Header } from '@/components/layout/header';
import { Button, Card, Input } from '@ridendine/ui';

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useAuthContext();
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [profileData, setProfileData] = useState({
    firstName: user?.user_metadata?.first_name || '',
    lastName: user?.user_metadata?.last_name || '',
    email: user?.email || '',
    phone: user?.user_metadata?.phone || '',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    orderUpdates: true,
    promotions: false,
    newChefs: true,
  });

  if (!user) {
    router.push('/auth/login');
    return null;
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          phone: profileData.phone,
        }),
      });
      if (response.ok) {
        setSuccessMessage('Profile updated successfully');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const data = await response.json();
        setSuccessMessage('');
        alert(data.error || 'Failed to update profile');
      }
    } catch {
      alert('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNotificationToggle = (key: keyof typeof notificationSettings) => {
    setNotificationSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-text">
              Account Settings
            </h1>
            <p className="mt-1 text-base leading-relaxed text-textMuted">
              Manage your profile and preferences
            </p>
          </div>
          <Link href="/account">
            <Button variant="secondary">Back to Account</Button>
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {successMessage && (
              <div className="rounded-md border border-success/30 bg-successSoft p-4 text-sm text-success">
                {successMessage}
              </div>
            )}

            <Card padding="lg">
              <h2 className="mb-6 text-xl font-semibold text-text">
                Profile Information
              </h2>
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="First Name"
                    value={profileData.firstName}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        firstName: e.target.value,
                      })
                    }
                    placeholder="John"
                    required
                  />
                  <Input
                    label="Last Name"
                    value={profileData.lastName}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        lastName: e.target.value,
                      })
                    }
                    placeholder="Doe"
                    required
                  />
                </div>
                <Input
                  label="Email"
                  type="email"
                  value={profileData.email}
                  onChange={(e) =>
                    setProfileData({ ...profileData, email: e.target.value })
                  }
                  placeholder="you@example.com"
                  required
                  disabled
                  hint="Email cannot be changed"
                />
                <Input
                  label="Phone Number"
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) =>
                    setProfileData({ ...profileData, phone: e.target.value })
                  }
                  placeholder="(555) 123-4567"
                />
                <div className="flex justify-end">
                  <Button type="submit" variant="primary" loading={isSaving}>
                    Save Changes
                  </Button>
                </div>
              </form>
            </Card>

            <Card padding="lg">
              <h2 className="mb-6 text-xl font-semibold text-text">
                Notification Preferences
              </h2>
              <div className="space-y-4">
                {[
                  { key: 'orderUpdates' as const, title: 'Order Updates', desc: 'Get notified about order status changes' },
                  { key: 'promotions' as const, title: 'Promotions & Offers', desc: 'Receive special offers and promotions' },
                  { key: 'newChefs' as const, title: 'New Chefs', desc: 'Be notified when new chefs join in your area' },
                ].map(({ key, title, desc }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-text">{title}</h3>
                      <p className="text-sm text-textMuted">{desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleNotificationToggle(key)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:shadow-focus ${
                        notificationSettings[key] ? 'bg-primary' : 'bg-surfaceMuted'
                      }`}
                      aria-pressed={notificationSettings[key]}
                      aria-label={`Toggle ${title}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-surface transition-transform ${
                          notificationSettings[key] ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </Card>

            <Card padding="lg" className="border-danger/30">
              <h2 className="mb-4 text-xl font-semibold text-danger">
                Danger Zone
              </h2>
              <p className="mb-4 text-sm leading-relaxed text-textMuted">
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <Button variant="danger" size="sm">
                Delete Account
              </Button>
            </Card>
          </div>

          <div className="space-y-6">
            <Card padding="lg">
              <h3 className="mb-3 text-base font-semibold text-text">Password</h3>
              <p className="mb-4 text-sm leading-relaxed text-textMuted">
                Update your password to keep your account secure
              </p>
              <Link href="/auth/forgot-password">
                <Button variant="secondary" size="sm">
                  Change Password
                </Button>
              </Link>
            </Card>

            <Card padding="lg">
              <h3 className="mb-3 text-base font-semibold text-text">Privacy & Data</h3>
              <p className="mb-4 text-sm leading-relaxed text-textMuted">
                Learn how we handle your data
              </p>
              <div className="space-y-2">
                <Link href="/privacy" className="block">
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    Privacy Policy
                  </Button>
                </Link>
                <Link href="/terms" className="block">
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    Terms of Service
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
