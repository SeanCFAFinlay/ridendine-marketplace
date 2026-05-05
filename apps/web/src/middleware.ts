import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createAuthMiddleware } from '@ridendine/auth/middleware';

// Cache maintenance state for 30 seconds to avoid a DB call on every request.
let maintenanceCacheValue = false;
let maintenanceCacheExpiry = 0;
const CACHE_TTL_MS = 30_000;

const MAINTENANCE_BYPASS_PREFIXES = [
  '/maintenance',
  '/api/health',
  '/api/',
  '/_next/',
  '/favicon',
];

async function getMaintenanceMode(): Promise<boolean> {
  const now = Date.now();
  if (now < maintenanceCacheExpiry) return maintenanceCacheValue;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    maintenanceCacheValue = false;
    maintenanceCacheExpiry = now + CACHE_TTL_MS;
    return false;
  }

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/platform_settings?select=setting_value&limit=1`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        signal: AbortSignal.timeout(1500),
      }
    );
    if (!res.ok) {
      maintenanceCacheValue = false;
      maintenanceCacheExpiry = now + CACHE_TTL_MS;
      return false;
    }
    const rows = (await res.json()) as Array<{ setting_value?: Record<string, unknown> }>;
    maintenanceCacheValue = rows[0]?.setting_value?.['maintenance_mode'] === true;
  } catch {
    // Fail open: allow traffic when DB is unreachable
    maintenanceCacheValue = false;
  }

  maintenanceCacheExpiry = now + CACHE_TTL_MS;
  return maintenanceCacheValue;
}

const authMiddleware = createAuthMiddleware({
  publicRoutes: ['/auth/login', '/auth/signup'],
  authRoutes: ['/auth/login', '/auth/signup'],
  loginRoute: '/auth/login',
  authenticatedRedirect: '/chefs',
  /** OPTION A (Phase 2 / IRR-002): checkout requires authenticated customer session */
  protectedRoutes: ['/account', '/checkout'],
});

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  const isBypassed = MAINTENANCE_BYPASS_PREFIXES.some((p) => pathname.startsWith(p));

  if (!isBypassed) {
    const inMaintenance = await getMaintenanceMode();
    if (inMaintenance) {
      return NextResponse.redirect(new URL('/maintenance', request.url));
    }
  }

  return authMiddleware(request) as Promise<NextResponse>;
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     *  - _next/static (static files)
     *  - _next/image  (Next.js image optimization)
     *  - favicon.ico
     * This allows the maintenance check to cover all page routes
     * while the MAINTENANCE_BYPASS_PREFIXES guard keeps API/static paths clean.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
