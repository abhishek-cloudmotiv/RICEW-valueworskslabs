import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { Trash2, Plus, Send, HelpCircle, X } from 'lucide-react';
import { getIdToken } from '../../../utils/cognito-auth';
import DOMPurify from 'dompurify';
import { useSession } from '../../../context/SessionContext';

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

// Helper Messages
const SuccessMessage = ({ message }) => (
    <div style={{
        position: 'fixed', top: '20px', right: '20px', backgroundColor: '#10b981', color: 'white',
        padding: '12px 20px', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 10000, fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px'
    }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22,4 12,14.01 9,11.01" />
        </svg>
        {message}
    </div>
);

const ErrorMessage = ({ message }) => (
    <div style={{
        position: 'fixed', top: '20px', right: '20px', backgroundColor: '#ef4444', color: 'white',
        padding: '12px 20px', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 10000, fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px'
    }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
        </svg>
        {message}
    </div>
);

const FunctionalTestingSpecificationInitiateWork = ({ selectedProject }) => {
    const { id } = useParams();
    const { handleAuthError } = useSession();
    const [workData, setWorkData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [isAssigning, setIsAssigning] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showError, setShowError] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
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
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadingRow, setUploadingRow] = useState(null);
    const [modalComment, setModalComment] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [filePath, setFilePath] = useState('');
    const [businessOwnerName, setTechnicalOwnerName] = useState('');
    const [businessOwnerEmail, setTechnicalOwnerEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [nameError, setNameError] = useState('');
    const [requestFormDetails, setRequestFormDetails] = useState(null);
    const [modalDocuments, setModalDocuments] = useState([{ id: Date.now(), file: null, path: '', isUploaded: false, uploadObject: '' }]);
    const [aiDocuments, setAIDocuments] = useState([
        { id: 'func', label: 'Functional Specification', file: null, path: '' },
        { id: 'tech', label: 'Technical Specification', file: null, path: '' },
        { id: 'code', label: 'Code file', file: null, path: '' }
    ]);
    const [activeModalTab, setActiveModalTab] = useState('Manual');
    const [combinedRows, setCombinedRows] = useState([]);
    const [clientRoster, setClientRoster] = useState([]);
    const [showRosterLOV, setShowRosterLOV] = useState(false);
    const lovRef = useRef(null);
    const prevOwnerNameRef = useRef('');
    const prevOwnerEmailRef = useRef('');
    const lovSelectionMadeRef = useRef(false);
    const isTabNavigationRef = useRef(false);

    const validateEmail = (email) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) return "";
        return regex.test(email) ? "" : "Please enter a valid email address";
    };

    const fetchFeedback = useCallback(async (assignmentId) => {
        if (!assignmentId) return;
        const normalizeDecision = (val) => {
            if (!val) return 'Open';
            const lower = val.toLowerCase();
            if (lower === 'close' || lower === 'closed') return 'Close';
            if (lower === 'open') return 'Open';
            return val;
        };

        try {
            const idToken = await getIdToken();
            if (!idToken) {
                handleAuthError(401);
                return;
            }
            const response = await fetch(
                `https://m0834h3b33.execute-api.ap-south-1.amazonaws.com/New/api/FunctionalTestingFeedback/FetchAll?Functional_Testing_Assignment_id=${assignmentId}`,
                { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` } }
            );
            if (response.status === 401 || response.status === 403) {
                handleAuthError(response.status);
                return;
            }
            const result = await response.json();
            if (result.success && result.data && result.data.length > 0) {
                // DEBUG: Log first item to confirm actual field names from API
                console.log('[FT Feedback] First item field keys:', Object.keys(result.data[0]));
                console.log('[FT Feedback] First item raw data:', result.data[0]);
                const newCombinedRows = result.data.map(item => {
                    // API response uses "tester_responses" (not "functional_tester_responses")
                    const resMain = item.tester_responses && item.tester_responses.length > 0 ? item.tester_responses[0] : null;

                    // Primary key field from API is "SI_FT_Technical_Owner_feedback_id"
                    const feedbackId = item.SI_FT_Technical_Owner_feedback_id || '';

                    return {
                        id: feedbackId || Date.now() + Math.random(),
                        Functional_Testing_Initiate_Work_id: item.Functional_Testing_Initiate_Work_id || '',
                        bof: {
                            text: DOMPurify.sanitize(item.feedback_text || '', { ALLOWED_TAGS: [] }),
                            fileName: DOMPurify.sanitize(item.supported_doccument_name || '', { ALLOWED_TAGS: [] }),
                            fileUrl: DOMPurify.sanitize(item.supported_doccument || '#', { ALLOWED_TAGS: [] }),
                            // Decision field from API is "SI_Technical_Owner_Decision_open_closed"
                            business_owner_decision: normalizeDecision(item.SI_Technical_Owner_Decision_open_closed),
                            feedback_business_owner_id: feedbackId
                        },
                        fswrn: {
                            text: resMain ? DOMPurify.sanitize(resMain.feedback_text || '', { ALLOWED_TAGS: [] }) : '',
                            fileName: resMain ? DOMPurify.sanitize(resMain.supported_doccument_name || '', { ALLOWED_TAGS: [] }) : '',
                            fileUrl: resMain ? DOMPurify.sanitize(resMain.supported_doccument || '', { ALLOWED_TAGS: [] }) : '',
                            // PK from tester response is "Functional_Tester_feedback_SI_id"
                            rice_Functional_Testing_Writer_feedback_id: resMain ? (resMain.Functional_Tester_feedback_SI_id || '') : ''
                        },
                        subRows: item.sub_feedbacks ? item.sub_feedbacks.map(subItem => {
                            const resSub = subItem.tester_responses && subItem.tester_responses.length > 0 ? subItem.tester_responses[0] : null;
                            const subFeedbackId = subItem.SI_FT_Technical_Owner_feedback_id || '';
                            return {
                                id: subFeedbackId || Date.now() + Math.random(),
                                bof: {
                                    text: DOMPurify.sanitize(subItem.feedback_text || '', { ALLOWED_TAGS: [] }),
                                    fileName: DOMPurify.sanitize(subItem.supported_doccument_name || '', { ALLOWED_TAGS: [] }),
                                    fileUrl: DOMPurify.sanitize(subItem.supported_doccument || '#', { ALLOWED_TAGS: [] }),
                                    business_owner_decision: normalizeDecision(subItem.SI_Technical_Owner_Decision_open_closed),
                                    feedback_business_owner_id: subFeedbackId
                                },
                                fswrn: {
                                    text: resSub ? DOMPurify.sanitize(resSub.feedback_text || '', { ALLOWED_TAGS: [] }) : '',
                                    fileName: resSub ? DOMPurify.sanitize(resSub.supported_doccument_name || '', { ALLOWED_TAGS: [] }) : '',
                                    fileUrl: resSub ? DOMPurify.sanitize(resSub.supported_doccument || '', { ALLOWED_TAGS: [] }) : '',
                                    rice_Functional_Testing_Writer_feedback_id: resSub ? (resSub.Functional_Tester_feedback_SI_id || '') : ''
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
    }, [handleAuthError]);

    const fetchData = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const idToken = await getIdToken();
            if (!idToken) {
                handleAuthError(401);
                setLoading(false);
                return;
            }
            const projectId = localStorage.getItem('project_id') || selectedProject?.id || '101';
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken} `
            };

            // Fetch Request Form Details
            try {
                const detailsResponse = await fetch(`https://h78086ug8d.execute-api.ap-south-1.amazonaws.com/New/api/ricew/assignInitiateWorkSITechnicalOwnerFunctionalTesting/detailInfo?project_id=${projectId}&ricew_id=${id}`, { headers });
                if (detailsResponse.status === 401 || detailsResponse.status === 403) {
                    handleAuthError(detailsResponse.status);
                    setLoading(false);
                    return;
                }
                const detailsResult = await detailsResponse.json();
                if (detailsResult.success) {
                    setRequestFormDetails(detailsResult.data);
                }
            } catch (error) {
                console.error("Error fetching request form details:", error);
            }



            // Fetch Assignments
            const assignmentResponse = await fetch(`https://h78086ug8d.execute-api.ap-south-1.amazonaws.com/New/api/ricew/functionalTestingAssignment/byRequestForm?RICEWRequestFormId=${id}`, { headers });
            if (assignmentResponse.status === 401 || assignmentResponse.status === 403) {
                handleAuthError(assignmentResponse.status);
                setLoading(false);
                return;
            }
            const assignmentResult = await assignmentResponse.json();

            if (assignmentResult.success && assignmentResult.data) {
                // Fetch Initiated Work for each assignment
                const initiatedWorkPromises = assignmentResult.data.map(async (assignment) => {
                    try {
                        const response = await fetch(
                            `https://h78086ug8d.execute-api.ap-south-1.amazonaws.com/New/api/ricew/functionalTestingInitiateWork/byProjectAndAssignment?project_id=${projectId}&assignment_id=${assignment.Functional_Testing_Assignment_id}`,
                            { headers }
                        );
                        if (response.status === 401 || response.status === 403) {
                            handleAuthError(response.status);
                            return { assignmentId: assignment.Functional_Testing_Assignment_id, data: [] };
                        }
                        const result = await response.json();
                        return {
                            assignmentId: assignment.Functional_Testing_Assignment_id,
                            data: result.success && result.data && result.data.length > 0 ? result.data : []
                        };
                    } catch (error) {
                        return { assignmentId: assignment.Functional_Testing_Assignment_id, data: [] };
                    }
                });

                const initiatedWorkResults = await Promise.all(initiatedWorkPromises);
                const initiatedWorkMap = new Map();
                initiatedWorkResults.forEach(result => {
                    if (result.data) {
                        initiatedWorkMap.set(result.assignmentId, result.data);
                    }
                });

                const mappedData = assignmentResult.data.flatMap(item => {
                    const initiatedWorkList = initiatedWorkMap.get(item.Functional_Testing_Assignment_id) || [];

                    if (initiatedWorkList.length === 0) {
                        return [{
                            ...item,
                            Functional_Testing_Initiate_Work_id: '',
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

                    return initiatedWorkList.map(initiatedWork => {
                        let allFiles = [];
                        let displayFileName = '-';
                        let primaryUrl = '-';

                        if (Array.isArray(initiatedWork?.Upload_Object)) {
                            allFiles = initiatedWork.Upload_Object.filter(f => f.url && f.url !== '-' && f.url.trim() !== '').map(f => ({
                                File_Name: DOMPurify.sanitize(f.File_Name || '', { ALLOWED_TAGS: [] }),
                                url: DOMPurify.sanitize(f.url || '', { ALLOWED_TAGS: [] }),
                                document_approved: f.document_approved
                            }));
                            if (allFiles.length > 0) {
                                displayFileName = allFiles[0].File_Name || '-';
                                primaryUrl = allFiles[0].url || '-';
                            }
                        } else if (typeof initiatedWork?.Upload_Object === 'string' && initiatedWork.Upload_Object.trim() !== '' && initiatedWork.Upload_Object !== '-') {
                            primaryUrl = DOMPurify.sanitize(initiatedWork.Upload_Object, { ALLOWED_TAGS: [] });
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
                                File_Name: DOMPurify.sanitize(f.file_name || 'AI Generated Testing Spec', { ALLOWED_TAGS: [] }),
                                url: f.uploaded_url,
                                document_approved: f.approved_document || "",
                                isAI: true
                            }));

                        const unifiedFiles = [...allFiles, ...aiFiles];

                        return {
                            ...item,
                            Functional_Testing_Initiate_Work_id: initiatedWork?.Functional_Testing_Initiate_Work_id || '',
                            ricewObject: DOMPurify.sanitize(item.RICEW_Object || '-', { ALLOWED_TAGS: [] }),
                            assignedDate: formatToIST(item.assign_object_date || item.created_timestamp) || '-',
                            startObject: initiatedWork ? initiatedWork.Start_Object : '-',
                            uploadObject: primaryUrl,
                            uploadFiles: unifiedFiles,
                            AI_Generated_File: initiatedWork?.AI_Generated_File || [], // Keep raw for modal logic
                            fileName: displayFileName,
                            endDate: initiatedWork ? initiatedWork.End_Date : '-',
                            comment: DOMPurify.sanitize(initiatedWork?.comment_section || initiatedWork?.comment || '', { ALLOWED_TAGS: [] }),
                            isStarted: !!initiatedWork,
                            isUploaded: hasUploadedFile || aiFiles.length > 0,
                            statusVerification: DOMPurify.sanitize(initiatedWork?.status_verification || '-', { ALLOWED_TAGS: [] }),
                            Client_Owner_name: DOMPurify.sanitize(initiatedWork?.Client_Owner_name || '', { ALLOWED_TAGS: [] }),
                            Client_Owner_email: DOMPurify.sanitize(initiatedWork?.Client_Owner_email || '', { ALLOWED_TAGS: [] })
                        };
                    });
                });

                mappedData.sort((a, b) => {
                    const idA = parseInt(a.Functional_Testing_Initiate_Work_id || '0', 10);
                    const idB = parseInt(b.Functional_Testing_Initiate_Work_id || '0', 10);
                    // Rows without an ID (not yet started) go last
                    if (idA === 0 && idB !== 0) return 1;
                    if (idA !== 0 && idB === 0) return -1;
                    // Ascending — largest (latest) ID last
                    return idA - idB;
                });

                setWorkData(mappedData);
                if (assignmentResult.data.length > 0) {
                    fetchFeedback(assignmentResult.data[0].Functional_Testing_Assignment_id);
                }
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    }, [id, fetchFeedback, handleAuthError]);

    const fetchClientRoster = useCallback(async () => {
        try {
            const idToken = await getIdToken();
            if (!idToken) {
                handleAuthError(401);
                return;
            }
            const projectId = localStorage.getItem('project_id') || selectedProject?.id || '101';
            const response = await fetch(`https://h78086ug8d.execute-api.ap-south-1.amazonaws.com/New/api/ClientRosterForm/getAll?project_id=${projectId}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                }
            });
            if (response.status === 401 || response.status === 403) {
                handleAuthError(response.status);
                return;
            }
            const result = await response.json();
            if (result.success && result.data) {
                setClientRoster(result.data);
            }
        } catch (error) {
            console.error("Error fetching client roster:", error);
        }
    }, [selectedProject, handleAuthError]);

    useEffect(() => {
        fetchData();
        fetchClientRoster();
    }, [fetchData, fetchClientRoster]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (lovRef.current && !lovRef.current.contains(event.target)) {
                if (!lovSelectionMadeRef.current) {
                    // Restore original values if no selection made
                    if (prevOwnerNameRef.current) setTechnicalOwnerName(prevOwnerNameRef.current);
                    if (prevOwnerEmailRef.current) setTechnicalOwnerEmail(prevOwnerEmailRef.current);
                }
                lovSelectionMadeRef.current = false;
                setShowRosterLOV(false);
            }
        };

        const handleKeyDownGlobal = (e) => {
            if (e.key === 'Tab') {
                isTabNavigationRef.current = true;
                setTimeout(() => { isTabNavigationRef.current = false; }, 200);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDownGlobal);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDownGlobal);
        };
    }, []);


    const handleStart = async (row) => {
        setIsStarting(true);
        setLoading(true);
        try {
            const idToken = await getIdToken();
            if (!idToken) {
                handleAuthError(401);
                setIsStarting(false);
                setLoading(false);
                return;
            }
            const userId = localStorage.getItem('user_id') || 'system';
            const projectId = localStorage.getItem('project_id') || selectedProject?.id || row.Project_id || '101';
            const currentTimestamp = new Date().toISOString();

            const payload = {
                Functional_Testing_Initiate_Work_id: "",
                Functional_Testing_Assignment_id: row.Functional_Testing_Assignment_id,
                RICEWRequestFormId: id,
                RICEW_Object: DOMPurify.sanitize(row.ricewObject || '', { ALLOWED_TAGS: [] }),
                Project_id: projectId,
                Start_Object: currentTimestamp,
                Assigned_Date: DOMPurify.sanitize(row.assignedDate || "", { ALLOWED_TAGS: [] }),
                Resource_Roster_Form_id: row.Resource_Roster_Form_id,
                created_by: userId
            };

            const response = await fetch('https://h78086ug8d.execute-api.ap-south-1.amazonaws.com/New/api/ricew/functionalTestingInitiateWork/createSubmit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                body: JSON.stringify(payload)
            });

            if (response.status === 401 || response.status === 403) {
                handleAuthError(response.status);
                setIsStarting(false);
                setLoading(false);
                return;
            }

            const result = await response.json();
            if (result.success) {
                setSuccessMsg("Work started successfully");
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 3000);
                fetchData();
            }
        } catch (error) {
            console.error("Start error:", error);
        } finally {
            setIsStarting(false);
            setLoading(false);
        }
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
                    Functional_Testing_Initiate_Work_id: '',
                    uploadFiles: [],
                    isNewRow: true
                }
            ]);
        }
    };

    const handleWorkRemoveRow = (id) => {
        setWorkData(prev => prev.filter(row => row.id !== id));
    };



    const handleCommentChange = (index, value) => {
        setWorkData(prev => prev.map((row, i) => i === index ? { ...row, comment: value } : row));
    };

    const handleUpdateComment = async (index, row) => {
        const targetRow = row || uploadingRow;
        const targetComment = (row ? row.comment : modalComment) || '';

        if (!targetRow?.Functional_Testing_Initiate_Work_id) {
            setErrorMsg('Initiate Work ID is missing. Please start the work first.');
            setShowError(true);
            setTimeout(() => setShowError(false), 5000);
            return;
        }

        setLoading(true);
        try {
            const idToken = await getIdToken();
            const payload = {
                Functional_Testing_Initiate_Work_id: targetRow.Functional_Testing_Initiate_Work_id,
                comment_section: targetComment
            };

            const response = await fetch('https://m0834h3b33.execute-api.ap-south-1.amazonaws.com/New/api/FunctionalTesting/UpdateComment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (result.success) {
                setSuccessMsg('Comment updated successfully');
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 3000);

                // Keep the table up to date
                setWorkData(prev => prev.map(r =>
                    r.Functional_Testing_Initiate_Work_id === targetRow.Functional_Testing_Initiate_Work_id
                        ? { ...r, comment: targetComment }
                        : r
                ));
            } else {
                setErrorMsg('Failed to update comment: ' + (result.error || 'Unknown error'));
                setShowError(true);
                setTimeout(() => setShowError(false), 5000);
            }
        } catch (error) {
            console.error('Error updating comment:', error);
            setErrorMsg('Error updating comment');
            setShowError(true);
            setTimeout(() => setShowError(false), 5000);
        } finally {
            setLoading(false);
        }
    };

    const handleUploadClick = (row) => {
        setUploadingRow(row);
        setModalComment(row.comment || '');

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
        const initialOwnerName = row.Client_Owner_name || requestFormDetails?.Client_Owner_name || '';
        const initialOwnerEmail = row.Client_Owner_email || requestFormDetails?.Client_Owner_email || '';

        setTechnicalOwnerName(initialOwnerName);
        setTechnicalOwnerEmail(initialOwnerEmail);
        setAIDocuments([
            { id: 'func', label: 'Functional Specification', file: null, path: '' },
            { id: 'tech', label: 'Technical Specification', file: null, path: '' },
            { id: 'code', label: 'Code file', file: null, path: '' }
        ]);
        setActiveModalTab('Manual');
        prevOwnerNameRef.current = initialOwnerName;
        prevOwnerEmailRef.current = initialOwnerEmail;
        setShowUploadModal(true);
    };

    const handleAddModalDoc = () => {
        if (modalDocuments.length < 5) {
            setModalDocuments([...modalDocuments, { id: Date.now(), file: null, path: '', isUploaded: false, uploadObject: '' }]);
        }
    };

    const handleRemoveModalDoc = (id) => {
        if (modalDocuments.length > 1) {
            setModalDocuments(modalDocuments.filter(d => d.id !== id));
        }
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

    const handleAIFileChange = (id, e) => {
        const file = e.target.files[0];
        if (file) {
            const isCodeFile = id === 'code';
            const allowedExtensions = isCodeFile ? ['sql'] : ['pdf', 'xlsx', 'xls', 'docx', 'doc'];
            const fileExtension = file.name.split('.').pop().toLowerCase();

            if (!allowedExtensions.includes(fileExtension)) {
                setErrorMsg(isCodeFile ? 'Invalid file format. Only .SQL files are allowed for the Code file.' : 'Invalid file format. Only PDF, Excel, and Word files are allowed.');
                setShowError(true);
                setTimeout(() => setShowError(false), 5000);
                e.target.value = '';
                return;
            }

            setAIDocuments(prev => prev.map(doc =>
                doc.id === id ? { ...doc, file: file, path: file.name } : doc
            ));
        }
    };

    const handleUploadSubmit = async () => {
        const newDocs = modalDocuments.filter(d => d.file && !d.isUploaded);
        const existingDocs = modalDocuments.filter(d => d.isUploaded);

        // if (newDocs.length === 0 && existingDocs.length === 0) {
        //     setErrorMsg('Please select at least one file to upload');
        //     setShowError(true);
        //     setTimeout(() => setShowError(false), 3000);
        //     return;
        // }

        setLoading(true);
        try {
            const idToken = await getIdToken();
            if (!idToken) {
                handleAuthError();
                return;
            }
            const userId = localStorage.getItem('user_id') || 'system';
            const s3Timestamp = Date.now();
            
            let allUploadedDocs = [...existingDocs.map(d => ({ File_Name: DOMPurify.sanitize(d.path, { ALLOWED_TAGS: [] }), url: DOMPurify.sanitize(d.uploadObject, { ALLOWED_TAGS: [] }) }))];

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

                const presignedUrlResponse = await fetch('https://h78086ug8d.execute-api.ap-south-1.amazonaws.com/New/generate-presigned-urls/functional-testing-Initiate-Work-pdf', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`
                    },
                    body: JSON.stringify({
                        resource_roster_form_id: uploadingRow.Resource_Roster_Form_id || "",
                        ricew_object: DOMPurify.sanitize(uploadingRow.ricewObject || uploadingRow.RICEW_Object, { ALLOWED_TAGS: [] }),
                        documents: docsPayload.map(d => ({ name: d.name, type: d.type }))
                    })
                });

                if (!presignedUrlResponse.ok) {
                    if (presignedUrlResponse.status === 401 || presignedUrlResponse.status === 403) {
                        handleAuthError();
                        return;
                    }
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
                        File_Name: DOMPurify.sanitize(payload.name, { ALLOWED_TAGS: [] }),
                        url: DOMPurify.sanitize(urlData.publicCloudFrontUrl, { ALLOWED_TAGS: [] })
                    });

                    // Update state to show as uploaded
                    setModalDocuments(prev => prev.map(d =>
                        d.id === payload.docId ? { ...d, isUploaded: true, path: payload.name, uploadObject: urlData.publicCloudFrontUrl } : d
                    ));
                }
            }

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
                FunctionalTestingAssignment_id: DOMPurify.sanitize(uploadingRow.Functional_Testing_Assignment_id || '', { ALLOWED_TAGS: [] }),
                AI_Generated_File: uploadingRow.AI_Generated_File || [] // Preserve AI files
            };

            if (uploadingRow.Functional_Testing_Initiate_Work_id) {
                metadataPayload.Functional_Testing_Initiate_Work_id = uploadingRow.Functional_Testing_Initiate_Work_id;
            }

            const metadataUpdateResponse = await fetch('https://h78086ug8d.execute-api.ap-south-1.amazonaws.com/New/api/ricew/functionalTestingInitiateWork/createSubmit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify(metadataPayload)
            });

            if (!metadataUpdateResponse.ok) {
                if (metadataUpdateResponse.status === 401 || metadataUpdateResponse.status === 403) {
                    handleAuthError();
                    return;
                }
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
            setErrorMsg('Please enter valid Client Business Owner Name and Email');
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
                return;
            }
            const userId = localStorage.getItem('user_id') || 'system';
            const projectId = localStorage.getItem('project_id') || selectedProject?.id || '101';
            const currentTimestamp = new Date().toLocaleString('en-GB', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                hour12: false
            }).replace(',', '');

            // 1. Identify files to upload
            const newDocs = modalDocuments.filter(d => d.file && !d.isUploaded);
            const existingDocs = modalDocuments.filter(d => d.isUploaded);
            const s3Timestamp = Date.now();

            let allUploadedDocs = [...existingDocs.map(d => ({
                File_Name: DOMPurify.sanitize(d.path, { ALLOWED_TAGS: [] }),
                url: DOMPurify.sanitize(d.uploadObject, { ALLOWED_TAGS: [] })
            }))];

            // 2. Upload new files if any
            if (newDocs.length > 0) {
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

                const presignedUrlResponse = await fetch('https://h78086ug8d.execute-api.ap-south-1.amazonaws.com/New/generate-presigned-urls/functional-testing-Initiate-Work-pdf', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`
                    },
                    body: JSON.stringify({
                        resource_roster_form_id: uploadingRow.Resource_Roster_Form_id || "",
                        ricew_object: DOMPurify.sanitize(uploadingRow.ricewObject || uploadingRow.RICEW_Object, { ALLOWED_TAGS: [] }),
                        documents: docsPayload.map(d => ({ name: d.name, type: d.type }))
                    })
                });

                if (presignedUrlResponse.status === 401 || presignedUrlResponse.status === 403) {
                    handleAuthError(presignedUrlResponse.status);
                    return;
                }

                const presignedResult = await presignedUrlResponse.json();
                if (presignedResult.success && presignedResult.urls) {
                    for (let i = 0; i < docsPayload.length; i++) {
                        const payload = docsPayload[i];
                        const urlData = presignedResult.urls.find(u => u.documentName === payload.name);
                        if (urlData) {
                            await fetch(urlData.signedUrl, {
                                method: 'PUT',
                                headers: { 'Content-Type': payload.type },
                                body: payload.originalFile
                            });
                            allUploadedDocs.push({
                                File_Name: DOMPurify.sanitize(payload.name, { ALLOWED_TAGS: [] }),
                                url: DOMPurify.sanitize(urlData.publicCloudFrontUrl, { ALLOWED_TAGS: [] })
                            });
                        }
                    }

                    // Sync with Initiate Work metadata API to save file links
                    try {
                        const metadataPayload = {
                            Project_id: uploadingRow.Project_id || selectedProject?.id || '101',
                            RICEW_Object: DOMPurify.sanitize(uploadingRow.ricewObject || uploadingRow.RICEW_Object || '', { ALLOWED_TAGS: [] }),
                            Assigned_Date: uploadingRow.assignedDate,
                            Start_Object: uploadingRow.startObject || "",
                            End_Date: currentTimestamp,
                            Upload_Object: allUploadedDocs,
                            created_by: userId,
                            updated_by: userId,
                            Resource_Roster_Form_id: DOMPurify.sanitize(uploadingRow.Resource_Roster_Form_id || '', { ALLOWED_TAGS: [] }),
                            RICEWRequestFormId: id || uploadingRow.RICEWRequestFormId || "",
                            Functional_Testing_Assignment_id: DOMPurify.sanitize(uploadingRow.Functional_Testing_Assignment_id || '', { ALLOWED_TAGS: [] }),
                            AI_Generated_File: uploadingRow.AI_Generated_File || [] // Preserve AI files
                        };

                        if (uploadingRow.Functional_Testing_Initiate_Work_id) {
                            metadataPayload.Functional_Testing_Initiate_Work_id = uploadingRow.Functional_Testing_Initiate_Work_id;
                        }

                        await fetch('https://h78086ug8d.execute-api.ap-south-1.amazonaws.com/New/api/ricew/functionalTestingInitiateWork/createSubmit', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${idToken}`
                            },
                            body: JSON.stringify(metadataPayload)
                        });
                    } catch (err) {
                        console.error("Metadata sync error:", err);
                    }
                }
            }

            // Fallback to row files if no docs in modal at all
            if (allUploadedDocs.length === 0) {
                if (uploadingRow.isUploaded && uploadingRow.uploadFiles && uploadingRow.uploadFiles.length > 0) {
                    allUploadedDocs.push(...uploadingRow.uploadFiles.filter(f => !f.isAI).map(f => ({
                        File_Name: DOMPurify.sanitize(f.File_Name || "", { ALLOWED_TAGS: [] }),
                        url: DOMPurify.sanitize(f.url || "", { ALLOWED_TAGS: [] })
                    })));
                }
            }

            const assignedRecord = {
                Initiate_Work_id: uploadingRow.Functional_Testing_Initiate_Work_id ? [uploadingRow.Functional_Testing_Initiate_Work_id] : [],
                Upload_Object: allUploadedDocs,
                Resource_Roster_Form_id: DOMPurify.sanitize(uploadingRow.Resource_Roster_Form_id || '', { ALLOWED_TAGS: [] }),
                RICEWRequestFormId: id || uploadingRow.RICEWRequestFormId || "",
                Email_Address: DOMPurify.sanitize(uploadingRow.Email_Address || '', { ALLOWED_TAGS: [] }),
                RICEW_Object: DOMPurify.sanitize(uploadingRow.ricewObject || '', { ALLOWED_TAGS: [] }),
                Functional_Testing_Assignment_id: DOMPurify.sanitize(uploadingRow.Functional_Testing_Assignment_id || '', { ALLOWED_TAGS: [] }),
                Project_id: projectId,
                Client_Owner_name: DOMPurify.sanitize(businessOwnerName || '', { ALLOWED_TAGS: [] }),
                Client_Owner_email: DOMPurify.sanitize(businessOwnerEmail || '', { ALLOWED_TAGS: [] }),
                created_by: userId,
                updated_by: userId,
                user_id: userId,
                End_Date: currentTimestamp,
                Comment: DOMPurify.sanitize(modalComment || '', { ALLOWED_TAGS: [] }),
                AI_Generated_File: uploadingRow.AI_Generated_File || [] // Explicitly include AI files
            };

            const payload = { records: [assignedRecord] };

            const response = await fetch('https://h78086ug8d.execute-api.ap-south-1.amazonaws.com/New/api/ricew/assignInitiateWorkClientOwnerFunctionalTesting/createSubmit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    handleAuthError(response.status);
                    return;
                }
            }

            const result = await response.json();

            if (result.success) {
                // Update comment as well
                try {
                    const commentPayload = {
                        Functional_Testing_Initiate_Work_id: uploadingRow.Functional_Testing_Initiate_Work_id,
                        comment_section: DOMPurify.sanitize(modalComment || "", { ALLOWED_TAGS: [] })
                    };
                    const commentResponse = await fetch('https://m0834h3b33.execute-api.ap-south-1.amazonaws.com/New/api/FunctionalTesting/UpdateComment', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${idToken}`
                        },
                        body: JSON.stringify(commentPayload)
                    });
                    if (!commentResponse.ok && (commentResponse.status === 401 || commentResponse.status === 403)) {
                        handleAuthError(commentResponse.status);
                    }
                } catch (commentErr) {
                    console.error("Error updating comment during assignment:", commentErr);
                }

                setSuccessMsg('Assigned to Client Business Owner successfully');
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 3000);
                setShowUploadModal(false);
                fetchData(); // Refresh to show pending status if applicable
            } else {
                throw new Error(result.error || result.details?.[0]?.error || 'Failed to assign Client Business Owner');
            }
        } catch (error) {
            console.error('Assignment error:', error);
            setErrorMsg(error.message || 'Error assigning Client Business Owner');
            setShowError(true);
            setTimeout(() => setShowError(false), 5000);
        } finally {
            setLoading(false);
            setIsAssigning(false);
        }
    };

    const handleAIGeneration = async () => {
        const missingFiles = aiDocuments.filter(d => !d.file);
        if (missingFiles.length > 0) {
            setErrorMsg(`Please upload all required files: ${missingFiles.map(d => d.label).join(', ')}`);
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
            const workId = uploadingRow.Functional_Testing_Initiate_Work_id;

            if (!workId) {
                throw new Error("Initiate Work ID not found. Please start the work first.");
            }

            const formData = new FormData();
            aiDocuments.forEach(doc => {
                // Map local IDs to backend expected keys
                let backendKey = doc.id;
                if (doc.id === 'func') backendKey = 'functional_spec';
                else if (doc.id === 'tech') backendKey = 'technical_spec';
                else if (doc.id === 'code') backendKey = 'code_file';
                formData.append(backendKey, doc.file);
            });

            const apiUrl = `https://ojqa6cyccprw6djbm5htc2nulq0pyobn.lambda-url.ap-south-1.on.aws/?id=${userId}&project_id=${projectId}&work_id=${workId}`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (response.ok && (result.status === 'success' || result.success)) {
                const docxFile = result.files?.docx;
                if (!docxFile || !docxFile.display_url) {
                    throw new Error("AI Generation succeeded but no document URL was returned.");
                }

                // 2. Save Metadata to DB
                const metadataPayload = {
                    Functional_Testing_Initiate_Work_id: workId,
                    file_name: docxFile.filename || "AI Generated Testing Specification",
                    uploaded_url: docxFile.display_url
                };

                const updateResponse = await fetch('https://oi5gtp4f3l.execute-api.ap-south-1.amazonaws.com/New/update-upload-metadata/Functional-Testing-Initiate-Work-pdf/ai-generate', {
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
                    
                    fetchData();

                    // Reset AI input documents after successful generation
                    setAIDocuments([
                        { id: 'func', label: 'Functional Specification', file: null, path: '' },
                        { id: 'tech', label: 'Technical Specification', file: null, path: '' },
                        { id: 'code', label: 'Code file', file: null, path: '' }
                    ]);

                    // Update local state for instant feedback
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

    const handleRemoveRow = (id) => {
        setCombinedRows(prev => prev.map(row =>
            row.id === id ? { ...row, fswrn: { text: '', fileName: '', fileUrl: '' } } : row
        ));
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

    const handleRemoveSubRow = (parentId, subRowId) => {
        setCombinedRows(prev => prev.map(row =>
            row.id === parentId
                ? { ...row, subRows: row.subRows.map(sr => sr.id === subRowId ? { ...sr, fswrn: { text: '', fileName: '', fileUrl: '' } } : sr) }
                : row
        ));
    };

    const handleSubmitResponse = async () => {
        setLoading(true);
        try {
            const idToken = await getIdToken();
            const userId = localStorage.getItem('user_id');
            const projectId = localStorage.getItem('project_id') || selectedProject?.id || '101';
            const assignmentId = workData[0]?.Functional_Testing_Assignment_id || '';

            // 1. Process File Uploads
            const allFilesToUpload = [];
            combinedRows.forEach(row => {
                // Only upload files for rows that have a valid SI_FT_Technical_Owner_feedback_id
                if (row.fswrn.fileObj && row.bof.feedback_business_owner_id) {
                    allFilesToUpload.push({
                        file: row.fswrn.fileObj,
                        rowRef: row.fswrn,
                        feedback_business_owner_id: row.bof.feedback_business_owner_id
                    });
                }
                if (row.subRows) {
                    row.subRows.forEach(subRow => {
                        if (subRow.fswrn.fileObj && subRow.bof.feedback_business_owner_id) {
                            allFilesToUpload.push({
                                file: subRow.fswrn.fileObj,
                                rowRef: subRow.fswrn,
                                feedback_business_owner_id: subRow.bof.feedback_business_owner_id
                            });
                        }
                    });
                }
            });

            if (allFilesToUpload.length > 0) {
                try {
                    await Promise.all(allFilesToUpload.map(async (item, index) => {
                        const originalName = item.file.name;
                        const lastDotIndex = originalName.lastIndexOf('.');
                        let newName = originalName;
                        const timestamp = Date.now() + index;

                        if (lastDotIndex !== -1) {
                            newName = `${originalName.substring(0, lastDotIndex)}_${timestamp}${originalName.substring(lastDotIndex)}`;
                        } else {
                            newName = `${originalName}_${timestamp}`;
                        }

                        const presignResponse = await fetch('https://m0834h3b33.execute-api.ap-south-1.amazonaws.com/New/generate-presigned-urls/Feedback-Response-FunctionalTester-pdf', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${idToken}`
                            },
                            body: JSON.stringify({
                                project_id: projectId,
                                Functional_Testing_Assignment_id: assignmentId,
                                RICEWRequestFormId: id,
                                ricew_object: workData[0]?.ricewObject || '',
                                SI_FT_Technical_Owner_feedback_id: item.feedback_business_owner_id,
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
                                    headers: { 'Content-Type': item.file.type || 'application/octet-stream' }
                                });
                                item.rowRef.fileUrl = urlData.publicCloudFrontUrl;
                                item.rowRef.fileName = newName;
                            }
                        } else {
                            throw new Error(`Failed to get presigned URL for ${originalName}`);
                        }
                    }));
                } catch (uploadError) {
                    console.error("Error during file upload:", uploadError);
                    setErrorMsg("Failed to upload all files. Submitting anyway...");
                    setShowError(true);
                    setTimeout(() => setShowError(false), 5000);
                }
            }

            // 2. Prepare Records for Submission (same pattern as Developer Specification)
            const records = [];
            combinedRows.forEach((row, idx) => {
                // Main row record - push unconditionally (same as Developer Spec)
                records.push({
                    Functional_Tester_feedback_SI_id: row.fswrn.rice_Functional_Testing_Writer_feedback_id || "",
                    SI_FT_Technical_Owner_feedback_id: row.bof.feedback_business_owner_id || "",
                    parent_feedback_id: "",
                    row_number: idx + 1,
                    sub_row_number: 0,
                    Functional_Testing_Initiate_Work_id: workData[0]?.Functional_Testing_Initiate_Work_id || "",
                    Project_id: projectId,
                    Functional_Testing_Assignment_id: assignmentId,
                    feedback_text: row.fswrn.text || "",
                    supported_doccument: row.fswrn.fileUrl && row.fswrn.fileUrl !== '#' ? row.fswrn.fileUrl : "",
                    supported_doccument_name: row.fswrn.fileName || ""
                });

                // Sub-rows records
                row.subRows?.forEach((sr, sIdx) => {
                    records.push({
                        Functional_Tester_feedback_SI_id: sr.fswrn.rice_Functional_Testing_Writer_feedback_id || "",
                        SI_FT_Technical_Owner_feedback_id: sr.bof.feedback_business_owner_id || "",
                        parent_feedback_id: row.bof.feedback_business_owner_id || "",
                        row_number: idx + 1,
                        sub_row_number: sIdx + 1,
                        Functional_Testing_Initiate_Work_id: workData[0]?.Functional_Testing_Initiate_Work_id || "",
                        Project_id: projectId,
                        Functional_Testing_Assignment_id: assignmentId,
                        feedback_text: sr.fswrn.text || "",
                        supported_doccument: sr.fswrn.fileUrl && sr.fswrn.fileUrl !== '#' ? sr.fswrn.fileUrl : "",
                        supported_doccument_name: sr.fswrn.fileName || ""
                    });
                });
            });

            // Filter out empty rows (no text and no document) — same as Developer Specification
            const filteredRecords = records.filter(r => r.feedback_text || r.supported_doccument);

            if (filteredRecords.length === 0) {
                setErrorMsg("Please enter at least one response before submitting");
                setShowError(true);
                setTimeout(() => setShowError(false), 3000);
                setLoading(false);
                return;
            }

            // Also filter out rows with empty SI_FT_Technical_Owner_feedback_id
            // (DynamoDB GSI key cannot be an empty string)
            const validRecords = filteredRecords.filter(r => r.SI_FT_Technical_Owner_feedback_id);

            if (validRecords.length === 0) {
                setErrorMsg("Feedback IDs could not be loaded. Please refresh the page and try again.");
                setShowError(true);
                setTimeout(() => setShowError(false), 5000);
                setLoading(false);
                return;
            }

            const response = await fetch('https://m0834h3b33.execute-api.ap-south-1.amazonaws.com/New/api/FunctionalTester/FeedbackResponseSubmit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                body: JSON.stringify({ records: validRecords })
            });

            const result = await response.json();
            if (result.success) {
                setSuccessMsg("Responses submitted successfully");
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 3000);

                // Refresh data to show latest IDs and status
                fetchData();

                // Call SI Technical Owner Email API for notification
                try {
                    const emailPayload = {
                        RICEW_Object: workData[0]?.ricewObject || '-',
                        RICEWRequestFormId: id,
                        Project_id: projectId,
                        SI_Technical_Owner_email: requestFormDetails?.Client_Owner_email || '',
                        SI_Technical_Owner_name: requestFormDetails?.Client_Owner_name || '',
                        Upload_Object: workData[0]?.uploadFiles || []
                    };

                    await fetch('https://m0834h3b33.execute-api.ap-south-1.amazonaws.com/New/newApi/ricew/sendSITechnicalOwnerTestingEmail', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${idToken}`
                        },
                        body: JSON.stringify(emailPayload)
                    });
                } catch (emailError) {
                    console.error('Error sending SI Technical Owner email notification:', emailError);
                }
            } else {
                throw new Error(result.error || "Failed to submit records");
            }
        } catch (error) {
            console.error("Submit response error:", error);
            setErrorMsg("Error submitting response");
            setShowError(true);
            setTimeout(() => setShowError(false), 5000);
        } finally {
            setLoading(false);
        }
    };

    const getFileViewUrl = (url, fileName) => {
        if (!url || url === '-' || !url.startsWith('http')) return url;
        const extension = (fileName || url.split('?')[0]).split('.').pop().toLowerCase();
        if (['xlsx', 'xls', 'csv', 'docx', 'doc'].includes(extension)) {
            // Microsoft Office Viewer handles both Excel and Word files
            return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`;
        }
        return url;
    };

    return (
        <React.Fragment>
            <div className="config-main" style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '0', margin: '0', fontFamily: 'Arial, sans-serif' }}>
                <div style={{ padding: '1rem 1rem 2rem 1rem', width: '100%', minWidth: '1250px', boxSizing: 'border-box' }}>
                    {/* Initiation Form */}
                    <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <div style={{ padding: '2rem 1rem 1rem 2rem' }}>
                            <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project : <span style={{ color: '#007bff' }}>{localStorage.getItem('project_name') || selectedProject?.name}</span></h3>
                        </div>
                        <div className="config-header" style={{ marginTop: '0', marginRight: "0px", display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 2rem' }}>
                            <h2 style={{ margin: 0 }}>Initiate Work (Functional Testing)</h2>
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
                                                        <p style={{ margin: '6px 0 0 0', color: '#555' }}>The <strong>Initiate Work (Functional Testing)</strong> page allows you to manage and submit your functional testing work items including uploading test results and adding comments.</p>
                                                    </div>
                                                    <div style={{ marginBottom: '16px' }}>
                                                        <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to use</strong>
                                                        <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                                            <li>Click <strong>Start</strong> to begin working on a testing object.</li>
                                                            <li>Upload your test results using the <strong>Response</strong> button.</li>
                                                            <li>Click <strong>Submit Response</strong> to send your work for review.</li>
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
                            <div style={{ border: '1px solid #ddd', overflowX: 'auto', width: '100%', marginTop: '10px' }}>
                                {/* Table Header */}
                                <div style={{ display: 'flex', borderBottom: '1px solid #ddd', backgroundColor: 'white', minWidth: '1610px' }}>
                                    <div style={{ width: '60px', flex: '0 0 60px', padding: '12px 8px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', backgroundColor: 'white', textAlign: 'center', boxSizing: 'border-box' }}>Sr. No.</div>
                                    <div style={{ flex: '0 0 250px', width: '250px', padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', backgroundColor: 'white', boxSizing: 'border-box' }}>RICEW Object</div>
                                    <div style={{ width: '150px', flex: '0 0 150px', padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', backgroundColor: 'white', textAlign: 'center', boxSizing: 'border-box' }}>Status</div>
                                    <div style={{ flex: '0 0 120px', width: '120px', padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', backgroundColor: 'white', textAlign: 'center', boxSizing: 'border-box' }}>Assigned Date</div>
                                    <div style={{ flex: '0 0 120px', width: '120px', padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', backgroundColor: 'white', textAlign: 'center', boxSizing: 'border-box' }}>Start Date</div>
                                    <div style={{ flex: '0 0 450px', width: '450px', padding: '0', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', backgroundColor: 'white', display: 'flex', boxSizing: 'border-box' }}>
                                        <div style={{ flex: 1, padding: '12px 12px', borderRight: '1px solid #ddd', boxSizing: 'border-box' }}>Response</div>
                                        <div style={{ width: '150px', padding: '12px 12px', flexShrink: 0, textAlign: 'center', boxSizing: 'border-box' }}>Approve Status</div>
                                    </div>
                                    <div style={{ width: '120px', flex: '0 0 120px', padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', minWidth: '120px', backgroundColor: 'white', borderRight: '1px solid #ddd', textAlign: 'center', boxSizing: 'border-box' }}>End Date</div>
                                    <div style={{ flex: 2, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', minWidth: '280px', backgroundColor: 'white', boxSizing: 'border-box' }}>Comment</div>
                                </div>
                                {/* Table Body */}
                                <div style={{ display: 'flex', flexDirection: 'column', minWidth: '1610px', backgroundColor: 'white' }}>
                                    {workData.map((row, idx) => (
                                        <div key={row.id || idx} style={{ display: 'flex', borderBottom: '1px solid #ddd', minWidth: '1610px', color: '#333' }}>
                                            <div style={{ width: '60px', flex: '0 0 60px', padding: '12px 8px', fontSize: '13px', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '500', boxSizing: 'border-box' }}>
                                                {row.isNewRow ? (
                                                    <Trash2
                                                        size={14}
                                                        style={{ cursor: 'pointer', color: '#dc2626' }}
                                                        onClick={() => handleWorkRemoveRow(row.id)}
                                                    />
                                                ) : (row.Functional_Testing_Initiate_Work_id || idx + 1)}
                                            </div>
                                            <div style={{ flex: '0 0 250px', width: '250px', padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}>{row.ricewObject}</div>
                                            <div style={{ width: '150px', flex: '0 0 150px', padding: '12px 12px', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
                                                <span style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: '#dbeafe', color: '#1e40af', fontWeight: '500', fontSize: '11px', whiteSpace: 'normal', textAlign: 'center', width: '100%' }}>
                                                    {requestFormDetails?.RICEW_Status || '-'}
                                                </span>
                                            </div>
                                            <div style={{ flex: '0 0 120px', width: '120px', padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>{formatToDDMMMYYYY(row.assignedDate)}</div>
                                            <div style={{ flex: '0 0 120px', width: '120px', padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
                                                {row.isStarted ? (
                                                    <span style={{ fontWeight: '500', color: '#333' }}>{formatToDDMMMYYYY(row.startObject)}</span>
                                                ) : (
                                                    <button onClick={() => handleStart(row)} disabled={isStarting} style={{ backgroundColor: isStarting ? '#6c757d' : '#28a745', color: 'white', border: 'none', padding: '6px 16px', borderRadius: '4px', cursor: isStarting ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: '500', transition: 'background-color 0.2s', opacity: isStarting ? 0.7 : 1 }}
                                                        onMouseEnter={(e) => { if (!isStarting) e.target.style.backgroundColor = '#218838'; }}
                                                        onMouseLeave={(e) => { if (!isStarting) e.target.style.backgroundColor = '#28a745'; }}
                                                    >{isStarting ? 'Starting...' : 'Start'}</button>
                                                )}
                                            </div>
                                            {/* Upload Docs + Approve Status (combined per-file rows for alignment) */}
                                            <div style={{ flex: '0 0 450px', width: '450px', padding: '0', fontSize: '13px', borderRight: '1px solid #ddd', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', position: 'relative' }}>
                                                {/* Inner column separator spanning full height */}
                                                <div style={{ position: 'absolute', top: 0, bottom: 0, right: '150px', width: '1px', backgroundColor: '#ddd', zIndex: 1 }} />
                                                {!row.isStarted ? (
                                                    <div style={{ display: 'flex', alignItems: 'stretch', minHeight: '44px' }}>
                                                        <div style={{ flex: 1, padding: '12px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>-</div>
                                                        <div style={{ width: '150px', padding: '12px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxSizing: 'border-box' }}>-</div>
                                                    </div>
                                                ) : (row.statusVerification !== 'pending' && (!row.endDate || row.endDate === '-')) ? (
                                                    <div style={{ display: 'flex', alignItems: 'stretch', minHeight: '44px', flex: 1 }}>
                                                        <div style={{ flex: 1, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
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
                                                        <div style={{ width: '150px', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxSizing: 'border-box' }}>-</div>
                                                    </div>
                                                ) : (row.uploadFiles && row.uploadFiles.length > 0) ? (
                                                    row.uploadFiles.map((file, fIdx) => {
                                                        const status = (file.document_approved === 'true' || file.document_approved === 'Approved') ? 'Approved' :
                                                            (file.document_approved === 'false' || file.document_approved === 'Rejected') ? 'Rejected' : '-';
                                                        const statusColor = status === 'Approved' ? '#059669' : status === 'Rejected' ? '#dc2626' : '#64748b';
                                                        return (
                                                            <div key={fIdx} style={{ display: 'flex', alignItems: 'stretch', minHeight: '44px', borderBottom: fIdx < row.uploadFiles.length - 1 ? '1px solid #eee' : 'none' }}>
                                                                {/* File name cell */}
                                                                <div style={{ flex: 1, padding: '8px 12px', display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}>
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
                                                                {/* Approve Status cell */}
                                                                <div style={{ width: '150px', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: '600', color: statusColor, boxSizing: 'border-box' }}>
                                                                    {status}
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <div style={{ display: 'flex', alignItems: 'stretch', minHeight: '44px' }}>
                                                        <div style={{ flex: 1, padding: '12px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>-</div>
                                                        <div style={{ width: '150px', padding: '12px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxSizing: 'border-box' }}>-</div>
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ width: '120px', flex: '0 0 120px', padding: '12px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #ddd', boxSizing: 'border-box' }}>
                                                <span>{formatToDDMMMYYYY(row.endDate)}</span>
                                            </div>
                                            {/* Comment */}
                                            <div style={{ flex: 2, padding: '8px', fontSize: '13px', minWidth: '280px', display: 'flex', alignItems: 'stretch', position: 'relative', boxSizing: 'border-box' }}>
                                                <textarea
                                                    value={row.comment || ''}
                                                    readOnly={true}
                                                    placeholder="No comments yet..."
                                                    className="thin-scroll-textarea"
                                                    style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        minHeight: '44px',
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
                                    ))}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 10px 15px 0', borderTop: '1px solid #eee' }}>
                                        <div style={{ paddingLeft: '10px' }}>
                                        </div>
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

                    {/* Feedback Form */}
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
                                        value={requestFormDetails?.Client_Owner_name || ''}
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
                                        value={requestFormDetails?.Client_Owner_email || ''}
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
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '40px 1.2fr 0.4fr 150px',
                                    borderLeft: '1px solid #ddd',
                                    borderTop: '1px solid #ddd',
                                    borderRadius: '4px 4px 0 0',
                                    overflow: 'hidden',
                                    backgroundColor: 'white'
                                }}>
                                    {/* Group Header Row */}
                                    <div style={{ gridColumn: 'span 4', borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '10px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px', backgroundColor: '#fcfcfc' }}>
                                        Client Business Owner Feedback
                                    </div>
                                    {/* Sub-Header Row */}
                                    <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#fcfcfc' }}>Sr. No.</div>
                                    <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#fcfcfc' }}>Text</div>
                                    <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#fcfcfc' }}>Uploaded Document Name</div>
                                    <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#fcfcfc' }}>Technical Owner Decision</div>
                                </div>

                                {/* Data Rows */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '40px 1.2fr 0.4fr 150px',
                                    borderLeft: '1px solid #ddd',
                                    borderRadius: '0 0 4px 4px',
                                    overflow: 'hidden',
                                    backgroundColor: 'white'
                                }}>
                                    {workData.flatMap((workRow, idx) => {
                                        const workId = workRow.Functional_Testing_Initiate_Work_id;
                                        const matchedRows = workId
                                            ? combinedRows.filter(r => r.Functional_Testing_Initiate_Work_id === workId && (r.bof.text || r.bof.fileName))
                                            : [];
                                        if (matchedRows.length === 0) return [];
                                        const rowsToRender = matchedRows;

                                        // Total grid rows this workId occupies (all feedback rows + their sub-rows)
                                        const totalSpan = rowsToRender.reduce((sum, r) => sum + 1 + (r.subRows?.length || 0), 0);

                                        return rowsToRender.map((row, rowIdx) => {
                                            const isLast = idx === workData.length - 1 && rowIdx === rowsToRender.length - 1;
                                            const cellBorderBottom = '1px solid #ddd';
                                            const isClosed = row.bof.business_owner_decision === 'Close';
                                            return (
                                                <React.Fragment key={row.id}>
                                                    {/* Sr. No. — only render once per workId, spanning all its feedback rows */}
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
                                                            fontSize: '12px',
                                                            backgroundColor: '#fcfcfc',
                                                            borderBottomLeftRadius: isLast && row.subRows?.length === 0 ? '4px' : '0'
                                                        }}>{workId || '-'}</div>
                                                    )}
                                                    <div style={{ borderBottom: row.subRows?.length > 0 ? '1px solid #eee' : cellBorderBottom, borderRight: '1px solid #ddd', padding: '5px', backgroundColor: isClosed ? '#f5f5f5' : '#f9f9f9' }}>
                                                        <textarea value={row.bof.text || 'Empty (not Submitted)'} readOnly style={{ width: '100%', border: 'none', resize: 'none', minHeight: '35px', fontSize: '13px', fontFamily: 'Arial, sans-serif', padding: '5px', backgroundColor: 'transparent', cursor: 'not-allowed', color: row.bof.text ? (isClosed ? '#718096' : '#333') : '#aaa', outline: 'none', fontStyle: row.bof.text ? 'normal' : 'italic' }} />
                                                    </div>
                                                    <div style={{ borderBottom: row.subRows?.length > 0 ? '1px solid #eee' : cellBorderBottom, borderRight: '1px solid #ddd', padding: '8px 5px', fontSize: '11px', color: isClosed ? '#718096' : 'black', display: 'flex', alignItems: 'center', overflow: 'hidden', backgroundColor: isClosed ? '#f5f5f5' : 'white' }}>
                                                        {row.bof.fileName ? <a href={getFileViewUrl(row.bof.fileUrl, row.bof.fileName)} target="_blank" rel="noopener noreferrer" style={{ color: '#3182ce', textDecoration: 'none', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }} title={row.bof.fileName}>{row.bof.fileName}</a> : <span style={{ color: '#999' }}>No doc</span>}
                                                    </div>
                                                    <div style={{ borderBottom: row.subRows?.length > 0 ? '1px solid #eee' : cellBorderBottom, borderRight: '1px solid #ddd', padding: '8px 5px', fontSize: '12px', color: isClosed ? '#718096' : '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: isClosed ? '#f5f5f5' : '#f9fafb', borderBottomRightRadius: isLast && row.subRows?.length === 0 ? '4px' : '0' }}>
                                                        {row.bof.business_owner_decision || 'Open'}
                                                    </div>

                                                    {row.subRows?.map((sr, sIdx) => {
                                                        const isLastSubRow = sIdx === row.subRows.length - 1;
                                                        const subCellBorderBottom = isLastSubRow ? cellBorderBottom : '1px solid #eee';
                                                        const isSubClosed = sr.bof.business_owner_decision === 'Close';
                                                        return (
                                                            <React.Fragment key={sr.id}>
                                                                <div style={{ borderBottom: subCellBorderBottom, borderRight: '1px solid #ddd', padding: '5px', backgroundColor: isSubClosed ? '#f5f5f5' : '#fffdee' }}>
                                                                    <textarea value={sr.bof.text} readOnly style={{ width: '100%', border: 'none', outline: 'none', resize: 'none', minHeight: '30px', fontSize: '13px', fontFamily: 'Arial, sans-serif', padding: '5px', backgroundColor: 'transparent', cursor: 'not-allowed', color: isSubClosed ? '#718096' : '#333' }} />
                                                                </div>
                                                                <div style={{ borderBottom: subCellBorderBottom, borderRight: '1px solid #ddd', padding: '8px 5px', fontSize: '11px', color: isSubClosed ? '#718096' : 'black', display: 'flex', alignItems: 'center', overflow: 'hidden', backgroundColor: isSubClosed ? '#f5f5f5' : 'white' }}>
                                                                    {sr.bof.fileName ? <a href={getFileViewUrl(sr.bof.fileUrl, sr.bof.fileName)} target="_blank" rel="noopener noreferrer" style={{ color: '#3182ce', textDecoration: 'none', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }} title={sr.bof.fileName}>{sr.bof.fileName}</a> : <span style={{ color: '#999' }}>No doc</span>}
                                                                </div>
                                                                <div style={{ borderBottom: subCellBorderBottom, borderRight: '1px solid #ddd', padding: '8px 5px', fontSize: '12px', color: isSubClosed ? '#718096' : '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: isSubClosed ? '#f5f5f5' : '#f9fafb', borderBottomRightRadius: isLast && isLastSubRow ? '4px' : '0' }}>
                                                                    {sr.bof.business_owner_decision || 'Open'}
                                                                </div>
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                </React.Fragment>
                                            );
                                        });
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Success/Error Alerts */}
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
                        {/* Modal Header - Matching Technical Specification Style */}
                        <div className="config-header" style={{
                            margin: '0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0 20px',
                            height: '50px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
                                <h2 style={{ fontSize: '18px', margin: 0 }}>Upload Form (Functional Testing)</h2>
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
                            {activeModalTab === 'Manual' ? (
                                modalDocuments.map((doc, idx) => (
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
                                ))
                            ) : (
                                aiDocuments.map((doc, idx) => (
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
                                            flex: '0 0 180px', // Wider for long labels
                                            padding: '10px 15px',
                                            borderRight: '1px solid #ddd',
                                            fontWeight: 'bold',
                                            fontSize: '13px',
                                            color: '#333',
                                            backgroundColor: '#f8f9fa',
                                            display: 'flex',
                                            alignItems: 'center'
                                        }}>
                                            <span>{doc.label}</span>
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
                                                value={doc.path || `Upload ${doc.label}`}
                                                style={{
                                                    flex: 1,
                                                    height: '30px',
                                                    padding: '0 10px',
                                                    fontSize: '12px',
                                                    fontFamily: 'Arial, sans-serif',
                                                    border: '1px solid #ccc',
                                                    borderRadius: '4px',
                                                    backgroundColor: '#f9f9f9',
                                                    color: doc.path ? '#333' : '#dc3545',
                                                    fontWeight: doc.path ? 'normal' : '500'
                                                }}
                                            />
                                            <button
                                                onClick={() => document.getElementById(`ai-file-input-${doc.id}`).click()}
                                                style={{
                                                    padding: '0 12px',
                                                    height: '30px',
                                                    backgroundColor: '#6366f1',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    fontSize: '11px',
                                                    fontWeight: '500',
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                Browse...
                                            </button>
                                            <input
                                                id={`ai-file-input-${doc.id}`}
                                                type="file"
                                                onChange={(e) => handleAIFileChange(doc.id, e)}
                                                accept={doc.id === 'code' ? ".sql" : ".pdf, .xlsx, .xls, .docx, .doc"}
                                                style={{ display: 'none' }}
                                            />
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
                                            {doc.file ? (
                                                <span style={{ fontSize: '11px', color: '#059669', fontWeight: 'bold' }}>Ready</span>
                                            ) : (
                                                <span style={{ fontSize: '11px', color: '#999' }}>Required</span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}

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
                                                    value={aiFile.file_name || "Generated Testing Spec"}
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
                                        disabled={loading || aiDocuments.some(d => !d.file)}
                                        style={{
                                            backgroundColor: (loading || aiDocuments.some(d => !d.file)) ? '#cccccc' : '#28a745',
                                            color: 'white',
                                            border: 'none',
                                            padding: '8px 25px',
                                            borderRadius: '4px',
                                            cursor: (loading || aiDocuments.some(d => !d.file)) ? 'not-allowed' : 'pointer',
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
                                        value={modalComment}
                                        onChange={(e) => setModalComment(e.target.value)}
                                        placeholder="Add comment..."
                                        className="thin-scroll"
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

                            {/* Client Business Owner Section */}
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
                                    RICEW Owner (Client)
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
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }} ref={lovRef}>
                                            <input
                                                type="text"
                                                value={businessOwnerName}
                                                onFocus={() => {
                                                    // Always backup current values to handle potential revert
                                                    prevOwnerNameRef.current = businessOwnerName;
                                                    prevOwnerEmailRef.current = businessOwnerEmail;
                                                    lovSelectionMadeRef.current = false;

                                                    // Only show LOV if not navigating by Tab
                                                    if (!isTabNavigationRef.current) {
                                                        // Removed setTechnicalOwnerName('') to prevent clearing on focus
                                                        setShowRosterLOV(true);
                                                    }
                                                }}
                                                onChange={(e) => {
                                                    let value = e.target.value;
                                                    if (value.length > 100) return;

                                                    if (value.length === 100) {
                                                        setNameError("Maximum 100 characters reached");
                                                    } else {
                                                        setNameError("");
                                                    }

                                                    if (value.length > 0) {
                                                        value = value.charAt(0).toUpperCase() + value.slice(1);
                                                    }
                                                    setTechnicalOwnerName(value);
                                                    setShowRosterLOV(true);
                                                    // Mark selection as made if there's a non-empty value
                                                    if (value.trim() !== '') {
                                                        lovSelectionMadeRef.current = true;
                                                    }
                                                }}
                                                maxLength={100}
                                                placeholder="Enter or Select RICEW Owner (Client) Name"
                                                style={{
                                                    width: '100%',
                                                    height: '32px',
                                                    padding: '0 10px',
                                                    fontSize: '13px',
                                                    fontFamily: 'Arial, sans-serif',
                                                    border: `1px solid ${nameError ? '#ef4444' : '#ccc'}`,
                                                    borderRadius: '4px',
                                                    backgroundColor: 'white',
                                                    color: '#333',
                                                    boxSizing: 'border-box'
                                                }}
                                            />
                                            {showRosterLOV && clientRoster.length > 0 && lovRef.current && (() => {
                                                const rect = lovRef.current.getBoundingClientRect();
                                                return (
                                                    <div style={{
                                                        position: 'fixed',
                                                        top: `${rect.bottom + 4}px`,
                                                        left: `${rect.left}px`,
                                                        width: `${rect.width}px`,
                                                        backgroundColor: 'white',
                                                        border: '1px solid #ccc',
                                                        borderRadius: '4px',
                                                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                                        zIndex: 9999,
                                                        maxHeight: '150px',
                                                        overflowY: 'auto'
                                                    }}>
                                                        {clientRoster
                                                            .filter(item => {
                                                                if (!businessOwnerName) return true; // Show all if input cleared
                                                                return item.Client_name.toLowerCase().includes(businessOwnerName.toLowerCase());
                                                            })
                                                            .map((item, i) => (
                                                                <div
                                                                    key={i}
                                                                    onClick={() => {
                                                                        lovSelectionMadeRef.current = true;
                                                                        setTechnicalOwnerName(item.Client_name);
                                                                        setTechnicalOwnerEmail(item.Email_Address || "");
                                                                        setEmailError("");
                                                                        setNameError("");
                                                                        setShowRosterLOV(false);
                                                                    }}
                                                                    style={{
                                                                        padding: '8px 12px',
                                                                        cursor: 'pointer',
                                                                        fontSize: '13px',
                                                                        borderBottom: i === clientRoster.length - 1 ? 'none' : '1px solid #eee'
                                                                    }}
                                                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                                                                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                                                >
                                                                    <div style={{ fontWeight: '600' }}>{item.Client_name}</div>
                                                                    <div style={{ fontSize: '11px', color: '#666' }}>{item.Email_Address}</div>
                                                                </div>
                                                            ))
                                                        }
                                                        {clientRoster.filter(item =>
                                                            item.Client_name.toLowerCase().includes(businessOwnerName.toLowerCase())
                                                        ).length === 0 && (
                                                                <div style={{ padding: '8px 12px', fontSize: '13px', color: '#999' }}>No results found</div>
                                                            )}
                                                    </div>
                                                );
                                            })()}
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
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    setTechnicalOwnerEmail(value);
                                                    setEmailError(validateEmail(value));
                                                }}
                                                placeholder="Enter RICEW Owner (Client) Email"
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

                            {/* Assign to Client Business Owner Button Container */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                                marginTop: '10px',
                                marginBottom: '10px',
                                marginRight: '0px'
                            }}>
                                <button
                                    onClick={handleAssignToTechnicalOwner}
                                    disabled={isAssigning || !businessOwnerName.trim() || !businessOwnerEmail.trim() || !!emailError || !!nameError}
                                    style={{
                                        backgroundColor: (isAssigning || !businessOwnerName.trim() || !businessOwnerEmail.trim() || !!emailError || !!nameError) ? '#cccccc' : '#28a745',
                                        color: 'white',
                                        border: 'none',
                                        padding: '10px 20px',
                                        borderRadius: '4px',
                                        cursor: (isAssigning || !businessOwnerName.trim() || !businessOwnerEmail.trim() || !!emailError || !!nameError) ? 'not-allowed' : 'pointer',
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        transition: 'all 0.2s',
                                        boxShadow: (isAssigning || !businessOwnerName.trim() || !businessOwnerEmail.trim() || !!emailError || !!nameError) ? 'none' : '0 2px 4px rgba(0,0,0,0.1)',
                                        opacity: (isAssigning || !businessOwnerName.trim() || !businessOwnerEmail.trim() || !!emailError || !!nameError) ? 0.8 : 1
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isAssigning && businessOwnerName.trim() && businessOwnerEmail.trim() && !emailError && !nameError) {
                                            e.target.style.backgroundColor = '#218838';
                                            e.target.style.transform = 'translateY(-1px)';
                                            e.target.style.boxShadow = '0 4px 6px rgba(0,0,0,0.15)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isAssigning && businessOwnerName.trim() && businessOwnerEmail.trim() && !emailError && !nameError) {
                                            e.target.style.backgroundColor = '#28a745';
                                            e.target.style.transform = 'none';
                                            e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                                        }
                                    }}
                                >
                                    {isAssigning ? 'Assigning...' : 'Assign RICEW Owner (Client)'}
                                </button>
                            </div>
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

export default FunctionalTestingSpecificationInitiateWork;

