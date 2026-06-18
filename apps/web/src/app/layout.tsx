import type { Metadata } from 'next';
import { Header } from '@/components/Header';
import { PostHogProvider } from '@/components/PostHogProvider';
import { ToastProvider } from '@/components/ToastProvider';
import './globals.css';

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
    <html lang="en">
      <body className="min-h-screen bg-slate-50 antialiased">
        <PostHogProvider>
          <ToastProvider>
            <Header />
            <main>{children}</main>
            <footer className="mt-16 border-t border-slate-200 bg-white py-8">
              <div className="mx-auto max-w-7xl px-4 text-center text-sm text-slate-500">
                © {new Date().getFullYear()} CareerSignal — Build your CV. Match any job. Know your interview signal.
              </div>
            </footer>
          </ToastProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
