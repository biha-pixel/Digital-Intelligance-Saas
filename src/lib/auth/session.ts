import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasMinRole, type Role } from "./roles";
import type { Database } from "@/types/database.types";

export const ACTIVE_ORG_COOKIE = "cxpulse_active_org_id";

export interface UserSession {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
}

export interface OrganizationContext {
  id: string;
  name: string;
  slug: string;
  plan: string;
  role: Role;
}

export interface MemberOrg {
  organizationId: string;
  name: string;
  slug: string;
  plan: string;
  role: Role;
  isOwner: boolean;
}

/**
 * Custom Authorization and Authentication Errors
 */
export class UnauthorizedError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Insufficient permissions for this resource") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Retrieves the currently authenticated user and profile from Supabase SSR.
 * Returns null if not authenticated.
 */
export async function getCurrentUser(): Promise<UserSession | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  // Fetch corresponding user profile if available
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .single();

  return {
    id: user.id,
    email: user.email ?? "",
    fullName: profile?.full_name ?? (user.user_metadata?.full_name as string) ?? null,
    avatarUrl: profile?.avatar_url ?? (user.user_metadata?.avatar_url as string) ?? null,
  };
}

/**
 * Retrieves all organizations that the current user belongs to.
 */
export async function getUserOrganizations(userId?: string): Promise<MemberOrg[]> {
  const supabase = await createClient();
  let targetUserId = userId;

  if (!targetUserId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];
    targetUserId = user.id;
  }

  const { data, error } = await supabase
    .from("organization_members")
    .select(`
      organization_id,
      role,
      organizations (
        id,
        name,
        slug,
        plan,
        owner_user_id
      )
    `)
    .eq("user_id", targetUserId);

  if (error || !data) {
    return [];
  }

  return data
    .filter((row) => row.organizations !== null)
    .map((row) => {
      const org = row.organizations as unknown as Database["public"]["Tables"]["organizations"]["Row"];
      return {
        organizationId: org.id,
        name: org.name,
        slug: org.slug,
        plan: org.plan,
        role: row.role as Role,
        isOwner: org.owner_user_id === targetUserId,
      };
    });
}

/**
 * ZERO-TRUST Multi-Tenant Active Organization Resolution:
 * 1. Reads the `cxpulse_active_org_id` cookie from request headers.
 * 2. Fetches the user's verified organization memberships directly from PostgreSQL.
 * 3. Never trusts client cookie/header unconditionally:
 *    - If the cookie matches a verified membership, return that organization context.
 *    - If the cookie is tampered with, invalid, or expired, safely fallback to the user's primary organization.
 */
export async function getCurrentOrg(): Promise<OrganizationContext | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const memberOrgs = await getUserOrganizations(user.id);
  if (memberOrgs.length === 0) {
    return null;
  }

  const cookieStore = await cookies();
  const requestedOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;

  // Zero-Trust Validation: Verify requested org is actually in the user's accessible org list
  const activeOrg = memberOrgs.find((org) => org.organizationId === requestedOrgId) || memberOrgs[0];

  return {
    id: activeOrg.organizationId,
    name: activeOrg.name,
    slug: activeOrg.slug,
    plan: activeOrg.plan,
    role: activeOrg.role,
  };
}

/**
 * Retrieves current membership role for active tenant
 */
export async function getCurrentMembership(): Promise<{ role: Role; organizationId: string } | null> {
  const currentOrg = await getCurrentOrg();
  if (!currentOrg) return null;

  return {
    role: currentOrg.role,
    organizationId: currentOrg.id,
  };
}

/**
 * Enforces that a valid user session exists. Redirects to /login if unauthenticated.
 */
export async function requireAuth(): Promise<UserSession> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

/**
 * Enforces both valid authentication and organization membership with minimum required role hierarchy.
 */
export async function requireOrgAccess(minRole: Role = "viewer"): Promise<{
  user: UserSession;
  org: OrganizationContext;
}> {
  const user = await requireAuth();
  const org = await getCurrentOrg();

  if (!org) {
    throw new ForbiddenError("No accessible organization found for user");
  }

  if (!hasMinRole(org.role, minRole)) {
    throw new ForbiddenError(`Action requires minimum role "${minRole}". Your role is "${org.role}".`);
  }

  return { user, org };
}

/**
 * Validates membership server-side and switches the active organization cookie.
 */
export async function switchActiveOrganization(targetOrgId: string): Promise<{ success: boolean; org: MemberOrg }> {
  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthorizedError("Must be logged in to switch organizations");
  }

  const userOrgs = await getUserOrganizations(user.id);
  const targetOrg = userOrgs.find((o) => o.organizationId === targetOrgId);

  if (!targetOrg) {
    throw new ForbiddenError("You do not belong to the requested organization");
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, targetOrgId, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return { success: true, org: targetOrg };
}
