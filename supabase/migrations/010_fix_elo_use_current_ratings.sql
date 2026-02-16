-- Fix ELO trigger to use current ratings from elo_ratings at completion time,
-- so completion order does not overwrite earlier results.
CREATE OR REPLACE FUNCTION update_elo_on_match_completion()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_elo_result RECORD;
    v_winner INTEGER;
    v_rating1 INTEGER;
    v_rating2 INTEGER;
BEGIN
    -- Only process if match status changed to 'completed'
    IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.winner_id IS NOT NULL THEN
        -- Determine winner (1 for player1, 2 for player2)
        IF NEW.winner_id = NEW.player1_id THEN
            v_winner := 1;
        ELSE
            v_winner := 2;
        END IF;

        -- Use current ratings from elo_ratings; fallback to match row if missing (e.g. legacy user)
        SELECT COALESCE((SELECT rating FROM elo_ratings WHERE user_id = NEW.player1_id AND game_type = NEW.game_type), NEW.player1_elo_before) INTO v_rating1;
        SELECT COALESCE((SELECT rating FROM elo_ratings WHERE user_id = NEW.player2_id AND game_type = NEW.game_type), NEW.player2_elo_before) INTO v_rating2;

        -- Calculate new ELO ratings from current state
        SELECT * INTO v_elo_result
        FROM calculate_elo_ratings(v_rating1, v_rating2, v_winner);

        -- Update match row: store the "before" we actually used and the "after" we computed
        NEW.player1_elo_before := v_rating1;
        NEW.player2_elo_before := v_rating2;
        NEW.player1_elo_after := v_elo_result.new_rating1;
        NEW.player2_elo_after := v_elo_result.new_rating2;

        -- Update ELO ratings table for player 1
        UPDATE elo_ratings
        SET
            rating = v_elo_result.new_rating1,
            matches_played = matches_played + 1,
            wins = CASE WHEN v_winner = 1 THEN wins + 1 ELSE wins END,
            losses = CASE WHEN v_winner = 2 THEN losses + 1 ELSE losses END,
            updated_at = NOW()
        WHERE user_id = NEW.player1_id AND game_type = NEW.game_type;

        -- Update ELO ratings table for player 2
        UPDATE elo_ratings
        SET
            rating = v_elo_result.new_rating2,
            matches_played = matches_played + 1,
            wins = CASE WHEN v_winner = 2 THEN wins + 1 ELSE wins END,
            losses = CASE WHEN v_winner = 1 THEN losses + 1 ELSE losses END,
            updated_at = NOW()
        WHERE user_id = NEW.player2_id AND game_type = NEW.game_type;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
