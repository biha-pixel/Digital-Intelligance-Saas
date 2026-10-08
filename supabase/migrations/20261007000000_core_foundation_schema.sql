-- ==============================================================================
-- CXPulse SaaS Core Foundation Schema & Multi-Tenant Row Level Security (RLS)
-- Migration: 20261007000000_core_foundation_schema.sql
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. ENUMS
-- ==============================================================================

CREATE TYPE user_role AS ENUM (
  'owner',
  'admin',
  'analyst',
  'viewer'
);

CREATE TYPE plan_tier AS ENUM (
  'free',
  'starter',
  'growth',
  'enterprise'
);

CREATE TYPE source_type AS ENUM (
  'google_maps',
  'trustpilot',
  'yelp',
  'g2',
  'capterra',
  'app_store',
  'play_store',
  'reddit',
  'generic_web'
);

CREATE TYPE source_status AS ENUM (
  'discovered',
  'pending_verification',
  'active',
  'failed',
  'paused',
  'archived'
);

CREATE TYPE source_ownership AS ENUM (
  'owned',
  'competitor',
  'unclaimed'
);

CREATE TYPE verification_status AS ENUM (
  'unverified',
  'verified_auto',
  'verified_manual',
  'rejected'
);

CREATE TYPE monitoring_status AS ENUM (
  'active',
  'paused',
  'failing',
  'disabled'
);

CREATE TYPE ingestion_status AS ENUM (
  'queued',
  'fetching',
  'extracting',
  'completed',
  'failed',
  'unchanged'
);

CREATE TYPE job_status AS ENUM (
  'QUEUED',
  'IN_PROGRESS',
  'COMPLETED',
  'FAILED',
  'DEAD_LETTER'
);

CREATE TYPE sentiment_enum AS ENUM (
  'very_positive',
  'positive',
  'neutral',
  'negative',
  'very_negative'
);

CREATE TYPE intent_enum AS ENUM (
  'complaint',
  'praise',
  'feature_request',
  'bug_report',
  'question',
  'general_feedback'
);

CREATE TYPE language_quality_enum AS ENUM (
  'high',
  'medium',
  'low',
  'machine_translated'
);

-- ==============================================================================
-- 2. TABLES
-- ==============================================================================

-- 2.1 Organizations (Tenant Root)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan plan_tier NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  owner_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.2 Organization Members (Tenant Membership & Role Mapping)
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role user_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- 2.3 Company Profiles (Identity Seed for Continuous Discovery)
CREATE TABLE company_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  primary_domain TEXT NOT NULL,
  country TEXT,
  locations JSONB NOT NULL DEFAULT '[]'::jsonb,
  industry TEXT,
  aliases TEXT[] NOT NULL DEFAULT '{}',
  social_handles JSONB NOT NULL DEFAULT '{}'::jsonb,
  completeness_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.4 Sources (Discovered & Connected Review/Feedback Channels)
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  company_profile_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  source_type source_type NOT NULL,
  ownership source_ownership NOT NULL DEFAULT 'owned',
  verification_status verification_status NOT NULL DEFAULT 'unverified',
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_name TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence_score NUMERIC(5, 2) NOT NULL DEFAULT 1.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.5 Monitoring Targets (Polling Schedule & Health Status)
CREATE TABLE monitoring_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  status monitoring_status NOT NULL DEFAULT 'active',
  polling_interval_seconds INTEGER NOT NULL DEFAULT 86400, -- Default 24 hours
  next_check_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_checked_at TIMESTAMPTZ,
  last_content_hash TEXT,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.6 Ingestion Runs (Scrape Logs & Metrics)
CREATE TABLE ingestion_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  monitoring_target_id UUID REFERENCES monitoring_targets(id) ON DELETE SET NULL,
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  status ingestion_status NOT NULL DEFAULT 'queued',
  fetch_url TEXT NOT NULL,
  http_status INTEGER,
  content_hash TEXT,
  items_extracted INTEGER NOT NULL DEFAULT 0,
  items_new INTEGER NOT NULL DEFAULT 0,
  items_duplicate INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  execution_duration_ms INTEGER,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 2.7 Raw Scrapes (Raw HTML & Text Payload Storage)
CREATE TABLE raw_scrapes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  http_status INTEGER NOT NULL,
  content_hash TEXT NOT NULL,
  raw_html TEXT,
  raw_text TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.8 Feedback Items (Normalized Zero-PII Reviews & Mentions)
CREATE TABLE feedback_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  raw_scrape_id UUID REFERENCES raw_scrapes(id) ON DELETE SET NULL,
  author_identifier TEXT NOT NULL, -- Deterministic SHA-256 pseudonymized hash (zero-PII)
  posted_at TIMESTAMPTZ,
  content_text TEXT NOT NULL,
  rating NUMERIC(3, 2), -- e.g. 1.0 to 5.0
  language_code VARCHAR(10) DEFAULT 'en',
  source_type source_type NOT NULL,
  word_count INTEGER NOT NULL DEFAULT 0,
  content_hash TEXT NOT NULL, -- SHA-256 for deduplication
  sentiment_label sentiment_enum,
  sentiment_score NUMERIC(5, 4), -- Range: -1.0000 to +1.0000
  topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  intent intent_enum,
  key_entities JSONB NOT NULL DEFAULT '[]'::jsonb,
  language_quality language_quality_enum DEFAULT 'high',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.9 Job Queue (Concurrency-Safe Background Worker Queue)
CREATE TABLE job_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL, -- e.g. 'SCRAPE_TARGET', 'NORMALIZE_FEEDBACK', 'OMNIROUTE_SYNTHESIS'
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status job_status NOT NULL DEFAULT 'QUEUED',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  next_run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 3. INDEXES FOR PERFORMANCE & DEDUPLICATION
-- ==============================================================================

CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_org_members_org ON organization_members(organization_id);

CREATE INDEX idx_company_profiles_org ON company_profiles(organization_id);
CREATE INDEX idx_sources_org ON sources(organization_id);
CREATE INDEX idx_sources_company ON sources(company_profile_id);

CREATE INDEX idx_monitoring_targets_org ON monitoring_targets(organization_id);
CREATE INDEX idx_monitoring_targets_next_check ON monitoring_targets(status, next_check_at);

CREATE INDEX idx_ingestion_runs_org ON ingestion_runs(organization_id);
CREATE INDEX idx_ingestion_runs_source ON ingestion_runs(source_id);

CREATE INDEX idx_raw_scrapes_org ON raw_scrapes(organization_id);
CREATE INDEX idx_raw_scrapes_hash ON raw_scrapes(source_id, content_hash);

CREATE INDEX idx_feedback_items_org ON feedback_items(organization_id);
CREATE INDEX idx_feedback_items_source ON feedback_items(source_id);
CREATE INDEX idx_feedback_items_posted_at ON feedback_items(organization_id, posted_at DESC);
CREATE INDEX idx_feedback_items_sentiment ON feedback_items(organization_id, sentiment_label);
CREATE UNIQUE INDEX idx_feedback_items_dedup ON feedback_items(organization_id, source_id, content_hash);

CREATE INDEX idx_job_queue_fetch ON job_queue(status, next_run_at) WHERE status = 'QUEUED';
CREATE INDEX idx_job_queue_org ON job_queue(organization_id);

-- ==============================================================================
-- 4. SECURITY DEFINER HELPER (RLS Tenant Membership Without Infinite Loops)
-- ==============================================================================

CREATE OR REPLACE FUNCTION get_user_org_ids(lookup_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT organization_id
  FROM organization_members
  WHERE user_id = lookup_user_id;
$$;

-- Helper to check if current authenticated user has an administrative role in a specific org
CREATE OR REPLACE FUNCTION is_org_admin(org_id UUID, lookup_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization_members
    WHERE organization_id = org_id
      AND user_id = lookup_user_id
      AND role IN ('owner', 'admin')
  );
$$;

-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on every table
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_scrapes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_queue ENABLE ROW LEVEL SECURITY;

-- 5.1 Organizations Policies
CREATE POLICY "Users can view organizations they belong to"
  ON organizations FOR SELECT
  USING (id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Owners and admins can update their organization"
  ON organizations FOR UPDATE
  USING (is_org_admin(id, auth.uid()));

-- 5.2 Organization Members Policies
CREATE POLICY "Users can view members of their organizations"
  ON organization_members FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Admins can manage members of their organizations"
  ON organization_members FOR ALL
  USING (is_org_admin(organization_id, auth.uid()));

-- 5.3 Company Profiles Policies
CREATE POLICY "Users can view company profiles in their org"
  ON company_profiles FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Users can insert company profiles in their org"
  ON company_profiles FOR INSERT
  WITH CHECK (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Users can update company profiles in their org"
  ON company_profiles FOR UPDATE
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Admins can delete company profiles in their org"
  ON company_profiles FOR DELETE
  USING (is_org_admin(organization_id, auth.uid()));

-- 5.4 Sources Policies
CREATE POLICY "Users can view sources in their org"
  ON sources FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Users can manage sources in their org"
  ON sources FOR ALL
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

-- 5.5 Monitoring Targets Policies
CREATE POLICY "Users can view monitoring targets in their org"
  ON monitoring_targets FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Users can manage monitoring targets in their org"
  ON monitoring_targets FOR ALL
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

-- 5.6 Ingestion Runs Policies
CREATE POLICY "Users can view ingestion runs in their org"
  ON ingestion_runs FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Users can manage ingestion runs in their org"
  ON ingestion_runs FOR ALL
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

-- 5.7 Raw Scrapes Policies
CREATE POLICY "Users can view raw scrapes in their org"
  ON raw_scrapes FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Users can manage raw scrapes in their org"
  ON raw_scrapes FOR ALL
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

-- 5.8 Feedback Items Policies
CREATE POLICY "Users can view feedback items in their org"
  ON feedback_items FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Users can manage feedback items in their org"
  ON feedback_items FOR ALL
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

-- 5.9 Job Queue Policies
CREATE POLICY "Users can view jobs in their org"
  ON job_queue FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Users can manage jobs in their org"
  ON job_queue FOR ALL
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

-- ==============================================================================
-- 6. CONCURRENT JOB QUEUE RPC FUNCTION (SKIP LOCKED)
-- ==============================================================================

CREATE OR REPLACE FUNCTION claim_next_job(
  p_worker_id TEXT,
  p_lock_duration_seconds INTEGER DEFAULT 300
)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  job_type TEXT,
  payload JSONB,
  attempts INTEGER,
  max_attempts INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_id UUID;
BEGIN
  -- Atomic select and lock using FOR UPDATE SKIP LOCKED
  SELECT jq.id INTO v_job_id
  FROM job_queue jq
  WHERE (jq.status = 'QUEUED' AND jq.next_run_at <= NOW())
     OR (jq.status = 'IN_PROGRESS' AND jq.locked_at <= NOW() - (p_lock_duration_seconds || ' seconds')::INTERVAL)
  ORDER BY jq.next_run_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF v_job_id IS NOT NULL THEN
    UPDATE job_queue jq
    SET status = 'IN_PROGRESS',
        locked_at = NOW(),
        locked_by = p_worker_id,
        attempts = jq.attempts + 1,
        updated_at = NOW()
    WHERE jq.id = v_job_id;

    RETURN QUERY
    SELECT jq.id, jq.organization_id, jq.job_type, jq.payload, jq.attempts, jq.max_attempts
    FROM job_queue jq
    WHERE jq.id = v_job_id;
  END IF;
END;
$$;

-- ==============================================================================
-- 7. AUTOMATIC SIGNUP PROVISIONING TRIGGER
-- ==============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
  user_email TEXT;
  org_slug TEXT;
BEGIN
  user_email := COALESCE(NEW.email, 'user');
  org_slug := LOWER(REGEXP_REPLACE(SPLIT_PART(user_email, '@', 1), '[^a-zA-Z0-9]', '', 'g')) || '-' || SUBSTRING(NEW.id::text, 1, 8);

  -- 1. Create a default organization for the new user
  INSERT INTO organizations (name, slug, plan, status, owner_user_id)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'company_name', SPLIT_PART(user_email, '@', 1) || ' Workspace'),
    org_slug,
    'free',
    'active',
    NEW.id
  )
  RETURNING id INTO new_org_id;

  -- 2. Add the user as Owner of the organization
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;

-- Trigger hook on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
