-- ============================================================
-- 014: Poker guests
--
-- Hosts can seat people who do not have an account yet. A guest is a named
-- placeholder owned by the host who created it; a ledger row points at a
-- user, a guest, or both once the guest has been linked. When the person
-- signs up, the host (or an officer) links the guest to the account: every
-- row the guest ever had gets user_id set, its confirmation is reset so the
-- new user can "Looks right / Dispute" each one, and the guest row remembers
-- the link so later ledger edits resolve to the same account.
--
-- Adds:
--  * poker_guests (name, created_by, linked_user_id)
--  * poker_entries.user_id nullable + poker_entries.guest_id
--  * poker_sessions.guest_count (rows with nobody to confirm them)
--  * guest_id on poker_counted_entries
--  * poker_write_entries accepts guest_id; a linked guest resolves to its user
--  * upsert / delete / link / unlink_poker_guest RPCs
--  * leaderboard functions ignore rows without a user
--
-- Same security model as 013: public SELECT, writes only through
-- SECURITY DEFINER RPCs with stable uppercase error codes.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Table
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS poker_guests (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name           TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 40),
    created_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    linked_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    linked_at      TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_poker_guests_created_by     ON poker_guests (created_by);
CREATE INDEX IF NOT EXISTS idx_poker_guests_linked_user_id ON poker_guests (linked_user_id);

ALTER TABLE poker_guests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Poker guests are viewable by everyone" ON poker_guests;
CREATE POLICY "Poker guests are viewable by everyone" ON poker_guests FOR SELECT USING (true);
-- Deliberately no INSERT/UPDATE/DELETE policies.

-- ------------------------------------------------------------
-- 2. Entries can point at a guest
-- ------------------------------------------------------------

ALTER TABLE poker_entries ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE poker_entries ADD COLUMN IF NOT EXISTS guest_id UUID REFERENCES poker_guests(id) ON DELETE RESTRICT;
ALTER TABLE poker_entries DROP CONSTRAINT IF EXISTS poker_entries_player_present;
ALTER TABLE poker_entries ADD CONSTRAINT poker_entries_player_present
    CHECK (user_id IS NOT NULL OR guest_id IS NOT NULL);

CREATE UNIQUE INDEX IF NOT EXISTS idx_poker_entries_session_guest
    ON poker_entries (session_id, guest_id) WHERE guest_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_poker_entries_guest_id
    ON poker_entries (guest_id) WHERE guest_id IS NOT NULL;

ALTER TABLE poker_sessions ADD COLUMN IF NOT EXISTS guest_count INTEGER NOT NULL DEFAULT 0;

-- ------------------------------------------------------------
-- 3. View: expose guest_id (appended, so CREATE OR REPLACE is allowed)
-- ------------------------------------------------------------

CREATE OR REPLACE VIEW poker_counted_entries WITH (security_invoker = true) AS
SELECT e.id, e.session_id, e.user_id, e.buy_in_cents, e.cash_out_cents, e.rebuy_count,
       e.net_cents, e.finish_place, e.acknowledged_at, e.disputed_at,
       s.kind, s.status, s.played_at, s.duration_minutes, s.player_count, s.host_id,
       s.title, s.stakes, s.variant, s.is_official,
       e.guest_id
FROM poker_entries e
JOIN poker_sessions s ON s.id = e.session_id
WHERE s.status IN ('final', 'disputed');

-- ------------------------------------------------------------
-- 4. Session counters: track rows that cannot confirm
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION poker_refresh_session(p_session_id UUID)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE poker_sessions s SET
        player_count         = a.player_count,
        guest_count          = a.guest_count,
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
        SELECT COUNT(*)::INT                                        AS player_count,
               COUNT(*) FILTER (WHERE user_id IS NULL)::INT         AS guest_count,
               COUNT(acknowledged_at)::INT                          AS ack_count,
               COUNT(disputed_at)::INT                              AS dispute_count,
               COALESCE(SUM(buy_in_cents), 0)::BIGINT               AS total_buy_in,
               COALESCE(SUM(cash_out_cents), 0)::BIGINT             AS total_cash_out
        FROM poker_entries WHERE session_id = p_session_id
    ) a
    WHERE s.id = p_session_id;
END;
$$ LANGUAGE plpgsql;

-- Backfill the new counter for existing sessions (all zero today, but cheap).
UPDATE poker_sessions s
SET guest_count = COALESCE((SELECT COUNT(*) FROM poker_entries e WHERE e.session_id = s.id AND e.user_id IS NULL), 0);

-- ------------------------------------------------------------
-- 5. Ledger writes accept guests
--    A row carries user_id, guest_id, or both. When guest_id is present the
--    row's user is whatever that guest is linked to (NULL while unlinked), so
--    the link is the single source of truth.
-- ------------------------------------------------------------

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
           x.guest_id,
           COALESCE(x.buy_in_cents, 0)  AS buy_in_cents,
           x.cash_out_cents,
           COALESCE(x.rebuy_count, 0)   AS rebuy_count,
           x.finish_place
    FROM jsonb_to_recordset(p_entries) AS x(
        user_id UUID, guest_id UUID, buy_in_cents INTEGER, cash_out_cents INTEGER, rebuy_count INTEGER, finish_place INTEGER
    );

    IF EXISTS (SELECT 1 FROM tmp_poker_entries WHERE user_id IS NULL AND guest_id IS NULL) THEN
        RAISE EXCEPTION 'INVALID_ENTRY';
    END IF;
    IF EXISTS (
        SELECT 1 FROM tmp_poker_entries t
        WHERE t.guest_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM poker_guests g WHERE g.id = t.guest_id)
    ) THEN
        RAISE EXCEPTION 'UNKNOWN_GUEST';
    END IF;

    UPDATE tmp_poker_entries t SET user_id = g.linked_user_id
    FROM poker_guests g WHERE g.id = t.guest_id;

    IF EXISTS (
        SELECT 1 FROM tmp_poker_entries t
        WHERE t.user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = t.user_id)
    ) THEN
        RAISE EXCEPTION 'UNKNOWN_USER';
    END IF;
    IF EXISTS (SELECT user_id  FROM tmp_poker_entries WHERE user_id  IS NOT NULL GROUP BY user_id  HAVING COUNT(*) > 1)
       OR EXISTS (SELECT guest_id FROM tmp_poker_entries WHERE guest_id IS NOT NULL GROUP BY guest_id HAVING COUNT(*) > 1) THEN
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
    INSERT INTO poker_entries (session_id, user_id, guest_id, buy_in_cents, cash_out_cents, rebuy_count, finish_place, acknowledged_at)
    SELECT p_session_id, user_id, guest_id, buy_in_cents,
           CASE WHEN p_kind = 'tournament' THEN COALESCE(cash_out_cents, 0) ELSE cash_out_cents END,
           rebuy_count, finish_place,
           CASE WHEN p_strict AND user_id = p_host_id THEN NOW() END
    FROM tmp_poker_entries;

    DROP TABLE IF EXISTS tmp_poker_entries;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- 6. Guest RPCs
--    Error codes: NOT_AUTHENTICATED / GUEST_NOT_FOUND / NOT_GUEST_OWNER /
--    INVALID_GUEST_NAME / GUEST_IN_USE / GUEST_ALREADY_LINKED /
--    GUEST_NOT_LINKED / GUEST_LINK_CONFLICT / UNKNOWN_USER
--    A guest is managed by the host who created it or by any officer.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION poker_can_manage_guest(p_guest poker_guests, p_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT p_user_id IS NOT NULL
       AND (p_guest.created_by IS NOT DISTINCT FROM p_user_id OR poker_is_officer(p_user_id));
$$ LANGUAGE sql;

-- Create (no id) or rename (id) a guest.
CREATE OR REPLACE FUNCTION upsert_poker_guest(p_payload JSONB)
RETURNS SETOF poker_guests
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid   UUID := auth.uid();
    v_id    UUID;
    v_name  TEXT := NULLIF(btrim(p_payload->>'name'), '');
    v_guest poker_guests%ROWTYPE;
BEGIN
    IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
    IF v_name IS NULL OR char_length(v_name) > 40 THEN RAISE EXCEPTION 'INVALID_GUEST_NAME'; END IF;

    v_id := NULLIF(p_payload->>'id', '')::UUID;
    IF v_id IS NULL THEN
        INSERT INTO poker_guests (name, created_by) VALUES (v_name, v_uid) RETURNING id INTO v_id;
    ELSE
        SELECT * INTO v_guest FROM poker_guests WHERE id = v_id FOR UPDATE;
        IF NOT FOUND THEN RAISE EXCEPTION 'GUEST_NOT_FOUND'; END IF;
        IF NOT poker_can_manage_guest(v_guest, v_uid) THEN RAISE EXCEPTION 'NOT_GUEST_OWNER'; END IF;
        UPDATE poker_guests SET name = v_name WHERE id = v_id;
    END IF;
    RETURN QUERY SELECT * FROM poker_guests WHERE id = v_id;
END;
$$ LANGUAGE plpgsql;

-- Delete a guest that never made it onto a ledger.
CREATE OR REPLACE FUNCTION delete_poker_guest(p_id UUID)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid   UUID := auth.uid();
    v_guest poker_guests%ROWTYPE;
BEGIN
    IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
    SELECT * INTO v_guest FROM poker_guests WHERE id = p_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'GUEST_NOT_FOUND'; END IF;
    IF NOT poker_can_manage_guest(v_guest, v_uid) THEN RAISE EXCEPTION 'NOT_GUEST_OWNER'; END IF;
    IF EXISTS (SELECT 1 FROM poker_entries WHERE guest_id = p_id) THEN RAISE EXCEPTION 'GUEST_IN_USE'; END IF;
    DELETE FROM poker_guests WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

-- Attach a guest to a real account. Every row the guest has (any session
-- status) gets user_id set and its confirmation reset so the player can
-- confirm or dispute it from their inbox. Lock order: sessions, then entries.
CREATE OR REPLACE FUNCTION link_poker_guest(p_guest_id UUID, p_user_id UUID)
RETURNS SETOF poker_guests
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid   UUID := auth.uid();
    v_guest poker_guests%ROWTYPE;
BEGIN
    IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
    SELECT * INTO v_guest FROM poker_guests WHERE id = p_guest_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'GUEST_NOT_FOUND'; END IF;
    IF NOT poker_can_manage_guest(v_guest, v_uid) THEN RAISE EXCEPTION 'NOT_GUEST_OWNER'; END IF;
    IF v_guest.linked_user_id IS NOT NULL THEN RAISE EXCEPTION 'GUEST_ALREADY_LINKED'; END IF;
    IF p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'UNKNOWN_USER';
    END IF;

    PERFORM 1 FROM poker_sessions s
    WHERE s.id IN (SELECT e.session_id FROM poker_entries e WHERE e.guest_id = p_guest_id)
    ORDER BY s.id
    FOR UPDATE;

    -- The person already has a row of their own in a session the guest is in;
    -- merging silently would double-count, so the host fixes that ledger first.
    IF EXISTS (
        SELECT 1
        FROM poker_entries g
        JOIN poker_entries own
          ON own.session_id = g.session_id AND own.user_id = p_user_id AND own.id <> g.id
        WHERE g.guest_id = p_guest_id
    ) THEN
        RAISE EXCEPTION 'GUEST_LINK_CONFLICT';
    END IF;

    UPDATE poker_entries e
    SET user_id         = p_user_id,
        acknowledged_at = CASE WHEN s.host_id = p_user_id THEN NOW() END,
        disputed_at     = NULL,
        dispute_reason  = NULL
    FROM poker_sessions s
    WHERE s.id = e.session_id AND e.guest_id = p_guest_id;

    UPDATE poker_guests SET linked_user_id = p_user_id, linked_at = NOW() WHERE id = p_guest_id;
    RETURN QUERY SELECT * FROM poker_guests WHERE id = p_guest_id;
END;
$$ LANGUAGE plpgsql;

-- Undo a link. Rows go back to being guest-only (confirmations cleared).
CREATE OR REPLACE FUNCTION unlink_poker_guest(p_guest_id UUID)
RETURNS SETOF poker_guests
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid   UUID := auth.uid();
    v_guest poker_guests%ROWTYPE;
BEGIN
    IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
    SELECT * INTO v_guest FROM poker_guests WHERE id = p_guest_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'GUEST_NOT_FOUND'; END IF;
    IF NOT poker_can_manage_guest(v_guest, v_uid) THEN RAISE EXCEPTION 'NOT_GUEST_OWNER'; END IF;
    IF v_guest.linked_user_id IS NULL THEN RAISE EXCEPTION 'GUEST_NOT_LINKED'; END IF;

    PERFORM 1 FROM poker_sessions s
    WHERE s.id IN (SELECT e.session_id FROM poker_entries e WHERE e.guest_id = p_guest_id)
    ORDER BY s.id
    FOR UPDATE;

    UPDATE poker_entries
    SET user_id = NULL, acknowledged_at = NULL, disputed_at = NULL, dispute_reason = NULL
    WHERE guest_id = p_guest_id AND user_id = v_guest.linked_user_id;

    UPDATE poker_guests SET linked_user_id = NULL, linked_at = NULL WHERE id = p_guest_id;
    RETURN QUERY SELECT * FROM poker_guests WHERE id = p_guest_id;
END;
$$ LANGUAGE plpgsql;

REVOKE EXECUTE ON FUNCTION poker_can_manage_guest(poker_guests, UUID) FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------
-- 7. Leaderboard: rows without a user are not ranked
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
        WHERE c.user_id IS NOT NULL
          AND (p_kind  IS NULL OR c.kind = p_kind)
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
        WHERE c.user_id IS NOT NULL
          AND (p_kind  IS NULL OR c.kind = p_kind)
          AND (p_since IS NULL OR c.played_at >= p_since)
          AND (p_until IS NULL OR c.played_at <  p_until)
          AND (p_dorm_id IS NULL OR u.dorm_id = p_dorm_id)
        GROUP BY c.user_id
        HAVING COUNT(*) >= GREATEST(COALESCE(p_min_sessions, 1), 1)
    ) x;
$$ LANGUAGE sql;
