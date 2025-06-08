
"use client";

import type { User } from '@/types';
import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import useLocalStorage from '@/hooks/use-local-storage';
import { LOCAL_STORAGE_USER_KEY } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { loginUser, registerUser } from '@/ai/flows/auth-flow'; // Import new simulated auth flows

interface AuthContextType {
  user: User | null;
  login: (username: string, password?: string, isGuestAttempt?: boolean) => Promise<boolean>;
  logout: () => void;
  register: (username: string, password?: string) => Promise<boolean>;
  isAuthenticated: boolean;
  updateUser: (updatedUserData: Partial<User>) => void; // New
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useLocalStorage<User | null>(LOCAL_STORAGE_USER_KEY, null);
  // Accounts list is no longer managed in localStorage by AuthContext; it's simulated by auth-flow.ts
  const { toast } = useToast();

  const login = async (username: string, password?: string, isGuestAttempt?: boolean): Promise<boolean> => {
    if (isGuestAttempt) {
      // Handle guest login directly (client-side only)
      const guestUser: User = {
        id: `guest-${Date.now()}`,
        username: username, // username is pre-generated for guests in LoginForm
        isGuest: true,
        friendIds: [],
        pendingFriendRequestsReceived: [],
        sentFriendRequests: [],
      };
      setUser(guestUser);
      // No toast for guest login, it's usually silent
      return true;
    }

    // Account-based login, call simulated server flow
    try {
      const response = await loginUser({ username, password });
      if (response.success && response.user) {
        setUser(response.user); // response.user should not contain password
        toast({ title: "Login Successful", description: `Welcome back, ${response.user.username}!` });
        return true;
      } else {
        toast({ title: "Login Failed", description: response.message || "Invalid credentials.", variant: "destructive" });
        return false;
      }
    } catch (error) {
      console.error("Login flow error:", error);
      toast({ title: "Login Error", description: "Could not connect to login service.", variant: "destructive" });
      return false;
    }
  };

  const register = async (username: string, password?: string): Promise<boolean> => {
    try {
      const response = await registerUser({ username, password });
      if (response.success && response.user) {
        setUser(response.user); // response.user should not contain password
        toast({ title: "Registration Successful", description: `Welcome, ${response.user.username}! Your account has been created.` });
        return true;
      } else {
        toast({ title: "Registration Failed", description: response.message || "Could not create account.", variant: "destructive" });
        return false;
      }
    } catch (error) {
      console.error("Register flow error:", error);
      toast({ title: "Registration Error", description: "Could not connect to registration service.", variant: "destructive" });
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
  };

  const updateUser = (updatedUserData: Partial<User>) => {
    // Ensure user is not null before attempting to update
    setUser(prevUser => {
      if (prevUser === null) {
        // This case should ideally not happen if updateUser is called for an authenticated user.
        // But as a safeguard, if prevUser is null, we could either log an error,
        // or if updatedUserData contains enough to be a full user, set it.
        // For now, let's assume prevUser is not null if this is called correctly.
        // If updatedUserData is a full User object and prevUser was null, this would be the way:
        // return updatedUserData as User; 
        // However, to merge, prevUser must exist.
        return prevUser;
      }
      return { ...prevUser, ...updatedUserData };
    });
  };


  const isAuthenticated = useMemo(() => !!user && !user.isGuest, [user]);

  return (
    <AuthContext.Provider value={{ user, login, logout, register, isAuthenticated, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
