
'use server';
/**
 * @fileOverview Simulates server-side authentication and user status operations, using JSON files for persistence.
 * In a real application, these flows would interact with a secure authentication service and database.
 *
 * - registerUser - Simulates registering a new user.
 * - loginUser - Simulates logging in an existing user.
 * - updateUserTypingStatus - Updates the typing status of a user.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { User } from '@/types';
import fs from 'fs';
import path from 'path';

// --- Schemas ---
const AuthInputSchema = z.object({
  username: z.string(),
  password: z.string().optional(), 
});
export type AuthInput = z.infer<typeof AuthInputSchema>;

const AuthOutputSchema = z.object({
  success: z.boolean(),
  user: z.object({
    id: z.string(),
    username: z.string(),
    isGuest: z.boolean().optional(),
    isTypingInRoomId: z.string().nullable().optional(), // Added here for consistency, though not primary for auth output
  }).nullable(),
  message: z.string().optional(),
});
export type AuthOutput = z.infer<typeof AuthOutputSchema>;

const UpdateTypingStatusInputSchema = z.object({
  userId: z.string(),
  roomId: z.string().nullable(),
});
export type UpdateTypingStatusInput = z.infer<typeof UpdateTypingStatusInputSchema>;

const UpdateTypingStatusOutputSchema = z.object({
  success: z.boolean(),
});
export type UpdateTypingStatusOutput = z.infer<typeof UpdateTypingStatusOutputSchema>;


const DATA_DIR = path.join(process.cwd(), 'src', 'ai', 'data');
const USERS_FILE_PATH = path.join(DATA_DIR, 'users.json');

// Helper to ensure data directory exists
const ensureDataDirExists = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
};

// Helper to read users from JSON file
const readUsersFromFile = (): User[] => {
  ensureDataDirExists();
  if (!fs.existsSync(USERS_FILE_PATH)) {
    return [];
  }
  try {
    const fileContent = fs.readFileSync(USERS_FILE_PATH, 'utf-8');
    return JSON.parse(fileContent) as User[];
  } catch (error) {
    console.error('Error reading users file:', error);
    return [];
  }
};

// Helper to write users to JSON file
const writeUsersToFile = (users: User[]): void => {
  ensureDataDirExists();
  try {
    fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error writing users file:', error);
  }
};


// --- Register User ---
export async function registerUser(input: AuthInput): Promise<AuthOutput> {
  return registerUserFlow(input);
}

const registerUserFlow = ai.defineFlow(
  {
    name: 'registerUserFlow',
    inputSchema: AuthInputSchema,
    outputSchema: AuthOutputSchema,
  },
  async ({ username, password }) => {
    console.log(`Attempting to register user "${username}" (persisting to JSON)...`);
    if (!password) {
        return { success: false, user: null, message: 'Password is required for registration.' };
    }

    const users = readUsersFromFile();
    if (users.find(acc => acc.username === username)) {
      return { success: false, user: null, message: 'Username already exists.' };
    }
    const newUser: User = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      username,
      password, // In a real app, HASH this password securely!
      isGuest: false,
      isTypingInRoomId: null,
    };
    users.push(newUser);
    writeUsersToFile(users);
    
    const { password: _p, ...userToReturn } = newUser;
    return { success: true, user: userToReturn, message: 'User registered successfully.' };
  }
);

// --- Login User ---
export async function loginUser(input: AuthInput): Promise<AuthOutput> {
  return loginUserFlow(input);
}

const loginUserFlow = ai.defineFlow(
  {
    name: 'loginUserFlow',
    inputSchema: AuthInputSchema,
    outputSchema: AuthOutputSchema,
  },
  async ({ username, password }) => {
    console.log(`Attempting to log in user "${username}" (checking JSON)...`);
    const users = readUsersFromFile();
    const account = users.find(acc => acc.username === username);

    if (account) {
      if (account.password === password || (!account.password && !password)) {
        const { password: _p, ...userToReturn } = account;
        return { success: true, user: userToReturn, message: 'Login successful.' };
      }
    }
    return { success: false, user: null, message: 'Invalid username or password.' };
  }
);

// --- Update User Typing Status ---
export async function updateUserTypingStatus(input: UpdateTypingStatusInput): Promise<UpdateTypingStatusOutput> {
  return updateUserTypingStatusFlow(input);
}

const updateUserTypingStatusFlow = ai.defineFlow(
  {
    name: 'updateUserTypingStatusFlow',
    inputSchema: UpdateTypingStatusInputSchema,
    outputSchema: UpdateTypingStatusOutputSchema,
  },
  async ({ userId, roomId }) => {
    console.log(`Updating typing status for user "${userId}" in room "${roomId === null ? 'none' : roomId}"...`);
    const users = readUsersFromFile();
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
      console.error(`User with ID ${userId} not found for typing status update.`);
      return { success: false };
    }

    users[userIndex].isTypingInRoomId = roomId;
    writeUsersToFile(users);
    return { success: true };
  }
);
