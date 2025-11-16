import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import { generateSeedForUser } from "./utils/prng.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

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
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Middleware to verify Firebase App Check token
const appCheckVerification = async (
  req: Request,
  res: Response,
  next: () => void
) => {
  const appCheckToken = req.header("X-Firebase-AppCheck");

  // If running in a development environment, you might want to bypass this check.
  // IMPORTANT: Ensure this is not active in production.
  /*
  if (process.env.NODE_ENV !== "production") {
    console.log("Skipping App Check in development.");
    return next();
  }
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

    // Generate a new seed
    const seed = generateSeedForUser(uid);

    // Store in Firestore seeds collection
    await db.collection("seeds").doc(`${uid}_${seed}`).set({
      uid,
      seed,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      used: false,
    });

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
    const { uid, seed, score, difficulty, name, playedSeconds, moves } =
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

    // Use Firestore transaction to ensure atomicity
    await db.runTransaction(async (transaction) => {
      // Mark seed as used
      transaction.update(db.collection("seeds").doc(seedDocId), {
        used: true,
        usedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Store game in leaderboard (matching your existing Firestore structure)
      transaction.set(db.collection("leaderboard").doc(seedDocId), {
        uid,
        seed,
        name: (name || "Player").slice(0, 24),
        difficulty: difficulty || "casual",
        score,
        playedSeconds: playedSeconds ?? null,
        moves: moves || [],
        createdAt: Date.now(),
        locale: req.headers["accept-language"]?.split(",")[0] || null,
      });
    });

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
  const buildPath = path.join(__dirname, "../build");
  app.use(express.static(buildPath));

  // All non-API routes serve the React app
  app.get("*", (_req: Request, res: Response) => {
    res.sendFile(path.join(buildPath, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Tetronix API Server running on port ${PORT}`);
  console.log(`Using Firestore for data storage`);
});
