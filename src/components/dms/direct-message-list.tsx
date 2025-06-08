
"use client";

import React, { useState } from 'react'; // Added useState
import { useChat } from '@/contexts/chat-context';
import { useAuth } from '@/contexts/auth-context'; 
import type { Room, User } from '@/types';
import { Button, buttonVariants } from '@/components/ui/button'; // Added buttonVariants
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import { User as UserIcon, MoreHorizontal, Trash2 } from 'lucide-react'; 

interface DirectMessageListProps {
  // Props if any
}

export function DirectMessageList({}: DirectMessageListProps) {
  const { rooms: allRooms, currentRoom, joinRoom, unreadRoomIds, allUsers, leaveDm } = useChat();
  const { user: currentUser } = useAuth();
  const [dmToLeave, setDmToLeave] = useState<Room | null>(null);

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

  const handleLeaveDmConfirm = async () => {
    if (dmToLeave) {
      await leaveDm(dmToLeave.id);
      setDmToLeave(null); // Close dialog
    }
  };

  if (!currentUser) {
     return <p className="p-4 text-sm text-muted-foreground">Login to see direct messages.</p>;
  }

  if (!directMessages.length) {
    return <p className="p-4 text-sm text-muted-foreground">No direct messages yet. Start a chat from a user's profile!</p>;
  }

  return (
    <>
      <ScrollArea className="h-full">
        <div className="p-2 space-y-1">
          {directMessages.map((dmRoom) => {
            const otherMemberId = dmRoom.members.find(memberId => memberId !== currentUser.id);
            const otherUser = allUsers.find(u => u.id === otherMemberId);
            const displayName = otherUser ? otherUser.username : "Direct Message";
            const avatarSrc = otherUser?.avatar;

            return (
              <div key={dmRoom.id} className="group relative flex items-center">
                <Button
                  variant={currentRoom?.id === dmRoom.id ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-2 text-sm",
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
                      className="h-2.5 w-2.5 rounded-full bg-primary"
                      aria-label="New messages"
                    ></span>
                  )}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 opacity-0 group-hover:opacity-100 focus:opacity-100"
                      aria-label="DM options"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setDmToLeave(dmRoom)} className="text-destructive focus:text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Leave Chat
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {dmToLeave && (
        <AlertDialog open={!!dmToLeave} onOpenChange={(open) => !open && setDmToLeave(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Leave Direct Message?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to leave this DM? This will hide the chat from your list.
                The other user will still see the chat history unless they also leave.
                If both users leave, the chat will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDmToLeave(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleLeaveDmConfirm} className={buttonVariants({variant: "destructive"})}>
                Leave
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
