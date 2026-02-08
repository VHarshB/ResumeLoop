import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'JobLoop - Automated Resume Generator',
  description: 'Automated Job Application Resume Generator using Local AI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
