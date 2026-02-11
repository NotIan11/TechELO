-- Add 'challenge_expired' to match_status enum for expired challenges (1hr)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'challenge_expired'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'match_status')
  ) THEN
    ALTER TYPE match_status ADD VALUE 'challenge_expired';
  END IF;
END
$$;
