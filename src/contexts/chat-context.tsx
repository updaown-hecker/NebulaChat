
"use client";

import type { Room, Message, User } from '@/types';
import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './auth-context';
import { suggestRoomOnboarding } from '@/ai/flows/suggest-room-onboarding';
import { aiTutorialCommand } from '@/ai/flows/ai-tutorial-command';
import { fetchChatData, syncRoomsToServer, syncMessagesToServer } from '@/ai/flows/chat-data-flow';
import { updateUserTypingStatus } from '@/ai/flows/auth-flow';
import { searchUsers, sendFriendRequest as sendFriendRequestFlow, acceptFriendRequest as acceptFriendRequestFlow, declineOrCancelFriendRequest as declineOrCancelFriendRequestFlow, removeFriend as removeFriendFlow } from '@/ai/flows/friend-flow';
import { inviteUserToRoom as inviteUserToRoomFlow, leaveDmRoom as leaveDmRoomFlow } from '@/ai/flows/room-management-flow'; // Added leaveDmRoomFlow
import useLocalStorage from '@/hooks/use-local-storage';
import {
  LOCAL_STORAGE_MESSAGES_KEY,
  LOCAL_STORAGE_ROOMS_KEY,
  LOCAL_STORAGE_LAST_ACTIVE_ROOM_ID_KEY,
  LOCAL_STORAGE_UNREAD_ROOM_IDS_KEY
} from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { useRouter, usePathname } from 'next/navigation'; // Import useRouter and usePathname

interface ChatContextType {
  rooms: Room[];
  messages: Message[];
  currentRoom: Room | null;
  allUsers: User[];
  searchedUsers: User[];
  onlineUsers: User[];
  typingUsers: User[];
  replyingToMessage: Message | null; 
  createRoom: (name: string, isPrivate: boolean) => Promise<Room | null>;
  joinRoom: (roomId: string) => void;
  startDirectMessage: (otherUserId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  editMessage: (messageId: string, newContent: string) => Promise<boolean>;
  deleteMessage: (messageId: string) => Promise<boolean>;
  setUserTyping: (isTyping: boolean) => void;
  setReplyingTo: (message: Message | null) => void; 
  isLoadingAiResponse: boolean;
  isLoadingInitialData: boolean;
  unreadRoomIds: Record<string, boolean>;
  searchAllUsers: (query: string) => Promise<void>;
  sendFriendRequest: (recipientId: string) => Promise<boolean>;
  acceptFriendRequest: (requesterId: string) => Promise<boolean>;
  declineOrCancelFriendRequest: (otherUserId: string) => Promise<boolean>;
  removeFriend: (friendId: string) => Promise<boolean>;
  refreshAllUsers: () => Promise<void>;
  inviteUserToRoom: (roomId: string, inviteeUserId: string) => Promise<boolean>;
  leaveDm: (roomId: string) => Promise<boolean>; // Added for leaving DMs
  refreshAllData: (showToast?: boolean) => Promise<void>; // Exposed refreshAllData
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
  const { user, updateUser: updateAuthUser } = useAuth(); // Added updateAuthUser
  const { toast } = useToast();
  const router = useRouter(); // Initialize router
  const pathname = usePathname(); // Get current pathname
  const [rooms, setRooms] = useLocalStorage<Room[]>(LOCAL_STORAGE_ROOMS_KEY, []);
  const [messages, setMessages] = useLocalStorage<Message[]>(LOCAL_STORAGE_MESSAGES_KEY, []);
  const [allUsers, setAllUsers] = useLocalStorage<User[]>('nebulaChatAllUsers', []);
  const [searchedUsers, setSearchedUsers] = useState<User[]>([]);

  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [lastActiveRoomId, setLastActiveRoomId] = useLocalStorage<string | null>(LOCAL_STORAGE_LAST_ACTIVE_ROOM_ID_KEY, null);
  const [unreadRoomIds, setUnreadRoomIds] = useLocalStorage<Record<string, boolean>>(LOCAL_STORAGE_UNREAD_ROOM_IDS_KEY, {});
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null); 

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

  const setReplyingTo = (message: Message | null) => {
    setReplyingToMessage(message);
  };

  const refreshAllData = useCallback(async (showToast = false) => {
    try {
      const serverData = await fetchChatData();
      if (serverData) {
        if (serverData.users) setAllUsers(serverData.users);
        if (serverData.rooms) {
            setRooms(serverData.rooms);
            if (currentRoomRef.current) {
                const updatedCurrentRoom = serverData.rooms.find(r => r.id === currentRoomRef.current!.id);
                if (updatedCurrentRoom) {
                    if (updatedCurrentRoom.isPrivate && user && !updatedCurrentRoom.members.includes(user.id)) {
                        setCurrentRoom(serverData.rooms.find(r => !r.isPrivate && user && r.members.includes(user.id)) || serverData.rooms.find(r => !r.isPrivate) || serverData.rooms[0] || null);
                        if (currentRoom) setLastActiveRoomId(currentRoom.id); else setLastActiveRoomId(null);

                    } else {
                        setCurrentRoom(updatedCurrentRoom);
                    }
                } else { 
                    const newRoomToJoin = serverData.rooms.find(r => !r.isPrivate && user && r.members.includes(user.id)) || serverData.rooms.find(r => !r.isPrivate) || serverData.rooms[0] || null;
                    setCurrentRoom(newRoomToJoin);
                    if (newRoomToJoin) setLastActiveRoomId(newRoomToJoin.id); else setLastActiveRoomId(null);
                }
            }
        }
        if (serverData.messages) setMessages(serverData.messages);
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
  }, [setAllUsers, setRooms, setMessages, toast, user, setLastActiveRoomId, currentRoom]);


  const refreshAllUsers = useCallback(async () => {
    try {
      const serverData = await fetchChatData();
      if (serverData && serverData.users) {
        setAllUsers(serverData.users);
        // Also update AuthContext user if current user details changed
        if (user && serverData.users.some(u => u.id === user.id)) {
            const updatedCurrentUser = serverData.users.find(u => u.id === user.id);
            if (updatedCurrentUser && JSON.stringify(updatedCurrentUser) !== JSON.stringify(user)) {
                updateAuthUser(updatedCurrentUser);
            }
        }
      }
    } catch (error) {
      console.error("Error refreshing user data:", error);
      toast({ title: "Error", description: "Could not refresh user data.", variant: "destructive" });
    }
  }, [setAllUsers, toast, user, updateAuthUser]);


  const fetchAndUpdateChatData = useCallback(async (isInitialLoad = false) => {
    try {
      const serverData = await fetchChatData();
      let usersToUpdateLocally: User[] | null = null;

      if (serverData) {
        if (serverData.users) {
          if (JSON.stringify(serverData.users) !== JSON.stringify(allUsers)) {
             usersToUpdateLocally = serverData.users;
          }
        }
        
        if (serverData.rooms) {
          if (JSON.stringify(serverData.rooms) !== JSON.stringify(rooms)) {
            setRooms(serverData.rooms); 
          }
        }


        if (serverData.messages) {
          const localMessageIds = new Set(messages.map(m => m.id));
          const newMessagesFromServer = serverData.messages.filter(sm => !localMessageIds.has(sm.id));

          newMessagesFromServer.forEach(newMessage => {
            if (newMessage.roomId !== currentRoomRef.current?.id && (!user || newMessage.userId !== user.id)) {
              setUnreadRoomIds(prevUnread => ({ ...prevUnread, [newMessage.roomId]: true }));
            }
          });
          
          if (JSON.stringify(serverData.messages.sort((a,b)=>a.timestamp-b.timestamp)) !== JSON.stringify(messages.sort((a,b)=>a.timestamp-b.timestamp))) {
            setMessages(serverData.messages);
          }
        }
        
        if (usersToUpdateLocally) {
          setAllUsers(usersToUpdateLocally);
           // Also update AuthContext user if current user details changed
            if (user && usersToUpdateLocally.some(u => u.id === user.id)) {
                const updatedCurrentUser = usersToUpdateLocally.find(u => u.id === user.id);
                if (updatedCurrentUser && JSON.stringify(updatedCurrentUser) !== JSON.stringify(user)) {
                    updateAuthUser(updatedCurrentUser);
                }
            }
        }
        
        if (isInitialLoad) {
           const currentRoomsList = serverData.rooms || rooms; 
           let roomToAutoJoin: Room | null = null;

           if (lastActiveRoomId) {
            const roomToRestore = currentRoomsList.find(r => r.id === lastActiveRoomId);
            if (roomToRestore) {
                if (!roomToRestore.isPrivate || (user && roomToRestore.members.includes(user.id))) {
                    roomToAutoJoin = roomToRestore;
                } else {
                    setLastActiveRoomId(null); 
                }
            } else {
              setLastActiveRoomId(null); 
            }
          }
          
          if (!roomToAutoJoin && currentRoomsList.length > 0) {
             roomToAutoJoin = currentRoomsList.find(r => !r.isPrivate && (user ? r.members.includes(user.id) : true)) || 
                              currentRoomsList.find(r => user && r.members.includes(user.id)) || 
                              currentRoomsList[0];
          }

          if (roomToAutoJoin && (!currentRoomRef.current || currentRoomRef.current.id !== roomToAutoJoin.id)) {
             setCurrentRoom(roomToAutoJoin);
             setLastActiveRoomId(roomToAutoJoin.id);
             setUnreadRoomIds(prevUnread => ({ ...prevUnread, [roomToAutoJoin!.id]: false }));
          } else if (!roomToAutoJoin && currentRoomsList.length === 0) {
             setCurrentRoom(null); 
          }
        }
      } else if (isInitialLoad) { 
        if (rooms.length === 0) setRooms(DEFAULT_INITIAL_ROOMS);
        if (messages.length === 0) setMessages(DEFAULT_INITIAL_MESSAGES);
        if (allUsers.length === 0 && user) setAllUsers([user]);
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
  }, [user, lastActiveRoomId, setLastActiveRoomId, setRooms, rooms, setMessages, messages, setAllUsers, allUsers, setUnreadRoomIds, String(user?.id), updateAuthUser]);

  useEffect(() => {
    fetchAndUpdateChatData(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [String(user?.id)]); 

  useEffect(() => {
    if (isLoadingInitialData) return;
    const intervalId = setInterval(() => {
      fetchAndUpdateChatData(false);
    }, POLLING_INTERVAL);
    return () => clearInterval(intervalId);
  }, [isLoadingInitialData, fetchAndUpdateChatData]);

  useEffect(() => {
    if (currentRoom && allUsers.length > 0) {
      const usersInRoom = allUsers.filter(u => currentRoom.members.includes(u.id));
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
    const roomToJoin = rooms.find(r => r.id === roomId);
    if (roomToJoin) {
        if (roomToJoin.isPrivate && user && !roomToJoin.members.includes(user.id)) {
            toast({title: "Access Denied", description: "You are not a member of this private room.", variant: "destructive"});
            return;
        }
        setCurrentRoom(roomToJoin);
        setLastActiveRoomId(roomToJoin.id);
        setUnreadRoomIds(prevUnread => ({ ...prevUnread, [roomId]: false }));

        if (user && !roomToJoin.isPrivate && !roomToJoin.members.includes(user.id)) {
            const updatedRoom = { ...roomToJoin, members: [...roomToJoin.members, user.id] };
            const updatedRoomsList = rooms.map(r => r.id === roomId ? updatedRoom : r);
            setRooms(updatedRoomsList);
            syncRoomsToServer({ rooms: updatedRoomsList }).catch(error =>
                console.error("Failed to sync public room membership update to server (simulation):", error)
            );
        }
        // Conditional navigation:
        // If joining a group room, or if currently not on /chat/friends page, navigate to /chat.
        // If joining a DM and already on /chat/friends, stay on /chat/friends.
        const isDmRoom = roomToJoin.id.startsWith('dm_');
        if (!isDmRoom || pathname !== '/chat/friends') {
            router.push('/chat');
        }
    }
  }, [user, rooms, setRooms, setCurrentRoom, setLastActiveRoomId, setUnreadRoomIds, toast, router, pathname]);

  useEffect(() => {
    if (isLoadingInitialData || rooms.length === 0) return;
    
    let roomToAutoJoin: Room | null = null;
    if (lastActiveRoomId) {
        roomToAutoJoin = rooms.find(r => r.id === lastActiveRoomId) || null;
        if (roomToAutoJoin && roomToAutoJoin.isPrivate && user && !roomToAutoJoin.members.includes(user.id)) {
            roomToAutoJoin = null; 
            setLastActiveRoomId(null);
        }
    }

    if (!roomToAutoJoin && rooms.length > 0) {
        // Prioritize non-DM rooms if not already in a DM context (i.e., not on /chat/friends)
        if (pathname !== '/chat/friends') {
            roomToAutoJoin = rooms.find(r => r.id === 'general' && !r.id.startsWith('dm_') && (!r.isPrivate || (user && r.members.includes(user.id)))) ||
                             rooms.find(r => !r.id.startsWith('dm_') && !r.isPrivate && (user ? r.members.includes(user.id) : true)) ||
                             rooms.find(r => !r.id.startsWith('dm_') && user && r.members.includes(user.id)) ||
                             rooms.find(r => !r.id.startsWith('dm_'));
        }
        // If still no room, or on /chat/friends, consider any room
        if (!roomToAutoJoin) {
             roomToAutoJoin = rooms.find(r => r.id === 'general' && (!r.isPrivate || (user && r.members.includes(user.id)))) ||
                         rooms.find(r => !r.isPrivate && (user ? r.members.includes(user.id) : true)) ||
                         rooms.find(r => user && r.members.includes(user.id)) ||
                         rooms[0]; 
        }
    }
    
    if (roomToAutoJoin && (!currentRoom || currentRoom.id !== roomToAutoJoin.id)) {
        if (!roomToAutoJoin.isPrivate || (user && roomToAutoJoin.members.includes(user.id))) {
            joinRoom(roomToAutoJoin.id);
        } else if (currentRoom && (!currentRoom.isPrivate || (user && currentRoom.members.includes(user.id)))) {
            // Current room is still valid, do nothing
        } else {
            const firstPublicValidRoom = rooms.find(r => !r.isPrivate && (!r.id.startsWith('dm_') || pathname === '/chat/friends'));
            if (firstPublicValidRoom) joinRoom(firstPublicValidRoom.id);
        }
    } else if (!roomToAutoJoin && currentRoom) {
        // If current room is invalid (e.g. private and user no longer member)
        if (currentRoom.isPrivate && user && !currentRoom.members.includes(user.id)) {
            const firstPublicValidRoom = rooms.find(r => !r.isPrivate && (!r.id.startsWith('dm_') || pathname === '/chat/friends'));
            if (firstPublicValidRoom) joinRoom(firstPublicValidRoom.id); else setCurrentRoom(null);
        }
    }

  }, [isLoadingInitialData, rooms, lastActiveRoomId, currentRoom, joinRoom, setLastActiveRoomId, user, pathname]);


  const createRoom = useCallback(async (name: string, isPrivate: boolean): Promise<Room | null> => {
    if (!user) return null;
    const newRoom: Room = {
      id: `room-${Date.now()}-${Math.random().toString(36).substring(2,7)}`,
      name,
      isPrivate,
      members: [user.id], 
      ownerId: user.id,
    };

    const updatedRoomsList = [...rooms, newRoom];
    setRooms(updatedRoomsList); 
    
    try {
        await syncRoomsToServer({ rooms: updatedRoomsList });
        joinRoom(newRoom.id);
        return newRoom;
    } catch (error) {
        console.error("Failed to sync new room with server (simulation):", error);
        toast({title: "Error", description: "Could not save new room to server.", variant: "destructive"});
        setRooms(rooms); 
        return null;
    }
  }, [user, rooms, setRooms, joinRoom, toast]);

  const startDirectMessage = useCallback(async (otherUserId: string) => {
    if (!user) return;
    const otherUser = allUsers.find(u => u.id === otherUserId);
    if (!otherUser) {
      console.error("Other user not found for DM");
      toast({title: "Error", description: "User to DM not found.", variant: "destructive"});
      return;
    }

    const dmRoomId = `dm_${[user.id, otherUserId].sort().join('_')}`;
    let existingDM = rooms.find(r => r.id === dmRoomId);
    let roomsListChanged = false;
    let finalRoomsToSync = [...rooms];

    if (existingDM) {
      // If DM exists, ensure current user is a member (handles rejoining after leaving)
      if (!existingDM.members.includes(user.id)) {
        existingDM = { ...existingDM, members: [...new Set([...existingDM.members, user.id])].sort() };
        finalRoomsToSync = finalRoomsToSync.map(r => r.id === existingDM!.id ? existingDM : r);
        roomsListChanged = true;
      }
    } else {
      // Create new DM room
      existingDM = {
        id: dmRoomId,
        name: `DM: ${user.username} & ${otherUser.username}`, 
        isPrivate: true,
        members: [user.id, otherUserId].sort(), 
        ownerId: user.id, // Or null/system for DMs, owner might not be strictly needed for DMs
      };
      finalRoomsToSync.push(existingDM);
      roomsListChanged = true;
    }

    if (roomsListChanged) {
      setRooms(finalRoomsToSync);
      try {
        await syncRoomsToServer({ rooms: finalRoomsToSync });
      } catch (error) {
        console.error("Failed to sync DM room:", error);
        toast({title: "Error", description: "Could not update DM room on server.", variant: "destructive"});
        // Revert local state if server sync fails
        setRooms(rooms); 
        return; // Don't proceed to join if sync failed
      }
    }
    joinRoom(existingDM.id);

  }, [user, allUsers, rooms, joinRoom, setRooms, toast]);


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
        ...(replyingToMessage && { 
          replyToMessageId: replyingToMessage.id,
          replyToUsername: replyingToMessage.username,
        }),
      };
      addMessage(newMessage);
      setReplyingToMessage(null); 
    }
  }, [user, addMessage, handleAiCommand, setUserTyping, replyingToMessage]);

  const editMessage = useCallback(async (messageId: string, newContent: string): Promise<boolean> => {
    if (!user) return false;
    const originalMessages = messages; 
    const messageIndex = originalMessages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return false;

    const messageToEdit = originalMessages[messageIndex];
    if (messageToEdit.userId !== user.id && !user.isAdmin) {
      toast({ title: "Permission Denied", description: "You can only edit your own messages.", variant: "destructive" });
      return false;
    }

    const updatedMessage = {
      ...messageToEdit,
      content: newContent,
      isEdited: true,
      editedTimestamp: Date.now(),
    };
    
    const newMessages = [...originalMessages];
    newMessages[messageIndex] = updatedMessage;
    setMessages(newMessages); 

    try {
        await syncMessagesToServer({ messages: newMessages });
        toast({ title: "Message Edited", description: "Your message has been updated." });
        return true;
    } catch (error) {
        console.error("Failed to sync edited message:", error);
        toast({ title: "Error", description: "Could not save edited message to server.", variant: "destructive"});
        setMessages(originalMessages); 
        return false;
    }
  }, [user, messages, setMessages, toast]);

  const deleteMessage = useCallback(async (messageId: string): Promise<boolean> => {
    if (!user) return false;
    const originalMessages = messages; 
    const messageToDelete = originalMessages.find(m => m.id === messageId);
    if (!messageToDelete) return false;

    if (messageToDelete.userId !== user.id && !user.isAdmin) {
      toast({ title: "Permission Denied", description: "You can only delete your own messages.", variant: "destructive" });
      return false;
    }
    
    const filteredMessages = originalMessages.filter(m => m.id !== messageId);
    setMessages(filteredMessages); 
    
    try {
        await syncMessagesToServer({ messages: filteredMessages });
        toast({ title: "Message Deleted", description: "The message has been removed." });
        return true;
    } catch (error) {
        console.error("Failed to sync deleted message:", error);
        toast({ title: "Error", description: "Could not delete message on server.", variant: "destructive"});
        setMessages(originalMessages); 
        return false;
    }
  }, [user, messages, setMessages, toast]);


  const searchAllUsers = useCallback(async (query: string) => {
    if (!user) return;
    // if (!query.trim()) { // Keep this commented to allow fetching all users with empty query
    //   setSearchedUsers([]);
    //   return;
    // }
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
        await refreshAllUsers(); // Refreshes all users list from "server"
        if (response.updatedRequester && response.updatedRequester.id === user.id) {
            updateAuthUser(response.updatedRequester); // Update current user in AuthContext
        }
      }
      return response.success;
    } catch (error) {
      console.error("Error sending friend request:", error);
      toast({ title: "Error", description: "Could not send friend request.", variant: "destructive" });
      return false;
    }
  }, [user, toast, refreshAllUsers, updateAuthUser]);
  
  const acceptFriendRequest = useCallback(async (requesterId: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const response = await acceptFriendRequestFlow({ recipientId: user.id, requesterId });
      toast({ title: response.success ? "Success" : "Error", description: response.message, variant: response.success ? "default" : "destructive" });
      if (response.success) {
        await refreshAllUsers();
         if (response.updatedRecipient && response.updatedRecipient.id === user.id) {
            updateAuthUser(response.updatedRecipient);
        }
      }
      return response.success;
    } catch (error) {
      console.error("Error accepting friend request:", error);
      toast({ title: "Error", description: "Could not accept friend request.", variant: "destructive" });
      return false;
    }
  }, [user, toast, refreshAllUsers, updateAuthUser]);

  const declineOrCancelFriendRequest = useCallback(async (otherUserId: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const response = await declineOrCancelFriendRequestFlow({ userId: user.id, otherUserId });
      toast({ title: response.success ? "Success" : "Error", description: response.message, variant: response.success ? "default" : "destructive" });
      if (response.success) {
        await refreshAllUsers();
        if (response.updatedRequester && response.updatedRequester.id === user.id) {
            updateAuthUser(response.updatedRequester);
        }
      }
      return response.success;
    } catch (error) {
      console.error("Error managing friend request:", error);
      toast({ title: "Error", description: "Could not manage friend request.", variant: "destructive" });
      return false;
    }
  }, [user, toast, refreshAllUsers, updateAuthUser]);

  const removeFriend = useCallback(async (friendId: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const response = await removeFriendFlow({ userId: user.id, otherUserId: friendId });
      toast({ title: response.success ? "Success" : "Error", description: response.message, variant: response.success ? "default" : "destructive" });
      if (response.success) {
        await refreshAllUsers();
        if (response.updatedRequester && response.updatedRequester.id === user.id) {
            updateAuthUser(response.updatedRequester);
        }
      }
      return response.success;
    } catch (error) {
      console.error("Error removing friend:", error);
      toast({ title: "Error", description: "Could not remove friend.", variant: "destructive" });
      return false;
    }
  }, [user, toast, refreshAllUsers, updateAuthUser]);

  const inviteUserToRoom = useCallback(async (roomId: string, inviteeUserId: string): Promise<boolean> => {
    if (!user) return false;
    const roomToInviteTo = rooms.find(r => r.id === roomId);
    if (!roomToInviteTo) {
        toast({title: "Error", description: "Room not found.", variant: "destructive"});
        return false;
    }
    if (!roomToInviteTo.isPrivate) {
        toast({title: "Info", description: "This room is public, users can join directly."});
        return false;
    }
    if (roomToInviteTo.ownerId !== user.id && !user.isAdmin) {
        toast({title: "Permission Denied", description: "Only the room owner or an admin can invite users.", variant: "destructive"});
        return false;
    }

    try {
      const response = await inviteUserToRoomFlow({ roomId, inviterUserId: user.id, inviteeUserId });
      toast({ title: response.success ? "Success" : "Error", description: response.message, variant: response.success ? "default" : "destructive" });
      if (response.success && response.updatedRoom) {
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
  }, [user, toast, setRooms, rooms, setCurrentRoom]);

  const leaveDm = useCallback(async (roomId: string): Promise<boolean> => {
    if (!user) return false;
    try {
        const response = await leaveDmRoomFlow({ userId: user.id, roomId });
        toast({ title: response.success ? "DM Hidden" : "Error", description: response.message, variant: response.success ? "default" : "destructive" });
        if (response.success) {
            await refreshAllData(false); // Refresh all data to update room list, no separate toast
            // If the current room was the one left, switch to a default/general room
            if (currentRoomRef.current && currentRoomRef.current.id === roomId) {
                const generalRoom = rooms.find(r => r.id === 'general' && (!r.isPrivate || r.members.includes(user.id))) || rooms.find(r => !r.isPrivate && r.members.includes(user.id)) || rooms.find(r => !r.isPrivate);
                if (generalRoom) {
                    joinRoom(generalRoom.id);
                } else if (rooms.length > 0 && rooms.filter(r => r.id !== roomId).length > 0) {
                     const nextAvailableRoom = rooms.filter(r => r.id !== roomId && (!r.isPrivate || r.members.includes(user.id)))[0];
                     if (nextAvailableRoom) joinRoom(nextAvailableRoom.id); else setCurrentRoom(null);
                }
                 else {
                    setCurrentRoom(null);
                }
            }
        }
        return response.success;
    } catch (error) {
        console.error("Error leaving DM:", error);
        toast({ title: "Error", description: "Could not leave DM chat.", variant: "destructive" });
        return false;
    }
  }, [user, toast, refreshAllData, rooms, joinRoom]);


  return (
    <ChatContext.Provider value={{
      rooms,
      messages,
      currentRoom,
      allUsers,
      searchedUsers,
      onlineUsers,
      typingUsers,
      replyingToMessage, 
      createRoom,
      joinRoom,
      startDirectMessage,
      sendMessage,
      editMessage,
      deleteMessage,
      setUserTyping,
      setReplyingTo, 
      isLoadingAiResponse,
      isLoadingInitialData,
      unreadRoomIds,
      searchAllUsers,
      sendFriendRequest,
      acceptFriendRequest,
      declineOrCancelFriendRequest,
      removeFriend,
      refreshAllUsers,
      inviteUserToRoom,
      leaveDm, 
      refreshAllData, 
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

    
