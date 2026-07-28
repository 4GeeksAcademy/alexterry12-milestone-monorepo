# AGENTS.md

## Startup reading (before each session)
1. memory-bank/projectbrief.md
2. memory-bank/techContext.md
3. memory-bank/progress.md

## Pre-commit workflow (required, in order)
1. Re-read memory-bank/progress.md to confirm the change matches the plan.
2. Run `npm run typecheck` to confirm TypeScript compiles with no errors.
3. Update memory-bank/progress.md to reflect what was just done.
4. Verify no secrets, API keys, or .env files are being committed.

## Do not modify without developer confirmation
- 00–03_CONTEXT.md (the company scenario files)
- Anything under packages/ (shared code other apps depend on)