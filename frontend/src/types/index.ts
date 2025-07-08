export interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
  last_login?: string;
  is_active: boolean;
  role: 'user' | 'admin' | 'moderator';
  current_level: number;
  total_xp: number;
  bio?: string;
  location?: string;
  website?: string;
  twitter?: string;
  instagram?: string;
  linkedin?: string;
  avatar?: string;
  preferences?: {
    notifications?: boolean;
    soundEffects?: boolean;
    darkMode?: boolean;
    publicProfile?: boolean;
    emailUpdates?: boolean;
    gameReminders?: boolean;
  };
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  created_at: string;
}

export interface CategoryStats {
  total_questions: number;
  verified_questions: number;
  easy_questions: number;
  medium_questions: number;
  hard_questions: number;
  total_players: number;
  active_players: number;
  average_score: number;
  best_score: number;
  total_games: number;
  average_completion_time: number;
  last_played_at?: string;
}

export interface CategoryPlayer {
  user_id: number;
  username: string;
  games_played: number;
  best_score: number;
  average_score: number;
  last_played_at: string;
  rank: number;
}

export interface Question {
  id: number;
  text: string;
  category_id: number;
  difficulty: 'easy' | 'medium' | 'hard';
  is_verified: boolean;
  created_at: string;
  created_by?: number;
  choices?: QuestionChoice[];
}

export interface QuestionChoice {
  id: number;
  choice_text: string;
  is_correct: boolean;
  position: 'A' | 'B' | 'C' | 'D';
}

export interface DifficultyStats {
  easy: number;
  medium: number;
  hard: number;
  total: number;
}

export interface Game {
  id: number;
  game_type_id: number;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  start_time: string;
  end_time?: string;
  winner_id?: number;
  created_at: string;
}

export interface GameType {
  id: number;
  name: string;
  description?: string;
  total_rounds: number;
}

export interface LeaderboardEntry {
  id: number;
  user_id: number;
  username?: string;
  scope: 'daily' | 'weekly' | 'monthly' | 'alltime';
  category_id?: number;
  rank: number;
  score: number;
  generated_at: string;
}

export interface UserStats {
  user_id: number;
  games_played: number;
  games_won: number;
  total_points: number;
  correct_answers: number;
  total_answers: number;
  accuracy_rate?: number;
  average_response_time_ms?: number;
  highest_score: number;
  current_streak: number;
  best_streak: number;
  last_played_at?: string;
}

export interface Notification {
  id: number;
  type_id: number;
  user_id: number;
  data: string;
  is_read: boolean;
  created_at: string;
  related_game_id?: number;
}

export interface GameRound {
  id: number;
  game_id: number;
  round_number: number;
  category_id?: number;
  category_picker_id?: number;
  start_time: string;
  end_time?: string;
  status: 'pending' | 'active' | 'completed';
  time_limit_seconds?: number;
  points_possible: number;
}

export interface ChatRoom {
  id: number;
  name: string;
  type: 'public' | 'private' | 'game';
  created_at: string;
  game_id?: number;
}

export interface ChatMessage {
  id: number;
  room_id: number | null;
  sender_id: number;
  recipient_id?: number | null;
  sender_username: string;
  sender_avatar: string;
  message: string;
  sent_at: string;
  is_edited: boolean;
  is_deleted: boolean;
  is_read: boolean;
  reply_to_id?: number | null;
  replied_message_text?: string;
  replied_message_sender?: string;
}

export interface Conversation {
  other_user_id: number;
  other_user_username: string;
  other_user_avatar?: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

// --- Game Page Specific Types ---

export interface GamePlayer {
  user_id: number;
  username: string;
  avatar: string;
  score: number;
}

export interface GameQuestionChoice {
  choice_id: number;
  choice_text: string;
}

export interface GameQuestion {
  question_id: number;
  text: string;
  choices: GameQuestionChoice[];
}

export interface LiveGameState {
  game_id: number;
  game_status: string;
  total_rounds: number;
  current_round: {
    round_number: number;
    status: string;
    category_id: number | null;
    category_name?: string;
    category_picker_id: number | null;
    category_options: { id: number; name: string }[];
    questions: GameQuestion[];
    answers: any[];
  };
  participants: GamePlayer[];
}

export interface RevealedAnswer {
  question_id: number;
  correct_choice_id: number;
}