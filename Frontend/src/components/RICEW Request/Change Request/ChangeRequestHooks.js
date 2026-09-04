import { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { masterApiClient, ricewApiClient, rosterApiClient, clientRosterApiClient, changeRequestSubmitApiClient } from './ChangeRequestClient';

// Custom hook for cascading LOV options (Stream -> Application -> Module)
export const useCascadingLOV = () => {
    const [masterData, setMasterData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchMasterData = async () => {
            try {
                setLoading(true);
                const data = await masterApiClient.get('/api/get/LOV/allMasterProcessStreams');
                setMasterData(data);
            } catch (err) {
                console.error('Error fetching master data:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchMasterData();
    }, []);

    const streamOptions = masterData.map(stream => ({
        value: DOMPurify.sanitize(stream.stream_name || '', { ALLOWED_TAGS: [] }),
        label: DOMPurify.sanitize(stream.stream_name || '', { ALLOWED_TAGS: [] })
    }));

    const getApplicationOptions = (selectedStream) => {
        if (!selectedStream) return [];
        const stream = masterData.find(s => s.stream_name === selectedStream);
        return stream ? stream.applications.map(app => ({
            value: DOMPurify.sanitize(app.app_name || '', { ALLOWED_TAGS: [] }),
            label: DOMPurify.sanitize(app.app_name || '', { ALLOWED_TAGS: [] })
        })) : [];
    };

    const getModuleOptions = (selectedStream, selectedApplication) => {
        if (!selectedStream || !selectedApplication) return [];
        const stream = masterData.find(s => s.stream_name === selectedStream);
        if (!stream) return [];
        const application = stream.applications.find(app => app.app_name === selectedApplication);
        return application ? application.modules.map(module => ({
            value: DOMPurify.sanitize(module.module_name || '', { ALLOWED_TAGS: [] }),
            label: DOMPurify.sanitize(module.module_name || '', { ALLOWED_TAGS: [] })
        })) : [];
    };

    return { loading, error, streamOptions, getApplicationOptions, getModuleOptions };
};

// Custom hook for Project Phase LOV options
export const useProjectPhaseLOV = (projectId) => {
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProjectPhases = async () => {
            if (!projectId) {
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                const result = await ricewApiClient.get(`/ricew/LOV/projectPhase/getDropdownList?project_id=${projectId}`);
                if (result.success && result.data) {
                    const formattedOptions = result.data.map(item => ({
                        label: DOMPurify.sanitize(item.Phase_Code || '', { ALLOWED_TAGS: [] }),
                        value: DOMPurify.sanitize(item.Phase_Code || '', { ALLOWED_TAGS: [] }),
                        subLabel: DOMPurify.sanitize(item.Phase_Name || '', { ALLOWED_TAGS: [] }),
                        sortId: parseInt(item.Project_Phase_id, 10) || 0
                    })).sort((a, b) => a.sortId - b.sortId);
                    setOptions(formattedOptions);
                }
            } catch (err) {
                console.error('Error fetching Project Phase data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchProjectPhases();
    }, [projectId]);

    return { options, loading };
};

// Custom hook for RICEW LOV options (if needed for the autocomplete search)
export const useRicewLOV = (projectId) => {
    const [ricewData, setRicewData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchRicewData = async () => {
            if (!projectId) {
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                const result = await ricewApiClient.get(`/ricew/LOV/request-form/getDropdownList?Project_id=${projectId}`);
                if (result.success && result.data) {
                    setRicewData(result.data);
                }
            } catch (err) {
                console.error('Error fetching RICEW LOV data:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchRicewData();
    }, [projectId]);

    const ricewOptions = ricewData.map(item => ({
        value: DOMPurify.sanitize(item.RICE_ID || '', { ALLOWED_TAGS: [] }),
        label: DOMPurify.sanitize(item.RICE_ID || '', { ALLOWED_TAGS: [] }),
        subLabel: DOMPurify.sanitize(item.RICE_NAME || '', { ALLOWED_TAGS: [] })
    }));

    return { loading, error, ricewOptions, ricewData };
};

// Custom hook for Category and Sub-category LOV options
export const useCategorySubcategoryLOV = () => {
    const [masterData, setMasterData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCategoryData = async () => {
            try {
                setLoading(true);
                const result = await ricewApiClient.get('/ricew/LOV/categorySubcategory/getDropdownList');
                if (result.success && result.data) {
                    setMasterData(result.data);
                }
            } catch (err) {
                console.error('Error fetching Category data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchCategoryData();
    }, []);

    const categoryOptions = Array.from(new Set(masterData.map(item => item.Category_Code)))
        .map(code => {
            const item = masterData.find(i => i.Category_Code === code);
            return {
                label: DOMPurify.sanitize(item.Category_Code || '', { ALLOWED_TAGS: [] }),
                value: DOMPurify.sanitize(item.Category_Code || '', { ALLOWED_TAGS: [] }),
                subLabel: DOMPurify.sanitize(item.Category_Name || '', { ALLOWED_TAGS: [] }),
                sortId: parseInt(item.Category_Subcategory_id) || 0
            };
        }).sort((a, b) => a.sortId - b.sortId);

    const getSubcategoryOptions = (selectedCategoryCode) => {
        if (!selectedCategoryCode) return [];
        return masterData
            .filter(item => item.Category_Code === selectedCategoryCode)
            .map(item => ({
                label: DOMPurify.sanitize(item.Sub_Category_Code || '', { ALLOWED_TAGS: [] }),
                value: DOMPurify.sanitize(item.Sub_Category_Code || '', { ALLOWED_TAGS: [] }),
                subLabel: DOMPurify.sanitize(item.Sub_Category_Name || '', { ALLOWED_TAGS: [] }),
                sortId: parseInt(item.Category_Subcategory_id) || 0
            })).sort((a, b) => a.sortId - b.sortId);
    };

    return { categoryOptions, getSubcategoryOptions, loading };
};

// Custom hook for Roster LOV options (Resources)
export const useRosterLOV = (projectId) => {
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRosterData = async () => {
            if (!projectId) {
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                // Using the dedicated roster client with the same endpoint as Risk & Issue Roster
                const result = await rosterApiClient.get(`/ricew/resourceRoster/byProject?project_id=${projectId}`);
                if (result.success && result.data) {
                    const transformedOptions = result.data.map(item => ({
                        id: item.Resource_Roster_Form_id || '',
                        value: item.IC_full_name ? `${DOMPurify.sanitize(item.IC_full_name || '', { ALLOWED_TAGS: [] })} (${DOMPurify.sanitize(item.IC_email || '', { ALLOWED_TAGS: [] })})` : (item.Resource_Roster_Form_id || ''),
                        label: DOMPurify.sanitize(item.IC_full_name || '', { ALLOWED_TAGS: [] }),
                        subLabel: DOMPurify.sanitize(item.IC_email || '', { ALLOWED_TAGS: [] }),
                        displayName: DOMPurify.sanitize(item.IC_full_name || '', { ALLOWED_TAGS: [] }),
                        email: DOMPurify.sanitize(item.IC_email || '', { ALLOWED_TAGS: [] }),
                        userId: item.user_id || ''
                    })).filter(opt => opt.label !== '');

                    transformedOptions.sort((a, b) => a.label.localeCompare(b.label));
                    setOptions(transformedOptions);
                }
            } catch (err) {
                console.error('Error fetching Roster LOV data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchRosterData();
    }, [projectId]);

    return { options, loading };
};

// Custom hook for Client Roster LOV options (Clients)
export const useClientRosterLOV = (projectId) => {
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchClientRosterData = async () => {
            if (!projectId) {
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                // Using the client roster client
                const result = await clientRosterApiClient.get(`/ricew/ClientRosterForm/getAll?project_id=${projectId}`);
                if (result.success && result.data) {
                    const transformedOptions = result.data.map(item => ({
                        id: item.Resource_Roster_Form_id || item.SrNo || '',
                        value: item.Client_name ? `${DOMPurify.sanitize(item.Client_name || '', { ALLOWED_TAGS: [] })} (${DOMPurify.sanitize(item.Email_Address || '', { ALLOWED_TAGS: [] })})` : (item.Resource_Roster_Form_id || ''),
                        label: DOMPurify.sanitize(item.Client_name || '', { ALLOWED_TAGS: [] }),
                        subLabel: DOMPurify.sanitize(item.Email_Address || '', { ALLOWED_TAGS: [] }),
                        displayName: DOMPurify.sanitize(item.Client_name || '', { ALLOWED_TAGS: [] }),
                        email: DOMPurify.sanitize(item.Email_Address || '', { ALLOWED_TAGS: [] }),
                    })).filter(opt => opt.label !== '');

                    transformedOptions.sort((a, b) => a.label.localeCompare(b.label));
                    setOptions(transformedOptions);
                }
            } catch (err) {
                console.error('Error fetching Client Roster LOV data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchClientRosterData();
    }, [projectId]);

    return { options, loading };
};

// Custom hook for Organization Currency LOV options
export const useOrganizationCurrencyLOV = (projectId) => {
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCurrencyData = async () => {
            if (!projectId) {
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                const result = await changeRequestSubmitApiClient.get(`/LOV/organizationCurrency/getDropdownList?project_id=${projectId}`);
                if (result.success && result.data) {
                    // Extract unique currencies and format as dropdown options
                    const uniqueCurrencies = [...new Set(
                        result.data
                            .map(item => item.primary_currency)
                            .filter(Boolean)
                    )];
                    const formattedOptions = uniqueCurrencies
                        .sort((a, b) => a.localeCompare(b))
                        .map(currency => {
                            // Extract just the 3-letter code if it's in the format "Name (CODE)"
                            const match = currency.match(/\(([A-Z]{3})\)/);
                            const displayValue = match ? match[1] : currency;
                            return {
                                value: DOMPurify.sanitize(displayValue || '', { ALLOWED_TAGS: [] }),
                                label: DOMPurify.sanitize(displayValue || '', { ALLOWED_TAGS: [] })
                            };
                        });
                    setOptions(formattedOptions);
                }
            } catch (err) {
                console.error('Error fetching Organization Currency data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchCurrencyData();
    }, [projectId]);

    return { options, loading };
};
