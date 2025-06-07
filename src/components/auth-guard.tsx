"use client";

import React, { useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

export function AuthGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait until auth state is determined (user is not undefined)
    // This effect will run on the client after hydration.
    if (user !== undefined) {
      if (!isAuthenticated) {
        router.replace('/login');
      }
    }
  }, [isAuthenticated, router, user]);

  // If user auth state is still loading (user is undefined),
  // OR if user is determined to be not authenticated (in which case a redirect from useEffect is pending),
  // render a loading skeleton.
  // This ensures the server render (where user is initially null, thus !isAuthenticated is true)
  // and the initial client render (where user might be undefined) output the same skeleton.
  if (user === undefined || !isAuthenticated) {
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
  
  // Only if user is defined and authenticated, render children.
  // This will happen on the client after auth state is confirmed.
  return <>{children}</>;
}
