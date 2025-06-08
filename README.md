# Firebase Studio

This is a NextJS starter in Firebase Studio for the NebulaChat application.

## Getting Started

To get started, take a look at `src/app/page.tsx`.

## Prerequisites

### Google AI API Key

This application uses Genkit with the `googleAI` plugin for its AI-powered features (e.g., AI chat assistant commands). To enable these features, you need a Google AI API key.

1.  Obtain an API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2.  Create a file named `.env` in the root of this project (if it doesn't already exist).
3.  Add your API key to the `.env` file like this:

    ```env
    GOOGLE_API_KEY=your_actual_api_key_here
    ```

    Replace `your_actual_api_key_here` with the API key you obtained.

**Note**: If the `GOOGLE_API_KEY` is not provided or is invalid, AI-related functionalities will fail, which may result in errors like "Failed to fetch" when those features are invoked. Other parts of the application that do not use AI (like basic chat data storage in JSON files) might still function.

## Development

To run the application locally:

1.  **Start the Next.js development server:**
    ```bash
    npm run dev
    ```
    This will typically start the Next.js app on `http://localhost:9002`.

2.  **Start the Genkit development server (optional, for AI flow development/testing):**
    In a separate terminal, run:
    ```bash
    npm run genkit:dev
    ```
    Or, for watching changes to AI flows:
    ```bash
    npm run genkit:watch
    ```
    The Genkit server often starts on a different port (e.g., `http://localhost:3400`). The Next.js application is configured to call these Genkit flows as server actions, so direct interaction with the Genkit server UI is usually for development and debugging of the flows themselves.

Make sure your `GOOGLE_API_KEY` is set in the `.env` file for the AI functionalities to work correctly within the Next.js application.
