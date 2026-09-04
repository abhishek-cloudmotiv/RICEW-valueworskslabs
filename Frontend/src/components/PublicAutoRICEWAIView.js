import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Trash2, Plus, HelpCircle, X } from 'lucide-react';
import DOMPurify from 'dompurify';

const API_BASE_URL = 'https://cf9ioid4b1.execute-api.ap-south-1.amazonaws.com/New';

const PublicAutoRICEWAIView = () => {
    const { id } = useParams(); // Auto_RICEW_AI_id
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const projectIdFromUrl = queryParams.get('Project_id');
    const [workData, setWorkData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [projectName, setProjectName] = useState('');

    // Feedback Form State
    const [ownerName, setOwnerName] = useState('');
    const [ownerEmail, setOwnerEmail] = useState('');
    const [ricewStatus, setRicewStatus] = useState('');
    const [feedbackRows, setFeedbackRows] = useState([
        { id: Date.now(), text: '', fileName: '', fileUrl: '', feedback_business_owner_id: '', business_owner_decision: 'Open', subRows: [] }
    ]);

    // Toast Message States
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const [docApprovalStatus, setDocApprovalStatus] = useState({});

    const handleDocAction = async (workId, assignWorkId, fileName, fileUrl, action, fileType) => {
        if (!workId || !fileName || !fileType) {
            console.error("Missing ID, file name, or file type for approval action");
            return;
        }

        try {
            const sanitizedFileName = DOMPurify.sanitize(fileName, { ALLOWED_TAGS: [] });
            const isApproved = action === 'Approved' ? 'true' : 'false';
            const payload = {
                Auto_RICEW_AI_id: workId,
                File_Name: sanitizedFileName,
                document_approved: isApproved,
                file_type: fileType,
                updated_by: 'public_user'
            };

            const response = await fetch(`${API_BASE_URL}/ricew/autoRICEWAI/approveRejectDocument`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                setDocApprovalStatus(prev => ({ ...prev, [fileUrl]: action }));
                setSuccessMessage(`Document ${sanitizedFileName} ${action === 'Approved' ? 'approved' : 'rejected'} successfully.`);
                setShowSuccessMessage(true);
                setTimeout(() => setShowSuccessMessage(false), 4000);
            } else {
                const resText = await response.text();
                console.error('Failed to update status:', resText);
            }
        } catch (error) {
            console.error('API call error:', error);
        }
    };

    const isClosed = (val) => {
        if (!val) return false;
        const lower = String(val).toLowerCase();
        return lower === 'close' || lower === 'closed';
    };

    // Confirmation Dialog States
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [confirmMessage, setConfirmMessage] = useState('');
    const [pendingDecisionChange, setPendingDecisionChange] = useState(null);
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

    const formatToDDMMMYYYY = (dateStr) => {
        if (!dateStr || dateStr === '-') return '-';
        try {
            let cleaned = dateStr.replace(/[-_]/g, '/').replace(',', '');
            const datePart = cleaned.split(/[\sT]/)[0];
            if (!datePart) return dateStr;

            const parts = datePart.split('/');
            if (parts.length < 3) return dateStr;

            let d, m, y;
            if (parts[0].length === 4) {
                y = parseInt(parts[0]);
                m = parseInt(parts[1]);
                d = parseInt(parts[2]);
            } else {
                d = parseInt(parts[0]);
                m = parseInt(parts[1]);
                y = parseInt(parts[2]);
            }

            if (isNaN(d) || isNaN(m) || isNaN(y)) return dateStr;

            const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
            if (m < 1 || m > 12) return dateStr;

            return `${d.toString().padStart(2, '0')}-${monthNames[m - 1]}-${y}`;
        } catch (e) {
            return dateStr;
        }
    };

    const fetchData = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const headers = { 'Content-Type': 'application/json' };

            const url = projectIdFromUrl
                ? `${API_BASE_URL}/ricew/autoRICEWAI/getById?Auto_RICEW_AI_id=${encodeURIComponent(id)}&Project_id=${encodeURIComponent(projectIdFromUrl)}`
                : `${API_BASE_URL}/ricew/autoRICEWAI/getById?Auto_RICEW_AI_id=${encodeURIComponent(id)}`;

            // Fetch the Auto RICEW AI record by ID (no auth header — public access)
            const response = await fetch(url, { headers });

            let record = null;

            if (response.ok) {
                const result = await response.json();
                record = result.data || result;
            }

            // ===== PREVIEW FALLBACK: Show sample data when API is unavailable =====
            // TODO: Remove this fallback once the getById backend endpoint is deployed
            if (!record || (!record.Auto_RICEW_AI_id && !record.RICEW_Name)) {
                console.warn('[Preview Mode] API unavailable — loading sample data for UI preview.');
                record = {
                    Auto_RICEW_AI_id: id,
                    Project_id: projectIdFromUrl || '26-001-02',
                    RICEW_Name: 'Sample RICEW Object',
                    RICEW_Type: 'Report',
                    RICEW_Status: 'AI Files Built',
                    Client_Roster_Name: 'Eshan',
                    Client_Roster_Email: 'ryash9807@gmail.com',
                    Client_Roster_Form_id: 'CR-001',
                    AI_build: 'true',
                    assign_object_date: '2026-04-29',
                    Start_Object: '2026-04-29',
                    End_Date: '2026-04-30',
                    comment_section: '',
                    requirement_files: [
                        { file_name: 'Business_Requirements_v1.pdf', file_url: '' },
                        { file_name: 'Data_Mapping_Spec.xlsx', file_url: '' }
                    ],
                    AI_Generated_File: [{
                        approved_document_fs: 'false',
                        fs_file_name: 'FS_Sample_RICEW_Object.docx',
                        fs_url: '',
                        approved_document_ts: 'false',
                        ts_file_name: 'TS_Sample_RICEW_Object.docx',
                        ts_url: '',
                        approved_document_code: 'false',
                        code_file_name: 'Sample_RICEW_Object.sql',
                        code_url: '',
                        approved_document_test_case: 'false',
                        test_case_file_name: 'Test_Sample_RICEW_Object.docx',
                        test_case_url: ''
                    }]
                };
                setProjectName('Monday DEMO');
            }
            // ===== END PREVIEW FALLBACK =====

            // Build upload files array from AI_Generated_File
            let uploadFiles = [];
            if (record.AI_Generated_File && record.AI_Generated_File.length > 0) {
                const latest = record.AI_Generated_File[record.AI_Generated_File.length - 1];
                const genFiles = [
                    { url: latest.fs_url, File_Name: latest.fs_file_name, document_approved: latest.approved_document_fs, type: 'FS' },
                    { url: latest.ts_url, File_Name: latest.ts_file_name, document_approved: latest.approved_document_ts, type: 'TS' },
                    { url: latest.code_url, File_Name: latest.code_file_name, document_approved: latest.approved_document_code, type: 'Code' },
                    { url: latest.test_case_url, File_Name: latest.test_case_file_name, document_approved: latest.approved_document_test_case, type: 'Test' }
                ];
                uploadFiles = genFiles.filter(f => f.File_Name).map(f => ({
                    url: DOMPurify.sanitize(f.url || '', { ALLOWED_TAGS: [] }),
                    File_Name: DOMPurify.sanitize(f.File_Name || '', { ALLOWED_TAGS: [] }),
                    document_approved: f.document_approved || '',
                    isAI: true
                }));
            }

            const hasUploadedFile = uploadFiles.length > 0;
            const hasEndDate = record.End_Date && record.End_Date !== '-' && record.End_Date.trim() !== '';

            const mappedRow = {
                Auto_RICEW_AI_id: record.Auto_RICEW_AI_id,
                Project_id: record.Project_id,
                ricewObject: DOMPurify.sanitize(record.RICEW_Name || '-', { ALLOWED_TAGS: [] }),
                RICEW_Type: record.RICEW_Type || '-',
                assignedDate: formatToDDMMMYYYY(record.assign_object_date || record.created_timestamp || ''),
                startObject: formatToDDMMMYYYY(record.Start_Object || ''),
                uploadFiles: uploadFiles,
                requirementFiles: (record.requirement_files || []).map(f => ({
                    file_name: DOMPurify.sanitize(f.file_name || '', { ALLOWED_TAGS: [] }),
                    file_url: DOMPurify.sanitize(f.file_url || '', { ALLOWED_TAGS: [] })
                })),
                isStarted: true,
                isUploaded: hasUploadedFile,
                Initiate_Work_id: record.Auto_RICEW_AI_id || '',
                approve_reject_Decision: record.approve_reject_Decision || ''
            };

            setWorkData([mappedRow]);
            setOwnerName(DOMPurify.sanitize(record.Client_Roster_Name || '', { ALLOWED_TAGS: [] }));
            setOwnerEmail(DOMPurify.sanitize(record.Client_Roster_Email || '', { ALLOWED_TAGS: [] }));
            setRicewStatus(DOMPurify.sanitize(record.RICEW_Status || '', { ALLOWED_TAGS: [] }));

            // Fetch project name if not set yet
            const effectiveProjectId = record.Project_id || projectIdFromUrl;
            if (!projectName && effectiveProjectId) {
                try {
                    const projResp = await fetch(
                        `https://3oi9y6i52k.execute-api.ap-south-1.amazonaws.com/New/publicView/ricew/rice-project-definition/getProjectData?Project_ID=${encodeURIComponent(effectiveProjectId)}`,
                        { headers }
                    );
                    const projResult = await projResp.json();
                    if (projResult.success && projResult.data && projResult.data.length > 0) {
                        setProjectName(DOMPurify.sanitize(projResult.data[0].Project_Name || '', { ALLOWED_TAGS: [] }));
                    }
                } catch (e) {
                    console.error("Error fetching project details:", e);
                }
            }
        } catch (error) {
            console.error("Error fetching work data:", error);
            alert(`Error connecting to backend API: ${error.message}. Is node server.js running?`);
            setWorkData([]);
        } finally {
            setLoading(false);
        }
    }, [id, projectName, projectIdFromUrl]);

    const getFileViewUrl = (url, fileName) => {
        if (!url || url === '-' || url === '') return url;
        let finalUrl = url;
        if (!url.startsWith('http')) {
            finalUrl = `https://d1z1oiez6i3mzi.cloudfront.net/${url.startsWith('/') ? url.slice(1) : url}`;
        }
        const extension = (fileName || finalUrl.split('?')[0]).split('.').pop().toLowerCase();
        if (['xlsx', 'xls', 'csv', 'docx', 'doc'].includes(extension)) {
            return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(finalUrl)}`;
        }
        return finalUrl;
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

    const handleAddRow = () => {
        setFeedbackRows([
            ...feedbackRows,
            { id: Date.now(), text: '', fileName: '', fileUrl: '', feedback_business_owner_id: '', business_owner_decision: 'Open', subRows: [] }
        ]);
    };

    const handleRemoveRow = (rowId) => {
        setFeedbackRows(prev => {
            const row = prev.find(r => r.id === rowId);
            if (row && !row.feedback_business_owner_id) {
                return prev.filter(r => r.id !== rowId);
            }
            return prev.map(r => r.id === rowId ? { ...r, text: '', fileName: '', fileUrl: '#', fileObj: undefined } : r);
        });
    };

    const handleRowChange = (rowId, field, value) => {
        if (field === 'business_owner_decision') {
            const currentRow = feedbackRows.find(r => r.id === rowId);
            if (currentRow.business_owner_decision !== value) {
                showConfirmation(
                    `Are you sure you want to change the decision to "${value}"?`,
                    () => {
                        setFeedbackRows(prev => prev.map(row =>
                            row.id === rowId ? { ...row, [field]: value } : row
                        ));
                        
                        if (currentRow.feedback_business_owner_id) {
                            const projectId = workData[0]?.Project_id || projectIdFromUrl;
                            fetch(`${API_BASE_URL}/ricew/autoRICEWAI/updateFeedbackDecision`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    Auto_RICEW_AI_Feedback_Form_id: currentRow.feedback_business_owner_id,
                                    Project_id: projectId,
                                    Decision_feedback: value,
                                    updated_by: ownerEmail || 'public_user'
                                })
                            }).catch(e => console.error('Failed to update decision instantly:', e));
                        }
                    }
                );
                return;
            }
        }
        setFeedbackRows(prev => prev.map(row =>
            row.id === rowId ? { ...row, [field]: value } : row
        ));
    };

    const handleFeedbackFileUpload = (rowId, e) => {
        const file = e.target.files[0];
        if (file) {
            setFeedbackRows(prev => prev.map(row =>
                row.id === rowId ? { ...row, fileName: file.name, fileUrl: '#', fileObj: file } : row
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
            const subRowToRemove = row.subRows.find(sr => sr.id === subRowId);
            if (subRowToRemove && !subRowToRemove.feedback_business_owner_id) {
                return { ...row, subRows: row.subRows.filter(sr => sr.id !== subRowId) };
            }
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
                    () => {
                        setFeedbackRows(prev => prev.map(row =>
                            row.id === parentId
                                ? { ...row, subRows: row.subRows.map(sr => sr.id === subRowId ? { ...sr, [field]: value } : sr) }
                                : row
                        ));
                        
                        if (currentSubRow.feedback_business_owner_id) {
                            const projectId = workData[0]?.Project_id || projectIdFromUrl;
                            fetch(`${API_BASE_URL}/ricew/autoRICEWAI/updateFeedbackDecision`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    Auto_RICEW_AI_Feedback_Form_id: currentSubRow.feedback_business_owner_id,
                                    Project_id: projectId,
                                    Decision_feedback: value,
                                    updated_by: ownerEmail || 'public_user'
                                })
                            }).catch(e => console.error('Failed to update sub-row decision instantly:', e));
                        }
                    }
                );
                return;
            }
        }
        setFeedbackRows(prev => prev.map(row =>
            row.id === parentId
                ? { ...row, subRows: row.subRows.map(sr => sr.id === subRowId ? { ...sr, [field]: value } : sr) }
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
        setLoading(true);
        try {
            const currentWork = workData[0];
            const projectId = currentWork.Project_id || projectIdFromUrl;

            for (const row of feedbackRows) {
                // Skip rows with no text and no file
                if (!row.text && !row.fileObj) continue;

                let uploadFileName = '';
                let uploadFileUrl = '';

                // Upload file via presigned URL if a file was selected
                if (row.fileObj) {
                    try {
                        const presignedResp = await fetch(`${API_BASE_URL}/generate_presigned_urls/auto-ricew-ai-feedback-document`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                project_id: projectId,
                                Auto_RICEW_AI_id: currentWork.Auto_RICEW_AI_id,
                                documents: [{ name: row.fileObj.name, type: row.fileObj.type }]
                            })
                        });
                        const presignedResult = await presignedResp.json();
                        if (presignedResult.success && presignedResult.urls?.length > 0) {
                            const urlData = presignedResult.urls[0];
                            // Upload file to S3 using presigned URL
                            await fetch(urlData.signedUrl, {
                                method: 'PUT',
                                headers: { 'Content-Type': row.fileObj.type },
                                body: row.fileObj
                            });
                            uploadFileName = urlData.fileName;
                            uploadFileUrl = urlData.publicCloudFrontUrl;
                        }
                    } catch (uploadErr) {
                        console.error('File upload error:', uploadErr);
                        alert(`Failed to upload ${row.fileObj.name}. It might be a CORS issue with S3. Error: ${uploadErr.message}`);
                        setLoading(false);
                        return; // Stop submission if upload fails
                    }
                }

                // Call Create or Update API for main row
                const endpoint = row.feedback_business_owner_id ? 'updateFeedback' : 'createFeedback';
                const payload = {
                    Auto_RICEW_AI_id: currentWork.Auto_RICEW_AI_id,
                    Project_id: projectId,
                    feedback_Text: row.text || '',
                    Decision_feedback: row.business_owner_decision || 'Open',
                    [row.feedback_business_owner_id ? 'updated_by' : 'created_by']: ownerEmail || 'public_user'
                };
                if (row.feedback_business_owner_id) {
                    payload.Auto_RICEW_AI_Feedback_Form_id = row.feedback_business_owner_id;
                }
                if (uploadFileName) {
                    payload.Upload_file_name = uploadFileName;
                    payload.Upload_file_url = uploadFileUrl;
                }

                const response = await fetch(`${API_BASE_URL}/ricew/autoRICEWAI/${endpoint}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    throw new Error(`Main feedback API failed: ${response.statusText} (${response.status})`);
                }

                // Handle sub-rows
                for (const subRow of (row.subRows || [])) {
                    if (!subRow.text && !subRow.fileObj) continue;

                    let subUploadFileName = '';
                    let subUploadFileUrl = '';

                    if (subRow.fileObj) {
                        try {
                            const subPresignedResp = await fetch(`${API_BASE_URL}/generate_presigned_urls/auto-ricew-ai-feedback-document`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    project_id: projectId,
                                    Auto_RICEW_AI_id: currentWork.Auto_RICEW_AI_id,
                                    documents: [{ name: subRow.fileObj.name, type: subRow.fileObj.type }]
                                })
                            });
                            const subPresignedResult = await subPresignedResp.json();
                            if (subPresignedResult.success && subPresignedResult.urls?.length > 0) {
                                const subUrlData = subPresignedResult.urls[0];
                                await fetch(subUrlData.signedUrl, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': subRow.fileObj.type },
                                    body: subRow.fileObj
                                });
                                subUploadFileName = subUrlData.fileName;
                                subUploadFileUrl = subUrlData.publicCloudFrontUrl;
                            }
                        } catch (subUploadErr) {
                            console.error('Sub-file upload error:', subUploadErr);
                            alert(`Failed to upload sub-row file ${subRow.fileObj.name}. Error: ${subUploadErr.message}`);
                            setLoading(false);
                            return; // Stop submission if upload fails
                        }
                    }

                    const subEndpoint = subRow.feedback_business_owner_id ? 'updateFeedback' : 'createFeedback';
                    const subPayload = {
                        Auto_RICEW_AI_id: currentWork.Auto_RICEW_AI_id,
                        Project_id: projectId,
                        feedback_Text: subRow.text || '',
                        Decision_feedback: subRow.business_owner_decision || 'Open',
                        [subRow.feedback_business_owner_id ? 'updated_by' : 'created_by']: ownerEmail || 'public_user'
                    };
                    if (subRow.feedback_business_owner_id) {
                        subPayload.Auto_RICEW_AI_Feedback_Form_id = subRow.feedback_business_owner_id;
                    }
                    if (subUploadFileName) {
                        subPayload.Upload_file_name = subUploadFileName;
                        subPayload.Upload_file_url = subUploadFileUrl;
                    }

                    const subResponse = await fetch(`${API_BASE_URL}/ricew/autoRICEWAI/${subEndpoint}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(subPayload)
                    });

                    if (!subResponse.ok) {
                        throw new Error(`Sub-row feedback API failed: ${subResponse.statusText} (${subResponse.status})`);
                    }
                }
            }

            // Reload feedback after submission with a delay to allow DynamoDB GSI to sync
            setTimeout(async () => {
                await fetchFeedback();
            }, 1500);
            setSuccessMessage("Feedback submitted successfully!");
            setShowSuccessMessage(true);
            setTimeout(() => { setShowSuccessMessage(false); setSuccessMessage(''); }, 3000);
        } catch (error) {
            console.error('Error submitting feedback:', error);
            alert('Failed to submit feedback. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleApproveDocument = async () => {
        if (workData.length === 0) {
            alert('No work data found to approve.');
            return;
        }
        setLoading(true);
        try {
            const currentWork = workData[0];
            const projectId = currentWork.Project_id || projectIdFromUrl;

            // Submit any unsaved feedback or files first
            for (const row of feedbackRows) {
                // If it has text or a fileObj, and either hasn't been saved or has new text/file, upload and create/update it
                if ((row.text || row.fileObj) && !row.feedback_business_owner_id) {
                    let uploadFileName = '';
                    let uploadFileUrl = '';

                    if (row.fileObj) {
                        try {
                            const presignedResp = await fetch(`${API_BASE_URL}/generate_presigned_urls/auto-ricew-ai-feedback-document`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    project_id: projectId,
                                    Auto_RICEW_AI_id: currentWork.Auto_RICEW_AI_id,
                                    documents: [{ name: row.fileObj.name, type: row.fileObj.type }]
                                })
                            });
                            const presignedResult = await presignedResp.json();
                            if (presignedResult.success && presignedResult.urls?.length > 0) {
                                const urlData = presignedResult.urls[0];
                                await fetch(urlData.signedUrl, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': row.fileObj.type },
                                    body: row.fileObj
                                });
                                uploadFileName = urlData.fileName;
                                uploadFileUrl = urlData.publicCloudFrontUrl;
                            }
                        } catch (uploadErr) {
                            console.error('File upload error during approval feedback save:', uploadErr);
                        }
                    }

                    try {
                        const payload = {
                            Auto_RICEW_AI_id: currentWork.Auto_RICEW_AI_id,
                            Project_id: projectId,
                            feedback_Text: row.text || '',
                            Decision_feedback: 'Close', // Set directly to Close on approval
                            created_by: ownerEmail || 'public_user'
                        };
                        if (uploadFileName) {
                            payload.Upload_file_name = uploadFileName;
                            payload.Upload_file_url = uploadFileUrl;
                        }
                        const response = await fetch(`${API_BASE_URL}/ricew/autoRICEWAI/createFeedback`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        });
                        if (response.ok) {
                            const resData = await response.json();
                            row.feedback_business_owner_id = resData.data?.Auto_RICEW_AI_Feedback_Form_id || resData.Auto_RICEW_AI_Feedback_Form_id || '';
                        }
                    } catch (err) {
                        console.error('Failed to create new feedback during approval:', err);
                    }
                }

                // Handle sub-rows for this feedback row
                for (const subRow of (row.subRows || [])) {
                    if ((subRow.text || subRow.fileObj) && !subRow.feedback_business_owner_id) {
                        let subUploadFileName = '';
                        let subUploadFileUrl = '';

                        if (subRow.fileObj) {
                            try {
                                const subPresignedResp = await fetch(`${API_BASE_URL}/generate_presigned_urls/auto-ricew-ai-feedback-document`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        project_id: projectId,
                                        Auto_RICEW_AI_id: currentWork.Auto_RICEW_AI_id,
                                        documents: [{ name: subRow.fileObj.name, type: subRow.fileObj.type }]
                                    })
                                });
                                const subPresignedResult = await subPresignedResp.json();
                                if (subPresignedResult.success && subPresignedResult.urls?.length > 0) {
                                    const subUrlData = subPresignedResult.urls[0];
                                    await fetch(subUrlData.signedUrl, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': subRow.fileObj.type },
                                        body: subRow.fileObj
                                    });
                                    subUploadFileName = subUrlData.fileName;
                                    subUploadFileUrl = subUrlData.publicCloudFrontUrl;
                                }
                            } catch (subUploadErr) {
                                console.error('Sub-file upload error during approval feedback save:', subUploadErr);
                            }
                        }

                        try {
                            const subPayload = {
                                Auto_RICEW_AI_id: currentWork.Auto_RICEW_AI_id,
                                Project_id: projectId,
                                feedback_Text: subRow.text || '',
                                Decision_feedback: 'Close', // Set directly to Close on approval
                                created_by: ownerEmail || 'public_user'
                            };
                            if (subUploadFileName) {
                                subPayload.Upload_file_name = subUploadFileName;
                                subPayload.Upload_file_url = subUploadFileUrl;
                            }
                            const response = await fetch(`${API_BASE_URL}/ricew/autoRICEWAI/createFeedback`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(subPayload)
                            });
                            if (response.ok) {
                                const resData = await response.json();
                                subRow.feedback_business_owner_id = resData.data?.Auto_RICEW_AI_Feedback_Form_id || resData.Auto_RICEW_AI_Feedback_Form_id || '';
                            }
                        } catch (err) {
                            console.error('Failed to create new sub-row feedback during approval:', err);
                        }
                    }
                }
            }

            // Update decision to 'Close' for all feedback rows that have been saved
            for (const row of feedbackRows) {
                if (row.feedback_business_owner_id) {
                    const response = await fetch(`${API_BASE_URL}/ricew/autoRICEWAI/updateFeedbackDecision`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            Auto_RICEW_AI_Feedback_Form_id: row.feedback_business_owner_id,
                            Project_id: projectId,
                            Decision_feedback: 'Close', // Automatically set to Close
                            updated_by: ownerEmail || 'public_user'
                        })
                    });

                    if (!response.ok) {
                        console.error(`Failed to update decision for row ${row.id}`);
                    }
                }
            }

            // Send email notification and update AI_approved status
            try {
                const filesGenerated = currentWork.uploadFiles?.map(f => f.File_Name).filter(Boolean).join(', ') || '';
                const emailPayload = {
                    toEmail: ownerEmail || 'public_user',
                    clientName: ownerName || 'N/A',
                    projectName: projectName || projectId,
                    ricewName: currentWork.ricewObject || '',
                    ricewType: currentWork.RICEW_Type || '',
                    filesGenerated: filesGenerated,
                    Auto_RICEW_AI_id: currentWork.Auto_RICEW_AI_id
                };

                const emailResp = await fetch(`${API_BASE_URL}/email-Send/auto-ricew-ai-files-approved`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(emailPayload)
                });

                if (!emailResp.ok) {
                    console.error('Failed to send approval email notification', emailResp.status);
                }
            } catch (emailErr) {
                console.error('Error sending approval email:', emailErr);
            }

            // Update local state instantly for better UX
            setFeedbackRows(prev => prev.map(row => ({
                ...row,
                business_owner_decision: row.feedback_business_owner_id ? 'Close' : row.business_owner_decision
            })));

            // Delay fetching to allow GSI to sync
            setTimeout(async () => {
                await fetchFeedback();
            }, 1500);

            setSuccessMessage('Document approved successfully! All related feedback is now closed.');
            setShowSuccessMessage(true);
            setTimeout(() => { setShowSuccessMessage(false); setSuccessMessage(''); }, 3000);
        } catch (error) {
            console.error('Error approving document:', error);
            alert('Failed to approve document. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const fetchFeedback = useCallback(async () => {
        if (!id) return;
        try {
            const currentWork = workData.length > 0 ? workData[0] : null;
            const projectId = currentWork?.Project_id || projectIdFromUrl;
            if (!projectId) return;

            const response = await fetch(
                `${API_BASE_URL}/ricew/autoRICEWAI/getFeedback?Auto_RICEW_AI_id=${encodeURIComponent(id)}&Project_id=${encodeURIComponent(projectId)}`,
                { headers: { 'Content-Type': 'application/json' } }
            );

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data && result.data.length > 0) {
                    const mappedFeedback = result.data.map((fb, index) => ({
                        id: Date.now() + index,
                        Initiate_Work_id: fb.Auto_RICEW_AI_id,
                        text: fb.feedback_Text || '',
                        fileName: fb.Upload_file_name || '',
                        fileUrl: fb.Upload_file_url || '',
                        feedback_business_owner_id: fb.Auto_RICEW_AI_Feedback_Form_id || '',
                        business_owner_decision: fb.Decision_feedback || 'Open',
                        subRows: []
                    }));
                    setFeedbackRows(mappedFeedback);
                }
            }
        } catch (error) {
            console.error('Error fetching feedback:', error);
        }
    }, [id, workData, projectIdFromUrl]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (workData.length > 0) {
            fetchFeedback();
        }
    }, [workData, fetchFeedback]);

    // Sync feedback rows with workData
    useEffect(() => {
        if (workData.length > 0 && feedbackRows.length === 1 && !feedbackRows[0].Initiate_Work_id) {
            setFeedbackRows(workData.map((workRow, index) => ({
                id: Date.now() + index,
                Initiate_Work_id: workRow.Initiate_Work_id,
                text: '',
                fileName: '',
                fileUrl: '',
                feedback_business_owner_id: '',
                business_owner_decision: 'Open',
                subRows: []
            })));
        }
    }, [workData, feedbackRows]);

    const isDecisionLocked = workData.some(w => w.approve_reject_Decision === 'true') || feedbackRows.some(fr => fr.approve_reject_Decision === 'true');

    return (
        <div className="config-main" style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '0', margin: '0' }}>
            <div style={{ padding: '1rem 1rem 2rem 1rem', width: '100%', margin: '0', boxSizing: 'border-box' }}>

                {/* Success Message Popup */}
                {showSuccessMessage && (
                    <div style={{
                        position: 'fixed', top: '20px', right: '20px',
                        backgroundColor: '#10b981', color: 'white',
                        padding: '12px 20px', borderRadius: '6px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        zIndex: 1000, fontSize: '14px', fontWeight: '500',
                        display: 'flex', alignItems: 'center', gap: '8px',
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
                    .help-modal-scroll::-webkit-scrollbar { width: 4px; }
                    .help-modal-scroll::-webkit-scrollbar-track { background: transparent; margin: 8px 0; }
                    .help-modal-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                    .help-modal-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
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
                    <div className="config-header" style={{
                        marginTop: '0', marginRight: '0px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '0.5rem 2rem'
                    }}>
                        <h2 style={{ margin: 0 }}>Feedback Form (Auto RICEW AI)</h2>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <button
                                onClick={() => setShowHelpPopup(!showHelpPopup)}
                                style={{
                                    backgroundColor: '#4D5C74', color: 'white', border: 'none',
                                    padding: '8px 16px', borderRadius: '4px', cursor: 'pointer',
                                    fontSize: '14px', fontWeight: '500', display: 'flex',
                                    alignItems: 'center', gap: '6px', transition: 'all 0.2s ease',
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
                                    position: 'fixed', top: '0', left: '0', right: '0', bottom: '0',
                                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    zIndex: 30000, padding: '20px'
                                }}>
                                    <div ref={helpPopupRef} style={{
                                        backgroundColor: 'white', borderRadius: '12px',
                                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                                        width: '100%', maxWidth: '800px', maxHeight: '90vh',
                                        display: 'flex', flexDirection: 'column', position: 'relative'
                                    }}>
                                        <div className="help-modal-scroll" style={{ overflowY: 'auto', padding: '32px', textAlign: 'left', flex: '1' }}>
                                            <button onClick={() => setShowHelpPopup(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545' }}>
                                                <X size={20} />
                                            </button>
                                            <h3 style={{ margin: '0 0 16px 0', color: '#333', fontSize: '18px', fontWeight: '600' }}>Help & Information</h3>
                                            <div style={{ color: '#444', fontSize: '14px', lineHeight: '1.6' }}>
                                                <div style={{ marginBottom: '16px' }}>
                                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>What is this page?</strong>
                                                    <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                                                        The <strong>Feedback Form (Auto RICEW AI)</strong> page allows RICEW Owners to review AI-generated deliverables (Functional Specification, Technical Specification, Code, and Test Scripts), approve or reject documents, and provide detailed feedback.
                                                    </p>
                                                </div>
                                                <div style={{ marginBottom: '16px' }}>
                                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>Understanding the columns</strong>
                                                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                                        <li><strong>RICEW Object</strong> — The AI-generated RICEW object assigned.</li>
                                                        <li><strong>Upload Object</strong> — The AI-generated documents submitted for your review.</li>
                                                        <li><strong>Approve Status</strong> — Indicates whether the document has been approved or rejected.</li>
                                                    </ul>
                                                </div>
                                                <div style={{ marginBottom: '16px' }}>
                                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to make changes</strong>
                                                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                                        <li>Click the file link in the <strong>Upload Object</strong> column to view the AI-generated document.</li>
                                                        <li>Use the <strong>Approve</strong> and <strong>Reject</strong> buttons to indicate your decision on the document.</li>
                                                        <li>In the <strong>Feedback Form</strong> below, you can add detailed feedback and upload supporting documents.</li>
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
                            width: '100%', boxSizing: 'border-box', marginTop: '10px'
                        }}>
                            {/* Table Header row */}
                            <div style={{
                                display: 'grid', gridTemplateColumns: '60px minmax(0, 1fr) 150px 120px minmax(0, 1fr) minmax(0, 1fr) 160px', borderBottom: '1px solid #ddd',
                                backgroundColor: 'white'
                            }}>
                                <div style={{ padding: '12px 8px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', backgroundColor: 'white', textAlign: 'center' }}>Sr. No.</div>
                                <div style={{ minWidth: 0, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', backgroundColor: 'white' }}>RICEW Object</div>
                                <div style={{ padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', backgroundColor: 'white' }}>RICEW Status</div>
                                <div style={{ padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', backgroundColor: 'white' }}>Assigned Date</div>
                                <div style={{ minWidth: 0, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', backgroundColor: 'white' }}>Requirement Uploaded</div>
                                <div style={{ minWidth: 0, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', backgroundColor: 'white' }}>AI Generated Documents</div>
                                <div style={{ padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', backgroundColor: 'white', textAlign: 'center' }}>Document Approve</div>
                            </div>

                            {/* Table Body */}
                            <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'white' }}>
                                {loading ? (
                                    <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Loading records...</div>
                                ) : workData.length > 0 ? (
                                    workData.map((row, index) => {
                                        const feedbackRow = feedbackRows.find(fr => String(fr.Initiate_Work_id) === String(row.Initiate_Work_id));
                                        const isRowLocked = feedbackRow?.approve_reject_Decision === 'true' || row.approve_reject_Decision === 'true';

                                        // Determine the max number of sub-rows between upload files and requirement files
                                        const uploadCount = (row.uploadFiles || []).length;
                                        const reqCount = (row.requirementFiles || []).length;
                                        const maxFileRows = Math.max(uploadCount, reqCount, 1);

                                        return (
                                            <div key={index} style={{
                                                display: 'grid', gridTemplateColumns: '60px minmax(0, 1fr) 150px 120px minmax(0, 1fr) minmax(0, 1fr) 160px',
                                                backgroundColor: isRowLocked ? '#eef2f6' : '#ffffff',
                                                borderBottom: '1px solid #ddd',
                                                color: isRowLocked ? '#64748b' : '#333',
                                                opacity: isRowLocked ? 0.95 : 1
                                            }}>
                                                {/* Sr. No. */}
                                                <div style={{ padding: '12px 8px', fontSize: '11px', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '500', textAlign: 'center' }}>
                                                    {row.Initiate_Work_id || '-'}
                                                </div>

                                                {/* RICEW Object */}
                                                <div style={{ minWidth: 0, padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'center' }}>
                                                    {row.ricewObject || '-'}
                                                </div>

                                                {/* RICEW Status */}
                                                <div style={{ padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'center' }}>
                                                    <span style={{
                                                        padding: '4px 8px', borderRadius: '4px',
                                                        backgroundColor: isRowLocked ? '#e2e8f0' : '#dbeafe',
                                                        color: isRowLocked ? '#4a5568' : '#1e40af',
                                                        fontWeight: '500', fontSize: '11px', whiteSpace: 'nowrap',
                                                        textAlign: 'center', width: '100%'
                                                    }}>
                                                        {ricewStatus || '-'}
                                                    </span>
                                                </div>

                                                {/* Assigned Date */}
                                                <div style={{ padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'center' }}>
                                                    {row.assignedDate}
                                                </div>

                                                {/* Requirement Uploaded */}
                                                <div style={{ minWidth: 0, padding: '0', fontSize: '13px', borderRight: '1px solid #ddd', display: 'flex', flexDirection: 'column' }}>
                                                    {row.requirementFiles && row.requirementFiles.length > 0 ? (
                                                        row.requirementFiles.map((file, fIdx) => (
                                                            <div key={fIdx} style={{ minHeight: '46px', boxSizing: 'border-box', padding: '4px 12px', display: 'flex', alignItems: 'center' }}>
                                                                {file.file_url ? (
                                                                    <a
                                                                        href={getFileViewUrl(file.file_url, file.file_name)}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        style={{
                                                                            display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#eff6ff',
                                                                            padding: '6px 12px', borderRadius: '6px', border: '1px solid #bfdbfe',
                                                                            color: '#2563eb', flex: 1, boxSizing: 'border-box', textDecoration: 'none',
                                                                            cursor: 'pointer', transition: 'all 0.2s ease', fontSize: '11px',
                                                                            fontWeight: '600', minWidth: 0, width: '100%'
                                                                        }}
                                                                        title={file.file_name}
                                                                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#dbeafe'; e.currentTarget.style.borderColor = '#93c5fd'; }}
                                                                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; e.currentTarget.style.borderColor = '#bfdbfe'; }}
                                                                    >
                                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
                                                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
                                                                            {file.file_name || `requirement_${fIdx + 1}`}
                                                                        </span>
                                                                    </a>
                                                                ) : (
                                                                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                                                                        <span style={{ marginRight: '4px', fontWeight: '600' }}>{fIdx + 1}.</span>
                                                                        {file.file_name || '-'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div style={{ padding: '12px', display: 'flex', alignItems: 'center', color: '#999' }}>-</div>
                                                    )}
                                                </div>

                                                {/* AI Generated Documents & Document Approve (Combined for flawless vertical alignment when text wraps) */}
                                                <div style={{ gridColumn: '6 / span 2', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                                    {row.isUploaded && row.uploadFiles && row.uploadFiles.length > 0 ? (
                                                        row.uploadFiles.map((file, fIdx) => {
                                                            // Determine Button statuses
                                                            const status = docApprovalStatus[file.url] || (file.document_approved === 'true' ? 'Approved' : file.document_approved === 'false' ? 'Rejected' : '');
                                                            const isApproved = status === 'Approved';
                                                            let isRejected = status === 'Rejected';
                                                            if (isRowLocked && !isApproved && !isRejected) isRejected = true;
                                                            const disableApprove = isApproved || isRowLocked;
                                                            const disableReject = isRejected || isRowLocked;

                                                            let approveBgColor = 'white', approveTextColor = '#64748b', approveBorder = '1px solid #cbd5e1';
                                                            let rejectBgColor = 'white', rejectTextColor = '#64748b', rejectBorder = '1px solid #cbd5e1';
                                                            if (isApproved) { approveBgColor = '#28a745'; approveTextColor = 'white'; approveBorder = '1px solid #28a745'; }
                                                            if (isRejected) { rejectBgColor = '#dc3545'; rejectTextColor = 'white'; rejectBorder = '1px solid #dc3545'; }
                                                            if (isRowLocked) {
                                                                if (!isApproved) { approveBgColor = '#f9fafb'; approveTextColor = '#9ca3af'; approveBorder = '1px solid #e5e7eb'; }
                                                                if (!isRejected) { rejectBgColor = '#f9fafb'; rejectTextColor = '#9ca3af'; rejectBorder = '1px solid #e5e7eb'; }
                                                            }

                                                            return (
                                                                <div key={fIdx} style={{
                                                                    display: 'grid',
                                                                    gridTemplateColumns: 'minmax(0, 1fr) 160px',
                                                                    minHeight: '46px',
                                                                    boxSizing: 'border-box'
                                                                }}>
                                                                    {/* Left side: AI Generated Document */}
                                                                    <div style={{ padding: '4px 12px', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'center', minWidth: 0, boxSizing: 'border-box' }}>
                                                                        {file.url ? (
                                                                            <a
                                                                                href={getFileViewUrl(file.url, file.File_Name)}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                style={{
                                                                                    display: 'flex', alignItems: 'flex-start', gap: '6px', backgroundColor: '#eff6ff',
                                                                                    padding: '6px 12px', borderRadius: '6px', border: '1px solid #bfdbfe',
                                                                                    color: '#2563eb', flex: 1, boxSizing: 'border-box', textDecoration: 'none',
                                                                                    cursor: 'pointer', transition: 'all 0.2s ease', fontSize: '11px',
                                                                                    fontWeight: '600', minWidth: 0, width: '100%'
                                                                                }}
                                                                                title={file.File_Name}
                                                                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#dbeafe'; e.currentTarget.style.borderColor = '#93c5fd'; }}
                                                                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; e.currentTarget.style.borderColor = '#bfdbfe'; }}
                                                                            >
                                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
                                                                                <span style={{ overflow: 'hidden', wordBreak: 'break-word', whiteSpace: 'normal', textAlign: 'left', lineHeight: '1.4' }}>
                                                                                    <span style={{ color: '#2563eb', marginRight: '5px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>[AI]</span>
                                                                                    {file.File_Name || `document_${fIdx + 1}.pdf`}
                                                                                </span>
                                                                            </a>
                                                                        ) : (
                                                                            <span style={{ fontSize: '12px', color: '#64748b' }}>
                                                                                <span style={{ marginRight: '4px', fontWeight: '600' }}>{fIdx + 1}.</span>
                                                                                <span style={{ color: '#2563eb', marginRight: '5px', fontSize: '10px', fontWeight: 'bold' }}>[AI]</span>
                                                                                {file.File_Name || '-'}
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    {/* Right side: Approve / Reject Buttons */}
                                                                    <div style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '6px', boxSizing: 'border-box' }}>
                                                                        <button
                                                                            disabled={disableApprove}
                                                                            onClick={() => handleDocAction(row.Auto_RICEW_AI_id, '', file.File_Name, file.url, 'Approved', 'AI_Generated_File')}
                                                                            onMouseEnter={(e) => { if (!disableApprove) { e.currentTarget.style.backgroundColor = '#f0fdf4'; e.currentTarget.style.borderColor = '#22c55e'; e.currentTarget.style.color = '#15803d'; } }}
                                                                            onMouseLeave={(e) => { if (!disableApprove) { e.currentTarget.style.backgroundColor = isApproved ? '#28a745' : 'white'; e.currentTarget.style.borderColor = isApproved ? '#28a745' : '#cbd5e1'; e.currentTarget.style.color = isApproved ? 'white' : '#64748b'; } }}
                                                                            style={{ padding: '5px 0', width: '68px', backgroundColor: approveBgColor, color: approveTextColor, border: approveBorder, borderRadius: '5px', cursor: disableApprove ? 'not-allowed' : 'pointer', fontSize: '10px', fontWeight: '600', transition: 'all 0.2s ease', textAlign: 'center' }}
                                                                        >
                                                                            {isApproved ? 'Approved' : 'Approve'}
                                                                        </button>
                                                                        <button
                                                                            disabled={disableReject}
                                                                            onClick={() => handleDocAction(row.Auto_RICEW_AI_id, '', file.File_Name, file.url, 'Rejected', 'AI_Generated_File')}
                                                                            onMouseEnter={(e) => { if (!disableReject) { e.currentTarget.style.backgroundColor = '#fef2f2'; e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#b91c1c'; } }}
                                                                            onMouseLeave={(e) => { if (!disableReject) { e.currentTarget.style.backgroundColor = isRejected ? '#dc3545' : 'white'; e.currentTarget.style.borderColor = isRejected ? '#dc3545' : '#cbd5e1'; e.currentTarget.style.color = isRejected ? 'white' : '#64748b'; } }}
                                                                            style={{ padding: '5px 0', width: '68px', backgroundColor: rejectBgColor, color: rejectTextColor, border: rejectBorder, borderRadius: '5px', cursor: disableReject ? 'not-allowed' : 'pointer', fontSize: '10px', fontWeight: '600', transition: 'all 0.2s ease', textAlign: 'center' }}
                                                                        >
                                                                            {isRejected ? 'Rejected' : 'Reject'}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    ) : (
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 160px', height: '100%' }}>
                                                            <div style={{ padding: '12px', display: 'flex', alignItems: 'center', borderRight: '1px solid #ddd', color: '#999' }}>-</div>
                                                            <div style={{ padding: '12px', display: 'flex', alignItems: 'center', color: '#999' }}>-</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
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
                <div style={{
                    backgroundColor: 'white', padding: '0', borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginTop: '30px'
                }}>
                    <div className="config-header" style={{ marginTop: '0', marginRight: "0px" }}>
                        <h2>Feedback Form</h2>
                    </div>

                    <div style={{ padding: '0px' }}>
                        {/* Owner Info Bar */}
                        <div style={{
                            padding: '16px 20px', borderBottom: '1px solid #e0e0e0',
                            backgroundColor: 'white', display: 'flex', alignItems: 'center',
                            gap: '24px', flexWrap: 'wrap'
                        }}>
                            <label style={{ fontWeight: '600', color: '#333', fontSize: '14px', whiteSpace: 'nowrap' }}>
                                RICEW Object Owner <span style={{ color: 'red' }}>*</span>
                            </label>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <label style={{ fontSize: '13px', color: 'black', fontWeight: '500' }}>Name <span style={{ fontWeight: 'bold' }}>:</span></label>
                                <input type="text" placeholder="Name" value={ownerName} readOnly={true}
                                    style={{ width: '240px', height: '35px', padding: '0 12px', border: '1px solid black', borderRadius: '4px', backgroundColor: '#f5f5f5', fontSize: '13px', fontFamily: 'Arial, sans-serif', color: 'black', outline: 'none', cursor: 'not-allowed' }} />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <label style={{ fontSize: '13px', color: 'black', fontWeight: '500' }}>Email Address <span style={{ fontWeight: 'bold' }}>:</span></label>
                                <input type="email" placeholder="Email Address" value={ownerEmail} readOnly={true}
                                    style={{ width: '300px', height: '35px', padding: '0 12px', border: '1px solid black', borderRadius: '4px', backgroundColor: '#f5f5f5', fontSize: '13px', fontFamily: 'Arial, sans-serif', color: 'black', outline: 'none', cursor: 'not-allowed' }} />
                            </div>
                        </div>

                        <div style={{ padding: '20px' }}>
                            {/* Feedback Grid Container */}
                            <div style={{
                                display: 'grid', gridTemplateColumns: '60px minmax(0, 1.5fr) minmax(0, 1fr) 150px',
                                borderLeft: '1px solid #ddd', borderTop: '1px solid #ddd',
                                borderRadius: '4px', backgroundColor: 'white'
                            }}>
                                {/* Group Header */}
                                <div style={{ gridColumn: 'span 4', borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '10px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px', backgroundColor: '#fcfcfc' }}>
                                    Client Business Owner Feedback
                                </div>

                                {/* Sub-Header Row */}
                                <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#fcfcfc', color: 'black' }}>Sr. No.</div>
                                <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#fcfcfc', color: 'black' }}>Text</div>
                                <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#fcfcfc', color: 'black' }}>Upload Document</div>
                                <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#fcfcfc', color: 'black' }}>Business Owner Decision</div>

                                {/* Feedback Rows */}
                                {feedbackRows.map((row, index) => {
                                    const cellBorderBottom = '1px solid #ddd';
                                    const rowSpan = 1 + (row.subRows?.length || 0);
                                    const isMainRowClosed = isClosed(row.business_owner_decision);

                                    return (
                                        <React.Fragment key={row.id}>
                                            {/* Col 1: Sr. No. */}
                                            <div style={{ gridRow: `span ${rowSpan}`, borderBottom: cellBorderBottom, borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', backgroundColor: row.business_owner_decision === 'Close' ? '#f5f5f5' : '#fcfcfc' }}>
                                                {row.Initiate_Work_id || index + 1}
                                            </div>

                                            {/* Col 2: Text */}
                                            <div style={{ borderBottom: row.subRows?.length > 0 ? '1px solid #eee' : cellBorderBottom, borderRight: '1px solid #ddd', padding: '5px', position: 'relative', backgroundColor: isMainRowClosed ? '#f5f5f5' : 'white' }}>
                                                <textarea
                                                    value={row.text}
                                                    onChange={(e) => handleRowChange(row.id, 'text', e.target.value)}
                                                    disabled={isMainRowClosed}
                                                    style={{ width: '100%', border: 'none', outline: 'none', resize: isMainRowClosed ? 'none' : 'vertical', minHeight: '35px', fontSize: '13px', fontFamily: 'Arial, sans-serif', padding: '5px', paddingBottom: '15px', backgroundColor: isMainRowClosed ? '#f5f5f5' : 'transparent', color: isMainRowClosed ? '#718096' : 'inherit', cursor: isMainRowClosed ? 'not-allowed' : 'text' }}
                                                    placeholder="Enter feedback..."
                                                />
                                                {row.feedback_business_owner_id && !isMainRowClosed && (
                                                    <button onClick={() => handleAddSubRow(row.id)} style={{ position: 'absolute', right: '25px', bottom: '5px', background: 'none', border: 'none', padding: '0', cursor: 'pointer', color: '#3182ce', display: 'flex', alignItems: 'center' }} title="Add detail">
                                                        <Plus size={16} />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Col 3: Upload Document */}
                                            <div style={{ borderBottom: row.subRows?.length > 0 ? '1px solid #eee' : cellBorderBottom, borderRight: '1px solid #ddd', padding: '8px', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: isMainRowClosed ? '#f5f5f5' : 'white' }}>
                                                <button
                                                    onClick={() => document.getElementById(`feedback-file-${row.id}`).click()}
                                                    disabled={isMainRowClosed}
                                                    style={{ backgroundColor: isMainRowClosed ? '#edf2f7' : '#c6f6d5', color: isMainRowClosed ? '#a0aec0' : '#22543d', border: isMainRowClosed ? '1px solid #e2e8f0' : '1px solid #9ae6b4', padding: '4px 8px', borderRadius: '4px', cursor: isMainRowClosed ? 'not-allowed' : 'pointer', fontSize: '10px', fontWeight: '600', whiteSpace: 'nowrap', flexShrink: 0 }}
                                                >
                                                    Upload
                                                </button>
                                                <input id={`feedback-file-${row.id}`} type="file" style={{ display: 'none' }} disabled={isMainRowClosed} onChange={(e) => handleFeedbackFileUpload(row.id, e)} />
                                                <span style={{ fontSize: '11px', color: row.fileName ? '#3182ce' : '#999', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }} title={row.fileName || ''}>
                                                    {row.fileName ? (
                                                        <a href={getFileViewUrl(row.fileUrl, row.fileName)} target="_blank" rel="noopener noreferrer" style={{ color: '#3182ce', textDecoration: 'none' }}>{row.fileName}</a>
                                                    ) : 'No doc'}
                                                </span>
                                            </div>

                                            {/* Col 4: Decision */}
                                            <div style={{ borderBottom: row.subRows?.length > 0 ? '1px solid #eee' : cellBorderBottom, borderRight: '1px solid #ddd', padding: '8px 5px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: isMainRowClosed ? '#f5f5f5' : 'white' }}>
                                                <select
                                                    value={row.business_owner_decision || 'Open'}
                                                    onChange={(e) => handleRowChange(row.id, 'business_owner_decision', e.target.value)}
                                                    style={{ width: '100%', height: '32px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#ffffff', color: '#334155', cursor: 'pointer', padding: '0 8px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                                                >
                                                    <option value="Open">Open</option>
                                                    <option value="Close">Close</option>
                                                </select>
                                            </div>

                                            {/* Sub Rows */}
                                            {row.subRows?.map((subRow, sIdx) => {
                                                const isLastSubRow = sIdx === row.subRows.length - 1;
                                                const subCellBorderBottom = isLastSubRow ? cellBorderBottom : '1px solid #eee';
                                                const isSubRowClosed = isClosed(subRow.business_owner_decision);

                                                return (
                                                    <React.Fragment key={subRow.id}>
                                                        {/* Sub-row Text */}
                                                        <div style={{ borderBottom: subCellBorderBottom, borderRight: '1px solid #ddd', padding: '5px', position: 'relative', backgroundColor: isSubRowClosed ? '#f5f5f5' : 'white' }}>
                                                            <textarea value={subRow.text} onChange={(e) => handleSubRowChange(row.id, subRow.id, 'text', e.target.value)} disabled={isSubRowClosed}
                                                                style={{ width: '100%', border: 'none', outline: 'none', resize: isSubRowClosed ? 'none' : 'vertical', minHeight: '30px', fontSize: '13px', fontFamily: 'Arial, sans-serif', padding: '5px', paddingBottom: '15px', backgroundColor: isSubRowClosed ? '#f5f5f5' : '#fffdee', color: isSubRowClosed ? '#718096' : 'inherit', cursor: isSubRowClosed ? 'not-allowed' : 'text' }}
                                                                placeholder="Enter sub-feedback..." />
                                                        </div>
                                                        {/* Sub-row Upload Document */}
                                                        <div style={{ borderBottom: subCellBorderBottom, borderRight: '1px solid #ddd', padding: '8px', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: isSubRowClosed ? '#f5f5f5' : 'white' }}>
                                                            <button onClick={() => document.getElementById(`sub-file-${subRow.id}`).click()} disabled={isSubRowClosed}
                                                                style={{ backgroundColor: isSubRowClosed ? '#edf2f7' : '#fff5f5', color: isSubRowClosed ? '#a0aec0' : '#c53030', border: isSubRowClosed ? '1px solid #e2e8f0' : '1px solid #feb2b2', padding: '4px 8px', borderRadius: '4px', cursor: isSubRowClosed ? 'not-allowed' : 'pointer', fontSize: '10px', fontWeight: '600', whiteSpace: 'nowrap', flexShrink: 0 }}>Upload</button>
                                                            <input id={`sub-file-${subRow.id}`} type="file" style={{ display: 'none' }} disabled={isSubRowClosed} onChange={(e) => handleSubRowFileUpload(row.id, subRow.id, e)} />
                                                            <span style={{ fontSize: '11px', color: subRow.fileName ? '#3182ce' : '#999', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }} title={subRow.fileName || ''}>
                                                                {subRow.fileName ? (
                                                                    <a href={getFileViewUrl(subRow.fileUrl, subRow.fileName)} target="_blank" rel="noopener noreferrer" style={{ color: '#3182ce', textDecoration: 'none' }}>{subRow.fileName}</a>
                                                                ) : 'No doc'}
                                                            </span>
                                                        </div>
                                                        {/* Sub-row Decision */}
                                                        <div style={{ borderBottom: subCellBorderBottom, borderRight: '1px solid #ddd', padding: '8px 5px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: isSubRowClosed ? '#f5f5f5' : 'white' }}>
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
                                        backgroundColor: loading ? '#f0f0f0' : '#c6f6d5', color: loading ? '#a0aec0' : '#22543d',
                                        border: loading ? '1px solid #e2e8f0' : '1px solid #9ae6b4',
                                        width: '140px', height: '32px', padding: '0px 12px', borderRadius: '4px',
                                        cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '500',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap',
                                        opacity: loading ? 0.7 : 1, transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => { if (!loading) e.target.style.backgroundColor = '#9ae6b4'; }}
                                    onMouseLeave={(e) => { if (!loading) e.target.style.backgroundColor = '#c6f6d5'; }}
                                >
                                    {loading ? 'Submitting...' : 'Submit Feedback'}
                                </button>

                                <button
                                    onClick={() => showConfirmation(
                                        "Are you sure you want to approve the document? This will lock the records and send notifications. Please ensure you have reviewed the 'Document Approve' section for all items.",
                                        handleApproveDocument
                                    )}
                                    disabled={loading}
                                    style={{
                                        backgroundColor: loading ? '#f0f0f0' : '#c6f6d5', color: loading ? '#a0aec0' : '#22543d',
                                        border: loading ? '1px solid #e2e8f0' : '1px solid #9ae6b4',
                                        width: '140px', height: '32px', padding: '0px 12px', borderRadius: '4px',
                                        cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '500',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap',
                                        opacity: loading ? 0.7 : 1, transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => { if (!loading) e.target.style.backgroundColor = '#9ae6b4'; }}
                                    onMouseLeave={(e) => { if (!loading) e.target.style.backgroundColor = '#c6f6d5'; }}
                                >
                                    Approve Document
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Confirmation Dialog */}
                {showConfirmDialog && (
                    <div style={{
                        position: 'fixed', top: '0', left: '0', right: '0', bottom: '0',
                        backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', zIndex: 9999
                    }}>
                        <div style={{
                            backgroundColor: 'white', padding: '24px', borderRadius: '8px',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.2)', maxWidth: '400px',
                            width: '90%', textAlign: 'center'
                        }}>
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
            {loading && (
                <div style={{ position: 'fixed', top: '0', left: '0', right: '0', bottom: '0', backgroundColor: 'rgba(255, 255, 255, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 15000 }}>
                    <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '50px', height: '50px', border: '3px solid #f3f3f3', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                        <span style={{ fontSize: '16px', color: '#333', fontWeight: '500' }}>Loading...</span>
                    </div>
                </div>
            )}
            <style>{`
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `}</style>
        </div>
    );
};

export default PublicAutoRICEWAIView;
