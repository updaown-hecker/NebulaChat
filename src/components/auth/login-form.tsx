
"use client";

import React, { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import type { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Rocket, User as UserIcon, KeyRound, LogIn, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { LOCAL_STORAGE_USER_KEY } from '@/lib/constants'; // Still needed for direct guest manipulation if authContext.login special path for guest is not used

export function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const { login, register } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast({ title: "Validation Error", description: "Please enter a username.", variant: "destructive" });
      return;
    }
    if (isRegisterMode && !password.trim()) {
        toast({ title: "Validation Error", description: "Please enter a password for registration.", variant: "destructive" });
        return;
    }

    let success = false;
    if (isRegisterMode) {
      success = await register(username.trim(), password);
    } else {
      success = await login(username.trim(), password);
    }

    if (success) {
      router.push('/chat'); // Or router.replace('/') which then redirects
    }
  };

  const handleGuestLogin = async () => {
    const guestUsername = `Guest-${Math.random().toString(36).substring(2, 7)}`;
    // The login function in AuthContext now has a third parameter `isGuestAttempt`
    // We use that to signal a guest login, which will be handled client-side by AuthContext.
    const success = await login(guestUsername, undefined, true);
    if (success) {
      router.push('/chat'); // Or router.replace('/')
    } else {
      // This path should ideally not be reached if guest login in AuthContext is implemented correctly
      toast({ title: "Guest Login Failed", description: "Could not log in as guest.", variant: "destructive"});
    }
  };

  const toggleMode = () => {
    setIsRegisterMode(!isRegisterMode);
    setUsername('');
    setPassword('');
  };

  return (
    <Card className="w-full max-w-md shadow-xl soft-glow-primary">
      <CardHeader className="text-center">
        <div className="flex justify-center items-center mb-4">
          <Rocket className="h-12 w-12 text-primary" />
        </div>
        <CardTitle className="text-3xl font-headline">
          {isRegisterMode ? 'Create NebulaChat Account' : 'Welcome to NebulaChat'}
        </CardTitle>
        <CardDescription>
          {isRegisterMode ? 'Join our universe of rooms.' : 'Connect and chat in a universe of rooms.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
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
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder={isRegisterMode ? "Choose a password" : "Enter your password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              // Password is required for register mode.
              // For login mode, it depends on if the account was set up with one.
              // The flows will handle this logic. Input field itself is always present.
              required={isRegisterMode} 
              className="text-base"
            />
          </div>
          <Button type="submit" className="w-full text-lg py-6">
            {isRegisterMode ? <UserPlus className="mr-2 h-5 w-5" /> : <LogIn className="mr-2 h-5 w-5" />}
            {isRegisterMode ? 'Create Account' : 'Login'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-center space-y-4">
        <Button variant="link" onClick={toggleMode} className="text-sm">
          {isRegisterMode ? 'Already have an account? Login' : "Don't have an account? Create one"}
        </Button>
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
