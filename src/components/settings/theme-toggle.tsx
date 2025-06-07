"use client";

import React from 'react';
import { useSettings } from '@/contexts/settings-context';
import { Button } from '@/components/ui/button';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const { settings, setTheme } = useSettings();

  const toggleTheme = () => {
    setTheme(settings.theme === 'light' ? 'dark' : 'light');
  };

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
      {settings.theme === 'light' ? (
        <Moon className="h-5 w-5" />
      ) : (
        <Sun className="h-5 w-5" />
      )}
    </Button>
  );
}
