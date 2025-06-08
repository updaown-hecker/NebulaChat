
"use client";

import React from 'react';
import { useChat } from '@/contexts/chat-context';
import { useAuth } from '@/contexts/auth-context'; 
import type { Room, User } from '@/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { User as UserIcon } from 'lucide-react'; 

interface DirectMessageListProps {
  // Props if any
}

export function DirectMessageList({}: DirectMessageListProps) {
  const { rooms: allRooms, currentRoom, joinRoom, unreadRoomIds, allUsers } = useChat();
  const { user: currentUser } = useAuth();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const directMessages = React.useMemo(() => {
    if (!currentUser) return [];
    return allRooms.filter(room => 
      room.id.startsWith('dm_') && room.members.includes(currentUser.id)
    );
  }, [allRooms, currentUser]);

  if (!currentUser) {
     return <p className="p-4 text-sm text-muted-foreground">Login to see direct messages.</p>;
  }

  if (!directMessages.length) {
    return <p className="p-4 text-sm text-muted-foreground">No direct messages yet. Start a chat from a user's profile!</p>;
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2 space-y-1">
        {directMessages.map((dmRoom) => {
          const otherMemberId = dmRoom.members.find(memberId => memberId !== currentUser.id);
          const otherUser = allUsers.find(u => u.id === otherMemberId);
          const displayName = otherUser ? otherUser.username : "Direct Message";
          const avatarSrc = otherUser?.avatar;

          return (
            <Button
              key={dmRoom.id}
              variant={currentRoom?.id === dmRoom.id ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-2 text-sm relative",
                currentRoom?.id === dmRoom.id && "bg-accent text-accent-foreground"
              )}
              onClick={() => joinRoom(dmRoom.id)}
              title={displayName}
            >
              <Avatar className="h-5 w-5 text-xs">
                {avatarSrc && <AvatarImage src={avatarSrc} alt={displayName} />}
                <AvatarFallback className="bg-muted text-muted-foreground text-[0.6rem]">
                  {otherUser ? getInitials(otherUser.username) : <UserIcon size={10}/>}
                </AvatarFallback>
              </Avatar>
              <span className={cn(
                "truncate flex-1 text-left",
                unreadRoomIds[dmRoom.id] && currentRoom?.id !== dmRoom.id && "font-bold"
              )}>{displayName}</span>
              {unreadRoomIds[dmRoom.id] && currentRoom?.id !== dmRoom.id && (
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
