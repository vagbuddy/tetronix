import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  orderBy,
  limit as qLimit,
  type Firestore,
} from "firebase/firestore";

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
  return { app, db };
};

export const submitScore = async (entry: ScoreEntry) => {
  const { db } = ensureInit();
  if (!db) return { ok: false as const, reason: "not-configured" };
  const payload = {
    name: entry.name?.slice(0, 24) || "Player",
    score: Number(entry.score) || 0,
    difficulty: entry.difficulty,
    playedSeconds: entry.playedSeconds ?? null,
    locale:
      entry.locale ??
      (typeof navigator !== "undefined" ? navigator.language : undefined),
    createdAt: serverTimestamp(),
  };
  await addDoc(collection(db, "leaderboard"), payload);
  return { ok: true as const };
};

export const getTopScores = async (difficulty?: Difficulty, limit = 20) => {
  const { db } = ensureInit();
  if (!db) return [] as ScoreEntry[];
  let base = collection(db, "leaderboard");
  // For v1, just order by score desc; later we can filter by difficulty with a composite index if desired.
  const q = query(base, orderBy("score", "desc"), qLimit(limit));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
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
