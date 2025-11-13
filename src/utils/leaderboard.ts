import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getFirestore,
  collection,
  serverTimestamp,
  getDocs,
  query,
  orderBy,
  where,
  limit as qLimit,
  type Firestore,
} from "firebase/firestore";
import {
  getAuth,
  signInAnonymously,
  type Auth,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFunctions,
  httpsCallable,
  type Functions,
} from "firebase/functions";
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  type AppCheck,
} from "firebase/app-check";

type Difficulty = "casual" | "master" | "expert" | "insane";

export type ScoreEntry = {
  name: string;
  score: number;
  difficulty: Difficulty;
  playedSeconds?: number;
  createdAt?: any;
  locale?: string;
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
let functions: Functions | null = null;
let appCheck: AppCheck | null = null;

const ensureInit = () => {
  if (app && db) return { app, db };
  const cfg = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  } as const;
  if (!cfg.apiKey || !cfg.authDomain || !cfg.projectId) {
    // Not configured; operate in no-op mode to avoid crashes in local/dev without env vars
    return { app: null, db: null } as any;
  }
  app = initializeApp(cfg as any);
  db = getFirestore(app);
  // App Check (optional but recommended)
  try {
    const siteKey = (import.meta as any).env.VITE_FIREBASE_RECAPTCHA_SITE_KEY;
    if (siteKey) {
      appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(siteKey),
        isTokenAutoRefreshEnabled: true,
      });
    }
  } catch {}
  // Auth (anonymous)
  try {
    auth = getAuth(app);
  } catch {}
  // Functions
  try {
    functions = getFunctions(app);
  } catch {}
  return { app, db };
};

// Ensure anonymous sign-in and return UID
const ensureAnonAuth = async (): Promise<string | null> => {
  ensureInit();
  if (!auth) return null;
  if (auth.currentUser) return auth.currentUser.uid;
  try {
    const res = await signInAnonymously(auth);
    return res.user.uid;
  } catch {
    return await new Promise<string | null>((resolve) => {
      const unsub = onAuthStateChanged(auth!, (u) => {
        unsub();
        resolve(u?.uid ?? null);
      });
    });
  }
};

// Client UX cooldown only; real rate limit must be on backend
const LAST_SUBMIT_KEY = "tetronix:lastSubmitAt";
export const getLastSubmitAt = (): number | null => {
  try {
    if (typeof window === "undefined") return null;
    const v = localStorage.getItem(LAST_SUBMIT_KEY);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
};
export const setLastSubmitAt = (t: number) => {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(LAST_SUBMIT_KEY, String(t));
  } catch {}
};

// Submit game to a callable backend (read-only FE)
export type SubmitGameInput = {
  name: string;
  difficulty: Difficulty;
  userScore: number;
  playedSeconds?: number;
  seed: number;
  moves: any[];
};

export const submitGame = async (payload: SubmitGameInput) => {
  ensureInit();
  if (!functions) return { ok: false as const, reason: "not-configured" };
  const uid = await ensureAnonAuth();
  try {
    const call = httpsCallable(functions, "submitGame");
    await call({
      uid,
      name: payload.name?.slice(0, 24) || "Player",
      difficulty: payload.difficulty,
      userScore: Number(payload.userScore) || 0,
      playedSeconds: payload.playedSeconds ?? null,
      seed: payload.seed,
      moves: payload.moves,
      createdAt: Date.now(),
      locale: typeof navigator !== "undefined" ? navigator.language : undefined,
    } as any);
    setLastSubmitAt(Date.now());
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, reason: "call-failed", error: e };
  }
};

// Request a server-issued seed bound to current uid
export const startGame = async (): Promise<
  { seed: number } | { ok: false; reason: string }
> => {
  ensureInit();
  if (!functions)
    return { ok: false as const, reason: "not-configured" } as any;
  const uid = await ensureAnonAuth();
  try {
    const call = httpsCallable(functions, "startGame");
    const res: any = await call({ uid });
    if (typeof res?.data?.seed === "number") {
      return { seed: res.data.seed };
    }
    return { ok: false as const, reason: "bad-response" } as any;
  } catch (e) {
    return { ok: false as const, reason: "call-failed" } as any;
  }
};

export const getTopScores = async (difficulty?: Difficulty, limit = 5) => {
  const { db } = ensureInit();
  if (!db) return [] as ScoreEntry[];
  const base = collection(db, "leaderboard");
  try {
    const q = difficulty
      ? query(
          base,
          where("difficulty", "==", difficulty),
          orderBy("score", "desc"),
          qLimit(limit)
        )
      : query(base, orderBy("score", "desc"), qLimit(limit));
    const snap = await getDocs(q);
    const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    cacheTopScores(difficulty, rows);
    return rows;
  } catch {
    // Fallback: fetch more and filter client-side (avoids index requirement)
    try {
      const snap = await getDocs(
        query(base, orderBy("score", "desc"), qLimit(100))
      );
      const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      const filtered = difficulty
        ? items.filter((i: any) => i.difficulty === difficulty).slice(0, limit)
        : items.slice(0, limit);
      cacheTopScores(difficulty, filtered);
      return filtered;
    } catch {
      const cached = readCachedTopScores(difficulty);
      return cached ?? [];
    }
  }
};

// Local cache for leaderboard (used when Firestore is unreachable)
const TOP_CACHE_KEY = (difficulty?: Difficulty) =>
  `tetronix:top:${difficulty ?? "all"}`;

const cacheTopScores = (difficulty: Difficulty | undefined, rows: any[]) => {
  try {
    if (typeof window === "undefined") return;
    const key = TOP_CACHE_KEY(difficulty);
    localStorage.setItem(key, JSON.stringify({ at: Date.now(), rows }));
  } catch {}
};

const readCachedTopScores = (difficulty?: Difficulty): any[] | null => {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(TOP_CACHE_KEY(difficulty));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.rows) ? parsed.rows : null;
  } catch {
    return null;
  }
};

const USERNAME_KEY = "tetronix:username";
export const getSavedUsername = (): string | null => {
  try {
    if (typeof window === "undefined") return null;
    const v = localStorage.getItem(USERNAME_KEY);
    return v && v.trim() ? v.trim() : null;
  } catch {
    return null;
  }
};
export const saveUsername = (name: string) => {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(USERNAME_KEY, name);
  } catch {}
};
