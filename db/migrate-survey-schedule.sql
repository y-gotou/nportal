-- Migration: Add survey publish start and response deadline fields
-- Use this on databases that have already applied the previous migrate.sql.

ALTER TABLE surveys ADD COLUMN publish_starts_at TEXT;
ALTER TABLE surveys ADD COLUMN response_deadline_at TEXT;

CREATE INDEX IF NOT EXISTS idx_surveys_status_publish ON surveys(status, publish_starts_at);
CREATE INDEX IF NOT EXISTS idx_surveys_status_deadline ON surveys(status, response_deadline_at);
