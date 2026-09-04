import {
    CognitoUserPool,
    CognitoUser,
    AuthenticationDetails,
    CognitoUserAttribute,
} from 'amazon-cognito-identity-js';
import axios from 'axios';
import API_CONFIG from '../config/apiConfig';

// Cognito User Pool Configuration
// TODO: Replace these with your actual Cognito User Pool credentials
const poolData = {
    UserPoolId: 'ap-south-1_CoDX6Hgbz', // e.g., 'us-east-1_xxxxxxxxx'
    ClientId: '1v83lroeskoesla8jpasgm3mms', // e.g., 'xxxxxxxxxxxxxxxxxxxxxxxxxx'
};

const userPool = new CognitoUserPool(poolData);

// In-memory token storage for enhanced security
// This ensures tokens are NOT stored in localStorage and will be lost on page refresh
let inMemoryTokens = {
    idToken: null,
    accessToken: null,
    refreshToken: null
};

/**
 * Set in-memory tokens after successful login via custom API
 * @param {Object} tokens - Object containing id_token, access_token, and refresh_token
 */
export const setInMemoryTokens = (tokens) => {
    inMemoryTokens = {
        idToken: tokens.id_token || null,
        accessToken: tokens.access_token || null,
        refreshToken: tokens.refresh_token || null
    };
    console.log('In-memory tokens updated');
};

/**
 * Clear in-memory tokens
 */
export const clearInMemoryTokens = () => {
    inMemoryTokens = {
        idToken: null,
        accessToken: null,
        refreshToken: null
    };
    console.log('In-memory tokens cleared');
};


/**
 * Sign up a new user
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @param {string} fullName - User's full name
 * @returns {Promise} - Promise that resolves with the signup result
 */
export const signUp = (email, password, fullName) => {
    return new Promise((resolve, reject) => {
        const attributeList = [];

        // Email attribute
        const dataEmail = {
            Name: 'email',
            Value: email,
        };
        const attributeEmail = new CognitoUserAttribute(dataEmail);
        attributeList.push(attributeEmail);

        // Name attribute
        const dataName = {
            Name: 'name',
            Value: fullName,
        };
        const attributeName = new CognitoUserAttribute(dataName);
        attributeList.push(attributeName);

        userPool.signUp(email, password, attributeList, null, (err, result) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(result);
        });
    });
};

/**
 * Confirm user registration with verification code
 * @param {string} email - User's email address
 * @param {string} code - Verification code sent to user's email
 * @returns {Promise} - Promise that resolves when confirmation is successful
 */
export const confirmSignUp = (email, code) => {
    return new Promise((resolve, reject) => {
        const userData = {
            Username: email,
            Pool: userPool,
        };

        const cognitoUser = new CognitoUser(userData);

        cognitoUser.confirmRegistration(code, true, (err, result) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(result);
        });
    });
};

/**
 * Resend verification code
 * @param {string} email - User's email address
 * @returns {Promise} - Promise that resolves when code is resent
 */
export const resendConfirmationCode = (email) => {
    return new Promise((resolve, reject) => {
        const userData = {
            Username: email,
            Pool: userPool,
        };

        const cognitoUser = new CognitoUser(userData);

        cognitoUser.resendConfirmationCode((err, result) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(result);
        });
    });
};

/**
 * Sign in a user via the custom Lambda-backed API
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Promise} - Promise that resolves with the login result
 */
export const loginWithApi = async (email, password) => {
    try {
        const response = await axios.post(API_CONFIG.LOGIN_API_URL, {
            email,
            password
        });

        if (response.status !== 200) {
            throw new Error(response.data?.message || 'Login failed');
        }

        // Return tokens - they'll be stored in cookies via AuthContext.login()
        return { success: true, data: response.data.data };
    } catch (error) {
        console.error('Login API error:', error);
        throw error;
    }
};

/**
 * Sign out a user via the custom Lambda-backed API
 * This performs a GlobalSignOut which invalidates all sessions
 * @param {string} accessToken - The user's access token
 * @returns {Promise} - Promise that resolves with the logout result
 */
export const logoutWithApi = async (accessToken) => {
    try {
        if (!accessToken) {
            throw new Error('Access token is required for logout');
        }

        const response = await axios.post(API_CONFIG.LOGOUT_API_URL, {
            access_token: accessToken
        });

        if (response.status !== 200) {
            throw new Error(response.data?.message || 'Logout failed');
        }

        return { success: true, data: response.data.data };
    } catch (error) {
        console.error('Logout API error:', error);
        throw error;
    }
};


/**
 * Sign in a user (legacy Cognito SDK version)
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Promise} - Promise that resolves with the session or challenge info
 */
export const signIn = (email, password) => {
    return new Promise((resolve, reject) => {
        const authenticationData = {
            Username: email,
            Password: password,
        };

        const authenticationDetails = new AuthenticationDetails(authenticationData);

        const userData = {
            Username: email,
            Pool: userPool,
        };

        const cognitoUser = new CognitoUser(userData);

        cognitoUser.authenticateUser(authenticationDetails, {
            onSuccess: (result) => {
                resolve({ success: true, session: result });
            },
            onFailure: (err) => {
                reject(err);
            },
            newPasswordRequired: (userAttributes, requiredAttributes) => {
                // Return the cognitoUser object so we can call completeNewPasswordChallenge later
                resolve({
                    success: false,
                    challenge: 'NewPasswordRequired',
                    cognitoUser,
                    userAttributes,
                    requiredAttributes,
                });
            },
        });
    });
};

/**
 * Complete the new password challenge
 * @param {Object} cognitoUser - The CognitoUser instance from signIn
 * @param {string} newPassword - The new password
 * @param {Object} attributes - Optional user attributes
 * @returns {Promise} - Promise that resolves with the session
 */
export const completeNewPassword = (cognitoUser, newPassword, attributes = {}) => {
    return new Promise((resolve, reject) => {
        cognitoUser.completeNewPasswordChallenge(newPassword, attributes, {
            onSuccess: (result) => {
                resolve(result);
            },
            onFailure: (err) => {
                reject(err);
            },
        });
    });
};

/**
 * Sign out the current user (Cognito SDK cleanup only)
 * @returns {Promise} - Promise that resolves when sign out is complete
 */
export const signOut = () => {
    return new Promise((resolve) => {
        const cognitoUser = userPool.getCurrentUser();
        if (cognitoUser) {
            cognitoUser.signOut();
        }

        console.log('User signed out from Cognito');
        resolve();
    });
};

/**
 * Get the current authenticated user
 * @returns {Promise} - Promise that resolves with user session
 */
export const getCurrentUser = () => {
    return new Promise((resolve, reject) => {
        const cognitoUser = userPool.getCurrentUser();

        if (!cognitoUser) {
            reject(new Error('No user found'));
            return;
        }

        cognitoUser.getSession((err, session) => {
            if (err) {
                reject(err);
                return;
            }

            if (!session.isValid()) {
                reject(new Error('Session is not valid'));
                return;
            }

            cognitoUser.getUserAttributes((err, attributes) => {
                if (err) {
                    reject(err);
                    return;
                }

                const userData = {};
                attributes.forEach((attribute) => {
                    userData[attribute.Name] = attribute.Value;
                });

                resolve({
                    session,
                    attributes: userData,
                    username: cognitoUser.getUsername(),
                });
            });
        });
    });
};

/**
 * Get the current user's session
 * @returns {Promise} - Promise that resolves with the session
 */
export const getSession = () => {
    return new Promise((resolve, reject) => {
        const cognitoUser = userPool.getCurrentUser();

        if (!cognitoUser) {
            reject(new Error('No user found'));
            return;
        }

        cognitoUser.getSession((err, session) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(session);
        });
    });
};

/**
 * Initiate forgot password flow
 * @param {string} email - User's email address
 * @returns {Promise} - Promise that resolves when code is sent
 */
export const forgotPassword = (email) => {
    return new Promise((resolve, reject) => {
        const userData = {
            Username: email,
            Pool: userPool,
        };

        const cognitoUser = new CognitoUser(userData);

        cognitoUser.forgotPassword({
            onSuccess: (result) => {
                resolve(result);
            },
            onFailure: (err) => {
                reject(err);
            },
        });
    });
};

/**
 * Confirm new password with verification code
 * @param {string} email - User's email address
 * @param {string} code - Verification code
 * @param {string} newPassword - New password
 * @returns {Promise} - Promise that resolves when password is reset
 */
export const confirmPassword = (email, code, newPassword) => {
    return new Promise((resolve, reject) => {
        const userData = {
            Username: email,
            Pool: userPool,
        };

        const cognitoUser = new CognitoUser(userData);

        cognitoUser.confirmPassword(code, newPassword, {
            onSuccess: () => {
                resolve('Password reset successful');
            },
            onFailure: (err) => {
                reject(err);
            },
        });
    });
};

/**
 * Change password for authenticated user
 * @param {string} oldPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise} - Promise that resolves when password is changed
 */
export const changePassword = (oldPassword, newPassword) => {
    return new Promise((resolve, reject) => {
        const cognitoUser = userPool.getCurrentUser();

        if (!cognitoUser) {
            reject(new Error('No user found'));
            return;
        }

        cognitoUser.getSession((err, session) => {
            if (err) {
                reject(err);
                return;
            }

            cognitoUser.changePassword(oldPassword, newPassword, (err, result) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(result);
            });
        });
    });
};

/**
 * Update user attributes
 * @param {Object} attributes - Object containing attributes to update
 * @returns {Promise} - Promise that resolves when attributes are updated
 */
export const updateUserAttributes = (attributes) => {
    return new Promise((resolve, reject) => {
        const cognitoUser = userPool.getCurrentUser();

        if (!cognitoUser) {
            reject(new Error('No user found'));
            return;
        }

        cognitoUser.getSession((err, session) => {
            if (err) {
                reject(err);
                return;
            }

            const attributeList = [];
            Object.keys(attributes).forEach((key) => {
                const attribute = new CognitoUserAttribute({
                    Name: key,
                    Value: attributes[key],
                });
                attributeList.push(attribute);
            });

            cognitoUser.updateAttributes(attributeList, (err, result) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(result);
            });
        });
    });
};

/**
 * Delete user account
 * @returns {Promise} - Promise that resolves when user is deleted
 */
export const deleteUser = () => {
    return new Promise((resolve, reject) => {
        const cognitoUser = userPool.getCurrentUser();

        if (!cognitoUser) {
            reject(new Error('No user found'));
            return;
        }

        cognitoUser.getSession((err, session) => {
            if (err) {
                reject(err);
                return;
            }

            cognitoUser.deleteUser((err, result) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(result);
            });
        });
    });
};

/**
 * Get user's ID token from Context
 * @returns {Promise} - Promise that resolves with the ID token
 */
export const getIdToken = async () => {
    const { getIdToken: getIdTokenFromContext } = await import('./tokenUtils');
    return getIdTokenFromContext();
};

/**
 * Get user's access token from Context
 * @returns {Promise} - Promise that resolves with the access token
 */
export const getAccessToken = async () => {
    const { getAccessToken: getAccessTokenFromContext } = await import('./tokenUtils');
    return getAccessTokenFromContext();
};

/**
 * Get user's refresh token
 * @returns {Promise} - Promise that resolves with the refresh token
 */
export const getRefreshToken = () => {
    return new Promise((resolve, reject) => {
        // First check in-memory tokens
        if (inMemoryTokens.refreshToken) {
            resolve(inMemoryTokens.refreshToken);
            return;
        }

        const cognitoUser = userPool.getCurrentUser();

        if (!cognitoUser) {
            reject(new Error('No user found'));
            return;
        }

        cognitoUser.getSession((err, session) => {
            if (err) {
                reject(err);
                return;
            }

            const refreshToken = session.getRefreshToken().getToken();
            resolve(refreshToken);
        });
    });
};

export default {
    signUp,
    confirmSignUp,
    resendConfirmationCode,
    signIn,
    loginWithApi,
    logoutWithApi,
    signOut,
    getCurrentUser,

    getSession,
    forgotPassword,
    confirmPassword,
    changePassword,
    updateUserAttributes,
    deleteUser,
    getIdToken,
    getAccessToken,
    getRefreshToken,
    setInMemoryTokens,
    clearInMemoryTokens,
};
