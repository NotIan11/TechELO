-- Add first_name and last_name columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Update display_name generation to use first_name + last_name if available
-- This will be handled in the application code, but we can add a function for it
CREATE OR REPLACE FUNCTION update_display_name_from_names()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.first_name IS NOT NULL AND NEW.last_name IS NOT NULL THEN
        NEW.display_name := NEW.first_name || ' ' || NEW.last_name;
    ELSIF NEW.first_name IS NOT NULL THEN
        NEW.display_name := NEW.first_name;
    ELSIF NEW.last_name IS NOT NULL THEN
        NEW.display_name := NEW.last_name;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update display_name when first_name or last_name changes
CREATE TRIGGER trigger_update_display_name_from_names
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW
    WHEN (NEW.first_name IS NOT NULL OR NEW.last_name IS NOT NULL)
    EXECUTE FUNCTION update_display_name_from_names();
