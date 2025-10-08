import { Roboto } from 'next/font/google';

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  display: 'swap',
});

/**
 * Auth Layout - Tailwind CSS Only
 * Simple wrapper for auth pages
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={roboto.className}>{children}</div>;
}
