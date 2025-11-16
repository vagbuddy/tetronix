# Tetronix

A Sudoku-Tetris hybrid puzzle game.

## Quick Start

This project uses Vite for the frontend and Firebase for the backend.

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Set up Firebase**
    - Create a Firebase project.
    - Enable Anonymous Authentication.
    - Enable Firestore.
    - Enable App Check with reCAPTCHA v3.
    - Create a `.env.local` file in the root of the project and add your Firebase configuration:
      ```
      VITE_FIREBASE_API_KEY=...
      VITE_FIREBASE_AUTH_DOMAIN=...
      VITE_FIREBASE_PROJECT_ID=...
      VITE_FIREBASE_APP_ID=...
      VITE_FIREBASE_RECAPTCHA_SITE_KEY=...
      ```
    - (Optional for development) To bypass App Check locally, you can generate a debug token and add it to your `.env.local`:
        ```
        VITE_FIREBASE_APPCHECK_DEBUG_TOKEN=...
        ```

3.  **Run the Development Server**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:3000`.

## Available Scripts

- `npm run dev`: Runs the app in development mode with hot reloading.
- `npm run build`: Builds the app for production to the `dist` folder.
- `npm run preview`: Serves the production build locally for previewing.
- `npm run test`: Runs the tests with Vitest.

## Deployment

This project is set up for easy deployment with Firebase Hosting.

1.  **Install Firebase CLI**
    ```bash
    npm install -g firebase-tools
    ```

2.  **Login to Firebase**
    ```bash
    firebase login
    ```

3.  **Initialize Firebase**
    ```bash
    firebase init hosting
    ```
    - Select your Firebase project.
    - Use `dist` as the public directory.
    - Configure as a single-page app (rewrite all urls to /index.html).

4.  **Deploy**
    ```bash
    npm run build
    firebase deploy
    ```

## Leaderboard & Backend (secure design)

- Read-only leaderboard: The FE reads top scores per difficulty from the `leaderboard` collection only.
- Untrusted FE writes: The FE does not write scores directly to Firestore. Instead, it calls a callable Cloud Function `submitGame` with:
	- `uid` (anonymous auth), `name`, `difficulty`, `userScore`, `playedSeconds`, `seed`, `moves`.
	- A separate trusted backend validates moves against the seed and writes verified results to `leaderboard`.
- App Check: Enforce App Check on Firestore and Functions so only your app can call the backend.
- Rate limiting: Enforce server-side (e.g., 1 submission per 5 minutes per `uid`/device). The FE adds a simple UX cooldown.

### Environment variables (Vite)

Create `.env.local` with:

``` 

## Backend

The backend API service handles seed generation, game validation, submissions, and leaderboard management. It is located in the [`api/`](./api) directory.

For detailed backend API documentation, setup, and development instructions, see [`api/README.md`](./api/README.md).
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_RECAPTCHA_SITE_KEY=...
```

### Firebase setup

- Enable Anonymous Auth.
- Create callable function `submitGame` that:
	- Verifies App Check token (enforce in console) and Auth.
	- Validates request shape and size (max 1MB; consider compressing `moves`).
	- Applies rate limiting (e.g., per `uid` timestamp in a separate doc or Redis/Firestore counter).
	- Queues or computes verified score from `seed` and `moves` and writes to `leaderboard`.
- Firestore rules idea:
	- `leaderboard`: allow read; deny write from clients.
	- `submissions` (if you store raw): deny direct client writes; accept only via Admin SDK / Functions.

### Firestore Rules

- A ready-made rules file is included at `firestore.rules`:
	- `leaderboard`: read-only for clients.
	- `users/{uid}`: clients can read their own profile (to get the server-issued seed), writes denied (Functions update).
	- Optional `submissions`: shows how to enforce 1 submit per 5 minutes and lock the seed to the server-issued one using rules. If you write via Admin SDK, leave client writes denied.

Rate limiting note: Firestore rules evaluate per write but don’t run for Admin SDK. If you submit via Cloud Functions, enforce the 5-minute limit in the function and also update `users/{uid}.lastSubmitAt` atomically.

### Callable Functions (suggested)

- `startGame` (callable):
	- Input: `{ uid }` (from auth; validate server-side).
	- Behavior: generate a cryptographically random seed on the server, store on `users/{uid}.activeSeed`, return `{ seed }`.
	- FE calls this at the start (or restart) and uses the returned seed for deterministic RNG.
- `submitGame` (callable):
	- Input: `{ uid, name, difficulty, userScore, playedSeconds, seed, moves }`.
	- Behavior: enforce App Check + auth; verify the seed equals `users/{uid}.activeSeed`; rate-limit 1 per 5 minutes (check and update `lastSubmitAt` atomically); compute/verify final score from `seed` and `moves`; write to `leaderboard`.

- App Check debug: While developing locally, you can enable App Check debug token. See Firebase docs for Vite setups.
- If `submitGame` isn’t deployed yet, the app will no-op on submit.
