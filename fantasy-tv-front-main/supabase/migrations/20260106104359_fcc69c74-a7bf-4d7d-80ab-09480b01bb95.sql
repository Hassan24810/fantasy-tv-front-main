-- Create show_updates table for B2B admin news/updates
CREATE TABLE public.show_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  publish_at TIMESTAMPTZ NOT NULL,
  expire_at TIMESTAMPTZ,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.show_updates ENABLE ROW LEVEL SECURITY;

-- Show owners can manage updates (CRUD)
CREATE POLICY "Show owners can manage updates"
  ON public.show_updates FOR ALL
  USING (EXISTS (
    SELECT 1 FROM shows WHERE shows.id = show_updates.show_id 
    AND shows.user_id = auth.uid()
  ));

-- B2C users can read active updates for active shows
CREATE POLICY "Active updates are publicly readable"
  ON public.show_updates FOR SELECT
  USING (
    is_enabled = true
    AND publish_at <= now()
    AND (expire_at IS NULL OR expire_at > now())
    AND EXISTS (
      SELECT 1 FROM shows WHERE shows.id = show_updates.show_id 
      AND shows.status = 'active'
    )
  );

-- Validation trigger for expire_at > publish_at
CREATE OR REPLACE FUNCTION public.validate_show_update_dates()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expire_at IS NOT NULL AND NEW.expire_at <= NEW.publish_at THEN
    RAISE EXCEPTION 'expire_at must be after publish_at';
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER show_updates_validate_dates
  BEFORE INSERT OR UPDATE ON public.show_updates
  FOR EACH ROW EXECUTE FUNCTION public.validate_show_update_dates();