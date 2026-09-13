# Progress

## Done
- Milestone 1: public website (static HTML)
- Milestone 2: TypeScript business logic
- Milestone 3: Talent Pipeline Tracker (Next.js)
- Milestone 4 — Agent infrastructure:
  - memory-bank/ (projectbrief, techContext, progress)
  - AGENTS.md (startup reading + 4-step pre-commit workflow)
  - .agents/rules/no-duplicate-logic.md
  - .agents/skills/pre-commit-check/SKILL.md
- Milestone 4 — Next.js apps:
  - uis/website — home route with all Milestone 1 sections + /application form (validation working)
  - uis/backoffice — own layout + Milestone 2 logic imported from src/ and rendered on /operations
- Removed root `node_modules` from all git history; added standard Node `.gitignore` (GitHub Node.gitignore)

## In progress
- AUTH-02: login, registration, account profile, route guard, logout, and centralized 401 handling in uis/backoffice. Protected API clients (`authApi`, `incidentsApi`, `suppliersApi`) send bearer tokens; 401 clears `trackflow_token` and `router.replace("/login")` (no-op on `/login`/`/register`). TypeScript compiles cleanly. Needs manual testing against running API.

## Next
- Final commit, PR, and submission