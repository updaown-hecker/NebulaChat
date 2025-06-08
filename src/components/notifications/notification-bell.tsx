
"use client";

import React from 'react';
import Link from 'next/link';
import { useNotifications } from '@/contexts/notification-context';
import { useChat } from '@/contexts/chat-context'; // For joinRoom
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, MessageSquare, UserPlus, CheckCircle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading, refreshNotifications } = useNotifications();
  const { joinRoom } = useChat();
  const router = useRouter();

  const handleNotificationClick = async (notificationId: string, link?: string, roomId?: string) => {
    await markAsRead(notificationId);
    if (roomId && link?.startsWith('/chat')) {
      // If it's a room invite, attempt to join the room directly
      joinRoom(roomId); 
      // The link might be /chat?roomId=... but joinRoom handles setting currentRoom,
      // so direct navigation to /chat is fine.
      router.push('/chat'); 
    } else if (link) {
      router.push(link);
    }
    // Refresh to ensure UI updates if dropdown stays open
    refreshNotifications();
  };
  
  const getIconForNotificationType = (type: 'friend_request_received' | 'room_invite' | 'generic') => {
    switch (type) {
      case 'friend_request_received':
        return <UserPlus className="h-4 w-4 text-primary" />;
      case 'room_invite':
        return <MessageSquare className="h-4 w-4 text-accent" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 w-4 min-w-min p-0.5 text-xs flex items-center justify-center"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
          <span className="sr-only">Open notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 md:w-96" align="end">
        <DropdownMenuLabel className="flex justify-between items-center">
          <span>Notifications</span>
          {notifications.length > 0 && unreadCount > 0 && (
            <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={markAllAsRead}>
              Mark all as read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isLoading ? (
          <DropdownMenuItem disabled>Loading notifications...</DropdownMenuItem>
        ) : notifications.length === 0 ? (
          <DropdownMenuItem disabled className="text-center text-muted-foreground py-4">
            No new notifications
          </DropdownMenuItem>
        ) : (
          <ScrollArea className="max-h-80">
            <DropdownMenuGroup>
              {notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={cn(
                    "flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/50 data-[highlighted]:bg-muted/50",
                    !notification.isRead && "bg-primary/10 hover:bg-primary/20 data-[highlighted]:bg-primary/20"
                  )}
                  onClick={() => handleNotificationClick(notification.id, notification.link, notification.roomId)}
                  // Using onSelect and preventing default because DropdownMenuItem default behavior might close menu
                  onSelect={(e) => e.preventDefault()} 
                >
                  <div className="pt-0.5">
                    {getIconForNotificationType(notification.type)}
                  </div>
                  <div className="flex-1">
                    <p className={cn("text-sm leading-snug", !notification.isRead && "font-semibold")}>
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                  {!notification.isRead && (
                     <div className="h-2 w-2 rounded-full bg-primary self-center shrink-0"></div>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </ScrollArea>
        )}
        {notifications.length > 0 && <DropdownMenuSeparator />}
         <DropdownMenuItem onClick={() => router.push('/chat/friends')} className="justify-center text-sm text-primary hover:underline">
            View all friend activity
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
