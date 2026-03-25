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
    setTimeout(() => {
      setSuccessMessage('Profile updated successfully');
      setIsSaving(false);
      setTimeout(() => setSuccessMessage(''), 3000);
    }, 1000);
  };

  const handleNotificationToggle = (key: keyof typeof notificationSettings) => {
    setNotificationSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Header />

      <main className="container py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-[#2D3436]">
              Account Settings
            </h1>
            <p className="mt-1 text-[15px] leading-[1.6] text-[#5F6368]">
              Manage your profile and preferences
            </p>
          </div>
          <Link href="/account">
            <Button variant="outline">Back to Account</Button>
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {successMessage && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-[15px] text-green-700">
                {successMessage}
              </div>
            )}

            <Card padding="lg">
              <h2 className="mb-6 text-[20px] font-semibold text-[#2D3436]">
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
                  <Button
                    type="submit"
                    loading={isSaving}
                    className="bg-[#FF6B6B] hover:bg-[#FF5252]"
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            </Card>

            <Card padding="lg">
              <h2 className="mb-6 text-[20px] font-semibold text-[#2D3436]">
                Notification Preferences
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-[15px] font-medium text-[#2D3436]">
                      Order Updates
                    </h3>
                    <p className="text-[14px] text-[#5F6368]">
                      Get notified about order status changes
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleNotificationToggle('orderUpdates')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      notificationSettings.orderUpdates
                        ? 'bg-[#FF6B6B]'
                        : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        notificationSettings.orderUpdates
                          ? 'translate-x-6'
                          : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-[15px] font-medium text-[#2D3436]">
                      Promotions & Offers
                    </h3>
                    <p className="text-[14px] text-[#5F6368]">
                      Receive special offers and promotions
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleNotificationToggle('promotions')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      notificationSettings.promotions
                        ? 'bg-[#FF6B6B]'
                        : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        notificationSettings.promotions
                          ? 'translate-x-6'
                          : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-[15px] font-medium text-[#2D3436]">
                      New Chefs
                    </h3>
                    <p className="text-[14px] text-[#5F6368]">
                      Be notified when new chefs join in your area
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleNotificationToggle('newChefs')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      notificationSettings.newChefs
                        ? 'bg-[#FF6B6B]'
                        : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        notificationSettings.newChefs
                          ? 'translate-x-6'
                          : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </Card>

            <Card padding="lg" className="border-red-200">
              <h2 className="mb-4 text-[20px] font-semibold text-red-600">
                Danger Zone
              </h2>
              <p className="mb-4 text-[15px] leading-[1.6] text-[#5F6368]">
                Once you delete your account, there is no going back. Please be
                certain.
              </p>
              <Button variant="destructive" size="sm">
                Delete Account
              </Button>
            </Card>
          </div>

          <div className="space-y-6">
            <Card padding="lg">
              <h3 className="mb-3 text-[17px] font-semibold text-[#2D3436]">
                Password
              </h3>
              <p className="mb-4 text-[15px] leading-[1.6] text-[#5F6368]">
                Update your password to keep your account secure
              </p>
              <Link href="/auth/forgot-password">
                <Button variant="outline" size="sm">
                  Change Password
                </Button>
              </Link>
            </Card>

            <Card padding="lg">
              <h3 className="mb-3 text-[17px] font-semibold text-[#2D3436]">
                Privacy & Data
              </h3>
              <p className="mb-4 text-[15px] leading-[1.6] text-[#5F6368]">
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
