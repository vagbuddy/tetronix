// Simple device id helper: generates/stores a UUID v4 in localStorage.
// This provides a stable identifier per browser/profile (not cross-device).
const KEY = "tetronix:deviceId";

const generateUuidV4 = () => {
  // RFC4122 version 4 compliant UUID generator (simple, no deps)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 0xf) >> 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const getDeviceId = (): string | null => {
  try {
    if (typeof window === "undefined") return null;
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = generateUuidV4();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return null;
  }
};

export const clearDeviceId = () => {
  try {
    if (typeof window === "undefined") return;
    localStorage.removeItem(KEY);
  } catch {}
};

export default getDeviceId;
