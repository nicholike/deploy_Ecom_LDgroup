import type { Metadata } from 'next';
import { Providers } from './providers';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Ashion - E-commerce Fashion Store',
  description: 'Modern E-commerce Fashion Store',
  icons: {
    icon: '/favicon.ico',
    apple: '/icon.png',
  },
};

/**
 * Root Layout
 * Provides html/body wrapper for all routes
 * Each route group loads its own specific styles
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
