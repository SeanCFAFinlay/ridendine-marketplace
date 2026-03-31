import type { Metadata } from 'next';
import { AuthProvider } from '@ridendine/auth';
import './globals.css';

export const metadata: Metadata = {
  title: 'Operations Admin - RideNDine',
  description: 'Internal operations dashboard for RideNDine.',
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
      <body className="min-h-screen bg-[#0f1923] font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
