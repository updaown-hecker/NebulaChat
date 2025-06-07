
"use client";

import React, { useState, useEffect } from 'react';
import { useChat } from '@/contexts/chat-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Smile, Paperclip } from 'lucide-react'; 
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';

const EMOJIS = ['😀', '😂', '😍', '🤔', '👍', '🎉', '❤️', '🔥'];

export function ChatInput() {
  const [message, setMessage] = useState('');
  const { sendMessage, currentRoom, isLoadingAiResponse, setUserTyping } = useChat();
  const { toast } = useToast();

  const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Cleanup timeout on unmount
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (message.trim()) { // If unmounting with text, send stop typing
        setUserTyping(false);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setUserTyping, message]); // message dependency to handle unmount case

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newText = e.target.value;
    setMessage(newText);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (newText.trim()) {
      setUserTyping(true); // Indicate start of typing immediately (debounced by context)
      typingTimeoutRef.current = setTimeout(() => {
        setUserTyping(false); // Send stop typing if paused for too long
      }, 3000); // e.g., 3 seconds of inactivity
    } else {
      setUserTyping(false); // Empty input, stop typing
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !currentRoom || isLoadingAiResponse) return;
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setUserTyping(false); // Stop typing on send
    
    await sendMessage(message.trim());
    setMessage('');
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
    // Optionally trigger typing status update here too if desired
    setUserTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setUserTyping(false), 3000);
  }

  const handleUploadClick = () => {
    toast({
      title: "Upload (Coming Soon!)",
      description: "File upload functionality will be implemented here.",
    });
  };

  const handleInputBlur = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    // Only send stop typing if there was text, to avoid redundant calls
    if (message.trim()) { 
      setUserTyping(false);
    }
  };

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
        <Button
          variant="ghost"
          size="icon"
          type="button"
          className="shrink-0"
          onClick={handleUploadClick}
          disabled={isLoadingAiResponse}
          aria-label="Attach file"
        >
          <Paperclip className="h-5 w-5" />
          <span className="sr-only">Attach file</span>
        </Button>
        <Input
          type="text"
          placeholder={isLoadingAiResponse ? "NebulaAI is thinking..." : `Message #${currentRoom.name}... (try /help)`}
          value={message}
          onChange={handleInputChange}
          onBlur={handleInputBlur} // Handle stop typing on blur
          className="flex-1 text-base pr-12"
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
