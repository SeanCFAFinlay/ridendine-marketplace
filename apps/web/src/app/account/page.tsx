'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@ridendine/auth';
import { Header } from '@/components/layout/header';
import { Button, Card, Avatar } from '@ridendine/ui';

export default function AccountPage() {
  const router = useRouter();
  const { user, signOut } = useAuthContext();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  if (!user) {
    router.push('/auth/login');
    return null;
  }

  const menuItems = [
    { href: '/account/orders', label: 'Order History', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { href: '/account/favorites', label: 'Favorites', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
    { href: '/account/addresses', label: 'Addresses', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z' },
    { href: '/account/settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container py-8">
        <h1 className="text-2xl font-bold text-gray-900">My Account</h1>

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          {/* Profile Card */}
          <Card>
            <div className="flex flex-col items-center text-center">
              <Avatar
                src={user.user_metadata?.avatar_url}
                alt={user.email || ''}
                fallback={user.email?.slice(0, 2) || 'U'}
                size="xl"
              />
              <h2 className="mt-4 font-semibold text-gray-900">
                {user.user_metadata?.first_name} {user.user_metadata?.last_name}
              </h2>
              <p className="text-sm text-gray-500">{user.email}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={handleSignOut}
              >
                Sign out
              </Button>
            </div>
          </Card>

          {/* Menu Items */}
          <div className="lg:col-span-2">
            <Card padding="none">
              <nav className="divide-y divide-gray-100">
                {menuItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-4 p-4 hover:bg-gray-50"
                  >
                    <svg
                      className="h-6 w-6 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={item.icon}
                      />
                    </svg>
                    <span className="font-medium text-gray-900">{item.label}</span>
                    <svg
                      className="ml-auto h-5 w-5 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                ))}
              </nav>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
