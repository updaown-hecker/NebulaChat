
"use client";

import React, { useState, useEffect } from 'react';
import { useChat } from '@/contexts/chat-context';
import { useAuth } from '@/contexts/auth-context';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Info, Edit3, MessageSquare, UserPlus, CheckCircle, XCircle, UserMinus, Hourglass, Search } from 'lucide-react';
import type { User } from '@/types';
import { Separator } from '../ui/separator';

export function RightSidebar() {
  const { 
    currentRoom, 
    allUsers, 
    typingUsers, 
    startDirectMessage,
    searchedUsers,
    searchAllUsers,
    sendFriendRequest,
    acceptFriendRequest,
    declineOrCancelFriendRequest,
    removeFriend,
  } = useChat();
  const { user: currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchAllUsers(searchQuery.trim()); // Let context handle empty query to clear results
    }, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, searchAllUsers]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const handleSendFriendRequest = async (recipientId: string) => {
    await sendFriendRequest(recipientId);
  };

  const handleAcceptFriendRequest = async (requesterId: string) => {
    await acceptFriendRequest(requesterId);
  };

  const handleDeclineFriendRequest = async (otherUserId: string) => {
    await declineOrCancelFriendRequest(otherUserId);
  };
  
  const handleCancelFriendRequest = async (otherUserId: string) => {
    await declineOrCancelFriendRequest(otherUserId);
  };

  const handleRemoveFriend = async (friendId: string) => {
    await removeFriend(friendId);
  };

  const renderUserActions = (targetUser: User) => {
    if (!currentUser || currentUser.id === targetUser.id) return null;

    const isFriend = currentUser.friendIds?.includes(targetUser.id);
    const requestSent = currentUser.sentFriendRequests?.includes(targetUser.id);
    const requestReceived = currentUser.pendingFriendRequestsReceived?.includes(targetUser.id);

    const actionButtons = [];

    if (isFriend) {
      actionButtons.push(
        <Button key="remove" variant="outline" size="sm" onClick={() => handleRemoveFriend(targetUser.id)} className="text-xs h-7">
          <UserMinus className="mr-1 h-3 w-3" /> Friends
        </Button>
      );
    } else if (requestSent) {
      actionButtons.push(
        <Button key="sent" variant="outline" size="sm" onClick={() => handleCancelFriendRequest(targetUser.id)} className="text-xs h-7">
          <Hourglass className="mr-1 h-3 w-3" /> Sent
        </Button>
      );
    } else if (requestReceived) {
      actionButtons.push(
        <Button key="accept" variant="default" size="sm" onClick={() => handleAcceptFriendRequest(targetUser.id)} className="text-xs h-7">
          <CheckCircle className="mr-1 h-3 w-3" /> Accept
        </Button>,
        <Button key="decline" variant="outline" size="sm" onClick={() => handleDeclineFriendRequest(targetUser.id)} className="ml-1 text-xs h-7">
          <XCircle className="mr-1 h-3 w-3" /> Decline
        </Button>
      );
    } else {
      actionButtons.push(
        <Button key="add" variant="default" size="sm" onClick={() => handleSendFriendRequest(targetUser.id)} className="text-xs h-7">
          <UserPlus className="mr-1 h-3 w-3" /> Add
        </Button>
      );
    }
    
    return <div className="ml-auto flex items-center space-x-1">{actionButtons}</div>;
  };
  
  const usersToDisplay = searchQuery.trim() ? searchedUsers : allUsers.filter(u => u.id !== currentUser?.id);
  const friends = allUsers.filter(u => currentUser?.friendIds?.includes(u.id));
  const pendingRequests = allUsers.filter(u => currentUser?.pendingFriendRequestsReceived?.includes(u.id));

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        {currentRoom && (
          <>
            <div>
              <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                Room Details
              </h3>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Name:</span> {
                  currentRoom.id.startsWith('dm_') && currentUser && allUsers.length > 0
                    ? allUsers.find(u => currentRoom.members.includes(u.id) && u.id !== currentUser.id)?.username || currentRoom.name
                    : currentRoom.name
                }</p>
                <p><span className="font-medium">Type:</span> {currentRoom.isPrivate ? (currentRoom.id.startsWith('dm_') ? "Direct Message" : "Private Group") : "Public Group"}</p>
                <p><span className="font-medium">Members:</span> {currentRoom.members.length}</p>
              </div>
            </div>
            <Separator/>
          </>
        )}

        <div>
          <h3 className="text-md font-semibold mb-2 flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Find Users
          </h3>
          <Input
            type="search"
            placeholder="Search all users..."
            className="w-full mb-3 h-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {usersToDisplay.length > 0 ? (
            <ul className="space-y-2 max-h-48 overflow-y-auto pr-1"> {/* Adjusted max height */}
              {usersToDisplay.map((userItem: User) => (
                <li key={userItem.id} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted transition-colors group">
                  <Avatar className="h-7 w-7 text-xs">
                    {userItem.avatar && <AvatarImage src={userItem.avatar} alt={userItem.username} />}
                    <AvatarFallback className="bg-secondary text-secondary-foreground">
                      {getInitials(userItem.username)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm truncate flex-1">{userItem.username}</span>
                  {typingUsers.find(tu => tu.id === userItem.id && tu.isTypingInRoomId === currentRoom?.id) && (
                    <Edit3 size={14} className="text-primary animate-pulse" title={`${userItem.username} is typing...`} />
                  )}
                  {userItem.isGuest && <Badge variant="outline" className="text-xs ml-1">Guest</Badge>}
                  
                  <div className="flex items-center space-x-1 ml-auto opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                    {!userItem.isGuest && renderUserActions(userItem)}
                     <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => startDirectMessage(userItem.id)}
                        title={`Message ${userItem.username}`}
                        aria-label={`Message ${userItem.username}`}
                      >
                        <MessageSquare size={16} />
                      </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground px-1.5">{searchQuery.trim() ? 'No users found.' : 'No other users to display.'}</p>
          )}
        </div>
        <Separator/>

        {pendingRequests.length > 0 && (
          <div>
            <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
              <Hourglass className="h-5 w-5 text-primary" />
              Pending Requests ({pendingRequests.length})
            </h3>
            <ul className="space-y-2  max-h-40 overflow-y-auto pr-1">
              {pendingRequests.map((userItem: User) => (
                <li key={userItem.id} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted transition-colors group">
                  <Avatar className="h-7 w-7 text-xs">
                    <AvatarFallback className="bg-secondary text-secondary-foreground">
                      {getInitials(userItem.username)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm truncate flex-1">{userItem.username}</span>
                  <div className="flex items-center space-x-1 ml-auto">
                    {renderUserActions(userItem)}
                  </div>
                </li>
              ))}
            </ul>
            <Separator className="my-4"/>
          </div>
        )}
        
        <div>
            <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Friends ({friends.length})
            </h3>
            {friends.length > 0 ? (
              <ul className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {friends.map((friend: User) => (
                  <li key={friend.id} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted transition-colors group">
                    <Avatar className="h-7 w-7 text-xs">
                      <AvatarFallback className="bg-secondary text-secondary-foreground">
                        {getInitials(friend.username)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm truncate flex-1">{friend.username}</span>
                    <div className="flex items-center space-x-1 ml-auto opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                        {renderUserActions(friend)}
                         <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => startDirectMessage(friend.id)}
                            title={`Message ${friend.username}`}
                            aria-label={`Message ${friend.username}`}
                          >
                            <MessageSquare size={16} />
                          </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground px-1.5">No friends yet. Search for users to add them!</p>
            )}
        </div>
      </div>
    </ScrollArea>
  );
}
