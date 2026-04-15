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

ALTER TABLE questions ADD COLUMN allow_other_text INTEGER NOT NULL DEFAULT 0;

ALTER TABLE surveys ADD COLUMN status TEXT NOT NULL DEFAULT 'draft';

UPDATE surveys
SET status = CASE WHEN is_active = 1 THEN 'active' ELSE 'closed' END;

PRAGMA foreign_keys = OFF;

CREATE TABLE schedule_new (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  date         TEXT NOT NULL,
  time         TEXT NOT NULL,
  title        TEXT NOT NULL,
  meeting_url  TEXT,
  minutes_slug TEXT,
  topics       TEXT NOT NULL DEFAULT '[]',
  location     TEXT,
  created_at   TEXT DEFAULT (datetime('now')),
  updated_at   TEXT DEFAULT (datetime('now'))
);

INSERT INTO schedule_new (id, date, time, title, meeting_url, minutes_slug, topics, location, created_at, updated_at)
SELECT id, date, time, title, meeting_url, minutes_slug, topics, location, created_at, updated_at
FROM schedule;

DROP TABLE schedule;
ALTER TABLE schedule_new RENAME TO schedule;
CREATE INDEX IF NOT EXISTS idx_schedule_date ON schedule(date);

PRAGMA foreign_keys = ON;

-- Migration: Add speaker_applications table
CREATE TABLE IF NOT EXISTS speaker_applications (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT NOT NULL,
  title      TEXT NOT NULL,
  duration   INTEGER NOT NULL,
  note       TEXT,
  status     TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_speaker_applications_email ON speaker_applications(user_email);
CREATE INDEX IF NOT EXISTS idx_speaker_applications_status ON speaker_applications(status);

-- Migration: Add reports table
CREATE TABLE IF NOT EXISTS reports (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  report_type TEXT NOT NULL,
  title       TEXT NOT NULL,
  detail      TEXT NOT NULL,
  user_email  TEXT NOT NULL,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);
CREATE INDEX IF NOT EXISTS idx_reports_report_type ON reports(report_type);
