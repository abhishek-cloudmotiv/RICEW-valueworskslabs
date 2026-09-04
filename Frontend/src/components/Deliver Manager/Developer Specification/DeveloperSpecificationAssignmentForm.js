import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { DeveloperResourceAutocomplete } from './DeveloperSpecificationLOVlist';
import { HelpCircle, X } from 'lucide-react';
import DOMPurify from 'dompurify';
import { getIdToken } from '../../../utils/cognito-auth';
import { useSession } from '../../../context/SessionContext';

const DeveloperSpecificationAssignmentForm = ({ selectedProject, onBackToLanding }) => {
    const navigate = useNavigate();
    const [ricewData, setRicewData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedRows, setSelectedRows] = useState([]);
    const [selectAll, setSelectAll] = useState(false);

    const [resourceOptions, setResourceOptions] = useState([]);

    // Confirmation dialog states
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const [confirmMessage, setConfirmMessage] = useState('');

    // API Status States
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [showErrorMessage, setShowErrorMessage] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const [editingResourceRowId, setEditingResourceRowId] = useState(null);
    const [editingValues, setEditingValues] = useState({}); // { ricewId: { resourceId, email, displayName } }
    const [isLOVOpen, setIsLOVOpen] = useState(false);
    const [lovOpenRowIndex, setLovOpenRowIndex] = useState(null);
    const editContainerRef = useRef(null);
    const [showHelpPopup, setShowHelpPopup] = useState(false);
    const helpPopupRef = useRef(null);

    const { logout } = useSession();

    const handleAuthError = useCallback((status) => {
        if (status === 401 || status === 403) {
            logout();
        }
    }, [logout]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (editContainerRef.current && !editContainerRef.current.contains(event.target)) {
                setEditingResourceRowId(null);
                setLovOpenRowIndex(null);
            }
        };

        if (editingResourceRowId) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        const handleHelpClickOutside = (event) => {
            if (helpPopupRef.current && !helpPopupRef.current.contains(event.target)) {
                setShowHelpPopup(false);
            }
        };

        if (showHelpPopup) {
            document.addEventListener('mousedown', handleHelpClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('mousedown', handleHelpClickOutside);
        };
    }, [editingResourceRowId, showHelpPopup]);

    const fetchResourceRoster = useCallback(async () => {
        const projectId = localStorage.getItem('project_id') || selectedProject?.id || '101';
        try {
            const idToken = await getIdToken();
            if (!idToken) {
                handleAuthError(401);
                return;
            }

            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            };

            const response = await fetch(`https://oi5gtp4f3l.execute-api.ap-south-1.amazonaws.com/New/newApi/ricew/resourceRoster/byProject?project_id=${projectId}`, {
                headers: headers
            });

            if (response.status === 401 || response.status === 403) {
                handleAuthError(response.status);
                return;
            }

            if (response.ok) {
                const result = await response.json();
                if (result.data) {
                    // Map API data to options using Resource_Roster_Form_id as unique value
                    const transformedOptions = result.data.map(item => ({
                        id: item.Resource_Roster_Form_id || '',
                        value: item.Resource_Roster_Form_id || '',
                        label: DOMPurify.sanitize(item.IC_full_name || '', { ALLOWED_TAGS: [] }),
                        displayName: DOMPurify.sanitize(item.IC_full_name || '', { ALLOWED_TAGS: [] }),
                        email: DOMPurify.sanitize(item.IC_email || '', { ALLOWED_TAGS: [] }),
                        userId: item.user_id || ''
                    })).filter(opt => opt.label !== '');

                    // Sort by label (name)
                    transformedOptions.sort((a, b) => a.label.localeCompare(b.label));
                    setResourceOptions(transformedOptions);
                }
            }
        } catch (error) {
            console.error('Error fetching roster data:', error);
        }
    }, [selectedProject, handleAuthError]);

    const fetchRicewData = useCallback(async () => {
        setLoading(true);
        try {
            const projectId = localStorage.getItem('project_id') || selectedProject?.id || '101';
            const idToken = await getIdToken();
            if (!idToken) {
                handleAuthError(401);
                setLoading(false);
                return;
            }

            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            };

            // Fetch both RICEW objects and their assignment status in parallel
            const [ricewResponse, assignmentResponse] = await Promise.all([
                fetch(`https://qxlkh4fu85.execute-api.ap-south-1.amazonaws.com/New/api/ricew/getTSCompleteByProject?project_id=${projectId}`, { headers }),
                fetch(`https://qxlkh4fu85.execute-api.ap-south-1.amazonaws.com/New/api/ricew/developerSpecificationAssignment/getRecord-byProject?Project_id=${projectId}`, { headers })
            ]);

            if (ricewResponse.status === 401 || ricewResponse.status === 403 || assignmentResponse.status === 401 || assignmentResponse.status === 403) {
                handleAuthError(ricewResponse.status || assignmentResponse.status);
                setLoading(false);
                return;
            }

            const ricewResult = await ricewResponse.json();
            const assignmentResult = await assignmentResponse.json();

            if (ricewResult.success) {
                const ricewList = ricewResult.data || [];
                const assignmentList = assignmentResult.success ? (assignmentResult.data || []) : [];

                // Initialize data and merge with assignment status
                const mergedData = ricewList.map(item => {
                    const assignment = assignmentList.find(a => a.RICEWRequestFormId === item.RICEWRequestFormId);
                    const rawStatus = assignment ? assignment.Status_Assign_Object : null;
                    const submittedFlag = assignment ? assignment.Status_Submitted : null;
                    const assignWorkStatus = assignment ? assignment.assign_work_status : null;
                    const isWorkAssigned = assignWorkStatus === 'yes';

                    return {
                        ...item,
                        RICEW_Object: DOMPurify.sanitize(item.RICEW_Object || item.RICEW_Name || '', { ALLOWED_TAGS: [] }),
                        developerResourceId: assignment ? (assignment.Resource_Roster_Form_id || assignment.Choose_Resource_Developer) : (item.Developer_Resource_Id || ''),
                        developerResource: DOMPurify.sanitize(assignment ? assignment.Choose_Resource_Developer : (item.Developer_Resource || ''), { ALLOWED_TAGS: [] }),
                        developerResourceName: DOMPurify.sanitize(assignment ? assignment.Choose_Resource_Developer : (item.Developer_Resource || ''), { ALLOWED_TAGS: [] }),
                        emailDisplay: DOMPurify.sanitize(assignment ? assignment.Email_Address : (item.Developer_Resource_Email || ''), { ALLOWED_TAGS: [] }),
                        // Store assignment fields for sorting
                        assignmentTimestamp: assignment ? (assignment.assign_object_date || assignment.created_timestamp || '') : '',
                        assignmentId: assignment ? (assignment.DeveloperSpecificationAssignment_id || '') : '',
                        // General flag for record existence in assignment table
                        isSubmitted: !!assignment,
                        // Logic: Records with 'Assign' status OR 'assign_work_status' === 'yes' are considered fully complete/locked
                        isFullyAssigned: submittedFlag === 'Assign' || isWorkAssigned,
                        isWorkAssigned: isWorkAssigned,
                        submittedStatusText: (submittedFlag === 'Assign' || isWorkAssigned) ? 'Assigned' : ((submittedFlag === 'true' || submittedFlag === true) ? 'Processed' : null),
                        developerUserId: assignment ? (assignment.Developer_user_id || '') : ''
                    };
                }).filter(item => !item.isWorkAssigned);

                // Final Sort Logic
                mergedData.sort((a, b) => {
                    // Helper to parse dates in format DD/MM/YYYY HH:MM:SS or DD_MM_YYYY HH:MM:SS
                    const parseDate = (dateStr) => {
                        if (!dateStr) return 0;
                        try {
                            const cleanDate = dateStr.replace('_', '/').replace(',', '');
                            const [datePart, timePart] = cleanDate.split(' ');
                            if (!datePart) return 0;
                            const [day, month, year] = datePart.split('/').map(Number);
                            let hours = 0, minutes = 0, seconds = 0;
                            if (timePart) {
                                const hms = timePart.split(':').map(Number);
                                hours = hms[0] || 0;
                                minutes = hms[1] || 0;
                                seconds = hms[2] || 0;
                            }
                            return new Date(year, month - 1, day, hours, minutes, seconds).getTime();
                        } catch (e) { return 0; }
                    };

                    // 1. Group Priority: Processed (1) -> Unsaved (2) -> Assigned (3) -> Work Started (4)
                    const getGroup = (item) => {
                        if (item.isWorkAssigned) return 4;
                        if (item.isSubmitted && !item.isFullyAssigned) return 1; // Processed
                        if (!item.isSubmitted) return 2; // Unsaved
                        return 3; // Assigned
                    };

                    const groupA = getGroup(a);
                    const groupB = getGroup(b);

                    if (groupA !== groupB) return groupA - groupB;

                    // 2. Intra-group sorting
                    if (a.isSubmitted) {
                        // For Processed/Assigned groups, use assignment timestamp and ID
                        const timeA = parseDate(a.assignmentTimestamp);
                        const timeB = parseDate(b.assignmentTimestamp);
                        if (timeB !== timeA) return timeB - timeA;

                        const idA = parseInt(a.assignmentId) || 0;
                        const idB = parseInt(b.assignmentId) || 0;
                        return idB - idA;
                    } else {
                        // For Unsaved group, use master record timestamp and ID
                        const timeA = parseDate(a.created_timestamp || a.created_date);
                        const timeB = parseDate(b.created_timestamp || b.created_date);
                        if (timeB !== timeA) return timeB - timeA;

                        const idA = parseInt(a.RICEWRequestFormId) || 0;
                        const idB = parseInt(b.RICEWRequestFormId) || 0;
                        return idB - idA;
                    }
                });

                setRicewData(mergedData);
            } else {
                console.error("API returned success: false");
                setRicewData([]);
            }
        } catch (error) {
            console.error("Error fetching RICEW data:", error);
            setRicewData([]);
        } finally {
            setLoading(false);
        }
    }, [selectedProject, handleAuthError]);

    useEffect(() => {
        fetchRicewData();
        fetchResourceRoster();
    }, [fetchRicewData, fetchResourceRoster]);

    // Sync Select All checkbox
    useEffect(() => {
        const selectableRows = ricewData.filter(row => !row.isFullyAssigned && row.developerResource && row.emailDisplay);
        const allSelected = selectableRows.length > 0 && selectableRows.every(row => selectedRows.includes(row.RICEWRequestFormId));
        setSelectAll(allSelected);
    }, [selectedRows, ricewData]);



    const handleResourceChange = (id, resourceId, email, displayName, userId) => {
        setEditingValues(prev => ({
            ...prev,
            [id]: {
                resourceId,
                email: DOMPurify.sanitize(email || '', { ALLOWED_TAGS: [] }),
                displayName: DOMPurify.sanitize(displayName || resourceId || '', { ALLOWED_TAGS: [] }),
                userId: userId || ''
            }
        }));
    };

    const handleUnsavedResourceChange = (id, resourceId, email, displayName, userId) => {
        setRicewData(prev => prev.map(row =>
            row.RICEWRequestFormId === id
                ? {
                    ...row,
                    developerResourceId: resourceId,
                    developerResource: DOMPurify.sanitize(resourceId || '', { ALLOWED_TAGS: [] }),
                    developerResourceName: DOMPurify.sanitize(displayName || resourceId || '', { ALLOWED_TAGS: [] }),
                    emailDisplay: DOMPurify.sanitize(email || '', { ALLOWED_TAGS: [] }),
                    developerUserId: userId || ''
                }
                : row
        ));
    };

    const handleSaveEdit = async (rowId) => {
        const edits = editingValues[rowId];
        if (!edits) {
            setEditingResourceRowId(null);
            return;
        }

        setLoading(true);
        try {
            const idToken = await getIdToken();
            if (!idToken) {
                handleAuthError(401);
                return;
            }

            const userId = localStorage.getItem('user_id') || 'system';
            const projectId = localStorage.getItem('project_id') || selectedProject?.id || '101';
            const row = ricewData.find(r => r.RICEWRequestFormId === rowId);

            const payload = {
                records: [{
                    RICEW_Object: DOMPurify.sanitize(row.RICEW_Object || '', { ALLOWED_TAGS: [] }),
                    Choose_Resource_Developer: DOMPurify.sanitize(edits.displayName || '', { ALLOWED_TAGS: [] }),
                    Email_Address: DOMPurify.sanitize(edits.email || '', { ALLOWED_TAGS: [] }),
                    Status_Submitted: row.isSubmitted,
                    Project_id: projectId,
                    created_by: userId,
                    updated_by: userId,
                    user_id: userId,
                    Resource_Roster_Form_id: edits.resourceId || '',
                    RICEWRequestFormId: rowId,
                    Developer_user_id: edits.userId || '',
                    Developer_name: DOMPurify.sanitize(edits.displayName || '', { ALLOWED_TAGS: [] })
                }]
            };

            const response = await fetch('https://qxlkh4fu85.execute-api.ap-south-1.amazonaws.com/New/api/ricew/developerSpecificationAssignment/createSubmit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify(payload)
            });

            if (response.status === 401 || response.status === 403) {
                handleAuthError(response.status);
                return;
            }

            if (response.ok) {
                setSuccessMessage('Record updated successfully');
                setShowSuccessMessage(true);
                setTimeout(() => setShowSuccessMessage(false), 3000);

                // Clear state and refresh data
                setEditingResourceRowId(null);
                setEditingValues(prev => {
                    const newValues = { ...prev };
                    delete newValues[rowId];
                    return newValues;
                });
                fetchRicewData();
            } else {
                throw new Error('Failed to update record');
            }
        } catch (error) {
            console.error('Update error:', error);
            setErrorMessage('Failed to update record. Please try again.');
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 5000);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelEdit = (rowId) => {
        setEditingResourceRowId(null);
        setEditingValues(prev => {
            const newValues = { ...prev };
            delete newValues[rowId];
            return newValues;
        });
    };

    const handleSelectAll = (e) => {
        const isChecked = e.target.checked;
        setSelectAll(isChecked);
        if (isChecked) {
            // Only select rows that have a resource AND are NOT yet fully assigned
            const selectableIds = ricewData
                .filter(row => !row.isFullyAssigned && row.developerResource && row.emailDisplay)
                .map(item => item.RICEWRequestFormId);
            setSelectedRows(selectableIds);
        } else {
            setSelectedRows([]);
        }
    };

    const handleSelectRow = (id) => {
        setSelectedRows(prev => {
            if (prev.includes(id)) {
                return prev.filter(rowId => rowId !== id);
            } else {
                return [...prev, id];
            }
        });
    };



    const handleConfirmYes = () => {
        if (confirmAction) confirmAction();
        setShowConfirmDialog(false);
        setConfirmAction(null);
    };

    const handleConfirmCancel = () => {
        setShowConfirmDialog(false);
        setConfirmAction(null);
    };


    const handleAssignObject = async () => {
        if (selectedRows.length === 0) {
            setErrorMessage('Please select at least one record to assign.');
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 3000);
            return;
        }

        const count = selectedRows.length;
        setConfirmMessage(`Are you sure you want to assign ${count} ${count === 1 ? 'record' : 'records'}?`);
        setConfirmAction(() => async () => {
            setLoading(true);
            try {
                const idToken = await getIdToken();
                if (!idToken) {
                    handleAuthError(401);
                    setLoading(false);
                    return;
                }

                const userId = localStorage.getItem('user_id') || 'system';
                const projectId = localStorage.getItem('project_id') || selectedProject?.id || '101';

                const recordsToAssign = selectedRows.map(rowId => {
                    const row = ricewData.find(r => r.RICEWRequestFormId === rowId);
                    if (!row) return null;
                    return {
                        RICEW_Object: DOMPurify.sanitize(row.RICEW_Object || '', { ALLOWED_TAGS: [] }),
                        Choose_Resource_Developer: DOMPurify.sanitize(row.developerResourceName || '', { ALLOWED_TAGS: [] }),
                        Email_Address: DOMPurify.sanitize(row.emailDisplay || '', { ALLOWED_TAGS: [] }),
                        Project_id: projectId,
                        created_by: userId,
                        updated_by: userId,
                        user_id: userId,
                        Resource_Roster_Form_id: row.developerResourceId || '',
                        RICEWRequestFormId: row.RICEWRequestFormId || '',
                        Developer_user_id: row.developerUserId || '',
                        Developer_name: DOMPurify.sanitize(row.developerResourceName || '', { ALLOWED_TAGS: [] })
                    };
                }).filter(Boolean);

                const response = await fetch('https://qxlkh4fu85.execute-api.ap-south-1.amazonaws.com/New/api/ricew/developerSpecificationAssignment/assign', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`
                    },
                    body: JSON.stringify({ records: recordsToAssign })
                });

                if (response.status === 401 || response.status === 403) {
                    handleAuthError(response.status);
                    setLoading(false);
                    return;
                }

                const result = await response.json();

                if (response.ok && result.success) {
                    // Send Bulk Email for assigned records
                    const currentProjectName = localStorage.getItem('project_name') || selectedProject?.name || '';

                    const emailPayload = recordsToAssign.map(record => ({
                        toEmail: DOMPurify.sanitize(record.Email_Address || '', { ALLOWED_TAGS: [] }),
                        Developer_name: DOMPurify.sanitize(record.Developer_name || '', { ALLOWED_TAGS: [] }),
                        projectName: currentProjectName,
                        ricewObject: DOMPurify.sanitize(record.RICEW_Object || '', { ALLOWED_TAGS: [] })
                    }));

                    try {
                        await fetch('https://qxlkh4fu85.execute-api.ap-south-1.amazonaws.com/New/api/send/developer-assignment', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${idToken}`
                            },
                            body: JSON.stringify(emailPayload)
                        });
                    } catch (err) {
                        console.error("Bulk email send error:", err);
                    }

                    const assignedCount = result.processedCount || recordsToAssign.length;
                    setSuccessMessage(`Successfully assigned ${assignedCount} ${assignedCount === 1 ? 'object' : 'objects'}.`);
                    setShowSuccessMessage(true);
                    setTimeout(() => setShowSuccessMessage(false), 3000);

                    setSelectedRows([]);
                    setSelectAll(false);
                    fetchRicewData();
                } else {
                    setErrorMessage(result.error || 'Failed to assign records. Check console for details.');
                    setShowErrorMessage(true);
                    setTimeout(() => setShowErrorMessage(false), 5000);
                }
            } catch (error) {
                console.error('Assignment error:', error);
                setErrorMessage('An error occurred during assignment. Please try again.');
                setShowErrorMessage(true);
                setTimeout(() => setShowErrorMessage(false), 5000);
            } finally {
                setLoading(false);
            }
        });
        setShowConfirmDialog(true);
    };

    return (
        <div className="config-main" style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '0', margin: '0' }}>
            <div style={{ padding: '1rem 1rem 2rem 1rem', width: '100%', minWidth: '1320px', margin: '0', boxSizing: 'border-box' }}>

                {/* Main Content Area */}
                <div style={{
                    backgroundColor: 'white',
                    padding: '0',
                    borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    paddingBottom: (isLOVOpen && lovOpenRowIndex !== null && lovOpenRowIndex >= ricewData.length - 3) ? '150px' : '0'
                }}>

                    {/* Project Info Header */}
                    <div style={{ padding: '2rem 1rem 1rem 2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project : <span style={{ color: '#007bff' }}> {localStorage.getItem('project_name') || selectedProject?.name}</span></h3>
                        </div>
                    </div>

                    {/* Page Title */}
                    <div className="config-header" style={{
                        marginTop: '0',
                        marginRight: "0px",
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.5rem 2rem'
                    }}>
                        <h2 style={{ margin: 0 }}>Developer Assignment Form</h2>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <button
                                onClick={() => setShowHelpPopup(!showHelpPopup)}
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
                                    transition: 'all 0.2s ease',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3d495c'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4D5C74'}
                            >
                                <HelpCircle size={18} />
                                Help
                            </button>

                            {showHelpPopup && (
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
                                    zIndex: 30000,
                                    padding: '20px'
                                }}>
                                    <div
                                        ref={helpPopupRef}
                                        style={{
                                            backgroundColor: 'white',
                                            borderRadius: '12px',
                                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                                            width: '100%',
                                            maxWidth: '800px',
                                            maxHeight: '90vh',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            position: 'relative'
                                        }}
                                    >
                                        <div className="help-modal-scroll" style={{
                                            overflowY: 'auto',
                                            padding: '32px',
                                            textAlign: 'left',
                                            flex: '1'
                                        }}>
                                            <button
                                                onClick={() => setShowHelpPopup(false)}
                                                style={{
                                                    position: 'absolute',
                                                    top: '16px',
                                                    right: '16px',
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    color: '#dc3545'
                                                }}
                                            >
                                                <X size={20} />
                                            </button>
                                            <h3 style={{
                                                margin: '0 0 16px 0',
                                                color: '#333',
                                                fontSize: '18px',
                                                fontWeight: '600'
                                            }}>
                                                Help & Information
                                            </h3>
                                            <div style={{ color: '#444', fontSize: '14px', lineHeight: '1.6' }}>
                                                <div style={{ marginBottom: '16px' }}>
                                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>What is this page?</strong>
                                                    <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                                                        The <strong>Developer Assignment Form</strong> allows you to assign RICEW objects to developers from your resource roster for code development.
                                                    </p>
                                                </div>

                                                <div style={{ marginBottom: '16px' }}>
                                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>Understanding the columns</strong>
                                                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                                        <li><strong>RICEW Object</strong> — The technical specification object to be assigned.</li>
                                                        <li><strong>Choose Resource (Developer)</strong> — Select a developer from the resource roster to assign the object to.</li>
                                                        <li><strong>Email Address</strong> — Automatically populated based on the selected developer.</li>
                                                        <li><strong>Select</strong> — Checkbox to select records for bulk assignment.</li>
                                                    </ul>
                                                </div>

                                                <div style={{ marginBottom: '16px' }}>
                                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to make changes</strong>
                                                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                                        <li>Select a <strong>developer</strong> from the dropdown for each RICEW object.</li>
                                                        <li>Use the <strong>Select</strong> checkboxes to choose which records to assign.</li>
                                                        <li>Click <strong>Assign Object</strong> to finalize the assignment and notify the developer via email.</li>
                                                        <li>For already-processed records, click the <strong>edit icon</strong> to change the assigned resource before final assignment.</li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ padding: '20px' }}>
                        {/* Action Buttons Row - Aligned with Columns */}
                        <div style={{
                            display: 'flex',
                            width: '100%',
                            padding: '8px 0',
                            alignItems: 'flex-end',
                            minWidth: '1180px'
                        }}>
                            {/* Spacers for columns 1-4 to match table grid */}
                            <div style={{ width: '60px', flex: '0 0 60px' }}></div>
                            <div style={{ flex: 1, minWidth: '250px' }}></div>
                            <div style={{ flex: 1, minWidth: '320px' }}></div>
                            <div style={{ flex: 1, minWidth: '250px' }}></div>



                            {/* Select Column (Col 7) - Assign Object Button */}
                            <div style={{
                                width: '100px',
                                flex: '0 0 100px',
                                display: 'flex',
                                justifyContent: 'center',
                                padding: '0 4px'
                            }}>
                                <button
                                    onClick={handleAssignObject}
                                    disabled={loading || selectedRows.length === 0}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        padding: '8px 16px',
                                        backgroundColor: (loading || selectedRows.length === 0) ? '#6c757d' : '#007bff',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: (loading || selectedRows.length === 0) ? 'not-allowed' : 'pointer',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        transition: 'all 0.2s ease',
                                        whiteSpace: 'nowrap',
                                        width: 'max-content',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!loading && selectedRows.length > 0) {
                                            e.currentTarget.style.backgroundColor = '#0069d9';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!loading && selectedRows.length > 0) {
                                            e.currentTarget.style.backgroundColor = '#007bff';
                                        }
                                    }}
                                >
                                    {loading ? 'Assigning...' : 'Assign Object'}
                                </button>
                            </div>
                        </div>

                        {/* Table Header and Body Section - Unified Scrollable Container */}
                        <div style={{
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
                                minWidth: '1180px'
                            }}>
                                <div style={{ width: '60px', flex: '0 0 60px', padding: '12px 8px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', backgroundColor: 'white', textAlign: 'center' }}>Sr. No.</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '250px', backgroundColor: 'white' }}>RICEW Object</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '320px', backgroundColor: 'white' }}>Choose Resource (Developer) From the Roster</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '250px', backgroundColor: 'white' }}>Email Address</div>

                                <div style={{
                                    width: '100px',
                                    flex: '0 0 100px',
                                    padding: '12px 12px',
                                    fontWeight: 'bold',
                                    fontSize: '14px',
                                    color: '#333',
                                    backgroundColor: !ricewData.some(row => !row.isFullyAssigned && row.developerResource && row.emailDisplay) ? '#f0f0f0' : 'white',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxSizing: 'border-box'
                                }}>
                                    <div style={{ lineHeight: '1.2', whiteSpace: 'nowrap' }}>Select</div>
                                    <input
                                        type="checkbox"
                                        checked={selectAll}
                                        onChange={handleSelectAll}
                                        disabled={!ricewData.some(row => !row.isFullyAssigned && row.developerResource && row.emailDisplay)}
                                        style={{
                                            cursor: !ricewData.some(row => !row.isFullyAssigned && row.developerResource && row.emailDisplay) ? 'not-allowed' : 'pointer',
                                            width: '16px',
                                            height: '16px',
                                            marginTop: '6px'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Table Body */}
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                minWidth: '1180px',
                                backgroundColor: 'white'
                            }}>
                                {loading ? (
                                    <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Loading records...</div>
                                ) : ricewData.length > 0 ? (
                                    ricewData.map((row, index) => (
                                        <div
                                            key={row.RICEWRequestFormId}
                                            style={{
                                                display: 'flex',
                                                backgroundColor: row.isWorkAssigned ? '#f2f2f2' : (index % 2 === 0 ? '#ffffff' : '#ffffff'),
                                                borderBottom: '1px solid #ddd',
                                                minWidth: '1180px',
                                                color: row.isWorkAssigned ? '#666' : '#333'
                                            }}
                                        >
                                            {/* Sr. No. */}
                                            <div style={{ width: '60px', flex: '0 0 60px', padding: '12px 8px', fontSize: '13px', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '500' }}>
                                                {index + 1}
                                            </div>

                                            {/* RICEW Object */}
                                            <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', minWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center' }}>
                                                <span
                                                    style={{
                                                        cursor: 'pointer',
                                                        color: '#3b82f6',
                                                        textDecoration: 'none',
                                                        fontWeight: '500'
                                                    }}
                                                    onClick={() => navigate(`/dashboard/functional-specification-view/${row.RICEWRequestFormId}?from=developer-assignment`)}
                                                    onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                                    onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                                                >
                                                    {row.RICEW_Object || '-'}
                                                </span>
                                            </div>

                                            {/* Choose Resource (Developer) */}
                                            <div
                                                ref={editingResourceRowId === row.RICEWRequestFormId ? editContainerRef : null}
                                                style={{
                                                    flex: 1,
                                                    padding: '12px 12px',
                                                    fontSize: '13px',
                                                    borderRight: '1px solid #ddd',
                                                    minWidth: '320px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    cursor: 'default',
                                                    minHeight: '45px'
                                                }}
                                            >
                                                {editingResourceRowId === row.RICEWRequestFormId ? (
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        width: '100%',
                                                        maxWidth: '100%',
                                                        overflow: 'hidden'
                                                    }}>
                                                        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                                                            <DeveloperResourceAutocomplete
                                                                value={editingValues[row.RICEWRequestFormId]?.resourceId ?? row.developerResourceId}
                                                                emailValue={editingValues[row.RICEWRequestFormId]?.email ?? row.emailDisplay}
                                                                options={resourceOptions}
                                                                onChange={(resourceId, email, displayName, userId) => {
                                                                    handleResourceChange(row.RICEWRequestFormId, resourceId, email, displayName, userId);
                                                                }}
                                                                projectId={localStorage.getItem('project_id') || selectedProject?.id || '101'}
                                                                onDropdownStateChange={setIsLOVOpen}
                                                                rowIndex={index}
                                                            />
                                                        </div>
                                                        <div style={{
                                                            display: 'flex',
                                                            gap: '4px',
                                                            flexShrink: 0,
                                                            alignItems: 'center'
                                                        }}>
                                                            <button
                                                                onClick={() => handleSaveEdit(row.RICEWRequestFormId)}
                                                                style={{
                                                                    background: 'none',
                                                                    border: 'none',
                                                                    padding: '4px',
                                                                    cursor: 'pointer',
                                                                    color: '#28a745',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    flexShrink: 0
                                                                }}
                                                                title="Save"
                                                            >
                                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                    <polyline points="20 6 9 17 4 12"></polyline>
                                                                </svg>
                                                            </button>
                                                            <button
                                                                onClick={() => handleCancelEdit(row.RICEWRequestFormId)}
                                                                style={{
                                                                    background: 'none',
                                                                    border: 'none',
                                                                    padding: '4px',
                                                                    cursor: 'pointer',
                                                                    color: '#ef4444',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    flexShrink: 0
                                                                }}
                                                                title="Cancel"
                                                            >
                                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : !row.isSubmitted ? (
                                                    <DeveloperResourceAutocomplete
                                                        value={row.developerResourceId || ''}
                                                        emailValue={row.emailDisplay || ''}
                                                        options={resourceOptions}
                                                        onChange={(resourceId, email, displayName, userId) => {
                                                            handleUnsavedResourceChange(row.RICEWRequestFormId, resourceId, email, displayName, userId);
                                                        }}
                                                        projectId={localStorage.getItem('project_id') || selectedProject?.id || '101'}
                                                        onDropdownStateChange={setIsLOVOpen}
                                                        rowIndex={index}
                                                    />
                                                ) : (
                                                    <div style={{
                                                        width: '100%',
                                                        color: '#333',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        gap: '8px'
                                                    }}>
                                                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {row.developerResourceName || '-'}
                                                        </span>
                                                        {!row.isFullyAssigned && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditingResourceRowId(row.RICEWRequestFormId);
                                                                    setLovOpenRowIndex(index);
                                                                }}
                                                                style={{
                                                                    background: 'none',
                                                                    border: 'none',
                                                                    padding: '4px',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    color: '#6b7280',
                                                                    borderRadius: '4px',
                                                                    transition: 'all 0.2s ease'
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                                                                    e.currentTarget.style.color = '#3b82f6';
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                                    e.currentTarget.style.color = '#6b7280';
                                                                }}
                                                                title="Edit Resource"
                                                            >
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                                                                </svg>
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Email Address */}
                                            <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', minWidth: '250px', display: 'flex', alignItems: 'center' }}>
                                                {row.emailDisplay || '-'}
                                            </div>

                                            {/* Select */}
                                            <div style={{
                                                width: '100px',
                                                flex: '0 0 100px',
                                                padding: '12px 12px',
                                                borderRight: '1px solid #ddd',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                backgroundColor: (!row.developerResource || !row.emailDisplay) && !row.isFullyAssigned ? '#f0f0f0' : 'transparent'
                                            }}>
                                                {row.isFullyAssigned || row.submittedStatusText === 'Assigned' ? (
                                                    <span style={{
                                                        color: '#28a745',
                                                        fontWeight: '600',
                                                        padding: '4px 12px',
                                                        backgroundColor: '#f0fff4',
                                                        borderRadius: '4px',
                                                        border: '1px solid #c6f6d5',
                                                        fontSize: '12px'
                                                    }}>
                                                        Assigned
                                                    </span>
                                                ) : (
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedRows.includes(row.RICEWRequestFormId)}
                                                        onChange={() => handleSelectRow(row.RICEWRequestFormId)}
                                                        disabled={!row.developerResource || !row.emailDisplay}
                                                        style={{
                                                            cursor: (!row.developerResource || !row.emailDisplay) ? 'not-allowed' : 'pointer',
                                                            width: '16px',
                                                            height: '16px'
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        minHeight: '100px',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#999',
                                        fontSize: '14px'
                                    }}>
                                        No records found
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
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
                            maxWidth: '400px',
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
                                textAlign: 'center'
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
                                Processing...
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
                    .help-modal-scroll::-webkit-scrollbar {
                        width: 4px;
                    }
                    .help-modal-scroll::-webkit-scrollbar-track {
                        background: transparent;
                        margin: 8px 0;
                    }
                    .help-modal-scroll::-webkit-scrollbar-thumb {
                        background: #cbd5e1;
                        border-radius: 4px;
                    }
                    .help-modal-scroll::-webkit-scrollbar-thumb:hover {
                        background: #94a3b8;
                    }
                `}</style>
            </div>
        </div>
    );
};

export default DeveloperSpecificationAssignmentForm;
