-- ==============================================================================
-- Migration: 20261007000001_phase3_core_schema.sql
-- Description: Phase 3 Core Multi-Tenant Entities & RLS Security
--
-- Tables Created/Expanded:
-- 1. profiles (User profiles synchronized with auth.users)
-- 2. company_aliases (Brand variants & sub-brands)
-- 3. company_domains (Web domains associated with company profiles)
-- 4. company_locations (Physical branches / store locations)
-- 5. company_social_accounts (Social media presence & channels)
-- 6. source_discoveries (Discovered review/social channels pending triage)
-- 7. source_verifications (Audit trail of source ownership/verification)
-- 8. feedback_analyses (AI-synthesized insights, topics, pain points, churn risk)
-- 9. audit_logs (Immutable compliance & security audit trail)
-- ==============================================================================

-- ==============================================================================
-- 1. USER PROFILES TABLE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 2. COMPANY PROFILE NORMALIZED ENTITIES
-- ==============================================================================

-- 2.1 Company Aliases
CREATE TABLE IF NOT EXISTS company_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  company_profile_id UUID NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
  alias_name TEXT NOT NULL,
  is_primary_brand BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.2 Company Domains
CREATE TABLE IF NOT EXISTS company_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  company_profile_id UUID NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.3 Company Locations (Multi-location branches / stores)
CREATE TABLE IF NOT EXISTS company_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  company_profile_id UUID NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
  location_name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state_region TEXT,
  country VARCHAR(2), -- ISO 3166-1 alpha-2
  postal_code VARCHAR(20),
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.4 Company Social Accounts
CREATE TABLE IF NOT EXISTS company_social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  company_profile_id UUID NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- 'x', 'linkedin', 'facebook', 'youtube', 'reddit', 'instagram'
  handle TEXT NOT NULL,
  profile_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 3. SOURCE DISCOVERY & VERIFICATION
-- ==============================================================================

-- 3.1 Source Discoveries (Candidate review sources found by crawler/discovery engine)
CREATE TABLE IF NOT EXISTS source_discoveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  company_profile_id UUID NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
  discovered_url TEXT NOT NULL,
  source_type source_type NOT NULL,
  confidence_score NUMERIC(5, 2) NOT NULL DEFAULT 0.50,
  discovery_method TEXT NOT NULL, -- e.g. 'crawler_serp', 'domain_heuristic', 'user_submission'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.2 Source Verifications (Verification audit log for source ownership/authenticity)
CREATE TABLE IF NOT EXISTS source_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  status verification_status NOT NULL,
  verification_method TEXT NOT NULL, -- 'automated_match', 'manual_review', 'dns_txt_record'
  verified_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 4. FEEDBACK AI ANALYSIS & AUDIT TRAILS
-- ==============================================================================

-- 4.1 Feedback Analyses (Granular AI synthesis outputs per feedback item)
CREATE TABLE IF NOT EXISTS feedback_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  feedback_item_id UUID NOT NULL REFERENCES feedback_items(id) ON DELETE CASCADE,
  model_name TEXT NOT NULL, -- e.g. 'omniroute/claude-3-5-sonnet'
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0.000000,
  sentiment_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  extracted_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  customer_pain_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  churn_risk_score NUMERIC(3, 2), -- 0.00 to 1.00
  suggested_action TEXT,
  raw_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.2 Audit Logs (Security & compliance trail for sensitive operations)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- e.g. 'source.created', 'member.invited', 'role.updated', 'data.exported'
  entity_type TEXT NOT NULL, -- e.g. 'organization', 'source', 'feedback_item', 'member'
  entity_id UUID,
  changes JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 5. PERFORMANCE & SEARCH INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

CREATE INDEX IF NOT EXISTS idx_company_aliases_org ON company_aliases(organization_id);
CREATE INDEX IF NOT EXISTS idx_company_aliases_profile ON company_aliases(company_profile_id);

CREATE INDEX IF NOT EXISTS idx_company_domains_org ON company_domains(organization_id);
CREATE INDEX IF NOT EXISTS idx_company_domains_profile ON company_domains(company_profile_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_domains_unique ON company_domains(organization_id, domain);

CREATE INDEX IF NOT EXISTS idx_company_locations_org ON company_locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_company_locations_profile ON company_locations(company_profile_id);

CREATE INDEX IF NOT EXISTS idx_company_social_org ON company_social_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_company_social_profile ON company_social_accounts(company_profile_id);

CREATE INDEX IF NOT EXISTS idx_source_discoveries_org ON source_discoveries(organization_id);
CREATE INDEX IF NOT EXISTS idx_source_discoveries_status ON source_discoveries(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_source_verifications_org ON source_verifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_source_verifications_source ON source_verifications(source_id);

CREATE INDEX IF NOT EXISTS idx_feedback_analyses_org ON feedback_analyses(organization_id);
CREATE INDEX IF NOT EXISTS idx_feedback_analyses_feedback ON feedback_analyses(feedback_item_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(organization_id, actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(organization_id, created_at DESC);

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all newly created tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_discoveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 6.1 Profiles Policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- 6.2 Company Aliases Policies
CREATE POLICY "Users can view company aliases in their org"
  ON company_aliases FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Users can manage company aliases in their org"
  ON company_aliases FOR ALL
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

-- 6.3 Company Domains Policies
CREATE POLICY "Users can view company domains in their org"
  ON company_domains FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Users can manage company domains in their org"
  ON company_domains FOR ALL
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

-- 6.4 Company Locations Policies
CREATE POLICY "Users can view company locations in their org"
  ON company_locations FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Users can manage company locations in their org"
  ON company_locations FOR ALL
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

-- 6.5 Company Social Accounts Policies
CREATE POLICY "Users can view company social accounts in their org"
  ON company_social_accounts FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Users can manage company social accounts in their org"
  ON company_social_accounts FOR ALL
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

-- 6.6 Source Discoveries Policies
CREATE POLICY "Users can view source discoveries in their org"
  ON source_discoveries FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Users can manage source discoveries in their org"
  ON source_discoveries FOR ALL
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

-- 6.7 Source Verifications Policies
CREATE POLICY "Users can view source verifications in their org"
  ON source_verifications FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Users can manage source verifications in their org"
  ON source_verifications FOR ALL
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

-- 6.8 Feedback Analyses Policies
CREATE POLICY "Users can view feedback analyses in their org"
  ON feedback_analyses FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Users can manage feedback analyses in their org"
  ON feedback_analyses FOR ALL
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

-- 6.9 Audit Logs Policies (Read-only for org members, append-only via triggers/service role)
CREATE POLICY "Admins can view audit logs in their org"
  ON audit_logs FOR SELECT
  USING (is_org_admin(organization_id, auth.uid()));

CREATE POLICY "Org members can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (organization_id IN (SELECT get_user_org_ids(auth.uid())));

-- ==============================================================================
-- 7. PROFILE CREATION TRIGGER HOOK (UPDATE HANDLE_NEW_USER)
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
