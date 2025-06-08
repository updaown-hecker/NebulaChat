
import { config } from 'dotenv';
config();

import '@/ai/flows/ai-tutorial-command.ts';
import '@/ai/flows/suggest-room-onboarding.ts';
import '@/ai/flows/chat-data-flow.ts';
import '@/ai/flows/auth-flow.ts'; // Includes user auth and typing status updates
import '@/ai/flows/friend-flow.ts'; // Includes friend management flows
