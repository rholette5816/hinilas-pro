const lastRun: Record<string, number> = {};

export function acquireCronLock(key: string, minIntervalMs = 60_000): boolean {
  const now = Date.now();
  if (lastRun[key] && now - lastRun[key] < minIntervalMs) return false;
  lastRun[key] = now;
  return true;
}
