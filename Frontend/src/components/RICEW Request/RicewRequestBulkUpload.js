import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, MoreVertical, Save, X, AlertCircle, FileText, HelpCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import DOMPurify from 'dompurify';
import { downloadRICEWTemplate, parseRICEWTemplate } from '../../utils/excelTemplateUtils';
import { getIdToken } from '../../utils/cognito-auth';
import { useSession } from '../../context/SessionContext';

// RICEW Type Mapping for display and API consistency
const ricewTypeMapping = {
    'Integration': 'Integrations',
    'Conversion': 'Conversions',
    'Report': 'Reports',
    'Analytics Report': 'Analytics Reports',
    'Alert': 'Alert',
    'Workflow': 'Workflow',
    'Personalization': 'Personalization',
    'Extension': 'Extensions'
};

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

const RicewRequestBulkUpload = ({ selectedProject, setUnsavedChangesChecker }) => {
    const navigate = useNavigate();
    const { handleAuthError } = useSession();
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

    // Loading state
    const [loading, setLoading] = useState(false);

    // Message and confirmation states
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
    const [cancelAction, setCancelAction] = useState(null); // New state for cancel action
    const [confirmMessage, setConfirmMessage] = useState('');
    const [showHelpPopup, setShowHelpPopup] = useState(false);

    // Field-level validation errors state for required fields (per row/field)
    const [fieldErrors, setFieldErrors] = useState({});

    // Required fields list
    const requiredFields = [
        'RICEW Name',
        'Object Type',
        'RICEW Description',
        'Process Stream',
        'Complexity',
        'Organization Name',
        'Service Line',
        'Upload Template Name'
    ];


    // Uploaded data state
    const [uploadedData, setUploadedData] = useState([]);

    // Editing state - tracks which cell is being edited
    const [editingCell, setEditingCell] = useState(null); // { rowIndex: number, field: string }
    const [editValue, setEditValue] = useState('');
    const [previousValue, setPreviousValue] = useState(''); // Store original value before editing
    const [dropdownPosition, setDropdownPosition] = useState(null);
    const [inlineError, setInlineError] = useState(null); // New state for inline validation errors
    const dropdownInputRef = useRef(null);

    const dropdownContainerRef = useRef(null);
    const editingCellContainerRef = useRef(null);

    // Row editing state
    const [editingRowIndex, setEditingRowIndex] = useState(null);
    const [originalRowData, setOriginalRowData] = useState(null);

    // General selection state (next to Processed)
    const [selectedRows, setSelectedRows] = useState([]);
    const [selectAll, setSelectAll] = useState(false);

    // Delete selection state
    const [selectedRowsForDeletion, setSelectedRowsForDeletion] = useState([]);
    const [selectAllForDeletion, setSelectAllForDeletion] = useState(false);

    // Populate selection state
    const [selectedRowsForPopulation, setSelectedRowsForPopulation] = useState([]);
    const [selectAllForPopulation, setSelectAllForPopulation] = useState(false);

    // Pending upload data state (must be declared before useEffect that uses it)
    const [pendingUploadData, setPendingUploadData] = useState([]); // State for pending upload data (not yet validated)

    // Clear session storage on mount/reload to ensure a clean slate
    useEffect(() => {
        sessionStorage.removeItem('ricew_bulk_upload_data');
        sessionStorage.removeItem('ricew_bulk_upload_errors');
        sessionStorage.removeItem('ricew_pending_upload_data');
    }, []);

    // LOV Data States
    const [ricewTypeLOV, setRicewTypeLOV] = useState([]);
    const [masterProcessStreamData, setMasterProcessStreamData] = useState([]);
    const [ricewStatusLOV, setRicewStatusLOV] = useState([]);
    const [rateCardLOV, setRateCardLOV] = useState([]);
    const [waveRolloutLOV, setWaveRolloutLOV] = useState([]); // New state for Wave/Rollout LOV
    const [legalEntityLOV, setLegalEntityLOV] = useState([]); // New state for Legal Entity LOV
    const [resourceRosterLOV, setResourceRosterLOV] = useState([]); // New state for Resource Roster LOV
    const [objectTypeCounts, setObjectTypeCounts] = useState(null); // State for object type counts from API
    const [uploadedFileName, setUploadedFileName] = useState(''); // State for uploaded template file name
    const [validationStatus, setValidationStatus] = useState(null); // State for validation status: null, 'success', or 'error'
    const [existingRicewNames, setExistingRicewNames] = useState([]); // State for existing RICEW names from API
    const [orgServiceLineLOV, setOrgServiceLineLOV] = useState([]); // State for Organization and Service Line LOV

    // Populate Project modal states
    const [showPopulateModal, setShowPopulateModal] = useState(false);
    const [populateProjectName, setPopulateProjectName] = useState('');
    const [populateRicewStatus, setPopulateRicewStatus] = useState('');
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [previousPopulateRicewStatus, setPreviousPopulateRicewStatus] = useState(''); // Store previous value for restore on blur

    // Refs for status dropdown
    const populateStatusRef = useRef(null);
    const populateStatusInputRef = useRef(null);
    const isSelectingStatusRef = useRef(false);

    // Confirmation dialog helper functions
    const showConfirmation = (message, action, onCancel) => {
        setConfirmMessage(message);
        setConfirmAction(() => action);
        setCancelAction(() => onCancel || null);
        setShowConfirmDialog(true);
    };

    const handleConfirmYes = () => {
        if (confirmAction) {
            confirmAction();
        }
        setShowConfirmDialog(false);
        setConfirmAction(null);
        setCancelAction(null);
        setConfirmMessage('');
    };

    const handleConfirmCancel = () => {
        if (cancelAction) {
            cancelAction();
        }
        setShowConfirmDialog(false);
        setConfirmAction(null);
        setCancelAction(null);
        setConfirmMessage('');
    };

    // Handle cell edit
    const handleCellEdit = (rowIndex, field, currentValue) => {
        // Block edit for Impact fields if Cross Stream Impact is not 'Yes'
        if (['Impact Process Stream', 'Impact Application', 'Impact L0 Process', 'Impact Module'].includes(field)) {
            const currentRow = uploadedData[rowIndex];
            if (currentRow['Cross Stream Impact'] !== 'Yes') {
                return;
            }
        }

        // Reset position immediately so the dropdown stays hidden until the new position is calculated
        setDropdownPosition(null);
        setEditingCell({ rowIndex, field });
        setPreviousValue(currentValue || ''); // Store the original value

        // For specific fields (Object Type, Process Stream, Application, L0 Process, Module, Impact Process Stream, Impact Application, Impact L0 Process, Impact Module, RICEW Status Detail, Complexity),
        // clear the input to show full LOV list
        if (['Object Type', 'Process Stream', 'Application', 'L0 Process', 'Module', 'Cross Stream Impact', 'Impact Process Stream', 'Impact Application', 'Impact L0 Process', 'Impact Module', 'RICEW Status Detail', 'Complexity', 'Organization Name', 'Service Line'].includes(field)) {
            setEditValue('');
        } else {
            setEditValue(currentValue || '');
        }
        setInlineError(null); // Clear error when starting edit
    };

    // Calculate dropdown position when editing cell changes


    // Fetch previously uploaded mass upload data from database
    const fetchMassUploadData = useCallback(async () => {
        setLoading(true);
        try {
            let idToken;
            try {
                idToken = await getIdToken();
            } catch (tokenError) {
                handleAuthError(tokenError.message);
                setLoading(false);
                return;
            }

            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            };

            const projectId = localStorage.getItem('project_id') || selectedProject?.id || 101;
            const sanitizedProjectId = DOMPurify.sanitize(String(projectId || '').trim(), { ALLOWED_TAGS: [] });

            const response = await fetchWithRetry(`https://hjcf2fs1n0.execute-api.ap-south-1.amazonaws.com/New/mass-upload-form/ricew/get?project_id=${sanitizedProjectId}`, {
                headers
            });

            if (response.status === 401 || response.status === 403) {
                handleAuthError('Unauthorized - session expired');
                setLoading(false);
                return;
            }

            const result = await response.json();

            // Handle both success with data and success with empty data (or 404 which might return success: false but we want to clear table)
            // If response is 404, we assume no records.
            // If response is 200, we use result.data

            let backendData = [];
            if (response.ok && Array.isArray(result.data)) {
                backendData = result.data;
            } else if (response.status === 404) {
                // No records found, treat as empty
                backendData = [];
            } else if (!response.ok) {
                // Other errors, log and potentially keep old data or show error?
                // For now, let's just log and not update if it's a real error (500 etc)
                console.error('API Error:', result);
                // If we want to be safe, maybe we shouldn't update the table if the API fails
                // But 404 is a valid "empty" state.
            }


            if (response.ok || response.status === 404) {
                // Map database fields to UI keys
                const mappedData = backendData.map(item => {
                    const orgId = item.organization_id?.S || item.organization_id ? String(item.organization_id?.S || item.organization_id) : '';
                    const sanitizeField = (val) => DOMPurify.sanitize(String(val || '').trim(), { ALLOWED_TAGS: [] });

                    return {
                        'RICEW_Mass_Upload_Form_id': sanitizeField(item.RICEW_Mass_Upload_Form_id?.S || item.RICEW_Mass_Upload_Form_id || ''),
                        'RICEW Name': sanitizeField(item.RICEW_Name?.S || ''),
                        'RICEW Description': sanitizeField(item.RICEW_Description?.S || ''),
                        'Process Stream': sanitizeField(item.RICEW_Process_Name?.S || ''),
                        'Application': sanitizeField(item.RICEW_Application?.S || ''),
                        'Object Type': sanitizeField(ricewTypeMapping[item.RICEW_Object_Type?.S] || item.RICEW_Object_Type?.S || ''),
                        'Complexity': sanitizeField(item.RICEW_Complexity?.S || ''),
                        'Effort (Hours)': sanitizeField(item.Effort_Hours?.S || item.Effort_Hours || '0'),
                        'Cost (Currency)': (() => {
                            const cost = sanitizeField(item.Cost?.S || item.Cost || '');
                            const currency = sanitizeField(item.Cost_Currency?.S || item.Cost_Currency || '');
                            if (cost && currency) return `${cost} (${currency})`;
                            return cost || currency || '0';
                        })(),
                        'Organization Name': (() => {
                            const org = orgServiceLineLOV.find(o => String(o.organization_id) === orgId);
                            if (org) return sanitizeField(org.organization_name);
                            return sanitizeField(item.Organization_Name?.S || item.Organization_Name || orgId);
                        })(),
                        'Service Line': sanitizeField(item.Service_Line_Name?.S || item.Service_Line_Name || item.Service_Line_name?.S || ''),
                        'Upload Template Name': sanitizeField(item.Upload_Template_Name?.S || ''),
                        'Processed': (item.Processesed?.S === 'true' || item.Processesed?.BOOL === true) ? 'Yes' : 'No',
                        'Populated (Project)': sanitizeField(item.Populated?.S || item.Populated || ''),
                        'Populate Project': sanitizeField(item.populate_project?.S || item.populate_project || 'false'),
                        'created_timestamp': sanitizeField(item.created_timestamp?.S || item.created_timestamp || ''),
                        '_raw_org_id': orgId // Store raw ID for checking against unresolved local state
                    };
                });

                // Preserve records that are currently in the local state
                // This prevents overwriting records that are being edited or have unsaved changes
                setUploadedData(prevData => {
                    // Create a map of existing local records by their ID for quick lookup
                    const existingRecordsMap = new Map();
                    prevData.forEach(row => {
                        if (row.RICEW_Mass_Upload_Form_id) {
                            existingRecordsMap.set(row.RICEW_Mass_Upload_Form_id, row);
                        }
                    });

                    // Define categorization and sorting logic
                    const getCategory = (row) => {
                        if (!row.RICEW_Mass_Upload_Form_id) return 1; // New/Unsaved
                        if (row['Processed'] !== 'Yes') return 2; // Unprocessed
                        if (row['Populated (Project)'] !== 'true') return 3; // Processed but not Populated
                        return 4; // Populated
                    };

                    const sortFunction = (a, b) => {
                        const catA = getCategory(a);
                        const catB = getCategory(b);
                        if (catA !== catB) return catA - catB;

                        // Within categories 2, 3, 4 (saved records), sort by timestamp and ID
                        if (catA > 1) {
                            const timeA = new Date(a.created_timestamp || 0).getTime();
                            const timeB = new Date(b.created_timestamp || 0).getTime();
                            if (timeB !== timeA) return timeB - timeA; // Latest first

                            const idA = parseInt(a.RICEW_Mass_Upload_Form_id || '0');
                            const idB = parseInt(b.RICEW_Mass_Upload_Form_id || '0');
                            return idB - idA; // Latest ID first
                        }
                        return 0; // Maintain order for category 1
                    };

                    // Merge: Use local version if exists (preserves edits), but correct Organization Name if it's currently showing ID
                    const mergedSavedRecords = mappedData.map(backendRow => {
                        let localVersion = existingRecordsMap.get(backendRow.RICEW_Mass_Upload_Form_id);

                        if (localVersion) {
                            // Preserve local edits, but force update read-only computed metrics from backend
                            localVersion = {
                                ...localVersion,
                                'Effort (Hours)': backendRow['Effort (Hours)'],
                                'Cost (Currency)': backendRow['Cost (Currency)'],
                                'Populated (Project)': backendRow['Populated (Project)'],
                                'Populate Project': backendRow['Populate Project'],
                                'Processed': backendRow['Processed']
                            };

                            // If we have a local version, check if its Organization Name is still unresolved (equals raw ID)
                            // This happens if the data was loaded before LOV was ready
                            if (backendRow._raw_org_id && String(localVersion['Organization Name']) === backendRow._raw_org_id) {
                                localVersion['Organization Name'] = backendRow['Organization Name'];
                            }
                        }

                        return localVersion || backendRow;
                    });

                    // Preserve any unsaved records (those without RICEW_Mass_Upload_Form_id)
                    const unsavedRecords = prevData.filter(row => !row.RICEW_Mass_Upload_Form_id);

                    // Combine and sort
                    const combinedData = [...unsavedRecords, ...mergedSavedRecords];
                    return [...combinedData].sort(sortFunction);
                });
            }
        } catch (error) {
            console.error('Error fetching mass upload data:', error);
        } finally {
            setLoading(false);
        }
    }, [orgServiceLineLOV, selectedProject?.id]);

    // Fetch object type counts from API
    const fetchObjectTypeCounts = useCallback(async () => {
        try {
            let idToken;
            try {
                idToken = await getIdToken();
            } catch (tokenError) {
                console.error('Failed to get ID token for object type counts:', tokenError);
                return;
            }

            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            };

            const projectId = localStorage.getItem('project_id') || selectedProject?.id || 101;
            const sanitizedProjectId = DOMPurify.sanitize(String(projectId || '').trim(), { ALLOWED_TAGS: [] });

            const response = await fetchWithRetry(`https://hjcf2fs1n0.execute-api.ap-south-1.amazonaws.com/New/mass-upload-form/ricew/get-object-type-counts?project_id=${sanitizedProjectId}`, {
                headers
            });

            if (response.status === 401 || response.status === 403) {
                console.error('Unauthorized - session expired');
                return;
            }

            const result = await response.json();

            if (response.ok && Array.isArray(result.data)) {
                const sanitizedData = result.data.map(item => ({
                    RICEW_Object_Type: DOMPurify.sanitize(String(item.RICEW_Object_Type || '').trim(), { ALLOWED_TAGS: [] }),
                    count: item.count
                }));
                setObjectTypeCounts(sanitizedData);
            } else if (response.ok && result.data && typeof result.data === 'object' && !Array.isArray(result.data)) {
                // Fallback if backend sends key-value object (old format), convert to array for UI
                const arrayData = Object.entries(result.data).map(([type, count]) => ({
                    RICEW_Object_Type: DOMPurify.sanitize(String(type || '').trim(), { ALLOWED_TAGS: [] }),
                    count: count
                }));
                setObjectTypeCounts(arrayData);
            }
        } catch (error) {
            console.error('Error fetching object type counts:', error);
        }
    }, [selectedProject?.id]);


    // Handle cell value update
    const handleCellUpdate = (rowIndex, field) => {
        if (editingCell) {
            if (field === 'RICEW Name') {
                if (editValue.length > 100) {
                    setInlineError('Max 100 chars allowed');

                    // Clear required field error when inline error appears
                    const errorKey = `${rowIndex}-RICEW Name`;
                    if (fieldErrors[errorKey]) {
                        setFieldErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors[errorKey];
                            return newErrors;
                        });
                    }
                    return;
                }

                // Check for uniqueness if value changed
                if (editValue !== previousValue && editValue.trim() !== '') {
                    const isDuplicateInDb = existingRicewNames.includes(editValue);
                    const isDuplicateInTable = uploadedData.some((r, i) => i !== rowIndex && r['RICEW Name'] === editValue);

                    if (isDuplicateInDb || isDuplicateInTable) {
                        setInlineError(`RICEW Name '${editValue}' already exists.`);
                        return;
                    }
                }
            }
            if (field === 'RICEW Description') {
                if (editValue.length > 240) {
                    setInlineError('Max 240 chars allowed');

                    // Clear required field error when inline error appears
                    const errorKey = `${rowIndex}-RICEW Description`;
                    if (fieldErrors[errorKey]) {
                        setFieldErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors[errorKey];
                            return newErrors;
                        });
                    }
                    return;
                }
            }


            setUploadedData(prevData => {
                const newData = [...prevData];
                const currentRow = newData[rowIndex];

                // Avoid redundant updates and cascading logic if value hasn't changed
                if (currentRow[field] === editValue) {
                    return prevData;
                }

                // Update the field
                newData[rowIndex] = {
                    ...currentRow,
                    [field]: editValue
                };

                // Auto-sync Process Stream when Application is selected
                if (field === 'Application' && editValue && Array.isArray(masterProcessStreamData)) {
                    const match = masterProcessStreamData.find(item => item.app_name === editValue);
                    if (match) {
                        newData[rowIndex]['Process Stream'] = match.stream_name;

                        // Clear validation error for Process Stream if it exists
                        const psErrorKey = `${rowIndex}-Process Stream`;
                        if (fieldErrors[psErrorKey]) {
                            setFieldErrors(prev => {
                                const newErrors = { ...prev };
                                delete newErrors[psErrorKey];
                                return newErrors;
                            });
                        }

                        // Also sync to Impact Process Stream if Cross Stream Impact is 'No'
                        if (newData[rowIndex]['Cross Stream Impact'] === 'No') {
                            newData[rowIndex]['Impact Process Stream'] = match.stream_name;

                            // Clear validation error for Impact Process Stream if it exists
                            const ipsErrorKey = `${rowIndex}-Impact Process Stream`;
                            if (fieldErrors[ipsErrorKey]) {
                                setFieldErrors(prev => {
                                    const newErrors = { ...prev };
                                    delete newErrors[ipsErrorKey];
                                    return newErrors;
                                });
                            }
                        }
                    }
                }

                // Auto-sync Impact fields if Cross Stream Impact is 'No' and a main field was updated
                const mainFieldsToSync = ['Process Stream', 'Application', 'L0 Process', 'Module'];
                if (mainFieldsToSync.includes(field) && currentRow['Cross Stream Impact'] === 'No') {
                    const fieldMapping = {
                        'Process Stream': 'Impact Process Stream',
                        'Application': 'Impact Application',
                        'L0 Process': 'Impact L0 Process',
                        'Module': 'Impact Module'
                    };

                    // Sync the corresponding Impact field
                    newData[rowIndex][fieldMapping[field]] = editValue;

                    // Clear validation error for the synced Impact field
                    const impactErrorKey = `${rowIndex}-${fieldMapping[field]}`;
                    if (fieldErrors[impactErrorKey]) {
                        setFieldErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors[impactErrorKey];
                            return newErrors;
                        });
                    }
                }

                return newData;
            });

            // Clear the field error for this specific field if it exists
            const errorKey = `${rowIndex}-${field}`;
            if (fieldErrors[errorKey]) {
                setFieldErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors[errorKey];
                    return newErrors;
                });
            }

            setEditingCell(null);
            setEditValue('');
            setPreviousValue('');
            setDropdownPosition(null);
            setInlineError(null);
        }
    };

    // Handle cell edit cancel - restore previous value
    const handleCellCancel = () => {
        if (editingCell && previousValue !== editValue) {
            // Restore the previous value
            setUploadedData(prevData => {
                const newData = [...prevData];
                newData[editingCell.rowIndex] = {
                    ...newData[editingCell.rowIndex],
                    [editingCell.field]: previousValue
                };
                return newData;
            });
        }
        setEditingCell(null);
        setEditValue('');
        setPreviousValue('');
        setDropdownPosition(null);
    };



    // Calculate dropdown position when editing fields
    useEffect(() => {
        const updatePosition = () => {
            if (['Object Type', 'Process Stream', 'Application', 'L0 Process', 'Module', 'Cross Stream Impact', 'Impact Process Stream', 'Impact Application', 'Impact L0 Process', 'Impact Module', 'RICEW Status Detail', 'Complexity', 'Rate Card Name', 'Wave Code', 'Rollout Code', 'Legal Entity Code', 'Functional Owner', 'Technical Owner', 'Organization Name', 'Service Line'].includes(editingCell?.field) && dropdownInputRef.current) {
                const rect = dropdownInputRef.current.getBoundingClientRect();
                const dropdownHeight = 290; // Max height of dropdown + padding
                const viewportHeight = window.innerHeight;
                const spaceBelow = viewportHeight - rect.bottom;

                // Add extra padding to page if dropdown would be cut off
                if (spaceBelow < dropdownHeight) {
                    // Calculate how much extra space we need
                    const extraSpace = dropdownHeight - spaceBelow + 20; // Add 20px buffer
                    setExtraBottomPadding(extraSpace);
                } else {
                    setExtraBottomPadding(0);
                }

                // Set dropdown position
                setDropdownPosition({
                    top: rect.bottom + 2,
                    left: rect.left,
                    width: rect.width
                });
            } else {
                // Reset extra padding when not editing
                setExtraBottomPadding(0);
            }
        };

        // Small delay to ensure ref is mounted
        const timer = setTimeout(updatePosition, 10);

        // Update on scroll to keep dropdown aligned
        window.addEventListener('scroll', updatePosition, true);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [editingCell]);

    // Handle click outside to close dropdown and restore previous value
    useEffect(() => {
        if (!editingCell) return;

        const handleClickOutside = (event) => {
            // Check if click is outside both the input and the dropdown
            const isOutsideInput = dropdownInputRef.current && !dropdownInputRef.current.contains(event.target);
            const isOutsideDropdown = dropdownContainerRef.current && !dropdownContainerRef.current.contains(event.target);

            if (isOutsideInput && isOutsideDropdown) {
                // Restore previous value and close editing
                handleCellCancel();
            }
        };

        // Add event listener
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            // Cleanup
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [editingCell, previousValue]);

    // Sync Select All checkbox with individual selections
    useEffect(() => {
        // Count deletable rows (records that are NOT populated)
        const deletableRowsCount = uploadedData.filter(row =>
            row['Populated (Project)'] !== 'true'
        ).length;

        // Check if all deletable rows are selected
        if (deletableRowsCount > 0 && selectedRowsForDeletion.length === deletableRowsCount) {
            setSelectAllForDeletion(true);
        } else {
            setSelectAllForDeletion(false);
        }
    }, [selectedRowsForDeletion, uploadedData]);

    // Sync Select All checkbox for population with individual selections
    useEffect(() => {
        // Count populatable rows (records that are NOT populated AND ARE processed)
        const populatableRowsCount = uploadedData.filter(row => {
            const isPopulated = row['Populate Project'] === 'true' || row['Populated (Project)'] === 'true';
            return !isPopulated && row['Processed'] === 'Yes';
        }).length;

        // Check if all populatable rows are selected
        if (populatableRowsCount > 0 && selectedRowsForPopulation.length === populatableRowsCount) {
            setSelectAllForPopulation(true);
        } else {
            setSelectAllForPopulation(false);
        }
    }, [selectedRowsForPopulation, uploadedData]);

    // Sync Select All checkbox for the general selection (for new records only)
    useEffect(() => {
        // Count selectable rows (new records that are NOT populated)
        const selectableRowsCount = uploadedData.filter(row =>
            !row.RICEW_Mass_Upload_Form_id && row['Populated'] !== 'true'
        ).length;

        if (selectableRowsCount > 0 && selectedRows.length === selectableRowsCount) {
            setSelectAll(true);
        } else {
            setSelectAll(false);
        }
    }, [selectedRows, uploadedData]);

    // Fetch RICEW Type LOV data and Master Process Stream Data
    // List of fetch functions for LOV data
    const fetchRicewTypes = useCallback(async () => {
        if (ricewTypeLOV.length > 0) return;
        try {
            let idToken;
            try {
                idToken = await getIdToken();
            } catch (tokenError) {
                console.error('Failed to get ID token for RICEW types:', tokenError);
                return;
            }
            const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` };

            const response = await fetchWithRetry('https://7o6jl6k0pd.execute-api.ap-south-1.amazonaws.com/New/LOV/ricew/get/objecttypes', { headers });

            if (response.status === 401 || response.status === 403) {
                console.error('Unauthorized - session expired');
                return;
            }

            const result = await response.json();
            if (result.success) {
                const mappedData = (result.data || []).map(item => ({
                    ...item,
                    objectType: DOMPurify.sanitize(String(ricewTypeMapping[item.objectType] || item.objectType || '').trim(), { ALLOWED_TAGS: [] })
                }));
                setRicewTypeLOV(mappedData);
            }
        } catch (error) {
            console.error('Error fetching RICEW types:', error);
        }
    }, [ricewTypeLOV.length]);

    const fetchMasterProcessStreams = useCallback(async () => {
        if (masterProcessStreamData.length > 0) return;
        try {
            let idToken;
            try {
                idToken = await getIdToken();
            } catch (tokenError) {
                console.error('Failed to get ID token for master process streams:', tokenError);
                return;
            }
            const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` };

            const response = await fetchWithRetry('https://tuo1xmg14d.execute-api.ap-south-1.amazonaws.com/New/rice/get/allMasterProcessStreams', { headers });

            if (response.status === 401 || response.status === 403) {
                console.error('Unauthorized - session expired');
                return;
            }

            if (response.ok) {
                const data = await response.json();
                const sanitizedData = (data || []).map(stream => ({
                    ...stream,
                    stream_name: DOMPurify.sanitize(String(stream.stream_name || '').trim(), { ALLOWED_TAGS: [] }),
                    applications: (stream.applications || []).map(app => ({
                        ...app,
                        app_name: DOMPurify.sanitize(String(app.app_name || '').trim(), { ALLOWED_TAGS: [] })
                    }))
                }));
                setMasterProcessStreamData(sanitizedData);
            }
        } catch (error) {
            console.error('Error fetching master process streams:', error);
        }
    }, [masterProcessStreamData.length]);

    const fetchRICEWStatus = useCallback(async () => {
        if (ricewStatusLOV.length > 0) return;
        try {
            let idToken;
            try {
                idToken = await getIdToken();
            } catch (tokenError) {
                console.error('Failed to get ID token for RICEW Status:', tokenError);
                return;
            }
            const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` };

            const response = await fetchWithRetry('https://7o6jl6k0pd.execute-api.ap-south-1.amazonaws.com/New/LOV/ricew/get/ricew-status', { headers });

            if (response.status === 401 || response.status === 403) {
                console.error('Unauthorized - session expired');
                return;
            }

            const data = await response.json();
            if (data.success && Array.isArray(data.data)) {
                const sanitizedData = data.data.map(item => ({
                    RICEW_Status_Id: item.RICEW_Status_Id,
                    Status_Name: DOMPurify.sanitize(String(item.Status_Name || '').trim(), { ALLOWED_TAGS: [] })
                }));
                const sortedData = sanitizedData.sort((a, b) =>
                    parseInt(a.RICEW_Status_Id) - parseInt(b.RICEW_Status_Id)
                );
                setRicewStatusLOV(sortedData);
            }
        } catch (error) {
            console.error('Error fetching RICEW Status LOV:', error);
        }
    }, [ricewStatusLOV.length]);

    const fetchRateCardNames = useCallback(async () => {
        try {
            const projectId = selectedProject?.id || 101;
            let idToken;
            try {
                idToken = await getIdToken();
            } catch (tokenError) {
                console.error('Failed to get ID token for rate card names:', tokenError);
                return;
            }
            const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` };

            const sanitizedProjectId = DOMPurify.sanitize(String(projectId || '').trim(), { ALLOWED_TAGS: [] });
            const response = await fetchWithRetry(`https://6ooh8kh7i4.execute-api.ap-south-1.amazonaws.com/New/ricew/effortCostRateCard/getUniqueNames?project_id=${sanitizedProjectId}`, { headers });

            if (response.status === 401 || response.status === 403) {
                console.error('Unauthorized - session expired');
                return;
            }

            const result = await response.json();
            if (result.success && Array.isArray(result.data)) {
                const sanitizedData = result.data.map(item => ({
                    ...item,
                    Effort_Rate_Card_Name: DOMPurify.sanitize(String(item.Effort_Rate_Card_Name || '').trim(), { ALLOWED_TAGS: [] })
                }));
                setRateCardLOV(sanitizedData);
            }
        } catch (error) {
            console.error('Error fetching Rate Card Names:', error);
        }
    }, [selectedProject?.id]);

    const fetchWaveRolloutDefinitions = useCallback(async () => {
        if (waveRolloutLOV.length > 0) return;
        try {
            let idToken;
            try {
                idToken = await getIdToken();
            } catch (tokenError) {
                console.error('Failed to get ID token for wave rollout:', tokenError);
                return;
            }
            const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` };

            const response = await fetchWithRetry('https://7o6jl6k0pd.execute-api.ap-south-1.amazonaws.com/New/LOV/ricew/get/wave-rollout-definitions', { headers });

            if (response.status === 401 || response.status === 403) {
                console.error('Unauthorized - session expired');
                return;
            }

            const result = await response.json();
            if (result.success && Array.isArray(result.data)) {
                const sanitizedData = result.data.map(item => ({
                    ...item,
                    Wave_Code: DOMPurify.sanitize(String(item.Wave_Code || '').trim(), { ALLOWED_TAGS: [] }),
                    Wave_Description: DOMPurify.sanitize(String(item.Wave_Description || '').trim(), { ALLOWED_TAGS: [] }),
                    Rollouts: (item.Rollouts || []).map(r => ({
                        ...r,
                        Rollout_Code: DOMPurify.sanitize(String(r.Rollout_Code || '').trim(), { ALLOWED_TAGS: [] }),
                        Rollout_Description: DOMPurify.sanitize(String(r.Rollout_Description || '').trim(), { ALLOWED_TAGS: [] })
                    }))
                }));
                setWaveRolloutLOV(sanitizedData);
            }
        } catch (error) {
            console.error('Error fetching Wave/Rollout definitions:', error);
        }
    }, [waveRolloutLOV.length]);

    const fetchLegalEntityDefinitions = useCallback(async () => {
        if (legalEntityLOV.length > 0) return;
        try {
            let idToken;
            try {
                idToken = await getIdToken();
            } catch (tokenError) {
                console.error('Failed to get ID token for legal entity:', tokenError);
                return;
            }
            const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` };

            const response = await fetchWithRetry('https://7o6jl6k0pd.execute-api.ap-south-1.amazonaws.com/New/LOV/ricew/get/legal-entity-master', { headers });

            if (response.status === 401 || response.status === 403) {
                console.error('Unauthorized - session expired');
                return;
            }

            const result = await response.json();
            if (result.success && Array.isArray(result.data)) {
                const sanitizedData = result.data.map(item => ({
                    ...item,
                    legalEntityCode: DOMPurify.sanitize(String(item.legalEntityCode || '').trim(), { ALLOWED_TAGS: [] }),
                    legalEntityName: DOMPurify.sanitize(String(item.legalEntityName || '').trim(), { ALLOWED_TAGS: [] })
                }));
                setLegalEntityLOV(sanitizedData);
            }
        } catch (error) {
            console.error('Error fetching Legal Entity definitions:', error);
        }
    }, [legalEntityLOV.length]);

    const fetchResourceRosterDefinitions = useCallback(async () => {
        if (resourceRosterLOV.length > 0) return;
        try {
            let idToken;
            try {
                idToken = await getIdToken();
            } catch (tokenError) {
                console.error('Failed to get ID token for resource roster:', tokenError);
                return;
            }
            const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` };

            const response = await fetchWithRetry('https://7o6jl6k0pd.execute-api.ap-south-1.amazonaws.com/New/LOV/ricew/get/full-name-resource-roster-forms', { headers });

            if (response.status === 401 || response.status === 403) {
                console.error('Unauthorized - session expired');
                return;
            }

            const result = await response.json();
            if (result.success && Array.isArray(result.data)) {
                const sanitizedData = result.data.map(item => ({
                    ...item,
                    Resource_Roster_Form_id: DOMPurify.sanitize(String(item.Resource_Roster_Form_id || '').trim(), { ALLOWED_TAGS: [] }),
                    IC_full_name: DOMPurify.sanitize(String(item.IC_full_name || '').trim(), { ALLOWED_TAGS: [] }),
                    IC_email: DOMPurify.sanitize(String(item.IC_email || '').trim(), { ALLOWED_TAGS: [] })
                }));
                setResourceRosterLOV(sanitizedData);
            }
        } catch (error) {
            console.error('Error fetching Resource Roster definitions:', error);
        }
    }, [resourceRosterLOV.length]);

    const fetchOrgServiceLineLOV = useCallback(async () => {
        try {
            let idToken;
            try {
                idToken = await getIdToken();
            } catch (tokenError) {
                console.error('Failed to get ID token for Org Service Line:', tokenError);
                return;
            }
            const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` };

            const projectId = localStorage.getItem('project_id') || selectedProject?.id || 101;
            const sanitizedProjectId = DOMPurify.sanitize(String(projectId || '').trim(), { ALLOWED_TAGS: [] });

            const response = await fetchWithRetry(`https://tfv4q9mq6g.execute-api.ap-south-1.amazonaws.com/New/ricew/resourceRateCard/LOV/si-organization-details?project_id=${sanitizedProjectId}`, { headers });

            if (response.status === 401 || response.status === 403) {
                console.error('Unauthorized - session expired');
                return;
            }

            const result = await response.json();

            if (result.success && Array.isArray(result.data)) {
                const mappedData = [];
                result.data.forEach(item => {
                    // Check if ServiceLines exists and has items
                    if (item.ServiceLines && Array.isArray(item.ServiceLines) && item.ServiceLines.length > 0) {
                        item.ServiceLines.forEach(sl => {
                            // Combination: Business_Line_Name : Portfolio_Name : Service_Name
                            const combinedServiceName = `${DOMPurify.sanitize(String(sl.Business_Line_Name || '').trim(), { ALLOWED_TAGS: [] })} : ${DOMPurify.sanitize(String(sl.Portfolio_Name || '').trim(), { ALLOWED_TAGS: [] })} : ${DOMPurify.sanitize(String(sl.Service_Name || '').trim(), { ALLOWED_TAGS: [] })}`;
                            mappedData.push({
                                organization_name: DOMPurify.sanitize(String(item.SI_organization_name || '').trim(), { ALLOWED_TAGS: [] }),
                                organization_id: item.SI_Organization_Details_id,
                                ServiceLine_name: combinedServiceName
                            });
                        });
                    } else {
                        // Fallback for orgs without service lines
                        mappedData.push({
                            organization_name: DOMPurify.sanitize(String(item.SI_organization_name || '').trim(), { ALLOWED_TAGS: [] }),
                            organization_id: item.SI_Organization_Details_id,
                            ServiceLine_name: ''
                        });
                    }
                });
                setOrgServiceLineLOV(mappedData);
            }
        } catch (error) {
            console.error('Error fetching Org Service Line LOV:', error);
        }
    }, [selectedProject?.id]);

    const fetchExistingRicewNames = useCallback(async () => {
        try {
            let idToken;
            try {
                idToken = await getIdToken();
            } catch (tokenError) {
                console.error('Failed to get ID token for existing RICEW names:', tokenError);
                return;
            }
            const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` };

            const projectId = localStorage.getItem('project_id') || selectedProject?.id || 101;
            const sanitizedProjectId = DOMPurify.sanitize(String(projectId || '').trim(), { ALLOWED_TAGS: [] });

            const response = await fetchWithRetry(`https://hjcf2fs1n0.execute-api.ap-south-1.amazonaws.com/New/mass-upload-form/ricew/getByName?projectId=${sanitizedProjectId}`, { headers });

            if (response.status === 401 || response.status === 403) {
                console.error('Unauthorized - session expired');
                return;
            }

            const result = await response.json();
            if (response.ok && Array.isArray(result.data)) {
                // The backend now returns { id, name, source }
                const names = result.data.map(item => DOMPurify.sanitize(String(item.name || '').trim(), { ALLOWED_TAGS: [] }));
                setExistingRicewNames(names);
            }
        } catch (error) {
            console.error('Error fetching existing RICEW names:', error);
        }
    }, [selectedProject?.id]);

    // Ref to track if initial data fetch has been done
    const initialFetchDone = useRef(false);

    // Initial load and project change effect
    useEffect(() => {
        if (!selectedProject?.id) return;

        // Reset fetch flag when project changes
        initialFetchDone.current = false;

        // Prevent double calls in React Strict Mode
        if (initialFetchDone.current) return;
        initialFetchDone.current = true;

        fetchRicewTypes();
        fetchMasterProcessStreams();
        fetchRICEWStatus();
        fetchRateCardNames();
        fetchWaveRolloutDefinitions();
        fetchLegalEntityDefinitions();
        fetchResourceRosterDefinitions();
        fetchOrgServiceLineLOV();
        fetchMassUploadData();
        fetchObjectTypeCounts();
        fetchExistingRicewNames();
    }, [selectedProject?.id]);

    // Reload mass upload data when Organization LOV is populated to ensure correct name mapping
    useEffect(() => {
        if (orgServiceLineLOV.length > 0) {
            fetchMassUploadData();
        }
    }, [orgServiceLineLOV, fetchMassUploadData]);

    // Set up unsaved changes checker for navigation guard
    useEffect(() => {
        if (setUnsavedChangesChecker) {
            setUnsavedChangesChecker(() => () => {
                // Check if there are any unsaved records (records without RICEW_Mass_Upload_Form_id)
                const hasUnsavedRecords = uploadedData.some(row => !row.RICEW_Mass_Upload_Form_id);
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

    // Handle calculating cost and hours
    const handleCalculate = async (index) => {
        const row = uploadedData[index];
        const { 'Object Type': ricewType, 'Complexity': complexityType, 'Rate Card Name': rateCardName } = row;

        if (!ricewType || !complexityType || !rateCardName) {
            setErrorMessage('Please fill in Object Type, Complexity, and Rate Card Name before calculating.');
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 3000);
            return;
        }

        // Find Effort_Rate_Card_Name_index from rateCardLOV
        const rateCardObj = rateCardLOV.find(rc => rc.Effort_Rate_Card_Name === rateCardName);
        if (!rateCardObj) {
            setErrorMessage('Selected Rate Card Name not found in LOV.');
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 3000);
            return;
        }

        const estimationName = ricewTypeMapping[ricewType] || ricewType;

        const payload = {
            Effort_Rate_Card_Name_index: rateCardObj.Effort_Rate_Card_Name_index,
            ComplexityType: complexityType,
            Estimation_Name: estimationName
        };

        try {
            setLoading(true);

            let idToken;
            try {
                idToken = await getIdToken();
            } catch (tokenError) {
                handleAuthError(tokenError.message);
                setLoading(false);
                return;
            }

            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            };

            // Sanitize payload fields
            const sanitizedPayload = {
                Effort_Rate_Card_Name_index: payload.Effort_Rate_Card_Name_index,
                ComplexityType: DOMPurify.sanitize(String(payload.ComplexityType || '').trim(), { ALLOWED_TAGS: [] }),
                Estimation_Name: DOMPurify.sanitize(String(payload.Estimation_Name || '').trim(), { ALLOWED_TAGS: [] })
            };

            const response = await fetchWithRetry('https://6ooh8kh7i4.execute-api.ap-south-1.amazonaws.com/New/ricew/effortCostRateCard/getCostHours', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(sanitizedPayload)
            });

            if (response.status === 401 || response.status === 403) {
                handleAuthError('Unauthorized - session expired');
                setLoading(false);
                return;
            }

            const result = await response.json();

            if (result.success && result.data) {
                setUploadedData(prevData => {
                    const newData = [...prevData];
                    newData[index] = {
                        ...newData[index],
                        'RICEW Effort (Hours)': DOMPurify.sanitize(String(result.data.Hours || '').trim(), { ALLOWED_TAGS: [] }),
                        'RICEW Cost (currency)': DOMPurify.sanitize(String((result.data.OR_PL_Currency ? (result.data.OR_PL_Currency.match(/\(([^)]+)\)/)?.[1] || result.data.OR_PL_Currency) : '') || '').trim(), { ALLOWED_TAGS: [] }),
                        'RICEW Cost (Amount)': DOMPurify.sanitize(String(result.data.Cost || '').trim(), { ALLOWED_TAGS: [] })
                    };
                    return newData;
                });

                // Clear field errors for auto-populated fields
                setFieldErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors[`${index}-RICEW Effort (Hours)`];
                    delete newErrors[`${index}-RICEW Cost (currency)`];
                    delete newErrors[`${index}-RICEW Cost (Amount)`];
                    return newErrors;
                });

                setSuccessMessage('Calculation successful!');
                setShowSuccessMessage(true); // Show success after loading is done
                setTimeout(() => setShowSuccessMessage(false), 2000);
            } else {
                setErrorMessage('Calculation failed. Please try again.');
                setShowErrorMessage(true);
                setTimeout(() => setShowErrorMessage(false), 3000);
            }
        } catch (error) {
            console.error('Error calculating cost/hours:', error);
            setErrorMessage('Error during calculation. Please check console.');
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 3000);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            const result = await downloadRICEWTemplate();

            if (result.success) {
                setSuccessMessage(result.message);
                setShowSuccessMessage(true);
                setTimeout(() => setShowSuccessMessage(false), 3000);
            } else {
                setErrorMessage(result.message);
                setShowErrorMessage(true);
                setTimeout(() => setShowErrorMessage(false), 5000);
            }
        } catch (error) {
            console.error('Error downloading template:', error);
            setErrorMessage('Failed to download template. Please try again.');
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 5000);
        }
    };

    const handleUploadTemplate = () => {
        // Create a file input element
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xlsx, .xls';

        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Store the file name with path for display
            setUploadedFileName(file.name);

            try {
                // Show loading state
                setSuccessMessage('Processing template...');
                setShowSuccessMessage(true);

                // Parse the uploaded file
                const result = await parseRICEWTemplate(file);

                if (result.success) {
                    console.log('Parsed data:', result.data);
                    console.log('Validation errors:', result.errors);

                    // Validate required fields and collect validation errors
                    const validationErrors = [...result.errors];
                    const validRows = [];
                    let recordsWithRicewName = 0;

                    (result.data || []).forEach((row, index) => {
                        const recordNumber = index + 1;

                        // Check if the row has any data (at least one field filled)
                        const hasAnyData = Object.values(row).some(value =>
                            value !== null && value !== undefined && value !== '' && value.toString().trim() !== ''
                        );

                        // Only process rows that have at least one field filled
                        if (hasAnyData) {
                            recordsWithRicewName++;

                            // Auto-populate Process Stream based on Application
                            let processStream = row['Process Stream'] || '';
                            if (!processStream && row['Application'] && Array.isArray(masterProcessStreamData)) {
                                const match = masterProcessStreamData.find(m => m.app_name === row['Application']);
                                if (match) {
                                    processStream = match.stream_name;
                                }
                            }

                            // Add the row to validRows - validation will happen in handleValidate
                            validRows.push({
                                ...row,
                                'Process Stream': processStream,
                                'RICEW Status Detail': row['RICEW Status'] || 'RICEW Requested',
                                'Upload Template Name': file.name
                            });
                        }
                    });

                    // Store the data in pending state (not in UI yet)
                    // User must click Validate to check data before it loads to UI
                    setPendingUploadData(validRows);

                    setSuccessMessage(`Template uploaded successfully! ${validRows.length} record(s) ready for validation.`);
                    setShowSuccessMessage(true);
                    setTimeout(() => setShowSuccessMessage(false), 3000);

                    // Reset validation status when new file is uploaded
                    setValidationStatus(null);

                } else {
                    setErrorMessage(result.message);
                    setShowErrorMessage(true);
                    setTimeout(() => setShowErrorMessage(false), 5000);
                }
            } catch (error) {
                console.error('Error uploading template:', error);
                setErrorMessage('Failed to process template. Please try again.');
                setShowErrorMessage(true);
                setTimeout(() => setShowErrorMessage(false), 5000);
            }
        };

        // Trigger file selection
        input.click();
    };

    const handleValidate = async () => {
        // Check if there's pending data to validate
        if (pendingUploadData.length === 0) {
            setErrorMessage('No data to validate. Please upload a template first.');
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 3000);
            return;
        }

        // Validate all pending records for required fields
        const validationErrors = [];

        pendingUploadData.forEach((row, index) => {
            requiredFields.forEach(field => {
                const value = row[field];
                const isEmpty = value === null || value === undefined || value === '' || (typeof value === 'string' && value.trim() === '');

                if (isEmpty) {
                    validationErrors.push({
                        row: index + 1,
                        field: field,
                        message: `${field} is required`
                    });
                }
            });

            // Validate RICEW Name uniqueness
            const ricewName = row['RICEW Name'];
            if (ricewName) {
                if (existingRicewNames.includes(ricewName)) {
                    // Check against database first
                    validationErrors.push({
                        row: index + 1,
                        field: 'RICEW Name',
                        message: `Record ${index + 1}: RICEW Name '${ricewName}' already exists in the system. Names must be unique.`
                    });
                } else if (pendingUploadData.some((r, i) => i < index && r['RICEW Name'] === ricewName)) {
                    // Then check if repeated within the same upload file
                    validationErrors.push({
                        row: index + 1,
                        field: 'RICEW Name',
                        message: `Record ${index + 1}: RICEW Name '${ricewName}' is repeated within the uploaded template.`
                    });
                } else if (uploadedData.some(r => r['RICEW Name'] === ricewName)) {
                    // Finally check against data already in the UI table (unsaved OR previously saved)
                    validationErrors.push({
                        row: index + 1,
                        field: 'RICEW Name',
                        message: `Record ${index + 1}: RICEW Name '${ricewName}' already exists in the current table.`
                    });
                }
            }

            // Validate Organization Name and Service Line
            const orgName = row['Organization Name'] ? row['Organization Name'].trim() : '';
            const serviceLine = row['Service Line'] ? row['Service Line'].trim() : '';

            if (orgName) {
                // Check if Organization exists in LOV
                const validOrg = orgServiceLineLOV.find(o => o.organization_name === orgName);
                if (!validOrg) {
                    validationErrors.push({
                        row: index + 1,
                        field: 'Organization Name',
                        message: `Record ${index + 1}: Organization '${orgName}' does not exist in the system. Please select a valid Organization.`
                    });
                } else if (serviceLine) {
                    // Check if the Service Line belongs to this Organization
                    const validCombo = orgServiceLineLOV.find(
                        o => o.organization_name === orgName && o.ServiceLine_name === serviceLine
                    );
                    if (!validCombo) {
                        validationErrors.push({
                            row: index + 1,
                            field: 'Service Line',
                            message: `Record ${index + 1}: Service Line '${serviceLine}' does not belong to Organization '${orgName}'. Please select a valid Service Line for this Organization.`
                        });
                    }
                }
            }

            if (serviceLine && !orgName) {
                validationErrors.push({
                    row: index + 1,
                    field: 'Organization Name',
                    message: `Record ${index + 1}: Organization Name is required when Service Line is provided.`
                });
            }

            // Validate Application name against master data
            const applicationName = row['Application'];
            if (applicationName && Array.isArray(masterProcessStreamData)) {
                const isValidApplication = masterProcessStreamData.some(m => m.app_name === applicationName);
                if (!isValidApplication) {
                    validationErrors.push({
                        row: index + 1,
                        field: 'Application',
                        message: `Record ${index + 1}: Invalid Application name '${applicationName}'. Please select a valid Application from the list.`
                    });
                }
            }

            // Validate Object Type against mapping
            const objectType = row['Object Type'];
            const ricewTypeToEstimationNameMap = {
                'Alert': 'Alert',
                'Analytics Report': 'Analytics Reports',
                'Conversion': 'Conversions',
                'Extension': 'Extensions',
                'Integration': 'Integrations',
                'Personalization': 'Personalization',
                'Report': 'Reports',
                'Workflow': 'Workflow'
            };

            // Check if valid key, valid value, or in API data
            const isValidMapKey = !!ricewTypeToEstimationNameMap[objectType];
            const isValidMapValue = Object.values(ricewTypeToEstimationNameMap).includes(objectType);
            const isValidApiType = Array.isArray(ricewTypeLOV) && ricewTypeLOV.some(apiItem => apiItem.objectType === objectType);

            if (objectType && !isValidMapKey && !isValidMapValue && !isValidApiType) {
                validationErrors.push({
                    row: index + 1,
                    field: 'Object Type',
                    message: `Record ${index + 1}: Invalid Object Type '${objectType}'. Please select a valid Object Type from the list.`
                });
            }
        });

        if (validationErrors.length > 0) {
            // Validation failed - show errors
            setValidationErrorsList(validationErrors);
            setShowValidationErrorsModal(true);

            // Set validation status to error
            setValidationStatus('error');

            // Do NOT load data to UI
            setErrorMessage(`Validation failed! Found ${validationErrors.length} error(s). Please fix them before proceeding.`);
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 5000);
        } else {
            // All validations passed - Proceed to auto-save
            try {
                setSuccessMessage(`Validation successful! Saving ${pendingUploadData.length} record(s)...`);
                setShowSuccessMessage(true);

                // Map data to API format
                const ricewTypeToEstimationNameMap = {
                    'Alert': 'Alert',
                    'Analytics Report': 'Analytics Reports',
                    'Conversion': 'Conversions',
                    'Extension': 'Extensions',
                    'Integration': 'Integrations',
                    'Personalization': 'Personalization',
                    'Report': 'Reports',
                    'Workflow': 'Workflow'
                };

                const records = pendingUploadData.map(row => {
                    const orgItem = orgServiceLineLOV.find(item => item.organization_name === row['Organization Name']);
                    const userId = localStorage.getItem('user_id') || '1';
                    const createdBy = localStorage.getItem('user_id') || userId;
                    const projectId = localStorage.getItem('project_id') || selectedProject?.id?.toString() || '101';

                    return {
                        RICEW_Name: DOMPurify.sanitize(String(row['RICEW Name'] || '').trim(), { ALLOWED_TAGS: [] }),
                        RICEW_Description: DOMPurify.sanitize(String(row['RICEW Description'] || '').trim(), { ALLOWED_TAGS: [] }),
                        RICEW_Process_Name: DOMPurify.sanitize(String(row['Process Stream'] || '').trim(), { ALLOWED_TAGS: [] }),
                        RICEW_Application: DOMPurify.sanitize(String(row['Application'] || '').trim(), { ALLOWED_TAGS: [] }),
                        RICEW_Object_Type: DOMPurify.sanitize(String(row['Object Type'] || '').trim(), { ALLOWED_TAGS: [] }),
                        Estimation_Name: DOMPurify.sanitize(String(ricewTypeToEstimationNameMap[row['Object Type']] || row['Object Type'] || '').trim(), { ALLOWED_TAGS: [] }),
                        RICEW_Complexity: DOMPurify.sanitize(String(row['Complexity'] || '').trim(), { ALLOWED_TAGS: [] }),
                        organization_id: orgItem ? orgItem.organization_id : '',
                        Service_Line_name: DOMPurify.sanitize(String(row['Service Line'] || '').trim(), { ALLOWED_TAGS: [] }),
                        Upload_Template_Name: DOMPurify.sanitize(String(row['Upload Template Name'] || '').trim(), { ALLOWED_TAGS: [] }),
                        project_id: DOMPurify.sanitize(String(projectId || '').trim(), { ALLOWED_TAGS: [] }),
                        user_id: DOMPurify.sanitize(String(userId || '').trim(), { ALLOWED_TAGS: [] }),
                        created_by: DOMPurify.sanitize(String(createdBy || '').trim(), { ALLOWED_TAGS: [] })
                    };
                });

                let idToken;
                try {
                    idToken = await getIdToken();
                } catch (tokenError) {
                    handleAuthError(tokenError.message);
                    setErrorMessage('Session expired. Please log in again.');
                    setShowErrorMessage(true);
                    return;
                }

                const authHeaders = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                };

                const response = await fetchWithRetry('https://hjcf2fs1n0.execute-api.ap-south-1.amazonaws.com/New/mass-upload-form/ricew/post', {
                    method: 'POST',
                    headers: authHeaders,
                    body: JSON.stringify({ records })
                });

                if (response.status === 401 || response.status === 403) {
                    handleAuthError('Unauthorized - session expired');
                    setErrorMessage('Session expired. Please log in again.');
                    setShowErrorMessage(true);
                    return;
                }

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || result.message || 'Failed to save entries');
                }

                const { success_count, fail_count } = result.data || {};

                if (fail_count > 0) {
                    setErrorMessage(`Validation passed but save had issues: ${success_count} success, ${fail_count} failed.`);
                    setShowErrorMessage(true);
                    setShowSuccessMessage(false);
                } else {
                    setSuccessMessage(`Validation successful and ${success_count} record(s) saved!`);
                    setShowSuccessMessage(true);
                }

                // Clear pending data and refresh UI
                setTimeout(() => {
                    setShowSuccessMessage(false);
                    setPendingUploadData([]);
                    sessionStorage.removeItem('ricew_pending_upload_data');
                    setValidationStatus('success');
                    setUploadedFileName(''); // Reset file tracking after successful save

                    fetchMassUploadData(); // Refresh the list from the database
                    fetchObjectTypeCounts(); // Refresh object type counts
                    fetchExistingRicewNames(); // Refresh existing RICEW names
                }, 1000);

            } catch (error) {
                console.error('Error during auto-save:', error);
                setErrorMessage(`Validation passed but save failed: ${error.message}`);
                setShowErrorMessage(true);
                setShowSuccessMessage(false);

                // On save error, still load data to UI so user can manually fix/save
                const recordsWithFileName = pendingUploadData.map(record => ({
                    ...record,
                    _uploadedFileName: uploadedFileName
                }));
                setUploadedData(prevData => [...recordsWithFileName, ...prevData]);
                setPendingUploadData([]);
                setValidationStatus('error');
            }
        }
    };

    // Helper function to check if all records from current upload are gone
    const checkAndClearFileName = (remainingData) => {
        if (uploadedFileName) {
            // Check if any records with the current file name still exist
            const hasRecordsFromCurrentUpload = remainingData.some(
                record => record._uploadedFileName === uploadedFileName
            );

            if (!hasRecordsFromCurrentUpload) {
                // All records from this upload are gone, clear the file name and validation status
                setUploadedFileName('');
                setValidationStatus(null); // Clear the Yes/Error button
            }
        }
    };

    const handleDeleteRecords = () => {
        if (selectedRowsForDeletion.length === 0) {
            setErrorMessage('Please select records to delete.');
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 3000);
            return;
        }

        // Distinguish between Saved (DB) and Unsaved (Local) records
        const selectedRecords = selectedRowsForDeletion.map(index => uploadedData[index]);
        const savedRecords = selectedRecords.filter(row => row.RICEW_Mass_Upload_Form_id);
        const unsavedRecords = selectedRecords.filter(row => !row.RICEW_Mass_Upload_Form_id);

        const processedRecords = savedRecords.filter(row =>
            row['Processed'] === 'Yes' || row['Processed'] === true || row['Processed'] === 'true'
        );

        const savedCount = savedRecords.length;
        const unsavedCount = unsavedRecords.length;
        const processedCount = processedRecords.length;
        const totalCount = selectedRowsForDeletion.length;

        // Build the confirmation message
        let message = `You have selected ${totalCount} ${totalCount === 1 ? 'record' : 'records'}:\n\n`;

        if (unsavedCount > 0) {
            message += `• ${unsavedCount} Unsaved ${unsavedCount === 1 ? 'record' : 'records'} will be cleared from the table.\n`;
        }

        if (savedCount > 0) {
            message += `• ${savedCount} Saved ${savedCount === 1 ? 'record' : 'records'} will be permanently deleted from the database.\n`;

        }

        message += `\nThis action cannot be undone. Do you want to continue?`;

        showConfirmation(message, async () => {
            // Identify database IDs for selected records
            const idsToDelete = selectedRowsForDeletion
                .map(index => uploadedData[index]?.RICEW_Mass_Upload_Form_id)
                .filter(id => id !== undefined && id !== null);

            try {
                if (idsToDelete.length > 0) {
                    setSuccessMessage(`Deleting ${idsToDelete.length} record(s)...`);
                    setShowSuccessMessage(true);

                    let idToken = null;
                    try {
                        idToken = await getIdToken();
                    } catch (tokenError) {
                        console.error('Failed to get ID token for deletion:', tokenError);
                    }

                    const authHeaders = {
                        'Content-Type': 'application/json'
                    };
                    if (idToken) {
                        authHeaders['Authorization'] = `Bearer ${idToken}`;
                    }

                    const response = await fetchWithRetry('https://hjcf2fs1n0.execute-api.ap-south-1.amazonaws.com/New/mass-upload-form/ricew/deleteRecord', {
                        method: 'DELETE',
                        headers: authHeaders,
                        body: JSON.stringify({ ids: idsToDelete })
                    });

                    const result = await response.json();

                    if (!response.ok) {
                        throw new Error(result.error || result.message || 'Failed to delete records');
                    }

                    // Removed the fixed message from here to put it after the if block
                }

                const finalMessage = totalCount === 1 ? 'Record deleted successfully!' : 'Records deleted successfully!';
                setSuccessMessage(finalMessage);

                // Update local state by removing the selected rows
                const updatedData = uploadedData.filter((_, index) => !selectedRowsForDeletion.includes(index));
                setUploadedData(updatedData);

                // Check if we should clear the file name
                checkAndClearFileName(updatedData);

                // Clear field errors as indices will be shifted
                setFieldErrors({});

                // Reset selection and editing states
                setSelectedRowsForDeletion([]);
                setSelectAllForDeletion(false);
                setEditingRowIndex(null);
                setEditingCell(null);
                setOriginalRowData(null);

                setShowSuccessMessage(true);
                setTimeout(() => {
                    setShowSuccessMessage(false);
                    if (idsToDelete.length > 0) {
                        fetchMassUploadData(); // Refresh from DB to ensure sync
                        fetchObjectTypeCounts(); // Refresh object type counts
                        fetchExistingRicewNames(); // Refresh existing RICEW names
                    }
                }, 1000);

            } catch (error) {
                console.error('Error deleting data:', error);
                setErrorMessage(`Failed to delete records: ${error.message}`);
                setShowErrorMessage(true);
                setShowSuccessMessage(false);
                setTimeout(() => setShowErrorMessage(false), 5000);
            }
        });
    };

    const handleSave = async () => {
        if (uploadedData.length === 0) {
            setErrorMessage('No data to save. Please upload a template first.');
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 3000);
            return;
        }

        // Filter to only include new records that are SELECTED
        const selectedNewRecords = uploadedData.filter((row, index) =>
            !row.RICEW_Mass_Upload_Form_id && selectedRows.includes(index)
        );

        if (selectedNewRecords.length === 0) {
            const hasNewUnselected = uploadedData.some(row => !row.RICEW_Mass_Upload_Form_id);
            setErrorMessage(hasNewUnselected
                ? 'Please select the new records you want to save.'
                : 'No new data to save. All records are already saved or the table is empty.');
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 3000);
            return;
        }

        // Validate required fields for SELECTED NEW rows only
        const newFieldErrors = {};
        let hasErrors = false;

        selectedNewRecords.forEach((row) => {
            const rowIndex = uploadedData.indexOf(row); // Get original index for error highlighting
            requiredFields.forEach(field => {
                const value = row[field];
                const isEmpty = value === null || value === undefined || value === '' || (typeof value === 'string' && value.trim() === '');

                if (isEmpty) {
                    const errorKey = `${rowIndex}-${field}`;
                    newFieldErrors[errorKey] = `${field} is required`;
                    hasErrors = true;
                }
            });

            // Validate Organization Name and Service Line
            const orgName = row['Organization Name'] ? row['Organization Name'].trim() : '';
            const serviceLine = row['Service Line'] ? row['Service Line'].trim() : '';

            if (orgName) {
                // Check if Organization exists in LOV
                const validOrg = orgServiceLineLOV.find(o => o.organization_name === orgName);
                if (!validOrg) {
                    const errorKey = `${rowIndex}-Organization Name`;
                    newFieldErrors[errorKey] = `Invalid Organization Name: '${orgName}' does not exist.`;
                    hasErrors = true;
                } else if (serviceLine) {
                    // Check if Service Line belongs to this Organization
                    // We need to find if there's an entry with this Org Name AND this Service Line
                    const validCombination = orgServiceLineLOV.find(o =>
                        o.organization_name === orgName &&
                        (o.ServiceLine_name === serviceLine || o.Service_Line_name === serviceLine)
                    );

                    if (!validCombination) {
                        const errorKey = `${rowIndex}-Service Line`;
                        newFieldErrors[errorKey] = `Invalid Service Line: '${serviceLine}' does not belong to Organization '${orgName}'.`;
                        hasErrors = true;
                    }
                }
            }

            if (serviceLine && !orgName) {
                const errorKey = `${rowIndex}-Organization Name`;
                newFieldErrors[errorKey] = `Organization Name is required when Service Line is provided.`;
                hasErrors = true;
            }

            // Validate RICEW Name uniqueness
            const ricewName = row['RICEW Name'];
            if (ricewName) {
                if (existingRicewNames.includes(ricewName)) {
                    const errorKey = `${rowIndex}-RICEW Name`;
                    newFieldErrors[errorKey] = `RICEW Name '${ricewName}' already exists in the system.`;
                    hasErrors = true;
                } else if (selectedNewRecords.some((r, i) => selectedNewRecords.indexOf(r) < selectedNewRecords.indexOf(row) && r['RICEW Name'] === ricewName)) {
                    const errorKey = `${rowIndex}-RICEW Name`;
                    newFieldErrors[errorKey] = `RICEW Name '${ricewName}' is repeated in the selected records.`;
                    hasErrors = true;
                }
            }
        });

        setFieldErrors(newFieldErrors);

        if (hasErrors) {
            setErrorMessage('Please fill all required fields for the selected records before saving.');
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 5000);
            return;
        }

        try {
            setSuccessMessage(`Saving ${selectedNewRecords.length} selected record(s)...`);
            setShowSuccessMessage(true);

            // Map ONLY the selected new records to API format
            const ricewTypeToEstimationNameMap = {
                'Alert': 'Alert',
                'Analytics Report': 'Analytics Reports',
                'Conversion': 'Conversions',
                'Extension': 'Extensions',
                'Integration': 'Integrations',
                'Personalization': 'Personalization',
                'Report': 'Reports',
                'Workflow': 'Workflow'
            };

            const records = selectedNewRecords.map(row => {
                let orgItem;
                const orgName = row['Organization Name'];
                const serviceLine = row['Service Line'];

                if (serviceLine) {
                    orgItem = orgServiceLineLOV.find(item =>
                        item.organization_name === orgName &&
                        (item.ServiceLine_name === serviceLine || item.Service_Line_name === serviceLine)
                    );
                }

                // Fallback or if no service line
                if (!orgItem) {
                    orgItem = orgServiceLineLOV.find(item => item.organization_name === orgName);
                }

                const userId = localStorage.getItem('user_id') || '1';
                const createdBy = localStorage.getItem('user_id') || userId;
                const projectId = localStorage.getItem('project_id') || selectedProject?.id?.toString() || '101';

                return {
                    RICEW_Name: DOMPurify.sanitize(String(row['RICEW Name'] || '').trim(), { ALLOWED_TAGS: [] }),
                    RICEW_Description: DOMPurify.sanitize(String(row['RICEW Description'] || '').trim(), { ALLOWED_TAGS: [] }),
                    RICEW_Process_Name: DOMPurify.sanitize(String(row['Process Stream'] || '').trim(), { ALLOWED_TAGS: [] }),
                    RICEW_Application: DOMPurify.sanitize(String(row['Application'] || '').trim(), { ALLOWED_TAGS: [] }),
                    RICEW_Object_Type: DOMPurify.sanitize(String(row['Object Type'] || '').trim(), { ALLOWED_TAGS: [] }),
                    Estimation_Name: DOMPurify.sanitize(String(ricewTypeToEstimationNameMap[row['Object Type']] || row['Object Type'] || '').trim(), { ALLOWED_TAGS: [] }),
                    RICEW_Complexity: DOMPurify.sanitize(String(row['Complexity'] || '').trim(), { ALLOWED_TAGS: [] }),
                    organization_id: orgItem ? orgItem.organization_id : '',
                    Service_Line_name: DOMPurify.sanitize(String(serviceLine || '').trim(), { ALLOWED_TAGS: [] }),
                    Upload_Template_Name: DOMPurify.sanitize(String(row['Upload Template Name'] || '').trim(), { ALLOWED_TAGS: [] }),
                    project_id: DOMPurify.sanitize(String(projectId || '').trim(), { ALLOWED_TAGS: [] }),
                    user_id: DOMPurify.sanitize(String(userId || '').trim(), { ALLOWED_TAGS: [] }),
                    created_by: DOMPurify.sanitize(String(createdBy || '').trim(), { ALLOWED_TAGS: [] })
                };
            });

            let idToken;
            try {
                idToken = await getIdToken();
            } catch (tokenError) {
                handleAuthError(tokenError.message);
                setErrorMessage('Session expired. Please log in again.');
                setShowErrorMessage(true);
                return;
            }

            const authHeaders = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            };

            // Single step: Save and Process
            const response = await fetchWithRetry('https://hjcf2fs1n0.execute-api.ap-south-1.amazonaws.com/New/mass-upload-form/ricew/post', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ records })
            });

            if (response.status === 401 || response.status === 403) {
                handleAuthError('Unauthorized - session expired');
                setErrorMessage('Session expired. Please log in again.');
                setShowErrorMessage(true);
                return;
            }

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || result.message || 'Failed to save data');
            }

            // Success feedback
            const { success_count, fail_count, group_status } = result.data || {};

            if (fail_count > 0) {
                setErrorMessage(`Processed with issues: ${success_count} success, ${fail_count} failed. Status: ${group_status}`);
                setShowErrorMessage(true);
                setShowSuccessMessage(false);
            } else {
                setSuccessMessage(`Successfully submitted ${success_count} record(s)!`);
                setShowSuccessMessage(true);
            }

            // After success, remove ONLY the selected records from local state and refresh
            setTimeout(() => {
                setShowSuccessMessage(false);

                // Check if we should clear the file name after removing saved records
                setUploadedData(prevData => {
                    const updatedData = prevData.filter((_, index) => !selectedRows.includes(index));
                    checkAndClearFileName(updatedData);
                    return updatedData;
                });

                setFieldErrors(prevErrors => {
                    const newErrors = { ...prevErrors };
                    // Remove errors for the saved row indices
                    selectedRows.forEach(savedIndex => {
                        Object.keys(newErrors).forEach(key => {
                            if (key.startsWith(`${savedIndex}-`)) {
                                delete newErrors[key];
                            }
                        });
                    });
                    return newErrors;
                });
                setSelectedRows([]);
                setSelectAll(false);
                fetchMassUploadData(); // Refresh the list from the database
                fetchObjectTypeCounts(); // Refresh object type counts
                fetchExistingRicewNames(); // Refresh existing RICEW names
            }, 1000);

        } catch (error) {
            console.error('Error saving data:', error);
            setErrorMessage(`Failed to save data: ${error.message}`);
            setShowErrorMessage(true);
            setShowSuccessMessage(false);
            setTimeout(() => setShowErrorMessage(false), 5000);
        }
    };

    // Handle Populating RICEW Records into the main Request Form
    const handlePopulateProject = async () => {
        if (selectedRowsForPopulation.length === 0) {
            setErrorMessage('Please select records to populate into the project.');
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 3000);
            return;
        }

        const idsToPopulate = selectedRowsForPopulation
            .map(index => uploadedData[index]?.RICEW_Mass_Upload_Form_id)
            .filter(id => !!id);

        if (idsToPopulate.length === 0) {
            setErrorMessage('No valid record IDs found for population.');
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 3000);
            return;
        }

        // Open the populate modal instead of simple confirmation
        setPopulateProjectName(selectedProject?.name || '');
        setPopulateRicewStatus('');
        setShowPopulateModal(true);
    };

    const handlePopulateSubmit = async () => {
        if (!populateRicewStatus) {
            setErrorMessage('Please select a RICEW Status');
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 3000);
            return;
        }

        const idsToPopulate = selectedRowsForPopulation
            .map(index => uploadedData[index]?.RICEW_Mass_Upload_Form_id)
            .filter(id => !!id);

        try {
            setLoading(true);
            setSuccessMessage(`Populating ${idsToPopulate.length} record(s)...`);
            setShowSuccessMessage(true);

            let idToken;
            try {
                idToken = await getIdToken();
            } catch (tokenError) {
                handleAuthError(tokenError.message);
                setErrorMessage('Session expired. Please log in again.');
                setShowErrorMessage(true);
                setLoading(false);
                return;
            }

            const authHeaders = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            };

            const payload = {
                records: idsToPopulate.map(id => ({
                    id: DOMPurify.sanitize(String(id || '').trim(), { ALLOWED_TAGS: [] }),
                    RICEW_Status: DOMPurify.sanitize(String(populateRicewStatus || '').trim(), { ALLOWED_TAGS: [] })
                }))
            };

            const response = await fetchWithRetry('https://fr4i5ak8bd.execute-api.ap-south-1.amazonaws.com/New/mass-upload-form/ricew/map-to-request-form', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify(payload)
            });

            if (response.status === 401 || response.status === 403) {
                handleAuthError('Unauthorized - session expired');
                setErrorMessage('Session expired. Please log in again.');
                setShowErrorMessage(true);
                setLoading(false);
                return;
            }

            const result = await response.json();

            if (response.ok) {
                const { mapped_records } = result.data || {};
                const successRecords = mapped_records?.filter(r => r.status === 'success') || [];
                const skippedRecords = mapped_records?.filter(r => r.status === 'skipped') || [];
                const failedRecords = mapped_records?.filter(r => r.status === 'failed') || [];

                const successCount = successRecords.length;
                const skippedCount = skippedRecords.length;
                const failedCount = failedRecords.length;

                // Close modal
                setShowPopulateModal(false);

                if (successCount === 0 && (skippedCount > 0 || failedCount > 0)) {
                    // If no records were successful, show an error message
                    let errorMsg = '';
                    if (skippedCount > 0) {
                        // Extract the duplicate message if only one record was processed, or show summary
                        errorMsg = skippedCount === 1
                            ? skippedRecords[0].message
                            : `${skippedCount} records were skipped as duplicates.`;
                    }
                    if (failedCount > 0) {
                        errorMsg += (errorMsg ? ' ' : '') + `${failedCount} records failed to populate.`;
                    }

                    setErrorMessage(errorMsg || 'Failed to populate records');
                    setShowErrorMessage(true);
                    setShowSuccessMessage(false);
                    setTimeout(() => setShowErrorMessage(false), 5000);
                } else {
                    // Show success message with details about skipped/failed records
                    let message = `Successfully populated ${successCount} record(s).`;
                    if (skippedCount > 0) {
                        message += ` ${skippedCount} record(s) were skipped (duplicates found).`;
                    }
                    if (failedCount > 0) {
                        message += ` ${failedCount} record(s) failed.`;
                    }

                    setSuccessMessage(message);
                    setShowSuccessMessage(true);
                    setTimeout(() => setShowSuccessMessage(false), 5000);
                }

                // Refresh data to show updated 'Populated' status
                setTimeout(async () => {
                    await fetchMassUploadData();
                    await fetchObjectTypeCounts();
                    // We don't clear success message here anymore, let the timeout handle it
                    setSelectedRowsForPopulation([]);
                    setSelectAllForPopulation(false);
                }, 1000);

            } else {
                throw new Error(result.error || result.message || 'Failed to populate records');
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



    // Handle saving changes for a single row (specifically for existing records)
    const handleSingleRowSave = async (index) => {
        const row = uploadedData[index];

        // Only use the updateRecord API for existing database records
        if (!row.RICEW_Mass_Upload_Form_id) {
            setEditingRowIndex(null);
            setOriginalRowData(null);
            return;
        }

        // Validate required fields for the row
        const rowErrors = {};
        let hasErrors = false;
        requiredFields.forEach(field => {
            // Skip validation for Upload Template Name on existing records as it's read-only
            if (field === 'Upload Template Name') return;

            const value = row[field];
            const isEmpty = value === null || value === undefined || value === '' || (typeof value === 'string' && value.trim() === '');
            if (isEmpty) {
                rowErrors[`${index}-${field}`] = `${field} is required`;
                hasErrors = true;
            }
        });

        // Uniqueness check for RICEW Name
        const ricewName = row['RICEW Name'];
        const originalName = originalRowData?.['RICEW Name'];
        if (ricewName && ricewName !== originalName && existingRicewNames.includes(ricewName)) {
            rowErrors[`${index}-RICEW Name`] = `RICEW Name '${ricewName}' already exists.`;
            hasErrors = true;
        }

        // Validate Organization Name and Service Line
        const orgName = row['Organization Name'] ? row['Organization Name'].trim() : '';
        const serviceLine = row['Service Line'] ? row['Service Line'].trim() : '';

        if (orgName) {
            const validOrg = orgServiceLineLOV.find(o => o.organization_name === orgName);
            if (!validOrg) {
                rowErrors[`${index}-Organization Name`] = `Invalid Organization Name: '${orgName}' does not exist.`;
                hasErrors = true;
            } else if (serviceLine) {
                const validCombination = orgServiceLineLOV.find(o =>
                    o.organization_name === orgName &&
                    (o.ServiceLine_name === serviceLine || o.Service_Line_name === serviceLine)
                );
                if (!validCombination) {
                    rowErrors[`${index}-Service Line`] = `Invalid Service Line: '${serviceLine}' does not belong to Organization '${orgName}'.`;
                    hasErrors = true;
                }
            }
        }

        if (serviceLine && !orgName) {
            rowErrors[`${index}-Organization Name`] = `Organization Name is required when Service Line is provided.`;
            hasErrors = true;
        }

        if (hasErrors) {
            setFieldErrors(prev => ({ ...prev, ...rowErrors }));
            setErrorMessage('Please fill all required fields before saving.');
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 5000);
            return;
        }

        const proceedWithSave = async () => {
            try {
                setSuccessMessage('Saving record...');
                setShowSuccessMessage(true);

                let idToken;
                try {
                    idToken = await getIdToken();
                } catch (tokenError) {
                    handleAuthError(tokenError.message);
                    setErrorMessage('Session expired. Please log in again.');
                    setShowErrorMessage(true);
                    setShowSuccessMessage(false);
                    return;
                }

                const authHeaders = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                };

                const ricewTypeToEstimationNameMap = {
                    'Alert': 'Alert',
                    'Analytics Report': 'Analytics Reports',
                    'Conversion': 'Conversions',
                    'Extension': 'Extensions',
                    'Integration': 'Integrations',
                    'Personalization': 'Personalization',
                    'Report': 'Reports',
                    'Workflow': 'Workflow'
                };

                const orgName = row['Organization Name'] ? row['Organization Name'].trim() : '';
                const serviceLine = row['Service Line'] ? row['Service Line'].trim() : '';

                let orgItem;
                if (serviceLine) {
                    orgItem = orgServiceLineLOV.find(item =>
                        item.organization_name === orgName &&
                        (item.ServiceLine_name === serviceLine || item.Service_Line_name === serviceLine)
                    );
                }

                if (!orgItem) {
                    orgItem = orgServiceLineLOV.find(item => item.organization_name === orgName);
                }
                const payload = {
                    records: [{
                        RICEW_Mass_Upload_Form_id: DOMPurify.sanitize(String(row.RICEW_Mass_Upload_Form_id || '').trim(), { ALLOWED_TAGS: [] }),
                        RICEW_Name: DOMPurify.sanitize(String(row['RICEW Name'] || '').trim(), { ALLOWED_TAGS: [] }),
                        RICEW_Description: DOMPurify.sanitize(String(row['RICEW Description'] || '').trim(), { ALLOWED_TAGS: [] }),
                        RICEW_Process_Name: DOMPurify.sanitize(String(row['Process Stream'] || '').trim(), { ALLOWED_TAGS: [] }),
                        RICEW_Application: DOMPurify.sanitize(String(row['Application'] || '').trim(), { ALLOWED_TAGS: [] }),
                        RICEW_Object_Type: DOMPurify.sanitize(String(row['Object Type'] || '').trim(), { ALLOWED_TAGS: [] }),
                        Estimation_Name: DOMPurify.sanitize(String(ricewTypeToEstimationNameMap[row['Object Type']] || row['Object Type'] || '').trim(), { ALLOWED_TAGS: [] }),
                        RICEW_Complexity: DOMPurify.sanitize(String(row['Complexity'] || '').trim(), { ALLOWED_TAGS: [] }),
                        organization_id: orgItem ? orgItem.organization_id : '',
                        Service_Line_name: DOMPurify.sanitize(String(row['Service Line'] || '').trim(), { ALLOWED_TAGS: [] }),
                        Upload_Template_Name: DOMPurify.sanitize(String(row['Upload Template Name'] || '').trim(), { ALLOWED_TAGS: [] })
                    }]
                };

                const response = await fetchWithRetry('https://hjcf2fs1n0.execute-api.ap-south-1.amazonaws.com/New/mass-upload-form/ricew/updateRecord', {
                    method: 'POST',
                    headers: authHeaders,
                    body: JSON.stringify(payload)
                });

                if (response.status === 401 || response.status === 403) {
                    handleAuthError('Unauthorized - session expired');
                    setErrorMessage('Session expired. Please log in again.');
                    setShowErrorMessage(true);
                    setShowSuccessMessage(false);
                    return;
                }

                const result = await response.json();
                if (response.ok) {
                    setSuccessMessage('Record updated successfully!');
                    setEditingRowIndex(null);
                    setOriginalRowData(null);
                    // Refresh data to ensure UI is in sync
                    setTimeout(() => {
                        setShowSuccessMessage(false);
                        fetchMassUploadData();
                        fetchObjectTypeCounts(); // Refresh object type counts
                        fetchExistingRicewNames(); // Refresh existing RICEW names
                    }, 1000);
                } else {
                    throw new Error(result.error || result.message || 'Failed to update record');
                }
            } catch (error) {
                console.error('Error updating row:', error);
                setErrorMessage(`Failed to update: ${error.message}`);
                setShowErrorMessage(true);
                setShowSuccessMessage(false);
                setTimeout(() => setShowErrorMessage(false), 5000);
            }
        };

        // If the record is already processed, show a confirmation dialog
        if (row['Processed'] === 'Yes' || row['Processed'] === true || row['Processed'] === 'true') {
            showConfirmation(
                'This record is already Processed. Updating it will automatically recalculate the Effort (Hours) and Cost based on the latest Rate Cards. Do you want to continue?',
                proceedWithSave,
                () => {
                    // On cancel, also close the edit mode and restore original data
                    if (originalRowData) {
                        const updatedData = uploadedData.map((r, i) =>
                            i === index ? originalRowData : r
                        );
                        setUploadedData(updatedData);
                        sessionStorage.setItem('ricew_bulk_upload_data', JSON.stringify(updatedData));
                    }
                    setEditingRowIndex(null);
                    setOriginalRowData(null);
                    if (editingCell) {
                        setEditingCell(null);
                        setEditValue('');
                    }
                }
            );
        } else {
            // Otherwise, proceed directly with save
            proceedWithSave();
        }
    };



    // Handle remove row
    const handleRemoveRow = (index) => {
        setUploadedData(prevData => {
            const newData = [...prevData];
            newData.splice(index, 1);
            return newData;
        });
        setSuccessMessage('Row removed successfully!');
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 2000);
    };

    // Column min widths (matching header cells)
    //                                                Sr.No                            Mod Impact              ImpMod StatDet Comp Rate Eff CostGen CostAmt Calc WvCd WvNm RlCd RlNm LeCd LeNm                                         Notes Action
    const columnMinWidths = [48, 96, 96, 144, 112, 96, 80];
    // Approximate total content width: sum of minWidths + cell paddings (15 cols * 24px) + row padding (2rem L/R ≈ 64px)
    // Actual sum of minWidths: 60+120+180+140+90+60+50+70+160+300+140+120+80+120+180 = 2050px
    const tableContentWidth = 2550; // Ultra-minimized for high density

    useEffect(() => {
        const handleZoomChange = () => {
            const zoomLevel = Math.round((window.outerWidth / window.innerWidth) * 100);

            if (zoomLevel <= 68) {
                setMaxWidth('2800px'); // For zoom <= 68%
                setMarginRight('80px'); // Adjust margin for 68% zoom
            } else if (zoomLevel <= 80) {
                setMaxWidth('2200px'); // For zoom <= 80%
                setMarginRight('50px'); // Adjust margin for 80% zoom
            } else {
                setMaxWidth('1800px'); // For zoom 100% or higher
                setMarginRight('0px'); // Default margin
                setPaddingBottom('10px'); // Extra padding for 100% zoom to prevent cutoff
            }
        };

        window.addEventListener('resize', handleZoomChange);
        handleZoomChange(); // Initial call

        return () => window.removeEventListener('resize', handleZoomChange);
    }, []);

    return (
        <div className="config-main" style={{ minHeight: '80vh', width: 'calc(98% - 2rem)', maxWidth: maxWidth, margin: '2rem auto', marginLeft: '2rem', marginRight: '2rem', paddingBottom: `calc(${paddingBottom} + ${extraBottomPadding}px)` }}>
            {/* Inner Content Container */}
            <div className="dashboard-content" style={{ width: '100%', maxWidth: 'none', margin: '0', padding: '0', position: 'relative' }}>
                {/* Summary Table - Positioned absolutely on the right */}
                {objectTypeCounts && (() => {
                    // Create a map for easy lookup of counts by RICEW_Object_Type
                    const countsMap = {};
                    let totalRecords = 0;

                    if (Array.isArray(objectTypeCounts)) {
                        objectTypeCounts.forEach(item => {
                            countsMap[item.RICEW_Object_Type] = item.count;
                            totalRecords += item.count;
                        });
                    }

                    // Helper function to get count for a type, defaulting to 0
                    const getCount = (type) => countsMap[type] || 0;

                    return (
                        <div style={{
                            position: 'absolute',
                            top: '0.5rem',
                            right: '8rem',
                            border: '2px solid #333',
                            borderRadius: '4px',
                            overflow: 'hidden',
                            backgroundColor: 'white',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            zIndex: 10
                        }}>
                            {/* Total Objects Row */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr 1fr 1fr',
                                borderBottom: '2px solid #333'
                            }}>
                                <div style={{
                                    padding: '8px 16px',
                                    fontWeight: 'bold',
                                    fontSize: '13px',
                                    backgroundColor: '#f8f9fa',
                                    borderRight: '1px solid #333',
                                    gridColumn: '1 / 3'
                                }}>
                                    Total Objects
                                </div>
                                <div style={{
                                    padding: '8px 16px',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    textAlign: 'center',
                                    backgroundColor: '#f8f9fa',
                                    gridColumn: '3 / 5'
                                }}>
                                    {totalRecords}
                                </div>
                            </div>

                            {/* Object Type Counts Grid */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 80px 1fr 80px'
                            }}>
                                {/* Reports */}
                                <div style={{
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    backgroundColor: '#f8f9fa',
                                    borderRight: '1px solid #ddd',
                                    borderBottom: '1px solid #ddd'
                                }}>
                                    Reports
                                </div>
                                <div style={{
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    textAlign: 'center',
                                    borderRight: '1px solid #333',
                                    borderBottom: '1px solid #ddd',
                                    fontWeight: '600'
                                }}>
                                    {getCount('Reports') || getCount('Report')}
                                </div>
                                <div style={{
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    backgroundColor: '#f8f9fa',
                                    borderRight: '1px solid #ddd',
                                    borderBottom: '1px solid #ddd'
                                }}>
                                    Alerts
                                </div>
                                <div style={{
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    textAlign: 'center',
                                    borderBottom: '1px solid #ddd',
                                    fontWeight: '600'
                                }}>
                                    {getCount('Alerts') || getCount('Alert')}
                                </div>

                                {/* Conversions */}
                                <div style={{
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    backgroundColor: '#f8f9fa',
                                    borderRight: '1px solid #ddd',
                                    borderBottom: '1px solid #ddd'
                                }}>
                                    Conversions
                                </div>
                                <div style={{
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    textAlign: 'center',
                                    borderRight: '1px solid #333',
                                    borderBottom: '1px solid #ddd',
                                    fontWeight: '600'
                                }}>
                                    {getCount('Conversions') || getCount('Conversion')}
                                </div>
                                <div style={{
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    backgroundColor: '#f8f9fa',
                                    borderRight: '1px solid #ddd',
                                    borderBottom: '1px solid #ddd'
                                }}>
                                    Analytics Reports
                                </div>
                                <div style={{
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    textAlign: 'center',
                                    borderBottom: '1px solid #ddd',
                                    fontWeight: '600'
                                }}>
                                    {getCount('Analytics Reports') || getCount('Analytics Report')}
                                </div>

                                {/* Integrations */}
                                <div style={{
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    backgroundColor: '#f8f9fa',
                                    borderRight: '1px solid #ddd',
                                    borderBottom: '1px solid #ddd'
                                }}>
                                    Integrations
                                </div>
                                <div style={{
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    textAlign: 'center',
                                    borderRight: '1px solid #333',
                                    borderBottom: '1px solid #ddd',
                                    fontWeight: '600'
                                }}>
                                    {getCount('Integrations') || getCount('Integration')}
                                </div>
                                <div style={{
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    backgroundColor: '#f8f9fa',
                                    borderRight: '1px solid #ddd',
                                    borderBottom: '1px solid #ddd'
                                }}>
                                    Workflows
                                </div>
                                <div style={{
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    textAlign: 'center',
                                    borderBottom: '1px solid #ddd',
                                    fontWeight: '600'
                                }}>
                                    {getCount('Workflows') || getCount('Workflow')}
                                </div>

                                {/* Extensions */}
                                <div style={{
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    backgroundColor: '#f8f9fa',
                                    borderRight: '1px solid #ddd'
                                }}>
                                    Extensions
                                </div>
                                <div style={{
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    textAlign: 'center',
                                    borderRight: '1px solid #333',
                                    fontWeight: '600'
                                }}>
                                    {getCount('Extensions') || getCount('Extension')}
                                </div>
                                <div style={{
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    backgroundColor: '#f8f9fa',
                                    borderRight: '1px solid #ddd'
                                }}>
                                    Personalizations
                                </div>
                                <div style={{
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    textAlign: 'center',
                                    fontWeight: '600'
                                }}>
                                    {getCount('Personalizations') || getCount('Personalization')}
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* Project Info */}
                <div style={{ padding: '2rem 1rem 1rem 2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project : <span style={{ color: '#007bff' }}>{localStorage.getItem('project_name') || selectedProject?.name}</span></h3>
                    </div>
                </div>
                <div className="config-header" style={{ marginTop: '0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h2>RICEW Mass Upload Form</h2>
                    <button
                        onClick={() => setShowHelpPopup(true)}
                        style={{
                            backgroundColor: '#4D5C74',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3b4b5e'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4D5C74'}
                    >
                        <HelpCircle size={16} />
                        Help
                    </button>
                </div>

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

                {/* Validation Errors Modal */}
                {showValidationErrorsModal && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 2000
                    }}>
                        <div style={{
                            backgroundColor: 'white',
                            borderRadius: '8px',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                            width: '90%',
                            maxWidth: '600px',
                            maxHeight: '80vh',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden'
                        }}>
                            {/* Modal Header */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '16px 20px',
                                borderBottom: '1px solid #e5e7eb',
                                backgroundColor: '#fef2f2'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="12" y1="8" x2="12" y2="12" />
                                        <line x1="12" y1="16" x2="12.01" y2="16" />
                                    </svg>
                                    <h3 style={{ margin: 0, color: '#dc2626', fontSize: '18px', fontWeight: '600' }}>
                                        Upload Failed - Validation Errors
                                    </h3>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowValidationErrorsModal(false);
                                        setValidationStatus(null);
                                    }}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: '4px',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#fee2e2'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div style={{
                                padding: '20px',
                                overflowY: 'auto',
                                flex: 1
                            }}>
                                <p style={{ margin: '0 0 16px 0', color: '#4b5563', fontSize: '14px' }}>
                                    The following {validationErrorsList.length} error(s) were found in your uploaded file. Please fix these issues in the Native Template and try again:
                                </p>
                                <div style={{
                                    backgroundColor: '#fef2f2',
                                    border: '1px solid #fecaca',
                                    borderRadius: '6px',
                                    overflow: 'hidden'
                                }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ backgroundColor: '#fee2e2' }}>
                                                <th style={{
                                                    padding: '10px 12px',
                                                    textAlign: 'left',
                                                    fontSize: '13px',
                                                    fontWeight: '600',
                                                    color: '#991b1b',
                                                    borderBottom: '1px solid #fecaca',
                                                    width: '80px'
                                                }}>
                                                    Row #
                                                </th>
                                                <th style={{
                                                    padding: '10px 12px',
                                                    textAlign: 'left',
                                                    fontSize: '13px',
                                                    fontWeight: '600',
                                                    color: '#991b1b',
                                                    borderBottom: '1px solid #fecaca',
                                                    width: '140px'
                                                }}>
                                                    Field
                                                </th>
                                                <th style={{
                                                    padding: '10px 12px',
                                                    textAlign: 'left',
                                                    fontSize: '13px',
                                                    fontWeight: '600',
                                                    color: '#991b1b',
                                                    borderBottom: '1px solid #fecaca'
                                                }}>
                                                    Error Message
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {validationErrorsList.map((error, index) => (
                                                <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#fef2f2' }}>
                                                    <td style={{
                                                        padding: '10px 12px',
                                                        fontSize: '13px',
                                                        color: '#dc2626',
                                                        fontWeight: '500',
                                                        borderBottom: index === validationErrorsList.length - 1 ? 'none' : '1px solid #fecaca'
                                                    }}>
                                                        {error.row}
                                                    </td>
                                                    <td style={{
                                                        padding: '10px 12px',
                                                        fontSize: '13px',
                                                        color: '#4b5563',
                                                        borderBottom: index === validationErrorsList.length - 1 ? 'none' : '1px solid #fecaca'
                                                    }}>
                                                        {error.field}
                                                    </td>
                                                    <td style={{
                                                        padding: '10px 12px',
                                                        fontSize: '13px',
                                                        color: '#4b5563',
                                                        borderBottom: index === validationErrorsList.length - 1 ? 'none' : '1px solid #fecaca'
                                                    }}>
                                                        {error.message}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div style={{
                                padding: '16px 20px',
                                borderTop: '1px solid #e5e7eb',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '12px',
                                backgroundColor: '#f9fafb'
                            }}>
                                <button
                                    onClick={() => {
                                        setShowValidationErrorsModal(false);
                                        setValidationStatus(null);
                                    }}
                                    style={{
                                        padding: '8px 20px',
                                        backgroundColor: '#dc2626',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#b91c1c'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = '#dc2626'}
                                >
                                    Close
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
                                        {ricewStatusLOV
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
                                                        borderBottom: idx === ricewStatusLOV.length - 1 ? 'none' : '1px solid #f5f5f5'
                                                    }}
                                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f7ff'}
                                                    onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                                                >
                                                    {item.Status_Name}
                                                </div>
                                            ))
                                        }
                                        {ricewStatusLOV.filter(item =>
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
                                    {loading ? 'Processing...' : 'Populate Project'}
                                </button>
                            </div>
                        </div>
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
                        zIndex: 9999
                    }}>
                        <div style={{
                            backgroundColor: 'white',
                            padding: '24px',
                            borderRadius: '8px',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                            maxWidth: '500px',
                            width: '90%',
                            textAlign: 'center'
                        }}>
                            <h3 style={{
                                margin: '0 0 16px 0',
                                color: '#333',
                                fontSize: '18px',
                                fontWeight: '600'
                            }}>
                                Confirmation
                            </h3>
                            <p style={{
                                margin: '0 0 24px 0',
                                color: '#666',
                                fontSize: '14px',
                                lineHeight: '1.6',
                                whiteSpace: 'pre-line',
                                textAlign: 'left'
                            }}>
                                {confirmMessage}
                            </p>
                            <div style={{
                                display: 'flex',
                                gap: '12px',
                                justifyContent: 'center'
                            }}>
                                <button
                                    onClick={handleConfirmCancel}
                                    style={{
                                        backgroundColor: '#6b7280',
                                        color: 'white',
                                        border: 'none',
                                        padding: '10px 24px',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '16px',
                                        fontWeight: '500',
                                        minWidth: '100px'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmYes}
                                    style={{
                                        backgroundColor: '#3b82f6',
                                        color: 'white',
                                        border: 'none',
                                        padding: '10px 24px',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '16px',
                                        fontWeight: '500',
                                        minWidth: '100px'
                                    }}
                                >
                                    Yes
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Action Buttons Row - Consolidated Global Actions */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 2rem',
                    margin: '30px 0px 0px 0px'
                }}>
                    {/* Columns 1-9 Area: Global actions (Download, Upload, Validate) */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        flex: 1,
                        paddingLeft: '0px'
                    }}>
                        <button
                            onClick={handleDownloadTemplate}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 20px',
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '500',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7,10 12,15 17,10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Download Template
                        </button>
                        <button
                            onClick={handleUploadTemplate}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 20px',
                                backgroundColor: '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '500',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#218838'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = '#28a745'}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17,8 12,3 7,8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                            Upload Template
                        </button>
                        {uploadedFileName && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 16px',
                                backgroundColor: '#f0f9ff',
                                border: '1px solid #bae6fd',
                                borderRadius: '6px',
                                fontSize: '14px',
                                color: '#0369a1',
                                fontWeight: '500'
                            }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                                    <polyline points="13,2 13,9 20,9" />
                                </svg>
                                <span>{uploadedFileName}</span>
                            </div>
                        )}
                        {pendingUploadData.length > 0 && (
                            <button
                                onClick={handleValidate}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '10px 20px',
                                    backgroundColor: '#f59e0b',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#d97706'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = '#f59e0b'}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                    <polyline points="22,4 12,14.01 9,11.01" />
                                </svg>
                                Validate & Save ({pendingUploadData.length} rows)
                            </button>
                        )}
                        {validationStatus && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 16px',
                                backgroundColor: validationStatus === 'success' ? '#dcfce7' : '#fee2e2',
                                border: `1px solid ${validationStatus === 'success' ? '#86efac' : '#fecaca'}`,
                                borderRadius: '6px',
                                fontSize: '14px',
                                color: validationStatus === 'success' ? '#166534' : '#991b1b',
                                fontWeight: '600'
                            }}>
                                {validationStatus === 'success' ? (
                                    <>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                            <polyline points="22,4 12,14.01 9,11.01" />
                                        </svg>
                                        <span>Yes</span>
                                    </>
                                ) : (
                                    <>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10" />
                                            <line x1="15" y1="9" x2="9" y2="15" />
                                            <line x1="9" y1="9" x2="15" y2="15" />
                                        </svg>
                                        <span>Error</span>
                                    </>
                                )}
                            </div>
                        )}

                    </div>

                </div>

                {/* Table Header and Body Section - Unified Scrollable Container */}
                <div style={{
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #ddd',
                    borderTop: 'none',
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    width: '100%',
                    boxSizing: 'border-box',
                    marginTop: '0'
                }}>

                    {/* Action Buttons Scrollable Row - Aligned with Columns */}
                    <div style={{
                        display: 'flex',
                        padding: '10px 2rem',
                        backgroundColor: 'white',
                        minWidth: `${tableContentWidth}px`,
                        borderBottom: '1px solid #eee',
                        alignItems: 'center'
                    }}>
                        {/* Spacers for columns 1-10 (Sr No to Service Line) */}
                        <div style={{ flex: '0 0 60px', borderRight: '1px solid #ddd', height: '100%', backgroundColor: 'white' }}></div>
                        <div style={{ flex: 1, minWidth: '120px', borderRight: '1px solid #ddd', height: '100%', backgroundColor: 'white' }}></div>
                        <div style={{ flex: 1, minWidth: '180px', borderRight: '1px solid #ddd', height: '100%', backgroundColor: 'white' }}></div>
                        <div style={{ flex: 1, minWidth: '140px', borderRight: '1px solid #ddd', height: '100%', backgroundColor: 'white' }}></div>
                        <div style={{ flex: 1, minWidth: '90px', borderRight: '1px solid #ddd', height: '100%', backgroundColor: 'white' }}></div>
                        <div style={{ flex: 1, minWidth: '60px', borderRight: '1px solid #ddd', height: '100%', backgroundColor: 'white' }}></div>
                        <div style={{ flex: 1, minWidth: '50px', borderRight: '1px solid #ddd', height: '100%', backgroundColor: 'white' }}></div>
                        <div style={{ flex: 1, minWidth: '70px', borderRight: '1px solid #ddd', height: '100%', backgroundColor: 'white' }}></div>
                        <div style={{ flex: 1, minWidth: '160px', borderRight: '1px solid #ddd', height: '100%', backgroundColor: 'white' }}></div>
                        <div style={{ flex: 1, minWidth: '300px', borderRight: '1px solid #ddd', height: '100%', backgroundColor: 'white' }}></div>
                        {/* Populate Project Button - above Populated (Project) column */}
                        <div style={{ flex: 1, minWidth: '140px', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid #ddd', height: '100%', backgroundColor: 'white' }}>
                            {uploadedData.length > 0 && (
                                <button
                                    onClick={handlePopulateProject}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                        padding: '6px 12px', backgroundColor: '#0d6efd',
                                        color: 'white', border: 'none', borderRadius: '6px',
                                        cursor: 'pointer', fontSize: '13px', fontWeight: '500',
                                        transition: 'all 0.2s', whiteSpace: 'nowrap', width: 'max-content'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#0b5ed7'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = '#0d6efd'}
                                >
                                    <FileText size={16} />
                                    Populate Project{selectedRowsForPopulation.length > 0 ? ` (${selectedRowsForPopulation.length})` : ''}
                                </button>
                            )}
                        </div>
                        {/* Spacer for Processed column */}
                        <div style={{ flex: 1, minWidth: '120px', borderRight: '1px solid #ddd', height: '100%', backgroundColor: 'white' }}></div>
                        {/* Spacer for Edit column */}
                        <div style={{ flex: '0 0 80px', borderRight: '1px solid #ddd', height: '100%', backgroundColor: 'white' }}></div>
                        {/* Delete Records Button - above Delete Records column */}
                        <div style={{ flex: '0 0 120px', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid #ddd', height: '100%', backgroundColor: 'white' }}>
                            {uploadedData.length > 0 && (
                                <button
                                    onClick={handleDeleteRecords}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                        padding: '6px 12px', backgroundColor: '#dc3545',
                                        color: 'white', border: 'none', borderRadius: '6px',
                                        cursor: 'pointer', fontSize: '13px', fontWeight: '500',
                                        transition: 'all 0.2s', whiteSpace: 'nowrap', width: 'max-content'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#c82333'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = '#dc3545'}
                                >
                                    <Trash2 size={16} />
                                    Delete{selectedRowsForDeletion.length > 0 ? ` (${selectedRowsForDeletion.length})` : ''}
                                </button>
                            )}
                        </div>
                        {/* Spacer for Template Name column */}
                        <div style={{ flex: 1, minWidth: '180px', height: '100%', backgroundColor: 'white' }}></div>
                    </div>

                    {/* Table Header Row */}
                    <div style={{
                        display: 'flex',
                        borderBottom: '1px solid #ddd',
                        padding: '0 2rem',
                        backgroundColor: 'white',
                        minWidth: `${tableContentWidth}px` // Ensure header matches body width
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
                            textAlign: 'center'
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
                            backgroundColor: 'white'
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
                            backgroundColor: 'white'
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
                            backgroundColor: 'white'
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
                            minWidth: '220px',
                            backgroundColor: 'white',
                            display: 'none'
                        }}>
                            Application
                        </div>
                        <div style={{
                            flex: 1,
                            padding: '12px 8px',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            color: '#333',
                            borderRight: '1px solid #ddd',
                            minWidth: '90px',
                            backgroundColor: 'white',
                            wordBreak: 'break-word'
                        }}>
                            Object Type
                        </div>
                        <div style={{
                            flex: 1,
                            padding: '12px 8px',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            color: '#333',
                            borderRight: '1px solid #ddd',
                            minWidth: '60px',
                            backgroundColor: 'white',
                            wordBreak: 'break-word'
                        }}>
                            Complexity
                        </div>
                        <div style={{
                            flex: 1,
                            padding: '12px 8px',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            color: '#333',
                            borderRight: '1px solid #ddd',
                            minWidth: '50px',
                            backgroundColor: 'white',
                            textAlign: 'center',
                            wordBreak: 'break-word'
                        }}>
                            Effort (Hours)
                        </div>
                        <div style={{
                            flex: 1,
                            padding: '12px 8px',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            color: '#333',
                            borderRight: '1px solid #ddd',
                            minWidth: '70px',
                            backgroundColor: 'white',
                            textAlign: 'center',
                            wordBreak: 'break-word'
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
                            minWidth: '160px',
                            backgroundColor: 'white',
                            wordBreak: 'break-word'
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
                            minWidth: '300px',
                            backgroundColor: 'white'
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
                            minWidth: '140px',
                            backgroundColor: 'white',
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                            <div style={{ lineHeight: '1.2', whiteSpace: 'nowrap' }}>Populated (Project)</div>
                            <input
                                type="checkbox"
                                checked={selectAllForPopulation}
                                onChange={(e) => {
                                    const isChecked = e.target.checked;
                                    setSelectAllForPopulation(isChecked);
                                    if (isChecked) {
                                        const populatableRowIndices = uploadedData
                                            .map((row, index) => {
                                                const isPopulated = row['Populate Project'] === 'true' || row['Populated (Project)'] === 'true';
                                                return (!isPopulated && row['Processed'] === 'Yes') ? index : -1;
                                            })
                                            .filter(index => index !== -1);
                                        setSelectedRowsForPopulation(populatableRowIndices);
                                    } else {
                                        setSelectedRowsForPopulation([]);
                                    }
                                }}
                                style={{
                                    cursor: 'pointer',
                                    width: '18px',
                                    height: '18px',
                                    marginTop: '2px'
                                }}
                                title="Select All for Population"
                            />
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
                            textAlign: 'center'
                        }}>
                            Processed (Temporary Table)
                        </div>

                        <div style={{
                            flex: '0 0 80px',
                            padding: '12px 12px',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            color: '#333',
                            borderRight: '1px solid #ddd',
                            minWidth: '80px',
                            backgroundColor: 'white',
                            textAlign: 'center'
                        }}>
                            Edit
                        </div>

                        <div style={{
                            flex: '0 0 120px',
                            padding: '12px 12px',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            color: '#333',
                            borderRight: '1px solid #ddd',
                            minWidth: '120px',
                            backgroundColor: 'white',
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                            <div style={{ lineHeight: '1.2', whiteSpace: 'nowrap', marginLeft: '0px' }}>Delete Records</div>
                            <input
                                type="checkbox"
                                checked={selectAllForDeletion}
                                onChange={(e) => {
                                    const isChecked = e.target.checked;
                                    setSelectAllForDeletion(isChecked);
                                    if (isChecked) {
                                        // Select all rows that are NOT populated
                                        const deletableRowIndices = uploadedData
                                            .map((row, index) => {
                                                const isPopulated = row['Populate Project'] === 'true' || row['Populated (Project)'] === 'true';
                                                return !isPopulated ? index : -1;
                                            })
                                            .filter(index => index !== -1);
                                        setSelectedRowsForDeletion(deletableRowIndices);
                                    } else {
                                        // Deselect all rows
                                        setSelectedRowsForDeletion([]);
                                    }
                                }}
                                style={{
                                    cursor: 'pointer',
                                    width: '18px',
                                    height: '18px',
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
                            // No borderRight on last column
                            minWidth: '180px',
                            backgroundColor: 'white'
                        }}>
                            Upload Template Name
                        </div>
                    </div>

                    {/* Table Body - Now with minWidth to match header for full white bg coverage */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        minWidth: `${tableContentWidth}px`, // Matches header width
                        backgroundColor: 'white'
                    }}>
                        {uploadedData.length > 0 ? (
                            uploadedData.map((row, index) => {
                                const rowBgColor = row['Populated (Project)'] === 'true' ? '#f5f5f5' : '#ffffff'; // Gray out populated records
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
                                        {/* RICEW Name - Editable */}
                                        <div
                                            style={{
                                                flex: 1,
                                                padding: '12px 12px',
                                                fontSize: '13px',
                                                color: '#333',
                                                backgroundColor: rowBgColor,
                                                borderRight: '1px solid #ddd',
                                                minWidth: '120px',
                                                wordBreak: 'break-word',
                                                position: 'relative',
                                                ...(fieldErrors[`${index}-RICEW Name`] && { outline: '1px solid #ef4444', outlineOffset: '-1px' })
                                            }}
                                        >
                                            {editingRowIndex === index ? (
                                                <input
                                                    type="text"
                                                    value={row['RICEW Name'] || ''}
                                                    onChange={(e) => {
                                                        const newValue = e.target.value;
                                                        if (newValue.length <= 100) {
                                                            const updatedData = uploadedData.map((r, i) =>
                                                                i === index ? { ...r, 'RICEW Name': newValue } : r
                                                            );
                                                            setUploadedData(updatedData);
                                                            sessionStorage.setItem('ricewRequestBulkUploadData', JSON.stringify(updatedData));

                                                            // Clear field error
                                                            const errorKey = `${index}-RICEW Name`;
                                                            if (fieldErrors[errorKey]) {
                                                                setFieldErrors(prev => {
                                                                    const newErrors = { ...prev };
                                                                    delete newErrors[errorKey];
                                                                    return newErrors;
                                                                });
                                                            }
                                                        }
                                                    }}
                                                    autoFocus
                                                    style={{
                                                        width: '100%',
                                                        border: '2px solid #3b82f6',
                                                        borderRadius: '4px',
                                                        padding: '4px 8px',
                                                        fontSize: '13px',
                                                        outline: 'none',
                                                        backgroundColor: 'white'
                                                    }}
                                                />
                                            ) : (
                                                <div
                                                    style={{
                                                        minHeight: '20px'
                                                    }}
                                                >
                                                    {row['RICEW Name'] || '-'}
                                                </div>
                                            )}
                                            {fieldErrors[`${index}-RICEW Name`] && (
                                                <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>
                                                    {fieldErrors[`${index}-RICEW Name`]}
                                                </div>
                                            )}
                                        </div>
                                        {/* RICEW Description - Editable */}
                                        <div
                                            style={{
                                                flex: 1,
                                                padding: '12px 12px',
                                                fontSize: '13px',
                                                color: '#333',
                                                backgroundColor: rowBgColor,
                                                borderRight: '1px solid #ddd',
                                                minWidth: '180px',
                                                wordBreak: 'break-word',
                                                position: 'relative',
                                                ...(fieldErrors[`${index}-RICEW Description`] && { outline: '1px solid #ef4444', outlineOffset: '-1px' })
                                            }}
                                        >
                                            {editingRowIndex === index ? (
                                                <textarea
                                                    value={row['RICEW Description'] || ''}
                                                    onChange={(e) => {
                                                        const newValue = e.target.value;
                                                        if (newValue.length <= 240) {
                                                            const updatedData = uploadedData.map((r, i) =>
                                                                i === index ? { ...r, 'RICEW Description': newValue } : r
                                                            );
                                                            setUploadedData(updatedData);
                                                            sessionStorage.setItem('ricewRequestBulkUploadData', JSON.stringify(updatedData));

                                                            // Clear field error
                                                            const errorKey = `${index}-RICEW Description`;
                                                            if (fieldErrors[errorKey]) {
                                                                setFieldErrors(prev => {
                                                                    const newErrors = { ...prev };
                                                                    delete newErrors[errorKey];
                                                                    return newErrors;
                                                                });
                                                            }
                                                        }
                                                    }}
                                                    rows={3}
                                                    style={{
                                                        width: '100%',
                                                        border: '2px solid #3b82f6',
                                                        borderRadius: '4px',
                                                        padding: '4px 8px',
                                                        fontSize: '13px',
                                                        outline: 'none',
                                                        backgroundColor: 'white',
                                                        resize: 'vertical',
                                                        fontFamily: 'inherit'
                                                    }}
                                                />
                                            ) : (
                                                <div
                                                    style={{
                                                        minHeight: '20px'
                                                    }}
                                                >
                                                    {row['RICEW Description'] || '-'}
                                                </div>
                                            )}
                                            {fieldErrors[`${index}-RICEW Description`] && (
                                                <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>
                                                    {fieldErrors[`${index}-RICEW Description`]}
                                                </div>
                                            )}
                                        </div>
                                        {/* Process Stream - Editable */}
                                        <div
                                            style={{
                                                flex: 1,
                                                padding: '12px 12px',
                                                fontSize: '13px',
                                                color: '#333',
                                                backgroundColor: rowBgColor,
                                                borderRight: '1px solid #ddd',
                                                minWidth: '140px',
                                                wordBreak: 'break-word',
                                                position: 'relative',
                                                ...(fieldErrors[`${index}-Process Stream`] && { outline: '1px solid #ef4444', outlineOffset: '-1px' })
                                            }}
                                        >
                                            {editingCell?.rowIndex === index && editingCell?.field === 'Process Stream' ? (
                                                <input
                                                    ref={dropdownInputRef}
                                                    type="text"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleCellUpdate(index, 'Process Stream');
                                                        } else if (e.key === 'Escape') {
                                                            handleCellCancel();
                                                        }
                                                    }}
                                                    autoFocus
                                                    placeholder="Search Process Stream..."
                                                    style={{
                                                        width: '100%',
                                                        border: '2px solid #3b82f6',
                                                        borderRadius: '4px',
                                                        padding: '4px 8px',
                                                        fontSize: '13px',
                                                        outline: 'none',
                                                        backgroundColor: 'white'
                                                    }}
                                                />
                                            ) : (
                                                <div
                                                    style={{
                                                        minHeight: '20px'
                                                    }}
                                                >
                                                    {row['Process Stream'] || '-'}
                                                </div>
                                            )}
                                            {fieldErrors[`${index}-Process Stream`] && (
                                                <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>
                                                    {fieldErrors[`${index}-Process Stream`]}
                                                </div>
                                            )}
                                        </div>
                                        {/* Application */}
                                        {/* Application - Editable */}
                                        <div
                                            style={{
                                                flex: 1,
                                                padding: '12px 12px',
                                                fontSize: '13px',
                                                color: '#333',
                                                backgroundColor: rowBgColor,
                                                borderRight: '1px solid #ddd',
                                                minWidth: '220px',
                                                wordBreak: 'break-word',
                                                position: 'relative',
                                                display: 'none',
                                                ...(fieldErrors[`${index}-Application`] && { outline: '1px solid #ef4444', outlineOffset: '-1px' })
                                            }}
                                        >
                                            {editingCell?.rowIndex === index && editingCell?.field === 'Application' ? (
                                                <input
                                                    ref={dropdownInputRef}
                                                    type="text"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleCellUpdate(index, 'Application');
                                                        } else if (e.key === 'Escape') {
                                                            handleCellCancel();
                                                        }
                                                    }}
                                                    autoFocus
                                                    placeholder="Search Application..."
                                                    style={{
                                                        width: '100%',
                                                        border: '2px solid #3b82f6',
                                                        borderRadius: '4px',
                                                        padding: '4px 8px',
                                                        fontSize: '13px',
                                                        outline: 'none',
                                                        backgroundColor: 'white'
                                                    }}
                                                />
                                            ) : editingRowIndex === index ? (
                                                <input
                                                    type="text"
                                                    value={row['Application'] || ''}
                                                    onChange={(e) => {
                                                        const newValue = e.target.value;
                                                        const updatedData = uploadedData.map((r, i) =>
                                                            i === index ? { ...r, 'Application': newValue } : r
                                                        );
                                                        setUploadedData(updatedData);
                                                        sessionStorage.setItem('ricewRequestBulkUploadData', JSON.stringify(updatedData));

                                                        // Clear field error
                                                        const errorKey = `${index}-Application`;
                                                        if (fieldErrors[errorKey]) {
                                                            setFieldErrors(prev => {
                                                                const newErrors = { ...prev };
                                                                delete newErrors[errorKey];
                                                                return newErrors;
                                                            });
                                                        }
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleCellEdit(index, 'Application', row['Application']);
                                                    }}
                                                    placeholder="Search Application..."
                                                    style={{
                                                        width: '100%',
                                                        border: '2px solid #3b82f6',
                                                        borderRadius: '4px',
                                                        padding: '4px 8px',
                                                        fontSize: '13px',
                                                        outline: 'none',
                                                        backgroundColor: 'white',
                                                        cursor: 'pointer'
                                                    }}
                                                />
                                            ) : (
                                                <div
                                                    style={{
                                                        minHeight: '20px'
                                                    }}
                                                >
                                                    {row['Application'] || '-'}
                                                </div>
                                            )}
                                            {fieldErrors[`${index}-Application`] && (
                                                <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>
                                                    {fieldErrors[`${index}-Application`]}
                                                </div>
                                            )}
                                        </div>
                                        {/* RICEW Type - Editable with Custom LOV */}
                                        <div
                                            style={{
                                                flex: 1,
                                                padding: '12px 8px',
                                                fontSize: '13px',
                                                color: '#333',
                                                backgroundColor: rowBgColor,
                                                borderRight: '1px solid #ddd',
                                                minWidth: '90px',
                                                wordBreak: 'break-word',
                                                position: 'relative',
                                                ...(fieldErrors[`${index}-Object Type`] && { outline: '1px solid #ef4444', outlineOffset: '-1px' })
                                            }}
                                        >
                                            {editingCell?.rowIndex === index && editingCell?.field === 'Object Type' ? (
                                                <input
                                                    ref={dropdownInputRef}
                                                    type="text"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleCellUpdate(index, 'Object Type');
                                                        } else if (e.key === 'Escape') {
                                                            handleCellCancel();
                                                        }
                                                    }}
                                                    autoFocus
                                                    placeholder="Search Object Type..."
                                                    style={{
                                                        width: '100%',
                                                        border: '2px solid #3b82f6',
                                                        borderRadius: '4px',
                                                        padding: '4px 8px',
                                                        fontSize: '13px',
                                                        outline: 'none',
                                                        backgroundColor: 'white'
                                                    }}
                                                />
                                            ) : editingRowIndex === index ? (
                                                <input
                                                    type="text"
                                                    value={row['Object Type'] || ''}
                                                    onChange={(e) => {
                                                        const newValue = e.target.value;
                                                        const updatedData = uploadedData.map((r, i) =>
                                                            i === index ? { ...r, 'Object Type': newValue } : r
                                                        );
                                                        setUploadedData(updatedData);
                                                        sessionStorage.setItem('ricewRequestBulkUploadData', JSON.stringify(updatedData));

                                                        // Clear field error
                                                        const errorKey = `${index}-Object Type`;
                                                        if (fieldErrors[errorKey]) {
                                                            setFieldErrors(prev => {
                                                                const newErrors = { ...prev };
                                                                delete newErrors[errorKey];
                                                                return newErrors;
                                                            });
                                                        }
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleCellEdit(index, 'Object Type', row['Object Type']);
                                                    }}
                                                    placeholder="Search Object Type..."
                                                    style={{
                                                        width: '100%',
                                                        border: '2px solid #3b82f6',
                                                        borderRadius: '4px',
                                                        padding: '4px 8px',
                                                        fontSize: '13px',
                                                        outline: 'none',
                                                        backgroundColor: 'white',
                                                        cursor: 'pointer'
                                                    }}
                                                />
                                            ) : (
                                                <div
                                                    style={{
                                                        minHeight: '20px'
                                                    }}
                                                >
                                                    {row['Object Type'] || '-'}
                                                </div>
                                            )}
                                            {fieldErrors[`${index}-Object Type`] && (
                                                <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>
                                                    {fieldErrors[`${index}-Object Type`]}
                                                </div>
                                            )}
                                        </div>
                                        {/* Complexity */}
                                        <div style={{
                                            flex: 1,
                                            padding: '12px 8px',
                                            fontSize: '13px',
                                            color: '#333',
                                            backgroundColor: rowBgColor,
                                            borderRight: '1px solid #ddd',
                                            minWidth: '60px',
                                            wordBreak: 'break-word',
                                            ...(fieldErrors[`${index}-Complexity`] && { outline: '1px solid #ef4444', outlineOffset: '-1px' })
                                        }}>
                                            {editingCell?.rowIndex === index && editingCell?.field === 'Complexity' ? (
                                                <input
                                                    ref={dropdownInputRef}
                                                    type="text"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleCellUpdate(index, 'Complexity');
                                                        } else if (e.key === 'Escape') {
                                                            handleCellCancel();
                                                        }
                                                    }}
                                                    autoFocus
                                                    placeholder="Select Complexity..."
                                                    style={{
                                                        width: '100%',
                                                        border: '2px solid #3b82f6',
                                                        borderRadius: '4px',
                                                        padding: '4px 8px',
                                                        fontSize: '13px',
                                                        outline: 'none',
                                                        backgroundColor: 'white'
                                                    }}
                                                />
                                            ) : editingRowIndex === index ? (
                                                <input
                                                    type="text"
                                                    value={row['Complexity'] || ''}
                                                    onChange={(e) => {
                                                        const newValue = e.target.value;
                                                        const updatedData = uploadedData.map((r, i) =>
                                                            i === index ? { ...r, 'Complexity': newValue } : r
                                                        );
                                                        setUploadedData(updatedData);
                                                        sessionStorage.setItem('ricewRequestBulkUploadData', JSON.stringify(updatedData));

                                                        // Clear field error
                                                        const errorKey = `${index}-Complexity`;
                                                        if (fieldErrors[errorKey]) {
                                                            setFieldErrors(prev => {
                                                                const newErrors = { ...prev };
                                                                delete newErrors[errorKey];
                                                                return newErrors;
                                                            });
                                                        }
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleCellEdit(index, 'Complexity', row['Complexity']);
                                                    }}
                                                    placeholder="Select Complexity..."
                                                    style={{
                                                        width: '100%',
                                                        border: '2px solid #3b82f6',
                                                        borderRadius: '4px',
                                                        padding: '4px 8px',
                                                        fontSize: '13px',
                                                        outline: 'none',
                                                        backgroundColor: 'white',
                                                        cursor: 'pointer'
                                                    }}
                                                />
                                            ) : (
                                                <div
                                                    style={{
                                                        minHeight: '20px'
                                                    }}
                                                >
                                                    {row['Complexity'] || '-'}
                                                </div>
                                            )}
                                            {fieldErrors[`${index}-Complexity`] && (
                                                <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>
                                                    {fieldErrors[`${index}-Complexity`]}
                                                </div>
                                            )}
                                        </div>

                                        {/* Effort (Hours) */}
                                        <div style={{
                                            flex: 1,
                                            padding: '12px 8px',
                                            fontSize: '13px',
                                            color: '#333',
                                            backgroundColor: rowBgColor,
                                            borderRight: '1px solid #ddd',
                                            minWidth: '50px',
                                            textAlign: 'center',
                                            wordBreak: 'break-word'
                                        }}>
                                            {row['Effort (Hours)'] || '0'}
                                        </div>

                                        {/* Cost (Currency) */}
                                        <div style={{
                                            flex: 1,
                                            padding: '12px 8px',
                                            fontSize: '13px',
                                            color: '#333',
                                            backgroundColor: rowBgColor,
                                            borderRight: '1px solid #ddd',
                                            minWidth: '70px',
                                            textAlign: 'center',
                                            wordBreak: 'break-word'
                                        }}>
                                            {row['Cost (Currency)'] || '0'}
                                        </div>

                                        {/* Organization Name */}
                                        <div style={{
                                            flex: 1,
                                            padding: '12px 12px',
                                            fontSize: '13px',
                                            color: '#333',
                                            backgroundColor: rowBgColor,
                                            borderRight: '1px solid #ddd',
                                            minWidth: '160px',
                                            wordBreak: 'break-word',
                                            position: 'relative',
                                            ...(fieldErrors[`${index}-Organization Name`] && { outline: '1px solid #ef4444', outlineOffset: '-1px' })
                                        }}>
                                            {editingCell?.rowIndex === index && editingCell?.field === 'Organization Name' ? (
                                                <input
                                                    ref={dropdownInputRef}
                                                    type="text"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleCellUpdate(index, 'Organization Name');
                                                        } else if (e.key === 'Escape') {
                                                            handleCellCancel();
                                                        }
                                                    }}
                                                    autoFocus
                                                    placeholder="Search Organization..."
                                                    style={{
                                                        width: '100%',
                                                        border: '2px solid #3b82f6',
                                                        borderRadius: '4px',
                                                        padding: '4px 8px',
                                                        fontSize: '13px',
                                                        outline: 'none',
                                                        backgroundColor: 'white'
                                                    }}
                                                />
                                            ) : editingRowIndex === index ? (
                                                <input
                                                    type="text"
                                                    value={row['Organization Name'] || ''}
                                                    onChange={(e) => {
                                                        const newValue = e.target.value;
                                                        const updatedData = uploadedData.map((r, i) =>
                                                            i === index ? { ...r, 'Organization Name': newValue } : r
                                                        );
                                                        setUploadedData(updatedData);
                                                        sessionStorage.setItem('ricewRequestBulkUploadData', JSON.stringify(updatedData));

                                                        // Clear field error
                                                        const errorKey = `${index}-Organization Name`;
                                                        if (fieldErrors[errorKey]) {
                                                            setFieldErrors(prev => {
                                                                const newErrors = { ...prev };
                                                                delete newErrors[errorKey];
                                                                return newErrors;
                                                            });
                                                        }
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleCellEdit(index, 'Organization Name', row['Organization Name']);
                                                    }}
                                                    placeholder="Search Organization..."
                                                    style={{
                                                        width: '100%',
                                                        border: '2px solid #3b82f6',
                                                        borderRadius: '4px',
                                                        padding: '4px 8px',
                                                        fontSize: '13px',
                                                        outline: 'none',
                                                        backgroundColor: 'white',
                                                        cursor: 'pointer'
                                                    }}
                                                />
                                            ) : (
                                                <div style={{ minHeight: '20px' }}>
                                                    {row['Organization Name'] || '-'}
                                                </div>
                                            )}
                                            {fieldErrors[`${index}-Organization Name`] && (
                                                <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>
                                                    {fieldErrors[`${index}-Organization Name`]}
                                                </div>
                                            )}
                                        </div>

                                        {/* Service Line */}
                                        <div style={{
                                            flex: 1,
                                            padding: '12px 12px',
                                            fontSize: '13px',
                                            color: '#333',
                                            backgroundColor: rowBgColor,
                                            borderRight: '1px solid #ddd',
                                            minWidth: '300px',
                                            wordBreak: 'break-word',
                                            position: 'relative',
                                            ...(fieldErrors[`${index}-Service Line`] && { outline: '1px solid #ef4444', outlineOffset: '-1px' })
                                        }}>
                                            {editingCell?.rowIndex === index && editingCell?.field === 'Service Line' ? (
                                                <input
                                                    ref={dropdownInputRef}
                                                    type="text"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleCellUpdate(index, 'Service Line');
                                                        } else if (e.key === 'Escape') {
                                                            handleCellCancel();
                                                        }
                                                    }}
                                                    autoFocus
                                                    placeholder="Search Service Line..."
                                                    style={{
                                                        width: '100%',
                                                        border: '2px solid #3b82f6',
                                                        borderRadius: '4px',
                                                        padding: '4px 8px',
                                                        fontSize: '13px',
                                                        outline: 'none',
                                                        backgroundColor: 'white'
                                                    }}
                                                />
                                            ) : editingRowIndex === index ? (
                                                <input
                                                    type="text"
                                                    value={row['Service Line'] || ''}
                                                    onChange={(e) => {
                                                        const newValue = e.target.value;
                                                        const updatedData = uploadedData.map((r, i) =>
                                                            i === index ? { ...r, 'Service Line': newValue } : r
                                                        );
                                                        setUploadedData(updatedData);
                                                        sessionStorage.setItem('ricewRequestBulkUploadData', JSON.stringify(updatedData));

                                                        // Clear field error
                                                        const errorKey = `${index}-Service Line`;
                                                        if (fieldErrors[errorKey]) {
                                                            setFieldErrors(prev => {
                                                                const newErrors = { ...prev };
                                                                delete newErrors[errorKey];
                                                                return newErrors;
                                                            });
                                                        }
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleCellEdit(index, 'Service Line', row['Service Line']);
                                                    }}
                                                    placeholder="Search Service Line..."
                                                    style={{
                                                        width: '100%',
                                                        border: '2px solid #3b82f6',
                                                        borderRadius: '4px',
                                                        padding: '4px 8px',
                                                        fontSize: '13px',
                                                        outline: 'none',
                                                        backgroundColor: 'white',
                                                        cursor: 'pointer'
                                                    }}
                                                />
                                            ) : (
                                                <div style={{ minHeight: '20px' }}>
                                                    {row['Service Line'] || '-'}
                                                </div>
                                            )}
                                            {fieldErrors[`${index}-Service Line`] && (
                                                <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>
                                                    {fieldErrors[`${index}-Service Line`]}
                                                </div>
                                            )}
                                        </div>

                                        {/* Populated (Project) - Shows Yes badge if populated, checkbox if not */}
                                        <div style={{
                                            flex: 1,
                                            padding: '8px 12px',
                                            fontSize: '13px',
                                            color: '#333',
                                            minWidth: '140px',
                                            backgroundColor: rowBgColor,
                                            borderRight: '1px solid #ddd',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            {(row['Populate Project'] === 'true' || row['Populated (Project)'] === 'true') ? (
                                                <span style={{
                                                    color: '#10b981',
                                                    fontWeight: '600',
                                                    fontSize: '13px'
                                                }}>
                                                    Yes
                                                </span>
                                            ) : (
                                                <input
                                                    type="checkbox"
                                                    checked={selectedRowsForPopulation.includes(index)}
                                                    onChange={(e) => {
                                                        const isChecked = e.target.checked;
                                                        if (isChecked) {
                                                            setSelectedRowsForPopulation(prev => [...prev, index]);
                                                        } else {
                                                            setSelectedRowsForPopulation(prev => prev.filter(i => i !== index));
                                                            setSelectAllForPopulation(false);
                                                        }
                                                    }}
                                                    disabled={row['Processed'] !== 'Yes'}
                                                    style={{
                                                        cursor: row['Processed'] !== 'Yes' ? 'not-allowed' : 'pointer',
                                                        width: '18px',
                                                        height: '18px',
                                                        opacity: row['Processed'] !== 'Yes' ? 0.3 : 1
                                                    }}
                                                    title={row['Processed'] !== 'Yes' ? 'Cannot populate - Record not yet processed' : 'Select for population'}
                                                />
                                            )}
                                        </div>

                                        {/* Processed (Temporary Table) */}
                                        <div style={{
                                            flex: 1,
                                            padding: '8px 12px',
                                            fontSize: '13px',
                                            color: '#333',
                                            backgroundColor: rowBgColor,
                                            borderRight: '1px solid #ddd',
                                            minWidth: '120px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: '600'
                                        }}>
                                            <span style={{
                                                color: row['Processed'] === 'Yes' ? '#10b981' : '#6b7280'
                                            }}>
                                                {row['Processed'] || 'No'}
                                            </span>
                                        </div>

                                        {/* Action - Edit/Save/Cancel */}
                                        <div style={{
                                            flex: '0 0 80px',
                                            padding: '8px 12px',
                                            fontSize: '13px',
                                            color: '#333',
                                            minWidth: '80px',
                                            backgroundColor: rowBgColor,
                                            borderRight: '1px solid #ddd',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px'
                                        }}>
                                            {editingRowIndex === index ? (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            if (row.RICEW_Mass_Upload_Form_id) {
                                                                handleSingleRowSave(index);
                                                            } else {
                                                                setEditingRowIndex(null);
                                                                setOriginalRowData(null);
                                                            }
                                                        }}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            color: '#10b981',
                                                            padding: '4px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}
                                                        title="Save"
                                                    >
                                                        <Save size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (originalRowData) {
                                                                const updatedData = uploadedData.map((r, i) =>
                                                                    i === index ? originalRowData : r
                                                                );
                                                                setUploadedData(updatedData);
                                                                sessionStorage.setItem('ricewRequestBulkUploadData', JSON.stringify(updatedData));
                                                            }
                                                            if (editingCell) {
                                                                handleCellCancel();
                                                            }
                                                            setEditingRowIndex(null);
                                                            setOriginalRowData(null);
                                                        }}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            color: '#ef4444',
                                                            padding: '4px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}
                                                        title="Cancel"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOriginalRowData({ ...row });
                                                        setEditingRowIndex(index);
                                                        setEditingCell(null);
                                                        setEditValue('');
                                                        setInlineError(null);
                                                        const rowElement = document.querySelector(`[data-row-index="${index}"]`);
                                                        if (rowElement) {
                                                            rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                        }
                                                    }}
                                                    disabled={row['Populated (Project)'] === 'true'}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        cursor: row['Populated (Project)'] === 'true' ? 'not-allowed' : 'pointer',
                                                        color: row['Populated (Project)'] === 'true' ? '#d1d5db' : '#6b7280',
                                                        padding: '4px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        opacity: row['Populated (Project)'] === 'true' ? 0.5 : 1
                                                    }}
                                                    title={row['Populated (Project)'] === 'true' ? 'Cannot edit - Record already populated' : 'Edit'}
                                                >
                                                    <MoreVertical size={18} />
                                                </button>
                                            )}
                                        </div>

                                        {/* Delete Records Checkbox */}
                                        <div style={{
                                            flex: '0 0 120px',
                                            padding: '8px 12px',
                                            fontSize: '13px',
                                            color: '#333',
                                            minWidth: '120px',
                                            backgroundColor: rowBgColor,
                                            borderRight: '1px solid #ddd',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            minHeight: '100%'
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedRowsForDeletion.includes(index)}
                                                onChange={(e) => {
                                                    const isChecked = e.target.checked;
                                                    if (isChecked) {
                                                        setSelectedRowsForDeletion(prev => [...prev, index]);
                                                    } else {
                                                        setSelectedRowsForDeletion(prev => prev.filter(i => i !== index));
                                                        setSelectAllForDeletion(false);
                                                    }
                                                }}
                                                disabled={row['Populated (Project)'] === 'true'}
                                                style={{
                                                    cursor: row['Populated (Project)'] === 'true' ? 'not-allowed' : 'pointer',
                                                    width: '18px',
                                                    height: '18px',
                                                    opacity: row['Populated (Project)'] === 'true' ? 0.3 : 1
                                                }}
                                                title={row['Populated (Project)'] === 'true' ? 'Cannot delete - Record already populated' : 'Select for deletion'}
                                            />
                                        </div>

                                        {/* Upload Template Name */}
                                        <div style={{
                                            flex: 1,
                                            padding: '12px 12px',
                                            fontSize: '13px',
                                            color: '#333',
                                            backgroundColor: rowBgColor,
                                            minWidth: '180px',
                                            wordBreak: 'break-word',
                                            position: 'relative'
                                        }}>
                                            <div style={{ minHeight: '20px' }}>
                                                {row['Upload Template Name'] || '-'}
                                            </div>
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

            {/* Fixed Position Dropdown for RICEW Type - Renders outside table container */}
            {
                editingCell?.field === 'Object Type' && (
                    <div
                        ref={dropdownContainerRef}
                        style={{
                            position: 'fixed',
                            top: dropdownPosition?.top ?? 0,
                            left: dropdownPosition?.left ?? 0,
                            width: dropdownPosition?.width || 200,
                            visibility: dropdownPosition ? 'visible' : 'hidden',
                            backgroundColor: 'white',
                            border: '1px solid #ddd',
                            borderRadius: '0 0 4px 4px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                            zIndex: 99999,
                            maxHeight: '200px',
                            overflowY: 'auto'
                        }}
                    >
                        {ricewTypeLOV
                            .filter(type =>
                                type.objectType.toLowerCase().includes(editValue.toLowerCase())
                            )
                            .map((type) => (
                                <div
                                    key={type.object_type_id}
                                    onClick={() => {
                                        // Clear field error for this field
                                        const errorKey = `${editingCell.rowIndex}-Object Type`;
                                        if (fieldErrors[errorKey]) {
                                            setFieldErrors(prev => {
                                                const newErrors = { ...prev };
                                                delete newErrors[errorKey];
                                                return newErrors;
                                            });
                                        }
                                        // Directly update the cell value with the selected type
                                        setUploadedData(prevData => {
                                            const newData = [...prevData];
                                            newData[editingCell.rowIndex] = {
                                                ...newData[editingCell.rowIndex],
                                                'Object Type': type.objectType
                                            };
                                            return newData;
                                        });
                                        // Close the editing state
                                        setEditingCell(null);
                                        setEditValue('');
                                        setPreviousValue('');
                                    }}
                                    style={{
                                        padding: '8px 12px',
                                        cursor: 'pointer',
                                        backgroundColor: editValue === type.objectType ? '#e3f2fd' : 'white',
                                        borderBottom: '1px solid #f0f0f0',
                                        fontSize: '13px',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = editValue === type.objectType ? '#e3f2fd' : 'white'}
                                >
                                    {type.objectType}
                                </div>
                            ))}
                        {ricewTypeLOV.filter(type =>
                            type.objectType.toLowerCase().includes(editValue.toLowerCase())
                        ).length === 0 && (
                                <div style={{ padding: '12px', fontSize: '13px', color: '#999', textAlign: 'center' }}>
                                    No matching types found
                                </div>
                            )}
                    </div>
                )
            }
            {/* Fixed Position Dropdown for Process Stream */}
            {
                editingCell?.field === 'Process Stream' && (
                    <div
                        ref={dropdownContainerRef}
                        style={{
                            position: 'fixed',
                            top: dropdownPosition?.top ?? 0,
                            left: dropdownPosition?.left ?? 0,
                            width: dropdownPosition?.width || 200,
                            visibility: dropdownPosition ? 'visible' : 'hidden',
                            backgroundColor: 'white',
                            border: '1px solid #ddd',
                            borderRadius: '0 0 4px 4px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                            zIndex: 99999,
                            maxHeight: '200px',
                            overflowY: 'auto'
                        }}
                    >
                        {[...new Set(masterProcessStreamData.map(item => item.stream_name))]
                            .filter(name =>
                                name.toLowerCase().includes(editValue.toLowerCase())
                            )
                            .map((name, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => {
                                        // Clear field error for this field
                                        const errorKey = `${editingCell.rowIndex}-Process Stream`;
                                        if (fieldErrors[errorKey]) {
                                            setFieldErrors(prev => {
                                                const newErrors = { ...prev };
                                                delete newErrors[errorKey];
                                                return newErrors;
                                            });
                                        }
                                        // Directly update the cell value with the selected stream
                                        setUploadedData(prevData => {
                                            const newData = [...prevData];
                                            const currentRow = newData[editingCell.rowIndex];
                                            const isCrossStreamNo = currentRow['Cross Stream Impact'] === 'No';

                                            newData[editingCell.rowIndex] = {
                                                ...currentRow,
                                                'Process Stream': name,
                                                'Application': '', // Clear dependent fields
                                                'L0 Process': '',
                                                'Module': '',
                                                // Auto-sync Impact fields if Cross Stream Impact is 'No'
                                                ...(isCrossStreamNo && {
                                                    'Impact Process Stream': name,
                                                    'Impact Application': '',
                                                    'Impact L0 Process': '',
                                                    'Impact Module': ''
                                                })
                                            };

                                            // Clear validation errors for Impact field if synced
                                            if (isCrossStreamNo) {
                                                setFieldErrors(prev => {
                                                    const newErrors = { ...prev };
                                                    delete newErrors[`${editingCell.rowIndex}-Impact Process Stream`];
                                                    delete newErrors[`${editingCell.rowIndex}-Impact Application`];
                                                    delete newErrors[`${editingCell.rowIndex}-Impact L0 Process`];
                                                    delete newErrors[`${editingCell.rowIndex}-Impact Module`];
                                                    return newErrors;
                                                });
                                            }

                                            return newData;
                                        });
                                        // Close the editing state
                                        setEditingCell(null);
                                        setEditValue('');
                                        setPreviousValue('');
                                    }}
                                    style={{
                                        padding: '8px 12px',
                                        cursor: 'pointer',
                                        backgroundColor: editValue === name ? '#e3f2fd' : 'white',
                                        borderBottom: '1px solid #f0f0f0',
                                        fontSize: '13px',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = editValue === name ? '#e3f2fd' : 'white'}
                                >
                                    {name}
                                </div>
                            ))}
                        {masterProcessStreamData.filter(item =>
                            item.stream_name.toLowerCase().includes(editValue.toLowerCase())
                        ).length === 0 && (
                                <div style={{ padding: '12px', fontSize: '13px', color: '#999', textAlign: 'center' }}>
                                    No matching process streams found
                                </div>
                            )}
                    </div>
                )
            }

            {/* Fixed Position Dropdown for Application */}
            {
                editingCell?.field === 'Application' && (
                    <div
                        ref={dropdownContainerRef}
                        style={{
                            position: 'fixed',
                            top: dropdownPosition?.top ?? 0,
                            left: dropdownPosition?.left ?? 0,
                            width: dropdownPosition?.width || 200,
                            visibility: dropdownPosition ? 'visible' : 'hidden',
                            backgroundColor: 'white',
                            border: '1px solid #ddd',
                            borderRadius: '0 0 4px 4px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                            zIndex: 99999,
                            maxHeight: '200px',
                            overflowY: 'auto'
                        }}
                    >
                        {(() => {
                            // Get all applications from all streams
                            // The masterProcessStreamData is now a flat array of application-stream mappings
                            const filteredOptions = masterProcessStreamData.filter(app =>
                                app.app_name.toLowerCase().includes(editValue.toLowerCase())
                            );

                            if (filteredOptions.length === 0) {
                                return (
                                    <div style={{ padding: '12px', fontSize: '13px', color: '#999', textAlign: 'center' }}>
                                        No matching applications found
                                    </div>
                                );
                            }

                            return filteredOptions.map((app, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => {
                                        // Clear field errors
                                        const errorKey = `${editingCell.rowIndex}-Application`;
                                        const processStreamErrorKey = `${editingCell.rowIndex}-Process Stream`;
                                        if (fieldErrors[errorKey] || fieldErrors[processStreamErrorKey]) {
                                            setFieldErrors(prev => {
                                                const newErrors = { ...prev };
                                                delete newErrors[errorKey];
                                                delete newErrors[processStreamErrorKey];
                                                return newErrors;
                                            });
                                        }
                                        setUploadedData(prevData => {
                                            const newData = [...prevData];
                                            const currentRow = newData[editingCell.rowIndex];
                                            const isCrossStreamNo = currentRow['Cross Stream Impact'] === 'No';

                                            newData[editingCell.rowIndex] = {
                                                ...currentRow,
                                                'Process Stream': app.stream_name, // Auto-select Process Stream
                                                'Application': app.app_name,
                                                'L0 Process': '', // Clear dependent fields
                                                'Module': '',
                                                // Auto-sync Impact fields if Cross Stream Impact is 'No'
                                                ...(isCrossStreamNo && {
                                                    'Impact Process Stream': app.stream_name,
                                                    'Impact Application': app.app_name,
                                                    'Impact L0 Process': '',
                                                    'Impact Module': ''
                                                })
                                            };

                                            // Clear validation errors for Impact fields if synced
                                            if (isCrossStreamNo) {
                                                setFieldErrors(prev => {
                                                    const newErrors = { ...prev };
                                                    delete newErrors[`${editingCell.rowIndex}-Impact Process Stream`];
                                                    delete newErrors[`${editingCell.rowIndex}-Impact Application`];
                                                    delete newErrors[`${editingCell.rowIndex}-Impact L0 Process`];
                                                    delete newErrors[`${editingCell.rowIndex}-Impact Module`];
                                                    return newErrors;
                                                });
                                            }

                                            return newData;
                                        });
                                        setEditingCell(null);
                                        setEditValue('');
                                        setPreviousValue('');
                                    }}
                                    style={{
                                        padding: '8px 12px',
                                        cursor: 'pointer',
                                        backgroundColor: editValue === app.app_name ? '#e3f2fd' : 'white',
                                        borderBottom: '1px solid #f0f0f0',
                                        fontSize: '13px',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = editValue === app.app_name ? '#e3f2fd' : 'white'}
                                >
                                    {app.app_name}
                                </div>
                            ));
                        })()}
                    </div>
                )
            }

            {/* Fixed Position Dropdown for L0 Process */}
            {
                editingCell?.field === 'L0 Process' && (
                    <div
                        ref={dropdownContainerRef}
                        style={{
                            position: 'fixed',
                            top: dropdownPosition?.top ?? 0,
                            left: dropdownPosition?.left ?? 0,
                            width: dropdownPosition?.width || 200,
                            visibility: dropdownPosition ? 'visible' : 'hidden',
                            backgroundColor: 'white',
                            border: '1px solid #ddd',
                            borderRadius: '0 0 4px 4px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                            zIndex: 99999,
                            maxHeight: '200px',
                            overflowY: 'auto'
                        }}
                    >
                        {(() => {
                            const currentRow = uploadedData[editingCell.rowIndex];
                            const stream = masterProcessStreamData.find(s => s.stream_name === currentRow['Process Stream']);
                            const application = stream ? stream.applications.find(app => app.app_name === currentRow['Application']) : null;

                            if (!application) {
                                return (
                                    <div style={{ padding: '12px', fontSize: '13px', color: '#999', textAlign: 'center' }}>
                                        Please select an Application first
                                    </div>
                                );
                            }

                            const options = application.l0_processes || [];
                            const filteredOptions = options.filter(l0 =>
                                l0.l0_name.toLowerCase().includes(editValue.toLowerCase())
                            );

                            if (filteredOptions.length === 0) {
                                return (
                                    <div style={{ padding: '12px', fontSize: '13px', color: '#999', textAlign: 'center' }}>
                                        No matching L0 processes found
                                    </div>
                                );
                            }

                            return filteredOptions.map((l0, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => {
                                        // Clear field error for this field
                                        const errorKey = `${editingCell.rowIndex}-L0 Process`;
                                        if (fieldErrors[errorKey]) {
                                            setFieldErrors(prev => {
                                                const newErrors = { ...prev };
                                                delete newErrors[errorKey];
                                                return newErrors;
                                            });
                                        }
                                        setUploadedData(prevData => {
                                            const newData = [...prevData];
                                            const currentRow = newData[editingCell.rowIndex];
                                            const isCrossStreamNo = currentRow['Cross Stream Impact'] === 'No';

                                            newData[editingCell.rowIndex] = {
                                                ...currentRow,
                                                'L0 Process': l0.l0_name,
                                                // Auto-sync Impact field if Cross Stream Impact is 'No'
                                                ...(isCrossStreamNo && {
                                                    'Impact L0 Process': l0.l0_name
                                                })
                                                // No direct dependents to clear for L0 selection (Module depends on App)
                                            };

                                            // Clear validation error for Impact field if synced
                                            if (isCrossStreamNo) {
                                                setFieldErrors(prev => {
                                                    const newErrors = { ...prev };
                                                    delete newErrors[`${editingCell.rowIndex}-Impact L0 Process`];
                                                    return newErrors;
                                                });
                                            }

                                            return newData;
                                        });
                                        setEditingCell(null);
                                        setEditValue('');
                                        setPreviousValue('');
                                    }}
                                    style={{
                                        padding: '8px 12px',
                                        cursor: 'pointer',
                                        backgroundColor: editValue === l0.l0_name ? '#e3f2fd' : 'white',
                                        borderBottom: '1px solid #f0f0f0',
                                        fontSize: '13px',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = editValue === l0.l0_name ? '#e3f2fd' : 'white'}
                                >
                                    {l0.l0_name}
                                </div>
                            ));
                        })()}
                    </div>
                )
            }

            {/* Fixed Position Dropdown for Module - Multi-Select */}
            {
                editingCell?.field === 'Module' && (
                    <div
                        ref={dropdownContainerRef}
                        style={{
                            position: 'fixed',
                            top: dropdownPosition.top,
                            left: dropdownPosition.left,
                            width: dropdownPosition.width || 200,
                            backgroundColor: 'white',
                            border: '1px solid #ddd',
                            borderRadius: '0 0 4px 4px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                            zIndex: 99999,
                            maxHeight: '200px',
                            overflowY: 'auto'
                        }}
                    >
                        {(() => {
                            const currentRow = uploadedData[editingCell.rowIndex];
                            const stream = masterProcessStreamData.find(s => s.stream_name === currentRow['Process Stream']);
                            const application = stream ? stream.applications.find(app => app.app_name === currentRow['Application']) : null;

                            if (!application) {
                                return (
                                    <div style={{ padding: '12px', fontSize: '13px', color: '#999', textAlign: 'center' }}>
                                        Please select an Application first
                                    </div>
                                );
                            }

                            const options = application.modules || [];
                            const filteredOptions = options.filter(mod =>
                                mod.module_name.toLowerCase().includes(editValue.toLowerCase())
                            );

                            if (filteredOptions.length === 0) {
                                return (
                                    <div style={{ padding: '12px', fontSize: '13px', color: '#999', textAlign: 'center' }}>
                                        No matching modules found
                                    </div>
                                );
                            }

                            // Get currently selected modules as array
                            const currentModules = currentRow['Module'] ? currentRow['Module'].split(';').map(m => m.trim()) : [];

                            return filteredOptions.map((mod, idx) => {
                                const isSelected = currentModules.includes(mod.module_name);

                                return (
                                    <div
                                        key={idx}
                                        onClick={(e) => {
                                            e.stopPropagation();

                                            // Toggle selection
                                            setUploadedData(prevData => {
                                                const newData = [...prevData];
                                                const currentRow = newData[editingCell.rowIndex];
                                                const isCrossStreamNo = currentRow['Cross Stream Impact'] === 'No';
                                                const currentModules = currentRow['Module']
                                                    ? currentRow['Module'].split(';').map(m => m.trim())
                                                    : [];

                                                let updatedModules;
                                                if (currentModules.includes(mod.module_name)) {
                                                    // Remove module
                                                    updatedModules = currentModules.filter(m => m !== mod.module_name);
                                                } else {
                                                    // Add module
                                                    updatedModules = [...currentModules, mod.module_name];
                                                    // Clear field error when adding a module
                                                    const errorKey = `${editingCell.rowIndex}-Module`;
                                                    if (fieldErrors[errorKey]) {
                                                        setFieldErrors(prev => {
                                                            const newErrors = { ...prev };
                                                            delete newErrors[errorKey];
                                                            return newErrors;
                                                        });
                                                    }
                                                }

                                                newData[editingCell.rowIndex] = {
                                                    ...currentRow,
                                                    'Module': updatedModules.join('; '),
                                                    // Auto-sync Impact Module if Cross Stream Impact is 'No'
                                                    ...(isCrossStreamNo && {
                                                        'Impact Module': updatedModules.join('; ')
                                                    })
                                                };

                                                // Clear validation error for Impact Module if synced
                                                if (isCrossStreamNo) {
                                                    setFieldErrors(prev => {
                                                        const newErrors = { ...prev };
                                                        delete newErrors[`${editingCell.rowIndex}-Impact Module`];
                                                        return newErrors;
                                                    });
                                                }

                                                return newData;
                                            });
                                        }}
                                        style={{
                                            padding: '8px 12px',
                                            cursor: 'pointer',
                                            backgroundColor: isSelected ? '#e3f2fd' : 'white',
                                            borderBottom: '1px solid #f0f0f0',
                                            fontSize: '13px',
                                            transition: 'background-color 0.2s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isSelected) e.currentTarget.style.backgroundColor = '#f5f5f5';
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isSelected) e.currentTarget.style.backgroundColor = 'white';
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => { }} // Handled by parent div onClick
                                            style={{
                                                cursor: 'pointer',
                                                width: '18px',
                                                height: '18px',
                                                flexShrink: 0
                                            }}
                                        />
                                        <span style={{ flex: 1 }}>{mod.module_name}</span>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                )
            }

            {/* Fixed Position Dropdown for Cross Stream Impact */}
            {
                editingCell?.field === 'Cross Stream Impact' && (
                    <div
                        ref={dropdownContainerRef}
                        style={{
                            position: 'fixed',
                            top: dropdownPosition?.top ?? 0,
                            left: dropdownPosition?.left ?? 0,
                            width: dropdownPosition?.width || 200,
                            visibility: dropdownPosition ? 'visible' : 'hidden',
                            backgroundColor: 'white',
                            border: '1px solid #ddd',
                            borderRadius: '0 0 4px 4px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                            zIndex: 99999,
                            maxHeight: '200px',
                            overflowY: 'auto'
                        }}
                    >
                        {['Yes', 'No']
                            .filter(option =>
                                option.toLowerCase().includes(editValue.toLowerCase())
                            )
                            .map((option, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => {
                                        // Clear field error for this field
                                        const errorKey = `${editingCell.rowIndex}-Cross Stream Impact`;
                                        if (fieldErrors[errorKey]) {
                                            setFieldErrors(prev => {
                                                const newErrors = { ...prev };
                                                delete newErrors[errorKey];
                                                return newErrors;
                                            });
                                        }
                                        setUploadedData(prevData => {
                                            const newData = [...prevData];
                                            const currentRow = newData[editingCell.rowIndex];

                                            if (option === 'No') {
                                                newData[editingCell.rowIndex] = {
                                                    ...currentRow,
                                                    'Cross Stream Impact': option,
                                                    'Impact Process Stream': currentRow['Process Stream'],
                                                    'Impact Application': currentRow['Application'],
                                                    'Impact L0 Process': currentRow['L0 Process'],
                                                    'Impact Module': currentRow['Module']
                                                };

                                                // Clear validation errors for auto-populated Impact fields
                                                setFieldErrors(prev => {
                                                    const newErrors = { ...prev };
                                                    delete newErrors[`${editingCell.rowIndex}-Impact Process Stream`];
                                                    delete newErrors[`${editingCell.rowIndex}-Impact Application`];
                                                    delete newErrors[`${editingCell.rowIndex}-Impact L0 Process`];
                                                    delete newErrors[`${editingCell.rowIndex}-Impact Module`];
                                                    return newErrors;
                                                });
                                            } else {
                                                newData[editingCell.rowIndex] = {
                                                    ...currentRow,
                                                    'Cross Stream Impact': option
                                                };
                                            }
                                            return newData;
                                        });
                                        setEditingCell(null);
                                        setEditValue('');
                                        setPreviousValue('');
                                    }}
                                    style={{
                                        padding: '8px 12px',
                                        cursor: 'pointer',
                                        backgroundColor: editValue === option ? '#e3f2fd' : 'white',
                                        borderBottom: '1px solid #f0f0f0',
                                        fontSize: '13px',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = editValue === option ? '#e3f2fd' : 'white'}
                                >
                                    {option}
                                </div>
                            ))}
                    </div>
                )
            }

            {/* Fixed Position Dropdown for Impact Process Stream */}
            {
                editingCell?.field === 'Impact Process Stream' && (
                    <div
                        ref={dropdownContainerRef}
                        style={{
                            position: 'fixed',
                            top: dropdownPosition?.top ?? 0,
                            left: dropdownPosition?.left ?? 0,
                            width: dropdownPosition?.width || 200,
                            visibility: dropdownPosition ? 'visible' : 'hidden',
                            backgroundColor: 'white',
                            border: '1px solid #ddd',
                            borderRadius: '0 0 4px 4px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                            zIndex: 99999,
                            maxHeight: '200px',
                            overflowY: 'auto'
                        }}
                    >
                        {masterProcessStreamData
                            .map(item => item.stream_name)
                            .filter(name =>
                                name.toLowerCase().includes(editValue.toLowerCase())
                            )
                            .map((name, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => {
                                        // Clear field error for this field
                                        const errorKey = `${editingCell.rowIndex}-Impact Process Stream`;
                                        if (fieldErrors[errorKey]) {
                                            setFieldErrors(prev => {
                                                const newErrors = { ...prev };
                                                delete newErrors[errorKey];
                                                return newErrors;
                                            });
                                        }
                                        setUploadedData(prevData => {
                                            const newData = [...prevData];
                                            newData[editingCell.rowIndex] = {
                                                ...newData[editingCell.rowIndex],
                                                'Impact Process Stream': name,
                                                'Impact Application': '', // Clear dependent fields
                                                'Impact L0 Process': '',
                                                'Impact Module': ''
                                            };
                                            return newData;
                                        });
                                        setEditingCell(null);
                                        setEditValue('');
                                        setPreviousValue('');
                                    }}
                                    style={{
                                        padding: '8px 12px',
                                        cursor: 'pointer',
                                        backgroundColor: editValue === name ? '#e3f2fd' : 'white',
                                        borderBottom: '1px solid #f0f0f0',
                                        fontSize: '13px',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = editValue === name ? '#e3f2fd' : 'white'}
                                >
                                    {name}
                                </div>
                            ))}
                        {masterProcessStreamData.filter(item =>
                            item.stream_name.toLowerCase().includes(editValue.toLowerCase())
                        ).length === 0 && (
                                <div style={{ padding: '12px', fontSize: '13px', color: '#999', textAlign: 'center' }}>
                                    No matching process streams found
                                </div>
                            )}
                    </div>
                )
            }

            {/* Fixed Position Dropdown for Impact Application */}
            {
                editingCell?.field === 'Impact Application' && (
                    <div
                        ref={dropdownContainerRef}
                        style={{
                            position: 'fixed',
                            top: dropdownPosition?.top ?? 0,
                            left: dropdownPosition?.left ?? 0,
                            width: dropdownPosition?.width || 200,
                            visibility: dropdownPosition ? 'visible' : 'hidden',
                            backgroundColor: 'white',
                            border: '1px solid #ddd',
                            borderRadius: '0 0 4px 4px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                            zIndex: 99999,
                            maxHeight: '200px',
                            overflowY: 'auto'
                        }}
                    >
                        {(() => {
                            const currentRow = uploadedData[editingCell.rowIndex];
                            const stream = masterProcessStreamData.find(s => s.stream_name === currentRow['Impact Process Stream']);
                            const application = stream ? stream.applications.find(app => app.app_name === currentRow['Impact Application']) : null;

                            if (!application) {
                                return (
                                    <div style={{ padding: '12px', fontSize: '13px', color: '#999', textAlign: 'center' }}>
                                        Please select an Impact Process Stream first
                                    </div>
                                );
                            }

                            const options = stream.applications || [];
                            const filteredOptions = options.filter(app =>
                                app.app_name.toLowerCase().includes(editValue.toLowerCase())
                            );

                            if (filteredOptions.length === 0) {
                                return (
                                    <div style={{ padding: '12px', fontSize: '13px', color: '#999', textAlign: 'center' }}>
                                        No matching applications found
                                    </div>
                                );
                            }

                            return filteredOptions.map((app, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => {
                                        // Clear field error for this field
                                        const errorKey = `${editingCell.rowIndex}-Impact Application`;
                                        if (fieldErrors[errorKey]) {
                                            setFieldErrors(prev => {
                                                const newErrors = { ...prev };
                                                delete newErrors[errorKey];
                                                return newErrors;
                                            });
                                        }
                                        setUploadedData(prevData => {
                                            const newData = [...prevData];
                                            newData[editingCell.rowIndex] = {
                                                ...newData[editingCell.rowIndex],
                                                'Impact Application': app.app_name,
                                                'Impact L0 Process': '', // Clear dependent fields
                                                'Impact Module': ''
                                            };
                                            return newData;
                                        });
                                        setEditingCell(null);
                                        setEditValue('');
                                        setPreviousValue('');
                                    }}
                                    style={{
                                        padding: '8px 12px',
                                        cursor: 'pointer',
                                        backgroundColor: editValue === app.app_name ? '#e3f2fd' : 'white',
                                        borderBottom: '1px solid #f0f0f0',
                                        fontSize: '13px',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = editValue === app.app_name ? '#e3f2fd' : 'white'}
                                >
                                    {app.app_name}
                                </div>
                            ));
                        })()}
                    </div>
                )
            }

            {/* Fixed Position Dropdown for Impact L0 Process */}
            {
                editingCell?.field === 'Impact L0 Process' && (
                    <div
                        ref={dropdownContainerRef}
                        style={{
                            position: 'fixed',
                            top: dropdownPosition?.top ?? 0,
                            left: dropdownPosition?.left ?? 0,
                            width: dropdownPosition?.width || 200,
                            visibility: dropdownPosition ? 'visible' : 'hidden',
                            backgroundColor: 'white',
                            border: '1px solid #ddd',
                            borderRadius: '0 0 4px 4px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                            zIndex: 99999,
                            maxHeight: '200px',
                            overflowY: 'auto'
                        }}
                    >
                        {(() => {
                            const currentRow = uploadedData[editingCell.rowIndex];
                            const stream = masterProcessStreamData.find(s => s.stream_name === currentRow['Impact Process Stream']);
                            const application = stream ? stream.applications.find(app => app.app_name === currentRow['Impact Application']) : null;

                            if (!application) {
                                return (
                                    <div style={{ padding: '12px', fontSize: '13px', color: '#999', textAlign: 'center' }}>
                                        Please select an Impact Application first
                                    </div>
                                );
                            }

                            const options = application.l0_processes || [];
                            const filteredOptions = options.filter(l0 =>
                                l0.l0_name.toLowerCase().includes(editValue.toLowerCase())
                            );

                            if (filteredOptions.length === 0) {
                                return (
                                    <div style={{ padding: '12px', fontSize: '13px', color: '#999', textAlign: 'center' }}>
                                        No matching L0 processes found
                                    </div>
                                );
                            }

                            return filteredOptions.map((l0, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => {
                                        // Clear field error for this field
                                        const errorKey = `${editingCell.rowIndex}-Impact L0 Process`;
                                        if (fieldErrors[errorKey]) {
                                            setFieldErrors(prev => {
                                                const newErrors = { ...prev };
                                                delete newErrors[errorKey];
                                                return newErrors;
                                            });
                                        }
                                        setUploadedData(prevData => {
                                            const newData = [...prevData];
                                            newData[editingCell.rowIndex] = {
                                                ...newData[editingCell.rowIndex],
                                                'Impact L0 Process': l0.l0_name
                                                // No direct dependents to clear
                                            };
                                            return newData;
                                        });
                                        setEditingCell(null);
                                        setEditValue('');
                                        setPreviousValue('');
                                    }}
                                    style={{
                                        padding: '8px 12px',
                                        cursor: 'pointer',
                                        backgroundColor: editValue === l0.l0_name ? '#e3f2fd' : 'white',
                                        borderBottom: '1px solid #f0f0f0',
                                        fontSize: '13px',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = editValue === l0.l0_name ? '#e3f2fd' : 'white'}
                                >
                                    {l0.l0_name}
                                </div>
                            ));
                        })()}
                    </div>
                )
            }

            {/* Fixed Position Dropdown for Impact Module - Multi-Select */}
            {
                editingCell?.field === 'Impact Module' && (
                    <div
                        ref={dropdownContainerRef}
                        style={{
                            position: 'fixed',
                            top: dropdownPosition?.top ?? 0,
                            left: dropdownPosition?.left ?? 0,
                            width: dropdownPosition?.width || 200,
                            visibility: dropdownPosition ? 'visible' : 'hidden',
                            backgroundColor: 'white',
                            border: '1px solid #ddd',
                            borderRadius: '0 0 4px 4px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                            zIndex: 99999,
                            maxHeight: '200px',
                            overflowY: 'auto'
                        }}
                    >
                        {(() => {
                            const currentRow = uploadedData[editingCell.rowIndex];
                            const stream = masterProcessStreamData.find(s => s.stream_name === currentRow['Impact Process Stream']);
                            const application = stream ? stream.applications.find(app => app.app_name === currentRow['Impact Application']) : null;

                            if (!application) {
                                return (
                                    <div style={{ padding: '12px', fontSize: '13px', color: '#999', textAlign: 'center' }}>
                                        Please select an Impact Application first
                                    </div>
                                );
                            }

                            const options = application.modules || [];
                            const filteredOptions = options.filter(mod =>
                                mod.module_name.toLowerCase().includes(editValue.toLowerCase())
                            );

                            if (filteredOptions.length === 0) {
                                return (
                                    <div style={{ padding: '12px', fontSize: '13px', color: '#999', textAlign: 'center' }}>
                                        No matching modules found
                                    </div>
                                );
                            }

                            // Get currently selected modules as array
                            const currentModules = currentRow['Impact Module'] ? currentRow['Impact Module'].split(';').map(m => m.trim()) : [];

                            return filteredOptions.map((mod, idx) => {
                                const isSelected = currentModules.includes(mod.module_name);

                                return (
                                    <div
                                        key={idx}
                                        onClick={(e) => {
                                            e.stopPropagation();

                                            // Toggle selection
                                            setUploadedData(prevData => {
                                                const newData = [...prevData];
                                                const currentModules = newData[editingCell.rowIndex]['Impact Module']
                                                    ? newData[editingCell.rowIndex]['Impact Module'].split(';').map(m => m.trim())
                                                    : [];

                                                let updatedModules;
                                                if (currentModules.includes(mod.module_name)) {
                                                    // Remove module
                                                    updatedModules = currentModules.filter(m => m !== mod.module_name);
                                                } else {
                                                    // Add module
                                                    updatedModules = [...currentModules, mod.module_name];
                                                    // Clear field error when adding a module
                                                    const errorKey = `${editingCell.rowIndex}-Impact Module`;
                                                    if (fieldErrors[errorKey]) {
                                                        setFieldErrors(prev => {
                                                            const newErrors = { ...prev };
                                                            delete newErrors[errorKey];
                                                            return newErrors;
                                                        });
                                                    }
                                                }

                                                newData[editingCell.rowIndex] = {
                                                    ...newData[editingCell.rowIndex],
                                                    'Impact Module': updatedModules.join('; ')
                                                };
                                                return newData;
                                            });
                                        }}
                                        style={{
                                            padding: '8px 12px',
                                            cursor: 'pointer',
                                            backgroundColor: isSelected ? '#e3f2fd' : 'white',
                                            borderBottom: '1px solid #f0f0f0',
                                            fontSize: '13px',
                                            transition: 'background-color 0.2s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isSelected) e.currentTarget.style.backgroundColor = '#f5f5f5';
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isSelected) e.currentTarget.style.backgroundColor = 'white';
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => { }} // Handled by parent div onClick
                                            style={{
                                                cursor: 'pointer',
                                                width: '18px',
                                                height: '18px',
                                                flexShrink: 0
                                            }}
                                        />
                                        <span style={{ flex: 1 }}>{mod.module_name}</span>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                )
            }
            {/* Fixed Position Dropdown for RICEW Status Detail */}
            {
                editingCell?.field === 'RICEW Status Detail' && (
                    <div
                        ref={dropdownContainerRef}
                        style={{
                            position: 'fixed',
                            top: dropdownPosition?.top ?? 0,
                            left: dropdownPosition?.left ?? 0,
                            width: dropdownPosition?.width || 200,
                            visibility: dropdownPosition ? 'visible' : 'hidden',
                            backgroundColor: 'white',
                            border: '1px solid #ddd',
                            borderRadius: '0 0 4px 4px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                            zIndex: 99999,
                            maxHeight: '200px',
                            overflowY: 'auto'
                        }}
                    >
                        {ricewStatusLOV
                            .filter(status =>
                                status.Status_Name.toLowerCase().includes(editValue.toLowerCase())
                            )
                            .map((status, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => {
                                        // Clear field error for this field
                                        const errorKey = `${editingCell.rowIndex}-RICEW Status Detail`;
                                        if (fieldErrors[errorKey]) {
                                            setFieldErrors(prev => {
                                                const newErrors = { ...prev };
                                                delete newErrors[errorKey];
                                                return newErrors;
                                            });
                                        }
                                        setUploadedData(prevData => {
                                            const newData = [...prevData];
                                            newData[editingCell.rowIndex] = {
                                                ...newData[editingCell.rowIndex],
                                                'RICEW Status Detail': status.Status_Name
                                            };
                                            return newData;
                                        });
                                        setEditingCell(null);
                                        setEditValue('');
                                        setPreviousValue('');
                                    }}
                                    style={{
                                        padding: '8px 12px',
                                        cursor: 'pointer',
                                        backgroundColor: editValue === status.Status_Name ? '#e3f2fd' : 'white',
                                        borderBottom: '1px solid #f0f0f0',
                                        fontSize: '13px',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = editValue === status.Status_Name ? '#e3f2fd' : 'white'}
                                >
                                    {status.Status_Name}
                                </div>
                            ))}
                        {ricewStatusLOV.filter(status =>
                            status.Status_Name.toLowerCase().includes(editValue.toLowerCase())
                        ).length === 0 && (
                                <div style={{ padding: '12px', fontSize: '13px', color: '#999', textAlign: 'center' }}>
                                    No matching status found
                                </div>
                            )}
                    </div>
                )
            }

            {/* Fixed Position Dropdown for Complexity */}
            {
                editingCell?.field === 'Complexity' && (
                    <div
                        ref={dropdownContainerRef}
                        style={{
                            position: 'fixed',
                            top: dropdownPosition?.top ?? 0,
                            left: dropdownPosition?.left ?? 0,
                            width: dropdownPosition?.width || 200,
                            visibility: dropdownPosition ? 'visible' : 'hidden',
                            backgroundColor: 'white',
                            border: '1px solid #ddd',
                            borderRadius: '0 0 4px 4px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                            zIndex: 99999,
                            maxHeight: '200px',
                            overflowY: 'auto'
                        }}
                    >
                        {['Very Simple', 'Simple', 'Medium', 'Complex', 'Very Complex']
                            .filter(option =>
                                option.toLowerCase().includes(editValue.toLowerCase())
                            )
                            .map((option, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => {
                                        // Clear field error for this field
                                        const errorKey = `${editingCell.rowIndex}-Complexity`;
                                        if (fieldErrors[errorKey]) {
                                            setFieldErrors(prev => {
                                                const newErrors = { ...prev };
                                                delete newErrors[errorKey];
                                                return newErrors;
                                            });
                                        }
                                        setUploadedData(prevData => {
                                            const newData = [...prevData];
                                            newData[editingCell.rowIndex] = {
                                                ...newData[editingCell.rowIndex],
                                                'Complexity': option
                                            };
                                            return newData;
                                        });
                                        setEditingCell(null);
                                        setEditValue('');
                                        setPreviousValue('');
                                    }}
                                    style={{
                                        padding: '8px 12px',
                                        cursor: 'pointer',
                                        backgroundColor: editValue === option ? '#e3f2fd' : 'white',
                                        borderBottom: '1px solid #f0f0f0',
                                        fontSize: '13px',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = editValue === option ? '#e3f2fd' : 'white'}
                                >
                                    {option}
                                </div>
                            ))}
                        {['Very Simple', 'Simple', 'Medium', 'Complex', 'Very Complex'].filter(option =>
                            option.toLowerCase().includes(editValue.toLowerCase())
                        ).length === 0 && (
                                <div style={{ padding: '12px', fontSize: '13px', color: '#999', textAlign: 'center' }}>
                                    No matching complexity found
                                </div>
                            )}
                    </div>
                )
            }

            {/* Fixed Position Dropdown for Rate Card Name */}
            {
                editingCell?.field === 'Rate Card Name' && (
                    <div
                        ref={dropdownContainerRef}
                        style={{
                            position: 'fixed',
                            top: dropdownPosition?.top ?? 0,
                            left: dropdownPosition?.left ?? 0,
                            width: dropdownPosition?.width || 200,
                            visibility: dropdownPosition ? 'visible' : 'hidden',
                            backgroundColor: 'white',
                            border: '1px solid #ddd',
                            borderRadius: '0 0 4px 4px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                            zIndex: 99999,
                            maxHeight: '200px',
                            overflowY: 'auto'
                        }}
                    >
                        {rateCardLOV
                            .filter(card =>
                                card.Effort_Rate_Card_Name.toLowerCase().includes(editValue.toLowerCase())
                            )
                            .map((card, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => {
                                        // Clear field error for this field
                                        const errorKey = `${editingCell.rowIndex}-Rate Card Name`;
                                        if (fieldErrors[errorKey]) {
                                            setFieldErrors(prev => {
                                                const newErrors = { ...prev };
                                                delete newErrors[errorKey];
                                                return newErrors;
                                            });
                                        }
                                        setUploadedData(prevData => {
                                            const newData = [...prevData];
                                            newData[editingCell.rowIndex] = {
                                                ...newData[editingCell.rowIndex],
                                                'Rate Card Name': card.Effort_Rate_Card_Name
                                            };
                                            return newData;
                                        });
                                        setEditingCell(null);
                                        setEditValue('');
                                        setPreviousValue('');
                                    }}
                                    style={{
                                        padding: '8px 12px',
                                        cursor: 'pointer',
                                        backgroundColor: editValue === card.Effort_Rate_Card_Name ? '#e3f2fd' : 'white',
                                        borderBottom: '1px solid #f0f0f0',
                                        fontSize: '13px',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = editValue === card.Effort_Rate_Card_Name ? '#e3f2fd' : 'white'}
                                >
                                    {card.Effort_Rate_Card_Name}
                                </div>
                            ))}
                        {rateCardLOV.filter(card =>
                            card.Effort_Rate_Card_Name.toLowerCase().includes(editValue.toLowerCase())
                        ).length === 0 && (
                                <div style={{ padding: '12px', fontSize: '13px', color: '#999', textAlign: 'center' }}>
                                    No matching rate card found
                                </div>
                            )}
                    </div>
                )
            }

            {/* Fixed Position Dropdown for Wave Code */}
            {
                editingCell?.field === 'Wave Code' && (
                    <div
                        ref={dropdownContainerRef}
                        style={{
                            position: 'fixed',
                            top: dropdownPosition?.top ?? 0,
                            left: dropdownPosition?.left ?? 0,
                            width: dropdownPosition?.width || 200,
                            visibility: dropdownPosition ? 'visible' : 'hidden',
                            backgroundColor: 'white',
                            border: '1px solid #ddd',
                            borderRadius: '0 0 4px 4px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                            zIndex: 99999,
                            maxHeight: '200px',
                            overflowY: 'auto'
                        }}
                    >
                        {[...new Set(waveRolloutLOV.map(item => item.Wave_Code))]
                            .filter(code => code.toLowerCase().includes(editValue.toLowerCase()))
                            .map((code, idx) => {
                                const item = waveRolloutLOV.find(i => i.Wave_Code === code);
                                return (
                                    <div
                                        key={idx}
                                        onClick={() => {
                                            // Clear field errors for Wave Code and Wave Name
                                            setFieldErrors(prev => {
                                                const newErrors = { ...prev };
                                                delete newErrors[`${editingCell.rowIndex}-Wave Code`];
                                                delete newErrors[`${editingCell.rowIndex}-Wave Name`];
                                                return newErrors;
                                            });

                                            setUploadedData(prevData => {
                                                const newData = [...prevData];
                                                newData[editingCell.rowIndex] = {
                                                    ...newData[editingCell.rowIndex],
                                                    'Wave Code': code,
                                                    'Wave Name': item ? item.Wave_Description : ''
                                                };
                                                return newData;
                                            });
                                            setEditingCell(null);
                                            setEditValue('');
                                            setPreviousValue('');
                                        }}
                                        style={{
                                            padding: '8px 12px',
                                            cursor: 'pointer',
                                            backgroundColor: editValue === code ? '#e3f2fd' : 'white',
                                            borderBottom: '1px solid #f0f0f0',
                                            fontSize: '13px',
                                            transition: 'background-color 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = editValue === code ? '#e3f2fd' : 'white'}
                                    >
                                        <div style={{ fontWeight: '500' }}>{code}</div>
                                    </div>
                                );
                            })
                        }
                        {waveRolloutLOV.filter(item =>
                            item.Wave_Code.toLowerCase().includes(editValue.toLowerCase())
                        ).length === 0 && (
                                <div style={{ padding: '12px', fontSize: '13px', color: '#999', textAlign: 'center' }}>
                                    No matching wave code found
                                </div>
                            )}
                    </div>
                )
            }

            {/* Fixed Position Dropdown for Organization Name */}
            {
                editingCell?.field === 'Organization Name' && (
                    <div
                        ref={dropdownContainerRef}
                        style={{
                            position: 'fixed',
                            top: dropdownPosition?.top ?? 0,
                            left: dropdownPosition?.left ?? 0,
                            width: dropdownPosition?.width || 200,
                            visibility: dropdownPosition ? 'visible' : 'hidden',
                            backgroundColor: 'white',
                            border: '1px solid #ddd',
                            borderRadius: '0 0 4px 4px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                            zIndex: 99999,
                            maxHeight: '200px',
                            overflowY: 'auto'
                        }}
                    >
                        {(() => {
                            const uniqueOrgs = new Map();
                            orgServiceLineLOV.forEach(item => {
                                if (!uniqueOrgs.has(item.organization_id)) {
                                    uniqueOrgs.set(item.organization_id, item.organization_name);
                                }
                            });
                            const options = Array.from(uniqueOrgs.values());
                            const filteredOptions = options.filter(name =>
                                name.toLowerCase().includes(editValue.toLowerCase())
                            );

                            if (filteredOptions.length === 0) {
                                return (
                                    <div style={{ padding: '12px', fontSize: '13px', color: '#999', textAlign: 'center' }}>
                                        No matching organizations found
                                    </div>
                                );
                            }

                            return filteredOptions.map((name, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => {
                                        // Clear field error for this field
                                        const errorKey = `${editingCell.rowIndex}-Organization Name`;
                                        if (fieldErrors[errorKey]) {
                                            setFieldErrors(prev => {
                                                const newErrors = { ...prev };
                                                delete newErrors[errorKey];
                                                return newErrors;
                                            });
                                        }
                                        setUploadedData(prevData => {
                                            const newData = [...prevData];
                                            newData[editingCell.rowIndex] = {
                                                ...newData[editingCell.rowIndex],
                                                'Organization Name': name,
                                                'Service Line': '' // Clear dependent field
                                            };
                                            return newData;
                                        });
                                        setEditingCell(null);
                                        setEditValue('');
                                        setPreviousValue('');
                                    }}
                                    style={{
                                        padding: '8px 12px',
                                        cursor: 'pointer',
                                        backgroundColor: editValue === name ? '#e3f2fd' : 'white',
                                        borderBottom: '1px solid #f0f0f0',
                                        fontSize: '13px',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = editValue === name ? '#e3f2fd' : 'white'}
                                >
                                    {name}
                                </div>
                            ));
                        })()}
                    </div>
                )
            }

            {/* Fixed Position Dropdown for Service Line */}
            {
                editingCell?.field === 'Service Line' && (
                    <div
                        ref={dropdownContainerRef}
                        style={{
                            position: 'fixed',
                            top: dropdownPosition?.top ?? 0,
                            left: dropdownPosition?.left ?? 0,
                            width: dropdownPosition?.width || 200,
                            visibility: dropdownPosition ? 'visible' : 'hidden',
                            backgroundColor: 'white',
                            border: '1px solid #ddd',
                            borderRadius: '0 0 4px 4px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                            zIndex: 99999,
                            maxHeight: '200px',
                            overflowY: 'auto'
                        }}
                    >
                        {(() => {
                            const currentRow = uploadedData[editingCell.rowIndex];
                            const selectedOrgName = currentRow['Organization Name'];

                            if (!selectedOrgName) {
                                return (
                                    <div style={{ padding: '12px', fontSize: '13px', color: '#999', textAlign: 'center' }}>
                                        Please select an Organization Name first
                                    </div>
                                );
                            }

                            const options = orgServiceLineLOV
                                .filter(item => item.organization_name === selectedOrgName)
                                .map(item => item.ServiceLine_name);

                            const filteredOptions = options.filter(name =>
                                name.toLowerCase().includes(editValue.toLowerCase())
                            );

                            if (filteredOptions.length === 0) {
                                return (
                                    <div style={{ padding: '12px', fontSize: '13px', color: '#999', textAlign: 'center' }}>
                                        No matching service lines found
                                    </div>
                                );
                            }

                            return filteredOptions.map((name, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => {
                                        // Clear field error for this field
                                        const errorKey = `${editingCell.rowIndex}-Service Line`;
                                        if (fieldErrors[errorKey]) {
                                            setFieldErrors(prev => {
                                                const newErrors = { ...prev };
                                                delete newErrors[errorKey];
                                                return newErrors;
                                            });
                                        }
                                        setUploadedData(prevData => {
                                            const newData = [...prevData];
                                            newData[editingCell.rowIndex] = {
                                                ...newData[editingCell.rowIndex],
                                                'Service Line': name
                                            };
                                            return newData;
                                        });
                                        setEditingCell(null);
                                        setEditValue('');
                                        setPreviousValue('');
                                    }}
                                    style={{
                                        padding: '8px 12px',
                                        cursor: 'pointer',
                                        backgroundColor: editValue === name ? '#e3f2fd' : 'white',
                                        borderBottom: '1px solid #f0f0f0',
                                        fontSize: '13px',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = editValue === name ? '#e3f2fd' : 'white'}
                                >
                                    {name}
                                </div>
                            ));
                        })()}
                    </div>
                )
            }

            {/* Fixed Position Dropdown for Rollout Code */}
            {
                editingCell?.field === 'Rollout Code' && (
                    <div
                        ref={dropdownContainerRef}
                        style={{
                            position: 'fixed',
                            top: dropdownPosition?.top ?? 0,
                            left: dropdownPosition?.left ?? 0,
                            width: dropdownPosition?.width || 200,
                            visibility: dropdownPosition ? 'visible' : 'hidden',
                            backgroundColor: 'white',
                            border: '1px solid #ddd',
                            borderRadius: '0 0 4px 4px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                            zIndex: 99999,
                            maxHeight: '200px',
                            overflowY: 'auto'
                        }}
                    >
                        {[...new Set(waveRolloutLOV.map(item => item.Rollout_Code))]
                            .filter(code => code.toLowerCase().includes(editValue.toLowerCase()))
                            .map((code, idx) => {
                                const item = waveRolloutLOV.find(i => i.Rollout_Code === code);
                                return (
                                    <div
                                        key={idx}
                                        onClick={() => {
                                            // Clear field errors for Rollout Code and Rollout Name
                                            setFieldErrors(prev => {
                                                const newErrors = { ...prev };
                                                delete newErrors[`${editingCell.rowIndex}-Rollout Code`];
                                                delete newErrors[`${editingCell.rowIndex}-Rollout Name`];
                                                return newErrors;
                                            });

                                            setUploadedData(prevData => {
                                                const newData = [...prevData];
                                                newData[editingCell.rowIndex] = {
                                                    ...newData[editingCell.rowIndex],
                                                    'Rollout Code': code,
                                                    'Rollout Name': item ? item.Rollout_Description : ''
                                                };
                                                return newData;
                                            });
                                            setEditingCell(null);
                                            setEditValue('');
                                            setPreviousValue('');
                                        }}
                                        style={{
                                            padding: '8px 12px',
                                            cursor: 'pointer',
                                            backgroundColor: editValue === code ? '#e3f2fd' : 'white',
                                            borderBottom: '1px solid #f0f0f0',
                                            fontSize: '13px',
                                            transition: 'background-color 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = editValue === code ? '#e3f2fd' : 'white'}
                                    >
                                        <div style={{ fontWeight: '500' }}>{code}</div>
                                    </div>
                                );
                            })
                        }
                        {waveRolloutLOV.filter(item =>
                            item.Rollout_Code.toLowerCase().includes(editValue.toLowerCase())
                        ).length === 0 && (
                                <div style={{ padding: '12px', fontSize: '13px', color: '#999', textAlign: 'center' }}>
                                    No matching rollout code found
                                </div>
                            )}
                    </div>
                )
            }

            {/* Fixed Position Dropdown for Legal Entity Code */}
            {
                editingCell?.field === 'Legal Entity Code' && (
                    <div
                        ref={dropdownContainerRef}
                        style={{
                            position: 'fixed',
                            top: dropdownPosition?.top ?? 0,
                            left: dropdownPosition?.left ?? 0,
                            width: dropdownPosition?.width || 200,
                            visibility: dropdownPosition ? 'visible' : 'hidden',
                            backgroundColor: 'white',
                            border: '1px solid #ddd',
                            borderRadius: '0 0 4px 4px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                            zIndex: 99999,
                            maxHeight: '200px',
                            overflowY: 'auto'
                        }}
                    >
                        {[...new Set(legalEntityLOV.map(item => item.legalEntityCode))]
                            .filter(code => code.toLowerCase().includes(editValue.toLowerCase()))
                            .map((code, idx) => {
                                const item = legalEntityLOV.find(i => i.legalEntityCode === code);
                                return (
                                    <div
                                        key={idx}
                                        onClick={() => {
                                            // Clear field errors for Legal Entity Code and Legal Entity Name
                                            setFieldErrors(prev => {
                                                const newErrors = { ...prev };
                                                delete newErrors[`${editingCell.rowIndex}-Legal Entity Code`];
                                                delete newErrors[`${editingCell.rowIndex}-Legal Entity Name`];
                                                return newErrors;
                                            });

                                            setUploadedData(prevData => {
                                                const newData = [...prevData];
                                                newData[editingCell.rowIndex] = {
                                                    ...newData[editingCell.rowIndex],
                                                    'Legal Entity Code': code,
                                                    'Legal Entity Name': item ? item.legalEntityName : ''
                                                };
                                                return newData;
                                            });
                                            setEditingCell(null);
                                            setEditValue('');
                                            setPreviousValue('');
                                        }}
                                        style={{
                                            padding: '8px 12px',
                                            cursor: 'pointer',
                                            backgroundColor: editValue === code ? '#e3f2fd' : 'white',
                                            borderBottom: '1px solid #f0f0f0',
                                            fontSize: '13px',
                                            transition: 'background-color 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = editValue === code ? '#e3f2fd' : 'white'}
                                    >
                                        <div style={{ fontWeight: '500' }}>{code}</div>
                                    </div>
                                );
                            })
                        }
                        {legalEntityLOV.filter(item =>
                            item.legalEntityCode.toLowerCase().includes(editValue.toLowerCase())
                        ).length === 0 && (
                                <div style={{ padding: '12px', fontSize: '13px', color: '#999', textAlign: 'center' }}>
                                    No matching legal entity code found
                                </div>
                            )}
                    </div>
                )
            }
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

            {/* Help Modal */}
            {showHelpPopup && (
                <div
                    onClick={() => setShowHelpPopup(false)}
                    style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 3000
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '12px',
                            boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
                            width: '660px',
                            maxWidth: '90vw',
                            maxHeight: '85vh',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative'
                        }}
                    >
                        <div className="help-modal-scroll" style={{ overflowY: 'auto', padding: '32px', flex: '1' }}>
                            <button
                                onClick={() => setShowHelpPopup(false)}
                                style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545' }}
                            >
                                <X size={20} />
                            </button>

                            <h3 style={{ margin: '0 0 20px 0', color: '#333', fontSize: '18px', fontWeight: '600' }}>
                                Help &amp; Information
                            </h3>

                            <div style={{ color: '#444', fontSize: '14px', lineHeight: '1.6' }}>

                                <div style={{ marginBottom: '16px' }}>
                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>What is this page?</strong>
                                    <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                                        The <strong>RICEW Mass Upload Form</strong> is a bulk data entry tool for importing multiple RICEW (Reports, Integrations, Conversions, Extensions, Analytics, Alerts, Workflows, Personalizations) request records at once via an Excel template, instead of creating them one by one.
                                    </p>
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>Why is this used?</strong>
                                    <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                                        At the start of an ERP project, the full RICEW scope is often known in bulk — sometimes hundreds of objects. This form lets project teams upload their entire RICEW inventory from a spreadsheet in a single operation, saving significant time compared to manual entry.
                                    </p>
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>Total Objects Summary</strong>
                                    <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                                        The <strong>Total Objects</strong> table at the top right provides a real-time summary of your upload. It shows the total number of records currently in the form and breaks them down by RICEW type (Reports, Alerts, Conversions, etc.). This helps you quickly verify that your bulk upload matches your intended scope.
                                    </p>
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to use this page</strong>
                                    <ol style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                        <li>Click <strong>Download Template</strong> to get the Excel file with the correct column headers.</li>
                                        <li>Fill in the RICEW data in the template. Do not change or remove any column headers.</li>
                                        <li>Click <strong>Upload File</strong> (or drag and drop) to load the completed template.</li>
                                        <li>Review the records in the table. Rows with validation errors are highlighted — fix them inline by clicking a cell.</li>
                                        <li>Select the records you want to submit using the checkboxes, then click <strong>Submit Selected</strong>.</li>
                                        <li>Use <strong>Populate Project</strong> to auto-fill shared project-level fields (Process Stream, Application, etc.) across all rows at once.</li>
                                    </ol>
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>Key template columns</strong>
                                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                        <li><strong>RICEW Type</strong> — Must be one of: Integration, Conversion, Report, Analytics Report, Alert, Workflow, Personalization, Extension (required).</li>
                                        <li><strong>RICEW Name</strong> — Unique name for the request (required).</li>
                                        <li><strong>RICEW Description</strong> — Brief description of what the object does.</li>
                                        <li><strong>Process Stream / Application / L0 Process / Module</strong> — ERP workstream assignment fields.</li>
                                        <li><strong>Priority / Complexity / Status</strong> — Classification and tracking fields.</li>
                                        <li><strong>Effort Hours / Cost</strong> — Estimated effort and associated cost for the RICEW object.</li>
                                        <li><strong>Owner fields</strong> — Business Owner, Functional Owner, Technical Owner.</li>
                                    </ul>
                                </div>

                                <div style={{ marginBottom: '4px' }}>
                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>Important notes</strong>
                                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                        <li>Only <strong>.xlsx</strong> files are accepted.</li>
                                        <li>Rows with validation errors cannot be submitted until the errors are resolved.</li>
                                        <li>RICEW Type must exactly match one of the accepted values — check the dropdown in the table for valid options.</li>
                                        <li>A project must be selected before uploading data.</li>
                                        <li><strong>Populate Project</strong> only fills empty cells — it will not overwrite data already entered.</li>
                                    </ul>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        .help-modal-scroll::-webkit-scrollbar { width: 4px; }
        .help-modal-scroll::-webkit-scrollbar-track { background: transparent; margin: 8px 0; }
        .help-modal-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .help-modal-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
        </div >
    );
};

export default RicewRequestBulkUpload;
