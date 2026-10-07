// Force dynamic rendering for all auth routes so Next.js applies CSP nonce to scripts
export const dynamic = 'force-dynamic';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
