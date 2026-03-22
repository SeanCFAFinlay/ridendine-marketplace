import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@ridendine/auth';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Chef Dashboard - Ridendine',
  description: 'Manage your storefront, menu, and orders on Ridendine.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-gray-50 font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
