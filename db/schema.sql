CREATE TABLE IF NOT EXISTS surveys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'draft',
  publish_starts_at TEXT,
  response_deadline_at TEXT
);

CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  survey_id INTEGER NOT NULL REFERENCES surveys(id),
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL,
  options TEXT,
  allow_other_text INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id INTEGER NOT NULL REFERENCES questions(id),
  answer TEXT NOT NULL,
  user_email TEXT,
  submitted_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  survey_id INTEGER NOT NULL REFERENCES surveys(id),
  user_email TEXT NOT NULL,
  submitted_at TEXT DEFAULT (datetime('now')),
  UNIQUE(survey_id, user_email)
);

CREATE INDEX IF NOT EXISTS idx_questions_survey_id ON questions(survey_id);
CREATE INDEX IF NOT EXISTS idx_responses_question_id ON responses(question_id);
CREATE INDEX IF NOT EXISTS idx_submissions_survey_user ON submissions(survey_id, user_email);
CREATE INDEX IF NOT EXISTS idx_surveys_status_publish ON surveys(status, publish_starts_at);
CREATE INDEX IF NOT EXISTS idx_surveys_status_deadline ON surveys(status, response_deadline_at);

CREATE TABLE IF NOT EXISTS minutes (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  slug         TEXT NOT NULL UNIQUE,
  title        TEXT NOT NULL,
  date         TEXT NOT NULL,
  attendees    TEXT NOT NULL DEFAULT '[]',
  topics       TEXT NOT NULL DEFAULT '[]',
  content_md   TEXT NOT NULL DEFAULT '',
  content_html TEXT NOT NULL DEFAULT '',
  created_at   TEXT DEFAULT (datetime('now')),
  updated_at   TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS schedule (
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

CREATE TABLE IF NOT EXISTS resources (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  title                TEXT NOT NULL,
  url                  TEXT NOT NULL,
  type                 TEXT NOT NULL,
  tags                 TEXT NOT NULL DEFAULT '[]',
  date                 TEXT NOT NULL,
  presenter            TEXT,
  related_minutes_slug TEXT,
  source_type          TEXT NOT NULL DEFAULT 'url',
  file_key             TEXT,
  file_name            TEXT,
  file_size            INTEGER,
  mime_type            TEXT,
  submitted_by         TEXT,
  created_at           TEXT DEFAULT (datetime('now')),
  updated_at           TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_minutes_date ON minutes(date);
CREATE INDEX IF NOT EXISTS idx_schedule_date ON schedule(date);
CREATE INDEX IF NOT EXISTS idx_resources_date ON resources(date);

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
-- status: 'pending'（応募中）/ 'scheduled'（発表予定）/ 'done'（発表済み）

CREATE INDEX IF NOT EXISTS idx_speaker_applications_email ON speaker_applications(user_email);
CREATE INDEX IF NOT EXISTS idx_speaker_applications_status ON speaker_applications(status);

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
