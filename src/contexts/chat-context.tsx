"use client";

import type { Room, Message, User } from '@/types';
import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { useAuth } from './auth-context';
import { suggestRoomOnboarding } from '@/ai/flows/suggest-room-onboarding';
import { aiTutorialCommand } from '@/ai/flows/ai-tutorial-command';
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
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Mock data - used as initial values if localStorage is empty
const INITIAL_MOCK_ROOMS: Room[] = [
  { id: 'general', name: 'General', isPrivate: false, members: ['user1', 'user2', 'guest1'], ownerId: 'user1' },
  { id: 'random', name: 'Random', isPrivate: false, members: ['user1', 'guest1'], ownerId: 'user1' },
  { id: 'dev-talk', name: 'Dev Talk', isPrivate: false, members: ['user2'], ownerId: 'user2' },
];

const INITIAL_MOCK_MESSAGES: Message[] = [
  { id: 'msg1', roomId: 'general', userId: 'user1', username: 'Alice', content: 'Hello everyone!', timestamp: Date.now() - 100000 },
  { id: 'msg2', roomId: 'general', userId: 'user2', username: 'Bob', content: 'Hi Alice!', timestamp: Date.now() - 90000 },
  { id: 'msg3', roomId: 'random', userId: 'guest1', username: 'Guest User', content: 'Anyone here?', timestamp: Date.now() - 80000 },
];

// This list is for populating onlineUsers, not for auth.
const MOCK_USERS_FOR_ROOM_PRESENCE: User[] = [
    { id: 'user1', username: 'Alice' },
    { id: 'user2', username: 'Bob' },
    { id: 'guest1', username: 'Guest User', isGuest: true },
    // Add any other users who might appear in rooms here
];


export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [rooms, setRooms] = useLocalStorage<Room[]>(LOCAL_STORAGE_ROOMS_KEY, INITIAL_MOCK_ROOMS);
  const [messages, setMessages] = useLocalStorage<Message[]>(LOCAL_STORAGE_MESSAGES_KEY, INITIAL_MOCK_MESSAGES);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [isLoadingAiResponse, setIsLoadingAiResponse] = useState(false);

  useEffect(() => {
    if (currentRoom) {
      // Simulate fetching online users for the current room
      // In a real app, this would involve checking against currentRoom.members and a list of actual online users.
      // For this prototype, we'll filter MOCK_USERS_FOR_ROOM_PRESENCE if their ID is in currentRoom.members.
      // This assumes MOCK_USERS_FOR_ROOM_PRESENCE contains all potential users.
      const usersInRoom = MOCK_USERS_FOR_ROOM_PRESENCE.filter(u => currentRoom.members.includes(u.id));
      
      // If the current authenticated user is part of the room members, ensure they are in onlineUsers.
      // This handles cases where MOCK_USERS_FOR_ROOM_PRESENCE might not be exhaustive or for dynamically created users.
      if (user && currentRoom.members.includes(user.id) && !usersInRoom.find(onlineUser => onlineUser.id === user.id)) {
        usersInRoom.push(user);
      }
      setOnlineUsers(usersInRoom);

    } else {
      setOnlineUsers([]);
    }
  }, [currentRoom, user]); // Add user to dependencies
  
  const createRoom = useCallback(async (name: string, isPrivate: boolean): Promise<Room | null> => {
    if (!user) return null;
    const newRoom: Room = {
      id: `room-${Date.now()}`,
      name,
      isPrivate,
      members: [user.id], // Owner is initially the only member
      ownerId: user.id,
    };
    setRooms(prev => [...prev, newRoom]);
    return newRoom;
  }, [user, setRooms]);

  const joinRoom = useCallback((roomId: string) => {
    const roomToJoin = rooms.find(r => r.id === roomId);
    if (roomToJoin) {
      setCurrentRoom(roomToJoin);
      // If the user is not already a member of this public room, add them.
      // For private rooms, an invite system would be needed.
      if (user && !roomToJoin.isPrivate && !roomToJoin.members.includes(user.id)) {
        setRooms(prevRooms => prevRooms.map(r => 
          r.id === roomId ? { ...r, members: [...r.members, user.id] } : r
        ));
      }
    }
  }, [rooms, user, setRooms]);

  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
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
         const userMessages = messages.filter(m => m.userId === user.id && m.roomId === currentRoom.id).slice(-3).map(m => m.content).join('\n');
        const output = await suggestRoomOnboarding({ userMessage: userMessages || "I'm new here and looking for interesting topics." });
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
        addMessage(aiMessage);
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
      addMessage(errorMessage);
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
      addMessage(newMessage);
    }
  }, [user, currentRoom, messages, setMessages, handleAiCommand]); // Added setMessages to dependency array


  return (
    <ChatContext.Provider value={{ rooms, messages, currentRoom, onlineUsers, createRoom, joinRoom, sendMessage, isLoadingAiResponse }}>
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
