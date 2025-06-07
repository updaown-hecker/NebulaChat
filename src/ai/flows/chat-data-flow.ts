
'use server';
/**
 * @fileOverview Simulates server-side operations for fetching and syncing chat data.
 * In a real application, these flows would interact with a database.
 *
 * - fetchChatDataFlow - Simulates fetching initial rooms and messages.
 * - syncRoomsToServerFlow - Simulates saving rooms to a server.
 * - syncMessagesToServerFlow - Simulates saving messages to a server.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { Room, Message } from '@/types'; // Assuming your types are here

// Define Zod schemas for Room and Message if not already globally available for Genkit
// For simplicity, we'll assume they are compatible with what `types.ts` defines.
// If specific schema validation is needed here, define Zod schemas.
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


// Initial data to simulate a server database
const INITIAL_MOCK_ROOMS_SERVER: Room[] = [
  { id: 'general', name: 'General', isPrivate: false, members: ['user1', 'user2', 'guest1'], ownerId: 'user1' },
  { id: 'random', name: 'Random', isPrivate: false, members: ['user1', 'guest1'], ownerId: 'user1' },
  { id: 'dev-talk', name: 'Dev Talk', isPrivate: false, members: ['user2'], ownerId: 'user2' },
];

const INITIAL_MOCK_MESSAGES_SERVER: Message[] = [
  { id: 'msg1', roomId: 'general', userId: 'user1', username: 'Alice', content: 'Hello from server!', timestamp: Date.now() - 100000 },
  { id: 'msg2', roomId: 'general', userId: 'user2', username: 'Bob', content: 'Hi Alice (server)!', timestamp: Date.now() - 90000 },
];


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
    console.log('Simulating: Fetching initial chat data from server...');
    // In a real app, fetch from a database
    return {
      rooms: INITIAL_MOCK_ROOMS_SERVER,
      messages: INITIAL_MOCK_MESSAGES_SERVER,
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
    console.log(`Simulating: Syncing ${input.rooms.length} rooms to server...`);
    // In a real app, save to a database
    // For now, we just acknowledge. The actual persistence is handled client-side with localStorage.
    return { success: true, message: "Rooms synced with server (simulation)." };
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
    console.log(`Simulating: Syncing ${input.messages.length} messages to server...`);
    // In a real app, save to a database
    return { success: true, message: "Messages synced with server (simulation)." };
  }
);

