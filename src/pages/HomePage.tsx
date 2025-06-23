import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';

const HomePage: React.FC = () => {
  return (
    <div className="home-page">
      <h1>Echoes</h1>
      <div className="menu">
        <Link to="/game" className="menu-button">Single Player</Link>
        <Link to="/game" className="menu-button">Multiplayer</Link>
        <Link to="/rules" className="menu-button">Rules</Link>
        <Link to="/leaderboard" className="menu-button">Leaderboard</Link>
      </div>
    </div>
  );
};

export default HomePage; 