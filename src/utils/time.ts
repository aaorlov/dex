import {
  MILLIS_PER_SECOND,
  SECONDS_PER_DAY,
  SECONDS_PER_HOUR,
  SECONDS_PER_MINUTE,
} from "../constants/index.ts";

const UNKNOWN = "unknown";
const EXPIRED = "expired";

export function timeLeft(
  expiresAt: string | undefined,
  now: Date = new Date(),
): string {
  if (!expiresAt) return UNKNOWN;
  const expiry = new Date(expiresAt);
  if (Number.isNaN(expiry.getTime())) return UNKNOWN;
  const remainingSeconds = Math.floor(
    (expiry.getTime() - now.getTime()) / MILLIS_PER_SECOND,
  );
  if (remainingSeconds <= 0) return EXPIRED;
  return formatRemaining(remainingSeconds);
}

function formatRemaining(seconds: number): string {
  if (seconds >= SECONDS_PER_DAY) {
    return `${Math.floor(seconds / SECONDS_PER_DAY)}d`;
  }
  if (seconds >= SECONDS_PER_HOUR) {
    return `${Math.floor(seconds / SECONDS_PER_HOUR)}h`;
  }
  if (seconds >= SECONDS_PER_MINUTE) {
    return `${Math.floor(seconds / SECONDS_PER_MINUTE)}m`;
  }
  return `${seconds}s`;
}
