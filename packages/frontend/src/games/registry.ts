import type { ComponentType } from 'react';
import { TicTacToe } from './tic-tac-toe/TicTacToe';
import { TicTacToeIcon } from './tic-tac-toe/TicTacToeIcon';
import { DefenderIcon, FroggerIcon, GalagaIcon, SpaceInvadersIcon } from './upcoming/icons';

export interface GameDefinition {
  slug: string;
  name: string;
  description: string;
  icon: ComponentType;
  component: ComponentType;
}

export interface UpcomingGame {
  slug: string;
  name: string;
  description: string;
  icon: ComponentType;
}

/**
 * Every playable game is registered here by slug. Adding a new game means
 * building its component (and a small icon for the home page tile) and
 * adding one entry — nothing else in the shell needs to change. See
 * doc/adding-a-game.md.
 */
export const games: GameDefinition[] = [
  {
    slug: 'tic-tac-toe',
    name: 'Tic-Tac-Toe',
    description: 'Classic 3x3. Play the computer on three difficulties, or pass-and-play locally.',
    icon: TicTacToeIcon,
    component: TicTacToe,
  },
];

export function getGame(slug: string): GameDefinition | undefined {
  return games.find((g) => g.slug === slug);
}

/**
 * On the roadmap but not playable yet — tracked as GitHub issues, shown on
 * the home page as "coming soon" tiles with no route/component of their
 * own. Move an entry up into `games` once it's actually built.
 */
export const upcomingGames: UpcomingGame[] = [
  {
    slug: 'frogger',
    name: 'Frogger',
    description: 'Hop across traffic and a river without becoming roadkill.',
    icon: FroggerIcon,
  },
  {
    slug: 'space-invaders',
    name: 'Space Invaders',
    description: 'Hold the line against a descending alien grid.',
    icon: SpaceInvadersIcon,
  },
  {
    slug: 'galaga',
    name: 'Galaga',
    description: 'Diving formations, one bug at a time.',
    icon: GalagaIcon,
  },
  {
    slug: 'defender',
    name: 'Defender',
    description: 'Protect the ground. Watch the radar.',
    icon: DefenderIcon,
  },
];
