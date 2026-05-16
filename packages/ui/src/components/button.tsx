import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';

// Button variants follow the design brief (primary / secondary / ghost / danger / link).
// Legacy names (default / destructive / outline / success) are preserved as aliases so
// existing app code keeps building during the per-app migrations.
const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2',
    'rounded-md font-semibold transition-colors',
    'focus-visible:outline-none focus-visible:shadow-focus',
    'disabled:pointer-events-none disabled:opacity-50',
  ].join(' '),
  {
    variants: {
      variant: {
        // ── Canonical ────────────────────────────────────────────
        primary: 'bg-primary text-primaryFg hover:bg-primaryHover active:bg-primaryActive',
        secondary:
          'border border-primary bg-surface text-primary hover:bg-primarySoft',
        ghost: 'bg-transparent text-text hover:bg-surfaceMuted',
        danger: 'bg-danger text-white hover:opacity-90 active:opacity-80',
        link: 'bg-transparent text-primary underline-offset-4 hover:underline px-0 h-auto',

        // ── Legacy aliases ───────────────────────────────────────
        // `default` was the old name for `primary`.
        default:
          'bg-primary text-primaryFg hover:bg-primaryHover active:bg-primaryActive',
        // `outline` is similar to `secondary` but with a neutral border colour.
        outline: 'border border-border bg-surface text-text hover:bg-surfaceMuted',
        // `destructive` was the old name for `danger`.
        destructive: 'bg-danger text-white hover:opacity-90 active:opacity-80',
        // `success` retained for a few celebratory flows in chef-admin.
        success: 'bg-success text-white hover:opacity-90 active:opacity-80',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-5 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Spinner = () => (
  <svg
    className="h-4 w-4 animate-spin"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      loading,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? <Spinner /> : leftIcon}
        {children}
        {!loading && rightIcon}
      </button>
    );
  },
);

Button.displayName = 'Button';

export { buttonVariants };
