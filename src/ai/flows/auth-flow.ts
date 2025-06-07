
'use server';
/**
 * @fileOverview Simulates server-side authentication operations, using JSON files for persistence.
 * In a real application, these flows would interact with a secure authentication service and database.
 *
 * - registerUser - Simulates registering a new user.
 * - loginUser - Simulates logging in an existing user.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { User } from '@/types';
import fs from 'fs';
import path from 'path';

// --- Schemas ---
const AuthInputSchema = z.object({
  username: z.string(),
  password: z.string().optional(), // Password is required for registration, optional for some login scenarios (e.g. guest, though not used by this flow)
});
export type AuthInput = z.infer<typeof AuthInputSchema>;

const AuthOutputSchema = z.object({
  success: z.boolean(),
  user: z.object({
    id: z.string(),
    username: z.string(),
    isGuest: z.boolean().optional(),
  }).nullable(),
  message: z.string().optional(),
});
export type AuthOutput = z.infer<typeof AuthOutputSchema>;

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
    };
    users.push(newUser);
    writeUsersToFile(users);
    
    // Return only non-sensitive parts of the user object
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
      // In a real app, compare HASHED passwords securely!
      if (account.password === password || (!account.password && !password)) {
        // Return only non-sensitive parts of the user object
        const { password: _p, ...userToReturn } = account;
        return { success: true, user: userToReturn, message: 'Login successful.' };
      }
    }
    return { success: false, user: null, message: 'Invalid username or password.' };
  }
);
