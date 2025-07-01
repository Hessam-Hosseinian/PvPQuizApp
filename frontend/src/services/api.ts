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
  
  changePassword: (userId: number, data: { currentPassword: string; newPassword: string }) =>
    api.post(`/users/${userId}/change-password`, data),
  
  deleteAccount: (userId: number) => api.delete(`/users/${userId}`),
  
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post('/users/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  deleteAvatar: () => api.delete('/users/avatar'),
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
  getCategoryStats: (categoryId: number) => api.get(`/categories/${categoryId}/stats`),
  getCategoryPlayers: (categoryId: number) => api.get(`/categories/${categoryId}/players`),
  getCategoryLeaderboard: (categoryId: number) => api.get(`/categories/${categoryId}/leaderboard`),
};

// Questions API
export const questionsAPI = {
  getQuestions: (params?: { verified?: boolean; difficulty?: string; category_id?: number }) =>
    api.get('/questions', { params }),
  getQuestion: (id: number) => api.get(`/questions/${id}`),
  createQuestion: (data: Partial<Question>) => api.post('/questions', data),
  updateQuestion: (id: number, data: Partial<Question>) => api.put(`/questions/${id}`, data),
  deleteQuestion: (id: number) => api.delete(`/questions/${id}`),
  getDifficultyStats: (params?: { category_id?: number; verified?: boolean }) =>
    api.get('/questions/stats/difficulty', { params }),
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

  // New: get game state
  getGameState: (gameId: number, userId: number) =>
    api.get(`/games/${gameId}/state`, { params: { user_id: userId } }),

  queueStatus: (userId: number, gameTypeId: number) =>
    api.get('/games/queue/status', { params: { user_id: userId, game_type_id: gameTypeId } }),
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

// WebSocket service for real-time game updates
export class GameWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Function[]> = new Map();

  connect(gameId: number, userId: number) {
    const wsUrl = `ws://localhost:5000/ws/game/${gameId}?user_id=${userId}`;
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    };
    
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.attemptReconnect();
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  private handleMessage(data: any) {
    const { type, payload } = data;
    const listeners = this.listeners.get(type) || [];
    listeners.forEach(listener => listener(payload));
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect(parseInt(this.ws?.url.split('/').pop()?.split('?')[0] || '0'), 0);
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function) {
    const listeners = this.listeners.get(event) || [];
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
  }
}

export const chatAPI = {
  getRooms: () => api.get('/chat/rooms'),
  createRoom: (data: { name: string; type: 'public' | 'private' | 'game'; game_id?: number }) => api.post('/chat/rooms', data),
  getRoomMessages: (roomId: number) => api.get(`/chat/rooms/${roomId}/messages`),
  sendMessage: (roomId: number, data: { message: string; reply_to_id?: number }) => api.post(`/chat/rooms/${roomId}/messages`, data),
  joinRoom: (roomId: number) => api.post(`/chat/rooms/${roomId}/members`),
  // Direct Messaging
  getConversations: () => api.get('/chat/direct-messages/conversations'),
  getDirectMessages: (otherUserId: number) => api.get(`/chat/direct-messages/${otherUserId}`),
  sendDirectMessage: (data: { recipient_id: number; message: string; reply_to_id?: number }) => api.post('/chat/direct-messages', data),
};

export default api;