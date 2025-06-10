
"use client";

import React from 'react';
import Link from 'next/link'; // Import Link
import { usePathname } from 'next/navigation'; // Import usePathname
import { useAuth } from '@/contexts/auth-context'; // Import useAuth
import { FriendsNavigationItem } from '@/components/friends/friends-navigation-item';
import { RoomList } from '@/components/rooms/room-list';
import { CreateRoomDialog } from '@/components/rooms/create-room-dialog';
import { Separator } from '@/components/ui/separator';
import { SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar'; // Import Sidebar components
import { Bot } from 'lucide-react'; // Import an icon
import { cn } from '@/lib/utils';

export function LeftSidebar() {
  const { user } = useAuth();
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full">
      <div className="p-4">
        <h2 className="text-lg font-semibold font-headline mb-2">Friends</h2>
        <FriendsNavigationItem />
      </div>
      <Separator />

      {user?.isAdmin && (
        <>
          <div className="p-4">
             <h2 className="text-lg font-semibold font-headline mb-2">Admin Tools</h2>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === '/chat/admin/gemini-chat'}
                className={cn(isActive && "bg-accent text-accent-foreground")} // Ensure active styling
                tooltip={{ children: "Chat with AI Assistant", side: "right" }}
              >
                <Link href="/chat/admin/gemini-chat" className="w-full justify-start gap-2">
                  <Bot className="h-5 w-5" />
                  <span>AI Chat</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </div>
          <Separator />
        </>
      )}

      <div className="p-4">
        <h2 className="text-lg font-semibold font-headline mb-2">Group Rooms</h2>
        <CreateRoomDialog />
      </div>
      <Separator />
      
      <div className="flex-grow overflow-y-auto">
         <RoomList />
      </div>
    </div>
  );
}
