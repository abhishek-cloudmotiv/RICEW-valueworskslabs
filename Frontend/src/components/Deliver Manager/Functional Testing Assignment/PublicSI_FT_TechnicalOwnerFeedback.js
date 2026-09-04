import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Trash2, Plus, HelpCircle, X } from 'lucide-react';
import DOMPurify from 'dompurify';

const PublicSI_FT_TechnicalOwnerFeedback = () => {


    const formatToDDMMMYYYY = (dateStr) => {
        if (!dateStr || dateStr === '-') return '-';
        try {
            const cleanStr = String(dateStr).replace('_', '/').replace(',', '').trim();
            let dateObj;
            if (cleanStr.includes('/')) {
                const parts = cleanStr.split(/[ /:]/);
                if (parts.length >= 3) {
                    const [d, m, y] = parts;
                    if (y.length === 4) dateObj = new Date(y, m - 1, d);
                    else dateObj = new Date(cleanStr);
                }
            } else {
                dateObj = new Date(cleanStr);
            }
            if (isNaN(dateObj.getTime())) return dateStr;
            const day = String(dateObj.getDate()).padStart(2, '0');
            const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
            return `${day}-${months[dateObj.getMonth()]}-${dateObj.getFullYear()}`;
        } catch (e) {
            return dateStr;
        }
    };

    const { id } = useParams();
    const [workData, setWorkData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [projectName, setProjectName] = useState('');
    const [showHelpPopup, setShowHelpPopup] = useState(false);
    const helpPopupRef = React.useRef(null);

    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (helpPopupRef.current && !helpPopupRef.current.contains(event.target)) {
                setShowHelpPopup(false);
            }
        };
        if (showHelpPopup) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showHelpPopup]);
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
    const [docApprovalStatus, setDocApprovalStatus] = useState({});

    const handleDocAction = async (workId, assignmentPK, fileName, fileUrl, action, fileType = 'manual') => {
        if (!workId || !fileName) {
            console.error("Missing ID or file name for approval action");
            return;
        }

        try {
            const isApproved = action === 'Approved' ? 'true' : 'false';
            const payload = {
                Functional_Testing_Initiate_Work_id: workId,
                Initiate_Work_System_Integrator_Technical_Owner_id: assignmentPK || "",
                File_Name: DOMPurify.sanitize(fileName, { ALLOWED_TAGS: [] }),
                document_approved: isApproved,
                file_type: fileType === 'ai' ? 'AI_Generated_File' : 'Upload_Object',
                updated_by: DOMPurify.sanitize(ownerName || "Technical Owner", { ALLOWED_TAGS: [] })
            };

            const response = await fetch('https://h78086ug8d.execute-api.ap-south-1.amazonaws.com/New/publicView/ricew/functionalTesting/syncUpdateDocumentStatusByWorkId', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                setDocApprovalStatus(prev => ({ ...prev, [fileUrl]: action }));
                setSuccessMessage(`Document ${DOMPurify.sanitize(fileName, { ALLOWED_TAGS: [] })} ${action === 'Approved' ? 'approved' : 'rejected'} successfully.`);
                setShowSuccessMessage(true);
                setTimeout(() => setShowSuccessMessage(false), 4000);

                // Silently refresh feedback to update decision and disabled states
                const assignmentId = workData[0]?.Functional_Testing_Assignment_id;
                if (assignmentId) {
                    fetchFeedback(assignmentId, true);
                }
            } else {
                const resText = await response.text();
                console.error('Failed to update status:', resText);
            }
        } catch (error) {
            console.error('API call error:', error);
        }
    };

    const fetchData = useCallback(async (isSilent = false) => {
        if (!id) return;
        if (!isSilent) setLoading(true);
        try {
            const headers = {
                'Content-Type': 'application/json'
            };

            // Fetch Assignments
            const assignmentResponse = await fetch(`https://h78086ug8d.execute-api.ap-south-1.amazonaws.com/New/publicView/ricew/functionalTestingAssignment/byRequestForm?RICEWRequestFormId=${id}`, { headers });
            const assignmentResult = await assignmentResponse.json();

            if (assignmentResult.success && assignmentResult.data) {
                // Fetch Initiated Work for each assignment
                const initiatedWorkPromises = assignmentResult.data.map(async (assignment) => {
                    try {
                        const projectId = assignment.Project_id || '101';
                        const response = await fetch(
                            `https://h78086ug8d.execute-api.ap-south-1.amazonaws.com/New/publicView/ricew/functionalTestingInitiateWork/byProjectAndAssignment?project_id=${projectId}&assignment_id=${assignment.Functional_Testing_Assignment_id}`,
                            { headers }
                        );
                        const result = await response.json();
                        return {
                            assignment: assignment,
                            assignmentId: assignment.Functional_Testing_Assignment_id,
                            data: result.success && result.data ? result.data : []
                        };
                    } catch (error) {
                        console.error(`Error fetching initiated work for assignment ${assignment.FunctionalTestingAssignment_id}:`, error);
                        return {
                            assignment: assignment,
                            assignmentId: assignment.Functional_Testing_Assignment_id,
                            data: []
                        };
                    }
                });

                const initiatedWorkResults = await Promise.all(initiatedWorkPromises);

                const mappedData = [];
                initiatedWorkResults.forEach(({ assignment, data }) => {
                    data.forEach(initiatedWork => {
                        let manualFiles = [];
                        if (initiatedWork && Array.isArray(initiatedWork.Upload_Object)) {
                            manualFiles = initiatedWork.Upload_Object.filter(f => f.url && f.url !== '-').map(f => ({
                                url: DOMPurify.sanitize(f.url, { ALLOWED_TAGS: [] }),
                                File_Name: DOMPurify.sanitize(f.File_Name || "", { ALLOWED_TAGS: [] }),
                                document_approved: f.document_approved || "",
                                isAI: false
                            }));
                        } else if (initiatedWork && typeof initiatedWork.Upload_Object === 'string' && initiatedWork.Upload_Object !== '-' && initiatedWork.Upload_Object.trim() !== '') {
                            manualFiles = [{
                                url: DOMPurify.sanitize(initiatedWork.Upload_Object, { ALLOWED_TAGS: [] }),
                                File_Name: DOMPurify.sanitize(initiatedWork.File_Name || 'document.pdf', { ALLOWED_TAGS: [] }),
                                document_approved: initiatedWork.document_approved || "",
                                isAI: false
                            }];
                        }

                        let aiFiles = [];
                        if (initiatedWork && Array.isArray(initiatedWork.AI_Generated_File)) {
                            aiFiles = initiatedWork.AI_Generated_File.filter(f => f.uploaded_url && f.uploaded_url !== '-').map(f => ({
                                url: DOMPurify.sanitize(f.uploaded_url, { ALLOWED_TAGS: [] }),
                                File_Name: DOMPurify.sanitize(f.file_name || "", { ALLOWED_TAGS: [] }),
                                document_approved: f.approved_document || "",
                                isAI: true
                            }));
                        }

                        const uploadFiles = [...manualFiles, ...aiFiles];
                        const hasUploadedFile = uploadFiles.length > 0;
                        const hasEndDate = initiatedWork && initiatedWork.End_Date && initiatedWork.End_Date !== '-' && initiatedWork.End_Date.trim() !== '';

                        if (hasEndDate) {
                            mappedData.push({
                                ...assignment,
                                ricewObject: DOMPurify.sanitize(assignment.RICEW_Object || initiatedWork.RICEW_Object || '-', { ALLOWED_TAGS: [] }),
                                assignedDate: DOMPurify.sanitize((assignment.assign_object_date || assignment.created_timestamp) || '-', { ALLOWED_TAGS: [] }),
                                startObject: DOMPurify.sanitize(initiatedWork ? initiatedWork.Start_Object : '-', { ALLOWED_TAGS: [] }),
                                uploadFiles: uploadFiles,
                                endDate: DOMPurify.sanitize(initiatedWork ? initiatedWork.End_Date : '-', { ALLOWED_TAGS: [] }),
                                comment: DOMPurify.sanitize(initiatedWork?.comment_section || initiatedWork?.comment || '', { ALLOWED_TAGS: [] }),
                                isStarted: true,
                                isUploaded: hasUploadedFile,
                                hasEndDate: hasEndDate,
                                Initiate_Work_id: initiatedWork?.Functional_Testing_Initiate_Work_id || initiatedWork?.Initiate_Work_id || '',
                                Initiate_Work_System_Integrator_Technical_Owner_id: initiatedWork?.Initiate_Work_System_Integrator_Technical_Owner_id || '',
                                approve_reject_Decision: initiatedWork?.approve_reject_Decision || ''
                            });
                        }
                    });
                });

                mappedData.sort((a, b) => {
                    const idA = parseInt(a.Initiate_Work_id || '0', 10);
                    const idB = parseInt(b.Initiate_Work_id || '0', 10);
                    // Rows without an ID go last
                    if (idA === 0 && idB !== 0) return 1;
                    if (idA !== 0 && idB === 0) return -1;
                    // Ascending — largest (latest) ID last
                    return idA - idB;
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
                            const detailsResp = await fetch(`https://h78086ug8d.execute-api.ap-south-1.amazonaws.com/New/publicView/ricew/functionalTestingAssignment/details?project_id=${projectId}&ricew_id=${id}`, { headers });
                            const detailsResult = await detailsResp.json();
                            if (detailsResult.success) {
                                setOwnerName(DOMPurify.sanitize(detailsResult.data.Client_Owner_name || '', { ALLOWED_TAGS: [] }));
                                setOwnerEmail(DOMPurify.sanitize(detailsResult.data.Client_Owner_email || '', { ALLOWED_TAGS: [] }));
                                setRicewStatus(DOMPurify.sanitize(detailsResult.data.RICEW_Status || '', { ALLOWED_TAGS: [] }));
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
            setLoading(false);
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
            const assignmentId = workData.length > 0 ? workData[0].Functional_Testing_Assignment_id : null;
            if (!assignmentId) return;

            const response = await fetch(`https://m0834h3b33.execute-api.ap-south-1.amazonaws.com/New/api/FunctionalTestingFeedback/FetchAll?Functional_Testing_Assignment_id=${assignmentId}`);
            const result = await response.json();

            let fetchedRows = [];
            if (result.success && result.data && result.data.length > 0) {
                fetchedRows = result.data.map(item => {
                    const trMain = item.tester_responses && item.tester_responses.length > 0 ? item.tester_responses[0] : null;
                    const feedbackId = item.SI_FT_Technical_Owner_feedback_id || '';
                    return {
                        id: feedbackId || Date.now() + Math.random(),
                        Functional_Testing_Initiate_Work_id: item.Functional_Testing_Initiate_Work_id || '',
                        Initiate_Work_id: item.Functional_Testing_Initiate_Work_id || '',
                        approve_reject_Decision: item.approve_reject_Decision || '',
                        text: DOMPurify.sanitize(item.feedback_text || '', { ALLOWED_TAGS: [] }),
                        fileName: DOMPurify.sanitize(item.supported_doccument_name || '', { ALLOWED_TAGS: [] }),
                        fileUrl: DOMPurify.sanitize(item.supported_doccument || '#', { ALLOWED_TAGS: [] }),
                        business_owner_decision: normalizeDecision(item.SI_Technical_Owner_Decision_open_closed),
                        feedback_business_owner_id: feedbackId,
                        response: trMain ? {
                            text: DOMPurify.sanitize(trMain.feedback_text || '', { ALLOWED_TAGS: [] }),
                            fileName: DOMPurify.sanitize(trMain.supported_doccument_name || '', { ALLOWED_TAGS: [] }),
                            fileUrl: DOMPurify.sanitize(trMain.supported_doccument || '#', { ALLOWED_TAGS: [] }),
                            Functional_Tester_feedback_SI_id: trMain.Functional_Tester_feedback_SI_id || ''
                        } : null,
                        subRows: item.sub_feedbacks ? item.sub_feedbacks.map(subItem => {
                            const trSub = subItem.tester_responses && subItem.tester_responses.length > 0 ? subItem.tester_responses[0] : null;
                            const subFeedbackId = subItem.SI_FT_Technical_Owner_feedback_id || '';
                            return {
                                id: subFeedbackId || Date.now() + Math.random(),
                                text: DOMPurify.sanitize(subItem.feedback_text || '', { ALLOWED_TAGS: [] }),
                                fileName: DOMPurify.sanitize(subItem.supported_doccument_name || '', { ALLOWED_TAGS: [] }),
                                fileUrl: DOMPurify.sanitize(subItem.supported_doccument || '#', { ALLOWED_TAGS: [] }),
                                business_owner_decision: normalizeDecision(subItem.SI_Technical_Owner_Decision_open_closed),
                                feedback_business_owner_id: subFeedbackId,
                                response: trSub ? {
                                    text: DOMPurify.sanitize(trSub.feedback_text || '', { ALLOWED_TAGS: [] }),
                                    fileName: DOMPurify.sanitize(trSub.supported_doccument_name || '', { ALLOWED_TAGS: [] }),
                                    fileUrl: DOMPurify.sanitize(trSub.supported_doccument || '#', { ALLOWED_TAGS: [] }),
                                    Functional_Tester_feedback_SI_id: trSub.Functional_Tester_feedback_SI_id || ''
                                } : null
                            };
                        }) : []
                    };
                });
            }

            // Sync with workData to add empty rows for missing feedback
            const finalRows = [...fetchedRows];
            workData.forEach((workRow, index) => {
                const hasFeedback = fetchedRows.some(f => String(f.Initiate_Work_id) === String(workRow.Initiate_Work_id));
                if (!hasFeedback) {
                    finalRows.push({
                        id: Date.now() + index + Math.random(),
                        Initiate_Work_id: workRow.Initiate_Work_id,
                        Functional_Testing_Initiate_Work_id: workRow.Initiate_Work_id,
                        text: '',
                        fileName: '',
                        fileUrl: '',
                        feedback_business_owner_id: '',
                        business_owner_decision: workRow.approve_reject_Decision === 'true' ? 'Close' : 'Open',
                        subRows: []
                    });
                }
            });

            // Sort by Initiate_Work_id ASC
            finalRows.sort((a, b) => {
                const idA = parseInt(String(a.Initiate_Work_id).replace(/\D/g, '')) || 0;
                const idB = parseInt(String(b.Initiate_Work_id).replace(/\D/g, '')) || 0;
                return idA - idB;
            });

            setFeedbackRows(prevRows => {
                if (!isSilent) return finalRows;

                // Merge logic to keep unsaved local state
                return finalRows.map(newRow => {
                    const localMatch = prevRows.find(p =>
                        (p.Initiate_Work_id && String(p.Initiate_Work_id) === String(newRow.Initiate_Work_id)) ||
                        String(p.id) === String(newRow.id)
                    );

                    if (!localMatch) return newRow;

                    return {
                        ...newRow,
                        // Prioritize local text/file state for unsaved records
                        text: (localMatch.text && !newRow.text) || (localMatch.text !== newRow.text && !newRow.feedback_business_owner_id)
                            ? localMatch.text
                            : newRow.text,
                        fileObj: localMatch.fileObj,
                        fileName: localMatch.fileObj ? localMatch.fileName : newRow.fileName,
                        fileUrl: localMatch.fileObj ? localMatch.fileUrl : newRow.fileUrl,
                        subRows: newRow.subRows.map(newSub => {
                            const localSubMatch = localMatch.subRows?.find(ls =>
                                String(ls.id) === String(newSub.id) ||
                                (ls.feedback_business_owner_id && String(ls.feedback_business_owner_id) === String(newSub.feedback_business_owner_id))
                            );
                            if (!localSubMatch) return newSub;
                            return {
                                ...newSub,
                                text: (localSubMatch.text && !newSub.text) || (localSubMatch.text !== newSub.text && !newSub.feedback_business_owner_id)
                                    ? localSubMatch.text
                                    : newSub.text,
                                fileObj: localSubMatch.fileObj,
                                fileName: localSubMatch.fileObj ? localSubMatch.fileName : newSub.fileName,
                                fileUrl: localSubMatch.fileObj ? localSubMatch.fileUrl : newSub.fileUrl
                            };
                        })
                    };
                });
            });
        } catch (error) {
            console.error("Error fetching feedback:", error);
        } finally {
            if (!isSilent) setLoading(false);
        }
    }, [workData]);



    const getFileViewUrl = (url, fileName) => {
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
        setFeedbackRows(prev => {
            const rowToRemove = prev.find(r => r.id === id);
            // If it's a new row (no database ID), remove it from the array
            if (rowToRemove && !rowToRemove.feedback_business_owner_id) {
                return prev.filter(row => row.id !== id);
            }
            // Otherwise, just clear its fields
            return prev.map(row =>
                row.id === id
                    ? { ...row, text: '', fileName: '', fileUrl: '#', fileObj: undefined }
                    : row
            );
        });
    };

    const updateDecisionApi = async (SI_FT_Technical_Owner_feedback_id, decision) => {
        try {
            const response = await fetch('https://m0834h3b33.execute-api.ap-south-1.amazonaws.com/New/api/FunctionalTestingFeedback/UpdateDecision', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ SI_FT_Technical_Owner_feedback_id, decision })
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
            if (!currentRow) return;
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
                                if (firstWork?.Functional_Testing_Assignment_id) {
                                    fetchFeedback(firstWork.Functional_Testing_Assignment_id, true);
                                }
                            }
                        }
                    }
                );
                return;
            }
        }

        setFeedbackRows(prev => {
            const exists = prev.some(row => row.id === id);
            if (exists) {
                return prev.map(row => row.id === id ? { ...row, [field]: value } : row);
            }
            // Placeholder row not yet in state — add it so edits persist
            const workId = typeof id === 'string' && id.startsWith('empty-') ? id.replace('empty-', '') : '';
            const newRow = {
                id,
                Functional_Testing_Initiate_Work_id: workId,
                text: '',
                fileName: '',
                fileUrl: '#',
                business_owner_decision: workData.find(w => w.Initiate_Work_id === workId)?.approve_reject_Decision === 'true' ? 'Close' : 'Open',
                feedback_business_owner_id: '',
                response: null,
                subRows: [],
                [field]: value
            };
            return [...prev, newRow];
        });
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
        setFeedbackRows(prev => prev.map(row => {
            if (row.id !== parentId) return row;

            const subRow = row.subRows.find(sr => sr.id === subRowId);
            // If the subrow is new (no database ID), remove it from the array
            if (subRow && !subRow.feedback_business_owner_id) {
                return {
                    ...row,
                    subRows: row.subRows.filter(sr => sr.id !== subRowId)
                };
            }

            // Otherwise, just clear its fields
            return {
                ...row,
                subRows: row.subRows.map(sr =>
                    sr.id === subRowId ? { ...sr, text: '', fileName: '', fileUrl: '#', fileObj: undefined } : sr
                )
            };
        }));
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
                                if (firstWork?.Functional_Testing_Assignment_id) {
                                    fetchFeedback(firstWork.Functional_Testing_Assignment_id, true);
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

    const handleSubmitDocument = async () => {
        if (workData.length === 0) {
            alert("No feedback data found to submit.");
            return;
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

                const presignResponse = await fetch('https://m0834h3b33.execute-api.ap-south-1.amazonaws.com/New/generate-presigned-urls/Feedback-SI-Technical-Owner-pdf', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        project_id: firstWork.Project_id || '',
                        Functional_Testing_Assignment_id: firstWork.Functional_Testing_Assignment_id || '',
                        RICEWRequestFormId: id,
                        ricew_object: DOMPurify.sanitize(firstWork.ricewObject || '', { ALLOWED_TAGS: [] }),
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
                const matchingWork = workData.find(w => w.Initiate_Work_id === row.Functional_Testing_Initiate_Work_id) || firstWork;
                const commonData = {
                    Functional_Testing_Initiate_Work_id: row.Functional_Testing_Initiate_Work_id || matchingWork.Initiate_Work_id || '',
                    Project_id: matchingWork.Project_id || firstWork.Project_id || '',
                    RICEWRequestFormId: id,
                    Resource_Roster_Form_id: matchingWork.Resource_Roster_Form_id || firstWork.Resource_Roster_Form_id || '',
                    Functional_Testing_Assignment_id: matchingWork.Functional_Testing_Assignment_id || firstWork.Functional_Testing_Assignment_id || '',
                    SI_Technical_Owner_name: DOMPurify.sanitize(ownerName, { ALLOWED_TAGS: [] }),
                    SI_Technical_Owner_email: DOMPurify.sanitize(ownerEmail, { ALLOWED_TAGS: [] }),
                    ricew_object: DOMPurify.sanitize(matchingWork.ricewObject || firstWork.ricewObject || '', { ALLOWED_TAGS: [] })
                };

                records.push({
                    ...commonData,
                    SI_FT_Technical_Owner_feedback_id: row.feedback_business_owner_id || '',
                    parent_feedback_id: "",
                    row_number: index + 1,
                    sub_row_number: "",
                    feedback_text: DOMPurify.sanitize(row.text, { ALLOWED_TAGS: [] }),
                    supported_doccument: row.fileName ? (row.fileUrl !== '#' ? DOMPurify.sanitize(row.fileUrl, { ALLOWED_TAGS: [] }) : "") : "",
                    supported_doccument_name: DOMPurify.sanitize(row.fileName || "", { ALLOWED_TAGS: [] }),
                    business_owner_decision: row.business_owner_decision || ""
                });

                if (row.subRows && row.subRows.length > 0) {
                    row.subRows.forEach((subRow, subIndex) => {
                        records.push({
                            ...commonData,
                            SI_FT_Technical_Owner_feedback_id: subRow.feedback_business_owner_id || '',
                            parent_feedback_id: row.feedback_business_owner_id || '',
                            row_number: index + 1,
                            sub_row_number: subIndex + 1,
                            feedback_text: DOMPurify.sanitize(subRow.text, { ALLOWED_TAGS: [] }),
                            supported_doccument: subRow.fileName ? (subRow.fileUrl !== '#' ? DOMPurify.sanitize(subRow.fileUrl, { ALLOWED_TAGS: [] }) : "") : "",
                            supported_doccument_name: DOMPurify.sanitize(subRow.fileName || "", { ALLOWED_TAGS: [] }),
                            business_owner_decision: subRow.business_owner_decision || ""
                        });
                    });
                }
            });

            const response = await fetch('https://m0834h3b33.execute-api.ap-south-1.amazonaws.com/New/api/SITechnicalOwner/FeedbackSubmit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ records })
            });

            const result = await response.json();
            if (result.success) {
                setSuccessMessage("Feedback submitted successfully!");
                setShowSuccessMessage(true);
                setTimeout(() => {
                    setShowSuccessMessage(false);
                    setSuccessMessage('');
                }, 3000);

                if (workData.length > 0) {
                    fetchFeedback(workData[0].Functional_Testing_Assignment_id);
                }

                try {
                    const functionalWorkIds = [...new Set(workData.map(w => w.Initiate_Work_id).filter(Boolean))];
                    if (functionalWorkIds.length > 0) {
                        await fetch('https://m0834h3b33.execute-api.ap-south-1.amazonaws.com/New/api/FunctionalTesting/ApproveRejectDecisionBulk', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ functional_work_ids: functionalWorkIds })
                        });
                        fetchFeedback(workData[0].Functional_Testing_Assignment_id, true);
                        fetchData(true);
                    }
                } catch (bulkErr) {
                    console.error('Bulk decision update failed (non-blocking):', bulkErr);
                }

                try {
                    const emailPayload = {
                        Functional_Tester_Email_Address: DOMPurify.sanitize(firstWork.Email_Address || '', { ALLOWED_TAGS: [] }),
                        Tester_name: DOMPurify.sanitize(firstWork.Functional_Testing_name || firstWork.Functional_name || '', { ALLOWED_TAGS: [] }),
                        RICEWRequestFormId: id,
                        SI_Technical_Owner_name: DOMPurify.sanitize(ownerName, { ALLOWED_TAGS: [] })
                    };

                    await fetch('https://m0834h3b33.execute-api.ap-south-1.amazonaws.com/New/api/send/functionalTestingFeedbackEmail', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ records: [emailPayload] })
                    });
                } catch (emailErr) {
                    console.error('FeedbackEmail notification failed (non-blocking):', emailErr);
                }
            } else {
                alert(`Error: ${result.error || 'Failed to submit feedback'}`);
            }
        } catch (error) {
            console.error("Error submitting document:", error);
            alert("An error occurred while submitting the document.");
        } finally {
            setLoading(false);
        }
    };

    const handleApproveDocument = async () => {
        if (workData.length === 0) {
            alert('No work data found to approve.');
            return;
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

                const presignResponse = await fetch('https://m0834h3b33.execute-api.ap-south-1.amazonaws.com/New/generate-presigned-urls/Feedback-SI-Technical-Owner-pdf', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        project_id: firstWork.Project_id || '',
                        Functional_Testing_Assignment_id: firstWork.Functional_Testing_Assignment_id || '',
                        RICEWRequestFormId: id,
                        ricew_object: DOMPurify.sanitize(firstWork.ricewObject || '', { ALLOWED_TAGS: [] }),
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
                    alert("Failed to prepare file uploads. Approval aborted.");
                    setLoading(false);
                    return;
                }
            }

            const records = [];
            feedbackRows.forEach((row, index) => {
                const matchingWork = workData.find(w => w.Initiate_Work_id === row.Functional_Testing_Initiate_Work_id) || firstWork;
                const commonData = {
                    Functional_Testing_Initiate_Work_id: row.Functional_Testing_Initiate_Work_id || matchingWork.Initiate_Work_id || '',
                    Project_id: matchingWork.Project_id || firstWork.Project_id || '',
                    RICEWRequestFormId: id,
                    Resource_Roster_Form_id: matchingWork.Resource_Roster_Form_id || firstWork.Resource_Roster_Form_id || '',
                    Functional_Testing_Assignment_id: matchingWork.Functional_Testing_Assignment_id || firstWork.Functional_Testing_Assignment_id || '',
                    SI_Technical_Owner_name: DOMPurify.sanitize(ownerName, { ALLOWED_TAGS: [] }),
                    SI_Technical_Owner_email: DOMPurify.sanitize(ownerEmail, { ALLOWED_TAGS: [] }),
                    ricew_object: DOMPurify.sanitize(matchingWork.ricewObject || firstWork.ricewObject || '', { ALLOWED_TAGS: [] })
                };

                records.push({
                    ...commonData,
                    SI_FT_Technical_Owner_feedback_id: row.feedback_business_owner_id || '',
                    parent_feedback_id: "",
                    row_number: index + 1,
                    sub_row_number: "",
                    feedback_text: DOMPurify.sanitize(row.text, { ALLOWED_TAGS: [] }),
                    supported_doccument: row.fileName ? (row.fileUrl !== '#' ? DOMPurify.sanitize(row.fileUrl, { ALLOWED_TAGS: [] }) : "") : "",
                    supported_doccument_name: DOMPurify.sanitize(row.fileName || "", { ALLOWED_TAGS: [] }),
                    business_owner_decision: row.business_owner_decision || ""
                });

                if (row.subRows && row.subRows.length > 0) {
                    row.subRows.forEach((subRow, subIndex) => {
                        records.push({
                            ...commonData,
                            SI_FT_Technical_Owner_feedback_id: subRow.feedback_business_owner_id || '',
                            parent_feedback_id: row.feedback_business_owner_id || '',
                            row_number: index + 1,
                            sub_row_number: subIndex + 1,
                            feedback_text: DOMPurify.sanitize(subRow.text, { ALLOWED_TAGS: [] }),
                            supported_doccument: subRow.fileName ? (subRow.fileUrl !== '#' ? DOMPurify.sanitize(subRow.fileUrl, { ALLOWED_TAGS: [] }) : "") : "",
                            supported_doccument_name: DOMPurify.sanitize(subRow.fileName || "", { ALLOWED_TAGS: [] }),
                            business_owner_decision: subRow.business_owner_decision || ""
                        });
                    });
                }
            });

            const validRecords = records.filter(r => r.feedback_text || r.supported_doccument);

            if (validRecords.length > 0) {
                try {
                    await fetch('https://m0834h3b33.execute-api.ap-south-1.amazonaws.com/New/api/SITechnicalOwner/FeedbackSubmit', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ records: validRecords })
                    });
                } catch (submitErr) {
                    console.error("Failed to submit feedback before approval:", submitErr);
                }
            }

            const approvalRecord = {
                Functional_Tester_Email_Address: DOMPurify.sanitize(firstWork.Email_Address || '', { ALLOWED_TAGS: [] }),
                Tester_name: DOMPurify.sanitize(firstWork.Functional_Testing_name || firstWork.Functional_name || '', { ALLOWED_TAGS: [] }),
                RICEWRequestFormId: id,
                SI_Technical_Owner_name: DOMPurify.sanitize(ownerName, { ALLOWED_TAGS: [] }),
                Functional_Testing_Assignment_id: firstWork.Functional_Testing_Assignment_id || ''
            };

            const response = await fetch('https://m0834h3b33.execute-api.ap-south-1.amazonaws.com/New/api/send/FunctionalTestingApprovalEmail', {
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

                try {
                    const functionalWorkIds = [...new Set(workData.map(w => w.Initiate_Work_id).filter(Boolean))];
                    if (functionalWorkIds.length > 0) {
                        await fetch('https://m0834h3b33.execute-api.ap-south-1.amazonaws.com/New/api/FunctionalTesting/ApproveRejectDecisionBulk', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ functional_work_ids: functionalWorkIds })
                        });
                    }
                } catch (bulkErr) {
                    console.error('Bulk decision update failed (non-blocking):', bulkErr);
                }

                fetchFeedback(firstWork.Functional_Testing_Assignment_id, true);
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
        const loadPageData = async () => {
            await fetchData();
        };
        loadPageData();
    }, [fetchData]);

    useEffect(() => {
        if (workData.length > 0) {
            fetchFeedback(workData[0].Functional_Testing_Assignment_id);
        }
    }, [workData, fetchFeedback]);

    return (
        <React.Fragment>
            <div className="config-main" style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '0', margin: '0' }}>
                <div style={{ padding: '1rem 1rem 2rem 1rem', width: '100%', minWidth: '1250px', margin: '0', boxSizing: 'border-box' }}>

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
                            gap: '8px',
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
                                <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project : <span style={{ color: '#007bff' }}> {projectName || '-'}</span></h3>
                            </div>
                        </div>

                        {/* Page Title */}
                        <div className="config-header" style={{ marginTop: '0', marginRight: "0px", display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 2rem' }}>
                            <h2 style={{ margin: 0 }}>Feedback Form (Functional Testing)</h2>
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
                                                        <p style={{ margin: '6px 0 0 0', color: '#555' }}>The <strong>Feedback Form (Functional Testing)</strong> allows RICEW owners to review testing results submitted by testers and provide feedback.</p>
                                                    </div>
                                                    <div style={{ marginBottom: '16px' }}>
                                                        <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to provide feedback</strong>
                                                        <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                                            <li>Review the uploaded test documents in the upper table.</li>
                                                            <li>Enter your feedback and upload supporting documents if needed.</li>
                                                            <li>Use the <strong>Decision</strong> dropdown to approve or request changes.</li>
                                                            <li>Click <strong>Submit Feedback</strong> to send your response.</li>
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
                            {/* Table Header and Body Section */}
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
                                    minWidth: '1410px'
                                }}>
                                    <div style={{ width: '60px', flex: '0 0 60px', padding: '12px 8px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', backgroundColor: 'white', textAlign: 'center' }}>Sr. No.</div>
                                    <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '200px', backgroundColor: 'white' }}>RICEW Object</div>
                                    <div style={{ width: '150px', flex: '0 0 150px', padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', backgroundColor: 'white' }}>RICEW Status</div>
                                    <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '150px', backgroundColor: 'white' }}>Assigned Date</div>
                                    <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '150px', backgroundColor: 'white' }}>Start Object</div>
                                    <div style={{ flex: 2, padding: '0', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '330px', backgroundColor: 'white', display: 'flex' }}>
                                        <div style={{ flex: 1, padding: '12px 12px', borderRight: '1px solid #ddd' }}>Upload Object</div>
                                        <div style={{ width: '160px', padding: '12px 12px', flexShrink: 0 }}>Document Approve</div>
                                    </div>
                                    <div style={{ width: '120px', flex: '0 0 120px', padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', minWidth: '120px', backgroundColor: 'white', borderRight: '1px solid #ddd', textAlign: 'center', boxSizing: 'border-box' }}>End Date</div>
                                    <div style={{ flex: 2, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', minWidth: '280px', backgroundColor: 'white', boxSizing: 'border-box' }}>Comment</div>
                                </div>

                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    minWidth: '1410px',
                                    backgroundColor: 'white'
                                }}>
                                    {loading ? (
                                        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Loading records...</div>
                                    ) : workData.length > 0 ? workData.map((row, index) => {
                                        const feedbackRow = feedbackRows.find(fr => String(fr.Initiate_Work_id) === String(row.Initiate_Work_id));
                                        const isDecisionLocked = feedbackRow?.approve_reject_Decision === 'true' || row.approve_reject_Decision === 'true';
                                        return (
                                            <div
                                                key={index}
                                                style={{
                                                    display: 'flex',
                                                    backgroundColor: isDecisionLocked ? '#eef2f6' : '#ffffff',
                                                    borderBottom: '1px solid #ddd',
                                                    minWidth: '1410px',
                                                    color: isDecisionLocked ? '#64748b' : '#333',
                                                    opacity: isDecisionLocked ? 0.95 : 1
                                                }}
                                            >
                                                {/* Sr. No. */}
                                                <div style={{ width: '60px', flex: '0 0 60px', padding: '12px 8px', fontSize: '13px', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '500' }}>
                                                    {row.Initiate_Work_id || '-'}
                                                </div>

                                                {/* RICEW Object */}
                                                <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', minWidth: '200px', display: 'flex', alignItems: 'center' }}>
                                                    {row.ricewObject || '-'}
                                                </div>

                                                {/* RICEW Status */}
                                                <div style={{ width: '150px', flex: '0 0 150px', padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'center' }}>
                                                    <span style={{
                                                        padding: '4px 8px',
                                                        borderRadius: '4px',
                                                        backgroundColor: '#dbeafe',
                                                        color: '#1e40af',
                                                        fontWeight: '500',
                                                        fontSize: '11px',
                                                        whiteSpace: 'nowrap',
                                                        textAlign: 'center',
                                                        width: '100%'
                                                    }}>
                                                        {ricewStatus || '-'}
                                                    </span>
                                                </div>

                                                {/* Assigned Date */}
                                                <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', minWidth: '150px', display: 'flex', alignItems: 'center' }}>
                                                    {formatToDDMMMYYYY(row.assignedDate)}
                                                </div>

                                                {/* Start Object */}
                                                <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', minWidth: '150px', display: 'flex', alignItems: 'center' }}>
                                                    <span style={{ fontWeight: '500', color: '#333' }}>{formatToDDMMMYYYY(row.startObject)}</span>
                                                </div>

                                                {/* Upload Object + Document Approve (combined per-file rows for alignment) */}
                                                <div style={{ flex: 2, padding: '0', fontSize: '13px', borderRight: '1px solid #ddd', minWidth: '330px', display: 'flex', flexDirection: 'column' }}>
                                                    {row.isUploaded && row.uploadFiles && row.uploadFiles.length > 0 ? (
                                                        row.uploadFiles.map((file, fIdx) => (
                                                            <div key={fIdx} style={{ display: 'flex', alignItems: 'stretch', minHeight: '44px', borderBottom: fIdx < row.uploadFiles.length - 1 ? '1px solid #eee' : 'none' }}>
                                                                {/* File name cell */}
                                                                <div style={{ flex: 1, padding: '8px 12px', display: 'flex', alignItems: 'center', borderRight: '1px solid #ddd' }}>
                                                                    <a
                                                                        href={getFileViewUrl(file.url, file.File_Name)}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        style={{
                                                                            display: 'block',
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
                                                                            fontSize: '12px',
                                                                            width: '100%'
                                                                        }}
                                                                        title={file.File_Name}
                                                                        onMouseEnter={(e) => {
                                                                            e.currentTarget.style.backgroundColor = '#dbeafe';
                                                                            e.currentTarget.style.borderColor = '#93c5fd';
                                                                        }}
                                                                        onMouseLeave={(e) => {
                                                                            e.currentTarget.style.backgroundColor = '#eff6ff';
                                                                            e.currentTarget.style.borderColor = '#bfdbfe';
                                                                        }}
                                                                    >
                                                                        <span style={{ color: '#64748b', marginRight: '4px', fontWeight: '600' }}>{fIdx + 1}.</span>
                                                                        {file.isAI && <span style={{ color: '#1e40af', marginRight: '4px', fontWeight: '700' }}>[AI]</span>}
                                                                        {file.File_Name || `document_${fIdx + 1}.pdf`}
                                                                    </a>
                                                                </div>
                                                                {/* Approve/Reject cell */}
                                                                <div style={{ width: '160px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                                                    {(() => {
                                                                        const status = docApprovalStatus[file.url] || (file.document_approved === 'true' ? 'Approved' : file.document_approved === 'false' ? 'Rejected' : '');
                                                                        const isApproved = status === 'Approved';
                                                                        let isRejected = status === 'Rejected';

                                                                        // If row is locked (disabled) and no choice was made, default to 'Rejected'
                                                                        if (isDecisionLocked && !isApproved && !isRejected) {
                                                                            isRejected = true;
                                                                        }

                                                                        const disableApprove = isApproved || isDecisionLocked;
                                                                        const disableReject = isRejected || isDecisionLocked;

                                                                        let approveBgColor = 'white';
                                                                        let approveTextColor = '#64748b';
                                                                        let approveBorder = '1px solid #cbd5e1';
                                                                        let rejectBgColor = 'white';
                                                                        let rejectTextColor = '#64748b';
                                                                        let rejectBorder = '1px solid #cbd5e1';

                                                                        if (isApproved) {
                                                                            approveBgColor = '#28a745';
                                                                            approveTextColor = 'white';
                                                                            approveBorder = '1px solid #28a745';
                                                                        }
                                                                        if (isRejected) {
                                                                            rejectBgColor = '#dc3545';
                                                                            rejectTextColor = 'white';
                                                                            rejectBorder = '1px solid #dc3545';
                                                                        }

                                                                        if (isDecisionLocked) {
                                                                            // Apply even more faded look to non-selected buttons when locked
                                                                            if (!isApproved) {
                                                                                approveBgColor = '#f9fafb';
                                                                                approveTextColor = '#9ca3af';
                                                                                approveBorder = '1px solid #e5e7eb';
                                                                            }
                                                                            if (!isRejected) {
                                                                                rejectBgColor = '#f9fafb';
                                                                                rejectTextColor = '#9ca3af';
                                                                                rejectBorder = '1px solid #e5e7eb';
                                                                            }
                                                                        }

                                                                        return (
                                                                            <>
                                                                                <button
                                                                                    disabled={disableApprove}
                                                                                    onClick={() => handleDocAction(row.Initiate_Work_id, row.Initiate_Work_System_Integrator_Technical_Owner_id, file.File_Name, file.url, 'Approved', file.isAI ? 'ai' : 'manual')}
                                                                                    onMouseEnter={(e) => {
                                                                                        if (!disableApprove) {
                                                                                            e.currentTarget.style.backgroundColor = '#f0fdf4';
                                                                                            e.currentTarget.style.borderColor = '#22c55e';
                                                                                            e.currentTarget.style.color = '#15803d';
                                                                                        }
                                                                                    }}
                                                                                    onMouseLeave={(e) => {
                                                                                        if (!disableApprove) {
                                                                                            e.currentTarget.style.backgroundColor = isApproved ? '#28a745' : 'white';
                                                                                            e.currentTarget.style.borderColor = isApproved ? '#28a745' : '#cbd5e1';
                                                                                            e.currentTarget.style.color = isApproved ? 'white' : '#64748b';
                                                                                        }
                                                                                    }}
                                                                                    style={{
                                                                                        padding: '6px 0',
                                                                                        width: '75px',
                                                                                        backgroundColor: approveBgColor,
                                                                                        color: approveTextColor,
                                                                                        border: approveBorder,
                                                                                        borderRadius: '6px',
                                                                                        cursor: disableApprove ? 'not-allowed' : 'pointer',
                                                                                        fontSize: '11px',
                                                                                        fontWeight: '600',
                                                                                        transition: 'all 0.2s ease',
                                                                                        textAlign: 'center'
                                                                                    }}
                                                                                >
                                                                                    {isApproved ? 'Approved' : 'Approve'}
                                                                                </button>
                                                                                <button
                                                                                    disabled={disableReject}
                                                                                    onClick={() => handleDocAction(row.Initiate_Work_id, row.Initiate_Work_System_Integrator_Technical_Owner_id, file.File_Name, file.url, 'Rejected', file.isAI ? 'ai' : 'manual')}
                                                                                    onMouseEnter={(e) => {
                                                                                        if (!disableReject) {
                                                                                            e.currentTarget.style.backgroundColor = '#fef2f2';
                                                                                            e.currentTarget.style.borderColor = '#ef4444';
                                                                                            e.currentTarget.style.color = '#b91c1c';
                                                                                        }
                                                                                    }}
                                                                                    onMouseLeave={(e) => {
                                                                                        if (!disableReject) {
                                                                                            e.currentTarget.style.backgroundColor = isRejected ? '#dc3545' : 'white';
                                                                                            e.currentTarget.style.borderColor = isRejected ? '#dc3545' : '#cbd5e1';
                                                                                            e.currentTarget.style.color = isRejected ? 'white' : '#64748b';
                                                                                        }
                                                                                    }}
                                                                                    style={{
                                                                                        padding: '6px 0',
                                                                                        width: '75px',
                                                                                        backgroundColor: rejectBgColor,
                                                                                        color: rejectTextColor,
                                                                                        border: rejectBorder,
                                                                                        borderRadius: '6px',
                                                                                        cursor: disableReject ? 'not-allowed' : 'pointer',
                                                                                        fontSize: '11px',
                                                                                        fontWeight: '600',
                                                                                        transition: 'all 0.2s ease',
                                                                                        textAlign: 'center'
                                                                                    }}
                                                                                >
                                                                                    {isRejected ? 'Rejected' : 'Reject'}
                                                                                </button>
                                                                            </>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div style={{ display: 'flex', alignItems: 'stretch', minHeight: '44px' }}>
                                                            <div style={{ flex: 1, padding: '8px 12px', display: 'flex', alignItems: 'center', borderRight: '1px solid #ddd' }}>-</div>
                                                            <div style={{ width: '160px', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                -
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* End Date */}
                                                <div style={{ width: '120px', flex: '0 0 120px', padding: '12px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #ddd', boxSizing: 'border-box' }}>
                                                    {formatToDDMMMYYYY(row.endDate)}
                                                </div>
                                                {/* Comment */}
                                                <div style={{ flex: 2, padding: '12px 12px', fontSize: '13px', minWidth: '280px', display: 'flex', alignItems: 'center', wordBreak: 'break-word', boxSizing: 'border-box' }}>
                                                    {row.comment || '-'}
                                                </div>
                                            </div>
                                        );
                                    }
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

                    {/* Feedback Form Container */}
                    <div style={{
                        backgroundColor: 'white',
                        padding: '0',
                        borderRadius: '8px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        marginTop: '30px',
                        minWidth: '1200px'
                    }}>
                        <div className="config-header" style={{ marginTop: '0', marginRight: "0px" }}>
                            <h2>Feedback Form</h2>
                        </div>

                        <div style={{ padding: '0px' }}>
                            {/* Owner Info Bar */}
                            <div style={{
                                padding: '16px 20px',
                                borderBottom: '1px solid #e0e0e0',
                                backgroundColor: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '24px',
                                flexWrap: 'wrap'
                            }}>
                                <label style={{
                                    fontWeight: '600',
                                    color: '#333',
                                    fontSize: '14px',
                                    whiteSpace: 'nowrap'
                                }}>
                                    RICEW Object Owner <span style={{ color: 'red' }}>*</span>
                                </label>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <label style={{ fontSize: '13px', color: 'black', fontWeight: '500' }}>Name <span style={{ fontWeight: 'bold' }}>:</span></label>
                                    <input
                                        type="text"
                                        placeholder="Name"
                                        value={ownerName}
                                        readOnly={true}
                                        style={{
                                            width: '240px',
                                            height: '35px',
                                            padding: '0 12px',
                                            border: '1px solid black',
                                            borderRadius: '4px',
                                            backgroundColor: '#f5f5f5',
                                            fontSize: '13px',
                                            fontFamily: 'Arial, sans-serif',
                                            color: 'black',
                                            outline: 'none',
                                            cursor: 'not-allowed'
                                        }}
                                    />
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <label style={{ fontSize: '13px', color: 'black', fontWeight: '500' }}>Email Address <span style={{ fontWeight: 'bold' }}>:</span></label>
                                    <input
                                        type="email"
                                        placeholder="Email Address"
                                        value={ownerEmail}
                                        readOnly={true}
                                        style={{
                                            width: '300px',
                                            height: '35px',
                                            padding: '0 12px',
                                            border: '1px solid black',
                                            borderRadius: '4px',
                                            backgroundColor: '#f5f5f5',
                                            fontSize: '13px',
                                            fontFamily: 'Arial, sans-serif',
                                            color: 'black',
                                            outline: 'none',
                                            cursor: 'not-allowed'
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{ padding: '20px' }}>
                                {/* Unified Feedback and Response Grid */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '60px 1.2fr 90px 0.4fr 60px 150px',
                                    borderLeft: '1px solid #ddd',
                                    borderTop: '1px solid #ddd',
                                    borderRadius: '4px 4px 0 0',
                                    overflow: 'hidden',
                                    backgroundColor: 'white'
                                }}>
                                    {/* Group Header Row 1 */}
                                    <div style={{
                                        gridColumn: 'span 6',
                                        borderBottom: '1px solid #ddd',
                                        borderRight: '1px solid #ddd',
                                        padding: '10px',
                                        textAlign: 'center',
                                        fontWeight: 'bold',
                                        fontSize: '14px',
                                        backgroundColor: '#fcfcfc'
                                    }}>
                                        RICEW Owner (Client) Feedback
                                    </div>

                                    {/* Sub-Header Row 2 */}
                                    <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#fcfcfc' }}>Sr. No.</div>
                                    <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#fcfcfc' }}>Text</div>
                                    <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#fcfcfc' }}>Upload</div>
                                    <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#fcfcfc' }}>Uploaded Document Name</div>
                                    <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#fcfcfc' }}>Action</div>
                                    <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#fcfcfc' }}>Business Owner Decision</div>
                                </div>

                                {/* Aligned Table Rows */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '60px 1.2fr 90px 0.4fr 60px 150px',
                                    borderLeft: '1px solid #ddd',
                                    borderTop: 'none',
                                    borderBottom: 'none',
                                    borderRight: 'none',
                                    borderRadius: '0 0 4px 4px',
                                    overflow: 'hidden',
                                    backgroundColor: 'white'
                                }}>
                                    {workData.flatMap((workRow, idx) => {
                                        const workId = workRow.Initiate_Work_id;
                                        const matchedRows = workId
                                            ? feedbackRows.filter(r => r.Functional_Testing_Initiate_Work_id === workId)
                                            : [];
                                        const rowsToRender = matchedRows.length > 0 ? matchedRows : [{
                                            id: `empty-${workId || idx}`,
                                            Functional_Testing_Initiate_Work_id: workId,
                                            text: '',
                                            fileName: '',
                                            fileUrl: '#',
                                            business_owner_decision: workRow.approve_reject_Decision === 'true' ? 'Close' : 'Open',
                                            feedback_business_owner_id: '',
                                            response: null,
                                            subRows: []
                                        }];

                                        // Total grid rows this workId occupies (all feedback rows + their sub-rows)
                                        const totalSpan = rowsToRender.reduce((sum, r) => sum + 1 + (r.subRows?.length || 0), 0);

                                        return rowsToRender.map((row, rowIdx) => {
                                            const resp = row.response;
                                            const isLast = idx === workData.length - 1 && rowIdx === rowsToRender.length - 1;
                                            const cellBorderBottom = '1px solid #ddd';
                                            const rowSpan = 1 + (row.subRows?.length || 0);

                                            return (
                                                <React.Fragment key={row.id}>
                                                    {/* Column 1: Sr. No. — only render for the first feedback row of each workId */}
                                                    {rowIdx === 0 && (
                                                        <div style={{
                                                            gridRow: `span ${totalSpan}`,
                                                            borderBottom: cellBorderBottom,
                                                            borderRight: '1px solid #ddd',
                                                            padding: '8px',
                                                            textAlign: 'center',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '11px',
                                                            backgroundColor: '#fcfcfc',
                                                            color: '#666',
                                                            borderBottomLeftRadius: isLast ? '4px' : '0'
                                                        }}>
                                                            {workId || '-'}
                                                        </div>
                                                    )}

                                                    {/* Column 2: Text (Main Row) */}
                                                    <div style={{
                                                        borderBottom: row.subRows?.length > 0 ? '1px solid #ddd' : cellBorderBottom,
                                                        borderRight: '1px solid #ddd',
                                                        padding: '5px',
                                                        position: 'relative',
                                                        backgroundColor: row.business_owner_decision === 'Close' ? '#f5f5f5' : 'white'
                                                    }}>
                                                        <textarea
                                                            value={row.text}
                                                            onChange={(e) => handleRowChange(row.id, 'text', e.target.value)}
                                                            disabled={row.business_owner_decision === 'Close'}
                                                            style={{
                                                                width: '100%',
                                                                border: 'none',
                                                                outline: 'none',
                                                                resize: row.business_owner_decision === 'Close' ? 'none' : 'vertical',
                                                                minHeight: '35px',
                                                                fontSize: '13px',
                                                                fontFamily: 'Arial, sans-serif',
                                                                padding: '5px',
                                                                paddingBottom: '15px',
                                                                backgroundColor: row.business_owner_decision === 'Close' ? '#f5f5f5' : 'transparent',
                                                                color: row.business_owner_decision === 'Close' ? '#718096' : 'inherit',
                                                                cursor: row.business_owner_decision === 'Close' ? 'not-allowed' : 'text'
                                                            }}
                                                            placeholder="Enter feedback..."
                                                        />
                                                        {row.feedback_business_owner_id && row.business_owner_decision !== 'Close' && (
                                                            <button
                                                                onClick={() => handleAddSubRow(row.id)}
                                                                style={{
                                                                    position: 'absolute',
                                                                    right: '25px',
                                                                    bottom: '5px',
                                                                    background: 'none',
                                                                    border: 'none',
                                                                    padding: '0',
                                                                    cursor: 'pointer',
                                                                    color: '#3182ce',
                                                                    display: 'flex',
                                                                    alignItems: 'center'
                                                                }}
                                                                title="Add detail"
                                                            >
                                                                <Plus size={16} />
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Column 3: Upload (Main Row) */}
                                                    <div style={{
                                                        borderBottom: row.subRows?.length > 0 ? '1px solid #ddd' : cellBorderBottom,
                                                        borderRight: '1px solid #ddd',
                                                        padding: '8px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        backgroundColor: row.business_owner_decision === 'Close' ? '#f5f5f5' : 'white'
                                                    }}>
                                                        <button
                                                            onClick={() => document.getElementById(`feedback-file-${row.id}`).click()}
                                                            disabled={row.business_owner_decision === 'Close'}
                                                            style={{
                                                                backgroundColor: row.business_owner_decision === 'Close' ? '#edf2f7' : '#c6f6d5',
                                                                color: row.business_owner_decision === 'Close' ? '#a0aec0' : '#22543d',
                                                                border: row.business_owner_decision === 'Close' ? '1px solid #e2e8f0' : '1px solid #9ae6b4',
                                                                padding: '4px 8px',
                                                                borderRadius: '4px',
                                                                cursor: row.business_owner_decision === 'Close' ? 'not-allowed' : 'pointer',
                                                                fontSize: '10px',
                                                                fontWeight: '600'
                                                            }}
                                                        >
                                                            Upload
                                                        </button>
                                                        <input id={`feedback-file-${row.id}`} type="file" style={{ display: 'none' }} disabled={row.business_owner_decision === 'Close'} onChange={(e) => handleFeedbackFileUpload(row.id, e)} />
                                                    </div>

                                                    {/* Column 4: Doc Name (Main Row) */}
                                                    <div style={{
                                                        borderBottom: row.subRows?.length > 0 ? '1px solid #ddd' : cellBorderBottom,
                                                        borderRight: '1px solid #ddd',
                                                        padding: '8px 5px',
                                                        fontSize: '11px',
                                                        color: row.business_owner_decision === 'Close' ? '#718096' : 'black',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        overflow: 'hidden',
                                                        backgroundColor: row.business_owner_decision === 'Close' ? '#f5f5f5' : 'white'
                                                    }}>
                                                        {row.fileName ? (
                                                            <a href={getFileViewUrl(row.fileUrl, row.fileName)} target="_blank" rel="noopener noreferrer" style={{ color: '#3182ce', textDecoration: 'none', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', pointerEvents: 'auto' }} title={row.fileName}>
                                                                {row.fileName}
                                                            </a>
                                                        ) : (
                                                            <span style={{ color: '#999' }}>No doc</span>
                                                        )}
                                                    </div>

                                                    {/* Column 5: Action (Main Row) */}
                                                    <div style={{
                                                        borderBottom: row.subRows?.length > 0 ? '1px solid #ddd' : cellBorderBottom,
                                                        borderRight: '1px solid #ddd',
                                                        padding: '8px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        backgroundColor: row.business_owner_decision === 'Close' ? '#f5f5f5' : 'white',
                                                        borderBottomRightRadius: (isLast && !resp && (!row.subRows || row.subRows.length === 0)) ? '4px' : '0'
                                                    }}>
                                                        {!row.feedback_business_owner_id && row.business_owner_decision !== 'Close' && (
                                                            <Trash2
                                                                size={16}
                                                                color="#e53e3e"
                                                                style={{ cursor: 'pointer' }}
                                                                onClick={() => handleRemoveRow(row.id)}
                                                                title="Clear"
                                                            />
                                                        )}
                                                    </div>

                                                    {/* Column 6: Decision */}
                                                    <div style={{
                                                        borderBottom: row.subRows?.length > 0 ? '1px solid #ddd' : cellBorderBottom,
                                                        borderRight: '1px solid #ddd',
                                                        padding: '8px 5px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        backgroundColor: row.business_owner_decision === 'Close' ? '#f5f5f5' : (resp ? '#f9fafb' : 'white'),
                                                        borderBottomRightRadius: (isLast && !row.subRows?.length) ? '4px' : '0'
                                                    }}>
                                                        <select
                                                            value={row.business_owner_decision || 'Open'}
                                                            onChange={(e) => handleRowChange(row.id, 'business_owner_decision', e.target.value)}
                                                            style={{
                                                                width: '100%',
                                                                height: '32px',
                                                                fontSize: '12px',
                                                                borderRadius: '6px',
                                                                border: '1px solid #cbd5e1',
                                                                outline: 'none',
                                                                backgroundColor: '#ffffff',
                                                                color: '#334155',
                                                                cursor: 'pointer',
                                                                padding: '0 8px',
                                                                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                                                            }}
                                                        >
                                                            <option value="Open">Open</option>
                                                            <option value="Close">Close</option>
                                                        </select>
                                                    </div>

                                                    {/* Render Sub Rows */}
                                                    {row.subRows?.map((subRow, sIdx) => {
                                                        const subResp = subRow.response;
                                                        const isLastSubRow = sIdx === row.subRows.length - 1;
                                                        const subCellBorderBottom = isLastSubRow ? cellBorderBottom : '1px solid #ddd';

                                                        return (
                                                            <React.Fragment key={subRow.id}>
                                                                {/* Column 2: Sub Text */}
                                                                <div style={{ borderBottom: subCellBorderBottom, borderRight: '1px solid #ddd', padding: '5px', position: 'relative', backgroundColor: subRow.business_owner_decision === 'Close' ? '#f5f5f5' : 'white' }}>
                                                                    <textarea
                                                                        value={subRow.text}
                                                                        onChange={(e) => handleSubRowChange(row.id, subRow.id, 'text', e.target.value)}
                                                                        disabled={subRow.business_owner_decision === 'Close'}
                                                                        style={{
                                                                            width: '100%',
                                                                            border: 'none',
                                                                            outline: 'none',
                                                                            resize: subRow.business_owner_decision === 'Close' ? 'none' : 'vertical',
                                                                            minHeight: '30px',
                                                                            fontSize: '13px',
                                                                            fontFamily: 'Arial, sans-serif',
                                                                            padding: '5px',
                                                                            paddingBottom: '15px',
                                                                            backgroundColor: subRow.business_owner_decision === 'Close' ? '#f5f5f5' : '#fffdee',
                                                                            color: subRow.business_owner_decision === 'Close' ? '#718096' : 'inherit',
                                                                            cursor: subRow.business_owner_decision === 'Close' ? 'not-allowed' : 'text'
                                                                        }}
                                                                        placeholder="Enter sub-feedback..."
                                                                    />
                                                                    {subRow.feedback_business_owner_id && subRow.business_owner_decision !== 'Close' && (
                                                                        <button
                                                                            onClick={() => handleAddSubRow(row.id)}
                                                                            style={{
                                                                                position: 'absolute',
                                                                                right: '25px',
                                                                                bottom: '5px',
                                                                                background: 'none',
                                                                                border: 'none',
                                                                                padding: '0',
                                                                                cursor: 'pointer',
                                                                                color: '#3182ce',
                                                                                display: 'flex',
                                                                                alignItems: 'center'
                                                                            }}
                                                                            title="Add detail"
                                                                        >
                                                                            <Plus size={16} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                {/* Column 3: Sub Upload */}
                                                                <div style={{
                                                                    borderBottom: subCellBorderBottom,
                                                                    borderRight: '1px solid #ddd',
                                                                    padding: '8px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    backgroundColor: subRow.business_owner_decision === 'Close' ? '#f5f5f5' : 'white'
                                                                }}>
                                                                    <button
                                                                        onClick={() => document.getElementById(`sub-file-${subRow.id}`).click()}
                                                                        disabled={subRow.business_owner_decision === 'Close'}
                                                                        style={{
                                                                            backgroundColor: subRow.business_owner_decision === 'Close' ? '#edf2f7' : '#fff5f5',
                                                                            color: subRow.business_owner_decision === 'Close' ? '#a0aec0' : '#c53030',
                                                                            border: subRow.business_owner_decision === 'Close' ? '1px solid #e2e8f0' : '1px solid #feb2b2',
                                                                            padding: '4px 8px',
                                                                            borderRadius: '4px',
                                                                            cursor: subRow.business_owner_decision === 'Close' ? 'not-allowed' : 'pointer',
                                                                            fontSize: '10px',
                                                                            fontWeight: '600'
                                                                        }}
                                                                    >
                                                                        Upload
                                                                    </button>
                                                                    <input id={`sub-file-${subRow.id}`} type="file" style={{ display: 'none' }} disabled={subRow.business_owner_decision === 'Close'} onChange={(e) => handleSubRowFileUpload(row.id, subRow.id, e)} />
                                                                </div>
                                                                {/* Column 4: Sub Doc Name */}
                                                                <div style={{ borderBottom: subCellBorderBottom, borderRight: '1px solid #ddd', padding: '8px 5px', fontSize: '11px', color: subRow.business_owner_decision === 'Close' ? '#718096' : 'black', display: 'flex', alignItems: 'center', overflow: 'hidden', backgroundColor: subRow.business_owner_decision === 'Close' ? '#f5f5f5' : 'white' }}>
                                                                    {subRow.fileName ? (
                                                                        <a href={getFileViewUrl(subRow.fileUrl, subRow.fileName)} target="_blank" rel="noopener noreferrer" style={{ color: '#3182ce', textDecoration: 'none', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', pointerEvents: 'auto' }} title={subRow.fileName}>
                                                                            {subRow.fileName}
                                                                        </a>
                                                                    ) : (
                                                                        <span style={{ color: '#999' }}>No doc</span>
                                                                    )}
                                                                </div>
                                                                {/* Column 5: Sub Action */}
                                                                <div style={{ borderBottom: subCellBorderBottom, borderRight: '1px solid #ddd', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: subRow.business_owner_decision === 'Close' ? '#f5f5f5' : 'white' }}>
                                                                    {!subRow.feedback_business_owner_id && subRow.business_owner_decision !== 'Close' && (
                                                                        <Trash2
                                                                            size={14}
                                                                            color="#e53e3e"
                                                                            style={{ cursor: 'pointer' }}
                                                                            onClick={() => handleRemoveSubRow(row.id, subRow.id)}
                                                                            title="Clear"
                                                                        />
                                                                    )}
                                                                </div>
                                                                {/* Column 6: Sub Decision */}
                                                                <div style={{
                                                                    borderBottom: subCellBorderBottom,
                                                                    borderRight: '1px solid #ddd',
                                                                    padding: '8px 5px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    backgroundColor: subRow.business_owner_decision === 'Close' ? '#f5f5f5' : (subResp ? '#f9fafb' : 'white'),
                                                                    borderBottomRightRadius: isLastSubRow && isLast ? '4px' : '0'
                                                                }}>
                                                                    <select
                                                                        value={subRow.business_owner_decision || 'Open'}
                                                                        onChange={(e) => handleSubRowChange(row.id, subRow.id, 'business_owner_decision', e.target.value)}
                                                                        style={{
                                                                            width: '100%',
                                                                            height: '30px',
                                                                            fontSize: '12px',
                                                                            borderRadius: '6px',
                                                                            border: '1px solid #cbd5e1',
                                                                            outline: 'none',
                                                                            backgroundColor: '#ffffff',
                                                                            color: '#334155',
                                                                            cursor: 'pointer',
                                                                            padding: '0 8px',
                                                                            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                                                                        }}
                                                                    >
                                                                        <option value="Open">Open</option>
                                                                        <option value="Close">Close</option>
                                                                    </select>
                                                                </div>
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                </React.Fragment>
                                            );
                                        }); // closes rowsToRender.map
                                    })}
                                    {/* Add Row Button */}
                                    {/* <div style={{ gridColumnStart: 1, gridColumnEnd: 3 }}></div>
                                <div style={{ gridColumn: '3', display: 'flex', justifyContent: 'center', padding: '15px 0' }}>
                                    <button
                                        onClick={handleAddRow}
                                        style={{
                                            backgroundColor: '#c6f6d5',
                                            color: '#22543d',
                                            border: '1px solid #9ae6b4',
                                            padding: '6px 15px',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '11px',
                                            fontWeight: '600',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        + Add Row
                                    </button>
                                </div> */}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '15px', marginTop: '0px', paddingBottom: '30px', paddingRight: '15px' }}>
                                <div style={{ display: 'flex', gap: '15px', marginRight: '15px' }}>
                                    <button
                                        onClick={() => showConfirmation(
                                            "Are you sure you want to submit your feedback? Please ensure you have reviewed the 'Document Approve' section for all items before continuing.",
                                            handleSubmitDocument
                                        )}
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
                                            whiteSpace: 'nowrap',
                                            opacity: loading ? 0.7 : 1,
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => { if (!loading) e.target.style.backgroundColor = '#9ae6b4'; }}
                                        onMouseLeave={(e) => { if (!loading) e.target.style.backgroundColor = '#c6f6d5'; }}
                                    >
                                        {loading ? 'Submitting...' : 'Submit Feedback'}
                                    </button>

                                    <button
                                        onClick={() => showConfirmation(
                                            "Are you sure you want to approve this document? This will finalize all decisions and lock the record.",
                                            handleApproveDocument
                                        )}
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
                                            whiteSpace: 'nowrap',
                                            opacity: loading ? 0.7 : 1,
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => { if (!loading) e.target.style.backgroundColor = '#9ae6b4'; }}
                                        onMouseLeave={(e) => { if (!loading) e.target.style.backgroundColor = '#c6f6d5'; }}
                                    >
                                        {loading ? 'Approving...' : 'Approve Document'}
                                    </button>
                                </div>
                            </div>
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
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .thin-scroll::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }
                .thin-scroll::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 10px;
                }
                .thin-scroll::-webkit-scrollbar-thumb {
                    background: #CCCCCC;
                    border-radius: 10px;
                }
                .thin-scroll::-webkit-scrollbar-thumb:hover {
                    background: #b1b1b1;
                }
                .thin-scroll {
                    scrollbar-width: thin;
                    scrollbar-color: #CCCCCC #f1f1f1;
                }
            `}</style>

            {loading && (
                <div style={{
                    position: 'fixed',
                    top: '0',
                    left: '0',
                    right: '0',
                    bottom: '0',
                    backgroundColor: 'rgba(255, 255, 255, 0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 15000
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
                .help-modal-scroll::-webkit-scrollbar { width: 4px; }
                .help-modal-scroll::-webkit-scrollbar-track { background: transparent; margin: 8px 0; }
                .help-modal-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                .help-modal-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}</style>
        </React.Fragment>
    );
};

export default PublicSI_FT_TechnicalOwnerFeedback;
