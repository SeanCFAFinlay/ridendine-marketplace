import * as React from 'react';
import { ridendineTokens } from '../tokens';

type LogoVariant = 'wordmark' | 'icon';

export interface LogoProps extends Omit<React.SVGProps<SVGSVGElement>, 'children' | 'viewBox'> {
  variant?: LogoVariant;
  /** Height in px. The brief specifies 28–32px for in-app headers. */
  height?: number;
  /** Accessible label. Defaults to "RideNDine". Pass an empty string to mark decorative. */
  title?: string;
}

const WORDMARK_VIEWBOX = '0 0 220 48';
const ICON_VIEWBOX = '0 0 48 48';

/**
 * The single shared brand mark. Apps must import this rather than referencing
 * per-app PNGs — that's how cross-app visual continuity is achieved.
 *
 * Variants:
 *   - "wordmark" (default): inline SVG of the "RideNDine" wordmark in brand colors.
 *     "Ride" + "N" render in primary orange, "Dine" in accent teal.
 *   - "icon": compact RD monogram fallback. Replace with the official vector
 *     pin+scooter mark when a clean SVG export is available.
 */
export function Logo({
  variant = 'wordmark',
  height = 32,
  title = 'RideNDine',
  ...svgProps
}: LogoProps) {
  if (variant === 'icon') {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={ICON_VIEWBOX}
        height={height}
        role={title ? 'img' : 'presentation'}
        aria-label={title || undefined}
        aria-hidden={title ? undefined : true}
        {...svgProps}
      >
        {title ? <title>{title}</title> : null}
        <rect
          x={2}
          y={2}
          width={44}
          height={44}
          rx={12}
          fill={ridendineTokens.colors.primary}
        />
        <text
          x={24}
          y={32}
          textAnchor="middle"
          fontFamily={ridendineTokens.typography.display}
          fontSize={22}
          fontWeight={800}
          fill={ridendineTokens.colors.primaryFg}
          letterSpacing="-0.02em"
        >
          R
        </text>
        <circle cx={36} cy={36} r={6} fill={ridendineTokens.colors.accent} />
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={WORDMARK_VIEWBOX}
      height={height}
      role={title ? 'img' : 'presentation'}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
      {...svgProps}
    >
      {title ? <title>{title}</title> : null}
      <text
        x={0}
        y={34}
        fontFamily={ridendineTokens.typography.display}
        fontSize={34}
        fontWeight={800}
        letterSpacing="-0.025em"
      >
        <tspan fill={ridendineTokens.colors.primary}>RideN</tspan>
        <tspan fill={ridendineTokens.colors.accent}>Dine</tspan>
      </text>
    </svg>
  );
}
