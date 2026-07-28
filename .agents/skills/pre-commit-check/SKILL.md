---
name: pre-commit-check
description: >-
  Verifies the repo is safe and consistent before any commit—progress vs plan,
  root TypeScript typecheck, updated memory-bank/progress.md, and no secrets
  staged. Use when the user asks to commit, or before running git commit.
---

# Pre-commit check

## Objective

Before any commit, verify the repo is in a safe, consistent state.

## Inputs

- The git repo working tree and index (`git status`, `git diff`, `git diff --cached`)
- Memory bank: `memory-bank/progress.md` (and, if needed, `projectbrief.md` / `techContext.md`)
- The list of staged paths (what would be committed)

## Steps

Run in this order (from `AGENTS.md`):

1. Re-read `memory-bank/progress.md` and confirm the staged changes match the current plan (Done / In progress / Next).
2. From the repo root, run `npm run typecheck` and confirm TypeScript compiles with no errors (`tsc --noEmit` via root `package.json`).
3. Update `memory-bank/progress.md` so it reflects what was just done (move items Done / In progress / Next as needed). Include that update in the commit if progress changed.
4. Inspect staged files: ensure no secrets, API keys, or `.env` files are staged. Do not stage `.env`, `.env.local`, credentials, or similar.
5. Only after all acceptance criteria pass, proceed to commit (if the user requested one).

## Acceptance criteria

All must pass (objective pass/fail):

- [ ] `memory-bank/progress.md` was re-read and the staged diff is consistent with its plan (no unexplained work outside Done / In progress / Next).
- [ ] `npm run typecheck` exits with code `0` (0 TypeScript errors).
- [ ] `memory-bank/progress.md` on disk reflects the work about to be committed (updated in this session if the work changed status).
- [ ] `git diff --cached --name-only` lists no `.env`, `.env.*`, `*.pem`, `credentials.json`, or other secret/credential files.
- [ ] Staged content does not introduce copy-pasted multi-app business logic under `uis/` that belongs in `packages/` (per `.agents/rules/no-duplicate-logic.md` / `techContext.md`).
