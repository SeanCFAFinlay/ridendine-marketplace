// Force dynamic rendering for all auth routes
// These routes use browser-only APIs and should not be statically generated
export const dynamic = 'force-dynamic';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
