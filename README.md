# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

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

### Dev notes

- App Check debug: While developing locally, you can enable App Check debug token. See Firebase docs for Vite setups.
- If `submitGame` isn’t deployed yet, the app will no-op on submit.
