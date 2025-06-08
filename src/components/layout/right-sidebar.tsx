
"use client";

import React, { useState, useEffect } from 'react';
import { useChat } from '@/contexts/chat-context';
import { useAuth } from '@/contexts/auth-context';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Info, Edit3, MessageSquare, UserPlus, CheckCircle, XCircle, UserMinus, Hourglass, Search, UserPlusIcon, ShieldCheck } from 'lucide-react';
import type { User } from '@/types';
import { Separator } from '../ui/separator';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function RightSidebar() {
  const { 
    currentRoom, 
    allUsers: contextAllUsers, // Renamed to avoid conflict with local allUsers if any
    typingUsers, 
    startDirectMessage,
    searchedUsers,
    searchAllUsers,
    sendFriendRequest,
    acceptFriendRequest,
    declineOrCancelFriendRequest,
    removeFriend,
    inviteUserToRoom,
  } = useChat();
  const { user: currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  // Fetch initial list of users when component mounts and when currentUser changes
  useEffect(() => {
    if (currentUser) { // Ensure currentUser is available before searching
      searchAllUsers(''); // Fetch all users initially
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]); // Rerun if currentUser.id changes

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (currentUser) { // Ensure currentUser is available
         searchAllUsers(searchQuery.trim());
      }
    }, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, searchAllUsers, currentUser]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const handleInviteUserToRoom = async (roomId: string, inviteeUserId: string, inviteeUsername: string) => {
    if (!currentUser) return; 
    const room = currentRoom; 
    if (room && room.isPrivate && room.ownerId !== currentUser.id && !currentUser.isAdmin) {
        toast({ title: "Permission Denied", description: "Only room owners or admins can invite users to this private room.", variant: "destructive"});
        return;
    }
    const success = await inviteUserToRoom(roomId, inviteeUserId);
    if (success) {
      toast({ title: "User Invited", description: `${inviteeUsername} has been invited to the room.`});
    }
  };

  const renderUserActions = (targetUser: User) => {
    if (!currentUser || currentUser.id === targetUser.id) return null;

    const isFriend = currentUser.friendIds?.includes(targetUser.id);
    const requestSent = currentUser.sentFriendRequests?.includes(targetUser.id);
    const requestReceived = currentUser.pendingFriendRequestsReceived?.includes(targetUser.id);

    const actionButtons = [];

    if (isFriend) {
      actionButtons.push(
        <Button key="remove" variant="outline" size="sm" onClick={() => removeFriend(targetUser.id)} className="text-xs h-7">
          <UserMinus className="mr-1 h-3 w-3" /> Friends
        </Button>
      );
    } else if (requestSent) {
      actionButtons.push(
        <Button key="sent" variant="outline" size="sm" onClick={() => declineOrCancelFriendRequest(targetUser.id)} className="text-xs h-7">
          <Hourglass className="mr-1 h-3 w-3" /> Sent
        </Button>
      );
    } else if (requestReceived) {
      actionButtons.push(
        <Button key="accept" variant="default" size="sm" onClick={() => acceptFriendRequest(targetUser.id)} className="text-xs h-7">
          <CheckCircle className="mr-1 h-3 w-3" /> Accept
        </Button>,
        <Button key="decline" variant="outline" size="sm" onClick={() => declineOrCancelFriendRequest(targetUser.id)} className="ml-1 text-xs h-7">
          <XCircle className="mr-1 h-3 w-3" /> Decline
        </Button>
      );
    } else {
      actionButtons.push(
        <Button key="add" variant="default" size="sm" onClick={() => sendFriendRequest(targetUser.id)} className="text-xs h-7">
          <UserPlus className="mr-1 h-3 w-3" /> Add
        </Button>
      );
    }
    
    if (currentRoom && currentRoom.isPrivate && (currentRoom.ownerId === currentUser.id || currentUser.isAdmin) && !currentRoom.members.includes(targetUser.id)) {
      actionButtons.push(
        <Button 
          key="invite" 
          variant="outline" 
          size="sm" 
          onClick={() => handleInviteUserToRoom(currentRoom.id, targetUser.id, targetUser.username)} 
          className="text-xs h-7 ml-1"
          title={`Invite ${targetUser.username} to ${currentRoom.name}`}
        >
          <UserPlusIcon className="mr-1 h-3 w-3" /> Invite
        </Button>
      );
    }


    return <div className="ml-auto flex items-center space-x-1">{actionButtons}</div>;
  };
  
  // Always use searchedUsers as the source of truth for display,
  // as it's populated by searchAllUsers which directly queries the "backend" (JSON files).
  const usersToDisplay = searchedUsers.filter(u => u.id !== currentUser?.id);
  
  const friends = contextAllUsers.filter(u => currentUser?.friendIds?.includes(u.id));
  const pendingRequests = contextAllUsers.filter(u => currentUser?.pendingFriendRequestsReceived?.includes(u.id));


  return (
    <ScrollArea className="h-full">
      <div className="px-4 pt-20 pb-4 space-y-6"> {/* Changed pt-16 to pt-20 */}
        {currentRoom && (
          <>
            <div>
              <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                Room Details
              </h3>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Name:</span> {
                  currentRoom.id.startsWith('dm_') && currentUser && contextAllUsers.length > 0
                    ? contextAllUsers.find(u => currentRoom.members.includes(u.id) && u.id !== currentUser.id)?.username || currentRoom.name
                    : currentRoom.name
                }</p>
                <p><span className="font-medium">Type:</span> {currentRoom.isPrivate ? (currentRoom.id.startsWith('dm_') ? "Direct Message" : "Private Group") : "Public Group"}</p>
                <p><span className="font-medium">Members:</span> {currentRoom.members.length}</p>
                 {(currentRoom.isPrivate && currentUser && (currentRoom.ownerId === currentUser.id || currentUser.isAdmin)) && (
                   <p className="text-xs text-muted-foreground">
                    {currentUser.isAdmin && currentRoom.ownerId !== currentUser.id ? "You have admin access to this room." : "You are the owner of this private room."}
                   </p>
                 )}
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
            <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {usersToDisplay.map((userItem: User) => (
                <li key={userItem.id} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted transition-colors group">
                  <Avatar className="h-7 w-7 text-xs">
                    {userItem.avatar && <AvatarImage src={userItem.avatar} alt={userItem.username} />}
                    <AvatarFallback className={cn("bg-secondary text-secondary-foreground", userItem.isAdmin && "border-2 border-primary")}>
                      {getInitials(userItem.username)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm truncate flex-1">{userItem.username}</span>
                  {userItem.isAdmin && (
                    <Badge variant="outline" className="px-1.5 py-0.5 text-xs h-fit border-primary text-primary">
                        <ShieldCheck className="mr-1 h-3 w-3" /> Admin
                    </Badge>
                  )}
                  {typingUsers.find(tu => tu.id === userItem.id && tu.isTypingInRoomId === currentRoom?.id) && (
                    <Edit3 size={14} className="text-primary animate-pulse" title={`${userItem.username} is typing...`} />
                  )}
                  {userItem.isGuest && <Badge variant="outline" className="text-xs ml-1">Guest</Badge>}
                  
                  <div className="flex items-center space-x-1 ml-auto opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                    {!userItem.isGuest && currentUser && renderUserActions(userItem)}
                     <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => currentUser && startDirectMessage(userItem.id)}
                        title={`Message ${userItem.username}`}
                        aria-label={`Message ${userItem.username}`}
                        disabled={!currentUser}
                      >
                        <MessageSquare size={16} />
                      </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground px-1.5">{searchQuery.trim() ? 'No users found.' : 'Type to search for users.'}</p>
          )}
        </div>
        <Separator/>

        {pendingRequests.length > 0 && currentUser && (
          <div>
            <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
              <Hourglass className="h-5 w-5 text-primary" />
              Pending Requests ({pendingRequests.length})
            </h3>
            <ul className="space-y-2  max-h-40 overflow-y-auto pr-1">
              {pendingRequests.map((userItem: User) => (
                <li key={userItem.id} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted transition-colors group">
                  <Avatar className="h-7 w-7 text-xs">
                    <AvatarFallback className={cn("bg-secondary text-secondary-foreground", userItem.isAdmin && "border-2 border-primary")}>
                      {getInitials(userItem.username)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm truncate flex-1">{userItem.username}</span>
                   {userItem.isAdmin && (
                    <Badge variant="outline" className="px-1.5 py-0.5 text-xs h-fit border-primary text-primary">
                        <ShieldCheck className="mr-1 h-3 w-3" /> Admin
                    </Badge>
                  )}
                  <div className="flex items-center space-x-1 ml-auto">
                    {renderUserActions(userItem)}
                  </div>
                </li>
              ))}
            </ul>
            <Separator className="my-4"/>
          </div>
        )}
        
        {currentUser && (
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
                      <AvatarFallback className={cn("bg-secondary text-secondary-foreground", friend.isAdmin && "border-2 border-primary")}>
                        {getInitials(friend.username)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm truncate flex-1">{friend.username}</span>
                     {friend.isAdmin && (
                        <Badge variant="outline" className="px-1.5 py-0.5 text-xs h-fit border-primary text-primary">
                            <ShieldCheck className="mr-1 h-3 w-3" /> Admin
                        </Badge>
                    )}
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
        )}
      </div>
    </ScrollArea>
  );
}
