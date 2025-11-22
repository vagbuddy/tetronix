/**
 * Small TypeScript wrapper that dynamically imports the untyped
 * `leaderboardService.js` (JS) and invokes its exported `processGames`.
 *
 * We intentionally keep the dynamic import inside this wrapper and cast to
 * `any` so the rest of the TypeScript code can call a typed function
 * `triggerProcessGames()` without compiler complaints.
 */
export async function triggerProcessGames(): Promise<void> {
  try {
    // The imported module is plain JS; suppress TS module-not-found warnings
    // for the dynamic import site.
    // @ts-ignore
    const svc: any = await import("./leaderboardService.js");
    if (svc && typeof svc.processGames === "function") {
      await svc.processGames();
    }
  } catch (err) {
    console.error("triggerProcessGames error:", err);
    throw err;
  }
}
