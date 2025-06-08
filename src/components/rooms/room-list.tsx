
"use client";

import React from 'react';
import { useChat } from '@/contexts/chat-context';
import { useAuth } from '@/contexts/auth-context'; 
import type { Room } from '@/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Lock, Hash, User as UserIcon } from 'lucide-react'; 

interface RoomListProps {
  // Props if any
}

export function RoomList({}: RoomListProps) {
  const { rooms: allRooms, currentRoom, joinRoom, unreadRoomIds, allUsers } = useChat();
  const { user: currentUser } = useAuth();

  const getDmDisplayName = (room: Room): string => {
    if (!currentUser || !room.id.startsWith('dm_') || room.members.length !== 2) {
      return room.name; 
    }
    const otherMemberId = room.members.find(memberId => memberId !== currentUser.id);
    if (!otherMemberId) return room.name; 

    const otherUser = allUsers.find(u => u.id === otherMemberId);
    return otherUser ? otherUser.username : "Direct Message"; // Fallback name if user not found
  };

  // Filter rooms: show public rooms, and private rooms (including DMs) where current user is a member
  const filteredRooms = React.useMemo(() => {
    if (!currentUser) { // For guests or if user data not loaded, show only public rooms
      return allRooms.filter(room => !room.isPrivate);
    }
    return allRooms.filter(room => {
      if (!room.isPrivate) return true; // Include all public rooms
      return room.members.includes(currentUser.id); // Include private rooms if user is a member
    });
  }, [allRooms, currentUser]);

  if (!filteredRooms.length) {
    return <p className="p-4 text-sm text-muted-foreground">No rooms available. Create one or start a DM!</p>;
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2 space-y-1">
        {filteredRooms.map((room) => {
          // A room is considered a DM if its ID starts with 'dm_', it's private, has exactly two members, AND the current user is one of them.
          const isDM = room.id.startsWith('dm_') && room.isPrivate && room.members.length === 2 && currentUser && room.members.includes(currentUser.id);
          const displayName = isDM ? getDmDisplayName(room) : room.name;
          const Icon = isDM ? UserIcon : room.isPrivate ? Lock : Hash;

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
