const ENCOUNTER_RISE_PROFILES: Record<string, readonly number[]> = {
  town: [6, 20, 34, 16, 30, 12],
  ruin: [10, 28, 46, 24, 42, 26],
  nature: [14, 38, 24, 52, 34, 58],
  anomaly: [18, 44, 28, 60, 38, 66]
};

function normalizedIndex(index: number, length: number): number {
  return ((index % length) + length) % length;
}

export function encounterRiseProfile(nodeType: string): readonly number[] {
  return ENCOUNTER_RISE_PROFILES[nodeType] ?? ENCOUNTER_RISE_PROFILES.town;
}

export function encounterRiseAt(nodeType: string, index: number): number {
  const profile = encounterRiseProfile(nodeType);
  return profile[normalizedIndex(index, profile.length)] ?? 0;
}
