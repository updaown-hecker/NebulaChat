
"use client";

import React, { useState, useEffect, FormEvent, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot, Send, Loader2, ShieldAlert, UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { geminiChat, type GeminiChatInput, type GeminiChatOutput } from '@/ai/flows/gemini-chat-flow';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  sender: 'admin' | 'gemini';
  text: string;
  timestamp: number;
}

export default function AdminGeminiChatPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaViewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user === undefined) return; // Auth context still loading
    if (!user || !user.isAdmin) {
      toast({
        title: "Access Denied",
        description: "You must be an administrator to access this page.",
        variant: "destructive",
      });
      router.replace('/chat'); // Redirect to a safe page
    }
  }, [user, router, toast]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollAreaViewportRef.current) {
      scrollAreaViewportRef.current.scrollTop = scrollAreaViewportRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const adminMessage: ChatMessage = {
      id: `admin-${Date.now()}`,
      sender: 'admin',
      text: inputValue,
      timestamp: Date.now(),
    };
    setChatMessages((prev) => [...prev, adminMessage]);
    const currentInput = inputValue;
    setInputValue('');
    setIsLoading(true);

    try {
      const inputForFlow: GeminiChatInput = { prompt: currentInput };
      const result: GeminiChatOutput = await geminiChat(inputForFlow);
      const geminiMessage: ChatMessage = {
        id: `gemini-${Date.now()}`,
        sender: 'gemini',
        text: result.response,
        timestamp: Date.now(),
      };
      setChatMessages((prev) => [...prev, geminiMessage]);
    } catch (error) {
      console.error("Error chatting with Gemini:", error);
      const errorMessageText = "Sorry, I encountered an error. Please try again. Check server logs for details (is GOOGLE_API_KEY set in .env?).";
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        sender: 'gemini',
        text: errorMessageText,
        timestamp: Date.now(),
      };
      setChatMessages((prev) => [...prev, errorMessage]);
      toast({
        title: "AI Chat Error",
        description: errorMessageText,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (user === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading user data...</p>
      </div>
    );
  }
  
  if (!user?.isAdmin) {
     return (
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">This page is for administrators only.</p>
        <Button onClick={() => router.push('/chat')} className="mt-6">Go to Chat</Button>
      </div>
    );
  }

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <div className="flex flex-1 flex-col h-full">
      <ScrollArea className="flex-1 p-4" viewportRef={scrollAreaViewportRef}>
        <div className="space-y-4 mb-4">
          {chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex items-start gap-3",
                msg.sender === 'admin' ? "justify-end" : "justify-start"
              )}
            >
              {msg.sender === 'gemini' && (
                <Avatar className="h-8 w-8 border flex-shrink-0">
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                    <Bot size={16}/>
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn(
                  "max-w-[70%] p-3 rounded-lg shadow-sm text-sm",
                  msg.sender === 'admin'
                    ? "bg-primary text-primary-foreground rounded-br-none"
                    : "bg-card text-card-foreground rounded-bl-none"
                )}
              >
                <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                 <p className={cn(
                    "text-xs mt-1 opacity-70",
                    msg.sender === 'admin' ? "text-right" : "text-left"
                  )}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
              </div>
              {msg.sender === 'admin' && (
                <Avatar className="h-8 w-8 border flex-shrink-0">
                  <AvatarFallback className="text-xs bg-muted">
                    {user ? getInitials(user.username) : <UserCircle size={16}/>}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="p-4 border-t bg-background">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Chat with Gemini..."
            disabled={isLoading}
            autoFocus
            className="text-base"
          />
          <Button type="submit" disabled={isLoading || !inputValue.trim()} size="icon">
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </div>
    </div>
  );
}

