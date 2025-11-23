import { initializeApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import {
  getAuth,
  signInAnonymously,
  type Auth,
  onAuthStateChanged,
} from "firebase/auth";
import { getFunctions, type Functions } from "firebase/functions";
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  getToken,
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
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  } as const;
  
  console.log("[Leaderboard] Init config check:", {
    hasApiKey: !!cfg.apiKey,
    hasAuthDomain: !!cfg.authDomain,
    hasProjectId: !!cfg.projectId,
    apiKeyLen: cfg.apiKey?.length
  });

  if (!cfg.apiKey || !cfg.authDomain || !cfg.projectId) {
    console.error("[Leaderboard] Missing Firebase config keys");
    // Not configured; operate in no-op mode to avoid crashes in local/dev without env vars
    return { app: null, db: null } as any;
  }
  try {
    app = initializeApp(cfg as any);
    db = getFirestore(app);
    console.log("[Leaderboard] Firebase initialized successfully");
  } catch (e) {
    console.error("[Leaderboard] initializeApp failed:", e);
    return { app: null, db: null } as any;
  }

  // App Check (optional but recommended)
  try {
    const siteKey = (import.meta as any).env.VITE_FIREBASE_RECAPTCHA_SITE_KEY;
    if (!siteKey) {
      console.debug(
        "App Check: VITE_FIREBASE_RECAPTCHA_SITE_KEY is not set — App Check will be disabled."
      );
    } else {
      console.debug(
        "App Check: site key found (first 8 chars):",
        String(siteKey).slice(0, 8) + "..."
      );
      if (import.meta.env.DEV) {
        const debugToken = (import.meta as any).env
          .VITE_FIREBASE_APPCHECK_DEBUG_TOKEN;
        if (debugToken) {
          (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
          console.debug("App Check: using debug token in DEV");
        }
      }
      appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(siteKey),
        isTokenAutoRefreshEnabled: true,
      });
      // Force a token request to ensure the key is active.
      getToken(appCheck)
        .then((t) => {
          console.debug(
            "App Check: initial token fetched (length):",
            t?.token ? t.token.length : 0
          );
        })
        .catch((error) => {
          console.error("Failed to get App Check token:", error);
        });
    }
  } catch (error) {
    console.error("Error initializing App Check:", error);
  }
  // Auth (anonymous)
  try {
    auth = getAuth(app);
  } catch (e) {
    console.error("[Leaderboard] getAuth failed:", e);
  }
  // Functions
  try {
    functions = getFunctions(app);
    // If developing locally, connect to the Functions emulator
    if (import.meta.env.DEV) {
      try {
        // Dynamically import to avoid bundling emulator helpers in prod
        import("firebase/functions")
          .then((mod) => {
            if (mod && (mod as any).connectFunctionsEmulator) {
              (mod as any).connectFunctionsEmulator(
                functions,
                "localhost",
                5001
              );
            }
          })
          .catch(() => {});
      } catch {}
    }
  } catch {}
  return { app, db };
};

// Ensure anonymous sign-in and return UID
const ensureAnonAuth = async (): Promise<string | null> => {
  ensureInit();
  if (!auth) {
    console.error("[Leaderboard] ensureAnonAuth: auth instance is null");
    return null;
  }
  if (auth.currentUser) return auth.currentUser.uid;
  try {
    console.log("[Leaderboard] Attempting signInAnonymously...");
    const res = await signInAnonymously(auth);
    console.log("[Leaderboard] signInAnonymously success, uid:", res.user.uid);
    return res.user.uid;
  } catch (e: any) {
    console.error("[Leaderboard] signInAnonymously failed:", e.code, e.message);
    return await new Promise<string | null>((resolve) => {
      const unsub = onAuthStateChanged(auth!, (u) => {
        unsub();
        console.log("[Leaderboard] onAuthStateChanged:", u?.uid);
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

const getAppCheckToken = async (): Promise<string | null> => {
  if (!appCheck) {
    // App Check might not be initialized if Firebase is not configured
    return null;
  }
  try {
    const appCheckToken = await getToken(appCheck, /* forceRefresh= */ false);
    return appCheckToken.token;
  } catch (err) {
    console.error("Unable to retrieve App Check token:", err);
    return null;
  }
};

// Submit game to a callable backend (read-only FE)
export type SubmitGameInput = {
  name: string;
  difficulty: Difficulty;
  userScore: number;
  playedSeconds?: number;
  seed: number;
  moves: any[];
  locale?: string;
};

export const submitGame = async (payload: SubmitGameInput) => {
  const uid = await ensureAnonAuth();
  const appCheckToken = await getAppCheckToken();

  try {
    const apiUrl = import.meta.env.VITE_API_URL || "";
    const url = `${apiUrl}/api/submitGame`;

    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (appCheckToken) {
      headers["X-Firebase-AppCheck"] = appCheckToken;
    }

    if (!uid) {
      return { ok: false, reason: "no-auth" } as any;
    }

    const resp = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        uid,
        name: payload.name?.slice(0, 24) || "Player",
        difficulty: payload.difficulty,
        score: Number(payload.userScore) || 0,
        playedSeconds: payload.playedSeconds ?? null,
        seed: payload.seed,
        moves: payload.moves,
        locale: payload.locale,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      console.error("submitGame HTTP error", resp.status, text, url);
      return { ok: false as const, reason: "call-failed" } as any;
    }

    const data = await resp.json();
    setLastSubmitAt(Date.now());
    return data.ok
      ? { ok: true as const }
      : { ok: false as const, reason: "call-failed" };
  } catch (e) {
    console.error("submitGame call error", e);
    return { ok: false as const, reason: "call-failed", error: e };
  }
};

// Request a server-issued seed bound to current uid
export const startGame = async (): Promise<
  { seed: number } | { ok: false; reason: string }
> => {
  ensureInit();
  const uid = await ensureAnonAuth();
  const appCheckToken = await getAppCheckToken();
  try {
    const apiUrl = import.meta.env.VITE_API_URL || "";
    const url = `${apiUrl}/api/startGame`;

    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (appCheckToken) {
      headers["X-Firebase-AppCheck"] = appCheckToken;
    }

    if (!uid) {
      return { ok: false, reason: "no-auth" } as any;
    }

    const resp = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ uid }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      console.error("startGame HTTP error", resp.status, text, url);
      return { ok: false as const, reason: "call-failed" } as any;
    }

    const data = await resp.json();
    if (typeof data?.seed === "number") return { seed: data.seed } as any;
    return { ok: false as const, reason: "bad-response" } as any;
  } catch (e) {
    console.error("startGame call error", e);
    return { ok: false as const, reason: "call-failed" } as any;
  }
};

export const verifySeed = async (
  seed: number
): Promise<{ valid: boolean; reason?: string }> => {
  ensureInit();
  const uid = await ensureAnonAuth();
  const appCheckToken = await getAppCheckToken();

  if (!uid || typeof seed !== "number") {
    return { valid: false, reason: "missing-params" };
  }

  try {
    const apiUrl = import.meta.env.VITE_API_URL || "";
    const url = `${apiUrl}/api/verifySeed`;

    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (appCheckToken) {
      headers["X-Firebase-AppCheck"] = appCheckToken;
    }

    const resp = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ uid, seed }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      console.error("verifySeed HTTP error", resp.status, text, url);
      return { valid: false, reason: "call-failed" };
    }

    const data = await resp.json();
    return { valid: !!data?.valid, reason: data?.reason };
  } catch (e) {
    console.error("verifySeed call error", e);
    return { valid: false, reason: "call-error" };
  }
};

export const getTopScores = async (difficulty?: Difficulty, limit = 5) => {
  const appCheckToken = await getAppCheckToken();
  try {
    const apiUrl = import.meta.env.VITE_API_URL || "";
    const params = new URLSearchParams();
    if (difficulty) params.append("difficulty", difficulty);
    params.append("limit", String(limit));

    const url = `${apiUrl}/api/leaderboard?${params}`;

    const headers: HeadersInit = {};
    if (appCheckToken) {
      headers["X-Firebase-AppCheck"] = appCheckToken;
    }

    const resp = await fetch(url, { headers });

    if (!resp.ok) {
      console.error("getTopScores HTTP error", resp.status);
      return readCachedTopScores(difficulty) || [];
    }

    const rows = await resp.json();
    cacheTopScores(difficulty, rows);
    return rows;
  } catch (e) {
    console.error("getTopScores call error", e);
    return readCachedTopScores(difficulty) || [];
  }
};

// Local cache for leaderboard (used when API is unreachable)
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
