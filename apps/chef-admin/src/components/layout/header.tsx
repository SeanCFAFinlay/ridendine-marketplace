'use client';

import { useAuthContext } from '@ridendine/auth';
import { Avatar, Badge } from '@ridendine/ui';

export function Header() {
  const { user } = useAuthContext();

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-gray-900">Chef Dashboard</h2>
        <Badge variant="success">Online</Badge>
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative rounded-lg p-2 hover:bg-gray-100">
          <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
        </button>

        {/* User Menu */}
        <div className="flex items-center gap-3">
          <Avatar
            src={user?.user_metadata?.avatar_url}
            alt={user?.email || ''}
            fallback={user?.email?.slice(0, 2) || 'C'}
            size="sm"
          />
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900">
              {user?.user_metadata?.first_name || 'Chef'}
            </p>
            <p className="text-xs text-gray-500">Maria&apos;s Kitchen</p>
          </div>
        </div>
      </div>
    </header>
  );
}
