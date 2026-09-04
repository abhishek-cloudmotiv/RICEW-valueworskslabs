import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, MoreVertical, Save, X, AlertCircle, HelpCircle } from 'lucide-react'; // Import icons
import { Box } from '@mui/material';
import { downloadResourceDefinitionTemplate, parseResourceDefinitionTemplate } from '../../utils/excelTemplateForResourceDefinition';
import { useAuth } from '../../context/AuthContext';
import { useSession } from '../../context/SessionContext';
import DOMPurify from 'dompurify';
import { ResourceLevelAutocomplete, OrganizationAutocomplete, SkillAutocomplete } from './ResourceDefinitionMassUploadFormAutoComplete';
import { CustomDatePicker } from '../Resource Roster Form/Components';

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

const ResourceDefinitionMassUploadForm = ({ selectedProject }) => {
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
    
    // Skills Data
    const [skillsData, setSkillsData] = useState([]);

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
    const columnMinWidths = [60, 160, 180, 140, 220, 160, 160, 180, 200, 160, 160, 180, 120, 120, 120, 80, 120];
    const totalCellMinWidth = columnMinWidths.reduce((sum, width) => sum + width, 0);
    // Ensure table width is sufficient for columns
    const tableContentWidth = Math.max(totalCellMinWidth + (32 * 2), 1600);

    // Population selection state
    const [selectedRows, setSelectedRows] = useState([]);
    const [selectAll, setSelectAll] = useState(false);

    // Populate Project states
    const [populateProjectName, setPopulateProjectName] = useState('');

    useEffect(() => {
        if (selectedProject?.id) {
            fetchExistingRecords();
        }
        fetchMasterProcessStreams();
        fetchRoles(selectedProject?.id);
        fetchLOVData();
        fetchExistingFullNames();
        fetchExistingEmails();
        setSelectedRows([]);
        setSelectAll(false);
    }, [selectedProject?.id]);

    // Sync "Select All" for population with individual row selections
    useEffect(() => {
        const selectableRowIndices = uploadedData
            .map((row, index) => row['Populated (Project)'] !== 'Yes' ? index : -1)
            .filter(index => index !== -1);
            
        if (selectableRowIndices.length > 0 && selectedRows.length === selectableRowIndices.length) {
            setSelectAll(true);
        } else {
            setSelectAll(false);
        }
    }, [selectedRows, uploadedData]);

    // Sync "Select All" for deletion with individual row selections (only unpopulated records)
    useEffect(() => {
        const deletableRowIndices = uploadedData
            .map((row, index) => row['Populated (Project)'] !== 'Yes' ? index : -1)
            .filter(index => index !== -1);
        if (deletableRowIndices.length > 0 && selectedRowsForDeletion.length === deletableRowIndices.length) {
            setSelectAllForDeletion(true);
        } else {
            setSelectAllForDeletion(false);
        }
    }, [selectedRowsForDeletion, uploadedData]);

    const fetchExistingFullNames = async () => {
        setExistingFullNames([]);
    };

    const fetchExistingEmails = async () => {
        setExistingEmails([]);
    };

    const fetchExistingRecords = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const token = await getCachedToken();
            const response = await fetch('https://jvphz6t79l.execute-api.ap-south-1.amazonaws.com/New/mass-upload-resource-definition/get', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401 || response.status === 403) {
                handleAuthError('Unauthorized - session expired');
                return;
            }

            if (response.ok) {
                const result = await response.json();
                if (result.success && Array.isArray(result.records)) {
                    const mappedRecords = result.records.map(rec => ({
                        'Full Name': rec.Full_Name || '',
                        'Employee ID': rec.Employee_ID || '',
                        'Email Address': rec.Email_Address || '',
                        'Employee Level': rec.Employee_Level || '',
                        'Organization Name': rec.Organization_Name || '',
                        'Primary_Skill': rec.Primary_Skill || '',
                        'Secondary_Skill': rec.Secondary_Skill || '',
                        'Join Date': rec.Joining_Date ? formatDateForDisplay(rec.Joining_Date) : '',
                        'Exit Date': rec.Exit_Date ? formatDateForDisplay(rec.Exit_Date) : '',
                        'Upload Template Name': rec.upload_file_name || '',
                        'Processed': 'Yes',
                        'Populated (Project)': rec.Populated_main_table === 'true' ? 'Yes' : 'No',
                        Resource_Defination_Mass_Upload_id: rec.Resource_Defination_Mass_Upload_id,
                        Resource_Defination_Mass_Upload_group_id: rec.Resource_Defination_Mass_Upload_group_id,
                        project_id: selectedProject?.id,
                        created_by: rec.created_by,
                        created_timestamp: rec.created_timestamp
                    }));
                    
                    // Sort descending by created timestamp
                    mappedRecords.sort((a, b) => new Date(b.created_timestamp) - new Date(a.created_timestamp));
                    
                    setUploadedData(mappedRecords);
                }
            } else {
                console.error('Failed to fetch existing records');
            }
        } catch (error) {
            console.error('Error fetching existing records:', error);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const fetchMasterProcessStreams = async () => {
        setMasterProcessStreamData([]);
    };

    const fetchRoles = async (projectId) => {
        setRolesData([]);
    };

    const fetchLOVData = async () => {
        try {
            const token = await getCachedToken();
            const [orgResponse, skillsResponse] = await Promise.all([
                fetch('https://jvphz6t79l.execute-api.ap-south-1.amazonaws.com/New/filter/ricew/LOV/org-level-definition-dropdownList', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('https://jvphz6t79l.execute-api.ap-south-1.amazonaws.com/New/filter/ricew/LOV/category-subcategory-dropdownList', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (orgResponse.status === 401 || orgResponse.status === 403 || skillsResponse.status === 401 || skillsResponse.status === 403) {
                handleAuthError('Unauthorized - session expired');
                return;
            }

            if (orgResponse.ok) {
                const result = await orgResponse.json();
                if (result.success) {
                    setOrganizationData(result.organizations || []);
                    setResourceLevelsData(result.Employment_Level || []);
                }
            } else {
                console.error('Failed to fetch org/level LOV data');
            }

            if (skillsResponse.ok) {
                const result = await skillsResponse.json();
                if (result.success) {
                    setSkillsData(result.categories || []);
                }
            } else {
                console.error('Failed to fetch skills LOV data');
            }
        } catch (error) {
            console.error('Error fetching LOV data:', error);
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
                .map(level => level.designation)
                .filter(Boolean);

            // Extract organization names
            const organizations = [...organizationData]
                .sort((a, b) => {
                    const idA = parseInt(a.SI_Organization_Details_id, 10) || 0;
                    const idB = parseInt(b.SI_Organization_Details_id, 10) || 0;
                    return idA - idB;
                })
                .map(org => `${org.SI_organization_name} (${org.organization_id})`)
                .filter(Boolean);

            // Extract skills sorted by Category_Subcategory_id
            const skills = [...skillsData]
                .sort((a, b) => {
                    const idA = parseInt(a.Category_Subcategory_id, 10) || 0;
                    const idB = parseInt(b.Category_Subcategory_id, 10) || 0;
                    return idA - idB;
                })
                .map(skill => skill.Category_Name)
                .filter(Boolean);

            await downloadResourceDefinitionTemplate({ resourceLevels, organizations, skills });
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
            const projectId = selectedProject?.id;
            const userIdValue = userId;
            const token = await getCachedToken();

            if (!projectId) {
                throw new Error('Project ID is missing');
            }

            // Map records to API format
            const mappedRecords = records.map((record) => ({
                Full_Name: (record['Full Name'] || '').trim(),
                Employee_ID: (record['Employee ID'] || '').trim(),
                Email_Address: (record['Email Address'] || '').trim(),
                Employee_Level: (record['Employee Level'] || '').trim(),
                Organization_Name: (record['Organization Name'] || '').trim(),
                Primary_Skill: (record['Primary_Skill'] || '').trim(),
                Secondary_Skill: (record['Secondary_Skill'] || '').trim(),
                Joining_Date: formatDateForBackend(record['Join Date']),
                Exit_Date: formatDateForBackend(record['Exit Date']),
                upload_file_name: fileName,
                created_by: userIdValue
            }));

            const response = await fetch('https://jvphz6t79l.execute-api.ap-south-1.amazonaws.com/New/mass-upload-resource-definition/post', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ records: mappedRecords })
            });

            if (response.status === 401 || response.status === 403) {
                handleAuthError('Unauthorized - session expired');
                return;
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to upload records');
            }

            const result = await response.json();
            const { success_count, fail_count, records: insertedRecords } = result.data || {};

            // Instead of manually mapping returned records, we can just fetch the updated list from the DB
            await fetchExistingRecords();

            const successMsg = `Records uploaded successfully! (${success_count || 0} succeeded, ${fail_count || 0} failed)`;
            setSuccessMessage(DOMPurify.sanitize(successMsg, { ALLOWED_TAGS: [] }));
            setShowSuccessMessage(true);
            setTimeout(() => setShowSuccessMessage(false), 5000);
        } catch (error) {
            console.error('Upload Error:', error);
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
                .map(level => level.designation)
                .filter(Boolean);

            // Extract organization names
            const organizations = [...organizationData]
                .sort((a, b) => {
                    const idA = parseInt(a.SI_Organization_Details_id, 10) || 0;
                    const idB = parseInt(b.SI_Organization_Details_id, 10) || 0;
                    return idA - idB;
                })
                .map(org => `${org.SI_organization_name} (${org.organization_id})`)
                .filter(Boolean);

            // Extract skills sorted by Category_Subcategory_id
            const skills = [...skillsData]
                .sort((a, b) => {
                    const idA = parseInt(a.Category_Subcategory_id, 10) || 0;
                    const idB = parseInt(b.Category_Subcategory_id, 10) || 0;
                    return idA - idB;
                })
                .map(skill => skill.Category_Name)
                .filter(Boolean);

            const result = await parseResourceDefinitionTemplate(file, { resourceLevels, organizations, skills });

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
        const requiredFields = ['Full Name', 'Employee ID', 'Email Address', 'Employee Level', 'Organization Name'];

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



            // Validate Employee Level against resource levels data
            const resourceLevel = row['Employee Level'];
            if (resourceLevel && Array.isArray(resourceLevelsData)) {
                const isValidLevel = resourceLevelsData.some(l => l.designation === resourceLevel);
                if (!isValidLevel) {
                    validationErrors.push({
                        row: excelRowNumber,
                        field: 'Employee Level',
                        message: `Record ${excelRowNumber}: Invalid Employee Level '${resourceLevel}'. Please select a valid level from the list.`
                    });
                }
            }

            // Validate Organization Name against organization data
            const organizationName = row['Organization Name'];
            if (organizationName && Array.isArray(organizationData)) {
                const isValidOrg = organizationData.some(o => `${o.SI_organization_name} (${o.organization_id})` === organizationName);
                if (!isValidOrg) {
                    validationErrors.push({
                        row: excelRowNumber,
                        field: 'Organization Name',
                        message: `Record ${excelRowNumber}: Invalid Organization Name '${organizationName}'. Please select a valid organization from the list.`
                    });
                }
            }

            // Validate Primary Skill against skills data
            const primarySkill = row['Primary_Skill'];
            if (primarySkill && Array.isArray(skillsData)) {
                const isValidSkill = skillsData.some(s => s.Category_Name === primarySkill);
                if (!isValidSkill) {
                    validationErrors.push({
                        row: excelRowNumber,
                        field: 'Primary_Skill',
                        message: `Record ${excelRowNumber}: Invalid Primary Skill '${primarySkill}'. Please select a valid skill from the list.`
                    });
                }
            }

            // Validate Secondary Skill against skills data
            const secondarySkill = row['Secondary_Skill'];
            if (secondarySkill && Array.isArray(skillsData)) {
                const isValidSkill = skillsData.some(s => s.Category_Name === secondarySkill);
                if (!isValidSkill) {
                    validationErrors.push({
                        row: excelRowNumber,
                        field: 'Secondary_Skill',
                        message: `Record ${excelRowNumber}: Invalid Secondary Skill '${secondarySkill}'. Please select a valid skill from the list.`
                    });
                }
            }

            // Validate Join Date and Exit Date range
            const startDateStr = row['Join Date'];
            const endDateStr = row['Exit Date'];
            if (startDateStr && endDateStr) {
                const startDate = new Date(startDateStr);
                const endDate = new Date(endDateStr);
                if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                    if (endDate < startDate) {
                        validationErrors.push({
                            row: excelRowNumber,
                            field: 'Exit Date',
                            message: `Record ${excelRowNumber}: Exit Date cannot be earlier than Join Date.`
                        });
                        validationErrors.push({
                            row: excelRowNumber,
                            field: 'Join Date',
                            message: `Record ${excelRowNumber}: Join Date cannot be later than Exit Date.`
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
        const requiredFields = ['Full Name', 'Employee ID', 'Email Address', 'Employee Level', 'Organization Name'];

        // Check required fields
        requiredFields.forEach(field => {
            const value = row[field];
            const isEmpty = value === null || value === undefined || value === '' || (typeof value === 'string' && value.trim() === '');

            if (isEmpty) {
                errors[field] = `${field} is required`;
            }
        });

        // Validate Join Date and Exit Date range
        const startDateStr = row['Join Date'];
        const endDateStr = row['Exit Date'];
        if (startDateStr && endDateStr) {
            const startDate = new Date(startDateStr);
            const endDate = new Date(endDateStr);
            if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                if (endDate < startDate) {
                    errors['Exit Date'] = 'Exit Date cannot be earlier than Join Date';
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
        if (!row.Resource_Defination_Mass_Upload_id && !row.temp_Roster_mass_upload_id) {
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

            const updatePayload = {
                Resource_Defination_Mass_Upload_id: row.Resource_Defination_Mass_Upload_id || row.temp_Roster_mass_upload_id,
                Full_Name: row['Full Name'],
                Employee_ID: row['Employee ID'],
                Email_Address: row['Email Address'],
                Employee_Level: row['Employee Level'],
                Primary_Skill: row['Primary_Skill'],
                Secondary_Skill: row['Secondary_Skill'],
                Organization_Name: row['Organization Name'],
                Joining_Date: formatDateForBackend(row['Join Date']),
                Exit_Date: formatDateForBackend(row['Exit Date']),
                updated_by: localStorage.getItem('userEmail') || 'unknown'
            };

            const response = await fetch('https://jvphz6t79l.execute-api.ap-south-1.amazonaws.com/New/mass-upload-resource-definition/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updatePayload)
            });

            if (response.status === 401 || response.status === 403) {
                throw new Error('Unauthorized - session expired');
            }

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to update record in backend');
            }

            // Silently fetch all records again to reflect updates
            await fetchExistingRecords(true);

            setSuccessMessage('Record updated successfully!');
            setShowSuccessMessage(true);
            setTimeout(() => setShowSuccessMessage(false), 3000);
            setEditingRowIndex(null);
            setOriginalRowData(null);
            setFieldErrors({}); // Clear field errors on successful save
        } catch (error) {
            console.error('Update Error:', error);
            const errorMsg = error.message || 'An error occurred while updating the record';
            setErrorMessage(DOMPurify.sanitize(errorMsg, { ALLOWED_TAGS: [] }));
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 5000);
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

        const totalCount = selectedRowsForDeletion.length;
        let message = `You have selected ${totalCount} ${totalCount === 1 ? 'record' : 'records'} to delete.\n\nThis action cannot be undone. Do you want to continue?`;

        showConfirmation(message, async () => {
            try {
                setLoading(true);
                setSuccessMessage("Deleting records...");
                setShowSuccessMessage(true);

                // Extract Resource_Defination_Mass_Upload_id from selected rows
                const recordIds = selectedRowsForDeletion
                    .map(index => uploadedData[index])
                    .map(record => record.Resource_Defination_Mass_Upload_id)
                    .filter(Boolean);

                if (recordIds.length === 0) {
                    throw new Error('No valid record IDs found for deletion');
                }

                const token = await getCachedToken();

                // Call the delete API
                const response = await fetch('https://jvphz6t79l.execute-api.ap-south-1.amazonaws.com/New/mass-upload-resource-definition/delete', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        ids: recordIds,
                        updated_by: userId
                    })
                });

                if (response.status === 401 || response.status === 403) {
                    handleAuthError('Unauthorized - session expired');
                    setLoading(false);
                    return;
                }

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || 'Failed to delete records');
                }

                const result = await response.json();

                // Refresh the data from the database to reflect changes
                await fetchExistingRecords();

                const finalMessage = totalCount === 1 ? 'Record deleted successfully!' : `${totalCount} records deleted successfully!`;
                setSuccessMessage(DOMPurify.sanitize(finalMessage, { ALLOWED_TAGS: [] }));
                setShowSuccessMessage(true);

                // Reset selection
                setSelectedRowsForDeletion([]);
                setSelectAllForDeletion(false);
                setEditingRowIndex(null);
                setOriginalRowData(null);

                setTimeout(() => {
                    setShowSuccessMessage(false);
                }, 5000);

            } catch (error) {
                console.error('Delete Error:', error);
                const errorMsg = error.message || 'An error occurred while deleting the records';
                setErrorMessage(DOMPurify.sanitize(errorMsg, { ALLOWED_TAGS: [] }));
                setShowErrorMessage(true);
                setTimeout(() => setShowErrorMessage(false), 5000);
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

        // Validate selected records before populating
        const validationErrors = [];
        const requiredFields = ['Full Name', 'Employee ID', 'Employee Level', 'Organization Name'];

        selectedRecords.forEach(record => {
            const rowIndex = uploadedData.indexOf(record) + 1;
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

                // Extract Resource_Defination_Mass_Upload_id from selected records
                const recordIds = selectedRecords.map(record => record.Resource_Defination_Mass_Upload_id).filter(Boolean);

                if (recordIds.length === 0) {
                    throw new Error('No valid record IDs found for population');
                }

                const token = await getCachedToken();

                // Call the moveToMainTable API
                const response = await fetch('https://jvphz6t79l.execute-api.ap-south-1.amazonaws.com/New/mass-upload-resource-definition/moveToMainTable', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        user_id: userId,
                        ids: recordIds
                    })
                });

                if (response.status === 401 || response.status === 403) {
                    handleAuthError('Unauthorized - session expired');
                    setLoading(false);
                    return;
                }

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || 'Failed to populate records to main table');
                }

                const result = await response.json();

                // Refresh the data from the database to reflect changes
                await fetchExistingRecords();

                const successMsg = `Successfully populated ${recordIds.length} record(s) into Project!`;
                setSuccessMessage(DOMPurify.sanitize(successMsg, { ALLOWED_TAGS: [] }));
                setTimeout(() => setShowSuccessMessage(false), 5000);
                setSelectedRows([]);
                setSelectAll(false);
            } catch (error) {
                console.error('Error populating project:', error);
                const errorMsg = error.message || 'Failed to populate project';
                setErrorMessage(DOMPurify.sanitize(errorMsg, { ALLOWED_TAGS: [] }));
                setShowErrorMessage(true);
                setTimeout(() => setShowErrorMessage(false), 5000);
            } finally {
                setLoading(false);
            }
        };

        showConfirmation(
            `You have selected ${selectedRows.length} record(s) to populate into the project. Do you want to continue?`,
            executePopulate
        );
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



                    {/* Page Title */}
                    <div className="config-header" style={{ marginTop: '0', marginRight: "0px", display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h2>Resource Definition Upload Form</h2>
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
                        {/* Action Buttons Row - Aligned with Columns - Placed ABOVE Table Container */}
                        <div style={{
                            display: 'flex',
                            width: '100%',
                            padding: '8px 0',
                            alignItems: 'flex-end',
                            marginBottom: '10px'
                            // No horizontal scroll here, but widths match table
                        }}>
                            {/* Spacers for columns to perfectly match table grid */}
                            <div style={{ width: '60px', flex: '0 0 60px', display: 'flex', alignItems: 'center', gap: '12px', whiteSpace: 'nowrap' }}>
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
                            <div style={{ flex: 1, minWidth: '160px' }}></div>
                            <div style={{ flex: 1, minWidth: '140px' }}></div>
                            <div style={{ flex: 1, minWidth: '200px' }}></div>
                            <div style={{ flex: 1, minWidth: '140px' }}></div>
                            <div style={{ flex: 1, minWidth: '160px' }}></div>
                            <div style={{ flex: 1, minWidth: '160px' }}></div>
                            <div style={{ flex: 1, minWidth: '180px' }}></div>
                            <div style={{ flex: 1, minWidth: '160px' }}></div>
                            <div style={{ flex: 1, minWidth: '160px' }}></div>
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
                            overflowY: 'visible',
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
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '140px', backgroundColor: 'white' }}>Employee ID</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '200px', backgroundColor: 'white' }}>Email Address</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '140px', backgroundColor: 'white' }}>Employee Level</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '160px', backgroundColor: 'white' }}>Primary_Skill</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '160px', backgroundColor: 'white' }}>Secondary_Skill</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '180px', backgroundColor: 'white' }}>Organization Name</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '160px', backgroundColor: 'white' }}>Join Date</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '160px', backgroundColor: 'white' }}>Exit Date</div>
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
                                                const deletableRowIndices = uploadedData
                                                    .map((row, index) => row['Populated (Project)'] !== 'Yes' ? index : -1)
                                                    .filter(index => index !== -1);
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
                                        title="Select All Unpopulated Records"
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
                                                    color: rowTextColor,
                                                    overflow: 'visible',
                                                    position: 'relative'
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


                                                {/* Employee ID */}
                                                <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', color: rowTextColor, borderRight: '1px solid #ddd', minWidth: '140px', wordBreak: 'break-word', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                                    {editingRowIndex === index ? (
                                                        <>
                                                            <input
                                                                type="text"
                                                                value={row['Employee ID'] || ''}
                                                                onChange={(e) => handleInputChange(e, 'Employee ID')}
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '4px',
                                                                    borderRadius: '4px',
                                                                    border: fieldErrors['Employee ID'] ? '2px solid #dc2626' : '2px solid #3b82f6'
                                                                }}
                                                            />
                                                            {fieldErrors['Employee ID'] && (
                                                                <span style={{
                                                                    color: '#dc2626',
                                                                    fontSize: '11px',
                                                                    marginTop: '4px',
                                                                    fontWeight: '500'
                                                                }}>
                                                                    {fieldErrors['Employee ID']}
                                                                </span>
                                                            )}
                                                        </>
                                                    ) : (row['Employee ID'] || '-')}
                                                </div>

                                                {/* Email Address */}
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

                                                {/* Employee Level */}
                                                <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', color: rowTextColor, borderRight: '1px solid #ddd', minWidth: '140px', wordBreak: 'break-word', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', position: 'relative', zIndex: editingRowIndex === index ? 10 : 1, overflow: 'visible' }}>
                                                    {editingRowIndex === index ? (
                                                        <>
                                                            <ResourceLevelAutocomplete
                                                                value={row['Employee Level'] || ''}
                                                                onChange={(val) => {
                                                                    handleInputChange({ target: { value: val } }, 'Employee Level');
                                                                }}
                                                                projectId={localStorage.getItem('project_id') || selectedProject?.id}
                                                                error={!!fieldErrors['Employee Level']}
                                                                isPopulated={isPopulated}
                                                                optionsList={resourceLevelsData}
                                                            />
                                                            {fieldErrors['Employee Level'] && (
                                                                <span style={{
                                                                    color: '#dc2626',
                                                                    fontSize: '11px',
                                                                    marginTop: '4px',
                                                                    fontWeight: '500'
                                                                }}>
                                                                    {fieldErrors['Employee Level']}
                                                                </span>
                                                            )}
                                                        </>
                                                    ) : (row['Employee Level'] || '-')}
                                                </div>

                                                {/* Primary Skill */}
                                                <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', color: rowTextColor, borderRight: '1px solid #ddd', minWidth: '160px', wordBreak: 'break-word', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', position: 'relative', zIndex: editingRowIndex === index ? 10 : 1, overflow: 'visible' }}>
                                                    {editingRowIndex === index ? (
                                                        <>
                                                            <SkillAutocomplete
                                                                value={row['Primary_Skill'] || ''}
                                                                onChange={(val) => {
                                                                    handleInputChange({ target: { value: val } }, 'Primary_Skill');
                                                                }}
                                                                error={!!fieldErrors['Primary_Skill']}
                                                                isPopulated={isPopulated}
                                                                placeholder="Select primary skill..."
                                                                optionsList={skillsData}
                                                            />
                                                            {fieldErrors['Primary_Skill'] && (
                                                                <span style={{
                                                                    color: '#dc2626',
                                                                    fontSize: '11px',
                                                                    marginTop: '4px',
                                                                    fontWeight: '500'
                                                                }}>
                                                                    {fieldErrors['Primary_Skill']}
                                                                </span>
                                                            )}
                                                        </>
                                                    ) : (row['Primary_Skill'] || '-')}
                                                </div>

                                                {/* Secondary Skill */}
                                                <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', color: rowTextColor, borderRight: '1px solid #ddd', minWidth: '160px', wordBreak: 'break-word', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', position: 'relative', zIndex: editingRowIndex === index ? 10 : 1, overflow: 'visible' }}>
                                                    {editingRowIndex === index ? (
                                                        <>
                                                            <SkillAutocomplete
                                                                value={row['Secondary_Skill'] || ''}
                                                                onChange={(val) => {
                                                                    handleInputChange({ target: { value: val } }, 'Secondary_Skill');
                                                                }}
                                                                error={!!fieldErrors['Secondary_Skill']}
                                                                isPopulated={isPopulated}
                                                                placeholder="Select secondary skill..."
                                                                optionsList={skillsData}
                                                            />
                                                            {fieldErrors['Secondary_Skill'] && (
                                                                <span style={{
                                                                    color: '#dc2626',
                                                                    fontSize: '11px',
                                                                    marginTop: '4px',
                                                                    fontWeight: '500'
                                                                }}>
                                                                    {fieldErrors['Secondary_Skill']}
                                                                </span>
                                                            )}
                                                        </>
                                                    ) : (row['Secondary_Skill'] || '-')}
                                                </div>

                                                {/* Organization Name */}
                                                <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', color: rowTextColor, borderRight: '1px solid #ddd', minWidth: '180px', wordBreak: 'break-word', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', position: 'relative', zIndex: editingRowIndex === index ? 10 : 1, overflow: 'visible' }}>
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
                                                                optionsList={organizationData}
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

                                                {/* Join Date */}
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
                                                                name="Join Date"
                                                                value={row['Join Date'] || ''}
                                                                onChange={(val) => handleInputChange({ target: { value: val } }, 'Join Date')}
                                                                placeholder="Select Date"
                                                                width="100%"
                                                            />
                                                        </Box>
                                                    ) : (formatDateForDisplay(row['Join Date']))}
                                                </div>

                                                {/* Exit Date */}
                                                <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', color: rowTextColor, borderRight: '1px solid #ddd', minWidth: '160px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                                    {editingRowIndex === index ? (
                                                        <>
                                                            <Box sx={{
                                                                width: '100%',
                                                                '& .MuiOutlinedInput-root fieldset': {
                                                                    borderColor: fieldErrors['Exit Date'] ? '#dc2626 !important' : '#3b82f6 !important',
                                                                    borderWidth: '2px !important',
                                                                    borderRadius: '4px !important',
                                                                },
                                                                '& .MuiOutlinedInput-root:hover fieldset': {
                                                                    borderColor: fieldErrors['Exit Date'] ? '#dc2626 !important' : '#3b82f6 !important',
                                                                },
                                                                '& .MuiOutlinedInput-root.Mui-focused fieldset': {
                                                                    borderColor: fieldErrors['Exit Date'] ? '#dc2626 !important' : '#3b82f6 !important',
                                                                }
                                                            }}>
                                                                <CustomDatePicker
                                                                    name="Exit Date"
                                                                    value={row['Exit Date'] || ''}
                                                                    onChange={(val) => handleInputChange({ target: { value: val } }, 'Exit Date')}
                                                                    placeholder="Select Date"
                                                                    error={!!fieldErrors['Exit Date']}
                                                                    width="100%"
                                                                />
                                                            </Box>
                                                            {fieldErrors['Exit Date'] && (
                                                                <span style={{
                                                                    color: '#dc2626',
                                                                    fontSize: '11px',
                                                                    marginTop: '4px',
                                                                    fontWeight: '500'
                                                                }}>
                                                                    {fieldErrors['Exit Date']}
                                                                </span>
                                                            )}
                                                        </>
                                                    ) : (formatDateForDisplay(row['Exit Date']))}
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
                                        The <strong>Resource Definition Upload Form</strong> is a bulk data entry tool that lets administrators upload multiple implementation team resource records at once via an Excel template, rather than entering them one by one.
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
                                        <li>Review the records in the table. Rows with validation errors are highlighted â€” fix them inline by clicking a cell.</li>
                                        <li>Select the records you want to submit using the checkboxes, then click <strong>Submit Selected</strong>.</li>
                                        <li>Use <strong>Populate Project</strong> to auto-fill project-level fields (Organization, Employee Level, etc.) across all rows at once.</li>
                                    </ol>
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>Template columns</strong>
                                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                        <li><strong>Full Name</strong> â€” Resource&#39;s full name (required).</li>
                                        <li><strong>Employee ID</strong> â€” Resource&#39;s unique identifier (required).</li>
                                        <li><strong>Email Address</strong> â€” Must be a valid email format (required).</li>
                                        <li><strong>Organization Name</strong> â€” Must match an existing organization on the project.</li>
                                        <li><strong>Employee Level</strong> â€” Seniority level code (required).</li>
                                        <li><strong>Join Date / Exit Date</strong> â€” Engagement dates in DD-MMM-YYYY format.</li>
                                    </ul>
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>Understanding Upload Status</strong>
                                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                        <li><strong>Processed (Temporary Table)</strong> â€” Indicates that the record has been successfully uploaded from Excel and is stored in a temporary staging area for review and validation.</li>
                                        <li><strong>Populated (Project)</strong> â€” Indicates that the record has been officially moved from the temporary staging area into the main Project Resource Roster.</li>
                                    </ul>
                                </div>

                                <div style={{ marginBottom: '4px' }}>
                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>Important notes</strong>
                                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                        <li>Only <strong>.xlsx</strong> files are accepted. Do not upload .xls or .csv files.</li>
                                        <li>Rows with validation errors cannot be submitted until the errors are resolved.</li>
                                        <li>Duplicate email addresses within the upload or already existing in the system will be flagged.</li>
                                        <li>A project must be selected before uploading data.</li>
                                        <li>The <strong>Populate Project</strong> button only fills empty cells â€” it will not overwrite data you have already entered.</li>
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

export default ResourceDefinitionMassUploadForm;

