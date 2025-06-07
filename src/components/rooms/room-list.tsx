"use client";

import React from 'react';
import { useChat } from '@/contexts/chat-context';
import type { Room } from '@/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Lock, Hash } from 'lucide-react';

interface RoomListProps {
  // Props if any
}

export function RoomList({}: RoomListProps) {
  const { rooms, currentRoom, joinRoom } = useChat();

  if (!rooms.length) {
    return <p className="p-4 text-sm text-muted-foreground">No rooms available. Create one!</p>;
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2 space-y-1">
        {rooms.map((room) => (
          <Button
            key={room.id}
            variant={currentRoom?.id === room.id ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start gap-2 text-sm",
              currentRoom?.id === room.id && "bg-accent text-accent-foreground"
            )}
            onClick={() => joinRoom(room.id)}
            title={room.name}
          >
            {room.isPrivate ? <Lock className="h-4 w-4" /> : <Hash className="h-4 w-4" />}
            <span className="truncate flex-1 text-left">{room.name}</span>
          </Button>
        ))}
      </div>
    </ScrollArea>
  );
}
