-- ==============================================================================
-- CXPulse / Digital Intelligence SaaS - Unified Production Schema & RLS Policies
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. ENUMS
-- ==============================================================================

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('owner', 'admin', 'analyst', 'viewer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE plan_tier AS ENUM ('free', 'starter', 'growth', 'enterprise');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
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
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE source_status AS ENUM (
    'discovered',
    'pending_verification',
    'active',
    'failed',
    'paused',
    'archived'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE source_ownership AS ENUM (
    'owned',
    'official',
    'third_party',
    'uncertain',
    'irrelevant'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE verification_status AS ENUM (
    'unverified',
    'verified_auto',
    'verified_manual',
    'rejected'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE monitoring_status AS ENUM (
    'active',
    'paused',
    'failing',
    'disabled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE ingestion_status AS ENUM (
    'queued',
    'fetching',
    'extracting',
    'completed',
    'failed',
    'unchanged'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE job_status AS ENUM (
    'QUEUED',
    'IN_PROGRESS',
    'COMPLETED',
    'FAILED',
    'DEAD_LETTER'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE sentiment_enum AS ENUM (
    'very_positive',
    'positive',
    'neutral',
    'negative',
    'very_negative'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE intent_enum AS ENUM (
    'complaint',
    'praise',
    'feature_request',
    'bug_report',
    'question',
    'general_feedback'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE language_quality_enum AS ENUM (
    'high',
    'medium',
    'low',
    'machine_translated'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 2. TABLES
-- ==============================================================================

-- 2.1 Profiles (Synced with auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.2 Organizations (Tenant Root)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan plan_tier NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  owner_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.3 Organization Members (Tenant Membership & Role Mapping)
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role user_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- 2.4 Company Profiles (Identity Seed for Continuous Discovery)
CREATE TABLE IF NOT EXISTS company_profiles (
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

-- 2.5 Company Aliases
CREATE TABLE IF NOT EXISTS company_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  company_profile_id UUID NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
  alias_name TEXT NOT NULL,
  is_primary_brand BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.6 Company Domains
CREATE TABLE IF NOT EXISTS company_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  company_profile_id UUID NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.7 Company Locations
CREATE TABLE IF NOT EXISTS company_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  company_profile_id UUID NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
  location_name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state_region TEXT,
  country VARCHAR(2),
  postal_code VARCHAR(20),
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.8 Company Social Accounts
CREATE TABLE IF NOT EXISTS company_social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  company_profile_id UUID NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  handle TEXT NOT NULL,
  profile_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.9 Sources (Discovered & Connected Review/Feedback Channels)
CREATE TABLE IF NOT EXISTS sources (
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

-- 2.10 Source Discoveries (Candidate review sources found by crawler/discovery engine)
CREATE TABLE IF NOT EXISTS source_discoveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  company_profile_id UUID NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
  discovered_url TEXT NOT NULL,
  source_type source_type NOT NULL,
  confidence_score NUMERIC(5, 2) NOT NULL DEFAULT 0.50,
  discovery_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.11 Source Verifications (Audit log for source ownership/authenticity)
CREATE TABLE IF NOT EXISTS source_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  status verification_status NOT NULL,
  verification_method TEXT NOT NULL,
  verified_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.12 Monitoring Targets (Polling Schedule & Health Status)
CREATE TABLE IF NOT EXISTS monitoring_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  status monitoring_status NOT NULL DEFAULT 'active',
  polling_interval_seconds INTEGER NOT NULL DEFAULT 86400,
  next_check_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_checked_at TIMESTAMPTZ,
  last_content_hash TEXT,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.13 Ingestion Runs (Scrape Logs & Metrics)
CREATE TABLE IF NOT EXISTS ingestion_runs (
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

-- 2.14 Raw Scrapes (Raw HTML & Text Payload Storage)
CREATE TABLE IF NOT EXISTS raw_scrapes (
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

-- 2.15 Feedback Items (Normalized Reviews & Mentions)
CREATE TABLE IF NOT EXISTS feedback_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  raw_scrape_id UUID REFERENCES raw_scrapes(id) ON DELETE SET NULL,
  ingestion_run_id UUID REFERENCES ingestion_runs(id) ON DELETE SET NULL,
  external_id TEXT,
  author_display_name TEXT,
  author_identifier TEXT NOT NULL,
  posted_at TIMESTAMPTZ,
  content_text TEXT NOT NULL,
  rating NUMERIC(3, 2),
  language_code VARCHAR(10) DEFAULT 'en',
  source_type source_type NOT NULL,
  feedback_type TEXT DEFAULT 'review',
  word_count INTEGER NOT NULL DEFAULT 0,
  content_hash TEXT NOT NULL,
  sentiment_label sentiment_enum,
  sentiment_score NUMERIC(5, 4),
  topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  intent intent_enum,
  key_entities JSONB NOT NULL DEFAULT '[]'::jsonb,
  language_quality language_quality_enum DEFAULT 'high',
  raw_payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.16 Feedback Analyses (AI-Synthesized Insights per Feedback Item)
CREATE TABLE IF NOT EXISTS feedback_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  feedback_item_id UUID NOT NULL REFERENCES feedback_items(id) ON DELETE CASCADE,
  model_name TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0.000000,
  sentiment_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  extracted_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  customer_pain_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  churn_risk_score NUMERIC(3, 2),
  suggested_action TEXT,
  raw_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.17 Job Queue (Background Processing)
CREATE TABLE IF NOT EXISTS job_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
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

-- 2.18 Audit Logs (Compliance & Security Audit Trail)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  changes JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 3. INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);

CREATE INDEX IF NOT EXISTS idx_company_profiles_org ON company_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_company_aliases_org ON company_aliases(organization_id);
CREATE INDEX IF NOT EXISTS idx_company_domains_org ON company_domains(organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_domains_unique ON company_domains(organization_id, domain);
CREATE INDEX IF NOT EXISTS idx_company_locations_org ON company_locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_company_social_org ON company_social_accounts(organization_id);

CREATE INDEX IF NOT EXISTS idx_sources_org ON sources(organization_id);
CREATE INDEX IF NOT EXISTS idx_sources_company ON sources(company_profile_id);

CREATE INDEX IF NOT EXISTS idx_source_discoveries_org ON source_discoveries(organization_id);
CREATE INDEX IF NOT EXISTS idx_source_discoveries_status ON source_discoveries(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_source_verifications_org ON source_verifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_source_verifications_source ON source_verifications(source_id);

CREATE INDEX IF NOT EXISTS idx_monitoring_targets_org ON monitoring_targets(organization_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_targets_next_check ON monitoring_targets(status, next_check_at);

CREATE INDEX IF NOT EXISTS idx_ingestion_runs_org ON ingestion_runs(organization_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_runs_source ON ingestion_runs(source_id);

CREATE INDEX IF NOT EXISTS idx_raw_scrapes_org ON raw_scrapes(organization_id);
CREATE INDEX IF NOT EXISTS idx_raw_scrapes_hash ON raw_scrapes(source_id, content_hash);

CREATE INDEX IF NOT EXISTS idx_feedback_items_org ON feedback_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_feedback_items_source ON feedback_items(source_id);
CREATE INDEX IF NOT EXISTS idx_feedback_items_posted_at ON feedback_items(organization_id, posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_items_sentiment ON feedback_items(organization_id, sentiment_label);
CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_items_dedup ON feedback_items(organization_id, source_id, content_hash);
CREATE INDEX IF NOT EXISTS idx_feedback_items_external_id ON feedback_items(organization_id, source_id, external_id);
CREATE INDEX IF NOT EXISTS idx_feedback_items_ingestion_run ON feedback_items(ingestion_run_id);

CREATE INDEX IF NOT EXISTS idx_feedback_analyses_org ON feedback_analyses(organization_id);
CREATE INDEX IF NOT EXISTS idx_feedback_analyses_feedback ON feedback_analyses(feedback_item_id);

CREATE INDEX IF NOT EXISTS idx_job_queue_fetch ON job_queue(status, next_run_at) WHERE status = 'QUEUED';
CREATE INDEX IF NOT EXISTS idx_job_queue_org ON job_queue(organization_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(organization_id, created_at DESC);

-- ==============================================================================
-- 4. SECURITY DEFINER HELPER FUNCTIONS
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

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_discoveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_scrapes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 5.1 Profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (id = auth.uid());

-- 5.2 Organizations
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON organizations;
CREATE POLICY "Users can view organizations they belong to" ON organizations FOR SELECT USING (id IN (SELECT get_user_org_ids(auth.uid())));

DROP POLICY IF EXISTS "Owners and admins can update their organization" ON organizations;
CREATE POLICY "Owners and admins can update their organization" ON organizations FOR UPDATE USING (is_org_admin(id, auth.uid()));

-- 5.3 Organization Members
DROP POLICY IF EXISTS "Users can view members of their organizations" ON organization_members;
CREATE POLICY "Users can view members of their organizations" ON organization_members FOR SELECT USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

DROP POLICY IF EXISTS "Admins can manage members of their organizations" ON organization_members;
CREATE POLICY "Admins can manage members of their organizations" ON organization_members FOR ALL USING (is_org_admin(organization_id, auth.uid()));

-- 5.4 Company Profiles
DROP POLICY IF EXISTS "Users can view company profiles in their org" ON company_profiles;
CREATE POLICY "Users can view company profiles in their org" ON company_profiles FOR SELECT USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

DROP POLICY IF EXISTS "Users can insert company profiles in their org" ON company_profiles;
CREATE POLICY "Users can insert company profiles in their org" ON company_profiles FOR INSERT WITH CHECK (organization_id IN (SELECT get_user_org_ids(auth.uid())));

DROP POLICY IF EXISTS "Users can update company profiles in their org" ON company_profiles;
CREATE POLICY "Users can update company profiles in their org" ON company_profiles FOR UPDATE USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

DROP POLICY IF EXISTS "Admins can delete company profiles in their org" ON company_profiles;
CREATE POLICY "Admins can delete company profiles in their org" ON company_profiles FOR DELETE USING (is_org_admin(organization_id, auth.uid()));

-- 5.5 Company Sub-entities
DROP POLICY IF EXISTS "Users can view company aliases in their org" ON company_aliases;
CREATE POLICY "Users can view company aliases in their org" ON company_aliases FOR SELECT USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
DROP POLICY IF EXISTS "Users can manage company aliases in their org" ON company_aliases;
CREATE POLICY "Users can manage company aliases in their org" ON company_aliases FOR ALL USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

DROP POLICY IF EXISTS "Users can view company domains in their org" ON company_domains;
CREATE POLICY "Users can view company domains in their org" ON company_domains FOR SELECT USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
DROP POLICY IF EXISTS "Users can manage company domains in their org" ON company_domains;
CREATE POLICY "Users can manage company domains in their org" ON company_domains FOR ALL USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

DROP POLICY IF EXISTS "Users can view company locations in their org" ON company_locations;
CREATE POLICY "Users can view company locations in their org" ON company_locations FOR SELECT USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
DROP POLICY IF EXISTS "Users can manage company locations in their org" ON company_locations;
CREATE POLICY "Users can manage company locations in their org" ON company_locations FOR ALL USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

DROP POLICY IF EXISTS "Users can view company social accounts in their org" ON company_social_accounts;
CREATE POLICY "Users can view company social accounts in their org" ON company_social_accounts FOR SELECT USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
DROP POLICY IF EXISTS "Users can manage company social accounts in their org" ON company_social_accounts;
CREATE POLICY "Users can manage company social accounts in their org" ON company_social_accounts FOR ALL USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

-- 5.6 Sources & Discoveries
DROP POLICY IF EXISTS "Users can view sources in their org" ON sources;
CREATE POLICY "Users can view sources in their org" ON sources FOR SELECT USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
DROP POLICY IF EXISTS "Users can manage sources in their org" ON sources;
CREATE POLICY "Users can manage sources in their org" ON sources FOR ALL USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

DROP POLICY IF EXISTS "Users can view source discoveries in their org" ON source_discoveries;
CREATE POLICY "Users can view source discoveries in their org" ON source_discoveries FOR SELECT USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
DROP POLICY IF EXISTS "Users can manage source discoveries in their org" ON source_discoveries;
CREATE POLICY "Users can manage source discoveries in their org" ON source_discoveries FOR ALL USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

DROP POLICY IF EXISTS "Users can view source verifications in their org" ON source_verifications;
CREATE POLICY "Users can view source verifications in their org" ON source_verifications FOR SELECT USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
DROP POLICY IF EXISTS "Users can manage source verifications in their org" ON source_verifications;
CREATE POLICY "Users can manage source verifications in their org" ON source_verifications FOR ALL USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

-- 5.7 Monitoring & Ingestion
DROP POLICY IF EXISTS "Users can view monitoring targets in their org" ON monitoring_targets;
CREATE POLICY "Users can view monitoring targets in their org" ON monitoring_targets FOR SELECT USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
DROP POLICY IF EXISTS "Users can manage monitoring targets in their org" ON monitoring_targets;
CREATE POLICY "Users can manage monitoring targets in their org" ON monitoring_targets FOR ALL USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

DROP POLICY IF EXISTS "Users can view ingestion runs in their org" ON ingestion_runs;
CREATE POLICY "Users can view ingestion runs in their org" ON ingestion_runs FOR SELECT USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
DROP POLICY IF EXISTS "Users can manage ingestion runs in their org" ON ingestion_runs;
CREATE POLICY "Users can manage ingestion runs in their org" ON ingestion_runs FOR ALL USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

DROP POLICY IF EXISTS "Users can view raw scrapes in their org" ON raw_scrapes;
CREATE POLICY "Users can view raw scrapes in their org" ON raw_scrapes FOR SELECT USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
DROP POLICY IF EXISTS "Users can manage raw scrapes in their org" ON raw_scrapes;
CREATE POLICY "Users can manage raw scrapes in their org" ON raw_scrapes FOR ALL USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

-- 5.8 Feedback Items & AI Analyses
DROP POLICY IF EXISTS "Users can view feedback items in their org" ON feedback_items;
CREATE POLICY "Users can view feedback items in their org" ON feedback_items FOR SELECT USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
DROP POLICY IF EXISTS "Users can manage feedback items in their org" ON feedback_items;
CREATE POLICY "Users can manage feedback items in their org" ON feedback_items FOR ALL USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

DROP POLICY IF EXISTS "Users can view feedback analyses in their org" ON feedback_analyses;
CREATE POLICY "Users can view feedback analyses in their org" ON feedback_analyses FOR SELECT USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
DROP POLICY IF EXISTS "Users can manage feedback analyses in their org" ON feedback_analyses;
CREATE POLICY "Users can manage feedback analyses in their org" ON feedback_analyses FOR ALL USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

-- 5.9 Job Queue & Audit Logs
DROP POLICY IF EXISTS "Users can view jobs in their org" ON job_queue;
CREATE POLICY "Users can view jobs in their org" ON job_queue FOR SELECT USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
DROP POLICY IF EXISTS "Users can manage jobs in their org" ON job_queue;
CREATE POLICY "Users can manage jobs in their org" ON job_queue FOR ALL USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

DROP POLICY IF EXISTS "Admins can view audit logs in their org" ON audit_logs;
CREATE POLICY "Admins can view audit logs in their org" ON audit_logs FOR SELECT USING (is_org_admin(organization_id, auth.uid()));
DROP POLICY IF EXISTS "Org members can insert audit logs" ON audit_logs;
CREATE POLICY "Org members can insert audit logs" ON audit_logs FOR INSERT WITH CHECK (organization_id IN (SELECT get_user_org_ids(auth.uid())));

-- ==============================================================================
-- 6. AUTOMATIC SIGNUP PROVISIONING TRIGGER HOOK
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

  -- 1. Create User Profile
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    user_email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  -- 2. Create a default organization for the new user
  INSERT INTO organizations (name, slug, plan, status, owner_user_id)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'company_name', SPLIT_PART(user_email, '@', 1) || ' Workspace'),
    org_slug,
    'free',
    'active',
    NEW.id
  )
  RETURNING id INTO new_org_id;

  -- 3. Add the user as Owner of the organization
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'owner');

  -- 4. Record Initial Audit Log
  INSERT INTO audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, changes)
  VALUES (
    new_org_id,
    NEW.id,
    'organization.created',
    'organization',
    new_org_id,
    jsonb_build_object('name', COALESCE(NEW.raw_user_meta_data->>'company_name', SPLIT_PART(user_email, '@', 1) || ' Workspace'))
  );

  RETURN NEW;
END;
$$;

-- Trigger hook on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
