import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Duration utilities

/** Convert hours, minutes, seconds to total seconds */
export function timeToSeconds(hours: number, minutes: number, seconds: number): number {
  return hours * 3600 + minutes * 60 + seconds;
}

/** Convert total seconds to { hours, minutes, seconds } */
export function secondsToTime(totalSeconds: number): { hours: number; minutes: number; seconds: number } {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { hours, minutes, seconds };
}

/** Format seconds as "Xh Ym Zs" (compact) */
export function formatDuration(totalSeconds: number): string {
  const { hours, minutes, seconds } = secondsToTime(totalSeconds);
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
  return parts.join(' ');
}

/** Format seconds as "HH:MM:SS" */
export function formatDurationHHMMSS(totalSeconds: number): string {
  const { hours, minutes, seconds } = secondsToTime(totalSeconds);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Episode status types and utilities

export type EpisodeStatus = "DRAFT" | "UPCOMING" | "LIVE" | "ENDED";

export interface EpisodeForStatus {
  isActive?: boolean;
  is_active?: boolean;
  activeFromDateTime?: string | null;
  active_from_datetime?: string | null;
  activeUntilDateTime?: string | null;
  active_until_datetime?: string | null;
  durationSeconds?: number | null;
  episode_duration_seconds?: number | null;
}

/** Get the status of an episode based on current time */
export function getEpisodeStatus(episode: EpisodeForStatus, now: Date): EpisodeStatus {
  const isActive = episode.isActive ?? episode.is_active ?? false;
  const activeFromDateTime = episode.activeFromDateTime ?? episode.active_from_datetime;
  const activeUntilDateTime = episode.activeUntilDateTime ?? episode.active_until_datetime;
  const durationSeconds = episode.durationSeconds ?? episode.episode_duration_seconds ?? 3600;

  const startTime = activeFromDateTime ? new Date(activeFromDateTime) : null;
  
  let endTime: Date | null = null;
  if (activeUntilDateTime) {
    endTime = new Date(activeUntilDateTime);
  } else if (startTime) {
    endTime = new Date(startTime.getTime() + durationSeconds * 1000);
  }

  // UPCOMING: scheduled for the future
  if (!isActive && startTime && startTime > now) {
    return "UPCOMING";
  }
  
  // LIVE or ENDED: start time has passed or manually active
  if (isActive || (startTime && startTime <= now)) {
    if (!endTime || now < endTime) {
      return "LIVE";
    }
    return "ENDED";
  }
  
  // No schedule set
  return "DRAFT";
}
