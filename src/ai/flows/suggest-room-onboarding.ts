'use server';

/**
 * @fileOverview This file implements the Genkit flow for suggesting relevant public rooms to new users based on their initial messages.
 *
 * - suggestRoomOnboarding - A function that handles the room suggestion process.
 * - SuggestRoomOnboardingInput - The input type for the suggestRoomOnboarding function.
 * - SuggestRoomOnboardingOutput - The return type for the suggestRoomOnboarding function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestRoomOnboardingInputSchema = z.object({
  userMessage: z.string().describe('The initial message from the new user.'),
});
export type SuggestRoomOnboardingInput = z.infer<typeof SuggestRoomOnboardingInputSchema>;

const SuggestRoomOnboardingOutputSchema = z.object({
  suggestedRooms: z
    .array(z.string())
    .describe('An array of suggested public room names based on the user message.'),
  reasoning: z
    .string()
    .optional()
    .describe('The AI reasoning for suggesting these rooms based on the user message.'),
});
export type SuggestRoomOnboardingOutput = z.infer<typeof SuggestRoomOnboardingOutputSchema>;

export async function suggestRoomOnboarding(input: SuggestRoomOnboardingInput): Promise<SuggestRoomOnboardingOutput> {
  return suggestRoomOnboardingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestRoomOnboardingPrompt',
  input: {schema: SuggestRoomOnboardingInputSchema},
  output: {schema: SuggestRoomOnboardingOutputSchema},
  prompt: `You are an AI assistant designed to help new users find relevant public rooms in a chat application.
  Based on the user's initial message, suggest a few public rooms that might be of interest to them.
  Focus on suggesting rooms that align with the user's expressed interests or needs.
  Provide a brief explanation of why you are suggesting these rooms.

  User Message: {{{userMessage}}}

  Output in the following JSON format: {"suggestedRooms": ["room1", "room2"], "reasoning": "explanation"}`,
});

const suggestRoomOnboardingFlow = ai.defineFlow(
  {
    name: 'suggestRoomOnboardingFlow',
    inputSchema: SuggestRoomOnboardingInputSchema,
    outputSchema: SuggestRoomOnboardingOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
