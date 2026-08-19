import { query } from "./db";

export async function migrate() {
  await query(`
    CREATE TABLE IF NOT EXISTS operators (
      id UUID PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('guest_wall', 'ride_ops', 'supervisor', 'flash_pass')),
      site_code TEXT,
      unit_code TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS attractions (
      id UUID PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      site_code TEXT NOT NULL,
      unit_code TEXT NOT NULL,
      assigned_operator_id UUID REFERENCES operators(id),
      queue_capacity INTEGER NOT NULL DEFAULT 0,
      stale_after_seconds INTEGER NOT NULL DEFAULT 180,
      internal_notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS status_snapshots (
      id UUID PRIMARY KEY,
      attraction_id UUID NOT NULL REFERENCES attractions(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      wait_minutes INTEGER,
      trains_on_track INTEGER,
      hold_reason TEXT,
      reported_by_id UUID REFERENCES operators(id),
      captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      is_current BOOLEAN NOT NULL DEFAULT TRUE
    );

    CREATE INDEX IF NOT EXISTS status_snapshots_current_idx
      ON status_snapshots (attraction_id)
      WHERE is_current;

    CREATE TABLE IF NOT EXISTS events (
      id UUID PRIMARY KEY,
      attraction_id UUID REFERENCES attractions(id) ON DELETE SET NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      actor_id UUID REFERENCES operators(id),
      occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS events_occurred_idx ON events (occurred_at DESC);

    CREATE TABLE IF NOT EXISTS watchers (
      id UUID PRIMARY KEY,
      operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
      session_id TEXT NOT NULL,
      attraction_id UUID REFERENCES attractions(id) ON DELETE CASCADE,
      site_code TEXT,
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (operator_id, session_id)
    );

    ALTER TABLE operators DROP CONSTRAINT IF EXISTS operators_role_check;
    ALTER TABLE operators ADD CONSTRAINT operators_role_check
      CHECK (role IN ('guest_wall', 'ride_ops', 'supervisor', 'flash_pass'));

    ALTER TABLE attractions ADD COLUMN IF NOT EXISTS flash_pass_eligible BOOLEAN NOT NULL DEFAULT FALSE;
    UPDATE attractions
      SET flash_pass_eligible = TRUE
      WHERE kind IN ('coaster', 'water', 'flat', 'family', 'transport');

    CREATE TABLE IF NOT EXISTS line_reservations (
      id UUID PRIMARY KEY,
      attraction_id UUID NOT NULL REFERENCES attractions(id) ON DELETE CASCADE,
      holder_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
      status TEXT NOT NULL CHECK (status IN ('held', 'called', 'cancelled', 'expired', 'redeemed')),
      party_size INTEGER NOT NULL DEFAULT 1,
      return_start_at TIMESTAMPTZ NOT NULL,
      return_end_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS line_reservations_active_idx
      ON line_reservations (attraction_id, holder_id)
      WHERE status IN ('held', 'called');
  `);
}
