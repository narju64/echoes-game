import React from 'react';
import { playGlassImpact } from '../assets/sounds/playSound';

interface LeaveConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message?: string;
}

const LeaveConfirmationModal: React.FC<LeaveConfirmationModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  title = "Leave Game?",
  message = "Leaving will end your game session. Are you sure you want to continue?"
}) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
        border: '2px solid #ff9800',
        borderRadius: '12px',
        padding: '2rem',
        maxWidth: '400px',
        width: '90%',
        textAlign: 'center',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
        animation: 'modalSlideIn 0.3s ease-out'
      }}>
        <h2 style={{
          color: '#ff9800',
          marginTop: 0,
          marginBottom: '1rem',
          fontSize: '1.5rem',
          textShadow: '0 0 8px rgba(255, 152, 0, 0.5)'
        }}>
          {title}
        </h2>
        
        <p style={{
          color: '#ffffff',
          marginBottom: '2rem',
          fontSize: '1rem',
          lineHeight: '1.5'
        }}>
          {message}
        </p>
        
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center'
        }}>
          <button
            onClick={onCancel}
            style={{
              background: 'linear-gradient(135deg, #4a4a4a 0%, #6a6a6a 100%)',
              border: '2px solid #666',
              borderRadius: '8px',
              padding: '0.75rem 1.5rem',
              color: '#ffffff',
              fontSize: '1rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              minWidth: '100px'
            }}
            onMouseEnter={(e) => {
              playGlassImpact();
              e.currentTarget.style.background = 'linear-gradient(135deg, #5a5a5a 0%, #7a7a7a 100%)';
              e.currentTarget.style.borderColor = '#888';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #4a4a4a 0%, #6a6a6a 100%)';
              e.currentTarget.style.borderColor = '#666';
            }}
          >
            Cancel
          </button>
          
          <button
            onClick={onConfirm}
            style={{
              background: 'linear-gradient(135deg, #d32f2f 0%, #f44336 100%)',
              border: '2px solid #d32f2f',
              borderRadius: '8px',
              padding: '0.75rem 1.5rem',
              color: '#ffffff',
              fontSize: '1rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              minWidth: '100px',
              fontWeight: 'bold'
            }}
            onMouseEnter={(e) => {
              playGlassImpact();
              e.currentTarget.style.background = 'linear-gradient(135deg, #e33e3e 0%, #f55a4a 100%)';
              e.currentTarget.style.borderColor = '#e33e3e';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #d32f2f 0%, #f44336 100%)';
              e.currentTarget.style.borderColor = '#d32f2f';
            }}
          >
            Leave Game
          </button>
        </div>
      </div>
      
      <style>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default LeaveConfirmationModal; 
