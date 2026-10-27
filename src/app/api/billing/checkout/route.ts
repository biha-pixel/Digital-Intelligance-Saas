import { NextRequest, NextResponse } from "next/server";
import { requireOrgAccess } from "@/lib/auth/session";
import { createCheckoutSession, PLAN_PRICE_IDS } from "@/lib/billing/stripe";
import type { PlanTier } from "@/types/database.types";

/**
 * POST /api/billing/checkout
 *
 * Creates a Stripe checkout session for organization subscription upgrade.
 * Requires organization owner or admin role.
 *
 * Body:
 *   - plan: "starter" | "growth" | "enterprise"
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify authentication and organization access (owner/admin only)
    const { user, org } = await requireOrgAccess("owner");

    const { plan } = await request.json() as { plan: PlanTier };

    // Validate plan
    const validPlans: PlanTier[] = ["starter", "growth", "enterprise"];
    if (!plan || !validPlans.includes(plan)) {
      return NextResponse.json(
        { error: `Invalid plan: ${plan}. Must be one of: ${validPlans.join(", ")}` },
        { status: 400 }
      );
    }

    // Free tier doesn't need checkout
    if (plan === "free") {
      return NextResponse.json(
        { error: "Free plan does not require checkout" },
        { status: 400 }
      );
    }

    const priceId = PLAN_PRICE_IDS[plan];
    if (!priceId) {
      return NextResponse.json(
        { error: `Price ID not configured for plan: ${plan}` },
        { status: 500 }
      );
    }

    // Create checkout session
    const checkoutUrl = await createCheckoutSession(
      org.id,
      priceId,
      user.email,
      org.name
    );

    return NextResponse.json({ checkoutUrl }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    // Log to stderr for debugging
    console.error(`[/api/billing/checkout] Error: ${message}`);

    if (message.includes("Authentication required") || message.includes("Insufficient permissions")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
