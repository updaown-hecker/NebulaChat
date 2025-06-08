
"use client";

import React, { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/auth-context';
import { ChatProvider } from '@/contexts/chat-context';
import { SettingsProvider } from '@/contexts/settings-context';
import { NotificationProvider } from '@/contexts/notification-context'; // Added

export const AppProvider = ({ children }: { children: ReactNode }) => {
  return (
    <SettingsProvider>
      <AuthProvider>
        <ChatProvider>
          <NotificationProvider> {/* Added NotificationProvider */}
            {children}
          </NotificationProvider>
        </ChatProvider>
      </AuthProvider>
    </SettingsProvider>
  );
};
