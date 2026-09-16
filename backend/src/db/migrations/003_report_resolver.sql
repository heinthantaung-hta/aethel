-- Existing installations may predate report resolution attribution.
-- Keep all reports and leave historical decisions unattributed.
ALTER TABLE reports ADD COLUMN IF NOT EXISTS resolved_by INTEGER
  REFERENCES users(user_id) ON DELETE SET NULL;
