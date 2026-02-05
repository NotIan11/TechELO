-- Create custom types
CREATE TYPE game_type AS ENUM ('pool', 'ping_pong');
CREATE TYPE match_status AS ENUM ('pending_start', 'in_progress', 'pending_result', 'completed', 'disputed');

-- Create dorms table
CREATE TABLE dorms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_members INTEGER DEFAULT 0
);

-- Create users table (extends auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    university_email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    dorm_id UUID REFERENCES dorms(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    profile_image_url TEXT
);

-- Create elo_ratings table
CREATE TABLE elo_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_type game_type NOT NULL,
    rating INTEGER NOT NULL DEFAULT 1500,
    matches_played INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, game_type)
);

-- Create matches table
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_type game_type NOT NULL,
    player1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    player2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    player1_elo_before INTEGER NOT NULL,
    player2_elo_before INTEGER NOT NULL,
    player1_elo_after INTEGER,
    player2_elo_after INTEGER,
    status match_status NOT NULL DEFAULT 'pending_start',
    winner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    player1_start_accepted BOOLEAN NOT NULL DEFAULT FALSE,
    player2_start_accepted BOOLEAN NOT NULL DEFAULT FALSE,
    player1_result_accepted BOOLEAN NOT NULL DEFAULT FALSE,
    player2_result_accepted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    CHECK (player1_id != player2_id)
);

-- Create match_disputes table
CREATE TABLE match_disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    disputed_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_users_dorm_id ON users(dorm_id);
CREATE INDEX idx_elo_ratings_user_id ON elo_ratings(user_id);
CREATE INDEX idx_elo_ratings_game_type ON elo_ratings(game_type);
CREATE INDEX idx_matches_player1_id ON matches(player1_id);
CREATE INDEX idx_matches_player2_id ON matches(player2_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_game_type ON matches(game_type);
CREATE INDEX idx_match_disputes_match_id ON match_disputes(match_id);

-- Function to update total_members in dorms table
CREATE OR REPLACE FUNCTION update_dorm_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.dorm_id IS NOT NULL THEN
        UPDATE dorms SET total_members = total_members + 1 WHERE id = NEW.dorm_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.dorm_id IS DISTINCT FROM NEW.dorm_id THEN
            IF OLD.dorm_id IS NOT NULL THEN
                UPDATE dorms SET total_members = total_members - 1 WHERE id = OLD.dorm_id;
            END IF;
            IF NEW.dorm_id IS NOT NULL THEN
                UPDATE dorms SET total_members = total_members + 1 WHERE id = NEW.dorm_id;
            END IF;
        END IF;
    ELSIF TG_OP = 'DELETE' AND OLD.dorm_id IS NOT NULL THEN
        UPDATE dorms SET total_members = total_members - 1 WHERE id = OLD.dorm_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update dorm member count
CREATE TRIGGER trigger_update_dorm_member_count
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_dorm_member_count();

-- Function to initialize ELO ratings for new users
CREATE OR REPLACE FUNCTION initialize_elo_ratings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO elo_ratings (user_id, game_type, rating)
    VALUES
        (NEW.id, 'pool', 1500),
        (NEW.id, 'ping_pong', 1500);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create ELO ratings when user is created
CREATE TRIGGER trigger_initialize_elo_ratings
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION initialize_elo_ratings();
