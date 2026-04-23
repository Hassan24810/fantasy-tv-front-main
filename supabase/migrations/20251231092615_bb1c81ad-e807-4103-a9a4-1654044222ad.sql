-- Add eliminated_position column to game_rules
ALTER TABLE public.game_rules 
ADD COLUMN IF NOT EXISTS eliminated_position integer DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN public.game_rules.eliminated_position IS 
  'Which participant position (1-based) is eliminated when this elimination rule is applied';