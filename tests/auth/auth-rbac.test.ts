import { expect, test, describe, beforeEach } from "vitest";
import {
  hasMinRole,
  canPerformAction,
  isValidRole,
  ROLE_WEIGHTS,
  type Role,
} from "../../src/lib/auth/roles";

/**
 * Phase 4: Authentication, Authorization & Multi-Tenant Session Management Test Suite
 *
 * Covers:
 * 1. Role-Based Access Control (RBAC) hierarchy and permissions
 * 2. Zero-Trust Session & Active Organization Resolution logic
 * 3. Prevention of Cookie/Tenant Spoofing attacks
 * 4. Multi-Tenant vs Single-Tenant (NutriScan) authorization semantics
 */

interface MockUser {
  id: string;
  email: string;
  fullName: string | null;
}

interface MockOrgMembership {
  organizationId: string;
  userId: string;
  role: Role;
  orgName: string;
  ownerId: string;
}

// Server-side Zero-Trust Tenant Resolution Simulator
class MockAuthSessionManager {
  private users: MockUser[] = [];
  private memberships: MockOrgMembership[] = [];
  private cookies: Map<string, string> = new Map();

  addUser(user: MockUser) {
    this.users.push(user);
  }

  addMembership(m: MockOrgMembership) {
    this.memberships.push(m);
  }

  setCookie(key: string, value: string) {
    this.cookies.set(key, value);
  }

  getCookie(key: string): string | undefined {
    return this.cookies.get(key);
  }

  clearCookie(key: string) {
    this.cookies.delete(key);
  }

  getUserOrganizations(userId: string) {
    return this.memberships
      .filter((m) => m.userId === userId)
      .map((m) => ({
        organizationId: m.organizationId,
        name: m.orgName,
        role: m.role,
        isOwner: m.ownerId === userId,
      }));
  }

  /**
   * ZERO-TRUST getCurrentOrg() algorithm:
   * 1. Reads client cookie
   * 2. Checks database memberships for the authenticated user
   * 3. Rejects cookie if user is not a member of the requested org (fallback to primary)
   */
  resolveActiveOrg(userId: string) {
    const userOrgs = this.getUserOrganizations(userId);
    if (userOrgs.length === 0) return null;

    const requestedOrgId = this.getCookie("cxpulse_active_org_id");
    const verifiedOrg = userOrgs.find((o) => o.organizationId === requestedOrgId);

    // If cookie is valid and belongs to user, use it. Otherwise fallback to first org.
    return verifiedOrg || userOrgs[0];
  }

  switchOrganization(userId: string, targetOrgId: string) {
    const userOrgs = this.getUserOrganizations(userId);
    const target = userOrgs.find((o) => o.organizationId === targetOrgId);

    if (!target) {
      throw new Error("Forbidden: You do not belong to the requested organization");
    }

    this.setCookie("cxpulse_active_org_id", targetOrgId);
    return { success: true, activeOrg: target };
  }
}

describe("Phase 4: RBAC & Role Hierarchy Tests", () => {
  test("1. Hierarchy ordering: owner > admin > member / analyst > viewer", () => {
    expect(ROLE_WEIGHTS.owner).toBeGreaterThan(ROLE_WEIGHTS.admin);
    expect(ROLE_WEIGHTS.admin).toBeGreaterThan(ROLE_WEIGHTS.member);
    expect(ROLE_WEIGHTS.member).toBe(ROLE_WEIGHTS.analyst);
    expect(ROLE_WEIGHTS.member).toBeGreaterThan(ROLE_WEIGHTS.viewer);
  });

  test("2. hasMinRole properly enforces role thresholds", () => {
    // Owner passes all thresholds
    expect(hasMinRole("owner", "owner")).toBe(true);
    expect(hasMinRole("owner", "admin")).toBe(true);
    expect(hasMinRole("owner", "member")).toBe(true);
    expect(hasMinRole("owner", "viewer")).toBe(true);

    // Admin passes admin, member, viewer; fails owner
    expect(hasMinRole("admin", "owner")).toBe(false);
    expect(hasMinRole("admin", "admin")).toBe(true);
    expect(hasMinRole("admin", "member")).toBe(true);
    expect(hasMinRole("admin", "viewer")).toBe(true);

    // Member passes member, viewer; fails admin, owner
    expect(hasMinRole("member", "admin")).toBe(false);
    expect(hasMinRole("member", "member")).toBe(true);
    expect(hasMinRole("member", "viewer")).toBe(true);

    // Viewer only passes viewer
    expect(hasMinRole("viewer", "member")).toBe(false);
    expect(hasMinRole("viewer", "viewer")).toBe(true);

    // Invalid roles or null fail safely
    expect(hasMinRole(null, "viewer")).toBe(false);
    expect(hasMinRole("invalid_role", "viewer")).toBe(false);
  });

  test("3. canPerformAction enforces strict granular capabilities", () => {
    // Owner can delete org and transfer ownership
    expect(canPerformAction("owner", "org:delete")).toBe(true);
    expect(canPerformAction("owner", "org:transfer_ownership")).toBe(true);
    expect(canPerformAction("owner", "scraping:trigger")).toBe(true);

    // Admin cannot delete org or transfer ownership, but can manage members and trigger scraping
    expect(canPerformAction("admin", "org:delete")).toBe(false);
    expect(canPerformAction("admin", "org:transfer_ownership")).toBe(false);
    expect(canPerformAction("admin", "members:manage")).toBe(true);
    expect(canPerformAction("admin", "scraping:trigger")).toBe(true);

    // Member can trigger analysis and view feedback, but cannot manage members or update settings
    expect(canPerformAction("member", "members:manage")).toBe(false);
    expect(canPerformAction("member", "org:update_settings")).toBe(false);
    expect(canPerformAction("member", "analysis:trigger")).toBe(true);
    expect(canPerformAction("member", "feedback:view")).toBe(true);

    // Viewer is strictly read-only
    expect(canPerformAction("viewer", "feedback:view")).toBe(true);
    expect(canPerformAction("viewer", "sources:view")).toBe(true);
    expect(canPerformAction("viewer", "sources:create")).toBe(false);
    expect(canPerformAction("viewer", "scraping:trigger")).toBe(false);
  });

  test("4. isValidRole type-guard correctly validates strings", () => {
    expect(isValidRole("owner")).toBe(true);
    expect(isValidRole("admin")).toBe(true);
    expect(isValidRole("member")).toBe(true);
    expect(isValidRole("analyst")).toBe(true);
    expect(isValidRole("viewer")).toBe(true);
    expect(isValidRole("superadmin")).toBe(false);
    expect(isValidRole("")).toBe(false);
  });
});

describe("Phase 4: Zero-Trust Multi-Tenant Session & Isolation Tests", () => {
  let sessionManager: MockAuthSessionManager;

  const userAlice: MockUser = { id: "u-alice", email: "alice@acme.com", fullName: "Alice Smith" };
  const userBob: MockUser = { id: "u-bob", email: "bob@beta.com", fullName: "Bob Jones" };

  const orgAcme = "org-acme-111";
  const orgStark = "org-stark-222";
  const orgBeta = "org-beta-333";

  beforeEach(() => {
    sessionManager = new MockAuthSessionManager();

    sessionManager.addUser(userAlice);
    sessionManager.addUser(userBob);

    // Alice belongs to Acme (Owner) and Stark Industries (Member)
    sessionManager.addMembership({
      organizationId: orgAcme,
      userId: userAlice.id,
      role: "owner",
      orgName: "Acme Corp",
      ownerId: userAlice.id,
    });
    sessionManager.addMembership({
      organizationId: orgStark,
      userId: userAlice.id,
      role: "member",
      orgName: "Stark Industries",
      ownerId: "u-tony",
    });

    // Bob belongs only to Beta Logistics
    sessionManager.addMembership({
      organizationId: orgBeta,
      userId: userBob.id,
      role: "owner",
      orgName: "Beta Logistics",
      ownerId: userBob.id,
    });
  });

  test("1. Initial login defaults to user's first available organization if no cookie exists", () => {
    const activeOrg = sessionManager.resolveActiveOrg(userAlice.id);
    expect(activeOrg).not.toBeNull();
    expect(activeOrg?.organizationId).toBe(orgAcme);
    expect(activeOrg?.role).toBe("owner");
    expect(activeOrg?.isOwner).toBe(true);
  });

  test("2. Zero-Trust Defense: Tampered / Spoofed cookie is rejected and safely fallback to valid org", () => {
    // Malicious attacker or client sets cookie to Org Beta (which Alice does NOT belong to)
    sessionManager.setCookie("cxpulse_active_org_id", orgBeta);

    // Zero-Trust verification: server queries DB memberships for Alice and refuses to grant Beta context
    const activeOrg = sessionManager.resolveActiveOrg(userAlice.id);
    expect(activeOrg?.organizationId).toBe(orgAcme); // Fallback to Alice's valid org!
    expect(activeOrg?.organizationId).not.toBe(orgBeta);
  });

  test("3. Legitimate organization switching updates active tenant context", () => {
    // Alice switches to Stark Industries (which she has verified membership in)
    const switchResult = sessionManager.switchOrganization(userAlice.id, orgStark);
    expect(switchResult.success).toBe(true);
    expect(switchResult.activeOrg.organizationId).toBe(orgStark);

    // Subsequent resolution returns Stark Industries
    const activeOrg = sessionManager.resolveActiveOrg(userAlice.id);
    expect(activeOrg?.organizationId).toBe(orgStark);
    expect(activeOrg?.role).toBe("member");
    expect(activeOrg?.isOwner).toBe(false);
  });

  test("4. Unauthorized switch attempt is rejected with an error", () => {
    // Alice attempts to switch directly to Bob's Beta Logistics
    expect(() => {
      sessionManager.switchOrganization(userAlice.id, orgBeta);
    }).toThrow(/Forbidden/);
  });

  test("5. Logout clears active tenant cookie and session", () => {
    sessionManager.setCookie("cxpulse_active_org_id", orgStark);
    expect(sessionManager.getCookie("cxpulse_active_org_id")).toBe(orgStark);

    // Clear on signout
    sessionManager.clearCookie("cxpulse_active_org_id");
    expect(sessionManager.getCookie("cxpulse_active_org_id")).toBeUndefined();
  });
});
