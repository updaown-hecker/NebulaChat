"use client";

import React from 'react';
import { useSettings } from '@/contexts/settings-context';
import type { FontSize } from '@/types';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function FontSizeSelector() {
  const { settings, setFontSize } = useSettings();

  const fontSizes: { value: FontSize, label: string }[] = [
    { value: 'sm', label: 'Small' },
    { value: 'md', label: 'Medium' },
    { value: 'lg', label: 'Large' },
  ];

  return (
    <div className="space-y-2">
      <Label htmlFor="font-size-select">Font Size</Label>
      <Select
        value={settings.fontSize}
        onValueChange={(value) => setFontSize(value as FontSize)}
      >
        <SelectTrigger id="font-size-select" className="w-[180px]">
          <SelectValue placeholder="Select font size" />
        </SelectTrigger>
        <SelectContent>
          {fontSizes.map(fs => (
            <SelectItem key={fs.value} value={fs.value}>
              {fs.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
