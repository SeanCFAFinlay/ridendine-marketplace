'use client';

import * as React from 'react';
import { cn } from '@ridendine/ui';

interface PasswordStrengthProps {
  password: string;
}

type StrengthLevel = 'weak' | 'fair' | 'good' | 'strong';

interface StrengthResult {
  level: StrengthLevel;
  score: number;
  label: string;
  color: string;
}

function calculateStrength(password: string): StrengthResult {
  if (!password) {
    return { level: 'weak', score: 0, label: '', color: 'bg-gray-200' };
  }

  let score = 0;

  // Length
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;

  // Character variety
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  if (score <= 2) {
    return {
      level: 'weak',
      score: 1,
      label: 'Weak',
      color: 'bg-red-500',
    };
  } else if (score <= 4) {
    return {
      level: 'fair',
      score: 2,
      label: 'Fair',
      color: 'bg-orange-500',
    };
  } else if (score <= 5) {
    return {
      level: 'good',
      score: 3,
      label: 'Good',
      color: 'bg-yellow-500',
    };
  } else {
    return {
      level: 'strong',
      score: 4,
      label: 'Strong',
      color: 'bg-green-500',
    };
  }
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const strength = calculateStrength(password);

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              level <= strength.score ? strength.color : 'bg-gray-200'
            )}
          />
        ))}
      </div>
      <p className="text-xs text-slate-600">
        Password strength: <span className="font-medium">{strength.label}</span>
      </p>
    </div>
  );
}
