// Simple deterministic PRNG utilities (xorshift32-based)
// State is a 32-bit unsigned integer. Use next() to advance and get a float in [0,1).

const FNV1A_OFFSET_BASIS = 2166136261;
const FNV1A_PRIME = 16777619;

const SHIFT_FOR_LOW_BIT_DIFFUSION = 13;
const SHIFT_FOR_HIGH_BIT_DIFFUSION = 17;
const SHIFT_FOR_FINAL_MIX = 5;

const UINT32_RANGE = 2 ** 32;

export type RngState = number; // 0 < state < 2^32

export const clampUint32 = (x: number): number => x >>> 0;

export const seedFromString = (s: string): RngState => {
  let h = FNV1A_OFFSET_BASIS >>> 0; // FNV-1a
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, FNV1A_PRIME);
  }
  return clampUint32(h || 1);
};

export const randomSeed = (): RngState => {
  if (typeof crypto !== "undefined" && (crypto as any).getRandomValues) {
    const arr = new Uint32Array(1);
    (crypto as any).getRandomValues(arr);
    const v = arr[0] >>> 0;
    return v === 0 ? 1 : v;
  }
  const v = Math.floor(Math.random() * 0xffffffff) >>> 0;
  return v === 0 ? 1 : v;
};

// xorshift32 step
export const xorshift32 = (state: RngState): RngState => {
  let x = state >>> 0;
  x ^= x << SHIFT_FOR_LOW_BIT_DIFFUSION;
  x ^= x >>> SHIFT_FOR_HIGH_BIT_DIFFUSION;
  x ^= x << SHIFT_FOR_FINAL_MIX;
  return x >>> 0;
};

export const nextFloat = (
  state: RngState
): { state: RngState; value: number } => {
  const next = xorshift32(state);
  // Map to [0,1)
  const value = (next >>> 0) / UINT32_RANGE; // 2^32
  return { state: next === 0 ? 1 : next, value };
};

export const nextInt = (
  state: RngState,
  maxExclusive: number
): { state: RngState; value: number } => {
  const { state: s, value } = nextFloat(state);
  return { state: s, value: Math.floor(value * maxExclusive) };
};
