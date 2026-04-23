-- Fix league_members: add missing show_id column with backfill

-- 1. Add the show_id column (nullable initially for backfill)
ALTER TABLE public.league_members 
ADD COLUMN IF NOT EXISTS show_id UUID;

-- 2. Backfill from leagues table via league_id (primary source)
UPDATE public.league_members lm
SET show_id = l.show_id
FROM public.leagues l
WHERE lm.league_id = l.id
  AND lm.show_id IS NULL;

-- 3. Fallback: backfill from show_users via show_user_id
UPDATE public.league_members lm
SET show_id = su.show_id
FROM public.show_users su
WHERE lm.show_user_id = su.id
  AND lm.show_id IS NULL;

-- 4. Make NOT NULL after backfill
ALTER TABLE public.league_members 
ALTER COLUMN show_id SET NOT NULL;

-- 5. Add foreign key to shows with cascade delete
ALTER TABLE public.league_members 
ADD CONSTRAINT fk_league_members_show_id 
FOREIGN KEY (show_id) REFERENCES public.shows(id) ON DELETE CASCADE;

-- 6. Add indexes for realtime filtering and performance
CREATE INDEX IF NOT EXISTS idx_league_members_show_id 
ON public.league_members(show_id);

CREATE INDEX IF NOT EXISTS idx_league_members_show_id_user_id 
ON public.league_members(show_id, user_id);

CREATE INDEX IF NOT EXISTS idx_league_members_league_id
ON public.league_members(league_id);

-- 7. Ensure replica identity full for realtime
ALTER TABLE public.league_members REPLICA IDENTITY FULL;
ALTER TABLE public.leagues REPLICA IDENTITY FULL;

-- 8. Add to realtime publication (ignore if already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'league_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.league_members;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'leagues'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.leagues;
  END IF;
END $$;

-- 9. Update RLS policy to validate show_id on insert
DROP POLICY IF EXISTS "Users can join leagues" ON public.league_members;

CREATE POLICY "Users can join leagues" ON public.league_members
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.uid() = user_id) 
  AND (EXISTS (
    SELECT 1 FROM leagues l
    JOIN shows s ON s.id = l.show_id
    WHERE l.id = league_members.league_id 
      AND s.status = 'active'
      AND l.show_id = league_members.show_id
  ))
);

-- 10. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';