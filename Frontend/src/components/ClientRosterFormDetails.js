import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TextField } from '@mui/material';
import { Plus, Edit, Trash2, Save, X, MoreVertical, HelpCircle } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import DOMPurify from 'dompurify';
import { useSession } from '../context/SessionContext';

const GET_RECORDS_API = 'https://bosrx0saz3.execute-api.ap-south-1.amazonaws.com/New/api/clientRoster/getRecords';
const CREATE_API = 'https://bosrx0saz3.execute-api.ap-south-1.amazonaws.com/New/api/clientRoster/create';
const UPDATE_API = 'https://bosrx0saz3.execute-api.ap-south-1.amazonaws.com/New/api/clientRoster/update';
const GET_UNIQUE_EMAILS_API = 'https://07eirxky2f.execute-api.ap-south-1.amazonaws.com/New/api/ClientRosterForm/uniqueEmailsByProject';

const ClientRosterFormDetails = ({ onClose, selectedProject, onBackToLanding, onLogout, setUnsavedChangesChecker }) => {
    const { handleAuthError, userId } = useSession();
    const { getCachedToken } = useAuth();
    const [data, setData] = useState([]);
    const [editingItem, setEditingItem] = useState(null);
    const [editValues, setEditValues] = useState({});
    const [hasNewRow, setHasNewRow] = useState(false);

    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [showErrorMessage, setShowErrorMessage] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const [confirmMessage, setConfirmMessage] = useState('');
    const [showHelpPopup, setShowHelpPopup] = useState(false);
    const [validationErrors, setValidationErrors] = useState({});
    const [editValidationErrors, setEditValidationErrors] = useState({});
    const [selectedGrantRows, setSelectedGrantRows] = useState([]);
    const [selectedRevokeRows, setSelectedRevokeRows] = useState([]);
    const [selectAllGrant, setSelectAllGrant] = useState(false);
    const [selectAllRevoke, setSelectAllRevoke] = useState(false);
    const [uniqueEmails, setUniqueEmails] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const lastKeyRef = useRef(null);
    const newRowRef = useRef(null);

    useEffect(() => {
        if (hasNewRow && newRowRef.current) {
            newRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [hasNewRow, data.length]);

    const validateEmail = (email) => {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return emailRegex.test(email);
    };




    const fetchRecords = useCallback(async (shouldLoadMore = false) => {
        const projectId = selectedProject?.id;
        if (!projectId) return;

        setLoading(true);
        try {
            const idToken = await getCachedToken();
            const params = { Project_id: projectId };
            if (shouldLoadMore && lastKeyRef.current) {
                params.lastKey = lastKeyRef.current;
            }

            const response = await axios.get(GET_RECORDS_API, {
                params: params,
                headers: { 'Authorization': `Bearer ${idToken}` }
            });

            if (response.status === 401 || response.status === 403) {
                handleAuthError('Session expired - please login again');
                return;
            }

            if (response.data.success) {
                const fetchedData = response.data.data.map(item => ({
                    ...item,
                    id: item.Client_Roster_Form_id,
                    clientName: DOMPurify.sanitize(item.Client_name || '', { ALLOWED_TAGS: [] }),
                    clientEmail: DOMPurify.sanitize(item.Email || '', { ALLOWED_TAGS: [] }),
                    code: DOMPurify.sanitize(item.Phone_code || '', { ALLOWED_TAGS: [] }),
                    phoneNumber: DOMPurify.sanitize(item.Phone_number || '', { ALLOWED_TAGS: [] }),
                    accessStatus: DOMPurify.sanitize(item.Grant_Access || '', { ALLOWED_TAGS: [] }),
                    isSaved: true
                }));

                if (shouldLoadMore) {
                    setData(prev => {
                        const combined = [...prev, ...fetchedData];
                        return combined.sort((a, b) => {
                            const accessA = a.accessStatus === 'true' ? 1 : 0;
                            const accessB = b.accessStatus === 'true' ? 1 : 0;
                            if (accessA !== accessB) return accessA - accessB;
                            const idA = Number(a.id) || 0;
                            const idB = Number(b.id) || 0;
                            return idB - idA;
                        });
                    });
                } else {
                    setData(fetchedData.sort((a, b) => {
                        const accessA = a.accessStatus === 'true' ? 1 : 0;
                        const accessB = b.accessStatus === 'true' ? 1 : 0;
                        if (accessA !== accessB) return accessA - accessB;
                        const idA = Number(a.id) || 0;
                        const idB = Number(b.id) || 0;
                        return idB - idA;
                    }));
                }

                lastKeyRef.current = response.data.lastKey || null;
                setHasMore(response.data.hasMore || false);
            }

            // Only fetch unique emails on initial load
            if (!shouldLoadMore) {
                try {
                    const idToken = await getCachedToken();
                    const emailResponse = await axios.get(GET_UNIQUE_EMAILS_API, {
                        params: { project_id: projectId },
                        headers: { 'Authorization': `Bearer ${idToken}` }
                    });
                    if (emailResponse.data.success) {
                        setUniqueEmails(emailResponse.data.emails || []);
                    }
                } catch (err) {
                    console.error('Error fetching unique emails:', err);
                }
            }
        } catch (error) {
            console.error('Error fetching records:', error);
            if (error.response?.status === 401 || error.response?.status === 403) {
                handleAuthError('Session expired - please login again');
            } else {
                setErrorMessage(DOMPurify.sanitize('Failed to fetch records.', { ALLOWED_TAGS: [] }));
                setShowErrorMessage(true);
                setTimeout(() => setShowErrorMessage(false), 3000);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    const persistData = (newData) => {
        setData(newData);
    };

    const showConfirmation = (message, action) => {
        setConfirmMessage(message);
        setConfirmAction(() => action);
        setShowConfirmDialog(true);
    };

    const handleConfirmYes = () => {
        if (confirmAction) confirmAction();
        setShowConfirmDialog(false);
        setConfirmAction(null);
        setConfirmMessage('');
    };

    const handleConfirmCancel = () => {
        setShowConfirmDialog(false);
        setConfirmAction(null);
        setConfirmMessage('');
    };

    const handleGrantAccess = () => {
        if (selectedGrantRows.length === 0) {
            setErrorMessage('Please select at least one record to grant access.');
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 3000);
            return;
        }

        const GRANT_ACCESS_API = 'https://bosrx0saz3.execute-api.ap-south-1.amazonaws.com/New/api/clientRoster/grant-access';
        const ASSIGN_USER_API = 'https://gl5xaesjob.execute-api.ap-south-1.amazonaws.com/New/api/admin/client/assign-user-to-project';
        const SEND_EMAIL_API = 'https://gl5xaesjob.execute-api.ap-south-1.amazonaws.com/New/notifications/client/send-assignment-email';

        const executeGrantAccess = async () => {
            const projectId = selectedProject?.id;
            const selectedRecords = selectedGrantRows.map(index => data[index]);
            setLoading(true);
            try {
                const idToken = await getCachedToken();
                const headers = { 'Authorization': `Bearer ${idToken}` };

                // 1. Run the Assign User API first
                const assignResults = await Promise.allSettled(
                    selectedRecords.map(r =>
                        axios.post(ASSIGN_USER_API, {
                            email: r.clientEmail || r.Email,
                            name: r.clientName || r.Client_name || '',
                            project_id: projectId
                        }, { headers })
                    )
                );

                // 2. Send emails asynchronously for successes and duplicates (409)
                assignResults.forEach((res, index) => {
                    const r = selectedRecords[index];
                    const email = r.clientEmail || r.Email;
                    const name = r.clientName || r.Client_name || '';
                    
                    const isSuccess = res.status === 'fulfilled' && res.value?.data?.success;
                    const isDuplicate = res.status === 'rejected' && res.reason?.response?.status === 409;

                    if (isSuccess || isDuplicate) {
                        const backendData = (isSuccess && res.value.data.data) ? res.value.data.data : {};
                        
                        axios.post(SEND_EMAIL_API, {
                            email: email,
                            name: name,
                            project_id: projectId,
                            project_name: backendData.project_name || selectedProject?.Project_Name || selectedProject?.name || '',
                            company_name: backendData.company_name || selectedProject?.Legal_Company_Name || '',
                            is_new_user: backendData.is_new_user || false,
                            token: backendData.token || null
                        }, { headers }).catch(err => console.error("Error sending assignment email:", err));
                    }
                });

                // 3. Check for hard failures (non-409)
                const hasHardFailures = assignResults.some(res => {
                    if (res.status === 'rejected') {
                        if (res.reason?.response?.status === 409) return false; // Duplicate error is okay
                        return true;
                    }
                    if (res.status === 'fulfilled' && !res.value?.data?.success) {
                        return true;
                    }
                    return false;
                });

                if (hasHardFailures) {
                    setErrorMessage(DOMPurify.sanitize('Failed to update project access. Database flag update aborted.', { ALLOWED_TAGS: [] }));
                    setShowErrorMessage(true);
                    setTimeout(() => setShowErrorMessage(false), 3000);
                    return;
                }

                // 3. Update the Flag API
                const grantResult = await axios.post(GRANT_ACCESS_API, {
                    records: selectedRecords.map(r => ({
                        id: r.id || r.Client_Roster_Form_id,
                        Email: r.clientEmail || r.Email,
                        Project_id: projectId,
                        Client_name: r.clientName || r.Client_name || ''
                    })),
                    updated_by: userId
                }, { headers });

                if (grantResult.data.success) {
                    fetchRecords();
                    const count = selectedGrantRows.length;
                    const successMsg = `Access granted for ${count} ${count === 1 ? 'record' : 'records'}`;
                    setSuccessMessage(DOMPurify.sanitize(successMsg, { ALLOWED_TAGS: [] }));
                    setShowSuccessMessage(true);
                    setTimeout(() => setShowSuccessMessage(false), 3000);
                } else {
                    setErrorMessage(DOMPurify.sanitize('Failed to grant access flag.', { ALLOWED_TAGS: [] }));
                    setShowErrorMessage(true);
                    setTimeout(() => setShowErrorMessage(false), 3000);
                }
            } catch (error) {
                console.error('Error granting access:', error);
                const errorMsg = error.response?.data?.message || 'Failed to grant access.';
                if (error.response?.status === 401 || error.response?.status === 403) {
                    handleAuthError('Session expired - please login again');
                } else {
                    setErrorMessage(DOMPurify.sanitize(errorMsg, { ALLOWED_TAGS: [] }));
                    setShowErrorMessage(true);
                    setTimeout(() => setShowErrorMessage(false), 3000);
                }
            } finally {
                setLoading(false);
            }

            setSelectedGrantRows([]);
            setSelectAllGrant(false);
        };

        const recordText = selectedGrantRows.length === 1 ? 'record' : 'records';
        showConfirmation(
            `Are you sure you want to grant access to the ${selectedGrantRows.length} selected ${recordText}?`,
            executeGrantAccess
        );
    };

    const handleRevokeAccess = () => {
        if (selectedRevokeRows.length === 0) {
            setErrorMessage('Please select at least one record to revoke access.');
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 3000);
            return;
        }

        const REVOKE_ACCESS_API = 'https://bosrx0saz3.execute-api.ap-south-1.amazonaws.com/New/api/clientRoster/revoke-access';
        const REMOVE_USER_API = 'https://gl5xaesjob.execute-api.ap-south-1.amazonaws.com/New/api/admin/client/remove-user-access';
        const SEND_REMOVE_EMAIL_API = 'https://gl5xaesjob.execute-api.ap-south-1.amazonaws.com/New/notifications/client/send-removal-email';

        const executeRevokeAccess = async () => {
            const projectId = selectedProject?.id;
            const selectedRecords = selectedRevokeRows.map(index => data[index]);
            const emails = selectedRecords.map(r => r.clientEmail || r.Email);
            setLoading(true);
            try {
                const idToken = await getCachedToken();
                const headers = { 'Authorization': `Bearer ${idToken}` };

                // 1. Run the Remove User API first
                const removeResults = await Promise.allSettled(
                    emails.map(email =>
                        axios.post(REMOVE_USER_API, {
                            email: email,
                            project_id: projectId
                        }, { headers })
                    )
                );

                // 2. Send emails asynchronously for successes and duplicates (404)
                removeResults.forEach((res, index) => {
                    const r = selectedRecords[index];
                    const email = r.clientEmail || r.Email;
                    const name = r.clientName || r.Client_name || '';

                    const isSuccess = res.status === 'fulfilled' && res.value?.data?.success;
                    const isDuplicate = res.status === 'rejected' && res.reason?.response?.status === 404;

                    if (isSuccess || isDuplicate) {
                        const backendData = (isSuccess && res.value.data.data) ? res.value.data.data : {};
                        
                        axios.post(SEND_REMOVE_EMAIL_API, {
                            email: email,
                            userName: backendData.userName || name,
                            projectName: backendData.projectName || selectedProject?.Project_Name || selectedProject?.name || '',
                            companyName: backendData.companyName || selectedProject?.Legal_Company_Name || ''
                        }, { headers }).catch(err => console.error("Error sending removal email:", err));
                    }
                });

                // 3. Check for hard failures (non-404/409 duplicate)
                const hasHardFailures = removeResults.some(res => {
                    if (res.status === 'rejected') {
                        // 404 Not Found is okay for removing, 409 is also okay
                        const status = res.reason?.response?.status;
                        if (status === 409 || status === 404) return false;
                        return true;
                    }
                    if (res.status === 'fulfilled' && !res.value?.data?.success) {
                        return true;
                    }
                    return false;
                });

                if (hasHardFailures) {
                    setErrorMessage(DOMPurify.sanitize('Failed to revoke project access via API. Database update aborted.', { ALLOWED_TAGS: [] }));
                    setShowErrorMessage(true);
                    setTimeout(() => setShowErrorMessage(false), 3000);
                    return;
                }

                // 3. Update the Flag API
                const revokeResult = await axios.post(REVOKE_ACCESS_API, {
                    records: selectedRecords.map(r => ({
                        id: r.id || r.Client_Roster_Form_id,
                        Email: r.clientEmail || r.Email,
                        Project_id: projectId,
                        Client_name: r.clientName || r.Client_name || ''
                    })),
                    updated_by: userId
                }, { headers });

                if (revokeResult.data.success) {
                    fetchRecords();
                    const count = selectedRevokeRows.length;
                    const successMsg = `Access revoked for ${count} ${count === 1 ? 'record' : 'records'}`;
                    setSuccessMessage(DOMPurify.sanitize(successMsg, { ALLOWED_TAGS: [] }));
                    setShowSuccessMessage(true);
                    setTimeout(() => setShowSuccessMessage(false), 3000);
                } else {
                    setErrorMessage(DOMPurify.sanitize('Failed to revoke access flag.', { ALLOWED_TAGS: [] }));
                    setShowErrorMessage(true);
                    setTimeout(() => setShowErrorMessage(false), 3000);
                }
            } catch (error) {
                console.error('Error revoking access:', error);
                const errorMsg = error.response?.data?.message || 'Failed to revoke access.';
                if (error.response?.status === 401 || error.response?.status === 403) {
                    handleAuthError('Session expired - please login again');
                } else {
                    setErrorMessage(DOMPurify.sanitize(errorMsg, { ALLOWED_TAGS: [] }));
                    setShowErrorMessage(true);
                    setTimeout(() => setShowErrorMessage(false), 3000);
                }
            } finally {
                setLoading(false);
            }

            setSelectedRevokeRows([]);
            setSelectAllRevoke(false);
        };

        const recordText = selectedRevokeRows.length === 1 ? 'record' : 'records';
        showConfirmation(
            `Are you sure you want to revoke access for the ${selectedRevokeRows.length} selected ${recordText}?`,
            executeRevokeAccess
        );
    };

    const handleAddRow = () => {
        const hasEditingItem = editingItem !== null;
        const hasUnsavedRow = data.some(row => !row.isSaved);

        if (!hasEditingItem && !hasUnsavedRow) {
            addNewRow();
            return;
        }

        setValidationErrors({});
        setEditValidationErrors({});

        let updatedCount = 0;
        let addedCount = 0;
        let editSaveInfo = { success: false, errors: false };
        let newRowSaveInfo = { success: false, errors: false, errorCount: 0 };
        const unsavedRows = hasUnsavedRow ? data.filter(row => !row.isSaved) : [];

        const runSaves = async () => {
            if (hasEditingItem) {
                editSaveInfo = await handleSaveEdit(editingItem, true);
                if (editSaveInfo.success) updatedCount = 1;
            }

            if (hasUnsavedRow) {
                newRowSaveInfo = await handleSaveNewRow(true);
                if (newRowSaveInfo.success) addedCount = newRowSaveInfo.successCount;
            }

            let messageText = '';
            let isSuccess = false;

            const hasEditErrors = editSaveInfo.errors;
            const hasNewRowErrors = newRowSaveInfo.errors;
            const newRowsWithErrors = newRowSaveInfo.errorCount;

            if (editSaveInfo.success && newRowSaveInfo.success && addedCount > 0 && updatedCount > 0) {
                messageText = `${addedCount} Client ${addedCount === 1 ? 'Detail' : 'Details'} added and ${updatedCount} record updated successfully!`;
                isSuccess = true;
            } else if (editSaveInfo.success && updatedCount > 0 && !hasUnsavedRow) {
                messageText = 'Client roster form updated successfully!';
                isSuccess = true;
            } else if (editSaveInfo.success && updatedCount > 0 && !newRowSaveInfo.success) {
                // const newDuplicates = Object.values(newRowSaveInfo.rawErrors || {}).some(e => Object.values(e).includes('Duplicate email'));
                if (hasNewRowErrors) {
                    messageText = `${updatedCount} record updated successfully! But ${newRowsWithErrors} new ${newRowsWithErrors === 1 ? 'record has' : 'records have'} missing required fields. Please fill in all required fields and try again.`;
                } else {
                    messageText = `${updatedCount} record updated successfully! But ${unsavedRows.length} new ${unsavedRows.length === 1 ? 'record' : 'records'} failed. Please fix the errors and try again.`;
                }
                isSuccess = false;
            } else if (newRowSaveInfo.success && addedCount > 0 && !hasEditingItem) {
                messageText = `${addedCount} Client ${addedCount === 1 ? 'Detail' : 'Details'} added successfully!`;
                isSuccess = true;
            } else if (newRowSaveInfo.success && addedCount > 0 && hasEditingItem && !editSaveInfo.success) {
                // const editDuplicates = Object.values(editSaveInfo.rawErrors || {}).includes('Duplicate email');
                if (hasEditErrors) {
                    messageText = `${addedCount} Client ${addedCount === 1 ? 'Detail' : 'Details'} added successfully! But 1 record has missing required fields. Please fill in all required fields and try again.`;
                } else {
                    messageText = `${addedCount} Client ${addedCount === 1 ? 'Detail' : 'Details'} added successfully! But 1 record update failed. Please fix the errors and try again.`;
                }
                isSuccess = false;
            } else if (hasUnsavedRow && !hasEditingItem && !newRowSaveInfo.success) {
                // const hasDuplicates = Object.values(newRowSaveInfo.rawErrors || {}).some(e => Object.values(e).includes('Duplicate email'));
                messageText = hasNewRowErrors ? 'The required fields are missing' : 'Save failed. Please try again.';
                isSuccess = false;
            } else if (hasEditingItem && !hasUnsavedRow && !editSaveInfo.success) {
                // const hasDuplicates = Object.values(editSaveInfo.rawErrors || {}).includes('Duplicate email');
                messageText = hasEditErrors ? 'The required fields are missing.' : 'Save failed. Please try again.';
                isSuccess = false;
            } else if (hasEditingItem && hasUnsavedRow && !editSaveInfo.success && !newRowSaveInfo.success) {
                // const editDuplicates = Object.values(editSaveInfo.rawErrors || {}).includes('Duplicate email');
                // const newDuplicates = Object.values(newRowSaveInfo.rawErrors || {}).some(e => Object.values(e).includes('Duplicate email'));

                if (hasEditErrors && hasNewRowErrors) {
                    messageText = `1 record has missing required fields and ${newRowsWithErrors} new ${newRowsWithErrors === 1 ? 'record has' : 'records have'} missing required fields. Please fill in all required fields and try again.`;
                } else if (hasEditErrors) {
                    messageText = `1 record has missing required fields and ${unsavedRows.length} new ${unsavedRows.length === 1 ? 'record' : 'records'} failed. Please fix the errors and try again.`;
                } else if (hasNewRowErrors) {
                    messageText = `1 record update failed and ${newRowsWithErrors} new ${newRowsWithErrors === 1 ? 'record has' : 'records have'} missing required fields. Please fix the errors and try again.`;
                } else {
                    messageText = `1 record update failed and ${unsavedRows.length} new ${unsavedRows.length === 1 ? 'record' : 'records'} failed. Please fix the errors and try again.`;
                }
                isSuccess = false;
            }

            if (messageText) {
                if (isSuccess) {
                    setValidationErrors({});
                    setEditValidationErrors({});
                    setSuccessMessage(messageText);
                    setShowSuccessMessage(true);
                    setTimeout(() => setShowSuccessMessage(false), 4000);
                } else {
                    // Update error message to handle invalid email specifically if needed
                    const allErrors = { ...(editSaveInfo.rawErrors || {}), ...Object.assign({}, ...Object.values(newRowSaveInfo.rawErrors || {})) };
                    if (Object.values(allErrors).includes('Invalid email')) {
                        messageText = 'One or more emails are invalid. Please check and try again.';
                    }
                    setErrorMessage(messageText);
                    setShowErrorMessage(true);
                    setTimeout(() => setShowErrorMessage(false), 3000);
                }
            }
        };

        runSaves();
    };

    const addNewRow = () => {
        const newId = data.length > 0 ? Math.max(...data.map(item => item.id)) + 1 : 1;
        const newRow = {
            id: newId,
            clientName: '',
            clientEmail: '',
            code: '',
            phoneNumber: '',
            accessStatus: '',
            isSaved: false
        };
        setData([...data, newRow]);
        setHasNewRow(true);
    };

    const handleFieldChange = (fieldName, value, isEdit = false, index = null) => {
        let processedValue = value;

        // Auto-capitalize first character and limit Client Name to 40 characters
        if (fieldName === 'clientName' && value.length > 0) {
            processedValue = (value.charAt(0).toUpperCase() + value.slice(1)).slice(0, 40);

            // Show error immediately when user tries to exceed 40 characters
            if (value.length > 40) {
                if (isEdit) {
                    setEditValidationErrors(prev => ({ ...prev, clientName: 'Maximum 40 characters' }));
                } else {
                    const rowId = data[index].id;
                    setValidationErrors(prev => ({
                        ...prev,
                        [rowId]: { ...prev[rowId], clientName: 'Maximum 40 characters' }
                    }));
                }
            } else if (isEdit) {
                // Clear error if they backspace below the limit
                if (editValidationErrors.clientName === 'Maximum 40 characters') {
                    setEditValidationErrors(prev => ({ ...prev, clientName: undefined }));
                }
            } else {
                const rowId = data[index].id;
                if (validationErrors[rowId]?.clientName === 'Maximum 40 characters') {
                    setValidationErrors(prev => ({
                        ...prev,
                        [rowId]: { ...prev[rowId], clientName: undefined }
                    }));
                }
            }
        }

        // Only allow numbers for phone code and phone number
        if (fieldName === 'code') {
            const digits = value.replace(/[^0-9]/g, '').slice(0, 3);
            processedValue = digits.length > 0 ? `+${digits}` : '';
        } else if (fieldName === 'phoneNumber') {
            const numbersOnly = value.replace(/[^0-9]/g, '');
            // Limit to 10 characters
            processedValue = numbersOnly.slice(0, 10);

            // If user tried to type more than 10, show error immediately
            if (numbersOnly.length > 10) {
                if (isEdit) {
                    setEditValidationErrors(prev => ({ ...prev, phoneNumber: 'Maximum 10 digits' }));
                } else {
                    const rowId = data[index].id;
                    setValidationErrors(prev => ({
                        ...prev,
                        [rowId]: { ...prev[rowId], phoneNumber: 'Maximum 10 digits' }
                    }));
                }
            } else if (isEdit) {
                // Clear "Maximum" error if they deleted characters
                if (editValidationErrors.phoneNumber === 'Maximum 10 digits') {
                    setEditValidationErrors(prev => ({ ...prev, phoneNumber: undefined }));
                }
            } else {
                const rowId = data[index].id;
                if (validationErrors[rowId]?.phoneNumber === 'Maximum 10 digits') {
                    setValidationErrors(prev => ({
                        ...prev,
                        [rowId]: { ...prev[rowId], phoneNumber: undefined }
                    }));
                }
            }
        }

        if (isEdit) {
            setEditValues({ ...editValues, [fieldName]: processedValue });
            // Clear other errors while typing (except for the Max 10 digits we just set)
            if (editValidationErrors[fieldName] && editValidationErrors[fieldName] !== 'Maximum 10 digits') {
                setEditValidationErrors(prev => ({ ...prev, [fieldName]: undefined }));
            }

            // Real-time duplicate email check for edits (COMMENTED OUT)
            // if (fieldName === 'clientEmail' && processedValue) {
            //     const isDuplicate = uniqueEmails.some(email =>
            //         email.toLowerCase() === processedValue.trim().toLowerCase() &&
            //         email.toLowerCase() !== data.find(item => item.id === editingItem)?.clientEmail?.toLowerCase()
            //     );
            //     if (isDuplicate) {
            //         setEditValidationErrors(prev => ({ ...prev, clientEmail: 'Duplicate email' }));
            //     }
            // }
        } else {
            const newData = [...data];
            newData[index][fieldName] = processedValue;
            setData(newData);
            // Clear other errors while typing
            const rowId = newData[index].id;
            if (validationErrors[rowId]?.[fieldName] && validationErrors[rowId][fieldName] !== 'Maximum 10 digits') {
                setValidationErrors(prev => ({
                    ...prev,
                    [rowId]: { ...prev[rowId], [fieldName]: undefined }
                }));
            }

            // Real-time duplicate email check for new rows (COMMENTED OUT)
            // if (fieldName === 'clientEmail' && processedValue) {
            //     const lowerValue = processedValue.trim().toLowerCase();
            //     const isDuplicateInDB = uniqueEmails.some(email => email.toLowerCase() === lowerValue);
            //     const isDuplicateInOtherRows = data.some((row, i) => i !== index && !row.isSaved && row.clientEmail?.trim().toLowerCase() === lowerValue);
            //
            //     if (isDuplicateInDB || isDuplicateInOtherRows) {
            //         setValidationErrors(prev => ({
            //             ...prev,
            //             [rowId]: { ...prev[rowId], clientEmail: 'Duplicate email' }
            //         }));
            //     }
            // }
        }
    };

    const handleBlur = (fieldName, value, id, isEdit = false) => {
        if (fieldName === 'phoneNumber') {
            let error = '';
            if (!value || value.trim() === '') {
                error = 'Required';
            } else if (value.length < 8) {
                error = 'Minimum 8 digits';
            } else if (value.length > 10) {
                // This shouldn't normally happen with the slice, but keep for safety
                error = 'Maximum 10 digits';
            }

            if (isEdit) {
                setEditValidationErrors(prev => ({ ...prev, phoneNumber: error || undefined }));
            } else {
                setValidationErrors(prev => ({
                    ...prev,
                    [id]: { ...prev[id], phoneNumber: error || undefined }
                }));
            }
        }

        if (fieldName === 'clientEmail') {
            let error = '';
            const lowerValue = value?.trim().toLowerCase();
            if (!value || value.trim() === '') {
                error = 'Required';
            } else if (!validateEmail(value.trim())) {
                error = 'Invalid email';
            } else {
                // Duplicate email check (COMMENTED OUT)
                // const isDuplicateInDB = uniqueEmails.some(email => email.toLowerCase() === lowerValue);
                // if (isEdit) {
                //     const originalEmail = data.find(item => item.id === id)?.clientEmail?.toLowerCase();
                //     if (isDuplicateInDB && lowerValue !== originalEmail) {
                //         error = 'Duplicate email';
                //     }
                // } else {
                //     const isDuplicateInOtherRows = data.some(row => row.id !== id && !row.isSaved && row.clientEmail?.trim().toLowerCase() === lowerValue);
                //     if (isDuplicateInDB || isDuplicateInOtherRows) {
                //         error = 'Duplicate email';
                //     }
                // }
            }

            if (isEdit) {
                setEditValidationErrors(prev => ({ ...prev, clientEmail: error || undefined }));
            } else {
                setValidationErrors(prev => ({
                    ...prev,
                    [id]: { ...prev[id], clientEmail: error || undefined }
                }));
            }
        }

        if (fieldName === 'clientName') {
            if (isEdit) {
                if (editValidationErrors.clientName === 'Maximum 40 characters') {
                    setEditValidationErrors(prev => ({ ...prev, clientName: undefined }));
                }
                if (!value || value.trim() === '') {
                    setEditValidationErrors(prev => ({ ...prev, clientName: 'Required' }));
                }
            } else {
                if (validationErrors[id]?.clientName === 'Maximum 40 characters') {
                    setValidationErrors(prev => ({
                        ...prev,
                        [id]: { ...prev[id], clientName: undefined }
                    }));
                }
                if (!value || value.trim() === '') {
                    setValidationErrors(prev => ({
                        ...prev,
                        [id]: { ...prev[id], clientName: 'Required' }
                    }));
                }
            }
        }
    };

    const handleSaveNewRow = async (suppressMessage = false) => {
        const unsavedRows = data.filter(row => !row.isSaved);
        if (unsavedRows.length === 0) return { success: true, errors: false, errorCount: 0 };

        let hasErrors = false;
        const errors = {};

        unsavedRows.forEach((row) => {
            const rowErrors = {};
            if (!row.clientName || row.clientName.trim() === '') rowErrors.clientName = true;

            const lowerEmail = row.clientEmail?.trim().toLowerCase();
            if (!row.clientEmail || row.clientEmail.trim() === '') {
                rowErrors.clientEmail = 'Required';
            } else if (!validateEmail(row.clientEmail.trim())) {
                rowErrors.clientEmail = 'Invalid email';
            } else {
                // Duplicate email check in save new row (COMMENTED OUT)
                // const isDuplicateInDB = uniqueEmails.some(email => email.toLowerCase() === lowerEmail);
                // const isDuplicateInOtherRows = unsavedRows.some(otherRow => otherRow.id !== row.id && otherRow.clientEmail?.trim().toLowerCase() === lowerEmail);
                // if (isDuplicateInDB || isDuplicateInOtherRows) {
                //     rowErrors.clientEmail = 'Duplicate email';
                // }
            }

            if (!row.code || row.code.trim() === '') rowErrors.code = true;
            if (!row.phoneNumber || row.phoneNumber.trim() === '') {
                rowErrors.phoneNumber = 'Required';
            } else if (row.phoneNumber.length < 8) {
                rowErrors.phoneNumber = 'Minimum 8 digits';
            } else if (row.phoneNumber.length > 10) {
                rowErrors.phoneNumber = 'Maximum 10 digits';
            }

            if (Object.keys(rowErrors).length > 0) {
                hasErrors = true;
                errors[row.id] = rowErrors;
            }
        });

        if (hasErrors) {
            setValidationErrors(errors);
            if (!suppressMessage) {
                // const hasDuplicates = Object.values(errors).some(rowErr => Object.values(rowErr).includes('Duplicate email'));
                setErrorMessage('The required fields are missing.');
                setShowErrorMessage(true);
                setTimeout(() => setShowErrorMessage(false), 3000);
            }
            return { success: false, errors: true, errorCount: Object.keys(errors).length, rawErrors: errors };
        }

        const projectId = selectedProject?.id;
        let successCount = 0;
        let errorCount = 0;

        setLoading(true);
        const skippedRecords = [];

        try {
            for (const row of unsavedRows) {
                const createPayload = {
                    Project_id: projectId,
                    Client_name: row.clientName,
                    Email: row.clientEmail,
                    Phone_code: row.code,
                    Phone_number: row.phoneNumber,
                    Grant_Access: "false",
                    Created_by: userId,
                    Updated_by: userId
                };

                try {
                    const idToken = await getCachedToken();
                    const response = await axios.post(CREATE_API, createPayload, {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${idToken}`
                        }
                    });

                    if (response.status === 401 || response.status === 403) {
                        handleAuthError('Session expired - please login again');
                        return;
                    }

                    if (response.data.success) {
                        successCount++;
                    } else {
                        errorCount++;
                    }
                } catch (err) {
                    if (err.response?.status === 401 || err.response?.status === 403) {
                        handleAuthError('Session expired - please login again');
                        return;
                    } else if (err.response && err.response.status === 409) {
                        skippedRecords.push(row.clientEmail);
                    } else {
                        console.error('Error creating record:', err);
                        errorCount++;
                    }
                }
            }

            if (skippedRecords.length > 0) {
                const skipEmails = skippedRecords.join(', ');
                setErrorMessage(`Note: ${skippedRecords.length} records were skipped: ${skipEmails}`);
                setShowErrorMessage(true);
                setTimeout(() => setShowErrorMessage(false), 6000);
            }
        } finally {
            setLoading(false);
        }

        if (successCount > 0) {
            fetchRecords();
            setHasNewRow(false);
            setValidationErrors({});
            if (!suppressMessage) {
                const successMsg = `${successCount} Client ${successCount === 1 ? 'Detail' : 'Details'} added successfully!`;
                setSuccessMessage(DOMPurify.sanitize(successMsg, { ALLOWED_TAGS: [] }));
                setShowSuccessMessage(true);
                setTimeout(() => setShowSuccessMessage(false), 3000);
            }
        }

        if (errorCount > 0) {
            if (!suppressMessage) {
                const errorMsg = `Failed to save ${errorCount} ${errorCount === 1 ? 'record' : 'records'}.`;
                setErrorMessage(DOMPurify.sanitize(errorMsg, { ALLOWED_TAGS: [] }));
                setShowErrorMessage(true);
                setTimeout(() => setShowErrorMessage(false), 3000);
            }
            return { success: false, errors: false, errorCount: errorCount, successCount: successCount };
        }

        return { success: true, errors: false, errorCount: 0, successCount: successCount };
    };

    const handleEdit = (id) => {
        const item = data.find(d => d.id === id);
        if (item) {
            if (editingItem !== null && editingItem !== id) {
                showConfirmation(
                    'You have unsaved changes. Do you want to continue?',
                    () => {
                        setEditingItem(id);
                        setEditValues({ ...item });
                    }
                );
            } else if (hasNewRow) {
                showConfirmation(
                    'You have unsaved changes. Do you want to continue?',
                    () => {
                        const savedData = data.filter(row => row.isSaved);
                        setData(savedData);
                        setHasNewRow(false);
                        setValidationErrors({});
                        setEditingItem(id);
                        setEditValues({ ...item });
                    }
                );
            } else {
                setEditingItem(id);
                setEditValues({ ...item });
            }
        }
    };

    const handleSaveEdit = async (id, suppressMessage = false) => {
        const rowErrors = {};
        if (!editValues.clientName || editValues.clientName.trim() === '') rowErrors.clientName = true;
        const lowerEmail = editValues.clientEmail?.trim().toLowerCase();
        if (!editValues.clientEmail || editValues.clientEmail.trim() === '') {
            rowErrors.clientEmail = 'Required';
        } else if (!validateEmail(editValues.clientEmail.trim())) {
            rowErrors.clientEmail = 'Invalid email';
        } else {
            // Duplicate email check in save edit (COMMENTED OUT)
            // const isDuplicate = uniqueEmails.some(email =>
            //     email.toLowerCase() === lowerEmail &&
            //     email.toLowerCase() !== data.find(item => item.id === id)?.clientEmail?.toLowerCase()
            // );
            // if (isDuplicate) {
            //     rowErrors.clientEmail = 'Duplicate email';
            // }
        }
        if (!editValues.code || editValues.code.trim() === '') rowErrors.code = true;
        if (!editValues.phoneNumber || editValues.phoneNumber.trim() === '') {
            rowErrors.phoneNumber = 'Required';
        } else if (editValues.phoneNumber.length < 8) {
            rowErrors.phoneNumber = 'Minimum 8 digits';
        } else if (editValues.phoneNumber.length > 10) {
            rowErrors.phoneNumber = 'Maximum 10 digits';
        }
        if (!editValues.accessStatus || editValues.accessStatus === '') rowErrors.accessStatus = true;

        if (Object.keys(rowErrors).length > 0) {
            setEditValidationErrors(rowErrors);
            if (!suppressMessage) {
                // const isDuplicate = Object.values(rowErrors).includes('Duplicate email');
                setErrorMessage('The required fields are missing.');
                setShowErrorMessage(true);
                setTimeout(() => setShowErrorMessage(false), 3000);
            }
            return { success: false, errors: true, rawErrors: rowErrors };
        }

        const userIdValue = userId;
        setLoading(true);
        try {
            const idToken = await getCachedToken();
            const response = await axios.post(UPDATE_API, {
                Client_Roster_Form_id: id,
                Client_name: editValues.clientName,
                Email: editValues.clientEmail,
                Phone_code: editValues.code,
                Phone_number: editValues.phoneNumber,
                Updated_by: userIdValue
            }, {
                headers: { 'Authorization': `Bearer ${idToken}` }
            });

            if (response.status === 401 || response.status === 403) {
                handleAuthError('Session expired - please login again');
                return;
            }

            if (response.data.success) {
                fetchRecords();
                setEditingItem(null);
                setEditValues({});
                setEditValidationErrors({});

                if (!suppressMessage) {
                    setSuccessMessage(DOMPurify.sanitize('Client roster form updated successfully!', { ALLOWED_TAGS: [] }));
                    setShowSuccessMessage(true);
                    setTimeout(() => setShowSuccessMessage(false), 3000);
                }
                return { success: true, errors: false, successCount: 1 };
            } else {
                if (!suppressMessage) {
                    setErrorMessage('Update failed.');
                    setShowErrorMessage(true);
                    setTimeout(() => setShowErrorMessage(false), 3000);
                }
                return { success: false, errors: false, successCount: 0 };
            }
        } catch (error) {
            console.error('Error updating record:', error);
            if (!suppressMessage) {
                if (error.response && error.response.status === 409) {
                    setErrorMessage('Update failed. A conflict occurred.');
                } else {
                    setErrorMessage('Update failed.');
                }
                setShowErrorMessage(true);
                setTimeout(() => setShowErrorMessage(false), 3000);
            }
            return { success: false, errors: false, successCount: 0 };
        } finally {
            setLoading(false);
        }
    };

    const handleCancelEdit = () => {
        setEditingItem(null);
        setEditValues({});
        setEditValidationErrors({});
    };

    const handleDelete = (id) => {
        const item = data.find(d => d.id === id);
        if (item) {
            if (!item.isSaved) {
                setHasNewRow(false);
                const newData = data.filter(d => d.id !== id);
                setData(newData);
                const newErrors = { ...validationErrors };
                delete newErrors[id];
                setValidationErrors(newErrors);
            } else {
                showConfirmation('Are you sure you want to delete this record?', async () => {
                    const DELETE_API = `http://localhost:6102/api/clientRoster/delete?id=${id}`;
                    setLoading(true);
                    try {
                        const idToken = await getCachedToken();
                        const response = await axios.delete(DELETE_API, {
                            headers: { 'Authorization': `Bearer ${idToken}` }
                        });
                        if (response.data.success) {
                            const newData = data.filter(d => d.id !== id);
                            setData(newData);
                            setSuccessMessage(DOMPurify.sanitize('Client roster form deleted successfully!', { ALLOWED_TAGS: [] }));
                            setShowSuccessMessage(true);
                            setTimeout(() => setShowSuccessMessage(false), 3000);
                        } else {
                            setErrorMessage(DOMPurify.sanitize('Failed to delete record.', { ALLOWED_TAGS: [] }));
                            setShowErrorMessage(true);
                            setTimeout(() => setShowErrorMessage(false), 3000);
                        }
                    } catch (error) {
                        console.error('Error deleting record:', error);
                        const errorMsg = error.response?.data?.message || 'Failed to delete record.';
                        if (error.response?.status === 401 || error.response?.status === 403) {
                            handleAuthError('Session expired - please login again');
                        } else {
                            setErrorMessage(DOMPurify.sanitize(errorMsg, { ALLOWED_TAGS: [] }));
                            setShowErrorMessage(true);
                            setTimeout(() => setShowErrorMessage(false), 3000);
                        }
                    } finally {
                        setLoading(false);
                    }
                });
            }
        }
    };

    const checkUnsavedChanges = useCallback(() => {
        return hasNewRow || editingItem !== null;
    }, [hasNewRow, editingItem]);

    useEffect(() => {
        if (setUnsavedChangesChecker) {
            setUnsavedChangesChecker(() => checkUnsavedChanges);
        }
    }, [checkUnsavedChanges, setUnsavedChangesChecker]);

    return (
        <div className="config-main" style={{ minHeight: '80vh' }}>
            <div style={{ padding: '2rem 2rem 1rem 2rem' }}>
                <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project : <span style={{ color: '#007bff' }}>{selectedProject?.name}</span></h3>
            </div>
            <div className="config-header" style={{ marginTop: '0', display: 'flex', justifyContent: 'flex-start', alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>
                <div style={{ flex: '0 0 60%', display: 'flex', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, color: '#333' }}>Client Resource Form</h2>
                </div>
                <div style={{ flex: '0 0 10%', display: 'flex', justifyContent: 'center' }}>
                    <button
                        onClick={() => setShowHelpPopup(true)}
                        style={{ backgroundColor: '#4D5C74', color: 'white', border: 'none', padding: '6px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px', transition: 'background-color 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3b4b5e'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4D5C74'}
                    >
                        <HelpCircle size={15} />
                        Help
                    </button>
                </div>
                <div style={{ flex: '0 0 15%', display: 'flex', justifyContent: 'center' }}>
                    <button
                        onClick={handleGrantAccess}
                        style={{ backgroundColor: '#28a745', color: 'white', border: 'none', padding: '6px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap', transition: 'background-color 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#218838'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#28a745'}
                    >
                        Grant Access{selectedGrantRows.length > 0 ? ` (${selectedGrantRows.length})` : ''}
                    </button>
                </div>
                <div style={{ flex: '0 0 15%', display: 'flex', justifyContent: 'center' }}>
                    <button
                        onClick={handleRevokeAccess}
                        style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '6px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap', transition: 'background-color 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
                    >
                        Revoke Access{selectedRevokeRows.length > 0 ? ` (${selectedRevokeRows.length})` : ''}
                    </button>
                </div>
            </div>

            {showSuccessMessage && (
                <div style={{
                    position: 'fixed', top: '20px', right: '20px', backgroundColor: '#10b981', color: 'white',
                    padding: '12px 20px', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 1000, fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                    {successMessage}
                </div>
            )}

            {showErrorMessage && (
                <div style={{
                    position: 'fixed', top: '20px', right: '20px', backgroundColor: '#ef4444', color: 'white',
                    padding: '12px 20px', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 1000, fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '400px', wordWrap: 'break-word'
                }}>
                    {errorMessage}
                </div>
            )}

            {showConfirmDialog && (
                <div style={{
                    position: 'fixed', top: '0', left: '0', right: '0', bottom: '0', backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
                }}>
                    <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', maxWidth: '400px', width: '90%', textAlign: 'center' }}>
                        <h3 style={{ margin: '0 0 16px 0', color: '#333', fontSize: '18px', fontWeight: '600' }}>{confirmMessage.includes('unsaved') ? 'Unsaved Changes' : 'Confirmation'}</h3>
                        <p style={{ margin: '0 0 24px 0', color: '#666', fontSize: '16px', lineHeight: '1.5' }}>{confirmMessage}</p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button onClick={handleConfirmCancel} style={{ backgroundColor: '#6b7280', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '6px', cursor: 'pointer', fontSize: '16px', fontWeight: '500', minWidth: '100px' }}>Cancel</button>
                            <button onClick={handleConfirmYes} style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '6px', cursor: 'pointer', fontSize: '16px', fontWeight: '500', minWidth: '100px' }}>{confirmMessage.includes('unsaved') ? 'Continue' : 'Yes'}</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto', position: 'relative', zIndex: 1, padding: '0' }}>
                <table className="config-table" style={{ fontSize: '15px', width: '100%', borderCollapse: 'separate', borderSpacing: '0' }}>
                    <thead>

                        <tr>
                            <th style={{ padding: '6px 10px', fontSize: '14px', width: '20%', textAlign: 'center', borderBottom: '2px solid #ddd', borderRight: '1px solid #ddd' }}>Client Name</th>
                            <th style={{ padding: '6px 10px', fontSize: '14px', width: '20%', textAlign: 'center', borderBottom: '2px solid #ddd', borderRight: '1px solid #ddd' }}>Client Email</th>

                            <th style={{ padding: '6px 10px', fontSize: '14px', width: '20%', textAlign: 'center', borderBottom: '2px solid #ddd', borderRight: '1px solid #ddd' }}>Phone</th>
                            <th style={{ padding: '6px 10px', fontSize: '14px', width: '10%', textAlign: 'center', borderBottom: '2px solid #ddd', borderRight: '1px solid #ddd' }}>Edit</th>
                            <th style={{ padding: '6px 10px', fontSize: '14px', width: '15%', textAlign: 'center', borderBottom: '2px solid #ddd', borderLeft: '1px solid #ddd', borderRight: '1px solid #ddd' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                    <div style={{ lineHeight: '1.2', whiteSpace: 'nowrap', fontWeight: 'bold' }}>Grant Access</div>
                                    <input
                                        type="checkbox"
                                        checked={selectAllGrant}
                                        onChange={(e) => {
                                            const isChecked = e.target.checked;
                                            setSelectAllGrant(isChecked);
                                            if (isChecked) {
                                                const eligibleIndices = data
                                                    .map((item, index) => ({ item, index }))
                                                    .filter(({ item }) => item.isSaved && item.accessStatus !== 'true')
                                                    .map(({ index }) => index);
                                                setSelectedGrantRows(eligibleIndices);
                                                setSelectedRevokeRows([]);
                                                setSelectAllRevoke(false);
                                            } else {
                                                setSelectedGrantRows([]);
                                            }
                                        }}
                                        style={{ cursor: 'pointer', width: '18px', height: '18px', marginTop: '2px' }}
                                        title="Select All Grant (Only ungranted records)"
                                    />
                                </div>
                            </th>
                            <th style={{ padding: '6px 10px', fontSize: '14px', width: '15%', textAlign: 'center', borderBottom: '2px solid #ddd', borderRight: '1px solid #ddd' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                    <div style={{ lineHeight: '1.2', whiteSpace: 'nowrap', fontWeight: 'bold' }}>Revoke Access</div>
                                    <input
                                        type="checkbox"
                                        checked={selectAllRevoke}
                                        onChange={(e) => {
                                            const isChecked = e.target.checked;
                                            setSelectAllRevoke(isChecked);
                                            if (isChecked) {
                                                const eligibleIndices = data
                                                    .map((item, index) => ({ item, index }))
                                                    .filter(({ item }) => item.isSaved && item.accessStatus !== 'false')
                                                    .map(({ index }) => index);
                                                setSelectedRevokeRows(eligibleIndices);
                                                setSelectedGrantRows([]);
                                                setSelectAllGrant(false);
                                            } else {
                                                setSelectedRevokeRows([]);
                                            }
                                        }}
                                        style={{ cursor: 'pointer', width: '18px', height: '18px', marginTop: '2px' }}
                                        title="Select All Revoke (Only unrevoked records)"
                                    />
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                                    No records found. Click "ADD NEW RECORDS" to add client details.
                                </td>
                            </tr>
                        ) : (
                            data.map((item, index) => (
                                <tr
                                    key={item.id}
                                    style={{ height: '32px' }}
                                    ref={!item.isSaved && index === data.length - 1 ? newRowRef : null}
                                >
                                    <td style={{ padding: '4px 10px', verticalAlign: 'middle', textAlign: 'center', borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', width: '20%' }}>
                                        {editingItem === item.id ? (
                                            <div>
                                                <TextField size="small" style={{ width: '100%' }} value={editValues.clientName || ''} onChange={(e) => handleFieldChange('clientName', e.target.value, true)} onBlur={(e) => handleBlur('clientName', e.target.value, item.id, true)} placeholder="Client Name" variant="outlined" error={!!editValidationErrors.clientName} sx={{ '& .MuiOutlinedInput-root': { fontSize: '14px', backgroundColor: 'white' } }} />
                                                <div style={{ fontSize: '12px', color: '#ef4444', height: '18px' }}>{editValidationErrors.clientName === 'Maximum 40 characters' ? 'Maximum 40 characters' : (editValidationErrors.clientName && 'Required')}</div>
                                            </div>
                                        ) : !item.isSaved ? (
                                            <div>
                                                <TextField size="small" style={{ width: '100%' }} value={item.clientName || ''} onChange={(e) => handleFieldChange('clientName', e.target.value, false, index)} onBlur={(e) => handleBlur('clientName', e.target.value, item.id, false)} placeholder="Client Name" variant="outlined" error={!!validationErrors[item.id]?.clientName} sx={{ '& .MuiOutlinedInput-root': { fontSize: '14px', backgroundColor: 'white' } }} />
                                                <div style={{ fontSize: '12px', color: '#ef4444', height: '18px' }}>{validationErrors[item.id]?.clientName === 'Maximum 40 characters' ? 'Maximum 40 characters' : (validationErrors[item.id]?.clientName && 'Required')}</div>
                                            </div>
                                        ) : (<span>{item.clientName}</span>)}
                                    </td>
                                    <td style={{ padding: '4px 10px', verticalAlign: 'middle', textAlign: 'center', borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', width: '20%' }}>
                                        {editingItem === item.id ? (
                                            <div>
                                                <TextField size="small" style={{ width: '100%' }} value={editValues.clientEmail || ''} onChange={(e) => handleFieldChange('clientEmail', e.target.value, true)} onBlur={(e) => handleBlur('clientEmail', e.target.value, item.id, true)} placeholder="Client Email" variant="outlined" error={!!editValidationErrors.clientEmail} sx={{ '& .MuiOutlinedInput-root': { fontSize: '14px', backgroundColor: 'white' } }} />
                                                <div style={{ fontSize: '12px', color: '#ef4444', height: '18px' }}>{editValidationErrors.clientEmail}</div>
                                            </div>
                                        ) : !item.isSaved ? (
                                            <div>
                                                <TextField size="small" style={{ width: '100%' }} value={item.clientEmail || ''} onChange={(e) => handleFieldChange('clientEmail', e.target.value, false, index)} onBlur={(e) => handleBlur('clientEmail', e.target.value, item.id, false)} placeholder="Client Email" variant="outlined" error={!!validationErrors[item.id]?.clientEmail} sx={{ '& .MuiOutlinedInput-root': { fontSize: '14px', backgroundColor: 'white' } }} />
                                                <div style={{ fontSize: '12px', color: '#ef4444', height: '18px' }}>{typeof validationErrors[item.id]?.clientEmail === 'string' ? validationErrors[item.id].clientEmail : (validationErrors[item.id]?.clientEmail && 'Required')}</div>
                                            </div>
                                        ) : (<span>{item.clientEmail}</span>)}
                                    </td>
                                    <td style={{ padding: '4px 10px', verticalAlign: 'middle', textAlign: 'center', borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', width: '20%' }}>
                                        {editingItem === item.id ? (
                                            <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                                                <div style={{ flex: '0 0 80px' }}>
                                                    <TextField size="small" style={{ width: '100%' }} value={editValues.code || ''} onChange={(e) => handleFieldChange('code', e.target.value, true)} placeholder="Code" variant="outlined" error={editValidationErrors.code} sx={{ '& .MuiOutlinedInput-root': { fontSize: '14px', backgroundColor: 'white' } }} />
                                                    <div style={{ fontSize: '12px', color: '#ef4444', height: '18px' }}>{editValidationErrors.code && 'Required'}</div>
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <TextField size="small" style={{ width: '100%' }} value={editValues.phoneNumber || ''} onChange={(e) => handleFieldChange('phoneNumber', e.target.value, true)} onBlur={(e) => handleBlur('phoneNumber', e.target.value, item.id, true)} placeholder="Phone Number" variant="outlined" error={!!editValidationErrors.phoneNumber} sx={{ '& .MuiOutlinedInput-root': { fontSize: '14px', backgroundColor: 'white' } }} />
                                                    <div style={{ fontSize: '12px', color: '#ef4444', height: '18px' }}>{editValidationErrors.phoneNumber}</div>
                                                </div>
                                            </div>
                                        ) : !item.isSaved ? (
                                            <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                                                <div style={{ flex: '0 0 80px' }}>
                                                    <TextField size="small" style={{ width: '100%' }} value={item.code || ''} onChange={(e) => handleFieldChange('code', e.target.value, false, index)} placeholder="Code" variant="outlined" error={validationErrors[item.id]?.code} sx={{ '& .MuiOutlinedInput-root': { fontSize: '14px', backgroundColor: 'white' } }} />
                                                    <div style={{ fontSize: '12px', color: '#ef4444', height: '18px' }}>{validationErrors[item.id]?.code && 'Required'}</div>
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <TextField size="small" style={{ width: '100%' }} value={item.phoneNumber || ''} onChange={(e) => handleFieldChange('phoneNumber', e.target.value, false, index)} onBlur={(e) => handleBlur('phoneNumber', e.target.value, item.id, false)} placeholder="Phone Number" variant="outlined" error={!!validationErrors[item.id]?.phoneNumber} sx={{ '& .MuiOutlinedInput-root': { fontSize: '14px', backgroundColor: 'white' } }} />
                                                    <div style={{ fontSize: '12px', color: '#ef4444', height: '18px' }}>{validationErrors[item.id]?.phoneNumber}</div>
                                                </div>
                                            </div>
                                        ) : (<span>{item.code ? `${item.code} ${item.phoneNumber}` : item.phoneNumber}</span>)}
                                    </td>
                                    <td style={{ padding: '4px 10px', verticalAlign: 'middle', textAlign: 'center', borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', width: '10%' }}>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
                                            {editingItem === item.id ? (
                                                <>
                                                    <button onClick={() => handleSaveEdit(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981', padding: '4px' }} title="Save Changes">
                                                        <Save size={18} />
                                                    </button>
                                                    <button onClick={handleCancelEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }} title="Cancel Edit">
                                                        <X size={18} />
                                                    </button>
                                                </>
                                            ) : !item.isSaved ? (
                                                <button onClick={() => handleDelete(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }} title="Delete Row">
                                                    <Trash2 size={18} />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleEdit(item.id)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '4px' }}
                                                    title="Edit Row"
                                                >
                                                    <MoreVertical size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: '4px 10px', verticalAlign: 'middle', textAlign: 'center', borderBottom: '1px solid #ddd', borderLeft: '1px solid #ddd', borderRight: '1px solid #ddd', width: '15%' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            {item.accessStatus === 'true' ? (
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#28a745', fontWeight: 'bold', fontSize: '14px' }}>
                                                    Granted
                                                </div>
                                            ) : (
                                                <input
                                                    type="checkbox"
                                                    name={`access_grant_${item.id}`}
                                                    checked={selectedGrantRows.includes(index)}
                                                    onChange={(e) => {
                                                        if (editingItem === item.id || !item.isSaved) {
                                                            e.preventDefault();
                                                            return;
                                                        }
                                                        const isSelected = selectedGrantRows.includes(index);
                                                        if (isSelected) {
                                                            setSelectedGrantRows(selectedGrantRows.filter(i => i !== index));
                                                            setSelectAllGrant(false);
                                                        } else {
                                                            const newSelected = [...selectedGrantRows, index];
                                                            setSelectedGrantRows(newSelected);
                                                            const selectableCount = data.filter(r => r.isSaved && r.accessStatus !== 'true').length;
                                                            if (newSelected.length === selectableCount && selectableCount > 0) setSelectAllGrant(true);

                                                            setSelectedRevokeRows(prev => prev.filter(i => i !== index));
                                                            setSelectAllRevoke(false);
                                                        }
                                                    }}
                                                    disabled={editingItem === item.id || !item.isSaved}
                                                    style={{ cursor: (editingItem === item.id || !item.isSaved) ? 'not-allowed' : 'pointer', width: '18px', height: '18px', margin: 0, opacity: (editingItem === item.id || !item.isSaved) ? 0.5 : 1 }}
                                                />
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: '4px 10px', verticalAlign: 'middle', textAlign: 'center', borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', width: '15%' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            {item.accessStatus === 'false' ? (
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontWeight: 'bold', fontSize: '14px' }}>
                                                    Revoked
                                                </div>
                                            ) : (
                                                <input
                                                    type="checkbox"
                                                    name={`access_revoke_${item.id}`}
                                                    checked={selectedRevokeRows.includes(index)}
                                                    onChange={(e) => {
                                                        if (editingItem === item.id || !item.isSaved) {
                                                            e.preventDefault();
                                                            return;
                                                        }
                                                        const isSelected = selectedRevokeRows.includes(index);
                                                        if (isSelected) {
                                                            setSelectedRevokeRows(selectedRevokeRows.filter(i => i !== index));
                                                            setSelectAllRevoke(false);
                                                        } else {
                                                            const newSelected = [...selectedRevokeRows, index];
                                                            setSelectedRevokeRows(newSelected);
                                                            const selectableCount = data.filter(r => r.isSaved && r.accessStatus !== 'false').length;
                                                            if (newSelected.length === selectableCount && selectableCount > 0) setSelectAllRevoke(true);

                                                            setSelectedGrantRows(prev => prev.filter(i => i !== index));
                                                            setSelectAllGrant(false);
                                                        }
                                                    }}
                                                    disabled={editingItem === item.id || !item.isSaved}
                                                    style={{ cursor: (editingItem === item.id || !item.isSaved) ? 'not-allowed' : 'pointer', width: '18px', height: '18px', margin: 0, opacity: (editingItem === item.id || !item.isSaved) ? 0.5 : 1 }}
                                                />
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div style={{ padding: '1rem 2rem', display: 'flex', gap: '10px' }}>
                <button className="add-btn" onClick={handleAddRow} style={{
                    backgroundColor: '#28a745', color: 'white', border: 'none', padding: '10px 20px',
                    borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px',
                    cursor: 'pointer', fontSize: '14px', fontWeight: '500', transition: 'background-color 0.2s'
                }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#218838'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#28a745'}
                >
                    {(editingItem !== null || data.some(row => !row.isSaved)) ? <><Save size={16} /> Save Client Roster</> : <><Plus size={16} /> Add New Client Roster</>}
                </button>

                {hasMore && (
                    <button
                        className="load-more-btn"
                        onClick={() => fetchRecords(true)}
                        disabled={loading}
                        style={{
                            backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '10px 20px',
                            borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: '500',
                            transition: 'background-color 0.2s', opacity: loading ? 0.7 : 1
                        }}
                    >
                        Show More
                    </button>
                )}
            </div>

            <div style={{ height: '70px' }}></div>


            {/* Help Modal */}
            {showHelpPopup && (
                <div
                    onClick={() => setShowHelpPopup(false)}
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 3000
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            backgroundColor: 'white', borderRadius: '12px',
                            boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
                            width: '660px', maxWidth: '90vw', maxHeight: '85vh',
                            overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative'
                        }}
                    >
                        <div className="help-modal-scroll" style={{ overflowY: 'auto', padding: '32px', flex: '1' }}>
                            <button
                                onClick={() => setShowHelpPopup(false)}
                                style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545' }}
                            >
                                <X size={20} />
                            </button>
                            <h3 style={{ margin: '0 0 20px 0', color: '#333', fontSize: '18px', fontWeight: '600' }}>Help &amp; Information</h3>
                            <div style={{ color: '#444', fontSize: '14px', lineHeight: '1.6' }}>
                                <div style={{ marginBottom: '16px' }}>
                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>What is this page?</strong>
                                    <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                                        The <strong>Client Resource Form</strong> manages client-side stakeholders and contacts associated with the ERP project. Each record captures a client&#39;s name, email, and phone number, and controls their system login access.
                                    </p>
                                </div>
                                <div style={{ marginBottom: '16px' }}>
                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>Why is this used?</strong>
                                    <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                                        ERP implementations involve client personnel who need access to project systems for approvals, reviews, and collaboration. This page lets administrators register those client contacts and manage their access in one place.
                                    </p>
                                </div>
                                <div style={{ marginBottom: '16px' }}>
                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>Understanding the columns</strong>
                                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                        <li><strong>Client Name</strong> — Full name of the client contact. Required, max 40 characters.</li>
                                        <li><strong>Client Email</strong> — Must be a valid email address. Required and must be unique per project.</li>
                                        <li><strong>Phone</strong> — Phone code (e.g., +91) and number (8–10 digits). Both are required.</li>
                                        <li><strong>Edit</strong> — Use the &#8942; icon to edit a saved record, or Save/Cancel icons while editing.</li>
                                        <li><strong>Grant Access</strong> — Select rows and click <strong>Grant Access</strong> to activate the client&#39;s project login. Shows <em>Granted</em> when already active.</li>
                                        <li><strong>Revoke Access</strong> — Select rows and click <strong>Revoke Access</strong> to remove the client&#39;s login. Shows <em>Revoked</em> when already revoked.</li>
                                    </ul>
                                </div>
                                <div style={{ marginBottom: '16px' }}>
                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to use this page</strong>
                                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                        <li>Click <strong>Add New Client Roster</strong> to add a row. Fill in Name, Email, and Phone, then click <strong>Save Client Roster</strong>.</li>
                                        <li>Click the <strong>&#8942;</strong> icon on a saved row to edit it. Click <strong>&#10003;</strong> to save or <strong>&#x2715;</strong> to cancel.</li>
                                        <li>Select checkboxes in the <strong>Grant Access</strong> column and click the <strong>Grant Access</strong> button in the header to enable logins.</li>
                                        <li>Select checkboxes in the <strong>Revoke Access</strong> column and click <strong>Revoke Access</strong> to remove logins.</li>
                                        <li>If there are more records than shown, click <strong>Show More</strong> to load additional rows.</li>
                                    </ul>
                                </div>
                                <div style={{ marginBottom: '4px' }}>
                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>Important notes</strong>
                                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                        <li>Client Name, Email, and Phone (code + number) are all required to save a record.</li>
                                        <li>Phone number must be between 8 and 10 digits.</li>
                                        <li>A row showing <em>Granted</em> in the Grant Access column cannot be selected for granting again — use Revoke first.</li>
                                        <li>A row showing <em>Revoked</em> in the Revoke Access column cannot be selected for revoking again — use Grant first.</li>
                                        <li>You cannot edit and add new rows simultaneously — saving one set of changes first is required.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Standardized Loading Overlay */}
            {loading && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(255, 255, 255, 0.7)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <div className="loading-spinner" style={{
                        width: '50px',
                        height: '50px',
                        border: '5px solid #f3f3f3',
                        borderTop: '5px solid #3b82f6',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                    }} />
                    <p style={{ marginTop: '15px', color: '#1f2937', fontWeight: '500', fontSize: '16px' }}>Loading...</p>
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
                    padding: '12px 24px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    zIndex: 10000,
                    animation: 'slideIn 0.3s ease-out'
                }}>
                    <span style={{ fontWeight: '500' }}>{successMessage}</span>
                    <X size={18} style={{ cursor: 'pointer' }} onClick={() => setShowSuccessMessage(false)} />
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
                    padding: '12px 24px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    zIndex: 10000,
                    animation: 'slideIn 0.3s ease-out'
                }}>
                    <span style={{ fontWeight: '500' }}>{errorMessage}</span>
                    <X size={18} style={{ cursor: 'pointer' }} onClick={() => setShowErrorMessage(false)} />
                </div>
            )}

            <style>{`
                .help-modal-scroll::-webkit-scrollbar { width: 4px; }
                .help-modal-scroll::-webkit-scrollbar-track { background: transparent; margin: 8px 0; }
                .help-modal-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                .help-modal-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes slideIn {
                  from { transform: translateX(100%); opacity: 0; }
                  to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default ClientRosterFormDetails;
