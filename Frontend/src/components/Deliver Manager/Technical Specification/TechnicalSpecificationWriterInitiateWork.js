import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Trash2, Plus, Send, HelpCircle, X } from 'lucide-react';
import { getIdToken } from '../../../utils/cognito-auth';
import { SuccessMessage, ErrorMessage } from '../../Resource Roster Form/FormSections';
import DOMPurify from 'dompurify';
import { useSession } from '../../../context/SessionContext';

import { GenericUserAutocomplete } from '../../RICEW Request/Risk and Issue/RiskAndIssueAutocompleteComponents';

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

const TechnicalSpecificationWriterInitiateWork = ({ selectedProject }) => {
    const { id } = useParams();
    const { handleAuthError } = useSession();
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
    const [modalDocuments, setModalDocuments] = useState([{ id: Date.now(), file: null, path: '', isUploaded: false, uploadObject: '' }]);
    const [combinedRows, setCombinedRows] = useState([
        { id: Date.now(), bof: { text: '', fileName: '', fileUrl: '', feedback_business_owner_id: '', business_owner_decision: '' }, fswrn: { text: '', fileName: '', fileUrl: '' }, subRows: [] }
    ]);
    const [isStarting, setIsStarting] = useState(false);
    const [isAssigning, setIsAssigning] = useState(false);
    const [isCustomEntry, setIsCustomEntry] = useState(false);
    const [implementationRosterOptions, setImplementationRosterOptions] = useState([]);
    const [originalBusinessOwnerName, setOriginalBusinessOwnerName] = useState('');
    const [originalBusinessOwnerEmail, setOriginalBusinessOwnerEmail] = useState('');
    const [showHelpPopup, setShowHelpPopup] = useState(false);
    const [activeModalTab, setActiveModalTab] = useState('Manual');
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

    useEffect(() => {
        const fetchRosterData = async () => {
            const projectId = localStorage.getItem('project_id') || selectedProject?.id || '101';
            try {
                const idToken = await getIdToken();
                if (!idToken) {
                    handleAuthError();
                    return;
                }

                const result = await fetch(`https://oi5gtp4f3l.execute-api.ap-south-1.amazonaws.com/New/newApi/ricew/resourceRoster/byProject?project_id=${projectId}`, {
                    headers: { 'Authorization': `Bearer ${idToken}` }
                });

                if (result.status === 401 || result.status === 403) {
                    handleAuthError();
                    return;
                }

                const response = await result.json();
                if (response.data) {
                    const rosterData = response.data.map(item => ({
                        full_name: DOMPurify.sanitize(item.IC_full_name || '', { ALLOWED_TAGS: [] }),
                        email: DOMPurify.sanitize(item.IC_email || '', { ALLOWED_TAGS: [] })
                    })).filter(item => item.full_name !== '');
                    setImplementationRosterOptions(rosterData);
                }
            } catch (error) {
                console.error("Error fetching roster data:", error);
                handleAuthError();
            }
        };
        fetchRosterData();
    }, [selectedProject, handleAuthError]);

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
            if (!idToken) {
                handleAuthError();
                return;
            }

            const response = await fetch(
                `https://mnp7960bu6.execute-api.ap-south-1.amazonaws.com/New/api/TechnicalFeedback/FetchAll?TechnicalSpecificationAssignment_id=${assignmentId}`,
                { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` } }
            );

            if (response.status === 401 || response.status === 403) {
                handleAuthError();
                return;
            }

            const result = await response.json();
            if (result.success && result.data && result.data.length > 0) {
                const newCombinedRows = result.data.map(item => {
                    // Extract SW response for main row (if any)
                    const swMain = item.writer_responses && item.writer_responses.length > 0 ? item.writer_responses[0] : null;

                    return {
                        id: item.technical_manager_owner_feedback_id || Date.now() + Math.random(),
                        Technical_Specification_Initiate_Work_id: item.Technical_Specification_Initiate_Work_id || '',
                        bof: {
                            text: DOMPurify.sanitize(item.feedback_text || '', { ALLOWED_TAGS: [] }),
                            fileName: DOMPurify.sanitize(item.supported_doccument_name || '', { ALLOWED_TAGS: [] }),
                            fileUrl: item.supported_doccument || '#',
                            business_owner_decision: normalizeDecision(item.Technical_Manager_Decision_open_closed || item.business_owner_decision),
                            feedback_business_owner_id: item.technical_manager_owner_feedback_id || ''
                        },
                        fswrn: {
                            text: DOMPurify.sanitize(swMain ? swMain.feedback_text : '', { ALLOWED_TAGS: [] }),
                            fileName: DOMPurify.sanitize(swMain ? swMain.supported_doccument_name : '', { ALLOWED_TAGS: [] }),
                            fileUrl: swMain ? swMain.supported_doccument : '',
                            rice_Specification_Writer_feedback_id: swMain ? swMain.Technical_Writing_feedback_id : ''
                        },
                        subRows: item.sub_feedbacks ? item.sub_feedbacks.map(subItem => {
                            const swSub = subItem.writer_responses && subItem.writer_responses.length > 0 ? subItem.writer_responses[0] : null;
                            return {
                                id: subItem.technical_manager_owner_feedback_id || Date.now() + Math.random(),
                                bof: {
                                    text: DOMPurify.sanitize(subItem.feedback_text || '', { ALLOWED_TAGS: [] }),
                                    fileName: DOMPurify.sanitize(subItem.supported_doccument_name || '', { ALLOWED_TAGS: [] }),
                                    fileUrl: subItem.supported_doccument || '#',
                                    business_owner_decision: normalizeDecision(subItem.Technical_Manager_Decision_open_closed || subItem.business_owner_decision || subItem.business_owner_decission),
                                    feedback_business_owner_id: subItem.technical_manager_owner_feedback_id || ''
                                },
                                fswrn: {
                                    text: DOMPurify.sanitize(swSub ? swSub.feedback_text : '', { ALLOWED_TAGS: [] }),
                                    fileName: DOMPurify.sanitize(swSub ? swSub.supported_doccument_name : '', { ALLOWED_TAGS: [] }),
                                    fileUrl: swSub ? swSub.supported_doccument : '',
                                    rice_Specification_Writer_feedback_id: swSub ? swSub.Technical_Writing_feedback_id : ''
                                }
                            };
                        }) : []
                    };
                });
                setCombinedRows(newCombinedRows);
            }
        } catch (error) {
            console.error("Error fetching feedback:", error);
            handleAuthError();
        }
    }, [handleAuthError]);

    const fetchData = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const idToken = await getIdToken();
            if (!idToken) {
                handleAuthError();
                setLoading(false);
                return;
            }

            const projectId = localStorage.getItem('project_id') || selectedProject?.id || '101';
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken} `
            };

            // Fetch Request Form Details (New API)
            try {
                const detailsResponse = await fetch(`https://x62hhl9a23.execute-api.ap-south-1.amazonaws.com/New/newApi/ricew/assignInitiateWorkTechnicalManagerOwner/detailInfo?project_id=${projectId}&ricew_id=${id}`, { headers });

                if (detailsResponse.status === 401 || detailsResponse.status === 403) {
                    handleAuthError();
                    setLoading(false);
                    return;
                }

                const detailsResult = await detailsResponse.json();
                if (detailsResult.success && detailsResult.data) {
                    setRequestFormDetails({
                        ...detailsResult.data,
                        Technical_Owner_email: DOMPurify.sanitize(detailsResult.data.Technical_Owner_email || '', { ALLOWED_TAGS: [] }),
                        Technical_Owner_name: DOMPurify.sanitize(detailsResult.data.Technical_Owner_name || '', { ALLOWED_TAGS: [] })
                    });
                }
            } catch (error) {
                console.error("Error fetching request form details:", error);
            }

            // Fetch Assignments
            const assignmentResponse = await fetch(`https://x62hhl9a23.execute-api.ap-south-1.amazonaws.com/New/newApi/ricew/technicalSpecificationAssignment/byRequestForm?RICEWRequestFormId=${id}`, { headers });

            if (assignmentResponse.status === 401 || assignmentResponse.status === 403) {
                handleAuthError();
                setLoading(false);
                return;
            }

            const assignmentResult = await assignmentResponse.json();

            if (assignmentResult.success && assignmentResult.data) {
                // Fetch Initiated Work for each assignment
                const initiatedWorkPromises = assignmentResult.data.map(async (assignment) => {
                    try {
                        const response = await fetch(
                            `https://x62hhl9a23.execute-api.ap-south-1.amazonaws.com/New/newApi/ricew/technicalInitiateWork/byProjectAndAssignment?project_id=${projectId}&assignment_id=${assignment.TechnicalSpecificationAssignment_id}`,
                            { headers }
                        );
                        const result = await response.json();
                        return {
                            assignmentId: assignment.TechnicalSpecificationAssignment_id,
                            data: result.success && result.data && result.data.length > 0 ? result.data : []
                        };
                    } catch (error) {
                        console.error(`Error fetching initiated work for assignment ${assignment.TechnicalSpecificationAssignment_id}:`, error);
                        return {
                            assignmentId: assignment.TechnicalSpecificationAssignment_id,
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


                    const initiatedWorkList = initiatedWorkMap.get(item.TechnicalSpecificationAssignment_id) || [];

                    if (initiatedWorkList.length === 0) {
                        // Return one empty row if no work has started
                        return [{
                            ...item,
                            Technical_Specification_Initiate_Work_id: '',
                            ricewObject: DOMPurify.sanitize(item.RICEW_Object || '-', { ALLOWED_TAGS: [] }),
                            assignedDate: formatToIST(item.assign_object_date || item.created_timestamp) || '-',
                            startObject: '-',
                            uploadObject: '-',
                            uploadFiles: [],
                            fileName: '-',
                            endDate: '-',
                            comment: '',
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
                            allFiles = initiatedWork.Upload_Object.filter(f => f.url && f.url !== '-' && f.url.trim() !== '').map(f => ({
                                File_Name: DOMPurify.sanitize(f.File_Name || '', { ALLOWED_TAGS: [] }),
                                url: f.url,
                                document_approved: f.document_approved
                            }));
                            if (allFiles.length > 0) {
                                displayFileName = allFiles[0].File_Name || '-';
                                primaryUrl = allFiles[0].url || '-';
                            }
                        } else if (typeof initiatedWork?.Upload_Object === 'string' && initiatedWork.Upload_Object.trim() !== '' && initiatedWork.Upload_Object !== '-') {
                            primaryUrl = initiatedWork.Upload_Object;
                            displayFileName = DOMPurify.sanitize(initiatedWork?.file_name || initiatedWork?.File_Name || '-', { ALLOWED_TAGS: [] });
                            allFiles = [{ 
                                File_Name: displayFileName, 
                                url: primaryUrl,
                                document_approved: initiatedWork?.document_approved 
                            }];
                        }

                        const hasUploadedFile = primaryUrl !== '-' && primaryUrl.trim() !== '';

                        // Map AI files if they exist
                        const rawAiFile = initiatedWork?.AI_Generated_File;
                        const aiFiles = (Array.isArray(rawAiFile) ? rawAiFile : (rawAiFile ? [rawAiFile] : []))
                            .filter(f => f && f.uploaded_url && f.uploaded_url !== '-')
                            .map(f => ({
                                File_Name: DOMPurify.sanitize(f.file_name || 'AI Generated Specification', { ALLOWED_TAGS: [] }),
                                url: f.uploaded_url,
                                document_approved: f.approved_document || "",
                                isAI: true
                            }));

                        const unifiedFiles = [...allFiles, ...aiFiles];

                        return {
                            ...item,
                            Technical_Specification_Initiate_Work_id: initiatedWork?.Technical_Specification_Initiate_Work_id || '',
                            ricewObject: DOMPurify.sanitize(item.RICEW_Object || '-', { ALLOWED_TAGS: [] }),
                            assignedDate: formatToIST(item.assign_object_date || item.created_timestamp) || '-',
                            startObject: initiatedWork ? initiatedWork.Start_Object : '-',
                            uploadObject: primaryUrl,
                            uploadFiles: unifiedFiles,
                            AI_Generated_File: initiatedWork?.AI_Generated_File || [], // Keep raw for modal logic
                            fileName: displayFileName,
                            endDate: initiatedWork ? initiatedWork.End_Date : '-',
                            comment: DOMPurify.sanitize(initiatedWork?.comment || initiatedWork?.comment_section || '', { ALLOWED_TAGS: [] }),
                            isStarted: !!initiatedWork,
                            isUploaded: hasUploadedFile || aiFiles.length > 0,
                            statusVerification: DOMPurify.sanitize(initiatedWork?.status_verification || '-', { ALLOWED_TAGS: [] })
                        };
                    });
                });

                // --- SORTING ---
                mappedData.sort((a, b) => {
                    const idA = parseInt(String(a.Technical_Specification_Initiate_Work_id || a.Initiate_Work_id).replace(/\D/g, '')) || 0;
                    const idB = parseInt(String(b.Technical_Specification_Initiate_Work_id || b.Initiate_Work_id).replace(/\D/g, '')) || 0;
                    return idA - idB;
                });

                setWorkData(mappedData);
                if (mappedData.length > 0 && mappedData[0].TechnicalSpecificationAssignment_id) {
                    fetchFeedback(mappedData[0].TechnicalSpecificationAssignment_id);
                }
            } else {
                setWorkData([]);
            }
        } catch (error) {
            console.error("Error fetching work data:", error);
            handleAuthError();
            setWorkData([]);
        } finally {
            setLoading(false);
        }
    }, [id, selectedProject?.id, fetchFeedback, handleAuthError]);



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

    const handleCommentChange = (index, value) => {
        setWorkData(prev => prev.map((row, i) => i === index ? { ...row, comment: value } : row));
    };

    const handleUpdateComment = async (index, row) => {
        if (!row.Technical_Specification_Initiate_Work_id) {
            setErrorMsg('Initiate Work ID is missing. Please start the work first.');
            setShowError(true);
            setTimeout(() => setShowError(false), 5000);
            return;
        }

        setLoading(true);
        try {
            const idToken = await getIdToken();
            if (!idToken) {
                handleAuthError();
                setLoading(false);
                return;
            }

            const payload = {
                Technical_Specification_Initiate_Work_id: row.Technical_Specification_Initiate_Work_id,
                comment_section: DOMPurify.sanitize(row.comment || '', { ALLOWED_TAGS: [] })
            };

            const response = await fetch('https://mnp7960bu6.execute-api.ap-south-1.amazonaws.com/New/api/TechnicalOwner/UpdateComment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify(payload)
            });

            if (response.status === 401 || response.status === 403) {
                handleAuthError();
                setLoading(false);
                return;
            }

            const result = await response.json();
            if (result.success) {
                setSuccessMsg('Comment updated successfully');
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 3000);
            } else {
                setErrorMsg('Failed to update comment: ' + (result.error || 'Unknown error'));
                setShowError(true);
                setTimeout(() => setShowError(false), 5000);
            }
        } catch (error) {
            console.error('Error updating comment:', error);
            handleAuthError();
            setErrorMsg('Error updating comment');
            setShowError(true);
            setTimeout(() => setShowError(false), 5000);
        } finally {
            setLoading(false);
        }
    };

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
                    comment: '',
                    isStarted: false,
                    isUploaded: false,
                    statusVerification: '-',
                    Initiate_Work_id: '',
                    Technical_Specification_Initiate_Work_id: '',
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
            return { ...row, subRows: row.subRows.map(sr => sr.id === subRowId ? { ...sr, fswrn: { text: '', fileName: '', fileUrl: '' } } : sr) };
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
            if (!idToken) {
                handleAuthError();
                return;
            }

            const projectId = localStorage.getItem('project_id') || selectedProject?.id || '101';
            const assignmentId = workData[0]?.TechnicalSpecificationAssignment_id || '';

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

                        const presignResponse = await fetch('https://mnp7960bu6.execute-api.ap-south-1.amazonaws.com/New/generate-presigned-urls/Feedback-Response-TechnicalWriter-pdf', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                project_id: DOMPurify.sanitize(projectId, { ALLOWED_TAGS: [] }),
                                TechnicalSpecificationAssignment_id: DOMPurify.sanitize(assignmentId || '', { ALLOWED_TAGS: [] }),
                                RICEWRequestFormId: DOMPurify.sanitize(id || '', { ALLOWED_TAGS: [] }),
                                ricew_object: DOMPurify.sanitize(workData[0]?.ricewObject || '', { ALLOWED_TAGS: [] }),
                                technical_manager_owner_feedback_id: DOMPurify.sanitize(item.feedback_business_owner_id || '', { ALLOWED_TAGS: [] }),
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
                    Technical_Writing_feedback_id: row.fswrn.rice_Specification_Writer_feedback_id || "",
                    technical_manager_owner_feedback_id: row.bof.feedback_business_owner_id || "",
                    parent_feedback_id: "",
                    row_number: idx + 1,
                    sub_row_number: 0,
                    Technical_Specification_Initiate_Work_id: workData[0]?.Technical_Specification_Initiate_Work_id || "",
                    Project_id: projectId,
                    TechnicalSpecificationAssignment_id: assignmentId,
                    feedback_text: DOMPurify.sanitize(row.fswrn.text || '', { ALLOWED_TAGS: [] }),
                    supported_doccument: row.fswrn.fileUrl === '#' ? "" : row.fswrn.fileUrl,
                    supported_doccument_name: DOMPurify.sanitize(row.fswrn.fileName || '', { ALLOWED_TAGS: [] })
                });

                // Sub-rows records
                row.subRows?.forEach((subRow, sIdx) => {
                    records.push({
                        Technical_Writing_feedback_id: subRow.fswrn.rice_Specification_Writer_feedback_id || "",
                        technical_manager_owner_feedback_id: subRow.bof.feedback_business_owner_id || "",
                        parent_feedback_id: "", // Link to parent response if needed by logic
                        row_number: idx + 1,
                        sub_row_number: sIdx + 1,
                        Technical_Specification_Initiate_Work_id: workData[0]?.Technical_Specification_Initiate_Work_id || "",
                        Project_id: projectId,
                        TechnicalSpecificationAssignment_id: assignmentId,
                        feedback_text: DOMPurify.sanitize(subRow.fswrn.text || '', { ALLOWED_TAGS: [] }),
                        supported_doccument: subRow.fswrn.fileUrl === '#' ? "" : subRow.fswrn.fileUrl,
                        supported_doccument_name: DOMPurify.sanitize(subRow.fswrn.fileName || '', { ALLOWED_TAGS: [] })
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

            const response = await fetch('https://mnp7960bu6.execute-api.ap-south-1.amazonaws.com/New/api/TechnicalWriter/FeedbackResponseSubmit', {
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
                        RICEW_Object: DOMPurify.sanitize(workData[0]?.ricewObject || '-', { ALLOWED_TAGS: [] }),
                        RICEWRequestFormId: DOMPurify.sanitize(id || '', { ALLOWED_TAGS: [] }),
                        Project_id: DOMPurify.sanitize(projectId || '', { ALLOWED_TAGS: [] }),
                        Technical_Owner_email: DOMPurify.sanitize(requestFormDetails?.Technical_Owner_email || '', { ALLOWED_TAGS: [] }),
                        Technical_Owner_name: DOMPurify.sanitize(requestFormDetails?.Technical_Owner_name || '', { ALLOWED_TAGS: [] }),
                        Upload_Object: (workData[0]?.uploadFiles || []).map(f => ({
                            File_Name: DOMPurify.sanitize(f.File_Name || '', { ALLOWED_TAGS: [] }),
                            url: f.url
                        }))
                    };

                    await fetch('https://mnp7960bu6.execute-api.ap-south-1.amazonaws.com/New/newApi/ricew/sendTechnicalManagerEmail', {
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
        if (isStarting) return;
        setIsStarting(true);
        try {
            const idToken = await getIdToken();
            if (!idToken) {
                handleAuthError();
                setIsStarting(false);
                return;
            }

            const userId = localStorage.getItem('user_id') || 'system';
            const projectId = localStorage.getItem('project_id') || selectedProject?.id || row.Project_id || '101';

            const currentTimestamp = new Date().toISOString();

            const payload = {
                Project_id: projectId,
                RICEW_Object: DOMPurify.sanitize(row.RICEW_Object || row.ricewObject || "-", { ALLOWED_TAGS: [] }),
                Assigned_Date: row.assignedDate || "-",
                Start_Object: currentTimestamp,
                End_Date: "",
                Upload_Object: [], // Initialized as empty list to match backend expectation
                created_by: userId,
                updated_by: userId,
                Resource_Roster_Form_id: row.Resource_Roster_Form_id || "",
                RICEWRequestFormId: row.RICEWRequestFormId || id || "",
                TechnicalSpecificationAssignment_id: row.TechnicalSpecificationAssignment_id || ""
            };

            if (row.Technical_Specification_Initiate_Work_id) {
                payload.Technical_Specification_Initiate_Work_id = row.Technical_Specification_Initiate_Work_id;
            }

            const response = await fetch('https://x62hhl9a23.execute-api.ap-south-1.amazonaws.com/New/newApi/ricew/technicalInitiateWork/createSubmit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify(payload)
            });

            if (response.status === 401 || response.status === 403) {
                handleAuthError();
                setIsStarting(false);
                return;
            }

            const result = await response.json();

            if (result.success) {
                setSuccessMsg('Work Initiated Successfully');
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 3000);
                fetchData(); // Refresh data to show Start_Object instead of button
            } else {
                console.error('Failed to initiate work:', result);
                setErrorMsg('Failed to initiate work: ' + (result.error || 'Unknown error'));
                setShowError(true);
                setTimeout(() => setShowError(false), 5000);
            }

        } catch (error) {
            console.error('Error initiating work:', error);
            handleAuthError();
            setErrorMsg('Error initiating work');
            setShowError(true);
            setTimeout(() => setShowError(false), 5000);
        } finally {
            setIsStarting(false);
        }
    };

    const handleAIGeneration = async () => {
        const fileToUse = modalDocuments.find(d => d.file && !d.isUploaded);
        if (!fileToUse) {
            setErrorMsg('Please select a document first in the manual section.');
            setShowError(true);
            setTimeout(() => setShowError(false), 5000);
            return;
        }

        setLoading(true);
        try {
            const idToken = await getIdToken();
            if (!idToken) {
                handleAuthError();
                setLoading(false);
                return;
            }

            const projectId = localStorage.getItem('project_id') || selectedProject?.id || uploadingRow.Project_id || '101';
            const userId = localStorage.getItem('user_id') || 'system';
            const workId = uploadingRow.Technical_Specification_Initiate_Work_id;

            if (!workId) {
                throw new Error("Initiate Work ID not found. Please start the work first.");
            }

            const formData = new FormData();
            formData.append('file', fileToUse.file);

            const apiUrl = `https://plnxwqrwx2y6hcbecnpv2zfkg40cgixi.lambda-url.ap-south-1.on.aws/?project_id=${projectId}&id=${userId}&work_id=${workId}`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            // The AI Generation API returns status: "success" or "error"
            if (response.ok && (result.status === 'success' || result.success)) {
                const docxFile = result.files?.docx;
                if (!docxFile || !docxFile.display_url) {
                    throw new Error("AI Generation succeeded but no document URL was returned.");
                }

                // 2. Save Metadata to DB
                const metadataPayload = {
                    Technical_Specification_Initiate_Work_id: workId,
                    file_name: docxFile.filename || "AI Generated Technical Specification",
                    uploaded_url: docxFile.display_url
                };

                const updateResponse = await fetch('https://oi5gtp4f3l.execute-api.ap-south-1.amazonaws.com/New/update-upload-metadata/Technical-Specification-Initiate-Work-pdf/ai-generate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`
                    },
                    body: JSON.stringify(metadataPayload)
                });

                const updateResult = await updateResponse.json();

                if (updateResponse.ok) {
                    setSuccessMsg('AI Generation and metadata update completed successfully');
                    setShowSuccess(true);
                    setTimeout(() => setShowSuccess(false), 3000);
                    
                    // Update main table
                    fetchData();

                    // Remove the file used for AI generation from the manual list since it was just a source
                    setModalDocuments(prev => {
                        const remaining = prev.filter(d => d.id !== fileToUse.id);
                        if (remaining.length === 0) {
                            return [{ id: Date.now(), file: null, path: '', isUploaded: false, uploadObject: '' }];
                        }
                        return remaining;
                    });

                    // Update current modal view locally for instant feedback
                    setUploadingRow(prev => ({
                        ...prev,
                        AI_Generated_File: [
                            ...(Array.isArray(prev.AI_Generated_File) ? prev.AI_Generated_File : []),
                            {
                                file_name: docxFile.filename,
                                uploaded_url: docxFile.display_url,
                                approved_document: ""
                            }
                        ]
                    }));
                } else {
                    throw new Error(updateResult.error || 'Failed to save AI file metadata');
                }
            } else {
                throw new Error(result.error || result.message || 'AI Generation failed');
            }

        } catch (error) {
            console.error('AI Generation error:', error);
            setErrorMsg(error.message || 'Error triggering AI generation');
            setShowError(true);
            setTimeout(() => setShowError(false), 5000);
        } finally {
            setLoading(false);
        }
    };

    const handleUploadClick = (row) => {
        setUploadingRow(row);

        const realFiles = (row.uploadFiles || []).filter(f =>
            !f.isAI && // Exclude AI files from manual upload list
            f.url && f.url !== '-' && f.url.trim() !== '' &&
            f.File_Name && f.File_Name !== '-' && f.File_Name.trim() !== ''
        );

        if (realFiles.length > 0) {
            setModalDocuments(realFiles.map(f => ({
                id: Date.now() + Math.random(),
                file: null,
                path: f.File_Name,
                isUploaded: true,
                uploadObject: f.url
            })));
        } else {
            setModalDocuments([{ id: Date.now(), file: null, path: '', isUploaded: false, uploadObject: '' }]);
        }

        setFilePath('');
        setSelectedFile(null);

        // Auto-fill from row data if available, otherwise fallback to data from the extra details API
        const initialOwnerName = row.Technical_Owner_Name || requestFormDetails?.Technical_Owner_name || '';
        const initialOwnerEmail = row.Technical_Owner_Email || requestFormDetails?.Technical_Owner_email || '';

        setTechnicalOwnerName(initialOwnerName);
        setTechnicalOwnerEmail(initialOwnerEmail);
        setOriginalBusinessOwnerName(initialOwnerName);
        setOriginalBusinessOwnerEmail(initialOwnerEmail);
        setActiveModalTab('Manual');
        setShowUploadModal(true);
    };

    const handleModalFileChange = (id, e) => {
        const file = e.target.files[0];
        if (file) {
            const allowedExtensions = ['pdf', 'xlsx', 'xls', 'docx', 'doc'];
            const fileExtension = file.name.split('.').pop().toLowerCase();

            if (!allowedExtensions.includes(fileExtension)) {
                setErrorMsg('Invalid file format. Only PDF, Excel, and Word files are allowed.');
                setShowError(true);
                setTimeout(() => setShowError(false), 5000);
                e.target.value = ''; // Reset input
                return;
            }

            setModalDocuments(prev => prev.map(doc =>
                doc.id === id ? { ...doc, file: file, path: file.name } : doc
            ));
        }
    };

    const handleAddModalDoc = () => {
        setModalDocuments(prev => {
            if (prev.length < 5) {
                return [...prev, { id: Date.now() + Math.random(), file: null, path: '', isUploaded: false, uploadObject: '' }];
            }
            return prev;
        });
    };

    const handleRemoveModalDoc = (id) => {
        if (modalDocuments.length > 1) {
            setModalDocuments(prev => prev.filter(doc => doc.id !== id));
        }
    };

    const processFilesUpload = async (idToken, userId) => {
        const newDocs = modalDocuments.filter(d => d.file && !d.isUploaded);
        const existingDocs = modalDocuments.filter(d => d.isUploaded);
        const s3Timestamp = Date.now();

        let allUploadedDocs = [...existingDocs.map(d => ({
            File_Name: DOMPurify.sanitize(d.path || '', { ALLOWED_TAGS: [] }),
            url: d.uploadObject
        }))];

        if (newDocs.length > 0) {
            // 1. Get Presigned URLs for all new docs at once
            const docsPayload = newDocs.map(doc => {
                const extension = doc.file.name.split('.').pop().toLowerCase();
                const baseName = doc.file.name.substring(0, doc.file.name.lastIndexOf('.'));
                const stampedFileName = `${baseName}_${s3Timestamp}.${extension}`;

                let mimeType = 'application/pdf';
                if (extension === 'xlsx') mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                else if (extension === 'xls') mimeType = 'application/vnd.ms-excel';
                else if (extension === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                else if (extension === 'doc') mimeType = 'application/msword';

                return { name: stampedFileName, type: mimeType, originalFile: doc.file, docId: doc.id };
            });

            const presignedUrlResponse = await fetch('https://x62hhl9a23.execute-api.ap-south-1.amazonaws.com/New/generate-presigned-urls/technical-Initiate-Work-pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    resource_roster_form_id: DOMPurify.sanitize(uploadingRow.Resource_Roster_Form_id || '', { ALLOWED_TAGS: [] }),
                    ricew_object: DOMPurify.sanitize(uploadingRow.RICEW_Object || uploadingRow.ricewObject || '', { ALLOWED_TAGS: [] }),
                    documents: docsPayload.map(d => ({ name: d.name, type: d.type }))
                })
            });

            if (presignedUrlResponse.status === 401 || presignedUrlResponse.status === 403) {
                handleAuthError();
                return null;
            }

            const presignedResult = await presignedUrlResponse.json();
            if (!presignedResult.success || !presignedResult.urls) {
                throw new Error(presignedResult.error || 'Failed to generate upload URLs');
            }

            // 2. Upload each file to S3
            for (let i = 0; i < docsPayload.length; i++) {
                const payload = docsPayload[i];
                const urlData = presignedResult.urls.find(u => u.documentName === payload.name);

                if (!urlData) throw new Error(`URL missing for ${payload.name}`);

                const uploadResponse = await fetch(urlData.signedUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': payload.type },
                    body: payload.originalFile
                });

                if (!uploadResponse.ok) throw new Error(`Upload failed for ${payload.originalFile.name}`);

                allUploadedDocs.push({
                    File_Name: DOMPurify.sanitize(payload.name || '', { ALLOWED_TAGS: [] }),
                    url: urlData.publicCloudFrontUrl
                });

                // Update state to show as uploaded
                setModalDocuments(prev => prev.map(d =>
                    d.id === payload.docId ? { ...d, isUploaded: true, path: payload.name, uploadObject: urlData.publicCloudFrontUrl } : d
                ));
            }
        }
        return allUploadedDocs;
    };

    const handleUploadSubmit = async () => {
        setLoading(true);
        try {
            const idToken = await getIdToken();
            if (!idToken) {
                handleAuthError();
                setLoading(false);
                return;
            }
            const userId = localStorage.getItem('user_id') || 'system';

            const allUploadedDocs = await processFilesUpload(idToken, userId);
            if (allUploadedDocs === null) return; // Auth error handled inside

            // 3. Final Metadata Update with all collected files
            const metadataPayload = {
                Project_id: uploadingRow.Project_id || selectedProject?.id || '101',
                RICEW_Object: DOMPurify.sanitize(uploadingRow.ricewObject || uploadingRow.RICEW_Object || '', { ALLOWED_TAGS: [] }),
                Assigned_Date: uploadingRow.assignedDate,
                Start_Object: uploadingRow.startObject || "",
                End_Date: uploadingRow.endDate || "",
                Upload_Object: allUploadedDocs,
                created_by: userId,
                updated_by: userId,
                Resource_Roster_Form_id: DOMPurify.sanitize(uploadingRow.Resource_Roster_Form_id || '', { ALLOWED_TAGS: [] }),
                RICEWRequestFormId: id || uploadingRow.RICEWRequestFormId || "",
                TechnicalSpecificationAssignment_id: DOMPurify.sanitize(uploadingRow.TechnicalSpecificationAssignment_id || '', { ALLOWED_TAGS: [] }),
                AI_Generated_File: uploadingRow.AI_Generated_File || [] // Preserve AI files
            };

            if (uploadingRow.Technical_Specification_Initiate_Work_id) {
                metadataPayload.Technical_Specification_Initiate_Work_id = uploadingRow.Technical_Specification_Initiate_Work_id;
            }

            const metadataUpdateResponse = await fetch('https://x62hhl9a23.execute-api.ap-south-1.amazonaws.com/New/newApi/ricew/technicalInitiateWork/createSubmit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify(metadataPayload)
            });

            if (metadataUpdateResponse.status === 401 || metadataUpdateResponse.status === 403) {
                handleAuthError();
                setLoading(false);
                return;
            }

            const metadataResult = await metadataUpdateResponse.json();
            if (!metadataResult.success) throw new Error(metadataResult.error || 'Failed to update metadata');

            setSuccessMsg('All files uploaded successfully');
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
            fetchData();

        } catch (error) {
            console.error('Submit error:', error);
            setErrorMsg(error.message || 'Error processing files');
            setShowError(true);
            setTimeout(() => setShowError(false), 5000);
        } finally {
            setLoading(false);
        }
    };

    const handleAssignToTechnicalOwner = async () => {
        if (isAssigning) return;
        if (!businessOwnerName.trim() || !businessOwnerEmail.trim() || !!emailError) {
            setErrorMsg('Please enter valid Technical Owner Name and Email');
            setShowError(true);
            setTimeout(() => setShowError(false), 3000);
            return;
        }

        setIsAssigning(true);
        setLoading(true);
        try {
            const idToken = await getIdToken();
            if (!idToken) {
                handleAuthError();
                setLoading(false);
                setIsAssigning(false);
                return;
            }

            const userId = localStorage.getItem('user_id') || 'system';
            const projectId = localStorage.getItem('project_id') || selectedProject?.id || '101';
            const currentTimestamp = new Date().toLocaleString('en-GB', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                hour12: false
            }).replace(',', '');

            // Check if there are pending files to upload
            const hasPendingDocs = modalDocuments.some(d => d.file && !d.isUploaded);

            // Auto-upload any pending files before assignment
            let allUploadedDocs = await processFilesUpload(idToken, userId);
            if (allUploadedDocs === null) return; // Auth error handled inside

            if (allUploadedDocs.length === 0) {
                if (uploadingRow.isUploaded && uploadingRow.uploadFiles && uploadingRow.uploadFiles.length > 0) {
                    allUploadedDocs = uploadingRow.uploadFiles
                        .filter(f => !f.isAI) // Only take manual uploads for Upload_Object
                        .map(f => ({
                            File_Name: DOMPurify.sanitize(f.File_Name || '', { ALLOWED_TAGS: [] }),
                            url: f.url
                        }));
                }
            }

            // If we uploaded new docs, ensure they are "attached" to the technical initiate work record
            if (hasPendingDocs) {
                try {
                    const metadataPayload = {
                        Project_id: uploadingRow.Project_id || selectedProject?.id || '101',
                        RICEW_Object: DOMPurify.sanitize(uploadingRow.ricewObject || uploadingRow.RICEW_Object || '', { ALLOWED_TAGS: [] }),
                        Assigned_Date: uploadingRow.assignedDate,
                        Start_Object: uploadingRow.startObject || "",
                        End_Date: uploadingRow.endDate || "",
                        Upload_Object: allUploadedDocs,
                        created_by: userId,
                        updated_by: userId,
                        Resource_Roster_Form_id: DOMPurify.sanitize(uploadingRow.Resource_Roster_Form_id || '', { ALLOWED_TAGS: [] }),
                        RICEWRequestFormId: id || uploadingRow.RICEWRequestFormId || "",
                        TechnicalSpecificationAssignment_id: DOMPurify.sanitize(uploadingRow.TechnicalSpecificationAssignment_id || '', { ALLOWED_TAGS: [] }),
                        AI_Generated_File: uploadingRow.AI_Generated_File || [] // Preserve AI files
                    };

                    if (uploadingRow.Technical_Specification_Initiate_Work_id) {
                        metadataPayload.Technical_Specification_Initiate_Work_id = uploadingRow.Technical_Specification_Initiate_Work_id;
                    }

                    await fetch('https://x62hhl9a23.execute-api.ap-south-1.amazonaws.com/New/newApi/ricew/technicalInitiateWork/createSubmit', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${idToken}`
                        },
                        body: JSON.stringify(metadataPayload)
                    });
                } catch (updateErr) {
                    console.error("Error attaching files to record during auto-upload:", updateErr);
                }
            }

            const assignedRecord = {
                Initiate_Work_id: uploadingRow.Technical_Specification_Initiate_Work_id ? [uploadingRow.Technical_Specification_Initiate_Work_id] : [],
                Upload_Object: allUploadedDocs,
                Resource_Roster_Form_id: DOMPurify.sanitize(uploadingRow.Resource_Roster_Form_id || '', { ALLOWED_TAGS: [] }),
                RICEWRequestFormId: id || uploadingRow.RICEWRequestFormId || "",
                Email_Address: DOMPurify.sanitize(uploadingRow.Email_Address || '', { ALLOWED_TAGS: [] }),
                RICEW_Object: DOMPurify.sanitize(uploadingRow.ricewObject || '', { ALLOWED_TAGS: [] }),
                TechnicalSpecificationAssignment_id: DOMPurify.sanitize(uploadingRow.TechnicalSpecificationAssignment_id || '', { ALLOWED_TAGS: [] }),
                Project_id: projectId,
                Choose_Resource_Technical: DOMPurify.sanitize(uploadingRow.Choose_Resource_Technical || '', { ALLOWED_TAGS: [] }),
                Technical_Owner_name: DOMPurify.sanitize(businessOwnerName || '', { ALLOWED_TAGS: [] }),
                Technical_Owner_email: DOMPurify.sanitize(businessOwnerEmail || '', { ALLOWED_TAGS: [] }),
                created_by: userId,
                updated_by: userId,
                user_id: userId,
                End_Date: currentTimestamp,
                Comment: DOMPurify.sanitize(uploadingRow.comment || '', { ALLOWED_TAGS: [] }),
                AI_Generated_File: uploadingRow.AI_Generated_File || [] // Explicitly include AI files
            };

            const payload = { records: [assignedRecord] };

            const response = await fetch('https://x62hhl9a23.execute-api.ap-south-1.amazonaws.com/New/newApi/ricew/assignInitiateWorkTechnicalManagerOwner/createSubmit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify(payload)
            });

            if (response.status === 401 || response.status === 403) {
                handleAuthError();
                setLoading(false);
                setIsAssigning(false);
                return;
            }

            const result = await response.json();

            if (result.success) {
                // Save comment if it exists in the modal
                if (uploadingRow.Technical_Specification_Initiate_Work_id) {
                    try {
                        const commentPayload = {
                            Technical_Specification_Initiate_Work_id: uploadingRow.Technical_Specification_Initiate_Work_id,
                            comment_section: DOMPurify.sanitize(uploadingRow.comment || '', { ALLOWED_TAGS: [] })
                        };

                        await fetch('https://mnp7960bu6.execute-api.ap-south-1.amazonaws.com/New/api/TechnicalOwner/UpdateComment', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${idToken}`
                            },
                            body: JSON.stringify(commentPayload)
                        });
                    } catch (commentError) {
                        console.error('Error auto-saving comment during assignment:', commentError);
                    }
                }

                setSuccessMsg('Assigned to Technical Owner successfully');
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 3000);
                setShowUploadModal(false);
                fetchData(); // Refresh to show pending status if applicable
            } else {
                throw new Error(result.error || result.details?.[0]?.error || 'Failed to assign Technical Owner');
            }
        } catch (error) {
            console.error('Assignment error:', error);
            handleAuthError();
            setErrorMsg(error.message || 'Error assigning Technical Owner');
            setShowError(true);
            setTimeout(() => setShowError(false), 5000);
        } finally {
            setLoading(false);
            setIsAssigning(false);
        }
    };

    return (
        <div className="config-main" style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '0', margin: '0', fontFamily: 'Arial, sans-serif' }}>
            <div style={{ padding: '1rem 1rem 2rem 1rem', width: '100%', minWidth: '1250px', margin: '0', boxSizing: 'border-box' }}>

                {/* Main Content Area */}
                <div style={{ backgroundColor: 'white', padding: '0', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>

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
                        <h2 style={{ margin: 0 }}>Initiate Work (Technical Specification)</h2>
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

                            {/* Help Modal Overlay */}
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
                                                        The <strong>Initiate Work (Technical Specification)</strong> page allows technical writers to manage and respond to feedback from RICEW Owners.
                                                    </p>
                                                </div>

                                                <div style={{ marginBottom: '16px' }}>
                                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>Understanding the columns</strong>
                                                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                                        <li><strong>RICEW Object</strong> — The technical specification being worked on.</li>
                                                        <li><strong>Start Object / End Date</strong> — Timestamps tracking your progress.</li>
                                                        <li><strong>Response</strong> — Allows you to upload files and write responses for the specified object.</li>
                                                        <li><strong>Approve Status</strong> — Shows the approval status of your submitted responses.</li>
                                                        <li><strong>Comment</strong> — Displays any comments provided.</li>
                                                    </ul>
                                                </div>

                                                <div style={{ marginBottom: '16px' }}>
                                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to make changes</strong>
                                                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                                        <li>Click the <strong>Start</strong> button to begin work on an assigned RICEW object.</li>
                                                        <li>Use the <strong>Response</strong> button to open the upload form, where you can attach files and write comments.</li>
                                                        <li>Review feedback from the RICEW Owner in the bottom section and submit your responses to address their points.</li>
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
                                minWidth: '1610px'
                            }}>
                                <div style={{ width: '60px', flex: '0 0 60px', padding: '12px 8px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', backgroundColor: 'white', textAlign: 'center' }}>Sr. No.</div>
                                <div style={{ flex: '0 0 250px', width: '250px', padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', backgroundColor: 'white' }}>RICEW Object</div>
                                <div style={{ width: '150px', flex: '0 0 150px', padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', backgroundColor: 'white', textAlign: 'center' }}>Status</div>
                                <div style={{ flex: '0 0 120px', width: '120px', padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', backgroundColor: 'white' }}>Assigned Date</div>
                                <div style={{ flex: '0 0 120px', width: '120px', padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', backgroundColor: 'white' }}>Start Object</div>
                                <div style={{ flex: '0 0 450px', width: '450px', padding: '0', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', backgroundColor: 'white', display: 'flex' }}>
                                    <div style={{ flex: 1, padding: '12px 12px', borderRight: '1px solid #ddd' }}>Response</div>
                                    <div style={{ width: '150px', padding: '12px 12px', flexShrink: 0 }}>Approve Status</div>
                                </div>
                                <div style={{ flex: '0 0 120px', padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', minWidth: '120px', backgroundColor: 'white', borderRight: '1px solid #ddd' }}>End Date</div>
                                <div style={{ flex: 2, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', minWidth: '280px', backgroundColor: 'white' }}>Comment</div>
                            </div>

                            {/* Table Body */}
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                minWidth: '1610px',
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
                                                minWidth: '1610px',
                                                color: '#333'
                                            }}
                                        >
                                            {/* Sr. No. */}
                                            <div style={{ width: '60px', flex: '0 0 60px', padding: '12px 8px', fontSize: '11px', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '500', textAlign: 'center' }}>
                                                {row.isNewRow ? (
                                                    <Trash2
                                                        size={14}
                                                        style={{ cursor: 'pointer', color: '#dc2626' }}
                                                        onClick={() => handleWorkRemoveRow(row.id)}
                                                    />
                                                ) : (row.Technical_Specification_Initiate_Work_id || index + 1)}
                                            </div>

                                            {/* RICEW Object */}
                                            <div style={{ flex: '0 0 250px', width: '250px', padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'center' }}>
                                                {row.ricewObject || '-'}
                                            </div>

                                            {/* Status */}
                                            <div style={{ width: '150px', flex: '0 0 150px', padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <span style={{
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    backgroundColor: requestFormDetails?.RICEW_Status === 'Approved' ? '#d1fae5' :
                                                        requestFormDetails?.RICEW_Status === 'FS Work In Progress' ? '#dbeafe' : '#f3f4f6',
                                                    color: requestFormDetails?.RICEW_Status === 'Approved' ? '#065f46' :
                                                        requestFormDetails?.RICEW_Status === 'FS Work In Progress' ? '#1e40af' : '#374151',
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
                                            <div style={{ flex: '0 0 120px', width: '120px', padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'center' }}>
                                                {formatToDDMMMYYYY(row.assignedDate)}
                                            </div>

                                            {/* Start Object */}
                                            <div style={{ flex: '0 0 120px', width: '120px', padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'center' }}>
                                                {row.isStarted ? (
                                                    <span style={{ fontWeight: '500', color: '#333' }}>{formatToDDMMMYYYY(row.startObject)}</span>
                                                ) : (
                                                    <button
                                                        disabled={isStarting}
                                                        style={{
                                                            backgroundColor: isStarting ? '#6c757d' : '#28a745',
                                                            color: 'white',
                                                            border: 'none',
                                                            padding: '6px 16px',
                                                            borderRadius: '4px',
                                                            cursor: isStarting ? 'not-allowed' : 'pointer',
                                                            fontSize: '12px',
                                                            fontWeight: '500',
                                                            transition: 'background-color 0.2s',
                                                            opacity: isStarting ? 0.7 : 1
                                                        }}
                                                        onMouseEnter={(e) => !isStarting && (e.target.style.backgroundColor = '#218838')}
                                                        onMouseLeave={(e) => !isStarting && (e.target.style.backgroundColor = '#28a745')}
                                                        onClick={() => handleStart(row)}
                                                    >
                                                        {isStarting ? 'Starting...' : 'Start'}
                                                    </button>
                                                )}
                                            </div>

                                            {/* Upload Object + Approve Status */}
                                            <div style={{ flex: '0 0 450px', width: '450px', padding: '0', fontSize: '13px', borderRight: '1px solid #ddd', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                                                {/* Inner column separator spanning full height */}
                                                <div style={{ position: 'absolute', top: 0, bottom: 0, right: '150px', width: '1px', backgroundColor: '#ddd', zIndex: 1 }} />
                                                {!row.isStarted ? (
                                                    <div style={{ display: 'flex', alignItems: 'stretch', minHeight: '44px' }}>
                                                        <div style={{ flex: 1, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</div>
                                                        <div style={{ width: '150px', padding: '8px 12px', display: 'flex', alignItems: 'center', flexShrink: 0, justifyContent: 'center' }}>-</div>
                                                    </div>
                                                ) : (row.statusVerification !== 'pending' && (!row.endDate || row.endDate === '-')) ? (
                                                    <div style={{ display: 'flex', alignItems: 'stretch', minHeight: '44px', flex: 1 }}>
                                                        <div style={{ flex: 1, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                                                                    width: '120px',
                                                                    transition: 'background-color 0.2s'
                                                                }}
                                                                onMouseEnter={(e) => e.target.style.backgroundColor = row.isUploaded ? '#d97706' : '#2563eb'}
                                                                onMouseLeave={(e) => e.target.style.backgroundColor = row.isUploaded ? '#f59e0b' : '#3b82f6'}
                                                                onClick={() => handleUploadClick(row)}
                                                            >
                                                                {row.isUploaded ? 'Re-Response' : 'Response'}
                                                            </button>
                                                        </div>
                                                        <div style={{ width: '150px', padding: '8px 12px', display: 'flex', alignItems: 'center', flexShrink: 0, justifyContent: 'center' }}>-</div>
                                                    </div>
                                                ) : (row.uploadFiles && row.uploadFiles.length > 0) ? (
                                                    row.uploadFiles.map((file, fIdx) => {
                                                        const status = (file.document_approved === 'true' || file.document_approved === 'Approved') ? 'Approved' : 
                                                                      (file.document_approved === 'false' || file.document_approved === 'Rejected') ? 'Rejected' : '-';
                                                        const statusColor = status === 'Approved' ? '#059669' : status === 'Rejected' ? '#dc2626' : '#64748b';
                                                        return (
                                                            <div key={fIdx} style={{ display: 'flex', alignItems: 'stretch', minHeight: '44px', borderBottom: fIdx < row.uploadFiles.length - 1 ? '1px solid #eee' : 'none' }}>
                                                                {/* File name cell */}
                                                                <div style={{ flex: 1, padding: '8px 12px', display: 'flex', alignItems: 'center' }}>
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
                                                                </div>
                                                                {/* Approve Status cell */}
                                                                <div style={{ width: '150px', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: '600', color: statusColor }}>
                                                                    {status}
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <div style={{ display: 'flex', alignItems: 'stretch', minHeight: '44px' }}>
                                                        <div style={{ flex: 1, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</div>
                                                        <div style={{ width: '150px', padding: '8px 12px', display: 'flex', alignItems: 'center', flexShrink: 0, justifyContent: 'center' }}>-</div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* End Date */}
                                            <div style={{ flex: '0 0 120px', width: '120px', padding: '12px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', borderRight: '1px solid #ddd' }}>
                                                {formatToDDMMMYYYY(row.endDate)}
                                            </div>

                                            {/* Comment (Read-only on main page) */}
                                            <div style={{ flex: 2, padding: '8px', fontSize: '13px', minWidth: '280px', display: 'flex', alignItems: 'stretch', position: 'relative' }}>
                                                <textarea
                                                    value={row.comment || ''}
                                                    readOnly={true}
                                                    placeholder="No comments yet..."
                                                    className="thin-scroll-textarea"
                                                    style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        minHeight: '65px',
                                                        border: '1px solid #e2e8f0',
                                                        borderRadius: '4px',
                                                        padding: '5px 8px',
                                                        fontSize: '13px',
                                                        fontFamily: 'Arial, sans-serif',
                                                        resize: 'none',
                                                        outline: 'none',
                                                        color: '#333',
                                                        backgroundColor: '#f5f5f5',
                                                        boxSizing: 'border-box',
                                                        cursor: 'not-allowed'
                                                    }}
                                                />
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

                {/* Feedback Form Container */}
                <div style={{
                    backgroundColor: 'white',
                    padding: '0',
                    borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    marginTop: '30px'
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
                            <label style={{ fontWeight: '600', color: '#333', fontSize: '14px', whiteSpace: 'nowrap' }}>
                                RICEW Object Owner <span style={{ color: 'red' }}>*</span>
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <label style={{ fontSize: '13px', color: 'black', fontWeight: '500' }}>Name <span style={{ fontWeight: 'bold' }}>:</span></label>
                                <input
                                    type="text"
                                    placeholder="Name"
                                    value={requestFormDetails?.Technical_Owner_name || ''}
                                    readOnly={true}
                                    style={{
                                        width: '240px', height: '35px', padding: '0 12px',
                                        border: '1px solid black', borderRadius: '4px',
                                        backgroundColor: '#f5f5f5', fontSize: '13px', color: 'black',
                                        outline: 'none', cursor: 'not-allowed', fontFamily: 'Arial, sans-serif'
                                    }}
                                />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <label style={{ fontSize: '13px', color: 'black', fontWeight: '500' }}>Email Address <span style={{ fontWeight: 'bold' }}>:</span></label>
                                <input
                                    type="email"
                                    placeholder="Email Address"
                                    value={requestFormDetails?.Technical_Owner_email || ''}
                                    readOnly={true}
                                    style={{
                                        width: '300px', height: '35px', padding: '0 12px',
                                        border: '1px solid black', borderRadius: '4px',
                                        backgroundColor: '#f5f5f5', fontSize: '13px', color: 'black',
                                        outline: 'none', cursor: 'not-allowed', fontFamily: 'Arial, sans-serif'
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ padding: '20px' }}>
                            {/* Grid Header */}
                            {/* Column order: Sr.No.(BOF) | Text(BOF) | DocName(BOF) | Technical Owner Decision */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '60px 1.2fr 0.4fr 150px',
                                borderLeft: '1px solid #ddd',
                                borderTop: '1px solid #ddd',
                                borderRadius: '4px 4px 0 0',
                                overflow: 'hidden',
                                backgroundColor: 'white'
                            }}>
                                {/* Group Header Row */}
                                <div style={{ gridColumn: 'span 4', borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '10px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px', backgroundColor: '#fcfcfc' }}>
                                    RICEW Owner (Technical) Feedback
                                </div>
                                {/* Sub-Header Row */}
                                <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#fcfcfc' }}>Sr. No.</div>
                                <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#fcfcfc' }}>Text</div>
                                <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#fcfcfc' }}>Uploaded Document Name</div>
                                <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#fcfcfc' }}>RICEW Owner (Functional) Decision</div>
                            </div>

                            {/* Feedback + Response Data Rows (BOF read-only) */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '60px 1.2fr 0.4fr 150px',
                                borderLeft: '1px solid #ddd',
                                borderRadius: '0 0 4px 4px',
                                overflow: 'hidden',
                                backgroundColor: 'white'
                            }}>
                                {combinedRows.filter(r => r.bof.text || r.bof.fileName).map((row, idx, arr) => {
                                    const isLast = idx === arr.length - 1;
                                    const cellBorderBottom = '1px solid #ddd';
                                    const rowSpan = 1 + (row.subRows?.length || 0);
                                    return (
                                        <React.Fragment key={row.id}>
                                            {/* Col 1: Sr. No. (spans main + all sub-rows) */}
                                            <div style={{
                                                gridRow: `span ${rowSpan}`,
                                                borderBottom: cellBorderBottom,
                                                borderRight: '1px solid #ddd',
                                                padding: '8px',
                                                textAlign: 'center',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '11px',
                                                backgroundColor: row.bof.business_owner_decision === 'Close' ? '#f5f5f5' : '#fcfcfc',
                                                color: row.bof.business_owner_decision === 'Close' ? '#718096' : 'inherit',
                                                borderBottomLeftRadius: isLast && row.subRows?.length === 0 ? '4px' : '0'
                                            }}>
                                                {row.Technical_Specification_Initiate_Work_id || idx + 1}
                                            </div>
                                            {/* Col 2: BOF Text (Read-only) */}
                                            <div style={{ borderBottom: row.subRows?.length > 0 ? '1px solid #eee' : cellBorderBottom, borderRight: '1px solid #ddd', padding: '5px', backgroundColor: row.bof.business_owner_decision === 'Close' ? '#f5f5f5' : '#f9f9f9' }}>
                                                <textarea
                                                    value={row.bof.text}
                                                    readOnly={true}
                                                    style={{ width: '100%', border: 'none', outline: 'none', resize: 'none', minHeight: '35px', fontSize: '13px', fontFamily: 'Arial, sans-serif', padding: '5px', backgroundColor: 'transparent', cursor: 'not-allowed', color: row.bof.business_owner_decision === 'Close' ? '#718096' : '#333' }}
                                                />
                                            </div>
                                            {/* Col 3: BOF Uploaded Document Name */}
                                            <div style={{ borderBottom: row.subRows?.length > 0 ? '1px solid #eee' : cellBorderBottom, borderRight: '1px solid #ddd', padding: '8px 5px', fontSize: '11px', color: row.bof.business_owner_decision === 'Close' ? '#718096' : 'black', display: 'flex', alignItems: 'center', overflow: 'hidden', backgroundColor: row.bof.business_owner_decision === 'Close' ? '#f5f5f5' : 'white' }}>
                                                {row.bof.fileName ? (
                                                    <a href={getFileViewUrl(row.bof.fileUrl, row.bof.fileName)} target="_blank" rel="noopener noreferrer" style={{ color: '#3182ce', textDecoration: 'none', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', pointerEvents: 'auto' }} title={row.bof.fileName}>{row.bof.fileName}</a>
                                                ) : <span style={{ color: '#999' }}>No doc</span>}
                                            </div>
                                            {/* Col 4: Technical Owner Decision */}
                                            <div style={{ borderBottom: row.subRows?.length > 0 ? '1px solid #eee' : cellBorderBottom, borderRight: '1px solid #ddd', padding: '8px 5px', fontSize: '12px', color: row.bof.business_owner_decision === 'Close' ? '#718096' : '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: row.bof.business_owner_decision === 'Close' ? '#f5f5f5' : '#f9fafb', borderBottomRightRadius: isLast && row.subRows?.length === 0 ? '4px' : '0' }}>
                                                {row.bof.business_owner_decision || 'Open'}
                                            </div>
                                            {/* Sub Rows — cols 2-8 rendered per sub-row */}
                                            {row.subRows?.map((subRow, sIdx) => {
                                                const isLastSubRow = sIdx === row.subRows.length - 1;
                                                const subCellBorderBottom = isLastSubRow ? cellBorderBottom : '1px solid #eee';
                                                return (
                                                    <React.Fragment key={subRow.id}>
                                                        {/* Sub Col 2: BOF Sub Text (Read-only) */}
                                                        <div style={{ borderBottom: subCellBorderBottom, borderRight: '1px solid #ddd', padding: '5px', backgroundColor: subRow.bof.business_owner_decision === 'Close' ? '#f5f5f5' : '#fffdee' }}>
                                                            <textarea value={subRow.bof.text} readOnly={true} style={{ width: '100%', border: 'none', outline: 'none', resize: 'none', minHeight: '30px', fontSize: '13px', fontFamily: 'Arial, sans-serif', padding: '5px', backgroundColor: 'transparent', cursor: 'not-allowed', color: subRow.bof.business_owner_decision === 'Close' ? '#718096' : '#333' }} />
                                                        </div>
                                                        {/* Sub Col 3: BOF Sub Uploaded Document Name */}
                                                        <div style={{ borderBottom: subCellBorderBottom, borderRight: '1px solid #ddd', padding: '8px 5px', fontSize: '11px', color: subRow.bof.business_owner_decision === 'Close' ? '#718096' : 'black', display: 'flex', alignItems: 'center', overflow: 'hidden', backgroundColor: subRow.bof.business_owner_decision === 'Close' ? '#f5f5f5' : 'white' }}>
                                                            {subRow.bof.fileName ? <a href={getFileViewUrl(subRow.bof.fileUrl, subRow.bof.fileName)} target="_blank" rel="noopener noreferrer" style={{ color: '#3182ce', textDecoration: 'none', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', pointerEvents: 'auto' }} title={subRow.bof.fileName}>{subRow.bof.fileName}</a> : <span style={{ color: '#999' }}>No doc</span>}
                                                        </div>
                                                        {/* Sub Col 4: BOF Sub Technical Owner Decision */}
                                                        <div style={{ borderBottom: subCellBorderBottom, borderRight: '1px solid #ddd', padding: '8px 5px', fontSize: '12px', color: subRow.bof.business_owner_decision === 'Close' ? '#718096' : '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: subRow.bof.business_owner_decision === 'Close' ? '#f5f5f5' : '#f9fafb', borderBottomRightRadius: isLast && isLastSubRow ? '4px' : '0' }}>
                                                            {subRow.bof.business_owner_decision || 'Open'}
                                                        </div>
                                                    </React.Fragment>
                                                );
                                            })}
                                        </React.Fragment>
                                    );
                                })}
                                {/* Submit Response button */}
                                <div style={{ gridColumn: 'span 3' }} />
                                <div style={{ gridColumn: '4 / span 1', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', padding: '15px 0' }}>
                                    {/* <button
                                        onClick={handleAddRow}
                                        style={{
                                            backgroundColor: '#c6f6d5',
                                            color: '#22543d',
                                            border: '1px solid #9ae6b4',
                                            height: '32px',
                                            width: '140px',
                                            padding: '0px 12px',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            fontWeight: '500',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            whiteSpace: 'nowrap',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#9ae6b4'}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = '#c6f6d5'}
                                    >
                                        + Add Row
                                    </button> */}
                                    {/* <button
                                        onClick={handleSubmitResponse}
                                        style={{
                                            backgroundColor: '#3b82f6',
                                            color: 'white',
                                            border: 'none',
                                            height: '32px',
                                            width: '140px',
                                            padding: '0px 12px',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            fontWeight: '500',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            whiteSpace: 'nowrap',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
                                    >
                                        Submit Response
                                    </button> */}
                                </div>
                                <div style={{ gridColumn: 'span 0' }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {showSuccess && <SuccessMessage message={successMsg} />}
            {showError && <ErrorMessage message={errorMsg} />}

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
                        width: '950px',
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
                                <h2 style={{ fontSize: '18px', margin: 0 }}>Upload Form (Technical Specification)</h2>
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <div 
                                        onClick={() => setActiveModalTab('Manual')}
                                        style={{ 
                                            fontSize: '14px', 
                                            fontWeight: '600', 
                                            cursor: 'pointer',
                                            color: activeModalTab === 'Manual' ? '#3b82f6' : '#666',
                                            borderBottom: activeModalTab === 'Manual' ? '2px solid #3b82f6' : 'none',
                                            padding: '4px 0',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        Manual
                                    </div>
                                    <div 
                                        onClick={() => setActiveModalTab('AI Generation')}
                                        style={{ 
                                            fontSize: '14px', 
                                            fontWeight: '600', 
                                            cursor: 'pointer',
                                            color: activeModalTab === 'AI Generation' ? '#3b82f6' : '#666',
                                            borderBottom: activeModalTab === 'AI Generation' ? '2px solid #3b82f6' : 'none',
                                            padding: '4px 0',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        AI Generation
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowUploadModal(false)}
                                style={{
                                    border: 'none',
                                    background: 'none',
                                    cursor: 'pointer',
                                    fontSize: '24px',
                                    color: 'black',
                                    fontWeight: '300',
                                    lineHeight: '1'
                                }}
                            >
                                ×
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="thin-scroll" style={{ padding: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
                            {modalDocuments.map((doc, index) => (
                                <div key={doc.id} style={{
                                    display: 'flex',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    overflow: 'hidden',
                                    width: '100%',
                                    marginBottom: '10px'
                                }}>
                                    {/* Label Column */}
                                    <div style={{
                                        flex: '0 0 120px',
                                        padding: '10px 15px',
                                        borderRight: '1px solid #ddd',
                                        fontWeight: 'bold',
                                        fontSize: '13px',
                                        color: '#333',
                                        backgroundColor: '#f8f9fa',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}>
                                        <span>Document</span>
                                        {modalDocuments.length < 5 && (
                                            <button
                                                onClick={handleAddModalDoc}
                                                style={{
                                                    background: '#ebf8ff',
                                                    border: '1px solid #3b82f6',
                                                    color: '#3b82f6',
                                                    cursor: 'pointer',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    marginLeft: '5px'
                                                }}
                                                title="Add another document (Max 5)"
                                            >
                                                <Plus size={14} strokeWidth={3} />
                                            </button>
                                        )}
                                    </div>

                                    {/* File Input Column */}
                                    <div style={{
                                        flex: 1,
                                        padding: '5px 10px',
                                        borderRight: '1px solid #ddd',
                                        backgroundColor: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        <input
                                            type="text"
                                            readOnly
                                            value={doc.path || "Choose PDF, Excel or Word file"}
                                            style={{
                                                flex: 1,
                                                height: '30px',
                                                padding: '0 10px',
                                                fontSize: '12px',
                                                fontFamily: 'Arial, sans-serif',
                                                border: '1px solid #ccc',
                                                borderRadius: '4px',
                                                backgroundColor: '#f9f9f9',
                                                color: doc.isUploaded ? '#059669' : (doc.path ? '#333' : '#dc3545'),
                                                fontWeight: doc.path ? 'normal' : '500'
                                            }}
                                        />
                                        <button
                                            onClick={() => document.getElementById(`modal-file-input-${doc.id}`).click()}
                                            disabled={doc.isUploaded}
                                            style={{
                                                padding: '0 12px',
                                                height: '30px',
                                                backgroundColor: doc.isUploaded ? '#f3f4f6' : '#6366f1',
                                                color: doc.isUploaded ? '#9ca3af' : 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: doc.isUploaded ? 'not-allowed' : 'pointer',
                                                fontSize: '11px',
                                                fontWeight: '500',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            Browse...
                                        </button>
                                        {doc.isUploaded && doc.uploadObject && (
                                            <a
                                                href={getFileViewUrl(doc.uploadObject, doc.path)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    padding: '0 15px',
                                                    height: '30px',
                                                    backgroundColor: 'white',
                                                    color: '#3b82f6',
                                                    border: '1px solid #3b82f6',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    fontSize: '10px',
                                                    fontWeight: '700',
                                                    textDecoration: 'none',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    whiteSpace: 'nowrap',
                                                    letterSpacing: '0.5px',
                                                    textTransform: 'uppercase',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.target.style.backgroundColor = '#3b82f6';
                                                    e.target.style.color = 'white';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.target.style.backgroundColor = 'white';
                                                    e.target.style.color = '#3b82f6';
                                                }}
                                            >
                                                View
                                            </a>
                                        )}
                                        <input
                                            id={`modal-file-input-${doc.id}`}
                                            type="file"
                                            onChange={(e) => handleModalFileChange(doc.id, e)}
                                            accept=".pdf, .xlsx, .xls, .docx, .doc"
                                            style={{ display: 'none' }}
                                        />
                                        {modalDocuments.length > 1 && (
                                            <button
                                                onClick={() => handleRemoveModalDoc(doc.id)}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: '#ef4444',
                                                    cursor: 'pointer',
                                                    padding: '2px'
                                                }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Status Column */}
                                    <div style={{
                                        flex: '0 0 100px',
                                        backgroundColor: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '0 5px'
                                    }}>
                                        {doc.isUploaded ? (
                                            <span style={{ fontSize: '11px', color: '#059669', fontWeight: 'bold' }}>Uploaded</span>
                                        ) : (
                                            <span style={{ fontSize: '11px', color: '#999' }}>Pending</span>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* AI Generated File Section */}
                            {(() => {
                                const rawAiFile = uploadingRow?.AI_Generated_File;
                                const aiFiles = Array.isArray(rawAiFile) ? rawAiFile : (rawAiFile ? [rawAiFile] : []);
                                return aiFiles.map((aiFile, idx) => (
                                    aiFile && aiFile.uploaded_url && aiFile.uploaded_url !== '-' && (
                                        <div key={`ai-${idx}`} style={{
                                            display: 'flex',
                                            border: '1px solid #28a745',
                                            borderRadius: '4px',
                                            overflow: 'hidden',
                                            width: '100%',
                                            marginBottom: '10px',
                                            backgroundColor: '#f0fff4'
                                        }}>
                                            <div style={{
                                                flex: '0 0 120px',
                                                padding: '10px 15px',
                                                borderRight: '1px solid #28a745',
                                                fontWeight: 'bold',
                                                fontSize: '13px',
                                                color: '#22543d',
                                                backgroundColor: '#c6f6d5',
                                                display: 'flex',
                                                alignItems: 'center'
                                            }}>
                                                AI Generated {aiFiles.length > 1 ? `#${idx + 1}` : ''}
                                            </div>
                                            <div style={{
                                                flex: 1,
                                                padding: '5px 10px',
                                                borderRight: '1px solid #ddd',
                                                backgroundColor: 'white',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}>
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={aiFile.file_name || "Generated Specification"}
                                                    style={{
                                                        flex: 1,
                                                        height: '30px',
                                                        padding: '0 10px',
                                                        fontSize: '12px',
                                                        fontFamily: 'Arial, sans-serif',
                                                        border: '1px solid #9ae6b4',
                                                        borderRadius: '4px',
                                                        backgroundColor: '#f9f9f9',
                                                        color: '#22543d'
                                                    }}
                                                />
                                                <a
                                                    href={getFileViewUrl(aiFile.uploaded_url, aiFile.file_name)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        padding: '0 15px',
                                                        height: '30px',
                                                        backgroundColor: 'white',
                                                        color: '#28a745',
                                                        border: '1px solid #28a745',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        fontSize: '10px',
                                                        fontWeight: '700',
                                                        textDecoration: 'none',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        whiteSpace: 'nowrap',
                                                        textTransform: 'uppercase',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.target.style.backgroundColor = '#28a745';
                                                        e.target.style.color = 'white';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.target.style.backgroundColor = 'white';
                                                        e.target.style.color = '#28a745';
                                                    }}
                                                >
                                                    View
                                                </a>
                                            </div>
                                            <div style={{
                                                flex: '0 0 100px',
                                                backgroundColor: 'white',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                padding: '0 5px'
                                            }}>
                                                <span style={{ fontSize: '11px', color: '#059669', fontWeight: 'bold' }}>Ready</span>
                                            </div>
                                        </div>
                                    )
                                ));
                            })()}

                            {/* Global Upload / Build Button */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '15px', marginBottom: '20px', gap: '10px' }}>
                                {activeModalTab === 'Manual' ? (
                                    <button
                                        onClick={handleUploadSubmit}
                                        disabled={loading || !modalDocuments.some(d => d.file && !d.isUploaded)}
                                        style={{
                                            backgroundColor: (loading || !modalDocuments.some(d => d.file && !d.isUploaded)) ? '#cccccc' : '#3b82f6',
                                            color: 'white',
                                            border: 'none',
                                            padding: '8px 25px',
                                            borderRadius: '4px',
                                            cursor: (loading || !modalDocuments.some(d => d.file && !d.isUploaded)) ? 'not-allowed' : 'pointer',
                                            fontSize: '13px',
                                            fontWeight: '600'
                                        }}
                                    >
                                        {loading ? 'Uploading...' : 'Upload All'}
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleAIGeneration}
                                        disabled={loading}
                                        style={{
                                            backgroundColor: loading ? '#cccccc' : '#28a745',
                                            color: 'white',
                                            border: 'none',
                                            padding: '8px 25px',
                                            borderRadius: '4px',
                                            cursor: loading ? 'not-allowed' : 'pointer',
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!loading) {
                                                e.target.style.backgroundColor = '#218838';
                                                e.target.style.transform = 'translateY(-1px)';
                                                e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!loading) {
                                                e.target.style.backgroundColor = '#28a745';
                                                e.target.style.transform = 'none';
                                                e.target.style.boxShadow = 'none';
                                            }
                                        }}
                                    >
                                        {loading ? 'Generating...' : 'Build'}
                                    </button>
                                )}
                            </div>
                            {/* Comment Section inside Modal */}
                            <div style={{
                                display: 'flex',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                overflow: 'hidden',
                                width: '100%',
                                marginBottom: '20px'
                            }}>
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
                                    Comment
                                </div>
                                <div style={{ flex: 1, backgroundColor: 'white', padding: '10px' }}>
                                    <textarea
                                        value={uploadingRow?.comment || ''}
                                        onChange={(e) => {
                                            const newVal = e.target.value;
                                            setUploadingRow(prev => ({ ...prev, comment: newVal }));
                                            // Sync back to workData
                                            setWorkData(prev => prev.map(row =>
                                                row.Technical_Specification_Initiate_Work_id === uploadingRow?.Technical_Specification_Initiate_Work_id ? { ...row, comment: newVal } : row
                                            ));
                                        }}
                                        placeholder="Add comment..."
                                        className="thin-scroll-textarea"
                                        style={{
                                            width: '100%',
                                            minHeight: '80px',
                                            border: '1px solid #ccc',
                                            borderRadius: '4px',
                                            padding: '8px 12px',
                                            fontSize: '13px',
                                            fontFamily: 'Arial, sans-serif',
                                            resize: 'vertical',
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Spacing if no view box */}
                            {!uploadingRow?.isUploaded && <div style={{ marginBottom: '20px' }}></div>}

                            {/* Technical Owner Section */}
                            <div style={{
                                display: 'flex',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                overflow: 'visible',
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
                                    RICEW Owner (Functional)
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
                                            Name <span style={{ color: '#ef4444' }}>*</span>
                                        </div>
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                                            <GenericUserAutocomplete
                                                value={businessOwnerName}
                                                onChange={(selectedValue) => {
                                                    if (!selectedValue) {
                                                        setTechnicalOwnerName('');
                                                        setTechnicalOwnerEmail('');
                                                        setNameError("");
                                                        setEmailError("");
                                                        setIsCustomEntry(false);
                                                        return;
                                                    }
                                                    const selectedMember = implementationRosterOptions.find(item => item.full_name === selectedValue);
                                                    if (selectedMember) {
                                                        setTechnicalOwnerName(selectedMember.full_name);
                                                        setTechnicalOwnerEmail(selectedMember.email);
                                                        setNameError("");
                                                        setEmailError("");
                                                        setIsCustomEntry(false);
                                                    } else {
                                                        setTechnicalOwnerName(selectedValue);
                                                        if (selectedValue !== businessOwnerName) {
                                                            setTechnicalOwnerEmail('');
                                                        }
                                                        setNameError("");
                                                        setIsCustomEntry(true);
                                                    }
                                                }}
                                                options={implementationRosterOptions.map(option => ({
                                                    label: option.full_name,
                                                    value: option.full_name,
                                                    subLabel: option.email
                                                }))}
                                                placeholder="Select RICEW Owner (Functional)..."
                                                error={!!nameError}
                                                dropUp={true}
                                                includeSubLabelInInput={false}
                                                allowFreeText={true}
                                            />
                                            {nameError && (
                                                <div style={{
                                                    color: '#ef4444',
                                                    fontSize: '11px',
                                                    marginTop: '2px',
                                                    lineHeight: '1'
                                                }}>
                                                    {nameError}
                                                </div>
                                            )}
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
                                            Email Address <span style={{ color: '#ef4444' }}>*</span>
                                        </div>
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                                            <input
                                                type="email"
                                                value={businessOwnerEmail}
                                                readOnly={!isCustomEntry}
                                                disabled={!isCustomEntry}
                                                onChange={(e) => {
                                                    if (isCustomEntry) {
                                                        const value = e.target.value;
                                                        setTechnicalOwnerEmail(value);
                                                        setEmailError(validateEmail(value));
                                                    }
                                                }}
                                                placeholder={isCustomEntry ? "Enter Email Address" : "Auto-populated Email"}
                                                style={{
                                                    width: '100%',
                                                    height: '32px',
                                                    padding: '0 10px',
                                                    fontSize: '13px',
                                                    fontFamily: 'Arial, sans-serif',
                                                    border: `1px solid ${emailError ? '#ef4444' : '#ccc'}`,
                                                    borderRadius: '4px',
                                                    backgroundColor: 'white',
                                                    color: '#333',
                                                    boxSizing: 'border-box'
                                                }}
                                            />
                                            {emailError && (
                                                <div style={{
                                                    color: '#ef4444',
                                                    fontSize: '11px',
                                                    marginTop: '2px',
                                                    lineHeight: '1'
                                                }}>
                                                    {emailError}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Assign to Technical Owner Button Container */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                                marginTop: '10px',
                                marginBottom: '10px',
                                marginRight: '0px'
                            }}>
                                {(() => {
                                    const isButtonDisabled = isAssigning || !businessOwnerName.trim() || !businessOwnerEmail.trim() || !!emailError || !!nameError;
                                    return (
                                        <button
                                            onClick={handleAssignToTechnicalOwner}
                                            disabled={isButtonDisabled}
                                            style={{
                                                backgroundColor: isButtonDisabled ? '#cccccc' : '#28a745',
                                                color: 'white',
                                                border: 'none',
                                                padding: '10px 20px',
                                                borderRadius: '4px',
                                                cursor: isButtonDisabled ? 'not-allowed' : 'pointer',
                                                fontSize: '13px',
                                                fontWeight: '600',
                                                transition: 'all 0.2s',
                                                boxShadow: isButtonDisabled ? 'none' : '0 2px 4px rgba(0,0,0,0.1)',
                                                opacity: isButtonDisabled ? 0.8 : 1
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!isButtonDisabled) {
                                                    e.target.style.backgroundColor = '#218838';
                                                    e.target.style.transform = 'translateY(-1px)';
                                                    e.target.style.boxShadow = '0 4px 6px rgba(0,0,0,0.15)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isButtonDisabled) {
                                                    e.target.style.backgroundColor = '#28a745';
                                                    e.target.style.transform = 'none';
                                                    e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                                                }
                                            }}
                                        >
                                            {isAssigning ? 'Assigning...' : 'Assign Client RICEW Owner (Functional)'}
                                        </button>
                                    );
                                })()}
                            </div>
                        </div>


                    </div>
                </div>
            )}
            {/* Global Loader Overlay */}
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

            <style>
                {`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .thin-scroll-textarea::-webkit-scrollbar {
                    width: 6px;
                }
                .thin-scroll-textarea::-webkit-scrollbar-track {
                    background: #f1f1f1;
                }
                .thin-scroll-textarea::-webkit-scrollbar-thumb {
                    background: #ccc;
                    border-radius: 3px;
                }
                .thin-scroll-textarea::-webkit-scrollbar-thumb:hover {
                    background: #bbb;
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
                `}
            </style>
        </div>
    );
};

export default TechnicalSpecificationWriterInitiateWork;
