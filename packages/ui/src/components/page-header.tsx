import * as React from 'react';
import { cn } from '../utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  /** Optional breadcrumb / back-link slot above the title. */
  eyebrow?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-4 pb-6 md:flex-row md:items-start md:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-sm text-textMuted">{eyebrow}</div>}
        <h1 className="text-3xl font-semibold tracking-tight text-text">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-base leading-relaxed text-textMuted">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
