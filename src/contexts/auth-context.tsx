"use client";

import type { User } from '@/types';
import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import useLocalStorage from '@/hooks/use-local-storage';
import { LOCAL_STORAGE_USER_KEY, LOCAL_STORAGE_ACCOUNTS_KEY } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  login: (username: string, password?: string) => Promise<boolean>;
  logout: () => void;
  register: (username: string, password?: string) => Promise<boolean>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useLocalStorage<User | null>(LOCAL_STORAGE_USER_KEY, null);
  const [accounts, setAccounts] = useLocalStorage<User[]>(LOCAL_STORAGE_ACCOUNTS_KEY, []);
  const { toast } = useToast();

  const login = async (username: string, password?: string): Promise<boolean> => {
    const existingUser = accounts.find(acc => acc.username === username);
    if (existingUser) {
      // In a real app, securely compare hashed passwords. Here, we'll do a simple check.
      if (existingUser.password === password || (!existingUser.password && !password)) { // Allows login if no password was set and none provided
        const loggedInUser: User = { ...existingUser, isGuest: false };
        setUser(loggedInUser);
        toast({ title: "Login Successful", description: `Welcome back, ${username}!` });
        return true;
      } else {
        toast({ title: "Login Failed", description: "Invalid username or password.", variant: "destructive" });
        return false;
      }
    }
    toast({ title: "Login Failed", description: "User not found.", variant: "destructive" });
    return false;
  };

  const register = async (username: string, password?: string): Promise<boolean> => {
    if (accounts.some(acc => acc.username === username)) {
      toast({ title: "Registration Failed", description: "Username already exists.", variant: "destructive" });
      return false;
    }
    const newUser: User = {
      id: `user-${Date.now()}`,
      username,
      password, // Storing password directly is insecure for real apps!
      isGuest: false,
    };
    setAccounts(prevAccounts => [...prevAccounts, newUser]);
    setUser(newUser);
    toast({ title: "Registration Successful", description: `Welcome, ${username}! Your account has been created.` });
    return true;
  };

  const logout = () => {
    setUser(null);
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
  };

  const isAuthenticated = useMemo(() => !!user && !user.isGuest, [user]); // Guests are not "authenticated" in the sense of having an account

  return (
    <AuthContext.Provider value={{ user, login, logout, register, isAuthenticated }}>
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
