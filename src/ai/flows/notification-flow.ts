
'use server';
/**
 * @fileOverview Manages creation, fetching, and updating of user notifications.
 * Uses JSON files for persistence.
 *
 * - createNotification - Creates a new notification for a user.
 * - fetchUserNotifications - Fetches all notifications for a given user.
 * - markNotificationAsRead - Marks a specific notification as read.
 * - markAllNotificationsAsRead - Marks all notifications for a user as read.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { Notification } from '@/types';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'src', 'ai', 'data');
const NOTIFICATIONS_FILE_PATH = path.join(DATA_DIR, 'notifications.json');

// Helper to ensure data directory exists and initialize notifications.json if needed
const ensureNotificationsFileExists = (defaultNotifications: Notification[] = []): void => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(NOTIFICATIONS_FILE_PATH)) {
    fs.writeFileSync(NOTIFICATIONS_FILE_PATH, JSON.stringify(defaultNotifications, null, 2));
  }
};

const readNotificationsFromFile = (): Notification[] => {
  ensureNotificationsFileExists();
  try {
    const fileContent = fs.readFileSync(NOTIFICATIONS_FILE_PATH, 'utf-8');
    if (fileContent.trim() === '') return [];
    // Ensure all fields are present, especially new ones like actorId, actorUsername, roomId, roomName
    return (JSON.parse(fileContent) as Notification[]).map(n => ({
        ...n,
        isRead: n.isRead || false,
        actorId: n.actorId,
        actorUsername: n.actorUsername,
        roomId: n.roomId,
        roomName: n.roomName,
    }));
  } catch (error) {
    console.error('Error reading notifications file:', error);
    return [];
  }
};

const writeNotificationsToFile = (notifications: Notification[]): void => {
  ensureNotificationsFileExists();
  try {
    fs.writeFileSync(NOTIFICATIONS_FILE_PATH, JSON.stringify(notifications, null, 2));
  } catch (error: any) {
    console.error('Error writing notifications file:', error);
    throw new Error(`Failed to write notifications data: ${error.message}`);
  }
};

// --- Schemas ---
const NotificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.enum(['friend_request_received', 'room_invite', 'generic']),
  message: z.string(),
  link: z.string().optional(),
  timestamp: z.number(),
  isRead: z.boolean(),
  actorId: z.string().optional(),
  actorUsername: z.string().optional(),
  roomId: z.string().optional(),
  roomName: z.string().optional(),
});

const CreateNotificationInputSchema = z.object({
  userId: z.string(),
  type: z.enum(['friend_request_received', 'room_invite', 'generic']),
  message: z.string(),
  link: z.string().optional(),
  actorId: z.string().optional(),
  actorUsername: z.string().optional(),
  roomId: z.string().optional(),
  roomName: z.string().optional(),
});
export type CreateNotificationInput = z.infer<typeof CreateNotificationInputSchema>;

const NotificationOutputSchema = z.object({
  success: z.boolean(),
  notification: NotificationSchema.optional(),
  message: z.string().optional(),
});
export type NotificationOutput = z.infer<typeof NotificationOutputSchema>;

const FetchUserNotificationsInputSchema = z.object({
  userId: z.string(),
});
export type FetchUserNotificationsInput = z.infer<typeof FetchUserNotificationsInputSchema>;

const FetchUserNotificationsOutputSchema = z.object({
  notifications: z.array(NotificationSchema),
});
export type FetchUserNotificationsOutput = z.infer<typeof FetchUserNotificationsOutputSchema>;

const MarkNotificationInputSchema = z.object({
  notificationId: z.string(),
  userId: z.string(), // To ensure user owns the notification
});
export type MarkNotificationInput = z.infer<typeof MarkNotificationInputSchema>;

const MarkAllNotificationsInputSchema = z.object({
    userId: z.string(),
});
export type MarkAllNotificationsInput = z.infer<typeof MarkAllNotificationsInputSchema>;

const MarkOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});


// --- Create Notification ---
export async function createNotification(input: CreateNotificationInput): Promise<NotificationOutput> {
  return createNotificationFlow(input);
}

const createNotificationFlow = ai.defineFlow(
  {
    name: 'createNotificationFlow',
    inputSchema: CreateNotificationInputSchema,
    outputSchema: NotificationOutputSchema,
  },
  async (input) => {
    const notifications = readNotificationsFromFile();
    const newNotification: Notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: input.userId,
      type: input.type,
      message: input.message,
      link: input.link,
      timestamp: Date.now(),
      isRead: false,
      actorId: input.actorId,
      actorUsername: input.actorUsername,
      roomId: input.roomId,
      roomName: input.roomName,
    };
    notifications.push(newNotification);
    writeNotificationsToFile(notifications);
    console.log(`Notification created for user ${input.userId}: ${input.message}`);
    return { success: true, notification: newNotification, message: "Notification created." };
  }
);

// --- Fetch User Notifications ---
export async function fetchUserNotifications(input: FetchUserNotificationsInput): Promise<FetchUserNotificationsOutput> {
  return fetchUserNotificationsFlow(input);
}

const fetchUserNotificationsFlow = ai.defineFlow(
  {
    name: 'fetchUserNotificationsFlow',
    inputSchema: FetchUserNotificationsInputSchema,
    outputSchema: FetchUserNotificationsOutputSchema,
  },
  async ({ userId }) => {
    const allNotifications = readNotificationsFromFile();
    const userNotifications = allNotifications
        .filter(n => n.userId === userId)
        .sort((a,b) => b.timestamp - a.timestamp); // Newest first
    return { notifications: userNotifications };
  }
);

// --- Mark Notification As Read ---
export async function markNotificationAsRead(input: MarkNotificationInput): Promise<MarkOutputSchema> {
  return markNotificationAsReadFlow(input);
}

const markNotificationAsReadFlow = ai.defineFlow(
  {
    name: 'markNotificationAsReadFlow',
    inputSchema: MarkNotificationInputSchema,
    outputSchema: MarkOutputSchema,
  },
  async ({ notificationId, userId }) => {
    const notifications = readNotificationsFromFile();
    const notificationIndex = notifications.findIndex(n => n.id === notificationId && n.userId === userId);

    if (notificationIndex === -1) {
      return { success: false, message: "Notification not found or access denied." };
    }

    notifications[notificationIndex].isRead = true;
    writeNotificationsToFile(notifications);
    return { success: true, message: "Notification marked as read." };
  }
);

// --- Mark All Notifications As Read ---
export async function markAllNotificationsAsRead(input: MarkAllNotificationsInput): Promise<MarkOutputSchema> {
    return markAllNotificationsAsReadFlow(input);
}

const markAllNotificationsAsReadFlow = ai.defineFlow(
    {
        name: 'markAllNotificationsAsReadFlow',
        inputSchema: MarkAllNotificationsInputSchema,
        outputSchema: MarkOutputSchema,
    },
    async ({ userId }) => {
        let notifications = readNotificationsFromFile();
        let changed = false;
        notifications = notifications.map(n => {
            if (n.userId === userId && !n.isRead) {
                changed = true;
                return { ...n, isRead: true };
            }
            return n;
        });

        if (changed) {
            writeNotificationsToFile(notifications);
            return { success: true, message: "All notifications marked as read." };
        }
        return { success: true, message: "No unread notifications to mark." };
    }
);

