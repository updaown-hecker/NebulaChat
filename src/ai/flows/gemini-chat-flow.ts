
'use server';
/**
 * @fileOverview A Genkit flow for general chat with Gemini, intended for admin use.
 * - geminiChat: Sends a message to Gemini and gets a response.
 * - GeminiChatInput: Input type for the chat message.
 * - GeminiChatOutput: Output type for Gemini's response.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod'; // Use Zod directly

export const GeminiChatInputSchema = z.object({
  prompt: z.string().describe("The admin user's message to send to Gemini."),
});
export type GeminiChatInput = z.infer<typeof GeminiChatInputSchema>;

export const GeminiChatOutputSchema = z.object({
  response: z.string().describe("Gemini's response to the admin."),
});
export type GeminiChatOutput = z.infer<typeof GeminiChatOutputSchema>;

// This is the function the client-side page will call
export async function geminiChat(input: GeminiChatInput): Promise<GeminiChatOutput> {
  return geminiChatFlow(input);
}

const geminiChatFlow = ai.defineFlow(
  {
    name: 'geminiChatFlow',
    inputSchema: GeminiChatInputSchema,
    outputSchema: GeminiChatOutputSchema,
  },
  async (input) => {
    const llmResponse = await ai.generate({
      prompt: input.prompt,
      // model: 'googleai/gemini-pro' // Using default from genkit.ts (gemini-2.0-flash)
    });
    return { response: llmResponse.text ?? "Sorry, I couldn't generate a response at this moment." };
  }
);
