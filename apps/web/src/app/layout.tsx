import type { Metadata } from 'next';
import { AuthProvider } from '@ridendine/auth';
import { CartProvider } from '@/contexts/cart-context';
import './globals.css';

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
    <html lang="en">
      <body className="min-h-screen bg-gray-50 font-sans antialiased">
        <AuthProvider>
          <CartProvider>{children}</CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
