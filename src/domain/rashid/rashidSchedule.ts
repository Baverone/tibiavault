import { RASHID_WEEKLY_SCHEDULE, type RashidLocation } from '../../data/rashid/schedule.ts';
import { computeTibiaDayBoundary } from '../tibiaDay.ts';

export interface RashidState {
  /** 0 = Sunday ... 6 = Saturday, matching RASHID_WEEKLY_SCHEDULE's indexing. */
  tibiaDayIndex: number;
  location: RashidLocation;
  /** Epoch ms of the next 09:00 Lisbon server save, when Rashid moves on. */
  nextChangeAt: number;
}

export function computeRashidState(now: number): RashidState {
  const { weekdayIndex, nextChangeAt } = computeTibiaDayBoundary(now);
  return { tibiaDayIndex: weekdayIndex, location: RASHID_WEEKLY_SCHEDULE[weekdayIndex], nextChangeAt };
}
