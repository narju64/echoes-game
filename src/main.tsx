import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import * as Sentry from "@sentry/react";

// Initialize Sentry as early as possible
Sentry.init({
  dsn: "https://04c1b2854259ab72d09790e12f72af1f@o4509638989971456.ingest.us.sentry.io/4509639068483584",
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
  // Enable performance monitoring
  tracesSampleRate: 1.0,
  // Enable session replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

// Test Sentry initialization
console.log('Sentry initialized successfully');

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
import ReplaysPage from './pages/ReplaysPage';

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
  {
    path: '/replays',
    element: <ReplaysPage />,
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<div>An error has occurred</div>}>
      <RouterProvider router={router} />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);
