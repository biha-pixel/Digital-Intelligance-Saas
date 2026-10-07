---
name: phase-completion
description: Review phase completion criteria and mark phases done
---

# Phase Completion

Review whether the current development phase is complete before moving on.

## When to Use
- When you think a phase of work is done
- Before starting a new development phase
- When wrapping up a feature
- During sprint reviews

## Phase Review Process

### 1. Review Phase Goals
Check `docs/roadmap.md` for current phase objectives.

### 2. Verify Deliverables

For each deliverable in the phase:
- [ ] Feature implemented
- [ ] Tests written and passing
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] Security reviewed

### 3. Quality Checks

#### Code Quality
- [ ] TypeScript strict mode - no `any` types
- [ ] No lint warnings
- [ ] No unnecessary dependencies added
- [ ] Functions are testable
- [ ] Error handling complete

#### Security
- [ ] RLS policies for new tables
- [ ] Input validation on new endpoints
- [ ] No secrets in client code
- [ ] SSRF prevention for new URLs

#### Documentation
- [ ] Architecture decisions documented
- [ ] Learning log updated
- [ ] API endpoints documented
- [ ] New patterns documented

#### Testing
- [ ] Unit tests for business logic
- [ ] Integration tests for API routes
- [ ] RLS policies tested
- [ ] Error cases tested

### 4. Learning Review

For educational value, review what was learned:

```markdown
## Phase Completion: [Phase Name]

### What I Learned
- How Supabase RLS enforces tenant isolation
- How to validate AI outputs with Zod schemas
- How connector patterns isolate external dependencies

### What Worked Well
- Schema-first approach caught type errors early
- RLS testing in dev prevented production bugs

### What I'd Do Differently
- Start with better type definitions
- Write tests earlier in the process

### Next Phase Preview
- What's coming next
- Prerequisites needed
- Skills to learn
```

### 5. Technical Debt

Document any shortcuts or deferred work:
- [ ] No critical technical debt
- [ ] Deferred items tracked in roadmap
- [ ] TODO comments have corresponding issues

### 6. Phase Sign-Off

```markdown
## Phase [N]: [Name] - COMPLETE ✅

**Completed**: 2024-01-15
**Duration**: 2 weeks

### Deliverables
- ✅ Database schema with RLS
- ✅ Auth integration
- ✅ Basic API routes
- ✅ Tests passing

### Quality
- ✅ TypeScript strict
- ✅ Security reviewed
- ✅ Documented
- ✅ Tested

### Deferred
- Performance optimization (Phase N+1)
- E2E tests (Phase N+2)

### Lessons
- RLS is powerful but requires careful testing
- Schema-first development saves debugging time
```

## Anti-Patterns

❌ **Skipping tests**: "I'll add tests later"
❌ **Skipping security review**: "It's just internal"
❌ **No documentation**: "The code is self-documenting"
❌ **Moving on too fast**: Not verifying completeness
❌ **Inventing production readiness**: Not testing what you built