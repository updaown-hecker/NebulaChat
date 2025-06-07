"use client";

import type { Settings, Theme, FontSize } from '@/types';
import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import useLocalStorage from '@/hooks/use-local-storage';
import { LOCAL_STORAGE_SETTINGS_KEY } from '@/lib/constants';

interface SettingsContextType {
  settings: Settings;
  setTheme: (theme: Theme) => void;
  setFontSize: (fontSize: FontSize) => void;
}

const defaultSettings: Settings = {
  theme: 'light',
  fontSize: 'md',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useLocalStorage<Settings>(
    LOCAL_STORAGE_SETTINGS_KEY,
    defaultSettings
  );

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(settings.theme);
  }, [settings.theme]);

  useEffect(() => {
    document.documentElement.classList.remove('font-size-sm', 'font-size-md', 'font-size-lg');
    document.documentElement.classList.add(`font-size-${settings.fontSize}`);
  }, [settings.fontSize]);

  const setTheme = (theme: Theme) => {
    setSettings(prev => ({ ...prev, theme }));
  };

  const setFontSize = (fontSize: FontSize) => {
    setSettings(prev => ({ ...prev, fontSize }));
  };

  return (
    <SettingsContext.Provider value={{ settings, setTheme, setFontSize }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
