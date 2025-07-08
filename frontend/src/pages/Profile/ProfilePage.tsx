import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import AdminPanel from '../../components/Admin/AdminPanel';
import { statsAPI, authAPI } from '../../services/api';
import { 
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
  ActivityIcon,
  UploadIcon,
  TrashIcon
} from 'lucide-react';
import Avatar from '../../components/UI/Avatar';
import Snackbar from '../../components/UI/Snackbar';

const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
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

  // Get upcoming achievements
  const getUpcomingAchievements = (stats: any) => {
    const upcoming: Array<{
      name: string;
      icon: React.ComponentType<{ className?: string }>;
      color: string;
      description: string;
      progress: number;
      target: number;
      current: number;
    }> = [];
    
    const gamesWon = stats?.games_won || 0;
    const winRate = stats?.win_rate_percentage || 0;
    const correctAnswers = stats?.correct_answers || 0;
    const totalAnswers = stats?.total_answers || 0;
    
    if (gamesWon < 10) {
      upcoming.push({ 
        name: 'First Steps', 
        icon: StarIcon, 
        color: 'text-yellow-400', 
        description: 'Win 10 games',
        progress: (gamesWon / 10) * 100,
        target: 10,
        current: gamesWon
      });
    }
    
    if (gamesWon < 50) {
      upcoming.push({ 
        name: 'Quiz Master', 
        icon: CrownIcon, 
        color: 'text-purple-400', 
        description: 'Win 50 games',
        progress: (gamesWon / 50) * 100,
        target: 50,
        current: gamesWon
      });
    }
    
    if (winRate < 70) {
      upcoming.push({ 
        name: 'High Achiever', 
        icon: AwardIcon, 
        color: 'text-blue-400', 
        description: '70%+ win rate',
        progress: (winRate / 70) * 100,
        target: 70,
        current: Math.round(winRate)
      });
    }
    
    if (correctAnswers < 500) {
      upcoming.push({ 
        name: 'Knowledge Seeker', 
        icon: BrainIcon, 
        color: 'text-green-400', 
        description: '500+ correct answers',
        progress: (correctAnswers / 500) * 100,
        target: 500,
        current: correctAnswers
      });
    }
    
    return upcoming.slice(0, 3); // Show only top 3 upcoming achievements
  };

  const [userStats, setUserStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [recentGames, setRecentGames] = useState<any[]>([]);
  const [showGameHistory, setShowGameHistory] = useState(false);
  const [currentStreak, setCurrentStreak] = useState<number | null>(null);
  const [bestScore, setBestScore] = useState<{ score: string; accuracy: number } | null>(null);
  const [activeDays, setActiveDays] = useState<number | null>(null);
  const [comparisonStats, setComparisonStats] = useState<any>(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordErrors, setPasswordErrors] = useState<{[key: string]: string}>({});
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [snackbar, setSnackbar] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (user) {
      loadUserStats();
      loadRecentGames();
    }
  }, [user]);

  // Cleanup preview URL when component unmounts
  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  // Calculate real data when stats or recent games change
  useEffect(() => {
    if (userStats || recentGames.length > 0) {
      setCurrentStreak(calculateCurrentStreak(recentGames));
      setBestScore(calculateBestScore(recentGames));
      setActiveDays(calculateActiveDays(recentGames));
      setComparisonStats(calculateComparisonStats(userStats));
    }
  }, [userStats, recentGames]);

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

  const loadRecentGames = async () => {
    if (!user) return;
    
    try {
      // Try to get real recent games data
      const response = await statsAPI.getRecentGames?.();
      if (response?.data) {
        setRecentGames(response.data);
      } else {
        // If API doesn't exist or returns no data, set empty array
        setRecentGames([]);
      }
    } catch (error) {
      console.error('Failed to load recent games:', error);
      setRecentGames([]);
    }
  };



  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!passwordForm.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }
    
    if (!passwordForm.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (passwordForm.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordForm.newPassword)) {
      errors.newPassword = 'Password must contain uppercase, lowercase, and number';
    }
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePasswordChange = async () => {
    if (!validateForm() || !user) return;
    
    setPasswordLoading(true);
    try {
      await authAPI.changePassword(user.id, {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      setEditing(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordErrors({});
      showSnackbar('Password changed successfully!', 'success');
    } catch (error) {
      console.error('Failed to change password:', error);
      setPasswordErrors({ currentPassword: 'Current password is incorrect' });
    } finally {
      setPasswordLoading(false);
    }
  };

  // Helper to show snackbar
  const showSnackbar = (message: string, type: 'success' | 'error' = 'success') => {
    setSnackbar({ message, type });
    setTimeout(() => setSnackbar(null), 3500);
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile || !user) return;
    setAvatarLoading(true);
    try {
      const response = await authAPI.uploadAvatar(avatarFile);
      updateUser({ ...user, avatar: response.data.avatar });
      setAvatarFile(null);
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
        setAvatarPreview(null);
      }
      showSnackbar('Avatar uploaded successfully!', 'success');
    } catch (error: any) {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
        setAvatarPreview(null);
      }
      if (error.response?.data?.error) {
        showSnackbar(`Avatar upload failed: ${error.response.data.error}`, 'error');
      } else {
        showSnackbar('Avatar upload failed. Please try again.', 'error');
      }
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleAvatarDelete = async () => {
    if (!user?.avatar) return;
    setAvatarLoading(true);
    try {
      await authAPI.deleteAvatar();
      updateUser({ ...user, avatar: undefined });
      showSnackbar('Avatar deleted successfully!', 'success');
    } catch (error: any) {
      if (error.response?.data?.error) {
        showSnackbar(`Avatar deletion failed: ${error.response.data.error}`, 'error');
      } else {
        showSnackbar('Avatar deletion failed. Please try again.', 'error');
      }
    } finally {
      setAvatarLoading(false);
    }
  };

  const validateAndSetFile = (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showSnackbar('Please select a valid image file (JPEG, PNG, GIF, or WebP)', 'error');
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      showSnackbar('File size must be less than 5MB', 'error');
      return false;
    }
    return true;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && validateAndSetFile(file)) {
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
      setAvatarFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (validateAndSetFile(file)) {
        const previewUrl = URL.createObjectURL(file);
        setAvatarPreview(previewUrl);
        setAvatarFile(file);
      }
    }
  };

  // Calculate current streak from recent games
  const calculateCurrentStreak = (games: any[]) => {
    if (!games || games.length === 0) return 0;
    
    let streak = 0;
    for (const game of games) {
      if (game.result === 'Won') {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };

  // Calculate best score from recent games
  const calculateBestScore = (games: any[]) => {
    if (!games || games.length === 0) return null;
    
    let bestScore: { score: string; accuracy: number } | null = null;
    for (const game of games) {
      if (game.score) {
        const [correct, total] = game.score.split('-').map(Number);
        const accuracy = (correct / total) * 100;
        
        if (!bestScore || accuracy > bestScore.accuracy) {
          bestScore = {
            score: game.score,
            accuracy: accuracy
          };
        }
      }
    }
    return bestScore;
  };

  // Calculate active days (this week)
  const calculateActiveDays = (games: any[]) => {
    if (!games || games.length === 0) return 0;
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const activeDays = new Set();
    for (const game of games) {
      const gameDate = new Date(game.date);
      if (gameDate >= oneWeekAgo) {
        activeDays.add(gameDate.toDateString());
      }
    }
    return activeDays.size;
  };

  // Calculate comparison stats based on available data
  const calculateComparisonStats = (stats: any) => {
    if (!stats) return null;
    
    // These would ideally come from backend API
    // For now, we'll use reasonable estimates based on common gaming statistics
    const winRate = stats.win_rate_percentage || 0;
    const level = user?.current_level || 1;
    const totalGames = (stats.games_won || 0) + (stats.games_lost || 0);
    const accuracy = stats.total_answers > 0 
      ? Math.round((stats.correct_answers / stats.total_answers) * 100) 
      : 0;
    
    return {
      winRateRank: winRate >= 80 ? 'Top 10%' : winRate >= 70 ? 'Top 25%' : winRate >= 60 ? 'Top 40%' : 'Top 60%',
      levelRank: level >= 20 ? 'Top 10%' : level >= 15 ? 'Top 15%' : level >= 10 ? 'Top 25%' : 'Top 40%',
      gamesRank: totalGames >= 100 ? 'Top 15%' : totalGames >= 50 ? 'Top 30%' : totalGames >= 20 ? 'Top 50%' : 'Top 70%',
      accuracyRank: accuracy >= 90 ? 'Top 10%' : accuracy >= 80 ? 'Top 20%' : accuracy >= 70 ? 'Top 35%' : 'Top 55%'
    };
  };

  if (!user) return null;

  const achievements = getAchievements(userStats);
  const xpProgress = calculateXPProgress(user.total_xp, user.current_level);
  const xpForNextLevel = calculateXPForNextLevel(user.current_level);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-dark-900 min-h-screen">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Profile</h1>
            <p className="text-dark-300 mt-2">Manage your account and view your detailed statistics</p>
          </div>
        
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Profile Info */}
        <div className="lg:col-span-1">
          <Card className="p-6">
            <div className="text-center mb-6">
              {/* Enhanced Avatar Section */}
              <div className="relative mx-auto mb-6" style={{ overflow: 'visible' }}>
                <div className="relative inline-block">
                  {/* Avatar with enhanced styling */}
                  <Avatar 
                    src={user.avatar} 
                    size="xl" 
                    className="ring-4 ring-primary-500/20 shadow-2xl"
                    showStatus={true}
                    isOnline={true}
                    isPremium={user.role === 'admin'}
                  />
                  {/* Level badge overlay */}
                  <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-primary-600 to-secondary-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg border-2 border-dark-800">
                    {user.current_level}
                  </div>
                  {/* Upload button absolutely outside avatar, no overlap */}
                  <button
                    type="button"
                    className="absolute bottom-0 right-0 w-8 h-8 bg-primary-600 hover:bg-primary-700 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white z-20"
                    style={{ transform: 'translate(35%, 35%)' }}
                    onClick={() => fileInputRef.current?.click()}
                    tabIndex={-1}
                  >
                    <UploadIcon className="w-4 h-4" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
                {/* Avatar status indicator */}
                <div className="absolute top-2 left-2">
                  <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-dark-800 animate-pulse"></div>
                </div>
              </div>

              {/* Enhanced user info */}
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent">
                  {user.username}
                </h2>
                <p className="text-dark-300 text-sm">{user.email}</p>
                {user.role === 'admin' && (
                  <span className="inline-block bg-gradient-to-r from-red-600 to-pink-600 text-white text-xs px-4 py-2 rounded-full mt-2 font-semibold shadow-lg">
                    <CrownIcon className="w-3 h-3 inline mr-1" />
                    Administrator
                  </span>
                )}
              </div>

              {/* Enhanced Avatar Upload Controls */}
              {avatarFile && (
                <div className="mt-4 p-3 bg-dark-800 rounded-xl border border-dark-600 shadow-sm max-w-xs mx-auto">
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center mr-2">
                      <UploadIcon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-white">Selected File</p>
                      <p className="text-xs text-dark-300">{avatarFile.name}</p>
                    </div>
                    <span className="ml-auto text-xs text-dark-400">{(avatarFile.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                  {avatarPreview && (
                    <div className="mb-2 text-center">
                      <p className="text-xs text-dark-300 mb-1">Preview:</p>
                      <div className="flex justify-center">
                        <Avatar 
                          src={avatarPreview} 
                          size="lg" 
                          className="ring-2 ring-primary-500/40 shadow-lg mx-auto" 
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex space-x-2 mt-2">
                    <Button
                      onClick={handleAvatarUpload}
                      loading={avatarLoading}
                      size="sm"
                      className="flex-1 bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 rounded-lg"
                    >
                      <UploadIcon className="w-4 h-4 mr-1" />
                      Upload Avatar
                    </Button>
                    <Button
                      onClick={() => {
                        setAvatarFile(null);
                        if (avatarPreview) {
                          URL.revokeObjectURL(avatarPreview);
                          setAvatarPreview(null);
                        }
                      }}
                      variant="outline"
                      size="sm"
                      className="px-3 rounded-lg border border-dark-500"
                    >
                      <XIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Enhanced Delete Avatar Button */}
              {user.avatar && !avatarFile && (
                <div className="mt-4">
                  <Button
                    onClick={handleAvatarDelete}
                    loading={avatarLoading}
                    variant="outline"
                    size="sm"
                    className="w-full border border-red-500 text-red-400 hover:bg-red-600/10 hover:border-red-500 rounded-lg"
                  >
                    <TrashIcon className="w-4 h-4 mr-2" />
                    Remove Avatar
                  </Button>
                </div>
              )}

              {/* Avatar upload tips */}
              {!user.avatar && !avatarFile && (
                <div 
                  className={`mt-4 p-4 bg-dark-700/50 rounded-xl border-2 border-dashed transition-all duration-300 ${
                    isDragOver 
                      ? 'border-primary-500 bg-primary-500/10' 
                      : 'border-dark-500 hover:border-primary-500/50'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="text-center">
                    <UploadIcon className={`w-8 h-8 mx-auto mb-2 transition-colors duration-300 ${
                      isDragOver ? 'text-primary-400' : 'text-dark-400'
                    }`} />
                    <p className={`text-sm font-medium transition-colors duration-300 ${
                      isDragOver ? 'text-primary-400' : 'text-dark-300'
                    }`}>
                      {isDragOver ? 'Drop your image here' : 'Drag & drop an image here'}
                    </p>
                    <p className="text-xs text-dark-400 mt-1">or click the upload button above</p>
                    <p className="text-xs text-dark-400 mt-1">
                      Supports: JPG, PNG, GIF, WebP (Max 5MB)
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Enhanced Level Progress */}
            <div className="mb-6 p-4 bg-gradient-to-r from-dark-700 to-dark-800 rounded-lg border border-primary-500/20">
              <div className="flex justify-between items-center mb-3">
                <span className="text-dark-200 font-medium">Level {user.current_level}</span>
                <span className="text-sm text-primary-400 font-semibold">{xpProgress.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-dark-600 rounded-full h-3 mb-2">
                <div 
                  className="bg-gradient-to-r from-primary-500 to-secondary-500 h-3 rounded-full transition-all duration-500 shadow-lg"
                  style={{ width: `${xpProgress}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-dark-400">Current XP</span>
                <span className="text-primary-400 font-medium">
                  {user.total_xp.toLocaleString()} / {xpForNextLevel.toLocaleString()} XP
                </span>
              </div>
            </div>

            {/* Enhanced user stats */}
            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center p-3 bg-dark-700/50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-primary-600/20 rounded-lg flex items-center justify-center mr-3">
                    <ZapIcon className="w-4 h-4 text-primary-400" />
                  </div>
                  <span className="text-dark-200">Total XP</span>
                </div>
                <span className="font-semibold text-white">{user.total_xp.toLocaleString()} XP</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-dark-700/50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center mr-3">
                    <CalendarIcon className="w-4 h-4 text-blue-400" />
                  </div>
                  <span className="text-dark-200">Member Since</span>
                </div>
                <span className="font-semibold text-white">
                  {new Date(user.created_at).toLocaleDateString()}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-dark-700/50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-600/20 rounded-lg flex items-center justify-center mr-3">
                    <ClockIcon className="w-4 h-4 text-green-400" />
                  </div>
                  <span className="text-dark-200">Last Login</span>
                </div>
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
                  Change Password
                </Button>
              ) : (
                <div className="space-y-6">
                  {/* Tab Navigation */}
                  <div className="flex space-x-1 bg-dark-700 rounded-lg p-1">
                    <button
                      onClick={() => setEditing(false)}
                      className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                        editing ? 'bg-primary-600 text-white' : 'text-dark-300 hover:text-white'
                      }`}
                    >
                      Password
                    </button>
                  </div>

                  {/* Password Tab */}
                  {editing && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-dark-200 mb-1">
                          Current Password
                        </label>
                        <input
                          type="password"
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
                            passwordErrors.currentPassword 
                              ? 'border-red-500 bg-dark-700 text-white' 
                              : 'border-dark-600 bg-dark-700 text-white'
                          }`}
                        />
                        {passwordErrors.currentPassword && (
                          <p className="text-red-400 text-xs mt-1">{passwordErrors.currentPassword}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-dark-200 mb-1">
                          New Password
                        </label>
                        <input
                          type="password"
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
                            passwordErrors.newPassword 
                              ? 'border-red-500 bg-dark-700 text-white' 
                              : 'border-dark-600 bg-dark-700 text-white'
                          }`}
                        />
                        {passwordErrors.newPassword && (
                          <p className="text-red-400 text-xs mt-1">{passwordErrors.newPassword}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-dark-200 mb-1">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
                            passwordErrors.confirmPassword 
                              ? 'border-red-500 bg-dark-700 text-white' 
                              : 'border-dark-600 bg-dark-700 text-white'
                          }`}
                        />
                        {passwordErrors.confirmPassword && (
                          <p className="text-red-400 text-xs mt-1">{passwordErrors.confirmPassword}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex space-x-2 pt-4 border-t border-dark-600">
                    <Button
                      onClick={handlePasswordChange}
                      loading={passwordLoading}
                      size="sm"
                      className="flex-1"
                    >
                      <CheckIcon className="w-4 h-4 mr-1" />
                      Change Password
                    </Button>
                    <Button
                      onClick={() => {
                        setEditing(false);
                        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                        setPasswordErrors({});
                      }}
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
                  <div className="text-center py-8">
                    <AwardIcon className="w-12 h-12 text-dark-400 mx-auto mb-3" />
                    <p className="text-dark-300 mb-2">No achievements unlocked yet</p>
                    <p className="text-sm text-dark-400">Keep playing and improving to earn achievements!</p>
                  </div>
                )}
              </Card>

              {/* Upcoming Achievements */}
              {getUpcomingAchievements(userStats).length > 0 ? (
                <Card className="p-6 mb-8">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <TargetIcon className="w-5 h-5 mr-2" />
                    Upcoming Achievements
                  </h3>
                  <div className="space-y-4">
                    {getUpcomingAchievements(userStats).map((achievement, index) => (
                      <div key={index} className="p-4 bg-dark-700 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <achievement.icon className={`w-5 h-5 mr-2 ${achievement.color}`} />
                            <div>
                              <p className="font-semibold text-white">{achievement.name}</p>
                              <p className="text-sm text-dark-300">{achievement.description}</p>
                            </div>
                          </div>
                          <span className="text-sm text-dark-300">
                            {achievement.current}/{achievement.target}
                          </span>
                        </div>
                        <div className="w-full bg-dark-600 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-primary-500 to-secondary-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${achievement.progress}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-dark-400 mt-1">
                          {achievement.progress.toFixed(1)}% complete
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              ) : (
                <Card className="p-6 mb-8">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <TargetIcon className="w-5 h-5 mr-2" />
                    Upcoming Achievements
                  </h3>
                  <div className="text-center py-8">
                    <TargetIcon className="w-12 h-12 text-dark-400 mx-auto mb-3" />
                    <p className="text-dark-300 mb-2">All achievements unlocked!</p>
                    <p className="text-sm text-dark-400">Congratulations! You've earned all available achievements.</p>
                  </div>
                </Card>
              )}

              {/* Recent Games Section */}
              <Card className="p-6 mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center">
                    <ClockIcon className="w-5 h-5 mr-2" />
                    Recent Games
                  </h3>
                  {recentGames.length > 0 && (
                    <Button
                      onClick={() => setShowGameHistory(!showGameHistory)}
                      variant="outline"
                      size="sm"
                    >
                      {showGameHistory ? 'Hide Details' : 'Show Details'}
                    </Button>
                  )}
                </div>
                
                {recentGames.length > 0 ? (
                  <div className="space-y-3">
                    {recentGames.slice(0, showGameHistory ? recentGames.length : 3).map((game, index) => (
                      <div key={game.id || index} className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full mr-3 ${
                            game.result === 'Won' ? 'bg-green-500' : game.result === 'Lost' ? 'bg-red-500' : 'bg-gray-500'
                          }`} />
                          <div>
                            <p className="font-semibold text-white">
                              vs {game.opponent || game.opponent_name || 'Unknown Player'}
                            </p>
                            {showGameHistory && game.score && (
                              <p className="text-sm text-dark-300">Score: {game.score}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${
                            game.result === 'Won' ? 'text-green-400' : 
                            game.result === 'Lost' ? 'text-red-400' : 'text-gray-400'
                          }`}>
                            {game.result || 'Unknown'}
                          </p>
                          <p className="text-sm text-dark-300">
                            {game.date ? getRelativeTime(new Date(game.date)) : 'Unknown date'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ClockIcon className="w-12 h-12 text-dark-400 mx-auto mb-3" />
                    <p className="text-dark-300 mb-2">No recent games found</p>
                    <p className="text-sm text-dark-400">Start playing to see your game history here!</p>
                  </div>
                )}
              </Card>

              {/* Detailed Statistics */}
              {userStats ? (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Detailed Statistics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <p className="text-sm text-dark-300">Games Won</p>
                      <p className="text-xl font-bold text-white">{userStats.games_won || 0}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-dark-300">Games Lost</p>
                      <p className="text-xl font-bold text-white">{userStats.games_lost || 0}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-dark-300">Total Answers</p>
                      <p className="text-xl font-bold text-white">{userStats.total_answers || 0}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-dark-300">Correct Answers</p>
                      <p className="text-xl font-bold text-white">{userStats.correct_answers || 0}</p>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Detailed Statistics</h3>
                  <div className="text-center py-8">
                    <BarChart3Icon className="w-12 h-12 text-dark-400 mx-auto mb-3" />
                    <p className="text-dark-300 mb-2">Statistics not available</p>
                    <p className="text-sm text-dark-400">Play some games to see your detailed statistics here!</p>
                  </div>
                </Card>
              )}

              {/* Progress Trends */}
              <Card className="p-6 mt-8">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <TrendingUpIcon className="w-5 h-5 mr-2" />
                  Progress Trends
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-dark-700 rounded-lg">
                    <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                      <ZapIcon className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-sm text-dark-300 mb-1">Current Streak</p>
                    <p className="text-2xl font-bold text-white">
                      {currentStreak !== null ? currentStreak : 'N/A'}
                    </p>
                    <p className="text-xs text-green-400 mt-1">
                      {currentStreak !== null && currentStreak > 0 ? 'Active streak' : 'No active streak'}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-dark-700 rounded-lg">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-3">
                      <TargetIcon className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-sm text-dark-300 mb-1">Best Score</p>
                    <p className="text-2xl font-bold text-white">
                      {bestScore ? bestScore.score : 'N/A'}
                    </p>
                    <p className="text-xs text-purple-400 mt-1">
                      {bestScore ? `${bestScore.accuracy.toFixed(0)}% accuracy` : 'No games played'}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-dark-700 rounded-lg">
                    <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CalendarIcon className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-sm text-dark-300 mb-1">Active Days</p>
                    <p className="text-2xl font-bold text-white">
                      {activeDays !== null ? activeDays : 'N/A'}
                    </p>
                    <p className="text-xs text-orange-400 mt-1">
                      {activeDays !== null ? 'This week' : 'No recent activity'}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Comparison Stats */}
              <Card className="p-6 mt-8">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <BarChart3Icon className="w-5 h-5 mr-2" />
                  How You Compare
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="text-center p-4 bg-dark-700 rounded-lg">
                    <p className="text-sm text-dark-300 mb-1">Win Rate</p>
                    <p className="text-2xl font-bold text-white">{userStats?.win_rate_percentage || 0}%</p>
                    <div className="flex items-center justify-center mt-2">
                      <TrendingUpIcon className="w-4 h-4 text-green-400 mr-1" />
                      <span className="text-xs text-green-400">
                        {comparisonStats?.winRateRank || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="text-center p-4 bg-dark-700 rounded-lg">
                    <p className="text-sm text-dark-300 mb-1">Level</p>
                    <p className="text-2xl font-bold text-white">{user.current_level}</p>
                    <div className="flex items-center justify-center mt-2">
                      <CrownIcon className="w-4 h-4 text-yellow-400 mr-1" />
                      <span className="text-xs text-yellow-400">
                        {comparisonStats?.levelRank || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="text-center p-4 bg-dark-700 rounded-lg">
                    <p className="text-sm text-dark-300 mb-1">Games Played</p>
                    <p className="text-2xl font-bold text-white">{(userStats?.games_won || 0) + (userStats?.games_lost || 0)}</p>
                    <div className="flex items-center justify-center mt-2">
                      <ActivityIcon className="w-4 h-4 text-blue-400 mr-1" />
                      <span className="text-xs text-blue-400">
                        {comparisonStats?.gamesRank || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="text-center p-4 bg-dark-700 rounded-lg">
                    <p className="text-sm text-dark-300 mb-1">Accuracy</p>
                    <p className="text-2xl font-bold text-white">
                      {userStats?.total_answers > 0 
                        ? Math.round((userStats.correct_answers / userStats.total_answers) * 100) 
                        : 0}%
                    </p>
                    <div className="flex items-center justify-center mt-2">
                      <BrainIcon className="w-4 h-4 text-purple-400 mr-1" />
                      <span className="text-xs text-purple-400">
                        {comparisonStats?.accuracyRank || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
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



      {/* Snackbar for alerts */}
      {snackbar && (
        <Snackbar message={snackbar.message} type={snackbar.type} />
      )}
    </div>
  );
};

export default ProfilePage;