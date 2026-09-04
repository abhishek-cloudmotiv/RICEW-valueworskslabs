import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, MoreVertical, Save, X, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { downloadRICEWTemplate, parseRICEWTemplate } from '../../utils/excelTemplateUtils';
import { getIdToken } from '../../utils/cognito-auth';

// Helper function to retry failed API calls
const fetchWithRetry = async (url, options = {}, retries = 3, delay = 2000) => {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            // Retry on server errors (5xx) or network errors (implicit in catch)
            if (response.status >= 500) {
                throw new Error(`Server error: ${response.status}`);
            }
            return response;
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, delay));
            console.log(`Retrying API call to ${url.split('?')[0]}... Attempt ${i + 2}`);
        }
    }
};

const RICEWEffortCostRateCard = ({ selectedProject, setUnsavedChangesChecker }) => {
    const navigate = useNavigate();
    const [showNoProjectSelectedPopup, setShowNoProjectSelectedPopup] = useState(false);

    useEffect(() => {
        const projectId = localStorage.getItem('project_id');
        if (!selectedProject?.id && !projectId) {
            setShowNoProjectSelectedPopup(true);
        }
    }, [selectedProject?.id]);

    const [maxWidth, setMaxWidth] = useState('1800px');
    const [marginRight, setMarginRight] = useState('30px');
    const [paddingBottom, setPaddingBottom] = useState('10px');
    const [extraBottomPadding, setExtraBottomPadding] = useState(0);

    // Message and confirmation states
    const [loading, setLoading] = useState(false);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [showErrorMessage, setShowErrorMessage] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Validation errors modal states
    const [showValidationErrorsModal, setShowValidationErrorsModal] = useState(false);
    const [validationErrorsList, setValidationErrorsList] = useState([]);

    // Confirmation dialog states
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const [confirmMessage, setConfirmMessage] = useState('');

    // Field-level validation errors state for required fields (per row/field)
    const [fieldErrors, setFieldErrors] = useState({});

    // Summary data state
    const [totalEffortHours, setTotalEffortHours] = useState('0');
    const [totalCost, setTotalCost] = useState('0');

    // Populate Project modal states
    const [showPopulateModal, setShowPopulateModal] = useState(false);
    const [populateProjectName, setPopulateProjectName] = useState('');
    const [populateRicewStatus, setPopulateRicewStatus] = useState('');
    const [populateStatusLOV, setPopulateStatusLOV] = useState([]);
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [previousPopulateRicewStatus, setPreviousPopulateRicewStatus] = useState(''); // Store previous value for restore on blur

    // Required fields list
    const requiredFields = [
        'RICEW Name',
        'Object Type',
        'RICEW Description',
        'Process Stream',
        'Application',
        'Complexity',
        'Upload Template Name'
    ];

    const isBlankValue = (value) => value === null || value === undefined || String(value).trim() === '';
    const hasOrganizationAndServiceLine = (row) =>
        !isBlankValue(row['Organization Name']) && !isBlankValue(row['Service Line']);


    // Uploaded data state
    const [uploadedData, setUploadedData] = useState([]);

    // Editing state - tracks which cell is being edited
    const [editingCell, setEditingCell] = useState(null); // { rowIndex: number, field: string }
    const [editValue, setEditValue] = useState('');
    const [previousValue, setPreviousValue] = useState(''); // Store original value before editing
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const [inlineError, setInlineError] = useState(null); // New state for inline validation errors
    const dropdownInputRef = useRef(null);

    const dropdownContainerRef = useRef(null);
    const editingCellContainerRef = useRef(null);
    const populateStatusRef = useRef(null);
    const populateStatusInputRef = useRef(null); // Ref for the RICEW Status input field
    const isSelectingStatusRef = useRef(false); // Track if a selection is being made

    // Row editing state
    const [editingRowIndex, setEditingRowIndex] = useState(null);
    const [originalRowData, setOriginalRowData] = useState(null);

    // Delete selection state
    const [selectedRowsForDeletion, setSelectedRowsForDeletion] = useState([]);
    const [selectAllForDeletion, setSelectAllForDeletion] = useState(false);

    // General selection state (next to Populated)
    const [selectedRows, setSelectedRows] = useState([]);
    const [selectAll, setSelectAll] = useState(false);



    // LOV Data States
    const [ricewTypeLOV, setRicewTypeLOV] = useState([]);
    const [masterProcessStreamData, setMasterProcessStreamData] = useState([]);
    const [ricewStatusLOV, setRicewStatusLOV] = useState([]);
    const [rateCardLOV, setRateCardLOV] = useState([]);
    const [waveRolloutLOV, setWaveRolloutLOV] = useState([]);
    const [legalEntityLOV, setLegalEntityLOV] = useState([]);
    const [resourceRosterLOV, setResourceRosterLOV] = useState([]);
    const [orgServiceLineLOV, setOrgServiceLineLOV] = useState([]);

    // Column min widths (matching header cells)
    // Column min widths (matching header cells)
    const columnMinWidths = [48, 96, 96, 144, 112, 96, 80];
    const totalCellMinWidth = columnMinWidths.reduce((sum, width) => sum + width, 0);
    const tableContentWidth = totalCellMinWidth + (32 * 24) + 132 + 150 + 400; // Increased for extra columns

    // Sorting Helper Function
    const sortRecords = (data) => {
        return [...data].sort((a, b) => {
            // Define priority groups based on Processed and Populated status
            const getGroup = (item) => {
                const isProcessed = item['Processed (Interface Table)'] === 'Yes';
                const isPopulated = item['Populated'] === 'Yes';

                if (!isProcessed) return 1; // Group 1: Not Processed
                if (isProcessed && !isPopulated) return 2; // Group 2: Processed but NOT Populated
                return 3; // Group 3: Both Processed and Populated
            };

            const groupA = getGroup(a);
            const groupB = getGroup(b);

            // Sort by priority group first
            if (groupA !== groupB) {
                return groupA - groupB;
            }

            // Tie-breaking (within same group): Full updated_timestamp DESC (latest first)
            const aTs = a.updated_timestamp || '';
            const bTs = b.updated_timestamp || '';

            if (aTs !== bTs) {
                return bTs.localeCompare(aTs);
            }

            // Same timestamp: sort by RICEW_Effort_Cost_Rate_Card_form_2_id DESC (highest first)
            const aId = parseInt(a.RICEW_Effort_Cost_Rate_Card_form_2_id) || 0;
            const bId = parseInt(b.RICEW_Effort_Cost_Rate_Card_form_2_id) || 0;

            return bId - aId;
        });
    };

    useEffect(() => {
        const handleZoomChange = () => {
            const zoomLevel = Math.round((window.outerWidth / window.innerWidth) * 100);

            if (zoomLevel <= 68) {
                setMaxWidth('2800px');
                setMarginRight('80px');
            } else if (zoomLevel <= 80) {
                setMaxWidth('2200px');
                setMarginRight('50px');
            } else {
                setMaxWidth('1800px');
                setMarginRight('0px');
                setPaddingBottom('10px');
            }
        };

        window.addEventListener('resize', handleZoomChange);
        handleZoomChange();

        return () => window.removeEventListener('resize', handleZoomChange);
    }, []);

    // Load data with calculation flow on page load
    useEffect(() => {
        if (selectedProject?.id) {
            handleCalculate();
        }

        // Also fetch status LOV
        const fetchStatusLOV = async () => {
            try {
                let idToken = null;
                try {
                    idToken = await getIdToken();
                } catch (tokenError) {
                    console.error('Failed to get ID token for status LOV:', tokenError);
                }

                const headers = {
                    'Content-Type': 'application/json'
                };
                if (idToken) {
                    headers['Authorization'] = `Bearer ${idToken}`;
                }

                const response = await fetchWithRetry('https://7o6jl6k0pd.execute-api.ap-south-1.amazonaws.com/New/LOV/ricew/get/ricew-status', {
                    headers
                });
                const result = await response.json();

                if (result.success && Array.isArray(result.data)) {
                    // Sort by RICEW_Status_Id as requested
                    const sortedList = result.data.sort((a, b) =>
                        parseInt(a.RICEW_Status_Id) - parseInt(b.RICEW_Status_Id)
                    );
                    setPopulateStatusLOV(sortedList);
                }
            } catch (error) {
                console.error('Error fetching RICEW status LOV:', error);
            }
        };

        fetchStatusLOV();

        // Fetch Organization and Service Line LOV for lookups
        const fetchOrgServiceLineLOV = async () => {
            try {
                let idToken = null;
                try {
                    idToken = await getIdToken();
                } catch (tokenError) {
                    console.error('Failed to get ID token for LOV:', tokenError);
                }

                const headers = { 'Content-Type': 'application/json' };
                if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

                const projectId = localStorage.getItem('project_id') || selectedProject?.id || 101;
                const response = await fetchWithRetry(`https://tfv4q9mq6g.execute-api.ap-south-1.amazonaws.com/New/ricew/resourceRateCard/LOV/si-organization-details?project_id=${projectId}`, {
                    headers
                });
                const result = await response.json();

                if (result.success && Array.isArray(result.data)) {
                    const mappedData = [];
                    result.data.forEach(item => {
                        if (item.Process_Service_Val_Array && Array.isArray(item.Process_Service_Val_Array) && item.Process_Service_Val_Array.length > 0) {
                            item.Process_Service_Val_Array.forEach(sl => {
                                mappedData.push({
                                    organization_name: item.SI_organization_name,
                                    organization_id: item.SI_Organization_Details_id,
                                    ServiceLine_name: sl
                                });
                            });
                        } else {
                            mappedData.push({
                                organization_name: item.SI_organization_name,
                                organization_id: item.SI_Organization_Details_id,
                                ServiceLine_name: ''
                            });
                        }
                    });
                    setOrgServiceLineLOV(mappedData);
                }
            } catch (error) {
                console.error('Error fetching Org/Service Line LOV:', error);
            }
        };

        fetchOrgServiceLineLOV();
    }, [selectedProject?.id]);

    // Re-trigger calculation when Organization LOV is populated to ensure correct name mapping
    useEffect(() => {
        if (orgServiceLineLOV.length > 0) {
            handleCalculate();
        }
    }, [orgServiceLineLOV]);

    // Set up unsaved changes checker for navigation guard
    useEffect(() => {
        if (setUnsavedChangesChecker) {
            setUnsavedChangesChecker(() => () => {
                // Check if there are any unsaved calculated records (records without isSaved flag)
                const hasUnsavedRecords = uploadedData.some(row => !row.isSaved);
                return hasUnsavedRecords;
            });
        }

        // Cleanup: remove checker when component unmounts
        return () => {
            if (setUnsavedChangesChecker) {
                setUnsavedChangesChecker(null);
            }
        };
    }, [uploadedData, setUnsavedChangesChecker]);


    // Close Populate Status Dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (populateStatusRef.current && !populateStatusRef.current.contains(event.target)) {
                setShowStatusDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleCalculate = async () => {
        try {
            setLoading(true);
            setSuccessMessage("Loading data...");
            setShowSuccessMessage(true);

            let idToken = null;
            try {
                idToken = await getIdToken();
            } catch (tokenError) {
                console.error('Failed to get ID token for fetch:', tokenError);
            }

            const headers = {
                'Content-Type': 'application/json'
            };
            if (idToken) {
                headers['Authorization'] = `Bearer ${idToken}`;
            }

            // Step 1: Fetch all records from the GET API
            const projectId = localStorage.getItem('project_id') || selectedProject?.id?.toString() || '101';
            const response = await fetchWithRetry(`https://hjcf2fs1n0.execute-api.ap-south-1.amazonaws.com/New/mass-upload-form/ricew/get?project_id=${projectId}`, {
                headers
            });

            const result = await response.json();

            let backendData = [];
            if (response.ok && Array.isArray(result.data)) {
                backendData = result.data;
            } else if (response.status === 404) {
                backendData = []; // No records found, treat as empty
            } else if (!response.ok) {
                // Throw error to be caught below if not 404 and not OK
                throw new Error(result.error || result.message || 'Failed to fetch data');
            }

            // Always proceed if OK or 404 (empty data)
            // Sort data by RICEW_Mass_Upload_Form_id (ascending)
            const sortedData = [...backendData].sort((a, b) => {
                const idA = parseInt(a.RICEW_Mass_Upload_Form_id?.S || a.RICEW_Mass_Upload_Form_id || '0');
                const idB = parseInt(b.RICEW_Mass_Upload_Form_id?.S || b.RICEW_Mass_Upload_Form_id || '0');
                return idA - idB;
            });

            // Map RICEW Type to Estimation_Name (plural form)
            const ricewTypeMapping = {
                'Integration': 'Integrations',
                'Integrations': 'Integrations',
                'Conversion': 'Conversions',
                'Conversions': 'Conversions',
                'Report': 'Reports',
                'Reports': 'Reports',
                'Analytics Report': 'Analytics Reports',
                'Analytics Reports': 'Analytics Reports',
                'Alert': 'Alert',
                'Alerts': 'Alert',
                'Workflow': 'Workflow',
                'Personalization': 'Personalization',
                'Extension': 'Extensions',
                'Extensions': 'Extensions'
            };

            // Step 2: Prepare records for bulk calculation
            const calculationRecords = sortedData.map(item => ({
                project_id: projectId,
                organization_id: item.organization_id?.S || item.organization_id || '',
                Service_Line_name: item.Service_Line_name?.S || item.Service_Line_name || '',
                Estimation_Name: ricewTypeMapping[item.RICEW_Object_Type?.S || ''] || item.RICEW_Object_Type?.S || '',
                ComplexityType: item.RICEW_Complexity?.S || '',
                Process_Stream: item.RICEW_Process_Name?.S || '',
                RICEW_Mass_Upload_Form_id: item.RICEW_Mass_Upload_Form_id?.S || item.RICEW_Mass_Upload_Form_id || ''
            })).filter(record => record.Estimation_Name && record.ComplexityType && record.Process_Stream && record.organization_id && record.Service_Line_name);

            if (calculationRecords.length === 0) {
                // If no records to calculate, just show the fetched data (if any)
                const mappedData = sortedData.map(item => ({
                    'RICEW_Mass_Upload_Form_id': item.RICEW_Mass_Upload_Form_id?.S || item.RICEW_Mass_Upload_Form_id || '',
                    'RICEW Name': item.RICEW_Name?.S || '',
                    'RICEW Description': item.RICEW_Description?.S || '',
                    'Process Stream': item.RICEW_Process_Name?.S || '',
                    'Application': item.RICEW_Application?.S || '',
                    'Object Type': item.RICEW_Object_Type?.S || '',
                    'Complexity': item.RICEW_Complexity?.S || '',
                    'Upload Template Name': item.Upload_Template_Name?.S || '',
                    'Populated': '',
                    'Processed (Interface Table)': 'No',
                    'Effort (Hours)': item.RICEW_Effort_Hours?.S || '',
                    'Cost (Currency)': item.RICEW_Cost?.S || ''
                }));
                // Even if empty, we set it to clear the table
                setUploadedData(mappedData);

                if (sortedData.length === 0) {
                    setErrorMessage('No records found for calculation.');
                } else {
                    setErrorMessage('No valid records found for calculation (missing required fields).');
                }
                setShowErrorMessage(true);
                setShowSuccessMessage(false);
                setTimeout(() => setShowErrorMessage(false), 5000);
                return;
            }

            // Step 3: Call bulk calculation API
            setSuccessMessage("Calculating effort and cost...");

            const calcResponse = await fetchWithRetry('https://fr4i5ak8bd.execute-api.ap-south-1.amazonaws.com/New/mass-upload-form-2/ricew/bulkCalculation', {
                method: 'POST',
                headers,
                body: JSON.stringify({ records: calculationRecords })
            });

            const calcResult = await calcResponse.json();

            if (calcResponse.ok && calcResult.success && Array.isArray(calcResult.results)) {
                // Step 4: Fetch saved records from effort-cost-rate-card API
                let savedRecords = [];
                try {
                    const projectId = localStorage.getItem('project_id') || selectedProject?.id?.toString() || '101';
                    const savedResponse = await fetchWithRetry(`https://fr4i5ak8bd.execute-api.ap-south-1.amazonaws.com/New/mass-upload-form-2/ricew/effort-cost-rate-card/get?project_id=${projectId}`, {
                        headers
                    });
                    const savedResult = await savedResponse.json();

                    if (savedResponse.ok && Array.isArray(savedResult.data)) {
                        savedRecords = savedResult.data.map(item => ({
                            'RICEW_Mass_Upload_Form_id': item.RICEW_Mass_Upload_Form_id?.S || item.RICEW_Mass_Upload_Form_id || '',
                            'RICEW_Effort_Cost_Rate_Card_form_2_id': item.RICEW_Effort_Cost_Rate_Card_form_2_id?.S || item.RICEW_Effort_Cost_Rate_Card_form_2_id || '',
                            'RICEW Name': item.RICEW_Name?.S || '',
                            'RICEW Description': item.RICEW_Description?.S || '',
                            'Process Stream': item.Process_Stream?.S || '',
                            'Application': item.Application?.S || '',
                            'Object Type': item.Object_Type?.S || '',
                            'Complexity': item.Complexity?.S || '',
                            'Upload Template Name': item.Upload_Template_Name?.S || '',
                            'Populated': (item.Populated?.S === 'true' || item.Populated === 'true') ? 'Yes' : '',
                            'Processed (Interface Table)': (item.processed_in?.S === 'true' || item.processed_in === 'true') ? 'Yes' : 'No',
                            'Effort (Hours)': item.Effort_Hours?.S || '',
                            'Cost (Currency)': item.Cost_Currency?.S || '',
                            'OR_PL_Currency': item.OR_PL_Currency?.S || item.OR_BL_Currency?.S || '',
                            'Organization Name': (() => {
                                const orgId = item.organization_id?.S || item.organization_id ? String(item.organization_id?.S || item.organization_id) : '';
                                const org = orgServiceLineLOV.find(o => String(o.organization_id) === orgId);
                                if (org) return org.organization_name;
                                return item.Organization_Name?.S || item.Organization_Name || orgId;
                            })(),
                            'Service Line': item.Service_Line_Name?.S || item.Service_Line_Name || item.Service_Line_name?.S || '',
                            'organization_id': item.organization_id?.S || item.organization_id || '',
                            'Service_Line_name': item.Service_Line_name?.S || item.Service_Line_name || '',
                            'created_timestamp': item.created_timestamp?.S || item.created_timestamp || '',
                            'updated_timestamp': item.updated_timestamp?.S || item.updated_timestamp || item.created_timestamp?.S || item.created_timestamp || '',
                            'isSaved': true // Flag to indicate this record is already saved
                        }));
                    }
                } catch (error) {
                    console.error('Error fetching saved records:', error);
                }

                // Step 4.5: Fetch summary data
                try {
                    const projectId = localStorage.getItem('project_id') || selectedProject?.id?.toString() || '101';
                    const summaryResponse = await fetchWithRetry(`https://fr4i5ak8bd.execute-api.ap-south-1.amazonaws.com/New/mass-upload-form-2/ricew/effort-cost-summary/get?project_id=${projectId}`, {
                        headers
                    });
                    const summaryResult = await summaryResponse.json();
                    if (summaryResponse.ok && summaryResult.data) {
                        setTotalEffortHours(summaryResult.data.total_effort_hours || '0');
                        setTotalCost(summaryResult.data.total_cost_currency || '0');
                    }
                } catch (error) {
                    console.error('Error fetching summary data:', error);
                }

                // Step 5: Map calculated data and filter out records that already exist in saved data
                const savedIds = new Set(savedRecords.map(r => r['RICEW_Mass_Upload_Form_id']));

                const newCalculatedRecords = sortedData
                    .filter(item => {
                        const recordId = item.RICEW_Mass_Upload_Form_id?.S || item.RICEW_Mass_Upload_Form_id || '';
                        return !savedIds.has(recordId); // Only include if not in saved records
                    })
                    .map(item => {
                        const recordId = item.RICEW_Mass_Upload_Form_id?.S || item.RICEW_Mass_Upload_Form_id || '';

                        // Find the corresponding calculation result
                        const calcData = calcResult.results.find(r =>
                            r.success && r.record.RICEW_Mass_Upload_Form_id === recordId
                        );

                        let effortHours = item.RICEW_Effort_Hours?.S || '';
                        let costCurrency = item.RICEW_Cost?.S || '';

                        // Update with calculated values if available
                        if (calcData && calcData.data) {
                            effortHours = calcData.data.Effort_Hours || effortHours;

                            // Format cost with currency
                            const cost = calcData.data.Cost || '';
                            const currency = calcData.data.Currency || '';

                            if (cost && currency) {
                                costCurrency = `${cost} (${currency})`;
                            } else if (cost) {
                                costCurrency = cost;
                            }
                            item.OR_PL_Currency = currency; // Store raw currency for mapping
                        }

                        return {
                            'RICEW_Mass_Upload_Form_id': recordId,
                            'RICEW Name': item.RICEW_Name?.S || '',
                            'RICEW Description': item.RICEW_Description?.S || '',
                            'Process Stream': item.RICEW_Process_Name?.S || '',
                            'Application': item.RICEW_Application?.S || '',
                            'Object Type': item.RICEW_Object_Type?.S || '',
                            'Complexity': item.RICEW_Complexity?.S || '',
                            'Upload Template Name': item.Upload_Template_Name?.S || '',
                            'Populated': '',
                            'Processed (Interface Table)': 'No',
                            'Effort (Hours)': effortHours,
                            'Cost (Currency)': costCurrency,
                            'OR_PL_Currency': item.OR_PL_Currency || '',
                            'Organization Name': (() => {
                                const orgId = item.organization_id?.S || item.organization_id ? String(item.organization_id?.S || item.organization_id) : '';
                                const org = orgServiceLineLOV.find(o => String(o.organization_id) === orgId);
                                if (org) return org.organization_name;
                                return item.Organization_Name?.S || item.Organization_Name || orgId;
                            })(),
                            'Service Line': item.Service_Line_Name?.S || item.Service_Line_Name || item.Service_Line_name?.S || '',
                            'organization_id': item.organization_id?.S || item.organization_id || '',
                            'Service_Line_name': item.Service_Line_name?.S || item.Service_Line_name || '',
                            'created_timestamp': item.created_timestamp?.S || item.created_timestamp || '',
                            'updated_timestamp': item.updated_timestamp?.S || item.updated_timestamp || item.created_timestamp?.S || item.created_timestamp || '',
                            'isSaved': false
                        };
                    });

                // Step 6: Combine saved records (first) with new calculated records (below)
                const combinedData = [...savedRecords, ...newCalculatedRecords];
                setUploadedData(sortRecords(combinedData));
                setSelectedRows([]); // Clear selection after recalculation
                setSelectAll(false);

                // Count successful calculations
                const successCount = calcResult.results.filter(r => r.success).length;
                const failCount = calcResult.results.filter(r => !r.success).length;

                if (failCount > 0) {
                    setSuccessMessage(`Calculation complete: ${successCount} successful, ${failCount} failed. Showing ${savedRecords.length} saved + ${newCalculatedRecords.length} new records.`);
                } else {
                    setSuccessMessage(`Successfully calculated ${successCount} record(s)! Showing ${savedRecords.length} saved + ${newCalculatedRecords.length} new records.`);
                }

                setTimeout(() => setShowSuccessMessage(false), 4000);
            } else {
                // If calculation fails, still show the fetched data
                const mappedData = sortedData.map(item => ({
                    'RICEW_Mass_Upload_Form_id': item.RICEW_Mass_Upload_Form_id?.S || item.RICEW_Mass_Upload_Form_id || '',
                    'RICEW Name': item.RICEW_Name?.S || '',
                    'RICEW Description': item.RICEW_Description?.S || '',
                    'Process Stream': item.RICEW_Process_Name?.S || '',
                    'Application': item.RICEW_Application?.S || '',
                    'Object Type': item.RICEW_Object_Type?.S || '',
                    'Complexity': item.RICEW_Complexity?.S || '',
                    'Upload Template Name': item.Upload_Template_Name?.S || '',
                    'Populated': '',
                    'Processed (Interface Table)': 'No',
                    'Effort (Hours)': item.RICEW_Effort_Hours?.S || '',
                    'Cost (Currency)': item.RICEW_Cost?.S || ''
                }));

                setUploadedData(mappedData);
                setErrorMessage(calcResult.error || 'Calculation failed, showing fetched data');
                setShowErrorMessage(true);
                setShowSuccessMessage(false);
                setTimeout(() => setShowErrorMessage(false), 5000);
            }
        } catch (error) {
            console.error('Error in calculation process:', error);
            setErrorMessage(`Error: ${error.message || 'Network error during calculation'}`);
            setShowErrorMessage(true);
            setShowSuccessMessage(false);
            setTimeout(() => setShowErrorMessage(false), 5000);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmYes = () => {
        if (confirmAction) {
            confirmAction();
        }
        setShowConfirmDialog(false);
        setConfirmAction(null);
        setConfirmMessage('');
    };

    const handleConfirmCancel = () => {
        setShowConfirmDialog(false);
        setConfirmAction(null);
        setConfirmMessage('');
    };

    const handleSave = async () => {
        if (uploadedData.length === 0) {
            setErrorMessage('No data to process. Please calculate first.');
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 3000);
            return;
        }

        if (selectedRows.length === 0) {
            setErrorMessage('Please select records to process.');
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 3000);
            return;
        }

        const selectedForProcessing = uploadedData.filter((row, idx) =>
            selectedRows.includes(idx) &&
            row['Effort (Hours)'] &&
            row['Cost (Currency)'] &&
            !row['isSaved']
        );

        const missingOrgServiceForProcessing = selectedForProcessing.filter(row => !hasOrganizationAndServiceLine(row));
        if (missingOrgServiceForProcessing.length > 0) {
            setErrorMessage(`Please add Organization Name and Service Line for ${missingOrgServiceForProcessing.length} selected record(s) before processing to Interface Table.`);
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 4000);
            return;
        }

        // Filter selected records that have calculated effort and cost values AND are not already saved
        const saveProjectId = localStorage.getItem('project_id') || selectedProject?.id?.toString() || '101';
        const saveUserId = localStorage.getItem('user_id') || '1';
        const saveCreatedBy = localStorage.getItem('user_id') || '1';

        const recordsToSave = selectedForProcessing.map(row => ({
            RICEW_Mass_Upload_Form_id: row['RICEW_Mass_Upload_Form_id'] || '',
            RICEW_Name: row['RICEW Name'] || '',
            RICEW_Description: row['RICEW Description'] || '',
            Process_Stream: row['Process Stream'] || '',
            Application: '',
            Object_Type: row['Object Type'] || '',
            Complexity: row['Complexity'] || '',
            organization_id: row['organization_id'] || '',
            Service_Line_name: row['Service_Line_name'] || '',
            Upload_Template_Name: row['Upload Template Name'] || '',
            Effort_Hours: row['Effort (Hours)'] || '',
            Cost_Currency: row['Cost (Currency)'] || '',
            OR_PL_Currency: row['OR_PL_Currency'] || '',
            project_id: saveProjectId,
            user_id: saveUserId,
            created_by: saveCreatedBy
        }));

        const alreadySavedCount = uploadedData.filter((row, idx) => selectedRows.includes(idx) && row.isSaved).length;

        const executeSave = async () => {
            try {
                setLoading(true);
                setSuccessMessage(`Processing ${recordsToSave.length} record(s)...`);
                setShowSuccessMessage(true);

                let idToken = null;
                try {
                    idToken = await getIdToken();
                } catch (tokenError) {
                    console.error('Failed to get ID token for save:', tokenError);
                }

                const headers = {
                    'Content-Type': 'application/json'
                };
                if (idToken) {
                    headers['Authorization'] = `Bearer ${idToken}`;
                }

                const postResponse = await fetchWithRetry('https://fr4i5ak8bd.execute-api.ap-south-1.amazonaws.com/New/mass-upload-form-2/ricew/effort-cost-rate-card/post', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ records: recordsToSave })
                });

                const postResult = await postResponse.json();

                if (postResponse.ok) {
                    console.log('Successfully saved to form 2:', postResult);
                    const { success_count, fail_count } = postResult.data || {};

                    // Mark the saved records as saved
                    setUploadedData(prevData => {
                        const updatedData = prevData.map(row => {
                            // If this row was in the recordsToSave list, mark it as saved
                            const wasSaved = recordsToSave.some(savedRow =>
                                savedRow.RICEW_Mass_Upload_Form_id === row['RICEW_Mass_Upload_Form_id']
                            );
                            if (wasSaved) {
                                // Also update the form 2 ID if available from the postResult
                                const savedRecordDetails = postResult.data?.success_records?.find(sr =>
                                    sr.RICEW_Mass_Upload_Form_id === row['RICEW_Mass_Upload_Form_id']
                                );
                                return {
                                    ...row,
                                    isSaved: true,
                                    'Processed (Interface Table)': 'Yes',
                                    'RICEW_Effort_Cost_Rate_Card_form_2_id': savedRecordDetails?.RICEW_Effort_Cost_Rate_Card_form_2_id || row['RICEW_Effort_Cost_Rate_Card_form_2_id']
                                };
                            }
                            return row;
                        });
                        return sortRecords(updatedData);
                    });
                    setSelectedRows([]); // Clear selection after save
                    setSelectAll(false);

                    if (fail_count && fail_count > 0) {
                        setSuccessMessage(`Processed with issues: ${success_count || 0} successful, ${fail_count} failed`);
                    } else {
                        setSuccessMessage(`Successfully processed ${recordsToSave.length} record(s)!`);
                    }
                    setSelectedRows([]); // Clear selection after save
                    setSelectAll(false);
                    setTimeout(() => setShowSuccessMessage(false), 4000);
                } else {
                    console.error('Failed to save to form 2:', postResult);
                    setErrorMessage(`Failed to process: ${postResult.error || postResult.message || 'Unknown error'}`);
                    setShowErrorMessage(true);
                    setShowSuccessMessage(false);
                    setTimeout(() => setShowErrorMessage(false), 5000);
                }
            } catch (error) {
                console.error('Error saving records:', error);
                setErrorMessage(`Error: ${error.message || 'Network error during processing'}`);
                setShowErrorMessage(true);
                setShowSuccessMessage(false);
                setTimeout(() => setShowErrorMessage(false), 5000);
            } finally {
                setLoading(false);
            }
        };

        if (recordsToSave.length === 0) {
            setErrorMessage('None of the selected records are ready to be processed (either already processed or not calculated).');
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 3000);
            return;
        }

        if (alreadySavedCount > 0) {
            setConfirmMessage(`You have selected ${selectedRows.length} record(s).\n\n- Ready to process: ${recordsToSave.length}\n- Already processed: ${alreadySavedCount}\n\nOnly the ${recordsToSave.length} unprocessed records will be handled. Do you want to continue?`);
            setConfirmAction(() => executeSave);
            setShowConfirmDialog(true);
        } else {
            executeSave();
        }
    };

    const handlePopulateProject = () => {
        // Check if any rows are selected
        if (selectedRows.length === 0) {
            setErrorMessage('Please select at least one record to populate.');
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 3000);
            return;
        }

        const unsavedSelectedCount = uploadedData.filter((row, idx) => selectedRows.includes(idx) && !row.isSaved).length;
        const savedSelectedCount = uploadedData.filter((row, idx) => selectedRows.includes(idx) && row.isSaved).length;

        const openPopulateModal = () => {
            // Set the project name automatically
            setPopulateProjectName(selectedProject?.name || '');
            setPopulateRicewStatus('');
            setShowPopulateModal(true);
        };

        const eligibleForPopulate = uploadedData.filter((row, idx) =>
            selectedRows.includes(idx) && row.isSaved && row['Populated'] !== 'Yes'
        );
        const missingOrgServiceForPopulate = eligibleForPopulate.filter(row => !hasOrganizationAndServiceLine(row));
        if (missingOrgServiceForPopulate.length > 0) {
            setErrorMessage(`Please add Organization Name and Service Line for ${missingOrgServiceForPopulate.length} selected record(s) before populating the project.`);
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 4000);
            return;
        }

        if (savedSelectedCount === 0) {
            setErrorMessage('None of the selected records are saved. Only saved records can be populated.');
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 3000);
            return;
        }

        if (unsavedSelectedCount > 0) {
            setConfirmMessage(`You have selected ${selectedRows.length} record(s).\n\n- Ready to populate: ${savedSelectedCount} (Saved)\n- Cannot populate: ${unsavedSelectedCount} (Unsaved)\n\nThese ${unsavedSelectedCount} unsaved records will not be considered. Do you want to continue?`);
            setConfirmAction(() => openPopulateModal);
            setShowConfirmDialog(true);
        } else {
            openPopulateModal();
        }
    };

    const handlePopulateSubmit = async () => {
        if (!populateRicewStatus) {
            setErrorMessage('Please select a RICEW Status');
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 3000);
            return;
        }

        try {
            setLoading(true);
            setSuccessMessage('Populating project data...');
            setShowSuccessMessage(true);

            // Get ID token for authentication
            let idToken = null;
            try {
                idToken = await getIdToken();
            } catch (tokenError) {
                console.error('Failed to get ID token:', tokenError);
            }

            const headers = {
                'Content-Type': 'application/json'
            };
            if (idToken) {
                headers['Authorization'] = `Bearer ${idToken}`;
            }

            // Prepare records array with RICEW_Effort_Cost_Rate_Card_form_2_id and RICEW_Status
            // Only for the selected rows that are saved
            const selectedSavedRecords = uploadedData
                .filter((row, index) => selectedRows.includes(index) && row.isSaved)
                .map(row => ({
                    id: row['RICEW_Effort_Cost_Rate_Card_form_2_id'] || row.RICEW_Mass_Upload_Form_id, // Fallback to form 1 ID if form 2 ID not directly on row
                    RICEW_Status: populateRicewStatus
                }));

            // If some selected records don't have form 2 ID directly, we might need to match them from the fetch
            // Let's refine this to be more robust
            const projectId = localStorage.getItem('project_id') || selectedProject?.id?.toString() || '101';
            const savedResponse = await fetchWithRetry(`https://fr4i5ak8bd.execute-api.ap-south-1.amazonaws.com/New/mass-upload-form-2/ricew/effort-cost-rate-card/get?project_id=${projectId}`, {
                headers
            });

            const savedResult = await savedResponse.json();

            if (!savedResponse.ok || !Array.isArray(savedResult.data)) {
                throw new Error('Failed to fetch saved records');
            }

            // Create a mapping of Form 1 ID to Form 2 ID
            const form1ToForm2Map = {};
            savedResult.data.forEach(item => {
                const f1Id = item.RICEW_Mass_Upload_Form_id?.S || item.RICEW_Mass_Upload_Form_id;
                const f2Id = item.RICEW_Effort_Cost_Rate_Card_form_2_id?.S || item.RICEW_Effort_Cost_Rate_Card_form_2_id;
                if (f1Id) form1ToForm2Map[f1Id] = f2Id;
            });

            const records = uploadedData
                .filter((row, index) => selectedRows.includes(index))
                .map(row => {
                    const f1Id = row.RICEW_Mass_Upload_Form_id;
                    const f2Id = form1ToForm2Map[f1Id];
                    return {
                        id: f2Id,
                        RICEW_Status: populateRicewStatus
                    };
                })
                .filter(rec => rec.id); // Only include records that have a form 2 ID

            if (records.length === 0) {
                setErrorMessage('No saved records found to populate');
                setShowErrorMessage(true);
                setShowSuccessMessage(false);
                setTimeout(() => setShowErrorMessage(false), 3000);
                setLoading(false);
                return;
            }

            // Call the map-effort-cost-to-request-form API
            const response = await fetchWithRetry('https://fr4i5ak8bd.execute-api.ap-south-1.amazonaws.com/New/mass-upload-form-2/ricew/map-effort-cost-to-request-form', {
                method: 'POST',
                headers,
                body: JSON.stringify(records)
            });

            const result = await response.json();

            if (response.ok) {
                const { total_records, mapped_records } = result.data || {};
                const successCount = mapped_records?.filter(r => r.status === 'success').length || 0;
                const skippedCount = mapped_records?.filter(r => r.status === 'skipped').length || 0;
                const failedCount = mapped_records?.filter(r => r.status === 'failed').length || 0;

                // Close modal
                setShowPopulateModal(false);

                // Show success message with details
                let message = `Successfully populated ${successCount} record(s)`;
                if (skippedCount > 0) {
                    message += `, ${skippedCount} already populated`;
                }
                if (failedCount > 0) {
                    message += `, ${failedCount} failed`;
                }

                setSuccessMessage(message);
                setShowSuccessMessage(true);
                setTimeout(() => setShowSuccessMessage(false), 5000);

                // Refresh the data to reflect the updated "Populated" status
                // Wait a bit before refreshing to ensure backend has updated
                setTimeout(async () => {
                    try {
                        const refreshProjectId = localStorage.getItem('project_id') || selectedProject?.id?.toString() || '101';
                        const refreshResponse = await fetchWithRetry(`https://fr4i5ak8bd.execute-api.ap-south-1.amazonaws.com/New/mass-upload-form-2/ricew/effort-cost-rate-card/get?project_id=${refreshProjectId}`, {
                            headers
                        });

                        const refreshResult = await refreshResponse.json();

                        if (refreshResponse.ok && Array.isArray(refreshResult.data)) {
                            // Sort data by ID
                            const sortedData = [...refreshResult.data].sort((a, b) => {
                                const idA = parseInt(a.RICEW_Effort_Cost_Rate_Card_form_2_id?.S || '0');
                                const idB = parseInt(b.RICEW_Effort_Cost_Rate_Card_form_2_id?.S || '0');
                                return idA - idB;
                            });

                            // Map to UI format
                            const mappedData = sortedData.map(item => ({
                                'RICEW_Mass_Upload_Form_id': item.RICEW_Mass_Upload_Form_id?.S || item.RICEW_Mass_Upload_Form_id || '',
                                'RICEW_Effort_Cost_Rate_Card_form_2_id': item.RICEW_Effort_Cost_Rate_Card_form_2_id?.S || item.RICEW_Effort_Cost_Rate_Card_form_2_id || '',
                                'RICEW Name': item.RICEW_Name?.S || '',
                                'RICEW Description': item.RICEW_Description?.S || '',
                                'Process Stream': item.Process_Stream?.S || '',
                                'Application': item.Application?.S || '',
                                'Object Type': item.Object_Type?.S || '',
                                'Complexity': item.Complexity?.S || '',
                                'Upload Template Name': item.Upload_Template_Name?.S || '',
                                'Populated': (item.Populated?.S === 'true' || item.Populated === 'true') ? 'Yes' : '',
                                'Processed (Interface Table)': (item.processed_in?.S === 'true' || item.processed_in === 'true') ? 'Yes' : 'No',
                                'Effort (Hours)': item.Effort_Hours?.S || '',
                                'Cost (Currency)': item.Cost_Currency?.S || '',
                                'OR_PL_Currency': item.OR_PL_Currency?.S || item.OR_BL_Currency?.S || '',
                                'Organization Name': (() => {
                                    const orgId = item.organization_id?.S || item.organization_id || '';
                                    const org = orgServiceLineLOV.find(o => o.organization_id === orgId);
                                    if (org) return org.organization_name;
                                    return item.Organization_Name?.S || item.Organization_Name || orgId;
                                })(),
                                'Service Line': item.Service_Line_Name?.S || item.Service_Line_Name || item.Service_Line_name?.S || '',
                                'organization_id': item.organization_id?.S || item.organization_id || '',
                                'Service_Line_name': item.Service_Line_name?.S || item.Service_Line_name || '',
                                'created_timestamp': item.created_timestamp?.S || item.created_timestamp || '',
                                'updated_timestamp': item.updated_timestamp?.S || item.updated_timestamp || item.created_timestamp?.S || item.created_timestamp || '',
                                'isSaved': true
                            }));

                            setUploadedData(prevData => {
                                // Filter out records that are already in the saved list (mappedData)
                                const savedIds = new Set(mappedData.map(r => r.RICEW_Mass_Upload_Form_id));
                                const unsavedRecords = prevData.filter(row => !row.isSaved && !savedIds.has(row.RICEW_Mass_Upload_Form_id));
                                const combinedData = [...mappedData, ...unsavedRecords];
                                return sortRecords(combinedData);
                            });
                            setSelectedRows([]); // Clear selection after populate
                            setSelectAll(false);
                        }
                    } catch (refreshError) {
                        console.error('Error refreshing data:', refreshError);
                    }
                }, 1500);
            } else {
                throw new Error(result.error || result.message || 'Failed to populate project');
            }
        } catch (error) {
            console.error('Error populating project:', error);
            setErrorMessage(`Failed to populate project: ${error.message}`);
            setShowErrorMessage(true);
            setShowSuccessMessage(false);
            setTimeout(() => setShowErrorMessage(false), 5000);
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="config-main" style={{ minHeight: '80vh', width: 'calc(98% - 2rem)', maxWidth: maxWidth, margin: '2rem auto', marginLeft: '2rem', marginRight: '2rem', paddingBottom: `calc(${paddingBottom} + ${extraBottomPadding}px)` }}>
            {/* Inner Content Container */}
            <div className="dashboard-content" style={{ width: '100%', maxWidth: 'none', margin: '0', padding: '0', position: 'relative' }}>
                {/* Project Info */}
                <div style={{ padding: '2rem 1rem 1rem 2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project: {localStorage.getItem('project_name') || selectedProject?.name}</h3>
                    </div>
                </div>
                <div className="config-header" style={{
                    marginTop: '0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '20px',
                    paddingRight: '20px' // Add some padding on the right for better spacing
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <h2 style={{ margin: 0 }}>Populate RICEW records into Project</h2>
                        <button
                            onClick={handleCalculate}
                            disabled={loading}
                            style={{
                                backgroundColor: loading ? '#9ca3af' : '#28a745',
                                color: 'white',
                                padding: '10px 20px',
                                borderRadius: '8px',
                                border: 'none',
                                fontWeight: '600',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                fontSize: '14px',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                opacity: loading ? 0.7 : 1
                            }}
                            onMouseEnter={(e) => {
                                if (!loading) {
                                    e.currentTarget.style.backgroundColor = '#218838';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.15)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!loading) {
                                    e.currentTarget.style.backgroundColor = '#28a745';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                                }
                            }}
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                    </svg>
                                    Loading...
                                </>
                            ) : (
                                <>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                                        <line x1="8" y1="6" x2="16" y2="6" />
                                        <line x1="8" y1="10" x2="16" y2="10" />
                                        <line x1="8" y1="14" x2="16" y2="14" />
                                        <line x1="8" y1="18" x2="16" y2="18" />
                                    </svg>
                                    Refresh
                                </>
                            )}
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: '15px' }}>
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            style={{
                                backgroundColor: loading ? '#9ca3af' : '#28a745',
                                color: 'white',
                                padding: '10px 24px',
                                borderRadius: '8px',
                                border: 'none',
                                fontWeight: '600',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                fontSize: '14px',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                opacity: loading ? 0.7 : 1
                            }}
                            onMouseEnter={(e) => {
                                if (!loading) {
                                    e.currentTarget.style.backgroundColor = '#218838';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.15)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!loading) {
                                    e.currentTarget.style.backgroundColor = '#28a745';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                                }
                            }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                                <polyline points="17 21 17 13 7 13 7 21" />
                                <polyline points="7 3 7 8 15 8" />
                            </svg>
                            Processed to Interface Table {uploadedData.filter((row, idx) => selectedRows.includes(idx) && row['Effort (Hours)'] && row['Cost (Currency)'] && !row['isSaved']).length > 0 && `(${uploadedData.filter((row, idx) => selectedRows.includes(idx) && row['Effort (Hours)'] && row['Cost (Currency)'] && !row['isSaved']).length})`}
                        </button>

                        <button
                            onClick={handlePopulateProject}
                            disabled={loading}
                            style={{
                                backgroundColor: loading ? '#9ca3af' : '#007bff',
                                color: 'white',
                                padding: '10px 24px',
                                borderRadius: '8px',
                                border: 'none',
                                fontWeight: '600',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                fontSize: '14px',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                opacity: loading ? 0.7 : 1
                            }}
                            onMouseEnter={(e) => {
                                if (!loading) {
                                    e.currentTarget.style.backgroundColor = '#0069d9';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.15)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!loading) {
                                    e.currentTarget.style.backgroundColor = '#007bff';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                                }
                            }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                                <polyline points="10 9 9 9 8 9" />
                            </svg>
                            Populate Project {uploadedData.filter((row, idx) => selectedRows.includes(idx) && row.isSaved && row['Populated'] !== 'Yes').length > 0 && `(${uploadedData.filter((row, idx) => selectedRows.includes(idx) && row.isSaved && row['Populated'] !== 'Yes').length})`}
                        </button>
                    </div>
                </div>

                {/* Loading Overlay */}
                {loading && (
                    <div style={{
                        position: 'fixed',
                        top: '0',
                        left: '0',
                        right: '0',
                        bottom: '0',
                        //backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1500
                    }}>
                        <div style={{
                            backgroundColor: 'white',
                            padding: '24px',
                            borderRadius: '8px',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px'
                        }}>
                            <div style={{
                                width: '50px',
                                height: '50px',
                                border: '3px solid #f3f3f3',
                                borderTop: '3px solid #3b82f6',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite'
                            }}></div>
                            <span style={{
                                fontSize: '16px',
                                color: '#333',
                                fontWeight: '500'
                            }}>
                                Loading...
                            </span>
                        </div>
                    </div>
                )}

                {/* Success Message Popup */}
                {showSuccessMessage && (
                    <div style={{
                        position: 'fixed',
                        top: '20px',
                        right: '20px',
                        backgroundColor: '#10b981',
                        color: 'white',
                        padding: '12px 20px',
                        borderRadius: '6px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        zIndex: 1000,
                        fontSize: '14px',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22,4 12,14.01 9,11.01" />
                        </svg>
                        {successMessage}
                    </div>
                )}

                {/* Error Message Popup */}
                {showErrorMessage && (
                    <div style={{
                        position: 'fixed',
                        top: '20px',
                        right: '20px',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        padding: '12px 20px',
                        borderRadius: '6px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        zIndex: 1000,
                        fontSize: '14px',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        maxWidth: '400px',
                        wordWrap: 'break-word'
                    }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="15" y1="9" x2="9" y2="15" />
                            <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                        <span style={{ flex: 1 }}>{errorMessage}</span>
                        <button
                            onClick={() => setShowErrorMessage(false)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'white',
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginLeft: '8px',
                                opacity: 0.8,
                                transition: 'opacity 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.opacity = '1'}
                            onMouseLeave={(e) => e.target.style.opacity = '0.8'}
                            title="Close"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                )}

                {/* Confirmation Dialog */}
                {showConfirmDialog && (
                    <div style={{
                        position: 'fixed',
                        top: '0',
                        left: '0',
                        right: '0',
                        bottom: '0',
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10001
                    }}>
                        <div style={{
                            backgroundColor: 'white',
                            padding: '28px',
                            borderRadius: '12px',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                            maxWidth: '500px',
                            width: '90%',
                            textAlign: 'center',
                            border: '1px solid #e5e7eb'
                        }}>
                            <div style={{
                                width: '56px',
                                height: '56px',
                                backgroundColor: '#fef3c7',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 20px auto'
                            }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                    <line x1="12" y1="9" x2="12" y2="13" />
                                    <line x1="12" y1="17" x2="12.01" y2="17" />
                                </svg>
                            </div>
                            <h3 style={{
                                margin: '0 0 16px 0',
                                color: '#1f2937',
                                fontSize: '20px',
                                fontWeight: '700'
                            }}>
                                Attention Required
                            </h3>
                            <p style={{
                                margin: '0 0 32px 0',
                                color: '#4b5563',
                                fontSize: '15px',
                                lineHeight: '1.6',
                                whiteSpace: 'pre-line',
                                textAlign: 'left',
                                backgroundColor: '#f9fafb',
                                padding: '16px',
                                borderRadius: '8px',
                                border: '1px solid #f3f4f6'
                            }}>
                                {confirmMessage}
                            </p>
                            <div style={{
                                display: 'flex',
                                gap: '12px',
                                justifyContent: 'stretch'
                            }}>
                                <button
                                    onClick={handleConfirmCancel}
                                    style={{
                                        flex: 1,
                                        backgroundColor: 'white',
                                        color: '#374151',
                                        border: '1px solid #d1d5db',
                                        padding: '12px 24px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '15px',
                                        fontWeight: '600',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmYes}
                                    style={{
                                        flex: 1,
                                        backgroundColor: '#2563eb',
                                        color: 'white',
                                        border: 'none',
                                        padding: '12px 24px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '15px',
                                        fontWeight: '600',
                                        transition: 'all 0.2s',
                                        boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#1d4ed8'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = '#2563eb'}
                                >
                                    Yes, Continue
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Populate Project Modal */}
                {showPopulateModal && (
                    <div style={{
                        position: 'fixed',
                        top: '0',
                        left: '0',
                        right: '0',
                        bottom: '0',
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999
                    }}>
                        <div style={{
                            backgroundColor: 'white',
                            padding: '24px',
                            borderRadius: '8px',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                            width: '500px',
                            maxWidth: '90%'
                        }}>
                            <h3 style={{
                                margin: '0 0 20px 0',
                                color: '#333',
                                fontSize: '18px',
                                fontWeight: '600',
                                borderBottom: '2px solid #3b82f6',
                                paddingBottom: '10px'
                            }}>
                                Populate Project
                            </h3>

                            {/* Project Name Field */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '6px',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    color: '#555'
                                }}>
                                    Project Name
                                </label>
                                <input
                                    type="text"
                                    value={populateProjectName}
                                    readOnly
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        fontSize: '14px',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        backgroundColor: '#f5f5f5',
                                        color: '#666',
                                        cursor: 'not-allowed',
                                        boxSizing: 'border-box'
                                    }}
                                    placeholder="Automatically Populate"
                                />
                            </div>

                            {/* RICEW Status Field */}
                            <div style={{ marginBottom: '24px', position: 'relative' }} ref={populateStatusRef}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '6px',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    color: '#555'
                                }}>
                                    RICEW Status
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        ref={populateStatusInputRef}
                                        type="text"
                                        value={populateRicewStatus}
                                        onChange={(e) => {
                                            setPopulateRicewStatus(e.target.value);
                                            setShowStatusDropdown(true);
                                        }}
                                        onFocus={() => {
                                            // Store current value before clearing
                                            setPreviousPopulateRicewStatus(populateRicewStatus);
                                            // Clear the field to show full LOV list
                                            setPopulateRicewStatus('');
                                            setShowStatusDropdown(true);
                                        }}
                                        onBlur={() => {
                                            // Small delay to allow dropdown click to register
                                            setTimeout(() => {
                                                // Only restore if no selection was made
                                                if (!isSelectingStatusRef.current) {
                                                    // If field is still empty (no selection made), restore previous value
                                                    if (populateRicewStatus === '') {
                                                        setPopulateRicewStatus(previousPopulateRicewStatus);
                                                    }
                                                }
                                                // Reset the flag
                                                isSelectingStatusRef.current = false;
                                                setShowStatusDropdown(false);
                                            }, 200);
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            fontSize: '14px',
                                            border: '1px solid #ddd',
                                            borderRadius: '4px',
                                            outline: 'none',
                                            boxSizing: 'border-box',
                                            transition: 'border-color 0.2s'
                                        }}
                                        onFocusCapture={(e) => e.target.style.borderColor = '#3b82f6'}
                                        onBlurCapture={(e) => e.target.style.borderColor = '#ddd'}
                                        placeholder="Select or search RICEW Status"
                                    />
                                    {/* Dropdown Icon */}
                                    <div
                                        style={{
                                            position: 'absolute',
                                            right: '12px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            pointerEvents: 'none',
                                            color: '#999'
                                        }}
                                    >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="6 9 12 15 18 9"></polyline>
                                        </svg>
                                    </div>
                                </div>

                                {/* Custom LOV List Dropdown */}
                                {showStatusDropdown && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            top: '100%',
                                            left: '0',
                                            right: '0',
                                            backgroundColor: 'white',
                                            border: '1px solid #ddd',
                                            borderRadius: '4px',
                                            marginTop: '4px',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                            zIndex: 10000,
                                            maxHeight: '200px',
                                            overflowY: 'auto'
                                        }}
                                    >
                                        {populateStatusLOV
                                            .filter(item =>
                                                item.Status_Name.toLowerCase().includes(populateRicewStatus.toLowerCase())
                                            )
                                            .map((item, idx) => (
                                                <div
                                                    key={item.RICEW_Status_Id}
                                                    onMouseDown={(e) => {
                                                        e.preventDefault(); // Prevent input blur
                                                        isSelectingStatusRef.current = true; // Mark that selection is happening
                                                        setPopulateRicewStatus(item.Status_Name);
                                                        setPreviousPopulateRicewStatus(item.Status_Name); // Update previous value
                                                        setShowStatusDropdown(false);
                                                        // Remove focus from input field
                                                        if (populateStatusInputRef.current) {
                                                            populateStatusInputRef.current.blur();
                                                        }
                                                    }}
                                                    style={{
                                                        padding: '10px 12px',
                                                        fontSize: '14px',
                                                        cursor: 'pointer',
                                                        transition: 'background-color 0.2s',
                                                        borderBottom: idx === populateStatusLOV.length - 1 ? 'none' : '1px solid #f5f5f5'
                                                    }}
                                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f7ff'}
                                                    onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                                                >
                                                    {item.Status_Name}
                                                </div>
                                            ))
                                        }
                                        {populateStatusLOV.filter(item =>
                                            item.Status_Name.toLowerCase().includes(populateRicewStatus.toLowerCase())
                                        ).length === 0 && (
                                                <div style={{ padding: '10px 12px', fontSize: '14px', color: '#999', textAlign: 'center' }}>
                                                    No matches found
                                                </div>
                                            )}
                                    </div>
                                )}
                            </div>

                            {/* Buttons */}
                            <div style={{
                                display: 'flex',
                                gap: '12px',
                                justifyContent: 'flex-end'
                            }}>
                                <button
                                    onClick={() => setShowPopulateModal(false)}
                                    style={{
                                        padding: '10px 20px',
                                        backgroundColor: '#dc3545',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#c82333'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = '#dc3545'}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handlePopulateSubmit}
                                    disabled={loading || !populateRicewStatus}
                                    style={{
                                        padding: '10px 20px',
                                        backgroundColor: (loading || !populateRicewStatus) ? '#9ca3af' : '#28a745',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: (loading || !populateRicewStatus) ? 'not-allowed' : 'pointer',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        transition: 'background-color 0.2s',
                                        opacity: (loading || !populateRicewStatus) ? 0.7 : 1
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!loading && populateRicewStatus) e.target.style.backgroundColor = '#218838';
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!loading && populateRicewStatus) e.target.style.backgroundColor = '#28a745';
                                    }}
                                >
                                    {loading ? 'Submitting...' : 'Submit'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Table Header and Body Section - Unified Scrollable Container */}
                <div style={{
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #ddd',
                    borderTop: 'none',
                    borderBottom: 'none',
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    width: '100%',
                    boxSizing: 'border-box',
                    marginTop: '20px'
                }}>
                    {/* Totals Row - Aligned with table columns */}
                    <div style={{
                        display: 'flex',
                        padding: '0 2rem',
                        backgroundColor: 'white',
                        minWidth: `${tableContentWidth}px`,
                        boxSizing: 'border-box'
                    }}>
                        {/* Empty space for Sr. No. */}
                        <div style={{
                            width: '60px',
                            flex: '0 0 60px',
                            padding: '12px 8px',
                            backgroundColor: 'white',
                            boxSizing: 'border-box'
                        }}></div>
                        {/* Empty space for RICEW Name */}
                        <div style={{
                            flex: 1,
                            padding: '12px 12px',
                            minWidth: '120px',
                            backgroundColor: 'white',
                            boxSizing: 'border-box'
                        }}></div>
                        {/* Empty space for RICEW Description */}
                        <div style={{
                            flex: 1,
                            padding: '12px 12px',
                            minWidth: '180px',
                            backgroundColor: 'white',
                            boxSizing: 'border-box'
                        }}></div>
                        {/* Empty space for Process Stream */}
                        <div style={{
                            flex: 1,
                            padding: '12px 12px',
                            minWidth: '140px',
                            backgroundColor: 'white',
                            boxSizing: 'border-box'
                        }}></div>
                        {/* Empty space for Application */}
                        <div style={{
                            flex: 1,
                            padding: '12px 12px',
                            minWidth: '120px',
                            backgroundColor: 'white',
                            boxSizing: 'border-box',
                            display: 'none'
                        }}></div>
                        {/* Empty space for Object Type */}
                        <div style={{
                            flex: 1,
                            padding: '12px 12px',
                            minWidth: '120px',
                            backgroundColor: 'white',
                            boxSizing: 'border-box'
                        }}></div>
                        {/* Total Hours Label - above Complexity */}
                        <div style={{
                            flex: 1,
                            fontWeight: 'bold',
                            fontSize: '14px',
                            color: '#333',
                            padding: '12px 12px',
                            minWidth: '120px',
                            backgroundColor: '#f5f5f5',
                            textAlign: 'center',
                            border: '1px solid #ddd',
                            boxSizing: 'border-box'
                        }}>
                            Total Hours
                        </div>
                        {/* Total Hours Value - above Effort (Hours) */}
                        <div style={{
                            flex: 1,
                            fontWeight: 'bold',
                            fontSize: '14px',
                            color: '#333',
                            padding: '12px 12px',
                            minWidth: '120px',
                            backgroundColor: '#f5f5f5',
                            textAlign: 'center',
                            border: '1px solid #ddd',
                            marginRight: '20px',
                            boxSizing: 'border-box'
                        }}>
                            {totalEffortHours}
                        </div>
                        {/* Total Cost Label - above Cost (Currency) */}
                        <div style={{
                            flex: 1,
                            fontWeight: 'bold',
                            fontSize: '14px',
                            color: '#333',
                            padding: '12px 12px',
                            minWidth: '150px',
                            backgroundColor: '#f5f5f5',
                            textAlign: 'center',
                            border: '1px solid #ddd',
                            boxSizing: 'border-box'
                        }}>
                            Total Cost
                        </div>
                        {/* Total Cost Value - above Processed (Interface Table) */}
                        <div style={{
                            flex: 1,
                            fontWeight: 'bold',
                            fontSize: '14px',
                            color: '#333',
                            padding: '12px 12px',
                            minWidth: '150px',
                            backgroundColor: '#f5f5f5',
                            textAlign: 'center',
                            border: '1px solid #ddd',
                            boxSizing: 'border-box'
                        }}>
                            {totalCost}
                        </div>
                        {/* Empty space for Populated (Project) */}
                        <div style={{
                            flex: 1,
                            padding: '12px 12px',
                            minWidth: '120px',
                            backgroundColor: 'white',
                            boxSizing: 'border-box'
                        }}></div>
                        {/* Empty space for Select */}
                        <div style={{
                            flex: '0 0 100px',
                            padding: '12px 12px',
                            minWidth: '100px',
                            backgroundColor: 'white',
                            boxSizing: 'border-box'
                        }}></div>
                        {/* Empty space for Upload Template Name */}
                        <div style={{
                            flex: 1,
                            padding: '12px 12px',
                            minWidth: '180px',
                            backgroundColor: 'white',
                            boxSizing: 'border-box'
                        }}></div>
                    </div>

                    {/* Empty space between header rows */}
                    <div style={{
                        height: '20px',
                        backgroundColor: 'white',
                        minWidth: `${tableContentWidth}px`,
                        padding: '0 2rem',
                        borderTop: 'none !important',
                        borderBottom: 'none',
                    }}></div>

                    {/* Table Header Row 2: All column headers */}
                    <div style={{
                        display: 'flex',
                        borderBottom: '1px solid #ddd',
                        padding: '0 2rem',
                        backgroundColor: 'white',
                        borderTop: '1px solid #ddd',
                        minWidth: `${tableContentWidth}px`,
                        boxSizing: 'border-box'
                    }}>
                        <div style={{
                            width: '60px',
                            flex: '0 0 60px',
                            padding: '12px 8px',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            color: '#333',
                            borderRight: '1px solid #ddd',
                            backgroundColor: 'white',
                            textAlign: 'center',
                            boxSizing: 'border-box'
                        }}>
                            Sr. No.
                        </div>
                        <div style={{
                            flex: 1,
                            padding: '12px 12px',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            color: '#333',
                            borderRight: '1px solid #ddd',
                            minWidth: '120px',
                            backgroundColor: 'white',
                            boxSizing: 'border-box'
                        }}>
                            RICEW Name
                        </div>
                        <div style={{
                            flex: 1,
                            padding: '12px 12px',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            color: '#333',
                            borderRight: '1px solid #ddd',
                            minWidth: '180px',
                            backgroundColor: 'white',
                            boxSizing: 'border-box'
                        }}>
                            RICEW Description
                        </div>
                        <div style={{
                            flex: 1,
                            padding: '12px 12px',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            color: '#333',
                            borderRight: '1px solid #ddd',
                            minWidth: '140px',
                            backgroundColor: 'white',
                            boxSizing: 'border-box'
                        }}>
                            Process Stream
                        </div>
                        <div style={{
                            flex: 1,
                            padding: '12px 12px',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            color: '#333',
                            borderRight: '1px solid #ddd',
                            minWidth: '120px',
                            backgroundColor: 'white',
                            boxSizing: 'border-box',
                            display: 'none'
                        }}>
                            Application
                        </div>
                        <div style={{
                            flex: 1,
                            padding: '12px 12px',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            color: '#333',
                            borderRight: '1px solid #ddd',
                            minWidth: '120px',
                            backgroundColor: 'white',
                            boxSizing: 'border-box'
                        }}>
                            Object Type
                        </div>
                        <div style={{
                            flex: 1,
                            padding: '12px 12px',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            color: '#333',
                            borderRight: '1px solid #ddd',
                            minWidth: '120px',
                            backgroundColor: 'white',
                            boxSizing: 'border-box'
                        }}>
                            Complexity
                        </div>
                        <div style={{
                            flex: 1,
                            padding: '12px 12px',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            color: '#333',
                            borderRight: '1px solid #ddd',
                            minWidth: '120px',
                            backgroundColor: 'white',
                            textAlign: 'center',
                            boxSizing: 'border-box'
                        }}>
                            Effort (Hours)
                        </div>
                        <div style={{
                            flex: 1,
                            padding: '12px 12px',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            color: '#333',
                            borderRight: '1px solid #ddd',
                            minWidth: '150px',
                            backgroundColor: 'white',
                            textAlign: 'center',
                            boxSizing: 'border-box'
                        }}>
                            Cost (Currency)
                        </div>
                        <div style={{
                            flex: 1,
                            padding: '12px 12px',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            color: '#333',
                            borderRight: '1px solid #ddd',
                            minWidth: '200px',
                            backgroundColor: 'white',
                            textAlign: 'center',
                            boxSizing: 'border-box'
                        }}>
                            Organization Name
                        </div>
                        <div style={{
                            flex: 1,
                            padding: '12px 12px',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            color: '#333',
                            borderRight: '1px solid #ddd',
                            minWidth: '200px',
                            backgroundColor: 'white',
                            textAlign: 'center',
                            boxSizing: 'border-box'
                        }}>
                            Service Line
                        </div>
                        <div style={{
                            flex: 1,
                            padding: '12px 12px',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            color: '#333',
                            borderRight: '1px solid #ddd',
                            minWidth: '150px',
                            backgroundColor: 'white',
                            textAlign: 'center',
                            boxSizing: 'border-box'
                        }}>
                            Processed (Interface Table)
                        </div>
                        <div style={{
                            flex: 1,
                            padding: '12px 12px',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            color: '#333',
                            borderRight: '1px solid #ddd',
                            minWidth: '120px',
                            backgroundColor: 'white',
                            textAlign: 'center',
                            boxSizing: 'border-box'
                        }}>
                            Populated (Project)
                        </div>
                        {/* Select - Header */}
                        <div style={{
                            flex: '0 0 100px',
                            padding: '12px 12px',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            color: '#333',
                            borderRight: '1px solid #ddd',
                            minWidth: '100px',
                            backgroundColor: 'white',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '6px',
                            boxSizing: 'border-box'
                        }}>
                            <div style={{ lineHeight: '1.2', whiteSpace: 'nowrap' }}>Select</div>
                            <input
                                type="checkbox"
                                checked={selectAll}
                                onChange={(e) => {
                                    const isChecked = e.target.checked;
                                    setSelectAll(isChecked);
                                    if (isChecked) {
                                        // Select all rows that are NOT populated
                                        const selectableRowIndices = uploadedData
                                            .map((row, index) => row['Populated'] !== 'Yes' ? index : -1)
                                            .filter(index => index !== -1);
                                        setSelectedRows(selectableRowIndices);
                                    } else {
                                        setSelectedRows([]);
                                    }
                                }}
                                style={{
                                    cursor: 'pointer',
                                    width: '16px',
                                    height: '16px',
                                    marginTop: '2px'
                                }}
                                title="Select All"
                            />
                        </div>
                        <div style={{
                            flex: 1,
                            padding: '12px 12px',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            color: '#333',
                            //borderRight: '1px solid #ddd',
                            minWidth: '180px',
                            backgroundColor: 'white',
                            boxSizing: 'border-box'
                        }}>
                            Upload Template Name
                        </div>
                    </div>

                    {/* Table Body */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        minWidth: `${tableContentWidth}px`,
                        backgroundColor: 'white'
                    }}>
                        {uploadedData.length > 0 ? (
                            uploadedData.map((row, index) => {
                                const rowBgColor = row['Populated'] === 'Yes' ? '#f5f5f5' : '#ffffff'; // Gray out populated records
                                return (
                                    <div
                                        key={index}
                                        data-row-index={index}
                                        style={{
                                            display: 'flex',
                                            backgroundColor: rowBgColor,
                                            borderBottom: '1px solid #ddd',
                                            padding: '0 2rem',
                                            minWidth: `${tableContentWidth}px`
                                        }}
                                    >
                                        {/* Sr. No. */}
                                        <div style={{
                                            width: '60px',
                                            flex: '0 0 60px',
                                            padding: '12px 8px',
                                            fontSize: '13px',
                                            color: '#333',
                                            backgroundColor: rowBgColor,
                                            borderRight: '1px solid #ddd',
                                            textAlign: 'center',
                                            fontWeight: '500'
                                        }}>
                                            {index + 1}
                                        </div>

                                        {/* RICEW Name */}
                                        <div style={{
                                            flex: 1,
                                            padding: '12px 12px',
                                            fontSize: '13px',
                                            color: '#333',
                                            backgroundColor: rowBgColor,
                                            borderRight: '1px solid #ddd',
                                            minWidth: '120px',
                                            wordBreak: 'break-word'
                                        }}>
                                            {row['RICEW Name'] || '-'}
                                        </div>

                                        {/* RICEW Description */}
                                        <div style={{
                                            flex: 1,
                                            padding: '12px 12px',
                                            fontSize: '13px',
                                            color: '#333',
                                            backgroundColor: rowBgColor,
                                            borderRight: '1px solid #ddd',
                                            minWidth: '180px',
                                            wordBreak: 'break-word'
                                        }}>
                                            {row['RICEW Description'] || '-'}
                                        </div>

                                        {/* Process Stream */}
                                        <div style={{
                                            flex: 1,
                                            padding: '12px 12px',
                                            fontSize: '13px',
                                            color: '#333',
                                            backgroundColor: rowBgColor,
                                            borderRight: '1px solid #ddd',
                                            minWidth: '140px',
                                            wordBreak: 'break-word'
                                        }}>
                                            {row['Process Stream'] || '-'}
                                        </div>

                                        {/* Application */}
                                        <div style={{
                                            flex: 1,
                                            padding: '12px 12px',
                                            fontSize: '13px',
                                            color: '#333',
                                            backgroundColor: rowBgColor,
                                            borderRight: '1px solid #ddd',
                                            minWidth: '120px',
                                            wordBreak: 'break-word',
                                            display: 'none'
                                        }}>
                                            {row['Application'] || '-'}
                                        </div>

                                        {/* Object Type */}
                                        <div style={{
                                            flex: 1,
                                            padding: '12px 12px',
                                            fontSize: '13px',
                                            color: '#333',
                                            backgroundColor: rowBgColor,
                                            borderRight: '1px solid #ddd',
                                            minWidth: '120px',
                                            wordBreak: 'break-word'
                                        }}>
                                            {row['Object Type'] || '-'}
                                        </div>

                                        {/* Complexity */}
                                        <div style={{
                                            flex: 1,
                                            padding: '12px 12px',
                                            fontSize: '13px',
                                            color: '#333',
                                            backgroundColor: rowBgColor,
                                            borderRight: '1px solid #ddd',
                                            minWidth: '120px',
                                            wordBreak: 'break-word'
                                        }}>
                                            {row['Complexity'] || '-'}
                                        </div>

                                        {/* Effort (Hours) */}
                                        <div style={{
                                            flex: 1,
                                            padding: '12px 12px',
                                            fontSize: '13px',
                                            color: '#333',
                                            backgroundColor: rowBgColor,
                                            borderRight: '1px solid #ddd',
                                            minWidth: '120px',
                                            textAlign: 'center'
                                        }}>
                                            {row['Effort (Hours)'] || '-'}
                                        </div>

                                        {/* Cost (Currency) */}
                                        <div style={{
                                            flex: 1,
                                            padding: '12px 12px',
                                            fontSize: '13px',
                                            color: '#333',
                                            backgroundColor: rowBgColor,
                                            borderRight: '1px solid #ddd',
                                            minWidth: '150px',
                                            textAlign: 'center'
                                        }}>
                                            {row['Cost (Currency)'] || '-'}
                                        </div>
                                        <div style={{
                                            flex: 1,
                                            padding: '12px 12px',
                                            fontSize: '13px',
                                            color: '#333',
                                            backgroundColor: rowBgColor,
                                            borderRight: '1px solid #ddd',
                                            minWidth: '200px',
                                            textAlign: 'center'
                                        }}>
                                            {row['Organization Name'] || '-'}
                                        </div>
                                        <div style={{
                                            flex: 1,
                                            padding: '12px 12px',
                                            fontSize: '13px',
                                            color: '#333',
                                            backgroundColor: rowBgColor,
                                            borderRight: '1px solid #ddd',
                                            minWidth: '200px',
                                            textAlign: 'center'
                                        }}>
                                            {row['Service Line'] || '-'}
                                        </div>

                                        <div style={{
                                            flex: 1,
                                            padding: '12px 12px',
                                            fontSize: '13px',
                                            color: '#333',
                                            backgroundColor: rowBgColor,
                                            borderRight: '1px solid #ddd',
                                            minWidth: '150px',
                                            textAlign: 'center'
                                        }}>
                                            <div
                                                style={{
                                                    minHeight: '20px',
                                                    display: 'inline-block',
                                                    padding: '4px 12px',
                                                    borderRadius: '12px',
                                                    fontSize: '12px',
                                                    fontWeight: '500',
                                                    backgroundColor: row['Processed (Interface Table)'] === 'Yes' ? '#d1fae5' : '#fee2e2',
                                                    color: row['Processed (Interface Table)'] === 'Yes' ? '#065f46' : '#991b1b'
                                                }}
                                            >
                                                {row['Processed (Interface Table)'] || 'No'}
                                            </div>
                                        </div>

                                        {/* Populated */}
                                        <div style={{
                                            flex: 1,
                                            padding: '12px 12px',
                                            fontSize: '13px',
                                            color: '#333',
                                            backgroundColor: rowBgColor,
                                            minWidth: '120px',
                                            textAlign: 'center',
                                            borderRight: '1px solid #ddd'
                                        }}>
                                            {row['Populated'] ? (
                                                <div
                                                    style={{
                                                        minHeight: '20px',
                                                        display: 'inline-block',
                                                        padding: '4px 12px',
                                                        borderRadius: '12px',
                                                        fontSize: '12px',
                                                        fontWeight: '500',
                                                        backgroundColor: (row['Populated'] === 'Success' || row['Populated'] === 'Yes') ? '#d1fae5' : '#fee2e2',
                                                        color: (row['Populated'] === 'Success' || row['Populated'] === 'Yes') ? '#065f46' : '#991b1b'
                                                    }}
                                                >
                                                    {row['Populated']}
                                                </div>
                                            ) : (
                                                <div
                                                    style={{
                                                        minHeight: '20px',
                                                        color: '#9ca3af'
                                                    }}
                                                >
                                                    -
                                                </div>
                                            )}
                                        </div>

                                        {/* Select Checkbox */}
                                        <div style={{
                                            flex: '0 0 100px',
                                            padding: '12px 12px',
                                            minWidth: '100px',
                                            backgroundColor: rowBgColor,
                                            borderRight: '1px solid #ddd',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center'
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedRows.includes(index)}
                                                disabled={row['Populated'] === 'Yes'}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        const newSelected = [...selectedRows, index];
                                                        setSelectedRows(newSelected);

                                                        // Update selectAll if all selectable rows are now selected
                                                        const selectableRows = uploadedData.filter(row => row['Populated'] !== 'Yes');
                                                        if (newSelected.length === selectableRows.length) {
                                                            setSelectAll(true);
                                                        }
                                                    } else {
                                                        const newSelected = selectedRows.filter(i => i !== index);
                                                        setSelectedRows(newSelected);
                                                        setSelectAll(false); // At least one is deselected
                                                    }
                                                }}
                                                style={{
                                                    cursor: row['Populated'] === 'Yes' ? 'not-allowed' : 'pointer',
                                                    width: '16px',
                                                    height: '16px'
                                                }}
                                            />
                                        </div>

                                        {/* Upload Template Name */}
                                        <div style={{
                                            flex: 1,
                                            padding: '12px 12px',
                                            fontSize: '13px',
                                            color: '#333',
                                            backgroundColor: rowBgColor,
                                            //borderRight: '1px solid #ddd',
                                            minWidth: '180px',
                                            wordBreak: 'break-word'
                                        }}>
                                            {row['Upload Template Name'] || '-'}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#666', width: '100%' }}>
                                No records to display. Upload a template to see data.
                            </div>
                        )}
                    </div>
                </div>


            </div>
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
            `}</style>

            {showNoProjectSelectedPopup && (
                <div style={{
                    position: 'fixed',
                    top: '0', left: '0', right: '0', bottom: '0',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 2000
                }}>
                    <div style={{
                        backgroundColor: 'white', padding: '30px', borderRadius: '12px',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.15)', textAlign: 'center',
                        maxWidth: '380px', width: '90%'
                    }}>
                        <div style={{
                            width: '64px', height: '64px', backgroundColor: '#fff1f2',
                            borderRadius: '50%', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', margin: '0 auto 20px'
                        }}>
                            <AlertCircle size={36} color="#e11d48" />
                        </div>
                        <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '12px', color: '#1f2937' }}>No Project Selected</h2>
                        <p style={{ color: '#4b5563', marginBottom: '28px', lineHeight: '1.6', fontSize: '15px' }}>
                            Please select a project from the <strong>Project Definition Form</strong> before accessing this page.
                        </p>
                        <button
                            onClick={() => navigate('/dashboard/project-definition-form')}
                            style={{
                                backgroundColor: '#3b82f6', color: 'white', border: 'none',
                                padding: '12px 24px', borderRadius: '6px', cursor: 'pointer',
                                fontSize: '16px', fontWeight: '600', width: '100%',
                                transition: 'background-color 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
                        >
                            Go to Project Definition
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RICEWEffortCostRateCard;
