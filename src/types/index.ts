
export interface User {
  id: string;
  username: string;
  avatar?: string; // URL to avatar image
  isGuest?: boolean;
  password?: string; // For local "account" simulation
  isTypingInRoomId?: string | null; // ID of the room the user is currently typing in
  friendIds?: string[];
  pendingFriendRequestsReceived?: string[]; // User IDs who sent a request to this user
  sentFriendRequests?: string[]; // User IDs to whom this user sent a request
  isAdmin?: boolean; // New field for admin status
}

export interface Room {
  id: string;
  name: string;
  isPrivate: boolean;
  members: string[]; // Array of user IDs
  ownerId?: string; // User ID of the owner, for private rooms
}

export interface Message {
  id: string;
  roomId: string;
  userId: string;
  username: string; // Denormalized for easy display
  content: string;
  timestamp: number; // Unix timestamp
  isAIMessage?: boolean; // Flag for AI assistant messages
  isEdited?: boolean; // True if the message has been edited
  editedTimestamp?: number; // Timestamp of the last edit
  replyToMessageId?: string; // ID of the message being replied to
  replyToUsername?: string; // Username of the author of the message being replied to
}

export type Theme = 'light' | 'dark';
export type FontSize = 'sm' | 'lg' | 'md'; // md was missing, added for consistency

export interface Settings {
  theme: Theme;
  fontSize: FontSize;
}

