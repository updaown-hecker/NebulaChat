'use server';

/**
 * @fileOverview Implements an AI assistant that provides tutorials based on user commands.
 *
 * - aiTutorialCommand - A function that processes user commands and provides relevant tutorials.
 * - AiTutorialCommandInput - The input type for the aiTutorialCommand function.
 * - AiTutorialCommandOutput - The return type for the aiTutorialCommand function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiTutorialCommandInputSchema = z.object({
  command: z.string().describe('The command issued by the user.'),
  userInput: z.string().describe('The user input or query related to the command.'),
});
export type AiTutorialCommandInput = z.infer<typeof AiTutorialCommandInputSchema>;

const AiTutorialCommandOutputSchema = z.object({
  tutorialContent: z.string().describe('The tutorial content generated by the AI.'),
});
export type AiTutorialCommandOutput = z.infer<typeof AiTutorialCommandOutputSchema>;

export async function aiTutorialCommand(input: AiTutorialCommandInput): Promise<AiTutorialCommandOutput> {
  return aiTutorialCommandFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiTutorialCommandPrompt',
  input: {schema: AiTutorialCommandInputSchema},
  output: {schema: AiTutorialCommandOutputSchema},
  prompt: `You are an AI assistant designed to provide tutorials based on user commands.

The user has issued the following command: {{{command}}}

The user's input related to the command is: {{{userInput}}}

Based on the command and user input, generate a tutorial that is helpful and easy to understand. Focus on providing clear, step-by-step instructions. Assume the user is new to the application.

Tutorial:`,
});

const aiTutorialCommandFlow = ai.defineFlow(
  {
    name: 'aiTutorialCommandFlow',
    inputSchema: AiTutorialCommandInputSchema,
    outputSchema: AiTutorialCommandOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
