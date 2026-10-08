"use client";

import * as React from "react";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface InfoTooltipProps {
  content: string;
  className?: string;
}

export function InfoTooltip({ content, className }: InfoTooltipProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className={cn("relative inline-flex items-center", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors focus:outline-none"
        aria-label="Field information"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
      {isOpen && (
        <div className="absolute left-full top-1/2 ml-2 -translate-y-1/2 z-50 w-64 rounded-md border border-zinc-200 bg-zinc-900 p-2 text-xs text-zinc-50 shadow-lg dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">
          <p className="leading-relaxed">{content}</p>
        </div>
      )}
    </div>
  );
}
