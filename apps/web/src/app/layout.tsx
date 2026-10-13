import type { Metadata, Viewport } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import { AuthProvider } from '@ridendine/auth';
import { CartProvider } from '@/contexts/cart-context';
import { PwaInstallProvider } from '@/contexts/pwa-install-context';
import { ToastProvider, ErrorBoundary } from '@ridendine/ui';
import { SwRegistration } from '@/components/layout/sw-registration';
import { MobileAppBottomNav } from '@/components/layout/mobile-bottom-nav';
import { InstallAppBanner } from '@/components/layout/install-app-banner';
import { PwaInstallModal } from '@/components/layout/pwa-install-modal';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/react';
import './globals.css';

const sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const display = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'RideNDine - Home-Cooked Meals Delivered',
  description: 'Discover authentic home-cooked meals from local chefs in your neighbourhood. Support home chefs while enjoying delicious food delivered fresh.',
  manifest: '/manifest.json',
  icons: {
    icon: '/logo-icon.png',
    apple: '/logo-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'RideNDine',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#EA5B26',
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body className="min-h-screen bg-surfaceMuted font-sans antialiased">
        <SwRegistration />
        <ErrorBoundary>
          <AuthProvider>
            <CartProvider>
              <PwaInstallProvider>
                <ToastProvider>
                  <InstallAppBanner />
                  <div className="flex min-h-screen flex-col pb-20 md:pb-0">
                    {children}
                  </div>
                  <MobileAppBottomNav />
                  <PwaInstallModal />
                </ToastProvider>
              </PwaInstallProvider>
            </CartProvider>
          </AuthProvider>
        </ErrorBoundary>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
