-- Add phone_number for SMS notifications (e.g. challenge alerts via Twilio)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone_number TEXT;
