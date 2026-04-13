-- Migration: Add user tracking to responses and submissions table
-- Run this on existing databases (do NOT run on fresh installs - use schema.sql instead)

ALTER TABLE responses ADD COLUMN user_email TEXT;

CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  survey_id INTEGER NOT NULL REFERENCES surveys(id),
  user_email TEXT NOT NULL,
  submitted_at TEXT DEFAULT (datetime('now')),
  UNIQUE(survey_id, user_email)
);

CREATE INDEX IF NOT EXISTS idx_submissions_survey_user ON submissions(survey_id, user_email);
