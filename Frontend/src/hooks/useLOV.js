import { useState, useEffect } from 'react';
import { getIdToken } from '../utils/cognito-auth';
import { useSession } from '../context/SessionContext';

const useLOV = (apiUrl, valueKey = 'SI_organization_name', labelKey = 'SI_organization_name') => {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { handleAuthError } = useSession();

  useEffect(() => {
    if (!apiUrl) return;

    const fetchLOV = async () => {
      setLoading(true);
      setError(null);

      let attempts = 0;
      const maxAttempts = 3;

      const executeFetch = async () => {
        try {
          attempts++;
          // Get ID token for authorization
          let idToken = null;
          try {
            idToken = await getIdToken();
          } catch (tokenError) {
            console.error('Failed to get ID token for LOV:', tokenError);
          }

          const headers = {
            'Content-Type': 'application/json',
          };

          if (idToken) {
            headers['Authorization'] = `Bearer ${idToken}`;
          }

          const response = await fetch(apiUrl, {
            headers: headers
          });

          if (response.status === 401 || response.status === 403) {
            handleAuthError('Unauthorized - session expired');
            return;
          }

          if (!response.ok) {
            // Retry for 5xx server errors or 429 too many requests
            if ((response.status >= 500 || response.status === 429) && attempts < maxAttempts) {
              throw new Error(`Server error: ${response.status}`);
            }
            // For other errors, don't retry
          }

          const result = await response.json();
          if (result.success && result.data) {
            setOptions(result.data.map(item => ({
              value: item[valueKey],
              label: item[labelKey],
              ...item // Preserve all other fields from the API response
            })));
          } else {
            setOptions([]);
          }
        } catch (err) {
          if (attempts < maxAttempts) {
            const delay = 1000 * Math.pow(2, attempts - 1); // 1s, 2s, 4s
            console.warn(`LOV fetch failed (attempt ${attempts}), retrying in ${delay}ms...`, err);
            await new Promise(resolve => setTimeout(resolve, delay));
            return executeFetch();
          }
          setError(err.message);
          setOptions([]);
        } finally {
          if (attempts === maxAttempts || !error) { // Only set loading false at end
            setLoading(false);
          }
        }
      };

      await executeFetch();
    };

    fetchLOV();
  }, [apiUrl, valueKey, labelKey]);

  return { options, loading, error };
};

export default useLOV;

