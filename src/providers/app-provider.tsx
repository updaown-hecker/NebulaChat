"use client";

import React, { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/auth-context';
import { ChatProvider } from '@/contexts/chat-context';
import { SettingsProvider } from '@/contexts/settings-context';

export const AppProvider = ({ children }: { children: ReactNode }) => {
  return (
    <SettingsProvider>
      <AuthProvider>
        <ChatProvider>
          {children}
        </ChatProvider>
      </AuthProvider>
    </SettingsProvider>
  );
};
