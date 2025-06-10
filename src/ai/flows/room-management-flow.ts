
'use server';
/**
 * @fileOverview Manages room-related operations like inviting users to private rooms and leaving DMs.
 * Uses JSON files for persistence.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { Room, User } from '@/types';
import fs from 'fs';
import path from 'path';
import { createNotification } from './notification-flow'; 
import { readUsersFromFile as readAllUsers } from './friend-flow'; 

const DATA_DIR = path.join(process.cwd(), 'src', 'ai', 'data');
const ROOMS_FILE_PATH = path.join(DATA_DIR, 'rooms.json');
const DEFAULT_ROOMS: Room[] = []; // Default to empty array

// Helper to ensure data directory exists
const ensureDataDirExists = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
};

// Helper to write rooms to JSON file (already robust)
const writeRoomsToFile = (rooms: Room[]): void => {
  ensureDataDirExists();
  try {
    fs.writeFileSync(ROOMS_FILE_PATH, JSON.stringify(rooms, null, 2));
  } catch (error: any) {
    console.error('Error writing rooms file in room-management-flow:', error);
    throw new Error(`Failed to write rooms data in room-management-flow: ${error.message}`);
  }
};

// Helper to read rooms from JSON file (updated for robustness)
const readRoomsFromFile = (): Room[] => {
  ensureDataDirExists();
  if (!fs.existsSync(ROOMS_FILE_PATH)) {
    writeRoomsToFile(DEFAULT_ROOMS); // Initialize if not exists
    return DEFAULT_ROOMS;
  }
  try {
    const fileContent = fs.readFileSync(ROOMS_FILE_PATH, 'utf-8');
    if (fileContent.trim() === '') {
      console.warn(`File ${ROOMS_FILE_PATH} is empty. Initializing with default data.`);
      writeRoomsToFile(DEFAULT_ROOMS);
      return DEFAULT_ROOMS;
    }
    return JSON.parse(fileContent) as Room[];
  } catch (error) {
    console.error(`Error reading or parsing rooms file ${ROOMS_FILE_PATH} in room-management-flow:`, error);
    console.warn(`File ${ROOMS_FILE_PATH} was corrupted or malformed. Initializing with default data.`);
    writeRoomsToFile(DEFAULT_ROOMS);
    return DEFAULT_ROOMS;
  }
};


// --- Invite User to Room ---
const InviteUserToRoomInputSchema = z.object({
  roomId: z.string(),
  inviterUserId: z.string(),
  inviteeUserId: z.string(),
});
export type InviteUserToRoomInput = z.infer<typeof InviteUserToRoomInputSchema>;

const RoomOutputSchema = z.object({ 
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
    
    const allUsers = await readAllUsers(); 
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

    await createNotification({
      userId: inviteeUserId,
      type: 'room_invite',
      message: `${inviter?.username || 'Someone'} invited you to the private room: "${room.name}".`,
      link: `/chat?roomId=${roomId}`, 
      actorId: inviterUserId,
      actorUsername: inviter?.username,
      roomId: room.id,
      roomName: room.name,
    });

    return { success: true, message: "User invited successfully.", updatedRoom: room };
  }
);

// --- Leave DM Room ---
const LeaveDmRoomInputSchema = z.object({
  userId: z.string(),
  roomId: z.string(),
});
export type LeaveDmRoomInput = z.infer<typeof LeaveDmRoomInputSchema>;

const LeaveDmRoomOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});
export type LeaveDmRoomOutput = z.infer<typeof LeaveDmRoomOutputSchema>;

export async function leaveDmRoom(input: LeaveDmRoomInput): Promise<LeaveDmRoomOutput> {
    return leaveDmRoomFlow(input);
}

const leaveDmRoomFlow = ai.defineFlow(
    {
        name: 'leaveDmRoomFlow',
        inputSchema: LeaveDmRoomInputSchema,
        outputSchema: LeaveDmRoomOutputSchema,
    },
    async ({ userId, roomId }) => {
        let rooms = readRoomsFromFile();
        const roomIndex = rooms.findIndex(r => r.id === roomId);

        if (roomIndex === -1) {
            return { success: false, message: "DM room not found." };
        }

        const room = rooms[roomIndex];

        if (!room.id.startsWith('dm_')) {
            return { success: false, message: "This action is only for DM rooms."};
        }

        if (!room.members.includes(userId)) {
            return { success: false, message: "You are not a member of this DM room." };
        }

        // Remove the user from the members list
        room.members = room.members.filter(memberId => memberId !== userId);

        if (room.members.length === 0) {
            // If no members are left, remove the room entirely
            rooms = rooms.filter(r => r.id !== roomId);
            console.log(`DM room ${roomId} deleted as all members left.`);
        } else {
            // Otherwise, update the room with the modified members list
            rooms[roomIndex] = room;
        }
        
        writeRoomsToFile(rooms);

        return { success: true, message: "You have left the DM chat." };
    }
);

