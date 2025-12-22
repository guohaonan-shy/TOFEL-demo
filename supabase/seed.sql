-- Seed data for TOEFL Speaking App
-- This file runs after migrations during db reset

-- ============================================================
-- Seed test user: localtest@gmail.com / 123456
-- Fixed UUID for consistent data across resets
-- ============================================================
INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
) VALUES (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,  -- Fixed user_id for testing
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'localtest@gmail.com',
    crypt('123456', gen_salt('bf')),  -- Password: 123456
    now(),
    now(),
    now(),
    '',
    '',
    '',
    ''
) ON CONFLICT (id) DO NOTHING;

-- Also insert into auth.identities for proper auth flow
INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    created_at,
    updated_at,
    last_sign_in_at
) VALUES (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
    jsonb_build_object(
        'sub', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        'email', 'localtest@gmail.com',
        'email_verified', true
    ),
    'email',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    now(),
    now(),
    now()
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Seed initial question data
-- ============================================================
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

-- ============================================================
-- Seed sample recording data (for testing)
-- ============================================================
INSERT INTO recordings (recording_id, user_id, question_id, audio_url, created_at) VALUES
(
    'recording_01KD3MDFZNXA5BZZ4838W8KNMS',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
    'question_01KCH9WP8W6TZXA5QXS1BFF6AS',
    'recordings/a1b2c3d4-e5f6-7890-abcd-ef1234567890/question_01KCH9WP8W6TZXA5QXS1BFF6AS/recording_01KD3MDFZNXA5BZZ4838W8KNMS.mp3',
    now()
)
ON CONFLICT (recording_id) DO NOTHING;

-- ============================================================
-- Seed sample analysis result (for testing)
-- Note: Using $$ dollar quoting to avoid escaping issues in JSON
-- ============================================================
INSERT INTO analysis_results (recording_id, user_id, question_id, status, report_json, created_at) VALUES
(
    'recording_01KD3MDFZNXA5BZZ4838W8KNMS',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
    'question_01KCH9WP8W6TZXA5QXS1BFF6AS',
    'completed',
    $${"chunks": [{"text": "Totally, I agree with this statement that students should take a gap year before entering a university to gain work experience.", "chunk_id": 0, "chunk_type": "opening_statement", "time_range": [0.0, 8.12], "feedback_structured": {"summary": "这段开头陈述了学生应该在进入大学前休学一年以获得工作经验的观点，并表达了完全同意的立场。整体表达清晰，但可以针对发音和用词进行优化，以提升专业度和流利度。", "strengths": ["观点明确", "表达直接"], "content_notes": "thesis陈述明确，直接表达了对学生在进入大学前休学一年以获得工作经验这一观点的赞同。内容上可以考虑加入一到两个支持你观点的理由，使开头更充实。", "fluency_notes": "整体语速适中，但个别单词的发音不够清晰，导致流畅度略有下降。可以适当放慢语速，确保每个单词都发音准确。", "grammar_issues": [], "actionable_tips": [{"tip": "使用在线发音词典（如Merriam-Webster或Cambridge Dictionary）练习发音，特别注意重音位置和元音发音。", "category": "Pronunciation"}, {"tip": "录下自己的发音并与标准发音进行对比，找出差距并进行改进。", "category": "Pronunciation"}, {"tip": "积累更多学术词汇，替换口语化的表达方式。", "category": "Vocabulary"}, {"tip": "练习时放慢语速，确保每个单词都发音清晰。注意连读和弱读，使表达更自然。", "category": "Fluency"}, {"tip": "在开头段落中加入一到两个简要的理由，使你的立场更具说服力。", "category": "Content"}], "pronunciation_score": 6, "pronunciation_issues": [{"tip": "注意重音在第一个音节，并清晰发出 't' 的音。练习时可以放慢速度，确保每个音节都发音准确。", "word": "totally", "timestamp": null, "your_pronunciation": "听起来接近 '斗特力'", "correct_pronunciation": "/ˈtoʊtəli/"}, {"tip": "注意 'a' 的弱读音 /ə/， 以及重音在第二个音节 'gree'。多听标准发音并模仿。", "word": "agree", "timestamp": null, "your_pronunciation": "听起来像 '啊格瑞'", "correct_pronunciation": "/əˈɡriː/"}, {"tip": "注意 't' 的发音要清晰，并且重音在第一个音节 'state'。练习时可以尝试将单词分解成音节进行练习。", "word": "statement", "timestamp": null, "your_pronunciation": "听起来像 '斯te特门特'", "correct_pronunciation": "/ˈsteɪtmənt/"}, {"tip": "注意重音在第三个音节 'ver'，并且清晰发出 'v' 的音。可以尝试将单词分解成音节进行练习，并注意每个音节的重音。", "word": "university", "timestamp": null, "your_pronunciation": "听起来像 '由你佛斯里'", "correct_pronunciation": "/ˌjuːnɪˈvɜːrsəti/"}], "expression_suggestions": [{"reason": "'acquire' 比 'gain' 更正式，'professional experience' 比 'work experience' 更学术化。", "improved": "acquire professional experience", "original": "gain work experience"}]}}, {"text": "First of all, this kind of experience could help students accumulate some useful skills in the work. For example, I took an internship and I'd buy down internet companies to accumulate how to communicate with other colleagues in different teams to promote the progress of a huge project.", "chunk_id": 1, "chunk_type": "viewpoint", "time_range": [8.12, 29.48], "feedback_structured": {"summary": "这段音频中，学生主要讨论了实习经历对学生积累工作技能的帮助。他以自己在互联网公司的实习为例，说明了如何通过实习提高与不同团队同事沟通协作的能力，从而促进大型项目的进展。整体内容围绕实习经历如何帮助学生积累工作技能展开。", "strengths": ["观点明确，论证方向正确。", "能以自己的实习经历为例进行说明。"], "content_notes": "内容逻辑清晰，以实习经历为例说明了实习对积累工作技能的帮助。但细节支撑可以更丰富，可以具体描述实习中遇到的沟通挑战以及如何解决的。", "fluency_notes": "语速稍快，中间有停顿和犹豫，影响了流利度。需要注意控制语速，减少不必要的停顿。", "grammar_issues": [{"original": "I'd buy down internet companies", "corrected": "at several internet companies", "error_type": "词汇选择", "explanation": "buy down在这里的用法不准确，应该用 at several 来表达在几家公司实习。"}], "actionable_tips": [{"tip": "针对发音问题，使用音标进行练习，并录音对比，找出差距。", "category": "发音"}, {"tip": "平时多积累常用词汇和表达，注意词汇的准确用法。", "category": "语法"}, {"tip": "阅读相关领域的文章，学习更地道、更学术的表达方式。", "category": "表达"}, {"tip": "练习时注意控制语速，减少停顿和犹豫。可以在录音后回听，找出需要改进的地方。", "category": "流利度"}, {"tip": "在描述例子时，尽量提供更具体的细节，使论证更有说服力。", "category": "内容"}], "pronunciation_score": 7, "pronunciation_issues": [{"tip": "注意重音位置和元音的发音。重音在kyu音节，并且u发长音。多加练习，确保发音清晰准确。", "word": "accumulate", "timestamp": 0.9, "your_pronunciation": "呃-kyu-myu-late", "correct_pronunciation": "əˈkjuːmjəˌleɪt"}, {"tip": "注意ter部分的发音，不要发成ner。强调ter的发音。", "word": "internship", "timestamp": 2.2, "your_pronunciation": "in-ner-ship", "correct_pronunciation": "ˈɪntərnʃɪp"}, {"tip": "注意重音在kum音节，以及尾音ies的发音。", "word": "companies", "timestamp": 3.0, "your_pronunciation": "kum-pa-ness", "correct_pronunciation": "ˈkʌmpəniz"}, {"tip": "注意重音在mju音节，发音时要清晰。", "word": "communicate", "timestamp": 3.8, "your_pronunciation": "kum-mu-ni-kate", "correct_pronunciation": "kəˈmjuːnɪkeɪt"}], "expression_suggestions": [{"reason": "使用 facilitate the advancement of a large-scale project 更加正式和学术化，提升表达的专业性。", "improved": "to facilitate the advancement of a large-scale project", "original": "to promote the progress of a huge project"}]}}, {"text": "The second reason is that working before university could help students save some money. To be more specific, the university expenses are very expensive. In the daytime, students need to spend a lot of time taking part-time jobs instead of studying.", "chunk_id": 2, "chunk_type": "viewpoint", "time_range": [29.48, 45.04], "feedback_structured": {"summary": "这段音频提出了学生在大学前工作可以帮助他们节省资金的观点，从而减轻大学费用的负担。然而，学生可能会因此花费大量时间在兼职工作上，而牺牲学习时间。", "strengths": ["观点明确，逻辑清晰。", "能够用英语表达复杂的想法。"], "content_notes": "论证的逻辑比较清晰，提出了大学费用高昂以及学生需要兼职来支付费用的观点。但是，细节支撑略显不足，可以提供具体的例子或数据来支持观点。", "fluency_notes": "语速正常，但存在一些停顿，特别是在句子中间。可以尝试在短语之间稍作停顿，而不是在单词之间。", "grammar_issues": [], "actionable_tips": [{"tip": "使用在线发音词典，例如Youglish，查找目标单词在语境中的发音，并进行模仿练习。", "category": "Pronunciation"}, {"tip": "练习时可以尝试使用一些连接词，例如 moreover, furthermore, in addition 等，使表达更流畅。", "category": "Fluency"}, {"tip": "在准备观点时，多收集一些相关的例子、数据或研究结果，以支持你的论点。", "category": "Content"}, {"tip": "录音后回听自己的口语练习，可以帮助你发现自己没有意识到的问题，并进行针对性的改进。", "category": "Overall"}], "pronunciation_score": null, "pronunciation_issues": [{"tip": "注意 ex 的发音为 /ɪk/ 而不是 /ek/。练习时可以放慢速度，强调每个音节的发音。", "word": "expenses", "timestamp": 0.08, "your_pronunciation": "ik-spen-ses", "correct_pronunciation": "ɪkˈspɛnsɪz"}, {"tip": "注意第一个音节的发音是schwa /ə/，而不是 /e/。多听例句，模仿正确的发音。", "word": "specific", "timestamp": 0.06, "your_pronunciation": "spe-si-fik", "correct_pronunciation": "spəˈsɪfɪk"}, {"tip": "注意元音e的发音是 /ɛ/。此外，确保清晰地发出末尾的d音。", "word": "instead", "timestamp": 0.15, "your_pronunciation": "in-ste-d", "correct_pronunciation": "ɪnˈstɛd"}], "expression_suggestions": [{"reason": "expenses 是复数，所以应该用 are。同时，用 high/substantial/significant 替换 expensive 在学术语境中更合适。", "improved": "university expenses are very high/substantial/significant", "original": "the university expenses is very expensive"}]}}], "full_transcript": {"text": "Totally, I agree with this statement that students should take a gap year before entering a university to gain work experience. First of all, this kind of experience could help students accumulate some useful skills in the work. For example, I took an internship and I'd buy down internet companies to accumulate how to communicate with other colleagues in different teams to promote the progress of a huge project. The second reason is that working before university could help students save some money. To be more specific, the university expenses are very expensive. In the daytime, students need to spend a lot of time taking part-time jobs instead of studying.", "segments": [{"end": 5.44, "text": " Totally, I agree with this statement that students should take a gap year before entering", "start": 0.0}, {"end": 8.12, "text": " a university to gain work experience.", "start": 5.44}, {"end": 12.96, "text": " First of all, this kind of experience could help students accumulate some useful skills", "start": 8.12}, {"end": 13.96, "text": " in the work.", "start": 12.96}, {"end": 20.44, "text": " For example, I took an internship and I'd buy down internet companies to accumulate", "start": 13.96}, {"end": 27.32, "text": " how to communicate with other colleagues in different teams to promote the progress of", "start": 20.44}, {"end": 29.48, "text": " a huge project.", "start": 27.32}, {"end": 35.36, "text": " The second reason is that working before university could help students save some money.", "start": 29.48}, {"end": 40.04, "text": " To be more specific, the university expenses are very expensive.", "start": 35.36}, {"end": 45.04, "text": " In the daytime, students need to spend a lot of time taking part-time jobs instead of studying.", "start": 40.04}]}, "analysis_version": "2.0", "global_evaluation": {"level": "Good", "total_score": 18, "overall_summary": "该考生清晰表达了对大学前休学一年获取工作经验的支持立场，并提供了两个相关且有逻辑的理由。然而，其发音存在一些不准确之处，流利度受到停顿和填充词的影响，且语言使用上有多处语法错误和不地道的表达。", "score_breakdown": {"delivery": 6, "language_use": 5, "topic_development": 7}, "detailed_feedback": "### Delivery（表达）\n- **发音清晰度**：部分单词发音不准确，例如将ByteDance误发为I dance，将internet误发为in the night。个别词语的发音模糊，影响了整体理解。\n- **流利度**：语速适中，但存在一些不自然的停顿和重复（如different different teams），以及填充词uh的使用，影响了整体的流畅性。\n- **语调自然度**：语调变化不明显，整体听起来较为平坦，缺乏抑扬顿挫的自然感，使得表达显得不够生动。\n\n### Language Use（语言）\n- **语法准确性**：存在多处语法错误，例如主谓不一致（university expenses is应为are，student needs应为students need）、介词搭配不当（in the work），以及动词形式错误（instead of study应为instead of studying）。\n- **词汇丰富度**：词汇使用较为基础，缺乏多样性。部分词语选择不准确或不地道，例如用accumulate how to communicate而非learn how to communicate或gain communication skills，以及see some money而非save some money。\n- **句式多样性**：句式结构相对简单，多为陈述句，缺乏复杂句和多样化的句型，未能充分展示语言驾驭能力。\n\n### Topic Development（主题）\n- **内容相关性**：回答完全切题，清晰表达了支持学生在大学前休学一年获取工作经验的立场。\n- **论证逻辑**：论证结构清晰，提出了两个主要理由，并用First of all和The second reason is that明确区分，逻辑衔接良好。\n- **细节支撑**：第一个理由通过个人实习经历（在互联网公司学习沟通技巧）进行了具体支撑，具有说服力。第二个理由通过对大学费用昂贵以及可能需要打工影响学业的分析进行了逻辑阐述，支撑较为充分。"}}$$::jsonb,
    now()
)
ON CONFLICT (recording_id) DO NOTHING;
