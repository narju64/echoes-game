import { jsx as _jsx } from "react/jsx-runtime";
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
        element: _jsx(IntroScreen, {}),
    },
    {
        path: '/home',
        element: _jsx(HomePage, {}),
    },
    {
        path: '/game',
        element: _jsx(GamePage, {}),
    },
    {
        path: '/rules',
        element: _jsx(RulesPage, {}),
    },
]);
ReactDOM.createRoot(document.getElementById('root')).render(_jsx(React.StrictMode, { children: _jsx(RouterProvider, { router: router }) }));
