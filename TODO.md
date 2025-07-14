# TODO: Talk News Implementation Plan

This document outlines the development tasks required to build the Talk News application.

### Phase 1: Project Setup & Core UI

- [x] **Initialize Project:** (✓ Done) Next.js project is already set up.
- [x] **Create Directory Structure:**
    - `app/components/`: For reusable React components (e.g., `NewsCard`, `ChatWindow`).
    - `app/lib/`: For external API clients and utility functions (e.g., `news.js`, `gemini.js`, `translation.js`).
    - `app/context/`: For React Context to manage global state like language preferences.
- [x] **Implement Responsive Layout:**
    - Create the main two-column layout in `app/page.js` using CSS Flexbox or Grid.
    - Ensure the layout stacks vertically on smaller screens (using media queries in `app/globals.css`).
- [x] **Create Placeholder Components:**
    - `components/NewsFeed.js`: Placeholder for the list of news cards.
    - `components/ArticleDetail.js`: Placeholder for the selected article's content.
    - `components/ChatWindow.js`: Placeholder for the AI chat interface.

### Phase 2: User Language Selection

- [x] **Create Language Selection UI:**
    - Build a modal or a simple component that appears on first load.
    - Populate dropdowns with a list of supported languages.
- [x] **Implement State Management:**
    - Create a `LanguageContext` to store and provide `nativeLanguage` and `targetLanguage`.
    - Use `localStorage` to persist the user's choices across sessions.
    - Wrap the main application in the `LanguageProvider`.

### Phase 3: News Feed Integration

- [x] **Setup Environment Variables:**
    - Create a `.env.local` file.
    - Add `NEWS_API_KEY` for the newsapi.org API.
- [x] **Create News API Client:**
    - In `lib/news.js`, create a function to fetch news based on the `targetLanguage`.
- [x] **Create Translation Client:**
    - In `lib/translation.js`, create a function to translate headlines to the `nativeLanguage`.
- [x] **Build `NewsCard` Component:**
    - Design the card to display the two headlines with the specified visual hierarchy.
    - Fetch and display news in the `NewsFeed` component.
    - Implement `onClick` functionality to update the selected article state.

### Phase 4: AI Chat Integration

- [x] **Setup Gemini API:**
    - Add `GEMINI_API_KEY` to `.env.local`.
    - Create a Next.js API route (`app/api/chat/route.js`) to handle communication with the Gemini API. This is crucial to avoid exposing the API key on the client-side.
- [x] **Develop Chat Logic:**
    - When a news card is clicked, the `ChatWindow` component will:
        1. Receive the article content as a prop.
        2. Send a request to `/api/chat` with the article content.
        3. The API route will prompt Gemini to summarize the article and ask questions.
        4. Display the AI's response in the chat history.

### Phase 5: Audio Features (TTS & STT)

- [x] **Implement Text-to-Speech (TTS):**
    - Use the browser's built-in `window.speechSynthesis` API for simplicity (Occam's Razor).
    - Add a "play" icon next to each AI message to trigger speech synthesis of the message text.
- [x] **Implement Speech-to-Text (STT):**
    - Use the browser's built-in `window.SpeechRecognition` API.
    - Add a microphone icon to the chat input.
    - On click, start listening for user's speech, convert it to text, and populate the input field.

### Phase 6: Final Polish

- [x] **Add Loading States:**
    - Show skeletons or spinners while news is loading and while the AI is generating a response.
- [x] **Implement Error Handling:**
    - Gracefully handle API errors (e.g., news fetch fails, Gemini API fails).
    - Display user-friendly error messages.
- [x] **Refine Styling:**
    - Perform a full review of the application's styling and responsiveness.
    - Ensure the UI is clean, consistent, and intuitive.
- [x] **Code Review:**
    - Refactor code to ensure it adheres to high cohesion, low coupling principles.
    - Remove any unnecessary code or comments.
