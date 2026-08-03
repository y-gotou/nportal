CREATE TABLE IF NOT EXISTS surveys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'draft'
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

CREATE TABLE IF NOT EXISTS resource_images (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  resource_id INTEGER NOT NULL REFERENCES resources(id),
  file_key    TEXT NOT NULL,
  file_name   TEXT NOT NULL,
  file_size   INTEGER NOT NULL,
  mime_type   TEXT NOT NULL,
  created_at  TEXT DEFAULT (datetime('now'))
);
-- Markdown 資料に添付した画像。本文の相対パス参照を file_name で照合して解決する

CREATE INDEX IF NOT EXISTS idx_minutes_date ON minutes(date);
CREATE INDEX IF NOT EXISTS idx_schedule_date ON schedule(date);
CREATE INDEX IF NOT EXISTS idx_resources_date ON resources(date);
CREATE INDEX IF NOT EXISTS idx_resource_images_resource ON resource_images(resource_id);

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

CREATE TABLE IF NOT EXISTS chat_messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  schedule_id INTEGER NOT NULL REFERENCES schedule(id),
  user_email  TEXT NOT NULL,
  kind        TEXT NOT NULL DEFAULT 'text',
  body        TEXT NOT NULL DEFAULT '',
  reply_to_id INTEGER REFERENCES chat_messages(id),
  file_key    TEXT,
  file_name   TEXT,
  file_size   INTEGER,
  mime_type   TEXT,
  deleted_at  TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);
-- kind: 'text'（テキスト）/ 'stamp'（大きめ絵文字スタンプ）

CREATE TABLE IF NOT EXISTS chat_reactions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id INTEGER NOT NULL REFERENCES chat_messages(id),
  user_email TEXT NOT NULL,
  emoji      TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(message_id, user_email, emoji)
);

CREATE TABLE IF NOT EXISTS chat_room_state (
  schedule_id INTEGER PRIMARY KEY REFERENCES schedule(id),
  version     INTEGER NOT NULL DEFAULT 0,
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_schedule ON chat_messages(schedule_id, id);
CREATE INDEX IF NOT EXISTS idx_chat_reactions_message ON chat_reactions(message_id);

CREATE TABLE IF NOT EXISTS news_articles (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  published_date TEXT NOT NULL,
  url            TEXT NOT NULL UNIQUE,
  title          TEXT NOT NULL,
  source         TEXT NOT NULL,
  category       TEXT NOT NULL,
  impact_axis    TEXT NOT NULL,
  tags           TEXT NOT NULL DEFAULT '[]',
  summary        TEXT NOT NULL DEFAULT '',
  why_important  TEXT NOT NULL DEFAULT '',
  glossary       TEXT NOT NULL DEFAULT '[]',
  ai_score       INTEGER NOT NULL DEFAULT 0,
  article_date   TEXT,
  hidden_at      TEXT,
  created_at     TEXT DEFAULT (datetime('now'))
);
-- published_date: 掲載日 (JST, YYYY-MM-DD) / url: 正規化済み URL
-- impact_axis: 'tooling' / 'risk' / 'practice' / 'learning' / 'landscape'
-- summary: 要点まとめ本文。用語注に対応する語は [[用語]] で囲む
-- glossary: 用語注 [{term, description}]

CREATE TABLE IF NOT EXISTS news_votes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id INTEGER NOT NULL REFERENCES news_articles(id),
  user_email TEXT NOT NULL,
  value      INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(article_id, user_email)
);
-- value: 1（👍）/ -1（👎）

CREATE TABLE IF NOT EXISTS news_digests (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  published_date TEXT NOT NULL UNIQUE,
  overview       TEXT NOT NULL DEFAULT '',
  article_ids    TEXT NOT NULL DEFAULT '[]',
  created_at     TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_news_articles_date ON news_articles(published_date);
CREATE INDEX IF NOT EXISTS idx_news_votes_article ON news_votes(article_id);
