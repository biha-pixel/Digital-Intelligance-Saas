import React from "react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-zinc-50 dark:bg-zinc-950">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <Link href="/" className="inline-flex items-center space-x-2">
          <span className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
            CX
          </span>
          <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            CXPulse
          </span>
        </Link>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Autonomous Customer Experience & Market Intelligence
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {children}
      </div>

      <div className="mt-8 text-center text-xs text-zinc-500 dark:text-zinc-500">
        &copy; 2026 CXPulse. Strict Tenant Isolation & Ethical Scraping.
      </div>
    </div>
  );
}
