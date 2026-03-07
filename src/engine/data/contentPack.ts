export interface ContentPack {
  id: string;
  version: string;
  items: string[];
  modules: string[];
  hazards: string[];
  puzzles: string[];
  encounters: string[];
}

export function validateContentPack(pack: ContentPack): void {
  if (!pack.id.trim()) {
    throw new Error('Content pack ID is required');
  }

  if (!pack.version.trim()) {
    throw new Error('Content pack version is required');
  }
}
