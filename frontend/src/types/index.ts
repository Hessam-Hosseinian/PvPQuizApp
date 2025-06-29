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
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  created_at: string;
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