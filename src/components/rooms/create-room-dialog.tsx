"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PlusCircle } from "lucide-react";
import { useChat } from '@/contexts/chat-context';
import { useToast } from '@/hooks/use-toast';

export function CreateRoomDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const { createRoom } = useChat();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!roomName.trim()) {
      toast({ title: "Error", description: "Room name cannot be empty.", variant: "destructive" });
      return;
    }
    const newRoom = await createRoom(roomName, isPrivate);
    if (newRoom) {
      toast({ title: "Success", description: `Room "${newRoom.name}" created.` });
      setRoomName('');
      setIsPrivate(false);
      setIsOpen(false);
    } else {
      toast({ title: "Error", description: "Failed to create room.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2">
          <PlusCircle className="h-5 w-5" />
          Create New Room
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create a new chat room</DialogTitle>
          <DialogDescription>
            Choose a name for your room and set its privacy.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Room Name
            </Label>
            <Input
              id="name"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="col-span-3"
              placeholder="e.g., #general-discussion"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="private" className="text-right">
              Private Room
            </Label>
            <div className="col-span-3 flex items-center">
              <Switch
                id="private"
                checked={isPrivate}
                onCheckedChange={setIsPrivate}
              />
               <span className="ml-2 text-sm text-muted-foreground">
                {isPrivate ? "Only invited members can join" : "Anyone can join"}
              </span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button type="submit" onClick={handleSubmit}>Create Room</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
