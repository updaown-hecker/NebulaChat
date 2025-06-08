
"use client";

import React from 'react';
import { useChat } from '@/contexts/chat-context';
import { useAuth } from '@/contexts/auth-context'; // To get current user
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button'; // For DM button
import { Users, Info, Edit3, MessageSquare } from 'lucide-react';
import type { User } from '@/types';

export function RightSidebar() {
  const { currentRoom, allUsers, typingUsers, startDirectMessage } = useChat();
  const { user: currentUser } = useAuth();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const usersToList = allUsers.filter(u => u.id !== currentUser?.id); // Exclude current user

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        {currentRoom && (
          <div>
            <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              Room Details
            </h3>
            <div className="space-y-1 text-sm">
              <p><span className="font-medium">Name:</span> {
                currentRoom.id.startsWith('dm_') && currentUser && allUsers.length > 0
                  ? allUsers.find(u => currentRoom.members.includes(u.id) && u.id !== currentUser.id)?.username || currentRoom.name
                  : currentRoom.name
              }</p>
              <p><span className="font-medium">Type:</span> {currentRoom.isPrivate ? (currentRoom.id.startsWith('dm_') ? "Direct Message" : "Private Group") : "Public Group"}</p>
              <p><span className="font-medium">Members:</span> {currentRoom.members.length}</p>
            </div>
          </div>
        )}

        <div>
          <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Users ({usersToList.length})
          </h3>
          {usersToList.length > 0 ? (
            <ul className="space-y-2">
              {usersToList.map((user: User) => (
                <li key={user.id} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted transition-colors group">
                  <Avatar className="h-7 w-7 text-xs">
                    {user.avatar && <AvatarImage src={user.avatar} alt={user.username} />}
                    <AvatarFallback className="bg-secondary text-secondary-foreground">
                      {getInitials(user.username)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm truncate flex-1">{user.username}</span>
                  {typingUsers.find(tu => tu.id === user.id && tu.isTypingInRoomId === currentRoom?.id) && (
                    <Edit3 size={14} className="text-primary animate-pulse" title={`${user.username} is typing...`} />
                  )}
                  {user.isGuest && <Badge variant="outline" className="text-xs ml-auto mr-1">Guest</Badge>}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 focus:opacity-100"
                    onClick={() => startDirectMessage(user.id)}
                    title={`Message ${user.username}`}
                    aria-label={`Message ${user.username}`}
                  >
                    <MessageSquare size={16} />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No other users found.</p>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}
