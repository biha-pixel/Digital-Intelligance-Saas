import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Bell,
  Building2,
  ChevronDown,
  Compass,
  FileText,
  Home,
  MessageSquare,
  Search,
  Settings,
  Sparkles,
  User,
} from "lucide-react";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 md:flex">
        {/* Sidebar Header / Org Switcher */}
        <div className="flex h-16 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900">
              <Activity className="h-4 w-4" />
            </div>
            <span>CXPulse</span>
          </Link>
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            v0.1
          </span>
        </div>

        {/* Tenant Selector Placeholder */}
        <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
          <button className="flex w-full items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-left text-xs hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:bg-zinc-800">
            <div className="flex items-center gap-2 truncate">
              <Building2 className="h-4 w-4 text-zinc-500" />
              <div className="truncate">
                <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">Acme Global Inc.</p>
                <p className="text-[10px] text-zinc-500">Enterprise Tenant</p>
              </div>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 p-3 text-sm font-medium">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-lg bg-zinc-900 px-3 py-2 text-white dark:bg-zinc-50 dark:text-zinc-900"
          >
            <Home className="h-4 w-4" />
            <span>Overview</span>
          </Link>

          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
          >
            <Compass className="h-4 w-4" />
            <span>Discovery & Targets</span>
          </Link>

          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Feedback Stream</span>
          </Link>

          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
          >
            <Sparkles className="h-4 w-4" />
            <span>AI Insights Engine</span>
          </Link>

          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
          >
            <Bell className="h-4 w-4" />
            <span>Alert Rules</span>
          </Link>

          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
          >
            <FileText className="h-4 w-4" />
            <span>Executive Reports</span>
          </Link>

          <div className="pt-4 mt-4 border-t border-zinc-200 dark:border-zinc-800">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
            >
              <Settings className="h-4 w-4" />
              <span>Workspace Settings</span>
            </Link>
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
          <div className="flex items-center gap-3 rounded-lg p-2 text-xs">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
              <User className="h-4 w-4" />
            </div>
            <div className="flex-1 truncate">
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">Senior Lead Engineer</p>
              <p className="text-[10px] text-zinc-500">engineer@acme.com</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col">
        {/* Top App Header */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-zinc-200 bg-white/80 px-4 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="relative w-64 md:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                type="search"
                placeholder="Search feedback, sources, or insights..."
                className="h-9 w-full rounded-md border border-zinc-200 bg-zinc-50 pl-8 pr-3 text-xs text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-xs">
                Back to Marketing
              </Button>
            </Link>
            <Button variant="outline" size="sm" className="gap-1 text-xs">
              <Bell className="h-3.5 w-3.5" />
              <span>3 Alerts</span>
            </Button>
            <div className="h-7 w-7 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center text-xs font-semibold">
              AC
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
