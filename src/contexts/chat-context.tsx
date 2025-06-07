
"use client";

import type { Room, Message, User } from '@/types';
import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './auth-context';
import { suggestRoomOnboarding } from '@/ai/flows/suggest-room-onboarding';
import { aiTutorialCommand } from '@/ai/flows/ai-tutorial-command';
import { fetchChatData, syncRoomsToServer, syncMessagesToServer } from '@/ai/flows/chat-data-flow';
import useLocalStorage from '@/hooks/use-local-storage';
import { 
  LOCAL_STORAGE_MESSAGES_KEY, 
  LOCAL_STORAGE_ROOMS_KEY,
  LOCAL_STORAGE_LAST_ACTIVE_ROOM_ID_KEY,
  LOCAL_STORAGE_UNREAD_ROOM_IDS_KEY
} from '@/lib/constants';

interface ChatContextType {
  rooms: Room[];
  messages: Message[];
  currentRoom: Room | null;
  onlineUsers: User[]; 
  createRoom: (name: string, isPrivate: boolean) => Promise<Room | null>;
  joinRoom: (roomId: string) => void;
  sendMessage: (content: string) => Promise<void>;
  isLoadingAiResponse: boolean;
  isLoadingInitialData: boolean;
  unreadRoomIds: Record<string, boolean>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const DEFAULT_INITIAL_ROOMS: Room[] = [
  { id: 'general-fallback', name: 'General (Fallback)', isPrivate: false, members: [], ownerId: 'system' },
];

const DEFAULT_INITIAL_MESSAGES: Message[] = [
  { id: 'msg-fallback', roomId: 'general-fallback', userId: 'system', username: 'System', content: 'Welcome! Chats are stored locally.', timestamp: Date.now() },
];

const MOCK_USERS_FOR_ROOM_PRESENCE: User[] = [
    { id: 'user1', username: 'Alice' },
    { id: 'user2', username: 'Bob' },
    { id: 'guest1', username: 'Guest User', isGuest: true },
];


export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [rooms, setRooms] = useLocalStorage<Room[]>(LOCAL_STORAGE_ROOMS_KEY, []);
  const [messages, setMessages] = useLocalStorage<Message[]>(LOCAL_STORAGE_MESSAGES_KEY, []);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [lastActiveRoomId, setLastActiveRoomId] = useLocalStorage<string | null>(LOCAL_STORAGE_LAST_ACTIVE_ROOM_ID_KEY, null);
  const [unreadRoomIds, setUnreadRoomIds] = useLocalStorage<Record<string, boolean>>(LOCAL_STORAGE_UNREAD_ROOM_IDS_KEY, {});
  
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [isLoadingAiResponse, setIsLoadingAiResponse] = useState(false);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);

  // Refs for current values to use in callbacks without making them deps
  const currentRoomRef = useRef(currentRoom);
  useEffect(() => {
    currentRoomRef.current = currentRoom;
  }, [currentRoom]);


  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoadingInitialData(true);
      try {
        const serverData = await fetchChatData();
        if (serverData && serverData.rooms && serverData.messages) {
          const localRoomsExist = window.localStorage.getItem(LOCAL_STORAGE_ROOMS_KEY) !== null;
          const localMessagesExist = window.localStorage.getItem(LOCAL_STORAGE_MESSAGES_KEY) !== null;

          if (!localRoomsExist || rooms.length === 0) { 
            setRooms(serverData.rooms);
          }
          if (!localMessagesExist || messages.length === 0) {
            setMessages(serverData.messages);
          }
        } else {
          if (rooms.length === 0) setRooms(DEFAULT_INITIAL_ROOMS);
          if (messages.length === 0) setMessages(DEFAULT_INITIAL_MESSAGES);
        }
      } catch (error) {
        console.error("Failed to fetch initial chat data from server (simulation):", error);
        if (rooms.length === 0) setRooms(DEFAULT_INITIAL_ROOMS);
        if (messages.length === 0) setMessages(DEFAULT_INITIAL_MESSAGES);
      } finally {
        setIsLoadingInitialData(false);
      }
    };
    loadInitialData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  useEffect(() => {
    if (currentRoom) {
      const usersInRoom = MOCK_USERS_FOR_ROOM_PRESENCE.filter(u => currentRoom.members.includes(u.id));
      if (user && currentRoom.members.includes(user.id) && !usersInRoom.find(onlineUser => onlineUser.id === user.id)) {
        usersInRoom.push(user);
      }
      setOnlineUsers(usersInRoom);
    } else {
      setOnlineUsers([]);
    }
  }, [currentRoom, user, rooms]);
  
  const addMessage = useCallback((message: Message) => {
    setMessages(prevMessages => {
        const updatedMessages = [...prevMessages, message];
        syncMessagesToServer({ messages: updatedMessages }).catch(error =>
            console.error("Failed to sync new message to server (simulation):", error)
        );
        return updatedMessages;
    });

    if (message.roomId !== currentRoomRef.current?.id) {
        setUnreadRoomIds(prevUnread => ({ ...prevUnread, [message.roomId]: true }));
    }
  }, [setMessages, setUnreadRoomIds /* syncMessagesToServer is stable */]);


  const joinRoom = useCallback((roomId: string) => {
    const roomToJoin = rooms.find(r => r.id === roomId);
    if (roomToJoin) {
      setCurrentRoom(roomToJoin);
      setLastActiveRoomId(roomToJoin.id);
      setUnreadRoomIds(prevUnread => ({ ...prevUnread, [roomId]: false }));

      if (user && !roomToJoin.isPrivate && !roomToJoin.members.includes(user.id)) {
        const updatedRooms = rooms.map(r => 
          r.id === roomId ? { ...r, members: [...r.members, user.id] } : r
        );
        setRooms(updatedRooms); 
        syncRoomsToServer({ rooms: updatedRooms }).catch(error => 
          console.error("Failed to sync room membership update to server (simulation):", error)
        );
      }
    }
  }, [rooms, user, setRooms, setCurrentRoom, setLastActiveRoomId, setUnreadRoomIds /* syncRoomsToServer is stable */]);

  // Effect to restore last active room or join the first one
  useEffect(() => {
    if (isLoadingInitialData || rooms.length === 0) return;

    if (lastActiveRoomId) {
      const roomToRestore = rooms.find(r => r.id === lastActiveRoomId);
      if (roomToRestore) {
        if (!currentRoom || currentRoom.id !== roomToRestore.id) {
          joinRoom(roomToRestore.id); // joinRoom handles setting currentRoom & clearing unread
        }
        return; 
      } else {
        setLastActiveRoomId(null); 
      }
    }

    if (!currentRoom && rooms.length > 0) {
      joinRoom(rooms[0].id);
    }
  }, [isLoadingInitialData, rooms, lastActiveRoomId, currentRoom, joinRoom, setLastActiveRoomId]);


  const createRoom = useCallback(async (name: string, isPrivate: boolean): Promise<Room | null> => {
    if (!user) return null;
    const newRoom: Room = {
      id: `room-${Date.now()}`,
      name,
      isPrivate,
      members: [user.id], 
      ownerId: user.id,
    };
    setRooms(prevRooms => {
        const updatedRooms = [...prevRooms, newRoom];
        syncRoomsToServer({ rooms: updatedRooms }).catch(error => 
          console.error("Failed to sync rooms with server (simulation):", error)
        );
        return updatedRooms;
    });
    return newRoom;
  }, [user, setRooms /* syncRoomsToServer is stable */]);

  const handleAiCommand = useCallback(async (command: string, arg: string) => {
    if (!user || !currentRoomRef.current) return; // Use ref here for currentRoom
    setIsLoadingAiResponse(true);
    try {
      let aiResponseContent: string | undefined;
      if (command === '/tutorial') {
        const output = await aiTutorialCommand({ command, userInput: arg });
        aiResponseContent = output.tutorialContent;
      } else if (command === '/suggest-room') {
         const userMessagesContent = messages.filter(m => m.userId === user.id && m.roomId === currentRoomRef.current?.id).slice(-3).map(m => m.content).join('\n');
        const output = await suggestRoomOnboarding({ userMessage: userMessagesContent || "I'm new here and looking for interesting topics." });
        aiResponseContent = `Suggested rooms: ${output.suggestedRooms.join(', ')}. Reasoning: ${output.reasoning}`;
      } else if (command === '/help') {
        aiResponseContent = "Available commands: /tutorial <topic>, /suggest-room, /help. How can I assist you?";
      }

      if (aiResponseContent) {
        const aiMessage: Message = {
          id: `ai-msg-${Date.now()}`,
          roomId: currentRoomRef.current.id,
          userId: 'ai-assistant',
          username: 'NebulaAI',
          content: aiResponseContent,
          timestamp: Date.now(),
          isAIMessage: true,
        };
        addMessage(aiMessage);
      }
    } catch (error) {
      console.error("AI command error:", error);
      const errorMessage: Message = {
        id: `err-msg-${Date.now()}`,
        roomId: currentRoomRef.current.id,
        userId: 'ai-assistant',
        username: 'NebulaAI',
        content: "Sorry, I encountered an error trying to process your command.",
        timestamp: Date.now(),
        isAIMessage: true,
      };
      addMessage(errorMessage);
    } finally {
      setIsLoadingAiResponse(false);
    }
  }, [user, setIsLoadingAiResponse, addMessage, messages /* messages needed for /suggest-room, aiTutorialCommand, suggestRoomOnboarding are stable */]);

  const sendMessage = useCallback(async (content: string) => {
    if (!user || !currentRoomRef.current) return;

    const commandMatch = content.match(/^\/(\w+)\s*(.*)/);
    if (commandMatch) {
      const [, command, arg] = commandMatch;
      await handleAiCommand(command, arg.trim());
    } else {
      const newMessage: Message = {
        id: `msg-${Date.now()}`,
        roomId: currentRoomRef.current.id,
        userId: user.id,
        username: user.username,
        content,
        timestamp: Date.now(),
      };
      addMessage(newMessage);
    }
  }, [user, addMessage, handleAiCommand]);


  return (
    <ChatContext.Provider value={{ 
      rooms, 
      messages, 
      currentRoom, 
      onlineUsers, 
      createRoom, 
      joinRoom, 
      sendMessage, 
      isLoadingAiResponse, 
      isLoadingInitialData,
      unreadRoomIds
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

