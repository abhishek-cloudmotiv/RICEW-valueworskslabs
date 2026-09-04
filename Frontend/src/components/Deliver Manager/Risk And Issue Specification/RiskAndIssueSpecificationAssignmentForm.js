import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { useSession } from '../../../context/SessionContext';
import { RiskAndIssueResourceAutocomplete } from './RiskAndIssueSpecificationLOVlist';
import { CustomDatePicker } from '../../Resource Roster Form/Components';
import { HelpCircle, X } from 'lucide-react';
import { getIdToken } from '../../../utils/cognito-auth';

const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
};

const formatToIso = (dateString) => {
    if (!dateString) return '';
    if (dateString.includes('T')) return dateString;
    
    // User requested strict 0s (midnight) for dates picked from the calendar 
    return `${dateString}T00:00:00.000Z`;
};

const RiskAndIssueSpecificationAssignmentForm = ({ selectedProject, onBackToLanding }) => {
    const navigate = useNavigate();
    const { logout } = useSession();
    const [riskIssueData, setRiskIssueData] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleAuthError = useCallback(() => {
        localStorage.removeItem('id_token');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('expires_in');
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_name');
        localStorage.removeItem('user_email');
        logout?.();
    }, [logout]);
    const [selectedRows, setSelectedRows] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [selectedStatusRows, setSelectedStatusRows] = useState([]);
    const [selectAllStatus, setSelectAllStatus] = useState(false);
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
    const [editingValues, setEditingValues] = useState({});
    const [isLOVOpen, setIsLOVOpen] = useState(false);
    const [isActionInProgress, setIsActionInProgress] = useState(false);
    const [lovOpenRowIndex, setLovOpenRowIndex] = useState(null);
    const editContainerRef = useRef(null);
    const [debugLog, setDebugLog] = useState('Fetching...');
    const [targetResolutionDates, setTargetResolutionDates] = useState({});

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

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [editingResourceRowId]);

    const [showHelpPopup, setShowHelpPopup] = useState(false);
    const helpPopupRef = useRef(null);

    useEffect(() => {
        const handleHelpClickOutside = (event) => {
            if (helpPopupRef.current && !helpPopupRef.current.contains(event.target)) {
                setShowHelpPopup(false);
            }
        };
        if (showHelpPopup) {
            document.addEventListener('mousedown', handleHelpClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleHelpClickOutside);
        };
    }, [showHelpPopup]);
    const fetchResourceRoster = useCallback(async () => {
        const projectId = localStorage.getItem('project_id') || selectedProject?.id;
        try {
            const idToken = await getIdToken();
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            };

            const response = await fetch(`https://oi5gtp4f3l.execute-api.ap-south-1.amazonaws.com/New/newApi/ricew/resourceRoster/byProject?project_id=${projectId}`, {
                headers: headers
            });

            if (response.status === 401 || response.status === 403) {
                handleAuthError();
                return;
            }

            if (response.ok) {
                const result = await response.json();
                if (result.data) {
                    const transformedOptions = result.data.map(item => ({
                        id: DOMPurify.sanitize(item.Resource_Roster_Form_id || '', { ALLOWED_TAGS: [] }),
                        value: DOMPurify.sanitize(item.Resource_Roster_Form_id || '', { ALLOWED_TAGS: [] }),
                        label: DOMPurify.sanitize(item.IC_full_name || '', { ALLOWED_TAGS: [] }),
                        displayName: DOMPurify.sanitize(item.IC_full_name || '', { ALLOWED_TAGS: [] }),
                        email: DOMPurify.sanitize(item.IC_email || '', { ALLOWED_TAGS: [] }),
                        userId: DOMPurify.sanitize(item.user_id || '', { ALLOWED_TAGS: [] })
                    })).filter(opt => opt.label !== '');

                    transformedOptions.sort((a, b) => a.label.localeCompare(b.label));
                    setResourceOptions(transformedOptions);
                }
            }
        } catch (error) {
            console.error('Error fetching roster data:', error);
        }
    }, [selectedProject, handleAuthError]);

    const fetchRiskIssueData = useCallback(async () => {
        setLoading(true);
        try {
            const projectId = localStorage.getItem('project_id') || selectedProject?.id;
            const idToken = await getIdToken();
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            };

            // Fetch both Risk/Issue records and their assignment status in parallel
            const [riskIssueResponse, assignmentResponse] = await Promise.all([
                fetch(`https://ves5hu7c23.execute-api.ap-south-1.amazonaws.com/New/ricew/riskIssueAssignment/unassigned?Project_id=${projectId}`, { headers }),
                fetch(`https://ves5hu7c23.execute-api.ap-south-1.amazonaws.com/New/ricew/riskIssueAssignment/getPending?projectId=${projectId}`, { headers })
            ]);

            if (riskIssueResponse.status === 401 || riskIssueResponse.status === 403 ||
                assignmentResponse.status === 401 || assignmentResponse.status === 403) {
                handleAuthError();
                return;
            }

            const riskIssueResult = await riskIssueResponse.json();
            const assignmentResult = await assignmentResponse.json();

            // Set debug log so the user can verify exactly what getPending returned!
            setDebugLog(JSON.stringify(assignmentResult));

            if (riskIssueResult.success || assignmentResult.success) {
                const riskIssueList = riskIssueResult.success ? (riskIssueResult.data || []) : [];
                const assignmentList = assignmentResult.success ? (assignmentResult.records || assignmentResult.data || []) : [];

                // Initialize data and merge with assignment status
                const mergedData = riskIssueList.map(item => {
                    const titleToCheck = item.riskIssue_title || item.title || item.RiskAndIssueFormId;
                    const assignment = assignmentList.find(a => (a.riskIssue_title || a.RiskIssue_Object) === titleToCheck);

                    const rawStatus = assignment ? assignment.Status_Submitted : null;
                    const assignWorkStart = assignment ? (assignment.assign_work_start || assignment.Assign_work_start) : null;
                    const isWorkAssigned = assignWorkStart === 'true' || assignWorkStart === true;
                    
                    const workStatus = assignment?.assign_work_status || item.assign_work_status || '';
                    const issueStatus = assignment?.riskIssue_status || item.riskIssue_status || '';
                    
                    // State 1: Record is officially reopened but not yet re-assigned by the DM
                    // It is eligible if globally Reopened, but not yet marked Reopened in the assignment table
                    const isReopenedEligible = issueStatus === 'Reopened' && workStatus !== 'Reopened';
                    // State 2: DM has re-assigned it, and it's waiting for the technician to start work
                    const isReopenedProcessed = workStatus === 'Reopened';

                    return {
                        ...item,
                        title: DOMPurify.sanitize(titleToCheck || '', { ALLOWED_TAGS: [] }),
                        riskIssueResourceId: assignment ? DOMPurify.sanitize(assignment.Resource_Roster_Form_id || assignment.Choose_Resource_Technical || assignment.Choose_Resource_RiskIssue || '', { ALLOWED_TAGS: [] }) : '',
                        riskIssueResource: assignment ? DOMPurify.sanitize(assignment.Choose_Resource_Technical || assignment.Choose_Resource_RiskIssue || '', { ALLOWED_TAGS: [] }) : '',
                        riskIssueResourceName: assignment ? DOMPurify.sanitize(assignment.Technical_name || assignment.Choose_Resource_Technical || assignment.Choose_Resource_RiskIssue || '', { ALLOWED_TAGS: [] }) : '',
                        emailDisplay: assignment ? DOMPurify.sanitize(assignment.Email_Address || '', { ALLOWED_TAGS: [] }) : '',
                        assignmentTimestamp: assignment ? (assignment.created_timestamp || '') : '',
                        assignmentId: assignment ? DOMPurify.sanitize(assignment.Risk_Issue_Assignment_id || assignment.RiskAndIssueSpecificationAssignment_id || '', { ALLOWED_TAGS: [] }) : '',
                        isSubmitted: !!assignment,
                        // Locked if normally assigned OR if it's already been re-assigned (Processed)
                        isFullyAssigned: isReopenedProcessed || (!isReopenedEligible && (rawStatus === 'Assign' || isWorkAssigned)),
                        // Hide if work started, UNLESS it's in one of our special reopened states
                        isWorkAssigned: !(isReopenedEligible || isReopenedProcessed) && isWorkAssigned,
                        submittedStatusText: (isReopenedProcessed || isReopenedEligible) ? 'Reopened' : ((rawStatus === 'Assign' || isWorkAssigned) ? 'Assigned' : (rawStatus === 'true' || rawStatus === true ? 'Processed' : null)),
                        riskIssueUserId: assignment ? (assignment.Technical_user_id || assignment.RiskIssue_user_id || '') : '',
                        assign_work_status: workStatus,
                        riskIssue_status: issueStatus,
                        isReopenedEligible,
                        isReopenedProcessed,
                        Target_Resolution_Date: assignment
                            ? (assignment.target_resolution_date || assignment.Target_Resolution_Date || '')
                            : (item.target_resolution_date || item.Target_Resolution_Date || ''),
                        RiskAndIssueDisplayId: DOMPurify.sanitize(item.RiskAndIssueDisplayId || '', { ALLOWED_TAGS: [] })
                    };
                });

                // The backend API for /unassigned stops returning records once they are assigned.
                // But we still need to show them properly until assign_work_status is "true"!
                // So we check our assignmentList for any orphaned assignments that were dropped and re-attach them:
                assignmentList.forEach(assignment => {
                    const titleToCheck = assignment.riskIssue_title || assignment.RiskIssue_Object;
                    const exists = mergedData.find(m => m.title === titleToCheck);
                    
                    if (!exists) {
                        const rawStatus = assignment.Status_Submitted || null;
                        const assignWorkStart = assignment.assign_work_start || assignment.Assign_work_start || null;
                        const isWorkAssignedRaw = assignWorkStart === 'true' || assignWorkStart === true;
                        const workStatus = assignment.assign_work_status || '';
                        const issueStatus = assignment.riskIssue_status || '';
                        const isReopenedEligible = issueStatus === 'Reopened' && workStatus !== 'Reopened';
                        const isReopenedProcessed = workStatus === 'Reopened';
                        
                        mergedData.push({
                            title: DOMPurify.sanitize(titleToCheck || '', { ALLOWED_TAGS: [] }),
                            RiskAndIssueFormId: DOMPurify.sanitize(assignment.RiskAndIssueFormId || assignment.Risk_Issue_Assignment_id || titleToCheck || '', { ALLOWED_TAGS: [] }),
                            riskIssueResourceId: DOMPurify.sanitize(assignment.Resource_Roster_Form_id || assignment.Choose_Resource_Technical || assignment.Choose_Resource_RiskIssue || '', { ALLOWED_TAGS: [] }),
                            riskIssueResource: DOMPurify.sanitize(assignment.Choose_Resource_Technical || assignment.Choose_Resource_RiskIssue || '', { ALLOWED_TAGS: [] }),
                            riskIssueResourceName: DOMPurify.sanitize(assignment.Technical_name || assignment.Choose_Resource_Technical || assignment.Choose_Resource_RiskIssue || '', { ALLOWED_TAGS: [] }),
                            emailDisplay: DOMPurify.sanitize(assignment.Email_Address || '', { ALLOWED_TAGS: [] }),
                            assignmentTimestamp: assignment.created_timestamp || '',
                            assignmentId: DOMPurify.sanitize(assignment.Risk_Issue_Assignment_id || assignment.RiskAndIssueSpecificationAssignment_id || '', { ALLOWED_TAGS: [] }),
                            isSubmitted: true,
                            // If it's reopened, it's locked (fully assigned) in the UI
                            isFullyAssigned: isReopenedProcessed || (!isReopenedEligible && (rawStatus === 'Assign' || isWorkAssignedRaw)),
                            isWorkAssigned: !(isReopenedEligible || isReopenedProcessed) && isWorkAssignedRaw,
                            submittedStatusText: (isReopenedProcessed || isReopenedEligible) ? 'Reopened' : ((rawStatus === 'Assign' || isWorkAssignedRaw) ? 'Assigned' : (rawStatus === 'true' || rawStatus === true ? 'Processed' : null)),
                            riskIssueUserId: assignment.Technical_user_id || assignment.RiskIssue_user_id || '',
                            assign_work_status: workStatus,
                            riskIssue_status: issueStatus,
                            isReopenedEligible,
                            isReopenedProcessed,
                            Target_Resolution_Date: assignment.target_resolution_date || assignment.Target_Resolution_Date || '',
                            RiskAndIssueDisplayId: DOMPurify.sanitize(assignment.RiskAndIssueDisplayId || assignment.DisplayId || '', { ALLOWED_TAGS: [] })
                        });
                    }
                });

                // Apply the strictly requested filter!
                const finalData = mergedData.filter(item => !item.isWorkAssigned);

                // Sort Logic
                finalData.sort((a, b) => {
                    const parseDate = (dateStr) => {
                        if (!dateStr) return 0;
                        try {
                            // Try standard Date parsing (works for ISO and many other formats)
                            const d = new Date(dateStr);
                            if (!isNaN(d.getTime())) return d.getTime();

                            // Fallback for DD/MM/YYYY HH:mm:ss which Date constructor often fails on
                            const cleanDate = dateStr.replace('_', '/').replace(',', '');
                            const [datePart, timePart] = cleanDate.split(' ');
                            if (datePart && datePart.includes('/')) {
                                const [day, month, year] = datePart.split('/').map(Number);
                                let hours = 0, minutes = 0, seconds = 0;
                                if (timePart) {
                                    const hms = timePart.split(':').map(Number);
                                    hours = hms[0] || 0;
                                    minutes = hms[1] || 0;
                                    seconds = hms[2] || 0;
                                }
                                const manualDate = new Date(year, month - 1, day, hours, minutes, seconds);
                                if (!isNaN(manualDate.getTime())) return manualDate.getTime();
                            }
                            return 0;
                        } catch (e) { return 0; }
                    };

                    const getGroup = (item) => {
                        if (item.isReopenedEligible) return 1; // Top
                        if (item.isWorkAssigned) return 5;
                        if (item.isSubmitted && !item.isFullyAssigned) return 2;
                        if (!item.isSubmitted) return 3;
                        if (item.isReopenedProcessed) return 6; // Last
                        return 4;
                    };

                    const groupA = getGroup(a);
                    const groupB = getGroup(b);

                    if (groupA !== groupB) return groupA - groupB;

                    // Within the same group, sort by latest date first
                    const timeA = parseDate(a.assignmentTimestamp || a.created_date || a.date_raised);
                    const timeB = parseDate(b.assignmentTimestamp || b.created_date || b.date_raised);

                    if (timeB !== timeA) return timeB - timeA;

                    // Fallback to ID sorting (latest ID first)
                    const idA = parseInt(a.assignmentId || a.RiskAndIssueFormId) || 0;
                    const idB = parseInt(b.assignmentId || b.RiskAndIssueFormId) || 0;
                    return idB - idA;
                });

                setRiskIssueData(finalData);
            } else {
                console.error("API returned success: false");
                setRiskIssueData([]);
            }
        } catch (error) {
            console.error("Error fetching Risk and Issue data:", error);
            setRiskIssueData([]);
        } finally {
            setLoading(false);
        }
    }, [selectedProject, handleAuthError]);

    useEffect(() => {
        fetchRiskIssueData();
        fetchResourceRoster();
    }, [fetchRiskIssueData, fetchResourceRoster]);

    // Sync Select All checkbox
    useEffect(() => {
        const selectableRows = riskIssueData.filter(row => !row.isFullyAssigned && row.riskIssueResource && row.emailDisplay);
        const allSelected = selectableRows.length > 0 && selectableRows.every(row => selectedRows.includes(row.RiskAndIssueFormId));
        setSelectAll(allSelected);
    }, [selectedRows, riskIssueData]);

    // Sync Status Select All checkbox
    useEffect(() => {
        const selectableRows = riskIssueData.filter(row => !row.submittedStatusText && row.riskIssueResource && row.emailDisplay);
        const allSelected = selectableRows.length > 0 && selectableRows.every(row => selectedStatusRows.includes(row.RiskAndIssueFormId));
        setSelectAllStatus(allSelected);
    }, [selectedStatusRows, riskIssueData]);

    const handleResourceChange = (id, resourceId, email, displayName, userId) => {
        setEditingValues(prev => ({
            ...prev,
            [id]: {
                resourceId: DOMPurify.sanitize(resourceId || '', { ALLOWED_TAGS: [] }),
                email: DOMPurify.sanitize(email || '', { ALLOWED_TAGS: [] }),
                displayName: DOMPurify.sanitize(displayName || resourceId || '', { ALLOWED_TAGS: [] }),
                userId: DOMPurify.sanitize(userId || '', { ALLOWED_TAGS: [] })
            }
        }));
    };

    const handleUnsavedResourceChange = (id, resourceId, email, displayName, userId) => {
        setRiskIssueData(prev => prev.map(row =>
            row.RiskAndIssueFormId === id
                ? {
                    ...row,
                    riskIssueResourceId: DOMPurify.sanitize(resourceId || '', { ALLOWED_TAGS: [] }),
                    riskIssueResource: DOMPurify.sanitize(resourceId || '', { ALLOWED_TAGS: [] }),
                    riskIssueResourceName: DOMPurify.sanitize(displayName || resourceId || '', { ALLOWED_TAGS: [] }),
                    emailDisplay: DOMPurify.sanitize(email || '', { ALLOWED_TAGS: [] }),
                    riskIssueUserId: DOMPurify.sanitize(userId || '', { ALLOWED_TAGS: [] })
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

        const row = riskIssueData.find(r => r.RiskAndIssueFormId === rowId);
        let apiSuccess = false;

        // If NOT Reopened, call the API immediately
        if (row && row.riskIssue_status !== 'Reopened') {
            setLoading(true);
            try {
                const idToken = await getIdToken();
                const userId = localStorage.getItem('user_id') || 'system';
                const projectId = localStorage.getItem('project_id') || selectedProject?.id;

                const record = {
                    riskIssue_title: DOMPurify.sanitize(row.title || '', { ALLOWED_TAGS: [] }),
                    Choose_Resource_Technical: DOMPurify.sanitize(edits.displayName || '', { ALLOWED_TAGS: [] }),
                    Email_Address: DOMPurify.sanitize(edits.email || '', { ALLOWED_TAGS: [] }),
                    Status_Submitted: true,
                    Project_id: projectId,
                    created_by: userId,
                    updated_by: userId,
                    user_id: userId,
                    Resource_Roster_Form_id: DOMPurify.sanitize(edits.resourceId || '', { ALLOWED_TAGS: [] }),
                    RiskAndIssueFormId: DOMPurify.sanitize(row.RiskAndIssueFormId || '', { ALLOWED_TAGS: [] }),
                    RiskAndIssueDisplayId: DOMPurify.sanitize(row.RiskAndIssueDisplayId || '', { ALLOWED_TAGS: [] }),
                    RICEWRequestFormId: DOMPurify.sanitize(row.RICEWRequestFormId || '', { ALLOWED_TAGS: [] }),
                    Technical_user_id: DOMPurify.sanitize(edits.userId || '', { ALLOWED_TAGS: [] }),
                    Technical_name: DOMPurify.sanitize(edits.displayName || '', { ALLOWED_TAGS: [] }),
                    Target_Resolution_Date: formatToIso(targetResolutionDates[rowId] || row.Target_Resolution_Date || '')
                };

                const response = await fetch('https://ves5hu7c23.execute-api.ap-south-1.amazonaws.com/New/ricew/riskIssueAssignment/createSubmit', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`
                    },
                    body: JSON.stringify({ records: [record] })
                });

                if (response.status === 401 || response.status === 403) {
                    handleAuthError();
                    return;
                }

                const result = await response.json();
                if (response.ok && result.success) {
                    apiSuccess = true;
                } else {
                    throw new Error(result.error || 'Failed to save assignment');
                }
            } catch (err) {
                setErrorMessage(err.message);
                setShowErrorMessage(true);
                setTimeout(() => setShowErrorMessage(false), 5000);
                setLoading(false);
                return;
            } finally {
                setLoading(false);
            }
        }

        // Apply changes to local state
        setRiskIssueData(prev => prev.map(row =>
            row.RiskAndIssueFormId === rowId
                ? {
                    ...row,
                    riskIssueResourceId: edits.resourceId,
                    riskIssueResource: edits.resourceId,
                    riskIssueResourceName: edits.displayName,
                    emailDisplay: edits.email,
                    riskIssueUserId: edits.userId || ''
                }
                : row
        ));

        setEditingResourceRowId(null);
        setEditingValues(prev => {
            const newValues = { ...prev };
            delete newValues[rowId];
            return newValues;
        });

        if (apiSuccess) {
            setSuccessMessage('Assignment saved successfully.');
            setShowSuccessMessage(true);
            setTimeout(() => setShowSuccessMessage(false), 3000);
            fetchRiskIssueData(); // Refresh to reflect "Assigned" status
        } else {
            setSuccessMessage('Changes applied locally. Click "Assign Object" or "Process" to save.');
            setShowSuccessMessage(true);
            setTimeout(() => setShowSuccessMessage(false), 3000);
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
            const selectableIds = riskIssueData
                .filter(row => !row.isFullyAssigned && row.riskIssueResource && row.emailDisplay)
                .map(item => item.RiskAndIssueFormId);
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

    const handleSelectAllStatus = (e) => {
        const isChecked = e.target.checked;
        setSelectAllStatus(isChecked);
        if (isChecked) {
            const selectableIds = riskIssueData
                .filter(row => !row.submittedStatusText && row.riskIssueResource && row.emailDisplay)
                .map(item => item.RiskAndIssueFormId);
            setSelectedStatusRows(selectableIds);
        } else {
            setSelectedStatusRows([]);
        }
    };

    const handleSelectRowStatus = (id) => {
        setSelectedStatusRows(prev => {
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

    const handleSubmit = async () => {
        if (isActionInProgress) return;
        if (selectedStatusRows.length === 0) {
            setErrorMessage('Please select at least one record to submit.');
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 3000);
            return;
        }

        const count = selectedStatusRows.length;
        setConfirmMessage(`Are you sure you want to process ${count} ${count === 1 ? 'record' : 'records'}?`);
        setConfirmAction(() => async () => {
            setIsActionInProgress(true);
            setLoading(true);
            try {
                const idToken = await getIdToken();
                const userId = localStorage.getItem('user_id') || 'system';
                const projectId = localStorage.getItem('project_id') || selectedProject?.id;

                const recordsToSubmit = selectedStatusRows.map(rowId => {
                    const row = riskIssueData.find(r => r.RiskAndIssueFormId === rowId);
                    if (!row) return null;
                    return {
                        riskIssue_title: DOMPurify.sanitize(row.title || '', { ALLOWED_TAGS: [] }),
                        Choose_Resource_Technical: DOMPurify.sanitize(row.riskIssueResourceName || '', { ALLOWED_TAGS: [] }),
                        Email_Address: DOMPurify.sanitize(row.emailDisplay || '', { ALLOWED_TAGS: [] }),
                        Status_Submitted: true,
                        Project_id: projectId,
                        created_by: userId,
                        updated_by: userId,
                        user_id: userId,
                        Resource_Roster_Form_id: DOMPurify.sanitize(row.riskIssueResourceId || '', { ALLOWED_TAGS: [] }),
                        RiskAndIssueFormId: DOMPurify.sanitize(row.RiskAndIssueFormId || '', { ALLOWED_TAGS: [] }),
                        RiskAndIssueDisplayId: DOMPurify.sanitize(row.RiskAndIssueDisplayId || '', { ALLOWED_TAGS: [] }),
                        RICEWRequestFormId: DOMPurify.sanitize(row.RICEWRequestFormId || '', { ALLOWED_TAGS: [] }),
                        Technical_user_id: DOMPurify.sanitize(row.riskIssueUserId || '', { ALLOWED_TAGS: [] }),
                        Technical_name: DOMPurify.sanitize(row.riskIssueResourceName || '', { ALLOWED_TAGS: [] }),
                        Target_Resolution_Date: formatToIso(targetResolutionDates[row.RiskAndIssueFormId] || row.Target_Resolution_Date || '')
                    };
                }).filter(Boolean);

                const response = await fetch('https://ves5hu7c23.execute-api.ap-south-1.amazonaws.com/New/ricew/riskIssueAssignment/createSubmit', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`
                    },
                    body: JSON.stringify({ records: recordsToSubmit })
                });

                if (response.status === 401 || response.status === 403) {
                    handleAuthError();
                    return;
                }

                const result = await response.json();

                if (response.ok && result.success) {
                    const processedCount = result.processedCount || recordsToSubmit.length;
                    setSuccessMessage(`Successfully processed ${processedCount} ${processedCount === 1 ? 'record' : 'records'}.`);
                    setShowSuccessMessage(true);
                    setTimeout(() => setShowSuccessMessage(false), 3000);

                    setSelectedStatusRows([]);
                    setSelectAllStatus(false);
                    fetchRiskIssueData();
                } else {
                    setErrorMessage(result.error || 'Failed to process records. Check console for details.');
                    setShowErrorMessage(true);
                    setTimeout(() => setShowErrorMessage(false), 5000);
                }
            } catch (error) {
                console.error('Submission error:', error);
                setErrorMessage('An error occurred during submission. Please try again.');
                setShowErrorMessage(true);
                setTimeout(() => setShowErrorMessage(false), 5000);
            } finally {
                setLoading(false);
                setIsActionInProgress(false);
            }
        });
        setShowConfirmDialog(true);
    };

    const handleAssignObject = async () => {
        if (isActionInProgress) return;
        if (selectedRows.length === 0) {
            setErrorMessage('Please select at least one record to assign.');
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 3000);
            return;
        }

        const count = selectedRows.length;
        setConfirmMessage(`Are you sure you want to assign ${count} ${count === 1 ? 'record' : 'records'}?`);
        setConfirmAction(() => async () => {
            setIsActionInProgress(true);
            setLoading(true);
            try {
                const idToken = await getIdToken();
                const userId = localStorage.getItem('user_id') || 'system';
                const projectId = localStorage.getItem('project_id') || selectedProject?.id;

                const recordsToAssign = selectedRows.map(rowId => {
                    const row = riskIssueData.find(r => r.RiskAndIssueFormId === rowId);
                    if (!row) return null;
                    return {
                        riskIssue_title: row.title || '',
                        Choose_Resource_Technical: row.riskIssueResourceName || '',
                        Email_Address: row.emailDisplay || '',
                        Project_id: projectId,
                        created_by: userId,
                        updated_by: userId,
                        user_id: userId,
                        Resource_Roster_Form_id: row.riskIssueResourceId || '',
                        RiskAndIssueFormId: row.RiskAndIssueFormId || '',
                        RiskAndIssueDisplayId: row.RiskAndIssueDisplayId || '',
                        RICEWRequestFormId: row.RICEWRequestFormId || '',
                        Technical_user_id: row.riskIssueUserId || '',
                        Technical_name: row.riskIssueResourceName || '',
                        Target_Resolution_Date: formatToIso(targetResolutionDates[row.RiskAndIssueFormId] || row.Target_Resolution_Date || ''),
                        Risk_Issue_Reopened: row.riskIssue_status === 'Reopened' ? "true" : "false"
                    };
                }).filter(Boolean);

                const response = await fetch('https://ves5hu7c23.execute-api.ap-south-1.amazonaws.com/New/ricew/riskIssueAssignment/assign', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`
                    },
                    body: JSON.stringify({ records: recordsToAssign })
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    // Send Bulk Email for assigned records
                    const currentProjectName = localStorage.getItem('project_name') || selectedProject?.name || '';

                    const emailPayload = recordsToAssign.map(record => ({
                        toEmail: record.Email_Address,
                        userName: record.Technical_name,
                        projectName: currentProjectName,
                        riskTitle: record.riskIssue_title,
                        RiskAndIssueFormId: record.RiskAndIssueFormId,
                        project_id: record.Project_id,
                        Risk_Issue_Reopened: record.Risk_Issue_Reopened
                    }));

                    try {
                        await fetch('https://ves5hu7c23.execute-api.ap-south-1.amazonaws.com/New/email-Send/risk-issue-assignment', {
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
                    fetchRiskIssueData();
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
                setIsActionInProgress(false);
            }
        });
        setShowConfirmDialog(true);
    };

    return (
        <div className="config-main" style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '0', margin: '0' }}>
            <div style={{ padding: '1rem 1rem 2rem 1rem', width: '100%', minWidth: '1470px', margin: '0', boxSizing: 'border-box' }}>

                {/* Main Content Area */}
                <div style={{
                    backgroundColor: 'white',
                    padding: '0',
                    borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    paddingBottom: (isLOVOpen && lovOpenRowIndex !== null && lovOpenRowIndex >= riskIssueData.length - 3) ? '150px' : '0'
                }}>

                    {/* Project Info Header */}
                    <div style={{ padding: '2rem 1rem 1rem 2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project : <span style={{ color: '#007bff' }}>{localStorage.getItem('project_name') || selectedProject?.name}</span></h3>
                        </div>
                    </div>

                    {/* Page Title */}
                    <div className="config-header" style={{ marginTop: '0', marginRight: "0px", display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 2rem' }}>
                        <h2 style={{ margin: 0 }}>Risk And Issue Assignment Form</h2>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <button onClick={() => setShowHelpPopup(!showHelpPopup)} style={{ backgroundColor: '#4D5C74', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s ease', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3d495c'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4D5C74'}>
                                <HelpCircle size={18} />
                                Help
                            </button>
                            {showHelpPopup && (
                                <div style={{ position: 'fixed', top: '0', left: '0', right: '0', bottom: '0', backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 30000, padding: '20px' }}>
                                    <div ref={helpPopupRef} style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                                        <div className="help-modal-scroll" style={{ overflowY: 'auto', padding: '32px', textAlign: 'left', flex: '1' }}>
                                            <button onClick={() => setShowHelpPopup(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545' }}><X size={20} /></button>
                                            <h3 style={{ margin: '0 0 16px 0', color: '#333', fontSize: '18px', fontWeight: '600' }}>Help & Information</h3>
                                            <div style={{ color: '#444', fontSize: '14px', lineHeight: '1.6' }}>
                                                <div style={{ marginBottom: '16px' }}>
                                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>What is this page?</strong>
                                                    <p style={{ margin: '6px 0 0 0', color: '#555' }}>The <strong>Risk And Issue Assignment Form</strong> allows delivery managers to assign risk and issue objects to resolution writers and manage assignments.</p>
                                                </div>
                                                <div style={{ marginBottom: '16px' }}>
                                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to assign objects</strong>
                                                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                                        <li>Select a <strong>Resource</strong> from the dropdown for each risk/issue object.</li>
                                                        <li>Use the checkboxes to select rows, then click <strong>Assign Object</strong>.</li>
                                                        <li>Set a <strong>Target Resolution Date</strong> if applicable.</li>
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
                            minWidth: '1330px'
                        }}>
                            {/* Spacers for columns 1-4 to match table grid */}
                            <div style={{ width: '60px', flex: '0 0 60px' }}></div>
                            <div style={{ flex: 1, minWidth: '150px' }}></div>
                            <div style={{ flex: 1, minWidth: '250px' }}></div>
                            <div style={{ flex: 1, minWidth: '320px' }}></div>
                            <div style={{ flex: 1, minWidth: '250px' }}></div>
                            <div style={{ width: '200px', flex: '0 0 200px' }}></div>

{/* Status Column (Col 5) - Submit Button */}
                            {/* <div style={{
                                flex: 1,
                                minWidth: '200px',
                                display: 'flex',
                                justifyContent: 'center',
                                padding: '0 4px',
                            }}>
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading || isActionInProgress || selectedStatusRows.length === 0}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        padding: '8px 24px',
                                        backgroundColor: (loading || selectedStatusRows.length === 0) ? '#6c757d' : '#28a745',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: (loading || selectedStatusRows.length === 0) ? 'not-allowed' : 'pointer',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        transition: 'all 0.2s ease',
                                        whiteSpace: 'nowrap',
                                        width: 'max-content',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!loading && selectedStatusRows.length > 0) {
                                            e.currentTarget.style.backgroundColor = '#218838';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!loading && selectedStatusRows.length > 0) {
                                            e.currentTarget.style.backgroundColor = '#28a745';
                                        }
                                    }}
                                >
                                    {isActionInProgress && selectedStatusRows.length > 0 ? 'Processing...' : 'Process'}
                                </button>
                            </div> */}

                            {/* Select Column (Col 7) - Assign Object Button */}
                            <div style={{
                                width: '120px',
                                flex: '0 0 120px',
                                display: 'flex',
                                justifyContent: 'center',
                                padding: '0 4px'
                            }}>
                                <button
                                    onClick={handleAssignObject}
                                    disabled={loading || isActionInProgress || selectedRows.length === 0}
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
                                    {isActionInProgress && selectedRows.length > 0 ? 'Assigning...' : 'Assign Object'}
                                </button>
                            </div>
                        </div>

                        {/* Table Header and Body Section */}
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
                                minWidth: '1330px'
                            }}>
                                <div style={{ width: '60px', flex: '0 0 60px', padding: '12px 8px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', backgroundColor: 'white', textAlign: 'center' }}>Sr. No.</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '150px', backgroundColor: 'white' }}>Record ID</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '250px', backgroundColor: 'white' }}>Risk / Issue Title</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '320px', backgroundColor: 'white' }}>Choose Resource From the Roster</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '250px', backgroundColor: 'white' }}>Email Address</div>
                                <div style={{ width: '200px', flex: '0 0 200px', padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', backgroundColor: 'white', textAlign: 'center' }}>Target Resolution Date</div>
                                {/* <div style={{
                                    flex: 1,
                                    padding: '12px 12px',
                                    fontWeight: 'bold',
                                    fontSize: '14px',
                                    color: '#333',
                                    borderRight: '1px solid #ddd',
                                    minWidth: '200px',
                                    backgroundColor: 'white',
                                    textAlign: 'center',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                }}>
                                    <div style={{ lineHeight: '1.2' }}>Status<br />(Processed and ready for assignment)</div>
                                    <input
                                        type="checkbox"
                                        checked={selectAllStatus}
                                        onChange={handleSelectAllStatus}
                                        disabled={!riskIssueData.some(row => !row.submittedStatusText && row.riskIssueResource && row.emailDisplay)}
                                        style={{
                                            cursor: !riskIssueData.some(row => !row.submittedStatusText && row.riskIssueResource && row.emailDisplay) ? 'not-allowed' : 'pointer',
                                            width: '16px',
                                            height: '16px'
                                        }}
                                    />
                                </div> */}
                                <div style={{
                                    width: '120px',
                                    flex: '0 0 120px',
                                    padding: '12px 12px',
                                    fontWeight: 'bold',
                                    fontSize: '14px',
                                    color: '#333',
                                    backgroundColor: !riskIssueData.some(row => !row.isFullyAssigned && row.riskIssueResource && row.emailDisplay) ? '#f0f0f0' : 'white',
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
                                        disabled={!riskIssueData.some(row => !row.isFullyAssigned && row.riskIssueResource && row.emailDisplay)}
                                        style={{
                                            cursor: !riskIssueData.some(row => !row.isFullyAssigned && row.riskIssueResource && row.emailDisplay) ? 'not-allowed' : 'pointer',
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
                                minWidth: '1330px',
                                backgroundColor: 'white'
                            }}>
                                {loading ? (
                                    <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Loading records...</div>
                                ) : riskIssueData.length > 0 ? (
                                    riskIssueData.map((row, index) => (
                                        <div
                                            key={row.RiskAndIssueFormId}
                                            style={{
                                                display: 'flex',
                                                backgroundColor: (row.isWorkAssigned || row.isReopenedProcessed) ? '#f2f2f2' : (index % 2 === 0 ? '#ffffff' : '#fafafa'),
                                                borderBottom: '1px solid #ddd',
                                                minWidth: '1330px',
                                                color: (row.isWorkAssigned || row.isReopenedProcessed) ? '#666' : '#333',
                                                transition: 'background-color 0.2s ease'
                                            }}
                                        >
                                            {/* Sr. No. */}
                                            <div style={{ width: '60px', flex: '0 0 60px', padding: '12px 8px', fontSize: '13px', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '500' }}>
                                                {index + 1}
                                            </div>

                                            <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', minWidth: '150px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span>{row.RiskAndIssueDisplayId || '-'}</span>
                                                {(row.isReopenedEligible || row.isReopenedProcessed) && (
                                                    <span style={{
                                                        backgroundColor: '#fbc02d',
                                                        color: '#000',
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                        fontSize: '10px',
                                                        fontWeight: 'bold',
                                                        textTransform: 'uppercase',
                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                                    }}>
                                                        Reopened
                                                    </span>
                                                )}
                                            </div>

                                            {/* Risk / Issue Title */}
                                            <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', minWidth: '250px', display: 'flex', alignItems: 'center', wordBreak: 'break-word' }}>
                                                <span
                                                    style={{
                                                        cursor: 'pointer',
                                                        color: '#3b82f6',
                                                        textDecoration: 'none',
                                                        fontWeight: '500'
                                                    }}
                                                    onClick={() => navigate(`/dashboard/risk-and-issue-specification-view/${row.RiskAndIssueFormId}`)}
                                                    onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                                    onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                                                >
                                                    {row.title || '-'}
                                                </span>
                                            </div>

                                            {/* Choose Resource */}
                                            <div
                                                ref={editingResourceRowId === row.RiskAndIssueFormId ? editContainerRef : null}
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
                                                {editingResourceRowId === row.RiskAndIssueFormId ? (
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        width: '100%',
                                                        maxWidth: '100%',
                                                        overflow: 'hidden'
                                                    }}>
                                                        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                                                            <RiskAndIssueResourceAutocomplete
                                                                value={editingValues[row.RiskAndIssueFormId]?.resourceId ?? row.riskIssueResourceId}
                                                                emailValue={editingValues[row.RiskAndIssueFormId]?.email ?? row.emailDisplay}
                                                                options={resourceOptions}
                                                                onChange={(resourceId, email, displayName, userId) => {
                                                                    handleResourceChange(row.RiskAndIssueFormId, resourceId, email, displayName, userId);
                                                                }}
                                                                projectId={localStorage.getItem('project_id') || selectedProject?.id}
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
                                                                onClick={() => handleSaveEdit(row.RiskAndIssueFormId)}
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
                                                                onClick={() => handleCancelEdit(row.RiskAndIssueFormId)}
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
                                                    <RiskAndIssueResourceAutocomplete
                                                        value={row.riskIssueResourceId || ''}
                                                        emailValue={row.emailDisplay || ''}
                                                        options={resourceOptions}
                                                        onChange={(resourceId, email, displayName, userId) => {
                                                            handleUnsavedResourceChange(row.RiskAndIssueFormId, resourceId, email, displayName, userId);
                                                        }}
                                                        projectId={localStorage.getItem('project_id') || selectedProject?.id}
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
                                                            {row.riskIssueResourceName || '-'}
                                                        </span>
                                                        {!row.isFullyAssigned && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditingResourceRowId(row.RiskAndIssueFormId);
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

                                            {/* Target Resolution Date */}
                                            <div style={{ width: '200px', flex: '0 0 200px', padding: '8px 12px', fontSize: '13px', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <span>{formatDateForDisplay(row.Target_Resolution_Date) || '-'}</span>
                                            </div>

                                            {/* Status */}
                                            {/* <div style={{
                                                flex: 1,
                                                padding: '12px 12px',
                                                fontSize: '13px',
                                                borderRight: '1px solid #ddd',
                                                minWidth: '200px',
                                                textAlign: 'center',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                backgroundColor: (!row.submittedStatusText && (!row.riskIssueResource || !row.emailDisplay)) ? '#f0f0f0' : 'transparent'
                                            }}>
                                                {row.submittedStatusText ? (
                                                    <span style={{
                                                        color: row.submittedStatusText === 'Assigned' ? '#28a745' : (row.submittedStatusText === 'Reopened' ? '#92400e' : '#007bff'),
                                                        fontWeight: '600',
                                                        padding: '4px 12px',
                                                        backgroundColor: row.submittedStatusText === 'Assigned' ? '#f0fff4' : (row.submittedStatusText === 'Reopened' ? '#fef3c7' : '#e7f3ff'),
                                                        borderRadius: '4px',
                                                        border: `1px solid ${row.submittedStatusText === 'Assigned' ? '#c6f6d5' : (row.submittedStatusText === 'Reopened' ? '#fde68a' : '#b6daff')}`,
                                                        fontSize: '12px'
                                                    }}>
                                                        {row.submittedStatusText}
                                                    </span>
                                                ) : (
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedStatusRows.includes(row.RiskAndIssueFormId)}
                                                        onChange={() => handleSelectRowStatus(row.RiskAndIssueFormId)}
                                                        disabled={!row.riskIssueResource || !row.emailDisplay}
                                                        style={{
                                                            cursor: (!row.riskIssueResource || !row.emailDisplay) ? 'not-allowed' : 'pointer',
                                                            width: '16px',
                                                            height: '16px'
                                                        }}
                                                    />
                                                )}
                                            </div> */}

                                            {/* Select */}
                                            <div style={{
                                                width: '120px',
                                                flex: '0 0 120px',
                                                padding: '12px 12px',
                                                borderRight: '1px solid #ddd',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '4px',
                                                backgroundColor: (!row.riskIssueResource || !row.emailDisplay || (row.isFullyAssigned && !row.submittedStatusText)) ? '#f0f0f0' : 'transparent'
                                            }}>
                                                {row.submittedStatusText && (
                                                    <span style={{
                                                        color: row.submittedStatusText === 'Assigned' ? '#28a745' : (row.submittedStatusText === 'Reopened' ? '#92400e' : '#007bff'),
                                                        fontWeight: '600',
                                                        padding: '2px 8px',
                                                        backgroundColor: row.submittedStatusText === 'Assigned' ? '#f0fff4' : (row.submittedStatusText === 'Reopened' ? '#fef3c7' : '#e7f3ff'),
                                                        borderRadius: '4px',
                                                        border: `1px solid ${row.submittedStatusText === 'Assigned' ? '#c6f6d5' : (row.submittedStatusText === 'Reopened' ? '#fde68a' : '#b6daff')}`,
                                                        fontSize: '10px',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {row.submittedStatusText}
                                                    </span>
                                                )}
                                                {!row.isFullyAssigned && (
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedRows.includes(row.RiskAndIssueFormId)}
                                                        onChange={() => handleSelectRow(row.RiskAndIssueFormId)}
                                                        disabled={!row.riskIssueResource || !row.emailDisplay}
                                                        style={{
                                                            cursor: (!row.riskIssueResource || !row.emailDisplay) ? 'not-allowed' : 'pointer',
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
                    .animate-spin { animation: spin 1s linear infinite; }
                    .help-modal-scroll::-webkit-scrollbar { width: 4px; }
                    .help-modal-scroll::-webkit-scrollbar-track { background: transparent; margin: 8px 0; }
                    .help-modal-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                    .help-modal-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                `}</style>
            </div>
        </div>
    );
};

export default RiskAndIssueSpecificationAssignmentForm;
