import { AuthGuard } from '@/components/auth-guard';
import { Header } from '@/components/layout/header'; // Re-use the main header
import { SidebarProvider } from '@/components/ui/sidebar';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <SidebarProvider>
        <div className="flex h-screen flex-col">
          <Header />
          <main className="flex-1 overflow-y-auto bg-secondary/20">
            {children}
          </main>
        </div>
      </SidebarProvider>
    </AuthGuard>
  );
}
