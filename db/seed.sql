DELETE FROM responses;
DELETE FROM submissions;
DELETE FROM questions;
DELETE FROM surveys;

INSERT INTO surveys (id, title, description, created_at, status)
VALUES
  (1, '第11回 勉強会フィードバック', 'LLMのファインチューニング入門についての感想をお聞かせください', '2026-04-03', 'active'),
  (2, '今後のテーマ希望アンケート', '次回以降の勉強会で取り上げてほしいテーマを教えてください', '2026-03-31', 'active');

INSERT INTO questions (id, survey_id, question_text, question_type, options, allow_other_text, sort_order) VALUES
  (1, 1, '今回の勉強会の満足度を教えてください', 'single_choice', '["とても満足","満足","普通","やや不満","不満"]', 0, 1),
  (2, 1, '特に参考になったポイントを選んでください', 'multiple_choice', '["理論の整理","実装例","質疑応答","今後の応用案"]', 1, 2),
  (3, 1, '今後改善してほしい点や要望があればご記入ください', 'free_text', '[]', 0, 3),
  (4, 2, '興味のあるテーマを選んでください（複数選択可）', 'multiple_choice', '["RAG設計","評価指標","AIエージェント","MLOps","マルチモーダル","セキュリティ"]', 1, 1),
  (5, 2, '希望する開催形式を選んでください', 'single_choice', '["講義形式","ハンズオン","ディスカッション","LT"]', 1, 2),
  (6, 2, '自由に要望があればご記入ください', 'free_text', '[]', 0, 3);
