
"use client";

import React, { useState } from 'react';
import type { Message } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import { useChat } from '@/contexts/chat-context';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { EditMessageDialog } from './edit-message-dialog';
import { formatDistanceToNow } from 'date-fns';
import { Bot, ShieldCheck, MoreHorizontal, Edit, Trash2, MessageSquare, CornerDownRight } from 'lucide-react';

interface MessageItemProps {
  message: Message;
}

export function MessageItem({ message }: MessageItemProps) {
  const { user: currentUser } = useAuth();
  const { allUsers, messages: allMessages, editMessage, deleteMessage, setReplyingTo } = useChat();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isCurrentUser = message.userId === currentUser?.id;
  const isAIMessage = message.isAIMessage;

  const sender = allUsers.find(u => u.id === message.userId);
  const senderIsAdmin = sender?.isAdmin;
  const canEdit = (currentUser?.id === message.userId || currentUser?.isAdmin === true) && !isAIMessage;
  const canDelete = (currentUser?.id === message.userId || currentUser?.isAdmin === true) && !isAIMessage;
  const canReply = !isAIMessage; // Anyone can reply to non-AI messages

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const handleEditSave = async (messageId: string, newContent: string) => {
    return editMessage(messageId, newContent);
  };

  const handleDeleteConfirm = async () => {
    await deleteMessage(message.id);
    setShowDeleteConfirm(false);
  };

  const handleReply = () => {
    setReplyingTo(message);
  };

  const displayTimestamp = message.isEdited && message.editedTimestamp
    ? formatDistanceToNow(new Date(message.editedTimestamp), { addSuffix: true })
    : formatDistanceToNow(new Date(message.timestamp), { addSuffix: true });

  const originalRepliedMessage = message.replyToMessageId 
    ? allMessages.find(m => m.id === message.replyToMessageId) 
    : null;

  return (
    <>
      <div
        className={cn(
          "flex items-start gap-3 p-3 rounded-lg transition-all duration-150 ease-in-out group relative",
          isCurrentUser ? "justify-end" : "justify-start",
          isAIMessage && !isCurrentUser ? "bg-secondary/50" : ""
        )}
      >
        {!isCurrentUser && (
          <Avatar className="h-8 w-8 border">
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
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs font-semibold opacity-80">
                {message.username}
              </p>
              {senderIsAdmin && !isAIMessage && (
                <Badge variant="secondary" className="px-1.5 py-0.5 text-xs h-fit">
                  <ShieldCheck className="mr-1 h-3 w-3 text-primary" /> Admin
                </Badge>
              )}
            </div>
          )}

          {message.replyToMessageId && message.replyToUsername && (
            <div className="mb-2 p-2 rounded-md bg-black/10 dark:bg-white/10 border-l-2 border-primary/50 text-xs">
              <div className="flex items-center gap-1 text-muted-foreground">
                <CornerDownRight size={12} className="inline-block" />
                Replying to <span className="font-semibold text-foreground">@{message.replyToUsername}</span>
              </div>
              {originalRepliedMessage && (
                <p className="mt-1 pl-4 text-foreground/80 truncate italic">
                  "{originalRepliedMessage.content}"
                </p>
              )}
            </div>
          )}

          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          <div className={cn(
            "text-xs mt-1 opacity-60 flex items-center",
            isCurrentUser ? "justify-end" : "justify-start"
          )}>
            <span>{displayTimestamp}</span>
            {message.isEdited && <span className="ml-1 text-xs opacity-70">(edited)</span>}
          </div>
        </div>
        {isCurrentUser && (
          <Avatar className="h-8 w-8 border">
            <AvatarFallback className={cn("text-xs bg-muted", currentUser?.isAdmin && "border-2 border-amber-500")}>
              {getInitials(currentUser?.username || "Me")}
            </AvatarFallback>
          </Avatar>
        )}
        {(canEdit || canDelete || canReply) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "absolute top-1 h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity",
                  isCurrentUser ? "left-1" : "right-1"
                )}
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Message options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isCurrentUser ? "end" : "start"}>
              {canReply && (
                <DropdownMenuItem onClick={handleReply}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  <span>Reply</span>
                </DropdownMenuItem>
              )}
              {canEdit && (
                <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  <span>Edit</span>
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem onClick={() => setShowDeleteConfirm(true)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Delete</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {canEdit && message && (
        <EditMessageDialog
          message={message}
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          onSave={handleEditSave}
        />
      )}

      {canDelete && (
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the message.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className={buttonVariants({variant: "destructive"})}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}

