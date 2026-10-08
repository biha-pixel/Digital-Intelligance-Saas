import {
  Building,
  Users,
  Shield,
  CreditCard,
  UserPlus,
  Mail,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentOrg } from "@/lib/auth/session";

const MOCK_MEMBERS = [
  {
    id: "mem_1",
    name: "Alex Rivera",
    email: "alex@acmecorp.com",
    role: "owner",
    joinedAt: "Jan 12, 2026",
    status: "active",
  },
  {
    id: "mem_2",
    name: "Sarah Lin",
    email: "sarah.lin@acmecorp.com",
    role: "admin",
    joinedAt: "Feb 04, 2026",
    status: "active",
  },
  {
    id: "mem_3",
    name: "David Kim",
    email: "dkim@acmecorp.com",
    role: "member",
    joinedAt: "Mar 18, 2026",
    status: "active",
  },
  {
    id: "mem_4",
    name: "Rachel Moore",
    email: "rachel@acmecorp.com",
    role: "viewer",
    joinedAt: "Apr 22, 2026",
    status: "invited",
  },
];

export default async function SettingsPage() {
  const org = await getCurrentOrg();

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Workspace & Organization Settings
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Manage your organization profile, role-based access permissions, team invites, and plan tier.
        </p>
      </div>

      {/* Organization Details Card */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-zinc-700 dark:text-zinc-300">
              {org?.name?.slice(0, 2).toUpperCase() || "CX"}
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {org?.name || "Acme Global Intelligence"}
              </h2>
              <div className="text-xs text-zinc-400 font-mono">
                Organization ID: {org?.id || "org_01j7abc"}
              </div>
            </div>
          </div>

          <span className="rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300">
            Enterprise Plan
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Organization Display Name
            </label>
            <input
              type="text"
              defaultValue={org?.name || "Acme Global Intelligence"}
              className="mt-1.5 h-9 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 text-xs outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Organization Slug / Subdomain
            </label>
            <input
              type="text"
              defaultValue={org?.slug || "acme-global"}
              className="mt-1.5 h-9 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 text-xs outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 font-mono"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button size="sm" className="text-xs bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900">
            Save Organization Details
          </Button>
        </div>
      </div>

      {/* Team Members Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              Team Members & Role-Based Access (RBAC)
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Strict multi-tenant security enforces resource isolation per membership role.
            </p>
          </div>

          <Button size="sm" className="gap-1.5 text-xs bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900">
            <UserPlus className="h-3.5 w-3.5" />
            <span>Invite Colleague</span>
          </Button>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50 font-medium text-zinc-500 dark:text-zinc-400">
              <tr>
                <th className="p-4">Member Name & Email</th>
                <th className="p-4">Role</th>
                <th className="p-4">Membership Status</th>
                <th className="p-4">Joined Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {MOCK_MEMBERS.map((member) => (
                <tr key={member.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="p-4">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {member.name}
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      {member.email}
                    </div>
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        member.role === "owner"
                          ? "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                          : member.role === "admin"
                          ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                          : member.role === "member"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}
                    >
                      {member.role}
                    </span>
                  </td>
                  <td className="p-4">
                    {member.status === "active" ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="h-3 w-3" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                        <Mail className="h-3 w-3" />
                        Invite Pending
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-zinc-500 dark:text-zinc-400">{member.joinedAt}</td>
                  <td className="p-4 text-right">
                    <Button variant="ghost" size="sm" className="text-xs">
                      Edit Role
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
