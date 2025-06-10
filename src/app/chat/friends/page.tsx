
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useChat } from '@/contexts/chat-context';
import type { User, Room } from '@/types';
import { Button } from '@/components/ui/button';
import { UserPlus, Users, MailWarning, CheckCircle, XCircle, Hourglass, MessagesSquare, MessageCircle } from 'lucide-react';
import { AddFriendInput } from '@/components/friends/add-friend-input';
import { UserListItem } from '@/components/friends/user-list-item';
import { DirectMessageList } from '@/components/dms/direct-message-list';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageList } from '@/components/chat/message-list';
import { ChatInput } from '@/components/chat/chat-input';
import { cn } from '@/lib/utils';

type ActiveFriendsView = 'dm_chat' | 'all_friends' | 'pending_requests';

export default function FriendsPage() {
  const { user: currentUser } = useAuth();
  const {
    allUsers,
    rooms,
    currentRoom, 
    sendFriendRequest,
    acceptFriendRequest,
    declineOrCancelFriendRequest,
    removeFriend,
    startDirectMessage,
    joinRoom, 
  } = useChat();

  const [activeView, setActiveView] = useState<ActiveFriendsView>('dm_chat');

  // Removed useEffect that called refreshAllUsers()
  // Data is now primarily sourced from ChatContext's polled updates

  useEffect(() => {
    if (currentRoom && currentRoom.id.startsWith('dm_')) {
      setActiveView('dm_chat');
    }
  }, [currentRoom]);


  const friends = useMemo(() => {
    if (!currentUser) return [];
    return allUsers.filter(u => currentUser.friendIds?.includes(u.id));
  }, [allUsers, currentUser]);

  const pendingReceived = useMemo(() => {
    if (!currentUser) return [];
    return allUsers.filter(u => currentUser.pendingFriendRequestsReceived?.includes(u.id));
  }, [allUsers, currentUser]);

  const pendingSent = useMemo(() => {
    if (!currentUser) return [];
    return allUsers.filter(u => currentUser.sentFriendRequests?.includes(u.id));
  }, [allUsers, currentUser]);

  if (!currentUser) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <p>Loading user data...</p>
      </div>
    );
  }

  const handleAddFriend = async (username: string) => {
    const targetUser = allUsers.find(u => u.username.toLowerCase() === username.toLowerCase() && u.id !== currentUser.id);
    if (targetUser) {
      await sendFriendRequest(targetUser.id);
    } else {
      if (username.trim().toLowerCase() === currentUser.username.trim().toLowerCase()){
         // User trying to add themselves, perhaps show a toast or just ignore
         console.warn("User tried to add themselves as a friend.");
         return; 
      }
      const recipient = allUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
      if (recipient) {
        await sendFriendRequest(recipient.id);
      }
      // Optionally, add a toast here if username is not found at all
    }
  };

  const renderRightPanelContent = () => {
    if (activeView === 'dm_chat') {
      if (currentRoom && currentRoom.id.startsWith('dm_')) {
        return (
          <>
            <MessageList />
            <ChatInput />
          </>
        );
      }
      return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
          <MessageCircle size={48} className="mb-4 opacity-50" />
          <p className="text-center">Select a conversation to start chatting.</p>
          <p className="text-xs text-center mt-2">Or, find users to start a new DM!</p>
        </div>
      );
    }

    if (activeView === 'all_friends') {
      return (
        <ScrollArea className="flex-1 p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 mb-3">
            All Friends — {friends.length}
          </h3>
          {friends.length > 0 ? (
            <ul className="space-y-2">
              {friends.map((friend) => (
                <UserListItem
                  key={friend.id}
                  user={friend}
                  currentUser={currentUser}
                  type="friend"
                  onMessage={() => joinRoom(startDirectMessage(friend.id) && `dm_${[currentUser.id, friend.id].sort().join('_')}`)}
                  onRemoveFriend={() => removeFriend(friend.id)}
                />
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-center py-8">You have no friends yet. Try adding some!</p>
          )}
        </ScrollArea>
      );
    }

    if (activeView === 'pending_requests') {
      return (
        <ScrollArea className="flex-1 p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 mb-3">
            Pending Requests — {pendingReceived.length + pendingSent.length}
          </h3>
          {pendingReceived.length > 0 && (
            <>
              <h4 className="text-sm font-medium text-foreground mt-4 mb-2 px-2">
                Incoming ({pendingReceived.length})
              </h4>
              <ul className="space-y-2 mb-6">
                {pendingReceived.map(requestUser => (
                  <UserListItem
                    key={requestUser.id}
                    user={requestUser}
                    currentUser={currentUser}
                    type="pending-received"
                    onAcceptRequest={() => acceptFriendRequest(requestUser.id)}
                    onDeclineRequest={() => declineOrCancelFriendRequest(requestUser.id)}
                  />
                ))}
              </ul>
            </>
          )}
          {pendingSent.length > 0 && (
             <>
              <h4 className="text-sm font-medium text-foreground mt-4 mb-2 px-2">
                Outgoing ({pendingSent.length})
              </h4>
              <ul className="space-y-2">
                {pendingSent.map(requestUser => (
                  <UserListItem
                    key={requestUser.id}
                    user={requestUser}
                    currentUser={currentUser}
                    type="pending-sent"
                    onCancelRequest={() => declineOrCancelFriendRequest(requestUser.id)}
                  />
                ))}
              </ul>
            </>
          )}
          {pendingReceived.length === 0 && pendingSent.length === 0 && (
            <p className="text-muted-foreground text-center py-8">No pending friend requests.</p>
          )}
        </ScrollArea>
      );
    }
    return null;
  };

  return (
    <div className="flex h-full w-full">
      <div className="w-72 flex-shrink-0 border-r bg-card flex flex-col">
        <div className="p-4 border-b">
          <AddFriendInput onAddFriend={handleAddFriend} />
        </div>
        <div className="p-2 space-y-1 border-b">
          <Button
            variant={activeView === 'all_friends' ? "secondary" : "ghost"}
            className={cn("w-full justify-start", activeView === 'all_friends' && "bg-primary/10 text-primary")}
            onClick={() => setActiveView('all_friends')}
          >
            <Users className="mr-2 h-5 w-5" /> All Friends
          </Button>
          <Button
            variant={activeView === 'pending_requests' ? "secondary" : "ghost"}
            className={cn("w-full justify-start", activeView === 'pending_requests' && "bg-primary/10 text-primary")}
            onClick={() => setActiveView('pending_requests')}
          >
            <Hourglass className="mr-2 h-5 w-5" /> Pending
          </Button>
        </div>
        <div className="p-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 mb-1">Direct Messages</h3>
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <DirectMessageList />
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col bg-background">
        {renderRightPanelContent()}
      </div>
    </div>
  );
}
