import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Trash2, Plus } from 'lucide-react';

const PublicInitiateClientFunctionalTesterView = () => {
    const { id } = useParams();
    const [workData, setWorkData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [projectName, setProjectName] = useState('');

    // Feedback Form State
    const [ownerName, setOwnerName] = useState('');
    const [ownerEmail, setOwnerEmail] = useState('');
    const [ricewStatus, setRicewStatus] = useState('');
    const [feedbackRows, setFeedbackRows] = useState([
        { id: Date.now(), text: '', fileName: '', fileUrl: '', feedback_business_owner_id: '', subRows: [] }
    ]);

    // Toast Message States
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    // Confirmation Dialog States
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [confirmMessage, setConfirmMessage] = useState('');
    const [pendingDecisionChange, setPendingDecisionChange] = useState(null);

    const isClosed = (val) => {
        if (!val) return false;
        const lower = val.toLowerCase();
        return lower === 'close' || lower === 'closed';
    };

    const fetchData = useCallback(async (isSilent = false) => {
        if (!id) return;
        if (!isSilent) setLoading(true);
        try {
            const headers = {
                'Content-Type': 'application/json'
            };

            // Fetch Assignments
            const assignmentResponse = await fetch(`https://07eirxky2f.execute-api.ap-south-1.amazonaws.com/New/publicView/ricew/clientFunctionalTestingAssignment/byRequestForm?RICEWRequestFormId=${id}`, { headers });
            const assignmentResult = await assignmentResponse.json();

            if (assignmentResult.success && assignmentResult.data) {
                // Fetch Initiated Work for each assignment
                const initiatedWorkPromises = assignmentResult.data.map(async (assignment) => {
                    try {
                        const projectId = assignment.Project_id || '101';
                        const response = await fetch(
                            `https://07eirxky2f.execute-api.ap-south-1.amazonaws.com/New/publicView/ricew/clientFunctionalTestingAssignment/byProjectAndAssignment?project_id=${projectId}&assignment_id=${assignment.Client_Functional_Testing_Specification_Assignment}`,
                            { headers }
                        );
                        const result = await response.json();
                        return {
                            assignment: assignment,
                            assignmentId: assignment.Client_Functional_Testing_Specification_Assignment,
                            data: result.success && result.data ? result.data : []
                        };
                    } catch (error) {
                        console.error(`Error fetching initiated work for assignment ${assignment.Client_Functional_Testing_Specification_Assignment}:`, error);
                        return {
                            assignment: assignment,
                            assignmentId: assignment.Client_Functional_Testing_Specification_Assignment,
                            data: []
                        };
                    }
                });

                const initiatedWorkResults = await Promise.all(initiatedWorkPromises);

                const mappedData = [];
                initiatedWorkResults.forEach(({ assignment, data }) => {
                    // Date Formatting Helper
                    const formatToIST = (rawTimestamp) => {
                        if (!rawTimestamp || rawTimestamp === '-') return '-';
                        try {
                            const cleanDate = rawTimestamp.replace('_', '/').replace(',', '');
                            const [datePart, timePart] = cleanDate.split(' ');
                            if (!datePart || !timePart) return rawTimestamp;

                            const [d, m, y] = datePart.split('/').map(Number);
                            const [h, min, s] = timePart.split(':').map(Number);
                            const dateUTC = new Date(Date.UTC(y, m - 1, d, h, min, s));

                            return dateUTC.toLocaleString('en-IN', {
                                timeZone: 'Asia/Kolkata',
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                            });
                        } catch (e) {
                            return rawTimestamp;
                        }
                    };

                    data.forEach(initiatedWork => {
                        let uploadFiles = [];
                        if (initiatedWork && Array.isArray(initiatedWork.Upload_Object)) {
                            uploadFiles = initiatedWork.Upload_Object.filter(f => f.url && f.url !== '-');
                        } else if (initiatedWork && typeof initiatedWork.Upload_Object === 'string' && initiatedWork.Upload_Object !== '-' && initiatedWork.Upload_Object.trim() !== '') {
                            try {
                                const parsed = JSON.parse(initiatedWork.Upload_Object);
                                if (Array.isArray(parsed)) {
                                    uploadFiles = parsed.filter(f => f.url && f.url !== '-');
                                } else {
                                    uploadFiles = [{ url: initiatedWork.Upload_Object, File_Name: initiatedWork.File_Name || 'document.pdf' }];
                                }
                            } catch (e) {
                                uploadFiles = [{ url: initiatedWork.Upload_Object, File_Name: initiatedWork.File_Name || 'document.pdf' }];
                            }
                        }

                        const hasUploadedFile = uploadFiles.length > 0;
                        const hasEndDate = initiatedWork && initiatedWork.End_Date && initiatedWork.End_Date !== '-' && initiatedWork.End_Date.trim() !== '';

                        if (hasEndDate) {
                            mappedData.push({
                                ...assignment,
                                ricewObject: assignment.RICEW_Object || initiatedWork.RICEW_Object || '-',
                                assignedDate: formatToIST(initiatedWork.updated_timestamp || initiatedWork.created_timestamp || assignment.updated_timestamp || assignment.created_timestamp) || '-',
                                startObject: initiatedWork ? initiatedWork.Start_Object : '-',
                                uploadFiles: uploadFiles,
                                endDate: initiatedWork ? initiatedWork.End_Date : '-',
                                isStarted: true,
                                isUploaded: hasUploadedFile,
                                hasEndDate: hasEndDate,
                                Initiate_Work_id: initiatedWork?.Client_Functional_Testing_Specification_Initiate_Work_id || ''
                            });
                        }
                    });
                });

                setWorkData(mappedData);

                // Fetch Project Name
                if (mappedData.length > 0) {
                    const projectId = mappedData[0].Project_id;
                    if (projectId) {
                        try {
                            const projResp = await fetch(`https://3oi9y6i52k.execute-api.ap-south-1.amazonaws.com/New/publicView/ricew/rice-project-definition/getProjectData?Project_ID=${encodeURIComponent(projectId)}`, { headers });
                            const projResult = await projResp.json();
                            if (projResult.success && projResult.data && projResult.data.length > 0) {
                                setProjectName(projResult.data[0].Project_Name || '');
                            }

                            // Fetch Owner Details
                            const detailsResp = await fetch(`https://07eirxky2f.execute-api.ap-south-1.amazonaws.com/New/publicView/ricew/clientFunctionalTestingAssignment/details?project_id=${projectId}&ricew_id=${id}`, { headers });
                            const detailsResult = await detailsResp.json();
                            if (detailsResult.success) {
                                setOwnerName(detailsResult.data.client_SI_Technical_Owner || '');
                                setOwnerEmail(detailsResult.data.client_SI_Technical_Owner_email || '');
                                setRicewStatus(detailsResult.data.RICEW_Status || '');
                            }
                        } catch (e) {
                            console.error("Error fetching project details:", e);
                        }
                    }
                }
            } else {
                setWorkData([]);
            }
        } catch (error) {
            console.error("Error fetching work data:", error);
            setWorkData([]);
        } finally {
            if (!isSilent) setLoading(false);
        }
    }, [id]);

    const fetchFeedback = useCallback(async (assignmentId, isSilent = false) => {
        if (!assignmentId) return;
        if (!isSilent) setLoading(true);

        const normalizeDecision = (val) => {
            if (!val) return 'Open';
            const lower = val.toLowerCase();
            if (lower === 'close' || lower === 'closed') return 'Close';
            if (lower === 'open') return 'Open';
            return val;
        };

        try {
            const response = await fetch(`https://qnlyrtzvjc.execute-api.ap-south-1.amazonaws.com/New/api/FunctionalTestingFeedback/FetchAll?Client_Functional_Testing_Specification_Assignment=${assignmentId}`);
            const result = await response.json();
            if (result.success && result.data && result.data.length > 0) {
                const fetchedRows = result.data.map(item => {
                    const resMain = item.tester_responses && item.tester_responses.length > 0 ? item.tester_responses[0] : null;
                    return {
                        id: item.Client_Functional_Testing_SI_Technical_owner_id || Date.now() + Math.random(),
                        text: item.feedback_text || '',
                        fileName: item.supported_doccument_name || '',
                        fileUrl: item.supported_doccument || '#',
                        business_owner_decision: normalizeDecision(item.SI_Technical_Owner_Decision_open_closed || item.business_owner_decision),
                        feedback_business_owner_id: item.Client_Functional_Testing_SI_Technical_owner_id,
                        response: resMain ? {
                            text: resMain.feedback_text || '',
                            fileName: resMain.supported_doccument_name || '',
                            fileUrl: resMain.supported_doccument || '#'
                        } : null,
                        subRows: item.sub_feedbacks ? item.sub_feedbacks.map(subItem => {
                            const resSub = subItem.tester_responses && subItem.tester_responses.length > 0 ? subItem.tester_responses[0] : null;
                            return {
                                id: subItem.Client_Functional_Testing_SI_Technical_owner_id || Date.now() + Math.random(),
                                text: subItem.feedback_text || '',
                                fileName: subItem.supported_doccument_name || '',
                                fileUrl: subItem.supported_doccument || '#',
                                business_owner_decision: normalizeDecision(subItem.SI_Technical_Owner_Decision_open_closed || subItem.business_owner_decision || subItem.business_owner_decission),
                                feedback_business_owner_id: subItem.Client_Functional_Testing_SI_Technical_owner_id || '',
                                response: resSub ? {
                                    text: resSub.feedback_text || '',
                                    fileName: resSub.supported_doccument_name || '',
                                    fileUrl: resSub.supported_doccument || '#'
                                } : null
                            };
                        }) : []
                    };
                });
                setFeedbackRows(fetchedRows);
            }
        } catch (error) {
            console.error("Error fetching feedback:", error);
        } finally {
            if (!isSilent) setLoading(false);
        }
    }, []);

    const getFileViewUrl = (url, fileName) => {
        if (!url || url === '-' || !url.startsWith('http')) return url;
        const extension = (fileName || url.split('?')[0]).split('.').pop().toLowerCase();
        if (['xlsx', 'xls', 'csv', 'docx', 'doc'].includes(extension)) {
            return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`;
        }
        return encodeURI(url);
    };

    const showConfirmation = (message, action) => {
        setConfirmMessage(message);
        setPendingDecisionChange(() => action);
        setShowConfirmDialog(true);
    };

    const handleConfirmYes = () => {
        if (pendingDecisionChange) {
            pendingDecisionChange();
        }
        setShowConfirmDialog(false);
        setConfirmMessage('');
        setPendingDecisionChange(null);
    };

    const handleConfirmCancel = () => {
        setShowConfirmDialog(false);
        setConfirmMessage('');
        setPendingDecisionChange(null);
    };

    const handleAddRow = () => {
        setFeedbackRows([
            ...feedbackRows,
            { id: Date.now(), text: '', fileName: '', fileUrl: '', feedback_business_owner_id: '', business_owner_decision: 'Open', subRows: [] }
        ]);
    };

    const handleRemoveRow = (id) => {
        if (feedbackRows.length > 1) {
            setFeedbackRows(feedbackRows.filter(row => row.id !== id));
        }
    };

    const updateDecisionApi = async (Client_Functional_Testing_SI_Technical_owner_id, decision) => {
        try {
            const response = await fetch('https://qnlyrtzvjc.execute-api.ap-south-1.amazonaws.com/New/api/SITechnicalOwner/UpdateDecision', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ Client_Functional_Testing_SI_Technical_owner_id, decision })
            });
            const result = await response.json();
            return result.success;
        } catch (error) {
            console.error("Error updating decision:", error);
            return false;
        }
    };

    const handleRowChange = (id, field, value) => {
        if (field === 'business_owner_decision') {
            const currentRow = feedbackRows.find(r => r.id === id);
            if (currentRow.business_owner_decision !== value) {
                showConfirmation(
                    `Are you sure you want to change the decision to "${value}"?`,
                    async () => {
                        setFeedbackRows(prev => prev.map(row =>
                            row.id === id ? { ...row, [field]: value } : row
                        ));
                        const recordId = currentRow?.feedback_business_owner_id || (typeof id === 'string' ? id : null);
                        if (recordId) {
                            const success = await updateDecisionApi(recordId, value);
                            if (success) {
                                const firstWork = workData[0];
                                if (firstWork?.Client_Functional_Testing_Specification_Assignment) {
                                    fetchFeedback(firstWork.Client_Functional_Testing_Specification_Assignment, true);
                                }
                            }
                        }
                    }
                );
                return;
            }
        }

        setFeedbackRows(prev => prev.map(row =>
            row.id === id ? { ...row, [field]: value } : row
        ));
    };

    const handleFeedbackFileUpload = (id, e) => {
        const file = e.target.files[0];
        if (file) {
            setFeedbackRows(prev => prev.map(row =>
                row.id === id ? { ...row, fileName: file.name, fileUrl: '#', fileObj: file } : row
            ));
        }
        e.target.value = null;
    };

    const handleAddSubRow = (parentId) => {
        setFeedbackRows(prev => prev.map(row =>
            row.id === parentId
                ? { ...row, subRows: [...row.subRows, { id: Date.now(), text: '', fileName: '', fileUrl: '', business_owner_decision: 'Open' }] }
                : row
        ));
    };

    const handleRemoveSubRow = (parentId, subRowId) => {
        setFeedbackRows(prev => prev.map(row =>
            row.id === parentId
                ? { ...row, subRows: row.subRows.filter(sr => sr.id !== subRowId) }
                : row
        ));
    };

    const handleSubRowChange = (parentId, subRowId, field, value) => {
        if (field === 'business_owner_decision') {
            const parentRow = feedbackRows.find(r => r.id === parentId);
            const currentSubRow = parentRow?.subRows?.find(sr => sr.id === subRowId);
            if (currentSubRow && currentSubRow.business_owner_decision !== value) {
                showConfirmation(
                    `Are you sure you want to change the decision to "${value}"?`,
                    async () => {
                        setFeedbackRows(prev => prev.map(row =>
                            row.id === parentId
                                ? {
                                    ...row,
                                    subRows: row.subRows.map(sr =>
                                        sr.id === subRowId ? { ...sr, [field]: value } : sr
                                    )
                                }
                                : row
                        ));
                        const recordId = currentSubRow?.feedback_business_owner_id || (typeof subRowId === 'string' ? subRowId : null);
                        if (recordId) {
                            const success = await updateDecisionApi(recordId, value);
                            if (success) {
                                const firstWork = workData[0];
                                if (firstWork?.Client_Functional_Testing_Specification_Assignment) {
                                    fetchFeedback(firstWork.Client_Functional_Testing_Specification_Assignment, true);
                                }
                            }
                        }
                    }
                );
                return;
            }
        }

        setFeedbackRows(prev => prev.map(row =>
            row.id === parentId
                ? {
                    ...row,
                    subRows: row.subRows.map(sr =>
                        sr.id === subRowId ? { ...sr, [field]: value } : sr
                    )
                }
                : row
        ));
    };

    const handleSubRowFileUpload = (parentId, subRowId, e) => {
        const file = e.target.files[0];
        if (file) {
            setFeedbackRows(prev => prev.map(row =>
                row.id === parentId
                    ? { ...row, subRows: row.subRows.map(sr => sr.id === subRowId ? { ...sr, fileName: file.name, fileUrl: '#', fileObj: file } : sr) }
                    : row
            ));
        }
        e.target.value = null;
    };

    const handleSubmitDocument = async (isFromApprove) => {
        const isApproveFlow = isFromApprove === true;
        if (workData.length === 0) {
            alert("No feedback data found to submit.");
            return false;
        }

        const firstWork = workData[0];
        setLoading(true);

        try {
            const allFilesToUpload = [];

            feedbackRows.forEach(row => {
                if (row.fileObj) allFilesToUpload.push({ file: row.fileObj, rowRef: row });
                if (row.subRows) {
                    row.subRows.forEach(subRow => {
                        if (subRow.fileObj) allFilesToUpload.push({ file: subRow.fileObj, rowRef: subRow });
                    });
                }
            });

            if (allFilesToUpload.length > 0) {
                const docPayload = allFilesToUpload.map((item, index) => {
                    const originalName = item.file.name;
                    const lastDotIndex = originalName.lastIndexOf('.');
                    let newName = originalName;
                    if (lastDotIndex !== -1) {
                        const namePart = originalName.substring(0, lastDotIndex);
                        const extPart = originalName.substring(lastDotIndex);
                        newName = `${namePart}_${Date.now() + index}${extPart}`;
                    } else {
                        newName = `${originalName}_${Date.now() + index}`;
                    }
                    return {
                        name: newName,
                        type: item.file.type || 'application/octet-stream'
                    };
                });

                const presignResponse = await fetch('https://qnlyrtzvjc.execute-api.ap-south-1.amazonaws.com/New/generate-presigned-urls/Feedback-SI-Technical-Owner-pdf', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        project_id: firstWork.Project_id || '',
                        Client_Functional_Testing_Specification_Assignment: firstWork.Client_Functional_Testing_Specification_Assignment || '',
                        RICEWRequestFormId: id,
                        ricew_object: firstWork.ricewObject || '',
                        documents: docPayload
                    })
                });

                const presignResult = await presignResponse.json();

                if (presignResult.success && presignResult.urls) {
                    await Promise.all(allFilesToUpload.map(async (item, index) => {
                        const urlData = presignResult.urls[index];
                        if (urlData && urlData.signedUrl) {
                            await fetch(urlData.signedUrl, {
                                method: 'PUT',
                                body: item.file,
                                headers: {
                                    'Content-Type': item.file.type || 'application/octet-stream'
                                }
                            });
                            item.rowRef.fileUrl = urlData.publicCloudFrontUrl;
                        }
                    }));
                } else {
                    console.error("Failed to get presigned URLs:", presignResult.error);
                    alert("Failed to prepare file uploads.");
                    setLoading(false);
                    return;
                }
            }

            const records = [];

            feedbackRows.forEach((row, index) => {
                const commonData = {
                    Client_Functional_Testing_Specification_Initiate_Work_id: firstWork.Initiate_Work_id || '',
                    Project_id: firstWork.Project_id || '',
                    RICEWRequestFormId: id,
                    Client_Roster_Form_id: firstWork.Client_Roster_Form_id || '',
                    Client_Functional_Testing_Specification_Assignment: firstWork.Client_Functional_Testing_Specification_Assignment || '',
                    client_SI_Technical_Owner: ownerName,
                    client_SI_Technical_Owner_email: ownerEmail,
                    ricew_object: firstWork.ricewObject || ''
                };

                records.push({
                    ...commonData,
                    Client_Functional_Testing_SI_Technical_owner_id: row.feedback_business_owner_id || '',
                    parent_feedback_id: "",
                    row_number: index + 1,
                    sub_row_number: "",
                    feedback_text: row.text,
                    supported_doccument: row.fileName ? (row.fileUrl !== '#' ? row.fileUrl : "") : "",
                    supported_doccument_name: row.fileName || "",
                    business_owner_decision: row.business_owner_decision || ""
                });

                if (row.subRows && row.subRows.length > 0) {
                    row.subRows.forEach((subRow, subIndex) => {
                        records.push({
                            ...commonData,
                            Client_Functional_Testing_SI_Technical_owner_id: subRow.feedback_business_owner_id || '',
                            parent_feedback_id: row.feedback_business_owner_id || '',
                            row_number: index + 1,
                            sub_row_number: subIndex + 1,
                            feedback_text: subRow.text,
                            supported_doccument: subRow.fileName ? (subRow.fileUrl !== '#' ? subRow.fileUrl : "") : "",
                            supported_doccument_name: subRow.fileName || "",
                            business_owner_decision: subRow.business_owner_decision || ""
                        });
                    });
                }
            });

            const response = await fetch('https://qnlyrtzvjc.execute-api.ap-south-1.amazonaws.com/New/api/SITechnicalOwner/FeedbackSubmit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ records })
            });

            const result = await response.json();
            if (result.success) {
                if (!isApproveFlow) {
                    setSuccessMessage("Feedback submitted successfully!");
                    setShowSuccessMessage(true);
                    setTimeout(() => {
                        setShowSuccessMessage(false);
                        setSuccessMessage('');
                    }, 3000);
                }

                if (workData.length > 0) {
                    fetchFeedback(workData[0].Client_Functional_Testing_Specification_Assignment);
                }

                if (!isApproveFlow) {
                    try {
                        const emailPayload = {
                            Functional_Tester_Email_Address: firstWork.Email_Address || '',
                            Tester_name: firstWork.Choose_Resource_Client || firstWork.Client_name || '',
                            RICEWRequestFormId: id,
                            client_SI_Technical_Owner: ownerName
                        };

                        await fetch('https://qnlyrtzvjc.execute-api.ap-south-1.amazonaws.com/New/api/send/SITechnicalOwnerFeedbackEmail', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ records: [emailPayload] })
                        });
                    } catch (emailErr) {
                        console.error('FeedbackEmail notification failed:', emailErr);
                    }
                }

                return true;
            } else {
                alert(`Error: ${result.error || 'Failed to submit feedback'}`);
                return false;
            }
        } catch (error) {
            console.error("Error submitting document:", error);
            alert("An error occurred while submitting the document.");
            return false;
        } finally {
            if (!isApproveFlow) {
                setLoading(false);
            }
        }
    };

    const handleApproveDocument = async () => {
        if (workData.length === 0) {
            alert('No work data found to approve.');
            return;
        }

        const hasNewData = feedbackRows.some(row =>
            row.fileObj || row.text.trim() ||
            (row.subRows && row.subRows.some(sr => sr.fileObj || sr.text.trim()))
        );

        setLoading(true);

        if (hasNewData) {
            const submitSuccess = await handleSubmitDocument(true);
            if (!submitSuccess) {
                setLoading(false);
                return;
            }
        }

        const firstWork = workData[0];
        try {
            const approvalRecord = {
                Functional_Tester_Email_Address: firstWork.Email_Address || '',
                Tester_name: firstWork.Choose_Resource_Client || firstWork.Client_name || '',
                RICEWRequestFormId: id,
                client_SI_Technical_Owner: ownerName,
                Client_Functional_Testing_Specification_Assignment: firstWork.Client_Functional_Testing_Specification_Assignment || ''
            };

            const response = await fetch('https://qnlyrtzvjc.execute-api.ap-south-1.amazonaws.com/New/api/send/SITechnicalOwnerApprovalEmail', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ records: [approvalRecord] })
            });
            const result = await response.json();
            if (result.success) {
                setSuccessMessage('Document approved successfully!');
                setShowSuccessMessage(true);
                setTimeout(() => {
                    setShowSuccessMessage(false);
                    setSuccessMessage('');
                }, 3000);
                fetchFeedback(firstWork.Client_Functional_Testing_Specification_Assignment, true);
                fetchData(true);
            } else {
                alert(`Approval failed: ${result.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error approving document:', error);
            alert('An error occurred while approving the document.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (workData.length > 0) {
            fetchFeedback(workData[0].Client_Functional_Testing_Specification_Assignment);
        }
    }, [workData, fetchFeedback]);

    return (
        <div className="config-main" style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '0', margin: '0' }}>
            <div style={{ padding: '1rem 1rem 2rem 1rem', width: '100%', minWidth: '1250px', margin: '0', boxSizing: 'border-box' }}>

                {/* Success Message Popup */}
                {showSuccessMessage && (
                    <div style={{
                        position: 'fixed', top: '20px', right: '20px', backgroundColor: '#10b981', color: 'white',
                        padding: '12px 20px', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        zIndex: 1000, fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px',
                        animation: 'slideIn 0.3s ease-out'
                    }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22,4 12,14.01 9,11.01" />
                        </svg>
                        {successMessage}
                    </div>
                )}

                <style>{`
                    @keyframes slideIn {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                `}</style>

                {/* Initiate Work Container */}
                <div style={{ backgroundColor: 'white', padding: '0', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    {/* Project Info Header */}
                    <div style={{ padding: '2rem 1rem 1rem 2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project: {projectName || '-'}</h3>
                        </div>
                    </div>

                    {/* Page Title */}
                    <div className="config-header" style={{ marginTop: '0', marginRight: "0px" }}>
                        <h2>Feedback Form (Client Functional Testing)</h2>
                    </div>

                    <div style={{ padding: '20px' }}>
                        {/* Work Data Table */}
                        <div style={{ border: '1px solid #ddd', overflowX: 'auto', overflowY: 'hidden', width: '100%', boxSizing: 'border-box', marginTop: '10px' }}>
                            {/* Table Header row */}
                            <div style={{ display: 'flex', borderBottom: '1px solid #ddd', backgroundColor: 'white', minWidth: '1260px' }}>
                                <div style={{ width: '60px', flex: '0 0 60px', padding: '12px 8px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', backgroundColor: 'white', textAlign: 'center' }}>Sr. No.</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '200px', backgroundColor: 'white' }}>RICEW Object</div>
                                <div style={{ width: '150px', flex: '0 0 150px', padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', backgroundColor: 'white', textAlign: 'center' }}>Status</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '150px', backgroundColor: 'white' }}>Assigned Date</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '150px', backgroundColor: 'white' }}>Start Object</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '150px', backgroundColor: 'white' }}>Upload Object</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', minWidth: '150px', backgroundColor: 'white' }}>End Date</div>
                            </div>

                            {/* Table Body */}
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: '1260px', backgroundColor: 'white' }}>
                                {loading ? (
                                    <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Loading records...</div>
                                ) : workData.length > 0 ? (
                                    workData.map((row, index) => (
                                        <div key={index} style={{ display: 'flex', backgroundColor: index % 2 === 0 ? '#ffffff' : '#ffffff', borderBottom: '1px solid #ddd', minWidth: '1260px', color: '#333' }}>
                                            <div style={{ width: '60px', flex: '0 0 60px', padding: '12px 8px', fontSize: '13px', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '500' }}>{index + 1}</div>
                                            <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', minWidth: '200px', display: 'flex', alignItems: 'center' }}>{row.ricewObject || '-'}</div>
                                            <div style={{ width: '150px', flex: '0 0 150px', padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <span style={{ padding: '6px 8px', borderRadius: '4px', backgroundColor: '#dbeafe', color: '#1e40af', fontWeight: '600', fontSize: '11px', whiteSpace: 'normal', textAlign: 'center', width: '100%', lineHeight: '1.4' }}>{ricewStatus || '-'}</span>
                                            </div>
                                            <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', minWidth: '150px', display: 'flex', alignItems: 'center' }}>{row.assignedDate || '-'}</div>
                                            <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', minWidth: '150px', display: 'flex', alignItems: 'center' }}>
                                                <span style={{ fontWeight: '500', color: '#333' }}>{row.startObject || '-'}</span>
                                            </div>
                                            <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', minWidth: '150px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '6px' }}>
                                                {row.isUploaded && row.uploadFiles && row.uploadFiles.length > 0 ? (
                                                    row.uploadFiles.map((file, fIdx) => (
                                                        <a key={fIdx} href={getFileViewUrl(file.url, file.File_Name)} target="_blank" rel="noopener noreferrer"
                                                            style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-all', fontWeight: '500', color: '#2563eb', textDecoration: 'none', backgroundColor: '#eff6ff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #bfdbfe', cursor: 'pointer', transition: 'all 0.2s ease', lineHeight: '1.4', fontSize: '12px' }}
                                                            title={file.File_Name}
                                                            onMouseEnter={(e) => { e.target.style.backgroundColor = '#dbeafe'; e.target.style.borderColor = '#93c5fd'; }}
                                                            onMouseLeave={(e) => { e.target.style.backgroundColor = '#eff6ff'; e.target.style.borderColor = '#bfdbfe'; }}
                                                        >
                                                            <span style={{ color: '#64748b', marginRight: '4px', fontWeight: '600' }}>{fIdx + 1}.</span>
                                                            {file.File_Name || `document_${fIdx + 1}.pdf`}
                                                        </a>
                                                    ))
                                                ) : '-'}
                                            </div>
                                            <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', minWidth: '150px', display: 'flex', alignItems: 'center' }}>{row.endDate || '-'}</div>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100px', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '14px' }}>
                                        No records found
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Feedback Form Container - Independent */}
                <div style={{ backgroundColor: 'white', padding: '0', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginTop: '30px', minWidth: '1200px' }}>
                    <div className="config-header" style={{ marginTop: '0', marginRight: "0px" }}>
                        <h2>Feedback Form</h2>
                    </div>

                    <div style={{ padding: '0px' }}>
                        {/* Owner Info Bar */}
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e0e0e0', backgroundColor: 'white', display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                            <label style={{ fontWeight: '600', color: '#333', fontSize: '14px', whiteSpace: 'nowrap' }}>
                                RICEW Object Owner <span style={{ color: 'red' }}>*</span>
                            </label>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <label style={{ fontSize: '13px', color: 'black', fontWeight: '500' }}>Name <span style={{ fontWeight: 'bold' }}>:</span></label>
                                <input type="text" placeholder="Name" value={ownerName} readOnly={true}
                                    style={{ width: '240px', height: '35px', padding: '0 12px', border: '1px solid black', borderRadius: '4px', backgroundColor: '#f5f5f5', fontSize: '13px', fontFamily: 'Arial, sans-serif', color: 'black', outline: 'none', cursor: 'not-allowed' }}
                                />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <label style={{ fontSize: '13px', color: 'black', fontWeight: '500' }}>Email Address <span style={{ fontWeight: 'bold' }}>:</span></label>
                                <input type="email" placeholder="Email Address" value={ownerEmail} readOnly={true}
                                    style={{ width: '300px', height: '35px', padding: '0 12px', border: '1px solid black', borderRadius: '4px', backgroundColor: '#f5f5f5', fontSize: '13px', fontFamily: 'Arial, sans-serif', color: 'black', outline: 'none', cursor: 'not-allowed' }}
                                />
                            </div>
                        </div>

                        <div style={{ padding: '20px' }}>
                            {/* Unified Feedback and Response Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: '40px 1.2fr 90px 0.4fr 60px 1.2fr 0.5fr 150px', borderLeft: '1px solid #ddd', borderTop: '1px solid #ddd', borderRadius: '4px 4px 0 0', overflow: 'hidden', backgroundColor: 'white' }}>
                                {/* Group Header Row 1 */}
                                <div style={{ gridColumn: 'span 5', borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '10px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px', backgroundColor: '#fcfcfc' }}>
                                    SI Technical Owner Feedback
                                </div>
                                <div style={{ gridColumn: 'span 3', borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '10px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px', backgroundColor: '#edf2f7', color: '#2d3748' }}>
                                    Code Developer Response
                                </div>

                                {/* Sub-Header Row 2 */}
                                <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#fcfcfc' }}>Sr. No.</div>
                                <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#fcfcfc' }}>Text</div>
                                <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#fcfcfc' }}>Upload</div>
                                <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#fcfcfc' }}>Uploaded Document Name</div>
                                <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#fcfcfc' }}>Action</div>
                                <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#fcfcfc' }}>Text</div>
                                <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#fcfcfc' }}>Uploaded Document Name</div>
                                <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#fcfcfc' }}>Business Owner Decision</div>
                            </div>

                            {/* Aligned Table Rows */}
                            <div style={{ display: 'grid', gridTemplateColumns: '40px 1.2fr 90px 0.4fr 60px 1.2fr 0.5fr 150px', borderLeft: '1px solid #ddd', borderTop: 'none', borderBottom: 'none', borderRight: 'none', borderRadius: '0 0 4px 4px', overflow: 'hidden', backgroundColor: 'white' }}>
                                {feedbackRows.map((row, idx) => {
                                    const resp = row.response;
                                    const isLast = idx === feedbackRows.length - 1;
                                    const cellBorderBottom = '1px solid #ddd';
                                    const rowSpan = 1 + (row.subRows?.length || 0);

                                    return (
                                        <React.Fragment key={row.id}>
                                            {/* Column 1: Sr. No. (Spans) */}
                                            <div style={{ gridRow: `span ${rowSpan}`, borderBottom: cellBorderBottom, borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', backgroundColor: row.business_owner_decision === 'Close' ? '#f5f5f5' : '#fcfcfc', color: row.business_owner_decision === 'Close' ? '#718096' : 'inherit', borderBottomLeftRadius: isLast ? '4px' : '0' }}>
                                                {idx + 1}
                                            </div>

                                            {/* Column 2: Text */}
                                            <div style={{ borderBottom: row.subRows?.length > 0 ? '1px solid #eee' : cellBorderBottom, borderRight: '1px solid #ddd', padding: '5px', position: 'relative', backgroundColor: row.business_owner_decision === 'Close' ? '#f5f5f5' : 'white' }}>
                                                <textarea value={row.text} onChange={(e) => handleRowChange(row.id, 'text', e.target.value)} disabled={row.business_owner_decision === 'Close'}
                                                    style={{ width: '100%', border: 'none', outline: 'none', resize: row.business_owner_decision === 'Close' ? 'none' : 'vertical', minHeight: '35px', fontSize: '13px', fontFamily: 'Arial, sans-serif', padding: '5px', paddingBottom: '15px', backgroundColor: row.business_owner_decision === 'Close' ? '#f5f5f5' : 'transparent', color: row.business_owner_decision === 'Close' ? '#718096' : 'inherit', cursor: row.business_owner_decision === 'Close' ? 'not-allowed' : 'text' }}
                                                    placeholder="Enter feedback..."
                                                />
                                                {row.feedback_business_owner_id && row.business_owner_decision !== 'Close' && (
                                                    <button onClick={() => handleAddSubRow(row.id)} style={{ position: 'absolute', right: '25px', bottom: '5px', background: 'none', border: 'none', padding: '0', cursor: 'pointer', color: '#3182ce', display: 'flex', alignItems: 'center' }} title="Add detail">
                                                        <Plus size={16} />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Column 3: Upload */}
                                            <div style={{ borderBottom: row.subRows?.length > 0 ? '1px solid #eee' : cellBorderBottom, borderRight: '1px solid #ddd', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: row.business_owner_decision === 'Close' ? '#f5f5f5' : 'white' }}>
                                                <button onClick={() => document.getElementById(`feedback-file-${row.id}`).click()} disabled={row.business_owner_decision === 'Close'}
                                                    style={{ backgroundColor: row.business_owner_decision === 'Close' ? '#edf2f7' : '#c6f6d5', color: row.business_owner_decision === 'Close' ? '#a0aec0' : '#22543d', border: row.business_owner_decision === 'Close' ? '1px solid #e2e8f0' : '1px solid #9ae6b4', padding: '4px 8px', borderRadius: '4px', cursor: row.business_owner_decision === 'Close' ? 'not-allowed' : 'pointer', fontSize: '10px', fontWeight: '600' }}>
                                                    Upload
                                                </button>
                                                <input id={`feedback-file-${row.id}`} type="file" style={{ display: 'none' }} disabled={row.business_owner_decision === 'Close'} onChange={(e) => handleFeedbackFileUpload(row.id, e)} />
                                            </div>

                                            {/* Column 4: Doc Name */}
                                            <div style={{ borderBottom: row.subRows?.length > 0 ? '1px solid #eee' : cellBorderBottom, borderRight: '1px solid #ddd', padding: '8px 5px', fontSize: '11px', color: row.business_owner_decision === 'Close' ? '#718096' : 'black', display: 'flex', alignItems: 'center', overflow: 'hidden', backgroundColor: row.business_owner_decision === 'Close' ? '#f5f5f5' : 'white' }}>
                                                {row.fileName ? (
                                                    <a href={getFileViewUrl(row.fileUrl, row.fileName)} target="_blank" rel="noopener noreferrer" style={{ color: '#3182ce', textDecoration: 'none', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }} title={row.fileName}>{row.fileName}</a>
                                                ) : (<span style={{ color: '#999' }}>No doc</span>)}
                                            </div>

                                            {/* Column 5: Action */}
                                            <div style={{ borderBottom: row.subRows?.length > 0 ? '1px solid #eee' : cellBorderBottom, borderRight: '1px solid #ddd', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: row.business_owner_decision === 'Close' ? '#f5f5f5' : 'white' }}>
                                                {feedbackRows.length > 1 && row.business_owner_decision !== 'Close' && (
                                                    <Trash2 size={16} color="#e53e3e" style={{ cursor: 'pointer' }} onClick={() => handleRemoveRow(row.id)} />
                                                )}
                                            </div>

                                            {/* Column 6: Response Text */}
                                            <div style={{ borderBottom: row.subRows?.length > 0 ? '1px solid #eee' : cellBorderBottom, borderRight: '1px solid #ddd', padding: '5px', display: 'flex', alignItems: 'center', backgroundColor: resp ? '#f9fafb' : '#fafafa' }}>
                                                {resp && resp.text ? (
                                                    <textarea value={resp.text} readOnly={true} style={{ width: '100%', border: 'none', outline: 'none', resize: 'none', minHeight: '35px', fontSize: '13px', fontFamily: 'Arial, sans-serif', padding: '5px', backgroundColor: 'transparent', color: '#4a5568' }} />
                                                ) : (<span style={{ fontSize: '11px', color: '#999', padding: '5px' }}>No response added for this feedback</span>)}
                                            </div>

                                            {/* Column 7: Response Doc */}
                                            <div style={{ borderBottom: row.subRows?.length > 0 ? '1px solid #eee' : cellBorderBottom, borderRight: '1px solid #ddd', padding: '8px 10px', fontSize: '11px', color: 'black', display: 'flex', alignItems: 'center', overflow: 'hidden', backgroundColor: resp ? '#f9fafb' : '#fafafa', borderBottomRightRadius: (isLast && !row.subRows?.length) ? '4px' : '0' }}>
                                                {resp?.fileName ? (
                                                    <a href={resp.fileUrl !== '#' ? getFileViewUrl(resp.fileUrl, resp.fileName) : undefined} target="_blank" rel="noopener noreferrer" style={{ color: '#3182ce', textDecoration: 'none', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }} title={resp.fileName}>{resp.fileName}</a>
                                                ) : (<span style={{ color: '#999', fontSize: '11px' }}>No doc</span>)}
                                            </div>

                                            {/* Column 8: Decision */}
                                            <div style={{ borderBottom: row.subRows?.length > 0 ? '1px solid #eee' : cellBorderBottom, borderRight: '1px solid #ddd', padding: '8px 5px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: row.business_owner_decision === 'Close' ? '#f5f5f5' : (resp ? '#f9fafb' : 'white'), borderBottomRightRadius: (isLast && !row.subRows?.length) ? '4px' : '0' }}>
                                                <select value={row.business_owner_decision || 'Open'} onChange={(e) => handleRowChange(row.id, 'business_owner_decision', e.target.value)}
                                                    style={{ width: '100%', height: '32px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#ffffff', color: '#334155', cursor: 'pointer', padding: '0 8px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                                                    <option value="Open">Open</option>
                                                    <option value="Close">Close</option>
                                                </select>
                                            </div>

                                            {/* Sub Rows */}
                                            {row.subRows?.map((subRow, sIdx) => {
                                                const subResp = subRow.response;
                                                const isLastSubRow = sIdx === row.subRows.length - 1;
                                                const subCellBorderBottom = isLastSubRow ? cellBorderBottom : '1px solid #eee';

                                                return (
                                                    <React.Fragment key={subRow.id}>
                                                        {/* Column 2: Sub Text */}
                                                        <div style={{ borderBottom: subCellBorderBottom, borderRight: '1px solid #ddd', padding: '5px', position: 'relative', backgroundColor: subRow.business_owner_decision === 'Close' ? '#f5f5f5' : 'white' }}>
                                                            <textarea value={subRow.text} onChange={(e) => handleSubRowChange(row.id, subRow.id, 'text', e.target.value)} disabled={subRow.business_owner_decision === 'Close'}
                                                                style={{ width: '100%', border: 'none', outline: 'none', resize: subRow.business_owner_decision === 'Close' ? 'none' : 'vertical', minHeight: '30px', fontSize: '13px', fontFamily: 'Arial, sans-serif', padding: '5px', paddingBottom: '15px', backgroundColor: subRow.business_owner_decision === 'Close' ? '#f5f5f5' : '#fffdee', color: subRow.business_owner_decision === 'Close' ? '#718096' : 'inherit', cursor: subRow.business_owner_decision === 'Close' ? 'not-allowed' : 'text' }}
                                                                placeholder="Enter sub-feedback..."
                                                            />
                                                            {subRow.feedback_business_owner_id && subRow.business_owner_decision !== 'Close' && (
                                                                <button onClick={() => handleAddSubRow(row.id)} style={{ position: 'absolute', right: '25px', bottom: '5px', background: 'none', border: 'none', padding: '0', cursor: 'pointer', color: '#3182ce', display: 'flex', alignItems: 'center' }} title="Add detail">
                                                                    <Plus size={16} />
                                                                </button>
                                                            )}
                                                        </div>
                                                        {/* Column 3: Sub Upload */}
                                                        <div style={{ borderBottom: subCellBorderBottom, borderRight: '1px solid #ddd', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: subRow.business_owner_decision === 'Close' ? '#f5f5f5' : 'white' }}>
                                                            <button onClick={() => document.getElementById(`sub-file-${subRow.id}`).click()} disabled={subRow.business_owner_decision === 'Close'}
                                                                style={{ backgroundColor: subRow.business_owner_decision === 'Close' ? '#edf2f7' : '#fff5f5', color: subRow.business_owner_decision === 'Close' ? '#a0aec0' : '#c53030', border: subRow.business_owner_decision === 'Close' ? '1px solid #e2e8f0' : '1px solid #feb2b2', padding: '4px 8px', borderRadius: '4px', cursor: subRow.business_owner_decision === 'Close' ? 'not-allowed' : 'pointer', fontSize: '10px', fontWeight: '600' }}>
                                                                Upload
                                                            </button>
                                                            <input id={`sub-file-${subRow.id}`} type="file" style={{ display: 'none' }} disabled={subRow.business_owner_decision === 'Close'} onChange={(e) => handleSubRowFileUpload(row.id, subRow.id, e)} />
                                                        </div>
                                                        {/* Column 4: Sub Doc Name */}
                                                        <div style={{ borderBottom: subCellBorderBottom, borderRight: '1px solid #ddd', padding: '8px 5px', fontSize: '11px', color: subRow.business_owner_decision === 'Close' ? '#718096' : 'black', display: 'flex', alignItems: 'center', overflow: 'hidden', backgroundColor: subRow.business_owner_decision === 'Close' ? '#f5f5f5' : 'white' }}>
                                                            {subRow.fileName ? (
                                                                <a href={getFileViewUrl(subRow.fileUrl, subRow.fileName)} target="_blank" rel="noopener noreferrer" style={{ color: '#3182ce', textDecoration: 'none', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }} title={subRow.fileName}>{subRow.fileName}</a>
                                                            ) : (<span style={{ color: '#999' }}>No doc</span>)}
                                                        </div>
                                                        {/* Column 5: Sub Action */}
                                                        <div style={{ borderBottom: subCellBorderBottom, borderRight: '1px solid #ddd', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: subRow.business_owner_decision === 'Close' ? '#f5f5f5' : 'white' }}>
                                                            {subRow.business_owner_decision !== 'Close' && (
                                                                <Trash2 size={14} color="#e53e3e" style={{ cursor: 'pointer' }} onClick={() => handleRemoveSubRow(row.id, subRow.id)} />
                                                            )}
                                                        </div>
                                                        {/* Column 6: Sub Response Text */}
                                                        <div style={{ borderBottom: subCellBorderBottom, borderRight: '1px solid #ddd', padding: '5px', display: 'flex', alignItems: 'center', backgroundColor: subResp ? '#f9fafb' : '#fafafa' }}>
                                                            {subResp && subResp.text ? (
                                                                <textarea value={subResp.text} readOnly={true} style={{ width: '100%', border: 'none', outline: 'none', resize: 'none', minHeight: '30px', fontSize: '13px', fontFamily: 'Arial, sans-serif', padding: '5px', backgroundColor: 'transparent', color: '#4a5568' }} />
                                                            ) : (<span style={{ fontSize: '11px', color: '#999', padding: '5px' }}>No response added for this feedback</span>)}
                                                        </div>
                                                        {/* Column 7: Sub Response Doc */}
                                                        <div style={{ borderBottom: subCellBorderBottom, borderRight: '1px solid #ddd', padding: '8px 10px', fontSize: '11px', color: 'black', display: 'flex', alignItems: 'center', overflow: 'hidden', backgroundColor: subResp ? '#f9fafb' : '#fafafa' }}>
                                                            {subResp?.fileName ? (
                                                                <a href={subResp.fileUrl !== '#' ? getFileViewUrl(subResp.fileUrl, subResp.fileName) : undefined} target="_blank" rel="noopener noreferrer" style={{ color: '#3182ce', textDecoration: 'none', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }} title={subResp.fileName}>{subResp.fileName}</a>
                                                            ) : (<span style={{ color: '#999', fontSize: '11px' }}>No doc</span>)}
                                                        </div>
                                                        {/* Column 8: Sub Decision */}
                                                        <div style={{ borderBottom: subCellBorderBottom, borderRight: '1px solid #ddd', padding: '8px 5px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: subRow.business_owner_decision === 'Close' ? '#f5f5f5' : (subResp ? '#f9fafb' : 'white'), borderBottomRightRadius: isLastSubRow && isLast ? '4px' : '0' }}>
                                                            <select value={subRow.business_owner_decision || 'Open'} onChange={(e) => handleSubRowChange(row.id, subRow.id, 'business_owner_decision', e.target.value)}
                                                                style={{ width: '100%', height: '30px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#ffffff', color: '#334155', cursor: 'pointer', padding: '0 8px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                                                                <option value="Open">Open</option>
                                                                <option value="Close">Close</option>
                                                            </select>
                                                        </div>
                                                    </React.Fragment>
                                                );
                                            })}
                                        </React.Fragment>
                                    );
                                })}
                                {/* Add Row Button */}
                                <div style={{ gridColumnStart: 1, gridColumnEnd: 3 }}></div>
                                <div style={{ gridColumn: '3', display: 'flex', justifyContent: 'center', padding: '15px 0' }}>
                                    <button onClick={handleAddRow}
                                        style={{ backgroundColor: '#c6f6d5', color: '#22543d', border: '1px solid #9ae6b4', padding: '6px 15px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                                        + Add Row
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '15px', marginTop: '-60px', paddingBottom: '30px', paddingRight: '15px' }}>
                            <div style={{ display: 'flex', gap: '15px', marginRight: '15px' }}>
                                <button onClick={handleSubmitDocument} disabled={loading}
                                    style={{ backgroundColor: loading ? '#f0f0f0' : '#c6f6d5', color: '#22543d', border: '1px solid #9ae6b4', width: '140px', height: '32px', padding: '0px 12px', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap', opacity: loading ? 0.7 : 1, transition: 'all 0.2s' }}
                                    onMouseEnter={(e) => { if (!loading) e.target.style.backgroundColor = '#9ae6b4'; }}
                                    onMouseLeave={(e) => { if (!loading) e.target.style.backgroundColor = '#c6f6d5'; }}>
                                    {loading ? 'Submitting...' : 'Submit Feedback'}
                                </button>

                                <button onClick={handleApproveDocument} disabled={loading}
                                    style={{ backgroundColor: loading ? '#f0f0f0' : '#c6f6d5', color: '#22543d', border: '1px solid #9ae6b4', width: '140px', height: '32px', padding: '0px 12px', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap', opacity: loading ? 0.7 : 1, transition: 'all 0.2s' }}
                                    onMouseEnter={(e) => { if (!loading) e.target.style.backgroundColor = '#9ae6b4'; }}
                                    onMouseLeave={(e) => { if (!loading) e.target.style.backgroundColor = '#c6f6d5'; }}>
                                    Approve Document
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Confirmation Dialog */}
            {showConfirmDialog && (
                <div style={{ position: 'fixed', top: '0', left: '0', right: '0', bottom: '0', backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', maxWidth: '400px', width: '90%', textAlign: 'center' }}>
                        <h3 style={{ margin: '0 0 16px 0', color: '#333', fontSize: '18px', fontWeight: '600' }}>Confirmation</h3>
                        <p style={{ margin: '0 0 24px 0', color: '#666', fontSize: '16px', lineHeight: '1.5' }}>{confirmMessage}</p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button onClick={handleConfirmCancel} style={{ backgroundColor: '#6b7280', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '6px', cursor: 'pointer', fontSize: '16px', fontWeight: '500', minWidth: '100px' }}>Cancel</button>
                            <button onClick={handleConfirmYes} style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '6px', cursor: 'pointer', fontSize: '16px', fontWeight: '500', minWidth: '100px' }}>Continue</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PublicInitiateClientFunctionalTesterView;

