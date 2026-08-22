import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Jade',
  description: 'The practice OS for Vedic astrology.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-body">{children}</body>
    </html>
  );
}
