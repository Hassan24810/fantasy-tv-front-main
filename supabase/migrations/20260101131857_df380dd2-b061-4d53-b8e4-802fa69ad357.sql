-- Add gender column to participants table
ALTER TABLE public.participants 
ADD COLUMN IF NOT EXISTS gender text DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.participants.gender IS 'Participant gender: Male, Female, or Other';