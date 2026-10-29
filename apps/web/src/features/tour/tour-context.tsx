import { createContext, useContext } from 'react';
import type { TourId } from '@arweqah-platform/shared';

export interface TourControls {
  /** The account menu must stay open: the step points at one of its items. */
  accountMenuForced: boolean;
  /** The sidebar link (a route) the current step points at: the menu that holds it stays open. */
  navForced: string | null;
  /** Plays a tour from its first step (the «restart» button; the first sign-in does it by itself). */
  restart: (tour: TourId) => Promise<void>;
  /** The wording in the code for a step, in one language: what shows when an administrator has not changed it. */
  defaultText: (key: string, lang: 'ar' | 'en') => { title: string; body: string } | null;
}

const IDLE: TourControls = { accountMenuForced: false, navForced: null, restart: async () => undefined, defaultText: () => null };

export const TourContext = createContext<TourControls>(IDLE);

export const useTourControls = (): TourControls => useContext(TourContext);

export interface TourPlayer {
  index: number;
  total: number;
  next: () => void;
  back: () => void;
  skip: () => void;
}

export const PlayerContext = createContext<TourPlayer | null>(null);
export const useTourPlayer = (): TourPlayer | null => useContext(PlayerContext);
