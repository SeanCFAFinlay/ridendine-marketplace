import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@ridendine/auth';
import './globals.css';

export const metadata: Metadata = {
  title: 'RideNDine Driver',
  description: 'Deliver with RideNDine — earn on your schedule',
  manifest: '/manifest.json',
  icons: {
    icon: '/logo-icon.png',
    apple: '/logo-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'RideNDine Driver',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#E85D26',
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
