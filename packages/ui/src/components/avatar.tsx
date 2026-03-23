'use client';

import * as React from 'react';
import { cn } from '../utils';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Avatar({
  className,
  src,
  alt = '',
  fallback,
  size = 'md',
  ...props
}: AvatarProps) {
  const [hasError, setHasError] = React.useState(false);

  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-16 w-16 text-lg',
  };

  const getFallbackText = () => {
    if (fallback) return fallback.slice(0, 2).toUpperCase();
    if (alt) {
      const parts = alt.split(' ');
      if (parts.length >= 2) {
        return (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
      }
      return alt.slice(0, 2).toUpperCase();
    }
    return '?';
  };

  const showFallback = !src || hasError;

  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100',
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {showFallback ? (
        <span className="font-medium text-gray-600">{getFallbackText()}</span>
      ) : (
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          onError={() => setHasError(true)}
        />
      )}
    </div>
  );
}
