import React from 'react';
import { Link } from 'react-router-dom';

const RulesPage: React.FC = () => {
  return (
    <div style={{ padding: '2rem', color: 'white', backgroundColor: '#1a1a1a', height: '100vh' }}>
      <h1>Game Rules</h1>
      <p>The complete ruleset will be displayed here.</p>
      <Link to="/" style={{ color: '#61dafbaa' }}>Back to Home</Link>
    </div>
  );
};

export default RulesPage; 