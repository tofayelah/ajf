import React, { useState } from 'react';

export interface AJFLogoProps {
  variant?: 'login' | 'sidebar' | 'header' | 'dashboard' | 'receipt' | 'print' | 'compact' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  alt?: string;
  size?: number; // Optional explicit size in pixels
}

export const AJFLogo: React.FC<AJFLogoProps> = ({
  variant = 'md',
  className = '',
  alt = 'AJF Management System Logo',
  size
}) => {
  const [hasError, setHasError] = useState(false);

  // Variant size mappings
  const getSizeClasses = () => {
    switch (variant) {
      case 'login':
        // Mobile: 90px–110px, Desktop: 110px–140px
        return 'w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32';
      case 'sidebar':
        return 'w-8 h-8 sm:w-9 sm:h-9';
      case 'header':
        return 'w-8 h-8 sm:w-9 sm:h-9';
      case 'dashboard':
        return 'w-10 h-10 sm:w-12 sm:h-12';
      case 'receipt':
      case 'print':
        return 'w-10 h-10 sm:w-12 sm:h-12 print:w-12 print:h-12';
      case 'compact':
      case 'xs':
        return 'w-6 h-6';
      case 'sm':
        return 'w-7 h-7 sm:w-8 sm:h-8';
      case 'md':
        return 'w-10 h-10';
      case 'lg':
        return 'w-16 h-16';
      case 'xl':
        return 'w-24 h-24';
      default:
        return 'w-10 h-10';
    }
  };

  const style = size ? { width: `${size}px`, height: `${size}px` } : undefined;

  return (
    <div 
      className={`inline-flex items-center justify-center shrink-0 select-none ${!size ? getSizeClasses() : ''} ${className}`}
      style={style}
    >
      {!hasError ? (
        <img
          src="/logo.png"
          alt={alt}
          onError={() => setHasError(true)}
          className="w-full h-full object-contain drop-shadow-xs"
          referrerPolicy="no-referrer"
          loading="eager"
        />
      ) : (
        /* Vector SVG Fallback with canonical design */
        <svg viewBox="0 0 100 100" className="w-full h-full object-contain">
          <circle cx="50" cy="50" r="48" fill="#0f3e99" stroke="#eab308" strokeWidth="4" />
          <circle cx="50" cy="50" r="32" fill="#0b2b6b" stroke="#facc15" strokeWidth="1.5" />
          <path d="M 50,30 L 65,40 L 60,60 L 50,68 L 40,60 L 35,40 Z" fill="#1d4ed8" stroke="#fde047" strokeWidth="1.5" />
          <text x="50" y="52" textAnchor="middle" fill="#fef08a" fontSize="11" fontWeight="900" fontFamily="sans-serif">AJF</text>
          <text x="50" y="85" textAnchor="middle" fill="#facc15" fontSize="7" fontWeight="bold" fontFamily="sans-serif">ESTD 2026</text>
        </svg>
      )}
    </div>
  );
};
