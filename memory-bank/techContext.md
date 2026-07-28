# Tech Context

## 1. Tech stack

**Language**
- TypeScript across the repo (`strict: true`). Root uses TypeScript `^5.9.3` (ESM, `target`/`module` ES2020). The Talent Pipeline Tracker app uses TypeScript `^5` (ES2017 / `module` esnext, App Router JSX).

**Root (`package.json` — `trackflow-milestone-2`)**
- TypeScript utilities under `src/` (warehouse/carrier data processing). Script: `npm run typecheck` → `tsc --noEmit`. No runtime framework at root.

**`uis/talent-pipeline-tracker`**
- Next.js `16.2.10` (App Router)
- React `19.2.4` / React DOM `19.2.4`
- Tailwind CSS `^4` + `@tailwindcss/postcss` `^4`
- ESLint `^9` + `eslint-config-next` `16.2.10`
- Path alias `@/*` → app root

**`uis/website`**
- Static HTML/JS only (`index.html`, `application.html`, `validation.js`). No `package.json` / framework.

**`packages/shared` (`@repo/shared-types` `0.0.1`)**
- Shared TypeScript types only. No runtime dependencies.

**Not present in code today**
- `services/` has no implementations (README-only). Do not assume a backend stack is installed until one is added.

## 2. Architecture

Monorepo organized by responsibility (not by milestone). Relevant layout:

| Path | Role |
| --- | --- |
| `uis/` | Frontends. Today: `talent-pipeline-tracker` (Next.js candidate UI) and `website` (static public site). |
| `services/` | Backend APIs / workers. Currently empty; intended home for company APIs. |
| `packages/` | Versionable shared libraries. Today: `packages/shared` → `@repo/shared-types`. |
| `shared/` | Loose shared assets (schemas, templates, config) — not a package. |
| `src/` | Root-level TypeScript utilities typed by root `tsconfig.json` (`include`: `src/**/*.ts`). |
| `data/`, `agents/`, `skills/`, `mcps/`, `workflows/`, `infra/`, `scripts/`, `internal/`, `docs/` | Reserved monorepo layers (data, AI, automation, ops, docs). |

No npm/pnpm/yarn workspaces runner is configured at the root. The UI app has its own `package.json` / lockfile and is run from its folder (`npm run dev` / `build` / `start`).

The Talent Pipeline Tracker talks to an external API via `NEXT_PUBLIC_API_URL` (`lib/api.ts`); candidate types live under `uis/talent-pipeline-tracker/types/`.

## 3. Technical constraints

- **Respect folder roles.** UI → `uis/`; APIs/workers → `services/`; reusable libraries → `packages/`; non-package shared assets → `shared/`. Do not invent new top-level app homes without cause.
- **TypeScript.** Prefer `.ts`/`.tsx` with strict checking. Root typecheck is `tsc --noEmit`; the Next app uses its own `tsconfig.json` and ESLint.
- **No duplicated business logic.** Code used by more than one app/agent belongs in `packages/` (or documented assets in `shared/`), not copy-pasted across `uis/` or elsewhere.
- **Per-app install/run.** Install and run from the relevant package directory; root is not a workspace orchestrator.
- **Next.js 16 specifics.** Follow `uis/talent-pipeline-tracker/AGENTS.md` — this Next version may differ from older docs; check local Next docs under `node_modules/next/dist/docs/` before changing APIs or file structure.
- **Do not invent unused stack.** Do not introduce or assume FastAPI, databases, or other tools until they exist under `services/` (or elsewhere) in the repo.
