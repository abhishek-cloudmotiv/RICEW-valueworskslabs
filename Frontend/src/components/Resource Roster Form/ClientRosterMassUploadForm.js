import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, MoreVertical, Save, X, AlertCircle, HelpCircle } from 'lucide-react'; // Import icons
import DOMPurify from 'dompurify';
import { downloadClientRosterTemplate, parseClientRosterTemplate } from '../../utils/excelTemplateForClientRosterForm';
import { getIdToken } from '../../utils/cognito-auth';
import { useSession } from '../../context/SessionContext';

const RosterMassUploadForm = ({ selectedProject }) => {
    const navigate = useNavigate();
    const { handleAuthError } = useSession();
    const [showNoProjectSelectedPopup, setShowNoProjectSelectedPopup] = useState(false);

    useEffect(() => {
        const projectId = localStorage.getItem('project_id');
        if (!selectedProject?.id && !projectId) {
            setShowNoProjectSelectedPopup(true);
        }
    }, [selectedProject?.id]);


    // Data Loading State
    const [uploadedData, setUploadedData] = useState([]);
    const [existingClientNames, setExistingClientNames] = useState([]); // State for duplicate validation
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

    // Cell editing state for dropdown fields
    const [editingCell, setEditingCell] = useState(null); // { rowIndex: number, field: string }
    const [editValue, setEditValue] = useState('');
    const [previousValue, setPreviousValue] = useState('');

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
    const columnMinWidths = [60, 160, 200, 160, 120, 120, 100, 80, 120, 180];
    const totalCellMinWidth = columnMinWidths.reduce((sum, width) => sum + width, 0);
    // Ensure table width is sufficient for columns
    const tableContentWidth = Math.max(totalCellMinWidth + (32 * 2), 1600);

    // Population selection state
    const [selectedRows, setSelectedRows] = useState([]);
    const [selectAll, setSelectAll] = useState(false);

    // Populate Project states
    const [populateProjectName, setPopulateProjectName] = useState('');

    useEffect(() => {
        const projectId = localStorage.getItem('project_id') || selectedProject?.id;
        fetchExistingRecords();
        fetchUniqueEmails();
        setSelectedRows([]);
        setSelectAll(false);
    }, [selectedProject?.id]);

    // Removed getStorageKey as we are switching to backend APIs


    const fetchExistingRecords = async () => {
        try {
            setLoading(true);
            const projectId = localStorage.getItem('project_id') || selectedProject?.id;

            if (!projectId) {
                setLoading(false);
                return;
            }

            const idToken = await getIdToken();
            const headers = {
                'Content-Type': 'application/json'
            };
            if (idToken) {
                headers['Authorization'] = `Bearer ${idToken}`;
            }

            const response = await fetch(`https://bosrx0saz3.execute-api.ap-south-1.amazonaws.com/New/api/clientRosterMassUpload/massUploadTemp/getRecords?project_id=${projectId}`, {
                headers
            });

            if (response.status === 401 || response.status === 403) {
                handleAuthError('Unauthorized - session expired');
                return;
            }

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const result = await response.json();
            const items = result.data || [];

            const mappedData = items.map(item => {
                const getValue = (field) => field || '';
                return {
                    'Client Name': getValue(item.Client_Name),
                    'Client Email': getValue(item.Client_Email),
                    'Phone Number': item.Phone_Code ? `${item.Phone_Code} ${item.Phone_Number}` : (item.Phone_Number || ''),
                    'Upload Template Name': getValue(item.Upload_Template_Name),
                    'Processed': 'Yes',
                    'Populated (Project)': (item.Populated_Project === true || item.Populated_Project === 'true' || item.Populated_Project === 'YES' || item.Populated_Project === 'Yes') ? 'Yes' : 'No',
                    temp_Roster_mass_upload_id: getValue(item.temp_Roster_mass_upload_id || item.Client_Roster_Mass_Upload_Temp_id),
                    project_id: getValue(item.Project_id || item.project_id),
                    created_by: getValue(item.created_by),
                    created_timestamp: getValue(item.created_timestamp),
                    updated_timestamp: getValue(item.updated_timestamp)
                };
            });

            // Sort logic:
            mappedData.sort((a, b) => {
                const popA = a['Populated (Project)'] === 'Yes' ? 1 : 0;
                const popB = b['Populated (Project)'] === 'Yes' ? 1 : 0;
                if (popA !== popB) return popA - popB;

                const timeA = a.updated_timestamp ? new Date(a.updated_timestamp).getTime() : 0;
                const timeB = b.updated_timestamp ? new Date(b.updated_timestamp).getTime() : 0;
                if (timeB !== timeA) return timeB - timeA;

                const idA = String(a.temp_Roster_mass_upload_id) || '';
                const idB = String(b.temp_Roster_mass_upload_id) || '';
                return idB.localeCompare(idA);
            });

            setUploadedData(mappedData);

            // Also update existing client names for duplicate check
            setExistingClientNames(items.map(item => item.Client_Name).filter(Boolean));

        } catch (error) {
            console.error('Error fetching existing records:', error);
        } finally {
            setLoading(false);
        }
    };



    const fetchUniqueEmails = async () => {
        try {
            const projectId = localStorage.getItem('project_id') || selectedProject?.id;
            if (!projectId) return;

            const idToken = await getIdToken();
            const url = `https://bosrx0saz3.execute-api.ap-south-1.amazonaws.com/New/api/clientRosterMassUpload/massUploadTemp/uniqueEmails?project_id=${projectId}`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${idToken}` }
            });

            if (response.status === 401 || response.status === 403) {
                handleAuthError('Unauthorized - session expired');
                return;
            }

            if (response.ok) {
                const result = await response.json();
                setExistingEmails(result.emails || []);
            }
        } catch (error) {
            console.error('Error fetching unique emails:', error);
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            await downloadClientRosterTemplate();
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
            const token = await getIdToken();
            const projectId = localStorage.getItem('project_id') || selectedProject?.id;
            const userId = localStorage.getItem('user_id');

            if (!projectId) {
                throw new Error('Project ID is missing');
            }

            // Map records to API format
            const apiRecords = records.map(record => {
                let phoneNumberWithPlus = (record['Phone Number'] || '').trim();
                if (phoneNumberWithPlus && !phoneNumberWithPlus.startsWith('+')) {
                    phoneNumberWithPlus = '+' + phoneNumberWithPlus;
                }

                return {
                    Client_Name: record['Client Name'],
                    Client_Email: record['Client Email'],
                    Phone_Number: phoneNumberWithPlus,
                    Upload_Template_Name: fileName,
                    Project_id: projectId,
                    Populated_Project: 'false',
                    Processed_Temporary_Table: 'false',
                    delete_status: 'false'
                };
            });

            const response = await fetch('https://bosrx0saz3.execute-api.ap-south-1.amazonaws.com/New/api/clientRosterMassUpload/massUploadTemp/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    records: apiRecords,
                    created_by: userId || 'unknown'
                })
            });

            if (response.status === 401 || response.status === 403) {
                handleAuthError('Unauthorized - session expired');
                return;
            }

            if (response.ok) {
                const result = await response.json();
                setSuccessMessage(DOMPurify.sanitize(result.message || 'Records uploaded and validated successfully!', { ALLOWED_TAGS: [] }));
                setShowSuccessMessage(true);
                setTimeout(() => setShowSuccessMessage(false), 5000);

                // Refresh data to get the assigned IDs from the backend
                fetchExistingRecords();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to upload records');
            }
        } catch (error) {
            console.error('Upload API Error:', error);
            setErrorMessage(DOMPurify.sanitize(error.message || 'An error occurred during upload', { ALLOWED_TAGS: [] }));
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

            const result = await parseClientRosterTemplate(file);

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

                setSuccessMessage(`Template uploaded successfully! ${enrichedData.length} record(s) ready for validation.`);
                setShowSuccessMessage(true);
                setTimeout(() => setShowSuccessMessage(false), 3000);
            } else {
                setErrorMessage(DOMPurify.sanitize(result.message, { ALLOWED_TAGS: [] }));
                setShowErrorMessage(true);
                setTimeout(() => setShowErrorMessage(false), 5000);
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            setErrorMessage('Failed to process template. Please try again.');
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
        const requiredFields = ['Client Name', 'Client Email'];

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

            // Validate Client Email Format
            const email = (row['Client Email'] || '').trim();
            if (email) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    validationErrors.push({
                        row: excelRowNumber,
                        field: 'Client Email',
                        message: `Record ${excelRowNumber}: Invalid Client Email format.`
                    });
                }
            }

            // Validate Client Name uniqueness against database
            // const clientName = (row['Client Name'] || '').trim();
            /* if (clientName) {
                if (existingClientNames.some(existingName => existingName.toLowerCase() === clientName.toLowerCase())) {
                    validationErrors.push({
                        row: excelRowNumber,
                        field: 'Client Name',
                        message: `Record ${excelRowNumber}: Client Name '${clientName}' already exists in the roster for this project.`
                    });
                } else if (pendingUploadData.some((r, i) => i < index && (r['Client Name'] || '').trim().toLowerCase() === clientName.toLowerCase())) {
                    // Check if repeated within the same upload file
                    validationErrors.push({
                        row: excelRowNumber,
                        field: 'Client Name',
                        message: `Record ${excelRowNumber}: Client Name '${clientName}' is repeated within the uploaded template.`
                    });
                }
            } */

            // Validate Phone Number
            const fullPhone = row['Phone Number'] || '';
            if (fullPhone.trim() !== '') {
                const parts = fullPhone.trim().split(' ');
                const phoneCode = parts.length > 1 ? parts[0].replace(/\D/g, '') : '';
                const phoneNumber = parts.length > 1 ? parts.slice(1).join('').replace(/\D/g, '') : parts[0].replace(/\D/g, '');

                if (phoneCode.length > 5) {
                    validationErrors.push({
                        row: excelRowNumber,
                        field: 'Phone Number',
                        message: `Record ${excelRowNumber}: Phone Code must be max 5 digits.`
                    });
                }

                if (phoneNumber.length < 8 || phoneNumber.length > 10) {
                    validationErrors.push({
                        row: excelRowNumber,
                        field: 'Phone Number',
                        message: `Record ${excelRowNumber}: Phone Number must be between 8 and 10 digits.`
                    });
                }
            }
        });

        if (validationErrors.length > 0) {
            // Validation failed - show errors
            setValidationErrorsList(validationErrors);
            setShowValidationErrorsModal(true);

            // Set validation status to error
            setValidationStatus('error');

            setErrorMessage(`Validation failed! Found ${validationErrors.length} error(s). Please fix them before proceeding.`);
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 5000);
        } else {
            // All validations passed - Proceed to auto-save
            try {
                setSuccessMessage(`Validation successful! Saving ${pendingUploadData.length} record(s)...`);
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
                setErrorMessage(DOMPurify.sanitize(`Validation passed but save failed: ${error.message}`, { ALLOWED_TAGS: [] }));
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
        const requiredFields = ['Client Name', 'Client Email'];

        // Check required fields
        requiredFields.forEach(field => {
            const value = row[field];
            const isEmpty = value === null || value === undefined || value === '' || (typeof value === 'string' && value.trim() === '');

            if (isEmpty) {
                errors[field] = `${field} is required`;
            }
        });

        // Validate Phone Number
        const fullPhone = row['Phone Number'] || '';
        if (fullPhone.trim() !== '') {
            const parts = fullPhone.trim().split(' ');
            const phoneCode = parts.length > 1 ? parts[0].replace(/\D/g, '') : '';
            const phoneNumber = parts.length > 1 ? parts.slice(1).join('').replace(/\D/g, '') : parts[0].replace(/\D/g, '');

            if (phoneCode.length > 3) {
                errors['Phone Number'] = 'Phone Code must be max 3 digits';
            }

            if (phoneNumber.length < 8 || phoneNumber.length > 10) {
                errors['Phone Number'] = 'Phone Number must be between 8 and 10 digits';
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
        // const nameChanged = row['Client Name'].trim().toLowerCase() !== (originalRowData['Client Name'] || '').trim().toLowerCase();
        /* if (nameChanged && existingClientNames.some(existingName => existingName.toLowerCase() === row['Client Name'].trim().toLowerCase())) {
            setFieldErrors({ 'Client Name': `A record with the name "${row['Client Name']}" already exists for this project` });
            setErrorMessage(`Error: A record with the name "${row['Client Name']}" already exists for this project.`);
            setShowErrorMessage(true);
            return;
        } */

        try {
            setLoading(true);
            const token = await getIdToken();

            const rawPhone = (row['Phone Number'] || '').trim();
            let phoneToProcess = rawPhone;
            if (phoneToProcess && !phoneToProcess.startsWith('+')) {
                phoneToProcess = '+' + phoneToProcess;
            }

            const payload = {
                Client_Roster_Mass_Upload_Temp_id: row.temp_Roster_mass_upload_id,
                Project_id: localStorage.getItem('project_id') || selectedProject?.id,
                current_Client_Email: originalRowData['Client Email'],
                Client_Name: row['Client Name'],
                Client_Email: row['Client Email'],
                Phone_Number: phoneToProcess,
                updated_by: localStorage.getItem('user_id') || 'unknown'
            };

            const response = await fetch('https://bosrx0saz3.execute-api.ap-south-1.amazonaws.com/New/api/clientRosterMassUpload/massUploadTemp/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
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
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update record');
            }
        } catch (error) {
            console.error('Update Error:', error);
            setErrorMessage(DOMPurify.sanitize(error.message || 'An error occurred while updating the record', { ALLOWED_TAGS: [] }));
            setShowErrorMessage(true);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e, field) => {
        const value = e.target.value;

        if (field === 'Phone Number') {
            const parts = value.split(' ');
            if (parts.length > 1) {
                // Combined field: validate the phone number part (after first space)
                const phoneNumber = parts.slice(1).join('').replace(/\D/g, '');
                if (phoneNumber.length > 10) return;
            } else {
                // Single field: if it starts with +, treat as code, but if pure digits, limit to 10
                const digitsOnly = value.replace(/\D/g, '');
                if (!value.startsWith('+') && digitsOnly.length > 10) return;
                if (value.startsWith('+') && digitsOnly.length > 15) return; // Room for code + number
            }
        }

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
                    const token = await getIdToken();

                    const response = await fetch('https://bosrx0saz3.execute-api.ap-south-1.amazonaws.com/New/api/clientRosterMassUpload/massUploadTemp/delete', {
                        method: 'POST',
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

                    if (response.ok) {
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
                        setEditingCell(null);
                        setOriginalRowData(null);

                        setTimeout(() => {
                            setShowSuccessMessage(false);
                            fetchExistingRecords(); // Refresh from DB to ensure sync
                        }, 3000);
                    } else {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Failed to delete records');
                    }
                }
            } catch (error) {
                console.error('Delete Error:', error);
                setErrorMessage(DOMPurify.sanitize(error.message || 'An error occurred while deleting the record', { ALLOWED_TAGS: [] }));
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
        const requiredFields = ['Client Name'];

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

                const ids = savedRecordsToPopulate.map(r => r.temp_Roster_mass_upload_id);
                const token = await getIdToken();
                const userId = localStorage.getItem('user_id'); // Get user_id for updated_by

                const response = await fetch(`https://bosrx0saz3.execute-api.ap-south-1.amazonaws.com/New/api/clientRosterMassUpload/massUploadTemp/moveToRoster`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ ids: ids, updated_by: userId || 'unknown' })
                });

                if (response.status === 401 || response.status === 403) {
                    handleAuthError('Unauthorized - session expired');
                    return;
                }

                if (response.ok) {
                    const result = await response.json();
                    setSuccessMessage(DOMPurify.sanitize(`Successfully moved ${result.totalMoved || ids.length} record(s) into Project Roster!`, { ALLOWED_TAGS: [] }));
                    setShowSuccessMessage(true);
                    setTimeout(() => setShowSuccessMessage(false), 5000);
                    setSelectedRows([]);
                    setSelectAll(false);
                    fetchExistingRecords(); // Refresh data to show "Yes" in the table
                } else {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to move records to roster');
                }
            } catch (error) {
                console.error('Error populating project:', error);
                setErrorMessage(DOMPurify.sanitize(`Failed to populate project: ${error.message}`, { ALLOWED_TAGS: [] }));
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

    // Handle cell edit
    const handleCellEdit = (rowIndex, field, currentValue) => {
        setEditingCell({ rowIndex, field });
        setPreviousValue(currentValue || '');
        setEditValue(currentValue || '');
    };

    // Handle cell value update
    const handleCellUpdate = (rowIndex, field, value) => {
        setUploadedData(prevData => {
            const newData = [...prevData];
            newData[rowIndex] = {
                ...newData[rowIndex],
                [field]: value
            };
            return newData;
        });

        // Close editing state
        setEditingCell(null);
        setEditValue('');
        setPreviousValue('');
    };

    // Handle cell edit cancel
    const handleCellCancel = () => {
        setEditingCell(null);
        setEditValue('');
        setPreviousValue('');
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
                            <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project : <span style={{ color: '#007bff' }}>{localStorage.getItem('project_name') || selectedProject?.name}</span></h3>
                        </div>
                    </div>

                    {/* Page Title */}
                    <div className="config-header" style={{ marginTop: '0', marginRight: "0px", display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h2>Client Resource Upload Form</h2>
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
                            {/* Spacers for columns 1-6 to match table grid */}
                            <div style={{ width: '60px', flex: '0 0 60px' }}></div>
                            <div style={{ flex: 1, minWidth: '160px' }}></div>
                            <div style={{ flex: 1, minWidth: '200px' }}></div>
                            <div style={{ flex: 1, minWidth: '160px' }}></div>
                            <div style={{ flex: 1, minWidth: '120px' }}></div>
                            <div style={{ flex: 1, minWidth: '120px' }}></div>

                            {/* Select Column (Col 10) - Populate Button */}
                            <div style={{
                                flex: 1,
                                minWidth: '100px',
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
                            overflowY: 'hidden',
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
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '160px', backgroundColor: 'white' }}>Client Name</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '200px', backgroundColor: 'white' }}>Client Email</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '160px', backgroundColor: 'white' }}>Phone Number</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '120px', backgroundColor: 'white', textAlign: 'center' }}>Processed (Temporary Table)</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '120px', backgroundColor: 'white', textAlign: 'center' }}>Populated (Project)</div>
                                <div style={{
                                    flex: 1,
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

                                                {/* Client Name */}
                                                <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', color: rowTextColor, borderRight: '1px solid #ddd', minWidth: '160px', wordBreak: 'break-word', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                                    {editingRowIndex === index ? (
                                                        <>
                                                            <input
                                                                type="text"
                                                                value={row['Client Name'] || ''}
                                                                onChange={(e) => handleInputChange(e, 'Client Name')}
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '4px',
                                                                    borderRadius: '4px',
                                                                    border: fieldErrors['Client Name'] ? '2px solid #dc2626' : '2px solid #3b82f6'
                                                                }}
                                                            />
                                                            {fieldErrors['Client Name'] && (
                                                                <span style={{
                                                                    color: '#dc2626',
                                                                    fontSize: '11px',
                                                                    marginTop: '4px',
                                                                    fontWeight: '500'
                                                                }}>
                                                                    {fieldErrors['Client Name']}
                                                                </span>
                                                            )}
                                                        </>
                                                    ) : (row['Client Name'] || '-')}
                                                </div>

                                                {/* Client Email */}
                                                <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', color: rowTextColor, borderRight: '1px solid #ddd', minWidth: '200px', wordBreak: 'break-word', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                                    {editingRowIndex === index ? (
                                                        <>
                                                            <input
                                                                type="text"
                                                                value={row['Client Email'] || ''}
                                                                onChange={(e) => handleInputChange(e, 'Client Email')}
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '4px',
                                                                    borderRadius: '4px',
                                                                    border: fieldErrors['Client Email'] ? '2px solid #dc2626' : '2px solid #3b82f6'
                                                                }}
                                                            />
                                                            {fieldErrors['Client Email'] && (
                                                                <span style={{
                                                                    color: '#dc2626',
                                                                    fontSize: '11px',
                                                                    marginTop: '4px',
                                                                    fontWeight: '500'
                                                                }}>
                                                                    {fieldErrors['Client Email']}
                                                                </span>
                                                            )}
                                                        </>
                                                    ) : (row['Client Email'] || '-')}
                                                </div>

                                                {/* Phone Number - Two inputs in edit mode */}
                                                <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', color: rowTextColor, borderRight: '1px solid #ddd', minWidth: '160px', wordBreak: 'break-word', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', overflow: 'hidden', boxSizing: 'border-box' }}>
                                                    {editingRowIndex === index ? (
                                                        <>
                                                            <div style={{ display: 'flex', gap: '4px', width: '100%', boxSizing: 'border-box', minWidth: 0 }}>
                                                                {/* Code Input */}
                                                                <input
                                                                    type="text"
                                                                    placeholder="+91"
                                                                    onKeyPress={(e) => {
                                                                        if (!/[0-9+]/.test(e.key)) {
                                                                            e.preventDefault();
                                                                        }
                                                                    }}
                                                                    value={(() => {
                                                                        const phone = row['Phone Number'] || '';
                                                                        const parts = phone.trim().split(' ');
                                                                        return parts.length > 1 ? parts[0] : (phone.startsWith('+') ? phone : '');
                                                                    })()}
                                                                    onChange={(e) => {
                                                                        let code = e.target.value;
                                                                        if (code && !code.startsWith('+')) {
                                                                            code = '+' + code;
                                                                        }
                                                                        const digits = code.replace(/\D/g, '');
                                                                        if (digits.length > 5) return;
                                                                        const phone = row['Phone Number'] || '';
                                                                        const parts = phone.trim().split(' ');
                                                                        const number = parts.length > 1 ? parts.slice(1).join(' ') : (!phone.startsWith('+') ? phone : '');
                                                                        const newValue = code && number ? `${code} ${number}` : code || number;
                                                                        handleInputChange({ target: { value: newValue } }, 'Phone Number');
                                                                    }}
                                                                    style={{
                                                                        width: '50px',
                                                                        flex: '0 0 50px',
                                                                        padding: '4px 2px',
                                                                        borderRadius: '4px',
                                                                        border: fieldErrors['Phone Number'] ? '2px solid #dc2626' : '2px solid #3b82f6',
                                                                        fontSize: '12px',
                                                                        textAlign: 'center',
                                                                        boxSizing: 'border-box'
                                                                    }}
                                                                />
                                                                {/* Number Input */}
                                                                <input
                                                                    type="text"
                                                                    placeholder="Phone Number"
                                                                    onKeyPress={(e) => {
                                                                        if (!/[0-9]/.test(e.key)) {
                                                                            e.preventDefault();
                                                                        }
                                                                    }}
                                                                    value={(() => {
                                                                        const phone = row['Phone Number'] || '';
                                                                        const parts = phone.trim().split(' ');
                                                                        return parts.length > 1 ? parts.slice(1).join(' ') : (!phone.startsWith('+') ? phone : '');
                                                                    })()}
                                                                    onChange={(e) => {
                                                                        let number = e.target.value.replace(/\D/g, '');
                                                                        if (number.length > 10) return;
                                                                        const phone = row['Phone Number'] || '';
                                                                        const parts = phone.trim().split(' ');
                                                                        const code = parts.length > 1 ? parts[0] : (phone.startsWith('+') ? phone.split(' ')[0] : '');
                                                                        const newValue = code && number ? `${code} ${number}` : code || number;
                                                                        handleInputChange({ target: { value: newValue } }, 'Phone Number');
                                                                    }}
                                                                    style={{
                                                                        flex: 1,
                                                                        minWidth: 0,
                                                                        padding: '4px',
                                                                        borderRadius: '4px',
                                                                        border: fieldErrors['Phone Number'] ? '2px solid #dc2626' : '2px solid #3b82f6',
                                                                        fontSize: '12px',
                                                                        boxSizing: 'border-box'
                                                                    }}
                                                                />
                                                            </div>
                                                            {fieldErrors['Phone Number'] && (
                                                                <span style={{
                                                                    color: '#dc2626',
                                                                    fontSize: '11px',
                                                                    marginTop: '4px',
                                                                    fontWeight: '500'
                                                                }}>
                                                                    {fieldErrors['Phone Number']}
                                                                </span>
                                                            )}
                                                        </>
                                                    ) : (row['Phone Number'] || '-')}
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
                                                    flex: 1,
                                                    padding: '12px 12px',
                                                    fontSize: '13px',
                                                    color: rowTextColor,
                                                    borderRight: '1px solid #ddd',
                                                    minWidth: '100px',
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
                                        The <strong>Client Resource Upload Form</strong> is a bulk data entry tool for registering multiple client contacts at once via an Excel template, instead of adding them one by one through the Client Resource Form.
                                    </p>
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>Why is this used?</strong>
                                    <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                                        Projects with many client stakeholders benefit from bulk registration. This form lets administrators prepare client contact data in Excel and upload it in a single operation, saving significant time compared to individual form entry.
                                    </p>
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to use this page</strong>
                                    <ol style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                        <li>Click <strong>Download Template</strong> to get the Excel file with the correct column headers.</li>
                                        <li>Fill in the client contact data in the template. Do not change or remove any column headers.</li>
                                        <li>Click <strong>Upload File</strong> to load the completed template.</li>
                                        <li>Review the records in the table. Rows with validation errors are highlighted — fix them inline by clicking a cell.</li>
                                        <li>Select the records you want to submit using the checkboxes, then click <strong>Submit Selected</strong>.</li>
                                    </ol>
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>Template columns</strong>
                                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                        <li><strong>Client Name</strong> — Full name of the client contact (required, max 40 characters).</li>
                                        <li><strong>Email Address</strong> — Must be a valid and unique email address (required).</li>
                                        <li><strong>Phone Code</strong> — Country dialling code, e.g. +91 (required).</li>
                                        <li><strong>Phone Number</strong> — Must be between 8 and 10 digits (required).</li>
                                    </ul>
                                </div>

                                <div style={{ marginBottom: '4px' }}>
                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>Important notes</strong>
                                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                        <li>Only <strong>.xlsx</strong> files are accepted.</li>
                                        <li>Rows with validation errors cannot be submitted until the errors are resolved.</li>
                                        <li>Duplicate email addresses — within the upload or already in the system — will be flagged.</li>
                                        <li>A project must be selected before uploading data.</li>
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
