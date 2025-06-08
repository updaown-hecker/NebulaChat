
"use client";

import React from 'react';
import { FriendsNavigationItem } from '@/components/friends/friends-navigation-item';
import { RoomList } from '@/components/rooms/room-list';
import { CreateRoomDialog } from '@/components/rooms/create-room-dialog';
import { Separator } from '@/components/ui/separator';

export function LeftSidebar() {
  return (
    <div className="flex flex-col h-full">
      {/* Friends Section - Hidden on mobile (screens smaller than md), block on md and larger */}
      <div className="hidden p-4 md:block">
        <h2 className="text-lg font-semibold font-headline mb-2">Friends</h2>
        <FriendsNavigationItem />
      </div>
      <Separator className="hidden md:block" />

      {/* Rooms Section - Always Visible */}
      <div className="p-4">
        <h2 className="text-lg font-semibold font-headline mb-2">Rooms</h2>
        <CreateRoomDialog />
      </div>
      <Separator /> {/* This separator is for after the Rooms/CreateRoomDialog section */}
      
      <div className="flex-grow overflow-y-auto"> {/* RoomList should take remaining space */}
         <RoomList />
      </div>
    </div>
  );
}
