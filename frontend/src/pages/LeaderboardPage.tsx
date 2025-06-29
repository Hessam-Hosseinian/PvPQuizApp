import React, { useState, useEffect } from 'react';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import LoadingSpinner from '../components/UI/LoadingSpinner';
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
  SparklesIcon
} from 'lucide-react';

interface LeaderboardFilters {
  scope: string;
  category_id: number | null;
  limit: number;
}

interface LeaderboardEntry {
  id: number;
  user_id: number;
  username?: string;
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
    limit: 20
  });
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [animateStats, setAnimateStats] = useState(false);

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
      const response = await leaderboardsAPI.getLeaderboards(params);
      setLeaderboard(response.data);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await categoriesAPI.getCategories();
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadUserStats = async () => {
    setStatsLoading(true);
    try {
      // Load stats for top users
      const response = await statsAPI.getTop10WinRate();
   
      
      setUserStats(response.data);
    } catch (error) {
      console.error('Failed to load user stats:', error);
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
  console.log("userStats : ", userStats);
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-dark-900 min-h-screen">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2 flex items-center">
          <TrophyIcon className="w-10 h-10 text-yellow-400 mr-3" />
          Leaderboard
        </h1>
        <p className="text-dark-300 text-lg">See how you rank against other players</p>
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
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white mb-2">Filter Options</h3>
          <p className="text-dark-300 text-sm">Customize your leaderboard view</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

          <div className="flex items-end">
            <Button
              onClick={() => {
                setFilters({
                  scope: 'alltime',
                  category_id: null,
                  limit: 20
                });
              }}
              className="w-full bg-dark-600 hover:bg-dark-500 text-white"
            >
              Reset Filters
            </Button>
          </div>
        </div>

        {/* Current Filter Summary */}
        <div className="mt-4 p-3 bg-dark-800 rounded-md">
          <p className="text-sm text-dark-300">
            Showing: <span className="text-white font-medium">{filters.limit}</span> players from{' '}
            <span className="text-white font-medium capitalize">{filters.scope}</span> in{' '}
            <span className="text-white font-medium">{getCategoryName(filters.category_id)}</span>
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
            {leaderboard.map((entry: LeaderboardEntry, index) => {
              
              
              const userStats = getStatsForUser(entry.user_id);
              const isTop3 = entry.rank <= 3;
              
              
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
                      <div className={`
                        w-12 h-12 rounded-full flex items-center justify-center
                        ${getRankBackground(entry.rank)}
                      `}>
                        {getRankIcon(entry.rank)}
                      </div>
                      
                      <div>
                        <h3 className="font-semibold text-white text-lg">
                       
                          {entry.username}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-dark-300">
                          <span>Rank #{entry.rank}</span>
                          {userStats && (
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
                      <p className="text-3xl font-bold text-white">
                        {entry.score.toLocaleString()}
                      </p>
                      <p className="text-sm text-dark-300">points</p>
                 
                      
                      {/* Additional Stats */}
                      {/* {userStats && (
                        <div className="mt-2 text-xs text-dark-400">
                          <div className="flex space-x-3">
                            <span>Best: {userStats.highest_score}</span>
                            <span>Streak: {userStats.current_streak}</span>
                            <span>Avg: {formatResponseTime(userStats.average_response_time_ms)}</span>
                          </div>
                        </div>
                      )} */}
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
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Top 3 Podium (for larger screens) */}
      {leaderboard.length >= 3 && (
        <div className="hidden lg:block mt-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">🏆 Champions Podium</h2>
            <p className="text-dark-300">The elite players of {getCategoryName(filters.category_id)}</p>
          </div>
          
          <div className="flex justify-center items-end space-x-8 mb-8">
            {[leaderboard[1], leaderboard[0], leaderboard[2]].map((entry: LeaderboardEntry, index) => {
              const actualRank = entry?.rank;
              const heights = ['h-32', 'h-40', 'h-28'];
              const heightIndex = [1, 0, 2][index];
              const userStats = entry ? getStatsForUser(entry.user_id) : null;
              
              if (!entry) return null;
              
              return (
                <div key={entry.id} className="text-center">
                  <Card className={`${heights[heightIndex]} w-32 flex items-end justify-center p-4 ${getRankBackground(actualRank)} relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                    <div className="relative z-10">
                      <div className="text-white font-bold text-2xl mb-1">{actualRank}</div>
                      <div className="text-white/80 text-sm">#{actualRank}</div>
                    </div>
                  </Card>
                  
                  <div className="mt-4">
                    <p className="font-bold text-white text-lg">
                      Player {entry.user_id}
                      {entry.username && ` (${entry.username})`}
                    </p>
                    <p className="text-2xl font-bold text-primary-400 mb-2">
                      {entry.score.toLocaleString()} pts
                    </p>
                    
                    {/* Champion Stats */}
                    {userStats && (
                      <div className="bg-dark-800 rounded-lg p-3 mt-3">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-dark-300">Games</p>
                            <p className="text-white font-semibold">{userStats.games_played}</p>
                          </div>
                          <div>
                            <p className="text-dark-300">Wins</p>
                            <p className="text-white font-semibold">{userStats.games_won}</p>
                          </div>
                          <div>
                            <p className="text-dark-300">Accuracy</p>
                            <p className="text-white font-semibold">{userStats.accuracy_rate?.toFixed(1)}%</p>
                          </div>
                          <div>
                            <p className="text-dark-300">Streak</p>
                            <p className="text-white font-semibold">{userStats.current_streak}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Champion Comparison */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Champion Comparison</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {leaderboard.slice(0, 3).map((entry: LeaderboardEntry) => {
                const userStats = getStatsForUser(entry.user_id);
                return (
                  <div key={entry.id} className="bg-dark-800 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      {getRankIcon(entry.rank)}
                      <span className="ml-2 text-white font-semibold">#{entry.rank}</span>
                    </div>
                    <p className="text-white font-bold mb-2">Player {entry.user_id}</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-dark-300">Score:</span>
                        <span className="text-white">{entry.score.toLocaleString()}</span>
                      </div>
                      {userStats && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-dark-300">Win Rate:</span>
                            <span className="text-white">{((userStats.games_won / userStats.games_played) * 100).toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-dark-300">Best Streak:</span>
                            <span className="text-white">{userStats.best_streak}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Category Performance Insights */}
      {categories.length > 0 && (
        <div className="mt-12">
          <Card className="p-6">
            <h3 className="text-xl font-bold text-white mb-4">Category Performance Insights</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.slice(0, 6).map((category: Category) => (
                <div key={category.id} className="bg-dark-800 rounded-lg p-4 hover:bg-dark-700 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-white font-semibold">{category.name}</h4>
                    <span className="text-primary-400 text-sm">#{category.id}</span>
                  </div>
                  <p className="text-dark-300 text-sm mb-3 line-clamp-2">
                    {category.description || 'No description available'}
                  </p>
                  <div className="flex justify-between text-xs">
                    <span className="text-dark-300">Questions:</span>
                    <span className="text-white">~50</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-dark-300">Difficulty:</span>
                    <span className="text-white">Mixed</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Recent Activity */}
      <div className="mt-12">
        <Card className="p-6">
          <h3 className="text-xl font-bold text-white mb-4">Recent Leaderboard Activity</h3>
          <div className="space-y-3">
            {leaderboard.slice(0, 5).map((entry: LeaderboardEntry, index) => (
              <div key={entry.id} className="flex items-center justify-between p-3 bg-dark-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                    ${entry.rank <= 3 ? getRankBackground(entry.rank) : 'bg-dark-700'}
                  `}>
                    {entry.rank <= 3 ? getRankIcon(entry.rank) : entry.rank}
                  </div>
                  <div>
                    <p className="text-white font-medium">Player {entry.user_id}</p>
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
    </div>
  );
};

export default LeaderboardPage;