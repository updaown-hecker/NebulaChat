
'use server';
/**
 * @fileOverview Simulates server-side operations for fetching and syncing chat data, using JSON files for persistence.
 * Also fetches user data.
 *
 * - fetchChatDataFlow - Fetches initial rooms, messages, and users from JSON files.
 * - syncRoomsToServerFlow - Saves rooms to a JSON file.
 * - syncMessagesToServerFlow - Saves messages to a JSON file.
 */

import {ai}from '@/ai/genkit';
import {z}from 'genkit';
import type { Room, Message, User } from '@/types'; // Import User type
import fs from 'fs';
import path from 'path';

// Define Zod schemas
const UserSchema = z.object({
  id: z.string(),
  username: z.string(),
  avatar: z.string().optional(),
  isGuest: z.boolean().optional(),
  password: z.string().optional(), // Keep for reading, but don't expose sensitive data
  isTypingInRoomId: z.string().nullable().optional(),
  friendIds: z.array(z.string()).optional(),
  pendingFriendRequestsReceived: z.array(z.string()).optional(),
  sentFriendRequests: z.array(z.string()).optional(),
  isAdmin: z.boolean().optional(),
});

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
  isEdited: z.boolean().optional(),
  editedTimestamp: z.number().optional(),
  replyToMessageId: z.string().optional(), // Added
  replyToUsername: z.string().optional(), // Added
});

// Initial default data if JSON files don't exist
const DEFAULT_MOCK_USERS_SERVER: User[] = [
    { id: 'user1', username: 'admin', password: 'admin123', isTypingInRoomId: null, friendIds: [], pendingFriendRequestsReceived: [], sentFriendRequests: [], isAdmin: true },
    { id: 'user2', username: 'Bob', isTypingInRoomId: null, friendIds: [], pendingFriendRequestsReceived: [], sentFriendRequests: [], isAdmin: false },
];

const DEFAULT_MOCK_ROOMS_SERVER: Room[] = [
  { id: 'general', name: 'General', isPrivate: false, members: ['user1', 'user2', 'guest1'], ownerId: 'user1' },
  { id: 'random', name: 'Random', isPrivate: false, members: ['user1', 'guest1'], ownerId: 'user1' },
];

const DEFAULT_MOCK_MESSAGES_SERVER: Message[] = [
  { id: 'msg1', roomId: 'general', userId: 'user1', username: 'Alice', content: 'Hello from persistent store!', timestamp: Date.now() - 100000 },
];

const DATA_DIR = path.join(process.cwd(), 'src', 'ai', 'data');
const USERS_FILE_PATH = path.join(DATA_DIR, 'users.json');
const ROOMS_FILE_PATH = path.join(DATA_DIR, 'rooms.json');
const MESSAGES_FILE_PATH = path.join(DATA_DIR, 'messages.json');

// Helper to ensure data directory exists
const ensureDataDirExists = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
};

// Generic helper to write data to a JSON file
const writeDataToFile = <T>(filePath: string, data: T): void => {
  ensureDataDirExists();
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error: any) {
    console.error(`Error writing file ${filePath}:`, error);
    throw new Error(`Failed to write data to ${filePath}: ${error.message}`);
  }
};

// Generic helper to read data from a JSON file
const readDataFromFile = <T>(filePath: string, defaultData: T, ensureFields?: (item: any) => any): T => {
  ensureDataDirExists();
  if (!fs.existsSync(filePath)) {
    writeDataToFile(filePath, defaultData);
    return defaultData;
  }
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    if (fileContent.trim() === '') {
      console.warn(`File ${filePath} is empty. Returning default data. The file will NOT be overwritten with defaults.`);
      return defaultData;
    }
    let jsonData = JSON.parse(fileContent) as T;
    if (Array.isArray(jsonData) && ensureFields) {
      jsonData = jsonData.map(ensureFields) as unknown as T;
    } else if (ensureFields && typeof jsonData === 'object' && jsonData !== null) {
      jsonData = ensureFields(jsonData);
    }
    return jsonData;
  } catch (error) {
    console.error(`Error parsing JSON from file ${filePath}:`, error);
    const fileContentForDebug = fs.readFileSync(filePath, 'utf-8');
    console.warn(`Content preview (up to 500 chars): ${fileContentForDebug.substring(0,500)}...`);
    console.warn(`Returning default data for ${filePath} due to parsing error. The original file has NOT been overwritten.`);
    return defaultData;
  }
};

const ensureUserFields = (user: User): User => ({
  ...user,
  friendIds: user.friendIds || [],
  pendingFriendRequestsReceived: user.pendingFriendRequestsReceived || [],
  sentFriendRequests: user.sentFriendRequests || [],
  isTypingInRoomId: user.isTypingInRoomId === undefined ? null : user.isTypingInRoomId,
  isAdmin: user.isAdmin || false,
});

const ensureMessageFields = (message: Message): Message => ({
    ...message,
    isEdited: message.isEdited || false,
    editedTimestamp: message.editedTimestamp || undefined,
    replyToMessageId: message.replyToMessageId || undefined,
    replyToUsername: message.replyToUsername || undefined,
});


const FetchChatDataOutputSchema = z.object({
  rooms: z.array(RoomSchema),
  messages: z.array(MessageSchema),
  users: z.array(UserSchema.omit({ password: true })),
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
    console.log('Fetching initial chat data (rooms, messages, users) from JSON files...');
    const rooms = readDataFromFile<Room[]>(ROOMS_FILE_PATH, DEFAULT_MOCK_ROOMS_SERVER);
    const messages = readDataFromFile<Message[]>(MESSAGES_FILE_PATH, DEFAULT_MOCK_MESSAGES_SERVER, ensureMessageFields);
    const allUsersFull = readDataFromFile<User[]>(USERS_FILE_PATH, DEFAULT_MOCK_USERS_SERVER, ensureUserFields);
    
    const users = allUsersFull.map(({ password, ...userWithoutPassword }) => userWithoutPassword);

    return {
      rooms,
      messages,
      users,
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

