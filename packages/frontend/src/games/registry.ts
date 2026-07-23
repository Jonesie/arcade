import type { ComponentType } from 'react';
import { Asteroids } from './asteroids/Asteroids';
import { AsteroidsDemo } from './asteroids/AsteroidsDemo';
import { AsteroidsIcon } from './asteroids/AsteroidsIcon';
import { Defender } from './defender/Defender';
import { DefenderDemo } from './defender/DefenderDemo';
import { DefenderIcon } from './defender/DefenderIcon';
import { DonkeyKong } from './donkey-kong/DonkeyKong';
import { DonkeyKongDemo } from './donkey-kong/DonkeyKongDemo';
import { DonkeyKongIcon } from './donkey-kong/DonkeyKongIcon';
import { Frogger } from './frogger/Frogger';
import { FroggerDemo } from './frogger/FroggerDemo';
import { FroggerIcon } from './frogger/FroggerIcon';
import { Galaga } from './galaga/Galaga';
import { GalagaDemo } from './galaga/GalagaDemo';
import { GalagaIcon } from './galaga/GalagaIcon';
import { SpaceInvaders } from './space-invaders/SpaceInvaders';
import { SpaceInvadersDemo } from './space-invaders/SpaceInvadersDemo';
import { SpaceInvadersIcon } from './space-invaders/SpaceInvadersIcon';
import { TicTacToe } from './tic-tac-toe/TicTacToe';
import { TicTacToeDemo } from './tic-tac-toe/TicTacToeDemo';
import { TicTacToeIcon } from './tic-tac-toe/TicTacToeIcon';
import { StarWarsIcon } from './upcoming/icons';

export interface GameDefinition {
  slug: string;
  name: string;
  description: string;
  icon: ComponentType;
  component: ComponentType;
  /** Non-interactive attract-mode clip shown on the home page after a
   * period of idle time (see components/AttractMode.tsx, GitHub issue #5).
   * Self-play/bot-driven rather than a video file — see each game's own
   * *Demo.tsx for why. */
  demo: ComponentType;
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
    demo: TicTacToeDemo,
  },
  {
    slug: 'space-invaders',
    name: 'Space Invaders',
    description: 'Hold the line against a descending alien grid. Classic rules, with sound.',
    icon: SpaceInvadersIcon,
    component: SpaceInvaders,
    demo: SpaceInvadersDemo,
  },
  {
    slug: 'galaga',
    name: 'Galaga',
    description: 'Formations fly in, peel off, and dive-bomb you. Shoot them before they shoot back.',
    icon: GalagaIcon,
    component: Galaga,
    demo: GalagaDemo,
  },
  {
    slug: 'frogger',
    name: 'Frogger',
    description: 'Hop across traffic and a river without becoming roadkill.',
    icon: FroggerIcon,
    component: Frogger,
    demo: FroggerDemo,
  },
  {
    slug: 'asteroids',
    name: 'Asteroids',
    description: 'Blast rocks, dodge debris, watch your momentum.',
    icon: AsteroidsIcon,
    component: Asteroids,
    demo: AsteroidsDemo,
  },
  {
    slug: 'defender',
    name: 'Defender',
    description: 'Fly a wraparound world, shoot down abductors, and rescue the humanoids they grab.',
    icon: DefenderIcon,
    component: Defender,
    demo: DefenderDemo,
  },
  {
    slug: 'donkey-kong',
    name: 'Donkey Kong',
    description: 'Climb girders and ladders to the top, dodging barrels rolling down from above.',
    icon: DonkeyKongIcon,
    component: DonkeyKong,
    demo: DonkeyKongDemo,
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
    slug: 'star-wars',
    name: 'Star Wars',
    description: 'Vector-graphics dogfight through space, then a high-speed trench run finale.',
    icon: StarWarsIcon,
  },
];
