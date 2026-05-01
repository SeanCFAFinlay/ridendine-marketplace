/**
 * Customer ordering flow helpers (Phase 6 — IRR-011, IRR-031).
 * Canonical confirmation lives under /orders/[id]/confirmation.
 */

function trimTrailingSlashes(url: string): string {
  return url.replace(/\/+$/, '');
}

/** Canonical post-payment confirmation path (internal navigation + Stripe return_url). */
export function orderConfirmationPath(orderId: string): string {
  return `/orders/${encodeURIComponent(orderId)}/confirmation`;
}

/** Legacy path; kept for redirects only — do not link here in new code. */
export function legacyOrderConfirmationPath(orderId: string): string {
  return `/order-confirmation/${encodeURIComponent(orderId)}`;
}

/**
 * Chef-admin URL where vendors create an account after marketing interest.
 * Prefer NEXT_PUBLIC_CHEF_PORTAL_SIGNUP_URL when the signup path differs per env.
 */
export function getChefPortalSignupUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_CHEF_PORTAL_SIGNUP_URL?.trim();
  if (explicit) return explicit;
  const base = process.env.NEXT_PUBLIC_CHEF_ADMIN_URL?.trim();
  if (!base) return '';
  return `${trimTrailingSlashes(base)}/auth/signup`;
}

export function getChefPortalLoginUrl(): string {
  const base = process.env.NEXT_PUBLIC_CHEF_ADMIN_URL?.trim();
  if (!base) return '';
  return `${trimTrailingSlashes(base)}/auth/login`;
}
