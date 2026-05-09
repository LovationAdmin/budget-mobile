# Backend patch — mobile endpoints

Files in this folder are ready-to-drop additions to **`lovationadmin/budget-api`** that unlock:

1. **`POST /auth/mobile/login`** — same as `/auth/login` but returns `refresh_token` in the JSON body (no `Set-Cookie`). Mobile clients store it in Expo SecureStore.
2. **`POST /auth/mobile/refresh`** — accepts `{ refresh_token }` in body, returns a new pair. Same rotation + reuse-detection as the cookie version.
3. **`POST /auth/mobile/logout`** — revokes the refresh token sent in body.
4. **`POST /auth/magic-link/request`** + **`POST /auth/magic-link/verify`** — passwordless sign-in via emailed token. Token TTL 15 minutes, single-use.
5. **`POST /user/devices`** + **`GET /user/devices`** + **`DELETE /user/devices`** — registers an Expo push token per device. The mobile app calls this on every login.
6. **`POST /user/devices/push`** — internal helper to fan-out an Expo push notification to a user's devices (used by the budget service when invitations / member changes happen).

## How to apply

From a fresh checkout of `budget-api`, on the branch `claude/integrate-oracle-postiz-FpWcK`:

```bash
# 1. Copy files from this patch folder into the budget-api repo
cp handlers/auth_mobile.go      ../budget-api/handlers/
cp handlers/auth_magic_link.go  ../budget-api/handlers/
cp handlers/devices.go          ../budget-api/handlers/
cp services/push_service.go     ../budget-api/services/
cp services/email_magic_link.go ../budget-api/services/
cp models/devices.go            ../budget-api/models/

# 2. Apply the routes.go diff
patch -p1 -d ../budget-api < routes.go.patch

# 3. Apply the schema migration (additive, idempotent)
psql "$DATABASE_URL" -f schema.sql

# 4. Build & test
cd ../budget-api && go build ./... && go test ./...
```

## What still needs human attention

- The fan-out logic in `services/push_service.go` is best-effort; it doesn't queue / retry. Wire it from `services/budget.go` events (member added, charge added, etc.) when you're ready to push notifications for collaborative events.
- `POST /auth/magic-link/verify` returns the same `LoginResponse` shape as mobile login. The frontend stores the access+refresh tokens identically — no special path needed.
- All new endpoints are rate-limited via the existing middleware aliases (`SignupRateLimit`, `RefreshRateLimit`, etc). Adjust if you want stricter limits for magic-link requests (recommend: 5/hour/email).
- `email_magic_link.go` calls `utils.SendEmail`; if you don't already have a generic helper exposed, replicate the pattern from `utils/email.go::SendVerificationEmail`.

## Schema additions

Two new tables are added (in `schema.sql`):

```sql
CREATE TABLE magic_link_tokens (
  token       TEXT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address  TEXT,
  user_agent  TEXT
);
CREATE INDEX idx_magic_link_user ON magic_link_tokens(user_id);
CREATE INDEX idx_magic_link_expires ON magic_link_tokens(expires_at);

CREATE TABLE user_devices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL UNIQUE,
  platform        TEXT NOT NULL CHECK (platform IN ('ios','android')),
  app_version     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_user_devices_user ON user_devices(user_id);
```

Cleanup of expired magic-link tokens is also added to `scheduleCacheCleaning` in `main.go` — see `main.go.patch`.
