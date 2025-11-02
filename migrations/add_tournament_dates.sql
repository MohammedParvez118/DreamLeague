-- Add start_date and end_date columns to tournaments table
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS start_date BIGINT,
ADD COLUMN IF NOT EXISTS end_date BIGINT;

-- Add comment to explain the date format
COMMENT ON COLUMN tournaments.start_date IS 'Tournament start date in Unix timestamp (milliseconds)';
COMMENT ON COLUMN tournaments.end_date IS 'Tournament end date in Unix timestamp (milliseconds)';
