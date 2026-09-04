import { AlertCircle } from 'lucide-react';
import { useSession } from '../context/SessionContext';

const SessionExpiredPopup = () => {
  const { showSessionExpiredPopup, logout } = useSession();

  if (!showSessionExpiredPopup) return null;

  const handleLoginClick = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <div style={{
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        textAlign: 'center',
        maxWidth: '400px',
        width: '90%'
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          backgroundColor: '#fee2e2',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px'
        }}>
          <AlertCircle size={32} color="#dc3545" />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '12px', color: '#333' }}>
          Session Expired
        </h2>
        <p style={{ color: '#666', marginBottom: '24px', lineHeight: '1.5' }}>
          Your session or token has expired. Please login again to continue.
        </p>
        <button
          onClick={handleLoginClick}
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '10px 24px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '500',
            width: '100%'
          }}
        >
          Login Again
        </button>
      </div>
    </div>
  );
};

export default SessionExpiredPopup;