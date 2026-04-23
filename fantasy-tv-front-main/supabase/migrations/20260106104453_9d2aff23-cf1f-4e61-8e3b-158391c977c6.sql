-- Fix search_path for validate_show_update_dates function
CREATE OR REPLACE FUNCTION public.validate_show_update_dates()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.expire_at IS NOT NULL AND NEW.expire_at <= NEW.publish_at THEN
    RAISE EXCEPTION 'expire_at must be after publish_at';
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;