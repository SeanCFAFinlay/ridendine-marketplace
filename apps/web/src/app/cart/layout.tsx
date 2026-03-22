// Force dynamic rendering for cart route
// This route uses browser-only APIs and should not be statically generated
export const dynamic = 'force-dynamic';

export default function CartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
