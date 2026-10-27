import Stripe from "stripe";
import type { PlanTier } from "@/types/database.types";

// Initialize Stripe only if the secret key is configured
// This allows the app to build without Stripe configured
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";

export const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2026-09-30.endive",
    })
  : null;

function requireStripe(): Stripe {
  if (!stripe) {
    throw new Error("STRIPE_SECRET_KEY is not configured. Please set it in your .env.local file.");
  }
  return stripe;
}

/**
 * Pricing plans mapping: plan name to Stripe price ID
 */
export const PLAN_PRICE_IDS: Record<PlanTier, string> = {
  free: "", // Free tier has no price ID
  starter: process.env.STRIPE_PRICE_ID_STARTER || "",
  growth: process.env.STRIPE_PRICE_ID_GROWTH || "",
  enterprise: process.env.STRIPE_PRICE_ID_ENTERPRISE || "",
};

/**
 * Creates a checkout session for subscription upgrade
 */
export async function createCheckoutSession(
  organizationId: string,
  priceId: string,
  organizationEmail: string,
  organizationName: string
): Promise<string> {
  const stripeClient = requireStripe();
  const session = await stripeClient.checkout.sessions.create({
    mode: "subscription",
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
    customer_email: organizationEmail,
    metadata: {
      organizationId,
      organizationName,
    },
    billing_address_collection: "auto",
  });

  if (!session.url) {
    throw new Error("Failed to create checkout session: no URL returned");
  }

  return session.url;
}

/**
 * Validates webhook signature from Stripe
 */
export function verifyWebhookSignature(
  body: string,
  signature: string | undefined
): Stripe.Event {
  if (!signature) {
    throw new Error("Missing webhook signature");
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  }

  const stripeClient = requireStripe();
  try {
    return stripeClient.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    ) as Stripe.Event;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Webhook signature verification failed: ${message}`);
  }
}

/**
 * Extract plan tier from Stripe price ID
 */
function getPlanFromPriceId(priceId: string | null | undefined): PlanTier {
  if (!priceId) return "free";

  for (const [plan, id] of Object.entries(PLAN_PRICE_IDS)) {
    if (id === priceId) {
      return plan as PlanTier;
    }
  }

  return "free";
}

/**
 * Handles subscription.created webhook event
 */
export async function handleSubscriptionCreated(
  subscription: Stripe.Subscription
): Promise<{ organizationId: string; subscriptionId: string; plan: PlanTier }> {
  const organizationId = subscription.metadata?.organizationId;
  if (!organizationId) {
    throw new Error("Missing organizationId in subscription metadata");
  }

  // Map Stripe price to plan name
  const priceId =
    subscription.items.data.length > 0
      ? (subscription.items.data[0].price?.id as string | undefined)
      : undefined;

  const plan = getPlanFromPriceId(priceId);

  return {
    organizationId,
    subscriptionId: subscription.id,
    plan,
  };
}

/**
 * Handles invoice.payment_succeeded webhook event
 */
export async function handleInvoicePaymentSucceeded(
  invoice: any
): Promise<{ organizationId: string; subscriptionId: string }> {
  const subscriptionId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : (invoice.subscription as any)?.id;

  if (!subscriptionId) {
    throw new Error("No subscription found in invoice");
  }

  const stripeClient = requireStripe();
  const subscription = await stripeClient.subscriptions.retrieve(subscriptionId as string);
  const organizationId = subscription.metadata?.organizationId;

  if (!organizationId) {
    throw new Error("Missing organizationId in subscription metadata");
  }

  return {
    organizationId,
    subscriptionId,
  };
}

/**
 * Handles customer.subscription.updated webhook event
 */
export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<{ organizationId: string; subscriptionId: string; plan: PlanTier; status: string }> {
  const organizationId = subscription.metadata?.organizationId;
  if (!organizationId) {
    throw new Error("Missing organizationId in subscription metadata");
  }

  // Map Stripe price to plan name
  const priceId =
    subscription.items.data.length > 0
      ? (subscription.items.data[0].price?.id as string | undefined)
      : undefined;

  const plan = getPlanFromPriceId(priceId);

  return {
    organizationId,
    subscriptionId: subscription.id,
    plan,
    status: subscription.status,
  };
}

/**
 * Handles customer.subscription.deleted webhook event
 */
export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<{ organizationId: string; subscriptionId: string }> {
  const organizationId = subscription.metadata?.organizationId;
  if (!organizationId) {
    throw new Error("Missing organizationId in subscription metadata");
  }

  return {
    organizationId,
    subscriptionId: subscription.id,
  };
}
