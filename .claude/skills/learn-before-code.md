---
name: learn-before-code
description: Explain concepts and data flow before implementing
---

# Learn Before Code

This skill ensures educational understanding before implementation.

## When to Use
Invoke when:
- Starting to implement a new feature
- Using unfamiliar technology (Supabase RLS, OmniRoute, Crawl4AI)
- Making architectural decisions
- The user asks "how does X work?"

## Approach

### 1. Explain the Concept
- **What is it?** Define in simple terms
- **Why does it exist?** What problem does it solve?
- **When do we use it?** What scenarios?

Example:
"Supabase RLS (Row Level Security) is PostgreSQL's built-in authorization system. Instead of checking permissions in your application code, the database itself enforces who can see what data. This means even if someone bypasses your API, they still can't access unauthorized data."

### 2. Show the Data Flow
Trace how data moves through the system:

```
User Request → API Route → Validate Input → Check Auth → 
Query Database (RLS filters) → Return Results → JSON Response
```

### 3. Explain Important Files
Point to where this lives in the codebase:
- `app/api/projects/route.ts` - API endpoint
- `lib/db/supabase.ts` - Database client
- `supabase/migrations/xxx_projects.sql` - Table and RLS policies

### 4. Explain Design Choices
Why this approach over alternatives:

"We use Supabase RLS instead of application-level authorization because:
- Security in depth - even if app is compromised, database is protected
- Consistent enforcement - can't forget to add auth checks
- Performance - database can optimize filtered queries"

### 5. Show How to Test
```typescript
// Test RLS policy
const { data } = await supabase
  .from('projects')
  .select()
  .eq('id', 'some-id');

// Should only return data if user owns the project
```

### 6. Warn About Common Mistakes
- ❌ Forgetting to enable RLS on new tables
- ❌ Using service role key on client (bypasses RLS)
- ❌ Not indexing tenant_id column
- ✅ Always test policies before deploying

### 7. Provide Learning Exercise
"Try this: Create a test user in Supabase, then query the projects table. You should only see projects where tenant_id matches the user's ID."

## Implementation Pattern

1. **Explain first** - Don't start coding immediately
2. **Get confirmation** - "Does this approach make sense?"
3. **Implement with comments** - Explain why, not just what
4. **Test together** - Show how to verify it works
5. **Document learnings** - Add to docs/learning-log.md

## Example Flow

User: "Add a projects table"

Agent response:
"Let me explain how we'll structure this with Supabase RLS before implementing...

**What we're building**: A multi-tenant projects table where each tenant can only see their own projects.

**Data flow**:
1. User creates project via API
2. API validates input with Zod
3. Server adds tenant_id from authenticated user
4. Database inserts with RLS policy checking tenant_id
5. Only matching rows are visible to that tenant

**Key files**:
- `supabase/migrations/xxx_create_projects.sql` - Table definition + RLS
- `app/api/projects/route.ts` - API endpoint
- `types/project.ts` - TypeScript types

**Why this design**: RLS ensures tenant isolation at the database level, so even if application code is compromised, tenants can't access each other's data.

**How to test**: Create two users, add projects for each, verify they can't see each other's data.

**Common mistake**: Forgetting the index on tenant_id, which makes RLS queries slow.

Ready to implement? I'll create the migration with detailed comments explaining each part."

## Documentation

After explaining and implementing, add entry to `docs/learning-log.md`:

```markdown
## 2024-01-15: Supabase RLS for Multi-Tenancy

**What I learned**: Row Level Security (RLS) is PostgreSQL's built-in authorization that runs at the database level, not in application code.

**Why it matters**: Even if API is bypassed, database protects data. Better than app-level checks.

**How to apply**: 
- Every tenant-scoped table needs `tenant_id UUID NOT NULL REFERENCES tenants(id)`
- Enable RLS: `ALTER TABLE projects ENABLE ROW LEVEL SECURITY;`
- Create policies: `CREATE POLICY "name" ON table FOR SELECT USING (tenant_id = auth.uid())`
- Index tenant_id for performance

**Common mistakes**: Forgetting to enable RLS, missing indexes, not testing policies

**Exercise completed**: Created projects table with RLS, tested with two users
```