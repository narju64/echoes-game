import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
const AITrainingPanel = ({ gameState, currentPlayer, onReset, onNextTurn }) => {
    const [isTraining, setIsTraining] = useState(false);
    const [trainingGames, setTrainingGames] = useState(0);
    const [selectedAgent1, setSelectedAgent1] = useState('random');
    const [selectedAgent2, setSelectedAgent2] = useState('greedy');
    const handleStartTraining = () => {
        setIsTraining(true);
        // TODO: Implement actual AI training logic
        console.log('Starting AI training...');
    };
    const handleStopTraining = () => {
        setIsTraining(false);
        // TODO: Implement training stop logic
        console.log('Stopping AI training...');
    };
    const handleRunTournament = () => {
        // TODO: Implement tournament logic
        console.log('Running tournament...');
    };
    return (_jsxs("div", { style: {
            width: '300px',
            background: '#2a2a2a',
            border: '2px solid #444',
            borderRadius: '12px',
            padding: '1rem',
            color: 'white',
            fontFamily: 'Orbitron, monospace',
            height: 'fit-content',
            position: 'sticky',
            top: '2rem'
        }, children: [_jsx("h2", { style: {
                    margin: '0 0 1rem 0',
                    color: '#4CAF50',
                    textAlign: 'center',
                    fontSize: '1.2rem',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                }, children: "\uD83E\uDD16 AI Training Panel" }), _jsxs("div", { style: {
                    background: '#333',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    border: `2px solid ${isTraining ? '#4CAF50' : '#666'}`
                }, children: [_jsxs("div", { style: { fontWeight: 'bold', marginBottom: '0.5rem' }, children: ["Training Status: ", isTraining ? '🟢 Active' : '🔴 Inactive'] }), isTraining && (_jsxs("div", { style: { fontSize: '0.9rem', color: '#ccc' }, children: ["Games completed: ", trainingGames] }))] }), _jsxs("div", { style: { marginBottom: '1rem' }, children: [_jsx("h3", { style: { fontSize: '1rem', margin: '0 0 0.5rem 0', color: '#2196F3' }, children: "Agent Configuration" }), _jsxs("div", { style: { marginBottom: '0.75rem' }, children: [_jsx("label", { style: { display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }, children: "Player 1 Agent:" }), _jsxs("select", { value: selectedAgent1, onChange: (e) => setSelectedAgent1(e.target.value), style: {
                                    width: '100%',
                                    padding: '0.5rem',
                                    background: '#444',
                                    color: 'white',
                                    border: '1px solid #666',
                                    borderRadius: '4px',
                                    fontSize: '0.9rem'
                                }, children: [_jsx("option", { value: "random", children: "Random Agent" }), _jsx("option", { value: "greedy", children: "Greedy Agent" }), _jsx("option", { value: "defensive", children: "Defensive Agent" }), _jsx("option", { value: "aggressive", children: "Aggressive Agent" }), _jsx("option", { value: "position", children: "Position Agent" })] })] }), _jsxs("div", { style: { marginBottom: '0.75rem' }, children: [_jsx("label", { style: { display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }, children: "Player 2 Agent:" }), _jsxs("select", { value: selectedAgent2, onChange: (e) => setSelectedAgent2(e.target.value), style: {
                                    width: '100%',
                                    padding: '0.5rem',
                                    background: '#444',
                                    color: 'white',
                                    border: '1px solid #666',
                                    borderRadius: '4px',
                                    fontSize: '0.9rem'
                                }, children: [_jsx("option", { value: "random", children: "Random Agent" }), _jsx("option", { value: "greedy", children: "Greedy Agent" }), _jsx("option", { value: "defensive", children: "Defensive Agent" }), _jsx("option", { value: "aggressive", children: "Aggressive Agent" }), _jsx("option", { value: "position", children: "Position Agent" })] })] })] }), _jsxs("div", { style: { marginBottom: '1rem' }, children: [_jsx("h3", { style: { fontSize: '1rem', margin: '0 0 0.5rem 0', color: '#FF9800' }, children: "Training Controls" }), _jsx("div", { style: { display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }, children: _jsx("button", { onClick: isTraining ? handleStopTraining : handleStartTraining, style: {
                                flex: 1,
                                padding: '0.75rem',
                                background: isTraining ? '#f44336' : '#4CAF50',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '0.9rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                transition: 'all 0.3s ease'
                            }, onMouseEnter: (e) => {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
                            }, onMouseLeave: (e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }, children: isTraining ? '⏹ Stop' : '▶ Start' }) }), _jsx("button", { onClick: handleRunTournament, style: {
                            width: '100%',
                            padding: '0.75rem',
                            background: '#2196F3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '0.9rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            transition: 'all 0.3s ease'
                        }, onMouseEnter: (e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
                        }, onMouseLeave: (e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }, children: "\uD83C\uDFC6 Run Tournament" })] }), _jsxs("div", { style: { marginBottom: '1rem' }, children: [_jsx("h3", { style: { fontSize: '1rem', margin: '0 0 0.5rem 0', color: '#9C27B0' }, children: "Game Controls" }), _jsxs("div", { style: { display: 'flex', gap: '0.5rem' }, children: [_jsx("button", { onClick: onNextTurn, style: {
                                    flex: 1,
                                    padding: '0.75rem',
                                    background: '#4CAF50',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    fontSize: '0.9rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    transition: 'all 0.3s ease'
                                }, onMouseEnter: (e) => {
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
                                }, onMouseLeave: (e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }, children: "\u23ED Next Turn" }), _jsx("button", { onClick: onReset, style: {
                                    flex: 1,
                                    padding: '0.75rem',
                                    background: '#f44336',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    fontSize: '0.9rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    transition: 'all 0.3s ease'
                                }, onMouseEnter: (e) => {
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
                                }, onMouseLeave: (e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }, children: "\uD83D\uDD04 Reset" })] })] }), _jsxs("div", { style: { marginBottom: '1rem' }, children: [_jsx("h3", { style: { fontSize: '1rem', margin: '0 0 0.5rem 0', color: '#FF5722' }, children: "AI Metrics" }), _jsxs("div", { style: {
                            background: '#333',
                            padding: '0.75rem',
                            borderRadius: '8px',
                            fontSize: '0.9rem'
                        }, children: [_jsx("div", { style: { marginBottom: '0.5rem' }, children: _jsx("strong", { children: "Current Game:" }) }), _jsxs("div", { style: { marginBottom: '0.25rem' }, children: ["Turn: ", gameState.turnNumber] }), _jsxs("div", { style: { marginBottom: '0.25rem' }, children: ["Phase: ", gameState.phase] }), _jsxs("div", { style: { marginBottom: '0.25rem' }, children: ["Player 1 Score: ", gameState.scores.player1] }), _jsxs("div", { style: { marginBottom: '0.25rem' }, children: ["Player 2 Score: ", gameState.scores.player2] }), _jsxs("div", { children: ["Echoes: ", gameState.echoes.filter(e => e.alive).length] })] })] })] }));
};
export default AITrainingPanel;
