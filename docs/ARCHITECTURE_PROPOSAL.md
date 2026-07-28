# TrackFlow Architecture Proposal — Centralized Company API

This document proposes how TrackFlow's backend should be shaped inside this monorepo. It is grounded in `00_CONTEXT.md`–`03_CONTEXT.md`, `company-choice.md`, the root `README.md`, `services/README.md`, and the existing apps under `uis/`.

**Conflicting guidance:** The root `README.md` recommends one centralized FastAPI app with routers/modules per domain and warns against early microservices. `services/README.md` instead says each subfolder should be one specific service (e.g. `admin-api`, `data-processor-worker`). **This proposal follows the root README.**

---

## 1. Chosen architectural pattern

**Pattern:** one centralized FastAPI application (`services/api/`) with one router (and module folder) per business domain.

### Why this fits TrackFlow

TrackFlow's real business areas that a backend must serve are interdependent (`00_CONTEXT.md`):

1. **Warehouse Operations** — inventory, SKUs stock, inbound orders, picking  
2. **Last Mile and Carrier Management** — carriers, shipments, tracking, incidents  
3. **Reverse Logistics** — returns, approval rules, collection, inspection  
4. **Customer Experience** — queries/tickets, tracking and return status answers  
5. **Commercial and Client Relations** — brand clients, leads, renewals  

These are not five isolated products. A shipment consumes warehouse stock. A return refers to a prior shipment and product. Carrier performance feeds commercial reporting. The First-Line Customer Experience agent (`company-choice.md`) must resolve tracking and return queries by looking up **order/shipment status and return status together**, plus identifiers (order number, email, tracking number). That agent needs a single API surface where those reads are in-process calls or same-database queries—not three network hops across three services.

TrackFlow Tech is a small team (Technology ~7 people in Zaragoza; the student project is smaller still — `00_CONTEXT.md`). One deployable API, one OpenAPI schema, one set of env vars, and one place to add CORS and auth keeps operational load low while milestones still accumulate.

### Why microservices per department would be worse here

Splitting warehouse, last mile, reverse logistics, CX, and commercial into separate deployables would:

- Force the CX agent (and any backoffice screen that shows end-to-end parcel state) to fan out across services and invent distributed consistency early.  
- Duplicate shared entities (`Product`, `Shipment`, `Carrier` from `02_CONTEXT.md`) or push sync jobs the company does not have capacity to run.  
- Multiply local setup (`docker-compose`, ports, health checks) for a team that already struggles with undocumented point-to-point scripts (`00_CONTEXT.md`).  
- Contradict the root `README.md` rule: add endpoints to the same FastAPI app; extract a worker only when something truly must run separately.

Domain boundaries stay clear **inside** the monolith via routers and folders—not via separate processes.

---

## 2. Folder and module structure

**Separation criterion:** one folder under `domains/` per business domain named in section 1. Technical cross-cutting code (settings, DB session, shared schemas) stays at the `api/` package root—not inside a domain.

```text
services/
└── api/
    ├── README.md
    ├── pyproject.toml          # or requirements.txt
    ├── .env.example
    ├── app/
    │   ├── __init__.py
    │   ├── main.py             # FastAPI app; include_router for each domain
    │   ├── config.py           # settings from environment
    │   ├── database.py         # shared DB connection / session
    │   ├── dependencies.py     # shared deps (auth, pagination, etc.)
    │   ├── cors.py             # CORSMiddleware wiring (or inline in main)
    │   └── domains/
    │       ├── warehouse/
    │       │   ├── router.py
    │       │   ├── schemas.py
    │       │   ├── models.py
    │       │   └── service.py
    │       ├── last_mile/
    │       │   ├── router.py
    │       │   ├── schemas.py
    │       │   ├── models.py
    │       │   └── service.py
    │       ├── reverse_logistics/
    │       │   ├── router.py
    │       │   ├── schemas.py
    │       │   ├── models.py
    │       │   └── service.py
    │       ├── customer_experience/
    │       │   ├── router.py
    │       │   ├── schemas.py
    │       │   ├── models.py
    │       │   └── service.py
    │       └── commercial/
    │           ├── router.py
    │           ├── schemas.py
    │           ├── models.py
    │           └── service.py
    └── tests/
        ├── warehouse/
        ├── last_mile/
        ├── reverse_logistics/
        ├── customer_experience/
        └── commercial/
```

Hiring / talent-pipeline candidates (`03_CONTEXT.md`) are served today by an external course API (`uis/talent-pipeline-tracker`). They are **not** one of the five logistics domains above. If TrackFlow later hosts that API itself, add a separate `domains/talent/` (or keep it external)—do not fold candidates into warehouse or commercial.

---

## 3. Router and endpoint organization

Each domain owns one `APIRouter` mounted with a stable prefix. Paths below are the contract shape (no implementation). Grouping matches what that department needs (`00_CONTEXT.md`, `01_CONTEXT.md`, `02_CONTEXT.md`, `company-choice.md`).

### Warehouse — prefix `/warehouse`

Rationale: Ana Whitfield's unified inventory and order-ingestion needs (`00_CONTEXT.md`); entities from `02_CONTEXT.md` (`Product`, `InventoryMovement`).

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/warehouse/products` | List/filter inventory (SKU, location, stock) |
| GET | `/warehouse/products/{sku}` | Product detail across warehouses |
| GET | `/warehouse/stock` | Real-time stock for a SKU in LA / Zaragoza |
| POST | `/warehouse/movements` | Record inbound/outbound/transfer/adjustment |
| GET | `/warehouse/movements` | Movement history |
| GET | `/warehouse/alerts/low-stock` | Products at or below threshold |
| POST | `/warehouse/orders/ingest` | Accept parsed inbound order payloads |
| GET | `/warehouse/reports/summary` | Aggregated warehouse metrics |

### Last mile — prefix `/last-mile`

Rationale: Carlos Vega's carrier selection, unified tracking, incidents (`00_CONTEXT.md`); `Shipment` / `Carrier` (`02_CONTEXT.md`).

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/last-mile/carriers` | List carriers and capabilities |
| GET | `/last-mile/carriers/{id}` | Carrier detail / rates |
| POST | `/last-mile/carriers/recommend` | Optimal carrier for destination, weight, urgency |
| GET | `/last-mile/shipments` | List/filter shipments |
| GET | `/last-mile/shipments/{id}` | Shipment detail |
| POST | `/last-mile/shipments` | Create shipment |
| PATCH | `/last-mile/shipments/{id}` | Update status / assign carrier |
| GET | `/last-mile/tracking/{tracking_id}` | Unified tracking status (any carrier) |
| GET | `/last-mile/incidents` | Lost / failed / address incidents |
| GET | `/last-mile/performance` | On-time rates, incidents, cost metrics |

### Reverse logistics — prefix `/returns`

Rationale: Sofía Ramos's approval engine, collection flow, inspection (`00_CONTEXT.md`); CX needs return status (`company-choice.md`).

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/returns` | List returns (filter by client, status, country) |
| GET | `/returns/{id}` | Return detail / status |
| POST | `/returns` | Open a return |
| POST | `/returns/{id}/approve` | Run or record approval decision |
| POST | `/returns/{id}/reject` | Reject with reason |
| POST | `/returns/{id}/collection` | Label + carrier schedule step |
| POST | `/returns/{id}/inspection` | Submit photo/classification result |
| GET | `/returns/rules` | Per-client approval rules |
| PUT | `/returns/rules/{client_id}` | Configure client rules |
| GET | `/returns/analytics` | Patterns (what returns, why) |

### Customer experience — prefix `/cx`

Rationale: Valentina Cruz's ticketing and first-line agent (`00_CONTEXT.md`, `company-choice.md`). Routes expose tickets and agent helpers; shipment/return **data** still lives under `/last-mile` and `/returns`, callable from the same app.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/cx/tickets` | Unified ticket list |
| GET | `/cx/tickets/{id}` | Ticket detail + context |
| POST | `/cx/tickets` | Create ticket (email / WhatsApp / portal) |
| PATCH | `/cx/tickets/{id}` | Update status, assignee, escalation |
| POST | `/cx/tickets/{id}/escalate` | Escalate with agent context attached |
| POST | `/cx/agent/resolve` | First-line resolve attempt (intent + lookups) |
| GET | `/cx/knowledge/search` | RAG / FAQ semantic search |
| GET | `/cx/dashboard` | Volume, resolution rate, complaint patterns |
| POST | `/cx/sentiment` | Sentiment flag for queue priority |

### Commercial — prefix `/commercial`

Rationale: Miguel Torres's leads and client portfolio (`00_CONTEXT.md`); public site form fields (`01_CONTEXT.md`); `uis/website` lead capture.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/commercial/leads` | Information-request form submission |
| GET | `/commercial/leads` | List leads for account managers |
| GET | `/commercial/leads/{id}` | Lead detail |
| GET | `/commercial/clients` | Brand client profiles |
| GET | `/commercial/clients/{id}` | Client detail / contract summary |
| GET | `/commercial/clients/{id}/health` | Renewal risk / health score |
| GET | `/commercial/renewals/alerts` | 90- and 30-day renewal alerts |
| POST | `/commercial/reports/{client_id}` | Trigger client PDF report generation |

**How existing frontends map:**

| Frontend | Domains it would call |
| --- | --- |
| `uis/website` | `/commercial` (leads) |
| `uis/backoffice` | `/warehouse`, `/last-mile` (operations dashboard today); later `/returns`, `/cx`, `/commercial` as modules grow |
| `uis/talent-pipeline-tracker` | External tracker API today (`NEXT_PUBLIC_API_URL`); not one of the five logistics prefixes |
| `uis/website-static-backup` | Same commercial intent as website; backup only |

---

## 4. Research — standard FastAPI project structure

### Conventions found

1. **Split large apps with `APIRouter`**, one module (or package) per feature area; register them from `main.py` via `app.include_router()` with optional `prefix` and `tags`. Official tutorial package layout uses `app/main.py`, shared `dependencies.py`, and `app/routers/*.py`.  
   Source: [Bigger Applications - Multiple Files — FastAPI](https://fastapi.tiangolo.com/tutorial/bigger-applications/)

2. **For multi-domain monoliths, prefer organizing by business domain** (each folder owns `router.py`, `schemas.py`, `models.py`, `service.py`) over a single global `routers/` + `models/` split by technical layer. Layer-by-type layouts work for tiny apps; they do not scale when many domains share one process.  
   Sources: [fastapi-best-practices (zhanymkanov)](https://github.com/zhanymkanov/fastapi-best-practices); [FastAPI Best Practices: Production-Ready Patterns (orchestrator.dev)](https://orchestrator.dev/blog/2025-1-30-fastapi-production-patterns/)

3. **Routers stay thin; business logic lives in services.** Shared config and DB stay at the app root.  
   Same sources as (2); also consistent with the official pattern of keeping `main.py` as the composition root.

4. **CORS is configured once on the FastAPI app** with `CORSMiddleware` and an explicit allow-list of frontend origins (not `*` when credentials are needed).  
   Source: [CORS — FastAPI](https://fastapi.tiangolo.com/tutorial/cors/)

### How this shaped the structure above

- Official docs → single `app/` package, `main.py` as composition root, routers with prefixes/tags.  
- Domain-oriented community practice → `domains/warehouse`, `domains/last_mile`, etc., instead of only `routers/warehouse.py` with models elsewhere. That matches TrackFlow's five named departments and keeps CX able to import last-mile/returns services in-process.  
- CORS docs → one middleware in the centralized app, fed by env-configured origins matching `uis/*` dev ports.

---

## 5. Frontend and backend as separate systems

### Monorepo layout

Per root `README.md` and `uis/README.md`:

- **`uis/`** — anything a human clicks (website, backoffice, portals, dashboards).  
- **`services/`** — APIs and workers.  

They share a git repo and (later) shared types under `packages/` / `shared/`, but they are **separate runtime systems**: different processes, ports, dependency trees, and deploy units. Frontends do not import FastAPI code; they call HTTP.

### How frontends call the API

- Browser or Next.js server code uses `fetch` (or similar) against a base URL.  
- Established pattern in-repo: `uis/talent-pipeline-tracker/lib/api.ts` reads `process.env.NEXT_PUBLIC_API_URL` and requests `${baseUrl}${path}`. New TrackFlow UIs should use the same idea pointing at the company API (e.g. `http://localhost:8000`).  
- `uis/website` (lead form) → `POST /commercial/leads`.  
- `uis/backoffice` (`/operations`) → warehouse and last-mile endpoints as the ops dashboard grows beyond local sample data.

### CORS

Because Next.js apps (e.g. `localhost:3000`) and FastAPI (e.g. `localhost:8000`) are different origins, the API must enable `CORSMiddleware` with an explicit list such as local UI origins and deployed frontend URLs ([FastAPI CORS docs](https://fastapi.tiangolo.com/tutorial/cors/)). Prefer listing origins from config; avoid wildcard + credentials.

### Environment variables

| Side | Mechanism | Examples |
| --- | --- | --- |
| Backend (`services/api/`) | `.env` / `.env.example` loaded into `config.py` (never committed secrets) | `DATABASE_URL`, `CORS_ORIGINS`, `API_PREFIX`, optional auth secrets |
| Frontends (`uis/*`) | `.env.local` / `.env.example` (Next.js: `NEXT_PUBLIC_*` for browser-visible values) | `NEXT_PUBLIC_API_URL=http://localhost:8000` |

Root `.gitignore` already ignores `.env`, `.env.*`, and `!.env.example`, so only examples are shared. Each UI and the API keep their own example files; do not hardcode production URLs in source.

---

## 6. Risks and points of attention

1. **Creating one FastAPI project (or microservice) per department under `services/`**  
   **Consequence:** The CX agent cannot cheaply join shipment + return data; TrackFlow Tech pays distributed-systems cost before the product needs it, against the root README.

2. **Organizing only by technical layer** (`routers/`, `models/`, `schemas/` with no domain folders)  
   **Consequence:** Warehouse and last-mile logic tangle in the same files; ownership blurs; OpenAPI tags and change risk grow as milestones add returns and CX.

3. **Putting API route handlers or business logic inside `uis/` (Next route handlers as the “company API”)**  
   **Consequence:** Backoffice, website, and agents cannot share one source of truth; duplicate validation; agents in `agents/` have no stable HTTP contract.

4. **Skipping CORS and env-based base URLs** (hardcoded localhost in UI, or no `CORSMiddleware`)  
   **Consequence:** Browser calls fail in local multi-port setup; staging/production frontends break when hosts change; secrets risk if env files are committed.

5. **Letting domains call each other only through HTTP to “keep boundaries pure” inside the same app**  
   **Consequence:** Artificial latency and failure modes for in-process needs (e.g. CX resolve → shipment + return lookup), without gaining real isolation.

6. **Ignoring the lead-form and inventory entities already specified in context** when inventing ad-hoc endpoints  
   **Consequence:** `uis/website` and `uis/backoffice` drift from `01_CONTEXT.md` / `02_CONTEXT.md` field names; rework when agents and dashboards expect the briefing's vocabulary.

---

## Summary

TrackFlow should expose **one FastAPI app** at `services/api/`, with **five domain packages** aligned to Warehouse, Last Mile, Reverse Logistics, Customer Experience, and Commercial. Frontends in `uis/` remain separate clients over HTTP with CORS and `NEXT_PUBLIC_API_URL`-style configuration. This matches the root monorepo README, the company's interdependent logistics reality, and the CX agent's need to read orders, shipments, and returns together.
