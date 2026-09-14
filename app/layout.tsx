import type { Metadata } from 'next';
import { Noto_Sans_TC } from 'next/font/google';
import './globals.css';

const noto = Noto_Sans_TC({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-noto', display: 'swap' });

export const metadata: Metadata = {
  title: '小步腳印 後台',
  description: '小步腳印營運數據後台',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="zh-Hant" className={`${noto.variable} h-full antialiased`}>
      <body className="min-h-full bg-bg font-sans text-ink">{children}</body>
    </html>
  );
}
