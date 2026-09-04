import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getIdToken } from '../../../utils/cognito-auth';
import { ClientResourceAutocomplete } from './ClientRosterLOVlist';

const ClientFunctionalUnitTestingAssignmentForm = ({ selectedProject, onBackToLanding }) => {
    const navigate = useNavigate();
    const [ricewData, setRicewData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedRows, setSelectedRows] = useState([]);
    const [selectAll, setSelectAll] = useState(false);

    const [clientOptions, setClientOptions] = useState([]);

    // Confirmation dialog states
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const [confirmMessage, setConfirmMessage] = useState('');

    // API Status States
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [showErrorMessage, setShowErrorMessage] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const [editingRowId, setEditingRowId] = useState(null);
    const [editingValues, setEditingValues] = useState({}); // { ricewId: { clientId, name, email } }
    const [isLOVOpen, setIsLOVOpen] = useState(false);
    const [lovOpenRowIndex, setLovOpenRowIndex] = useState(null);
    const editContainerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (editContainerRef.current && !editContainerRef.current.contains(event.target)) {
                setEditingRowId(null);
                setLovOpenRowIndex(null);
            }
        };

        if (editingRowId) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [editingRowId]);

    const fetchClientRoster = useCallback(async () => {
        const projectId = localStorage.getItem('project_id') || selectedProject?.id || '101';
        try {
            const idToken = await getIdToken();
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            };

            const response = await fetch(`https://07eirxky2f.execute-api.ap-south-1.amazonaws.com/New/api/ClientRosterForm/getAll?project_id=${projectId}`, { headers });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    const transformedOptions = result.data.map(item => ({
                        id: item.Client_Roster_Form_id,
                        value: item.Client_Roster_Form_id,
                        label: item.Client_name || '',
                        name: item.Client_name || '',
                        displayName: item.Client_name || '',
                        email: item.Email_Address || item.Email || '',
                        userId: item.Client_user_id || item.user_id || ''
                    })).filter(opt => opt.label !== '');

                    transformedOptions.sort((a, b) => a.label.localeCompare(b.label));
                    setClientOptions(transformedOptions);
                }
            }
        } catch (error) {
            console.error('Error fetching client roster:', error);
        }
    }, [selectedProject]);

    const fetchRicewData = useCallback(async () => {
        setLoading(true);
        try {
            const projectId = localStorage.getItem('project_id') || selectedProject?.id || '101';
            const idToken = await getIdToken();
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            };

            const [ricewResponse, assignmentResponse] = await Promise.all([
                fetch(`https://07eirxky2f.execute-api.ap-south-1.amazonaws.com/New/api/FunctionalTestingAssignment/getAll?projectId=${projectId}`, { headers }),
                fetch(`https://07eirxky2f.execute-api.ap-south-1.amazonaws.com/New/api/ricew/clientFunctionalTestingSpecificationAssignment/getRecord-byProject?Project_id=${projectId}`, { headers })
            ]);

            const ricewResult = await ricewResponse.json();
            const assignmentResult = await assignmentResponse.json();

            const ricewList = ricewResult.data || [];
            const assignmentList = (assignmentResult && assignmentResult.success) ? (assignmentResult.data || []) : [];

            // Initialize data and merge with assignment status
            const mergedData = ricewList.map(item => {
                const assignment = assignmentList.find(a => a.RICEWRequestFormId === item.RICEWRequestFormId);
                const rawStatus = assignment ? assignment.Status_Assign_Object : null;
                const submittedFlag = assignment ? assignment.Status_Submitted : null;
                const assignWorkStatus = assignment ? assignment.assign_work_status : null;
                const isWorkAssigned = assignWorkStatus === 'yes';

                return {
                    ...item,
                    id: item.Functional_Testing_Assignment_id || item.RICEWRequestFormId,
                    ricewObjectName: item.RICEW_Object,
                    clientId: assignment ? (assignment.Client_Roster_Form_id || '') : (item.Client_Roster_Form_id || ''),
                    clientUserId: assignment ? (assignment.Client_user_id || '') : '',
                    clientName: assignment ? (assignment.Client_name || assignment.Choose_Resource_Client || assignment.clientName) : (item.Client_Name || ''),
                    clientEmail: assignment ? (assignment.Email_Address || assignment.Email || assignment.clientEmail) : (item.Client_Email || ''),
                    assignmentTimestamp: assignment ? (assignment.updated_timestamp || assignment.created_timestamp || '') : '',
                    assignmentId: assignment ? (assignment.Client_Functional_Testing_Specification_Assignment || '') : '',
                    isSubmitted: !!assignment,
                    isFullyAssigned: assignment?.Status_Notification === 'Sent' || submittedFlag === 'Assign' || isWorkAssigned,
                    isWorkAssigned: isWorkAssigned,
                    notificationSent: assignment?.Status_Notification === 'Sent',
                    submittedStatusText: (assignment?.Status_Notification === 'Sent' || submittedFlag === 'Assign' || isWorkAssigned) ? 'Assigned' : ((submittedFlag === 'true' || submittedFlag === true) ? 'Processed' : null),
                };
            });

            // Sort Logic
            mergedData.sort((a, b) => {
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

                // Group Priority: Processed (1) -> Unsaved (2) -> Assigned (3)
                const getGroup = (item) => {
                    if (item.isFullyAssigned) return 3;
                    if (item.isSubmitted && !item.isFullyAssigned) return 1; // Processed
                    return 2; // Unsaved
                };

                const groupA = getGroup(a);
                const groupB = getGroup(b);

                if (groupA !== groupB) return groupA - groupB;

                if (a.isSubmitted) {
                    const timeA = parseDate(a.assignmentTimestamp);
                    const timeB = parseDate(b.assignmentTimestamp);
                    if (timeB !== timeA) return timeB - timeA;
                    return (b.assignmentId || '').localeCompare(a.assignmentId || '');
                } else {
                    const timeA = parseDate(a.created_timestamp);
                    const timeB = parseDate(b.created_timestamp);
                    if (timeB !== timeA) return timeB - timeA;
                    return (b.RICEWRequestFormId || '').localeCompare(a.RICEWRequestFormId || '');
                }
            });

            setRicewData(mergedData.filter(item => !item.isWorkAssigned));
        } catch (error) {
            console.error("Error fetching RICEW data:", error);
            setRicewData([]);
        } finally {
            setLoading(false);
        }
    }, [selectedProject]);

    useEffect(() => {
        fetchRicewData();
        fetchClientRoster();
    }, [fetchRicewData, fetchClientRoster]);

    // Sync Select All checkbox
    useEffect(() => {
        const selectableRows = ricewData.filter(row => !row.notificationSent && row.clientName && row.clientEmail);
        const allSelected = selectableRows.length > 0 && selectableRows.every(row => selectedRows.includes(row.id));
        setSelectAll(allSelected);
    }, [selectedRows, ricewData]);



    const handleClientChange = (rowId, clientId, name, email, clientUserId) => {
        setEditingValues(prev => ({
            ...prev,
            [rowId]: { clientId, name, email, clientUserId }
        }));
    };

    const handleSaveEdit = async (rowId) => {
        const edits = editingValues[rowId];
        if (!edits) {
            setEditingRowId(null);
            return;
        }

        setLoading(true);
        try {
            const projectId = localStorage.getItem('project_id') || selectedProject?.id || '101';
            const createdBy = localStorage.getItem('user_id') || 'system';
            const idToken = await getIdToken();
            const row = ricewData.find(r => r.id === rowId);

            const records = [{
                RICEW_Object: row.ricewObjectName,
                Choose_Resource_Client: edits.name || '',
                Email_Address: edits.email || '',
                Status_Submitted: true,
                Project_id: projectId,
                created_by: createdBy,
                Client_Roster_Form_id: edits.clientId || '',
                RICEWRequestFormId: row.RICEWRequestFormId,
                Client_user_id: edits.clientUserId || '',
                Client_name: edits.name || ''
            }];

            const response = await fetch('https://07eirxky2f.execute-api.ap-south-1.amazonaws.com/New/api/ricew/clientFunctionalTestingSpecificationAssignment/createSubmit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ records })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                setEditingRowId(null);
                setSuccessMessage('Record updated successfully');
                setShowSuccessMessage(true);
                setTimeout(() => setShowSuccessMessage(false), 3000);
                await fetchRicewData();
            } else {
                throw new Error(result.error || 'Failed to update record');
            }
        } catch (error) {
            console.error('Update error:', error);
            setErrorMessage(error.message || 'Failed to update record');
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 5000);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelEdit = () => {
        setEditingRowId(null);
        setLovOpenRowIndex(null);
    };

    const handleUnsavedClientChange = (id, clientId, name, email, clientUserId) => {
        setRicewData(prev => prev.map(row =>
            row.id === id
                ? {
                    ...row,
                    clientId: clientId,
                    clientUserId: clientUserId,
                    clientName: name,
                    clientEmail: email
                }
                : row
        ));
    };

    const handleSelectAll = (e) => {
        const isChecked = e.target.checked;
        setSelectAll(isChecked);
        if (isChecked) {
            setSelectedRows(ricewData.filter(row => !row.isFullyAssigned).map(item => item.id));
        } else {
            setSelectedRows([]);
        }
    };

    const handleSelectRow = (id) => {
        setSelectedRows(prev => prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]);
    };





    const handleSendNotification = () => {
        if (selectedRows.length === 0) return;
        const count = selectedRows.length;
        setConfirmMessage(`Are you sure you want to assign ${count} ${count === 1 ? 'record' : 'records'}?`);
        setConfirmAction(() => async () => {
            setLoading(true);
            try {
                const projectId = localStorage.getItem('project_id') || selectedProject?.id || '101';
                const projectName = localStorage.getItem('project_name') || selectedProject?.name || 'ERP Project';
                const createdBy = localStorage.getItem('user_id') || 'system';
                const idToken = await getIdToken();

                const records = selectedRows.map(rowId => {
                    const row = ricewData.find(r => r.id === rowId);
                    return {
                        RICEW_Object: row.ricewObjectName,
                        Choose_Resource_Client: row.clientName || '',
                        Email_Address: row.clientEmail || '',
                        Project_id: projectId,
                        created_by: createdBy,
                        updated_by: createdBy,
                        Client_Roster_Form_id: row.clientId || '',
                        RICEWRequestFormId: row.RICEWRequestFormId,
                        Client_user_id: row.clientUserId || '',
                        Client_name: row.clientName || ''
                    };
                });

                // Step 1: Call assign API
                const assignResponse = await fetch('https://07eirxky2f.execute-api.ap-south-1.amazonaws.com/New/api/ricew/clientFunctionalTestingSpecificationAssignment/assign', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`
                    },
                    body: JSON.stringify({ records })
                });

                const assignResult = await assignResponse.json();

                if (!assignResponse.ok || !assignResult.success) {
                    throw new Error(assignResult.error || 'Failed to assign records');
                }

                // Step 2: Call email notification API
                const emailPayload = selectedRows.map(rowId => {
                    const row = ricewData.find(r => r.id === rowId);
                    return {
                        toEmail: row.clientEmail,
                        Client_name: row.clientName,
                        projectName: projectName,
                        ricewObject: row.ricewObjectName
                    };
                });

                const emailResponse = await fetch('https://07eirxky2f.execute-api.ap-south-1.amazonaws.com/New/api/send/client-functional-testing-assignment', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`
                    },
                    body: JSON.stringify(emailPayload)
                });

                const emailResult = await emailResponse.json();

                if (emailResponse.ok && emailResult.success) {
                    setSuccessMessage(`Successfully assigned ${count} ${count === 1 ? 'object' : 'objects'}.`);
                    setShowSuccessMessage(true);
                    setTimeout(() => setShowSuccessMessage(false), 3000);
                    setSelectedRows([]);
                    setSelectAll(false);
                    await fetchRicewData();
                } else {
                    const failedCount = emailResult.failedCount || 0;
                    if (failedCount > 0 && failedCount < count) {
                        setSuccessMessage(`Partially successful: ${count - failedCount} objects assigned, ${failedCount} failed.`);
                        setShowSuccessMessage(true);
                        setTimeout(() => setShowSuccessMessage(false), 5000);
                        await fetchRicewData();
                    } else {
                        throw new Error(emailResult.error || 'Failed to send email notifications');
                    }
                }
            } catch (error) {
                console.error('Assign/Notification error:', error);
                setErrorMessage(error.message || 'Failed to send notifications.');
                setShowErrorMessage(true);
                setTimeout(() => setShowErrorMessage(false), 5000);
            } finally {
                setLoading(false);
            }
        });
        setShowConfirmDialog(true);
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

    return (
        <div className="config-main" style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '0', margin: '0' }}>
            <div style={{ padding: '1rem 1rem 2rem 1rem', width: '100%', minWidth: '1320px', margin: '0', boxSizing: 'border-box' }}>
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    paddingBottom: (isLOVOpen && lovOpenRowIndex !== null && lovOpenRowIndex >= ricewData.length - 3) ? '150px' : '0'
                }}>
                    {/* Project Info Header */}
                    <div style={{ padding: '2rem 1rem 1rem 2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project: {localStorage.getItem('project_name') || selectedProject?.name}</h3>
                        </div>
                    </div>

                    {/* Page Title */}
                    <div className="config-header" style={{ marginTop: '0', marginRight: "0px" }}>
                        <h2>Client Functional Testing Assignment Form</h2>
                    </div>

                    <div style={{ padding: '20px' }}>
                        {/* Action Buttons Row */}
                        <div style={{ display: 'flex', width: '100%', padding: '8px 0', alignItems: 'flex-end', minWidth: '1180px' }}>
                            <div style={{ width: '60px', flex: '0 0 60px' }}></div>
                            <div style={{ flex: 1, minWidth: '250px' }}></div>
                            <div style={{ flex: 1, minWidth: '320px' }}></div>
                            <div style={{ flex: 1, minWidth: '250px' }}></div>

                            <div style={{ width: '100px', flex: '0 0 100px', display: 'flex', justifyContent: 'center', padding: '0 4px' }}>
                                <button
                                    onClick={handleSendNotification}
                                    disabled={loading || selectedRows.length === 0}
                                    style={{
                                        padding: '8px 16px',
                                        backgroundColor: (loading || selectedRows.length === 0) ? '#6c757d' : '#007bff',
                                        color: 'white', border: 'none', borderRadius: '6px',
                                        cursor: (loading || selectedRows.length === 0) ? 'not-allowed' : 'pointer',
                                        fontSize: '14px', fontWeight: '600', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                    }}
                                >
                                    {loading ? 'Sending...' : 'Send Notification'}
                                </button>
                            </div>
                        </div>

                        {/* Table */}
                        <div style={{ border: '1px solid #ddd', overflowX: 'auto', width: '100%', boxSizing: 'border-box', marginTop: '10px' }}>
                            {/* Table Header */}
                            <div style={{ display: 'flex', borderBottom: '1px solid #ddd', backgroundColor: 'white', minWidth: '1180px' }}>
                                <div style={{ width: '60px', flex: '0 0 60px', padding: '12px 8px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', textAlign: 'center' }}>Sr. No.</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '250px' }}>RICEW Object</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '320px' }}>Assign Client From the Roster</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '250px' }}>Email Address</div>

                                <div style={{
                                    width: '100px',
                                    flex: '0 0 100px',
                                    padding: '12px 12px',
                                    fontWeight: 'bold',
                                    fontSize: '14px',
                                    color: '#333',
                                    textAlign: 'center',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    backgroundColor: !ricewData.some(row => !row.notificationSent && row.clientName && row.clientEmail) ? '#f0f0f0' : 'white'
                                }}>
                                    <div>Select</div>
                                    <input
                                        type="checkbox"
                                        checked={selectAll}
                                        onChange={handleSelectAll}
                                        disabled={!ricewData.some(row => !row.notificationSent && row.clientName && row.clientEmail)}
                                        style={{
                                            cursor: !ricewData.some(row => !row.notificationSent && row.clientName && row.clientEmail) ? 'not-allowed' : 'pointer',
                                            width: '16px',
                                            height: '16px',
                                            marginTop: '6px'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Table Body */}
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: '1180px', backgroundColor: 'white' }}>
                                {loading ? (
                                    <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Loading records...</div>
                                ) : ricewData.length > 0 ? (
                                    ricewData.map((row, index) => (
                                        <div key={row.id} style={{ display: 'flex', borderBottom: '1px solid #ddd', minWidth: '1180px', backgroundColor: row.isFullyAssigned ? '#f0fff4' : 'white' }}>
                                            <div style={{ width: '60px', flex: '0 0 60px', padding: '12px 8px', fontSize: '13px', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{index + 1}</div>
                                            <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', minWidth: '250px', display: 'flex', alignItems: 'center' }}>
                                                <span style={{ cursor: 'pointer', color: '#3b82f6', fontWeight: '500' }} onClick={() => navigate(`/dashboard/functional-specification-view/${row.RICEWRequestFormId}?from=client-functional-testing-assignment`)}>{row.ricewObjectName}</span>
                                            </div>
                                            <div ref={editingRowId === row.id ? editContainerRef : null} style={{ flex: 1, padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', minWidth: '320px', display: 'flex', alignItems: 'center' }}>
                                                {editingRowId === row.id ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                                                        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                                                            <ClientResourceAutocomplete
                                                                value={editingValues[row.id]?.clientId || row.clientId || ''}
                                                                emailValue={editingValues[row.id]?.email || row.clientEmail || ''}
                                                                options={clientOptions}
                                                                onChange={(clientId, name, email, clientUserId) => {
                                                                    handleClientChange(row.id, clientId, name, email, clientUserId);
                                                                }}
                                                                projectId={localStorage.getItem('project_id') || selectedProject?.id || '101'}
                                                                onDropdownStateChange={setIsLOVOpen}
                                                                rowIndex={index}
                                                            />
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '4px', flexShrink: 0, alignItems: 'center' }}>
                                                            <button onClick={() => handleSaveEdit(row.id)} style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: '#28a745', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Save">
                                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                            </button>
                                                            <button onClick={handleCancelEdit} style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Cancel">
                                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : !row.isSubmitted ? (
                                                    <ClientResourceAutocomplete
                                                        value={row.clientId || ''}
                                                        emailValue={row.clientEmail || ''}
                                                        options={clientOptions}
                                                        onChange={(clientId, name, email, clientUserId) => {
                                                            handleUnsavedClientChange(row.id, clientId, name, email, clientUserId);
                                                        }}
                                                        projectId={localStorage.getItem('project_id') || selectedProject?.id || '101'}
                                                        onDropdownStateChange={setIsLOVOpen}
                                                        rowIndex={index}
                                                    />
                                                ) : (
                                                    <div style={{ width: '100%', color: '#333', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.clientName || '-'}</span>
                                                        {!row.isFullyAssigned && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditingRowId(row.id);
                                                                    setLovOpenRowIndex(index);
                                                                }}
                                                                style={{
                                                                    background: 'none', border: 'none', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', borderRadius: '4px', transition: 'all 0.2s ease'
                                                                }}
                                                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f3f4f6'; e.currentTarget.style.color = '#3b82f6'; }}
                                                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#6b7280'; }}
                                                                title="Edit Client"
                                                            >
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', minWidth: '250px', display: 'flex', alignItems: 'center' }}>{row.clientEmail || '-'}</div>
                                            <div style={{
                                                width: '100px',
                                                flex: '0 0 100px',
                                                padding: '12px 12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                backgroundColor: (!row.clientName || !row.clientEmail) && !row.isFullyAssigned ? '#f0f0f0' : 'transparent'
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
                                                        checked={selectedRows.includes(row.id)}
                                                        onChange={() => handleSelectRow(row.id)}
                                                        disabled={!row.clientName || !row.clientEmail}
                                                        style={{ cursor: (!row.clientName || !row.clientEmail) ? 'not-allowed' : 'pointer', width: '16px', height: '16px' }}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ padding: '32px', textAlign: 'center', color: '#999', fontSize: '14px' }}>No records found</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirmation Dialog */}
            {showConfirmDialog && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', maxWidth: '400px', width: '90%', textAlign: 'center' }}>
                        <h3 style={{ margin: '0 0 16px 0', color: '#333', fontSize: '18px', fontWeight: '600' }}>Confirmation</h3>
                        <p style={{ margin: '0 0 24px 0', color: '#666', fontSize: '14px', lineHeight: '1.6' }}>{confirmMessage}</p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button onClick={() => setShowConfirmDialog(false)} style={{ backgroundColor: '#6b7280', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '6px', cursor: 'pointer', fontSize: '16px' }}>Cancel</button>
                            <button onClick={handleConfirmYes} style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '6px', cursor: 'pointer', fontSize: '16px' }}>Yes</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Status Messages */}
            {showSuccessMessage && (
                <div style={{ position: 'fixed', top: '20px', right: '20px', backgroundColor: '#10b981', color: 'white', padding: '12px 20px', borderRadius: '6px', zIndex: 9999, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    {successMessage}
                </div>
            )}
            {showErrorMessage && (
                <div style={{ position: 'fixed', top: '20px', right: '20px', backgroundColor: '#ef4444', color: 'white', padding: '12px 20px', borderRadius: '6px', zIndex: 9999, fontSize: '14px' }}>
                    {errorMessage}
                </div>
            )}

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .animate-spin { animation: spin 1s linear infinite; }
            `}</style>
        </div>
    );
};

export default ClientFunctionalUnitTestingAssignmentForm;
