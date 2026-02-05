-- Function to calculate ELO rating changes
-- This function calculates new ratings based on the standard ELO formula
CREATE OR REPLACE FUNCTION calculate_elo_ratings(
    p_rating1 INTEGER,
    p_rating2 INTEGER,
    p_winner INTEGER -- 1 for player1, 2 for player2
)
RETURNS TABLE (
    new_rating1 INTEGER,
    new_rating2 INTEGER,
    rating_change1 INTEGER,
    rating_change2 INTEGER
) AS $$
DECLARE
    v_k_factor INTEGER := 32;
    v_expected_score1 NUMERIC;
    v_expected_score2 NUMERIC;
    v_actual_score1 NUMERIC;
    v_actual_score2 NUMERIC;
    v_new_rating1 INTEGER;
    v_new_rating2 INTEGER;
BEGIN
    -- Calculate expected scores
    v_expected_score1 := 1.0 / (1.0 + POWER(10.0, (p_rating2 - p_rating1) / 400.0));
    v_expected_score2 := 1.0 - v_expected_score1;
    
    -- Determine actual scores
    IF p_winner = 1 THEN
        v_actual_score1 := 1.0;
        v_actual_score2 := 0.0;
    ELSE
        v_actual_score1 := 0.0;
        v_actual_score2 := 1.0;
    END IF;
    
    -- Calculate new ratings
    v_new_rating1 := ROUND(p_rating1 + v_k_factor * (v_actual_score1 - v_expected_score1));
    v_new_rating2 := ROUND(p_rating2 + v_k_factor * (v_actual_score2 - v_expected_score2));
    
    RETURN QUERY SELECT
        v_new_rating1,
        v_new_rating2,
        v_new_rating1 - p_rating1,
        v_new_rating2 - p_rating2;
END;
$$ LANGUAGE plpgsql;

-- Function to update ELO ratings when a match is completed
-- Uses SECURITY DEFINER to bypass RLS for system updates
CREATE OR REPLACE FUNCTION update_elo_on_match_completion()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_elo_result RECORD;
    v_winner INTEGER;
BEGIN
    -- Only process if match status changed to 'completed'
    IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.winner_id IS NOT NULL THEN
        -- Determine winner (1 for player1, 2 for player2)
        IF NEW.winner_id = NEW.player1_id THEN
            v_winner := 1;
        ELSE
            v_winner := 2;
        END IF;
        
        -- Calculate new ELO ratings
        SELECT * INTO v_elo_result
        FROM calculate_elo_ratings(
            NEW.player1_elo_before,
            NEW.player2_elo_before,
            v_winner
        );
        
        -- Update match with new ratings
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

-- Trigger to automatically update ELO ratings when match is completed
CREATE TRIGGER trigger_update_elo_on_match_completion
    BEFORE UPDATE ON matches
    FOR EACH ROW
    EXECUTE FUNCTION update_elo_on_match_completion();

-- Function to manually update ELO ratings (for server-side use)
-- This can be called from the application if needed
CREATE OR REPLACE FUNCTION update_elo_ratings_manual(
    p_user1_id UUID,
    p_user2_id UUID,
    p_game_type game_type,
    p_winner_id UUID
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_rating1 INTEGER;
    v_rating2 INTEGER;
    v_elo_result RECORD;
    v_winner INTEGER;
BEGIN
    -- Get current ratings
    SELECT rating INTO v_rating1 FROM elo_ratings WHERE user_id = p_user1_id AND game_type = p_game_type;
    SELECT rating INTO v_rating2 FROM elo_ratings WHERE user_id = p_user2_id AND game_type = p_game_type;
    
    -- Determine winner
    IF p_winner_id = p_user1_id THEN
        v_winner := 1;
    ELSE
        v_winner := 2;
    END IF;
    
    -- Calculate new ratings
    SELECT * INTO v_elo_result
    FROM calculate_elo_ratings(v_rating1, v_rating2, v_winner);
    
    -- Update player 1
    UPDATE elo_ratings
    SET
        rating = v_elo_result.new_rating1,
        matches_played = matches_played + 1,
        wins = CASE WHEN v_winner = 1 THEN wins + 1 ELSE wins END,
        losses = CASE WHEN v_winner = 2 THEN losses + 1 ELSE losses END,
        updated_at = NOW()
    WHERE user_id = p_user1_id AND game_type = p_game_type;
    
    -- Update player 2
    UPDATE elo_ratings
    SET
        rating = v_elo_result.new_rating2,
        matches_played = matches_played + 1,
        wins = CASE WHEN v_winner = 2 THEN wins + 1 ELSE wins END,
        losses = CASE WHEN v_winner = 1 THEN losses + 1 ELSE losses END,
        updated_at = NOW()
    WHERE user_id = p_user2_id AND game_type = p_game_type;
END;
$$ LANGUAGE plpgsql;

-- Function to get leaderboard for a specific game type
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
        AND (p_dorm_id IS NULL OR u.dorm_id = p_dorm_id)
    ORDER BY er.rating DESC, er.wins DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;
