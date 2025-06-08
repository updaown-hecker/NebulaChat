
// This file can be removed if not strictly needed,
// as /chat/layout.tsx already provides AppLayout.
// However, keeping it allows for future friends-specific layout adjustments.
import { AuthGuard } from '@/components/auth-guard';
import { AppLayout } from '@/components/layout/app-layout';

export default function FriendsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <AppLayout>
        {children}
      </AppLayout>
    </AuthGuard>
  );
}
