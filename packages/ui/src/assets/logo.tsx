import * as React from 'react';
import { ridendineTokens } from '../tokens';

type LogoVariant = 'wordmark' | 'icon' | 'full' | 'text';

export interface LogoProps extends Omit<React.SVGProps<SVGSVGElement>, 'children' | 'viewBox'> {
  variant?: LogoVariant;
  /** Height in px. The brief specifies 28–32px for in-app headers. */
  height?: number;
  /** Accessible label. Defaults to "RideNDine". Pass an empty string to mark decorative. */
  title?: string;
}

const FULL_VIEWBOX = '0 0 268 48';
const WORDMARK_VIEWBOX = '0 0 220 48';
const ICON_VIEWBOX = '0 0 48 48';

/**
 * The single shared brand mark. Apps must import this rather than referencing
 * per-app PNGs — that's how cross-app visual continuity is achieved.
 *
 * Variants:
 *   - "wordmark" (default) or "full": official brand mark with icon + "RideNDine" text.
 *     "Ride" + "N" render in accent teal, "Dine" in primary orange.
 *   - "icon": official compact app icon asset wrapped in SVG.
 *   - "text": inline SVG of only the "RideNDine" wordmark text.
 */
export function Logo({
  variant = 'wordmark',
  height = 32,
  title = 'RideNDine',
  width,
  ...svgProps
}: LogoProps) {
  if (variant === 'icon') {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={ICON_VIEWBOX}
        height={height}
        width={width ?? height}
        role={title ? 'img' : 'presentation'}
        aria-label={title || undefined}
        aria-hidden={title ? undefined : true}
        {...svgProps}
      >
        {title ? <title>{title}</title> : null}
        <image
          href="/logo-icon.png"
          x={0}
          y={0}
          width={48}
          height={48}
          preserveAspectRatio="xMidYMid meet"
        />
      </svg>
    );
  }

  if (variant === 'text') {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={WORDMARK_VIEWBOX}
        height={height}
        width={width ?? Math.round(height * (220 / 48))}
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
          letterSpacing={0}
        >
          <tspan fill={ridendineTokens.colors.accent}>RideN</tspan>
          <tspan fill={ridendineTokens.colors.primary}>Dine</tspan>
        </text>
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={FULL_VIEWBOX}
      height={height}
      width={width ?? Math.round(height * (268 / 48))}
      role={title ? 'img' : 'presentation'}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
      {...svgProps}
    >
      {title ? <title>{title}</title> : null}
      <image
        href="/logo-icon.png"
        x={0}
        y={0}
        width={48}
        height={48}
        preserveAspectRatio="xMidYMid meet"
      />
      <text
        x={54}
        y={34}
        fontFamily={ridendineTokens.typography.display}
        fontSize={34}
        fontWeight={800}
        letterSpacing={0}
      >
        <tspan fill={ridendineTokens.colors.accent}>RideN</tspan>
        <tspan fill={ridendineTokens.colors.primary}>Dine</tspan>
      </text>
    </svg>
  );
}
