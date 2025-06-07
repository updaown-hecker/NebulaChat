"use client";

import React from 'react';
import { RoomList } from '@/components/rooms/room-list';
import { CreateRoomDialog } from '@/components/rooms/create-room-dialog';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

export function LeftSidebar() {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4">
        <h2 className="text-lg font-semibold font-headline mb-2">Rooms</h2>
        <CreateRoomDialog />
      </div>
      <Separator />
      <div className="flex-grow overflow-y-auto">
         <RoomList />
      </div>
    </div>
  );
}
