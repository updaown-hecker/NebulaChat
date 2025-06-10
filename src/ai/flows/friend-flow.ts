
'use server';
/**
 * @fileOverview Manages friend-related operations like searching users, sending,
 * accepting, declining friend requests, and removing friends. Uses JSON for persistence.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { User } from '@/types';
import fs from 'fs';
import path from 'path';
import { createNotification } from './notification-flow'; // Import createNotification

const DATA_DIR = path.join(process.cwd(), 'src', 'ai', 'data');
const USERS_FILE_PATH = path.join(DATA_DIR, 'users.json');
const DEFAULT_USERS: User[] = []; // Default to empty array for users

// Helper to ensure data directory exists
const ensureDataDirExists = (): void => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
};

// Helper to write users to JSON file (already robust)
const writeUsersToFileInternal = (users: User[]): void => { // Renamed to avoid conflict if imported elsewhere
  ensureDataDirExists();
  try {
    fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(users, null, 2));
  } catch (error: any) {
    console.error('Error writing users file in friend-flow:', error);
    throw new Error(`Failed to write users data in friend-flow: ${error.message}`);
  }
};

// Helper to read users from JSON file (updated for robustness)
export const readUsersFromFile = async (): Promise<User[]> => {
  ensureDataDirExists();
  if (!fs.existsSync(USERS_FILE_PATH)) {
    writeUsersToFileInternal(DEFAULT_USERS); // Initialize if not exists
    return DEFAULT_USERS;
  }
  try {
    const fileContent = await fs.promises.readFile(USERS_FILE_PATH, 'utf-8');
    if (fileContent.trim() === '') {
      console.warn(`File ${USERS_FILE_PATH} is empty. Initializing with default data.`);
      writeUsersToFileInternal(DEFAULT_USERS);
      return DEFAULT_USERS;
    }
    const users = JSON.parse(fileContent) as User[];
    // Ensure new fields exist with defaults
    return users.map(u => ({
        ...u,
        friendIds: u.friendIds || [],
        pendingFriendRequestsReceived: u.pendingFriendRequestsReceived || [],
        sentFriendRequests: u.sentFriendRequests || [],
        isAdmin: u.isAdmin || false,
    }));
  } catch (error) {
    console.error(`Error reading or parsing users file ${USERS_FILE_PATH} in friend-flow:`, error);
    console.warn(`File ${USERS_FILE_PATH} was corrupted or malformed. Initializing with default data.`);
    writeUsersToFileInternal(DEFAULT_USERS);
    return DEFAULT_USERS;
  }
};


// --- Search Users ---
const SearchUsersInputSchema = z.object({
  query: z.string(),
  currentUserId: z.string(),
});
export type SearchUsersInput = z.infer<typeof SearchUsersInputSchema>;

const UserSearchResultSchema = z.object({
    id: z.string(),
    username: z.string(),
    // Include friend status fields for direct use in UI
    friendIds: z.array(z.string()).optional(),
    pendingFriendRequestsReceived: z.array(z.string()).optional(),
    sentFriendRequests: z.array(z.string()).optional(),
    isAdmin: z.boolean().optional(), // Added isAdmin
});

const SearchUsersOutputSchema = z.object({
  users: z.array(UserSearchResultSchema),
});
export type SearchUsersOutput = z.infer<typeof SearchUsersOutputSchema>;

export async function searchUsers(input: SearchUsersInput): Promise<SearchUsersOutput> {
  return searchUsersFlow(input);
}

const searchUsersFlow = ai.defineFlow(
  {
    name: 'searchUsersFlow',
    inputSchema: SearchUsersInputSchema,
    outputSchema: SearchUsersOutputSchema,
  },
  async ({ query, currentUserId }) => {
    const allUsers = await readUsersFromFile();
    const lowerCaseQuery = query.toLowerCase();
    const foundUsers = allUsers
      .filter(user => user.id !== currentUserId && user.username.toLowerCase().includes(lowerCaseQuery))
      .map(({ password, ...userWithoutPassword }) => userWithoutPassword); // Exclude password
    return { users: foundUsers };
  }
);

// --- Send Friend Request ---
const FriendRequestInputSchema = z.object({
  requesterId: z.string(),
  recipientId: z.string(),
});
export type FriendRequestInput = z.infer<typeof FriendRequestInputSchema>;

const FriendRequestOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  updatedRequester: UserSearchResultSchema.optional(), // Send back updated user state
  updatedRecipient: UserSearchResultSchema.optional(),
});
export type FriendRequestOutput = z.infer<typeof FriendRequestOutputSchema>;

export async function sendFriendRequest(input: FriendRequestInput): Promise<FriendRequestOutput> {
  return sendFriendRequestFlow(input);
}

const sendFriendRequestFlow = ai.defineFlow(
  {
    name: 'sendFriendRequestFlow',
    inputSchema: FriendRequestInputSchema,
    outputSchema: FriendRequestOutputSchema,
  },
  async ({ requesterId, recipientId }) => {
    if (requesterId === recipientId) {
      return { success: false, message: "You cannot send a friend request to yourself." };
    }
    const users = await readUsersFromFile();
    const requesterIndex = users.findIndex(u => u.id === requesterId);
    const recipientIndex = users.findIndex(u => u.id === recipientId);

    if (requesterIndex === -1 || recipientIndex === -1) {
      return { success: false, message: "User not found." };
    }

    const requester = users[requesterIndex];
    const recipient = users[recipientIndex];

    if (requester.friendIds?.includes(recipientId)) {
      return { success: false, message: "You are already friends." };
    }
    if (requester.sentFriendRequests?.includes(recipientId)) {
      return { success: false, message: "Friend request already sent." };
    }
    if (requester.pendingFriendRequestsReceived?.includes(recipientId)) {
      // This means the other person already sent a request, auto-accept? For now, just message.
      return { success: false, message: `${recipient.username} has already sent you a friend request. Please check your pending requests.` };
    }

    // Update requester: add to sentFriendRequests
    requester.sentFriendRequests = [...(requester.sentFriendRequests || []), recipientId];
    // Update recipient: add to pendingFriendRequestsReceived
    recipient.pendingFriendRequestsReceived = [...(recipient.pendingFriendRequestsReceived || []), requesterId];
    
    users[requesterIndex] = requester;
    users[recipientIndex] = recipient;
    writeUsersToFileInternal(users);

    // Create notification for the recipient
    await createNotification({
      userId: recipientId,
      type: 'friend_request_received',
      message: `${requester.username} sent you a friend request.`,
      link: '/chat/friends', // Link to the friends page
      actorId: requesterId,
      actorUsername: requester.username,
    });

    const { password: _rp, ...requesterToReturn } = requester;
    const { password: _recp, ...recipientToReturn } = recipient;

    return { success: true, message: "Friend request sent.", updatedRequester: requesterToReturn, updatedRecipient: recipientToReturn };
  }
);


// --- Accept Friend Request ---
export async function acceptFriendRequest(input: FriendRequestInput): Promise<FriendRequestOutput> {
    return acceptFriendRequestFlow(input);
}

const acceptFriendRequestFlow = ai.defineFlow(
    {
        name: 'acceptFriendRequestFlow',
        inputSchema: FriendRequestInputSchema, // userId receiving, requesterId who sent
        outputSchema: FriendRequestOutputSchema,
    },
    async ({ requesterId, recipientId }) => { // recipientId is the one accepting, requesterId is the one who sent
        const users = await readUsersFromFile();
        const recipientUserIndex = users.findIndex(u => u.id === recipientId);
        const requesterUserIndex = users.findIndex(u => u.id === requesterId);

        if (recipientUserIndex === -1 || requesterUserIndex === -1) {
            return { success: false, message: "User not found." };
        }

        const recipientUser = users[recipientUserIndex];
        const requesterUser = users[requesterUserIndex];

        // Check if request exists
        if (!recipientUser.pendingFriendRequestsReceived?.includes(requesterId)) {
            return { success: false, message: "No pending friend request found from this user." };
        }

        // Add to friends list for both
        recipientUser.friendIds = [...(recipientUser.friendIds || []), requesterId];
        requesterUser.friendIds = [...(requesterUser.friendIds || []), recipientId];

        // Remove from pending for recipient
        recipientUser.pendingFriendRequestsReceived = (recipientUser.pendingFriendRequestsReceived || []).filter(id => id !== requesterId);
        // Remove from sent for requester
        requesterUser.sentFriendRequests = (requesterUser.sentFriendRequests || []).filter(id => id !== recipientId);

        users[recipientUserIndex] = recipientUser;
        users[requesterUserIndex] = requesterUser;
        writeUsersToFileInternal(users);
        
        // Optionally, notify the original requester that their request was accepted
        await createNotification({
            userId: requesterId,
            type: 'generic', // Or a new type like 'friend_request_accepted'
            message: `${recipientUser.username} accepted your friend request.`,
            link: `/chat/friends`, // Could link to the new friend's profile or DM
            actorId: recipientId,
            actorUsername: recipientUser.username,
        });

        const { password: _rp, ...requesterToReturn } = requesterUser;
        const { password: _recp, ...recipientToReturn } = recipientUser;

        return { success: true, message: "Friend request accepted.", updatedRequester: requesterToReturn, updatedRecipient: recipientToReturn };
    }
);


// --- Decline/Cancel Friend Request ---
// This one function can handle both declining a received request and canceling a sent one.
// 'userId' is the one performing the action, 'otherUserId' is the target of the action.
const ManageFriendRequestInputSchema = z.object({
  userId: z.string(), 
  otherUserId: z.string(), 
});
export type ManageFriendRequestInput = z.infer<typeof ManageFriendRequestInputSchema>;

export async function declineOrCancelFriendRequest(input: ManageFriendRequestInput): Promise<FriendRequestOutput> {
    return declineOrCancelFriendRequestFlow(input);
}

const declineOrCancelFriendRequestFlow = ai.defineFlow(
    {
        name: 'declineOrCancelFriendRequestFlow',
        inputSchema: ManageFriendRequestInputSchema,
        outputSchema: FriendRequestOutputSchema,
    },
    async ({ userId, otherUserId }) => {
        const users = await readUsersFromFile();
        const userIndex = users.findIndex(u => u.id === userId);
        const otherUserIndex = users.findIndex(u => u.id === otherUserId);

        if (userIndex === -1 || otherUserIndex === -1) {
            return { success: false, message: "User not found." };
        }
        
        const mainUser = users[userIndex];
        const otherUser = users[otherUserIndex];

        let changed = false;
        let actionMessage = "Friend request managed.";

        // Scenario 1: User is declining a request received from otherUser
        if (mainUser.pendingFriendRequestsReceived?.includes(otherUserId)) {
            mainUser.pendingFriendRequestsReceived = mainUser.pendingFriendRequestsReceived.filter(id => id !== otherUserId);
            otherUser.sentFriendRequests = (otherUser.sentFriendRequests || []).filter(id => id !== userId);
            changed = true;
            actionMessage = "Friend request declined.";
        }
        // Scenario 2: User is canceling a request they sent to otherUser
        else if (mainUser.sentFriendRequests?.includes(otherUserId)) {
            mainUser.sentFriendRequests = mainUser.sentFriendRequests.filter(id => id !== otherUserId);
            otherUser.pendingFriendRequestsReceived = (otherUser.pendingFriendRequestsReceived || []).filter(id => id !== userId);
            changed = true;
            actionMessage = "Friend request canceled.";
        }

        if (!changed) {
            return { success: false, message: "No active friend request found to manage." };
        }

        users[userIndex] = mainUser;
        users[otherUserIndex] = otherUser;
        writeUsersToFileInternal(users);

        const { password: _up, ...userToReturn } = mainUser;
        const { password: _op, ...otherUserToReturn } = otherUser;

        return { success: true, message: actionMessage, updatedRequester: userToReturn, updatedRecipient: otherUserToReturn };
    }
);

// --- Remove Friend ---
export async function removeFriend(input: ManageFriendRequestInput): Promise<FriendRequestOutput> {
    return removeFriendFlow(input);
}

const removeFriendFlow = ai.defineFlow(
    {
        name: 'removeFriendFlow',
        inputSchema: ManageFriendRequestInputSchema, // userId, otherUserId (who is the friend to remove)
        outputSchema: FriendRequestOutputSchema,
    },
    async ({ userId, otherUserId }) => {
        const users = await readUsersFromFile();
        const userIndex = users.findIndex(u => u.id === userId);
        const friendIndex = users.findIndex(u => u.id === otherUserId);

        if (userIndex === -1 || friendIndex === -1) {
            return { success: false, message: "User not found." };
        }

        const mainUser = users[userIndex];
        const friendUser = users[friendIndex];

        if (!mainUser.friendIds?.includes(otherUserId)) {
            return { success: false, message: "This user is not in your friends list." };
        }

        mainUser.friendIds = (mainUser.friendIds || []).filter(id => id !== otherUserId);
        friendUser.friendIds = (friendUser.friendIds || []).filter(id => id !== userId);

        users[userIndex] = mainUser;
        users[friendIndex] = friendUser;
        writeUsersToFileInternal(users);

        const { password: _up, ...userToReturn } = mainUser;
        const { password: _fp, ...friendToReturn } = friendUser;
        
        return { success: true, message: "Friend removed.", updatedRequester: userToReturn, updatedRecipient: friendToReturn };
    }
);

