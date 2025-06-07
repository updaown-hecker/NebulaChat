
"use client"; 

import { MessageList } from '@/components/chat/message-list';
import { ChatInput } from '@/components/chat/chat-input';
// Removed: useChat, useEffect as auto-join logic is now in ChatContext

export default function ChatPage() {
  // const { currentRoom, joinRoom, rooms } = useChat(); // No longer needed here

  // Auto-join logic moved to ChatProvider's useEffect
  // useEffect(() => {
  //   if (!currentRoom && rooms.length > 0) {
  //     joinRoom(rooms[0].id);
  //   }
  // }, [currentRoom, rooms, joinRoom]);
  
  return (
    <div className="flex flex-col h-full">
      <MessageList />
      <ChatInput />
    </div>
  );
}

