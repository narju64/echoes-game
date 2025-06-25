import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import HomePage from './pages/HomePage.tsx';
import GamePage from './pages/GamePage.tsx';
import RulesPage from './pages/RulesPage.tsx';
import IntroScreen from './pages/IntroScreen';

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
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
