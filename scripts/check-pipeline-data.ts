/**
 * Debug Script: Check Pipeline Data in Database
 *
 * This script verifies what data was actually saved by the pipeline run.
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), ".env.local") });

import { createAdminClient } from "@/lib/supabase/admin";

async function checkPipelineData() {
  const supabase = createAdminClient();

  console.log("\n=== Checking Pipeline Data ===\n");

  // Get all organizations
  const { data: orgs, error: orgsErr } = await supabase
    .from("organizations")
    .select("id, name, slug");

  if (orgsErr) {
    console.error("Error fetching organizations:", orgsErr);
    return;
  }

  console.log("📋 Organizations:", orgs);

  if (!orgs || orgs.length === 0) {
    console.log("❌ No organizations found!");
    return;
  }

  const orgId = orgs[0].id;
  console.log(`\n🔍 Checking data for org: ${orgs[0].name} (${orgId})\n`);

  // Check company profiles
  const { data: profiles, error: profilesErr } = await supabase
    .from("company_profiles")
    .select("*")
    .eq("organization_id", orgId);

  console.log(`📝 Company Profiles: ${profiles?.length || 0}`);
  if (profiles && profiles.length > 0) {
    console.log("   -", profiles[0].company_name || profiles[0].display_name);
  }

  // Check source discoveries
  const { data: discoveries, error: discovErr } = await supabase
    .from("source_discoveries")
    .select("id, discovered_url, source_type, status, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(10);

  console.log(`\n🔎 Source Discoveries: ${discoveries?.length || 0}`);
  if (discoveries && discoveries.length > 0) {
    discoveries.forEach((d, i) => {
      console.log(`   ${i + 1}. ${d.source_type} - ${d.status} - ${d.discovered_url.substring(0, 60)}`);
    });
  }

  // Check sources registry
  const { data: sources, error: sourcesErr } = await supabase
    .from("sources")
    .select("id, url, source_type, display_name, verification_status, is_active")
    .eq("organization_id", orgId);

  console.log(`\n📡 Sources Registry: ${sources?.length || 0}`);
  if (sources && sources.length > 0) {
    sources.forEach((s, i) => {
      console.log(`   ${i + 1}. ${s.source_type} - ${s.verification_status} - ${s.display_name || s.url.substring(0, 50)}`);
    });
  }

  // Check ingestion runs
  const { data: runs, error: runsErr } = await supabase
    .from("ingestion_runs")
    .select("*")
    .eq("organization_id", orgId)
    .order("started_at", { ascending: false })
    .limit(5);

  console.log(`\n🔄 Ingestion Runs: ${runs?.length || 0}`);
  if (runs && runs.length > 0) {
    runs.forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.status} - Items: ${r.items_new || 0} new, ${r.items_duplicate || 0} duplicates`);
      console.log(`       Started: ${r.started_at}, Completed: ${r.completed_at || "N/A"}`);
    });
  }

  // Check feedback items
  const { data: feedback, error: feedbackErr } = await supabase
    .from("feedback_items")
    .select("id, source_type, content_text, sentiment_label, rating, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(10);

  console.log(`\n💬 Feedback Items: ${feedback?.length || 0}`);
  if (feedback && feedback.length > 0) {
    feedback.forEach((f, i) => {
      const preview = f.content_text?.substring(0, 80) || "N/A";
      console.log(`   ${i + 1}. ${f.source_type} - ${f.sentiment_label || "unanalyzed"} - Rating: ${f.rating || "N/A"}`);
      console.log(`       "${preview}..."`);
    });
  }

  // Check feedback analyses
  const { data: analyses, error: analysesErr } = await supabase
    .from("feedback_analyses")
    .select("id, feedback_item_id, extracted_topics, churn_risk_score, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(10);

  console.log(`\n🤖 Feedback Analyses (AI): ${analyses?.length || 0}`);
  if (analyses && analyses.length > 0) {
    analyses.forEach((a, i) => {
      console.log(`   ${i + 1}. Topics: ${(a.extracted_topics as string[] || []).join(", ") || "none"}`);
      console.log(`       Churn Risk: ${a.churn_risk_score || 0}`);
    });
  }

  console.log("\n=== Summary ===");
  console.log(`✅ Discoveries: ${discoveries?.length || 0}`);
  console.log(`✅ Registered Sources: ${sources?.length || 0}`);
  console.log(`✅ Ingestion Runs: ${runs?.length || 0}`);
  console.log(`✅ Feedback Items: ${feedback?.length || 0}`);
  console.log(`✅ AI Analyses: ${analyses?.length || 0}`);
  console.log("");
}

checkPipelineData().catch(console.error);
