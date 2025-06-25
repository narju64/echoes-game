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
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h1 style={{ 
          color: '#ff9800', 
          textShadow: '0 0 20px #ff9800',
          textAlign: 'center',
          marginBottom: '2rem'
        }}>
          Echoes - Game Rules
        </h1>
        
        <div style={{ 
          background: '#222', 
          padding: '2rem', 
          borderRadius: '12px',
          border: '2px solid #333',
          marginBottom: '2rem'
        }}>
          <h2 style={{ color: '#4CAF50', marginBottom: '1rem' }}>Overview</h2>
          <p style={{ lineHeight: '1.6', marginBottom: '1rem' }}>
            Echoes is a tactical turn-based game where players control echoes on an 8x8 grid. The unique core mechanic 
            is that echoes repeat their programmed instructions every round until they are destroyed, creating complex 
            tactical patterns and strategic depth.
          </p>
          
          <h2 style={{ color: '#2196F3', marginBottom: '1rem' }}>Victory Conditions</h2>
          <p style={{ lineHeight: '1.6', marginBottom: '1rem' }}>
            A player wins by achieving one of the following:
          </p>
          <ul style={{ lineHeight: '1.6', marginBottom: '1rem', marginLeft: '2rem' }}>
            <li><strong>Destruction Victory:</strong> Destroy all opponent echoes</li>
            <li><strong>Point Victory:</strong> Reach 10 points (1 point per destroyed opponent echo)</li>
            <li><strong>Echo Victory:</strong> Control 8 echoes simultaneously after the completion of a round</li>
          </ul>
        </div>

        <div style={{ 
          background: '#222', 
          padding: '2rem', 
          borderRadius: '12px',
          border: '2px solid #333',
          marginBottom: '2rem'
        }}>
          <h2 style={{ color: '#FF9800', marginBottom: '1rem' }}>The Replay Mechanic - Core Game Concept</h2>
          <p style={{ lineHeight: '1.6', marginBottom: '1rem' }}>
            The defining feature of Echoes is the <strong>replay mechanic</strong>. When you create or extend an echo, 
            you program it with a sequence of actions that it will execute automatically at the start of every round 
            until it is destroyed.
          </p>
          
          <h3 style={{ color: '#4CAF50', marginBottom: '0.5rem', marginTop: '1.5rem' }}>How Replay Works</h3>
          <ul style={{ lineHeight: '1.6', marginBottom: '1rem', marginLeft: '2rem' }}>
            <li>Each echo stores a list of instructions (actions with directions)</li>
            <li>At the beginning of every round, all echoes simultaneously execute their instructions in order</li>
            <li>Instructions are executed tick-by-tick (1 instruction per tick)</li>
            <li>This creates predictable patterns that you can plan around and exploit</li>
            <li>Echoes continue their programmed behavior until destroyed</li>
          </ul>
          
          <h3 style={{ color: '#4CAF50', marginBottom: '0.5rem', marginTop: '1.5rem' }}>Strategic Implications</h3>
          <ul style={{ lineHeight: '1.6', marginBottom: '1rem', marginLeft: '2rem' }}>
            <li>Plan your echo movements to avoid collisions with your own echoes</li>
            <li>Use predictable enemy patterns to set up traps and ambushes</li>
            <li>Position echoes strategically to create defensive formations</li>
            <li>Time your actions to exploit gaps in enemy patterns</li>
          </ul>
          
          <h3 style={{ color: '#4CAF50', marginBottom: '0.5rem', marginTop: '1.5rem' }}>Ally Preview System</h3>
          <p style={{ lineHeight: '1.6', marginBottom: '1rem' }}>
            During the input phase, you can see a preview of where your ally echoes will be positioned on each tick. 
            This helps you coordinate your echoes and avoid friendly collisions.
          </p>
          <ul style={{ lineHeight: '1.6', marginBottom: '1rem', marginLeft: '2rem' }}>
            <li><strong>Semi-transparent display:</strong> Ally echoes appear as semi-transparent grey circles</li>
            <li><strong>Tick-based positioning:</strong> Shows where allies will be on the current tick you're editing</li>
            <li><strong>Projectile trails:</strong> Displays the paths of projectiles fired by ally echoes</li>
            <li><strong>Shield indicators:</strong> Shows active shields on ally echoes</li>
            <li><strong>Real-time updates:</strong> Preview updates as you add actions to your current echo</li>
          </ul>
          <p style={{ lineHeight: '1.6', marginBottom: '1rem' }}>
            Use this preview to position your echoes strategically, avoid friendly fire, and create coordinated 
            formations with your existing echoes.
          </p>
          <p style={{ lineHeight: '1.6', marginBottom: '1rem', fontStyle: 'italic', color: '#ccc' }}>
            <strong>Note:</strong> Ally previews are not guaranteed to be 100% accurate since they do not simulate 
            collisions or enemy actions. A projectile or echo shown in the preview might be destroyed before 
            reaching its predicted position, or enemy actions might interfere with the expected outcome.
          </p>
        </div>

        <div style={{ 
          background: '#222', 
          padding: '2rem', 
          borderRadius: '12px',
          border: '2px solid #333',
          marginBottom: '2rem'
        }}>
          <h2 style={{ color: '#2196F3', marginBottom: '1rem' }}>Turn Structure</h2>
          
          <h3 style={{ color: '#4CAF50', marginBottom: '0.5rem', marginTop: '1.5rem' }}>Input Phase</h3>
          <p style={{ lineHeight: '1.6', marginBottom: '1rem' }}>
            Players take turns programming their echoes:
          </p>
          <ul style={{ lineHeight: '1.6', marginBottom: '1rem', marginLeft: '2rem' }}>
            <li><strong>New Echo (5 Action Points):</strong> Create a new echo on your home row (row 1 for Player 1, row 8 for Player 2)</li>
            <li><strong>Extend Echo (3 Action Points):</strong> Add more instructions to an existing echo</li>
            <li>Each action costs action points (AP)</li>
            <li>You can undo actions before finalizing</li>
          </ul>
          
          <h3 style={{ color: '#4CAF50', marginBottom: '0.5rem', marginTop: '1.5rem' }}>Replay Phase</h3>
          <p style={{ lineHeight: '1.6', marginBottom: '1rem' }}>
            All echoes execute their programmed instructions simultaneously:
          </p>
          <ul style={{ lineHeight: '1.6', marginBottom: '1rem', marginLeft: '2rem' }}>
            <li>Projectiles move automatically each tick</li>
            <li>Echoes move according to their instructions</li>
            <li>Collisions are detected and resolved</li>
            <li>Shields block 1 incoming projectile per use</li>
            <li>Destroyed echoes are permanently removed from play</li>
          </ul>
        </div>

        <div style={{ 
          background: '#222', 
          padding: '2rem', 
          borderRadius: '12px',
          border: '2px solid #333',
          marginBottom: '2rem'
        }}>
          <h2 style={{ color: '#FF9800', marginBottom: '1rem' }}>Actions & Movement</h2>
          
          <h3 style={{ color: '#4CAF50', marginBottom: '0.5rem', marginTop: '1.5rem' }}>Available Actions</h3>
          <ul style={{ lineHeight: '1.6', marginBottom: '1rem', marginLeft: '2rem' }}>
            <li><strong style={{ color: '#4CAF50' }}>Walk (1 AP):</strong> Move 1 tile in any direction</li>
            <li><strong style={{ color: '#FF9800' }}>Dash (2 AP):</strong> Move 2 tiles orthogonally only (up, down, left, right)</li>
            <li><strong style={{ color: '#F44336' }}>Fire (2 AP):</strong> Launch a projectile that moves 1 tile per tick</li>
            <li><strong style={{ color: '#9C27B0' }}>Mine (2 AP):</strong> Place a stationary explosive (only 1 mine per echo per turn)</li>
            <li><strong style={{ color: '#2196F3' }}>Shield (1 AP):</strong> Create directional protection (cannot use consecutively)</li>
          </ul>
          
          <h3 style={{ color: '#4CAF50', marginBottom: '0.5rem', marginTop: '1.5rem' }}>Movement Rules</h3>
          <ul style={{ lineHeight: '1.6', marginBottom: '1rem', marginLeft: '2rem' }}>
            <li>Echoes cannot move off the board</li>
            <li>Multiple echoes can occupy the same tile (they will collide and be destroyed)</li>
             <li>Projectiles travel in straight lines until they collide</li>
          </ul>
        </div>

        <div style={{ 
          background: '#222', 
          padding: '2rem', 
          borderRadius: '12px',
          border: '2px solid #333',
          marginBottom: '2rem'
        }}>
          <h2 style={{ color: '#F44336', marginBottom: '1rem' }}>Combat & Collisions</h2>
          
          <h3 style={{ color: '#4CAF50', marginBottom: '0.5rem', marginTop: '1.5rem' }}>Collision Types</h3>
          <ul style={{ lineHeight: '1.6', marginBottom: '1rem', marginLeft: '2rem' }}>
            <li><strong>Echo vs Echo:</strong> Both echoes are destroyed</li>
            <li><strong>Echo vs Projectile/Mine:</strong> Echo is destroyed, projectile/mine disappears</li>
            <li><strong>Projectile vs Projectile:</strong> Both projectiles are destroyed</li>
            <li><strong>Projectile vs Mine:</strong> Both are destroyed</li>
          </ul>
          
          <h3 style={{ color: '#4CAF50', marginBottom: '0.5rem', marginTop: '1.5rem' }}>Shield Mechanics</h3>
          <ul style={{ lineHeight: '1.6', marginBottom: '1rem', marginLeft: '2rem' }}>
            <li>Shields protect against projectiles from specific directions</li>
            <li>Shields block projectiles from the direction they're facing and adjacent directions</li>
            <li>Shields deactivate after blocking one projectile</li>
            <li>Shields cannot be used consecutively (must wait one action)</li>
            <li>Shields do not protect against echo collisions or mines</li>
          </ul>
          
          <h3 style={{ color: '#4CAF50', marginBottom: '0.5rem', marginTop: '1.5rem' }}>Scoring</h3>
          <ul style={{ lineHeight: '1.6', marginBottom: '1rem', marginLeft: '2rem' }}>
            <li>Players earn 1 point each time and opponent echo is destroyed</li>
            <li>First player to reach 10 points wins</li>
          </ul>
        </div>

        <div style={{ 
          background: '#222', 
          padding: '2rem', 
          borderRadius: '12px',
          border: '2px solid #333',
          marginBottom: '2rem'
        }}>
          <h2 style={{ color: '#9C27B0', marginBottom: '1rem' }}>Advanced Tactics</h2>
          
          <h3 style={{ color: '#4CAF50', marginBottom: '0.5rem', marginTop: '1.5rem' }}>Pattern Recognition</h3>
          <ul style={{ lineHeight: '1.6', marginBottom: '1rem', marginLeft: '2rem' }}>
            <li>Study enemy echo patterns to predict their movements</li>
            <li>Position your echoes to intercept enemy paths</li>
            <li>Use mines to create chokepoints in enemy patterns</li>
            <li>Time your actions to exploit predictable enemy behavior</li>
          </ul>
          
          <h3 style={{ color: '#4CAF50', marginBottom: '0.5rem', marginTop: '1.5rem' }}>Formation Tactics</h3>
          <ul style={{ lineHeight: '1.6', marginBottom: '1rem', marginLeft: '2rem' }}>
            <li>Create defensive formations with overlapping shields</li>
            <li>Use multiple echoes to create crossfire patterns</li>
            <li>Position echoes to protect each other from enemy projectiles</li>
            <li>Coordinate echo movements to avoid friendly collisions</li>
          </ul>
          
          <h3 style={{ color: '#4CAF50', marginBottom: '0.5rem', marginTop: '1.5rem' }}>Resource Management</h3>
          <ul style={{ lineHeight: '1.6', marginBottom: '1rem', marginLeft: '2rem' }}>
            <li>Balance between creating new echoes and extending existing ones</li>
            <li>Consider the long-term value of each action point</li>
            <li>Plan your echo count carefully (maximum 8 echoes)</li>
            <li>Use shields strategically to protect valuable echoes</li>
          </ul>
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