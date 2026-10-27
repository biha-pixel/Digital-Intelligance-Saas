import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature, handleSubscriptionCreated, handleInvoicePaymentSucceeded, handleSubscriptionUpdated, handleSubscriptionDeleted } from "@/lib/billing/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type Stripe from "stripe";

/**
 * POST /api/billing/webhook
 *
 * Stripe webhook handler for subscription and payment events.
 * Verifies webhook signature and processes events.
 *
 * Supported events:
 *   - customer.subscription.created
 *   - invoice.payment_succeeded
 *   - customer.subscription.updated
 *   - customer.subscription.deleted
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const signature = request.headers.get("stripe-signature");
    const body = await request.text();

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = verifyWebhookSignature(body, signature ?? undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`[/api/billing/webhook] Signature verification failed: ${message}`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const eventType = event.type;
    const object = event.data.object as any;

    console.log(`[/api/billing/webhook] Processing event: ${eventType}`);

    const supabase = createAdminClient();

    // Handle each event type
    switch (eventType) {
      case "customer.subscription.created": {
        const result = await handleSubscriptionCreated(object);
        console.log(
          `[/api/billing/webhook] Subscription created for org ${result.organizationId}: ${result.subscriptionId} (${result.plan})`
        );

        // Update organization plan in database
        const { error } = await supabase
          .from("organizations")
          .update({
            plan: result.plan,
          })
          .eq("id", result.organizationId);

        if (error) {
          console.error(
            `[/api/billing/webhook] Failed to update organization: ${error.message}`
          );
          return NextResponse.json(
            { error: "Failed to update organization" },
            { status: 500 }
          );
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const result = await handleInvoicePaymentSucceeded(object);
        console.log(
          `[/api/billing/webhook] Invoice payment succeeded for org ${result.organizationId}`
        );
        // Invoice payment is idempotent - can be called multiple times
        break;
      }

      case "customer.subscription.updated": {
        const result = await handleSubscriptionUpdated(object);
        console.log(
          `[/api/billing/webhook] Subscription updated for org ${result.organizationId}: ${result.plan} (${result.status})`
        );

        // Update organization plan
        const { error } = await supabase
          .from("organizations")
          .update({
            plan: result.plan,
          })
          .eq("id", result.organizationId);

        if (error) {
          console.error(
            `[/api/billing/webhook] Failed to update organization: ${error.message}`
          );
          return NextResponse.json(
            { error: "Failed to update organization" },
            { status: 500 }
          );
        }
        break;
      }

      case "customer.subscription.deleted": {
        const result = await handleSubscriptionDeleted(object);
        console.log(
          `[/api/billing/webhook] Subscription deleted for org ${result.organizationId}`
        );

        // Downgrade organization to free plan
        const { error } = await supabase
          .from("organizations")
          .update({
            plan: "free" as const,
          })
          .eq("id", result.organizationId);

        if (error) {
          console.error(
            `[/api/billing/webhook] Failed to downgrade organization: ${error.message}`
          );
          return NextResponse.json(
            { error: "Failed to downgrade organization" },
            { status: 500 }
          );
        }
        break;
      }

      default:
        console.log(`[/api/billing/webhook] Ignoring unhandled event type: ${eventType}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[/api/billing/webhook] Error: ${message}`);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
