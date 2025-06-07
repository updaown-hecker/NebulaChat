
"use client";

import type { Room, Message, User } from '@/types';
import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './auth-context';
import { suggestRoomOnboarding } from '@/ai/flows/suggest-room-onboarding';
import { aiTutorialCommand } from '@/ai/flows/ai-tutorial-command';
import { fetchChatData, syncRoomsToServer, syncMessagesToServer } from '@/ai/flows/chat-data-flow';
import { updateUserTypingStatus } from '@/ai/flows/auth-flow'; // For typing status
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
  typingUsers: User[]; // Users currently typing in the active room
  createRoom: (name: string, isPrivate: boolean) => Promise<Room | null>;
  joinRoom: (roomId: string) => void;
  sendMessage: (content: string) => Promise<void>;
  setUserTyping: (isTyping: boolean) => void; // Method to report typing status
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

const POLLING_INTERVAL = 7000; // Fetch data every 7 seconds
const TYPING_DEBOUNCE_TIME = 500; // ms to wait after last keystroke to send typing status
const TYPING_TIMEOUT_DURATION = POLLING_INTERVAL - 1000; // How long a "typing" status lasts if not refreshed

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [rooms, setRooms] = useLocalStorage<Room[]>(LOCAL_STORAGE_ROOMS_KEY, []);
  const [messages, setMessages] = useLocalStorage<Message[]>(LOCAL_STORAGE_MESSAGES_KEY, []);
  const [allUsers, setAllUsers] = useLocalStorage<User[]>('nebulaChatAllUsers', []); // Store all users locally as well
  
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [lastActiveRoomId, setLastActiveRoomId] = useLocalStorage<string | null>(LOCAL_STORAGE_LAST_ACTIVE_ROOM_ID_KEY, null);
  const [unreadRoomIds, setUnreadRoomIds] = useLocalStorage<Record<string, boolean>>(LOCAL_STORAGE_UNREAD_ROOM_IDS_KEY, {});
  
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [typingUsers, setTypingUsers] = useState<User[]>([]);
  const [isLoadingAiResponse, setIsLoadingAiResponse] = useState(false);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);

  const currentRoomRef = useRef(currentRoom);
  useEffect(() => {
    currentRoomRef.current = currentRoom;
  }, [currentRoom]);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSentTypingStatusRef = useRef<boolean>(false);

  const fetchAndUpdateChatData = useCallback(async (isInitialLoad = false) => {
    if (!isInitialLoad) {
      // For polling, don't show main loading indicator
    }
    try {
      const serverData = await fetchChatData();
      
      if (serverData) {
        if (serverData.users) {
          setAllUsers(serverData.users);
        }

        if (serverData.rooms) {
          setRooms(prevLocalRooms => {
            const localRoomIds = new Set(prevLocalRooms.map(r => r.id));
            const newRoomsFromServer = serverData.rooms.filter(sr => !localRoomIds.has(sr.id));
            const updatedRooms = [...prevLocalRooms, ...newRoomsFromServer];
            // Sync back only if there were changes from server or local was different.
            // This simplified check might over-sync but is okay for prototype.
            if (newRoomsFromServer.length > 0 || prevLocalRooms.length !== serverData.rooms.length) {
                syncRoomsToServer({ rooms: updatedRooms }).catch(error =>
                console.error("Failed to sync merged rooms to server (simulation):", error)
              );
              return updatedRooms;
            }
            return prevLocalRooms;
          });
        }

        if (serverData.messages) {
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
        }
        
        if (isInitialLoad) {
           const currentRoomsList = serverData.rooms || rooms; // Use server rooms if available, else local
           if (lastActiveRoomId) {
            const roomToRestore = currentRoomsList.find(r => r.id === lastActiveRoomId);
            if (roomToRestore) {
              if (!currentRoomRef.current || currentRoomRef.current.id !== roomToRestore.id) {
                 setCurrentRoom(roomToRestore); 
                 setUnreadRoomIds(prevUnread => ({ ...prevUnread, [roomToRestore.id]: false }));
              }
            } else {
              setLastActiveRoomId(null); 
              if (currentRoomsList.length > 0 && !currentRoomRef.current) {
                setCurrentRoom(currentRoomsList[0]);
                setLastActiveRoomId(currentRoomsList[0].id);
                setUnreadRoomIds(prevUnread => ({ ...prevUnread, [currentRoomsList[0].id]: false }));
              }
            }
          } else if (currentRoomsList.length > 0 && !currentRoomRef.current) {
             setCurrentRoom(currentRoomsList[0]);
             setLastActiveRoomId(currentRoomsList[0].id);
             setUnreadRoomIds(prevUnread => ({ ...prevUnread, [currentRoomsList[0].id]: false }));
          }
        }
      } else if (isInitialLoad) {
        if (rooms.length === 0) setRooms(DEFAULT_INITIAL_ROOMS);
        if (messages.length === 0) setMessages(DEFAULT_INITIAL_MESSAGES);
        // No default users for allUsers, it will be empty until fetched
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
  }, [setRooms, setMessages, setAllUsers, setUnreadRoomIds, user?.id, lastActiveRoomId, setLastActiveRoomId]); 
  
  useEffect(() => {
    fetchAndUpdateChatData(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  useEffect(() => {
    if (isLoadingInitialData) return; 
    const intervalId = setInterval(() => {
      fetchAndUpdateChatData(false);
    }, POLLING_INTERVAL);
    return () => clearInterval(intervalId);
  }, [isLoadingInitialData, fetchAndUpdateChatData]);
  
  useEffect(() => {
    if (currentRoom && allUsers.length > 0) {
      const usersInRoom = allUsers.filter(u => currentRoom.members.includes(u.id) || u.id === user?.id); // Include self if member
      setOnlineUsers(usersInRoom);

      const currentTypingUsers = allUsers.filter(
        u => u.id !== user?.id && u.isTypingInRoomId === currentRoom.id
      );
      setTypingUsers(currentTypingUsers);

    } else {
      setOnlineUsers([]);
      setTypingUsers([]);
    }
  }, [currentRoom, allUsers, user?.id]);
  
  const addMessage = useCallback((message: Message) => {
    setMessages(prevMessages => {
        const updatedMessages = [...prevMessages, message].sort((a,b) => a.timestamp - b.timestamp);
        syncMessagesToServer({ messages: updatedMessages }).catch(error =>
            console.error("Failed to sync new message to server (simulation):", error)
        );
        return updatedMessages;
    });

    if (message.roomId !== currentRoomRef.current?.id && (!user || message.userId !== user.id)) { 
        setUnreadRoomIds(prevUnread => ({ ...prevUnread, [message.roomId]: true }));
    }
  }, [setMessages, setUnreadRoomIds, user]);


  const joinRoom = useCallback((roomId: string) => {
    setRooms(currentLocalRooms => { // Use functional update for setRooms
        const roomToJoin = currentLocalRooms.find(r => r.id === roomId);
        if (roomToJoin) {
            setCurrentRoom(roomToJoin);
            setLastActiveRoomId(roomToJoin.id);
            setUnreadRoomIds(prevUnread => ({ ...prevUnread, [roomId]: false }));

            let updatedLocalRooms = currentLocalRooms;
            if (user && !roomToJoin.isPrivate && !roomToJoin.members.includes(user.id)) {
                updatedLocalRooms = currentLocalRooms.map(r => 
                    r.id === roomId ? { ...r, members: [...r.members, user.id] } : r
                );
                // This syncs all rooms. Could be optimized to sync only the changed room if backend supported it.
                syncRoomsToServer({ rooms: updatedLocalRooms }).catch(error => 
                    console.error("Failed to sync room membership update to server (simulation):", error)
                );
            }
            return updatedLocalRooms; 
        }
        return currentLocalRooms; 
    });
}, [user, setRooms, setCurrentRoom, setLastActiveRoomId, setUnreadRoomIds]);

  useEffect(() => {
    if (isLoadingInitialData || rooms.length === 0) return;
    const targetRoomId = lastActiveRoomId || (rooms.length > 0 ? rooms[0].id : null);
    if (targetRoomId) {
        const roomToJoinDetails = rooms.find(r => r.id === targetRoomId);
        if (roomToJoinDetails) {
            if (!currentRoom || currentRoom.id !== roomToJoinDetails.id) {
                joinRoom(roomToJoinDetails.id);
            }
        } else if (lastActiveRoomId) { 
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
      id: `room-${Date.now()}-${Math.random().toString(36).substring(2,7)}`,
      name,
      isPrivate,
      members: [user.id], 
      ownerId: user.id,
    };
    setRooms(prevRooms => {
        const updatedRoomsList = [...prevRooms, newRoom];
        syncRoomsToServer({ rooms: updatedRoomsList }).catch(error => 
          console.error("Failed to sync rooms with server (simulation):", error)
        );
        return updatedRoomsList;
    });
    joinRoom(newRoom.id);
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
      addMessage({
        id: `err-msg-${Date.now()}`,
        roomId: currentRoomRef.current.id,
        userId: 'ai-assistant',
        username: 'NebulaAI',
        content: "Sorry, I encountered an error trying to process your command.",
        timestamp: Date.now(),
        isAIMessage: true,
      });
    } finally {
      setIsLoadingAiResponse(false);
    }
  }, [user, messages, addMessage]);

  const setUserTyping = useCallback((isTyping: boolean) => {
    if (!user || !currentRoomRef.current) return;

    const targetRoomId = isTyping ? currentRoomRef.current.id : null;

    // Prevent sending too many updates
    if (isTyping && lastSentTypingStatusRef.current && targetRoomId === user.isTypingInRoomId) return; // Already sent "typing" for this room
    if (!isTyping && !lastSentTypingStatusRef.current && user.isTypingInRoomId === null) return; // Already sent "not typing"

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(async () => {
      try {
        await updateUserTypingStatus({ userId: user.id, roomId: targetRoomId });
        // Optimistically update local user state as well
        setAllUsers(prev => prev.map(u => u.id === user.id ? {...u, isTypingInRoomId: targetRoomId} : u));
        lastSentTypingStatusRef.current = isTyping;
      } catch (error) {
        console.error("Failed to update typing status:", error);
      }
    }, TYPING_DEBOUNCE_TIME);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, setAllUsers]); // Removed currentRoomRef from deps to avoid re-creating function too often


  const sendMessage = useCallback(async (content: string) => {
    if (!user || !currentRoomRef.current) return;
    setUserTyping(false); // Stop typing when message is sent

    const commandMatch = content.match(/^\/(\w+)\s*(.*)/);
    if (commandMatch) {
      const [, command, arg] = commandMatch;
      await handleAiCommand(command, arg.trim());
    } else {
      const newMessage: Message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2,7)}`,
        roomId: currentRoomRef.current.id,
        userId: user.id,
        username: user.username,
        content,
        timestamp: Date.now(),
      };
      addMessage(newMessage);
    }
  }, [user, addMessage, handleAiCommand, setUserTyping]);


  return (
    <ChatContext.Provider value={{ 
      rooms, 
      messages, 
      currentRoom, 
      onlineUsers, 
      typingUsers,
      createRoom, 
      joinRoom, 
      sendMessage, 
      setUserTyping,
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
