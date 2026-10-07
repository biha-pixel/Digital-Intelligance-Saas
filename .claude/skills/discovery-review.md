---
name: discovery-review
description: Explore and understand codebase structure and patterns
---

# Discovery Review

Systematically explore the codebase to understand structure, patterns, and conventions.

## When to Use
- Starting work on an unfamiliar part of the codebase
- Understanding how a feature is implemented
- Mapping dependencies between components
- Onboarding to a new area

## Discovery Process

### 1. Map Project Structure
```bash
# Show top-level structure
ls -la

# Find key directories
ls app/ lib/ components/ types/ supabase/

# Count files by type
find . -name "*.ts" -not -path "*/node_modules/*" | wc -l
find . -name "*.tsx" -not -path "*/node_modules/*" | wc -l
```

### 2. Find Feature Implementation
```bash
# Search for feature files
glob "app/api/**/route.ts"           # API routes
glob "app/**/page.tsx"               # Pages
glob "components/**/*.tsx"            # Components
glob "lib/**/*.ts"                   # Utilities
glob "types/**/*.ts"                 # Type definitions
glob "supabase/migrations/*.sql"     # Database

# Search for specific functionality
grep "import.*OmniRoute" -r          # AI gateway usage
grep "import.*crawl4ai" -r           # Scraping usage
grep "createClient" -r               # Supabase usage
```

### 3. Trace Data Flow
Start from the user action and follow data through:
1. **Page/Component** → user interaction
2. **API Route** → HTTP request handling
3. **Business Logic** → processing
4. **Database Query** → data storage/retrieval
5. **External Service** → scraping/AI
6. **Response** → back to user

### 4. Identify Patterns
Document recurring patterns:
- How are API routes structured?
- How is auth handled?
- How are types defined?
- How are errors handled?
- How are tests organized?

### 5. Document Findings

```markdown
## Feature: AI Analysis Pipeline

### Files
- `app/api/analyze/route.ts` - API endpoint
- `lib/ai/omniroute.ts` - OmniRoute client
- `lib/ai/schemas.ts` - Response schemas
- `types/analysis.ts` - TypeScript types
- `supabase/migrations/xxx_analyses.sql` - Database schema

### Data Flow
1. POST /api/analyze with scraped content
2. Validate input with Zod
3. Check auth (Supabase)
4. Call OmniRoute for analysis
5. Validate AI response against schema
6. Store in analyses table (RLS enforced)
7. Return analysis ID

### Dependencies
- OmniRoute AI gateway
- Supabase for storage + auth
- Zod for validation

### Patterns Used
- Connector abstraction for AI provider
- Schema validation on AI output
- Async job processing
- Tenant isolation via RLS

### Gaps
- No retry on AI timeout
- Missing error types
- No rate limiting
```

## Questions to Answer

### Structure
- What's the overall project architecture?
- Where does each feature live?
- How are modules organized?

### Conventions
- What naming patterns are used?
- How are files structured?
- What libraries are used?

### Dependencies
- What external services are used?
- How are they connected?
- Where are API keys managed?

### Security
- How is authentication handled?
- Where are RLS policies?
- How are secrets managed?

### Testing
- Where are tests?
- What's the test setup?
- What's covered vs not?