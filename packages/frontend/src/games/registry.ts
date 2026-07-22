import type { ComponentType } from 'react';
import { Frogger } from './frogger/Frogger';
import { FroggerIcon } from './frogger/FroggerIcon';
import { Galaga } from './galaga/Galaga';
import { GalagaIcon } from './galaga/GalagaIcon';
import { SpaceInvaders } from './space-invaders/SpaceInvaders';
import { SpaceInvadersIcon } from './space-invaders/SpaceInvadersIcon';
import { TicTacToe } from './tic-tac-toe/TicTacToe';
import { TicTacToeIcon } from './tic-tac-toe/TicTacToeIcon';
import { AsteroidsIcon, DefenderIcon } from './upcoming/icons';

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
  {
    slug: 'space-invaders',
    name: 'Space Invaders',
    description: 'Hold the line against a descending alien grid. Classic rules, with sound.',
    icon: SpaceInvadersIcon,
    component: SpaceInvaders,
  },
  {
    slug: 'galaga',
    name: 'Galaga',
    description: 'Formations fly in, peel off, and dive-bomb you. Shoot them before they shoot back.',
    icon: GalagaIcon,
    component: Galaga,
  },
  {
    slug: 'frogger',
    name: 'Frogger',
    description: 'Hop across traffic and a river without becoming roadkill.',
    icon: FroggerIcon,
    component: Frogger,
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
    slug: 'defender',
    name: 'Defender',
    description: 'Protect the ground. Watch the radar.',
    icon: DefenderIcon,
  },
  {
    slug: 'asteroids',
    name: 'Asteroids',
    description: 'Blast rocks, dodge debris, watch your momentum.',
    icon: AsteroidsIcon,
  },
];
