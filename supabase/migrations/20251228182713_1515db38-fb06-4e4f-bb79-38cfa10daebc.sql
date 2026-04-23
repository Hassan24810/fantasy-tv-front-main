-- Expand allowed event_type values to match onboarding/admin usage
ALTER TABLE public.game_rules DROP CONSTRAINT IF EXISTS game_rules_event_type_check;
ALTER TABLE public.game_rules
  ADD CONSTRAINT game_rules_event_type_check
  CHECK (
    event_type = ANY (
      ARRAY[
        'positive'::text,
        'negative'::text,
        'bonus'::text,
        'elimination'::text,
        'social'::text
      ]
    )
  );

-- Add participants_count and updated_at columns for richer rule definitions
ALTER TABLE public.game_rules
  ADD COLUMN IF NOT EXISTS participants_count INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Basic validation at DB level
ALTER TABLE public.game_rules DROP CONSTRAINT IF EXISTS game_rules_participants_count_check;
ALTER TABLE public.game_rules
  ADD CONSTRAINT game_rules_participants_count_check
  CHECK (participants_count > 0);

-- Trigger to keep updated_at fresh
DROP TRIGGER IF EXISTS update_game_rules_updated_at ON public.game_rules;
CREATE TRIGGER update_game_rules_updated_at
BEFORE UPDATE ON public.game_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();