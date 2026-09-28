import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'TenderFit — Bid intelligence, with receipts',
  description:
    'Evidence-linked tender eligibility assessment for serious bid teams.',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="bg-stone-50 text-neutral-950 antialiased selection:bg-neutral-900 selection:text-white">
        {children}
      </body>
    </html>
  );
}
