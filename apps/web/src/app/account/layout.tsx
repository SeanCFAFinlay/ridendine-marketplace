// Force dynamic rendering for all account routes
// These routes require authentication and should not be statically generated
export const dynamic = 'force-dynamic';

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
