"use client";

import React, { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import type { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Rocket, User as UserIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState(''); // Optional password
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      alert('Please enter a username.');
      return;
    }
    // Simple validation, password ignored for now
    const user: User = {
      id: `user-${Date.now()}`,
      username: username.trim(),
      isGuest: false,
    };
    login(user);
    router.push('/chat');
  };

  const handleGuestLogin = () => {
    const guestUsername = `Guest-${Math.random().toString(36).substring(2, 7)}`;
    const guestUser: User = {
      id: `guest-${Date.now()}`,
      username: guestUsername,
      isGuest: true,
    };
    login(guestUser);
    router.push('/chat');
  };

  return (
    <Card className="w-full max-w-md shadow-xl soft-glow-primary">
      <CardHeader className="text-center">
        <div className="flex justify-center items-center mb-4">
          <Rocket className="h-12 w-12 text-primary" />
        </div>
        <CardTitle className="text-3xl font-headline">Welcome to NebulaChat</CardTitle>
        <CardDescription>Connect and chat in a universe of rooms.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="text-base"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password (Optional)</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="text-base"
            />
          </div>
          <Button type="submit" className="w-full text-lg py-6">
            Login
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-center space-y-4">
        <div className="relative w-full flex items-center my-2">
          <div className="flex-grow border-t border-border"></div>
          <span className="flex-shrink mx-4 text-muted-foreground text-sm">OR</span>
          <div className="flex-grow border-t border-border"></div>
        </div>
        <Button variant="outline" onClick={handleGuestLogin} className="w-full text-lg py-6">
          <UserIcon className="mr-2 h-5 w-5" />
          Continue as Guest
        </Button>
      </CardFooter>
    </Card>
  );
}
