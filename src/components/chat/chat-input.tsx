"use client";

import React, { useState } from 'react';
import { useChat } from '@/contexts/chat-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Smile } from 'lucide-react'; // Smile for emoji placeholder
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const EMOJIS = ['😀', '😂', '😍', '🤔', '👍', '🎉', '❤️', '🔥'];


export function ChatInput() {
  const [message, setMessage] = useState('');
  const { sendMessage, currentRoom, isLoadingAiResponse } = useChat();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !currentRoom || isLoadingAiResponse) return;
    await sendMessage(message.trim());
    setMessage('');
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
  }

  if (!currentRoom) return null;

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t bg-background">
      <div className="relative flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" type="button" className="shrink-0">
              <Smile className="h-5 w-5" />
              <span className="sr-only">Add emoji</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <div className="grid grid-cols-4 gap-1">
              {EMOJIS.map(emoji => (
                <Button 
                  key={emoji} 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleEmojiSelect(emoji)}
                  className="text-xl"
                >
                  {emoji}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <Input
          type="text"
          placeholder={isLoadingAiResponse ? "NebulaAI is thinking..." : `Message #${currentRoom.name}... (try /help)`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="flex-1 text-base pr-12" // pr-12 for send button
          disabled={isLoadingAiResponse}
          autoFocus
        />
        <Button 
          type="submit" 
          size="icon" 
          className="absolute right-2 top-1/2 -translate-y-1/2"
          disabled={!message.trim() || isLoadingAiResponse}
          aria-label="Send message"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </form>
  );
}
