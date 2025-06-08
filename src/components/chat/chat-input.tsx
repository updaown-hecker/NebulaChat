
"use client";

import React, { useState, useEffect } from 'react';
import { useChat } from '@/contexts/chat-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Smile, Paperclip, X, CornerDownRight } from 'lucide-react'; 
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const EMOJIS = ['😀', '😂', '😍', '🤔', '👍', '🎉', '❤️', '🔥'];

export function ChatInput() {
  const [message, setMessage] = useState('');
  const { sendMessage, currentRoom, isLoadingAiResponse, setUserTyping, replyingToMessage, setReplyingTo } = useChat();
  const { toast } = useToast();

  const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Cleanup timeout on unmount
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (message.trim()) { 
        setUserTyping(false);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setUserTyping, message]); 

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newText = e.target.value;
    setMessage(newText);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (newText.trim()) {
      setUserTyping(true); 
      typingTimeoutRef.current = setTimeout(() => {
        setUserTyping(false); 
      }, 3000); 
    } else {
      setUserTyping(false); 
      if (replyingToMessage) { // If input is cleared and was replying, cancel reply
        setReplyingTo(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !currentRoom || isLoadingAiResponse) return;
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setUserTyping(false); 
    
    await sendMessage(message.trim());
    setMessage('');
    // setReplyingTo(null); // Handled by sendMessage in context now
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
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
    if (message.trim()) { 
      setUserTyping(false);
    }
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  if (!currentRoom) return null;

  return (
    <div className="p-4 border-t bg-background">
      {replyingToMessage && (
        <div className="mb-2 p-2 text-sm bg-muted rounded-md flex justify-between items-center shadow">
          <div className="flex-1 overflow-hidden">
            <div className="flex items-center text-muted-foreground">
              <CornerDownRight size={14} className="mr-1 shrink-0" />
              Replying to <span className="font-semibold text-foreground ml-1">@{replyingToMessage.username}</span>
            </div>
            <p className="text-xs text-muted-foreground truncate italic mt-0.5 ml-5">
              "{replyingToMessage.content}"
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={cancelReply} aria-label="Cancel reply" className="ml-2 shrink-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
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
          onBlur={handleInputBlur} 
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
      </form>
    </div>
  );
}

