import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, MoreVertical, Save, X, AlertCircle, HelpCircle } from 'lucide-react'; // Import icons
import { Box } from '@mui/material';
import { downloadRosterTemplate, parseRosterTemplate } from '../../utils/excelTemplateForRosterForm';
import { useAuth } from '../../context/AuthContext';
import { useSession } from '../../context/SessionContext';
import DOMPurify from 'dompurify';
import { PrimaryRoleAutocomplete, ResourceLevelAutocomplete, ProcessStreamAutocomplete, OrganizationAutocomplete } from './RosterMassUplaodAutocompleteLOV';
import { CustomDatePicker } from './Components';

// Date Formatting Helpers
const formatDateForDisplay = (dateString) => {
    if (!dateString || dateString === '-' || dateString === 'Pending') return dateString || '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const day = date.getDate().toString().padStart(2, '0');
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
};

const formatDateForBackend = (dateString) => {
    if (!dateString || dateString === '-' || dateString === 'Pending') return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toISOString();
};

const RosterMassUploadForm = ({ selectedProject }) => {
    const navigate = useNavigate();
    const { handleAuthError, userId } = useSession();
    const { getCachedToken } = useAuth();
    const [showNoProjectSelectedPopup, setShowNoProjectSelectedPopup] = useState(false);

    useEffect(() => {
        if (!selectedProject?.id) {
            setShowNoProjectSelectedPopup(true);
        }
    }, [selectedProject?.id]);


    // Data Loading State
    const [uploadedData, setUploadedData] = useState([]);
    const [masterProcessStreamData, setMasterProcessStreamData] = useState([]);
    const [rolesData, setRolesData] = useState([]);
    const [resourceLevelsData, setResourceLevelsData] = useState([]);
    const [organizationData, setOrganizationData] = useState([]);
    const [existingFullNames, setExistingFullNames] = useState([]); // State for duplicate validation
    const [existingEmails, setExistingEmails] = useState([]); // State for duplicate email validation
    const fileInputRef = useRef(null);

    // Deletion State
    const [selectAllForDeletion, setSelectAllForDeletion] = useState(false);
    const [selectedRowsForDeletion, setSelectedRowsForDeletion] = useState([]);

    // Validation errors modal states
    const [showValidationErrorsModal, setShowValidationErrorsModal] = useState(false);
    const [validationErrorsList, setValidationErrorsList] = useState([]);

    // For editing
    const [editingRowIndex, setEditingRowIndex] = useState(null);
    const [originalRowData, setOriginalRowData] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});

    // API Status States
    const [loading, setLoading] = useState(false);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [showErrorMessage, setShowErrorMessage] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Confirmation dialog states
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const [cancelAction, setCancelAction] = useState(null);
    const [confirmMessage, setConfirmMessage] = useState('');
    const [showHelpPopup, setShowHelpPopup] = useState(false);

    // Validation workflow states
    const [pendingUploadData, setPendingUploadData] = useState([]); // Data awaiting validation
    const [validationStatus, setValidationStatus] = useState(null); // 'success' or 'error'
    const [uploadedFileName, setUploadedFileName] = useState(''); // Track uploaded file name

    // Column min widths (matching approximately RicewRequestBulkUpload.js logic but for new columns)
    const columnMinWidths = [60, 160, 180, 140, 220, 180, 200, 160, 160, 180, 120, 120, 120, 80, 120];
    const totalCellMinWidth = columnMinWidths.reduce((sum, width) => sum + width, 0);
    // Ensure table width is sufficient for columns
    const tableContentWidth = Math.max(totalCellMinWidth + (32 * 2), 1600);

    // Population selection state
    const [selectedRows, setSelectedRows] = useState([]);
    const [selectAll, setSelectAll] = useState(false);

    // Populate Project states
    const [populateProjectName, setPopulateProjectName] = useState('');

    useEffect(() => {
        const projectId = selectedProject?.id;
        fetchMasterProcessStreams();
        fetchResourceLevels();
        fetchOrganizations();
        if (projectId) {
            fetchRoles(projectId);
        }
        fetchExistingRecords();
        fetchExistingFullNames();
        fetchExistingEmails();
        setSelectedRows([]);
        setSelectAll(false);
    }, [selectedProject?.id]);

    const fetchExistingFullNames = async () => {
        try {
            const token = await getCachedToken();
            const projectId = selectedProject?.id;
            const response = await fetch(`https://9qgbhgxwdd.execute-api.ap-south-1.amazonaws.com/New/mass-upload-roster/getFull-Name?project_id=${projectId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 401 || response.status === 403) {
                handleAuthError('Unauthorized - session expired');
                return;
            }

            if (response.ok) {
                const result = await response.json();
                setExistingFullNames(result.data || []);
            }
        } catch (error) {
            console.error('Error fetching existing full names:', error);
        }
    };

    const fetchExistingEmails = async () => {
        try {
            const token = await getCachedToken();
            const projectId = selectedProject?.id;
            if (!projectId) return;

            const headers = { 'Authorization': `Bearer ${token}` };

            // Fetch emails from the single resource roster source
            const response = await fetch(`https://7o6jl6k0pd.execute-api.ap-south-1.amazonaws.com/New/request-form/get/tempRosterMassUploadUniqueEmails?project_id=${projectId}`, { headers });

            if (response.status === 401 || response.status === 403) {
                handleAuthError('Unauthorized - session expired');
                return;
            }

            let allEmails = [];
            if (response.ok) {
                const result = await response.json();
                const emails = result.emails || result.data || [];
                if (Array.isArray(emails)) {
                    allEmails = emails.filter(Boolean);
                }
            }

            // Deduplicate emails (case-insensitive)
            const uniqueEmailSet = new Set(allEmails.reduce((acc, e) => {
                let emailStr = '';
                if (typeof e === 'string') {
                    emailStr = e;
                } else if (e && typeof e === 'object') {
                    emailStr = e.IC_email || e.email || e.Email || Object.values(e)[0];
                }
                if (emailStr && typeof emailStr === 'string' && emailStr.trim() !== '') {
                    acc.push(emailStr.trim().toLowerCase());
                }
                return acc;
            }, []));
            setExistingEmails([...uniqueEmailSet]);
        } catch (error) {
            console.error('Error fetching existing emails:', error);
        }
    };

    const fetchExistingRecords = async () => {
        try {
            setLoading(true);
            const token = await getCachedToken();
            const projectId = selectedProject?.id;

            const response = await fetch(`https://9qgbhgxwdd.execute-api.ap-south-1.amazonaws.com/New/mass-upload-roster/get?project_id=${projectId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 401 || response.status === 403) {
                handleAuthError('Unauthorized - session expired');
                return;
            }

            if (response.ok) {
                const result = await response.json();
                const items = result.data || [];

                // Map API response to table format
                // Handle potential DynamoDB format { S: "val" }
                const mappedData = items.map(item => {
                    const getValue = (field) => {
                        if (field && typeof field === 'object' && field.S !== undefined) {
                            return field.S;
                        }
                        return field || '';
                    };

                    return {
                        'Full Name': getValue(item.Full_Name),
                        'Primary Role': getValue(item.Primary_Role),
                        'Resource Level': getValue(item.Resource_Level),
                        'Process Stream': getValue(item.Process_Stream),
                        'Organization Name': getValue(item.Organization_Name),
                        'Email Address': getValue(item.Email_Address),
                        'Start Date': getValue(item.ER_start_date),
                        'End Date': getValue(item.ER_end_date),
                        'Upload Template Name': getValue(item.Upload_Template_Name),
                        'Processed': 'Yes', // Since fetched from DB
                        'Populated (Project)': (getValue(item.Populated_Project) === true || getValue(item.Populated_Project) === 'true' || getValue(item.Populated_project) === true || getValue(item.Populated_project) === 'true') ? 'Yes' : 'No',

                        // Metadata fields (explicitly mapped to avoid raw objects in state)
                        temp_Roster_mass_upload_id: getValue(item.temp_Roster_mass_upload_id),
                        temp_Roster_mass_upload_group_id: getValue(item.temp_Roster_mass_upload_group_id),
                        project_id: getValue(item.project_id),
                        created_by: getValue(item.created_by),
                        created_timestamp: getValue(item.created_timestamp),
                        updated_timestamp: getValue(item.updated_timestamp),
                        Delete_status: getValue(item.Delete_status)
                    };
                });

                // Sort logic:
                // 1. Move Populated (Project) = 'Yes' to the last
                // 2. Within those groups, sort by updated_timestamp (latest first)
                mappedData.sort((a, b) => {
                    // Check population status (Unpopulated (0) comes before Populated (1))
                    const popA = a['Populated (Project)'] === 'Yes' ? 1 : 0;
                    const popB = b['Populated (Project)'] === 'Yes' ? 1 : 0;

                    if (popA !== popB) {
                        return popA - popB;
                    }

                    const timeA = a.updated_timestamp ? new Date(a.updated_timestamp).getTime() : 0;
                    const timeB = b.updated_timestamp ? new Date(b.updated_timestamp).getTime() : 0;

                    if (timeB !== timeA) {
                        return timeB - timeA;
                    }

                    const idA = parseInt(a.temp_Roster_mass_upload_id) || 0;
                    const idB = parseInt(b.temp_Roster_mass_upload_id) || 0;
                    return idB - idA;
                });

                setUploadedData(mappedData);
            } else {
                if (response.status === 404) {
                    console.log('No existing records found.');
                    setUploadedData([]);
                } else {
                    console.error('Failed to fetch existing records');
                }
            }
        } catch (error) {
            console.error('Error fetching existing records:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMasterProcessStreams = async () => {
        try {
            const token = await getCachedToken();
            const response = await fetch('https://vs7ws23ybl.execute-api.ap-south-1.amazonaws.com/rice/Stream-Business-Mapp/get-streams', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 401 || response.status === 403) {
                handleAuthError('Unauthorized - session expired');
                return;
            }
            if (response.ok) {
                const result = await response.json();
                // Transform the data from array of strings to array of objects with stream_name
                const streamList = result.data || [];
                const transformedData = streamList.map(streamName => ({
                    stream_name: streamName
                }));
                setMasterProcessStreamData(transformedData);
            } else {
                console.error('Failed to fetch master process streams');
            }
        } catch (error) {
            console.error('Error fetching master process streams:', error);
        }
    };

    const fetchRoles = async (projectId) => {
        try {
            const token = await getCachedToken();
            const response = await fetch(`https://m4wh3q1onb.execute-api.ap-south-1.amazonaws.com/New/rice/role-definitions`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 401 || response.status === 403) {
                handleAuthError('Unauthorized - session expired');
                return;
            }
            if (response.ok) {
                const result = await response.json();
                setRolesData(result.data || []);
            } else {
                console.error('Failed to fetch role definitions');
            }
        } catch (error) {
            console.error('Error fetching role definitions:', error);
        }
    };

    const fetchResourceLevels = async () => {
        try {
            const token = await getCachedToken();
            const projectId = selectedProject?.id;
            const response = await fetch(`https://fuahu3jqsc.execute-api.ap-south-1.amazonaws.com/New/api/get/LOV/leveldefinitions`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 401 || response.status === 403) {
                handleAuthError('Unauthorized - session expired');
                return;
            }
            if (response.ok) {
                const result = await response.json();
                const sortedData = (result.data || []).sort((a, b) => {
                    return (a.Level_Short_Code || '').localeCompare(b.Level_Short_Code || '', undefined, { numeric: true, sensitivity: 'base' });
                });
                setResourceLevelsData(sortedData);
            } else {
                console.error('Failed to fetch resource levels definitions');
            }
        } catch (error) {
            console.error('Error fetching resource levels definitions:', error);
        }
    };

    const fetchOrganizations = async () => {
        try {
            const token = await getCachedToken();
            const projectId = selectedProject?.id;
            const response = await fetch(`https://fuahu3jqsc.execute-api.ap-south-1.amazonaws.com/New/api/get/LOV/si-organization-details?project_id=${projectId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 401 || response.status === 403) {
                handleAuthError('Unauthorized - session expired');
                return;
            }
            if (response.ok) {
                const result = await response.json();
                setOrganizationData(result.data || []);
            } else {
                console.error('Failed to fetch organization details');
            }
        } catch (error) {
            console.error('Error fetching organization details:', error);
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            // Extract unique applications
            const processStreams = [...new Set(masterProcessStreamData.map(item => item.stream_name).filter(Boolean))].sort();

            // Extract role titles
            const primaryRoles = rolesData.map(role => role.role_Title).filter(Boolean).sort();

            // Extract resource level codes sorted by Level_Definition_id
            const resourceLevels = [...resourceLevelsData]
                .sort((a, b) => {
                    const idA = parseInt(a.Level_Definition_id, 10) || 0;
                    const idB = parseInt(b.Level_Definition_id, 10) || 0;
                    return idA - idB;
                })
                .map(level => level.Level_Short_Code)
                .filter(Boolean);

            // Extract organization names
            const organizations = organizationData.map(org => org.SI_organization_name).filter(Boolean).sort();

            await downloadRosterTemplate({ processStreams, primaryRoles, resourceLevels, organizations });
        } catch (error) {
            console.error('Download failed:', error);
            alert('Failed to download template');
        }
    };

    const handleUploadTemplate = () => {
        fileInputRef.current.click();
    };

    const uploadRecordsToDB = async (records, fileName) => {
        try {
            setLoading(true);
            const token = await getCachedToken();
            const projectId = selectedProject?.id;
            const userIdValue = userId;

            if (!projectId) {
                throw new Error('Project ID is missing');
            }

            // Map records to API format
            const apiRecords = records.map(record => ({
                Full_Name: record['Full Name'],
                Primary_Role: record['Primary Role'],
                Resource_Level: record['Resource Level'],
                Application: "",
                Process_Stream: record['Process Stream'],
                ER_process_stream: record['Process Stream'],
                Organization_Name: record['Organization Name'],
                Email_Address: record['Email Address'],
                ER_start_date: formatDateForBackend(record['Start Date']),
                ER_end_date: formatDateForBackend(record['End Date']),
                Upload_Template_Name: fileName,
                project_id: projectId,
                created_by: userIdValue
            }));

            const response = await fetch('https://9qgbhgxwdd.execute-api.ap-south-1.amazonaws.com/New/mass-upload-roster/post', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(apiRecords)
            });

            if (response.status === 401 || response.status === 403) {
                handleAuthError('Unauthorized - session expired');
                return;
            }

            if (response.ok) {
                const result = await response.json();
                const successMsg = result.message || 'Records uploaded and validated successfully!';
                setSuccessMessage(DOMPurify.sanitize(successMsg, { ALLOWED_TAGS: [] }));
                setShowSuccessMessage(true);
                setTimeout(() => setShowSuccessMessage(false), 5000);

                // Refresh data to get the assigned IDs from the backend
                fetchExistingRecords();
                fetchExistingFullNames();
                fetchExistingEmails();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to upload records');
            }
        } catch (error) {
            console.error('Upload API Error:', error);
            const errorMsg = error.message || 'An error occurred during upload';
            setErrorMessage(DOMPurify.sanitize(errorMsg, { ALLOWED_TAGS: [] }));
            setShowErrorMessage(true);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            // Show processing message
            setSuccessMessage('Processing template...');
            setShowSuccessMessage(true);

            // Extract unique applications
            const processStreams = [...new Set(masterProcessStreamData.map(item => item.stream_name).filter(Boolean))].sort();

            // Extract role titles
            const primaryRoles = rolesData.map(role => role.role_Title).filter(Boolean).sort();

            // Extract resource level codes sorted by Level_Definition_id
            const resourceLevels = [...resourceLevelsData]
                .sort((a, b) => {
                    const idA = parseInt(a.Level_Definition_id, 10) || 0;
                    const idB = parseInt(b.Level_Definition_id, 10) || 0;
                    return idA - idB;
                })
                .map(level => level.Level_Short_Code)
                .filter(Boolean);

            // Extract organization names
            const organizations = organizationData.map(org => org.SI_organization_name).filter(Boolean).sort();

            const result = await parseRosterTemplate(file, { processStreams, primaryRoles, resourceLevels, organizations });

            if (result.success) {
                const localData = result.data || [];

                // Store file name
                setUploadedFileName(file.name);

                // Enrich data with file name
                const enrichedData = localData.map(row => ({
                    ...row,
                    'Upload Template Name': file.name,
                    'Processed': 'No' // Default status
                }));

                // Store in pending state (not yet validated or saved)
                setPendingUploadData(enrichedData);

                // Reset validation status when new file is uploaded
                setValidationStatus(null);

                const successMsg = `Template uploaded successfully! ${enrichedData.length} record(s) ready for validation.`;
                setSuccessMessage(DOMPurify.sanitize(successMsg, { ALLOWED_TAGS: [] }));
                setShowSuccessMessage(true);
                setTimeout(() => setShowSuccessMessage(false), 3000);
            } else {
                const errorMsg = result.message || 'Failed to process template';
                setErrorMessage(DOMPurify.sanitize(errorMsg, { ALLOWED_TAGS: [] }));
                setShowErrorMessage(true);
                setTimeout(() => setShowErrorMessage(false), 5000);
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            setErrorMessage(DOMPurify.sanitize('Failed to process template. Please try again.', { ALLOWED_TAGS: [] }));
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 5000);
        } finally {
            // Reset file input so the same file can be selected again if needed
            event.target.value = '';
        }
    };

    const handleValidate = async () => {
        // Check if there's pending data to validate
        if (pendingUploadData.length === 0) {
            setErrorMessage('No data to validate. Please upload a template first.');
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 3000);
            return;
        }

        // Validate all pending records
        const validationErrors = [];
        const requiredFields = ['Full Name', 'Primary Role', 'Resource Level', 'Process Stream', 'Organization Name', 'Email Address'];

        pendingUploadData.forEach((row, index) => {
            // Use original Excel row number if available, otherwise fallback to index + 2 (assuming 1 header row)
            const excelRowNumber = row.rowNumber || (index + 2);

            // Check required fields
            requiredFields.forEach(field => {
                const value = row[field];
                const isEmpty = value === null || value === undefined || value === '' || (typeof value === 'string' && value.trim() === '');

                if (isEmpty) {
                    validationErrors.push({
                        row: excelRowNumber,
                        field: field,
                        message: `${field} is required`
                    });
                }
            });

            // Validate Email Address Format
            const email = (row['Email Address'] || '').trim();
            if (email) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    validationErrors.push({
                        row: excelRowNumber,
                        field: 'Email Address',
                        message: `Record ${excelRowNumber}: Invalid Email Address format.`
                    });
                }
            }

            // Validate Full Name uniqueness against database
            // const fullName = (row['Full Name'] || '').trim();
            /* if (fullName) {
                if (existingFullNames.some(existingName => existingName.toLowerCase() === fullName.toLowerCase())) {
                    validationErrors.push({
                        row: excelRowNumber,
                        field: 'Full Name',
                        message: `Record ${excelRowNumber}: Full Name '${fullName}' already exists in the roster for this project.`
                    });
                } else if (pendingUploadData.some((r, i) => i < index && (r['Full Name'] || '').trim().toLowerCase() === fullName.toLowerCase())) {
                    // Check if repeated within the same upload file
                    validationErrors.push({
                        row: excelRowNumber,
                        field: 'Full Name',
                        message: `Record ${excelRowNumber}: Full Name '${fullName}' is repeated within the uploaded template.`
                    });
                }
            } */

            // Validate Process Stream against master data
            const streamName = row['Process Stream'];
            if (streamName && Array.isArray(masterProcessStreamData)) {
                const isValidStream = masterProcessStreamData.some(m => m.stream_name === streamName);
                if (!isValidStream) {
                    validationErrors.push({
                        row: excelRowNumber,
                        field: 'Process Stream',
                        message: `Record ${excelRowNumber}: Invalid Process Stream name '${streamName}'. Please select a valid Process Stream from the list.`
                    });
                }
            }

            // Validate Primary Role against roles data - COMMENTED OUT TO ALLOW CUSTOM VALUES
            // const primaryRole = row['Primary Role'];
            // if (primaryRole && Array.isArray(rolesData)) {
            //     const isValidRole = rolesData.some(r => r.role_Title === primaryRole);
            //     if (!isValidRole) {
            //         validationErrors.push({
            //             row: excelRowNumber,
            //             field: 'Primary Role',
            //             message: `Record ${excelRowNumber}: Invalid Primary Role '${primaryRole}'. Please select a valid role from the list.`
            //         });
            //     }
            // }

            // Validate Resource Level against resource levels data
            const resourceLevel = row['Resource Level'];
            if (resourceLevel && Array.isArray(resourceLevelsData)) {
                const isValidLevel = resourceLevelsData.some(l => l.Level_Short_Code === resourceLevel);
                if (!isValidLevel) {
                    validationErrors.push({
                        row: excelRowNumber,
                        field: 'Resource Level',
                        message: `Record ${excelRowNumber}: Invalid Resource Level '${resourceLevel}'. Please select a valid level from the list.`
                    });
                }
            }

            // Validate Organization Name against organization data
            const organizationName = row['Organization Name'];
            if (organizationName && Array.isArray(organizationData)) {
                const isValidOrg = organizationData.some(o => o.SI_organization_name === organizationName);
                if (!isValidOrg) {
                    validationErrors.push({
                        row: excelRowNumber,
                        field: 'Organization Name',
                        message: `Record ${excelRowNumber}: Invalid Organization Name '${organizationName}'. Please select a valid organization from the list.`
                    });
                }
            }

            // Validate Start Date and End Date range
            const startDateStr = row['Start Date'];
            const endDateStr = row['End Date'];
            if (startDateStr && endDateStr) {
                const startDate = new Date(startDateStr);
                const endDate = new Date(endDateStr);
                if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                    if (endDate < startDate) {
                        validationErrors.push({
                            row: excelRowNumber,
                            field: 'End Date',
                            message: `Record ${excelRowNumber}: End Date cannot be earlier than Start Date.`
                        });
                    }
                }
            }
        });

        if (validationErrors.length > 0) {
            // Validation failed - show errors
            setValidationErrorsList(validationErrors);
            setShowValidationErrorsModal(true);

            // Set validation status to error
            setValidationStatus('error');

            const errorMsg = `Validation failed! Found ${validationErrors.length} error(s). Please fix them before proceeding.`;
            setErrorMessage(DOMPurify.sanitize(errorMsg, { ALLOWED_TAGS: [] }));
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 5000);
        } else {
            // All validations passed - Proceed to auto-save
            try {
                const successMsg = `Validation successful! Saving ${pendingUploadData.length} record(s)...`;
                setSuccessMessage(DOMPurify.sanitize(successMsg, { ALLOWED_TAGS: [] }));
                setShowSuccessMessage(true);

                // Call API to upload records
                await uploadRecordsToDB(pendingUploadData, uploadedFileName);

                // Clear pending data and set success status
                setPendingUploadData([]);
                setValidationStatus('success');
                setUploadedFileName(''); // Reset file tracking after successful save

                setSuccessMessage(`Validation successful and ${pendingUploadData.length} record(s) saved!`);
                setShowSuccessMessage(true);
                setTimeout(() => setShowSuccessMessage(false), 3000);

            } catch (error) {
                console.error('Error during auto-save:', error);
                setErrorMessage(`Validation passed but save failed: ${error.message}`);
                setShowErrorMessage(true);
                setShowSuccessMessage(false);
                setValidationStatus('error');
            }
        }
    };



    const handleEditStart = (index) => {
        setEditingRowIndex(index);
        setOriginalRowData({ ...uploadedData[index] });
        setFieldErrors({}); // Clear any previous field errors
    };

    const handleCancelEdit = () => {
        if (originalRowData && editingRowIndex !== null) {
            setUploadedData(prev => {
                const newData = [...prev];
                newData[editingRowIndex] = originalRowData;
                return newData;
            });
        }
        setEditingRowIndex(null);
        setOriginalRowData(null);
        setFieldErrors({}); // Clear field errors on cancel
    };

    const handleSaveEdit = async (index) => {
        const row = uploadedData[index];

        // Clear previous field errors
        setFieldErrors({});

        // Validate required fields and email format
        const errors = {};
        const requiredFields = ['Full Name', 'Primary Role', 'Resource Level', 'Process Stream', 'Organization Name', 'Email Address'];

        // Check required fields
        requiredFields.forEach(field => {
            const value = row[field];
            const isEmpty = value === null || value === undefined || value === '' || (typeof value === 'string' && value.trim() === '');

            if (isEmpty) {
                errors[field] = `${field} is required`;
            }
        });

        // Validate Start Date and End Date range
        const startDateStr = row['Start Date'];
        const endDateStr = row['End Date'];
        if (startDateStr && endDateStr) {
            const startDate = new Date(startDateStr);
            const endDate = new Date(endDateStr);
            if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                if (endDate < startDate) {
                    errors['End Date'] = 'End Date cannot be earlier than Start Date';
                }
            }
        }

        // If there are validation errors, set them and return
        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            setErrorMessage('Please fix the validation errors before saving');
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 3000);
            return;
        }

        // Check if the record exists in the database
        if (!row.temp_Roster_mass_upload_id) {
            setErrorMessage("Error: Record ID missing. This record cannot be updated in the database.");
            setShowErrorMessage(true);
            return;
        }

        // Duplicate Name Check (if name was changed)
        // const nameChanged = row['Full Name'].trim().toLowerCase() !== (originalRowData['Full Name'] || '').trim().toLowerCase();
        /* if (nameChanged && existingFullNames.some(existingName => existingName.toLowerCase() === row['Full Name'].trim().toLowerCase())) {
            setFieldErrors({ 'Full Name': `A record with the name "${row['Full Name']}" already exists for this project` });
            setErrorMessage(`Error: A record with the name "${row['Full Name']}" already exists for this project.`);
            setShowErrorMessage(true);
            return;
        } */

        try {
            setLoading(true);
            const token = await getCachedToken();

            // Prepare the payload for the update API
            const payload = {
                temp_Roster_mass_upload_id: row.temp_Roster_mass_upload_id,
                Full_Name: row['Full Name'],
                Primary_Role: row['Primary Role'],
                Resource_Level: row['Resource Level'],
                Application: "",
                Process_Stream: row['Process Stream'],
                Organization_Name: row['Organization Name'],
                Email_Address: row['Email Address'],
                ER_start_date: formatDateForBackend(row['Start Date']),
                ER_end_date: formatDateForBackend(row['End Date'])
            };

            const response = await fetch('https://9qgbhgxwdd.execute-api.ap-south-1.amazonaws.com/New/mass-upload-roster/updateRecord', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify([payload]) // API accepts array or object
            });

            if (response.status === 401 || response.status === 403) {
                handleAuthError('Unauthorized - session expired');
                return;
            }

            if (response.ok) {
                setSuccessMessage('Record updated successfully!');
                setShowSuccessMessage(true);
                setTimeout(() => setShowSuccessMessage(false), 3000);
                setEditingRowIndex(null);
                setOriginalRowData(null);
                setFieldErrors({}); // Clear field errors on successful save

                // Re-fetch to ensure the local state is fully synchronized with DB
                fetchExistingRecords();
                fetchExistingFullNames();
                fetchExistingEmails();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update record');
            }
        } catch (error) {
            console.error('Update Error:', error);
            const errorMsg = error.message || 'An error occurred while updating the record';
            setErrorMessage(DOMPurify.sanitize(errorMsg, { ALLOWED_TAGS: [] }));
            setShowErrorMessage(true);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e, field) => {
        const value = e.target.value;
        setUploadedData(prev => {
            const newData = [...prev];
            newData[editingRowIndex] = {
                ...newData[editingRowIndex],
                [field]: value
            };
            return newData;
        });
    };

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

    const handleDeleteRecords = () => {
        if (selectedRowsForDeletion.length === 0) {
            setErrorMessage('Please select records to delete.');
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 3000);
            return;
        }

        // Distinguish between Saved (DB) and Unsaved (Local) records
        const selectedRecords = selectedRowsForDeletion.map(index => uploadedData[index]);
        const savedRecords = selectedRecords.filter(row => row.temp_Roster_mass_upload_id);
        const unsavedRecords = selectedRecords.filter(row => !row.temp_Roster_mass_upload_id);

        const savedCount = savedRecords.length;
        const unsavedCount = unsavedRecords.length;
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
            const idsToDelete = savedRecords
                .map(row => row.temp_Roster_mass_upload_id)
                .filter(id => id !== undefined && id !== null);

            try {
                if (idsToDelete.length > 0) {
                    setLoading(true);
                    const token = await getCachedToken();

                    const response = await fetch('https://9qgbhgxwdd.execute-api.ap-south-1.amazonaws.com/New/mass-upload-roster/deleteRecord', {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ ids: idsToDelete })
                    });

                    if (response.status === 401 || response.status === 403) {
                        handleAuthError('Unauthorized - session expired');
                        return;
                    }

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Failed to delete records');
                    }
                }

                const finalMessage = totalCount === 1 ? 'Record deleted successfully!' : 'Records deleted successfully!';
                setSuccessMessage(finalMessage);
                setShowSuccessMessage(true);

                // Update local state by removing the selected rows
                const updatedData = uploadedData.filter((_, index) => !selectedRowsForDeletion.includes(index));
                setUploadedData(updatedData);

                // Reset selection
                setSelectedRowsForDeletion([]);
                setSelectAllForDeletion(false);
                setEditingRowIndex(null);
                setOriginalRowData(null);

                setTimeout(() => {
                    setShowSuccessMessage(false);
                    if (idsToDelete.length > 0) {
                        fetchExistingRecords(); // Refresh from DB to ensure sync
                        fetchExistingFullNames(); // Refresh duplicate list
                    }
                }, 3000);

            } catch (error) {
                console.error('Delete Error:', error);
                const errorMsg = error.message || 'An error occurred while deleting the record';
                setErrorMessage(DOMPurify.sanitize(errorMsg, { ALLOWED_TAGS: [] }));
                setShowErrorMessage(true);
            } finally {
                setLoading(false);
            }
        });
    };

    const handlePopulateProject = () => {
        // Check if any rows are selected
        if (selectedRows.length === 0) {
            setErrorMessage('Please select at least one record to populate.');
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 3000);
            return;
        }

        const selectedRecords = selectedRows.map(index => uploadedData[index]);
        const savedRecordsToPopulate = selectedRecords.filter(row => row.temp_Roster_mass_upload_id);
        const savedSelectedCount = savedRecordsToPopulate.length;
        const unsavedSelectedCount = selectedRecords.filter(row => !row.temp_Roster_mass_upload_id).length;

        if (savedSelectedCount === 0) {
            setErrorMessage('None of the selected records are saved. Only saved records can be populated.');
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 3000);
            return;
        }

        // Validate saved records before populating
        const validationErrors = [];
        const requiredFields = ['Full Name', 'Primary Role', 'Resource Level', 'Process Stream', 'Organization Name'];

        savedRecordsToPopulate.forEach(record => {
            // Find the visual row number (index in the table + 1)
            const rowIndex = uploadedData.indexOf(record) + 1;

            // Check required fields
            requiredFields.forEach(field => {
                const value = record[field];
                const isEmpty = value === null || value === undefined || value === '' || (typeof value === 'string' && value.trim() === '');

                if (isEmpty) {
                    validationErrors.push({
                        row: rowIndex,
                        field: field,
                        message: `${field} is required for population`
                    });
                }
            });
        });

        if (validationErrors.length > 0) {
            setValidationErrorsList(validationErrors);
            setShowValidationErrorsModal(true);
            setErrorMessage(`Cannot populate. Found ${validationErrors.length} validation error(s) in the selected records.`);
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 5000);
            return;
        }

        const executePopulate = async () => {
            try {
                setLoading(true);
                setSuccessMessage("Populating project...");
                setShowSuccessMessage(true);

                const token = await getCachedToken();
                const ids = savedRecordsToPopulate.map(r => r.temp_Roster_mass_upload_id);

                const response = await fetch('https://9qgbhgxwdd.execute-api.ap-south-1.amazonaws.com/New/mass-upload-roster/moveToRosterForm', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        ids: ids,
                        user_id: userId
                    })
                });

                if (response.status === 401 || response.status === 403) {
                    handleAuthError('Unauthorized - session expired');
                    return;
                }

                const result = await response.json();

                if (response.ok) {
                    setLoading(false);
                    const successMsg = result.message || `Successfully populated ${ids.length} record(s) into Project!`;
                    setSuccessMessage(DOMPurify.sanitize(successMsg, { ALLOWED_TAGS: [] }));
                    setTimeout(() => setShowSuccessMessage(false), 5000);
                    setSelectedRows([]);
                    setSelectAll(false);
                    fetchExistingRecords(); // Refresh data to show "Yes" in the table
                } else {
                    throw new Error(result.error || result.message || 'Failed to populate project');
                }
            } catch (error) {
                console.error('Error populating project:', error);
                const errorMsg = `Failed to populate project: ${error.message}`;
                setErrorMessage(DOMPurify.sanitize(errorMsg, { ALLOWED_TAGS: [] }));
                setShowErrorMessage(true);
                setLoading(false);
            }
        };

        if (unsavedSelectedCount > 0) {
            showConfirmation(
                `You have selected ${selectedRows.length} record(s).\n\n- Ready to populate: ${savedSelectedCount} (Saved)\n- Cannot populate: ${unsavedSelectedCount} (Unsaved)\n\nThese ${unsavedSelectedCount} unsaved records will not be considered. Do you want to continue?`,
                executePopulate
            );
        } else {
            showConfirmation(
                `You have selected ${savedSelectedCount} saved record(s) to populate into the project. Do you want to continue?`,
                executePopulate
            );
        }
    };

    return (
        <div className="config-main" style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '0', margin: '0' }}>
            <div style={{ padding: '1rem 1rem 2rem 1rem', width: '100%', minWidth: '1250px', margin: '0', boxSizing: 'border-box' }}>

                {/* Main Content Area */}
                <div style={{ backgroundColor: 'white', padding: '0', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>

                    {/* Hidden File Input */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".xlsx, .xls"
                        style={{ display: 'none' }}
                    />

                    {/* Project Info Header */}
                    <div style={{ padding: '2rem 1rem 1rem 2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project : <span style={{ color: '#007bff' }}>{selectedProject?.name}</span></h3>
                        </div>
                    </div>

                    {/* Page Title */}
                    <div className="config-header" style={{ marginTop: '0', marginRight: "0px", display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h2>Implementation Team Resource Upload Form</h2>
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
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                                        The following {validationErrorsList.length} error(s) were found in your uploaded file. Please fix these issues in the template and try again:
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
                                                    <tr key={index} style={{ borderBottom: index < validationErrorsList.length - 1 ? '1px solid #fecaca' : 'none' }}>
                                                        <td style={{
                                                            padding: '10px 12px',
                                                            fontSize: '13px',
                                                            color: '#7f1d1d',
                                                            fontWeight: '500'
                                                        }}>
                                                            {error.row}
                                                        </td>
                                                        <td style={{
                                                            padding: '10px 12px',
                                                            fontSize: '13px',
                                                            color: '#7f1d1d',
                                                            fontWeight: '500'
                                                        }}>
                                                            {error.field}
                                                        </td>
                                                        <td style={{
                                                            padding: '10px 12px',
                                                            fontSize: '13px',
                                                            color: '#7f1d1d'
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

                    <div style={{ padding: '20px' }}>
                        {/* Action Buttons Row */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '20px'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                size: 'small',
                                gap: '12px'

                            }}>
                                <button
                                    onClick={handleDownloadTemplate}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '8px 16px',
                                        backgroundColor: '#3b82f6',
                                        color: 'white',
                                        size: 'small',
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
                                        padding: '8px 16px',
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

                            {/* Action Buttons Area: Populate & Delete */}

                        </div>

                        {/* Action Buttons Row - Aligned with Columns - Placed ABOVE Table Container */}
                        <div style={{
                            display: 'flex',
                            width: '100%',
                            padding: '8px 0',
                            alignItems: 'flex-end',
                            // No horizontal scroll here, but widths match table
                        }}>
                            {/* Spacers for columns 1-9 to match table grid */}
                            <div style={{ width: '60px', flex: '0 0 60px' }}></div>
                            <div style={{ flex: 1, minWidth: '160px' }}></div>
                            <div style={{ flex: 1, minWidth: '180px' }}></div>
                            <div style={{ flex: 1, minWidth: '140px' }}></div>
                            <div style={{ flex: 1, minWidth: '220px' }}></div>
                            <div style={{ flex: 1, minWidth: '180px' }}></div>
                            <div style={{ flex: 1, minWidth: '200px' }}></div>
                            <div style={{ flex: 1, minWidth: '160px' }}></div>
                            <div style={{ flex: 1, minWidth: '160px' }}></div>
                            <div style={{ flex: 1, minWidth: '180px' }}></div>
                            <div style={{ flex: 1, minWidth: '120px' }}></div>
                            <div style={{ flex: 1, minWidth: '120px' }}></div>

                            {/* Select Column (Col 10) - Populate Button */}
                            <div style={{
                                flex: '0 0 120px',
                                minWidth: '120px',
                                display: 'flex',
                                justifyContent: 'center',
                                padding: '0 4px',
                            }}>
                                <button
                                    onClick={handlePopulateProject}
                                    disabled={loading}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        padding: '6px 12px',
                                        backgroundColor: loading ? '#9ca3af' : '#007bff',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        fontSize: '13px',
                                        fontWeight: '500',
                                        transition: 'all 0.2s ease',
                                        opacity: loading ? 0.7 : 1,
                                        whiteSpace: 'nowrap',
                                        width: 'max-content'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!loading) e.currentTarget.style.backgroundColor = '#0069d9';
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!loading) e.currentTarget.style.backgroundColor = '#007bff';
                                    }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                        <line x1="16" y1="13" x2="8" y2="13" />
                                        <line x1="16" y1="17" x2="8" y2="17" />
                                        <polyline points="10 9 9 9 8 9" />
                                    </svg>
                                    Populate Project {uploadedData.filter((row, idx) => selectedRows.includes(idx) && row['Populated (Project)'] !== 'Yes').length > 0 && `(${uploadedData.filter((row, idx) => selectedRows.includes(idx) && row['Populated (Project)'] !== 'Yes').length})`}
                                </button>
                            </div>

                            {/* Edit Column (Col 11) - Spacer */}
                            <div style={{ flex: '0 0 80px', minWidth: '80px' }}></div>

                            {/* Delete Records Column (Col 12) - Delete Button */}
                            <div style={{
                                flex: '0 0 120px',
                                minWidth: '120px',
                                display: 'flex',
                                justifyContent: 'center',
                                padding: '0 4px'
                            }}>
                                <button
                                    onClick={handleDeleteRecords}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        padding: '6px 12px',
                                        backgroundColor: '#dc3545',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        fontWeight: '500',
                                        transition: 'all 0.2s',
                                        whiteSpace: 'nowrap',
                                        width: 'max-content'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#c82333'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = '#dc3545'}
                                >
                                    <Trash2 size={16} />
                                    Delete {selectedRowsForDeletion.length > 0 && `(${selectedRowsForDeletion.length})`}
                                </button>
                            </div>

                            {/* Upload Template Column (Col 13) - Spacer */}
                            <div style={{ flex: 1, minWidth: '180px' }}></div>
                        </div>

                        {/* Table Header and Body Section - Unified Scrollable Container */}
                        <div style={{
                            //backgroundColor: '#f8f9fa',
                            border: '1px solid #ddd',
                            overflowX: 'auto',
                            width: '100%',
                            boxSizing: 'border-box',
                            marginTop: '10px'
                        }}>

                            {/* Table Header row */}
                            <div style={{
                                display: 'flex',
                                borderBottom: '1px solid #ddd',
                                backgroundColor: 'white',
                                minWidth: `${tableContentWidth}px` // Ensure header matches body width
                            }}>
                                <div style={{ width: '60px', flex: '0 0 60px', padding: '12px 8px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', backgroundColor: 'white', textAlign: 'center' }}>Sr. No.</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '160px', backgroundColor: 'white' }}>Full Name</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '180px', backgroundColor: 'white' }}>Primary Role</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '140px', backgroundColor: 'white' }}>Resource Level</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '220px', backgroundColor: 'white' }}>Process Stream</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '180px', backgroundColor: 'white' }}>Organization Name</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '200px', backgroundColor: 'white' }}>Email Address</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '160px', backgroundColor: 'white' }}>Start Date</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '160px', backgroundColor: 'white' }}>End Date</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '120px', backgroundColor: 'white', textAlign: 'center' }}>Processed (Temporary Table)</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '120px', backgroundColor: 'white', textAlign: 'center' }}>Populated (Project)</div>
                                <div style={{
                                    flex: '0 0 120px',
                                    padding: '12px 12px',
                                    fontWeight: 'bold',
                                    fontSize: '14px',
                                    color: '#333',
                                    borderRight: '1px solid #ddd',
                                    minWidth: '120px',
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
                                                const selectableRowIndices = uploadedData
                                                    .map((row, index) => row['Populated (Project)'] !== 'Yes' ? index : -1)
                                                    .filter(index => index !== -1);
                                                setSelectedRows(selectableRowIndices);
                                            } else {
                                                setSelectedRows([]);
                                            }
                                        }}
                                        style={{ cursor: 'pointer', width: '18px', height: '18px', marginTop: '2px' }}
                                        title="Select All"
                                    />
                                </div>
                                <div style={{ flex: '0 0 80px', padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '80px', backgroundColor: 'white', textAlign: 'center' }}>Edit</div>
                                <div style={{ flex: '0 0 120px', padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '120px', backgroundColor: 'white', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                    <div style={{ lineHeight: '1.2', whiteSpace: 'nowrap', marginLeft: '0px' }}>Delete Records</div>
                                    <input
                                        type="checkbox"
                                        checked={selectAllForDeletion}
                                        onChange={(e) => {
                                            const isChecked = e.target.checked;
                                            setSelectAllForDeletion(isChecked);
                                            if (isChecked) {
                                                const deletableRowIndices = uploadedData.map((_, index) => index);
                                                setSelectedRowsForDeletion(deletableRowIndices);
                                            } else {
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
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', minWidth: '180px', backgroundColor: 'white' }}>Upload Template Name</div>
                            </div>

                            {/* Table Body */}
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                minWidth: `${tableContentWidth}px`, // Matches header width
                                backgroundColor: 'white'
                            }}>
                                {uploadedData.length > 0 ? (
                                    uploadedData.map((row, index) => {
                                        const isPopulated = row['Populated (Project)'] === 'Yes';
                                        const rowBgColor = isPopulated ? '#f5f5f5' : '#ffffff';
                                        const rowTextColor = isPopulated ? '#999' : '#333';

                                        return (
                                            <div
                                                key={index}
                                                style={{
                                                    display: 'flex',
                                                    backgroundColor: rowBgColor,
                                                    borderBottom: '1px solid #ddd',
                                                    minWidth: `${tableContentWidth}px`,
                                                    color: rowTextColor
                                                }}
                                            >
                                                <div style={{ width: '60px', flex: '0 0 60px', padding: '12px 8px', fontSize: '13px', color: rowTextColor, borderRight: '1px solid #ddd', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', fontWeight: '500' }}>{index + 1}</div>

                                                {/* Full Name */}
                                                <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', color: rowTextColor, borderRight: '1px solid #ddd', minWidth: '160px', wordBreak: 'break-word', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                                    {editingRowIndex === index ? (
                                                        <>
                                                            <input
                                                                type="text"
                                                                value={row['Full Name'] || ''}
                                                                onChange={(e) => handleInputChange(e, 'Full Name')}
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '4px',
                                                                    borderRadius: '4px',
                                                                    border: fieldErrors['Full Name'] ? '2px solid #dc2626' : '2px solid #3b82f6'
                                                                }}
                                                            />
                                                            {fieldErrors['Full Name'] && (
                                                                <span style={{
                                                                    color: '#dc2626',
                                                                    fontSize: '11px',
                                                                    marginTop: '4px',
                                                                    fontWeight: '500'
                                                                }}>
                                                                    {fieldErrors['Full Name']}
                                                                </span>
                                                            )}
                                                        </>
                                                    ) : (row['Full Name'] || '-')}
                                                </div>

                                                {/* Primary Role */}
                                                <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', color: rowTextColor, borderRight: '1px solid #ddd', minWidth: '180px', wordBreak: 'break-word', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                                    {editingRowIndex === index ? (
                                                        <>
                                                            <PrimaryRoleAutocomplete
                                                                value={row['Primary Role'] || ''}
                                                                onChange={(val) => {
                                                                    handleInputChange({ target: { value: val } }, 'Primary Role');
                                                                }}
                                                                projectId={localStorage.getItem('project_id') || selectedProject?.id}
                                                                error={!!fieldErrors['Primary Role']}
                                                                isPopulated={isPopulated}
                                                            />
                                                            {fieldErrors['Primary Role'] && (
                                                                <span style={{
                                                                    color: '#dc2626',
                                                                    fontSize: '11px',
                                                                    marginTop: '4px',
                                                                    fontWeight: '500'
                                                                }}>
                                                                    {fieldErrors['Primary Role']}
                                                                </span>
                                                            )}
                                                        </>
                                                    ) : (row['Primary Role'] || '-')}
                                                </div>

                                                {/* Resource Level */}
                                                <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', color: rowTextColor, borderRight: '1px solid #ddd', minWidth: '140px', wordBreak: 'break-word', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                                    {editingRowIndex === index ? (
                                                        <>
                                                            <ResourceLevelAutocomplete
                                                                value={row['Resource Level'] || ''}
                                                                onChange={(val) => {
                                                                    handleInputChange({ target: { value: val } }, 'Resource Level');
                                                                }}
                                                                projectId={localStorage.getItem('project_id') || selectedProject?.id}
                                                                error={!!fieldErrors['Resource Level']}
                                                                isPopulated={isPopulated}
                                                            />
                                                            {fieldErrors['Resource Level'] && (
                                                                <span style={{
                                                                    color: '#dc2626',
                                                                    fontSize: '11px',
                                                                    marginTop: '4px',
                                                                    fontWeight: '500'
                                                                }}>
                                                                    {fieldErrors['Resource Level']}
                                                                </span>
                                                            )}
                                                        </>
                                                    ) : (row['Resource Level'] || '-')}
                                                </div>

                                                {/* Application */}
                                                <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', color: rowTextColor, borderRight: '1px solid #ddd', minWidth: '220px', wordBreak: 'break-word', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                                    {editingRowIndex === index ? (
                                                        <>
                                                            <ProcessStreamAutocomplete
                                                                value={row['Process Stream'] || ''}
                                                                onChange={(val) => {
                                                                    handleInputChange({ target: { value: val } }, 'Process Stream');
                                                                }}
                                                                projectId={localStorage.getItem('project_id') || selectedProject?.id}
                                                                error={!!fieldErrors['Process Stream']}
                                                                isPopulated={isPopulated}
                                                            />
                                                            {fieldErrors['Process Stream'] && (
                                                                <span style={{
                                                                    color: '#dc2626',
                                                                    fontSize: '11px',
                                                                    marginTop: '4px',
                                                                    fontWeight: '500'
                                                                }}>
                                                                    {fieldErrors['Process Stream']}
                                                                </span>
                                                            )}
                                                        </>
                                                    ) : (row['Process Stream'] || '-')}
                                                </div>

                                                {/* Organization Name */}
                                                <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', color: rowTextColor, borderRight: '1px solid #ddd', minWidth: '180px', wordBreak: 'break-word', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                                    {editingRowIndex === index ? (
                                                        <>
                                                            <OrganizationAutocomplete
                                                                value={row['Organization Name'] || ''}
                                                                onChange={(val) => {
                                                                    handleInputChange({ target: { value: val } }, 'Organization Name');
                                                                }}
                                                                projectId={localStorage.getItem('project_id') || selectedProject?.id}
                                                                error={!!fieldErrors['Organization Name']}
                                                                isPopulated={isPopulated}
                                                            />
                                                            {fieldErrors['Organization Name'] && (
                                                                <span style={{
                                                                    color: '#dc2626',
                                                                    fontSize: '11px',
                                                                    marginTop: '4px',
                                                                    fontWeight: '500'
                                                                }}>
                                                                    {fieldErrors['Organization Name']}
                                                                </span>
                                                            )}
                                                        </>
                                                    ) : (row['Organization Name'] || '-')}
                                                </div>

                                                <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', color: rowTextColor, borderRight: '1px solid #ddd', minWidth: '200px', wordBreak: 'break-word', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                                    {editingRowIndex === index ? (
                                                        <>
                                                            <input
                                                                type="text"
                                                                value={row['Email Address'] || ''}
                                                                onChange={(e) => handleInputChange(e, 'Email Address')}
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '4px',
                                                                    borderRadius: '4px',
                                                                    border: fieldErrors['Email Address'] ? '2px solid #dc2626' : '2px solid #3b82f6'
                                                                }}
                                                            />
                                                            {fieldErrors['Email Address'] && (
                                                                <span style={{
                                                                    color: '#dc2626',
                                                                    fontSize: '11px',
                                                                    marginTop: '4px',
                                                                    fontWeight: '500'
                                                                }}>
                                                                    {fieldErrors['Email Address']}
                                                                </span>
                                                            )}
                                                        </>
                                                    ) : (row['Email Address'] || '-')}
                                                </div>

                                                {/* Start Date */}
                                                <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', color: rowTextColor, borderRight: '1px solid #ddd', minWidth: '160px', display: 'flex', alignItems: 'flex-start' }}>
                                                    {editingRowIndex === index ? (
                                                        <Box sx={{
                                                            width: '100%',
                                                            '& .MuiOutlinedInput-root fieldset': {
                                                                borderColor: '#3b82f6 !important',
                                                                borderWidth: '2px !important',
                                                                borderRadius: '4px !important',
                                                            },
                                                            '& .MuiOutlinedInput-root:hover fieldset': {
                                                                borderColor: '#3b82f6 !important',
                                                            },
                                                            '& .MuiOutlinedInput-root.Mui-focused fieldset': {
                                                                borderColor: '#3b82f6 !important',
                                                            }
                                                        }}>
                                                            <CustomDatePicker
                                                                name="Start Date"
                                                                value={row['Start Date'] || ''}
                                                                onChange={(val) => handleInputChange({ target: { value: val } }, 'Start Date')}
                                                                placeholder="Select Date"
                                                                width="100%"
                                                            />
                                                        </Box>
                                                    ) : (formatDateForDisplay(row['Start Date']))}
                                                </div>

                                                {/* End Date */}
                                                <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', color: rowTextColor, borderRight: '1px solid #ddd', minWidth: '160px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                                    {editingRowIndex === index ? (
                                                        <>
                                                            <Box sx={{
                                                                width: '100%',
                                                                '& .MuiOutlinedInput-root fieldset': {
                                                                    borderColor: fieldErrors['End Date'] ? '#dc2626 !important' : '#3b82f6 !important',
                                                                    borderWidth: '2px !important',
                                                                    borderRadius: '4px !important',
                                                                },
                                                                '& .MuiOutlinedInput-root:hover fieldset': {
                                                                    borderColor: fieldErrors['End Date'] ? '#dc2626 !important' : '#3b82f6 !important',
                                                                },
                                                                '& .MuiOutlinedInput-root.Mui-focused fieldset': {
                                                                    borderColor: fieldErrors['End Date'] ? '#dc2626 !important' : '#3b82f6 !important',
                                                                }
                                                            }}>
                                                                <CustomDatePicker
                                                                    name="End Date"
                                                                    value={row['End Date'] || ''}
                                                                    onChange={(val) => handleInputChange({ target: { value: val } }, 'End Date')}
                                                                    placeholder="Select Date"
                                                                    error={!!fieldErrors['End Date']}
                                                                    width="100%"
                                                                />
                                                            </Box>
                                                            {fieldErrors['End Date'] && (
                                                                <span style={{
                                                                    color: '#dc2626',
                                                                    fontSize: '11px',
                                                                    marginTop: '4px',
                                                                    fontWeight: '500'
                                                                }}>
                                                                    {fieldErrors['End Date']}
                                                                </span>
                                                            )}
                                                        </>
                                                    ) : (formatDateForDisplay(row['End Date']))}
                                                </div>


                                                <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', color: rowTextColor, borderRight: '1px solid #ddd', minWidth: '120px', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                                                    {row['Processed'] ? (
                                                        <div style={{
                                                            minHeight: '20px',
                                                            display: 'inline-block',
                                                            padding: '4px 12px',
                                                            borderRadius: '12px',
                                                            fontSize: '12px',
                                                            fontWeight: '500',
                                                            backgroundColor: (row['Processed'] === 'Success' || row['Processed'] === 'Yes') ? '#d1fae5' : '#fee2e2',
                                                            color: (row['Processed'] === 'Success' || row['Processed'] === 'Yes') ? '#065f46' : '#991b1b'
                                                        }}>
                                                            {row['Processed'] === true || row['Processed'] === 'true' ? 'Yes' : row['Processed']}
                                                        </div>
                                                    ) : '-'}
                                                </div>

                                                <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', color: rowTextColor, borderRight: '1px solid #ddd', minWidth: '120px', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                                                    <div style={{
                                                        minHeight: '20px',
                                                        display: 'inline-block',
                                                        padding: '4px 12px',
                                                        borderRadius: '12px',
                                                        fontSize: '12px',
                                                        fontWeight: '500',
                                                        backgroundColor: row['Populated (Project)'] === 'Yes' ? '#d1fae5' : '#fee2e2',
                                                        color: row['Populated (Project)'] === 'Yes' ? '#065f46' : '#991b1b',
                                                        opacity: isPopulated ? 0.7 : 1
                                                    }}>
                                                        {row['Populated (Project)']}
                                                    </div>
                                                </div>

                                                {/* Select Checkbox Column */}
                                                <div style={{
                                                    flex: '0 0 120px',
                                                    padding: '12px 12px',
                                                    fontSize: '13px',
                                                    color: rowTextColor,
                                                    borderRight: '1px solid #ddd',
                                                    minWidth: '120px',
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    justifyContent: 'center',
                                                    backgroundColor: row['Populated (Project)'] === 'Yes' ? '#f5f5f5' : 'white'
                                                }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedRows.includes(index)}
                                                        disabled={row['Populated (Project)'] === 'Yes'}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedRows([...selectedRows, index]);
                                                            } else {
                                                                setSelectedRows(selectedRows.filter(i => i !== index));
                                                            }
                                                        }}
                                                        style={{ cursor: row['Populated (Project)'] === 'Yes' ? 'not-allowed' : 'pointer', width: '18px', height: '18px' }}
                                                    />
                                                </div>

                                                {/* Edit Column with Save/Cancel */}
                                                <div style={{ flex: '0 0 80px', padding: '8px 12px', fontSize: '13px', color: rowTextColor, minWidth: '80px', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: '8px' }}>
                                                    {editingRowIndex === index ? (
                                                        <>
                                                            <button
                                                                onClick={() => handleSaveEdit(index)}
                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                                title="Save"
                                                            >
                                                                <Save size={18} />
                                                            </button>
                                                            <button
                                                                onClick={handleCancelEdit}
                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                                title="Cancel"
                                                            >
                                                                <X size={18} />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            onClick={() => !isPopulated && handleEditStart(index)}
                                                            disabled={isPopulated}
                                                            style={{ background: 'none', border: 'none', cursor: isPopulated ? 'not-allowed' : 'pointer', color: isPopulated ? '#ccc' : '#6b7280', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                            title={isPopulated ? "Populated records cannot be edited" : "Edit"}
                                                        >
                                                            <MoreVertical size={18} />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Delete Checkbox Column */}
                                                <div style={{ flex: '0 0 120px', padding: '8px 12px', fontSize: '13px', color: rowTextColor, minWidth: '120px', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedRowsForDeletion.includes(index)}
                                                        disabled={isPopulated}
                                                        onChange={(e) => {
                                                            if (isPopulated) return;
                                                            const isChecked = e.target.checked;
                                                            if (isChecked) {
                                                                setSelectedRowsForDeletion(prev => [...prev, index]);
                                                            } else {
                                                                setSelectedRowsForDeletion(prev => prev.filter(i => i !== index));
                                                                setSelectAllForDeletion(false);
                                                            }
                                                        }}
                                                        style={{ cursor: isPopulated ? 'not-allowed' : 'pointer', width: '18px', height: '18px' }}
                                                        title={isPopulated ? "Populated records cannot be deleted" : ""}
                                                    />
                                                </div>

                                                <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', color: rowTextColor, minWidth: '180px', wordBreak: 'break-word', display: 'flex', alignItems: 'flex-start' }}>{row['Upload Template Name'] || '-'}</div>
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
                </div>




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
                                        setValidationErrorsList([]);
                                        setValidationStatus(null); // Clear validation status when closing modal
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
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                                    The following {validationErrorsList.length} error(s) were found in your uploaded file. Please fix these issues in the Excel Template and try again:
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
                                                <tr key={index} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#fef2f2' }}>
                                                    <td style={{
                                                        padding: '10px 12px',
                                                        fontSize: '13px',
                                                        color: '#374151',
                                                        borderBottom: '1px solid #fecaca'
                                                    }}>
                                                        {error.row}
                                                    </td>
                                                    <td style={{
                                                        padding: '10px 12px',
                                                        fontSize: '13px',
                                                        color: '#374151',
                                                        fontWeight: '500',
                                                        borderBottom: '1px solid #fecaca'
                                                    }}>
                                                        {error.field}
                                                    </td>
                                                    <td style={{
                                                        padding: '10px 12px',
                                                        fontSize: '13px',
                                                        color: '#6b7280',
                                                        borderBottom: '1px solid #fecaca'
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
                                justifyContent: 'flex-end'
                            }}>
                                <button
                                    onClick={() => {
                                        setShowValidationErrorsModal(false);
                                        setValidationErrorsList([]);
                                        setValidationStatus(null); // Clear validation status when closing modal
                                    }}
                                    style={{
                                        padding: '8px 16px',
                                        backgroundColor: '#dc2626',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: '500',
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
                        zIndex: 3000,
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
                        zIndex: 3000,
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
                                        minWidth: '100px',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#4b5563'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = '#6b7280'}
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
                                        minWidth: '100px',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
                                >
                                    Yes
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Loading Overlay */}
                {loading && (
                    <div style={{
                        position: 'fixed',
                        top: '0',
                        left: '0',
                        right: '0',
                        bottom: '0',
                        backgroundColor: 'rgba(255, 255, 255, 0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 4000
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
                            <div className="animate-spin" style={{
                                width: '40px',
                                height: '40px',
                                border: '3px solid #f3f3f3',
                                borderTop: '3px solid #3b82f6',
                                borderRadius: '50%'
                            }}></div>
                            <span style={{
                                fontSize: '16px',
                                color: '#333',
                                fontWeight: '500'
                            }}>
                                {showSuccessMessage && successMessage.includes('deleted') ? 'Deleting records...' :
                                    successMessage.includes('updated') ? 'Updating record...' :
                                        'Processing...'}
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
            </div>

            {showNoProjectSelectedPopup && (
                <div style={{
                    position: 'fixed',
                    top: '0',
                    left: '0',
                    right: '0',
                    bottom: '0',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '30px',
                        borderRadius: '12px',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                        textAlign: 'center',
                        maxWidth: '380px',
                        width: '90%'
                    }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            backgroundColor: '#fff1f2',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 20px'
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
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                padding: '12px 24px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '16px',
                                fontWeight: '600',
                                width: '100%',
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
                                        The <strong>Implementation Team Resource Upload Form</strong> is a bulk data entry tool that lets administrators upload multiple implementation team resource records at once via an Excel template, rather than entering them one by one.
                                    </p>
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>Why is this used?</strong>
                                    <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                                        Large ERP projects often onboard dozens or hundreds of resources at the start of a project. This form allows project administrators to prepare resource data offline in Excel and upload it in a single operation, saving significant time compared to individual form entry.
                                    </p>
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to use this page</strong>
                                    <ol style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                        <li>Click <strong>Download Template</strong> to get the Excel file with the correct column headers.</li>
                                        <li>Fill in the resource data in the template. Do not change or remove any column headers.</li>
                                        <li>Click <strong>Upload File</strong> to load the completed template.</li>
                                        <li>Review the records in the table. Rows with validation errors are highlighted — fix them inline by clicking a cell.</li>
                                        <li>Select the records you want to submit using the checkboxes, then click <strong>Submit Selected</strong>.</li>
                                        <li>Use <strong>Populate Project</strong> to auto-fill project-level fields (Organization, Process Stream, Role, etc.) across all rows at once.</li>
                                    </ol>
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>Template columns</strong>
                                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                        <li><strong>Full Name</strong> — Resource&#39;s full name (required).</li>
                                        <li><strong>Email Address</strong> — Must be a valid email format (required).</li>
                                        <li><strong>Organization Name</strong> — Must match an existing organization on the project.</li>
                                        <li><strong>Primary Role</strong> — Resource&#39;s role (required).</li>
                                        <li><strong>Resource Level</strong> — Seniority level code (required).</li>
                                        <li><strong>Process Stream</strong> — ERP process stream assignment (required).</li>
                                        <li><strong>Start Date / End Date</strong> — Engagement dates in DD-MMM-YYYY format.</li>
                                    </ul>
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>Understanding Upload Status</strong>
                                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                        <li><strong>Processed (Temporary Table)</strong> — Indicates that the record has been successfully uploaded from Excel and is stored in a temporary staging area for review and validation.</li>
                                        <li><strong>Populated (Project)</strong> — Indicates that the record has been officially moved from the temporary staging area into the main Project Resource Roster.</li>
                                    </ul>
                                </div>

                                <div style={{ marginBottom: '4px' }}>
                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>Important notes</strong>
                                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                        <li>Only <strong>.xlsx</strong> files are accepted. Do not upload .xls or .csv files.</li>
                                        <li>Rows with validation errors cannot be submitted until the errors are resolved.</li>
                                        <li>Duplicate email addresses within the upload or already existing in the system will be flagged.</li>
                                        <li>A project must be selected before uploading data.</li>
                                        <li>The <strong>Populate Project</strong> button only fills empty cells — it will not overwrite data you have already entered.</li>
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
        </div>
    );
};

export default RosterMassUploadForm;
