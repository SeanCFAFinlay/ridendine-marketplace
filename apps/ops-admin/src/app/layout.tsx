import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@ridendine/auth';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Operations Admin - Ridendine',
  description: 'Internal operations dashboard for Ridendine.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-[#1a1a2e] font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
