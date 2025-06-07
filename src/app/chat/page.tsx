"use client"; // Required for hooks like useChat

import { MessageList } from '@/components/chat/message-list';
import { ChatInput } from '@/components/chat/chat-input';
import { useChat } from '@/contexts/chat-context'; // Ensure ChatProvider wraps this
import { useEffect } from 'react';

export default function ChatPage() {
  const { currentRoom, joinRoom, rooms } = useChat();

  // Auto-join the first available room if no room is selected
  useEffect(() => {
    if (!currentRoom && rooms.length > 0) {
      joinRoom(rooms[0].id);
    }
  }, [currentRoom, rooms, joinRoom]);
  
  return (
    <div className="flex flex-col h-full">
      {/* Optional: Could add a header here specific to the current chat room if needed */}
      <MessageList />
      <ChatInput />
    </div>
  );
}
