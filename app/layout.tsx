import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '小步腳印 後台',
  description: '小步腳印營運數據後台',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="zh-Hant" className="h-full antialiased">
      <body className="min-h-full bg-bg text-ink">{children}</body>
    </html>
  );
}
