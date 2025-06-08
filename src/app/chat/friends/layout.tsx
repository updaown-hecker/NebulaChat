
// AppLayout and AuthGuard are already provided by /chat/layout.tsx
// This layout can be used for friends-specific adjustments if needed in the future,
// but for now, it doesn't need to re-apply the main AppLayout.
export default function FriendsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
