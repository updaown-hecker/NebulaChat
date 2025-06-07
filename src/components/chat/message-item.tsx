"use client";

import React from 'react';
import type { Message } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { Bot } from 'lucide-react';

interface MessageItemProps {
  message: Message;
}

export function MessageItem({ message }: MessageItemProps) {
  const { user: currentUser } = useAuth();
  const isCurrentUser = message.userId === currentUser?.id;
  const isAIMessage = message.isAIMessage;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg transition-all duration-150 ease-in-out",
        isCurrentUser ? "justify-end" : "justify-start",
        isAIMessage && !isCurrentUser ? "bg-secondary/50" : ""
      )}
    >
      {!isCurrentUser && (
        <Avatar className="h-8 w-8 border">
          {/* Placeholder for avatar image */}
          {/* <AvatarImage src={message.userAvatar} alt={message.username} /> */}
          <AvatarFallback className={cn(
            "text-xs",
            isAIMessage ? "bg-primary text-primary-foreground" : "bg-muted"
          )}>
            {isAIMessage ? <Bot size={16}/> : getInitials(message.username)}
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "max-w-[70%] p-3 rounded-xl shadow-sm",
          isCurrentUser
            ? "bg-primary text-primary-foreground rounded-br-none"
            : "bg-card text-card-foreground rounded-bl-none",
          isAIMessage && !isCurrentUser ? "bg-accent/20 text-foreground" : ""
        )}
      >
        {!isCurrentUser && (
          <p className="text-xs font-semibold mb-1 opacity-80">
            {message.username}
          </p>
        )}
        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        <p className={cn(
          "text-xs mt-1 opacity-60",
          isCurrentUser ? "text-right" : "text-left"
        )}>
          {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
        </p>
      </div>
      {isCurrentUser && (
        <Avatar className="h-8 w-8 border">
          {/* <AvatarImage src={currentUser?.avatar} alt={currentUser?.username || ""} /> */}
          <AvatarFallback className="text-xs bg-muted">
            {getInitials(currentUser?.username || "Me")}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
