
"use client";

import React from 'react';
import type { User } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageSquare, UserMinus, UserPlus, Check, X, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';

interface UserListItemProps {
  user: User;
  currentUser: User;
  type: 'friend' | 'pending-received' | 'pending-sent' | 'search-result';
  onMessage?: () => void;
  onRemoveFriend?: () => void;
  onAcceptRequest?: () => void;
  onDeclineRequest?: () => void;
  onCancelRequest?: () => void; // For canceling a sent request
  onSendRequest?: () => void;   // For sending a new request from search
}

export function UserListItem({
  user,
  currentUser,
  type,
  onMessage,
  onRemoveFriend,
  onAcceptRequest,
  onDeclineRequest,
  onCancelRequest,
  onSendRequest,
}: UserListItemProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <li className="flex items-center p-3 hover:bg-muted/50 rounded-md transition-colors border-b">
      <Avatar className="h-10 w-10 mr-3">
        {user.avatar && <AvatarImage src={user.avatar} alt={user.username} />}
        <AvatarFallback className={cn(user.isAdmin && "border-2 border-primary")}>{getInitials(user.username)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <p className="text-sm font-medium text-foreground truncate">{user.username}</p>
          {user.isAdmin && <Badge variant="outline" className="px-1.5 py-0.5 text-xs border-primary text-primary"><ShieldCheck className="h-3 w-3"/> </Badge>}
          {user.isGuest && <Badge variant="outline" className="text-xs">Guest</Badge>}
        </div>
        {/* Could add status here if available, e.g., "Online", "Playing X" */}
        {type === 'friend' && <p className="text-xs text-muted-foreground">Friend</p>}
        {type === 'pending-received' && <p className="text-xs text-yellow-500">Incoming Friend Request</p>}
        {type === 'pending-sent' && <p className="text-xs text-blue-500">Friend Request Sent</p>}
      </div>
      <div className="flex items-center gap-2 ml-auto">
        {type === 'friend' && (
          <>
            {onMessage && (
              <Button variant="ghost" size="icon" onClick={onMessage} title="Message">
                <MessageSquare className="h-5 w-5" />
              </Button>
            )}
            {onRemoveFriend && (
              <Button variant="ghost" size="icon" onClick={onRemoveFriend} title="Remove Friend" className="text-destructive hover:text-destructive">
                <UserMinus className="h-5 w-5" />
              </Button>
            )}
          </>
        )}
        {type === 'pending-received' && (
          <>
            {onAcceptRequest && (
              <Button variant="ghost" size="icon" onClick={onAcceptRequest} title="Accept Request" className="text-green-500 hover:text-green-600">
                <Check className="h-5 w-5" />
              </Button>
            )}
            {onDeclineRequest && (
              <Button variant="ghost" size="icon" onClick={onDeclineRequest} title="Decline Request" className="text-destructive hover:text-destructive">
                <X className="h-5 w-5" />
              </Button>
            )}
          </>
        )}
        {type === 'pending-sent' && (
           <>
            {onMessage && ( // Allow messaging even if request is pending
              <Button variant="ghost" size="icon" onClick={onMessage} title="Message">
                <MessageSquare className="h-5 w-5" />
              </Button>
            )}
            {onCancelRequest && (
              <Button variant="ghost" size="icon" onClick={onCancelRequest} title="Cancel Sent Request" className="text-destructive hover:text-destructive">
                <X className="h-5 w-5" />
              </Button>
            )}
          </>
        )}
         {type === 'search-result' && !currentUser.friendIds?.includes(user.id) && !currentUser.pendingFriendRequestsReceived?.includes(user.id) && !currentUser.sentFriendRequests?.includes(user.id) && (
          // Show add friend button only if not already friends or request pending
          <>
             {onMessage && (
              <Button variant="ghost" size="icon" onClick={onMessage} title="Message">
                <MessageSquare className="h-5 w-5" />
              </Button>
            )}
            {onSendRequest && (
              <Button variant="default" size="sm" onClick={onSendRequest}>
                <UserPlus className="mr-2 h-4 w-4" /> Add Friend
              </Button>
            )}
          </>
        )}
      </div>
    </li>
  );
}
