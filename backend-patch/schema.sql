-- ============================================================================
-- backend-patch/schema.sql
-- ============================================================================
-- Adds the two tables required by the mobile endpoints. Idempotent.
-- Run via:  psql "$DATABASE_URL" -f schema.sql
-- ============================================================================

-- Magic link sign-in tokens (single-use, 15min TTL).
CREATE TABLE IF NOT EXISTS magic_link_tokens (
  token        TEXT        PRIMARY KEY,                -- SHA-256 hash
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at   TIMESTAMPTZ NOT NULL,
  used_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address   TEXT,
  user_agent   TEXT
);

CREATE INDEX IF NOT EXISTS idx_magic_link_user    ON magic_link_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_magic_link_expires ON magic_link_tokens(expires_at);

-- Per-install Expo push tokens.
CREATE TABLE IF NOT EXISTS user_devices (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expo_push_token TEXT        NOT NULL UNIQUE,
  platform        TEXT        NOT NULL CHECK (platform IN ('ios','android')),
  app_version     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_devices_user ON user_devices(user_id);
