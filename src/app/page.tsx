"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';


export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth(); // user can be null, User, or undefined (initial state)

  useEffect(() => {
    // Wait until auth state is determined (user is not undefined)
    if (user !== undefined) {
      if (isAuthenticated) {
        router.replace('/chat');
      } else {
        router.replace('/login');
      }
    }
  }, [isAuthenticated, router, user]);

  // Show a loading indicator while determining auth state
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="ml-4 text-lg text-muted-foreground">Loading NebulaChat...</p>
    </div>
  );
}
