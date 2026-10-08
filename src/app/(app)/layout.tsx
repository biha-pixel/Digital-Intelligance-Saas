import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { OrgSwitcher } from "@/components/dashboard/org-switcher";
import { UserNav } from "@/components/dashboard/user-nav";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { getCurrentUser, getCurrentOrg } from "@/lib/auth/session";
import {
  Activity,
  Bell,
  Search,
} from "lucide-react";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  // Enforce zero-trust auth guard on app layout
  if (!user) {
    redirect("/login");
  }

  const currentOrg = await getCurrentOrg();

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 md:flex">
        {/* Sidebar Header / Brand */}
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

        {/* Tenant / Organization Switcher */}
        <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
          <OrgSwitcher />
        </div>

        {/* Navigation Items */}
        <SidebarNav />

        {/* Sidebar Footer with User Session Info */}
        <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
          <UserNav user={user} />
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
              {currentOrg?.name?.slice(0, 2).toUpperCase() || "CX"}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
