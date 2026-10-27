"use server";

import { createClient } from "@/lib/supabase/server";
import { requireOrgAccess } from "@/lib/auth/session";

export interface MonitoringTarget {
  id: string;
  organization_id: string;
  source_id: string;
  status: "active" | "paused" | "failing" | "disabled";
  polling_interval_seconds: number;
  next_check_at: string;
  last_checked_at: string | null;
  last_content_hash: string | null;
  consecutive_failures: number;
  created_at: string;
  updated_at: string;
  // Joined from sources table
  sources?: {
    id: string;
    display_name: string;
    url: string;
    source_type: string;
  };
}

export interface MonitoringStats {
  activeCount: number;
  pausedCount: number;
  totalCount: number;
  avgSuccessRate: number;
  totalRuns24h: number;
  failedRuns24h: number;
}

/**
 * Fetch all monitoring targets for the current organization
 */
export async function getMonitoringTargets(): Promise<{
  success: boolean;
  data?: MonitoringTarget[];
  error?: string;
}> {
  try {
    const { org } = await requireOrgAccess("viewer");
    const supabase = await createClient();

    // First get monitoring targets
    const { data: targets, error: targetsError } = await supabase
      .from("monitoring_targets")
      .select("*")
      .eq("organization_id", org.id)
      .order("created_at", { ascending: false });

    if (targetsError) {
      console.error("Error fetching monitoring targets:", targetsError);
      return { success: false, error: targetsError.message };
    }

    if (!targets || targets.length === 0) {
      return { success: true, data: [] };
    }

    // Get associated sources
    const sourceIds = targets.map((t) => t.source_id);
    const { data: sources, error: sourcesError } = await supabase
      .from("sources")
      .select("id, display_name, url, source_type")
      .in("id", sourceIds);

    if (sourcesError) {
      console.error("Error fetching sources:", sourcesError);
      return { success: false, error: sourcesError.message };
    }

    // Combine data
    const sourcesMap = new Map(sources?.map((s) => [s.id, s]) || []);
    const enrichedTargets: MonitoringTarget[] = targets.map((t) => ({
      ...t,
      sources: sourcesMap.get(t.source_id),
    }));

    return { success: true, data: enrichedTargets };
  } catch (err: any) {
    console.error("Unexpected error in getMonitoringTargets:", err);
    return { success: false, error: err.message || "Unknown error" };
  }
}

/**
 * Get monitoring statistics for dashboard
 */
export async function getMonitoringStats(): Promise<{
  success: boolean;
  data?: MonitoringStats;
  error?: string;
}> {
  try {
    const { org } = await requireOrgAccess("viewer");
    const supabase = await createClient();

    // Get target counts by status
    const { data: targets, error: targetsError } = await supabase
      .from("monitoring_targets")
      .select("status, consecutive_failures")
      .eq("organization_id", org.id);

    if (targetsError) {
      return { success: false, error: targetsError.message };
    }

    const activeCount = targets?.filter((t) => t.status === "active").length || 0;
    const pausedCount = targets?.filter((t) => t.status === "paused").length || 0;
    const totalCount = targets?.length || 0;

    // Calculate average success rate (based on consecutive failures)
    const totalFailures = targets?.reduce((sum, t) => sum + t.consecutive_failures, 0) || 0;
    const avgSuccessRate = totalCount > 0
      ? Math.max(0, 100 - (totalFailures / totalCount) * 5) // Rough estimate
      : 100;

    // Get ingestion runs from last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: runs, error: runsError } = await supabase
      .from("ingestion_runs")
      .select("status")
      .eq("organization_id", org.id)
      .gte("created_at", twentyFourHoursAgo);

    if (runsError) {
      console.error("Error fetching ingestion runs:", runsError);
      // Continue with partial data
    }

    const totalRuns24h = runs?.length || 0;
    const failedRuns24h = runs?.filter((r) => r.status === "failed").length || 0;

    return {
      success: true,
      data: {
        activeCount,
        pausedCount,
        totalCount,
        avgSuccessRate: Math.round(avgSuccessRate * 10) / 10,
        totalRuns24h,
        failedRuns24h,
      },
    };
  } catch (err: any) {
    console.error("Unexpected error in getMonitoringStats:", err);
    return { success: false, error: err.message || "Unknown error" };
  }
}

/**
 * Update monitoring target status (pause/resume)
 */
export async function updateMonitoringTargetStatus(
  targetId: string,
  status: "active" | "paused"
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { org } = await requireOrgAccess("analyst");
    const supabase = await createClient();

    // Calculate next check time if resuming
    const updates: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === "active") {
      // Reset consecutive failures when resuming
      updates.consecutive_failures = 0;
      updates.next_check_at = new Date().toISOString(); // Check immediately
    }

    const { error } = await supabase
      .from("monitoring_targets")
      .update(updates)
      .eq("id", targetId)
      .eq("organization_id", org.id); // Ensure RLS compliance

    if (error) {
      console.error("Error updating monitoring target:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Unexpected error in updateMonitoringTargetStatus:", err);
    return { success: false, error: err.message || "Unknown error" };
  }
}

/**
 * Create monitoring target for a source
 */
export async function createMonitoringTarget(
  sourceId: string,
  pollingIntervalSeconds: number = 86400 // Default: 24 hours
): Promise<{
  success: boolean;
  data?: MonitoringTarget;
  error?: string;
}> {
  try {
    const { org } = await requireOrgAccess("analyst");
    const supabase = await createClient();

    // Check if monitoring target already exists for this source
    const { data: existing } = await supabase
      .from("monitoring_targets")
      .select("id")
      .eq("source_id", sourceId)
      .eq("organization_id", org.id)
      .single();

    if (existing) {
      return {
        success: false,
        error: "Monitoring target already exists for this source",
      };
    }

    const { data, error } = await supabase
      .from("monitoring_targets")
      .insert({
        organization_id: org.id,
        source_id: sourceId,
        polling_interval_seconds: pollingIntervalSeconds,
        status: "active",
        next_check_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating monitoring target:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as MonitoringTarget };
  } catch (err: any) {
    console.error("Unexpected error in createMonitoringTarget:", err);
    return { success: false, error: err.message || "Unknown error" };
  }
}

/**
 * Delete monitoring target
 */
export async function deleteMonitoringTarget(targetId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { org } = await requireOrgAccess("admin");
    const supabase = await createClient();

    const { error } = await supabase
      .from("monitoring_targets")
      .delete()
      .eq("id", targetId)
      .eq("organization_id", org.id);

    if (error) {
      console.error("Error deleting monitoring target:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Unexpected error in deleteMonitoringTarget:", err);
    return { success: false, error: err.message || "Unknown error" };
  }
}
