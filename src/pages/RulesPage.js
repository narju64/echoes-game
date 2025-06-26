import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { useNavigate } from 'react-router-dom';
const RulesPage = () => {
    const navigate = useNavigate();
    return (_jsxs("div", { style: {
            padding: '2rem',
            color: 'white',
            backgroundColor: '#1a1a1a',
            minHeight: '100vh',
            fontFamily: 'Orbitron, monospace'
        }, children: [_jsx("button", { onClick: () => navigate('/home'), style: {
                    position: 'absolute',
                    top: '1rem',
                    left: '1rem',
                    background: 'linear-gradient(145deg, #333, #444)',
                    color: 'white',
                    border: '2px solid #666',
                    padding: '8px 16px',
                    fontSize: '0.9rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontFamily: 'Orbitron, monospace',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
                    zIndex: 1000
                }, onMouseEnter: (e) => {
                    e.currentTarget.style.background = 'linear-gradient(145deg, #2196F3, #1976D2)';
                    e.currentTarget.style.borderColor = '#2196F3';
                    e.currentTarget.style.boxShadow = '0 0 20px #2196F3, 0 8px 16px rgba(33, 150, 243, 0.3)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.textShadow = '0 0 8px #2196F3';
                }, onMouseLeave: (e) => {
                    e.currentTarget.style.background = 'linear-gradient(145deg, #333, #444)';
                    e.currentTarget.style.borderColor = '#666';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.textShadow = 'none';
                }, children: "Home" }), _jsxs("div", { style: { maxWidth: '900px', margin: '0 auto' }, children: [_jsx("h1", { style: {
                            color: '#ff9800',
                            textShadow: '0 0 20px #ff9800',
                            textAlign: 'center',
                            marginBottom: '2rem'
                        }, children: "Echoes - Game Rules" }), _jsxs("div", { style: {
                            background: '#222',
                            padding: '2rem',
                            borderRadius: '12px',
                            border: '2px solid #333',
                            marginBottom: '2rem'
                        }, children: [_jsx("h2", { style: { color: '#4CAF50', marginBottom: '1rem' }, children: "Overview" }), _jsx("p", { style: { lineHeight: '1.6', marginBottom: '1rem' }, children: "Echoes is a tactical turn-based game where players control echoes on an 8x8 grid. The unique core mechanic is that echoes repeat their programmed instructions every round until they are destroyed, creating complex tactical patterns and strategic depth." }), _jsx("h2", { style: { color: '#2196F3', marginBottom: '1rem' }, children: "Victory Conditions" }), _jsx("p", { style: { lineHeight: '1.6', marginBottom: '1rem' }, children: "A player wins by achieving one of the following:" }), _jsxs("ul", { style: { lineHeight: '1.6', marginBottom: '1rem', marginLeft: '2rem' }, children: [_jsxs("li", { children: [_jsx("strong", { children: "Destruction Victory:" }), " Destroy all opponent echoes"] }), _jsxs("li", { children: [_jsx("strong", { children: "Point Victory:" }), " Reach 10 points (1 point per destroyed opponent echo)"] }), _jsxs("li", { children: [_jsx("strong", { children: "Echo Victory:" }), " Control 8 echoes simultaneously after the completion of a round"] })] })] }), _jsxs("div", { style: {
                            background: '#222',
                            padding: '2rem',
                            borderRadius: '12px',
                            border: '2px solid #333',
                            marginBottom: '2rem'
                        }, children: [_jsx("h2", { style: { color: '#FF9800', marginBottom: '1rem' }, children: "The Replay Mechanic - Core Game Concept" }), _jsxs("p", { style: { lineHeight: '1.6', marginBottom: '1rem' }, children: ["The defining feature of Echoes is the ", _jsx("strong", { children: "replay mechanic" }), ". When you create or extend an echo, you program it with a sequence of actions that it will execute automatically at the start of every round until it is destroyed."] }), _jsx("h3", { style: { color: '#4CAF50', marginBottom: '0.5rem', marginTop: '1.5rem' }, children: "How Replay Works" }), _jsxs("ul", { style: { lineHeight: '1.6', marginBottom: '1rem', marginLeft: '2rem' }, children: [_jsx("li", { children: "Each echo stores a list of instructions (actions with directions)" }), _jsx("li", { children: "At the beginning of every round, all echoes simultaneously execute their instructions in order" }), _jsx("li", { children: "Instructions are executed tick-by-tick (1 instruction per tick)" }), _jsx("li", { children: "This creates predictable patterns that you can plan around and exploit" }), _jsx("li", { children: "Echoes continue their programmed behavior until destroyed" })] }), _jsx("h3", { style: { color: '#4CAF50', marginBottom: '0.5rem', marginTop: '1.5rem' }, children: "Strategic Implications" }), _jsxs("ul", { style: { lineHeight: '1.6', marginBottom: '1rem', marginLeft: '2rem' }, children: [_jsx("li", { children: "Plan your echo movements to avoid collisions with your own echoes" }), _jsx("li", { children: "Use predictable enemy patterns to set up traps and ambushes" }), _jsx("li", { children: "Position echoes strategically to create defensive formations" }), _jsx("li", { children: "Time your actions to exploit gaps in enemy patterns" })] }), _jsx("h3", { style: { color: '#4CAF50', marginBottom: '0.5rem', marginTop: '1.5rem' }, children: "Ally Preview System" }), _jsx("p", { style: { lineHeight: '1.6', marginBottom: '1rem' }, children: "During the input phase, you can see a preview of where your ally echoes will be positioned on each tick. This helps you coordinate your echoes and avoid friendly collisions." }), _jsxs("ul", { style: { lineHeight: '1.6', marginBottom: '1rem', marginLeft: '2rem' }, children: [_jsxs("li", { children: [_jsx("strong", { children: "Semi-transparent display:" }), " Ally echoes appear as semi-transparent grey circles"] }), _jsxs("li", { children: [_jsx("strong", { children: "Tick-based positioning:" }), " Shows where allies will be on the current tick you're editing"] }), _jsxs("li", { children: [_jsx("strong", { children: "Projectile trails:" }), " Displays the paths of projectiles fired by ally echoes"] }), _jsxs("li", { children: [_jsx("strong", { children: "Shield indicators:" }), " Shows active shields on ally echoes"] }), _jsxs("li", { children: [_jsx("strong", { children: "Real-time updates:" }), " Preview updates as you add actions to your current echo"] })] }), _jsx("p", { style: { lineHeight: '1.6', marginBottom: '1rem' }, children: "Use this preview to position your echoes strategically, avoid friendly fire, and create coordinated formations with your existing echoes." }), _jsxs("p", { style: { lineHeight: '1.6', marginBottom: '1rem', fontStyle: 'italic', color: '#ccc' }, children: [_jsx("strong", { children: "Note:" }), " Ally previews are not guaranteed to be 100% accurate since they do not simulate collisions or enemy actions. A projectile or echo shown in the preview might be destroyed before reaching its predicted position, or enemy actions might interfere with the expected outcome."] })] }), _jsxs("div", { style: {
                            background: '#222',
                            padding: '2rem',
                            borderRadius: '12px',
                            border: '2px solid #333',
                            marginBottom: '2rem'
                        }, children: [_jsx("h2", { style: { color: '#2196F3', marginBottom: '1rem' }, children: "Turn Structure" }), _jsx("h3", { style: { color: '#4CAF50', marginBottom: '0.5rem', marginTop: '1.5rem' }, children: "Input Phase" }), _jsx("p", { style: { lineHeight: '1.6', marginBottom: '1rem' }, children: "Players take turns programming their echoes:" }), _jsxs("ul", { style: { lineHeight: '1.6', marginBottom: '1rem', marginLeft: '2rem' }, children: [_jsxs("li", { children: [_jsx("strong", { children: "New Echo (5 Action Points):" }), " Create a new echo on your home row (row 1 for Player 1, row 8 for Player 2)"] }), _jsxs("li", { children: [_jsx("strong", { children: "Extend Echo (3 Action Points):" }), " Add more instructions to an existing echo"] }), _jsx("li", { children: "Each action costs action points (AP)" }), _jsx("li", { children: "You can undo actions before finalizing" })] }), _jsx("h3", { style: { color: '#4CAF50', marginBottom: '0.5rem', marginTop: '1.5rem' }, children: "Replay Phase" }), _jsx("p", { style: { lineHeight: '1.6', marginBottom: '1rem' }, children: "All echoes execute their programmed instructions simultaneously:" }), _jsxs("ul", { style: { lineHeight: '1.6', marginBottom: '1rem', marginLeft: '2rem' }, children: [_jsx("li", { children: "Projectiles move automatically each tick" }), _jsx("li", { children: "Echoes move according to their instructions" }), _jsx("li", { children: "Collisions are detected and resolved" }), _jsx("li", { children: "Shields block 1 incoming projectile per use" }), _jsx("li", { children: "Destroyed echoes are permanently removed from play" })] })] }), _jsxs("div", { style: {
                            background: '#222',
                            padding: '2rem',
                            borderRadius: '12px',
                            border: '2px solid #333',
                            marginBottom: '2rem'
                        }, children: [_jsx("h2", { style: { color: '#FF9800', marginBottom: '1rem' }, children: "Actions & Movement" }), _jsx("h3", { style: { color: '#4CAF50', marginBottom: '0.5rem', marginTop: '1.5rem' }, children: "Available Actions" }), _jsxs("ul", { style: { lineHeight: '1.6', marginBottom: '1rem', marginLeft: '2rem' }, children: [_jsxs("li", { children: [_jsx("strong", { style: { color: '#4CAF50' }, children: "Walk (1 AP):" }), " Move 1 tile in any direction"] }), _jsxs("li", { children: [_jsx("strong", { style: { color: '#FF9800' }, children: "Dash (2 AP):" }), " Move 2 tiles orthogonally only (up, down, left, right)"] }), _jsxs("li", { children: [_jsx("strong", { style: { color: '#F44336' }, children: "Fire (2 AP):" }), " Launch a projectile that moves 1 tile per tick"] }), _jsxs("li", { children: [_jsx("strong", { style: { color: '#9C27B0' }, children: "Mine (2 AP):" }), " Place a stationary explosive (only 1 mine per echo per turn)"] }), _jsxs("li", { children: [_jsx("strong", { style: { color: '#2196F3' }, children: "Shield (1 AP):" }), " Create directional protection (cannot use consecutively)"] })] }), _jsx("h3", { style: { color: '#4CAF50', marginBottom: '0.5rem', marginTop: '1.5rem' }, children: "Movement Rules" }), _jsxs("ul", { style: { lineHeight: '1.6', marginBottom: '1rem', marginLeft: '2rem' }, children: [_jsx("li", { children: "Echoes cannot move off the board" }), _jsx("li", { children: "Multiple echoes can occupy the same tile (they will collide and be destroyed)" }), _jsx("li", { children: "Projectiles travel in straight lines until they collide" })] })] }), _jsxs("div", { style: {
                            background: '#222',
                            padding: '2rem',
                            borderRadius: '12px',
                            border: '2px solid #333',
                            marginBottom: '2rem'
                        }, children: [_jsx("h2", { style: { color: '#F44336', marginBottom: '1rem' }, children: "Combat & Collisions" }), _jsx("h3", { style: { color: '#4CAF50', marginBottom: '0.5rem', marginTop: '1.5rem' }, children: "Collision Types" }), _jsxs("ul", { style: { lineHeight: '1.6', marginBottom: '1rem', marginLeft: '2rem' }, children: [_jsxs("li", { children: [_jsx("strong", { children: "Echo vs Echo:" }), " Both echoes are destroyed"] }), _jsxs("li", { children: [_jsx("strong", { children: "Echo vs Projectile/Mine:" }), " Echo is destroyed, projectile/mine disappears"] }), _jsxs("li", { children: [_jsx("strong", { children: "Projectile vs Projectile:" }), " Both projectiles are destroyed"] }), _jsxs("li", { children: [_jsx("strong", { children: "Projectile vs Mine:" }), " Both are destroyed"] })] }), _jsx("h3", { style: { color: '#4CAF50', marginBottom: '0.5rem', marginTop: '1.5rem' }, children: "Shield Mechanics" }), _jsxs("ul", { style: { lineHeight: '1.6', marginBottom: '1rem', marginLeft: '2rem' }, children: [_jsx("li", { children: "Shields protect against projectiles from specific directions" }), _jsx("li", { children: "Shields block projectiles from the direction they're facing and adjacent directions" }), _jsx("li", { children: "Shields deactivate after blocking one projectile" }), _jsx("li", { children: "Shields cannot be used consecutively (must wait one action)" }), _jsx("li", { children: "Shields do not protect against echo collisions or mines" })] }), _jsx("h3", { style: { color: '#4CAF50', marginBottom: '0.5rem', marginTop: '1.5rem' }, children: "Scoring" }), _jsxs("ul", { style: { lineHeight: '1.6', marginBottom: '1rem', marginLeft: '2rem' }, children: [_jsx("li", { children: "Players earn 1 point each time and opponent echo is destroyed" }), _jsx("li", { children: "First player to reach 10 points wins" })] })] }), _jsxs("div", { style: {
                            background: '#222',
                            padding: '2rem',
                            borderRadius: '12px',
                            border: '2px solid #333',
                            marginBottom: '2rem'
                        }, children: [_jsx("h2", { style: { color: '#9C27B0', marginBottom: '1rem' }, children: "Advanced Tactics" }), _jsx("h3", { style: { color: '#4CAF50', marginBottom: '0.5rem', marginTop: '1.5rem' }, children: "Pattern Recognition" }), _jsxs("ul", { style: { lineHeight: '1.6', marginBottom: '1rem', marginLeft: '2rem' }, children: [_jsx("li", { children: "Study enemy echo patterns to predict their movements" }), _jsx("li", { children: "Position your echoes to intercept enemy paths" }), _jsx("li", { children: "Use mines to create chokepoints in enemy patterns" }), _jsx("li", { children: "Time your actions to exploit predictable enemy behavior" })] }), _jsx("h3", { style: { color: '#4CAF50', marginBottom: '0.5rem', marginTop: '1.5rem' }, children: "Formation Tactics" }), _jsxs("ul", { style: { lineHeight: '1.6', marginBottom: '1rem', marginLeft: '2rem' }, children: [_jsx("li", { children: "Create defensive formations with overlapping shields" }), _jsx("li", { children: "Use multiple echoes to create crossfire patterns" }), _jsx("li", { children: "Position echoes to protect each other from enemy projectiles" }), _jsx("li", { children: "Coordinate echo movements to avoid friendly collisions" })] }), _jsx("h3", { style: { color: '#4CAF50', marginBottom: '0.5rem', marginTop: '1.5rem' }, children: "Resource Management" }), _jsxs("ul", { style: { lineHeight: '1.6', marginBottom: '1rem', marginLeft: '2rem' }, children: [_jsx("li", { children: "Balance between creating new echoes and extending existing ones" }), _jsx("li", { children: "Consider the long-term value of each action point" }), _jsx("li", { children: "Plan your echo count carefully (maximum 8 echoes)" }), _jsx("li", { children: "Use shields strategically to protect valuable echoes" })] })] })] })] }));
};
export default RulesPage;
