---
description: Shared business logic belongs in packages/, never copy-pasted into uis/
alwaysApply: true
---

# No duplicate business logic

Business logic used by more than one app must live in `packages/` and be imported — never copy-pasted into `uis/` (or elsewhere).

- Reusable libraries → `packages/`
- Non-package shared assets (schemas, templates) → `shared/`
- UI-only code may stay under `uis/`; once a second consumer needs it, extract to `packages/` first
