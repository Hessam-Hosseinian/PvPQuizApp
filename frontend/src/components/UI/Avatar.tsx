import React, { useState } from 'react';
import { UserIcon, CrownIcon, StarIcon } from 'lucide-react';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  fallbackIcon?: React.ReactNode;
  showStatus?: boolean;
  isOnline?: boolean;
  isPremium?: boolean;
}

const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = 'User avatar',
  size = 'md',
  className = '',
  fallbackIcon,
  showStatus = false,
  isOnline = false,
  isPremium = false
}) => {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
    '2xl': 'w-32 h-32'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
    '2xl': 'w-16 h-16'
  };

  const getAvatarUrl = (avatarPath: string) => {
    if (avatarPath.startsWith('http') || avatarPath.startsWith('blob:')) {
      return avatarPath;
    }
    return `http://127.0.0.1:5000/users/avatar/${avatarPath}`;
  };

  const getFallbackIcon = () => {
    if (fallbackIcon) return fallbackIcon;
    
    if (isPremium) {
      return <CrownIcon className={`${iconSizes[size]} text-yellow-400`} />;
    }
    
    return <UserIcon className={iconSizes[size]} />;
  };

  const getGradientClass = () => {
    if (isPremium) {
      return 'bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500';
    }
    return 'bg-gradient-to-br from-primary-500 via-secondary-500 to-primary-600';
  };

  const renderAvatarContent = () => {
    if (src && !imageError) {
      return (
        <img
          src={getAvatarUrl(src)}
          alt={alt}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          onError={() => setImageError(true)}
        />
      );
    }

    return (
      <div className={`w-full h-full ${getGradientClass()} rounded-full flex items-center justify-center text-white shadow-lg`}>
        {getFallbackIcon()}
      </div>
    );
  };

  return (
    <div className="relative inline-block">
      <div 
        className={`
          ${sizeClasses[size]} 
          rounded-full 
          overflow-hidden 
          shadow-xl
          border-2 
          border-white/10
          hover:border-primary-500/30
          transition-all 
          duration-300 
          hover:shadow-2xl
          hover:shadow-primary-500/20
          ${className}
        `}
      >
        {renderAvatarContent()}
      </div>
      
      {/* Status indicator */}
      {showStatus && (
        <div className="absolute -bottom-1 -right-1">
          <div className={`
            w-4 h-4 
            rounded-full 
            border-2 
            border-white 
            shadow-lg
            ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}
          `} />
        </div>
      )}
      
      {/* Premium badge */}
      {isPremium && (
        <div className="absolute -top-1 -right-1">
          <div className="w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg border border-white">
            <StarIcon className="w-3 h-3 text-white" />
          </div>
        </div>
      )}
    </div>
  );
};

export default Avatar; 