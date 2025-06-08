
"use client";

import React from 'react';
import Link from 'next/link';
import { NebulaChatLogo } from '@/components/icons';
import { UserAvatar } from '@/components/auth/user-avatar';
import { SettingsPanel } from '@/components/settings/settings-panel';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar'; // For mobile nav toggle
import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import { NotificationBell } from '@/components/notifications/notification-bell'; // Added
import { cn } from '@/lib/utils';

interface HeaderProps {
  isDesktopRightSidebarOpen?: boolean;
  toggleDesktopRightSidebar?: () => void;
}

export function Header({ isDesktopRightSidebarOpen, toggleDesktopRightSidebar }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6 shadow-sm">
      <div className="md:hidden">
        <SidebarTrigger />
      </div>
      <Link href="/chat" className="flex items-center gap-2 mr-auto">
        <NebulaChatLogo className="h-7 w-7 text-primary" />
        <h1 className="text-xl font-semibold font-headline">NebulaChat</h1>
      </Link>
      <div className="flex items-center gap-1"> {/* Reduced gap to accommodate bell */}
        <NotificationBell />
        <SettingsPanel />
        {toggleDesktopRightSidebar && (
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:inline-flex" // Changed from lg:inline-flex to md:inline-flex
            onClick={toggleDesktopRightSidebar}
            aria-label={isDesktopRightSidebarOpen ? "Close right sidebar" : "Open right sidebar"}
          >
            {isDesktopRightSidebarOpen ? <PanelRightClose className="h-5 w-5" /> : <PanelRightOpen className="h-5 w-5" />}
          </Button>
        )}
        <UserAvatar />
      </div>
    </header>
  );
}
