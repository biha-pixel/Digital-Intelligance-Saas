"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Compass,
  FileText,
  Home,
  MessageSquare,
  Settings,
  Sparkles,
  Bell,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Overview", href: "/dashboard", icon: Home },
  { name: "Data Sources", href: "/dashboard/sources", icon: Database },
  { name: "Monitoring Targets", href: "/dashboard/monitoring", icon: Compass },
  { name: "Feedback Stream", href: "/dashboard/feedback", icon: MessageSquare },
  { name: "AI Insights Engine", href: "/dashboard/insights", icon: Sparkles },
  { name: "Alert Rules", href: "/dashboard/alerts", icon: Bell },
  { name: "Executive Reports", href: "/dashboard/reports", icon: FileText },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-1 p-3 text-sm font-medium">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
              isActive
                ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{item.name}</span>
          </Link>
        )
      })}

      <div className="pt-4 mt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-1">
        <Link
          href="/onboarding"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
            pathname === "/onboarding"
              ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
          )}
        >
          <Building2 className="h-4 w-4" />
          <span>Company Setup</span>
        </Link>
        <Link
          href="/dashboard/settings"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
            pathname?.startsWith("/dashboard/settings")
              ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
          )}
        >
          <Settings className="h-4 w-4" />
          <span>Workspace Settings</span>
        </Link>
      </div>
    </nav>
  );
}
