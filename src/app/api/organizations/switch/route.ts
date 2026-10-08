import { NextResponse, type NextRequest } from "next/server";
import { switchActiveOrganization } from "@/lib/auth/session";

/**
 * POST /api/organizations/switch
 * Body: { organizationId: string }
 *
 * Verifies that the authenticated user belongs to the target organization,
 * then safely updates the `cxpulse_active_org_id` cookie.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId } = body;

    if (!organizationId || typeof organizationId !== "string") {
      return NextResponse.json(
        { error: "Valid organizationId is required" },
        { status: 400 }
      );
    }

    const result = await switchActiveOrganization(organizationId);

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to switch organization";
    const status = message.includes("Must be logged in") ? 401 : 403;
    return NextResponse.json({ error: message }, { status });
  }
}
