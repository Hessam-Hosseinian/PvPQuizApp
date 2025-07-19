import React, { useState, useEffect } from 'react';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import Avatar from '../components/UI/Avatar';
import { leaderboardsAPI, categoriesAPI, statsAPI } from '../services/api';
import { 
  TrophyIcon, 
  MedalIcon, 
  AwardIcon, 
  TrendingUpIcon, 
  UsersIcon, 
  TargetIcon, 
  ClockIcon,
  StarIcon,
  ZapIcon,
  CrownIcon,
  SparklesIcon,
  SearchIcon,
  FilterIcon,
  RefreshCwIcon,
  EyeIcon,
  EyeOffIcon
} from 'lucide-react';

interface LeaderboardFilters {
  scope: string;
  category_id: number | null;
  limit: number;
  search: string;
  showStats: boolean;
  sortBy: string;
}

interface LeaderboardEntry {
  id: number;
  user_id: number;
  username?: string;
  avatar?: string;
  scope: string;
  category_id?: number;
  rank: number;
  score: number;
  generated_at: string;
}

interface Category {
  id: number;
  name: string;
  description?: string;
}

interface UserStats {
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

const LeaderboardPage: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [filters, setFilters] = useState<LeaderboardFilters>({
    scope: 'alltime',
    category_id: null,
    limit: 20,
    search: '',
    showStats: true,
    sortBy: 'score'
  });
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [animateStats, setAnimateStats] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [dataSource, setDataSource] = useState<'real' | 'fallback'>('real');
  const [apiErrors, setApiErrors] = useState<string[]>([]);

  useEffect(() => {
    loadLeaderboard();
    loadCategories();
    loadUserStats();
    
    // Trigger animation after data loads
    setTimeout(() => setAnimateStats(true), 500);
  }, [filters]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const params: {
        scope: string;
        limit: number;
        category_id?: number;
      } = {
        scope: filters.scope,
        limit: filters.limit
      };
      if (filters.category_id !== null) {
        params.category_id = filters.category_id;
      }
      // console.log('Loading leaderboard with params:', params);
      const response = await leaderboardsAPI.getLeaderboards(params);
      // console.log('Leaderboard response:', response.data);
      setLeaderboard(response.data);
      setDataSource('real');
      // Clear leaderboard errors
      setApiErrors(prev => prev.filter(err => !err.includes('leaderboard')));
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
      const errorMsg = `Leaderboard: ${error instanceof Error ? error.message : 'Unknown error'}`;
      setApiErrors(prev => [...prev.filter(err => !err.includes('leaderboard')), errorMsg]);
      // Set fallback data for testing
      const fallbackData: LeaderboardEntry[] = [
        {
          id: 1,
          user_id: 1,
          username: 'Alice',
          scope: 'alltime',
          category_id: 1,
          rank: 1,
          score: 1500,
          generated_at: new Date().toISOString()
        },
        {
          id: 2,
          user_id: 2,
          username: 'Bob',
          scope: 'alltime',
          category_id: 1,
          rank: 2,
          score: 1200,
          generated_at: new Date().toISOString()
        },
        {
          id: 3,
          user_id: 3,
          username: 'Charlie',
          scope: 'alltime',
          category_id: 1,
          rank: 3,
          score: 1000,
          generated_at: new Date().toISOString()
        }
      ];
      setLeaderboard(fallbackData);
      setDataSource('fallback');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      // console.log('Loading categories...');
      const response = await categoriesAPI.getCategories();
      // console.log('Categories response:', response.data);
      setCategories(response.data);
      setDataSource('real');
      // Clear category errors
      setApiErrors(prev => prev.filter(err => !err.includes('categories')));
    } catch (error) {
      console.error('Failed to load categories:', error);
      const errorMsg = `Categories: ${error instanceof Error ? error.message : 'Unknown error'}`;
      setApiErrors(prev => [...prev.filter(err => !err.includes('categories')), errorMsg]);
      // Set fallback categories for testing
      const fallbackCategories: Category[] = [
        { id: 1, name: 'General Knowledge', description: 'General knowledge questions' },
        { id: 2, name: 'Science', description: 'Science and technology questions' },
        { id: 3, name: 'History', description: 'Historical events and figures' },
        { id: 4, name: 'Geography', description: 'World geography and countries' },
        { id: 5, name: 'Sports', description: 'Sports and athletics' },
        { id: 6, name: 'Entertainment', description: 'Movies, music, and entertainment' }
      ];
      setCategories(fallbackCategories);
      setDataSource('fallback');
    }
  };

  const loadUserStats = async () => {
    setStatsLoading(true);
    try {
      // console.log('Loading user stats...');
      // Load stats for top users
      const response = await statsAPI.getTop10WinRate();
      // console.log('User stats response:', response.data);
      setUserStats(response.data);
      setDataSource('real');
      // Clear stats errors
      setApiErrors(prev => prev.filter(err => !err.includes('stats')));
    } catch (error) {
      console.error('Failed to load user stats:', error);
      const errorMsg = `Stats: ${error instanceof Error ? error.message : 'Unknown error'}`;
      setApiErrors(prev => [...prev.filter(err => !err.includes('stats')), errorMsg]);
      // Set fallback stats for testing
      const fallbackStats: UserStats[] = [
        {
          user_id: 1,
          games_played: 50,
          games_won: 35,
          total_points: 1500,
          correct_answers: 180,
          total_answers: 200,
          accuracy_rate: 90.0,
          average_response_time_ms: 5000,
          highest_score: 1500,
          current_streak: 5,
          best_streak: 12,
          last_played_at: new Date().toISOString()
        },
        {
          user_id: 2,
          games_played: 40,
          games_won: 28,
          total_points: 1200,
          correct_answers: 150,
          total_answers: 180,
          accuracy_rate: 83.3,
          average_response_time_ms: 6000,
          highest_score: 1200,
          current_streak: 3,
          best_streak: 8,
          last_played_at: new Date().toISOString()
        },
        {
          user_id: 3,
          games_played: 30,
          games_won: 20,
          total_points: 1000,
          correct_answers: 120,
          total_answers: 150,
          accuracy_rate: 80.0,
          average_response_time_ms: 7000,
          highest_score: 1000,
          current_streak: 2,
          best_streak: 6,
          last_played_at: new Date().toISOString()
        }
      ];
      setUserStats(fallbackStats);
      setDataSource('fallback');
    } finally {
      setStatsLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <CrownIcon className="w-6 h-6 text-yellow-400" />;
      case 2:
        return <MedalIcon className="w-6 h-6 text-gray-400" />;
      case 3:
        return <AwardIcon className="w-6 h-6 text-orange-400" />;
      default:
        return <span className="w-6 h-6 flex items-center justify-center text-sm font-bold text-dark-300">{rank}</span>;
    }
  };

  const getRankBackground = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-600 to-yellow-500';
      case 2:
        return 'bg-gradient-to-r from-gray-600 to-gray-500';
      case 3:
        return 'bg-gradient-to-r from-orange-600 to-orange-500';
      default:
        return 'bg-dark-700';
    }
  };

  const getCategoryName = (categoryId?: number | null) => {
    if (!categoryId) return 'All Categories';
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || 'Unknown Category';
  };

  const getStatsForUser = (userId: number) => {
    return userStats.find(stats => stats.user_id === userId);
  };

  const formatResponseTime = (ms?: number) => {
    if (!ms) return 'N/A';
    return `${Math.round(ms / 1000)}s`;
  };

  const calculateTotalParticipants = () => {
    return leaderboard.length;
  };

  const calculateAverageScore = () => {
    if (leaderboard.length === 0) return 0;
    const total = leaderboard.reduce((sum, entry) => sum + entry.score, 0);
    return Math.round(total / leaderboard.length);
  };

  const calculateTopScore = () => {
    if (leaderboard.length === 0) return 0;
    return Math.max(...leaderboard.map(entry => entry.score));
  };

  const getPerformanceTrend = (entry: LeaderboardEntry) => {
    // Simulate performance trend based on score
    const topScore = calculateTopScore();
    const percentage = (entry.score / topScore) * 100;
    
    if (percentage >= 90) return { trend: 'excellent', color: 'text-green-400', icon: <TrendingUpIcon className="w-4 h-4" /> };
    if (percentage >= 75) return { trend: 'good', color: 'text-blue-400', icon: <StarIcon className="w-4 h-4" /> };
    if (percentage >= 50) return { trend: 'average', color: 'text-yellow-400', icon: <TargetIcon className="w-4 h-4" /> };
    return { trend: 'improving', color: 'text-orange-400', icon: <ZapIcon className="w-4 h-4" /> };
  };

  const getAchievementBadges = (userStats: UserStats | undefined) => {
    if (!userStats) return [];
    
    const badges: { name: string; icon: React.ReactElement; color: string }[] = [];
    
    if (userStats.games_won >= 100) badges.push({ name: 'Century', icon: <CrownIcon className="w-4 h-4" />, color: 'text-yellow-400' });
    if (userStats.accuracy_rate && userStats.accuracy_rate >= 95) badges.push({ name: 'Sharpshooter', icon: <TargetIcon className="w-4 h-4" />, color: 'text-green-400' });
    if (userStats.best_streak >= 20) badges.push({ name: 'Unstoppable', icon: <ZapIcon className="w-4 h-4" />, color: 'text-purple-400' });
    if (userStats.games_played >= 500) badges.push({ name: 'Veteran', icon: <TrophyIcon className="w-4 h-4" />, color: 'text-blue-400' });
    
    return badges;
  };

  const getScoreColor = (score: number) => {
    const topScore = calculateTopScore();
    const percentage = (score / topScore) * 100;
    
    if (percentage >= 90) return 'text-green-400';
    if (percentage >= 75) return 'text-blue-400';
    if (percentage >= 50) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const filteredLeaderboard = leaderboard.filter(entry => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const username = entry.username?.toLowerCase() || '';
      const userId = entry.user_id.toString();
      return username.includes(searchLower) || userId.includes(searchLower);
    }
    return true;
  });

  const sortedLeaderboard = [...filteredLeaderboard].sort((a, b) => {
    switch (filters.sortBy) {
      case 'score':
        return b.score - a.score;
      case 'rank':
        return a.rank - b.rank;
      case 'username':
        return (a.username || '').localeCompare(b.username || '');
      default:
        return b.score - a.score;
    }
  });

  
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-dark-900 min-h-screen">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2 flex items-center">
          <TrophyIcon className="w-10 h-10 text-yellow-400 mr-3" />
          Leaderboard
        </h1>
        <p className="text-dark-300 text-lg">See how you rank against other players</p>
        
        {/* Data Source Indicator */}
        {/* <div className="mt-4">
          {dataSource === 'fallback' ? (
            <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                  <span className="text-yellow-400 text-sm font-medium">Demo Mode</span>
                  <span className="text-yellow-300 text-sm">Showing sample data for testing</span>
                </div>
                <Button
                  onClick={() => {
                    setDataSource('real');
                    loadLeaderboard();
                    loadCategories();
                    loadUserStats();
                  }}
                  className="bg-yellow-600 hover:bg-yellow-500 text-white text-xs px-3 py-1"
                >
                  Try Real Data
                </Button>
              </div>
              <p className="text-yellow-200 text-xs mt-1">
                Connect to backend API to see real leaderboard data
              </p>
            </div>
          ) : (
            <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-green-400 text-sm font-medium">Live Data</span>
                  {/* <span className="text-green-300 text-sm">Connected to real database</span> */}
                {/* </div>
                <Button
                  onClick={() => {
                    loadLeaderboard();
                    loadCategories();
                    loadUserStats();
                  }}
                  className="bg-green-600 hover:bg-green-500 text-white text-xs px-3 py-1"
                >
                  Refresh
                </Button> */}
              {/* </div>
            </div>
          )}
        </div> */} 

        {/* API Errors Display */}
        {apiErrors.length > 0 && (
          <div className="mt-4 bg-red-900/20 border border-red-600/30 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-red-400 text-sm font-medium">API Connection Issues</span>
              <Button
                onClick={() => setApiErrors([])}
                className="text-red-400 hover:text-red-300 text-xs"
              >
                Clear
              </Button>
            </div>
            <div className="space-y-1">
              {apiErrors.map((error, index) => (
                <p key={index} className="text-red-300 text-xs">
                  {error}
                </p>
              ))}
            </div>
            <p className="text-red-200 text-xs mt-2">
              Make sure your backend server is running on http://127.0.0.1:5000
            </p>
          </div>
        )}
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className={`p-6 bg-gradient-to-br from-blue-600 to-blue-700 transform transition-all duration-500 ${animateStats ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="flex items-center">
            <UsersIcon className="w-8 h-8 text-white mr-3" />
            <div>
              <p className="text-white/80 text-sm">Total Participants</p>
              <p className="text-white text-2xl font-bold">{calculateTotalParticipants()}</p>
            </div>
          </div>
        </Card>

        <Card className={`p-6 bg-gradient-to-br from-green-600 to-green-700 transform transition-all duration-500 delay-100 ${animateStats ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="flex items-center">
            <TargetIcon className="w-8 h-8 text-white mr-3" />
            <div>
              <p className="text-white/80 text-sm">Average Score</p>
              <p className="text-white text-2xl font-bold">{calculateAverageScore().toLocaleString()}</p>
            </div>
          </div>
        </Card>

        <Card className={`p-6 bg-gradient-to-br from-purple-600 to-purple-700 transform transition-all duration-500 delay-200 ${animateStats ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="flex items-center">
            <TrophyIcon className="w-8 h-8 text-white mr-3" />
            <div>
              <p className="text-white/80 text-sm">Top Score</p>
              <p className="text-white text-2xl font-bold">{calculateTopScore().toLocaleString()}</p>
            </div>
          </div>
        </Card>

        <Card className={`p-6 bg-gradient-to-br from-orange-600 to-orange-700 transform transition-all duration-500 delay-300 ${animateStats ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="flex items-center">
            <TrendingUpIcon className="w-8 h-8 text-white mr-3" />
            <div>
              <p className="text-white/80 text-sm">Current Period</p>
              <p className="text-white text-2xl font-bold capitalize">{filters.scope}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-6 mb-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Filter Options</h3>
            <p className="text-dark-300 text-sm">Customize your leaderboard view</p>
          </div>
          <Button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center space-x-2 bg-dark-600 hover:bg-dark-500 text-white"
          >
            <FilterIcon className="w-4 h-4" />
            <span>{showAdvancedFilters ? 'Hide' : 'Show'} Advanced</span>
          </Button>
        </div>
        
        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by username or user ID..."
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              className="w-full pl-10 pr-4 py-2 border border-dark-600 bg-dark-700 text-white rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 transition-colors"
            />
          </div>
        </div>

        {/* Basic Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-dark-200 mb-2">
              <ClockIcon className="w-4 h-4 inline mr-1" />
              Time Period
            </label>
            <select
              value={filters.scope}
              onChange={(e) => setFilters({...filters, scope: e.target.value})}
              className="w-full px-3 py-2 border border-dark-600 bg-dark-700 text-white rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 transition-colors"
            >
              <option value="alltime">All Time</option>
              <option value="monthly">This Month</option>
              <option value="weekly">This Week</option>
              <option value="daily">Today</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-200 mb-2">
              <TargetIcon className="w-4 h-4 inline mr-1" />
              Category
            </label>
            <select
              value={filters.category_id || ''}
              onChange={(e) => setFilters({...filters, category_id: e.target.value ? parseInt(e.target.value) : null})}
              className="w-full px-3 py-2 border border-dark-600 bg-dark-700 text-white rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 transition-colors"
            >
              <option value="">All Categories</option>
              {categories.map((category: Category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-200 mb-2">
              <UsersIcon className="w-4 h-4 inline mr-1" />
              Show Top
            </label>
            <select
              value={filters.limit}
              onChange={(e) => setFilters({...filters, limit: parseInt(e.target.value)})}
              className="w-full px-3 py-2 border border-dark-600 bg-dark-700 text-white rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 transition-colors"
            >
              <option value={10}>Top 10</option>
              <option value={20}>Top 20</option>
              <option value={50}>Top 50</option>
              <option value={100}>Top 100</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-200 mb-2">
              <TrendingUpIcon className="w-4 h-4 inline mr-1" />
              Sort By
            </label>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
              className="w-full px-3 py-2 border border-dark-600 bg-dark-700 text-white rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 transition-colors"
            >
              <option value="score">Score (High to Low)</option>
              <option value="rank">Rank (Low to High)</option>
              <option value="username">Username (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="border-t border-dark-700 pt-4 mb-4">
            <h4 className="text-md font-semibold text-white mb-3">Advanced Options</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.showStats}
                    onChange={(e) => setFilters({...filters, showStats: e.target.checked})}
                    className="w-4 h-4 text-primary-500 bg-dark-700 border-dark-600 rounded focus:ring-primary-500 focus:ring-2"
                  />
                  <span className="text-white text-sm">Show Player Statistics</span>
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => {
                    setFilters({
                      scope: 'alltime',
                      category_id: null,
                      limit: 20,
                      search: '',
                      showStats: true,
                      sortBy: 'score'
                    });
                  }}
                  className="flex items-center space-x-2 bg-dark-600 hover:bg-dark-500 text-white"
                >
                  <RefreshCwIcon className="w-4 h-4" />
                  <span>Reset All</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Current Filter Summary */}
        <div className="mt-4 p-3 bg-dark-800 rounded-md">
          <p className="text-sm text-dark-300">
            Showing: <span className="text-white font-medium">{sortedLeaderboard.length}</span> of <span className="text-white font-medium">{filters.limit}</span> players from{' '}
            <span className="text-white font-medium capitalize">{filters.scope}</span> in{' '}
            <span className="text-white font-medium">{getCategoryName(filters.category_id)}</span>
            {filters.search && (
              <span> • Filtered by: <span className="text-white font-medium">"{filters.search}"</span></span>
            )}
          </p>
        </div>
      </Card>

      {/* Leaderboard */}
      <Card className="overflow-hidden">
        <div className="p-6 border-b border-dark-700">
          <h2 className="text-xl font-bold text-white">Leaderboard Rankings</h2>
          <p className="text-dark-300 text-sm mt-1">
            {getCategoryName(filters.category_id)} • {filters.scope.charAt(0).toUpperCase() + filters.scope.slice(1)} Rankings
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-12">
            <TrophyIcon className="w-12 h-12 text-dark-400 mx-auto mb-4" />
            <p className="text-dark-300">No leaderboard data available</p>
          </div>
        ) : (
          <div className="divide-y divide-dark-700">
            {sortedLeaderboard.map((entry: LeaderboardEntry, index) => {
              
              
              const userStats = getStatsForUser(entry.user_id);
              const isTop3 = entry.rank <= 3;
              const performanceTrend = getPerformanceTrend(entry);
              const achievementBadges = entry && userStats ? getAchievementBadges(userStats) : [];
              
              console.log(entry);
              
              return (
                <div
                  key={entry.id}
                  
                  className={`
                    p-6 transition-all duration-200 hover:bg-dark-700/50 transform hover:scale-[1.02]
                    ${isTop3 ? 'bg-gradient-to-r from-dark-700/50 to-dark-800' : ''}
                  `}
                >
                  <div className="flex items-center justify-between">
                    {/* Rank and User Info */}
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <Avatar src={entry.avatar} size="lg" />
                        <div className={`
                          absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                          ${getRankBackground(entry.rank)}
                        `}>
                          {entry.rank}
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold text-white text-lg">
                            {entry.username || `Player ${entry.user_id}`}
                          </h3>
                          {achievementBadges.length > 0 && (
                            <div className="flex space-x-1">
                              {achievementBadges.slice(0, 3).map((badge, idx) => (
                                <div key={idx} className={`${badge.color} hover:scale-110 transition-transform cursor-help`} title={badge.name}>
                                  {badge.icon}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-dark-300">
                          <span>Rank #{entry.rank}</span>
                          <div className="flex items-center space-x-1">
                            {performanceTrend.icon}
                            <span className={performanceTrend.color}>{performanceTrend.trend}</span>
                          </div>
                          {filters.showStats && userStats && (
                            <>
                              <span>• {userStats.games_played} games</span>
                              <span>• {userStats.games_won} wins</span>
                              <span>• {userStats.accuracy_rate?.toFixed(1)}% accuracy</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Score and Performance */}
                    <div className="text-right">
                      <p className={`text-3xl font-bold ${getScoreColor(entry.score)}`}>
                        {entry.score.toLocaleString()}
                      </p>
                      <p className="text-sm text-dark-300">points</p>
                      
                      {/* Win Rate Indicator */}
                      {filters.showStats && userStats && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-dark-300">Win Rate</span>
                            <span className="text-white font-medium">
                              {((userStats.games_won / userStats.games_played) * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-20 h-1 bg-dark-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-300"
                              style={{ width: `${(userStats.games_won / userStats.games_played) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar for Top 3 */}
                  {isTop3 && (
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-dark-300 mb-1">
                        <span>Performance</span>
                        <span>{((entry.score / calculateTopScore()) * 100).toFixed(1)}% of top score</span>
                      </div>
                      <div className="w-full bg-dark-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${
                            entry.rank === 1 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                            entry.rank === 2 ? 'bg-gradient-to-r from-gray-400 to-gray-500' :
                            'bg-gradient-to-r from-orange-400 to-orange-500'
                          }`}
                          style={{ width: `${(entry.score / calculateTopScore()) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Achievement Badges for All */}
                  {achievementBadges.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-dark-700">
                      <div className="flex items-center space-x-2">
                        <SparklesIcon className="w-4 h-4 text-yellow-400" />
                        <span className="text-xs text-dark-300">Achievements:</span>
                        <div className="flex space-x-2">
                          {achievementBadges.map((badge, idx) => (
                            <div key={idx} className={`${badge.color} flex items-center space-x-1 text-xs`}>
                              {badge.icon}
                              <span>{badge.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Top 3 Podium (for larger screens) */}
      {leaderboard.length >= 3 && (
        <div className="mt-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2 flex items-center justify-center">
              <TrophyIcon className="w-6 h-6 lg:w-8 lg:h-8 text-yellow-400 mr-2 lg:mr-3" />
              🏆 Champions Podium
              <SparklesIcon className="w-4 h-4 lg:w-6 lg:h-6 text-yellow-400 ml-2 lg:ml-3 animate-pulse" />
            </h2>
            <p className="text-dark-300 text-sm lg:text-base">The elite players of {getCategoryName(filters.category_id)}</p>
          </div>
          {/* Podium Container */}
          <div className="relative">
            {/* Podium Base */}
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-4xl h-2 lg:h-4 bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 rounded-full opacity-20"></div>
            {/* Podium Stands */}
            <div className="flex justify-center items-end space-x-2 lg:space-x-4 xl:space-x-8 mb-8 relative z-10">
              {(() => {
                const top3 = leaderboard
                  .filter(entry => entry.rank <= 3)
                  .sort((a, b) => a.rank - b.rank)
                  .slice(0, 3);
                while (top3.length < 3) {
                  top3.push(null as any);
                }
                const podiumSizes = [
                  { h: 'h-36', w: 'w-28' },
                  { h: 'h-48', w: 'w-36' },
                  { h: 'h-32', w: 'w-28' },
                ];
                return [top3[1], top3[0], top3[2]].map((entry: LeaderboardEntry | null, index) => {
                  const podiumPosition = index === 1 ? 1 : index === 0 ? 2 : 3;
                  const userStats = entry ? getStatsForUser(entry.user_id) : undefined;
                  const achievementBadges = entry && userStats ? getAchievementBadges(userStats) : [];
                  if (!entry) {
                    return (
                      <div key={`placeholder-${index}`} className="text-center opacity-50 flex flex-col items-center justify-end">
                        <Card className={`${podiumSizes[index].h} ${podiumSizes[index].w} flex items-end justify-center p-2 lg:p-4 bg-dark-700 relative overflow-hidden`}>
                          <div className="text-center w-full flex flex-col items-center justify-center">
                            <div className="text-dark-400 font-bold text-lg lg:text-2xl mb-1">#{podiumPosition}</div>
                            <div className="text-dark-500 text-xs lg:text-sm">No Player</div>
                          </div>
                        </Card>
                      </div>
                    );
                  }
                  return (
                    <div key={entry.id} className="text-center group flex flex-col items-center justify-end">
                      {/* Podium Stand */}
                      <Card className={`${podiumSizes[index].h} ${podiumSizes[index].w} flex items-end justify-center p-2 lg:p-4 ${getRankBackground(entry.rank)} relative overflow-hidden transform transition-all duration-500 hover:scale-105 ${entry.rank === 1 ? 'shadow-2xl shadow-yellow-500/20' : entry.rank === 2 ? 'shadow-xl shadow-gray-500/20' : 'shadow-lg shadow-orange-500/20'}`}> 
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>
                        {entry.rank === 1 && (
                          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/10 via-yellow-300/5 to-yellow-400/10 animate-pulse"></div>
                        )}
                        <div className="relative z-10 text-center w-full flex flex-col items-center justify-center">
                          <div className="flex items-center justify-center mb-1 lg:mb-2">
                            {entry.rank === 1 && <CrownIcon className="w-6 h-6 lg:w-8 lg:h-8 text-yellow-300 mr-1 lg:mr-2" />}
                            {entry.rank === 2 && <MedalIcon className="w-5 h-5 lg:w-6 lg:h-6 text-gray-300 mr-1 lg:mr-2" />}
                            {entry.rank === 3 && <AwardIcon className="w-5 h-5 lg:w-6 lg:h-6 text-orange-300 mr-1 lg:mr-2" />}
                            <div className="text-white font-bold text-xl lg:text-3xl">{entry.rank}</div>
                          </div>
                          <div className="text-white/80 text-xs lg:text-sm font-medium">#{entry.rank}</div>
                          {achievementBadges.length > 0 && (
                            <div className="flex justify-center space-x-1 mt-1 lg:mt-2">
                              {achievementBadges.slice(0, 2).map((badge, idx) => (
                                <div key={idx} className={`${badge.color} hover:scale-110 transition-transform`} title={badge.name}>
                                  {badge.icon}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </Card>
                      {/* Player Info */}
                      <div className="mt-2 lg:mt-4 transform transition-all duration-300 group-hover:scale-105 w-full flex flex-col items-center justify-center">
                        <div className="flex items-center justify-center space-x-1 lg:space-x-2 mb-1 lg:mb-2">
                          <p className="font-bold text-white text-sm lg:text-lg">
                            {entry.username || `Player ${entry.user_id}`}
                          </p>
                          {entry.rank === 1 && (
                            <div className="flex space-x-1">
                              <StarIcon className="w-3 h-3 lg:w-4 lg:h-4 text-yellow-400 animate-bounce" />
                              <StarIcon className="w-3 h-3 lg:w-4 lg:h-4 text-yellow-400 animate-bounce" style={{ animationDelay: '0.1s' }} />
                              <StarIcon className="w-3 h-3 lg:w-4 lg:h-4 text-yellow-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
                            </div>
                          )}
                        </div>
                        <p className={`text-lg lg:text-2xl font-bold mb-1 lg:mb-2 ${entry.rank === 1 ? 'text-yellow-400' : entry.rank === 2 ? 'text-gray-400' : 'text-orange-400'}`}>{entry.score.toLocaleString()} pts</p>
                        {/* Performance indicator */}
                        <div className="mb-2 lg:mb-3 w-full">
                          <div className="flex justify-between text-xs text-dark-300 mb-1">
                            <span>Performance</span>
                            <span>{((entry.score / calculateTopScore()) * 100).toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-dark-700 rounded-full h-1 lg:h-1.5">
                            <div className={`h-1 lg:h-1.5 rounded-full transition-all duration-1000 ${entry.rank === 1 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' : entry.rank === 2 ? 'bg-gradient-to-r from-gray-400 to-gray-500' : 'bg-gradient-to-r from-orange-400 to-orange-500'}`} style={{ width: `${(entry.score / calculateTopScore()) * 100}%` }}></div>
                          </div>
                        </div>
                        {/* Champion Stats - Hidden on very small screens */}
                        {userStats && (
                          <div className="hidden sm:block bg-dark-800 rounded-lg p-2 lg:p-3 mt-2 lg:mt-3 border border-dark-600 hover:border-dark-500 transition-colors w-full">
                            <div className="grid grid-cols-2 gap-1 lg:gap-2 text-xs">
                              <div className="text-center">
                                <p className="text-dark-300">Games</p>
                                <p className="text-white font-semibold">{userStats.games_played}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-dark-300">Wins</p>
                                <p className="text-white font-semibold">{userStats.games_won}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-dark-300">Accuracy</p>
                                <p className="text-white font-semibold">{userStats.accuracy_rate?.toFixed(1)}%</p>
                              </div>
                              <div className="text-center">
                                <p className="text-dark-300">Streak</p>
                                <p className="text-white font-semibold">{userStats.current_streak}</p>
                              </div>
                            </div>
                            {/* Win rate bar */}
                            <div className="mt-2">
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-dark-300">Win Rate</span>
                                <span className="text-white font-medium">{((userStats.games_won / userStats.games_played) * 100).toFixed(1)}%</span>
                              </div>
                              <div className="w-full h-1 bg-dark-700 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-500" style={{ width: `${(userStats.games_won / userStats.games_played) * 100}%` }}></div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

     

      {/* Advanced Analytics Section */}
      <div className="mt-12">
        <Card className="p-6">
          <h3 className="text-xl font-bold text-white mb-6">Advanced Analytics</h3>
          
          {/* Score Distribution */}
          <div className="mb-8">
            <h4 className="text-lg font-semibold text-white mb-4">Score Distribution</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-dark-800 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-400 mb-1">
                  {leaderboard.filter(e => (e.score / calculateTopScore()) * 100 >= 90).length}
                </div>
                <div className="text-sm text-dark-300">Elite (90%+)</div>
              </div>
              <div className="bg-dark-800 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-400 mb-1">
                  {leaderboard.filter(e => (e.score / calculateTopScore()) * 100 >= 75 && (e.score / calculateTopScore()) * 100 < 90).length}
                </div>
                <div className="text-sm text-dark-300">Good (75-89%)</div>
              </div>
              <div className="bg-dark-800 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-yellow-400 mb-1">
                  {leaderboard.filter(e => (e.score / calculateTopScore()) * 100 >= 50 && (e.score / calculateTopScore()) * 100 < 75).length}
                </div>
                <div className="text-sm text-dark-300">Average (50-74%)</div>
              </div>
              <div className="bg-dark-800 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-orange-400 mb-1">
                  {leaderboard.filter(e => (e.score / calculateTopScore()) * 100 < 50).length}
                </div>
                <div className="text-sm text-dark-300">Improving (50%+)</div>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="mb-8">
            <h4 className="text-lg font-semibold text-white mb-4">Performance Metrics</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-dark-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-dark-300 text-sm">Average Games Played</span>
                  <UsersIcon className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-xl font-bold text-white">
                  {userStats.length > 0 ? Math.round(userStats.reduce((sum, stat) => sum + stat.games_played, 0) / userStats.length) : 0}
                </div>
              </div>
              
              <div className="bg-dark-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-dark-300 text-sm">Average Win Rate</span>
                  <TargetIcon className="w-4 h-4 text-green-400" />
                </div>
                <div className="text-xl font-bold text-white">
                  {userStats.length > 0 ? ((userStats.reduce((sum, stat) => sum + (stat.games_won / stat.games_played), 0) / userStats.length) * 100).toFixed(1) : 0}%
                </div>
              </div>
              
              <div className="bg-dark-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-dark-300 text-sm">Average Accuracy</span>
                  <StarIcon className="w-4 h-4 text-yellow-400" />
                </div>
                <div className="text-xl font-bold text-white">
                  {userStats.length > 0 ? (userStats.reduce((sum, stat) => sum + (stat.accuracy_rate || 0), 0) / userStats.length).toFixed(1) : 0}%
                </div>
              </div>
              
              <div className="bg-dark-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-dark-300 text-sm">Best Streak</span>
                  <ZapIcon className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-xl font-bold text-white">
                  {userStats.length > 0 ? Math.max(...userStats.map(stat => stat.best_streak)) : 0}
                </div>
              </div>
            </div>
          </div>

         
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="mt-12">
        <Card className="p-6">
          <h3 className="text-xl font-bold text-white mb-4">Recent Leaderboard Activity</h3>
          <div className="space-y-3">
            {leaderboard.slice(0, 5).map((entry: LeaderboardEntry, index) => (
              <div key={entry.id} className="flex items-center justify-between p-3 bg-dark-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Avatar src={entry.avatar} size="sm" />
                    <div className={`
                      absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold
                      ${entry.rank <= 3 ? getRankBackground(entry.rank) : 'bg-dark-700'}
                    `}>
                      {entry.rank}
                    </div>
                  </div>
                  <div>
                    <p className="text-white font-medium">{entry.username || `Player ${entry.user_id}`}</p>
                    <p className="text-dark-300 text-sm">
                      {new Date(entry.generated_at).toLocaleDateString()} • {getCategoryName(entry.category_id)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold">{entry.score.toLocaleString()}</p>
                  <p className="text-dark-300 text-sm">points</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

     
      {/* Footer Stats */}
      {/* <div className="mt-8 text-center">
        <div className="text-dark-400 text-sm">
          <p>Last updated: {new Date().toLocaleString()}</p>
          <p className="mt-1">
            Showing {sortedLeaderboard.length} players • 
            Total participants: {calculateTotalParticipants()} • 
            Average score: {calculateAverageScore().toLocaleString()}
          </p>
        </div>
      </div> */}
    </div>
  );
};

export default LeaderboardPage;