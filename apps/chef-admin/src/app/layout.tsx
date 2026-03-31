import type { Metadata } from 'next';
import { AuthProvider } from '@ridendine/auth';
import './globals.css';

export const metadata: Metadata = {
  title: 'Chef Dashboard - RideNDine',
  description: 'Manage your storefront, menu, and orders on RideNDine.',
  icons: {
    icon: '/logo-icon.png',
    apple: '/logo-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#FAFAFA] font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
