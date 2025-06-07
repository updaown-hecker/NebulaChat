
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
  { id: 'msg-fallback', roomId: 'general-fallback', userId: 'system', username: 'System', content: 'Welcome! Initializing chat...', timestamp: Date.now() },
];

const MOCK_USERS_FOR_ROOM_PRESENCE: User[] = [
    { id: 'user1', username: 'Alice' },
    { id: 'user2', username: 'Bob' },
    { id: 'guest1', username: 'Guest User', isGuest: true },
];

const POLLING_INTERVAL = 7000; // Fetch data every 7 seconds

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

  const currentRoomRef = useRef(currentRoom);
  useEffect(() => {
    currentRoomRef.current = currentRoom;
  }, [currentRoom]);

  const fetchAndUpdateChatData = useCallback(async (isInitialLoad = false) => {
    if (!isInitialLoad) {
      // For polling, don't show main loading indicator
      // console.log('Polling for chat data updates...');
    }
    try {
      const serverData = await fetchChatData();
      
      if (serverData && serverData.rooms && serverData.messages) {
        // Merge rooms
        setRooms(prevLocalRooms => {
          const localRoomIds = new Set(prevLocalRooms.map(r => r.id));
          const newRoomsFromServer = serverData.rooms.filter(sr => !localRoomIds.has(sr.id));
          const updatedRooms = [...prevLocalRooms, ...newRoomsFromServer];
          if (newRoomsFromServer.length > 0 || prevLocalRooms.length !== serverData.rooms.length) {
             syncRoomsToServer({ rooms: updatedRooms }).catch(error =>
              console.error("Failed to sync merged rooms to server (simulation):", error)
            ); // sync back if new rooms were added from server (less likely in current setup but good practice)
            return updatedRooms;
          }
          return prevLocalRooms;
        });

        // Merge messages and update unread status
        setMessages(prevLocalMessages => {
          const localMessageIds = new Set(prevLocalMessages.map(m => m.id));
          const newMessagesFromServer = serverData.messages.filter(sm => !localMessageIds.has(sm.id));
          
          if (newMessagesFromServer.length > 0) {
            newMessagesFromServer.forEach(newMessage => {
              if (newMessage.roomId !== currentRoomRef.current?.id && (!user || newMessage.userId !== user.id)) {
                setUnreadRoomIds(prevUnread => ({ ...prevUnread, [newMessage.roomId]: true }));
              }
            });
            const updatedMessages = [...prevLocalMessages, ...newMessagesFromServer].sort((a, b) => a.timestamp - b.timestamp);
             syncMessagesToServer({ messages: updatedMessages }).catch(error =>
              console.error("Failed to sync merged messages to server (simulation):", error)
            );
            return updatedMessages;
          }
          return prevLocalMessages;
        });

        if (isInitialLoad) {
           // On initial load, if local storage was empty, it's now populated from server/defaults.
           // Need to re-evaluate rooms based on the potentially updated setRooms call.
           const currentRooms = window.localStorage.getItem(LOCAL_STORAGE_ROOMS_KEY);
           const parsedCurrentRooms : Room[] = currentRooms ? JSON.parse(currentRooms) : serverData.rooms;

           if (lastActiveRoomId) {
            const roomToRestore = parsedCurrentRooms.find(r => r.id === lastActiveRoomId);
            if (roomToRestore) {
              if (!currentRoomRef.current || currentRoomRef.current.id !== roomToRestore.id) {
                 setCurrentRoom(roomToRestore); // Directly set, joinRoom might cause loops here
                 setUnreadRoomIds(prevUnread => ({ ...prevUnread, [roomToRestore.id]: false }));
              }
            } else {
              setLastActiveRoomId(null); 
              if (parsedCurrentRooms.length > 0 && !currentRoomRef.current) {
                setCurrentRoom(parsedCurrentRooms[0]);
                setLastActiveRoomId(parsedCurrentRooms[0].id);
                setUnreadRoomIds(prevUnread => ({ ...prevUnread, [parsedCurrentRooms[0].id]: false }));
              }
            }
          } else if (parsedCurrentRooms.length > 0 && !currentRoomRef.current) {
             setCurrentRoom(parsedCurrentRooms[0]);
             setLastActiveRoomId(parsedCurrentRooms[0].id);
             setUnreadRoomIds(prevUnread => ({ ...prevUnread, [parsedCurrentRooms[0].id]: false }));
          }
        }
      } else if (isInitialLoad) {
        // Fallback if server data is empty on initial load
        if (rooms.length === 0) setRooms(DEFAULT_INITIAL_ROOMS);
        if (messages.length === 0) setMessages(DEFAULT_INITIAL_MESSAGES);
      }
    } catch (error) {
      console.error("Failed to fetch/update chat data from server (simulation):", error);
      if (isInitialLoad) {
        if (rooms.length === 0) setRooms(DEFAULT_INITIAL_ROOMS);
        if (messages.length === 0) setMessages(DEFAULT_INITIAL_MESSAGES);
      }
    } finally {
      if (isInitialLoad) {
        setIsLoadingInitialData(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setRooms, setMessages, setUnreadRoomIds, user?.id, rooms.length, messages.length, lastActiveRoomId, setLastActiveRoomId]); 
  // rooms.length and messages.length as proxy for initial load state for default data

  // Initial data load
  useEffect(() => {
    fetchAndUpdateChatData(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Polling mechanism
  useEffect(() => {
    if (isLoadingInitialData) return; // Don't start polling until initial load is done

    const intervalId = setInterval(() => {
      fetchAndUpdateChatData(false);
    }, POLLING_INTERVAL);

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [isLoadingInitialData, fetchAndUpdateChatData]);
  
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
  }, [currentRoom, user, rooms]); // rooms dependency in case members list changes from polling
  
  const addMessage = useCallback((message: Message) => {
    setMessages(prevMessages => {
        const updatedMessages = [...prevMessages, message].sort((a,b) => a.timestamp - b.timestamp);
        syncMessagesToServer({ messages: updatedMessages }).catch(error =>
            console.error("Failed to sync new message to server (simulation):", error)
        );
        return updatedMessages;
    });

    if (message.roomId !== currentRoomRef.current?.id && (!user || message.userId !== user.id)) { // Don't mark self messages as unread
        setUnreadRoomIds(prevUnread => ({ ...prevUnread, [message.roomId]: true }));
    }
  }, [setMessages, setUnreadRoomIds, user]);


  const joinRoom = useCallback((roomId: string) => {
    // Use a functional update for setRooms to ensure we are working with the latest state
    setRooms(currentRooms => {
        const roomToJoin = currentRooms.find(r => r.id === roomId);
        if (roomToJoin) {
            setCurrentRoom(roomToJoin);
            setLastActiveRoomId(roomToJoin.id);
            setUnreadRoomIds(prevUnread => ({ ...prevUnread, [roomId]: false }));

            let updatedRooms = currentRooms;
            if (user && !roomToJoin.isPrivate && !roomToJoin.members.includes(user.id)) {
                updatedRooms = currentRooms.map(r => 
                    r.id === roomId ? { ...r, members: [...r.members, user.id] } : r
                );
                syncRoomsToServer({ rooms: updatedRooms }).catch(error => 
                    console.error("Failed to sync room membership update to server (simulation):", error)
                );
            }
            return updatedRooms; // Return the potentially updated rooms array
        }
        return currentRooms; // Return current rooms if no change
    });
}, [user, setRooms, setCurrentRoom, setLastActiveRoomId, setUnreadRoomIds]);


  // Effect to restore last active room or join the first one AFTER initial data load
  useEffect(() => {
    if (isLoadingInitialData || rooms.length === 0) return;

    const targetRoomId = lastActiveRoomId || (rooms.length > 0 ? rooms[0].id : null);
    
    if (targetRoomId) {
        const roomToJoin = rooms.find(r => r.id === targetRoomId);
        if (roomToJoin) {
            if (!currentRoom || currentRoom.id !== roomToJoin.id) {
                // joinRoom will handle setCurrentRoom, setLastActiveRoomId, and clear unread
                joinRoom(roomToJoin.id);
            }
        } else if (lastActiveRoomId) { 
            // lastActiveRoomId was invalid (e.g. room deleted), clear it and try first room
            setLastActiveRoomId(null);
            if (rooms.length > 0 && (!currentRoom || !rooms.find(r => r.id === currentRoom.id))) {
              joinRoom(rooms[0].id);
            }
        }
    }
  }, [isLoadingInitialData, rooms, lastActiveRoomId, currentRoom, joinRoom, setLastActiveRoomId]);


  const createRoom = useCallback(async (name: string, isPrivate: boolean): Promise<Room | null> => {
    if (!user) return null;
    const newRoom: Room = {
      id: `room-${Date.now()}-${Math.random().toString(36).substring(2,7)}`, // added random suffix for better uniqueness
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
    joinRoom(newRoom.id); // Automatically join the new room
    return newRoom;
  }, [user, setRooms, joinRoom]);

  const handleAiCommand = useCallback(async (command: string, arg: string) => {
    if (!user || !currentRoomRef.current) return; 
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
  }, [user, messages, addMessage]); // messages needed for /suggest-room

  const sendMessage = useCallback(async (content: string) => {
    if (!user || !currentRoomRef.current) return;

    const commandMatch = content.match(/^\/(\w+)\s*(.*)/);
    if (commandMatch) {
      const [, command, arg] = commandMatch;
      await handleAiCommand(command, arg.trim());
    } else {
      const newMessage: Message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2,7)}`, // added random suffix for better uniqueness
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


    