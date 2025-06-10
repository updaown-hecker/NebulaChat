
"use client";

import React, { useState } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarRail,
} from '@/components/ui/sidebar';
import { Header } from './header';
import { LeftSidebar } from './left-sidebar';
import { RightSidebar } from './right-sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isDesktopRightSidebarOpen, setIsDesktopRightSidebarOpen] = useState(true);
  const isMobile = useIsMobile();

  const toggleDesktopRightSidebar = () => {
    if (!isMobile) {
      setIsDesktopRightSidebarOpen(prev => !prev);
    }
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen flex-col w-full">
        <Header 
          isDesktopRightSidebarOpen={isDesktopRightSidebarOpen}
          toggleDesktopRightSidebar={toggleDesktopRightSidebar}
        />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar side="left" variant="sidebar" collapsible="icon" className="shadow-lg">
            <SidebarContent>
              <LeftSidebar />
            </SidebarContent>
            <SidebarRail />
          </Sidebar>
          
          <SidebarInset className="flex-1 overflow-y-auto pt-16 !m-0 !rounded-none !shadow-none">
            {/* Main content area (Chat), SidebarInset is a <main> tag */}
            {children}
          </SidebarInset>

          {/* Right Sidebar - manually toggled for desktop */}
          <aside className={cn(
            "w-72 border-l bg-card shadow-md overflow-y-auto transition-all duration-300 ease-in-out",
            isMobile ? "hidden" : (isDesktopRightSidebarOpen ? "block" : "hidden")
          )}>
             <RightSidebar />
          </aside>
        </div>
      </div>
    </SidebarProvider>
  );
}
