import type { Metadata } from 'next';
import { AuthProvider } from '@ridendine/auth';
import './globals.css';

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
    <html lang="en">
      <body className="min-h-screen bg-[#1a1a2e] font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
