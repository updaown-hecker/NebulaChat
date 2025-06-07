"use client";

import React, { useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

export function AuthGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(true);

  useEffect(() => {
    // Check for user on initial load (from local storage)
    // The useAuth hook handles local storage, so isAuthenticated will update
    // We add a small delay or check to prevent flash of login page if user is already loaded
    if (user === undefined) { // Still loading from local storage
        // Wait for user to be loaded
        return;
    }
    
    if (!isAuthenticated) {
      router.replace('/login');
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated, router, user]);

  if (isLoading && !isAuthenticated) {
    // Show a loading state or a blank page while checking auth
    // This helps prevent flashing the login page unnecessarily
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="space-y-4 w-1/2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-8 w-3/4" />
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) return null; // Or a loading spinner

  return <>{children}</>;
}
