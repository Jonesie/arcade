import type { ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { Cabinet } from './components/Cabinet';
import { NavBar } from './components/NavBar';
import { GamePage } from './pages/GamePage';
import { HomePage } from './pages/HomePage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

function RequireAuth({ children }: { children: ReactElement }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Cabinet>
      <NavBar />
      <main className="page">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route
            path="/games/:slug"
            element={
              <RequireAuth>
                <GamePage />
              </RequireAuth>
            }
          />
        </Routes>
      </main>
    </Cabinet>
  );
}
