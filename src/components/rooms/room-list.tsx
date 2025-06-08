
"use client";

import React from 'react';
import { useChat } from '@/contexts/chat-context';
import { useAuth } from '@/contexts/auth-context'; 
import type { Room } from '@/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Lock, Hash } from 'lucide-react'; 

interface RoomListProps {
  // Props if any
}

export function RoomList({}: RoomListProps) {
  const { rooms: allRooms, currentRoom, joinRoom, unreadRoomIds } = useChat();
  const { user: currentUser } = useAuth();

  // Filter rooms: show public rooms, and private rooms (excluding DMs) where current user is a member
  const groupRooms = React.useMemo(() => {
    if (!currentUser) { // For guests or if user data not loaded, show only public non-DM rooms
      return allRooms.filter(room => !room.isPrivate && !room.id.startsWith('dm_'));
    }
    return allRooms.filter(room => {
      if (room.id.startsWith('dm_')) return false; // Exclude DMs
      if (!room.isPrivate) return true; // Include all public rooms
      return room.members.includes(currentUser.id); // Include private rooms if user is a member
    });
  }, [allRooms, currentUser]);

  if (!groupRooms.length) {
    return <p className="p-4 text-sm text-muted-foreground">No group rooms available. Create one!</p>;
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2 space-y-1">
        {groupRooms.map((room) => {
          const Icon = room.isPrivate ? Lock : Hash;
          const displayName = room.name;

          return (
            <Button
              key={room.id}
              variant={currentRoom?.id === room.id ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-2 text-sm relative",
                currentRoom?.id === room.id && "bg-accent text-accent-foreground"
              )}
              onClick={() => joinRoom(room.id)}
              title={displayName}
            >
              <Icon className="h-4 w-4" />
              <span className={cn(
                "truncate flex-1 text-left",
                unreadRoomIds[room.id] && currentRoom?.id !== room.id && "font-bold"
              )}>{displayName}</span>
              {unreadRoomIds[room.id] && currentRoom?.id !== room.id && (
                <span
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-primary"
                  aria-label="New messages"
                ></span>
              )}
            </Button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
