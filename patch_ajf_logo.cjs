const fs = require('fs');
let content = `import React from 'react';

export interface AJFLogoProps {
  variant?: 'login' | 'sidebar' | 'header' | 'dashboard' | 'receipt' | 'print' | 'compact' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  alt?: string;
  size?: number; // Optional explicit size in pixels
}

export const OFFICIAL_AJF_LOGO_URL = '/AJF-Official-Logo-Final-2026.png?v=3.0';

export const AJFLogo: React.FC<AJFLogoProps> = ({
  variant = 'md',
  className = '',
  alt = 'AJF Management System Logo',
  size
}) => {
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

  const style = size ? { width: \`\${size}px\`, height: \`\${size}px\` } : undefined;

  return (
    <div 
      className={\`inline-flex items-center justify-center shrink-0 select-none aspect-square \${!size ? getSizeClasses() : ''} \${className}\`}
      style={style}
      role="img"
      aria-label={alt}
    >
      <img
        src={OFFICIAL_AJF_LOGO_URL}
        alt={alt}
        className="w-full h-full object-contain aspect-square drop-shadow-xs"
        loading="eager"
      />
    </div>
  );
};
`;
fs.writeFileSync('src/components/common/AJFLogo.tsx', content, 'utf8');
console.log('Patched AJFLogo.tsx');
