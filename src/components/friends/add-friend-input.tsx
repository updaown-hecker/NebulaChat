
"use client";

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AddFriendInputProps {
  onAddFriend: (username: string) => Promise<void>;
}

export function AddFriendInput({ onAddFriend }: AddFriendInputProps) {
  const [username, setUsername] = useState('');
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast({
        title: "Username Required",
        description: "Please enter a username to send a friend request.",
        variant: "destructive",
      });
      return;
    }
    await onAddFriend(username.trim());
    setUsername(''); // Clear input after attempt
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input
        type="text"
        placeholder="Enter username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="h-9 max-w-xs text-sm"
      />
      <Button type="submit" size="sm" className="h-9">
        <UserPlus className="mr-2 h-4 w-4" />
        Send Request
      </Button>
    </form>
  );
}
