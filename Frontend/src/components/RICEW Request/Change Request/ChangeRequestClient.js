import axios from 'axios';
import { getIdToken } from '../../../utils/cognito-auth';

export const BASE_URLS = {
    MASTER_DATA: 'https://fuahu3jqsc.execute-api.ap-south-1.amazonaws.com/New',
    RICEW: 'https://mt6ywydebk.execute-api.ap-south-1.amazonaws.com/New',
    SUBMIT_API: 'https://q4f0h3wwq2.execute-api.ap-south-1.amazonaws.com/New',
    ROSTER: 'https://oi5gtp4f3l.execute-api.ap-south-1.amazonaws.com/New/newApi',
    CLIENT_ROSTER: 'https://ves5hu7c23.execute-api.ap-south-1.amazonaws.com/New'
};

const createDynamicApiClient = (baseURL) => {
    const instance = axios.create({
        baseURL,
        headers: {
            'Content-Type': 'application/json',
        },
    });

    // Request interceptor: Fetch fresh token on each request
    instance.interceptors.request.use(
        async (config) => {
            try {
                const token = await getIdToken();
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
            } catch (err) {
                console.error('Error fetching token:', err);
            }
            return config;
        },
        (error) => Promise.reject(error)
    );

    // Response interceptor: Handle 401 errors
    instance.interceptors.response.use(
        (response) => response.data,
        (error) => {
            if (error.response?.status === 401) {
                localStorage.removeItem('id_token');
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
            }
            const errorMessage = error.response?.data?.message || error.response?.data?.error || 'An API error occurred';
            return Promise.reject(new Error(errorMessage));
        }
    );

    return instance;
};

export const masterApiClient = createDynamicApiClient(BASE_URLS.MASTER_DATA);
export const ricewApiClient = createDynamicApiClient(BASE_URLS.RICEW);
export const rosterApiClient = createDynamicApiClient(BASE_URLS.ROSTER);
export const clientRosterApiClient = createDynamicApiClient(BASE_URLS.CLIENT_ROSTER);
export const changeRequestSubmitApiClient = createDynamicApiClient(BASE_URLS.SUBMIT_API);

export default {
    master: masterApiClient,
    ricew: ricewApiClient
};
