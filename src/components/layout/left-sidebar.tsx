
"use client";

import React from 'react';
import { FriendsNavigationItem } from '@/components/friends/friends-navigation-item';
import { RoomList } from '@/components/rooms/room-list';
import { CreateRoomDialog } from '@/components/rooms/create-room-dialog';
import { Separator } from '@/components/ui/separator';

export function LeftSidebar() {
  return (
    <div className="flex flex-col h-full">
      {/* Friends Section - Now always visible */}
      <div className="p-4">
        <h2 className="text-lg font-semibold font-headline mb-2">Friends</h2>
        <FriendsNavigationItem />
      </div>
      <Separator /> {/* Separator is now always visible */}

      {/* Rooms Section - Always Visible */}
      <div className="p-4">
        <h2 className="text-lg font-semibold font-headline mb-2">Group Rooms</h2>
        <CreateRoomDialog />
      </div>
      <Separator />
      
      <div className="flex-grow overflow-y-auto"> {/* RoomList should take remaining space */}
         <RoomList />
      </div>
    </div>
  );
}
