import axios from 'axios';
import API_CONFIG from '../config/apiConfig';

/**
 * Factory function to create an Axios instance with standard
 * Cognito token injection and global error handling.
 *
 * @param {string} baseURL - The base URL for the specific module's API Gateway
 * @param {Object} authContext - The auth context object with idToken and accessToken
 * @returns {AxiosInstance}
 */
export const createApiClient = (baseURL, authContext) => {
    const instance = axios.create({
        baseURL,
        headers: {
            'Content-Type': 'application/json',
        },
    });

    // Request interceptor: Attach ID token from Context
    instance.interceptors.request.use(
        (config) => {
            const token = authContext.idToken;
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        },
        (error) => Promise.reject(error)
    );

    // Response interceptor: Global error handling and data unwrapping
    instance.interceptors.response.use(
        (response) => response.data,
        async (error) => {
            if (error.response) {
                if (error.response.status === 401) {
                    // Token expired - call logout API and clear all localStorage
                    const accessToken = authContext.accessToken;

                    // Call logout API if token exists
                    if (accessToken) {
                        try {
                            await axios.post(API_CONFIG.LOGOUT_API_URL, {}, {
                                headers: {
                                    'Authorization': `Bearer ${accessToken}`,
                                    'Content-Type': 'application/json'
                                }
                            });
                        } catch (logoutError) {
                            // Logout API call failed, but continue clearing tokens
                        }
                    }

                    // Clear all tokens and user data from localStorage
                    localStorage.removeItem('id_token');
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    localStorage.removeItem('expires_in');
                    localStorage.removeItem('user_id');
                    localStorage.removeItem('user_name');
                    localStorage.removeItem('user_email');
                }
                const errorMessage = error.response.data?.message || error.response.data?.error || 'An API error occurred';
                return Promise.reject(new Error(errorMessage));
            } else if (error.request) {
                return Promise.reject(new Error('Network error: No response from server'));
            } else {
                return Promise.reject(error);
            }
        }
    );

    return instance;
};
