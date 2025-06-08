
"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useChat } from '@/contexts/chat-context';
import type { User } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { UserPlus, Users, MailWarning, CheckCircle, XCircle, Hourglass } from 'lucide-react';
import { AddFriendInput } from '@/components/friends/add-friend-input';
import { UserListItem } from '@/components/friends/user-list-item';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function FriendsPage() {
  const { user: currentUser } = useAuth();
  const {
    allUsers,
    sendFriendRequest,
    acceptFriendRequest,
    declineOrCancelFriendRequest,
    removeFriend,
    startDirectMessage,
    refreshAllUsers,
  } = useChat();

  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    refreshAllUsers();
  }, [currentUser, refreshAllUsers]);

  if (!currentUser) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <p>Loading user data...</p>
      </div>
    );
  }

  const friends = allUsers.filter(u => currentUser.friendIds?.includes(u.id));
  const pendingReceived = allUsers.filter(u => currentUser.pendingFriendRequestsReceived?.includes(u.id));
  const pendingSent = allUsers.filter(u => currentUser.sentFriendRequests?.includes(u.id));

  const handleAddFriend = async (username: string) => {
    const targetUser = allUsers.find(u => u.username.toLowerCase() === username.toLowerCase() && u.id !== currentUser.id);
    if (targetUser) {
      await sendFriendRequest(targetUser.id);
    } else {
      if (username.trim() === currentUser.username.trim()){
         return;
      }
      const recipient = allUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
      if (recipient) {
        await sendFriendRequest(recipient.id);
      }
    }
  };


  return (
    <div className="flex flex-col h-full">
      {/* The Tabs component now wraps both the header (with TabsList) and the ScrollArea (with TabsContent) */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1">
        <header className="p-4 border-b bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold">Friends</h1>
            </div>
            <AddFriendInput onAddFriend={handleAddFriend} />
          </div>
          <TabsList className="mt-4">
            <TabsTrigger value="all">All ({friends.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({pendingReceived.length + pendingSent.length})</TabsTrigger>
          </TabsList>
        </header>

        <ScrollArea className="flex-1">
          <TabsContent value="all" className="p-4 m-0">
            {friends.length > 0 ? (
              <ul className="space-y-2">
                {friends.map(friend => (
                  <UserListItem
                    key={friend.id}
                    user={friend}
                    currentUser={currentUser}
                    type="friend"
                    onMessage={() => startDirectMessage(friend.id)}
                    onRemoveFriend={() => removeFriend(friend.id)}
                  />
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-center py-8">You have no friends yet. Try adding some!</p>
            )}
          </TabsContent>

          <TabsContent value="pending" className="p-4 m-0">
            {pendingReceived.length > 0 && (
              <>
                <h2 className="text-sm font-semibold text-muted-foreground mb-2">
                  INCOMING FRIEND REQUESTS — {pendingReceived.length}
                </h2>
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
                <h2 className="text-sm font-semibold text-muted-foreground mb-2">
                  OUTGOING FRIEND REQUESTS — {pendingSent.length}
                </h2>
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
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
