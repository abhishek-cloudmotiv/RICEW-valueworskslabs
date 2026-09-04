// This will be set by the app to provide tokens from Context
let authContextRef = null;

export const setAuthContext = (authContext) => {
  authContextRef = authContext;
};

export const getIdToken = () => {
  return new Promise((resolve, reject) => {
    if (authContextRef?.idToken) {
      resolve(authContextRef.idToken);
    } else {
      reject(new Error('No ID token found'));
    }
  });
};

export const getAccessToken = () => {
  return new Promise((resolve, reject) => {
    if (authContextRef?.accessToken) {
      resolve(authContextRef.accessToken);
    } else {
      reject(new Error('No access token found'));
    }
  });
};

export const getRefreshToken = () => {
  return new Promise((resolve, reject) => {
    if (authContextRef?.refreshToken) {
      resolve(authContextRef.refreshToken);
    } else {
      reject(new Error('No refresh token found'));
    }
  });
};