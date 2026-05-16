import * as React from 'react';
import { cn } from '../utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Drops the border and adds shadow-md. Use on colored sections. */
  elevated?: boolean;
  /** Adds a hover lift. Use on chef cards, menu items, anything clickable. */
  interactive?: boolean;
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
} as const;

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, padding = 'md', elevated = false, interactive = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg bg-surface',
          elevated ? 'shadow-md' : 'border border-border',
          interactive &&
            'transition-shadow duration-DEFAULT ease-brand hover:shadow-lg hover:-translate-y-px cursor-pointer',
          paddingClasses[padding],
          className,
        )}
        {...props}
      />
    );
  },
);

Card.displayName = 'Card';

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex flex-col space-y-1.5', className)} {...props} />
));
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-lg font-semibold leading-snug tracking-tight text-text', className)}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-textMuted', className)} {...props} />
));
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('', className)} {...props} />
));
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex items-center pt-4', className)} {...props} />
));
CardFooter.displayName = 'CardFooter';
