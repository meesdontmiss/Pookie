import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className="flex items-center justify-center">
      <div 
        className={`${sizeClasses[size]} rounded-full border-t-transparent border-solid border-white animate-spin ${className}`}
        style={{ 
          animation: 'spin 1s linear infinite' 
        }}
      />
    </div>
  );
} 