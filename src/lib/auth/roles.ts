/**
 * Role-Based Access Control (RBAC) & Permission Hierarchy for Multi-Tenant SaaS
 *
 * Hierarchy:
 * - owner (40): Full organization control, billing, ownership transfer, member management, audits.
 * - admin (30): Infrastructure management, member invitation/removal, scraping/analysis pipelines, audits.
 * - member (20): Standard user operations, trigger analyses, configure data sources, view insights.
 * - viewer (10): Read-only visibility to dashboards, sources, and customer feedback.
 */

export type Role = "owner" | "admin" | "member" | "analyst" | "viewer";

export const ROLE_WEIGHTS: Record<Role, number> = {
  owner: 40,
  admin: 30,
  member: 20,
  analyst: 20, // Synonym / specialized tier for data analysts
  viewer: 10,
};

export type Permission =
  | "org:delete"
  | "org:billing"
  | "org:update_settings"
  | "org:transfer_ownership"
  | "members:manage"
  | "members:view"
  | "sources:create"
  | "sources:edit"
  | "sources:delete"
  | "sources:view"
  | "scraping:trigger"
  | "analysis:trigger"
  | "feedback:view"
  | "feedback:export"
  | "audit_logs:view";

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: [
    "org:delete",
    "org:billing",
    "org:update_settings",
    "org:transfer_ownership",
    "members:manage",
    "members:view",
    "sources:create",
    "sources:edit",
    "sources:delete",
    "sources:view",
    "scraping:trigger",
    "analysis:trigger",
    "feedback:view",
    "feedback:export",
    "audit_logs:view",
  ],
  admin: [
    "org:update_settings",
    "members:manage",
    "members:view",
    "sources:create",
    "sources:edit",
    "sources:delete",
    "sources:view",
    "scraping:trigger",
    "analysis:trigger",
    "feedback:view",
    "feedback:export",
    "audit_logs:view",
  ],
  member: [
    "members:view",
    "sources:create",
    "sources:edit",
    "sources:view",
    "scraping:trigger",
    "analysis:trigger",
    "feedback:view",
    "feedback:export",
  ],
  analyst: [
    "members:view",
    "sources:create",
    "sources:edit",
    "sources:view",
    "scraping:trigger",
    "analysis:trigger",
    "feedback:view",
    "feedback:export",
  ],
  viewer: [
    "members:view",
    "sources:view",
    "feedback:view",
  ],
};

/**
 * Checks if the user's role is strictly identical to the target role
 */
export function hasRole(userRole: Role, targetRole: Role): boolean {
  return userRole === targetRole;
}

/**
 * Checks if the user's role meets or exceeds the required minimum role in the hierarchy
 * Example: hasMinRole('owner', 'admin') === true
 * Example: hasMinRole('viewer', 'admin') === false
 */
export function hasMinRole(userRole: Role | string | undefined | null, minRequiredRole: Role): boolean {
  if (!userRole || !isValidRole(userRole)) return false;
  const userWeight = ROLE_WEIGHTS[userRole as Role];
  const requiredWeight = ROLE_WEIGHTS[minRequiredRole];
  return userWeight >= requiredWeight;
}

/**
 * Checks if a given role is granted a specific permission
 */
export function canPerformAction(userRole: Role | string | undefined | null, permission: Permission): boolean {
  if (!userRole || !isValidRole(userRole)) return false;
  const permissions = ROLE_PERMISSIONS[userRole as Role] || [];
  return permissions.includes(permission);
}

/**
 * Type guard to ensure a string matches one of the valid RBAC roles
 */
export function isValidRole(role: string): role is Role {
  return Object.keys(ROLE_WEIGHTS).includes(role);
}

/**
 * Returns numeric weight for role comparison
 */
export function getRoleWeight(role: Role): number {
  return ROLE_WEIGHTS[role] ?? 0;
}
