import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@ridendine/auth';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Ridendine - Home-Cooked Meals Delivered',
  description: 'Discover authentic home-cooked meals from local chefs in your area.',
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
