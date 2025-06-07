
"use client";

import React, { useEffect, useRef } from 'react';
import { useChat } from '@/contexts/chat-context';
import { MessageItem } from './message-item';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Bot, Loader2, MessageCircle, ServerCrash } from 'lucide-react'; // Added Loader2 and ServerCrash
import { Avatar, AvatarFallback } from '@/components/ui/avatar'; // Added Avatar components

export function MessageList() {
  const { messages, currentRoom, isLoadingAiResponse, isLoadingInitialData } = useChat();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
    }
  }, [messages, isLoadingAiResponse]);

  if (isLoadingInitialData) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
        <Loader2 className="w-16 h-16 mb-4 opacity-50 animate-spin" />
        <h2 className="text-xl font-semibold">Loading Chat Data...</h2>
        <p className="text-center">Fetching the latest messages and rooms.</p>
      </div>
    );
  }

  if (!currentRoom) {
    // Check if rooms exist to suggest creating one if none are available.
    // This requires access to `rooms` from useChat, if not already available, might need adjustment.
    // Assuming rooms are available if not isLoadingInitialData and no currentRoom.
    // For now, keeping the message simple.
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
        <MessageCircle className="w-16 h-16 mb-4 opacity-50" />
        <h2 className="text-xl font-semibold">No room selected</h2>
        <p className="text-center">Select a room from the sidebar to start chatting, or create a new one!</p>
      </div>
    );
  }
  
  const filteredMessages = messages.filter(msg => msg.roomId === currentRoom?.id);

  // Handle case where messages for the current room might still be loading or failed to load
  // This is a simplified check. A more robust solution might involve specific error states.
  if (!messages && !isLoadingInitialData) { // Assuming messages would be non-null after initial load
     return (
      <div className="flex flex-col items-center justify-center h-full text-destructive p-8">
        <ServerCrash className="w-16 h-16 mb-4 opacity-50" />
        <h2 className="text-xl font-semibold">Error Loading Messages</h2>
        <p className="text-center">Could not load messages for this room. Please try again later.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full flex-1 p-4" ref={scrollAreaRef} viewportRef={viewportRef}>
      <div className="space-y-4">
        {filteredMessages.map(message => (
          <MessageItem key={message.id} message={message} />
        ))}
        {isLoadingAiResponse && (
          <div className="flex items-start gap-3 p-3 rounded-lg">
            <Avatar className="h-8 w-8 border">
              <AvatarFallback className="text-xs bg-primary text-primary-foreground"><Bot size={16}/></AvatarFallback>
            </Avatar>
            <div className="max-w-[70%] p-3 rounded-xl shadow-sm bg-accent/20 text-foreground rounded-bl-none">
              <p className="text-xs font-semibold mb-1 opacity-80">NebulaAI</p>
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
