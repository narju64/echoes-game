import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import HomePage from './pages/HomePage.tsx';
import GamePage from './pages/GamePage.tsx';
import RulesPage from './pages/RulesPage.tsx';
import IntroScreen from './pages/IntroScreen';
import AITrainingPage from './pages/AITrainingPage';
import AITournamentPage from './pages/AITournamentPage';
import LeaderboardPage from './pages/LeaderboardPage';
import HostPage from './pages/HostPage';
import JoinPage from './pages/JoinPage';
import LobbyPage from './pages/LobbyPage';

import './index.css';

const router = createBrowserRouter([
  {
    path: '/',
    element: <IntroScreen />,
  },
  {
    path: '/home',
    element: <HomePage />,
  },
  {
    path: '/game',
    element: <GamePage />,
  },
  {
    path: '/rules',
    element: <RulesPage />,
  },
  {
    path: '/ai-training',
    element: <AITrainingPage />,
  },
  {
    path: '/ai-tournament',
    element: <AITournamentPage />,
  },
  {
    path: '/leaderboard',
    element: <LeaderboardPage />,
  },
  {
    path: '/host',
    element: <HostPage />,
  },
  {
    path: '/join',
    element: <JoinPage />,
  },
  {
    path: '/lobby',
    element: <LobbyPage />,
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
