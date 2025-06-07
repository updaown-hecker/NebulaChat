
"use client";

import React from 'react';
import { useChat } from '@/contexts/chat-context';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, Info, Edit3 } from 'lucide-react'; // Added Edit3 for typing indicator
import type { User } from '@/types'; // Import User type for clarity

export function RightSidebar() {
  const { currentRoom, onlineUsers, typingUsers } = useChat(); // Added typingUsers

  if (!currentRoom) {
    return (
      <div className="p-4 text-sm text-muted-foreground h-full flex items-center justify-center">
        <Info className="w-8 h-8 mb-2 opacity-50" />
        <span>No room selected.</span>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Filter onlineUsers to only those who are members of the currentRoom
  // This assumes onlineUsers from context might contain users not in the current room's member list.
  // However, ChatContext's onlineUsers logic is already attempting to derive based on currentRoom members + allUsers.
  // So, this explicit filter might be redundant if ChatContext is perfect, but good for safety.
  const usersInCurrentRoom = onlineUsers.filter(ou => currentRoom.members.includes(ou.id));


  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        <div>
          <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            Room Details
          </h3>
          <div className="space-y-1 text-sm">
            <p><span className="font-medium">Name:</span> {currentRoom.name}</p>
            <p><span className="font-medium">Type:</span> {currentRoom.isPrivate ? "Private" : "Public"}</p>
            <p><span className="font-medium">Members:</span> {currentRoom.members.length}</p>
          </div>
        </div>
        
        <div>
          <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Online Users ({usersInCurrentRoom.length})
          </h3>
          {usersInCurrentRoom.length > 0 ? (
            <ul className="space-y-2">
              {usersInCurrentRoom.map((user: User) => ( // Explicitly type user
                <li key={user.id} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted transition-colors">
                  <Avatar className="h-7 w-7 text-xs">
                    {user.avatar && <AvatarImage src={user.avatar} alt={user.username} />}
                    <AvatarFallback className="bg-secondary text-secondary-foreground">
                      {getInitials(user.username)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm truncate flex-1">{user.username}</span>
                  {typingUsers.find(tu => tu.id === user.id) && (
                    <Edit3 size={14} className="text-primary animate-pulse" title={`${user.username} is typing...`} />
                  )}
                  {user.isGuest && <Badge variant="outline" className="text-xs ml-auto">Guest</Badge>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No users currently online in this room.</p>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}
