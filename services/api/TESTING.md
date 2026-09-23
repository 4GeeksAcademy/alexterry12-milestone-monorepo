# Testing — Authentication API (AUTH-088)

## How to run

From `services/api`:

```
uv run pytest            # run every test
uv run pytest --cov      # run every test and print the coverage table
uv run pytest -v         # same, but list each test by name
```

Tests use a throwaway database. They never read or write `suppliers.json`,
and they never send real email.

## Scope

"Every endpoint in the authentication API" is read as every endpoint that
exists because of authentication — not only `app/routers/auth.py` but also
the user and profile routes that depend on a logged-in user. That is 12
endpoints across three routers. Each has at minimum one happy-path, one
edge-case and one failure-mode test.

Tests assert business logic — what the endpoint *decides* — not HTTP
plumbing. A test passes because the right thing happened to the user or the
data, not because the response was JSON.

## Test plan

### `app/routers/auth.py` — `tests/test_auth.py`

| Endpoint | Happy path | Edge case | Failure mode |
|---|---|---|---|
| `POST /auth/login` | correct email + password returns a token | empty password field is rejected, no token issued | wrong password returns 401, no token |
| `GET /auth/me` | valid token returns the caller's email and role | token for a user that has since been deleted is rejected | expired token returns 401 |
| `POST /auth/forgot-password` | known email creates a reset token (email sending is faked) | unknown email returns the same generic response — no hint whether the account exists | malformed email address is rejected |
| `POST /auth/reset-password` | valid reset token sets the new password and the user can log in with it | reusing an already-used reset token is rejected | invalid or expired reset token is rejected |
| `POST /auth/change-password` | correct current password changes it; old password no longer logs in | request with no token returns 401 | wrong current password is rejected and the password is unchanged |

### `app/routers/users.py` — `tests/test_users.py`

| Endpoint | Happy path | Edge case | Failure mode |
|---|---|---|---|
| `POST /users` | creates the user; response contains no password or hash | duplicate email returns 400 | missing password is rejected, no user created |
| `GET /users` | authenticated caller gets the list | no entry in the list contains a password hash | no token returns 401 |
| `GET /users/{user_id}` | caller can fetch their own record | unknown id returns 404 | no token returns 401 |
| `PUT /users/{user_id}` | caller updates their own record | non-admin sending a `role` change gets 403 | updating another user's record as non-admin gets 403 |
| `DELETE /users/{user_id}` | caller deletes self (204) and the linked profile is gone | admin deletes a user, then deletes the same id again — second call returns 404 | deleting another user as non-admin gets 403 |

### `app/routers/profiles.py` — `tests/test_profiles.py`

| Endpoint | Happy path | Edge case | Failure mode |
|---|---|---|---|
| `GET /profiles/me` | returns the caller's own profile | a user whose profile has been deleted gets a clear not-found, not a crash | no token returns 401 |
| `PUT /profiles/me` | updates the caller's profile fields | empty update body leaves the profile unchanged | no token returns 401 |

## Why these cases

- **Tokens are the thing that broke last week.** Expired and
  deleted-user tokens are tested explicitly on `GET /auth/me`.
- **Password hashes must never leave the API.** Checked on create and on
  every list/read response.
- **Ownership rules are business logic.** Self vs. other-user vs. admin on
  update and delete are the decisions most likely to regress silently.
- **Reset tokens are single-use.** Reuse is tested as its own case.

## Coverage results

`uv run pytest --cov` — 36 passed. Coverage on the authentication modules
(target was 70%):

| Module | Coverage |
|---|---|
| `app/routers/auth.py` | 95% |
| `app/routers/users.py` | 98% |
| `app/routers/profiles.py` | 95% |
| `app/dependencies.py` | 100% |
| `app/security.py` | 100% |
| `app/tokens.py` | 84% |
| `app/services/users.py` | 94% |
| `app/services/password_reset.py` | 93% |
| **Whole `app/` package** | **78%** |

`app/database.py` shows 0% because the test suite replaces it with an
in-memory TinyDB before the app loads, so the real file-backed database is
never opened during tests. `incidents.py` and `suppliers.py` are outside the
scope of this ticket.

## AI-assisted workflow

The test plan above was written first, by hand. The AI coding agent was then
given the plan and the real source files and asked to state its approach
before writing code. Three things came out of that review step:

- **A case I planned was unreachable.** The original DELETE edge case was
  "deleting an already-deleted id returns 404". The agent pointed out that a
  self-deleted user's token dies with them, so the second call returns 401
  and can never reach 404. The case was rewritten to use a seeded admin
  deleting another user twice, which also covers the admin branch of the
  ownership rules.
- **A real bug in `PUT /profiles/me`.** See below.
- **A broken dependency.** See below.

Every generated test was reviewed against the plan before being kept.

## Bugs found and fixed

**1. PUT /profiles/me with an empty body wiped the profile.**
update_profile wrote payload.model_dump() straight into TinyDB, and
ProfileCreate defaults every field to None, so an empty body overwrote
name, phone and address with null. Found by
test_update_my_profile_edge_empty_body, which was left failing as evidence
until the fix. Fix: model_dump(exclude_unset=True) in app/services/users.py,
so only the fields the caller actually sent are written.

**2. Password hashing was broken in the installed environment.**
pyproject.toml listed both passlib[bcrypt] and libpass[bcrypt], which
install the same passlib module. The unmaintained passlib 1.7.4 was winning
and cannot work with bcrypt 5, so every hash_password call raised. Found
when the agent's first attempt to run the suite hit HTTP 400 on every
registration. Fix: removed passlib[bcrypt] from pyproject.toml, keeping
libpass. Verified afterwards with a real registration and login through
/docs.
