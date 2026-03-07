export interface SeededRng {
  next(): number;
  nextInt(maxExclusive: number): number;
  nextRange(minInclusive: number, maxExclusive: number): number;
}

const UINT32_MAX_PLUS_ONE = 0x100000000;

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function createSeededRng(seed: string): SeededRng {
  let state = hashSeed(seed) || 1;

  return {
    next(): number {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return (state >>> 0) / UINT32_MAX_PLUS_ONE;
    },
    nextInt(maxExclusive: number): number {
      if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
        throw new Error('maxExclusive must be a positive integer');
      }
      return Math.floor(this.next() * maxExclusive);
    },
    nextRange(minInclusive: number, maxExclusive: number): number {
      if (maxExclusive <= minInclusive) {
        throw new Error('maxExclusive must be greater than minInclusive');
      }
      return minInclusive + this.next() * (maxExclusive - minInclusive);
    }
  };
}
