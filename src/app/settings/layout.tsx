import { AuthGuard } from '@/components/auth-guard';
import { Header } from '@/components/layout/header'; // Re-use the main header

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex h-screen flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto bg-secondary/20">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
