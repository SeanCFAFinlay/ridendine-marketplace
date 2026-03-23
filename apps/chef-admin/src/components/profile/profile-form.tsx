'use client';

import { useState } from 'react';
import { Card, Button } from '@ridendine/ui';

interface ChefProfile {
  id: string;
  user_id: string;
  display_name: string;
  bio: string | null;
  profile_image_url: string | null;
  phone: string | null;
  status: string;
}

interface ProfileFormProps {
  profile: ChefProfile;
}

export function ProfileForm({ profile: initialProfile }: ProfileFormProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData(e.target as HTMLFormElement);

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: formData.get('display_name'),
          bio: formData.get('bio') || null,
          phone: formData.get('phone') || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update profile');
      }

      const { profile: updatedProfile } = await response.json();
      setProfile(updatedProfile);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg bg-green-50 p-4">
          <p className="text-sm text-green-800">Profile updated successfully!</p>
        </div>
      )}

      <div className="mt-6 max-w-2xl space-y-6">
        <Card>
          <h2 className="font-semibold text-gray-900">Profile Image</h2>
          <div className="mt-4 flex items-center gap-4">
            <div className="h-24 w-24 overflow-hidden rounded-full bg-gray-100">
              {profile.profile_image_url ? (
                <img
                  src={profile.profile_image_url}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-400">
                  <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600">Upload a profile photo</p>
              <Button variant="outline" size="sm" className="mt-2" type="button">
                Upload Photo
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold text-gray-900">Personal Information</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Display Name</label>
              <input
                name="display_name"
                type="text"
                defaultValue={profile.display_name}
                placeholder="Your name"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Bio</label>
              <textarea
                name="bio"
                defaultValue={profile.bio || ''}
                placeholder="Tell customers about yourself and your cooking style..."
                rows={4}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
              <p className="mt-1 text-xs text-gray-500">
                Share your culinary background, specialties, and what makes your food unique
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Phone Number</label>
              <input
                name="phone"
                type="tel"
                defaultValue={profile.phone || ''}
                placeholder="(555) 123-4567"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>

            <div className="rounded-lg bg-gray-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Account Status</p>
                  <p className="mt-0.5 text-sm text-gray-500">
                    Your account is currently{' '}
                    <span className="font-medium capitalize">{profile.status}</span>
                  </p>
                </div>
                <div
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    profile.status === 'approved'
                      ? 'bg-green-100 text-green-800'
                      : profile.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {profile.status}
                </div>
              </div>
            </div>
          </div>

          <Button className="mt-4" type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </Card>
      </div>
    </form>
  );
}
