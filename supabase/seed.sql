-- Seed data for TOEFL Speaking App
-- This file runs after migrations during db reset

-- Seed initial question data
INSERT INTO questions (question_id, instruction, sos_keywords, sos_starter, audio_url) VALUES
(
    'question_01KCH9WP8W6TZXA5QXS1BFF6AS',
    'Students should take a gap year before entering university to gain work experience.',
    '["Financial Independence", "Career Clarity", "Real-world Experience", "Personal Growth"]',
    'Personally, I believe taking a gap year is beneficial because...',
    'question_01KCH9WP8W6TZXA5QXS1BFF6AS/audio.mp3'
),
(
    'question_01KCH9WP8W6TZXA5QXS1BFF6AT',
    'It is better to live in a small town than in a big city.',
    '["Quality of Life", "Cost of Living", "Community", "Career Opportunities"]',
    'In my opinion, living in a small town has several advantages...',
    'question_01KCH9WP8W6TZXA5QXS1BFF6AT/audio.mp3'
),
(
    'question_01KCH9WP8W6TZXA5QXS1BFF6AV',
    'Technology has made our lives more complicated rather than simpler.',
    '["Efficiency", "Information Overload", "Connectivity", "Learning Curve"]',
    'I believe that while technology has some drawbacks...',
    'question_01KCH9WP8W6TZXA5QXS1BFF6AV/audio.mp3'
)
ON CONFLICT (question_id) DO NOTHING;
