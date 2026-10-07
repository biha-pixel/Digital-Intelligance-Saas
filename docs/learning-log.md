# Learning Log

Track what you learn during development. Each entry should explain what you learned, why it matters, how to apply it, and common mistakes.

---

## 2026-10-07: Project Environment Setup

**What I learned**: Setting up a structured engineering environment with specialized agents, skills, and documentation frameworks creates guardrails that prevent common mistakes before they happen.

**Why it matters**: Junior developers often dive straight into coding without establishing foundations. A structured environment with clear guidelines, security rules, and review processes catches issues early.

**How to apply**:
- Use agents for focused work (e.g., `@database` for schema design, `@security` for audits)
- Run skills before major decisions (e.g., `/architecture-review` before new features)
- Document decisions in `architecture-decisions.md`
- Update this log after learning something significant

**Common mistakes**:
- Skipping the learning phase and jumping to implementation
- Not documenting decisions and forgetting why choices were made
- Not testing security controls (RLS, input validation)
- Using OpenRouter instead of OmniRoute (our AI gateway)

**Exercise**: Review the CLAUDE.md file and name three security principles from memory.

---

## Template for Future Entries

```markdown
## YYYY-MM-DD: [Topic]

**What I learned**: [Concept explanation]

**Why it matters**: [Real-world importance]

**How to apply**: 
- [Step or pattern 1]
- [Step or pattern 2]

**Common mistakes**:
- [Mistake 1]
- [Mistake 2]

**Exercise**: [Small challenge to reinforce learning]
```
