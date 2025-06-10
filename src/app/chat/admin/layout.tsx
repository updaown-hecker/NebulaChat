
import { AuthGuard } from '@/components/auth-guard';
import { AppLayout } from '@/components/layout/app-layout';

export default function AdminChatLayout({
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
