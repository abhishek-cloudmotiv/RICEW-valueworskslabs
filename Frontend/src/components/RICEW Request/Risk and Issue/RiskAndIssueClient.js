import axios from 'axios';
import API_CONFIG from '../../../config/apiConfig';

/**
 * Risk and Issue Module Gateway URLs
 * Note: These are module-specific endpoints as requested.
 */
export const BASE_URLS = {
    MASTER_DATA: 'https://fuahu3jqsc.execute-api.ap-south-1.amazonaws.com/New',
    RICEW: 'https://mt6ywydebk.execute-api.ap-south-1.amazonaws.com/New'
};

/**
 * Create API client with fresh token on each request
 */
const createDynamicApiClient = (baseURL) => {
    const instance = axios.create({
        baseURL,
        headers: {
            'Content-Type': 'application/json',
        },
    });

    // Request interceptor: Attach fresh ID token from Cognito on each request
    instance.interceptors.request.use(
        async (config) => {
            try {
                const { getIdToken } = await import('../../../utils/cognito-auth');
                const token = await getIdToken();
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
            } catch (error) {
                console.error('Failed to get ID token:', error);
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
                    // Clear all tokens on 401 - session expired
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

/**
 * API Instances for common ERP Master data and RICEW-specific gateways
 * These now get fresh tokens on each request via interceptors
 */
export const masterApiClient = createDynamicApiClient(BASE_URLS.MASTER_DATA);
export const ricewApiClient = createDynamicApiClient(BASE_URLS.RICEW);

export default {
    master: masterApiClient,
    ricew: ricewApiClient
};
