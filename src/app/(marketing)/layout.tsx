import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, Shield, Activity } from "lucide-react";

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Sticky Marketing Header */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900 shadow-sm">
              <Activity className="h-5 w-5" />
            </div>
            <span>CXPulse</span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-zinc-600 dark:text-zinc-400 md:flex">
            <Link href="#features" className="transition hover:text-zinc-900 dark:hover:text-zinc-50">
              Features
            </Link>
            <Link href="#architecture" className="transition hover:text-zinc-900 dark:hover:text-zinc-50">
              Architecture
            </Link>
            <Link href="#sources" className="transition hover:text-zinc-900 dark:hover:text-zinc-50">
              Data Sources
            </Link>
            <Link href="/api/health" className="transition hover:text-zinc-900 dark:hover:text-zinc-50">
              System Status
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="sm" className="gap-1.5">
                <Sparkles className="h-4 w-4" />
                <span>Go to App</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Page Body */}
      <main className="flex-1">{children}</main>

      {/* Marketing Footer */}
      <footer className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            <div className="space-y-3 md:col-span-2">
              <div className="flex items-center gap-2 font-bold text-lg">
                <div className="flex h-7 w-7 items-center justify-center rounded bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900">
                  <Activity className="h-4 w-4" />
                </div>
                <span>CXPulse Digital Intelligence</span>
              </div>
              <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-400">
                Enterprise Customer Experience Intelligence powered by OmniRoute AI and ethical multi-channel web scraping. Multi-tenant with strict Row Level Security.
              </p>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Shield className="h-4 w-4 text-emerald-600" />
                <span>Zero client data leaks • RLS-enforced multi-tenancy</span>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Product</h4>
              <ul className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <li><Link href="#features" className="hover:underline">Continuous Discovery</Link></li>
                <li><Link href="#features" className="hover:underline">Sentiment Analysis</Link></li>
                <li><Link href="#features" className="hover:underline">Automated Alerting</Link></li>
                <li><Link href="/dashboard" className="hover:underline">Dashboard Preview</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Resources</h4>
              <ul className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <li><Link href="/api/health" className="hover:underline">API Health Endpoint</Link></li>
                <li><a href="https://github.com" target="_blank" rel="noreferrer" className="hover:underline">Documentation</a></li>
                <li><span className="text-xs text-zinc-400 dark:text-zinc-500">Phase 2: App Router Scaffolding</span></li>
              </ul>
            </div>
          </div>

          <div className="mt-8 border-t border-zinc-200 pt-6 text-center text-xs text-zinc-500 dark:border-zinc-800">
            © 2026 CXPulse SaaS. Built with Next.js App Router, Tailwind CSS, and strict TypeScript.
          </div>
        </div>
      </footer>
    </div>
  );
}
