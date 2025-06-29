import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  role?: string;
  tabIndex?: number;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  'aria-label'?: string;
}

const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  hover = false,
  onClick,
  role,
  tabIndex,
  onKeyDown,
  'aria-label': ariaLabel
}) => {
  return (
    <div 
      className={`
        bg-dark-800 rounded-xl shadow-lg border border-dark-700
        ${hover ? 'hover:shadow-xl hover:scale-[1.02] hover:border-dark-600 transition-all duration-200' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
      role={role}
      tabIndex={tabIndex}
      onKeyDown={onKeyDown}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
};

export default Card;