import axios from 'axios';
import { User, Category, Question, Game, GameType, LeaderboardEntry, UserStats, Notification } from '../types';

const API_BASE_URL = 'http://127.0.0.1:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth API
export const authAPI = {
  login: (username: string, password: string) =>
    api.post('/users/login', { username, password }),
  
  register: (username: string, email: string, password: string) =>
    api.post('/users', { username, email, password }),
  
  logout: () => api.post('/users/logout'),
  
  getProfile: () => api.get('/users/profile'),
  
  updateProfile: (userId: number, data: Partial<User>) =>
    api.put(`/users/${userId}`, data),
};

// Users API
export const usersAPI = {
  getUsers: () => api.get('/users'),
  getUser: (id: number) => api.get(`/users/${id}`),
  updateUser: (id: number, data: Partial<User>) => api.put(`/users/${id}`, data),
  deleteUser: (id: number) => api.delete(`/users/${id}`),
};

// Categories API
export const categoriesAPI = {
  getCategories: () => api.get('/categories'),
  createCategory: (data: { name: string; description?: string }) =>
    api.post('/categories', data),
  updateCategory: (id: number, data: Partial<Category>) =>
    api.put(`/categories/${id}`, data),
  deleteCategory: (id: number) => api.delete(`/categories/${id}`),
};

// Questions API
export const questionsAPI = {
  getQuestions: (params?: { verified?: boolean; difficulty?: string; category_id?: number }) =>
    api.get('/questions', { params }),
  getQuestion: (id: number) => api.get(`/questions/${id}`),
  createQuestion: (data: Partial<Question>) => api.post('/questions', data),
  updateQuestion: (id: number, data: Partial<Question>) => api.put(`/questions/${id}`, data),
  deleteQuestion: (id: number) => api.delete(`/questions/${id}`),
};

// Games API
export const gamesAPI = {
  enqueueForDuel: (userId: number, gameTypeId: number) =>
    api.post('/games/queue', { user_id: userId, game_type_id: gameTypeId }),
  
  sendInvitation: (inviterId: number, inviteeId: number) =>
    api.post('/games/invite', { inviter_id: inviterId, invitee_id: inviteeId }),
  
  respondToInvitation: (invitationId: number, inviteeId: number, action: 'accept' | 'decline') =>
    api.post('/games/invite/respond', { invitation_id: invitationId, invitee_id: inviteeId, action }),
  
  startGame: (gameId: number) => api.post(`/games/${gameId}/start`),
  
  pickCategory: (gameId: number, roundNumber: number, userId: number, categoryId: number) =>
    api.post(`/games/${gameId}/rounds/${roundNumber}/pick_category`, { user_id: userId, category_id: categoryId }),
  
  submitAnswer: (gameId: number, roundNumber: number, data: {
    user_id: number;
    question_id: number;
    choice_id: number;
    response_time_ms?: number;
  }) => api.post(`/games/${gameId}/rounds/${roundNumber}/answer`, data),
  
  completeRound: (gameId: number, roundNumber: number) =>
    api.post(`/games/${gameId}/rounds/${roundNumber}/complete`),
  
  completeGame: (gameId: number) => api.post(`/games/${gameId}/complete`),
  
  createGroupGame: (data: {
    game_type_id: number;
    creator_id: number;
    participant_ids: number[];
  }) => api.post('/games', data),
};

// Game Types API
export const gameTypesAPI = {
  getGameTypes: () => api.get('/game-types'),
  createGameType: (data: { name: string; description?: string; total_rounds?: number }) =>
    api.post('/game-types', data),
};

// Leaderboards API
export const leaderboardsAPI = {
  getLeaderboards: (params?: { scope?: string; category_id?: number; limit?: number }) =>
    api.get('/leaderboards', { params }),
  getUserLeaderboards: (userId: number) => api.get(`/leaderboards/user/${userId}`),
};

// Stats API
export const statsAPI = {
  getTop10WinRate: () => api.get('/stats/top10-winrate'),
  getMostPlayedCategories: () => api.get('/stats/most-played-categories'),
  getUserWinLoss: (userId: number) => api.get(`/stats/user-winloss/${userId}`),
  getUserCount: () => api.get('/stats/user-count'),
  getQuestionCount: () => api.get('/stats/question-count'),
  getDailyStats: () => api.get('/stats/daily-stats'),
  getRecentGames: () => api.get('/stats/recent-games'),
  getPopularCategories: () => api.get('/stats/popular-categories'),
};

// Notifications API
export const notificationsAPI = {
  getNotifications: (userId: number) => api.get(`/notifications?user_id=${userId}`),
  markAsRead: (notificationId: number) => api.post(`/notifications/${notificationId}/read`),
  createNotification: (data: { user_id: number; type_id: number; data: string }) =>
    api.post('/notifications', data),
};

export default api;