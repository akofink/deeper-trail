export function logStep(message: string): void;
export function withStepTimeout<T>(step: string, operation: () => Promise<T>, timeoutMs?: number): Promise<T>;
export function resolveExecutablePath(
  explicitPath?: string,
  managedPath?: string,
  fallbackCandidates?: string[]
): string | undefined;
export function resolveExecutablePathCandidates(
  explicitPath?: string,
  managedPath?: string,
  fallbackCandidates?: string[]
): string[];
