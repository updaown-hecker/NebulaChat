
"use client";

import type { Room, Message, User } from '@/types';
import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './auth-context';
import { suggestRoomOnboarding } from '@/ai/flows/suggest-room-onboarding';
import { aiTutorialCommand } from '@/ai/flows/ai-tutorial-command';
import { fetchChatData, syncRoomsToServer, syncMessagesToServer } from '@/ai/flows/chat-data-flow';
import { updateUserTypingStatus } from '@/ai/flows/auth-flow';
import { searchUsers, sendFriendRequest as sendFriendRequestFlow, acceptFriendRequest as acceptFriendRequestFlow, declineOrCancelFriendRequest as declineOrCancelFriendRequestFlow, removeFriend as removeFriendFlow } from '@/ai/flows/friend-flow';
import { inviteUserToRoom as inviteUserToRoomFlow } from '@/ai/flows/room-management-flow'; // Added
import useLocalStorage from '@/hooks/use-local-storage';
import {
  LOCAL_STORAGE_MESSAGES_KEY,
  LOCAL_STORAGE_ROOMS_KEY,
  LOCAL_STORAGE_LAST_ACTIVE_ROOM_ID_KEY,
  LOCAL_STORAGE_UNREAD_ROOM_IDS_KEY
} from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';

interface ChatContextType {
  rooms: Room[];
  messages: Message[];
  currentRoom: Room | null;
  allUsers: User[];
  searchedUsers: User[];
  onlineUsers: User[];
  typingUsers: User[];
  createRoom: (name: string, isPrivate: boolean) => Promise<Room | null>;
  joinRoom: (roomId: string) => void;
  startDirectMessage: (otherUserId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  setUserTyping: (isTyping: boolean) => void;
  isLoadingAiResponse: boolean;
  isLoadingInitialData: boolean;
  unreadRoomIds: Record<string, boolean>;
  searchAllUsers: (query: string) => Promise<void>;
  sendFriendRequest: (recipientId: string) => Promise<boolean>;
  acceptFriendRequest: (requesterId: string) => Promise<boolean>;
  declineOrCancelFriendRequest: (otherUserId: string) => Promise<boolean>;
  removeFriend: (friendId: string) => Promise<boolean>;
  refreshAllUsers: () => Promise<void>;
  inviteUserToRoom: (roomId: string, inviteeUserId: string) => Promise<boolean>; // Added
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const DEFAULT_INITIAL_ROOMS: Room[] = [
  { id: 'general-fallback', name: 'General (Fallback)', isPrivate: false, members: [], ownerId: 'system' },
];

const DEFAULT_INITIAL_MESSAGES: Message[] = [
  { id: 'msg-fallback', roomId: 'general-fallback', userId: 'system', username: 'System', content: 'Welcome! Initializing chat...', timestamp: Date.now() },
];

const POLLING_INTERVAL = 7000;
const TYPING_DEBOUNCE_TIME = 500;

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rooms, setRooms] = useLocalStorage<Room[]>(LOCAL_STORAGE_ROOMS_KEY, []);
  const [messages, setMessages] = useLocalStorage<Message[]>(LOCAL_STORAGE_MESSAGES_KEY, []);
  const [allUsers, setAllUsers] = useLocalStorage<User[]>('nebulaChatAllUsers', []);
  const [searchedUsers, setSearchedUsers] = useState<User[]>([]);

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

  const refreshAllData = useCallback(async (showToast = false) => { // Combined refresh logic
    try {
      const serverData = await fetchChatData();
      if (serverData) {
        if (serverData.users) setAllUsers(serverData.users);
        if (serverData.rooms) {
            setRooms(serverData.rooms); // Potentially smarter merge later
             // After rooms are set, if currentRoom exists, ensure it's the latest version
            if (currentRoomRef.current) {
                const updatedCurrentRoom = serverData.rooms.find(r => r.id === currentRoomRef.current!.id);
                if (updatedCurrentRoom) {
                    setCurrentRoom(updatedCurrentRoom);
                } else {
                    // Current room no longer exists, clear it or pick another
                    setCurrentRoom(serverData.rooms.length > 0 ? serverData.rooms[0] : null);
                }
            }
        }
        if (serverData.messages) setMessages(serverData.messages); // Potentially smarter merge later
      }
      if (showToast) {
        toast({ title: "Data Synced", description: "Chat data has been refreshed." });
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
      if (showToast) {
        toast({ title: "Error", description: "Could not refresh chat data.", variant: "destructive" });
      }
    }
  }, [setAllUsers, setRooms, setMessages, toast]);


  const refreshAllUsers = useCallback(async () => { // Kept separate if only users need refresh sometimes
    try {
      const serverData = await fetchChatData();
      if (serverData && serverData.users) {
        setAllUsers(serverData.users);
      }
    } catch (error) {
      console.error("Error refreshing user data:", error);
      toast({ title: "Error", description: "Could not refresh user data.", variant: "destructive" });
    }
  }, [setAllUsers, toast]);


  const fetchAndUpdateChatData = useCallback(async (isInitialLoad = false) => {
    try {
      const serverData = await fetchChatData();
      let roomsToSyncOnServer: Room[] | null = null;
      let messagesToSyncOnServer: Message[] | null = null;
      let usersToUpdateLocally: User[] | null = null;

      if (serverData) {
        if (serverData.users) {
          if (JSON.stringify(serverData.users) !== JSON.stringify(allUsers)) {
             usersToUpdateLocally = serverData.users;
          }
        }

        if (serverData.rooms) {
          setRooms(prevLocalRooms => {
            const localRoomIds = new Set(prevLocalRooms.map(r => r.id));
            const newRoomsFromServer = serverData.rooms.filter(sr => !localRoomIds.has(sr.id));
            const serverRoomIds = new Set(serverData.rooms.map(r => r.id));
            const roomsMerged = [
              ...serverData.rooms, 
              ...prevLocalRooms.filter(lr => !serverRoomIds.has(lr.id)) 
            ].sort((a,b) => (a.name || "").localeCompare(b.name || ""));


            if (newRoomsFromServer.length > 0 || prevLocalRooms.length !== roomsMerged.length || JSON.stringify(roomsMerged) !== JSON.stringify(prevLocalRooms)) {
              roomsToSyncOnServer = roomsMerged;
              return roomsMerged;
            }
            return prevLocalRooms;
          });
        }

        if (serverData.messages) {
          setMessages(prevLocalMessages => {
            const localMessageIds = new Set(prevLocalMessages.map(m => m.id));
            const newMessagesFromServer = serverData.messages.filter(sm => !localMessageIds.has(sm.id));

            newMessagesFromServer.forEach(newMessage => {
              if (newMessage.roomId !== currentRoomRef.current?.id && (!user || newMessage.userId !== user.id)) {
                setUnreadRoomIds(prevUnread => ({ ...prevUnread, [newMessage.roomId]: true }));
              }
            });

            const serverMessageIds = new Set(serverData.messages.map(m => m.id));
            const messagesMerged = [
                ...serverData.messages,
                ...prevLocalMessages.filter(lm => !serverMessageIds.has(lm.id))
            ].sort((a, b) => a.timestamp - b.timestamp);

            if (newMessagesFromServer.length > 0 || prevLocalMessages.length !== messagesMerged.length || JSON.stringify(messagesMerged) !== JSON.stringify(prevLocalMessages)) {
              messagesToSyncOnServer = messagesMerged;
              return messagesMerged;
            }
            return prevLocalMessages;
          });
        }
        
        if (usersToUpdateLocally) {
          setAllUsers(usersToUpdateLocally);
        }
        if (roomsToSyncOnServer) {
          await syncRoomsToServer({ rooms: roomsToSyncOnServer });
        }
        if (messagesToSyncOnServer) {
          await syncMessagesToServer({ messages: messagesToSyncOnServer });
        }

        if (isInitialLoad) {
           const currentRoomsList = roomsToSyncOnServer || serverData.rooms || rooms;
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
  }, [user?.id, lastActiveRoomId, setLastActiveRoomId, setRooms, setMessages, setAllUsers, setUnreadRoomIds, rooms, allUsers]);

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
      const usersInRoom = allUsers.filter(u => currentRoom.members.includes(u.id) || u.id === user?.id);
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
    let messagesToSync: Message[] | null = null;
    setMessages(prevMessages => {
        const updatedMessages = [...prevMessages, message].sort((a,b) => a.timestamp - b.timestamp);
        messagesToSync = updatedMessages;
        return updatedMessages;
    });
    if (messagesToSync) {
        syncMessagesToServer({ messages: messagesToSync }).catch(error =>
            console.error("Failed to sync new message to server (simulation):", error)
        );
    }

    if (message.roomId !== currentRoomRef.current?.id && (!user || message.userId !== user.id)) {
        setUnreadRoomIds(prevUnread => ({ ...prevUnread, [message.roomId]: true }));
    }
  }, [setMessages, setUnreadRoomIds, user]);


  const joinRoom = useCallback((roomId: string) => {
    let roomsToSync: Room[] | null = null;
    setRooms(currentLocalRooms => {
        const roomToJoin = currentLocalRooms.find(r => r.id === roomId);
        if (roomToJoin) {
            setCurrentRoom(roomToJoin);
            setLastActiveRoomId(roomToJoin.id);
            setUnreadRoomIds(prevUnread => ({ ...prevUnread, [roomId]: false }));

            let updatedLocalRooms = currentLocalRooms;
            if (user && (!roomToJoin.isPrivate || roomToJoin.id.startsWith('dm_')) && !roomToJoin.members.includes(user.id)) {
                updatedLocalRooms = currentLocalRooms.map(r =>
                    r.id === roomId ? { ...r, members: [...r.members, user.id] } : r
                );
                roomsToSync = updatedLocalRooms;
            }
            return updatedLocalRooms;
        }
        return currentLocalRooms;
    });
    if (roomsToSync) {
        syncRoomsToServer({ rooms: roomsToSync }).catch(error =>
            console.error("Failed to sync room membership update to server (simulation):", error)
        );
    }
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
      members: [user.id], // Owner is a member by default
      ownerId: user.id,
    };
    let roomsToSync: Room[] | null = null;
    setRooms(prevRooms => {
        const updatedRoomsList = [...prevRooms, newRoom];
        roomsToSync = updatedRoomsList;
        return updatedRoomsList;
    });
    if (roomsToSync) {
        syncRoomsToServer({ rooms: roomsToSync }).catch(error =>
          console.error("Failed to sync rooms with server (simulation):", error)
        );
    }
    joinRoom(newRoom.id);
    return newRoom;
  }, [user, setRooms, joinRoom]);

  const startDirectMessage = useCallback(async (otherUserId: string) => {
    if (!user) return;
    const otherUser = allUsers.find(u => u.id === otherUserId);
    if (!otherUser) {
      console.error("Other user not found for DM");
      return;
    }

    const dmRoomId = `dm_${[user.id, otherUserId].sort().join('_')}`;
    const existingDM = rooms.find(r => r.id === dmRoomId);

    if (existingDM) {
      joinRoom(existingDM.id);
    } else {
      const newDmRoom: Room = {
        id: dmRoomId,
        name: `DM: ${user.username} & ${otherUser.username}`, // Internal name
        isPrivate: true,
        members: [user.id, otherUserId],
        ownerId: user.id, // DMs can conceptually have the initiator as owner for consistency
      };
      let roomsToSync: Room[] | null = null;
      setRooms(prevRooms => {
        const updatedRooms = [...prevRooms, newDmRoom];
        roomsToSync = updatedRooms;
        return updatedRooms;
      });
      if (roomsToSync) {
        await syncRoomsToServer({ rooms: roomsToSync });
      }
      joinRoom(newDmRoom.id);
    }
  }, [user, allUsers, rooms, joinRoom, setRooms]);


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
        content: "Sorry, I encountered an error trying to process your command. Ensure your GOOGLE_API_KEY is set.",
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

    if (isTyping && lastSentTypingStatusRef.current && targetRoomId === user.isTypingInRoomId) return;
    if (!isTyping && !lastSentTypingStatusRef.current && user.isTypingInRoomId === null) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(async () => {
      try {
        await updateUserTypingStatus({ userId: user.id, roomId: targetRoomId });
        setAllUsers(prev => prev.map(u => u.id === user.id ? {...u, isTypingInRoomId: targetRoomId} : u));
        lastSentTypingStatusRef.current = isTyping;
      } catch (error) {
        console.error("Failed to update typing status:", error);
      }
    }, TYPING_DEBOUNCE_TIME);
  }, [user, setAllUsers]);


  const sendMessage = useCallback(async (content: string) => {
    if (!user || !currentRoomRef.current) return;
    setUserTyping(false);

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

  const searchAllUsers = useCallback(async (query: string) => {
    if (!user) return;
    if (!query.trim()) {
      setSearchedUsers([]);
      return;
    }
    try {
      const result = await searchUsers({ query, currentUserId: user.id });
      setSearchedUsers(result.users);
    } catch (error) {
      console.error("Error searching users:", error);
      toast({ title: "Search Error", description: "Could not perform user search.", variant: "destructive" });
      setSearchedUsers([]);
    }
  }, [user, toast]);

  const sendFriendRequest = useCallback(async (recipientId: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const response = await sendFriendRequestFlow({ requesterId: user.id, recipientId });
      toast({ title: response.success ? "Success" : "Error", description: response.message, variant: response.success ? "default" : "destructive" });
      if (response.success) {
        await refreshAllUsers(); 
      }
      return response.success;
    } catch (error) {
      console.error("Error sending friend request:", error);
      toast({ title: "Error", description: "Could not send friend request.", variant: "destructive" });
      return false;
    }
  }, [user, toast, refreshAllUsers]);
  
  const acceptFriendRequest = useCallback(async (requesterId: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const response = await acceptFriendRequestFlow({ recipientId: user.id, requesterId });
      toast({ title: response.success ? "Success" : "Error", description: response.message, variant: response.success ? "default" : "destructive" });
      if (response.success) {
        await refreshAllUsers();
      }
      return response.success;
    } catch (error) {
      console.error("Error accepting friend request:", error);
      toast({ title: "Error", description: "Could not accept friend request.", variant: "destructive" });
      return false;
    }
  }, [user, toast, refreshAllUsers]);

  const declineOrCancelFriendRequest = useCallback(async (otherUserId: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const response = await declineOrCancelFriendRequestFlow({ userId: user.id, otherUserId });
      toast({ title: response.success ? "Success" : "Error", description: response.message, variant: response.success ? "default" : "destructive" });
      if (response.success) {
        await refreshAllUsers();
      }
      return response.success;
    } catch (error) {
      console.error("Error managing friend request:", error);
      toast({ title: "Error", description: "Could not manage friend request.", variant: "destructive" });
      return false;
    }
  }, [user, toast, refreshAllUsers]);

  const removeFriend = useCallback(async (friendId: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const response = await removeFriendFlow({ userId: user.id, otherUserId: friendId });
      toast({ title: response.success ? "Success" : "Error", description: response.message, variant: response.success ? "default" : "destructive" });
      if (response.success) {
        await refreshAllUsers();
      }
      return response.success;
    } catch (error) {
      console.error("Error removing friend:", error);
      toast({ title: "Error", description: "Could not remove friend.", variant: "destructive" });
      return false;
    }
  }, [user, toast, refreshAllUsers]);

  const inviteUserToRoom = useCallback(async (roomId: string, inviteeUserId: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const response = await inviteUserToRoomFlow({ roomId, inviterUserId: user.id, inviteeUserId });
      toast({ title: response.success ? "Success" : "Error", description: response.message, variant: response.success ? "default" : "destructive" });
      if (response.success && response.updatedRoom) {
        // Refresh all rooms or update just the specific one
        setRooms(prevRooms => prevRooms.map(r => r.id === roomId ? response.updatedRoom! : r));
        if (currentRoomRef.current && currentRoomRef.current.id === roomId) {
            setCurrentRoom(response.updatedRoom);
        }
      }
      return response.success;
    } catch (error) {
      console.error("Error inviting user to room:", error);
      toast({ title: "Error", description: "Could not invite user to room.", variant: "destructive" });
      return false;
    }
  }, [user, toast, setRooms, setCurrentRoom]);


  return (
    <ChatContext.Provider value={{
      rooms,
      messages,
      currentRoom,
      allUsers,
      searchedUsers,
      onlineUsers,
      typingUsers,
      createRoom,
      joinRoom,
      startDirectMessage,
      sendMessage,
      setUserTyping,
      isLoadingAiResponse,
      isLoadingInitialData,
      unreadRoomIds,
      searchAllUsers,
      sendFriendRequest,
      acceptFriendRequest,
      declineOrCancelFriendRequest,
      removeFriend,
      refreshAllUsers,
      inviteUserToRoom, // Added
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
