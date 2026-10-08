import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser, getUserOrganizations, getCurrentOrg, ACTIVE_ORG_COOKIE } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

/**
 * GET /api/organizations
 * Returns the list of organizations the authenticated user belongs to,
 * along with the currently active organization.
 */
export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized: User not authenticated" },
      { status: 401 }
    );
  }

  const [organizations, currentOrg] = await Promise.all([
    getUserOrganizations(user.id),
    getCurrentOrg(),
  ]);

  return NextResponse.json({
    organizations,
    activeOrgId: currentOrg?.id || null,
  });
}

/**
 * POST /api/organizations
 * Creates a new organization, automatically adds the current user as Owner,
 * creates an initial audit log, and sets the active organization cookie.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized: User not authenticated" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Organization name must be at least 2 characters long" },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    const slugBase = trimmedName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    const slug = `${slugBase || "org"}-${Math.random().toString(36).substring(2, 8)}`;

    const supabase = await createClient();

    // 1. Insert new organization
    const { data: newOrg, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name: trimmedName,
        slug,
        plan: "free",
        status: "active",
        owner_user_id: user.id,
      })
      .select()
      .single();

    if (orgError || !newOrg) {
      return NextResponse.json(
        { error: `Failed to create organization: ${orgError?.message || "Database error"}` },
        { status: 500 }
      );
    }

    // 2. Add creator as Owner in organization_members
    const { error: memberError } = await supabase
      .from("organization_members")
      .insert({
        organization_id: newOrg.id,
        user_id: user.id,
        role: "owner",
      });

    if (memberError) {
      return NextResponse.json(
        { error: `Failed to assign ownership: ${memberError.message}` },
        { status: 500 }
      );
    }

    // 3. Record Audit Log
    await supabase.from("audit_logs").insert({
      organization_id: newOrg.id,
      actor_user_id: user.id,
      action: "organization.created",
      entity_type: "organization",
      entity_id: newOrg.id,
      changes: { name: trimmedName, slug, plan: "free" },
    });

    // 4. Update the active organization cookie
    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_ORG_COOKIE, newOrg.id, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return NextResponse.json(
      {
        success: true,
        organization: {
          organizationId: newOrg.id,
          name: newOrg.name,
          slug: newOrg.slug,
          plan: newOrg.plan,
          role: "owner",
          isOwner: true,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
