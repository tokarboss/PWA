import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AutoService SaaS Platform',
  description: 'White-Label PWA platform for auto services',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="bg-zinc-950 text-zinc-100 antialiased min-h-screen selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}