# Strategic Plan V2: Scaling for Success & Lasting Engagement

_Last Updated: [Current Date]_

## Executive Summary

Our app has successfully migrated to a scalable backend using Supabase and has a robust, AI-powered content generation pipeline. The foundational work is complete. This next phase of our strategy shifts focus from infrastructure to **Performance**, **Community & Retention**, and **Advanced AI-driven Gameplay**.

The goal is to enrich the player experience, encourage daily play, and build a platform that can support thousands more users.

---

## Pillar 1: Performance & Optimization (The "Speed & Stability" Push)

With a growing user base, ensuring a fast, smooth experience is paramount. Minor lags or slow load times are now much more impactful.

### 1.1. Frontend Performance Audit

- **Action**: A systematic review of the frontend to optimize rendering and loading.
- **Key Areas**:
  - **Aggressive Memoization**: While some `React.memo` usage may exist, we need to audit the entire component tree, especially the `DishPhase` and `GuessInput` components, to prevent any unnecessary re-renders during the guess lifecycle.
  - **State Management Scrutiny**: Review the `gameStore` to ensure components only subscribe to the state slices they need. Avoid monolithic state updates that trigger broad re-renders.
  - **Bundle Size Analysis**: Use a tool like the Next.js Bundle Analyzer to visually inspect our JavaScript bundles. Identify and defer loading of non-critical components (e.g., modals, share dialogs) using `next/dynamic`.

### 1.2. Backend & API Hardening

- **Action**: Optimize our API endpoints for speed and cost-efficiency.
- **Key Areas**:
  - **Caching Strategy**: The `/api/dishes` endpoint serves the same data to all users for a full day. We will implement aggressive server-side caching (`Cache-Control` headers) to reduce database queries to a minimum.
  - **Image Optimization**: The `dish-tiles` API processes images on-demand. We can pre-generate and cache these tiles at the moment a new dish is published, making the in-game experience feel instantaneous.

---

## Pillar 2: Community & Retention (The "Make it Sticky" Push)

These features are designed to give players compelling reasons to return every day and share their results.

### 2.1. The Archive: Play Past Games

- **Concept**: Allow users who have completed the daily game to access and play puzzles from previous dates.
- **Implementation**:
  - **UI**: Add a "Past Puzzles" or "Archive" link. This will lead to a view (e.g., a calendar or a simple list) of previously released dishes.
  - **Backend**: Create a new API endpoint, `/api/dishes/[date]`, that can fetch a specific dish by its `release_date`. This is a straightforward extension of our existing API.

### 2.2. Leaderboards & Fun Stats (The MVP Approach)

- **Concept**: Introduce a sense of community and friendly competition. We will avoid forced logins by using anonymous, device-based tracking.
- **Implementation Plan**:
  - **Step 1: Anonymous User Identity**: On first visit, generate a unique user ID and store it in `localStorage`. This ID will be the key for all future community features.
  - **Step 2: Stats Tracking**: Create a new Supabase table, `daily_stats`, to record anonymized game results (`user_id`, `date`, `guesses_count`, `tiles_revealed`, `time_taken`).
  - **Step 3 (MVP): "Fun Facts"**: After a game, show the user where they rank without showing a full list of names. Query the `daily_stats` table to calculate their percentile.
    - _"You were faster than 82% of players today!"_
    - _"You guessed it with only 2 tiles revealed, putting you in the top 5%!"_
  - **Step 4 (V2): Public Leaderboard**: Once the stats system is proven, build a UI to display the top 100 players for the day, ranked by a score we define (e.g., a combination of speed and tiles used).

### 2.3. The Personal Cookbook

- **Concept**: Allow users to "save" the recipes of their favorite dishes.
- **Implementation**:
  - **UI**: Add a "Save to Cookbook" button on the results screen. Create a new "My Cookbook" page accessible from the main menu.
  - **Backend**: Create a new Supabase table, `user_cookbooks`, linking our anonymous `user_id` to a `dish_id`. The Cookbook page will fetch all dishes linked to the current user's ID.

---

## Pillar 3: The Future is Agentic (The "AI-Enhanced Gameplay" Push)

This is where we innovate beyond the current game loop and create truly unique, AI-driven experiences.

### 3.1. The AI Food Critic: Smarter Hints

- **Concept**: Make the guessing process more interactive and less punishing. Instead of a simple "Incorrect" message, an LLM provides a contextual hint.
- **Example**: Answer is "Sushi." User guesses "Paella."
  - **Hint**: "That's a delicious dish, but you're in the wrong part of the world. Think East Asia."
- **Implementation**: Create a new API endpoint that takes the user's guess and the correct answer, queries an LLM with a carefully crafted prompt, and returns a clever hint.

### 3.2. "Guess the Ingredients" Bonus Round

- **Concept**: An optional, conversational post-game challenge.
- **Implementation**: After the main game, an AI agent (powered by our `aiService`) will challenge the user: "I've given you the recipe for Pho. Can you name 3 of its key ingredients?" The AI will then validate the user's free-text answers in a conversational manner.

---

## The Roadmap

1.  **Immediate Focus (Now - Next 2 Weeks)**: Execute **Pillar 1**. A fast, stable site is essential. The frontend audit and API caching are top priorities.
2.  **Mid-Term (Next 1-2 Months)**: Begin **Pillar 2**. Start with The Archive for a quick win. Implement the anonymous user ID and stats tracking, then launch the "Fun Facts" feature.
3.  **Long-Term (3+ Months)**: Begin experimenting with **Pillar 3**. The AI Food Critic is the perfect first experiment—it enhances the core loop without being disruptive.
