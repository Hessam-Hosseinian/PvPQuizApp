-- =====================================================
-- 1) Main User and Profile Tables
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL
        CHECK (char_length(username) >= 3),
    email VARCHAR(120) UNIQUE NOT NULL
        CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    password_hash VARCHAR(255) NOT NULL,
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
-- 3) Tags for Questions and Many-to-Many Relationship
-- =====================================================
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS question_tags (
    question_id BIGINT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (question_id, tag_id)
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
-- 8) Game Invitations Table
-- =====================================================
CREATE TABLE IF NOT EXISTS game_invitations (
    id BIGSERIAL PRIMARY KEY,
    inviter_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invitee_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id BIGINT REFERENCES games(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','accepted','declined')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
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
    generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
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
    sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 15) Notifications Table
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    template TEXT NOT NULL,
    importance VARCHAR(20) NOT NULL DEFAULT 'normal'
        CHECK (importance IN ('low','normal','high'))
);

CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    type_id INTEGER NOT NULL REFERENCES notification_types(id) ON DELETE RESTRICT,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data TEXT NOT NULL DEFAULT 'text',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    related_game_id BIGINT REFERENCES games(id) ON DELETE SET NULL
);

-- =====================================================
-- 16) Optimized Indexes
-- =====================================================
-- Users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role) WHERE role != 'user';

-- Questions
CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category_id, difficulty) WHERE is_verified = TRUE;
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty) INCLUDE (category_id);
CREATE INDEX IF NOT EXISTS idx_question_choices_correct ON question_choices(question_id) WHERE is_correct = TRUE;
CREATE INDEX IF NOT EXISTS idx_question_tags_tag ON question_tags(tag_id);

-- Games
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_games_type_status ON games(game_type_id, status);
CREATE INDEX IF NOT EXISTS idx_game_participants_user ON game_participants(user_id, status);
CREATE INDEX IF NOT EXISTS idx_game_rounds_game ON game_rounds(game_id, round_number);
CREATE INDEX IF NOT EXISTS idx_round_answers_user ON round_answers(user_id, is_correct);

-- Chat
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_recipient ON chat_messages(recipient_id, sent_at DESC);


-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type_id, created_at DESC);

-- Stats
CREATE INDEX IF NOT EXISTS idx_user_stats_points ON user_stats(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboards_scope_score ON leaderboards(scope, score DESC);
CREATE INDEX IF NOT EXISTS idx_user_category_stats_points ON user_category_stats(category_id, total_points DESC);

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

-- 18.1) Function to Update User Overall Stats After Each Answer
CREATE OR REPLACE FUNCTION fn_update_user_stats_after_round() RETURNS TRIGGER AS $$
DECLARE
    correct_cnt INTEGER;
    total_cnt INTEGER;
    total_pts BIGINT;
    avg_time BIGINT;
BEGIN
    SELECT
        COUNT(*) FILTER (WHERE ra.is_correct = TRUE),
        COUNT(*),
        SUM(ra.points_earned),
        COALESCE(AVG(ra.response_time_ms),0)
    INTO
        correct_cnt, total_cnt, total_pts, avg_time
    FROM round_answers ra
    WHERE ra.user_id = NEW.user_id;

    UPDATE user_stats
    SET
        correct_answers = correct_cnt,
        total_answers = total_cnt,
        total_points = total_pts,
        average_response_time_ms = avg_time,
        highest_score = GREATEST(highest_score, NEW.points_earned),
        stats_updated_at = NOW()
    WHERE user_id = NEW.user_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_after_insert_round_answers
AFTER INSERT ON round_answers
FOR EACH ROW
EXECUTE FUNCTION fn_update_user_stats_after_round();

-- 18.2) Function to Update Category Stats After Answer Insertion
CREATE OR REPLACE FUNCTION fn_update_user_category_stats() RETURNS TRIGGER AS $$
DECLARE
    cat_id INTEGER;
    corr_cnt INTEGER;
    tot_cnt INTEGER;
    tot_pts BIGINT;
BEGIN
    -- Finding category from game_rounds table
    SELECT gr.category_id INTO cat_id
    FROM game_round_questions grq
    JOIN game_rounds gr ON gr.id = grq.game_round_id
    WHERE grq.id = NEW.game_round_question_id;

    SELECT
        COUNT(*) FILTER (WHERE ra.is_correct = TRUE),
        COUNT(*),
        SUM(ra.points_earned)
    INTO
        corr_cnt, tot_cnt, tot_pts
    FROM round_answers ra
    JOIN game_round_questions grq2 ON ra.game_round_question_id = grq2.id
    JOIN game_rounds gr2 ON gr2.id = grq2.game_round_id
    WHERE ra.user_id = NEW.user_id
      AND gr2.category_id = cat_id;

    INSERT INTO user_category_stats (user_id, category_id, games_played, correct_answers, total_answers, total_points)
    VALUES (NEW.user_id, cat_id, 1, corr_cnt, tot_cnt, tot_pts)
    ON CONFLICT (user_id, category_id) DO UPDATE
    SET
      games_played = EXCLUDED.games_played,  -- This value can be updated in the frontend
      correct_answers = corr_cnt,
      total_answers = tot_cnt,
      total_points = tot_pts;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_after_insert_round_answers_cat
AFTER INSERT ON round_answers
FOR EACH ROW
EXECUTE FUNCTION fn_update_user_category_stats();

-- 18.3) Function to Update Stats After Game Completion
CREATE OR REPLACE FUNCTION fn_update_stats_after_game_complete() RETURNS TRIGGER AS $$
DECLARE
    loser_id BIGINT;
    loser_score INTEGER;
BEGIN
    IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
        IF NEW.winner_id IS NOT NULL THEN
            -- Updating winner stats
            UPDATE user_stats
            SET
              games_won = games_won + 1,
              games_played = games_played + 1,
              current_streak = current_streak + 1,
              best_streak = GREATEST(best_streak, current_streak + 1),
              last_played_at = NOW(),
              stats_updated_at = NOW()
            WHERE user_id = NEW.winner_id;

            -- Finding loser with the lowest score in that game
            SELECT user_id, score INTO loser_id, loser_score
            FROM game_participants
            WHERE game_id = NEW.id
            ORDER BY score ASC
            LIMIT 1;

            -- Updating loser stats
            UPDATE user_stats
            SET
              games_played = games_played + 1,
              current_streak = 0,
              last_played_at = NOW(),
              stats_updated_at = NOW()
            WHERE user_id = loser_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_after_update_games
AFTER UPDATE ON games
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION fn_update_stats_after_game_complete();

-- 18.4) Function to Insert into All-time Leaderboard After Game Completion
CREATE OR REPLACE FUNCTION fn_insert_into_leaderboards() RETURNS TRIGGER AS $$
DECLARE
    total_pts BIGINT;
    rnk INTEGER;
BEGIN
    IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
        SELECT COALESCE(total_points, 0) INTO total_pts
        FROM user_stats
        WHERE user_id = NEW.winner_id;

        SELECT COUNT(*) + 1 INTO rnk
        FROM user_stats
        WHERE COALESCE(total_points, 0) > total_pts;

        INSERT INTO leaderboards (user_id, scope, category_id, rank, score, generated_at)
        VALUES (NEW.winner_id, 'alltime', NULL, rnk, total_pts, NOW());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_after_update_games_leaderboard
AFTER UPDATE ON games
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION fn_insert_into_leaderboards();

-- =====================================================
-- 19) Initial Seed Data
-- =====================================================

-- 19.1) Categories
INSERT INTO categories (name, description) VALUES
('History',       'Questions about world history'),
('Science',       'Questions about science topics'),
('Sports',        'Questions about sports'),
('Entertainment', 'Questions about movies, music, shows');

-- 19.2) Tags
INSERT INTO tags (name) VALUES
('easy'), ('medium'), ('hard'), ('funny'), ('geography');

-- 19.3) Users
INSERT INTO users (username, email, password_hash, role) VALUES
('alice', 'alice@example.com', 'hashed_pw_1', 'user'),
('bob',   'bob@example.com',   'hashed_pw_2', 'user'),
('carol', 'carol@example.com', 'hashed_pw_3', 'user'),
('admin', 'admin@example.com', 'hashed_pw_4', 'admin');

-- 19.4) User Stats (After Creating Each User)
INSERT INTO user_stats (user_id) VALUES
(1), (2), (3), (4);

-- 19.5) Game Types with Total Rounds
INSERT INTO game_types (name, description, total_rounds) VALUES
('duel',  'One-on-one quiz',        5),
('group', 'Multiplayer quiz (group)', 10);

-- 19.6) Multiple Sample Questions
INSERT INTO questions (text, category_id, difficulty, is_verified, created_by) VALUES
('What year did World War II end?',        1, 'medium', TRUE, 4),
('What is the chemical symbol for water?', 2, 'easy',   TRUE, 4),
('Who won the FIFA World Cup 2018?',       3, 'medium', TRUE, 4);

-- 19.7) Sample Question Choices
INSERT INTO question_choices (question_id, choice_text, is_correct, position) VALUES
(1, '1940', FALSE, 'A'), (1, '1945', TRUE,  'B'), (1, '1939', FALSE, 'C'), (1, '1950', FALSE, 'D'),
(2, 'H2O',  TRUE,  'A'), (2, 'O2',   FALSE, 'B'), (2, 'CO2', FALSE, 'C'), (2, 'HO',  FALSE, 'D'),
(3, 'Argentina', FALSE, 'A'), (3, 'France', TRUE,  'B'), (3, 'Germany', FALSE, 'C'), (3, 'Brazil', FALSE, 'D');

-- 19.8) One Sample Game Between alice and bob (game_id = 1)
INSERT INTO games (game_type_id, status, created_at) VALUES
(1, 'pending', NOW());
-- Note: Assuming the created ID for the above game is 1
INSERT INTO game_participants (game_id, user_id) VALUES
(1, 1),  -- alice
(1, 2);  -- bob

-- SQL statements to seed notification_types table (importance values: 'low', 'normal', 'high')

INSERT INTO notification_types (name, template, importance) VALUES
  ('friend_request',
   'User {from} sent you a friend request.',
   'normal'),
  ('game_invite',
   'User {from} invited you to a game.',
   'high'),
  ('game_start',
   'Your game with {opponent} has started.',
   'normal'),
  ('game_end',
   'Your game with {opponent} has ended. You {result}.',
   'normal'),
  ('achievement_unlocked',
   'Congratulations, {user} unlocked achievement ''{achievement}''!',
   'low'),
  ('message_received',
   'You have a new message from {from}.',
   'normal'),
  ('friend_online',
   'Your friend {friend} is now online.',
   'low'),
  ('system_alert',
   'System alert: {message}.',
   'high'),
  ('tournament_announcement',
   'New tournament ''{tournament_name}'' is now open for registration.',
   'normal'),
  ('daily_reward',
   'Your daily reward of {coins} coins is ready to claim.',
   'low'),
  ('match_found',
   'Match found! Join your game with {opponent} now.',
   'high'),
  ('password_reset',
   'A request to reset your password was received. If this wasn’t you, ignore this message.',
   'high'),
  ('email_verified',
   'Your email address has been successfully verified.',
   'low'),
  ('friend_request_accepted',
   'User {from} accepted your friend request.',
   'normal'),
  ('rank_up',
   'Congratulations! Your rank increased to {new_rank}.',
   'high');


-- =====================================================
-- Ensuring Script Validity:
--  ● Order of Table Creation Based on Dependencies Considered
--  ● All Functions and Triggers Created After Related Tables
--  ● Initial Data Insertions Followed After All Structures
--  ● No Use of ALTER TABLE Commands
-- =====================================================
