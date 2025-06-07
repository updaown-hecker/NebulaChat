
"use client";

import React, { useEffect, ReactNode, useState } from 'react'; // Added useState
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

export function AuthGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const [isClientHydrated, setIsClientHydrated] = useState(false);

  useEffect(() => {
    setIsClientHydrated(true); // Mark that client has hydrated
  }, []);

  useEffect(() => {
    // Redirect logic, only run after client hydration and auth state is determined
    if (isClientHydrated && user !== undefined) { // user !== undefined to ensure auth state is resolved
      if (!isAuthenticated) {
        router.replace('/login');
      }
    }
  }, [isAuthenticated, router, user, isClientHydrated]);

  // To prevent hydration mismatch:
  // 1. If not yet client-hydrated, render skeleton (matches server output).
  // 2. If client-hydrated but auth state is still "loading" (user is undefined by context's own logic, though our useAuth doesn't set it to undefined)
  //    OR user is not authenticated, render skeleton.
  //    The router.replace in useEffect will handle the redirect.
  if (!isClientHydrated || (user === undefined && isClientHydrated) || !isAuthenticated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="space-y-4 w-1/2 p-4 max-w-md"> {/* Consistent with typical loading screens */}
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-8 w-3/4" />
        </div>
      </div>
    );
  }
  
  // Only render children if client has hydrated AND user is defined AND authenticated.
  return <>{children}</>;
}
