---
name: database-review
description: Review database schema design and RLS policies
---

# Database Review

Review database schema, RLS policies, and data modeling decisions before implementation.

## When to Use
- Before creating new tables
- Before adding RLS policies
- When designing relationships
- When performance issues arise
- Before database migrations

## Review Checklist

### Schema Design

#### Table Structure
```sql
-- Example: projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) > 0),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_project_name_per_tenant UNIQUE (tenant_id, name)
);
```

**Review Questions**:
- [ ] Does every tenant-scoped table have `tenant_id UUID NOT NULL`?
- [ ] Are foreign keys defined with appropriate `ON DELETE` behavior?
- [ ] Are `NOT NULL` constraints on required fields?
- [ ] Are there `CHECK` constraints for validation?
- [ ] Do timestamps use `TIMESTAMPTZ` (not `TIMESTAMP`)?
- [ ] Are `UNIQUE` constraints appropriate for business rules?
- [ ] Is the primary key appropriate (UUID vs serial)?

#### Relationships
- [ ] One-to-many relationships use foreign keys
- [ ] Many-to-many relationships use junction tables
- [ ] Circular dependencies avoided
- [ ] Referential integrity enforced

### RLS Policies

#### Required Policies
Every tenant-scoped table must have:

```sql
-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- SELECT policy
CREATE POLICY "Users can view own tenant projects"
  ON projects FOR SELECT
  USING (tenant_id = auth.uid());

-- INSERT policy
CREATE POLICY "Users can insert own tenant projects"
  ON projects FOR INSERT
  WITH CHECK (tenant_id = auth.uid());

-- UPDATE policy
CREATE POLICY "Users can update own tenant projects"
  ON projects FOR UPDATE
  USING (tenant_id = auth.uid())
  WITH CHECK (tenant_id = auth.uid());

-- DELETE policy
CREATE POLICY "Users can delete own tenant projects"
  ON projects FOR DELETE
  USING (tenant_id = auth.uid());
```

**Review Questions**:
- [ ] Is RLS enabled on every tenant-scoped table?
- [ ] Are there policies for SELECT, INSERT, UPDATE, DELETE?
- [ ] Do INSERT policies use `WITH CHECK`?
- [ ] Do UPDATE policies have both `USING` and `WITH CHECK`?
- [ ] Do policies enforce `tenant_id = auth.uid()`?
- [ ] Are there any policy gaps?

#### Testing RLS

```sql
-- Test as specific user
SET request.jwt.claim.sub = '<user_uuid>';

-- Try to read data
SELECT * FROM projects;
-- Should only see user's tenant projects

-- Try to insert with wrong tenant_id
INSERT INTO projects (tenant_id, name) 
VALUES ('<different_tenant_id>', 'Hack Attempt');
-- Should fail

-- Try to update another tenant's project
UPDATE projects SET name = 'Hacked' 
WHERE id = '<another_tenant_project_id>';
-- Should fail (0 rows affected)

-- Reset
RESET request.jwt.claim.sub;
```

**Review Questions**:
- [ ] Can users only see their tenant's data?
- [ ] Can users insert only with their tenant_id?
- [ ] Can users update only their tenant's data?
- [ ] Can users delete only their tenant's data?
- [ ] Can users bypass checks by providing different tenant_id?

### Indexes

```sql
-- Critical indexes
CREATE INDEX idx_projects_tenant ON projects(tenant_id);
CREATE INDEX idx_projects_created ON projects(created_at DESC);
CREATE INDEX idx_projects_tenant_created ON projects(tenant_id, created_at DESC);
```

**Review Questions**:
- [ ] Is `tenant_id` indexed on every tenant-scoped table?
- [ ] Are foreign keys indexed?
- [ ] Are columns in WHERE clauses indexed?
- [ ] Are columns in ORDER BY indexed?
- [ ] Are composite indexes ordered correctly?
- [ ] Have you profiled queries with `EXPLAIN ANALYZE`?

### Data Types

**Use Appropriate Types**:
- ✅ `UUID` for IDs (not `TEXT`)
- ✅ `TIMESTAMPTZ` for timestamps (not `TIMESTAMP`)
- ✅ `BOOLEAN` for flags (not `INTEGER`)
- ✅ `JSONB` for structured data (not `JSON` or `TEXT`)
- ✅ `TEXT` for strings (not `VARCHAR` unless limited)
- ✅ `NUMERIC` for money (not `FLOAT`)

**Review Questions**:
- [ ] Are data types semantically correct?
- [ ] Are monetary values using `NUMERIC`?
- [ ] Are timestamps timezone-aware?
- [ ] Is `JSONB` used for flexible schemas?

### Constraints and Validation

```sql
-- Examples
CHECK (length(name) > 0 AND length(name) <= 255)
CHECK (status IN ('pending', 'active', 'completed'))
CHECK (price >= 0)
CHECK (start_date <= end_date)
```

**Review Questions**:
- [ ] Are constraints enforcing business rules?
- [ ] Are length limits appropriate?
- [ ] Are enum-like values using `CHECK` constraints?
- [ ] Are value ranges validated?
- [ ] Are relationship rules enforced?

### Migrations

```sql
-- Migration structure
-- supabase/migrations/20240115120000_create_projects.sql

-- Create table
CREATE TABLE projects (...);

-- Add indexes
CREATE INDEX ...;

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY ...;
```

**Review Questions**:
- [ ] Is migration reversible?
- [ ] Does migration have clear description in filename?
- [ ] Are changes applied in correct order?
- [ ] Is down migration provided (if applicable)?
- [ ] Will migration work on existing data?
- [ ] Is migration tested locally first?

### Common Mistakes

❌ **Missing RLS on new tables**
```sql
-- Wrong
CREATE TABLE sensitive_data (...);
-- Anyone can access!

-- Right
CREATE TABLE sensitive_data (...);
ALTER TABLE sensitive_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY ...;
```

❌ **No index on tenant_id**
```sql
-- Slow queries for users with many rows
-- Always index tenant_id for RLS performance
CREATE INDEX idx_table_tenant ON table(tenant_id);
```

❌ **Trusting client-provided tenant_id**
```typescript
// ❌ Wrong - API code
const { tenant_id, name } = req.body; // Client provides tenant_id
await db.insert({ tenant_id, name });

// ✅ Right
const { name } = req.body;
await db.insert({ 
  tenant_id: auth.uid(), // Server enforces tenant_id
  name 
});
```

❌ **Using service role key on client**
```typescript
// ❌ Wrong - bypasses RLS!
const supabase = createClient(url, serviceRoleKey); // Server-only key

// ✅ Right
const supabase = createClient(url, anonKey); // Public-safe key
```

❌ **Forgetting CASCADE on foreign keys**
```sql
-- What happens when tenant is deleted?
tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
```

## Review Process

1. **Read schema definition**
2. **Check RLS policies exist and are correct**
3. **Verify indexes on tenant_id and foreign keys**
4. **Test RLS policies with sample users**
5. **Run EXPLAIN ANALYZE on expected queries**
6. **Document any intentional deviations**

## Performance Testing

```sql
-- Profile a query
EXPLAIN ANALYZE
SELECT * FROM projects
WHERE tenant_id = '<uuid>'
ORDER BY created_at DESC
LIMIT 20;

-- Look for:
-- - Index scans (not sequential scans)
-- - Low execution time
-- - Appropriate row estimates
```

## Documentation

Add to `docs/architecture-decisions.md`:

```markdown
## Database: Projects Table

**Purpose**: Store customer experience projects per tenant

**Schema**:
- `id` - UUID primary key
- `tenant_id` - Foreign key to tenants (indexed)
- `name` - Project name (unique per tenant)
- `description` - Optional details
- Timestamps for audit trail

**RLS**: Enforces tenant isolation at database level

**Indexes**:
- `tenant_id` - For RLS performance
- `(tenant_id, created_at DESC)` - For listing queries

**Testing**: Verified users can only access their tenant's projects
```