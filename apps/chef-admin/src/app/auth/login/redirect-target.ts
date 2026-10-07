export function resolveChefRedirectTarget(value: string | null): string {
  if (!value) return '/dashboard';

  const trimmed = value.trim();
  if (!trimmed || !trimmed.startsWith('/') || trimmed.startsWith('//')) return '/dashboard';
  if (trimmed.includes('\\')) return '/dashboard';

  const path = trimmed.split(/[?#]/)[0] ?? '';
  if (path === '/' || path === '/auth' || path.startsWith('/auth/')) return '/dashboard';

  return trimmed;
}
