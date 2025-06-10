
import { config } from 'dotenv';
config();

import '@/ai/flows/ai-tutorial-command.ts';
import '@/ai/flows/suggest-room-onboarding.ts';
import '@/ai/flows/chat-data-flow.ts';
import '@/ai/flows/auth-flow.ts'; // Includes user auth and typing status updates
import '@/ai/flows/friend-flow.ts'; // Includes friend management flows
import '@/ai/flows/room-management-flow.ts'; // Includes room invitation and leave DM flow
import '@/ai/flows/notification-flow.ts'; // Includes notification management
import '@/ai/flows/gemini-chat-flow.ts'; // Added new admin chat flow
