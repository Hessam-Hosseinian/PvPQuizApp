-- =====================================================
-- 1) Main User and Profile Tables
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL
        CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    password_hash VARCHAR(255) NOT NULL,
    avatar VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    role VARCHAR(20) NOT NULL DEFAULT 'user'
        CHECK (role IN ('user', 'admin', 'moderator')),
    current_level INTEGER NOT NULL DEFAULT 1,
    total_xp BIGINT NOT NULL DEFAULT 0
);

-- =====================================================
-- 2) Categories
-- =====================================================
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 4) Questions and Choices Tables
-- =====================================================
CREATE TABLE IF NOT EXISTS questions (
    id BIGSERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE ,
    difficulty VARCHAR(20) NOT NULL
        CHECK (difficulty IN ('easy', 'medium', 'hard')),
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS question_choices (
    id BIGSERIAL PRIMARY KEY,
    question_id BIGINT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    choice_text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    position CHAR(1) NOT NULL
        CHECK (position IN ('A','B','C','D')),
    UNIQUE (question_id, position),
    CONSTRAINT choice_text_length CHECK (char_length(trim(choice_text)) > 0)
);



-- =====================================================
-- 5) Game Types Table with Total Rounds
-- =====================================================
CREATE TABLE IF NOT EXISTS game_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    total_rounds SMALLINT NOT NULL DEFAULT 5
        CHECK (total_rounds > 0)
);

-- =====================================================
-- 6) Games and Participants Tables
-- =====================================================
CREATE TABLE IF NOT EXISTS games (
    id BIGSERIAL PRIMARY KEY,
    game_type_id INTEGER NOT NULL REFERENCES game_types(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','active','completed','cancelled')),
    start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    winner_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS game_participants (
    game_id BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    join_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    score INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active','disconnected','finished')),
    PRIMARY KEY (game_id, user_id)
);

-- =====================================================
-- 7) Match Queue Table for Game Waiting
-- =====================================================
CREATE TABLE IF NOT EXISTS match_queue (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_type_id INTEGER NOT NULL REFERENCES game_types(id) ON DELETE RESTRICT,
    enqueued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);



-- =====================================================
-- 9) Game Rounds Table with Category Selection
-- =====================================================
CREATE TABLE IF NOT EXISTS game_rounds (
    id BIGSERIAL PRIMARY KEY,
    game_id BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    round_number SMALLINT NOT NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE RESTRICT,
    category_picker_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','active','completed')),
    time_limit_seconds INTEGER,
    points_possible INTEGER NOT NULL DEFAULT 100,
    UNIQUE (game_id, round_number)
);

-- =====================================================
-- 10) Game Round Questions Storage Table
-- =====================================================
CREATE TABLE IF NOT EXISTS game_round_questions (
    id BIGSERIAL PRIMARY KEY,
    game_round_id BIGINT NOT NULL REFERENCES game_rounds(id) ON DELETE CASCADE,
    question_id BIGINT NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
    CONSTRAINT uq_round_question UNIQUE (game_round_id, question_id)
);

-- =====================================================
-- 11) Round Answers Table with Explicit Reference to Round Question
-- =====================================================
CREATE TABLE IF NOT EXISTS round_answers (
    id BIGSERIAL PRIMARY KEY,
    game_round_question_id BIGINT NOT NULL
        REFERENCES game_round_questions(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    choice_id BIGINT NOT NULL REFERENCES question_choices(id) ON DELETE RESTRICT,
    answer_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    response_time_ms INTEGER,
    is_correct BOOLEAN NOT NULL,
    points_earned INTEGER NOT NULL DEFAULT 0,
    UNIQUE (game_round_question_id, user_id)
);

-- =====================================================
-- 12) User Overall Stats and Category Stats
-- =====================================================
CREATE TABLE IF NOT EXISTS user_stats (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    games_played INTEGER NOT NULL DEFAULT 0,
    games_won INTEGER NOT NULL DEFAULT 0,
    total_points BIGINT NOT NULL DEFAULT 0,
    correct_answers INTEGER NOT NULL DEFAULT 0,
    total_answers INTEGER NOT NULL DEFAULT 0,
    average_response_time_ms INTEGER,
    highest_score INTEGER NOT NULL DEFAULT 0,
    current_streak INTEGER NOT NULL DEFAULT 0,
    best_streak INTEGER NOT NULL DEFAULT 0,
    last_played_at TIMESTAMP,
    stats_updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_category_stats (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    games_played INTEGER NOT NULL DEFAULT 0,
    correct_answers INTEGER NOT NULL DEFAULT 0,
    total_answers INTEGER NOT NULL DEFAULT 0,
    total_points BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, category_id)
);

-- =====================================================
-- 13) Leaderboards Table
-- =====================================================
CREATE TABLE IF NOT EXISTS leaderboards (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scope VARCHAR(20) NOT NULL
        CHECK (scope IN ('daily','weekly','monthly','alltime')),
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    rank INTEGER NOT NULL,
    score BIGINT NOT NULL,
    generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_leaderboards_user_scope_cat UNIQUE (user_id, scope, category_id)
);

-- =====================================================
-- 14) Chat Rooms and Messages Tables
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_rooms (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100),
    type VARCHAR(20) NOT NULL
        CHECK (type IN ('private','game','public')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    game_id BIGINT REFERENCES games(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chat_room_members (
    room_id BIGINT NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGSERIAL PRIMARY KEY,
    room_id BIGINT REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id BIGINT REFERENCES users(id) ON DELETE CASCADE,

    reply_to_id BIGINT REFERENCES chat_messages(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    is_edited BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);



-- =====================================================
-- 17) Materialized View for Top Players
-- =====================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_top_players AS
SELECT
    u.id         AS user_id,
    u.username   AS username,
    us.total_points,
    us.games_won,
    us.games_played,
    CASE
      WHEN us.total_answers = 0 THEN 0
      ELSE ROUND((us.correct_answers::numeric / us.total_answers::numeric) * 100, 2)
    END AS accuracy_rate
FROM users u
JOIN user_stats us ON u.id = us.user_id
WHERE us.games_played > 0
ORDER BY us.total_points DESC
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_top_players ON mv_top_players(user_id);

-- =====================================================
-- 18) Functions and Triggers for Statistical Updates
-- =====================================================

-- 18.1) Function to incrementally update user's overall stats after each answer.
-- This is much more efficient than recalculating from scratch every time.
CREATE OR REPLACE FUNCTION fn_update_user_stats_on_answer() RETURNS TRIGGER AS $$
BEGIN
    UPDATE user_stats
    SET
        total_answers = user_stats.total_answers + 1,
        correct_answers = user_stats.correct_answers + CASE WHEN NEW.is_correct THEN 1 ELSE 0 END,
        total_points = user_stats.total_points + NEW.points_earned,
        -- Recalculate average response time safely, avoiding division by zero on the first answer.
        average_response_time_ms =
            (COALESCE(user_stats.average_response_time_ms, 0) * (user_stats.total_answers) + NEW.response_time_ms) / (user_stats.total_answers + 1),
        stats_updated_at = NOW()
    WHERE user_id = NEW.user_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_after_insert_round_answers ON round_answers;
CREATE TRIGGER trg_after_insert_round_answers
AFTER INSERT ON round_answers
FOR EACH ROW
EXECUTE FUNCTION fn_update_user_stats_on_answer();


-- 18.2) Function to incrementally update user's category-specific stats after each answer.
CREATE OR REPLACE FUNCTION fn_update_user_category_stats_on_answer() RETURNS TRIGGER AS $$
DECLARE
    v_category_id INTEGER;
BEGIN
    -- Find the category_id for the question answered.
    SELECT gr.category_id INTO v_category_id
    FROM game_round_questions grq
    JOIN game_rounds gr ON gr.id = grq.game_round_id
    WHERE grq.id = NEW.game_round_question_id;

    -- Insert or update the user's stats for this category.
    -- games_played is handled at the end of the game to avoid incorrect increments.
    INSERT INTO user_category_stats (
        user_id, category_id, games_played,
        correct_answers, total_answers, total_points
    )
    VALUES (
        NEW.user_id, v_category_id, 0,
        CASE WHEN NEW.is_correct THEN 1 ELSE 0 END, 1, NEW.points_earned
    )
    ON CONFLICT (user_id, category_id) DO UPDATE
    SET
        correct_answers = user_category_stats.correct_answers + EXCLUDED.correct_answers,
        total_answers   = user_category_stats.total_answers + EXCLUDED.total_answers,
        total_points    = user_category_stats.total_points + EXCLUDED.total_points;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_after_insert_round_answers_cat ON round_answers;
CREATE TRIGGER trg_after_insert_round_answers_cat
AFTER INSERT ON round_answers
FOR EACH ROW
EXECUTE FUNCTION fn_update_user_category_stats_on_answer();

-- 18.3) Function to update stats for all participants after a game is completed.
-- Handles winner, losers, streaks, highest scores, and games_played counts correctly.
CREATE OR REPLACE FUNCTION fn_update_stats_after_game_complete() RETURNS TRIGGER AS $$
DECLARE
    v_participant RECORD;
    v_game_category RECORD;
BEGIN
    -- Only run when a game's status changes to 'completed'.
    IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM NEW.status THEN
        -- Loop through all participants of the completed game.
        FOR v_participant IN
            SELECT user_id, score FROM game_participants WHERE game_id = NEW.id
        LOOP
            IF v_participant.user_id = NEW.winner_id THEN
                -- Update stats for the winner.
                UPDATE user_stats
                SET
                  games_won      = games_won + 1,
                  games_played   = games_played + 1,
                  current_streak = current_streak + 1,
                  best_streak    = GREATEST(best_streak, current_streak + 1),
                  highest_score  = GREATEST(highest_score, v_participant.score),
                  last_played_at = NOW(),
                  stats_updated_at = NOW()
                WHERE user_id = v_participant.user_id;
            ELSE
                -- Update stats for losers.
                UPDATE user_stats
                SET
                  games_played     = games_played + 1,
                  current_streak   = 0,
                  highest_score    = GREATEST(highest_score, v_participant.score),
                  last_played_at   = NOW(),
                  stats_updated_at = NOW()
                WHERE user_id = v_participant.user_id;
            END IF;

            -- Increment games_played for each category present in the game for the participant.
            FOR v_game_category IN
                SELECT DISTINCT category_id FROM game_rounds WHERE game_id = NEW.id AND category_id IS NOT NULL
            LOOP
                INSERT INTO user_category_stats (user_id, category_id, games_played, correct_answers, total_answers, total_points)
                VALUES (v_participant.user_id, v_game_category.category_id, 1, 0, 0, 0)
                ON CONFLICT (user_id, category_id) DO UPDATE
                SET games_played = user_category_stats.games_played + 1;
            END LOOP;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_after_update_games ON games;
CREATE TRIGGER trg_after_update_games
AFTER UPDATE ON games
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION fn_update_stats_after_game_complete();

-- 18.4) Function to update the all-time leaderboard for all game participants on game completion.
CREATE OR REPLACE FUNCTION fn_update_leaderboard_on_game_end() RETURNS TRIGGER AS $$
DECLARE
    v_participant RECORD;
    v_rank INTEGER;
BEGIN
    IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM NEW.status THEN
        -- Update leaderboard rank for all participants of the game based on their new total_points.
        FOR v_participant IN
            SELECT us.user_id, us.total_points
            FROM user_stats us
            WHERE us.user_id IN (SELECT gp.user_id FROM game_participants gp WHERE gp.game_id = NEW.id)
        LOOP
            -- Calculate user's new rank.
            SELECT COUNT(*) + 1 INTO v_rank
            FROM user_stats
            WHERE total_points > v_participant.total_points;

            -- Insert or update the user's rank in the all-time leaderboard.
            INSERT INTO leaderboards (user_id, scope, category_id, rank, score, generated_at)
            VALUES (v_participant.user_id, 'alltime', NULL, v_rank, v_participant.total_points, NOW())
            ON CONFLICT (user_id, scope, category_id) DO UPDATE
              SET rank = EXCLUDED.rank,
                  score = EXCLUDED.score,
                  generated_at = EXCLUDED.generated_at;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_after_update_games_leaderboard ON games;
CREATE TRIGGER trg_after_update_games_leaderboard
AFTER UPDATE ON games
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION fn_update_leaderboard_on_game_end();




-- =====================================================
-- 19) Indexes for Performance Optimization
-- =====================================================

-- Foreign Keys and Frequently Queried Columns

-- Index on `questions` table for faster filtering by category and difficulty.
CREATE INDEX IF NOT EXISTS idx_questions_category_id ON questions(category_id);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);

-- Index on `games` table for quickly finding games by status.
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);

-- Index on `game_participants` for quickly finding all games a user has participated in.
CREATE INDEX IF NOT EXISTS idx_game_participants_user_id ON game_participants(user_id);

-- Index on `match_queue` to process users in FIFO (First-In, First-Out) order efficiently.
CREATE INDEX IF NOT EXISTS idx_match_queue_enqueued_at ON match_queue(enqueued_at);

-- Index on `game_rounds` to speed up lookups based on category.
CREATE INDEX IF NOT EXISTS idx_game_rounds_category_id ON game_rounds(category_id);

-- Index on `round_answers` to quickly fetch all answers submitted by a specific user.
CREATE INDEX IF NOT EXISTS idx_round_answers_user_id ON round_answers(user_id);

-- Index on `user_stats` to make leaderboard ranking calculations much faster.
-- The DESC keyword helps in sorting from highest to lowest score efficiently.
CREATE INDEX IF NOT EXISTS idx_user_stats_total_points ON user_stats(total_points DESC);

-- Composite index for displaying leaderboards, allowing fast filtering and sorting.
CREATE INDEX IF NOT EXISTS idx_leaderboards_scope_category_score ON leaderboards(scope, category_id, score DESC);

-- Indexes for Chat functionality

-- Index on `chat_rooms` to quickly filter rooms by their type (e.g., 'game', 'public').
CREATE INDEX IF NOT EXISTS idx_chat_rooms_type ON chat_rooms(type);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_game_id ON chat_rooms(game_id);

-- Index on `chat_room_members` to quickly find all chat rooms a user belongs to.
CREATE INDEX IF NOT EXISTS idx_chat_room_members_user_id ON chat_room_members(user_id);

-- Composite index on `chat_messages` to fetch messages for a room, sorted by time, very quickly.
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id_sent_at ON chat_messages(room_id, sent_at DESC);

-- Index to quickly find direct messages for a specific recipient.
CREATE INDEX IF NOT EXISTS idx_chat_messages_recipient_id ON chat_messages(recipient_id) WHERE recipient_id IS NOT NULL;

-- Index to quickly find all messages sent by a specific sender.
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);


-- =================================================================
-- PvP Quiz App - Comprehensive Seeding Script
-- =================================================================
-- This script populates the database with a large, consistent set of
-- sample data to simulate real application usage.
--
-- IMPORTANT:
-- 1. Run this script AFTER applying the full schema.sql.
-- 2. This script assumes the 'questions' and 'question_choices'
--    tables are already populated with data (e.g., from your import script).
--    It references question IDs from 1 to 100.
-- 3. It is idempotent: you can run it multiple times. It will
--    clear old data before inserting new data.
-- =================================================================

-- =================================================================
-- PvP Quiz App - Comprehensive Seeding Script (Corrected)
-- =================================================================
-- This script populates the database with a large, consistent set of
-- sample data to simulate real application usage.
--
-- IMPORTANT:
-- 1. Run this script AFTER applying the full schema.sql.
-- 2. This script assumes the 'questions' and 'question_choices'
--    tables are already populated with data (e.g., from your import script).
--    It references question IDs from 1 to 100.
-- 3. It is idempotent: you can run it multiple times. It will
--    clear old data before inserting new data.
-- =================================================================

-- =====================================================
-- A) 100 Users
-- =====================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;


INSERT INTO users (username, email, password_hash, avatar, role, current_level, total_xp)
SELECT
  'user' || i,
  'user' || i || '@example.com',
  crypt('P@ssw0rd' || i, gen_salt('bf')),
  'https://i.pravatar.cc/150?img=' || (i % 70),
  CASE WHEN i = 1 THEN 'admin' WHEN i % 10 = 0 THEN 'moderator' ELSE 'user' END,
  (random()*20 + 1)::int,
  (random()*10000)::bigint
FROM generate_series(1,100) AS s(i);

-- =====================================================
-- B) 10 Categories
-- =====================================================
INSERT INTO categories (name, description)
SELECT
  'Category ' || i,
  'This is a description for Category ' || i
FROM generate_series(1,10) AS s(i);

-- =====================================================
-- C) 3 Game Types
-- =====================================================
INSERT INTO game_types (name, description, total_rounds)
VALUES
  ('Classic Duel','Two‑player head‑to‑head match',5),
  ('Speed Quiz','Time‑attack mode',3),
  ('Battle Royale','Up to four players, last one standing',7);

-- =====================================================
-- D) 50 Games
-- =====================================================
INSERT INTO games (game_type_id, status, start_time, end_time, winner_id)
SELECT
  (random()*2 + 1)::int,                          -- 1–3
  CASE WHEN random() < 0.7 THEN 'completed' ELSE 'active' END,
  NOW() - ((random()*10)::int || ' days')::interval,
  CASE WHEN random() < 0.7
       THEN NOW() - ((random()*9)::int || ' days')::interval
       ELSE NULL END,
  CASE WHEN random() < 0.7
       THEN (random()*99 + 1)::bigint
       ELSE NULL END
FROM generate_series(1,50) AS s(i);

-- =====================================================
-- E) 100 Match‑Queue Entries
-- =====================================================
INSERT INTO match_queue (user_id, game_type_id, enqueued_at)
SELECT
  (random()*99 + 1)::bigint,
  (random()*2 + 1)::int,
  NOW() - ((random()*5)::int || ' hours')::interval
FROM generate_series(1,100) AS s(i);

-- =====================================================
-- F) Game Participants (2 per completed game, 4 for Royale)
-- =====================================================
-- F) Game Participants (2 per classic/speed game, 4 for Royale)
WITH gs AS (
  SELECT g.id   AS game_id,
         g.game_type_id
  FROM games g
  WHERE g.status IN ('active','completed')
)
INSERT INTO game_participants (game_id, user_id, join_time, score, status)
SELECT
  gs.game_id,
  u.rnd_user_id,
  NOW() - FLOOR(random()*3600)::int * INTERVAL '1 second',
  FLOOR(random()*500)::int,
  CASE
    WHEN gs.game_type_id = 3 THEN
      CASE CEIL(random()*3)::int
        WHEN 1 THEN 'active'
        WHEN 2 THEN 'finished'
        WHEN 3 THEN 'disconnected'
      END
    ELSE 'finished'
  END
FROM gs
JOIN LATERAL (
  SELECT usr.id AS rnd_user_id
  FROM users usr
  ORDER BY random()
  LIMIT CASE WHEN gs.game_type_id = 3 THEN 4 ELSE 2 END
) AS u ON true;



-- =====================================================
-- G) Game Rounds
-- =====================================================
INSERT INTO game_rounds (
  game_id,
  round_number,
  category_id,
  category_picker_id,
  start_time,
  end_time,
  status,
  time_limit_seconds,
  points_possible
)
SELECT
  g.game_id,                                          -- fully qualified
  r.round_num,                                        -- alias the series
  (random()*9 + 1)::int,                              -- random category
  (random()*99 + 1)::bigint,                          -- random picker
  g.start_time + ((r.round_num - 1) * INTERVAL '2 minutes'),
  g.start_time + ((r.round_num - 1) * INTERVAL '2 minutes' + INTERVAL '90 seconds'),
  CASE WHEN g.status = 'completed' THEN 'completed' ELSE 'pending' END,
  90,
  100
FROM (
  SELECT
    gm.id           AS game_id,       -- alias games.id
    gm.start_time   AS start_time,
    gm.status       AS status,
    gt.total_rounds AS total_rounds
  FROM games   AS gm
  JOIN game_types AS gt
    ON gm.game_type_id = gt.id
) AS g
CROSS JOIN LATERAL (
  SELECT generate_series(1, g.total_rounds) AS round_num
) AS r;


-- =====================================================
-- H) Game Round Questions (3 per round)
-- =====================================================
INSERT INTO game_round_questions (game_round_id, question_id)
SELECT
  gr.id      AS game_round_id,
  q.id       AS question_id
FROM game_rounds AS gr
JOIN LATERAL (
  -- select 3 distinct question IDs at random
  SELECT id
  FROM questions
  ORDER BY random()
  LIMIT 3
) AS q ON TRUE
ON CONFLICT (game_round_id, question_id) DO NOTHING;

-- =====================================================
-- I) Round Answers (each participant answers each question)
-- =====================================================
INSERT INTO round_answers (game_round_question_id, user_id, choice_id, answer_time, response_time_ms, is_correct, points_earned)
SELECT
  grq.id,
  gp.user_id,
  -- pick one of the four choices for that question at random:
  (SELECT id
   FROM question_choices
   WHERE question_id = grq.question_id
   ORDER BY random() LIMIT 1),
  gr.start_time + (random()*90)::int * '1 second'::interval,
  (random()*2000)::int,
  (random() < 0.5),
  CASE WHEN random() < 0.5 THEN 100 ELSE 0 END
FROM game_round_questions grq
JOIN game_rounds gr   ON grq.game_round_id = gr.id
JOIN game_participants gp ON gr.game_id = gp.game_id;

-- =====================================================
-- J) Initialize User Stats (one row per user)
-- =====================================================
INSERT INTO user_stats (user_id)
SELECT id FROM users
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- K) Initialize Leaderboards (all‑time)
-- =====================================================
WITH latest_points AS (
  SELECT user_id, total_points
  FROM user_stats
)
INSERT INTO leaderboards (user_id, scope, category_id, rank, score)
SELECT
  user_id,
  'alltime',
  NULL,
  ROW_NUMBER() OVER (ORDER BY total_points DESC),
  total_points       -- ← use total_points here, not score
FROM latest_points;


-- =====================================================
-- L) Chat Rooms & Messages
-- =====================================================
-- L1) Create a public global room and one per game
INSERT INTO chat_rooms (name, type, game_id)
VALUES
  ('Global Chat','public',NULL)
;
INSERT INTO chat_rooms (name, type, game_id)
SELECT 'Game Chat #'||id,'game',id
FROM games;

-- L2) Room Members: all participants plus 20 random users in global
-- Global + per‑game members, idempotent
INSERT INTO chat_room_members (room_id, user_id, joined_at)
SELECT
  (SELECT id FROM chat_rooms WHERE name = 'Global Chat'),
  (random()*99 + 1)::bigint,
  NOW() - ((random()*7)::int || ' days')::interval
FROM generate_series(1,20)
ON CONFLICT (room_id, user_id) DO NOTHING;

INSERT INTO chat_room_members (room_id, user_id, joined_at)
SELECT
  cr.id,
  gp.user_id,
  gp.join_time
FROM chat_rooms cr
JOIN game_participants gp ON cr.game_id = gp.game_id
WHERE cr.type = 'game'
ON CONFLICT (room_id, user_id) DO NOTHING;


-- L3) Chat Messages: ~ 10 per room
INSERT INTO chat_messages (room_id, sender_id, message, sent_at, is_read)
SELECT
  cr.id,
  CASE
    WHEN cr.type = 'game' THEN
      (SELECT gp.user_id
       FROM game_participants gp
       WHERE gp.game_id = cr.game_id
       ORDER BY random()
       LIMIT 1)
    ELSE
      (SELECT id
       FROM users
       ORDER BY random()
       LIMIT 1)
  END AS sender_id,
  'Sample message #' || floor(random()*1000)::int,
  NOW() - ((random()*3600)::int * INTERVAL '1 second'),
  (random() < 0.5)
FROM chat_rooms cr
CROSS JOIN generate_series(1,10) AS s(i);


COMMIT;
