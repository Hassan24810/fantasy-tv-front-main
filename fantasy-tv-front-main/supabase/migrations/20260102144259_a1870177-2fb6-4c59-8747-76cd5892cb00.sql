-- Drop existing constraint that doesn't allow 'inactive' or 'customized'
ALTER TABLE participants DROP CONSTRAINT IF EXISTS participants_status_check;

-- Create new constraint with all valid statuses
ALTER TABLE participants ADD CONSTRAINT participants_status_check 
CHECK (status IN ('active', 'inactive', 'customized', 'eliminated', 'winner'));

-- Add custom_status_label column for customized status
ALTER TABLE participants ADD COLUMN IF NOT EXISTS custom_status_label text;