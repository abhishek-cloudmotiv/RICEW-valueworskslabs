// Token expiration configuration
// These values should match your Cognito User Pool settings

export const TOKEN_CONFIG = {
  // Token expiration times in seconds
  ACCESS_TOKEN_EXPIRY: 28800,      // 8 hours = 8 * 60 * 60 = 28800 seconds
  ID_TOKEN_EXPIRY: 28800,          // 8 hours
  REFRESH_TOKEN_EXPIRY: 432000,    // 5 days = 5 * 24 * 60 * 60 = 432000 seconds

  // Warning threshold (warn user when token is about to expire)
  TOKEN_EXPIRY_WARNING_TIME: 300,  // Warn 5 minutes before expiry

  // For debugging/logging
  getExpiryTime: (seconds) => {
    return new Date(Date.now() + seconds * 1000).toLocaleString();
  },

  getExpiryHours: (seconds) => {
    return (seconds / 3600).toFixed(2);
  }
};

export default TOKEN_CONFIG;