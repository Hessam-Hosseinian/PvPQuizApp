import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

const Card: React.FC<CardProps> = ({ children, className = '', hover = false }) => {
  return (
    <div 
      className={`
        bg-dark-800 rounded-xl shadow-lg border border-dark-700
        ${hover ? 'hover:shadow-xl hover:scale-[1.02] hover:border-dark-600 transition-all duration-200' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default Card;