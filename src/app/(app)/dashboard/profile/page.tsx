import {
  User,
  Mail,
  Shield,
  Key,
  Smartphone,
  History,
  LogOut,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          User Account & Security Profile
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Manage your personal credentials, authentication factors, and active sessions.
        </p>
      </div>

      {/* Profile Overview Card */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 space-y-6">
        <div className="flex items-center gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-5">
          <div className="h-14 w-14 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center text-lg font-bold">
            {user?.email?.slice(0, 2).toUpperCase() || "US"}
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {user?.fullName || user?.email?.split("@")[0] || "Authorized Operator"}
            </h2>
            <div className="text-xs text-zinc-400 mt-0.5">{user?.email}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Full Name
            </label>
            <input
              type="text"
              defaultValue={user?.fullName || "Operator"}
              className="mt-1.5 h-9 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 text-xs outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Email Address
            </label>
            <input
              type="email"
              disabled
              defaultValue={user?.email || "user@example.com"}
              className="mt-1.5 h-9 w-full rounded-md border border-zinc-200 bg-zinc-100 px-3 text-xs text-zinc-500 outline-none cursor-not-allowed dark:border-zinc-800 dark:bg-zinc-900"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button size="sm" className="text-xs bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900">
            Save Profile
          </Button>
        </div>
      </div>

      {/* Security & Authentication */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 space-y-5">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Shield className="h-4 w-4 text-emerald-600" />
          <span>Security & Two-Factor Authentication</span>
        </h3>

        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          <div className="flex items-center justify-between py-3.5">
            <div>
              <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Password
              </div>
              <div className="text-[11px] text-zinc-500">
                Last changed 30 days ago
              </div>
            </div>
            <Button variant="outline" size="sm" className="text-xs">
              Change Password
            </Button>
          </div>

          <div className="flex items-center justify-between py-3.5">
            <div>
              <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Two-Factor Authentication (2FA / TOTP)
              </div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                Enabled via Authenticator App
              </div>
            </div>
            <Button variant="outline" size="sm" className="text-xs">
              Configure 2FA
            </Button>
          </div>

          <div className="flex items-center justify-between py-3.5">
            <div>
              <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Active Browser Sessions
              </div>
              <div className="text-[11px] text-zinc-500">
                Current device: Windows 11 · Chrome 132
              </div>
            </div>
            <Button variant="outline" size="sm" className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700">
              Revoke Other Sessions
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
