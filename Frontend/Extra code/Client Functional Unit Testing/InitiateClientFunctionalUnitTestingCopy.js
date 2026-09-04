import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Trash2, Plus } from 'lucide-react';
import { getIdToken } from '../../../utils/cognito-auth';
import { SuccessMessage, ErrorMessage } from '../../Resource Roster Form/FormSections';

const InitiateClientFunctionalUnitTestingCopy = ({ selectedProject }) => {
    const { id } = useParams();
    const [workData, setWorkData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showError, setShowError] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadingRow, setUploadingRow] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [filePath, setFilePath] = useState('');
    const [businessOwnerName, setTechnicalOwnerName] = useState('');
    const [businessOwnerEmail, setTechnicalOwnerEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [nameError, setNameError] = useState('');
    const [requestFormDetails, setRequestFormDetails] = useState(null);
    const [combinedRows, setCombinedRows] = useState([
        { id: Date.now(), bof: { text: '', fileName: '', fileUrl: '', feedback_business_owner_id: '', business_owner_decision: '' }, fswrn: { text: '', fileName: '', fileUrl: '' }, subRows: [] }
    ]);

    // --- Modal Feedback Form States ---
    const [feedbackRows, setFeedbackRows] = useState([
        { id: Date.now(), text: '', fileName: '', fileUrl: '', feedback_business_owner_id: '', subRows: [] }
    ]);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [confirmMessage, setConfirmMessage] = useState('');
    const [pendingDecisionChange, setPendingDecisionChange] = useState(null);

    const validateEmail = (email) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) {
            return "";
        }
        return regex.test(email) ? "" : "Please enter a valid email address";
    };

    const fetchFeedback = useCallback(async (assignmentId) => {
        if (!assignmentId) return;

        // Normalize the decision value from backend to a consistent casing
        const normalizeDecision = (val) => {
            if (!val) return 'Open';
            const lower = val.toLowerCase();
            if (lower === 'close' || lower === 'closed') return 'Close';
            if (lower === 'open') return 'Open';
            return val; // return as-is if unknown
        };

        try {
            const idToken = await getIdToken();
            const response = await fetch(
                `https://qnlyrtzvjc.execute-api.ap-south-1.amazonaws.com/New/api/FunctionalTestingFeedback/FetchAll?Client_Functional_Testing_Specification_Assignment=${assignmentId}`,
                { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` } }
            );
            const result = await response.json();
            if (result.success && result.data && result.data.length > 0) {
                const newCombinedRows = result.data.map(item => {
                    // Extract Tester response for main row (if any)
                    const resMain = item.tester_responses && item.tester_responses.length > 0 ? item.tester_responses[0] : null;

                    return {
                        id: item.Client_Functional_Testing_SI_Technical_owner_id || Date.now() + Math.random(),
                        bof: {
                            text: item.feedback_text || '',
                            fileName: item.supported_doccument_name || '',
                            fileUrl: item.supported_doccument || '#',
                            business_owner_decision: normalizeDecision(item.SI_Technical_Owner_Decision_open_closed || item.business_owner_decision),
                            feedback_business_owner_id: item.Client_Functional_Testing_SI_Technical_owner_id || ''
                        },
                        fswrn: {
                            text: resMain ? resMain.feedback_text : '',
                            fileName: resMain ? resMain.supported_doccument_name : '',
                            fileUrl: resMain ? resMain.supported_doccument : '',
                            rice_Specification_Writer_feedback_id: resMain ? resMain.Client_Functional_Testing_Writing_id : ''
                        },
                        subRows: item.sub_feedbacks ? item.sub_feedbacks.map(subItem => {
                            const resSub = subItem.tester_responses && subItem.tester_responses.length > 0 ? subItem.tester_responses[0] : null;
                            return {
                                id: subItem.Client_Functional_Testing_SI_Technical_owner_id || Date.now() + Math.random(),
                                bof: {
                                    text: subItem.feedback_text || '',
                                    fileName: subItem.supported_doccument_name || '',
                                    fileUrl: subItem.supported_doccument || '#',
                                    business_owner_decision: normalizeDecision(subItem.SI_Technical_Owner_Decision_open_closed),
                                    feedback_business_owner_id: subItem.Client_Functional_Testing_SI_Technical_owner_id || ''
                                },
                                fswrn: {
                                    text: resSub ? resSub.feedback_text : '',
                                    fileName: resSub ? resSub.supported_doccument_name : '',
                                    fileUrl: resSub ? resSub.supported_doccument : '',
                                    rice_Specification_Writer_feedback_id: resSub ? resSub.Client_Functional_Testing_Writing_id : ''
                                }
                            };
                        }) : []
                    };
                });
                setCombinedRows(newCombinedRows);
            }
        } catch (error) {
            console.error("Error fetching feedback:", error);
        }
    }, []);

    const fetchModalFeedback = useCallback(async (assignmentId, isSilent = false) => {
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
            const idToken = await getIdToken();
            const response = await fetch(`https://qnlyrtzvjc.execute-api.ap-south-1.amazonaws.com/New/api/FunctionalTestingFeedback/FetchAll?Client_Functional_Testing_Specification_Assignment=${assignmentId}`);
            const result = await response.json();
            if (result.success && result.data && result.data.length > 0) {
                const fetchedRows = result.data.map(item => {
                    const trMain = item.tester_responses && item.tester_responses.length > 0 ? item.tester_responses[0] : null;
                    const feedbackId = item.Client_Functional_Testing_SI_Technical_owner_id || '';
                    return {
                        id: feedbackId || Date.now() + Math.random(),
                        text: item.feedback_text || '',
                        fileName: item.supported_doccument_name || '',
                        fileUrl: item.supported_doccument || '#',
                        business_owner_decision: normalizeDecision(item.SI_Technical_Owner_Decision_open_closed),
                        feedback_business_owner_id: feedbackId,
                        response: trMain ? {
                            text: trMain.feedback_text || '',
                            fileName: trMain.supported_doccument_name || '',
                            fileUrl: trMain.supported_doccument || '#',
                            Functional_Tester_feedback_SI_id: trMain.Client_Functional_Testing_Writing_id || ''
                        } : null,
                        subRows: item.sub_feedbacks ? item.sub_feedbacks.map(subItem => {
                            const trSub = subItem.tester_responses && subItem.tester_responses.length > 0 ? subItem.tester_responses[0] : null;
                            const subFeedbackId = subItem.Client_Functional_Testing_SI_Technical_owner_id || '';
                            return {
                                id: subFeedbackId || Date.now() + Math.random(),
                                text: subItem.feedback_text || '',
                                fileName: subItem.supported_doccument_name || '',
                                fileUrl: subItem.supported_doccument || '#',
                                business_owner_decision: normalizeDecision(subItem.SI_Technical_Owner_Decision_open_closed),
                                feedback_business_owner_id: subFeedbackId,
                                response: trSub ? {
                                    text: trSub.feedback_text || '',
                                    fileName: trSub.supported_doccument_name || '',
                                    fileUrl: trSub.supported_doccument || '#',
                                    Functional_Tester_feedback_SI_id: trSub.Client_Functional_Testing_Writing_id || ''
                                } : null
                            };
                        }) : []
                    };
                });
                setFeedbackRows(fetchedRows);
            } else {
                setFeedbackRows([{ id: Date.now(), text: '', fileName: '', fileUrl: '', feedback_business_owner_id: '', business_owner_decision: 'Open', subRows: [] }]);
            }
        } catch (error) {
            console.error("Error fetching modal feedback:", error);
        } finally {
            if (!isSilent) setLoading(false);
        }
    }, [getIdToken]);

    const getFileViewUrlInternal = (url, fileName) => {
        if (!url || url === '-' || !url.startsWith('http')) return url;
        const extension = (fileName || url.split('?')[0]).split('.').pop().toLowerCase();
        if (['xlsx', 'xls', 'csv', 'docx', 'doc'].includes(extension)) {
            return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`;
        }
        return url;
    };

    const showConfirmation = (message, action) => {
        setConfirmMessage(message);
        setPendingDecisionChange(() => action);
        setShowConfirmDialog(true);
    };

    const handleConfirmYes = () => {
        if (pendingDecisionChange) pendingDecisionChange();
        setShowConfirmDialog(false);
        setConfirmMessage('');
        setPendingDecisionChange(null);
    };

    const handleConfirmCancel = () => {
        setShowConfirmDialog(false);
        setConfirmMessage('');
        setPendingDecisionChange(null);
    };

    const handleModalAddRow = () => {
        setFeedbackRows([...feedbackRows, { id: Date.now(), text: '', fileName: '', fileUrl: '', feedback_business_owner_id: '', business_owner_decision: 'Open', subRows: [] }]);
    };

    const handleModalRemoveRow = (id) => {
        if (feedbackRows.length > 1) {
            setFeedbackRows(feedbackRows.filter(row => row.id !== id));
        }
    };

    const updateDecisionApi = async (Client_Functional_Testing_SI_Technical_owner_id, decision) => {
        try {
            const idToken = await getIdToken();
            const response = await fetch('https://qnlyrtzvjc.execute-api.ap-south-1.amazonaws.com/New/api/SITechnicalOwner/UpdateDecision', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ Client_Functional_Testing_SI_Technical_owner_id, decision })
            });
            const result = await response.json();
            return result.success;
        } catch (error) {
            console.error("Error updating decision:", error);
            return false;
        }
    };

    const handleModalRowChange = (id, field, value) => {
        if (field === 'business_owner_decision') {
            const currentRow = feedbackRows.find(r => r.id === id);
            if (currentRow && currentRow.business_owner_decision !== value) {
                showConfirmation(`Are you sure you want to change the decision to "${value}"?`, async () => {
                    setFeedbackRows(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
                    const recordId = currentRow.feedback_business_owner_id || (typeof id === 'string' ? id : null);
                    if (recordId) {
                        const success = await updateDecisionApi(recordId, value);
                        if (success) fetchModalFeedback(uploadingRow?.Client_Functional_Testing_Specification_Assignment, true);
                    }
                });
                return;
            }
        }
        setFeedbackRows(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
    };

    const handleFeedbackFileUpload = (id, e) => {
        const file = e.target.files[0];
        if (file) {
            setFeedbackRows(prev => prev.map(row => row.id === id ? { ...row, fileName: file.name, fileUrl: '#', fileObj: file } : row));
        }
        e.target.value = null;
    };

    const handleModalAddSubRow = (parentId) => {
        setFeedbackRows(prev => prev.map(row => row.id === parentId ? { ...row, subRows: [...row.subRows, { id: Date.now(), text: '', fileName: '', fileUrl: '', business_owner_decision: 'Open' }] } : row));
    };

    const handleModalRemoveSubRow = (parentId, subRowId) => {
        setFeedbackRows(prev => prev.map(row => row.id === parentId ? { ...row, subRows: row.subRows.filter(sr => sr.id !== subRowId) } : row));
    };

    const handleModalSubRowChange = (parentId, subRowId, field, value) => {
        if (field === 'business_owner_decision') {
            const parentRow = feedbackRows.find(r => r.id === parentId);
            const currentSubRow = parentRow?.subRows?.find(sr => sr.id === subRowId);
            if (currentSubRow && currentSubRow.business_owner_decision !== value) {
                showConfirmation(`Are you sure you want to change the decision to "${value}"?`, async () => {
                    setFeedbackRows(prev => prev.map(row => row.id === parentId ? { ...row, subRows: row.subRows.map(sr => sr.id === subRowId ? { ...sr, [field]: value } : sr) } : row));
                    const recordId = currentSubRow.feedback_business_owner_id || (typeof subRowId === 'string' ? subRowId : null);
                    if (recordId) {
                        const success = await updateDecisionApi(recordId, value);
                        if (success) fetchModalFeedback(uploadingRow?.Client_Functional_Testing_Specification_Assignment, true);
                    }
                });
                return;
            }
        }
        setFeedbackRows(prev => prev.map(row => row.id === parentId ? { ...row, subRows: row.subRows.map(sr => sr.id === subRowId ? { ...sr, [field]: value } : sr) } : row));
    };

    const handleSubRowFileUpload = (parentId, subRowId, e) => {
        const file = e.target.files[0];
        if (file) {
            setFeedbackRows(prev => prev.map(row => row.id === parentId ? { ...row, subRows: row.subRows.map(sr => sr.id === subRowId ? { ...sr, fileName: file.name, fileUrl: '#', fileObj: file } : sr) } : row));
        }
        e.target.value = null;
    };

    const handleModalSubmitDocument = async () => {
        if (!uploadingRow) {
            alert("No row selected for submission.");
            return;
        }

        setLoading(true);

        try {
            const idToken = await getIdToken();
            const projectId = localStorage.getItem('project_id') || selectedProject?.id || '101';
            const assignmentId = uploadingRow.Client_Functional_Testing_Specification_Assignment || '';

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
                        project_id: projectId,
                        Client_Functional_Testing_Specification_Assignment: assignmentId,
                        RICEWRequestFormId: id,
                        ricew_object: uploadingRow.ricewObject || '',
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
                            if (urlData.name) {
                                item.rowRef.fileName = urlData.name;
                            }
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
                    Client_Functional_Testing_Specification_Initiate_Work_id: uploadingRow.Client_Functional_Testing_Specification_Initiate_Work_id || '',
                    Project_id: projectId,
                    RICEWRequestFormId: id,
                    Client_Roster_Form_id: uploadingRow.Client_Roster_Form_id || '',
                    Client_Functional_Testing_Specification_Assignment: assignmentId,
                    client_SI_Technical_Owner: businessOwnerName,
                    client_SI_Technical_Owner_email: businessOwnerEmail,
                    ricew_object: uploadingRow.ricewObject || ''
                };

                records.push({
                    ...commonData,
                    Client_Functional_Testing_SI_Technical_owner_id: row.feedback_business_owner_id || '',
                    parent_feedback_id: "",
                    row_number: index + 1,
                    sub_row_number: "",
                    feedback_text: row.text || '',
                    supported_doccument: (row.fileUrl && row.fileUrl !== '#') ? row.fileUrl : "",
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
                            feedback_text: subRow.text || '',
                            supported_doccument: (subRow.fileUrl && subRow.fileUrl !== '#') ? subRow.fileUrl : "",
                            supported_doccument_name: subRow.fileName || "",
                            business_owner_decision: subRow.business_owner_decision || ""
                        });
                    });
                }
            });

            const validRecords = records.filter(r => (r.feedback_text && r.feedback_text.trim() !== '') || (r.supported_doccument && r.supported_doccument !== ''));

            const response = await fetch('https://qnlyrtzvjc.execute-api.ap-south-1.amazonaws.com/New/api/SITechnicalOwner/FeedbackSubmit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ records: validRecords })
            });

            const result = await response.json();
            if (result.success) {
                setSuccessMsg("Feedback submitted successfully!");
                setShowSuccess(true);
                setTimeout(() => {
                    setShowSuccess(false);
                    setSuccessMsg('');
                }, 3000);

                fetchModalFeedback(assignmentId);
                fetchFeedback(assignmentId);
                fetchData();

                // --- Update Technical Owner Status ---
                try {
                    await fetch('https://qnlyrtzvjc.execute-api.ap-south-1.amazonaws.com/New/api/SITechnicalOwner/UpdateTechnicalOwnerStatus', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            RICEWRequestFormId: id,
                            Project_id: projectId
                        })
                    });
                } catch (statusErr) {
                    console.error('UpdateTechnicalOwnerStatus failed:', statusErr);
                }

                try {

                    const emailPayload = {
                        SI_Technical_Owner_Email: businessOwnerEmail,
                        SI_Technical_Owner_Name: businessOwnerName,
                        RICEWRequestFormId: id,
                        Client_Name: localStorage.getItem('user_name') || 'Client'
                    };

                    await fetch('https://qnlyrtzvjc.execute-api.ap-south-1.amazonaws.com/New/api/send/ClientSendFeedbackEmail', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ records: [emailPayload] })
                    });
                } catch (emailErr) {
                    console.error('FeedbackEmail notification failed:', emailErr);
                }
            } else {
                setErrorMsg("Failed to submit feedback: " + (result.error || "Unknown error"));
                setShowError(true);
                setTimeout(() => setShowError(false), 5000);
            }
        } catch (error) {
            console.error("Error submitting document:", error);
            setErrorMsg("Error submitting feedback");
            setShowError(true);
            setTimeout(() => setShowError(false), 5000);
        } finally {
            setLoading(false);
        }
    };

    const handleApproveDocument = async () => {
        if (!uploadingRow) {
            alert("No row selected for approval.");
            return;
        }

        setLoading(true);

        try {
            const idToken = await getIdToken();
            const projectId = localStorage.getItem('project_id') || selectedProject?.id || '101';
            const assignmentId = uploadingRow.Client_Functional_Testing_Specification_Assignment || '';

            // --- 1. Upload Files (same as submit) ---
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
                try {
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
                        return { name: newName, type: item.file.type || 'application/octet-stream' };
                    });

                    const presignResponse = await fetch('https://qnlyrtzvjc.execute-api.ap-south-1.amazonaws.com/New/generate-presigned-urls/Feedback-SI-Technical-Owner-pdf', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            project_id: projectId,
                            Client_Functional_Testing_Specification_Assignment: assignmentId,
                            RICEWRequestFormId: id,
                            ricew_object: uploadingRow.ricewObject || '',
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
                                    headers: { 'Content-Type': item.file.type || 'application/octet-stream' }
                                });
                                item.rowRef.fileUrl = urlData.publicCloudFrontUrl;
                                if (urlData.name) {
                                    item.rowRef.fileName = urlData.name;
                                }
                            }
                        }));
                    }
                } catch (uploadError) {
                    console.error("Error during file upload in approval:", uploadError);
                }
            }

            // --- 2. Submit Feedback Records (same as submit) ---
            const records = [];
            feedbackRows.forEach((row, index) => {
                const commonData = {
                    Client_Functional_Testing_Specification_Initiate_Work_id: uploadingRow.Client_Functional_Testing_Specification_Initiate_Work_id || '',
                    Project_id: projectId,
                    RICEWRequestFormId: id,
                    Client_Roster_Form_id: uploadingRow.Client_Roster_Form_id || '',
                    Client_Functional_Testing_Specification_Assignment: assignmentId,
                    client_SI_Technical_Owner: businessOwnerName,
                    client_SI_Technical_Owner_email: businessOwnerEmail,
                    ricew_object: uploadingRow.ricewObject || ''
                };

                records.push({
                    ...commonData,
                    Client_Functional_Testing_SI_Technical_owner_id: row.feedback_business_owner_id || '',
                    parent_feedback_id: "",
                    row_number: index + 1,
                    sub_row_number: "",
                    feedback_text: row.text || '',
                    supported_doccument: (row.fileUrl && row.fileUrl !== '#') ? row.fileUrl : "",
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
                            feedback_text: subRow.text || '',
                            supported_doccument: (subRow.fileUrl && subRow.fileUrl !== '#') ? subRow.fileUrl : "",
                            supported_doccument_name: subRow.fileName || "",
                            business_owner_decision: subRow.business_owner_decision || ""
                        });
                    });
                }
            });

            const validRecords = records.filter(r => (r.feedback_text && r.feedback_text.trim() !== '') || (r.supported_doccument && r.supported_doccument !== ''));

            if (validRecords.length > 0) {
                await fetch('https://qnlyrtzvjc.execute-api.ap-south-1.amazonaws.com/New/api/SITechnicalOwner/FeedbackSubmit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ records: validRecords })
                });
            }

            // --- 3. Call Approval Email API (the core of this request) ---
            const approvalPayload = {
                SI_Technical_Owner_Email: businessOwnerEmail,
                SI_Technical_Owner_Name: businessOwnerName,
                RICEWRequestFormId: id,
                Client_Name: localStorage.getItem('user_name') || 'Client',
                Client_Functional_Testing_Specification_Assignment: assignmentId,
                Project_id: projectId
            };


            const approvalResponse = await fetch('https://qnlyrtzvjc.execute-api.ap-south-1.amazonaws.com/New/api/send/SITechnicalClientApprovalEmail', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ records: [approvalPayload] })
            });

            const approvalResult = await approvalResponse.json();

            if (approvalResult.success) {
                setSuccessMsg("Document Approved successfully!");
                setShowSuccess(true);
                setTimeout(() => {
                    setShowSuccess(false);
                    setSuccessMsg('');
                }, 3000);

                fetchModalFeedback(assignmentId);
                fetchFeedback(assignmentId);
                fetchData();
            } else {
                setErrorMsg("Approval partially failed: " + (approvalResult.error || "Unknown error"));
                setShowError(true);
                setTimeout(() => setShowError(false), 5000);
            }

        } catch (error) {
            console.error("Error during approval:", error);
            setErrorMsg("An error occurred during approval process.");
            setShowError(true);
            setTimeout(() => setShowError(false), 5000);
        } finally {
            setLoading(false);
        }
    };


    const fetchData = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const idToken = await getIdToken();
            const projectId = localStorage.getItem('project_id') || selectedProject?.id || '101';
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken} `
            };

            // Fetch Request Form Details (SI Technical Owner API)
            try {
                const detailsResponse = await fetch(`https://h78086ug8d.execute-api.ap-south-1.amazonaws.com/New/api/ricew/assignInitiateWorkSITechnicalOwnerFunctionalTesting/detailInfo?project_id=${projectId}&ricew_id=${id}`, { headers });
                const detailsResult = await detailsResponse.json();
                if (detailsResult.success) {
                    setRequestFormDetails(detailsResult.data);
                }
            } catch (error) {
                console.error("Error fetching request form details:", error);
            }

            // Fetch Assignments
            const assignmentResponse = await fetch(`https://07eirxky2f.execute-api.ap-south-1.amazonaws.com/New/api/ricew/clientFunctionalTestingAssignment/byRequestForm?RICEWRequestFormId=${id}`, { headers });
            const assignmentResult = await assignmentResponse.json();

            if (assignmentResult.success && assignmentResult.data) {
                // Fetch Initiated Work for each assignment
                const initiatedWorkPromises = assignmentResult.data.map(async (assignment) => {
                    try {
                        const response = await fetch(
                            `https://07eirxky2f.execute-api.ap-south-1.amazonaws.com/New/api/ricew/clientFunctionalTestingInitiateWork/byProjectAndAssignment?project_id=${projectId}&assignment_id=${assignment.Client_Functional_Testing_Specification_Assignment}`,
                            { headers }
                        );
                        const result = await response.json();
                        return {
                            assignmentId: assignment.Client_Functional_Testing_Specification_Assignment,
                            data: result.success && result.data && result.data.length > 0 ? result.data : []
                        };
                    } catch (error) {
                        console.error(`Error fetching initiated work for assignment ${assignment.Client_Functional_Testing_Specification_Assignment}:`, error);
                        return {
                            assignmentId: assignment.Client_Functional_Testing_Specification_Assignment,
                            data: []
                        };
                    }
                });

                const initiatedWorkResults = await Promise.all(initiatedWorkPromises);

                // Create a map for quick lookup
                const initiatedWorkMap = new Map();
                initiatedWorkResults.forEach(result => {
                    if (result.data) {
                        initiatedWorkMap.set(result.assignmentId, result.data);
                    }
                });

                const mappedData = assignmentResult.data.flatMap(item => {
                    // Date Formatting Helper
                    const formatToIST = (rawTimestamp) => {
                        if (!rawTimestamp || rawTimestamp === '-') return '-';
                        try {
                            const cleanDate = rawTimestamp.replace('_', '/').replace(',', '');
                            const dateObj = new Date(cleanDate);
                            if (isNaN(dateObj.getTime())) {
                                const parts = cleanDate.split('/');
                                if (parts.length === 3) {
                                    const [d, m, y] = parts;
                                    const [year, rest] = y.split(' ');
                                    const dateStr = `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}${rest ? ' ' + rest : ''}`;
                                    const fallbackDate = new Date(dateStr);
                                    if (!isNaN(fallbackDate.getTime())) return cleanDate;
                                }
                                return rawTimestamp;
                            }
                            return cleanDate;
                        } catch (e) {
                            return rawTimestamp;
                        }
                    };

                    const initiatedWorkList = initiatedWorkMap.get(item.Client_Functional_Testing_Specification_Assignment) || [];

                    if (initiatedWorkList.length === 0) {
                        // Return one empty row if no work has started
                        return [{
                            ...item,
                            Client_Functional_Testing_Specification_Initiate_Work_id: '',
                            ricewObject: item.RICEW_Object || '-',
                            assignedDate: formatToIST(item.updated_timestamp || item.created_timestamp) || '-',
                            startObject: '-',
                            uploadObject: '-',
                            uploadFiles: [],
                            fileName: '-',
                            endDate: '-',
                            isStarted: false,
                            isUploaded: false,
                            statusVerification: '-'
                        }];
                    }

                    // Otherwise return one row per initiated work record
                    return initiatedWorkList.map(initiatedWork => {
                        let allFiles = [];
                        let displayFileName = '-';
                        let primaryUrl = '-';

                        if (Array.isArray(initiatedWork?.Upload_Object)) {
                            allFiles = initiatedWork.Upload_Object.filter(f => f.url && f.url !== '-' && f.url.trim() !== '');
                            if (allFiles.length > 0) {
                                displayFileName = allFiles[0].File_Name || '-';
                                primaryUrl = allFiles[0].url || '-';
                            }
                        } else if (typeof initiatedWork?.Upload_Object === 'string' && initiatedWork.Upload_Object.trim() !== '' && initiatedWork.Upload_Object !== '-') {
                            primaryUrl = initiatedWork.Upload_Object;
                            displayFileName = initiatedWork?.file_name || initiatedWork?.File_Name || '-';
                            allFiles = [{ File_Name: displayFileName, url: primaryUrl }];
                        }

                        const hasUploadedFile = primaryUrl !== '-' && primaryUrl.trim() !== '';
                        return {
                            ...item,
                            Client_Functional_Testing_Specification_Initiate_Work_id: initiatedWork?.Client_Functional_Testing_Specification_Initiate_Work_id || '',
                            ricewObject: item.RICEW_Object || '-',
                            assignedDate: formatToIST(item.updated_timestamp || item.created_timestamp) || '-',
                            startObject: initiatedWork ? initiatedWork.Start_Object : '-',
                            uploadObject: primaryUrl,
                            uploadFiles: allFiles,
                            fileName: displayFileName,
                            endDate: initiatedWork ? initiatedWork.End_Date : '-',
                            isStarted: !!initiatedWork,
                            isUploaded: hasUploadedFile,
                            statusVerification: initiatedWork?.status_verification || '-'
                        };
                    });
                });

                // --- SORTING ---
                mappedData.sort((a, b) => {
                    const parseStart = (str) => {
                        if (!str || str === '-') return new Date(8640000000000000);
                        try {
                            const [datePart, timePart] = str.split(' ');
                            if (!datePart || !timePart) return new Date(8640000000000000);
                            const [d, m, y] = datePart.split('/').map(Number);
                            const [h, min, s] = timePart.split(':').map(Number);
                            return new Date(y, m - 1, d, h, min, s).getTime();
                        } catch (e) {
                            return new Date(8640000000000000);
                        }
                    };
                    return parseStart(a.startObject) - parseStart(b.startObject);
                });

                setWorkData(mappedData);
                if (mappedData.length > 0 && mappedData[0].Client_Functional_Testing_Specification_Assignment) {
                    fetchFeedback(mappedData[0].Client_Functional_Testing_Specification_Assignment);
                }
            } else {
                setWorkData([]);
            }
        } catch (error) {
            console.error("Error fetching work data:", error);
            setWorkData([]);
        } finally {
            setLoading(false);
        }
    }, [id, selectedProject?.id, fetchFeedback]);

    const getFileViewUrl = (url, fileName) => {
        if (!url || url === '-' || !url.startsWith('http')) return url;
        const extension = (fileName || url.split('?')[0]).split('.').pop().toLowerCase();
        if (['xlsx', 'xls', 'csv', 'docx', 'doc'].includes(extension)) {
            // Microsoft Office Viewer handles both Excel and Word files
            return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`;
        }
        return url;
    };

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Feedback is now fetched inside fetchData to avoid redundant calls on every workData change

    const handleAddRow = () => {
        setCombinedRows(prev => [
            ...prev,
            { id: Date.now(), bof: { text: '', fileName: '', fileUrl: '', feedback_business_owner_id: '', business_owner_decision: '' }, fswrn: { text: '', fileName: '', fileUrl: '' }, subRows: [] }
        ]);
    };

    const handleWorkAddRow = () => {
        if (workData.length > 0) {
            const template = workData[0];
            setWorkData(prev => [
                ...prev,
                {
                    ...template,
                    id: Date.now(),
                    ricewObject: template.ricewObject,
                    assignedDate: template.assignedDate,
                    startObject: '-',
                    uploadObject: '-',
                    fileName: '-',
                    endDate: '-',
                    isStarted: false,
                    isUploaded: false,
                    statusVerification: '-',
                    Initiate_Work_id: '',
                    Client_Functional_Testing_Specification_Initiate_Work_id: '',
                    uploadFiles: [],
                    isNewRow: true
                }
            ]);
        }
    };

    const handleWorkRemoveRow = (id) => {
        setWorkData(prev => prev.filter(row => row.id !== id));
    };

    const handleRemoveRow = (id) => {
        setCombinedRows(prev => {
            const row = prev.find(r => r.id === id);
            if (row && !row.bof.feedback_business_owner_id) {
                // Newly added row (no linked BOF record) — delete it entirely
                return prev.filter(r => r.id !== id);
            }
            // Linked to a BOF record — only clear FSWRN data, keep BOF intact
            return prev.map(r => r.id === id ? { ...r, fswrn: { text: '', fileName: '', fileUrl: '' } } : r);
        });
    };

    const handleAddSubRow = (parentId) => {
        setCombinedRows(prev => prev.map(row =>
            row.id === parentId
                ? { ...row, subRows: [...row.subRows, { id: Date.now(), bof: { text: '', fileName: '', fileUrl: '', feedback_business_owner_id: '', business_owner_decision: '' }, fswrn: { text: '', fileName: '', fileUrl: '' } }] }
                : row
        ));
    };

    const handleRemoveSubRow = (parentId, subRowId) => {
        setCombinedRows(prev => prev.map(row => {
            if (row.id !== parentId) return row;
            const subRow = row.subRows.find(sr => sr.id === subRowId);
            if (subRow && !subRow.bof.feedback_business_owner_id) {
                // Newly added sub-row (no linked BOF record) — delete it entirely
                return { ...row, subRows: row.subRows.filter(sr => sr.id !== subRowId) };
            }
            // Linked to a BOF sub-record — only clear FSWRN data, keep BOF intact
            return { ...row, subRows: row.subRows.map(sr => sr.id === subRowId ? { ...sr, fswrn: { ...sr.fswrn, fileName: '', fileUrl: '' } } : sr) };
        }));
    };

    const handleResponseChange = (id, field, value) => {
        setCombinedRows(prev => prev.map(row =>
            row.id === id ? { ...row, fswrn: { ...row.fswrn, [field]: value } } : row
        ));
    };

    const handleResponseFileUpload = (id, e) => {
        const file = e.target.files[0];
        if (file) {
            setCombinedRows(prev => prev.map(row =>
                row.id === id ? { ...row, fswrn: { ...row.fswrn, fileName: file.name, fileUrl: '#', fileObj: file } } : row
            ));
        }
        e.target.value = null;
    };

    const handleSubResponseChange = (parentId, subRowId, field, value) => {
        setCombinedRows(prev => prev.map(row =>
            row.id === parentId
                ? { ...row, subRows: row.subRows.map(sr => sr.id === subRowId ? { ...sr, fswrn: { ...sr.fswrn, [field]: value } } : sr) }
                : row
        ));
    };

    const handleSubResponseFileUpload = (parentId, subRowId, e) => {
        const file = e.target.files[0];
        if (file) {
            setCombinedRows(prev => prev.map(row =>
                row.id === parentId
                    ? { ...row, subRows: row.subRows.map(sr => sr.id === subRowId ? { ...sr, fswrn: { ...sr.fswrn, fileName: file.name, fileUrl: '#', fileObj: file } } : sr) }
                    : row
            ));
        }
        e.target.value = null;
    };

    const handleSubmitResponse = async () => {
        try {
            const idToken = await getIdToken();
            const projectId = localStorage.getItem('project_id') || selectedProject?.id || '101';
            const assignmentId = workData[0]?.Client_Functional_Testing_Specification_Assignment || '';

            setLoading(true);

            const allFilesToUpload = [];
            combinedRows.forEach(row => {
                if (row.fswrn.fileObj) allFilesToUpload.push({ file: row.fswrn.fileObj, rowRef: row.fswrn, feedback_business_owner_id: row.bof.feedback_business_owner_id });
                if (row.subRows) {
                    row.subRows.forEach(subRow => {
                        if (subRow.fswrn.fileObj) allFilesToUpload.push({ file: subRow.fswrn.fileObj, rowRef: subRow.fswrn, feedback_business_owner_id: subRow.bof.feedback_business_owner_id });
                    });
                }
            });

            if (allFilesToUpload.length > 0) {
                try {
                    await Promise.all(allFilesToUpload.map(async (item, index) => {
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

                        const presignResponse = await fetch('https://qnlyrtzvjc.execute-api.ap-south-1.amazonaws.com/New/generate-presigned-urls/Feedback-Response-FunctionalTester-pdf', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                project_id: projectId,
                                Client_Functional_Testing_Specification_Assignment: assignmentId,
                                RICEWRequestFormId: id,
                                ricew_object: workData[0]?.ricewObject || '',
                                Client_Functional_Testing_SI_Technical_owner_id: item.feedback_business_owner_id,
                                documents: [{
                                    name: newName,
                                    type: item.file.type || 'application/octet-stream'
                                }]
                            })
                        });

                        const presignResult = await presignResponse.json();

                        if (presignResult.success && presignResult.urls && presignResult.urls.length > 0) {
                            const urlData = presignResult.urls[0];
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
                        } else {
                            throw new Error("Failed to get presigned URL for " + originalName);
                        }
                    }));
                } catch (uploadError) {
                    console.error("Error during file upload:", uploadError);
                    alert("Failed to upload all files.");
                    setLoading(false);
                    return;
                }
            }

            const records = [];

            combinedRows.forEach((row, idx) => {
                // Main row record
                records.push({
                    Client_Functional_Testing_Writing_id: row.fswrn.rice_Specification_Writer_feedback_id || "",
                    Client_Functional_Testing_SI_Technical_owner_id: row.bof.feedback_business_owner_id || "",
                    parent_feedback_id: "",
                    row_number: idx + 1,
                    sub_row_number: 0,
                    Client_Functional_Testing_Specification_Initiate_Work_id: workData[0]?.Client_Functional_Testing_Specification_Initiate_Work_id || "",
                    Project_id: projectId,
                    Client_Functional_Testing_Specification_Assignment: assignmentId,
                    feedback_text: row.fswrn.text,
                    supported_doccument: row.fswrn.fileUrl === '#' ? "" : row.fswrn.fileUrl,
                    supported_doccument_name: row.fswrn.fileName
                });

                // Sub-rows records
                row.subRows?.forEach((subRow, sIdx) => {
                    records.push({
                        Client_Functional_Testing_Writing_id: subRow.fswrn.rice_Specification_Writer_feedback_id || "",
                        Client_Functional_Testing_SI_Technical_owner_id: subRow.bof.feedback_business_owner_id || "",
                        parent_feedback_id: "", // Link to parent response if needed by logic
                        row_number: idx + 1,
                        sub_row_number: sIdx + 1,
                        Client_Functional_Testing_Specification_Initiate_Work_id: workData[0]?.Client_Functional_Testing_Specification_Initiate_Work_id || "",
                        Project_id: projectId,
                        Client_Functional_Testing_Specification_Assignment: assignmentId,
                        feedback_text: subRow.fswrn.text,
                        supported_doccument: subRow.fswrn.fileUrl === '#' ? "" : subRow.fswrn.fileUrl,
                        supported_doccument_name: subRow.fswrn.fileName
                    });
                });
            });

            // Filter out empty rows (no text and no document) to match backend logic
            const filteredRecords = records.filter(r => r.feedback_text || r.supported_doccument);

            if (filteredRecords.length === 0) {
                setErrorMsg('Please enter at least one response before submitting.');
                setShowError(true);
                setTimeout(() => setShowError(false), 3000);
                setLoading(false);
                return;
            }

            const response = await fetch('https://qnlyrtzvjc.execute-api.ap-south-1.amazonaws.com/New/api/FunctionalTester/FeedbackResponseSubmit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ records: filteredRecords })
            });

            const result = await response.json();

            if (result.success) {
                setSuccessMsg('Responses submitted successfully');
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 3000);
                // Refresh feedback to get any new IDs/timestamps
                fetchFeedback(assignmentId);

                // Call Email API
                try {
                    const emailPayload = {
                        RICEW_Object: workData[0]?.ricewObject || '-',
                        RICEWRequestFormId: id,
                        Project_id: projectId,
                        client_SI_Technical_Owner_email: requestFormDetails?.client_SI_Technical_Owner_email || '',
                        client_SI_Technical_Owner: requestFormDetails?.client_SI_Technical_Owner || '',
                        Upload_Object: workData[0]?.uploadFiles || []
                    };

                    await fetch('https://qnlyrtzvjc.execute-api.ap-south-1.amazonaws.com/New/ricew/sendSITechnicalOwnerEmail', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${idToken}`
                        },
                        body: JSON.stringify(emailPayload)
                    });
                } catch (emailError) {
                    console.error('Error sending business owner email:', emailError);
                }
            } else {
                setErrorMsg('Failed to submit responses: ' + (result.error || 'Unknown error'));
                setShowError(true);
                setTimeout(() => setShowError(false), 5000);
            }
        } catch (error) {
            console.error('Error submitting responses:', error);
            setErrorMsg('Error submitting responses');
            setShowError(true);
            setTimeout(() => setShowError(false), 5000);
        } finally {
            setLoading(false);
        }
    };

    const handleStart = async (row) => {
        try {
            const idToken = await getIdToken();
            const userId = localStorage.getItem('user_id') || 'system';
            const projectId = localStorage.getItem('project_id') || selectedProject?.id || row.Project_id || '101';

            // Generate current timestamp for Start_Object
            const currentTimestamp = new Date().toLocaleString('en-GB', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                hour12: false
            }).replace(',', '');

            const payload = {
                Project_id: projectId,
                RICEW_Object: row.RICEW_Object || row.ricewObject || "-",
                Assigned_Date: row.assignedDate || "-",
                Start_Object: currentTimestamp,
                End_Date: "",
                Upload_Object: [],
                created_by: userId,
                updated_by: userId,
                Client_Roster_Form_id: row.Client_Roster_Form_id || "",
                RICEWRequestFormId: row.RICEWRequestFormId || id || "",
                Client_Functional_Testing_Specification_Assignment: row.Client_Functional_Testing_Specification_Assignment || ""
            };

            if (row.Client_Functional_Testing_Specification_Initiate_Work_id) {
                payload.Client_Functional_Testing_Specification_Initiate_Work_id = row.Client_Functional_Testing_Specification_Initiate_Work_id;
            }

            const response = await fetch('https://07eirxky2f.execute-api.ap-south-1.amazonaws.com/New/api/ricew/clientFunctionalTestingInitiateWork/createSubmit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (result.success) {
                setSuccessMsg('Work Initiated Successfully');
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 3000);
                fetchData();
            } else {
                console.error('Failed to initiate work:', result);
                setErrorMsg('Failed to initiate work: ' + (result.error || 'Unknown error'));
                setShowError(true);
                setTimeout(() => setShowError(false), 5000);
            }

        } catch (error) {
            console.error('Error initiating work:', error);
            setErrorMsg('Error initiating work');
            setShowError(true);
            setTimeout(() => setShowError(false), 5000);
        }
    };

    const handleUploadClick = (row) => {
        setUploadingRow(row);

        // Auto-fill from row data if available, otherwise fallback to data from the extra details API
        const initialOwnerName = row.SI_Technical_Owner_name || row.client_SI_Technical_Owner || requestFormDetails?.SI_Technical_Owner_name || requestFormDetails?.client_SI_Technical_Owner || '';
        const initialOwnerEmail = row.SI_Technical_Owner_email || row.client_SI_Technical_Owner_email || requestFormDetails?.SI_Technical_Owner_email || requestFormDetails?.client_SI_Technical_Owner_email || '';

        setTechnicalOwnerName(initialOwnerName);
        setTechnicalOwnerEmail(initialOwnerEmail);

        if (row.Client_Functional_Testing_Specification_Assignment) {
            fetchModalFeedback(row.Client_Functional_Testing_Specification_Assignment);
        } else {
            setFeedbackRows([{ id: Date.now(), text: '', fileName: '', fileUrl: '', feedback_business_owner_id: '', business_owner_decision: 'Open', subRows: [] }]);
        }

        setShowUploadModal(true);
    };



    return (
        <div className="config-main" style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '0', margin: '0', fontFamily: 'Arial, sans-serif' }}>
            <div style={{ padding: '1rem 1rem 2rem 1rem', width: '100%', minWidth: '1250px', margin: '0', boxSizing: 'border-box' }}>

                {/* Main Content Area */}
                <div style={{ backgroundColor: 'white', padding: '0', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>

                    {/* Project Info Header */}
                    <div style={{ padding: '2rem 1rem 1rem 2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project: {localStorage.getItem('project_name') || selectedProject?.name}</h3>
                        </div>
                    </div>

                    {/* Page Title */}
                    <div className="config-header" style={{ marginTop: '0', marginRight: "0px" }}>
                        <h2>Initiate Client Functional Unit Testing</h2>
                    </div>

                    <div style={{ padding: '20px' }}>

                        {/* Table Header and Body Section - Unified Scrollable Container */}
                        <div style={{
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
                                minWidth: '1260px'
                            }}>
                                <div style={{ width: '60px', flex: '0 0 60px', padding: '12px 8px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', backgroundColor: 'white', textAlign: 'center' }}>Sr. No.</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '200px', backgroundColor: 'white' }}>RICEW Object</div>
                                <div style={{ width: '150px', flex: '0 0 150px', padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', backgroundColor: 'white', textAlign: 'center' }}>Status</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '150px', backgroundColor: 'white' }}>Assigned Date</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '150px', backgroundColor: 'white' }}>Start Object</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '150px', backgroundColor: 'white' }}>Feedback Send</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', minWidth: '150px', backgroundColor: 'white' }}>End Date</div>
                            </div>

                            {/* Table Body */}
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                minWidth: '1260px',
                                backgroundColor: 'white'
                            }}>
                                {loading ? (
                                    <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Loading records...</div>
                                ) : workData.length > 0 ? (
                                    workData.map((row, index) => (
                                        <div
                                            key={index}
                                            style={{
                                                display: 'flex',
                                                backgroundColor: index % 2 === 0 ? '#ffffff' : '#ffffff',
                                                borderBottom: '1px solid #ddd',
                                                minWidth: '1260px',
                                                color: '#333'
                                            }}
                                        >
                                            {/* Sr. No. */}
                                            <div style={{ width: '60px', flex: '0 0 60px', padding: '12px 8px', fontSize: '13px', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '500' }}>
                                                {index + 1}
                                            </div>

                                            {/* RICEW Object */}
                                            <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', minWidth: '200px', display: 'flex', alignItems: 'center' }}>
                                                {row.ricewObject || '-'}
                                            </div>

                                            {/* Status */}
                                            <div style={{ width: '150px', flex: '0 0 150px', padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <span style={{
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    backgroundColor: '#dbeafe',
                                                    color: '#1e40af',
                                                    fontWeight: '500',
                                                    fontSize: '11px',
                                                    whiteSpace: 'normal',
                                                    textAlign: 'center',
                                                    width: '100%'
                                                }}>
                                                    {requestFormDetails?.RICEW_Status || '-'}
                                                </span>
                                            </div>

                                            {/* Assigned Date */}
                                            <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', minWidth: '150px', display: 'flex', alignItems: 'center' }}>
                                                {row.assignedDate || '-'}
                                            </div>

                                            {/* Start Object */}
                                            <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', minWidth: '150px', display: 'flex', alignItems: 'center' }}>
                                                {row.isStarted ? (
                                                    <span style={{ fontWeight: '500', color: '#333' }}>{row.startObject}</span>
                                                ) : (
                                                    <button
                                                        style={{
                                                            backgroundColor: '#28a745',
                                                            color: 'white',
                                                            border: 'none',
                                                            padding: '6px 16px',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                            fontSize: '12px',
                                                            fontWeight: '500',
                                                            transition: 'background-color 0.2s'
                                                        }}
                                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#218838'}
                                                        onMouseLeave={(e) => e.target.style.backgroundColor = '#28a745'}
                                                        onClick={() => handleStart(row)}
                                                    >
                                                        Start
                                                    </button>
                                                )}
                                            </div>

                                            {/* Feedback Send  */}
                                            <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', minWidth: '150px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '6px' }}>
                                                {!row.isStarted ? (
                                                    '-'
                                                ) : row.statusVerification === 'pending' ? (
                                                    (row.uploadFiles && row.uploadFiles.length > 0) ? (
                                                        row.uploadFiles.map((file, fIdx) => (
                                                            <a
                                                                key={fIdx}
                                                                href={getFileViewUrl(file.url, file.File_Name)}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                style={{
                                                                    display: '-webkit-box',
                                                                    WebkitLineClamp: 3,
                                                                    WebkitBoxOrient: 'vertical',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    wordBreak: 'break-all',
                                                                    fontWeight: '500',
                                                                    color: '#2563eb',
                                                                    textDecoration: 'none',
                                                                    backgroundColor: '#eff6ff',
                                                                    padding: '6px 10px',
                                                                    borderRadius: '6px',
                                                                    border: '1px solid #bfdbfe',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s ease',
                                                                    lineHeight: '1.4',
                                                                    fontSize: '12px'
                                                                }}
                                                                title={file.File_Name}
                                                                onMouseEnter={(e) => {
                                                                    e.target.style.backgroundColor = '#dbeafe';
                                                                    e.target.style.borderColor = '#93c5fd';
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.target.style.backgroundColor = '#eff6ff';
                                                                    e.target.style.borderColor = '#bfdbfe';
                                                                }}
                                                            >
                                                                <span style={{ color: '#64748b', marginRight: '4px', fontWeight: '600' }}>{fIdx + 1}.</span>
                                                                {file.File_Name || `document_${fIdx + 1}.pdf`}
                                                            </a>
                                                        ))
                                                    ) : (
                                                        '-'
                                                    )
                                                ) : (
                                                    <button
                                                        style={{
                                                            backgroundColor: row.isUploaded ? '#f59e0b' : '#3b82f6',
                                                            color: 'white',
                                                            border: 'none',
                                                            padding: '6px 16px',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                            fontSize: '12px',
                                                            fontWeight: '500',
                                                            width: '100px',
                                                            alignSelf: 'center',
                                                            transition: 'background-color 0.2s'
                                                        }}
                                                        onMouseEnter={(e) => e.target.style.backgroundColor = row.isUploaded ? '#d97706' : '#2563eb'}
                                                        onMouseLeave={(e) => e.target.style.backgroundColor = row.isUploaded ? '#f59e0b' : '#3b82f6'}
                                                        onClick={() => handleUploadClick(row)}
                                                    >
                                                        {row.isUploaded ? 'Re-Feedback' : 'Feedback'}
                                                    </button>
                                                )}
                                            </div>

                                            {/* End Date */}
                                            <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', minWidth: '150px', display: 'flex', alignItems: 'center' }}>
                                                {row.endDate || '-'}
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
                                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '15px 0', borderTop: '1px solid #eee', marginRight: '10px' }}>
                                    <div style={{ width: '100px', flex: '0 0 100px', display: 'flex', justifyContent: 'center' }}>
                                        <button
                                            onClick={handleWorkAddRow}
                                            style={{
                                                backgroundColor: '#c6f6d5',
                                                color: '#22543d',
                                                border: '1px solid #9ae6b4',
                                                padding: '6px 12px',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '11px',
                                                fontWeight: '600',
                                                transition: 'all 0.2s',
                                                whiteSpace: 'nowrap'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.target.style.backgroundColor = '#9ae6b4';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.backgroundColor = '#c6f6d5';
                                            }}
                                        >
                                            + Add Row
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
            {showSuccess && <SuccessMessage message={successMsg} />}
            {showError && <ErrorMessage message={errorMsg} />}

            {/* Confirmation Dialog - Same UI as OrganizationDetailsTable */}
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
                            fontSize: '16px',
                            lineHeight: '1.5'
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
                                Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Upload Form Modal */}
            {showUploadModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        width: '1750px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                    }}>
                        {/* Modal Header - Matching Page Style */}
                        <div className="config-header" style={{
                            margin: '0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0 20px',
                            height: '50px'
                        }}>
                            <h2 style={{ fontSize: '18px', margin: 0 }}>Client Feedback Form</h2>
                            <button
                                onClick={() => setShowUploadModal(false)}
                                style={{
                                    border: 'none',
                                    background: 'none',
                                    cursor: 'pointer',
                                    fontSize: '24px',
                                    color: 'white',
                                    fontWeight: '300',
                                    lineHeight: '1'
                                }}
                            >
                                ×
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: '20px', maxHeight: '70vh', overflowY: 'auto' }}>

                            {/* Technical Owner Section */}
                            <div style={{
                                display: 'flex',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                overflow: 'hidden',
                                width: '100%'
                            }}>
                                {/* Shared Label */}
                                <div style={{
                                    flex: '0 0 140px',
                                    padding: '12px 12.5px',
                                    borderRight: '1px solid #ddd',
                                    fontWeight: 'bold',
                                    fontSize: '14px',
                                    color: '#333',
                                    backgroundColor: '#f8f9fa',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}>
                                    SI Technical Owner
                                </div>

                                {/* Right Side - Stacked Inputs */}
                                <div style={{ flex: 1, backgroundColor: 'white' }}>
                                    {/* Name Sub-row */}
                                    <div style={{
                                        display: 'flex',
                                        padding: '5px 10px',
                                        borderBottom: '1px solid #ddd',
                                        alignItems: 'center',
                                        height: '58px'
                                    }}>
                                        <div style={{ flex: '0 0 100px', fontSize: '13px', color: '#666' }}>
                                            Name
                                        </div>
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                                            <input
                                                type="text"
                                                value={businessOwnerName}
                                                readOnly
                                                style={{
                                                    width: '100%',
                                                    height: '32px',
                                                    padding: '0 10px',
                                                    fontSize: '13px',
                                                    fontFamily: 'Arial, sans-serif',
                                                    border: '1px solid #ccc',
                                                    borderRadius: '4px',
                                                    backgroundColor: '#f5f5f5',
                                                    color: '#333',
                                                    boxSizing: 'border-box',
                                                    cursor: 'not-allowed'
                                                }}
                                            />
                                        </div>
                                    </div>
                                    {/* Email Sub-row */}
                                    <div style={{
                                        display: 'flex',
                                        padding: '5px 10px',
                                        alignItems: 'center',
                                        height: '58px'
                                    }}>
                                        <div style={{ flex: '0 0 100px', fontSize: '13px', color: '#666' }}>
                                            Email Address
                                        </div>
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                                            <input
                                                type="email"
                                                value={businessOwnerEmail}
                                                readOnly
                                                style={{
                                                    width: '100%',
                                                    height: '32px',
                                                    padding: '0 10px',
                                                    fontSize: '13px',
                                                    fontFamily: 'Arial, sans-serif',
                                                    border: '1px solid #ccc',
                                                    borderRadius: '4px',
                                                    backgroundColor: '#f5f5f5',
                                                    color: '#333',
                                                    boxSizing: 'border-box',
                                                    cursor: 'not-allowed'
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Feedback UI from PublicSI_FT_TechnicalOwnerFeedback.js */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '40px 1.2fr 90px 0.4fr 60px 1.2fr 0.5fr 150px',
                                borderLeft: '1px solid #ddd',
                                borderTop: '1px solid #ddd',
                                borderRadius: '4px 4px 0 0',
                                overflow: 'hidden',
                                backgroundColor: 'white',
                                marginTop: '20px'
                            }}>
                                <div style={{ gridColumn: 'span 5', borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '10px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px', backgroundColor: '#fcfcfc' }}>
                                    System Integrator Functional Testing Owner Feedback
                                </div>
                                <div style={{ gridColumn: 'span 3', borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '10px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px', backgroundColor: '#edf2f7', color: '#2d3748' }}>
                                    Functional Tester Response
                                </div>
                                <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#fcfcfc' }}>Sr. No.</div>
                                <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#fcfcfc' }}>Text</div>
                                <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#fcfcfc' }}>Upload</div>
                                <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#fcfcfc' }}>Uploaded Document Name</div>
                                <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#fcfcfc' }}>Action</div>
                                <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#fcfcfc' }}>Text</div>
                                <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#fcfcfc' }}>Uploaded Document Name</div>
                                <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#fcfcfc' }}>Decision</div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '40px 1.2fr 90px 0.4fr 60px 1.2fr 0.5fr 150px', borderLeft: '1px solid #ddd', overflow: 'hidden', backgroundColor: 'white' }}>
                                {feedbackRows.map((row, idx) => {
                                    const resp = row.response;
                                    const isLast = idx === feedbackRows.length - 1;
                                    const cellBorderBottom = '1px solid #ddd';
                                    const rowSpan = 1 + (row.subRows?.length || 0);
                                    return (
                                        <React.Fragment key={row.id}>
                                            <div style={{ gridRow: `span ${rowSpan}`, borderBottom: cellBorderBottom, borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', backgroundColor: row.business_owner_decision === 'Close' ? '#f5f5f5' : '#fcfcfc', color: row.business_owner_decision === 'Close' ? '#718096' : 'inherit', borderBottomLeftRadius: isLast ? '4px' : '0' }}>
                                                {idx + 1}
                                            </div>
                                            <div style={{ borderBottom: row.subRows?.length > 0 ? '1px solid #eee' : cellBorderBottom, borderRight: '1px solid #ddd', padding: '5px', position: 'relative', backgroundColor: row.business_owner_decision === 'Close' ? '#f5f5f5' : 'white' }}>
                                                <textarea value={row.text} onChange={(e) => handleModalRowChange(row.id, 'text', e.target.value)} disabled={row.business_owner_decision === 'Close'} style={{ width: '100%', border: 'none', outline: 'none', resize: row.business_owner_decision === 'Close' ? 'none' : 'vertical', minHeight: '35px', fontSize: '13px', fontFamily: 'Arial, sans-serif', padding: '5px', paddingBottom: '15px', backgroundColor: row.business_owner_decision === 'Close' ? '#f5f5f5' : 'transparent', color: row.business_owner_decision === 'Close' ? '#718096' : 'inherit', cursor: row.business_owner_decision === 'Close' ? 'not-allowed' : 'text' }} placeholder="Enter feedback..." />
                                                {row.feedback_business_owner_id && row.business_owner_decision !== 'Close' && (
                                                    <button onClick={() => handleModalAddSubRow(row.id)} style={{ position: 'absolute', right: '25px', bottom: '5px', background: 'none', border: 'none', padding: '0', cursor: 'pointer', color: '#3182ce', display: 'flex', alignItems: 'center' }} title="Add detail"><Plus size={16} /></button>
                                                )}
                                            </div>
                                            <div style={{ borderBottom: row.subRows?.length > 0 ? '1px solid #eee' : cellBorderBottom, borderRight: '1px solid #ddd', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: row.business_owner_decision === 'Close' ? '#f5f5f5' : 'white' }}>
                                                <button onClick={() => document.getElementById(`modal-feedback-file-${row.id}`).click()} disabled={row.business_owner_decision === 'Close'} style={{ backgroundColor: row.business_owner_decision === 'Close' ? '#edf2f7' : '#c6f6d5', color: row.business_owner_decision === 'Close' ? '#a0aec0' : '#22543d', border: row.business_owner_decision === 'Close' ? '1px solid #e2e8f0' : '1px solid #9ae6b4', padding: '4px 8px', borderRadius: '4px', cursor: row.business_owner_decision === 'Close' ? 'not-allowed' : 'pointer', fontSize: '10px', fontWeight: '600' }}>Upload</button>
                                                <input id={`modal-feedback-file-${row.id}`} type="file" style={{ display: 'none' }} disabled={row.business_owner_decision === 'Close'} onChange={(e) => handleFeedbackFileUpload(row.id, e)} />
                                            </div>
                                            <div style={{ borderBottom: row.subRows?.length > 0 ? '1px solid #eee' : cellBorderBottom, borderRight: '1px solid #ddd', padding: '8px 5px', fontSize: '11px', color: row.business_owner_decision === 'Close' ? '#718096' : 'black', display: 'flex', alignItems: 'center', overflow: 'hidden', backgroundColor: row.business_owner_decision === 'Close' ? '#f5f5f5' : 'white' }}>
                                                {row.fileName ? <a href={getFileViewUrlInternal(row.fileUrl, row.fileName)} target="_blank" rel="noopener noreferrer" style={{ color: '#3182ce', textDecoration: 'none', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', pointerEvents: 'auto' }} title={row.fileName}>{row.fileName}</a> : <span style={{ color: '#999' }}>No doc</span>}
                                            </div>
                                            <div style={{ borderBottom: row.subRows?.length > 0 ? '1px solid #eee' : cellBorderBottom, borderRight: '1px solid #ddd', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: row.business_owner_decision === 'Close' ? '#f5f5f5' : 'white', borderBottomRightRadius: (isLast && !resp && (!row.subRows || row.subRows.length === 0)) ? '4px' : '0' }}>
                                                {feedbackRows.length > 1 && row.business_owner_decision !== 'Close' && <Trash2 size={16} color="#e53e3e" style={{ cursor: 'pointer' }} onClick={() => handleModalRemoveRow(row.id)} />}
                                            </div>
                                            <div style={{ borderBottom: row.subRows?.length > 0 ? '1px solid #eee' : cellBorderBottom, borderRight: '1px solid #ddd', padding: '5px', display: 'flex', alignItems: 'center', backgroundColor: resp ? '#f9fafb' : '#fafafa' }}>
                                                {resp && resp.text ? <textarea value={resp.text} readOnly={true} style={{ width: '100%', border: 'none', outline: 'none', resize: 'none', minHeight: '35px', fontSize: '13px', fontFamily: 'Arial, sans-serif', padding: '5px', backgroundColor: 'transparent', color: '#4a5568' }} /> : <span style={{ fontSize: '11px', color: '#999', padding: '5px' }}>No response added for this feedback</span>}
                                            </div>
                                            <div style={{ borderBottom: row.subRows?.length > 0 ? '1px solid #eee' : cellBorderBottom, borderRight: '1px solid #ddd', padding: '8px 10px', fontSize: '11px', color: 'black', display: 'flex', alignItems: 'center', overflow: 'hidden', backgroundColor: resp ? '#f9fafb' : '#fafafa', borderBottomRightRadius: (isLast && !row.subRows?.length) ? '4px' : '0' }}>
                                                {resp?.fileName ? <a href={resp.fileUrl !== '#' ? getFileViewUrlInternal(resp.fileUrl, resp.fileName) : undefined} target="_blank" rel="noopener noreferrer" style={{ color: '#3182ce', textDecoration: 'none', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }} title={resp.fileName}>{resp.fileName}</a> : <span style={{ color: '#999', fontSize: '11px' }}>No doc</span>}
                                            </div>
                                            <div style={{ borderBottom: row.subRows?.length > 0 ? '1px solid #eee' : cellBorderBottom, borderRight: '1px solid #ddd', padding: '8px 5px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: row.business_owner_decision === 'Close' ? '#f5f5f5' : (resp ? '#f9fafb' : 'white'), borderBottomRightRadius: (isLast && !row.subRows?.length) ? '4px' : '0' }}>
                                                <select value={row.business_owner_decision || 'Open'} onChange={(e) => handleModalRowChange(row.id, 'business_owner_decision', e.target.value)} style={{ width: '100%', height: '32px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#ffffff', color: '#334155', cursor: 'pointer', padding: '0 8px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                                                    <option value="Open">Open</option>
                                                    <option value="Close">Close</option>
                                                </select>
                                            </div>
                                            {row.subRows?.map((subRow, sIdx) => {
                                                const subResp = subRow.response;
                                                const isLastSubRow = sIdx === row.subRows.length - 1;
                                                const subCellBorderBottom = isLastSubRow ? cellBorderBottom : '1px solid #eee';
                                                return (
                                                    <React.Fragment key={subRow.id}>
                                                        <div style={{ borderBottom: subCellBorderBottom, borderRight: '1px solid #ddd', padding: '5px', position: 'relative', backgroundColor: subRow.business_owner_decision === 'Close' ? '#f5f5f5' : 'white' }}>
                                                            <textarea value={subRow.text} onChange={(e) => handleModalSubRowChange(row.id, subRow.id, 'text', e.target.value)} disabled={subRow.business_owner_decision === 'Close'} style={{ width: '100%', border: 'none', outline: 'none', resize: subRow.business_owner_decision === 'Close' ? 'none' : 'vertical', minHeight: '30px', fontSize: '13px', fontFamily: 'Arial, sans-serif', padding: '5px', paddingBottom: '15px', backgroundColor: subRow.business_owner_decision === 'Close' ? '#f5f5f5' : '#fffdee', color: subRow.business_owner_decision === 'Close' ? '#718096' : 'inherit', cursor: subRow.business_owner_decision === 'Close' ? 'not-allowed' : 'text' }} placeholder="Enter sub-feedback..." />
                                                            {subRow.feedback_business_owner_id && subRow.business_owner_decision !== 'Close' && (
                                                                <button onClick={() => handleModalAddSubRow(row.id)} style={{ position: 'absolute', right: '25px', bottom: '5px', background: 'none', border: 'none', padding: '0', cursor: 'pointer', color: '#3182ce', display: 'flex', alignItems: 'center' }} title="Add detail"><Plus size={16} /></button>
                                                            )}
                                                        </div>
                                                        <div style={{ borderBottom: subCellBorderBottom, borderRight: '1px solid #ddd', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: subRow.business_owner_decision === 'Close' ? '#f5f5f5' : 'white' }}>
                                                            <button onClick={() => document.getElementById(`modal-sub-file-${subRow.id}`).click()} disabled={subRow.business_owner_decision === 'Close'} style={{ backgroundColor: subRow.business_owner_decision === 'Close' ? '#edf2f7' : '#fff5f5', color: subRow.business_owner_decision === 'Close' ? '#a0aec0' : '#c53030', border: subRow.business_owner_decision === 'Close' ? '1px solid #e2e8f0' : '1px solid #feb2b2', padding: '4px 8px', borderRadius: '4px', cursor: subRow.business_owner_decision === 'Close' ? 'not-allowed' : 'pointer', fontSize: '10px', fontWeight: '600' }}>Upload</button>
                                                            <input id={`modal-sub-file-${subRow.id}`} type="file" style={{ display: 'none' }} disabled={subRow.business_owner_decision === 'Close'} onChange={(e) => handleSubRowFileUpload(row.id, subRow.id, e)} />
                                                        </div>
                                                        <div style={{ borderBottom: subCellBorderBottom, borderRight: '1px solid #ddd', padding: '8px 5px', fontSize: '11px', color: subRow.business_owner_decision === 'Close' ? '#718096' : 'black', display: 'flex', alignItems: 'center', overflow: 'hidden', backgroundColor: subRow.business_owner_decision === 'Close' ? '#f5f5f5' : 'white' }}>
                                                            {subRow.fileName ? <a href={getFileViewUrlInternal(subRow.fileUrl, subRow.fileName)} target="_blank" rel="noopener noreferrer" style={{ color: '#3182ce', textDecoration: 'none', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', pointerEvents: 'auto' }} title={subRow.fileName}>{subRow.fileName}</a> : <span style={{ color: '#999' }}>No doc</span>}
                                                        </div>
                                                        <div style={{ borderBottom: subCellBorderBottom, borderRight: '1px solid #ddd', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: subRow.business_owner_decision === 'Close' ? '#f5f5f5' : 'white' }}>
                                                            {subRow.business_owner_decision !== 'Close' && <Trash2 size={14} color="#e53e3e" style={{ cursor: 'pointer' }} onClick={() => handleModalRemoveSubRow(row.id, subRow.id)} />}
                                                        </div>
                                                        <div style={{ borderBottom: subCellBorderBottom, borderRight: '1px solid #ddd', padding: '5px', display: 'flex', alignItems: 'center', backgroundColor: subResp ? '#f9fafb' : '#fafafa' }}>
                                                            {subResp && subResp.text ? <textarea value={subResp.text} readOnly={true} style={{ width: '100%', border: 'none', outline: 'none', resize: 'none', minHeight: '30px', fontSize: '13px', fontFamily: 'Arial, sans-serif', padding: '5px', backgroundColor: 'transparent', color: '#4a5568' }} /> : <span style={{ fontSize: '11px', color: '#999', padding: '5px' }}>No response added for this feedback</span>}
                                                        </div>
                                                        <div style={{ borderBottom: subCellBorderBottom, borderRight: '1px solid #ddd', padding: '8px 10px', fontSize: '11px', color: 'black', display: 'flex', alignItems: 'center', overflow: 'hidden', backgroundColor: subResp ? '#f9fafb' : '#fafafa' }}>
                                                            {subResp?.fileName ? <a href={subResp.fileUrl !== '#' ? getFileViewUrlInternal(subResp.fileUrl, subResp.fileName) : undefined} target="_blank" rel="noopener noreferrer" style={{ color: '#3182ce', textDecoration: 'none', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }} title={subResp.fileName}>{subResp.fileName}</a> : <span style={{ color: '#999', fontSize: '11px' }}>No doc</span>}
                                                        </div>
                                                        <div style={{ borderBottom: subCellBorderBottom, borderRight: '1px solid #ddd', padding: '8px 5px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: subRow.business_owner_decision === 'Close' ? '#f5f5f5' : (subResp ? '#f9fafb' : 'white'), borderBottomRightRadius: isLastSubRow && isLast ? '4px' : '0' }}>
                                                            <select value={subRow.business_owner_decision || 'Open'} onChange={(e) => handleModalSubRowChange(row.id, subRow.id, 'business_owner_decision', e.target.value)} style={{ width: '100%', height: '30px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#ffffff', color: '#334155', cursor: 'pointer', padding: '0 8px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
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
                            </div>
                            {/* Footer row outside grid to avoid extending borderLeft */}
                            <div style={{ display: 'grid', gridTemplateColumns: '40px 1.2fr 90px 0.4fr 60px 1.2fr 0.5fr 150px', padding: '10px 0', backgroundColor: 'white' }}>
                                <div style={{ gridColumn: '3', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                    <button onClick={handleModalAddRow} style={{ backgroundColor: '#c6f6d5', color: '#22543d', border: '1px solid #9ae6b4', padding: '6px 15px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap' }}>+ Add Row</button>
                                </div>
                                <div style={{ gridColumnStart: 4, gridColumnEnd: 9, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', paddingRight: '10px' }}>
                                    <button
                                        onClick={handleModalSubmitDocument}
                                        disabled={loading}
                                        style={{
                                            backgroundColor: loading ? '#f0f0f0' : '#c6f6d5',
                                            color: '#22543d',
                                            border: '1px solid #9ae6b4',
                                            width: '140px',
                                            height: '32px',
                                            padding: '0px 12px',
                                            borderRadius: '4px',
                                            cursor: loading ? 'not-allowed' : 'pointer',
                                            fontSize: '14px',
                                            fontWeight: '500',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {loading ? 'Submitting...' : 'Submit Feedback'}
                                    </button>
                                    <button
                                        onClick={handleApproveDocument}
                                        disabled={loading}
                                        style={{
                                            backgroundColor: loading ? '#f0f0f0' : '#c6f6d5',
                                            color: '#22543d',
                                            border: '1px solid #9ae6b4',
                                            width: '150px',
                                            height: '32px',
                                            padding: '0px 12px',
                                            borderRadius: '4px',
                                            cursor: loading ? 'not-allowed' : 'pointer',
                                            fontSize: '14px',
                                            fontWeight: '500',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s',
                                            opacity: loading ? 0.7 : 1
                                        }}
                                        onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#9ae6b4'; }}
                                        onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#c6f6d5'; }}
                                    >
                                        {loading ? 'Approving...' : 'Approval Document'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div style={{
                            padding: '15px 20px',
                            textAlign: 'right',
                            borderTop: '1px solid #eee',
                            backgroundColor: '#f8f9fa'
                        }}>
                            <button
                                onClick={() => setShowUploadModal(false)}
                                style={{
                                    padding: '8px 25px',
                                    backgroundColor: '#6c757d',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#5a6268'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = '#6c757d'}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InitiateClientFunctionalUnitTestingCopy;
