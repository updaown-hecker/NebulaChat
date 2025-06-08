
'use server';
/**
 * @fileOverview Manages room-related operations like inviting users to private rooms.
 * Uses JSON files for persistence.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { Room, User } from '@/types';
import fs from 'fs';
import path from 'path';
import { createNotification } from './notification-flow'; // Import createNotification
import { readUsersFromFile as readAllUsers } from './friend-flow'; // To get inviter username

const DATA_DIR = path.join(process.cwd(), 'src', 'ai', 'data');
const ROOMS_FILE_PATH = path.join(DATA_DIR, 'rooms.json');

// Helper to ensure data directory exists
const ensureDataDirExists = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
};

// Helper to read rooms from JSON file
const readRoomsFromFile = (): Room[] => {
  ensureDataDirExists();
  if (!fs.existsSync(ROOMS_FILE_PATH)) {
    fs.writeFileSync(ROOMS_FILE_PATH, JSON.stringify([], null, 2));
    return [];
  }
  try {
    const fileContent = fs.readFileSync(ROOMS_FILE_PATH, 'utf-8');
    if (fileContent.trim() === '') return [];
    return JSON.parse(fileContent) as Room[];
  } catch (error) {
    console.error('Error reading rooms file in room-management-flow:', error);
    return [];
  }
};

// Helper to write rooms to JSON file
const writeRoomsToFile = (rooms: Room[]): void => {
  ensureDataDirExists();
  try {
    fs.writeFileSync(ROOMS_FILE_PATH, JSON.stringify(rooms, null, 2));
  } catch (error) {
    console.error('Error writing rooms file in room-management-flow:', error);
  }
};

// --- Invite User to Room ---
const InviteUserToRoomInputSchema = z.object({
  roomId: z.string(),
  inviterUserId: z.string(),
  inviteeUserId: z.string(),
});
export type InviteUserToRoomInput = z.infer<typeof InviteUserToRoomInputSchema>;

const RoomOutputSchema = z.object({ // Re-defining for clarity, can be imported if structure is complex
  id: z.string(),
  name: z.string(),
  isPrivate: z.boolean(),
  members: z.array(z.string()),
  ownerId: z.string().optional(),
});

const InviteUserToRoomOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  updatedRoom: RoomOutputSchema.optional(),
});
export type InviteUserToRoomOutput = z.infer<typeof InviteUserToRoomOutputSchema>;

export async function inviteUserToRoom(input: InviteUserToRoomInput): Promise<InviteUserToRoomOutput> {
  return inviteUserToRoomFlow(input);
}

const inviteUserToRoomFlow = ai.defineFlow(
  {
    name: 'inviteUserToRoomFlow',
    inputSchema: InviteUserToRoomInputSchema,
    outputSchema: InviteUserToRoomOutputSchema,
  },
  async ({ roomId, inviterUserId, inviteeUserId }) => {
    const rooms = readRoomsFromFile();
    const roomIndex = rooms.findIndex(r => r.id === roomId);

    if (roomIndex === -1) {
      return { success: false, message: "Room not found." };
    }

    const room = rooms[roomIndex];

    if (!room.isPrivate) {
      return { success: false, message: "This room is public. Users can join directly." };
    }
    
    const allUsers = await readAllUsers(); // Fetch all users to get inviter's username
    const inviter = allUsers.find(u => u.id === inviterUserId);

    if (room.ownerId !== inviterUserId && !(inviter && inviter.isAdmin)) {
      return { success: false, message: "You are not the owner or an admin, and cannot invite users to this private room." };
    }

    if (room.members.includes(inviteeUserId)) {
      return { success: false, message: "User is already a member of this room." };
    }

    room.members.push(inviteeUserId);
    rooms[roomIndex] = room;
    writeRoomsToFile(rooms);

    // Create notification for the invitee
    await createNotification({
      userId: inviteeUserId,
      type: 'room_invite',
      message: `${inviter?.username || 'Someone'} invited you to the private room: "${room.name}".`,
      link: `/chat?roomId=${roomId}`, // Link to join the room
      actorId: inviterUserId,
      actorUsername: inviter?.username,
      roomId: room.id,
      roomName: room.name,
    });

    return { success: true, message: "User invited successfully.", updatedRoom: room };
  }
);

