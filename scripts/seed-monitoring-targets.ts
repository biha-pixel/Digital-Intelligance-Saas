/**
 * Seed Script: Create monitoring targets for 10+ review sites
 *
 * This script sets up automated monitoring for major review platforms
 * to ensure continuous feedback collection from diverse sources.
 *
 * Run with: npx tsx scripts/seed-monitoring-targets.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

// Load environment variables from .env.local
config({ path: resolve(__dirname, "../.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Missing Supabase credentials in environment variables");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Review sites to monitor (these would be actual discovered sources in production)
const REVIEW_SITES = [
  {
    displayName: "Trustpilot Main Profile",
    url: "https://www.trustpilot.com/review/example.com",
    sourceType: "trustpilot",
    pollingInterval: 21600, // 6 hours
  },
  {
    displayName: "Google Maps Headquarters",
    url: "https://www.google.com/maps/place/Example+Company",
    sourceType: "google_maps",
    pollingInterval: 86400, // 24 hours
  },
  {
    displayName: "Reddit Brand Mentions (r/technology)",
    url: "https://www.reddit.com/r/technology/search?q=example+company",
    sourceType: "reddit",
    pollingInterval: 3600, // 1 hour
  },
  {
    displayName: "Reddit Product Discussion (r/products)",
    url: "https://www.reddit.com/r/products/search?q=example",
    sourceType: "reddit",
    pollingInterval: 7200, // 2 hours
  },
  {
    displayName: "G2 Reviews - Main Product",
    url: "https://www.g2.com/products/example/reviews",
    sourceType: "g2",
    pollingInterval: 86400, // 24 hours
  },
  {
    displayName: "Capterra Reviews",
    url: "https://www.capterra.com/p/example/reviews/",
    sourceType: "capterra",
    pollingInterval: 86400, // 24 hours
  },
  {
    displayName: "Yelp Business Page",
    url: "https://www.yelp.com/biz/example-company",
    sourceType: "yelp",
    pollingInterval: 43200, // 12 hours
  },
  {
    displayName: "App Store iOS Reviews",
    url: "https://apps.apple.com/us/app/example/id123456789",
    sourceType: "app_store",
    pollingInterval: 21600, // 6 hours
  },
  {
    displayName: "Google Play Store Reviews",
    url: "https://play.google.com/store/apps/details?id=com.example.app",
    sourceType: "play_store",
    pollingInterval: 21600, // 6 hours
  },
  {
    displayName: "ProductHunt Reviews",
    url: "https://www.producthunt.com/products/example",
    sourceType: "generic_web",
    pollingInterval: 86400, // 24 hours
  },
  {
    displayName: "Reddit Customer Support (r/exampleapp)",
    url: "https://www.reddit.com/r/exampleapp/",
    sourceType: "reddit",
    pollingInterval: 3600, // 1 hour
  },
  {
    displayName: "Twitter/X Brand Mentions",
    url: "https://twitter.com/search?q=example%20company",
    sourceType: "generic_web",
    pollingInterval: 7200, // 2 hours
  },
];

async function seedMonitoringTargets() {
  console.log("🌱 Starting monitoring targets seed...\n");

  // Get the first organization (you can modify this to target a specific org)
  const { data: orgs, error: orgsError } = await supabase
    .from("organizations")
    .select("id, name")
    .limit(1);

  if (orgsError || !orgs || orgs.length === 0) {
    console.error("❌ No organization found. Please create an organization first.");
    console.error(orgsError);
    process.exit(1);
  }

  const org = orgs[0];
  console.log(`📊 Using organization: ${org.name} (${org.id})\n`);

  // Get or create company profile
  let companyProfile;
  const { data: existingProfiles } = await supabase
    .from("company_profiles")
    .select("id")
    .eq("organization_id", org.id)
    .limit(1);

  if (existingProfiles && existingProfiles.length > 0) {
    companyProfile = existingProfiles[0];
  } else {
    const { data: newProfile, error: profileError } = await supabase
      .from("company_profiles")
      .insert({
        organization_id: org.id,
        company_name: "Example Company",
        display_name: "Example Company",
        primary_domain: "example.com",
      })
      .select()
      .single();

    if (profileError) {
      console.error("❌ Failed to create company profile:", profileError);
      process.exit(1);
    }
    companyProfile = newProfile;
  }

  console.log(`🏢 Using company profile: ${companyProfile.id}\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const site of REVIEW_SITES) {
    try {
      // Create source
      const { data: source, error: sourceError } = await supabase
        .from("sources")
        .insert({
          organization_id: org.id,
          company_profile_id: companyProfile.id,
          url: site.url,
          source_type: site.sourceType,
          ownership: "owned",
          verification_status: "verified_auto",
          is_active: true,
          display_name: site.displayName,
          confidence_score: 0.95,
          metadata: {},
        })
        .select()
        .single();

      if (sourceError) {
        console.error(`❌ Failed to create source for ${site.displayName}:`, sourceError.message);
        errorCount++;
        continue;
      }

      // Create monitoring target
      const { error: targetError } = await supabase
        .from("monitoring_targets")
        .insert({
          organization_id: org.id,
          source_id: source.id,
          status: "active",
          polling_interval_seconds: site.pollingInterval,
          next_check_at: new Date().toISOString(),
          consecutive_failures: 0,
        });

      if (targetError) {
        console.error(`❌ Failed to create monitoring target for ${site.displayName}:`, targetError.message);
        errorCount++;
        continue;
      }

      console.log(`✅ Created monitoring target: ${site.displayName}`);
      console.log(`   Polling every: ${site.pollingInterval / 3600} hours`);
      console.log(`   Source Type: ${site.sourceType}\n`);
      successCount++;
    } catch (err: any) {
      console.error(`❌ Unexpected error for ${site.displayName}:`, err.message);
      errorCount++;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(`✨ Seeding complete!`);
  console.log(`   ✅ Successfully created: ${successCount} monitoring targets`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log("=".repeat(60));
}

seedMonitoringTargets().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
