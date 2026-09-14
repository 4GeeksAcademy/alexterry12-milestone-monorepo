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
- AUTH-02 password reset UI in uis/backoffice: `/forgot-password`, `/reset-password` (Suspense + `?token=`), `/account/change-password`, login `?reset=1` banner + forgot link. Public paths updated in AuthGuard/authApi. API clients: `forgotPassword`, `resetPassword`, `changePassword`.
- AUTH-02 API password lifecycle already in services/api (forgot/reset/change-password + Resend).

## Next
- Final commit, PR, and submission
- Manual end-to-end test of reset email flow with RESEND_API_KEY + FRONTEND_URL