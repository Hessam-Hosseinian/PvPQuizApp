import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import { statsAPI, categoriesAPI } from '../services/api';
import { 
  PlayIcon, 
  TrophyIcon, 
  TagIcon, 
  UsersIcon, 
  TargetIcon, 
  StarsIcon, 
  TrendingUpIcon, 
  ClockIcon, 
  AwardIcon, 
  ActivityIcon, 
  AlertCircleIcon, 
  RefreshCwIcon,
  ZapIcon,
  ShieldIcon,
  GlobeIcon
} from 'lucide-react';

// TypeScript interfaces for better type safety
interface RecentGame {
  id: number;
  player1: string;
  player2: string;
  winner: string;
  category: string;
  duration: string;
  score?: number;
}

interface PopularCategory {
  name: string;
  games: number;
  questions: number;
  icon?: string;
}

interface TopPlayer {
  user_id: number;
  username: string;
  win_rate: number;
  games_won: number;
  games_played: number;
  avatar?: string;
}

interface DailyStats {
  gamesPlayed: number;
  newUsers: number;
  questionsAnswered: number;
  averageScore?: number;
}

interface Stats {
  userCount: number;
  categoriesCount: number;
  questionsCount: number;
  topPlayers: TopPlayer[];
  recentGames: RecentGame[];
  popularCategories: PopularCategory[];
  dailyStats: DailyStats;
}

// Custom hook for stats management
const useStats = () => {
  const [stats, setStats] = useState<Stats>({
    userCount: 0,
    categoriesCount: 0,
    questionsCount: 0,
    topPlayers: [],
    recentGames: [],
    popularCategories: [],
    dailyStats: {
      gamesPlayed: 0,
      newUsers: 0,
      questionsAnswered: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const loadStats = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      
      const [
        userCountResponse, 
        categoriesResponse, 
        topPlayersResponse, 
        questionCountResponse,
        dailyStatsResponse,
        recentGamesResponse,
        popularCategoriesResponse
      ] = await Promise.all([
        statsAPI.getUserCount(),
        categoriesAPI.getCategories(),
        statsAPI.getTop10WinRate(),
        statsAPI.getQuestionCount(),
        statsAPI.getDailyStats(),
        statsAPI.getRecentGames(),
        statsAPI.getPopularCategories()
      ]);

      setStats({
        userCount: userCountResponse.data.total_users,
        categoriesCount: categoriesResponse.data.length,
        questionsCount: questionCountResponse.data.total_questions,
        topPlayers: topPlayersResponse.data.slice(0, 3),
        recentGames: recentGamesResponse.data.slice(0, 3),
        popularCategories: popularCategoriesResponse.data.slice(0, 4),
        dailyStats: {
          gamesPlayed: dailyStatsResponse.data.games_played_today,
          newUsers: dailyStatsResponse.data.new_users_today,
          questionsAnswered: dailyStatsResponse.data.questions_answered_today
        }
      });
      setRetryCount(0);
    } catch (error) {
      console.error('Failed to load stats:', error);
      const errorMessage = retryCount < 3 
        ? `Failed to load statistics. Retrying... (${retryCount + 1}/3)`
        : 'Failed to load statistics. Please check your connection and try again.';
      setError(errorMessage);
      
      if (retryCount < 3) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => loadStats(), 2000);
      }
    } finally {
      setLoading(false);
    }
  }, [retryCount]);

  return { stats, loading, error, retryCount, loadStats };
};

// Enhanced skeleton components
const SkeletonCard = ({ className = "", lines = 2 }: { className?: string; lines?: number }) => (
  <Card className={`p-6 ${className}`}>
    <div className="animate-pulse">
      <div className="w-12 h-12 bg-dark-600 rounded-full mx-auto mb-4"></div>
      <div className="h-6 bg-dark-600 rounded mb-2"></div>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`h-4 bg-dark-600 rounded ${i === lines - 1 ? 'w-3/4 mx-auto' : 'w-full'} mb-2`}></div>
      ))}
    </div>
  </Card>
);

const SkeletonGameCard = () => (
  <Card className="p-6">
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-dark-600 rounded-full"></div>
          <div className="h-4 bg-dark-600 rounded w-16"></div>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-4 h-4 bg-dark-600 rounded"></div>
          <div className="h-4 bg-dark-600 rounded w-12"></div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <div className="h-4 bg-dark-600 rounded w-20"></div>
          <div className="h-4 bg-dark-600 rounded w-4"></div>
          <div className="h-4 bg-dark-600 rounded w-20"></div>
        </div>
        <div className="flex items-center justify-center space-x-2">
          <div className="w-4 h-4 bg-dark-600 rounded"></div>
          <div className="h-4 bg-dark-600 rounded w-24"></div>
        </div>
      </div>
    </div>
  </Card>
);

// Error component
const ErrorState = ({ error, retryCount, onRetry }: { error: string; retryCount: number; onRetry: () => void }) => (
  <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex items-center justify-center p-4">
    <Card className="p-8 text-center max-w-md w-full">
      <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
        <AlertCircleIcon className="w-8 h-8 text-white" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-3">Error Loading Data</h3>
      <p className="text-dark-300 mb-6">{error}</p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button 
          onClick={onRetry} 
          className="w-full sm:w-auto flex items-center justify-center"
          disabled={retryCount >= 3}
        >
          <RefreshCwIcon className={`w-4 h-4 mr-2 ${retryCount < 3 ? 'animate-spin' : ''}`} />
          {retryCount < 3 ? 'Retrying...' : 'Try Again'}
        </Button>
        {retryCount >= 3 && (
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()} 
            className="w-full sm:w-auto"
          >
            Refresh Page
          </Button>
        )}
      </div>
    </Card>
  </div>
);

const HomePage: React.FC = () => {
  const { user } = useAuth();
  const { stats, loading, error, retryCount, loadStats } = useStats();

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Memoized stats for better performance
  const memoizedStats = useMemo(() => stats, [stats]);

  if (error) {
    return <ErrorState error={error} retryCount={retryCount} onRetry={loadStats} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900" role="main" aria-label="QuizMaster Home Page">
      {/* Hero Section */}
      <section className="relative overflow-hidden" aria-labelledby="hero-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="mb-6 animate-bounce">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary-600/20 border border-primary-500/30 text-primary-400 text-sm font-medium">
                <ZapIcon className="w-4 h-4 mr-2" />
                New: Real-time Multiplayer Mode
              </div>
            </div>
            
            <h1 id="hero-heading" className="text-4xl md:text-6xl font-bold text-white mb-6 animate-fade-in">
              Welcome to{' '}
              <span className="bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent animate-pulse" aria-label="QuizMaster">
                QuizMaster
              </span>
            </h1>
            <p className="text-lg md:text-xl text-dark-300 mb-8 max-w-3xl mx-auto animate-fade-in-up">
              Challenge your knowledge, compete with friends, and climb the leaderboards in the ultimate quiz experience. 
              <span className="block mt-2 text-primary-400 font-semibold">Join over {memoizedStats.userCount.toLocaleString()} players worldwide!</span>
            </p>
            
            {user ? (
              <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up" role="group" aria-label="Game actions">
                <Link to="/play" aria-label="Start playing quiz games">
                  <Button size="lg" className="w-full sm:w-auto transform hover:scale-105 transition-transform bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700">
                    <PlayIcon className="w-5 h-5 mr-2" aria-hidden="true" />
                    Start Playing
                  </Button>
                </Link>
                <Link to="/leaderboard" aria-label="View leaderboard">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto transform hover:scale-105 transition-transform border-primary-500 text-primary-400 hover:bg-primary-500 hover:text-white">
                    <TrophyIcon className="w-5 h-5 mr-2" aria-hidden="true" />
                    View Leaderboard
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up" role="group" aria-label="Authentication actions">
                <Link to="/register" aria-label="Create new account">
                  <Button size="lg" className="w-full sm:w-auto transform hover:scale-105 transition-transform bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700">
                    Get Started Free
                  </Button>
                </Link>
                <Link to="/login" aria-label="Sign in to existing account">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto transform hover:scale-105 transition-transform border-primary-500 text-primary-400 hover:bg-primary-500 hover:text-white">
                    Sign In
                  </Button>
                </Link>
              </div>
            )}

            {/* Quick stats preview */}
            {!loading && (
              <div className="mt-12 grid grid-cols-3 gap-4 max-w-md mx-auto animate-fade-in-up" style={{animationDelay: '0.5s'}}>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{memoizedStats.categoriesCount}+</div>
                  <div className="text-sm text-dark-400">Categories</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{memoizedStats.questionsCount.toLocaleString()}+</div>
                  <div className="text-sm text-dark-400">Questions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{memoizedStats.dailyStats.gamesPlayed}</div>
                  <div className="text-sm text-dark-400">Games Today</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced decorative elements */}
        <div className="absolute top-0 right-0 -mr-40 -mt-40 w-80 h-80 bg-gradient-to-br from-primary-600/20 to-secondary-600/20 rounded-full animate-bounce" aria-hidden="true"></div>
        <div className="absolute bottom-0 left-0 -ml-40 -mb-40 w-80 h-80 bg-gradient-to-tr from-secondary-600/20 to-primary-600/20 rounded-full animate-bounce" style={{animationDelay: '1s'}} aria-hidden="true"></div>
        <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-gradient-to-r from-green-600/10 to-blue-600/10 rounded-full animate-pulse" style={{animationDelay: '0.5s'}} aria-hidden="true"></div>
      </section>

      {/* Stats Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16" aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="sr-only">Platform Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {loading ? (
            <>
              <SkeletonCard className="text-center" />
              <SkeletonCard className="text-center" />
              <SkeletonCard className="text-center" />
            </>
          ) : (
            <>
              <div role="article" aria-labelledby="active-players">
                <Card className="p-6 text-center animate-fade-in-up animate-stagger-1 group cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl" hover>
                  <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:rotate-12 transition-transform duration-300" aria-hidden="true">
                    <UsersIcon className="w-6 h-6 text-white" />
                  </div>
                  <h3 id="active-players" className="text-2xl font-bold text-white mb-2 group-hover:text-primary-400 transition-colors">
                    {memoizedStats.userCount.toLocaleString()}
                  </h3>
                  <p className="text-dark-300 group-hover:text-dark-200 transition-colors">Active Players</p>
                  <div className="mt-3 text-xs text-primary-400 font-medium">
                    +{memoizedStats.dailyStats.newUsers} today
                  </div>
                </Card>
              </div>

              <div role="article" aria-labelledby="quiz-categories">
                <Card className="p-6 text-center animate-fade-in-up animate-stagger-2 group cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl" hover>
                  <div className="w-12 h-12 bg-gradient-to-r from-secondary-500 to-secondary-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:rotate-12 transition-transform duration-300" aria-hidden="true">
                    <TagIcon className="w-6 h-6 text-white" />
                  </div>
                  <h3 id="quiz-categories" className="text-2xl font-bold text-white mb-2 group-hover:text-secondary-400 transition-colors">
                    {memoizedStats.categoriesCount}
                  </h3>
                  <p className="text-dark-300 group-hover:text-dark-200 transition-colors">Quiz Categories</p>
                  <div className="mt-3 text-xs text-secondary-400 font-medium">
                    From Science to History
                  </div>
                </Card>
              </div>

              <div role="article" aria-labelledby="quiz-questions">
                <Card className="p-6 text-center animate-fade-in-up animate-stagger-3 group cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl" hover>
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:rotate-12 transition-transform duration-300" aria-hidden="true">
                    <TargetIcon className="w-6 h-6 text-white" />
                  </div>
                  <h3 id="quiz-questions" className="text-2xl font-bold text-white mb-2 group-hover:text-green-400 transition-colors">
                    {memoizedStats.questionsCount.toLocaleString()}
                  </h3>
                  <p className="text-dark-300 group-hover:text-dark-200 transition-colors">Quiz Questions</p>
                  <div className="mt-3 text-xs text-green-400 font-medium">
                    {memoizedStats.dailyStats.questionsAnswered.toLocaleString()} answered today
                  </div>
                </Card>
              </div>
            </>
          )}
        </div>

        {/* Daily Stats Section */}
        <section className="mb-16" aria-labelledby="daily-stats-heading">
          <h2 id="daily-stats-heading" className="text-2xl font-bold text-white text-center mb-8 flex items-center justify-center">
            <ActivityIcon className="w-6 h-6 mr-3 text-primary-400" />
            Today's Activity
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {loading ? (
              <>
                <SkeletonCard className="text-center" />
                <SkeletonCard className="text-center" />
                <SkeletonCard className="text-center" />
              </>
            ) : (
              <>
                <div role="article" aria-labelledby="games-played-today">
                  <Card className="p-6 text-center animate-fade-in-up animate-stagger-1 group cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl" hover>
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:rotate-12 transition-transform duration-300" aria-hidden="true">
                      <ActivityIcon className="w-6 h-6 text-white" />
                    </div>
                    <h3 id="games-played-today" className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                      {memoizedStats.dailyStats.gamesPlayed}
                    </h3>
                    <p className="text-dark-300 group-hover:text-dark-200 transition-colors">Games Played Today</p>
                    <div className="mt-3 w-full bg-dark-700 rounded-full h-2">
                      <div 
                        className="h-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min((memoizedStats.dailyStats.gamesPlayed / 100) * 100, 100)}%` }}
                        aria-label={`${memoizedStats.dailyStats.gamesPlayed} games played today`}
                      ></div>
                    </div>
                  </Card>
                </div>

                <div role="article" aria-labelledby="new-users-today">
                  <Card className="p-6 text-center animate-fade-in-up animate-stagger-2 group cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl" hover>
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:rotate-12 transition-transform duration-300" aria-hidden="true">
                      <TrendingUpIcon className="w-6 h-6 text-white" />
                    </div>
                    <h3 id="new-users-today" className="text-xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">
                      {memoizedStats.dailyStats.newUsers}
                    </h3>
                    <p className="text-dark-300 group-hover:text-dark-200 transition-colors">New Players Today</p>
                    <div className="mt-3 text-xs text-purple-400 font-medium">
                      Growing community!
                    </div>
                  </Card>
                </div>

                <div role="article" aria-labelledby="questions-answered-today">
                  <Card className="p-6 text-center animate-fade-in-up animate-stagger-3 group cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl" hover>
                    <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:rotate-12 transition-transform duration-300" aria-hidden="true">
                      <TargetIcon className="w-6 h-6 text-white" />
                    </div>
                    <h3 id="questions-answered-today" className="text-xl font-bold text-white mb-2 group-hover:text-orange-400 transition-colors">
                      {memoizedStats.dailyStats.questionsAnswered.toLocaleString()}
                    </h3>
                    <p className="text-dark-300 group-hover:text-dark-200 transition-colors">Questions Answered</p>
                    <div className="mt-3 text-xs text-orange-400 font-medium">
                      Knowledge is power!
                    </div>
                  </Card>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Features Section */}
        <section className="text-center mb-16" aria-labelledby="features-heading">
          <h2 id="features-heading" className="text-3xl font-bold text-white mb-4">Game Features</h2>
          <p className="text-lg text-dark-300 mb-12 max-w-2xl mx-auto">Experience the ultimate quiz challenge with our innovative features</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="group">
              <Card className="p-8 text-left animate-slide-in-left h-full transform transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl" hover>
                <div className="w-16 h-16 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg flex items-center justify-center mb-6 group-hover:rotate-12 transition-transform duration-300">
                  <PlayIcon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-primary-400 transition-colors">Head-to-Head Duels</h3>
                <p className="text-dark-300 leading-relaxed">
                  Challenge other players in real-time quiz battles. Choose from multiple categories and answer questions to prove your knowledge and climb the rankings.
                </p>
                <div className="mt-4 flex items-center text-primary-400 text-sm font-medium">
                  <ShieldIcon className="w-4 h-4 mr-2" />
                  Fair Play System
                </div>
              </Card>
            </div>

            <div className="group">
              <Card className="p-8 text-left animate-slide-in-right h-full transform transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl" hover>
                <div className="w-16 h-16 bg-gradient-to-r from-secondary-500 to-secondary-600 rounded-lg flex items-center justify-center mb-6 group-hover:rotate-12 transition-transform duration-300">
                  <UsersIcon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-secondary-400 transition-colors">Group Competitions</h3>
                <p className="text-dark-300 leading-relaxed">
                  Join multiplayer group games with up to 10 rounds. Compete against multiple opponents simultaneously for the ultimate challenge and glory.
                </p>
                <div className="mt-4 flex items-center text-secondary-400 text-sm font-medium">
                  <GlobeIcon className="w-4 h-4 mr-2" />
                  Global Leaderboards
                </div>
              </Card>
            </div>

            <div className="group">
              <Card className="p-8 text-left animate-slide-in-left h-full transform transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl" hover>
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center mb-6 group-hover:rotate-12 transition-transform duration-300">
                  <ZapIcon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-green-400 transition-colors">Real-time Updates</h3>
                <p className="text-dark-300 leading-relaxed">
                  Experience lightning-fast real-time updates with live scoring, instant feedback, and dynamic leaderboards that update as you play.
                </p>
                <div className="mt-4 flex items-center text-green-400 text-sm font-medium">
                  <ClockIcon className="w-4 h-4 mr-2" />
                  Instant Results
                </div>
              </Card>
            </div>

            <div className="group">
              <Card className="p-8 text-left animate-slide-in-right h-full transform transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl" hover>
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mb-6 group-hover:rotate-12 transition-transform duration-300">
                  <TrophyIcon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-purple-400 transition-colors">Achievement System</h3>
                <p className="text-dark-300 leading-relaxed">
                  Unlock achievements, earn badges, and track your progress with our comprehensive achievement system that rewards your knowledge and dedication.
                </p>
                <div className="mt-4 flex items-center text-purple-400 text-sm font-medium">
                  <StarsIcon className="w-4 h-4 mr-2" />
                  Unlock Rewards
                </div>
              </Card>
            </div>

            <div className="group">
              <Card className="p-8 text-left animate-slide-in-left h-full transform transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl" hover>
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mb-6 group-hover:rotate-12 transition-transform duration-300">
                  <TargetIcon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors">Smart Categories</h3>
                <p className="text-dark-300 leading-relaxed">
                  Choose from a vast library of categories including Science, History, Geography, Literature, and more. Each category is carefully curated for quality.
                </p>
                <div className="mt-4 flex items-center text-blue-400 text-sm font-medium">
                  <TagIcon className="w-4 h-4 mr-2" />
                  {memoizedStats.categoriesCount}+ Categories
                </div>
              </Card>
            </div>

            <div className="group">
              <Card className="p-8 text-left animate-slide-in-right h-full transform transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl" hover>
                <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center mb-6 group-hover:rotate-12 transition-transform duration-300">
                  <ActivityIcon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-orange-400 transition-colors">Performance Analytics</h3>
                <p className="text-dark-300 leading-relaxed">
                  Track your performance with detailed analytics, view your progress over time, and identify areas for improvement with comprehensive statistics.
                </p>
                <div className="mt-4 flex items-center text-orange-400 text-sm font-medium">
                  <TrendingUpIcon className="w-4 h-4 mr-2" />
                  Detailed Insights
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* Recent Games Section */}
        <section className="mb-16" aria-labelledby="recent-games-heading">
          <h2 id="recent-games-heading" className="text-3xl font-bold text-white text-center mb-8 flex items-center justify-center">
            <PlayIcon className="w-6 h-6 mr-3 text-primary-400" />
            Recent Games
          </h2>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <SkeletonGameCard />
              <SkeletonGameCard />
              <SkeletonGameCard />
            </div>
          ) : memoizedStats.recentGames.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {memoizedStats.recentGames.map((game, index) => (
                <div key={game.id} className="group" role="article" aria-labelledby={`game-${game.id}`}>
                  <Card className={`p-6 animate-fade-in-up animate-stagger-${index + 1} transform transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl cursor-pointer`} hover>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center group-hover:bg-primary-400 transition-colors">
                          <PlayIcon className="w-4 h-4 text-white" aria-hidden="true" />
                        </div>
                        <span className="text-sm text-dark-400 font-medium group-hover:text-primary-400 transition-colors">{game.category}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <ClockIcon className="w-4 h-4 text-dark-400 group-hover:text-primary-400 transition-colors" aria-hidden="true" />
                        <span className="text-sm text-dark-400 group-hover:text-dark-300 transition-colors">{game.duration}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-white font-medium truncate max-w-[120px] group-hover:text-primary-400 transition-colors" title={game.player1}>{game.player1}</span>
                        <span className="text-dark-300 text-sm font-medium group-hover:text-white transition-colors">vs</span>
                        <span className="text-white font-medium truncate max-w-[120px] text-right group-hover:text-primary-400 transition-colors" title={game.player2}>{game.player2}</span>
                      </div>
                      
                      <div className="flex items-center justify-center space-x-2 bg-gradient-to-r from-dark-700 to-dark-600 rounded-lg p-3 group-hover:from-primary-600/20 group-hover:to-primary-500/20 transition-all duration-300">
                        <AwardIcon className="w-4 h-4 text-yellow-500 group-hover:scale-110 transition-transform" aria-hidden="true" />
                        <span className="text-sm text-yellow-400 font-medium group-hover:text-yellow-300 transition-colors">Winner: {game.winner}</span>
                      </div>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 animate-fade-in-up">
              <div className="w-24 h-24 bg-gradient-to-r from-dark-700 to-dark-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <PlayIcon className="w-12 h-12 text-dark-400" aria-hidden="true" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">No Recent Games</h3>
              <p className="text-dark-300 mb-6 max-w-md mx-auto">
                Be the first to start a game! Challenge your friends and compete for the top spot on the leaderboard.
              </p>
              {user ? (
                <Link to="/play" aria-label="Start your first quiz game">
                  <Button className="transform hover:scale-105 transition-transform bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700">
                    <PlayIcon className="w-5 h-5 mr-2" aria-hidden="true" />
                    Start Your First Game
                  </Button>
                </Link>
              ) : (
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link to="/register" aria-label="Create account to join the competition">
                    <Button className="transform hover:scale-105 transition-transform bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700">
                      Join the Competition
                    </Button>
                  </Link>
                  <Link to="/login" aria-label="Sign in to start playing">
                    <Button variant="outline" className="transform hover:scale-105 transition-transform border-primary-500 text-primary-400 hover:bg-primary-500 hover:text-white">
                      Sign In to Play
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Popular Categories Section */}
        <section className="mb-16" aria-labelledby="popular-categories-heading">
          <h2 id="popular-categories-heading" className="text-3xl font-bold text-white text-center mb-8 flex items-center justify-center">
            <TagIcon className="w-6 h-6 mr-3 text-secondary-400" />
            Popular Categories
          </h2>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <SkeletonCard className="text-center" />
              <SkeletonCard className="text-center" />
              <SkeletonCard className="text-center" />
              <SkeletonCard className="text-center" />
            </div>
          ) : memoizedStats.popularCategories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {memoizedStats.popularCategories.map((category, index) => (
                <div key={category.name} className="group" role="article" aria-labelledby={`category-${category.name}`}>
                  <Card className={`p-6 text-center animate-fade-in-up animate-stagger-${index + 1} group cursor-pointer transform transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl`} hover>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12 ${
                      index === 0 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' : 
                      index === 1 ? 'bg-gradient-to-r from-gray-500 to-gray-600' : 
                      index === 2 ? 'bg-gradient-to-r from-orange-500 to-orange-600' : 'bg-gradient-to-r from-blue-500 to-blue-600'
                    }`}>
                      <TagIcon className="w-6 h-6 text-white" aria-hidden="true" />
                    </div>
                    <h3 id={`category-${category.name}`} className="font-bold text-white mb-3 text-lg group-hover:text-primary-400 transition-colors">{category.name}</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-center space-x-2">
                        <PlayIcon className="w-4 h-4 text-primary-400" aria-hidden="true" />
                        <p className="text-sm text-dark-300 group-hover:text-dark-200 transition-colors">
                          {category.games.toLocaleString()} Games
                        </p>
                      </div>
                      <div className="flex items-center justify-center space-x-2">
                        <TargetIcon className="w-4 h-4 text-secondary-400" aria-hidden="true" />
                        <p className="text-xs text-dark-400 group-hover:text-dark-300 transition-colors">
                          {category.questions} Questions
                        </p>
                      </div>
                    </div>
                    {index === 0 && (
                      <div className="mt-3 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-yellow-500 to-yellow-600 text-white animate-pulse">
                        Most Popular
                      </div>
                    )}
                    <div className="mt-3 w-full bg-dark-700 rounded-full h-1">
                      <div 
                        className={`h-1 rounded-full transition-all duration-500 ${
                          index === 0 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' : 
                          index === 1 ? 'bg-gradient-to-r from-gray-500 to-gray-600' : 
                          index === 2 ? 'bg-gradient-to-r from-orange-500 to-orange-600' : 'bg-gradient-to-r from-blue-500 to-blue-600'
                        }`}
                        style={{ width: `${Math.min((category.games / 100) * 100, 100)}%` }}
                        aria-label={`${category.games} games played in ${category.name}`}
                      ></div>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 animate-fade-in-up">
              <div className="w-24 h-24 bg-gradient-to-r from-dark-700 to-dark-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <TagIcon className="w-12 h-12 text-dark-400" aria-hidden="true" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">No Popular Categories Yet</h3>
              <p className="text-dark-300 mb-6 max-w-md mx-auto">
                Categories become popular as more players choose them for their games. Start playing to see which categories are trending!
              </p>
              {user ? (
                <Link to="/categories" aria-label="Explore quiz categories">
                  <Button className="transform hover:scale-105 transition-transform bg-gradient-to-r from-secondary-500 to-secondary-600 hover:from-secondary-600 hover:to-secondary-700">
                    <PlayIcon className="w-5 h-5 mr-2" aria-hidden="true" />
                    Explore Categories
                  </Button>
                </Link>
              ) : (
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link to="/register" aria-label="Join to discover categories">
                    <Button className="transform hover:scale-105 transition-transform bg-gradient-to-r from-secondary-500 to-secondary-600 hover:from-secondary-600 hover:to-secondary-700">
                      Join and Discover
                    </Button>
                  </Link>
                  <Link to="/login" aria-label="Sign in to explore categories">
                    <Button variant="outline" className="transform hover:scale-105 transition-transform border-secondary-500 text-secondary-400 hover:bg-secondary-500 hover:text-white">
                      Sign In to Explore
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Top Players Section */}
        {loading ? (
          <section className="text-center mb-16" aria-labelledby="top-players-heading">
            <h2 id="top-players-heading" className="text-3xl font-bold text-white mb-8 flex items-center justify-center">
              <TrophyIcon className="w-6 h-6 mr-3 text-yellow-400" />
              Top Players
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <SkeletonCard className="text-center" />
              <SkeletonCard className="text-center" />
              <SkeletonCard className="text-center" />
            </div>
          </section>
        ) : memoizedStats.topPlayers.length > 0 ? (
          <section className="text-center mb-16" aria-labelledby="top-players-heading">
            <h2 id="top-players-heading" className="text-3xl font-bold text-white mb-8 flex items-center justify-center">
              <TrophyIcon className="w-6 h-6 mr-3 text-yellow-400" />
              Top Players
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {memoizedStats.topPlayers.map((player: TopPlayer, index) => (
                <div key={player.user_id} className="group" role="article" aria-labelledby={`player-${player.user_id}`}>
                  <Card className={`p-6 text-center animate-fade-in-up animate-stagger-${index + 1} group transform transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl cursor-pointer`} hover>
                    <div className="relative">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12 ${
                        index === 0 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' : 
                        index === 1 ? 'bg-gradient-to-r from-gray-500 to-gray-600' : 
                        'bg-gradient-to-r from-orange-500 to-orange-600'
                      }`}>
                        <StarsIcon className="w-8 h-8 text-white" aria-hidden="true" />
                      </div>
                      <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg ${
                        index === 0 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' : 
                        index === 1 ? 'bg-gradient-to-r from-gray-500 to-gray-600' : 
                        'bg-gradient-to-r from-orange-500 to-orange-600'
                      }`}>
                        {index + 1}
                      </div>
                    </div>
                    <h3 id={`player-${player.user_id}`} className="font-bold text-white mb-3 text-lg group-hover:text-primary-400 transition-colors">{player.username}</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-center space-x-2">
                        <TrophyIcon className="w-4 h-4 text-yellow-500 group-hover:scale-110 transition-transform" aria-hidden="true" />
                        <p className="text-sm text-dark-300 font-medium group-hover:text-dark-200 transition-colors">
                          {player.win_rate}% Win Rate
                        </p>
                      </div>
                      <div className="flex items-center justify-center space-x-2">
                        <PlayIcon className="w-4 h-4 text-primary-400" aria-hidden="true" />
                        <p className="text-xs text-dark-400 group-hover:text-dark-300 transition-colors">
                          {player.games_won}/{player.games_played} Games Won
                        </p>
                      </div>
                      <div className="w-full bg-dark-700 rounded-full h-2 mt-3">
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${
                            index === 0 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' : 
                            index === 1 ? 'bg-gradient-to-r from-gray-500 to-gray-600' : 
                            'bg-gradient-to-r from-orange-500 to-orange-600'
                          }`}
                          style={{ width: `${player.win_rate}%` }}
                          aria-label={`${player.win_rate}% win rate`}
                        ></div>
                      </div>
                      <div className="text-xs text-dark-400 group-hover:text-dark-300 transition-colors">
                        {player.games_played} total games
                      </div>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <Link to="/leaderboard" aria-label="View full leaderboard">
                <Button variant="outline" className="transform hover:scale-105 transition-transform border-yellow-500 text-yellow-400 hover:bg-yellow-500 hover:text-white">
                  <TrophyIcon className="w-5 h-5 mr-2" aria-hidden="true" />
                  View Full Leaderboard
                </Button>
              </Link>
            </div>
          </section>
        ) : null}

        {/* Call-to-Action Section */}
        <section className="text-center py-16 mb-16" aria-labelledby="cta-heading">
          <div className="max-w-4xl mx-auto px-4">
            <h2 id="cta-heading" className="text-3xl md:text-4xl font-bold text-white mb-6">
              Ready to Test Your Knowledge?
            </h2>
            <p className="text-lg text-dark-300 mb-8 max-w-2xl mx-auto">
              Join thousands of players competing in real-time quiz battles. Challenge your friends, climb the leaderboards, and become the ultimate QuizMaster!
            </p>
            {user ? (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/play" aria-label="Start playing quiz games now">
                  <Button size="lg" className="transform hover:scale-105 transition-transform">
                    <PlayIcon className="w-5 h-5 mr-2" aria-hidden="true" />
                    Start Playing Now
                  </Button>
                </Link>
                <Link to="/leaderboard" aria-label="View current leaderboard">
                  <Button variant="outline" size="lg" className="transform hover:scale-105 transition-transform">
                    <TrophyIcon className="w-5 h-5 mr-2" aria-hidden="true" />
                    View Leaderboard
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/register" aria-label="Create free account">
                  <Button size="lg" className="transform hover:scale-105 transition-transform">
                    Get Started Free
                  </Button>
                </Link>
                <Link to="/login" aria-label="Sign in to existing account">
                  <Button variant="outline" size="lg" className="transform hover:scale-105 transition-transform">
                    Sign In
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </section>
      </section>

      {/* Quick Start & Rules Section */}
      <section className="bg-gradient-to-r from-primary-600/10 to-secondary-600/10 py-16" aria-labelledby="rules-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h2 id="rules-heading" className="text-3xl font-bold text-white mb-6">Quick Start Guide</h2>
              <div className="space-y-4">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white font-bold text-sm">1</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Create Your Account</h3>
                    <p className="text-dark-300">Sign up for free and create your profile to start competing with other players.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-secondary-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white font-bold text-sm">2</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Choose Your Category</h3>
                    <p className="text-dark-300">Select from various quiz categories that match your interests and expertise.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white font-bold text-sm">3</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Start Playing</h3>
                    <p className="text-dark-300">Challenge opponents in real-time battles and climb the leaderboards.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-white mb-6">Game Rules</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-yellow-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <TargetIcon className="w-3 h-3 text-white" aria-hidden="true" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">Answer Questions</h4>
                    <p className="text-dark-300 text-sm">Choose the correct answer from multiple options within the time limit.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <ClockIcon className="w-3 h-3 text-white" aria-hidden="true" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">Time Limit</h4>
                    <p className="text-dark-300 text-sm">Each question has a time limit - answer quickly to maximize your score!</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <TrophyIcon className="w-3 h-3 text-white" aria-hidden="true" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">Win Points</h4>
                    <p className="text-dark-300 text-sm">Correct answers earn points and improve your ranking on the leaderboard.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;