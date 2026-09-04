import { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { masterApiClient, ricewApiClient } from './RiskAndIssueClient';

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

// Custom hook for RICEW LOV options
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

// Custom hook for Severity LOV options
export const useSeverityLOV = () => {
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSeverityData = async () => {
            try {
                setLoading(true);
                const result = await ricewApiClient.get('/ricew/LOV/riskIssueSeverity/getDropdownList');
                if (result.success && result.data) {
                    const formattedOptions = result.data.map(item => ({
                        label: DOMPurify.sanitize(item.Severity_Level || '', { ALLOWED_TAGS: [] }),
                        value: DOMPurify.sanitize(item.Severity_Level || '', { ALLOWED_TAGS: [] }),
                        sortId: parseInt(item.Risk_Issues_Severity_id) || 0
                    })).sort((a, b) => a.sortId - b.sortId);
                    setOptions(formattedOptions);
                }
            } catch (err) {
                console.error('Error fetching Severity data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchSeverityData();
    }, []);

    return { options, loading };
};

// Custom hook for Environment LOV options
export const useEnvironmentLOV = (projectId) => {
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEnvironmentData = async () => {
            if (!projectId) {
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                const result = await ricewApiClient.get(`/ricew/LOV/environment/getDropdownList?project_id=${projectId}`);
                if (result.success && result.data) {
                    const formattedOptions = result.data.map(item => ({
                        label: DOMPurify.sanitize(item.Environment_Code || '', { ALLOWED_TAGS: [] }),
                        value: DOMPurify.sanitize(item.Environment_Code || '', { ALLOWED_TAGS: [] }),
                        subLabel: DOMPurify.sanitize(item.Environment_Name || '', { ALLOWED_TAGS: [] }),
                        sortId: parseInt(item.Environment_id, 10) || 0
                    })).sort((a, b) => a.sortId - b.sortId);
                    setOptions(formattedOptions);
                }
            } catch (err) {
                console.error('Error fetching Environment data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchEnvironmentData();
    }, [projectId]);

    return { options, loading };
};

// Custom hook for Wave / Rollout LOV options
export const useWaveRolloutLOV = (projectId) => {
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWaveData = async () => {
            if (!projectId) {
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                const result = await ricewApiClient.get(`/ricew/LOV/waveRollout/getDropdownList?project_id=${projectId}`);
                if (result.success && result.data) {
                    const flattened = [];
                    result.data.forEach(wave => {
                        const waveId = parseInt(wave.waveRolloutId, 10) || 0;
                        if (wave.rolloutDefinitions && wave.rolloutDefinitions.length > 0) {
                            wave.rolloutDefinitions.forEach(rollout => {
                                const waveCode = DOMPurify.sanitize(wave.Wave_Code || '', { ALLOWED_TAGS: [] });
                                const rolloutCode = DOMPurify.sanitize(rollout.Rollout_Code || '', { ALLOWED_TAGS: [] });
                                const waveName = DOMPurify.sanitize(wave.Wave_Name || '', { ALLOWED_TAGS: [] });
                                const rolloutName = DOMPurify.sanitize(rollout.Rollout_Name || '', { ALLOWED_TAGS: [] });
                                flattened.push({
                                    label: `${waveCode} : ${rolloutCode}`,
                                    subLabel: `${waveName} - ${rolloutName}`,
                                    value: `${waveCode}_${rolloutCode}`,
                                    waveId,
                                    rolloutId: parseInt(rollout.rice_Rollout_Definition_id, 10) || 0
                                });
                            });
                        } else {
                            const waveCode = DOMPurify.sanitize(wave.Wave_Code || '', { ALLOWED_TAGS: [] });
                            const waveName = DOMPurify.sanitize(wave.Wave_Name || '', { ALLOWED_TAGS: [] });
                            flattened.push({
                                label: waveCode,
                                subLabel: waveName,
                                value: waveCode,
                                waveId,
                                rolloutId: 0
                            });
                        }
                    });
                    
                    // Sort by waveId first, then rolloutId (ascending)
                    flattened.sort((a, b) => {
                        if (a.waveId !== b.waveId) return a.waveId - b.waveId;
                        return a.rolloutId - b.rolloutId;
                    });
                    
                    setOptions(flattened);
                }
            } catch (err) {
                console.error('Error fetching Wave data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchWaveData();
    }, [projectId]);

    return { options, loading };
};

// Custom hook for Risk / Issue Status LOV options
export const useRiskIssueStatusLOV = (projectId) => {
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStatusData = async () => {
            if (!projectId) {
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                const result = await ricewApiClient.get(`/ricew/LOV/riskIssueStatus/getDropdownLists?project_id=${projectId}`);
                if (result.success && result.data) {
                    const formattedOptions = result.data.map(item => ({
                        label: DOMPurify.sanitize(item.Status_Name || '', { ALLOWED_TAGS: [] }),
                        value: DOMPurify.sanitize(item.Status_Name || '', { ALLOWED_TAGS: [] }),
                        sortId: parseInt(item.RiskIssueStatus_id, 10) || 0
                    })).sort((a, b) => a.sortId - b.sortId);
                    setOptions(formattedOptions);
                }
            } catch (err) {
                console.error('Error fetching Status data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchStatusData();
    }, [projectId]);

    return { options, loading };
};

// Custom hook for Roster data (Implementation and Client)
export const useRosterLOV = (projectId) => {
    const [rosterData, setRosterData] = useState({ implementation_roster: [], client_roster: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRosterData = async () => {
            if (!projectId) {
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                const result = await ricewApiClient.get(`/ricew/getRosterData?project_id=${projectId}`);
                if (result.success && result.data) {
                    setRosterData(result.data);
                }
            } catch (err) {
                console.error('Error fetching Roster data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchRosterData();
    }, [projectId]);

    const getRosterOptions = (ownerType) => {
        if (ownerType === 'Implementation Roster') {
            return (rosterData.implementation_roster || []).map(item => ({
                label: DOMPurify.sanitize(item.full_name || '', { ALLOWED_TAGS: [] }),
                value: DOMPurify.sanitize(item.email || '', { ALLOWED_TAGS: [] }),
                subLabel: DOMPurify.sanitize(item.email || '', { ALLOWED_TAGS: [] })
            }));
        } else if (ownerType === 'Client Roster') {
            return (rosterData.client_roster || []).map(item => ({
                label: DOMPurify.sanitize(item.full_name || '', { ALLOWED_TAGS: [] }),
                value: DOMPurify.sanitize(item.email || '', { ALLOWED_TAGS: [] }),
                subLabel: DOMPurify.sanitize(item.email || '', { ALLOWED_TAGS: [] })
            }));
        }
        return [];
    };

    return { getRosterOptions, loading, rosterData };
};
