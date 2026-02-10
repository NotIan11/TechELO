-- Function to create user profile (bypasses RLS for initial creation)
-- This function uses SECURITY DEFINER to allow user creation during auth callback
CREATE OR REPLACE FUNCTION create_user_profile(
    p_user_id UUID,
    p_university_email TEXT,
    p_display_name TEXT,
    p_first_name TEXT DEFAULT NULL,
    p_last_name TEXT DEFAULT NULL,
    p_phone_number TEXT DEFAULT NULL
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Insert user profile if it doesn't exist
    INSERT INTO users (id, university_email, display_name, first_name, last_name, phone_number)
    VALUES (p_user_id, p_university_email, p_display_name, p_first_name, p_last_name, p_phone_number)
    ON CONFLICT (id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create user profile when auth user is created
-- This runs as a trigger on auth.users to ensure profile is created in the same transaction
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_email TEXT;
    v_display_name TEXT;
    v_first_name TEXT;
    v_last_name TEXT;
    v_phone_number TEXT;
BEGIN
    -- Get email and metadata
    v_email := COALESCE(NEW.email, '');
    v_first_name := NEW.raw_user_meta_data->>'first_name';
    v_last_name := NEW.raw_user_meta_data->>'last_name';
    v_phone_number := NEW.raw_user_meta_data->>'phone_number';
    
    -- Generate display name from metadata or email
    IF v_first_name IS NOT NULL AND v_last_name IS NOT NULL THEN
        v_display_name := v_first_name || ' ' || v_last_name;
    ELSIF v_first_name IS NOT NULL THEN
        v_display_name := v_first_name;
    ELSIF v_last_name IS NOT NULL THEN
        v_display_name := v_last_name;
    ELSE
        v_display_name := split_part(v_email, '@', 1);
    END IF;
    
    -- Insert user profile (this happens in the same transaction as auth.users insert)
    -- Use ON CONFLICT to handle cases where profile already exists
    INSERT INTO public.users (id, university_email, display_name, first_name, last_name, phone_number)
    VALUES (NEW.id, v_email, v_display_name, v_first_name, v_last_name, v_phone_number)
    ON CONFLICT (id) DO NOTHING;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the auth.users insert
        -- This allows the user to be created even if profile creation fails
        RAISE WARNING 'Failed to create user profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users to automatically create profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
