import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
const ExplosionAnimation = ({ row, col, x, y, scale = 1, duration = 1000, onComplete, isShieldBlock = false, projectileDirection }) => {
    const [phase, setPhase] = useState('start');
    const [animScale, setAnimScale] = useState(0);
    const [opacity, setOpacity] = useState(1);
    // Calculate offset for shield block animation
    const getShieldBlockOffset = () => {
        if (!isShieldBlock || !projectileDirection)
            return { x: 0, y: 0 };
        // Calculate which edge the projectile hit based on its direction
        // For horizontal: negate the direction (projectile going right = explosion on right edge)
        // For vertical: use the direction directly (projectile going down = explosion on bottom edge)
        const edgeDistance = 24; // Distance from center to edge (increased from 12 since echoes are bigger)
        return {
            x: -projectileDirection.x * edgeDistance,
            y: projectileDirection.y * edgeDistance
        };
    };
    const shieldOffset = getShieldBlockOffset();
    useEffect(() => {
        // Start animation
        const startTimer = setTimeout(() => {
            setPhase('explode');
            setAnimScale(1);
        }, 0);
        // Fade out
        const fadeTimer = setTimeout(() => {
            setPhase('fade');
            setOpacity(0);
        }, duration * 0.6);
        // Complete animation
        const completeTimer = setTimeout(() => {
            onComplete();
        }, duration);
        return () => {
            clearTimeout(startTimer);
            clearTimeout(fadeTimer);
            clearTimeout(completeTimer);
        };
    }, [onComplete, duration]);
    // If x/y are provided, use them for absolute positioning; else, use center (for board)
    const style = x !== undefined && y !== undefined
        ? {
            position: 'absolute',
            left: x,
            top: y,
            transform: `translate(-50%, -50%) scale(${scale * animScale})`,
            opacity: opacity,
            transition: 'transform 0.3s ease-out, opacity 0.4s ease-out',
            pointerEvents: 'none',
            zIndex: 10,
        }
        : {
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: `translate(calc(-50% + ${shieldOffset.x}px), calc(-50% + ${shieldOffset.y}px)) scale(${scale * animScale})`,
            opacity: opacity,
            transition: 'transform 0.3s ease-out, opacity 0.4s ease-out',
            pointerEvents: 'none',
            zIndex: 10,
        };
    return (_jsxs("div", { style: style, children: [Array.from({ length: 8 }).map((_, i) => {
                const angle = (i * 45) * (Math.PI / 180);
                const distance = 20;
                const x = Math.cos(angle) * distance;
                const y = Math.sin(angle) * distance;
                return (_jsx("div", { style: {
                        position: 'absolute',
                        width: 4,
                        height: 4,
                        background: isShieldBlock ? '#4CAF50' : '#ff6b35', // Green for shield blocks, orange for regular explosions
                        borderRadius: '50%',
                        transform: `translate(${x}px, ${y}px)`,
                        animation: phase === 'explode' ? 'explode-particle 0.5s ease-out forwards' : 'none',
                    } }, i));
            }), _jsx("div", { style: {
                    width: 16,
                    height: 16,
                    background: isShieldBlock
                        ? 'radial-gradient(circle, #4CAF50 0%, #66BB6A 50%, transparent 100%)'
                        : 'radial-gradient(circle, #ff6b35 0%, #ff8c42 50%, transparent 100%)',
                    borderRadius: '50%',
                    boxShadow: isShieldBlock ? '0 0 20px #4CAF50' : '0 0 20px #ff6b35',
                    animation: phase === 'explode' ? 'explode-center 0.5s ease-out forwards' : 'none',
                } }), _jsx("style", { children: `
          @keyframes explode-particle {
            0% {
              transform: translate(0, 0) scale(1);
              opacity: 1;
            }
            100% {
              transform: translate(${Array.from({ length: 8 }).map((_, i) => {
                    const angle = (i * 45) * (Math.PI / 180);
                    const distance = 30;
                    const x = Math.cos(angle) * distance;
                    const y = Math.sin(angle) * distance;
                    return `${x}px, ${y}px`;
                }).join('), translate(')}) scale(0);
              opacity: 0;
            }
          }
          
          @keyframes explode-center {
            0% {
              transform: scale(0);
              opacity: 1;
            }
            50% {
              transform: scale(1.5);
              opacity: 1;
            }
            100% {
              transform: scale(0);
              opacity: 0;
            }
          }
        ` })] }));
};
export default ExplosionAnimation;
