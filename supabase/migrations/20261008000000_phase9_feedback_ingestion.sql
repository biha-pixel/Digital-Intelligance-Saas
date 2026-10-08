-- =============================================================================
-- Migration: Phase 9 - Feedback Items Schema Extensions & Ingestion Run Linkage
-- =============================================================================

-- Add external_id, author_display_name, feedback_type, raw_payload, and ingestion_run_id
ALTER TABLE public.feedback_items
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS author_display_name TEXT,
  ADD COLUMN IF NOT EXISTS feedback_type TEXT DEFAULT 'review',
  ADD COLUMN IF NOT EXISTS raw_payload JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ingestion_run_id UUID REFERENCES public.ingestion_runs(id) ON DELETE SET NULL;

-- Create index on external_id for fast lookup and revision tracking per tenant source
CREATE INDEX IF NOT EXISTS idx_feedback_items_external_id
  ON public.feedback_items(organization_id, source_id, external_id);

-- Create index on ingestion_run_id for auditability & batch query provenance
CREATE INDEX IF NOT EXISTS idx_feedback_items_ingestion_run
  ON public.feedback_items(ingestion_run_id);

-- Create index on feedback_type for filtering reviews vs complaints vs articles
CREATE INDEX IF NOT EXISTS idx_feedback_items_feedback_type
  ON public.feedback_items(organization_id, feedback_type);
