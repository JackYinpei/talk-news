# Product Requirements Document: Talk News

## 1. Vision

To create an immersive and interactive language learning web application. The platform will leverage real-time news content and a conversational AI to help users practice a new language by discussing current events.

## 2. Target Audience

Language learners of all levels who want to improve their conversational skills, vocabulary, and comprehension in a dynamic, real-world context, moving beyond traditional textbook exercises.

## 3. Core Features

### F1: User Language Onboarding
- **Description:** Upon first visit, the user will be presented with a clean, simple interface to select their "Native Language" and their "Target Language" (the language they wish to learn).
- **Acceptance Criteria:**
    - A modal or dedicated page appears for first-time users.
    - Two dropdowns are present: "I speak..." (Native) and "I want to learn..." (Target).
    - This choice must be saved locally in the browser (e.g., using `localStorage`) to avoid repeated setup on subsequent visits.

### F2: Main Interface - Responsive Two-Column Layout
- **Description:** The main screen will be divided into two primary sections: a news feed on the left and an interaction panel on the right. The layout must be fully responsive, adapting gracefully to both desktop and mobile screen sizes.
- **Acceptance Criteria:**
    - On desktop, a side-by-side two-column view is displayed.
    - On mobile, the layout should stack vertically or use a tabbed interface to ensure usability.

### F3: News Feed (Left Panel)
- **Description:** This panel will display a scrollable list of news article cards fetched from the `newsapi.org` API. Each card is designed to be a language-learning prompt.
- **Acceptance Criteria:**
    - Fetches news relevant to the user's selected Target Language.
    - Each card prominently displays the news headline in the **Target Language**.
    - Below the primary headline, the same headline translated into the user's **Native Language** is displayed.
    - The native language headline must be visually subordinate (e.g., smaller font size, less prominent color) to encourage the user to focus on the target language.
    - Clicking a card selects it and loads its content into the right-hand panel.

### F4: Interaction Panel (Right Panel)
- **Description:** This panel is for content consumption and conversation. It is vertically divided into two sub-sections.
- **Acceptance Criteria:**
    - **Top Section (Article Detail):** Displays the full content of the selected news article. This area should be concise and scrollable, leaving ample room for the chat window below.
    - **Bottom Section (Chat Window):** This is the core interactive component.
        - When a new article is selected, the AI (Gemini) will initiate the conversation by:
            1. Providing a brief, simple summary of the news in the target language.
            2. Posing 1-3 open-ended questions to encourage discussion.
            3. Providing a playable audio version of its message (Text-to-Speech).
        - The user can reply with either:
            1. Text input.
            2. Audio input, which is converted to text (Speech-to-Text).

## 4. Non-Functional Requirements
- **UI/UX:**
    - **Simplicity (Occam's Razor):** The design should be minimal and intuitive. Avoid unnecessary visual clutter. Every element should serve a purpose.
    - **Responsiveness:** The application must be fully functional and aesthetically pleasing on all common device sizes (mobile, tablet, desktop).
- **Architecture:**
    - **High Cohesion:** Related logic (e.g., API calls, state management) should be grouped together in well-defined modules.
    - **Low Coupling:** Components and modules should be independent, minimizing dependencies on each other to improve maintainability and testability.
- **Technology Stack:**
    - **Frontend:** Next.js (React)
    - **News Source:** newsapi.org API
    - **AI:** Gemini API
    - **Translation:** A suitable translation API (e.g., Google Translate).
    - **Audio:** Browser-native APIs (`SpeechSynthesis`, `SpeechRecognition`) should be prioritized to maintain simplicity.

