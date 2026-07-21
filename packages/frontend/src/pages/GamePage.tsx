import { useParams } from 'react-router-dom';
import { getGame } from '../games/registry';

export function GamePage() {
  const { slug } = useParams<{ slug: string }>();
  const game = slug ? getGame(slug) : undefined;

  if (!game) {
    return <p>Unknown game.</p>;
  }

  const GameComponent = game.component;
  return (
    <div>
      <h1>{game.name}</h1>
      <GameComponent />
    </div>
  );
}
