
'use server';
/**
 * @fileOverview Simulates server-side operations for fetching and syncing chat data, using JSON files for persistence.
 * In a real application, these flows would interact with a database.
 *
 * - fetchChatDataFlow - Fetches initial rooms and messages from JSON files.
 * - syncRoomsToServerFlow - Saves rooms to a JSON file.
 * - syncMessagesToServerFlow - Saves messages to a JSON file.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { Room, Message } from '@/types';
import fs from 'fs';
import path from 'path';

// Define Zod schemas for Room and Message
const RoomSchema = z.object({
  id: z.string(),
  name: z.string(),
  isPrivate: z.boolean(),
  members: z.array(z.string()),
  ownerId: z.string().optional(),
});

const MessageSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  userId: z.string(),
  username: z.string(),
  content: z.string(),
  timestamp: z.number(),
  isAIMessage: z.boolean().optional(),
});

// Initial default data if JSON files don't exist
const DEFAULT_MOCK_ROOMS_SERVER: Room[] = [
  { id: 'general', name: 'General', isPrivate: false, members: ['user1', 'user2', 'guest1'], ownerId: 'user1' },
  { id: 'random', name: 'Random', isPrivate: false, members: ['user1', 'guest1'], ownerId: 'user1' },
];

const DEFAULT_MOCK_MESSAGES_SERVER: Message[] = [
  { id: 'msg1', roomId: 'general', userId: 'user1', username: 'Alice', content: 'Hello from persistent store!', timestamp: Date.now() - 100000 },
];

const DATA_DIR = path.join(process.cwd(), 'src', 'ai', 'data');
const ROOMS_FILE_PATH = path.join(DATA_DIR, 'rooms.json');
const MESSAGES_FILE_PATH = path.join(DATA_DIR, 'messages.json');

// Helper to ensure data directory exists
const ensureDataDirExists = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
};

// Generic helper to read data from a JSON file
const readDataFromFile = <T>(filePath: string, defaultData: T): T => {
  ensureDataDirExists();
  if (!fs.existsSync(filePath)) {
    // Write default data to the file if it doesn't exist
    writeDataToFile(filePath, defaultData);
    return defaultData;
  }
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(fileContent) as T;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    // Write default data if file is corrupt or unparsable
    writeDataToFile(filePath, defaultData);
    return defaultData;
  }
};

// Generic helper to write data to a JSON file
const writeDataToFile = <T>(filePath: string, data: T): void => {
  ensureDataDirExists();
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
  }
};


const FetchChatDataOutputSchema = z.object({
  rooms: z.array(RoomSchema),
  messages: z.array(MessageSchema),
});
export type FetchChatDataOutput = z.infer<typeof FetchChatDataOutputSchema>;

export async function fetchChatData(): Promise<FetchChatDataOutput> {
  return fetchChatDataFlow();
}

const fetchChatDataFlow = ai.defineFlow(
  {
    name: 'fetchChatDataFlow',
    outputSchema: FetchChatDataOutputSchema,
  },
  async () => {
    console.log('Fetching initial chat data from JSON files...');
    const rooms = readDataFromFile<Room[]>(ROOMS_FILE_PATH, DEFAULT_MOCK_ROOMS_SERVER);
    const messages = readDataFromFile<Message[]>(MESSAGES_FILE_PATH, DEFAULT_MOCK_MESSAGES_SERVER);
    return {
      rooms,
      messages,
    };
  }
);


const SyncRoomsInputSchema = z.object({
  rooms: z.array(RoomSchema),
});
export type SyncRoomsInput = z.infer<typeof SyncRoomsInputSchema>;

const SyncOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

export async function syncRoomsToServer(input: SyncRoomsInput): Promise<z.infer<typeof SyncOutputSchema>> {
  return syncRoomsToServerFlow(input);
}

const syncRoomsToServerFlow = ai.defineFlow(
  {
    name: 'syncRoomsToServerFlow',
    inputSchema: SyncRoomsInputSchema,
    outputSchema: SyncOutputSchema,
  },
  async (input) => {
    console.log(`Syncing ${input.rooms.length} rooms to JSON file...`);
    writeDataToFile<Room[]>(ROOMS_FILE_PATH, input.rooms);
    return { success: true, message: "Rooms synced to JSON file." };
  }
);

const SyncMessagesInputSchema = z.object({
  messages: z.array(MessageSchema),
});
export type SyncMessagesInput = z.infer<typeof SyncMessagesInputSchema>;


export async function syncMessagesToServer(input: SyncMessagesInput): Promise<z.infer<typeof SyncOutputSchema>> {
  return syncMessagesToServerFlow(input);
}

const syncMessagesToServerFlow = ai.defineFlow(
  {
    name: 'syncMessagesToServerFlow',
    inputSchema: SyncMessagesInputSchema,
    outputSchema: SyncOutputSchema,
  },
  async (input) => {
    console.log(`Syncing ${input.messages.length} messages to JSON file...`);
    writeDataToFile<Message[]>(MESSAGES_FILE_PATH, input.messages);
    return { success: true, message: "Messages synced to JSON file." };
  }
);
