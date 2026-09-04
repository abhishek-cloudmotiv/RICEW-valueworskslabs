import React, { createContext, useState, useCallback, useEffect } from 'react';
import API_CONFIG from '../config/apiConfig';
import TOKEN_CONFIG from '../config/tokenConfig';
import { logoutWithApi, clearInMemoryTokens } from '../utils/cognito-auth';
import { setAuthContext } from '../utils/tokenUtils';


export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [idToken, setIdToken] = useState(() => localStorage.getItem('id_token') || null);
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem('access_token') || null);
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem('refresh_token') || null);
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('id_token'));
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    setIsInitialized(true);
    // Set auth context for all utilities
    setAuthContext({ idToken, accessToken, refreshToken });
  }, [idToken, accessToken, refreshToken]);

  const login = useCallback((tokens) => {
    // 8 hours = 28800 seconds. Use server value if provided, otherwise default to 8 hours
    const expiresIn = tokens.expires_in || TOKEN_CONFIG.ACCESS_TOKEN_EXPIRY;

    // Store tokens in localStorage (persists across page refresh/browser restart)
    localStorage.setItem('id_token', tokens.id_token);
    localStorage.setItem('access_token', tokens.access_token);
    localStorage.setItem('refresh_token', tokens.refresh_token);
    localStorage.setItem('expires_in', expiresIn);

    // Store in state
    setIdToken(tokens.id_token);
    setAccessToken(tokens.access_token);
    setRefreshToken(tokens.refresh_token);
    setIsLoggedIn(true);
  }, []);

  const logout = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        await logoutWithApi(token);
      }
    } catch (error) {

      console.error('Logout API error:', error);
    } finally {
      // Complete wipe of all stored data
      localStorage.clear();
      sessionStorage.clear();

      // Clear from state
      setIdToken(null);
      setAccessToken(null);
      setRefreshToken(null);
      setIsLoggedIn(false);
      
      // Clear in-memory tokens
      clearInMemoryTokens();
    }
  }, []);

  const getCachedToken = useCallback(async () => {
    // Return the current token from state
    // In the future, this can be expanded to check expiry and refresh the token
    return idToken;
  }, [idToken]);

  const value = {
    idToken,
    accessToken,
    refreshToken,
    isLoggedIn,
    isInitialized,
    login,
    logout,
    getCachedToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};