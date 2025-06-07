
'use server';
/**
 * @fileOverview Simulates server-side authentication operations.
 * In a real application, these flows would interact with a secure authentication service and database.
 *
 * - registerUser - Simulates registering a new user.
 * - loginUser - Simulates logging in an existing user.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { User } from '@/types';

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
  }).nullable(),
  message: z.string().optional(),
});
export type AuthOutput = z.infer<typeof AuthOutputSchema>;

// Simulate a server-side user database (in-memory for this prototype)
const mockServerAccounts: User[] = [];

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
    console.log(`Simulating: Registering user "${username}" on server...`);
    if (mockServerAccounts.find(acc => acc.username === username)) {
      return { success: false, user: null, message: 'Username already exists.' };
    }
    const newUser: User = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      username,
      password, // In a real app, HASH this password!
      isGuest: false,
    };
    mockServerAccounts.push(newUser);
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
    console.log(`Simulating: Logging in user "${username}" on server...`);
    const account = mockServerAccounts.find(acc => acc.username === username);
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
