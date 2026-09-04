import React from 'react';

/**
 * Reusable Loader component based on the ApprovalDashboard UI.
 * @param {boolean} loading - Controls whether the loader is visible.
 * @param {string} message - Optional text to display next to the spinner.
 */
const Loader = ({ loading, message = 'Loading...' }) => {
  if (!loading) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      backgroundColor: 'rgba(0, 0, 0, 0.15)', // Subtle backdrop
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 20000
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '8px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '3px solid #f3f3f3',
          borderTop: '3px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <span style={{
          fontSize: '16px',
          color: '#333',
          fontWeight: '500'
        }}>
          {message}
        </span>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Loader;
