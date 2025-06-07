import type { Metadata } from 'next';
import { PT_Sans } from 'next/font/google'; // Correctly import PT Sans
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AppProvider } from '@/providers/app-provider';
import { cn } from '@/lib/utils';

const ptSans = PT_Sans({ // Initialize PT Sans
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-pt-sans', // Optional: if you want to use it as a CSS variable
});

export const metadata: Metadata = {
  title: 'NebulaChat',
  description: 'Experience seamless communication with NebulaChat.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Removed direct Google Fonts links, using next/font instead */}
      </head>
      <body className={cn('font-body antialiased', ptSans.className)}>
        <AppProvider>
          {children}
          <Toaster />
        </AppProvider>
      </body>
    </html>
  );
}
