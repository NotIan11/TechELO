-- ============================================================
-- 012: Security hardening + match lifecycle RPCs
--
-- Fixes:
--  * Any authenticated user could UPDATE any elo_ratings row directly.
--  * Match players could UPDATE matches to any state (instant self-win).
--  * Match INSERT allowed spoofed rows (pre-completed, as player2, etc).
--  * get_leaderboard listed every signup at 1500 with 0 matches.
--  * Leaderboard pagination count could not respect the dorm filter.
--  * Result-reporting race could strand a match in pending_result.
--
-- All state transitions now go through SECURITY DEFINER functions that
-- validate auth.uid(), match state, and challenge expiry, with row locks.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Lock down direct table writes
-- ------------------------------------------------------------

-- ELO is only ever written by the completion trigger (SECURITY DEFINER).
DROP POLICY IF EXISTS "ELO ratings can be updated by system" ON elo_ratings;

-- Match state transitions now happen via the RPCs below.
DROP POLICY IF EXISTS "Match players can update matches" ON matches;

-- Only the challenger can create a match, and only in a clean initial state.
DROP POLICY IF EXISTS "Authenticated users can create matches" ON matches;
CREATE POLICY "Challenger can create pending matches"
    ON matches FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated'
        AND auth.uid() = player1_id
        AND player1_id != player2_id
        AND status = 'pending_start'
        AND winner_id IS NULL
        AND player1_elo_after IS NULL
        AND player2_elo_after IS NULL
        AND player2_start_accepted = FALSE
        AND player1_result_accepted = FALSE
        AND player2_result_accepted = FALSE
    );

-- The per-user ELO rows are created by this trigger when a users row is
-- inserted. Make it SECURITY DEFINER so profile creation also works when the
-- insert comes from the client ("Users can insert their own profile" policy),
-- where the trigger would otherwise be blocked by elo_ratings RLS.
CREATE OR REPLACE FUNCTION initialize_elo_ratings()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO elo_ratings (user_id, game_type, rating)
    VALUES
        (NEW.id, 'pool', 1500),
        (NEW.id, 'ping_pong', 1500)
    ON CONFLICT (user_id, game_type) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Cleanup before the uniqueness index: expire stale challenges, then cancel
-- all but the newest active match for any pair that has duplicates.
UPDATE matches
SET status = 'challenge_expired'
WHERE status = 'pending_start' AND created_at < NOW() - INTERVAL '1 hour';

UPDATE matches m
SET status = 'cancelled'
WHERE m.status IN ('pending_start', 'in_progress', 'pending_result')
  AND EXISTS (
      SELECT 1 FROM matches newer
      WHERE newer.status IN ('pending_start', 'in_progress', 'pending_result')
        AND newer.game_type = m.game_type
        AND LEAST(newer.player1_id, newer.player2_id) = LEAST(m.player1_id, m.player2_id)
        AND GREATEST(newer.player1_id, newer.player2_id) = GREATEST(m.player1_id, m.player2_id)
        AND (newer.created_at > m.created_at
             OR (newer.created_at = m.created_at AND newer.id > m.id))
  );

-- One active match per pair per game (order-independent).
CREATE UNIQUE INDEX IF NOT EXISTS idx_matches_one_active_per_pair
    ON matches (game_type, LEAST(player1_id, player2_id), GREATEST(player1_id, player2_id))
    WHERE status IN ('pending_start', 'in_progress', 'pending_result');

-- ------------------------------------------------------------
-- 2. Match lifecycle RPCs
--    All raise exceptions with stable codes the app maps to messages:
--    MATCH_NOT_FOUND / NOT_A_PLAYER / NOT_YOUR_CHALLENGE / WRONG_STATUS /
--    ALREADY_REPORTED / INVALID_WINNER
-- ------------------------------------------------------------

-- Opponent accepts a challenge. Returns the updated match row; if the
-- challenge sat for more than an hour it is marked challenge_expired and
-- that row is returned instead (callers check status).
CREATE OR REPLACE FUNCTION accept_match_start(p_match_id UUID)
RETURNS SETOF matches
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_match matches%ROWTYPE;
BEGIN
    SELECT * INTO v_match FROM matches WHERE id = p_match_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'MATCH_NOT_FOUND';
    END IF;
    IF v_match.player2_id != auth.uid() THEN
        RAISE EXCEPTION 'NOT_YOUR_CHALLENGE';
    END IF;
    IF v_match.status != 'pending_start' THEN
        RAISE EXCEPTION 'WRONG_STATUS';
    END IF;

    IF v_match.created_at < NOW() - INTERVAL '1 hour' THEN
        UPDATE matches SET status = 'challenge_expired' WHERE id = p_match_id;
    ELSE
        UPDATE matches
        SET player2_start_accepted = TRUE,
            status = 'in_progress',
            started_at = NOW()
        WHERE id = p_match_id;
    END IF;

    RETURN QUERY SELECT * FROM matches WHERE id = p_match_id;
END;
$$ LANGUAGE plpgsql;

-- Opponent declines a challenge.
CREATE OR REPLACE FUNCTION decline_match(p_match_id UUID)
RETURNS SETOF matches
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_match matches%ROWTYPE;
BEGIN
    SELECT * INTO v_match FROM matches WHERE id = p_match_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'MATCH_NOT_FOUND';
    END IF;
    IF v_match.player2_id != auth.uid() THEN
        RAISE EXCEPTION 'NOT_YOUR_CHALLENGE';
    END IF;
    IF v_match.status != 'pending_start' THEN
        RAISE EXCEPTION 'WRONG_STATUS';
    END IF;

    UPDATE matches SET status = 'cancelled' WHERE id = p_match_id;
    RETURN QUERY SELECT * FROM matches WHERE id = p_match_id;
END;
$$ LANGUAGE plpgsql;

-- Challenger withdraws their own pending challenge.
CREATE OR REPLACE FUNCTION cancel_match(p_match_id UUID)
RETURNS SETOF matches
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_match matches%ROWTYPE;
BEGIN
    SELECT * INTO v_match FROM matches WHERE id = p_match_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'MATCH_NOT_FOUND';
    END IF;
    IF v_match.player1_id != auth.uid() THEN
        RAISE EXCEPTION 'NOT_YOUR_CHALLENGE';
    END IF;
    IF v_match.status != 'pending_start' THEN
        RAISE EXCEPTION 'WRONG_STATUS';
    END IF;

    UPDATE matches SET status = 'cancelled' WHERE id = p_match_id;
    RETURN QUERY SELECT * FROM matches WHERE id = p_match_id;
END;
$$ LANGUAGE plpgsql;

-- A player reports the winner. First report records the winner and moves the
-- match to pending_result; the second report either completes the match
-- (agreement -> ELO trigger fires) or marks it disputed (disagreement).
-- The row lock makes concurrent reports serialize instead of stranding the
-- match with both flags set and no completion.
CREATE OR REPLACE FUNCTION report_match_result(p_match_id UUID, p_winner_id UUID)
RETURNS SETOF matches
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_match matches%ROWTYPE;
    v_is_p1 BOOLEAN;
BEGIN
    SELECT * INTO v_match FROM matches WHERE id = p_match_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'MATCH_NOT_FOUND';
    END IF;
    IF auth.uid() != v_match.player1_id AND auth.uid() != v_match.player2_id THEN
        RAISE EXCEPTION 'NOT_A_PLAYER';
    END IF;
    IF v_match.status NOT IN ('in_progress', 'pending_result') THEN
        RAISE EXCEPTION 'WRONG_STATUS';
    END IF;
    IF p_winner_id != v_match.player1_id AND p_winner_id != v_match.player2_id THEN
        RAISE EXCEPTION 'INVALID_WINNER';
    END IF;

    v_is_p1 := auth.uid() = v_match.player1_id;
    IF (v_is_p1 AND v_match.player1_result_accepted)
       OR (NOT v_is_p1 AND v_match.player2_result_accepted) THEN
        RAISE EXCEPTION 'ALREADY_REPORTED';
    END IF;

    IF v_match.winner_id IS NULL THEN
        -- First report
        UPDATE matches
        SET winner_id = p_winner_id,
            status = 'pending_result',
            player1_result_accepted = player1_result_accepted OR v_is_p1,
            player2_result_accepted = player2_result_accepted OR NOT v_is_p1
        WHERE id = p_match_id;
    ELSIF v_match.winner_id = p_winner_id THEN
        -- Agreement: complete (BEFORE UPDATE trigger applies ELO)
        UPDATE matches
        SET status = 'completed',
            completed_at = NOW(),
            player1_result_accepted = TRUE,
            player2_result_accepted = TRUE
        WHERE id = p_match_id;
    ELSE
        -- Disagreement: dispute
        UPDATE matches
        SET status = 'disputed',
            winner_id = NULL,
            player1_result_accepted = TRUE,
            player2_result_accepted = TRUE
        WHERE id = p_match_id;
    END IF;

    RETURN QUERY SELECT * FROM matches WHERE id = p_match_id;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- 3. Leaderboard: only ranked (>=1 match) players, and a count
--    function so pagination can respect the dorm filter.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_leaderboard(
    p_game_type game_type,
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0,
    p_dorm_id UUID DEFAULT NULL
)
RETURNS TABLE (
    rank BIGINT,
    user_id UUID,
    display_name TEXT,
    rating INTEGER,
    matches_played INTEGER,
    wins INTEGER,
    losses INTEGER,
    dorm_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ROW_NUMBER() OVER (ORDER BY er.rating DESC, er.wins DESC)::BIGINT AS rank,
        u.id AS user_id,
        u.display_name,
        er.rating,
        er.matches_played,
        er.wins,
        er.losses,
        d.name AS dorm_name
    FROM elo_ratings er
    JOIN users u ON er.user_id = u.id
    LEFT JOIN dorms d ON u.dorm_id = d.id
    WHERE er.game_type = p_game_type
        AND er.matches_played > 0
        AND (p_dorm_id IS NULL OR u.dorm_id = p_dorm_id)
    ORDER BY er.rating DESC, er.wins DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_leaderboard_count(
    p_game_type game_type,
    p_dorm_id UUID DEFAULT NULL
)
RETURNS BIGINT AS $$
DECLARE
    v_count BIGINT;
BEGIN
    SELECT COUNT(*)
    INTO v_count
    FROM elo_ratings er
    JOIN users u ON er.user_id = u.id
    WHERE er.game_type = p_game_type
        AND er.matches_played > 0
        AND (p_dorm_id IS NULL OR u.dorm_id = p_dorm_id);
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;
