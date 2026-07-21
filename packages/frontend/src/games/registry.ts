import type { ComponentType } from 'react';
import { TicTacToe } from './tic-tac-toe/TicTacToe';
import { TicTacToeIcon } from './tic-tac-toe/TicTacToeIcon';

export interface GameDefinition {
  slug: string;
  name: string;
  description: string;
  icon: ComponentType;
  component: ComponentType;
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
