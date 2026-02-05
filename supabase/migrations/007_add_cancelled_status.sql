-- Add 'cancelled' to match_status enum for declined challenges
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'cancelled'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'match_status')
  ) THEN
    ALTER TYPE match_status ADD VALUE 'cancelled';
  END IF;
END
$$;
