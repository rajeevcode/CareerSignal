import Link from 'next/link';
import { CSLogo } from './CSLogo';

function FooterCol({ title, links }: { title: string; links: Array<{ href: string; label: string }> }) {
  return (
    <div>
      <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">{title}</div>
      <ul className="space-y-2 text-sm">
        {links.map((l) => (
          <li key={l.label}>
            <Link href={l.href} className="text-muted-foreground hover:text-foreground">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <CSLogo />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              Build your CV. Match any job. Know your interview signal.
            </p>
          </div>

          <FooterCol
            title="Product"
            links={[
              { href: '/product', label: 'Overview' },
              { href: '/cv-score', label: 'CV Score' },
              { href: '/jd-match', label: 'JD Match' },
              { href: '/jobs', label: 'Jobs' },
            ]}
          />
          <FooterCol
            title="For teams"
            links={[
              { href: '/for-recruiters', label: 'Recruiters' },
              { href: '/pricing', label: 'Pricing' },
            ]}
          />
          <FooterCol
            title="Account"
            links={[
              { href: '/login', label: 'Log in' },
              { href: '/register', label: 'Sign up' },
              { href: '/contact', label: 'Contact Us' },
            ]}
          />
          <FooterCol
            title="Legal"
            links={[
              { href: '/terms', label: 'Terms of Service' },
              { href: '/privacy', label: 'Privacy Policy' },
              { href: '/copyright', label: 'Copyright & DMCA' },
            ]}
          />
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <span>© {year} CareerSignal. All rights reserved.</span>
          <nav aria-label="Legal" className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link href="/terms" className="hover:text-foreground hover:underline">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground hover:underline">Privacy</Link>
            <Link href="/copyright" className="hover:text-foreground hover:underline">Copyright &amp; DMCA</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
