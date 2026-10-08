"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Building2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type MemberOrg } from "@/lib/auth/session";

export function OrgSwitcher() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<MemberOrg[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrgs() {
      try {
        const res = await fetch("/api/organizations");
        const data = await res.json();
        setOrganizations(data.organizations);
        setActiveOrgId(data.activeOrgId);
      } catch (e) {
        console.error("Failed to fetch organizations", e);
      } finally {
        setLoading(false);
      }
    }
    fetchOrgs();
  }, []);

  const switchOrg = async (orgId: string) => {
    try {
      await fetch("/api/organizations/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId }),
      });
      router.refresh();
      window.location.reload(); // Force reload to ensure session/cookies are re-read
    } catch (e) {
      console.error("Failed to switch org", e);
    }
  };

  const activeOrg = organizations.find((o) => o.organizationId === activeOrgId);

  if (loading) {
    return <div className="p-4 text-sm text-zinc-500">Loading...</div>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-left text-xs hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:bg-zinc-800">
          <div className="flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4 text-zinc-500" />
            <div className="truncate">
              <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                {activeOrg?.name || "Select Organization"}
              </p>
              <p className="text-[10px] text-zinc-500">
                {activeOrg ? `${activeOrg.role.charAt(0).toUpperCase() + activeOrg.role.slice(1)} Tenant` : "No Active Org"}
              </p>
            </div>
          </div>
          <ChevronsUpDown className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        <DropdownMenuLabel>Organizations</DropdownMenuLabel>
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.organizationId}
            onClick={() => switchOrg(org.organizationId)}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-zinc-500" />
              <span>{org.name}</span>
            </div>
            {org.organizationId === activeOrgId && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Plus className="h-4 w-4 mr-2" />
          Create New Organization
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
