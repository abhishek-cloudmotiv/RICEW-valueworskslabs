import React, { createContext, useState, useCallback, useEffect } from 'react';

export const SessionContext = createContext();

export const SessionProvider = ({ children }) => {
  const [showSessionExpiredPopup, setShowSessionExpiredPopup] = useState(false);
  const [userId, setUserId] = useState(() => localStorage.getItem('user_id') || '');
  const [projectId, setProjectId] = useState(() => localStorage.getItem('project_id') || '');
  const [projectName, setProjectName] = useState(() => localStorage.getItem('project_name') || '');
  const [orderId, setOrderId] = useState(() => localStorage.getItem('order_id') || '');

  // Sync state changes to localStorage
  useEffect(() => {
    if (userId) localStorage.setItem('user_id', userId);
    if (projectId) localStorage.setItem('project_id', projectId);
    if (projectName) localStorage.setItem('project_name', projectName);
    if (orderId) localStorage.setItem('order_id', orderId);
  }, [userId, projectId, projectName, orderId]);

  const handleAuthError = useCallback((message = 'Your session has expired. Please log in again.') => {
    console.warn('Session error:', message);
    setShowSessionExpiredPopup(true);
  }, []);

  const hideSessionPopup = useCallback(() => {
    setShowSessionExpiredPopup(false);
  }, []);

  const logout = useCallback(async () => {
    // Clear context state
    setUserId('');
    setProjectId('');
    setProjectName('');
    setOrderId('');
    
    // Clear specific localStorage items
    localStorage.removeItem('user_id');
    localStorage.removeItem('project_id');
    localStorage.removeItem('project_name');
    localStorage.removeItem('order_id');
    localStorage.removeItem('id_token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    
    window.location.href = '/login';
  }, []);

  const clearSession = useCallback(() => {
    setUserId('');
    setProjectId('');
    setProjectName('');
    setOrderId('');
  }, []);

  const value = {
    showSessionExpiredPopup,
    handleAuthError,
    hideSessionPopup,
    logout,
    clearSession,
    userId,
    projectId,
    projectName,
    orderId,
    setUserId,
    setProjectId,
    setProjectName,
    setOrderId
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = React.useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};