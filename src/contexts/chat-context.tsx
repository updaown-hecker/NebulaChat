
"use client";

import type { Room, Message, User } from '@/types';
import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { useAuth } from './auth-context';
import { suggestRoomOnboarding } from '@/ai/flows/suggest-room-onboarding';
import { aiTutorialCommand } from '@/ai/flows/ai-tutorial-command';
import { fetchChatData, syncRoomsToServer, syncMessagesToServer } from '@/ai/flows/chat-data-flow';
import useLocalStorage from '@/hooks/use-local-storage';
import { LOCAL_STORAGE_MESSAGES_KEY, LOCAL_STORAGE_ROOMS_KEY } from '@/lib/constants';

interface ChatContextType {
  rooms: Room[];
  messages: Message[];
  currentRoom: Room | null;
  onlineUsers: User[]; // Users in the current room
  createRoom: (name: string, isPrivate: boolean) => Promise<Room | null>;
  joinRoom: (roomId: string) => void;
  sendMessage: (content: string) => Promise<void>;
  isLoadingAiResponse: boolean;
  isLoadingInitialData: boolean;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Default initial values if localStorage is empty AND server fetch fails
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
  // useLocalStorage will initialize from localStorage if available, otherwise from its second arg.
  const [rooms, setRooms] = useLocalStorage<Room[]>(LOCAL_STORAGE_ROOMS_KEY, []);
  const [messages, setMessages] = useLocalStorage<Message[]>(LOCAL_STORAGE_MESSAGES_KEY, []);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [isLoadingAiResponse, setIsLoadingAiResponse] = useState(false);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoadingInitialData(true);
      try {
        const serverData = await fetchChatData();
        if (serverData && serverData.rooms && serverData.messages) {
          // Check if localStorage is already populated. If not, or if server data is considered fresher, update.
          // For this prototype, we'll prioritize server data if it's different or localStorage is empty.
          const localRoomsExist = window.localStorage.getItem(LOCAL_STORAGE_ROOMS_KEY) !== null;
          const localMessagesExist = window.localStorage.getItem(LOCAL_STORAGE_MESSAGES_KEY) !== null;

          if (!localRoomsExist || rooms.length === 0) { // Or add more sophisticated sync logic
            setRooms(serverData.rooms);
          }
          if (!localMessagesExist || messages.length === 0) {
            setMessages(serverData.messages);
          }
        } else {
          // Server fetch failed or returned no data, ensure defaults if localStorage was also empty
          if (rooms.length === 0) setRooms(DEFAULT_INITIAL_ROOMS);
          if (messages.length === 0) setMessages(DEFAULT_INITIAL_MESSAGES);
        }
      } catch (error) {
        console.error("Failed to fetch initial chat data from server (simulation):", error);
        // Fallback to ensure defaults if localStorage was empty and server fetch failed
        if (rooms.length === 0) setRooms(DEFAULT_INITIAL_ROOMS);
        if (messages.length === 0) setMessages(DEFAULT_INITIAL_MESSAGES);
      } finally {
        setIsLoadingInitialData(false);
      }
    };
    loadInitialData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount. setRooms/setMessages from useLocalStorage will handle persistence.

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
  }, [currentRoom, user, rooms]); // rooms dependency added in case members list changes
  
  const createRoom = useCallback(async (name: string, isPrivate: boolean): Promise<Room | null> => {
    if (!user) return null;
    const newRoom: Room = {
      id: `room-${Date.now()}`,
      name,
      isPrivate,
      members: [user.id], 
      ownerId: user.id,
    };
    const updatedRooms = [...rooms, newRoom];
    setRooms(updatedRooms); // This updates localStorage via useLocalStorage
    
    try {
      await syncRoomsToServer({ rooms: updatedRooms });
      console.log("Rooms synced with server (simulation).");
    } catch (error) {
      console.error("Failed to sync rooms with server (simulation):", error);
      // Handle sync failure if necessary (e.g., queue for later)
    }
    return newRoom;
  }, [user, rooms, setRooms]);

  const joinRoom = useCallback((roomId: string) => {
    const roomToJoin = rooms.find(r => r.id === roomId);
    if (roomToJoin) {
      setCurrentRoom(roomToJoin);
      if (user && !roomToJoin.isPrivate && !roomToJoin.members.includes(user.id)) {
        const updatedRooms = rooms.map(r => 
          r.id === roomId ? { ...r, members: [...r.members, user.id] } : r
        );
        setRooms(updatedRooms); // This updates localStorage
        // Consider syncing room membership change to server here as well
        syncRoomsToServer({ rooms: updatedRooms }).catch(error => 
          console.error("Failed to sync room membership update to server (simulation):", error)
        );
      }
    }
  }, [rooms, user, setRooms]);

  const addMessageToStateAndStorage = (message: Message) => {
    const updatedMessages = [...messages, message];
    setMessages(updatedMessages); // This updates localStorage

    syncMessagesToServer({ messages: updatedMessages }).catch(error =>
      console.error("Failed to sync new message to server (simulation):", error)
    );
  };

  const handleAiCommand = async (command: string, arg: string) => {
    if (!user || !currentRoom) return;
    setIsLoadingAiResponse(true);
    try {
      let aiResponseContent: string | undefined;
      if (command === '/tutorial') {
        const output = await aiTutorialCommand({ command, userInput: arg });
        aiResponseContent = output.tutorialContent;
      } else if (command === '/suggest-room') {
         const userMessagesContent = messages.filter(m => m.userId === user.id && m.roomId === currentRoom.id).slice(-3).map(m => m.content).join('\n');
        const output = await suggestRoomOnboarding({ userMessage: userMessagesContent || "I'm new here and looking for interesting topics." });
        aiResponseContent = `Suggested rooms: ${output.suggestedRooms.join(', ')}. Reasoning: ${output.reasoning}`;
      } else if (command === '/help') {
        aiResponseContent = "Available commands: /tutorial <topic>, /suggest-room, /help. How can I assist you?";
      }

      if (aiResponseContent) {
        const aiMessage: Message = {
          id: `ai-msg-${Date.now()}`,
          roomId: currentRoom.id,
          userId: 'ai-assistant',
          username: 'NebulaAI',
          content: aiResponseContent,
          timestamp: Date.now(),
          isAIMessage: true,
        };
        addMessageToStateAndStorage(aiMessage);
      }
    } catch (error) {
      console.error("AI command error:", error);
      const errorMessage: Message = {
        id: `err-msg-${Date.now()}`,
        roomId: currentRoom.id,
        userId: 'ai-assistant',
        username: 'NebulaAI',
        content: "Sorry, I encountered an error trying to process your command.",
        timestamp: Date.now(),
        isAIMessage: true,
      };
      addMessageToStateAndStorage(errorMessage);
    } finally {
      setIsLoadingAiResponse(false);
    }
  };

  const sendMessage = useCallback(async (content: string) => {
    if (!user || !currentRoom) return;

    const commandMatch = content.match(/^\/(\w+)\s*(.*)/);
    if (commandMatch) {
      const [, command, arg] = commandMatch;
      await handleAiCommand(command, arg.trim());
    } else {
      const newMessage: Message = {
        id: `msg-${Date.now()}`,
        roomId: currentRoom.id,
        userId: user.id,
        username: user.username,
        content,
        timestamp: Date.now(),
      };
      addMessageToStateAndStorage(newMessage);
    }
  }, [user, currentRoom, messages, setMessages, handleAiCommand]);


  return (
    <ChatContext.Provider value={{ rooms, messages, currentRoom, onlineUsers, createRoom, joinRoom, sendMessage, isLoadingAiResponse, isLoadingInitialData }}>
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
