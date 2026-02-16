-- One-off backfill: recompute elo_ratings from all completed matches in chronological order
-- so already-wrong ratings (e.g. from out-of-order completion) are corrected.
CREATE OR REPLACE FUNCTION backfill_elo_from_completed_matches()
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    m RECORD;
    v_rating1 INTEGER;
    v_rating2 INTEGER;
    v_winner INTEGER;
    v_elo_result RECORD;
BEGIN
    -- Temp table: running state per (user_id, game_type) for players in completed matches
    CREATE TEMP TABLE IF NOT EXISTS backfill_elo_state (
        user_id UUID NOT NULL,
        game_type game_type NOT NULL,
        rating INTEGER NOT NULL DEFAULT 1500,
        wins INTEGER NOT NULL DEFAULT 0,
        losses INTEGER NOT NULL DEFAULT 0,
        matches_played INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (user_id, game_type)
    ) ON COMMIT DROP;

    TRUNCATE backfill_elo_state;

    -- Seed: every (user_id, game_type) that appears in any completed match, start at 1500,0,0,0
    INSERT INTO backfill_elo_state (user_id, game_type, rating, wins, losses, matches_played)
    SELECT user_id, game_type, 1500, 0, 0, 0
    FROM (
        SELECT player1_id AS user_id, game_type FROM matches WHERE status = 'completed' AND winner_id IS NOT NULL
        UNION
        SELECT player2_id AS user_id, game_type FROM matches WHERE status = 'completed' AND winner_id IS NOT NULL
    ) t
    ON CONFLICT (user_id, game_type) DO NOTHING;

    -- Process completed matches in chronological order
    FOR m IN
        SELECT id, game_type, player1_id, player2_id, winner_id
        FROM matches
        WHERE status = 'completed' AND winner_id IS NOT NULL
        ORDER BY completed_at ASC NULLS LAST, id ASC
    LOOP
        SELECT rating INTO v_rating1 FROM backfill_elo_state WHERE user_id = m.player1_id AND game_type = m.game_type;
        SELECT rating INTO v_rating2 FROM backfill_elo_state WHERE user_id = m.player2_id AND game_type = m.game_type;

        v_winner := CASE WHEN m.winner_id = m.player1_id THEN 1 ELSE 2 END;

        SELECT * INTO v_elo_result
        FROM calculate_elo_ratings(v_rating1, v_rating2, v_winner);

        UPDATE backfill_elo_state
        SET rating = v_elo_result.new_rating1,
            matches_played = matches_played + 1,
            wins = wins + CASE WHEN v_winner = 1 THEN 1 ELSE 0 END,
            losses = losses + CASE WHEN v_winner = 2 THEN 1 ELSE 0 END
        WHERE user_id = m.player1_id AND game_type = m.game_type;

        UPDATE backfill_elo_state
        SET rating = v_elo_result.new_rating2,
            matches_played = matches_played + 1,
            wins = wins + CASE WHEN v_winner = 2 THEN 1 ELSE 0 END,
            losses = losses + CASE WHEN v_winner = 1 THEN 1 ELSE 0 END
        WHERE user_id = m.player2_id AND game_type = m.game_type;
    END LOOP;

    -- Write back to elo_ratings: update existing rows
    UPDATE elo_ratings er
    SET rating = b.rating,
        wins = b.wins,
        losses = b.losses,
        matches_played = b.matches_played,
        updated_at = NOW()
    FROM backfill_elo_state b
    WHERE er.user_id = b.user_id AND er.game_type = b.game_type;

    -- Insert rows for (user_id, game_type) that don't exist yet
    INSERT INTO elo_ratings (user_id, game_type, rating, matches_played, wins, losses, updated_at)
    SELECT b.user_id, b.game_type, b.rating, b.matches_played, b.wins, b.losses, NOW()
    FROM backfill_elo_state b
    WHERE NOT EXISTS (
        SELECT 1 FROM elo_ratings er WHERE er.user_id = b.user_id AND er.game_type = b.game_type
    );
END;
$$ LANGUAGE plpgsql;

-- Run the backfill once
SELECT backfill_elo_from_completed_matches();
