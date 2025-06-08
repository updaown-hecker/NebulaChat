
# NebulaChat: Real-Time Communication Platform

NebulaChat is a modern, real-time chat application designed for seamless communication. It allows users to connect through public and private chat rooms, engage in direct messaging, manage friendships, and interact with an AI assistant. Built with Next.js, React, ShadCN UI, Tailwind CSS, and Genkit for AI functionalities, NebulaChat offers a responsive and feature-rich experience.

## Table of Contents
*   [Description](#description)
*   [Features](#features)
*   [Installation](#installation)
*   [Usage](#usage)
*   [Contributing](#contributing)
*   [License](#license)
*   [Contact](#contact)
*   [Environment Variables](#environment-variables)

## Description

NebulaChat aims to provide a dynamic and interactive chat environment. Users can register accounts, log in, or continue as guests. The platform supports various forms of communication, from lively public discussions in themed rooms to private conversations with friends. Key functionalities include real-time message exchange, user presence indicators, a comprehensive friend management system, and in-app notifications for important events. The application's backend logic, including data persistence, is simulated using Genkit flows interacting with local JSON files, making it easy to set up and run for development and demonstration purposes.

This application uses Genkit with the `googleAI` plugin for its AI-powered features (e.g., AI chat assistant commands). To enable these features, you need a Google AI API key. See the [Environment Variables](#environment-variables) section for setup instructions.

## Features

NebulaChat comes packed with a variety of features to enhance user interaction:

*   **Real-Time Chat:** Engage in instant message exchange within various chat rooms.
*   **User Authentication:** Secure login, registration, and guest access options.
*   **Public & Private Rooms:** Create and join public discussions or private, invite-only groups.
*   **Direct Messaging (DMs):** Initiate private 1-on-1 conversations with other users. Users can also leave/hide DM chats.
*   **Friend System:**
    *   Search for users by username.
    *   Send, receive, accept, and decline friend requests.
    *   View and manage a list of friends.
    *   Remove friends.
    *   Dedicated "Friends" page with tabs for All Friends and Pending Requests.
*   **Notifications:** Receive in-app alerts for:
    *   New friend requests.
    *   Private room invitations.
    *   Friend request acceptances.
*   **Typing Indicators:** See when other users are typing in the current chat room.
*   **Message Management:**
    *   Edit your sent messages.
    *   Delete your sent messages (Admins can delete any message).
    *   Reply to specific messages.
*   **AI Assistant Commands:**
    *   `/tutorial <topic>`: Get an AI-generated tutorial on a specified topic.
    *   `/suggest-room`: Receive AI-based room suggestions based on recent chat activity.
    *   `/help`: View available AI commands.
*   **Responsive Design:**
    *   Collapsible left sidebar (icon mode).
    *   Manually toggleable right sidebar on desktop for more content space.
    *   Optimized layout for mobile and desktop devices.
*   **Customization:**
    *   Switch between Light and Dark themes.
    *   Adjust application font size (Small, Medium, Large).
*   **User Presence:** (Implicitly through room member lists and typing indicators).
*   **Data Persistence:** User accounts, rooms, messages, and notifications are saved locally using JSON files, managed by Genkit flows.

## Installation

Explain how to install your project. Include any prerequisites and step-by-step instructions.

1.  **Prerequisites:**
    *   Node.js (LTS version recommended, e.g., v18 or v20)
    *   npm or yarn (comes with Node.js)

2.  **Clone the repository**
    ```bash
    git clone https://github.com/updaown-hecker/NebulaChat.git
    cd NebulaChat
    ```
3.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```
4.  **Set up Environment Variables:**
    *   Create a `.env` file in the root of the project.
    *   Add your Google AI API key as described in the [Environment Variables](#environment-variables) section.

## Usage

Explain how to use your project. Provide examples if necessary.

To run the development server for the Next.js app:
```bash
npm run dev
# or
yarn dev
```
Open [http://localhost:9002](http://localhost:9002) (or the port specified in your `package.json`) with your browser to see the result.

To run the Genkit development server (for testing flows, typically runs on port 3400):
```bash
npm run genkit:dev
# or with watch mode
npm run genkit:watch
```

To build the project for production:
```bash
npm run build
# or
yarn build
```
To start the production server:
```bash
npm start
# or
yarn start
```
## Google AI API Key

This application uses Genkit with the `googleAI` plugin for its AI-powered features (e.g., AI chat assistant commands). To enable these features, you need a Google AI API key.

1.  Obtain an API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2.  Create a file named `.env` in the root of this project (if it doesn't already exist).
3.  Add your API key to the `.env` file like this:
    ```
    GOOGLE_API_KEY=YOUR_API_KEY_HERE
    ```

## Contributing

Explain how others can contribute to your project.

1.  Fork the repository.
2.  Create a new branch: `git checkout -b feature/your-feature-name`
3.  Make your changes and commit them: `git commit -m 'Add some feature'`
4.  Push to the branch: `git push origin feature/your-feature-name`
5.  Create a pull request.

## License

Specify the license under which your project is released. Typically, this would be a standard open-source license like MIT.
If you have a `LICENSE` file, link to it here: e.g., [LICENSE](LICENSE)

## Contact

How can people reach you if they have questions or feedback?

*   (Optional) Email: your.email@example.com
*   (Optional) GitHub Issues: Link to your project's issue tracker.

## Environment Variables

This section will describe the environment variables required to run the project.

