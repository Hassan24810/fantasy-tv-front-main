-- Add template and icon columns to game_rules for richer rule definitions
ALTER TABLE public.game_rules 
  ADD COLUMN IF NOT EXISTS template TEXT,
  ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'star';

-- Add comment for clarity
COMMENT ON COLUMN public.game_rules.template IS 'Template string for event display, e.g. "$(1) gave $(2) a hug"';
COMMENT ON COLUMN public.game_rules.icon IS 'Icon identifier for the rule';