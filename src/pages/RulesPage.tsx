import React from 'react';
import { Link } from 'react-router-dom';

const RulesPage: React.FC = () => {
  return (
    <div style={{ 
      padding: '2rem', 
      color: 'white', 
      backgroundColor: '#1a1a1a', 
      minHeight: '100vh',
      fontFamily: 'Orbitron, monospace'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ 
          color: '#ff9800', 
          textShadow: '0 0 20px #ff9800',
          textAlign: 'center',
          marginBottom: '2rem'
        }}>
          Game Rules
        </h1>
        
        <div style={{ 
          background: '#222', 
          padding: '2rem', 
          borderRadius: '12px',
          border: '2px solid #333',
          marginBottom: '2rem'
        }}>
          <h2 style={{ color: '#4CAF50', marginBottom: '1rem' }}>Objective</h2>
          <p style={{ lineHeight: '1.6', marginBottom: '1rem' }}>
            Echoes is a tactical turn-based game where players control echoes on an 8x8 grid. 
            The goal is to either destroy all opponent echoes or reach 10 points.
          </p>
          
          <h2 style={{ color: '#2196F3', marginBottom: '1rem' }}>Gameplay</h2>
          <p style={{ lineHeight: '1.6', marginBottom: '1rem' }}>
            Each turn, players can either create a new echo (5 action points) or extend an existing echo (3 action points).
            Echoes can perform various actions like walking, dashing, firing projectiles, placing mines, and using shields.
          </p>
          
          <h2 style={{ color: '#FF9800', marginBottom: '1rem' }}>Actions</h2>
          <ul style={{ lineHeight: '1.6', marginBottom: '1rem' }}>
            <li><strong style={{ color: '#4CAF50' }}>Walk (1 AP):</strong> Move 1 tile in any direction</li>
            <li><strong style={{ color: '#FF9800' }}>Dash (2 AP):</strong> Move 2 tiles orthogonally</li>
            <li><strong style={{ color: '#F44336' }}>Fire (2 AP):</strong> Launch a projectile</li>
            <li><strong style={{ color: '#9C27B0' }}>Mine (2 AP):</strong> Place a stationary explosive</li>
            <li><strong style={{ color: '#2196F3' }}>Shield (1 AP):</strong> Create directional protection</li>
          </ul>
          
          <h2 style={{ color: '#F44336', marginBottom: '1rem' }}>Combat</h2>
          <p style={{ lineHeight: '1.6', marginBottom: '1rem' }}>
            Projectiles and mines move automatically each tick. When they collide with echoes or other projectiles, 
            explosions occur. Shields can block projectiles from specific directions.
          </p>
          
          <h2 style={{ color: '#4CAF50', marginBottom: '1rem' }}>Scoring</h2>
          <p style={{ lineHeight: '1.6', marginBottom: '1rem' }}>
            Players earn 1 point for each opponent echo destroyed. The first player to reach 10 points wins.
          </p>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <Link 
            to="/" 
            style={{
              display: 'inline-block',
              padding: '1rem 2rem',
              fontSize: '1.2rem',
              background: 'linear-gradient(145deg, #333, #444)',
              color: 'white',
              border: '2px solid #666',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              textDecoration: 'none',
              fontFamily: 'Orbitron, monospace',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(145deg, #4CAF50, #45a049)';
              e.currentTarget.style.borderColor = '#4CAF50';
              e.currentTarget.style.boxShadow = '0 0 20px #4CAF50, 0 8px 16px rgba(76, 175, 80, 0.3)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.textShadow = '0 0 8px #4CAF50';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(145deg, #333, #444)';
              e.currentTarget.style.borderColor = '#666';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.textShadow = 'none';
            }}
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RulesPage; 