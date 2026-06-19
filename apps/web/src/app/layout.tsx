import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { SiteHeader } from '@/components/cs/SiteHeader';
import { SiteFooter } from '@/components/cs/SiteFooter';
import { PostHogProvider } from '@/components/PostHogProvider';
import { ToastProvider } from '@/components/ToastProvider';
import { AuthGateProvider } from '@/components/auth/AuthGate';
import { ThemeProvider, THEME_NO_FLASH_SCRIPT } from '@/components/theme/ThemeProvider';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'CareerSignal — Build your CV. Match any job. Know your interview signal.',
    template: '%s | CareerSignal',
  },
  description: 'Your AI career intelligence platform — from CV score to interview signal. Build ATS-ready CVs, match against any job description, and apply where you have the strongest signal.',
  openGraph: {
    title: 'CareerSignal',
    description: 'From CV score to interview signal.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Set the theme class before paint to avoid a light→dark flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_NO_FLASH_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider>
          <PostHogProvider>
            <ToastProvider>
              <AuthGateProvider>
                <SiteHeader />
                <main>{children}</main>
                <SiteFooter />
              </AuthGateProvider>
            </ToastProvider>
          </PostHogProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
