import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
const EchoActionSidebar = ({ isNewEcho, maxActionPoints, displayTick, remainingPoints, actions, selectingDirection, selectedActionType, pendingEcho, availableActions, handleActionSelect, handleUndoLastAction, }) => {
    return (_jsxs("div", { style: { color: 'white', background: '#222', padding: '2rem', borderRadius: 12, maxWidth: 340, margin: '2rem 0' }, children: [_jsx("h2", { children: "Assign Actions to Echo" }), _jsxs("p", { style: { color: isNewEcho ? '#4CAF50' : '#2196F3', fontWeight: 'bold' }, children: [isNewEcho ? 'New Echo' : 'Extended Echo', " (", maxActionPoints, " Action Points)"] }), _jsxs("p", { children: ["Current Tick: ", displayTick] }), _jsxs("p", { children: ["Remaining Action Points: ", remainingPoints] }), (actions.length > 0 || selectingDirection) && (_jsx("div", { style: { marginBottom: '1rem' }, children: _jsx("button", { onClick: handleUndoLastAction, style: {
                        background: '#ff5722',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                    }, children: "\u21A9 Undo Last Action" }) })), !isNewEcho && pendingEcho.instructionList.length > 0 && (_jsxs("div", { style: { marginBottom: '1rem' }, children: [_jsx("p", { style: { fontWeight: 'bold', color: '#ccc' }, children: "Existing Instructions:" }), _jsx("ol", { style: { color: '#ccc', fontSize: '0.9rem' }, children: pendingEcho.instructionList.map((a, i) => (_jsxs("li", { children: [a.type.toUpperCase(), " (", a.direction.x, ",", a.direction.y, ") [Tick: ", a.tick, "]"] }, i))) })] })), actions.length > 0 && (_jsxs("div", { style: { marginBottom: '1rem' }, children: [_jsx("p", { style: { fontWeight: 'bold', color: '#4CAF50' }, children: "New Actions:" }), _jsx("ol", { style: { color: '#4CAF50' }, children: actions.map((a, i) => (_jsxs("li", { children: [a.type.toUpperCase(), " (", a.direction.x, ",", a.direction.y, ") [Tick: ", a.tick, ", Cost: ", a.cost, "]"] }, i))) })] })), _jsx("p", { children: "Select an action:" }), _jsx("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 8 }, children: availableActions.map(a => (_jsxs("button", { onClick: () => handleActionSelect(a.type, a.cost), children: [a.label, " (", a.cost, ")"] }, a.type))) })] }));
};
export default EchoActionSidebar;
