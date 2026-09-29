# TrackFlow Telemetry Plan

## 1. Purpose

TrackFlow needs an inventory event stream that Ana (Head of Warehouse Operations) can use to staff Los Angeles and Zaragoza and to catch dispatch bottlenecks and stockouts during a shift, and that Thomas (CEO) can aggregate into a US-versus-Spain view by warehouse, B2B client, and country. Stock is never a writable column: `services/api/app/models.py` stores `sku`, `stock_entry`, and `stock_exit`, and `services/api/app/routers/inventory.py` computes stock in `_current_stock` as entries minus exits. This plan defines the events that make those movements, the rejections around them, and the authentication and failure signals that explain who acted, traceable to a TinyDB user id, without carrying recipient, carrier, or tracking-number data.

## 2. Event envelope

Every event uses this envelope. `source` is `api` when the FastAPI process emits the event and `backoffice` when the browser emits it. `sessionId` is the UUID the backoffice creates in `uis/backoffice/app/login/page.tsx` `handleSubmit` after a successful `login` call and sends as `X-Session-ID`. It is null when that header is absent (a non-browser caller, or a future server job). `userId` is the TinyDB user `id` (`services/api/app/schemas.py` `User.id`). It is null when the user is unknown. `requestId` is `X-Request-ID`: the backoffice generates one UUID per API call in `uis/backoffice/lib/authApi.ts` alongside `authHeaders` / `bearerHeaders`, and a new middleware in `services/api/app/main.py` (only `CORSMiddleware` exists today) creates one when the header is missing and returns it on the response. Frontend-only events generate their own `requestId`. `schemaVersion` is the string `1.0.0`.

Shared emit-time mappings, applied before properties are written:

- Warehouse code on `sku.warehouse`, `StockEntry.warehouse`, and `StockExit.warehouse` is `LA` or `ZGZ` (`Warehouse` in `services/api/app/schemas.py`). Emit `LA` as `los_angeles` and `ZGZ` as `zaragoza`.
- `country` is derived from that same code: `LA` to `US`, `ZGZ` to `ES`.
- `client_id` is the interim id until a clients table exists: `sku.client_name` lowercased, with each space replaced by `_`. No other characters are removed. Example: `Acme Beauty` becomes `acme_beauty`. The raw `client_name` is not a property.
- `product_id` is `sku.sku` (the SKU code), not the numeric `sku.id`.
- `product_category` is `sku.category` (`fashion`, `electronics`, or `cosmetics`).

| Name | Type | Required | Description | Example |
| --- | --- | --- | --- | --- |
| eventId | string (UUID v4) | yes | Unique id of this event record | `4f1c2a7e-6b3d-4e1a-9c8f-2a6b0d5e7c31` |
| timestamp | string (ISO 8601 UTC) | yes | When the event was emitted | `2026-09-28T15:41:13.000Z` |
| sessionId | string (UUID) or null | yes | Backoffice session from `X-Session-ID`; null if there is no backoffice session | `9b2e4c1a-0d5f-4a7b-8c3e-1f6a2d4b5e70` |
| userId | string or null | yes | TinyDB user id; null when unknown | `6d8c1e2a-3b4f-4c5d-9e7a-8b1c2d3e4f50` |
| event_type | string | yes | `entity_action`, snake_case, past-tense verb | `inbound_order_created` |
| schemaVersion | string | yes | Always `1.0.0` | `1.0.0` |
| requestId | string (UUID) | yes | Joins the backoffice call, the API, and logs | `1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d` |
| source | string | yes | `api` or `backoffice` | `api` |
| properties | object | yes | Event-specific allowlist. Unknown keys are invalid | `{"warehouse":"los_angeles","country":"US","client_id":"acme_beauty","product_id":"SKU-100","product_category":"fashion","quantity":20}` |

## 3. Inventory flow map

There is no inbound or outbound page in the backoffice. `uis/backoffice/app/operations/page.tsx` `OperationsPage` only renders sample products through `filterLowStockProducts` and is not an inventory write path. The completed-order path is login, then authenticated calls to `services/api/app/routers/inventory.py`.

1. `login_succeeded` — `services/api/app/routers/auth.py` `_authenticate_and_issue_token`, called by `login`. `uis/backoffice/app/login/page.tsx` `handleSubmit` then stores the access token and mints `sessionId`.
2. `page_viewed` — the first one is the redirect `router.push("/")` inside that same `handleSubmit`. Later backoffice route changes emit from `uis/backoffice/app/layout.tsx` (no route listener exists there today).
3. `inbound_order_created` — `services/api/app/routers/inventory.py` `create_inbound_order`, after the `StockEntry` insert and commit.
4. `outbound_order_rejected` — `services/api/app/routers/inventory.py` `create_outbound_order`, when `payload.quantity > available` from `_current_stock`, HTTP 400, before any `StockExit` insert.
5. `outbound_order_created` — `create_outbound_order`, after the `StockExit` insert and commit, only when `payload.exit_type` is `dispatch`.
6. `stock_loss_recorded` — `create_outbound_order`, after the `StockExit` insert and commit, only when `payload.exit_type` is `loss`.
7. `stock_threshold_triggered` — `create_outbound_order`, after a successful `StockExit` insert (dispatch or loss), when stock was `>= min_stock_threshold` before the insert and `< min_stock_threshold` after it. DEPENDENCY: `min_stock_threshold` is not on `SKU`.

Adjacent to this path, not part of a successful order: `direct_stock_edit_rejected` (section 5) and `product_created` from `create_product`.

## 4. Event catalogue

| event_type | category | classification | stream/batch |
| --- | --- | --- | --- |
| inbound_order_created | business | mandatory | batch |
| outbound_order_created | business | mandatory | stream |
| stock_threshold_triggered | business | mandatory | stream |
| direct_stock_edit_rejected | business | mandatory | stream |
| inventory_discrepancy_detected | business | mandatory | batch |
| product_created | business | identified_opportunity | batch |
| outbound_order_rejected | business | identified_opportunity | stream |
| stock_loss_recorded | business | identified_opportunity | stream |
| order_validation_failed | business | identified_opportunity | batch |
| login_succeeded | authentication | identified_opportunity | batch |
| login_failed | authentication | identified_opportunity | stream |
| session_expired | authentication | identified_opportunity | batch |
| user_registered | authentication | identified_opportunity | batch |
| password_reset_requested | authentication | identified_opportunity | stream |
| password_reset_completed | authentication | identified_opportunity | stream |
| password_changed | authentication | identified_opportunity | stream |
| api_latency_recorded | performance | identified_opportunity | batch; slow requests stream |
| page_load_recorded | performance | identified_opportunity | batch |
| api_error_occurred | errors | identified_opportunity | stream |
| frontend_error_occurred | errors | identified_opportunity | stream |
| page_viewed | navigation | identified_opportunity | batch |
| form_abandoned | navigation | identified_opportunity | batch |

## 5. Events

Inventory business events carry `warehouse`, `country`, `client_id`, `product_id`, `product_category`, and `quantity` using the mappings in section 2. `tracking_number` on `StockExit` is never copied. `StockEntry.reference` is free text and is not a property.

### inbound_order_created

We capture an inbound receipt because we need to know how much volume arrives, by client and warehouse, which allows Ana to plan warehouse capacity and staffing.

- Classification: mandatory. Category: business.
- Fires when: `create_inbound_order` has committed a `StockEntry`.
- Emitted from: `services/api/app/routers/inventory.py` `create_inbound_order`. `source`: `api`. `userId`: `current_user.id`.
- Stream or batch: batch. Staffing is planned from volume over the shift, not from a single receipt.
- PII/sensitive: no. No recipient, carrier, tracking number, or raw `client_name`.

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| warehouse | string enum `los_angeles`, `zaragoza` | required | Mapped warehouse of the `StockEntry` |
| country | string enum `US`, `ES` | required | `US` for Los Angeles, `ES` for Zaragoza |
| client_id | string | required | Slug of `sku.client_name` |
| product_id | string | required | `sku.sku` |
| product_category | string enum `fashion`, `electronics`, `cosmetics` | required | `sku.category` |
| quantity | integer, minimum 1 | required | `StockEntry.quantity` received |

### outbound_order_created

We capture a completed dispatch because we need to know how many orders each client and warehouse finish, and how fast, which allows Ana to detect bottlenecks before they miss a delivery SLA.

- Classification: mandatory. Category: business.
- Fires when: `create_outbound_order` has committed a `StockExit` and `exit_type` is `dispatch`. A `loss` exit does not emit this event.
- Emitted from: `services/api/app/routers/inventory.py` `create_outbound_order`. `source`: `api`. `userId`: `current_user.id`.
- Stream or batch: stream. The processing rate has to be current during the shift to see a bottleneck in time to act.
- PII/sensitive: no. `tracking_number` is excluded.

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| warehouse | string enum `los_angeles`, `zaragoza` | required | Mapped warehouse of the `StockExit` |
| country | string enum `US`, `ES` | required | Country for the US/Spain comparison |
| client_id | string | required | Slug of `sku.client_name` |
| product_id | string | required | `sku.sku` |
| product_category | string enum `fashion`, `electronics`, `cosmetics` | required | `sku.category` |
| quantity | integer, minimum 1 | required | Dispatched `StockExit.quantity` |

### stock_threshold_triggered

We capture a threshold crossing because we need to know how often a client runs out of available stock for a SKU, which allows Miguel to alert the client and the commercial team before a stockout.

- Classification: mandatory. Category: business.
- Fires when: inside `create_outbound_order`, after the `StockExit` commit, the stock from `_current_stock` before the insert was `>= min_stock_threshold` and the stock after the insert is `< min_stock_threshold`. This applies to both `dispatch` and `loss` exits. It does not fire on the HTTP 400 insufficient-stock branch, because that branch does not insert.
- Emitted from: `services/api/app/routers/inventory.py` `create_outbound_order`. `source`: `api`. `userId`: `current_user.id`.
- Stream or batch: stream. The alert has to go out while the SKU can still be replenished.
- PII/sensitive: no.
- DEPENDENCY: requires a `min_stock_threshold` column on `SKU`. `services/api/app/models.py` has no such column. `minStockThreshold` exists only on the TypeScript `Product` in `src/types/models.ts`, and `filterLowStockProducts` in `src/utils/collections.ts` compares `stockQuantity <= minStockThreshold` for sample data on `OperationsPage`. That TypeScript check is not this event. This event uses a strict crossing to below the threshold.

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| warehouse | string enum `los_angeles`, `zaragoza` | required | Mapped warehouse |
| country | string enum `US`, `ES` | required | Country for the US/Spain comparison |
| client_id | string | required | Slug of `sku.client_name` |
| product_id | string | required | `sku.sku` |
| product_category | string enum `fashion`, `electronics`, `cosmetics` | required | `sku.category` |
| quantity | integer, minimum 1 | required | `StockExit.quantity` that caused the crossing |
| min_stock_threshold | integer, minimum 0 | required | Configured minimum for that SKU |
| stock_before | integer, minimum 0 | required | `_current_stock` before the insert |
| stock_after | integer, minimum 0 | required | `_current_stock` after the insert |

### direct_stock_edit_rejected

We capture a rejected direct stock edit because we need to know whether warehouse staff try to change stock outside an order, which allows us to reinforce training or permissions at the warehouse where it happens most.

- Classification: mandatory. Category: business.
- Fires when: (a) the API returns 405 Method Not Allowed for `PUT`, `PATCH`, or `DELETE` on `/inventory/products/{id}`; (b) a `POST /inventory/products` JSON body contains any of the keys `stock`, `current_stock`, or `quantity`. Case (b) still lets `create_product` continue, because `SKUCreate` in `services/api/app/schemas.py` ignores unknown keys today. `product_created` still fires if the insert commits.
- Emitted from: (a) `services/api/app/main.py` `unhandled_exception_handler`, which already delegates `StarletteHTTPException` to `http_exception_handler`, in a branch for status 405 and that path; (b) new middleware in `services/api/app/main.py` that reads the raw JSON before `SKUCreate` parsing. `create_product` cannot see those keys after parsing. `source`: `api`. `userId`: TinyDB id when `decode_access_token` in `services/api/app/tokens.py` returns an id, otherwise null. For (a), load the `SKU` by the path id when it exists and map its columns; when it does not exist, the inventory properties are null. For (b), map `warehouse`, `client_name`, `sku`, and `category` from the body when they are present and valid; `quantity` is the integer value of the first present key among `quantity`, `current_stock`, and `stock`, or null when that value is not an integer.
- Stream or batch: stream. A traceability bypass has to be visible to the shift lead during the same shift.
- PII/sensitive: no. Field names and one attempted integer are stored. The rest of the body is not.
- DEPENDENCY: this detection does not exist. There is no `PUT`, `PATCH`, or `DELETE` on `/inventory/products`, so a direct edit is FastAPI's 405 today, and extra body keys are silently ignored. The implementer must add the 405 branch and the body-key check.

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| warehouse | `los_angeles` or `zaragoza`, or null | required | Mapped warehouse, or null if it cannot be resolved |
| country | `US` or `ES`, or null | required | Derived country, or null when warehouse is null |
| client_id | string or null | required | Slug of `client_name`, or null |
| product_id | string or null | required | SKU code, or null |
| product_category | `fashion`, `electronics`, or `cosmetics`, or null | required | Category, or null |
| quantity | integer or null | required | Attempted stock integer, or null |
| http_method | string enum `POST`, `PUT`, `PATCH`, `DELETE` | required | Method that was rejected or that carried the forbidden keys |
| trigger | string enum `method_not_allowed`, `forbidden_body_key` | required | `method_not_allowed` for 405; `forbidden_body_key` for the POST body check |
| rejected_keys | array of `stock`, `current_stock`, `quantity` | required | Names of the forbidden keys that were present. Empty for a 405 with none of those keys. Values are not repeated here |

### inventory_discrepancy_detected

We capture a physical-count difference because we need to know which SKUs and warehouses disagree with the floor, which allows Ana to prioritise audits on the SKUs with the highest discrepancy rate.

- Classification: mandatory. Category: business.
- Fires when: a future stock-count action records `counted_quantity` against `system_quantity` from `_current_stock` for that SKU and warehouse, and the two numbers differ.
- Emitted from: the future count handler. No router function records a count today. `source`: `api`. `sessionId`: null when the count is a server job with no `X-Session-ID`. `userId`: the counter's TinyDB id when a user submits the count, otherwise null.
- Stream or batch: batch. Audit priority is a planning decision, not a same-minute intervention.
- PII/sensitive: no.
- DEPENDENCY: requires a stock count feature. None exists. `inventory_discrepancy` in `packages/shared/incident_rules.py` is an incident category label, not a count.

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| warehouse | string enum `los_angeles`, `zaragoza` | required | Warehouse that was counted |
| country | string enum `US`, `ES` | required | Country for the US/Spain comparison |
| client_id | string | required | Slug of `sku.client_name` |
| product_id | string | required | `sku.sku` |
| product_category | string enum `fashion`, `electronics`, `cosmetics` | required | `sku.category` |
| quantity | integer | required | `counted_quantity` minus `system_quantity`. Negative means the floor is short |
| system_quantity | integer, minimum 0 | required | `_current_stock` at count time |
| counted_quantity | integer, minimum 0 | required | Units physically counted |

### product_created

We capture a new SKU because we need to know which client and warehouse catalogues are growing, which allows Ana and Thomas to read inbound and outbound rates against the SKUs that actually exist.

- Classification: identified_opportunity. Category: business.
- Fires when: `create_product` has committed a `SKU`. Initial computed stock is 0.
- Emitted from: `services/api/app/routers/inventory.py` `create_product`. `source`: `api`. `userId`: `current_user.id`.
- Stream or batch: batch. A new catalogue row does not require action within minutes.
- PII/sensitive: no. `sku.name` and raw `client_name` are excluded.

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| warehouse | string enum `los_angeles`, `zaragoza` | required | Mapped `SKU.warehouse` |
| country | string enum `US`, `ES` | required | Country for the US/Spain comparison |
| client_id | string | required | Slug of `client_name` |
| product_id | string | required | `sku.sku` |
| product_category | string enum `fashion`, `electronics`, `cosmetics` | required | `sku.category` |
| quantity | integer, const 0 | required | New SKUs start at computed stock 0 |

### outbound_order_rejected

We capture an insufficient-stock rejection because we need to know which dispatch attempts are blocked and by how much, which allows Ana to treat a hard stock block as a current shift problem rather than waiting for a later stockout alert.

- Classification: identified_opportunity. Category: business.
- Fires when: `create_outbound_order` raises HTTP 400 because `payload.quantity > available`. The detail string in code is `Insufficient stock for SKU '{sku.sku}'. Available: {available}, requested: {payload.quantity}.` No `StockExit` is inserted. This fires for both `dispatch` and `loss` attempts that fail the check.
- Emitted from: `services/api/app/routers/inventory.py` `create_outbound_order`. `source`: `api`. `userId`: `current_user.id`.
- Stream or batch: stream. The pick is blocked now.
- PII/sensitive: no. `tracking_number` is excluded even though `StockExitCreate` carries it.

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| warehouse | string enum `los_angeles`, `zaragoza` | required | Mapped warehouse on the attempt |
| country | string enum `US`, `ES` | required | Country for the US/Spain comparison |
| client_id | string | required | Slug of `sku.client_name` |
| product_id | string | required | `sku.sku` |
| product_category | string enum `fashion`, `electronics`, `cosmetics` | required | `sku.category` |
| quantity | integer, minimum 1 | required | Same number as `requested_quantity` |
| requested_quantity | integer, minimum 1 | required | `payload.quantity` |
| available_quantity | integer, minimum 0 | required | `_current_stock` at rejection time |

### stock_loss_recorded

We capture a loss exit because we need to know when stock left the building without a dispatch, which allows Ana to investigate shrinkage during the shift.

- Classification: identified_opportunity. Category: business.
- Fires when: `create_outbound_order` has committed a `StockExit` and `exit_type` is `loss`.
- Emitted from: `services/api/app/routers/inventory.py` `create_outbound_order`. `source`: `api`. `userId`: `current_user.id`.
- Stream or batch: stream. A recorded loss is an exception to check while the shift still has the context.
- PII/sensitive: no. `tracking_number` is excluded. For `loss`, `StockExitCreate.tracking_number_must_match_exit_type` already requires it to be null.

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| warehouse | string enum `los_angeles`, `zaragoza` | required | Mapped warehouse of the loss |
| country | string enum `US`, `ES` | required | Country for the US/Spain comparison |
| client_id | string | required | Slug of `sku.client_name` |
| product_id | string | required | `sku.sku` |
| product_category | string enum `fashion`, `electronics`, `cosmetics` | required | `sku.category` |
| quantity | integer, minimum 1 | required | `StockExit.quantity` written off |

### order_validation_failed

We capture inventory validation failures because we need to know which routes and fields the API rejects, which allows us to fix the backoffice forms that send invalid inventory payloads. Submitted values are not part of that decision.

- Classification: identified_opportunity. Category: business.
- Fires when: a request under `/inventory` fails Pydantic validation and the handler returns the standard 422 from `request_validation_exception_handler`. This includes `StockExitCreate.tracking_number_must_match_exit_type` in `services/api/app/schemas.py`.
- Emitted from: `services/api/app/main.py` `unhandled_exception_handler`, in the `RequestValidationError` branch, before it delegates. `source`: `api`. `userId`: from `decode_access_token` when the bearer token decodes, otherwise null.
- Stream or batch: batch. Field-level 422s are corrected in a form release, not by paging a warehouse lead.
- PII/sensitive: no submitted values. `field_names` are locations only (`loc` entries that are neither `body` nor an array index). `input` and `ctx` from the validation error are dropped. This event does not carry the inventory dimension properties, because those would be copies of the rejected body.

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| route | string | required | Route template, such as `/inventory/orders/outbound` |
| field_names | array of strings | required | Invalid field names only. May be empty if `loc` has no field |

### login_succeeded

We capture a successful login because we need to know which staff sessions start, which allows us to attribute later inventory events to a person and a session.

- Classification: identified_opportunity. Category: authentication.
- Fires when: `_authenticate_and_issue_token` is about to return a `TokenResponse`. The same function serves `login` and `login_for_swagger`.
- Emitted from: `services/api/app/routers/auth.py` `_authenticate_and_issue_token`. `source`: `api`. `userId`: `user.id`. `sessionId`: the `X-Session-ID` header if `login` was called from the backoffice; `login_for_swagger` usually has none, so null.
- Stream or batch: batch. A normal sign-in is reviewed as an audit trail, not handled as an incident.
- PII/sensitive: no. Email and password are not properties. `role` is the staff role already stored on the TinyDB user.

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| role | string enum `admin`, `manager`, `user` | required | `User.role` of the authenticated user |

### login_failed

We capture a failed login because we need to know every rejected attempt, which allows us to see password guessing against staff accounts while it is happening.

- Classification: identified_opportunity. Category: authentication.
- Fires when: `_authenticate_and_issue_token` raises HTTP 401 with detail `Invalid email or password`. That is both the missing-or-inactive user branch and the `verify_password` failure branch.
- Emitted from: `services/api/app/routers/auth.py` `_authenticate_and_issue_token`. `source`: `api`. `userId`: null for every failure, including a wrong password for a known email. `sessionId`: null.
- Stream or batch: stream. Security needs each attempt as it happens. This event is not throttled.
- PII/sensitive: yes, the email is sensitive. It is stored only as `email_hash`: SHA-256 hex of the UTF-8 bytes of the lowercased email concatenated with the server salt in env var `TELEMETRY_HASH_SALT`. The raw email, the salt, and the password are not properties.

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| email_hash | string | required | 64-character lowercase hex SHA-256, as defined above |

### session_expired

We capture bearer rejections because we need to know how often staff hit a dead session, which allows us to see whether `ACCESS_TOKEN_EXPIRE_MINUTES` is cutting off warehouse work.

- Classification: identified_opportunity. Category: authentication.
- Fires when: `get_current_user` raises HTTP 401 with detail `Could not validate credentials`. `decode_access_token` returns null for an expired token and for any other `JWTError`, and `get_current_user` uses the same 401 when the user is missing or `is_active` is false. Those cases share one handler, so this event covers all of them.
- Emitted from: `services/api/app/dependencies.py` `get_current_user`. `source`: `api`. `userId`: the TinyDB id when the token decoded and the user row exists but is inactive; null when `decode_access_token` returns null.
- Stream or batch: batch. Expiry is expected at the end of `create_access_token`'s `exp` claim. The decision is a policy review, not a per-request page.
- PII/sensitive: no. The bearer token is not a property.

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| route_template | string | required | Path template of the request that failed authentication |
| method | string | required | HTTP method |

### user_registered

We capture registration because we need to know when a new staff account exists, which allows an admin to review accounts that were created outside a normal provisioning step.

- Classification: identified_opportunity. Category: authentication.
- Fires when: `register_user` has returned after `create_user` inserts the TinyDB user and profile.
- Emitted from: `services/api/app/routers/users.py` `register_user`. `source`: `api`. `userId`: the new user's id. `sessionId`: null on this public route unless `X-Session-ID` was sent.
- Stream or batch: batch. Account review is periodic.
- PII/sensitive: no. `UserCreate` email, password, name, phone, and address are not properties.

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| — | — | — | No properties. `additionalProperties` is false |

### password_reset_requested

We capture a reset request because we need to know the volume of reset attempts per address hash, which allows us to spot reset abuse without confirming whether the inbox exists.

- Classification: identified_opportunity. Category: authentication.
- Fires when: `forgot_password` has accepted the request. The HTTP response stays the generic message. The event is emitted for every request, whether or not `get_user_by_email` found an active user.
- Emitted from: `services/api/app/routers/auth.py` `forgot_password`. `source`: `api`. `userId`: null. `sessionId`: null.
- Stream or batch: stream. Reset abuse has to be visible while the attempts are still arriving.
- PII/sensitive: yes, the email is sensitive. Same `email_hash` construction as `login_failed`. The reset token and the reset URL are not properties.

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| email_hash | string | required | 64-character lowercase hex SHA-256 of lowercased email plus `TELEMETRY_HASH_SALT` |

### password_reset_completed

We capture a completed reset because we need to know that a staff password actually changed via the reset token, which allows security to distinguish a request from a completed takeover of the account.

- Classification: identified_opportunity. Category: authentication.
- Fires when: `reset_password` has called `set_user_password` and `mark_password_reset_token_used` and is about to return. It does not fire for HTTP 400 `Invalid or expired reset token.`
- Emitted from: `services/api/app/routers/auth.py` `reset_password`. `source`: `api`. `userId`: `token_row.user_id`. `sessionId`: null.
- Stream or batch: stream. A completed password change is a security event for the same shift.
- PII/sensitive: no. The raw token, the token hash, and the new password are not properties.

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| — | — | — | No properties. `additionalProperties` is false |

### password_changed

We capture an authenticated password change because we need to know that the signed-in user replaced their password, which allows security to investigate a change the account owner did not make.

- Classification: identified_opportunity. Category: authentication.
- Fires when: `change_password` has called `set_user_password` after `verify_password` succeeded. It does not fire for HTTP 400 `Current password is incorrect.`
- Emitted from: `services/api/app/routers/auth.py` `change_password`. `source`: `api`. `userId`: `current_user.id`.
- Stream or batch: stream. Same shift as the change.
- PII/sensitive: no. Neither password is a property.

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| — | — | — | No properties. `additionalProperties` is false |

### api_latency_recorded

We capture API latency because we need to know which inventory and auth routes are slow, which allows Ana to tell a warehouse backlog apart from an API that is not answering.

- Classification: identified_opportunity. Category: performance.
- Fires when: the timing middleware closes a minute window, and, separately, when a single request's duration is over 1000 ms.
- Emitted from: new timing middleware in `services/api/app/main.py`. No timing middleware exists; the only middleware is `CORSMiddleware`. `source`: `api`. `userId`: null on the minute aggregate. On a slow request, `userId` is the authenticated TinyDB id when `get_current_user` already resolved one, otherwise null. `sessionId`: from `X-Session-ID` on a slow request; null on the aggregate.
- Stream or batch: the minute aggregate is batch, flushed at the end of each clock minute. Each request over 1000 ms is stream, because a multi-second inventory call is blocking a picker now.
- PII/sensitive: no. No query string, no body, no path parameters (use the template).
- DEPENDENCY: the timing middleware does not exist yet.

Minute aggregate (`record_kind` = `minute_aggregate`), one event per `route_template` and `method` per minute:

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| record_kind | const `minute_aggregate` | required | Marks the aggregate shape |
| route_template | string | required | Path template, not the raw path |
| method | string | required | HTTP method. Aggregates are split by method so GET and POST are not mixed |
| count | integer, minimum 1 | required | Requests in the minute |
| p50_ms | number, minimum 0 | required | 50th percentile duration in that minute |
| p95_ms | number, minimum 0 | required | 95th percentile duration in that minute |
| window_start | string (ISO 8601 UTC) | required | Start of the minute |

Slow request (`record_kind` = `slow_request`), only when `duration_ms` is greater than 1000:

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| record_kind | const `slow_request` | required | Marks the single slow request |
| route_template | string | required | Path template |
| method | string | required | HTTP method |
| status_code | integer | required | Response status |
| duration_ms | number, minimum 1000 | required | Elapsed milliseconds |

### page_load_recorded

We capture backoffice page load time because we need to know which screens are slow to open, which allows us to fix the pages staff actually wait on.

- Classification: identified_opportunity. Category: performance.
- Fires when: a backoffice navigation finishes loading. One sample per completed navigation.
- Emitted from: `uis/backoffice/app/layout.tsx` (client instrumentation to be added). `source`: `backoffice`. `userId`: the TinyDB id if the session knows it, otherwise null.
- Stream or batch: batch. Page-speed decisions are release decisions.
- PII/sensitive: no. `route` is the path only. Query strings are stripped, including `/reset-password?token=`.

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| route | string | required | Path only, such as `/operations` |
| load_ms | number, minimum 0 | required | Navigation duration in milliseconds |

### api_error_occurred

We capture HTTP 500s because we need to know which route threw, which allows an on-call engineer to start from the route and exception class while the failure is still affecting the floor.

- Classification: identified_opportunity. Category: errors.
- Fires when: `unhandled_exception_handler` is about to return HTTP 500 `{"detail": "An unexpected error occurred."}`.
- Emitted from: `services/api/app/main.py` `unhandled_exception_handler`. `source`: `api`. `userId`: from `decode_access_token` when the bearer token decodes, otherwise null.
- Stream or batch: stream. A 500 on an inventory write stops the warehouse action that triggered it.
- PII/sensitive: no. `error_class` is `type(exc).__name__` only. Stack traces, exception messages, and request bodies are excluded. The existing `logger.exception` call stays in the server log and is not copied into the event.

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| route_template | string | required | Path template |
| method | string | required | HTTP method |
| error_class | string | required | Exception class name |

### frontend_error_occurred

We capture a backoffice render error because we need to know which screen crashed, which allows us to fix a broken shift workflow without collecting the error text.

- Classification: identified_opportunity. Category: errors.
- Fires when: the backoffice error boundary catches a render error.
- Emitted from: `uis/backoffice/app/error.tsx` and `uis/backoffice/app/global-error.tsx`. Neither file exists. No `ErrorBoundary` exists under `uis/`. `source`: `backoffice`.
- Stream or batch: stream, after the dedupe rule in section 6. A crashed screen blocks the person in front of it.
- PII/sensitive: no. `error_name` is the error's `name`. `error_fingerprint` is a SHA-256 hex of `error_name`, the route, and the top stack frame's function name. The message and the rest of the stack are excluded.
- DEPENDENCY: requires adding `uis/backoffice/app/error.tsx` and `uis/backoffice/app/global-error.tsx`.

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| route | string | required | Path only |
| error_name | string | required | `Error.name` |
| error_fingerprint | string | required | 64-character hex fingerprint, as defined above |

### page_viewed

We capture backoffice route changes because we need to know which screens are used, which allows us to see whether staff reach operations, suppliers, and incident pages or stop at login.

- Classification: identified_opportunity. Category: navigation.
- Fires when: the backoffice pathname changes, after the debounce in section 6.
- Emitted from: `uis/backoffice/app/layout.tsx`. `source`: `backoffice`. The routes in scope are `/`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/account/profile`, `/account/change-password`, `/operations`, `/suppliers`, `/incidents`, `/incident-manager`, and `/incident-manager/new`.
- Stream or batch: batch. Navigation is a usage picture, not an alert.
- PII/sensitive: no. Query strings are never included.

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| route | string | required | Path only |

### form_abandoned

We capture an abandoned form because we need to know which backoffice forms are started and left, which allows us to fix the forms that block registration, login, and supplier or incident entry.

- Classification: identified_opportunity. Category: navigation.
- Fires when: an input inside the form received focus and the user navigates away without a successful submit.
- Emitted from: the page that owns the form, on unmount, beside the existing submit handler. `source`: `backoffice`.
  - `uis/backoffice/app/login/page.tsx` `handleSubmit` — `form_name` `login`
  - `uis/backoffice/app/register/page.tsx` `handleSubmit` — `register`
  - `uis/backoffice/app/forgot-password/page.tsx` `handleSubmit` — `forgot_password`
  - `uis/backoffice/app/reset-password/page.tsx` `handleSubmit` — `reset_password`
  - `uis/backoffice/app/account/profile/page.tsx` `handleSubmit` — `profile`
  - `uis/backoffice/app/account/change-password/page.tsx` `handleSubmit` — `change_password`
  - `uis/backoffice/app/suppliers/page.tsx` `onCreate` — `supplier_create`
  - `uis/backoffice/app/incident-manager/new/page.tsx` `onSubmit` — `incident_create`
- Stream or batch: batch. Form friction is a design backlog item.
- PII/sensitive: no. Field values are not stored. `fields_touched_count` is a count.

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| form_name | string enum `login`, `register`, `forgot_password`, `reset_password`, `profile`, `change_password`, `supplier_create`, `incident_create` | required | Which form was left |
| route | string | required | Path only |
| fields_touched_count | integer, minimum 0 | required | How many fields received input. Not their names or values |

## 6. Delivery strategy

Stream events are sent as soon as they fire. Someone must act during the current shift: a blocked or completed dispatch, a threshold alert, a traceability bypass, a loss, a 500, a crashed screen, a failed login, or a password change. Batch events are for staffing, audit priority, catalogue growth, usage, and latency baselines. Batch events flush every 15 minutes and again on process shutdown. Fifteen minutes is inside one warehouse shift, which is the cadence Ana uses to move people, and it is enough for Thomas's country comparison, which is not a minute-by-minute decision.

High-frequency rules:

- `api_latency_recorded` is aggregated per route template and HTTP method per clock minute, with `count`, `p50_ms`, and `p95_ms`. In addition, every request whose duration is over 1000 ms is sent individually as `record_kind` `slow_request`. Requests at or under 1000 ms are not sent one by one.
- `page_viewed` is debounced to one event per route per `sessionId` per 5 seconds.
- `frontend_error_occurred` is deduplicated by `error_fingerprint` per `sessionId` per minute.
- `login_failed` is not throttled. Every attempt is kept.

`page_load_recorded` is already one sample per completed navigation and has no extra throttle.

## 7. Risks and exclusions

Events considered and discarded:

- `product_viewed` on every `GET /inventory/products` and `GET /inventory/products/{id}` (`list_products`, `get_product`). Those reads are high volume and do not change a staffing or SLA decision. The catalogue uses `product_created` and the order events instead.
- Per-keystroke form tracking. `form_abandoned` stores a touched count, not keys or characters. Keystrokes would collect passwords, emails, and profile text.
- A raw latency event for every request. Replaced by the minute aggregate plus the over-1000 ms exceptions.
- Full request bodies. `order_validation_failed` keeps field names only. `direct_stock_edit_rejected` keeps forbidden key names and at most one integer.
- IP addresses. They are not required for Ana's or Thomas's decisions and they identify a network.
- `tracking_number`, carrier data, and package-recipient data. `outbound_order_created`, `outbound_order_rejected`, and `stock_loss_recorded` omit `tracking_number`. No event has a carrier or a recipient.
- Profile `name`, `phone`, and `address` from `PUT /profiles/me` (`update_my_profile` in `services/api/app/routers/profiles.py`) and from `UserCreate`. `user_registered` has no properties.
- `uis/talent-pipeline-tracker` and `uis/website`. They are out of scope for the inventory backoffice. No candidate, application, or marketing events are in this plan.
- `StockEntry.reference` and `sku.name`. Free text and product titles are not needed to aggregate by warehouse, client, and country.

Known gaps in the repo, which this plan does not pretend are already implemented:

- No clients table. `client_id` is a slug of `sku.client_name` until one exists. There is no `client_id` column.
- No `min_stock_threshold` on `SKU`. `stock_threshold_triggered` cannot fire until that column exists. The TypeScript `minStockThreshold` path is sample data on `OperationsPage`.
- No physical count or audit write path. `inventory_discrepancy_detected` has no function to emit from yet.
- No `uis/backoffice/app/error.tsx`, no `global-error.tsx`, and no `ErrorBoundary`. `frontend_error_occurred` waits on those files.
- No request id and no analytics client. The only middleware is `CORSMiddleware` in `services/api/app/main.py`. `requestId` depends on new middleware plus a header from `uis/backoffice/lib/authApi.ts`.
- Direct stock-edit detection does not exist. 405 is the framework default, and `SKUCreate` drops `stock`, `current_stock`, and `quantity`.

## 8. Summary counts

- Total events: 22
- Mandatory: 5 (`inbound_order_created`, `outbound_order_created`, `stock_threshold_triggered`, `direct_stock_edit_rejected`, `inventory_discrepancy_detected`)
- Identified opportunity: 17
- Categories covered: business, authentication, performance, errors, navigation (5)
