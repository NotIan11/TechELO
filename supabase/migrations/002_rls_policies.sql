-- Enable Row Level Security on all tables
ALTER TABLE dorms ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE elo_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_disputes ENABLE ROW LEVEL SECURITY;

-- DORMS POLICIES
-- Anyone can view dorms
CREATE POLICY "Dorms are viewable by everyone"
    ON dorms FOR SELECT
    USING (true);

-- Only authenticated users can create dorms
CREATE POLICY "Authenticated users can create dorms"
    ON dorms FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Only authenticated users can update dorms (for now, anyone can update)
CREATE POLICY "Authenticated users can update dorms"
    ON dorms FOR UPDATE
    USING (auth.role() = 'authenticated');

-- USERS POLICIES
-- Anyone can view user profiles
CREATE POLICY "Users are viewable by everyone"
    ON users FOR SELECT
    USING (true);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
    ON users FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
    ON users FOR UPDATE
    USING (auth.uid() = id);

-- ELO_RATINGS POLICIES
-- Anyone can view ELO ratings
CREATE POLICY "ELO ratings are viewable by everyone"
    ON elo_ratings FOR SELECT
    USING (true);

-- Allow updates through the trigger function (which uses SECURITY DEFINER)
-- Users can view their own ratings, but updates happen via database functions
CREATE POLICY "ELO ratings can be updated by system"
    ON elo_ratings FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- MATCHES POLICIES
-- Anyone can view matches
CREATE POLICY "Matches are viewable by everyone"
    ON matches FOR SELECT
    USING (true);

-- Authenticated users can create matches
CREATE POLICY "Authenticated users can create matches"
    ON matches FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated' AND
        (auth.uid() = player1_id OR auth.uid() = player2_id)
    );

-- Players involved in a match can update it
CREATE POLICY "Match players can update matches"
    ON matches FOR UPDATE
    USING (
        auth.role() = 'authenticated' AND
        (auth.uid() = player1_id OR auth.uid() = player2_id)
    );

-- MATCH_DISPUTES POLICIES
-- Anyone can view disputes
CREATE POLICY "Disputes are viewable by everyone"
    ON match_disputes FOR SELECT
    USING (true);

-- Authenticated users can create disputes for matches they're involved in
CREATE POLICY "Match players can create disputes"
    ON match_disputes FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM matches
            WHERE matches.id = match_disputes.match_id
            AND (matches.player1_id = auth.uid() OR matches.player2_id = auth.uid())
        )
    );

-- Users can update their own disputes
CREATE POLICY "Users can update their own disputes"
    ON match_disputes FOR UPDATE
    USING (auth.uid() = disputed_by);
