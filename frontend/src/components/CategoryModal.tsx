import React, { useState, useEffect } from 'react';
import Modal from './UI/Modal';
import { Category, CategoryStats, CategoryPlayer } from '../types';
import { categoriesAPI } from '../services/api';
import { 
  BookOpenIcon, 
  CalendarIcon, 
  UsersIcon, 
  TrophyIcon,
  ClockIcon,
  StarIcon,
  TrendingUpIcon,
  PlayIcon,
  AwardIcon,
  TargetIcon,
  ZapIcon,
  RefreshCwIcon,
  InfoIcon,
  BarChart3Icon
} from 'lucide-react';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: Category | null;
  questionCount: number;
  categoryIndex: number;
}

const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  category,
  questionCount,
  categoryIndex
}) => {
  const [categoryStats, setCategoryStats] = useState<CategoryStats | null>(null);
  const [topPlayers, setTopPlayers] = useState<CategoryPlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isOpen && category) {
      loadCategoryData();
    }
  }, [isOpen, category]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (event.key) {
        case 'Escape':
          onClose();
          break;
        case 'r':
        case 'R':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            handleRefresh();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const loadCategoryData = async (isRefresh = false) => {
    if (!category) return;
    
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    
    try {
      // Load category statistics and top players in parallel
      const [statsResponse, playersResponse] = await Promise.all([
        categoriesAPI.getCategoryStats(category.id),
        categoriesAPI.getCategoryPlayers(category.id)
      ]);
      
      setCategoryStats(statsResponse.data);
      setTopPlayers(playersResponse.data);
    } catch (error) {
      console.error('Failed to load category data:', error);
      setError('Failed to load category statistics. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadCategoryData(true);
  };

  if (!category) return null;

  const getCategoryColor = (index: number) => {
    const colors = [
      'from-red-600 to-pink-600',
      'from-blue-600 to-indigo-600',
      'from-green-600 to-teal-600',
      'from-yellow-600 to-orange-600',
      'from-purple-600 to-indigo-600',
      'from-pink-600 to-rose-600',
      'from-indigo-600 to-blue-600',
      'from-teal-600 to-green-600',
    ];
    return colors[index % colors.length];
  };

  const getCategoryIcon = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    
    if (name.includes('vehicles')) return '🚗';
    if (name.includes('sports')) return '🏅';
    if (name.includes('mathematics')) return '➗';
    if (name.includes('gadgets')) return '📱';
    if (name.includes('computers')) return '💻';
    if (name.includes('nature')) return '🌱';
    if (name.includes('politics')) return '🏛️';
    if (name.includes('mythology')) return '⚡';
    if (name.includes('history')) return '📚';
    if (name.includes('general knowledge')) return '❔';
    if (name.includes('video games')) return '🎮';
    if (name.includes('television')) return '📺';
    if (name.includes('musicals and theatres')) return '🎭';
    if (name.includes('music')) return '🎵';
    if (name.includes('anime') || name.includes('manga')) return '🗾';
    if (name.includes('film')) return '🎬';
    if (name.includes('comics')) return '🦸';
    if (name.includes('cartoon and animations')) return '🐭';
    if (name.includes('books')) return '📖';
    if (name.includes('board games')) return '🎲';
    if (name.includes('celebrities')) return '🌟';
    if (name.includes('art')) return '🎨';
    if (name.includes('animals')) return '🐾';
    if (name.includes('science')) return '🔬';
    if (name.includes('entertainment')) return '🎬';
    if (name.includes('literature')) return '📖';
    if (name.includes('geography')) return '🌍';
    return '❓';
  };

  const getDifficultyLevel = (stats: CategoryStats | null) => {
    if (!stats) return { level: 'Unknown', color: 'text-gray-400', bgColor: 'bg-gray-400 bg-opacity-10' };
    
    const total = stats.easy_questions + stats.medium_questions + stats.hard_questions;
    if (total === 0) return { level: 'No Questions', color: 'text-gray-400', bgColor: 'bg-gray-400 bg-opacity-10' };
    
    const maxDifficulty = Math.max(stats.easy_questions, stats.medium_questions, stats.hard_questions);
    
    if (stats.hard_questions === maxDifficulty) return { level: 'Hard', color: 'text-red-400', bgColor: 'bg-red-400 bg-opacity-10' };
    if (stats.medium_questions === maxDifficulty) return { level: 'Medium', color: 'text-yellow-400', bgColor: 'bg-yellow-400 bg-opacity-10' };
    return { level: 'Easy', color: 'text-green-400', bgColor: 'bg-green-400 bg-opacity-10' };
  };

  const difficulty = getDifficultyLevel(categoryStats);

  const LoadingSkeleton = ({ className = "" }: { className?: string }) => (
    <div className={`animate-pulse bg-dark-600 rounded ${className}`}></div>
  );

  const StatCard = ({ 
    icon: Icon, 
    value, 
    label, 
    color = "text-primary-400",
    loading = false 
  }: {
    icon: any;
    value: string | number;
    label: string;
    color?: string;
    loading?: boolean;
  }) => (
    <div className="bg-dark-700 rounded-lg p-4 text-center transition-all duration-200 hover:bg-dark-600">
      {loading ? (
        <LoadingSkeleton className="w-6 h-6 mx-auto mb-2" />
      ) : (
        <Icon className={`w-6 h-6 ${color} mx-auto mb-2`} />
      )}
      <p className="text-2xl font-bold text-white">
        {loading ? (
          <LoadingSkeleton className="w-12 h-8 mx-auto" />
        ) : (
          value
        )}
      </p>
      <p className="text-sm text-dark-300">{label}</p>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={category.name}
      size="lg"
    >
      <div className="space-y-6">
        {/* Header with icon and gradient */}
        <div className={`h-32 bg-gradient-to-br ${getCategoryColor(categoryIndex)} rounded-lg p-6 flex items-center justify-center text-white relative overflow-hidden`}>
          <div className="text-center z-10">
            <div className="text-6xl mb-3">
              {getCategoryIcon(category.name)}
            </div>
            <h2 className="text-2xl font-bold">{category.name.replace('&amp;', 'and')}</h2>
          </div>
          <div className="absolute inset-0 bg-black bg-opacity-20"></div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="absolute top-4 right-4 p-2 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30 transition-all duration-200 disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCwIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Description */}
        <div className="bg-dark-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-2 flex items-center">
            <InfoIcon className="w-5 h-5 mr-2 text-primary-400" />
            Description
          </h3>
          <p className="text-dark-300 leading-relaxed">
            {category.description?.replace('&amp;', 'and') || 
              'Test your knowledge in this exciting category. Challenge yourself with a variety of questions and see how well you perform!'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={BookOpenIcon}
            value={loading ? '...' : categoryStats?.total_questions === 0 ? 'No Questions' : `${categoryStats?.verified_questions || 0}/${categoryStats?.total_questions || 0}`}
            label="Questions (Verified/Total)"
            loading={loading}
            color="text-primary-400"
          />
          
          <StatCard
            icon={StarIcon}
            value={difficulty.level}
            label="Primary Difficulty"
            loading={loading}
            color={difficulty.color}
          />
          
          <StatCard
            icon={CalendarIcon}
            value={new Date(category.created_at).toLocaleDateString()}
            label="Added"
            loading={loading}
            color="text-blue-400"
          />
          
          <StatCard
            icon={TrendingUpIcon}
            value={categoryStats?.total_players || 0}
            label="Total Players"
            loading={loading}
            color="text-green-400"
          />
        </div>

        {/* Empty State for Categories with No Questions */}
        {!loading && categoryStats && categoryStats.total_questions === 0 && (
          <div className="bg-yellow-500 bg-opacity-10 border border-yellow-500 border-opacity-30 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <BookOpenIcon className="w-6 h-6 text-yellow-400" />
              <div>
                <p className="text-yellow-300 font-medium">No Questions Available</p>
                <p className="text-yellow-400 text-sm">This category doesn't have any questions yet. Check back later!</p>
              </div>
            </div>
          </div>
        )}

        {/* Estimated Quiz Info */}
        <div className="bg-dark-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
            <BarChart3Icon className="w-5 h-5 mr-2 text-primary-400" />
            Performance Statistics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <ClockIcon className="w-5 h-5 text-yellow-400" />
              <div className="flex-1">
                <p className="text-white font-medium">Average Time</p>
                <p className="text-sm text-dark-300">
                  {loading ? (
                    <LoadingSkeleton className="w-20 h-4" />
                  ) : (
                    categoryStats?.average_completion_time ? 
                      `${Math.round(categoryStats.average_completion_time / 60)} minutes` : 
                      'No completion data'
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <TrophyIcon className="w-5 h-5 text-purple-400" />
              <div className="flex-1">
                <p className="text-white font-medium">Best Score</p>
                <p className="text-sm text-dark-300">
                  {loading ? (
                    <LoadingSkeleton className="w-20 h-4" />
                  ) : (
                    categoryStats?.best_score ? 
                      `${categoryStats.best_score} points` : 
                      'No scores yet'
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <UsersIcon className="w-5 h-5 text-blue-400" />
              <div className="flex-1">
                <p className="text-white font-medium">Active Players (7d)</p>
                <p className="text-sm text-dark-300">
                  {loading ? (
                    <LoadingSkeleton className="w-20 h-4" />
                  ) : (
                    `${categoryStats?.active_players || 0} of ${categoryStats?.total_players || 0}`
                  )}
                </p>
              </div>
            </div>
          </div>
          
          {/* Completion Rate Progress Bar */}
          {!loading && categoryStats && categoryStats.total_players > 0 && (
            <div className="mt-4 pt-4 border-t border-dark-600">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-dark-300">Active Player Rate (7 days)</span>
                <span className="text-sm text-white font-medium">
                  {Math.round((categoryStats.active_players / categoryStats.total_players) * 100)}%
                </span>
              </div>
              <div className="w-full bg-dark-600 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-primary-500 to-primary-600 h-2 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${(categoryStats.active_players / categoryStats.total_players) * 100}%` 
                  }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Detailed Statistics */}
        {!loading && categoryStats && (
          <div className="bg-dark-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
              <TargetIcon className="w-5 h-5 mr-2 text-primary-400" />
              Detailed Statistics
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <TargetIcon className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-white">
                  {categoryStats.average_score ? Math.round(categoryStats.average_score) : 'N/A'}
                </p>
                <p className="text-xs text-dark-300">Avg Score</p>
              </div>
              <div className="text-center">
                <TrophyIcon className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-white">
                  {categoryStats.best_score || 'N/A'}
                </p>
                <p className="text-xs text-dark-300">Best Score</p>
              </div>
              <div className="text-center">
                <ZapIcon className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-white">
                  {categoryStats.total_games || 0}
                </p>
                <p className="text-xs text-dark-300">Total Games</p>
              </div>
              <div className="text-center">
                <ClockIcon className="w-5 h-5 text-green-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-white">
                  {categoryStats.average_completion_time ? 
                    `${Math.round(categoryStats.average_completion_time / 60)}m` : 
                    'N/A'
                  }
                </p>
                <p className="text-xs text-dark-300">Avg Time</p>
              </div>
            </div>
          </div>
        )}

        {/* Question Difficulty Breakdown */}
        {!loading && categoryStats && (
          <div className="bg-dark-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Question Difficulty</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="w-8 h-8 bg-green-400 bg-opacity-20 rounded-full mx-auto mb-2 flex items-center justify-center">
                  <span className="text-green-400 text-sm font-bold">{categoryStats.easy_questions}</span>
                </div>
                <p className="text-sm text-dark-300">Easy</p>
              </div>
              <div className="text-center">
                <div className="w-8 h-8 bg-yellow-400 bg-opacity-20 rounded-full mx-auto mb-2 flex items-center justify-center">
                  <span className="text-yellow-400 text-sm font-bold">{categoryStats.medium_questions}</span>
                </div>
                <p className="text-sm text-dark-300">Medium</p>
              </div>
              <div className="text-center">
                <div className="w-8 h-8 bg-red-400 bg-opacity-20 rounded-full mx-auto mb-2 flex items-center justify-center">
                  <span className="text-red-400 text-sm font-bold">{categoryStats.hard_questions}</span>
                </div>
                <p className="text-sm text-dark-300">Hard</p>
              </div>
            </div>
          </div>
        )}

        {/* Top Players */}
        {!loading && (
          <div className="bg-dark-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
              <AwardIcon className="w-5 h-5 mr-2 text-primary-400" />
              Top Players
            </h3>
            
            {topPlayers.length > 0 ? (
              <div className="space-y-2">
                {topPlayers.slice(0, 5).map((player, index) => (
                  <div 
                    key={player.user_id} 
                    className="flex items-center justify-between p-3 bg-dark-800 rounded-lg hover:bg-dark-750 transition-all duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        index === 0 ? 'bg-yellow-500' : 
                        index === 1 ? 'bg-gray-400' : 
                        index === 2 ? 'bg-amber-600' : 'bg-primary-600'
                      }`}>
                        <span className="text-white text-sm font-bold">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-medium">{player.username}</p>
                        <p className="text-xs text-dark-300">{player.games_played} games</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold">{player.best_score}</p>
                      <p className="text-xs text-dark-300">Best Score</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <AwardIcon className="w-12 h-12 text-dark-400 mx-auto mb-3" />
                <p className="text-dark-300 text-sm">No players have completed this category yet</p>
                <p className="text-dark-400 text-xs mt-1">Be the first to try it!</p>
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-500 bg-opacity-10 border border-red-500 rounded-lg p-4">
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-2 text-red-300 hover:text-red-200 underline text-sm"
            >
              Try again
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center">
          <button
            onClick={onClose}
            className="w-full sm:w-auto bg-dark-700 hover:bg-dark-600 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-200 border border-dark-600 hover:border-dark-500"
          >
            Close
          </button>
        </div>
        
        {/* Quick Stats Footer */}
        {!loading && categoryStats && (
          <div className="text-center pt-4 border-t border-dark-600">
            <p className="text-xs text-dark-400">
              Last updated: {new Date().toLocaleTimeString()} • 
              {categoryStats.total_games > 0 && ` ${categoryStats.total_games} total games played`}
              {categoryStats.last_played_at && ` • Last played: ${new Date(categoryStats.last_played_at).toLocaleDateString()}`}
            </p>
            <div className="mt-2 text-xs text-dark-500">
              <span className="mr-3">⌨️ <kbd className="px-1 py-0.5 bg-dark-600 rounded text-xs">Esc</kbd> Close</span>
              <span>⌨️ <kbd className="px-1 py-0.5 bg-dark-600 rounded text-xs">Ctrl+R</kbd> Refresh</span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default CategoryModal; 