import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import { generateSeedForUser } from "./utils/prng.js";
import { triggerProcessGames } from "./leaderboardServiceWrapper.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const DEBUG_LOGS =
  process.env.DEBUG_LOGS === "1" || process.env.DEBUG_LOGS === "true";
const DEBUG_SEEDS =
  process.env.DEBUG_SEEDS === "1" || process.env.DEBUG_SEEDS === "true";

// Lightweight request id generator
const genReqId = () => Math.random().toString(36).slice(2, 10);

// Initialize Firebase Admin
let db: admin.firestore.Firestore;

try {
  // In production (Render), use environment variables for service account
  if (process.env.FIREBASE_PROJECT_ID) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  } else {
    // In development, use default credentials or emulator
    admin.initializeApp();
  }
  db = admin.firestore();
  console.log("Firebase Admin initialized");
} catch (error) {
  console.error("Failed to initialize Firebase Admin:", error);
  process.exit(1);
}

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Allow inline scripts for React
  })
);
// Explicit CORS options to ensure custom headers (like X-Firebase-AppCheck)
// are allowed in preflight responses. This prevents browsers from silently
// omitting the header on cross-origin requests when the server does not
// advertise it.
const corsOptions = {
  origin: true,
  credentials: true,
  allowedHeaders: [
    "Content-Type",
    "X-Firebase-AppCheck",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
};
app.use(cors(corsOptions));
// Respond to preflight requests with the same CORS policy
app.options("*", cors(corsOptions));
app.use(express.json());
// Attach a request id early
app.use((req, _res, next) => {
  (req as any).requestId =
    (req.headers["x-request-id"] as string) || genReqId();
  next();
});

// Morgan logging with extra context in debug
morgan.token("id", (req) => ((req as any).requestId as string) || "-");
morgan.token(
  "user",
  (req: any) =>
    req?.body?.uid ||
    req?.query?.uid ||
    (req.get && req.get("x-user-id")) ||
    "-"
);
const devFormat = DEBUG_LOGS
  ? ':date[iso] id=:id :method :url :status :res[content-length] - :response-time ms user=:user ip=:remote-addr ua=":user-agent"'
  : "dev";
app.use(morgan(devFormat));

// Middleware to verify Firebase App Check token
const appCheckVerification = async (
  req: Request,
  res: Response,
  next: () => void
) => {
  // Always allow CORS preflight requests to pass through
  if (req.method === "OPTIONS") {
    return next();
  }

  // Allow disabling App Check verification in non-production for local dev
  // Set APP_CHECK_ENFORCE=true in the environment to force verification
  const enforceAppCheck =
    process.env.APP_CHECK_ENFORCE === "true" ||
    process.env.NODE_ENV === "production";
  if (!enforceAppCheck) {
    return next();
  }

  const appCheckToken = req.header("X-Firebase-AppCheck");

  // Log presence/absence of the App Check header for debugging (masked).
  if (DEBUG_LOGS) {
    const tokenPresent = !!appCheckToken;
    const mask = (t?: string | null) => {
      if (!t) return null;
      if (t.length <= 8) return "****";
      return `${t.slice(0, 4)}...${t.slice(-4)}`;
    };
    try {
      console.log(
        JSON.stringify({
          ts: new Date().toISOString(),
          reqId: (req as any).requestId,
          route: req.path,
          method: req.method,
          appCheckHeader: tokenPresent,
          tokenMasked: mask(appCheckToken),
        })
      );
    } catch (e) {
      // best-effort logging
      console.error("App Check debug log failed:", e);
    }
  }

  // If running in a development environment, you might want to bypass this check.
  // IMPORTANT: Ensure this is not active in production.
  /*
   * Note: Dev bypass is controlled by APP_CHECK_ENFORCE and NODE_ENV above.
   */

  if (!appCheckToken) {
    return res
      .status(401)
      .json({ error: "Unauthorized: Missing App Check token." });
  }

  try {
    await admin.appCheck().verifyToken(appCheckToken);
    return next();
  } catch (err) {
    return res
      .status(401)
      .json({ error: "Unauthorized: Invalid App Check token." });
  }
};

// Apply App Check verification to all API routes
app.use("/api", appCheckVerification);

// Health check
app.get("/health", async (_req: Request, res: Response) => {
  try {
    // Simple connectivity check - just verify db is initialized
    if (db) {
      res.json({ status: "ok", timestamp: new Date().toISOString() });
    } else {
      res
        .status(503)
        .json({ status: "error", message: "Firestore not initialized" });
    }
  } catch (error) {
    res.status(503).json({ status: "error", message: "Firestore unavailable" });
  }
});

// Start game - request a new seed
app.post("/api/startGame", async (req: Request, res: Response) => {
  try {
    const { uid } = req.body;
    if (!uid || typeof uid !== "string") {
      return res
        .status(400)
        .json({ error: "uid is required and must be a string" });
    }
    // Generate a new seed. Default to normal generator; DEBUG_SEEDS may override.
    let seed = generateSeedForUser(uid);
    // DEBUG_SEEDS: when enabled, issue easy-to-inspect seeds for debugging
    // e.g. 111111111, 222222222, ... 999999999 in sequence (stored in Firestore)
    if (DEBUG_SEEDS) {
      const counterDoc = db.collection("_debug").doc("seedCounter");
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(counterDoc);
        let next = 1;
        if (snap.exists && typeof snap.data()?.nextDigit === "number") {
          next = snap.data()!.nextDigit as number;
        }
        // compute seed as repeated digit (9 digits)
        const seedStr = String(next).repeat(9);
        seed = parseInt(seedStr, 10);
        // increment and wrap 1..9
        const updated = (next % 9) + 1;
        tx.set(counterDoc, { nextDigit: updated }, { merge: true });
      });
    }
    // Store in Firestore seeds collection
    await db.collection("seeds").doc(`${uid}_${seed}`).set({
      uid,
      seed,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      used: false,
    });
    if (DEBUG_LOGS) {
      console.log(
        JSON.stringify({
          ts: new Date().toISOString(),
          reqId: (req as any).requestId,
          route: "startGame",
          action: "seed_created",
          uid,
          seed,
          docId: `${uid}_${seed}`,
        })
      );
    }
    // Trigger leaderboard recalculation in background (non-blocking).
    try {
      if (DEBUG_LOGS)
        console.log("Triggering leaderboardService.processGames()");
      triggerProcessGames()
        .then(() => {
          if (DEBUG_LOGS)
            console.log("leaderboardService.processGames completed");
        })
        .catch((err: any) => {
          console.error("leaderboardService.processGames error:", err);
        });
    } catch (err) {
      if (DEBUG_LOGS) {
        console.error(
          "Failed to trigger leaderboardService in background:",
          err
        );
      }
    }
    // Log the returned seed (concise JSON) so it's easy to find in logs
    try {
      console.log(
        JSON.stringify({
          ts: new Date().toISOString(),
          reqId: (req as any).requestId,
          route: "startGame",
          action: "seed_returned",
          uid,
          seed,
          docId: `${uid}_${seed}`,
        })
      );
    } catch (e) {
      // best-effort logging; do not block response
    }

    res.json({ seed });
  } catch (error: any) {
    console.error("Error generating seed:", error);
    res
      .status(500)
      .json({ error: "Failed to generate seed", message: error.message });
  }
});

// Submit game result
app.post("/api/submitGame", async (req: Request, res: Response) => {
  try {
    const { uid, seed, score, difficulty, name, playedSeconds, moves, locale } =
      req.body;
    if (!uid || seed === undefined || score === undefined) {
      return res
        .status(400)
        .json({ error: "uid, seed, and score are required" });
    }
    const seedDocId = `${uid}_${seed}`;
    // Verify seed exists and hasn't been used
    const seedDoc = await db.collection("seeds").doc(seedDocId).get();
    if (!seedDoc.exists) {
      return res.status(400).json({
        ok: false,
        error: "Invalid seed",
        reason: "seed_not_found",
      });
    }
    if (seedDoc.data()?.used) {
      return res.status(400).json({
        ok: false,
        error: "Seed already used",
        reason: "seed_already_used",
      });
    }
    if (DEBUG_LOGS) {
      console.log(
        JSON.stringify({
          ts: new Date().toISOString(),
          reqId: (req as any).requestId,
          route: "submitGame",
          action: "storing_result",
          uid,
          seed,
          score,
          difficulty,
          name,
          playedSeconds,
          movesLength: Array.isArray(moves) ? moves.length : undefined,
        })
      );
    }
    // Use Firestore transaction to ensure atomicity
    await db.runTransaction(async (transaction) => {
      // Mark seed as used
      transaction.update(db.collection("seeds").doc(seedDocId), {
        used: true,
        usedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      // Store game in results (raw, unvalidated)
      transaction.set(db.collection("results").doc(seedDocId), {
        uid,
        seed,
        name: (name || "Player").slice(0, 24),
        difficulty: difficulty || "casual",
        score,
        playedSeconds: playedSeconds ?? null,
        moves: moves || [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        locale: locale || null,
      });
    });
    if (DEBUG_LOGS) {
      console.log(
        JSON.stringify({
          ts: new Date().toISOString(),
          reqId: (req as any).requestId,
          route: "submitGame",
          action: "result_stored",
          uid,
          seed,
          seedDocId,
          score,
          difficulty,
          name: (name || "Player").slice(0, 24),
        })
      );
    }
    res.json({ ok: true });
  } catch (error: any) {
    console.error("Error submitting game:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to submit game",
      message: error.message,
    });
  }
});

// Get leaderboard
app.get("/api/leaderboard", async (req: Request, res: Response) => {
  try {
    const { difficulty, limit = "10" } = req.query;
    const limitNum = Math.min(parseInt(limit as string) || 10, 100);

    let query = db
      .collection("leaderboard")
      .orderBy("score", "desc")
      .limit(limitNum);

    if (difficulty && typeof difficulty === "string") {
      query = db
        .collection("leaderboard")
        .where("difficulty", "==", difficulty)
        .orderBy("score", "desc")
        .limit(limitNum);
    }

    const snapshot = await query.get();
    const results = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        name: data.name,
        score: data.score,
        difficulty: data.difficulty,
        playedSeconds: data.playedSeconds,
        createdAt: data.createdAt,
        locale: data.locale,
      };
    });

    res.json(results);
  } catch (error: any) {
    console.error("Error fetching leaderboard:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch leaderboard", message: error.message });
  }
});

// Verify seed (check if seed belongs to user)
app.post("/api/verifySeed", async (req: Request, res: Response) => {
  try {
    const { uid, seed } = req.body;

    if (!uid || seed === undefined) {
      return res.status(400).json({ error: "uid and seed are required" });
    }

    const seedDoc = await db.collection("seeds").doc(`${uid}_${seed}`).get();

    if (!seedDoc.exists) {
      return res.json({ valid: false, reason: "seed_not_found" });
    }

    const data = seedDoc.data();
    if (data?.used) {
      return res.json({ valid: false, reason: "seed_already_used" });
    }

    res.json({ valid: true });
  } catch (error: any) {
    console.error("Error verifying seed:", error);
    res
      .status(500)
      .json({ error: "Failed to verify seed", message: error.message });
  }
});

// Serve static frontend files in production
if (process.env.NODE_ENV === "production") {
  // The frontend `build` may be copied to different locations depending on
  // how the project is built / where tsc emitted files. Try a set of
  // candidate locations and pick the first that exists.
  const buildCandidates = [
    path.join(__dirname, "../build"), // emitted when rootDir = api
    path.join(__dirname, "../../build"), // emitted when dist contains api/ nested
    path.join(process.cwd(), "build"), // runtime working dir build
  ];

  const buildPath =
    buildCandidates.find((p) => fs.existsSync(p)) || buildCandidates[0];
  app.use(express.static(buildPath));

  // All non-API routes serve the React app
  app.get("*", (_req: Request, res: Response) => {
    res.sendFile(path.join(buildPath, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Tetronix API Server running on port ${PORT}`);
  console.log(`Using Firestore for data storage`);
  if (DEBUG_LOGS) {
    console.log("Debug logging is ENABLED");
  }
});
