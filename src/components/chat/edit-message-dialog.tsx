
"use client";

import React, { useState, useEffect } from 'react';
import type { Message } from '@/types';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';

interface EditMessageDialogProps {
  message: Message | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (messageId: string, newContent: string) => Promise<boolean>;
}

export function EditMessageDialog({ message, isOpen, onClose, onSave }: EditMessageDialogProps) {
  const [editedContent, setEditedContent] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (message) {
      setEditedContent(message.content);
    }
  }, [message]);

  const handleSave = async () => {
    if (!message) return;
    if (!editedContent.trim()) {
      toast({ title: "Error", description: "Message content cannot be empty.", variant: "destructive" });
      return;
    }
    const success = await onSave(message.id, editedContent);
    if (success) {
      onClose();
    }
    // Toast for success/failure is handled in ChatContext
  };

  if (!message) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Message</DialogTitle>
          <DialogDescription>
            Modify your message content below.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid w-full gap-1.5">
            <Label htmlFor="message-content">Content</Label>
            <Textarea
              id="message-content"
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              placeholder="Enter your message"
              className="min-h-[100px]"
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
