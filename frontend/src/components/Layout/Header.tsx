import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserIcon, TrophyIcon, PlayIcon, TagIcon, LogOutIcon as LogoutIcon, MenuIcon, XIcon, HomeIcon, Home, LogIn, UserPlus, Trophy, MessageSquare, Shield, BookOpen, UserCircle } from 'lucide-react';
import Avatar from '../UI/Avatar';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const navItems = [
    { name: 'Home', href: '/', icon: HomeIcon },
    { name: 'Play', href: '/play', icon: PlayIcon },
    { name: 'Leaderboard', href: '/leaderboard', icon: TrophyIcon },
    { name: 'Categories', href: '/categories', icon: TagIcon },
    { name: 'Chat', href: '/chat', icon: MessageSquare },
  ];

  if (!user) return null;

  return (
    <header className="bg-dark-800 shadow-lg border-b border-dark-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-primary-600 to-secondary-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">Q</span>
            </div>
            <span className="font-bold text-xl text-white">PhoenixFlare</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="flex items-center space-x-1 text-dark-300 hover:text-primary-400 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
              >
                <item.icon className="w-4 h-4" />
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Avatar src={user.avatar} size="sm" />
              <span className="hidden sm:block text-sm font-medium text-white">
                {user.username}
              </span>
              {user.role === 'admin' && (
                <span className="bg-primary-600 text-white text-xs px-2 py-1 rounded-full">
                  Admin
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Link
                to="/profile"
                className="text-dark-300 hover:text-primary-400 p-2 rounded-md transition-colors duration-200"
              >
                <UserIcon className="w-5 h-5" />
              </Link>
              <button
                onClick={handleLogout}
                className="text-dark-300 hover:text-primary-400 p-2 rounded-md transition-colors duration-200"
              >
                <LogoutIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-md text-dark-300 hover:text-primary-400"
            >
              {mobileMenuOpen ? (
                <XIcon className="w-6 h-6" />
              ) : (
                <MenuIcon className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-dark-700">
            <nav className="space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 text-dark-300 hover:text-primary-400 px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;