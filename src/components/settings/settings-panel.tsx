"use client";

import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from '@/components/ui/button';
import { Settings as SettingsIcon } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { FontSizeSelector } from './font-size-selector';
import { Separator } from '../ui/separator';

export function SettingsPanel() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open settings">
          <SettingsIcon className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Application Settings</SheetTitle>
          <SheetDescription>
            Customize the look and feel of NebulaChat.
          </SheetDescription>
        </SheetHeader>
        <div className="py-6 space-y-6">
          <div className="space-y-2">
            <h4 className="font-medium">Appearance</h4>
            <Separator />
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm text-muted-foreground">Theme</span>
              <ThemeToggle />
            </div>
             <div className="pt-2">
              <FontSizeSelector />
            </div>
          </div>
          
          {/* Add more settings sections here if needed */}
          {/* Example:
          <div className="space-y-2">
            <h4 className="font-medium">Notifications</h4>
            <Separator />
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm text-muted-foreground">Enable desktop notifications</span>
              <Switch />
            </div>
          </div>
          */}
        </div>
      </SheetContent>
    </Sheet>
  );
}
