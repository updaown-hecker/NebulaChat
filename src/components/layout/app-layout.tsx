"use client";

import React from 'react';
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

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  // defaultOpen={false} for right sidebar to be initially closed on desktop
  // This requires separate SidebarProvider instances if we want different default states or independent control.
  // For simplicity, one provider, and right sidebar can be manually toggled or always visible on desktop.
  // The provided sidebar component seems to be for a single sidebar.
  // To achieve three panels, we'll use the Sidebar for the left, and manually layout center and right.

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen flex-col">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar side="left" variant="sidebar" collapsible="icon" className="shadow-lg">
            <SidebarContent>
              <LeftSidebar />
            </SidebarContent>
            <SidebarRail />
          </Sidebar>
          
          <SidebarInset className="flex flex-col flex-1 overflow-hidden !m-0 !rounded-none !shadow-none">
            {/* Main content area (Chat) */}
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </SidebarInset>

          {/* Right Sidebar - using a fixed width div for simplicity here */}
          {/* For a collapsible right sidebar, it would need its own SidebarProvider or more complex state management */}
          <aside className="hidden lg:block w-72 border-l bg-card shadow-md overflow-y-auto">
             <RightSidebar />
          </aside>
        </div>
      </div>
    </SidebarProvider>
  );
}
