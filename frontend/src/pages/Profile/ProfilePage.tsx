import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import AdminPanel from '../../components/Admin/AdminPanel';
import { statsAPI, authAPI } from '../../services/api';
import { 
  UserIcon, 
  TrophyIcon, 
  TargetIcon, 
  CalendarIcon, 
  EditIcon, 
  CheckIcon, 
  XIcon,
  StarIcon,
  TrendingUpIcon,
  AwardIcon,
  ClockIcon,
  ZapIcon,
  CrownIcon,
  MedalIcon,
  FlameIcon,
  BrainIcon,
  BarChart3Icon,
  ActivityIcon
} from 'lucide-react';

const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  
  const getRelativeTime = (date: Date): string => {
    const now = new Date();
    const nowUTC = new Date(now);
    const iranOffset = 3.5 * 60 * 60 * 1000;
    const dateUTC = date.getTime() - iranOffset;
    const dateUTC2 = new Date(dateUTC).toUTCString();
    const dateUTCtime = new Date(dateUTC2)
    const diffInSeconds = Math.floor((nowUTC.getTime() - dateUTCtime.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`;
    return `${Math.floor(diffInSeconds / 31536000)} years ago`;
  };

  // Calculate XP needed for next level
  const calculateXPForNextLevel = (currentLevel: number) => {
    return Math.floor(1000 * Math.pow(1.5, currentLevel - 1));
  };

  // Calculate XP progress
  const calculateXPProgress = (totalXP: number, currentLevel: number) => {
    const xpForCurrentLevel = currentLevel === 1 ? 0 : Math.floor(1000 * Math.pow(1.5, currentLevel - 2));
    const xpForNextLevel = calculateXPForNextLevel(currentLevel);
    const xpInCurrentLevel = totalXP - xpForCurrentLevel;
    const xpNeededForNextLevel = xpForNextLevel - xpForCurrentLevel;
    return Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeededForNextLevel) * 100));
  };

  // Get achievements based on stats
  const getAchievements = (stats: any) => {
    const achievements: Array<{
      name: string;
      icon: React.ComponentType<{ className?: string }>;
      color: string;
      description: string;
    }> = [];
    
    if (stats?.games_won >= 10) achievements.push({ name: 'First Steps', icon: StarIcon, color: 'text-yellow-400', description: 'Win 10 games' });
    if (stats?.games_won >= 50) achievements.push({ name: 'Quiz Master', icon: CrownIcon, color: 'text-purple-400', description: 'Win 50 games' });
    if (stats?.games_won >= 100) achievements.push({ name: 'Legend', icon: FlameIcon, color: 'text-red-400', description: 'Win 100 games' });
    if (stats?.win_rate_percentage >= 70) achievements.push({ name: 'High Achiever', icon: AwardIcon, color: 'text-blue-400', description: '70%+ win rate' });
    if (stats?.correct_answers >= 500) achievements.push({ name: 'Knowledge Seeker', icon: BrainIcon, color: 'text-green-400', description: '500+ correct answers' });
    if (stats?.total_answers >= 1000) achievements.push({ name: 'Dedicated Player', icon: MedalIcon, color: 'text-orange-400', description: '1000+ total answers' });
    
    return achievements;
  };



  const [userStats, setUserStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    username: user?.username || '',
    email: user?.email || ''
  });
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadUserStats();
      setEditForm({
        username: user.username,
        email: user.email
      });
    }
  }, [user]);

  const loadUserStats = async () => {
    if (!user) return;
    
    try {
      const response = await statsAPI.getUserWinLoss(user.id);
      setUserStats(response.data);
    } catch (error) {
      console.error('Failed to load user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setSaveLoading(true);
    try {
      await authAPI.updateProfile(user.id, editForm);
      updateUser(editForm);
      setEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditForm({
      username: user?.username || '',
      email: user?.email || ''
    });
    setEditing(false);
  };

  if (!user) return null;

  const achievements = getAchievements(userStats);

  const xpProgress = calculateXPProgress(user.total_xp, user.current_level);
  const xpForNextLevel = calculateXPForNextLevel(user.current_level);
console.log(user);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-dark-900 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Profile</h1>
        <p className="text-dark-300 mt-2">Manage your account and view your detailed statistics</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Profile Info */}
        <div className="lg:col-span-1">
          <Card className="p-6">
            <div className="text-center mb-6">
              <div className="w-24 h-24 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserIcon className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">{user.username}</h2>
              <p className="text-dark-300">{user.email}</p>
              
              {user.role === 'admin' && (
                <span className="inline-block bg-primary-600 text-white text-xs px-3 py-1 rounded-full mt-2">
                  Administrator
                </span>
              )}
            </div>

            {/* Level Progress */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-dark-300">Level {user.current_level}</span>
                <span className="text-sm text-dark-300">{xpProgress.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-dark-600 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-primary-500 to-secondary-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${xpProgress}%` }}
                ></div>
              </div>
              <p className="text-xs text-dark-400 mt-1">
                {user.total_xp.toLocaleString()} / {xpForNextLevel.toLocaleString()} XP
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-dark-300">Total XP</span>
                <span className="font-semibold text-white">{user.total_xp.toLocaleString()} XP</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-300">Member Since</span>
                <span className="font-semibold text-white">
                  {new Date(user.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-300">Last Login</span>
                <span className="font-semibold text-white">
                  {user.last_login ? getRelativeTime(new Date(user.last_login)) : 'Never'}
                </span>
              </div>
            </div>

            <div className="mt-6">
              {!editing ? (
                <Button
                  onClick={() => setEditing(true)}
                  variant="outline"
                  className="w-full"
                >
                  <EditIcon className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-200 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      value={editForm.username}
                      onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                      className="w-full px-3 py-2 border border-dark-600 bg-dark-700 text-white rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-200 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                      className="w-full px-3 py-2 border border-dark-600 bg-dark-700 text-white rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={handleSaveProfile}
                      loading={saveLoading}
                      size="sm"
                      className="flex-1"
                    >
                      <CheckIcon className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                    <Button
                      onClick={handleCancelEdit}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <XIcon className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="p-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center mr-4">
                      <TrophyIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-dark-300">Games Won</p>
                      <p className="text-2xl font-bold text-white">{userStats?.games_won || 0}</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center mr-4">
                      <TargetIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-dark-300">Games Lost</p>
                      <p className="text-2xl font-bold text-white">{userStats?.games_lost || 0}</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mr-4">
                      <BarChart3Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-dark-300">Total Games</p>
                      <p className="text-2xl font-bold text-white">{(userStats?.games_won || 0) + (userStats?.games_lost || 0)}</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mr-4">
                      <TrendingUpIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-dark-300">Win Rate</p>
                      <p className="text-2xl font-bold text-white">
                        {userStats?.win_rate_percentage || 0}%
                      </p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Additional Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <Card className="p-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mr-4">
                      <BrainIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-dark-300">Correct Answers</p>
                      <p className="text-2xl font-bold text-white">{userStats?.correct_answers || 0}</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center mr-4">
                      <ActivityIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-dark-300">Total Answers</p>
                      <p className="text-2xl font-bold text-white">{userStats?.total_answers || 0}</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-yellow-600 rounded-lg flex items-center justify-center mr-4">
                      <TargetIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-dark-300">Accuracy Rate</p>
                      <p className="text-2xl font-bold text-white">
                        {userStats?.total_answers > 0 
                          ? Math.round((userStats.correct_answers / userStats.total_answers) * 100) 
                          : 0}%
                      </p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Achievements Section */}
              <Card className="p-6 mb-8">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <AwardIcon className="w-5 h-5 mr-2" />
                  Achievements
                </h3>
                {achievements.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {achievements.map((achievement, index) => (
                      <div key={index} className="flex items-center p-3 bg-dark-700 rounded-lg">
                        <achievement.icon className={`w-6 h-6 mr-3 ${achievement.color}`} />
                        <div>
                          <p className="font-semibold text-white">{achievement.name}</p>
                          <p className="text-sm text-dark-300">{achievement.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-dark-300 text-center py-4">No achievements unlocked yet. Keep playing to earn them!</p>
                )}
              </Card>


              {/* Detailed Statistics */}
              {userStats && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Detailed Statistics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <p className="text-sm text-dark-300">Games Won</p>
                      <p className="text-xl font-bold text-white">{userStats.games_won}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-dark-300">Games Lost</p>
                      <p className="text-xl font-bold text-white">{userStats.games_lost}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-dark-300">Total Answers</p>
                      <p className="text-xl font-bold text-white">{userStats.total_answers}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-dark-300">Correct Answers</p>
                      <p className="text-xl font-bold text-white">{userStats.correct_answers}</p>
                    </div>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      {/* Admin Panel */}
      {user.role === 'admin' && (
        <div className="mt-12">
          <AdminPanel />
        </div>
      )}
    </div>
  );
};

export default ProfilePage;