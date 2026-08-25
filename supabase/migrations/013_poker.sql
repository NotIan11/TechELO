-- ============================================================
-- 013: Poker money tracking
--
-- Adds:
--  * users.poker_officer flag (set by hand; gates official tournaments + sponsors)
--  * poker_sessions / poker_entries (cash games + tournaments, live-session model)
--  * poker_sponsors / poker_session_sponsors (reusable sponsor library)
--  * poker_rsvps (official tournament "I'm in" list)
--  * poker_counted_entries view: the single definition of "what counts"
--  * SECURITY DEFINER RPCs for every write (no direct INSERT/UPDATE/DELETE)
--  * get_poker_leaderboard / get_poker_leaderboard_count
--  * sponsor-logos storage bucket + policies
--
-- Same security model as 012: public SELECT, all writes through RPCs that
-- lock rows, check auth.uid(), and raise stable uppercase error codes.
-- Lock order is always session row first, then entry row.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Enums + users flag
-- ------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'poker_session_kind') THEN
        CREATE TYPE poker_session_kind AS ENUM ('cash', 'tournament');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'poker_session_status') THEN
        CREATE TYPE poker_session_status AS ENUM ('scheduled', 'live', 'final', 'disputed', 'voided');
    END IF;
END $$;

ALTER TABLE users ADD COLUMN IF NOT EXISTS poker_officer BOOLEAN NOT NULL DEFAULT FALSE;

-- ------------------------------------------------------------
-- 2. Tables
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS poker_sponsors (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
    logo_url    TEXT,
    website_url TEXT CHECK (website_url IS NULL OR char_length(website_url) <= 300),
    created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS poker_sessions (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind                  poker_session_kind NOT NULL,
    host_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title                 TEXT CHECK (title IS NULL OR char_length(title) BETWEEN 1 AND 80),
    location              TEXT CHECK (location IS NULL OR char_length(location) <= 80),
    notes                 TEXT CHECK (notes IS NULL OR char_length(notes) <= 1000),
    stakes                TEXT CHECK (stakes IS NULL OR char_length(stakes) <= 30),
    variant               TEXT CHECK (variant IS NULL OR char_length(variant) <= 30),
    is_official           BOOLEAN NOT NULL DEFAULT FALSE,
    scheduled_for         TIMESTAMPTZ,
    started_at            TIMESTAMPTZ,
    ended_at              TIMESTAMPTZ,
    played_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duration_minutes      INTEGER CHECK (duration_minutes IS NULL OR duration_minutes BETWEEN 1 AND 4320),
    standard_buy_in_cents INTEGER CHECK (standard_buy_in_cents IS NULL OR standard_buy_in_cents BETWEEN 0 AND 10000000),
    prize_pool_cents      INTEGER CHECK (prize_pool_cents IS NULL OR prize_pool_cents BETWEEN 0 AND 10000000),
    status                poker_session_status NOT NULL DEFAULT 'live',
    version               INTEGER NOT NULL DEFAULT 1,

    -- Denormalized; maintained by poker_refresh_session() via triggers
    player_count          INTEGER NOT NULL DEFAULT 0,
    ack_count             INTEGER NOT NULL DEFAULT 0,
    dispute_count         INTEGER NOT NULL DEFAULT 0,
    total_buy_in_cents    BIGINT  NOT NULL DEFAULT 0,
    total_cash_out_cents  BIGINT  NOT NULL DEFAULT 0,
    discrepancy_cents     BIGINT GENERATED ALWAYS AS
                            (total_cash_out_cents - COALESCE(prize_pool_cents, total_buy_in_cents)) STORED,
    rsvp_count            INTEGER NOT NULL DEFAULT 0,

    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finalized_at          TIMESTAMPTZ,
    voided_at             TIMESTAMPTZ,

    CHECK (NOT is_official OR kind = 'tournament'),
    CHECK (status <> 'scheduled' OR is_official),
    CHECK (prize_pool_cents IS NULL OR kind = 'tournament'),
    CHECK ((status = 'voided') = (voided_at IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_poker_sessions_played_at ON poker_sessions (played_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_poker_sessions_host_id   ON poker_sessions (host_id);
CREATE INDEX IF NOT EXISTS idx_poker_sessions_status    ON poker_sessions (status);
-- One live session per host
CREATE UNIQUE INDEX IF NOT EXISTS idx_poker_sessions_one_live_per_host
    ON poker_sessions (host_id) WHERE status = 'live';

CREATE TABLE IF NOT EXISTS poker_session_sponsors (
    session_id UUID NOT NULL REFERENCES poker_sessions(id) ON DELETE CASCADE,
    sponsor_id UUID NOT NULL REFERENCES poker_sponsors(id) ON DELETE RESTRICT,
    position   INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (session_id, sponsor_id)
);

CREATE TABLE IF NOT EXISTS poker_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL REFERENCES poker_sessions(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    buy_in_cents    INTEGER NOT NULL DEFAULT 0 CHECK (buy_in_cents BETWEEN 0 AND 10000000),
    -- NULL while a live cash game hasn't recorded the cash-out yet
    cash_out_cents  INTEGER CHECK (cash_out_cents IS NULL OR cash_out_cents BETWEEN 0 AND 10000000),
    rebuy_count     INTEGER NOT NULL DEFAULT 0 CHECK (rebuy_count BETWEEN 0 AND 100),
    net_cents       INTEGER GENERATED ALWAYS AS (COALESCE(cash_out_cents, 0) - buy_in_cents) STORED,
    finish_place    INTEGER CHECK (finish_place IS NULL OR finish_place >= 1),
    acknowledged_at TIMESTAMPTZ,
    disputed_at     TIMESTAMPTZ,
    dispute_reason  TEXT CHECK (dispute_reason IS NULL OR char_length(dispute_reason) BETWEEN 1 AND 500),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (session_id, user_id),
    CHECK (NOT (acknowledged_at IS NOT NULL AND disputed_at IS NOT NULL)),
    CHECK ((disputed_at IS NULL) = (dispute_reason IS NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_poker_entries_session_place
    ON poker_entries (session_id, finish_place) WHERE finish_place IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_poker_entries_user_id    ON poker_entries (user_id);
CREATE INDEX IF NOT EXISTS idx_poker_entries_session_id ON poker_entries (session_id);
-- Inbox: entries still waiting on the player
CREATE INDEX IF NOT EXISTS idx_poker_entries_pending
    ON poker_entries (user_id) WHERE acknowledged_at IS NULL AND disputed_at IS NULL;

CREATE TABLE IF NOT EXISTS poker_rsvps (
    session_id UUID NOT NULL REFERENCES poker_sessions(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (session_id, user_id)
);

-- ------------------------------------------------------------
-- 3. RLS: public reads, no direct writes
-- ------------------------------------------------------------

ALTER TABLE poker_sponsors         ENABLE ROW LEVEL SECURITY;
ALTER TABLE poker_sessions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE poker_session_sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE poker_entries          ENABLE ROW LEVEL SECURITY;
ALTER TABLE poker_rsvps            ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Poker sponsors are viewable by everyone" ON poker_sponsors;
CREATE POLICY "Poker sponsors are viewable by everyone" ON poker_sponsors FOR SELECT USING (true);
DROP POLICY IF EXISTS "Poker sessions are viewable by everyone" ON poker_sessions;
CREATE POLICY "Poker sessions are viewable by everyone" ON poker_sessions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Poker session sponsors are viewable by everyone" ON poker_session_sponsors;
CREATE POLICY "Poker session sponsors are viewable by everyone" ON poker_session_sponsors FOR SELECT USING (true);
DROP POLICY IF EXISTS "Poker entries are viewable by everyone" ON poker_entries;
CREATE POLICY "Poker entries are viewable by everyone" ON poker_entries FOR SELECT USING (true);
DROP POLICY IF EXISTS "Poker RSVPs are viewable by everyone" ON poker_rsvps;
CREATE POLICY "Poker RSVPs are viewable by everyone" ON poker_rsvps FOR SELECT USING (true);
-- Deliberately no INSERT/UPDATE/DELETE policies on any poker table.

-- ------------------------------------------------------------
-- 4. View: what counts toward stats
--    scheduled / live / voided are excluded; disputed still counts.
-- ------------------------------------------------------------

CREATE OR REPLACE VIEW poker_counted_entries WITH (security_invoker = true) AS
SELECT e.id, e.session_id, e.user_id, e.buy_in_cents, e.cash_out_cents, e.rebuy_count,
       e.net_cents, e.finish_place, e.acknowledged_at, e.disputed_at,
       s.kind, s.status, s.played_at, s.duration_minutes, s.player_count, s.host_id,
       s.title, s.stakes, s.variant, s.is_official
FROM poker_entries e
JOIN poker_sessions s ON s.id = e.session_id
WHERE s.status IN ('final', 'disputed');

-- ------------------------------------------------------------
-- 5. Triggers: session counters, derived status, rsvp count
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION poker_refresh_session(p_session_id UUID)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE poker_sessions s SET
        player_count         = a.player_count,
        ack_count            = a.ack_count,
        dispute_count        = a.dispute_count,
        total_buy_in_cents   = a.total_buy_in,
        total_cash_out_cents = a.total_cash_out,
        status = CASE
                    WHEN s.status IN ('final', 'disputed') THEN
                        (CASE WHEN a.dispute_count > 0 THEN 'disputed' ELSE 'final' END)::poker_session_status
                    ELSE s.status
                 END,
        updated_at = NOW()
    FROM (
        SELECT COUNT(*)::INT                          AS player_count,
               COUNT(acknowledged_at)::INT            AS ack_count,
               COUNT(disputed_at)::INT                AS dispute_count,
               COALESCE(SUM(buy_in_cents), 0)::BIGINT AS total_buy_in,
               COALESCE(SUM(cash_out_cents), 0)::BIGINT AS total_cash_out
        FROM poker_entries WHERE session_id = p_session_id
    ) a
    WHERE s.id = p_session_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION poker_entries_refresh_trigger()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF EXISTS (SELECT 1 FROM poker_sessions WHERE id = OLD.session_id) THEN
            PERFORM poker_refresh_session(OLD.session_id);
        END IF;
        RETURN OLD;
    END IF;
    PERFORM poker_refresh_session(NEW.session_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_poker_entries_refresh ON poker_entries;
CREATE TRIGGER trigger_poker_entries_refresh
    AFTER INSERT OR UPDATE OR DELETE ON poker_entries
    FOR EACH ROW EXECUTE FUNCTION poker_entries_refresh_trigger();

CREATE OR REPLACE FUNCTION poker_rsvps_count_trigger()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session_id UUID := COALESCE(NEW.session_id, OLD.session_id);
BEGIN
    UPDATE poker_sessions
    SET rsvp_count = (SELECT COUNT(*) FROM poker_rsvps WHERE session_id = v_session_id)
    WHERE id = v_session_id;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_poker_rsvps_count ON poker_rsvps;
CREATE TRIGGER trigger_poker_rsvps_count
    AFTER INSERT OR DELETE ON poker_rsvps
    FOR EACH ROW EXECUTE FUNCTION poker_rsvps_count_trigger();

-- ------------------------------------------------------------
-- 6. Internal helpers (EXECUTE revoked from API roles below)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION poker_is_officer(p_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE((SELECT poker_officer FROM users WHERE id = p_user_id), FALSE);
$$ LANGUAGE sql;

-- Applies editable session fields from a JSON payload. A key that is present
-- overwrites (null clears); an absent key leaves the column unchanged.
CREATE OR REPLACE FUNCTION poker_apply_fields(p_session_id UUID, p_kind poker_session_kind, p_payload JSONB)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_title    TEXT;
    v_stakes   TEXT;
    v_variant  TEXT;
    v_location TEXT;
    v_notes    TEXT;
    v_played   TIMESTAMPTZ;
    v_sched    TIMESTAMPTZ;
    v_duration INTEGER;
    v_std      INTEGER;
    v_pool     INTEGER;
BEGIN
    IF p_payload ? 'title' THEN
        v_title := NULLIF(btrim(p_payload->>'title'), '');
        IF v_title IS NOT NULL AND char_length(v_title) > 80 THEN RAISE EXCEPTION 'INVALID_TEXT'; END IF;
        UPDATE poker_sessions SET title = v_title WHERE id = p_session_id;
    END IF;
    IF p_payload ? 'stakes' THEN
        v_stakes := NULLIF(btrim(p_payload->>'stakes'), '');
        IF v_stakes IS NOT NULL AND char_length(v_stakes) > 30 THEN RAISE EXCEPTION 'INVALID_TEXT'; END IF;
        UPDATE poker_sessions SET stakes = v_stakes WHERE id = p_session_id;
    END IF;
    IF p_payload ? 'variant' THEN
        v_variant := NULLIF(btrim(p_payload->>'variant'), '');
        IF v_variant IS NOT NULL AND char_length(v_variant) > 30 THEN RAISE EXCEPTION 'INVALID_TEXT'; END IF;
        UPDATE poker_sessions SET variant = v_variant WHERE id = p_session_id;
    END IF;
    IF p_payload ? 'location' THEN
        v_location := NULLIF(btrim(p_payload->>'location'), '');
        IF v_location IS NOT NULL AND char_length(v_location) > 80 THEN RAISE EXCEPTION 'INVALID_TEXT'; END IF;
        UPDATE poker_sessions SET location = v_location WHERE id = p_session_id;
    END IF;
    IF p_payload ? 'notes' THEN
        v_notes := NULLIF(btrim(p_payload->>'notes'), '');
        IF v_notes IS NOT NULL AND char_length(v_notes) > 1000 THEN RAISE EXCEPTION 'INVALID_TEXT'; END IF;
        UPDATE poker_sessions SET notes = v_notes WHERE id = p_session_id;
    END IF;
    IF p_payload ? 'played_at' AND p_payload->>'played_at' IS NOT NULL THEN
        v_played := (p_payload->>'played_at')::TIMESTAMPTZ;
        IF v_played < '2015-01-01'::TIMESTAMPTZ OR v_played > NOW() + INTERVAL '1 hour' THEN
            RAISE EXCEPTION 'INVALID_PLAYED_AT';
        END IF;
        UPDATE poker_sessions SET played_at = v_played WHERE id = p_session_id;
    END IF;
    IF p_payload ? 'scheduled_for' THEN
        v_sched := NULLIF(p_payload->>'scheduled_for', '')::TIMESTAMPTZ;
        IF v_sched IS NOT NULL AND v_sched < '2015-01-01'::TIMESTAMPTZ THEN RAISE EXCEPTION 'INVALID_SCHEDULED_FOR'; END IF;
        UPDATE poker_sessions
        SET scheduled_for = v_sched,
            played_at = CASE WHEN status = 'scheduled' AND v_sched IS NOT NULL THEN v_sched ELSE played_at END
        WHERE id = p_session_id;
    END IF;
    IF p_payload ? 'duration_minutes' THEN
        v_duration := NULLIF(p_payload->>'duration_minutes', '')::INTEGER;
        IF v_duration IS NOT NULL AND (v_duration < 1 OR v_duration > 4320) THEN RAISE EXCEPTION 'INVALID_DURATION'; END IF;
        UPDATE poker_sessions SET duration_minutes = v_duration WHERE id = p_session_id;
    END IF;
    IF p_payload ? 'standard_buy_in_cents' THEN
        v_std := NULLIF(p_payload->>'standard_buy_in_cents', '')::INTEGER;
        IF v_std IS NOT NULL AND (v_std < 0 OR v_std > 10000000) THEN RAISE EXCEPTION 'INVALID_AMOUNT'; END IF;
        UPDATE poker_sessions SET standard_buy_in_cents = v_std WHERE id = p_session_id;
    END IF;
    IF p_payload ? 'prize_pool_cents' THEN
        v_pool := NULLIF(p_payload->>'prize_pool_cents', '')::INTEGER;
        IF v_pool IS NOT NULL AND p_kind <> 'tournament' THEN RAISE EXCEPTION 'INVALID_PRIZE_POOL'; END IF;
        IF v_pool IS NOT NULL AND (v_pool < 0 OR v_pool > 10000000) THEN RAISE EXCEPTION 'INVALID_AMOUNT'; END IF;
        UPDATE poker_sessions SET prize_pool_cents = v_pool WHERE id = p_session_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Replaces the session's sponsor list (absent key = unchanged).
CREATE OR REPLACE FUNCTION poker_apply_sponsors(p_session_id UUID, p_sponsor_ids JSONB)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_sponsor_ids IS NULL OR jsonb_typeof(p_sponsor_ids) <> 'array' THEN RETURN; END IF;
    IF EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(p_sponsor_ids) x(id)
        WHERE NOT EXISTS (SELECT 1 FROM poker_sponsors WHERE id = x.id::UUID)
    ) THEN
        RAISE EXCEPTION 'INVALID_SPONSOR';
    END IF;
    DELETE FROM poker_session_sponsors WHERE session_id = p_session_id;
    INSERT INTO poker_session_sponsors (session_id, sponsor_id, position)
    SELECT p_session_id, x.id::UUID, x.ord - 1
    FROM jsonb_array_elements_text(p_sponsor_ids) WITH ORDINALITY AS x(id, ord)
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Full-replaces a session's entries from a JSON array.
--   p_strict = TRUE applies the finalize rules (min players, cash-outs present,
--   places consistent) and auto-acknowledges the host's own row.
CREATE OR REPLACE FUNCTION poker_write_entries(
    p_session_id UUID,
    p_kind       poker_session_kind,
    p_host_id    UUID,
    p_entries    JSONB,
    p_strict     BOOLEAN
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_n INTEGER;
BEGIN
    IF p_entries IS NULL OR jsonb_typeof(p_entries) <> 'array' THEN RAISE EXCEPTION 'INVALID_ENTRIES'; END IF;
    v_n := jsonb_array_length(p_entries);
    IF v_n > 100 THEN RAISE EXCEPTION 'TOO_MANY_PLAYERS'; END IF;
    IF p_strict AND v_n < 2 THEN RAISE EXCEPTION 'TOO_FEW_PLAYERS'; END IF;

    DROP TABLE IF EXISTS tmp_poker_entries;
    CREATE TEMP TABLE tmp_poker_entries ON COMMIT DROP AS
    SELECT x.user_id,
           COALESCE(x.buy_in_cents, 0)  AS buy_in_cents,
           x.cash_out_cents,
           COALESCE(x.rebuy_count, 0)   AS rebuy_count,
           x.finish_place
    FROM jsonb_to_recordset(p_entries) AS x(
        user_id UUID, buy_in_cents INTEGER, cash_out_cents INTEGER, rebuy_count INTEGER, finish_place INTEGER
    );

    IF EXISTS (SELECT 1 FROM tmp_poker_entries WHERE user_id IS NULL) THEN
        RAISE EXCEPTION 'INVALID_ENTRY';
    END IF;
    IF EXISTS (SELECT 1 FROM tmp_poker_entries t WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = t.user_id)) THEN
        RAISE EXCEPTION 'UNKNOWN_USER';
    END IF;
    IF EXISTS (SELECT user_id FROM tmp_poker_entries GROUP BY user_id HAVING COUNT(*) > 1) THEN
        RAISE EXCEPTION 'DUPLICATE_PLAYER';
    END IF;
    IF EXISTS (
        SELECT 1 FROM tmp_poker_entries
        WHERE buy_in_cents < 0 OR buy_in_cents > 10000000
           OR (cash_out_cents IS NOT NULL AND (cash_out_cents < 0 OR cash_out_cents > 10000000))
           OR rebuy_count < 0 OR rebuy_count > 100
    ) THEN
        RAISE EXCEPTION 'INVALID_AMOUNT';
    END IF;

    IF p_kind = 'cash' THEN
        IF EXISTS (SELECT 1 FROM tmp_poker_entries WHERE finish_place IS NOT NULL) THEN
            RAISE EXCEPTION 'INVALID_PLACE';
        END IF;
        IF p_strict THEN
            IF EXISTS (SELECT 1 FROM tmp_poker_entries WHERE cash_out_cents IS NULL) THEN
                RAISE EXCEPTION 'MISSING_CASH_OUT';
            END IF;
            IF (SELECT COALESCE(SUM(buy_in_cents), 0) FROM tmp_poker_entries) = 0 THEN
                RAISE EXCEPTION 'EMPTY_SESSION';
            END IF;
        END IF;
    ELSE
        IF EXISTS (SELECT finish_place FROM tmp_poker_entries WHERE finish_place IS NOT NULL
                   GROUP BY finish_place HAVING COUNT(*) > 1)
           OR EXISTS (SELECT 1 FROM tmp_poker_entries WHERE finish_place IS NOT NULL AND finish_place < 1) THEN
            RAISE EXCEPTION 'INVALID_PLACE';
        END IF;
        IF p_strict THEN
            IF EXISTS (SELECT 1 FROM tmp_poker_entries WHERE finish_place IS NOT NULL AND finish_place > v_n)
               OR EXISTS (SELECT 1 FROM tmp_poker_entries WHERE COALESCE(cash_out_cents, 0) > 0 AND finish_place IS NULL) THEN
                RAISE EXCEPTION 'INVALID_PLACE';
            END IF;
        END IF;
    END IF;

    DELETE FROM poker_entries WHERE session_id = p_session_id;
    INSERT INTO poker_entries (session_id, user_id, buy_in_cents, cash_out_cents, rebuy_count, finish_place, acknowledged_at)
    SELECT p_session_id, user_id, buy_in_cents,
           CASE WHEN p_kind = 'tournament' THEN COALESCE(cash_out_cents, 0) ELSE cash_out_cents END,
           rebuy_count, finish_place,
           CASE WHEN p_strict AND user_id = p_host_id THEN NOW() END
    FROM tmp_poker_entries;

    DROP TABLE IF EXISTS tmp_poker_entries;
END;
$$ LANGUAGE plpgsql;

-- Derives duration at finalize: explicit value wins, else elapsed since
-- started_at when the session wasn't backdated.
CREATE OR REPLACE FUNCTION poker_derive_duration(p_session poker_sessions, p_payload JSONB)
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_explicit INTEGER;
    v_elapsed  INTEGER;
BEGIN
    IF p_payload ? 'duration_minutes' AND NULLIF(p_payload->>'duration_minutes', '') IS NOT NULL THEN
        v_explicit := (p_payload->>'duration_minutes')::INTEGER;
        IF v_explicit < 1 OR v_explicit > 4320 THEN RAISE EXCEPTION 'INVALID_DURATION'; END IF;
        RETURN v_explicit;
    END IF;
    IF p_session.duration_minutes IS NOT NULL THEN
        RETURN p_session.duration_minutes;
    END IF;
    IF p_session.started_at IS NOT NULL AND p_session.played_at >= p_session.started_at - INTERVAL '1 hour' THEN
        v_elapsed := GREATEST(1, FLOOR(EXTRACT(EPOCH FROM (NOW() - p_session.started_at)) / 60))::INTEGER;
        IF v_elapsed <= 4320 THEN RETURN v_elapsed; END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- 7. Session RPCs
--    Error codes: NOT_AUTHENTICATED / SESSION_NOT_FOUND / NOT_HOST / NOT_OFFICER /
--    LIVE_SESSION_EXISTS / WRONG_STATUS / STALE_VERSION / INVALID_KIND /
--    INVALID_PLAYED_AT / INVALID_SCHEDULED_FOR / INVALID_TEXT / INVALID_AMOUNT /
--    INVALID_DURATION / INVALID_PRIZE_POOL / INVALID_SPONSOR / + entry codes above
-- ------------------------------------------------------------

-- "Start game" / "Start tournament" / "Schedule official tournament".
-- Creates the row immediately (status live, or scheduled for official
-- tournaments with a scheduled_for). Live sessions get the host pre-added.
CREATE OR REPLACE FUNCTION start_poker_session(p_payload JSONB)
RETURNS SETOF poker_sessions
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid       UUID := auth.uid();
    v_id        UUID;
    v_kind      poker_session_kind;
    v_official  BOOLEAN;
    v_sched     TIMESTAMPTZ;
    v_played    TIMESTAMPTZ;
    v_status    poker_session_status;
    v_std       INTEGER;
BEGIN
    IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

    BEGIN
        v_kind := (p_payload->>'kind')::poker_session_kind;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'INVALID_KIND';
    END;
    IF v_kind IS NULL THEN RAISE EXCEPTION 'INVALID_KIND'; END IF;

    v_official := COALESCE((p_payload->>'is_official')::BOOLEAN, FALSE);
    IF v_official THEN
        IF v_kind <> 'tournament' THEN RAISE EXCEPTION 'INVALID_KIND'; END IF;
        IF NOT poker_is_officer(v_uid) THEN RAISE EXCEPTION 'NOT_OFFICER'; END IF;
        v_sched := NULLIF(p_payload->>'scheduled_for', '')::TIMESTAMPTZ;
    END IF;

    IF v_sched IS NOT NULL THEN
        v_status := 'scheduled';
        v_played := v_sched;
    ELSE
        v_status := 'live';
        IF EXISTS (SELECT 1 FROM poker_sessions WHERE host_id = v_uid AND status = 'live') THEN
            RAISE EXCEPTION 'LIVE_SESSION_EXISTS';
        END IF;
        v_played := COALESCE(NULLIF(p_payload->>'played_at', '')::TIMESTAMPTZ, NOW());
        IF v_played < '2015-01-01'::TIMESTAMPTZ OR v_played > NOW() + INTERVAL '1 hour' THEN
            RAISE EXCEPTION 'INVALID_PLAYED_AT';
        END IF;
    END IF;

    v_std := NULLIF(p_payload->>'standard_buy_in_cents', '')::INTEGER;
    IF v_official THEN v_std := 0; END IF;

    INSERT INTO poker_sessions (kind, host_id, is_official, scheduled_for, started_at, played_at, status, standard_buy_in_cents)
    VALUES (v_kind, v_uid, v_official, v_sched,
            CASE WHEN v_status = 'live' THEN NOW() END,
            v_played, v_status, v_std)
    RETURNING id INTO v_id;

    PERFORM poker_apply_fields(v_id, v_kind, p_payload - 'played_at' - 'scheduled_for' - 'standard_buy_in_cents');
    PERFORM poker_apply_sponsors(v_id, p_payload->'sponsor_ids');

    -- Regular live sessions: host is at the table by default (removable).
    IF v_status = 'live' AND NOT v_official THEN
        INSERT INTO poker_entries (session_id, user_id, buy_in_cents, cash_out_cents)
        VALUES (v_id, v_uid, COALESCE(v_std, 0), NULL);
    END IF;

    RETURN QUERY SELECT * FROM poker_sessions WHERE id = v_id;
END;
$$ LANGUAGE plpgsql;

-- Officer takes a scheduled official tournament live. RSVPs become the first
-- rows of the ledger (buy-in 0 — official tournaments have no entry fee).
CREATE OR REPLACE FUNCTION open_poker_session(p_session_id UUID)
RETURNS SETOF poker_sessions
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session poker_sessions%ROWTYPE;
BEGIN
    SELECT * INTO v_session FROM poker_sessions WHERE id = p_session_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'SESSION_NOT_FOUND'; END IF;
    IF v_session.host_id <> auth.uid() THEN RAISE EXCEPTION 'NOT_HOST'; END IF;
    IF v_session.status <> 'scheduled' THEN RAISE EXCEPTION 'WRONG_STATUS'; END IF;
    IF EXISTS (SELECT 1 FROM poker_sessions WHERE host_id = auth.uid() AND status = 'live') THEN
        RAISE EXCEPTION 'LIVE_SESSION_EXISTS';
    END IF;

    UPDATE poker_sessions
    SET status = 'live', started_at = NOW(), played_at = NOW(), version = version + 1, updated_at = NOW()
    WHERE id = p_session_id;

    INSERT INTO poker_entries (session_id, user_id, buy_in_cents, cash_out_cents)
    SELECT p_session_id, r.user_id, 0, 0
    FROM poker_rsvps r
    WHERE r.session_id = p_session_id
    ON CONFLICT (session_id, user_id) DO NOTHING;

    RETURN QUERY SELECT * FROM poker_sessions WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql;

-- Autosave while live (or while a scheduled event is being edited).
-- Relaxed validation: partial ledgers are fine.
CREATE OR REPLACE FUNCTION save_poker_session(p_session_id UUID, p_payload JSONB)
RETURNS SETOF poker_sessions
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session poker_sessions%ROWTYPE;
BEGIN
    SELECT * INTO v_session FROM poker_sessions WHERE id = p_session_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'SESSION_NOT_FOUND'; END IF;
    IF v_session.host_id <> auth.uid() THEN RAISE EXCEPTION 'NOT_HOST'; END IF;
    IF v_session.status NOT IN ('live', 'scheduled') THEN RAISE EXCEPTION 'WRONG_STATUS'; END IF;
    IF p_payload ? 'version' AND (p_payload->>'version')::INTEGER <> v_session.version THEN
        RAISE EXCEPTION 'STALE_VERSION';
    END IF;

    PERFORM poker_apply_fields(p_session_id, v_session.kind, p_payload);
    PERFORM poker_apply_sponsors(p_session_id, p_payload->'sponsor_ids');
    IF p_payload ? 'entries' THEN
        PERFORM poker_write_entries(p_session_id, v_session.kind, v_session.host_id, p_payload->'entries', FALSE);
    END IF;

    UPDATE poker_sessions SET version = version + 1, updated_at = NOW() WHERE id = p_session_id;
    RETURN QUERY SELECT * FROM poker_sessions WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql;

-- "End & log session": strict validation, status -> final, host auto-acked.
CREATE OR REPLACE FUNCTION finalize_poker_session(p_session_id UUID, p_payload JSONB)
RETURNS SETOF poker_sessions
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session  poker_sessions%ROWTYPE;
    v_duration INTEGER;
BEGIN
    SELECT * INTO v_session FROM poker_sessions WHERE id = p_session_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'SESSION_NOT_FOUND'; END IF;
    IF v_session.host_id <> auth.uid() THEN RAISE EXCEPTION 'NOT_HOST'; END IF;
    IF v_session.status <> 'live' THEN RAISE EXCEPTION 'WRONG_STATUS'; END IF;
    IF p_payload ? 'version' AND (p_payload->>'version')::INTEGER <> v_session.version THEN
        RAISE EXCEPTION 'STALE_VERSION';
    END IF;

    PERFORM poker_apply_fields(p_session_id, v_session.kind, p_payload - 'duration_minutes');
    PERFORM poker_apply_sponsors(p_session_id, p_payload->'sponsor_ids');
    PERFORM poker_write_entries(p_session_id, v_session.kind, v_session.host_id, p_payload->'entries', TRUE);

    SELECT * INTO v_session FROM poker_sessions WHERE id = p_session_id;
    v_duration := poker_derive_duration(v_session, p_payload);

    UPDATE poker_sessions
    SET status = 'final',
        ended_at = NOW(),
        finalized_at = NOW(),
        duration_minutes = v_duration,
        version = version + 1,
        updated_at = NOW()
    WHERE id = p_session_id;

    RETURN QUERY SELECT * FROM poker_sessions WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql;

-- Host edits a finalized session. Entries are fully replaced, which clears
-- every acknowledgement and dispute (the trigger returns status to final).
CREATE OR REPLACE FUNCTION update_poker_session(p_session_id UUID, p_payload JSONB)
RETURNS SETOF poker_sessions
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session poker_sessions%ROWTYPE;
BEGIN
    SELECT * INTO v_session FROM poker_sessions WHERE id = p_session_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'SESSION_NOT_FOUND'; END IF;
    IF v_session.host_id <> auth.uid() THEN RAISE EXCEPTION 'NOT_HOST'; END IF;
    IF v_session.status NOT IN ('final', 'disputed') THEN RAISE EXCEPTION 'WRONG_STATUS'; END IF;
    IF p_payload ? 'version' AND (p_payload->>'version')::INTEGER <> v_session.version THEN
        RAISE EXCEPTION 'STALE_VERSION';
    END IF;

    PERFORM poker_apply_fields(p_session_id, v_session.kind, p_payload);
    PERFORM poker_apply_sponsors(p_session_id, p_payload->'sponsor_ids');
    PERFORM poker_write_entries(p_session_id, v_session.kind, v_session.host_id, p_payload->'entries', TRUE);

    UPDATE poker_sessions SET version = version + 1, updated_at = NOW() WHERE id = p_session_id;
    RETURN QUERY SELECT * FROM poker_sessions WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql;

-- Soft delete. Works on scheduled, live, final or disputed sessions. No un-void.
CREATE OR REPLACE FUNCTION void_poker_session(p_session_id UUID)
RETURNS SETOF poker_sessions
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session poker_sessions%ROWTYPE;
BEGIN
    SELECT * INTO v_session FROM poker_sessions WHERE id = p_session_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'SESSION_NOT_FOUND'; END IF;
    IF v_session.host_id <> auth.uid() THEN RAISE EXCEPTION 'NOT_HOST'; END IF;
    IF v_session.status = 'voided' THEN RAISE EXCEPTION 'WRONG_STATUS'; END IF;

    UPDATE poker_sessions
    SET status = 'voided', voided_at = NOW(), version = version + 1, updated_at = NOW()
    WHERE id = p_session_id;
    RETURN QUERY SELECT * FROM poker_sessions WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql;

-- RSVP to a scheduled official tournament.
CREATE OR REPLACE FUNCTION rsvp_poker_session(p_session_id UUID, p_attending BOOLEAN)
RETURNS SETOF poker_sessions
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session poker_sessions%ROWTYPE;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
    SELECT * INTO v_session FROM poker_sessions WHERE id = p_session_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'SESSION_NOT_FOUND'; END IF;
    IF v_session.status <> 'scheduled' THEN RAISE EXCEPTION 'WRONG_STATUS'; END IF;

    IF p_attending THEN
        INSERT INTO poker_rsvps (session_id, user_id) VALUES (p_session_id, auth.uid())
        ON CONFLICT DO NOTHING;
    ELSE
        DELETE FROM poker_rsvps WHERE session_id = p_session_id AND user_id = auth.uid();
    END IF;
    RETURN QUERY SELECT * FROM poker_sessions WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- 8. Entry RPCs (acknowledge / dispute / withdraw)
--    Error codes: ENTRY_NOT_FOUND / NOT_YOUR_ENTRY / WRONG_STATUS /
--    INVALID_REASON / NOT_DISPUTED
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION acknowledge_poker_entry(p_entry_id UUID)
RETURNS SETOF poker_entries
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_entry   poker_entries%ROWTYPE;
    v_session poker_sessions%ROWTYPE;
BEGIN
    SELECT * INTO v_entry FROM poker_entries WHERE id = p_entry_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'ENTRY_NOT_FOUND'; END IF;
    SELECT * INTO v_session FROM poker_sessions WHERE id = v_entry.session_id FOR UPDATE;
    SELECT * INTO v_entry FROM poker_entries WHERE id = p_entry_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'ENTRY_NOT_FOUND'; END IF;
    IF v_entry.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'NOT_YOUR_ENTRY'; END IF;
    IF v_session.status NOT IN ('final', 'disputed') THEN RAISE EXCEPTION 'WRONG_STATUS'; END IF;

    -- Idempotent; acknowledging also withdraws your own dispute.
    UPDATE poker_entries
    SET acknowledged_at = COALESCE(acknowledged_at, NOW()), disputed_at = NULL, dispute_reason = NULL
    WHERE id = p_entry_id;
    RETURN QUERY SELECT * FROM poker_entries WHERE id = p_entry_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION dispute_poker_entry(p_entry_id UUID, p_reason TEXT)
RETURNS SETOF poker_entries
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_entry   poker_entries%ROWTYPE;
    v_session poker_sessions%ROWTYPE;
    v_reason  TEXT := btrim(COALESCE(p_reason, ''));
BEGIN
    IF char_length(v_reason) < 1 OR char_length(v_reason) > 500 THEN RAISE EXCEPTION 'INVALID_REASON'; END IF;
    SELECT * INTO v_entry FROM poker_entries WHERE id = p_entry_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'ENTRY_NOT_FOUND'; END IF;
    SELECT * INTO v_session FROM poker_sessions WHERE id = v_entry.session_id FOR UPDATE;
    SELECT * INTO v_entry FROM poker_entries WHERE id = p_entry_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'ENTRY_NOT_FOUND'; END IF;
    IF v_entry.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'NOT_YOUR_ENTRY'; END IF;
    IF v_session.status NOT IN ('final', 'disputed') THEN RAISE EXCEPTION 'WRONG_STATUS'; END IF;

    UPDATE poker_entries
    SET disputed_at = NOW(), dispute_reason = v_reason, acknowledged_at = NULL
    WHERE id = p_entry_id;
    RETURN QUERY SELECT * FROM poker_entries WHERE id = p_entry_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION withdraw_poker_dispute(p_entry_id UUID)
RETURNS SETOF poker_entries
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_entry   poker_entries%ROWTYPE;
    v_session poker_sessions%ROWTYPE;
BEGIN
    SELECT * INTO v_entry FROM poker_entries WHERE id = p_entry_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'ENTRY_NOT_FOUND'; END IF;
    SELECT * INTO v_session FROM poker_sessions WHERE id = v_entry.session_id FOR UPDATE;
    SELECT * INTO v_entry FROM poker_entries WHERE id = p_entry_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'ENTRY_NOT_FOUND'; END IF;
    IF v_entry.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'NOT_YOUR_ENTRY'; END IF;
    IF v_session.status NOT IN ('final', 'disputed') THEN RAISE EXCEPTION 'WRONG_STATUS'; END IF;
    IF v_entry.disputed_at IS NULL THEN RAISE EXCEPTION 'NOT_DISPUTED'; END IF;

    UPDATE poker_entries SET disputed_at = NULL, dispute_reason = NULL WHERE id = p_entry_id;
    RETURN QUERY SELECT * FROM poker_entries WHERE id = p_entry_id;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- 9. Sponsor library (officers only)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION upsert_poker_sponsor(p_payload JSONB)
RETURNS SETOF poker_sponsors
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id   UUID;
    v_name TEXT := NULLIF(btrim(p_payload->>'name'), '');
    v_logo TEXT := NULLIF(btrim(p_payload->>'logo_url'), '');
    v_url  TEXT := NULLIF(btrim(p_payload->>'website_url'), '');
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
    IF NOT poker_is_officer(auth.uid()) THEN RAISE EXCEPTION 'NOT_OFFICER'; END IF;
    IF v_name IS NULL OR char_length(v_name) > 60 THEN RAISE EXCEPTION 'INVALID_TEXT'; END IF;
    IF v_url IS NOT NULL AND char_length(v_url) > 300 THEN RAISE EXCEPTION 'INVALID_TEXT'; END IF;

    v_id := NULLIF(p_payload->>'id', '')::UUID;
    IF v_id IS NULL THEN
        INSERT INTO poker_sponsors (name, logo_url, website_url, created_by)
        VALUES (v_name, v_logo, v_url, auth.uid())
        RETURNING id INTO v_id;
    ELSE
        UPDATE poker_sponsors SET name = v_name, logo_url = v_logo, website_url = v_url WHERE id = v_id;
        IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_SPONSOR'; END IF;
    END IF;
    RETURN QUERY SELECT * FROM poker_sponsors WHERE id = v_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION delete_poker_sponsor(p_id UUID)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
    IF NOT poker_is_officer(auth.uid()) THEN RAISE EXCEPTION 'NOT_OFFICER'; END IF;
    IF EXISTS (SELECT 1 FROM poker_session_sponsors WHERE sponsor_id = p_id) THEN
        RAISE EXCEPTION 'SPONSOR_IN_USE';
    END IF;
    DELETE FROM poker_sponsors WHERE id = p_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_SPONSOR'; END IF;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- 10. Leaderboard (plain SQL so column names never clash with output params)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_poker_leaderboard(
    p_kind         poker_session_kind DEFAULT NULL,
    p_dorm_id      UUID        DEFAULT NULL,
    p_since        TIMESTAMPTZ DEFAULT NULL,
    p_until        TIMESTAMPTZ DEFAULT NULL,
    p_sort         TEXT        DEFAULT 'net',
    p_min_sessions INTEGER     DEFAULT 1,
    p_limit        INTEGER     DEFAULT 25,
    p_offset       INTEGER     DEFAULT 0
)
RETURNS TABLE (
    rank               BIGINT,
    user_id            UUID,
    display_name       TEXT,
    profile_image_url  TEXT,
    dorm_name          TEXT,
    sessions_played    INTEGER,
    winning_sessions   INTEGER,
    net_cents          BIGINT,
    staked_cents       BIGINT,
    cashed_out_cents   BIGINT,
    roi_pct            NUMERIC,
    biggest_win_cents  INTEGER,
    biggest_loss_cents INTEGER,
    avg_buy_in_cents   INTEGER,
    avg_net_cents      INTEGER,
    hours_played       NUMERIC,
    hourly_cents       INTEGER,
    tournament_entries INTEGER,
    tournament_cashes  INTEGER,
    first_places       INTEGER,
    best_finish        INTEGER,
    last_played_at     TIMESTAMPTZ
)
STABLE
AS $$
    WITH agg AS (
        SELECT
            c.user_id,
            COUNT(*)::INT                                                       AS sessions_played,
            COUNT(*) FILTER (WHERE c.net_cents > 0)::INT                        AS winning_sessions,
            SUM(c.net_cents)::BIGINT                                            AS net_cents,
            SUM(c.buy_in_cents)::BIGINT                                         AS staked_cents,
            SUM(COALESCE(c.cash_out_cents, 0))::BIGINT                          AS cashed_out_cents,
            GREATEST(MAX(c.net_cents), 0)::INT                                  AS biggest_win_cents,
            LEAST(MIN(c.net_cents), 0)::INT                                     AS biggest_loss_cents,
            ROUND(AVG(c.buy_in_cents))::INT                                     AS avg_buy_in_cents,
            ROUND(AVG(c.net_cents))::INT                                        AS avg_net_cents,
            SUM(c.duration_minutes) FILTER (WHERE c.duration_minutes IS NOT NULL) AS timed_minutes,
            SUM(c.net_cents) FILTER (WHERE c.duration_minutes IS NOT NULL)      AS timed_net,
            COUNT(*) FILTER (WHERE c.kind = 'tournament')::INT                  AS tournament_entries,
            COUNT(*) FILTER (WHERE c.kind = 'tournament' AND COALESCE(c.cash_out_cents, 0) > 0)::INT AS tournament_cashes,
            COUNT(*) FILTER (WHERE c.kind = 'tournament' AND c.finish_place = 1)::INT AS first_places,
            MIN(c.finish_place) FILTER (WHERE c.kind = 'tournament')            AS best_finish,
            MAX(c.played_at)                                                    AS last_played_at
        FROM poker_counted_entries c
        WHERE (p_kind  IS NULL OR c.kind = p_kind)
          AND (p_since IS NULL OR c.played_at >= p_since)
          AND (p_until IS NULL OR c.played_at <  p_until)
        GROUP BY c.user_id
        HAVING COUNT(*) >= GREATEST(COALESCE(p_min_sessions, 1), 1)
    ),
    joined AS (
        SELECT
            a.*,
            u.display_name,
            u.profile_image_url,
            d.name AS dorm_name,
            CASE WHEN a.staked_cents > 0 THEN ROUND(a.net_cents::NUMERIC * 100 / a.staked_cents, 1) END AS roi_pct,
            CASE WHEN a.timed_minutes > 0 THEN ROUND(a.timed_minutes::NUMERIC / 60, 2) END AS hours_played,
            CASE WHEN a.timed_minutes > 0 THEN ROUND(a.timed_net::NUMERIC * 60 / a.timed_minutes)::INT END AS hourly_cents
        FROM agg a
        JOIN users u ON u.id = a.user_id
        LEFT JOIN dorms d ON d.id = u.dorm_id
        WHERE (p_dorm_id IS NULL OR u.dorm_id = p_dorm_id)
    ),
    ranked AS (
        SELECT
            ROW_NUMBER() OVER (
                ORDER BY
                    CASE p_sort
                        WHEN 'roi'         THEN j.roi_pct
                        WHEN 'staked'      THEN j.staked_cents::NUMERIC
                        WHEN 'sessions'    THEN j.sessions_played::NUMERIC
                        WHEN 'hourly'      THEN j.hourly_cents::NUMERIC
                        WHEN 'biggest_win' THEN j.biggest_win_cents::NUMERIC
                        ELSE j.net_cents::NUMERIC
                    END DESC NULLS LAST,
                    j.net_cents DESC,
                    j.user_id
            )::BIGINT AS rank,
            j.*
        FROM joined j
    )
    SELECT
        r.rank, r.user_id, r.display_name, r.profile_image_url, r.dorm_name,
        r.sessions_played, r.winning_sessions, r.net_cents, r.staked_cents, r.cashed_out_cents,
        r.roi_pct, r.biggest_win_cents, r.biggest_loss_cents, r.avg_buy_in_cents, r.avg_net_cents,
        r.hours_played, r.hourly_cents, r.tournament_entries, r.tournament_cashes, r.first_places,
        r.best_finish, r.last_played_at
    FROM ranked r
    ORDER BY r.rank
    LIMIT GREATEST(COALESCE(p_limit, 25), 0)
    OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION get_poker_leaderboard_count(
    p_kind         poker_session_kind DEFAULT NULL,
    p_dorm_id      UUID        DEFAULT NULL,
    p_since        TIMESTAMPTZ DEFAULT NULL,
    p_until        TIMESTAMPTZ DEFAULT NULL,
    p_min_sessions INTEGER     DEFAULT 1
)
RETURNS BIGINT
STABLE
AS $$
    SELECT COUNT(*)::BIGINT
    FROM (
        SELECT c.user_id
        FROM poker_counted_entries c
        JOIN users u ON u.id = c.user_id
        WHERE (p_kind  IS NULL OR c.kind = p_kind)
          AND (p_since IS NULL OR c.played_at >= p_since)
          AND (p_until IS NULL OR c.played_at <  p_until)
          AND (p_dorm_id IS NULL OR u.dorm_id = p_dorm_id)
        GROUP BY c.user_id
        HAVING COUNT(*) >= GREATEST(COALESCE(p_min_sessions, 1), 1)
    ) x;
$$ LANGUAGE sql;

-- ------------------------------------------------------------
-- 11. Lock down internal helpers (not callable through PostgREST)
-- ------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION poker_refresh_session(UUID)                                         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION poker_is_officer(UUID)                                              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION poker_apply_fields(UUID, poker_session_kind, JSONB)                 FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION poker_apply_sponsors(UUID, JSONB)                                   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION poker_write_entries(UUID, poker_session_kind, UUID, JSONB, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION poker_derive_duration(poker_sessions, JSONB)                        FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------
-- 12. Sponsor logo storage (public read; officers write)
-- ------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('sponsor-logos', 'sponsor-logos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Sponsor logos are publicly readable" ON storage.objects;
CREATE POLICY "Sponsor logos are publicly readable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'sponsor-logos');

DROP POLICY IF EXISTS "Poker officers can upload sponsor logos" ON storage.objects;
CREATE POLICY "Poker officers can upload sponsor logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'sponsor-logos'
  AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND poker_officer)
);

DROP POLICY IF EXISTS "Poker officers can update sponsor logos" ON storage.objects;
CREATE POLICY "Poker officers can update sponsor logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'sponsor-logos'
  AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND poker_officer)
);

DROP POLICY IF EXISTS "Poker officers can delete sponsor logos" ON storage.objects;
CREATE POLICY "Poker officers can delete sponsor logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'sponsor-logos'
  AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND poker_officer)
);

-- ------------------------------------------------------------
-- After running: make yourself an officer so the official-tournament toggle
-- and /poker/sponsors appear:
--   UPDATE users SET poker_officer = TRUE WHERE university_email = 'you@caltech.edu';
-- ------------------------------------------------------------
