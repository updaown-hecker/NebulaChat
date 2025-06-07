"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';
import { LOCAL_STORAGE_USER_KEY } from '@/lib/constants'; // Import the key


export default function HomePage() {
  const router = useRouter();
  // useAuth now correctly reflects account-based authentication.
  // For guest persistence across refresh, we still rely on direct localStorage check here temporarily
  // because `useAuth().user` might be null initially if no account is logged in.
  const { isAuthenticated, user: authContextUser } = useAuth(); 

  useEffect(() => {
    // Check for guest user from localStorage for initial redirect logic
    const guestUserItem = typeof window !== 'undefined' ? window.localStorage.getItem(LOCAL_STORAGE_USER_KEY) : null;
    let isGuestLoggedIn = false;
    if (guestUserItem) {
      try {
        const guestUser = JSON.parse(guestUserItem);
        if (guestUser && guestUser.isGuest) {
          isGuestLoggedIn = true;
        }
      } catch (e) {
        // Invalid JSON, treat as not logged in
      }
    }

    // Wait until auth state from context is determined (authContextUser is not undefined)
    // OR if a guest user is found in localStorage
    if (authContextUser !== undefined || isGuestLoggedIn) {
      if (isAuthenticated || isGuestLoggedIn) { // Authenticated user OR a guest from localStorage
        router.replace('/chat');
      } else {
        router.replace('/login');
      }
    }
  }, [isAuthenticated, authContextUser, router]);

  // Show a loading indicator while determining auth state
  // Render loading if authContextUser is undefined AND no guest found,
  // otherwise, the useEffect will handle redirection.
  const guestUserItem = typeof window !== 'undefined' ? window.localStorage.getItem(LOCAL_STORAGE_USER_KEY) : null;
  let showLoading = authContextUser === undefined;
  if (guestUserItem) {
    try {
      const guestUser = JSON.parse(guestUserItem);
      if (guestUser && guestUser.isGuest) {
        showLoading = false; // Guest found, useEffect will redirect to /chat
      }
    } catch (e) { /* ignore */ }
  }


  if (showLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading NebulaChat...</p>
      </div>
    );
  }

  // Fallback loading, though useEffect should redirect quickly.
  return (
     <div className="flex h-screen w-screen items-center justify-center bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="ml-4 text-lg text-muted-foreground">Loading NebulaChat...</p>
    </div>
  );
}
