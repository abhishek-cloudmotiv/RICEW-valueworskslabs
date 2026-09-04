import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { useSession } from '../../../context/SessionContext';
import { Trash2, Plus, Send, HelpCircle, X } from 'lucide-react';
import { getIdToken } from '../../../utils/cognito-auth';
import { SuccessMessage, ErrorMessage } from '../../Resource Roster Form/FormSections';

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

const RiskAndIssueWriterInitiateWork = ({ selectedProject }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { logout } = useSession();

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

    // UI State
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showError, setShowError] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [isStarting, setIsStarting] = useState(false);
    const [isAssigning, setIsAssigning] = useState(false);
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

    // Data State
    const [workData, setWorkData] = useState([]);
    const [combinedRows, setCombinedRows] = useState([]);

    // Modal State
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadingRow, setUploadingRow] = useState(null);
    const [modalDocuments, setModalDocuments] = useState([{ id: Date.now(), file: null, path: '', isUploaded: false, uploadObject: '' }]);
    const [businessOwnerName, setTechnicalOwnerName] = useState('');
    const [businessOwnerEmail, setTechnicalOwnerEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [nameError, setNameError] = useState('');

    const validateEmail = (email) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) return "";
        return regex.test(email) ? "" : "Please enter a valid email address";
    };

    const fetchData = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const token = await getIdToken();
            if (!token) {
                handleAuthError();
                return;
            }

            const userId = localStorage.getItem('user_id') || 'system';
            const projectId = localStorage.getItem('project_id') || selectedProject?.id || '101';
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };

            // 1. Fetch Static Assignment Details (Metadata)
            const assignmentDetailUrl = `https://ves5hu7c23.execute-api.ap-south-1.amazonaws.com/New/ricew/riskIssueAssignment/details?risk_issue_assignment_id=${id}&project_id=${projectId}`;
            const staticResponse = await fetch(assignmentDetailUrl, { headers });

            if (staticResponse.status === 401 || staticResponse.status === 403) {
                handleAuthError();
                return;
            }

            const staticResult = await staticResponse.json();

            // 2. Fetch Dynamic Initiate Work Details (Start work, Uploads, Comments)
            const initiateWorkDetailUrl = `https://ves5hu7c23.execute-api.ap-south-1.amazonaws.com/New/ricew/riskIssueInitiateWork/details?risk_issue_assignment_id=${id}&project_id=${projectId}`;
            const dynamicResponse = await fetch(initiateWorkDetailUrl, { headers });

            if (dynamicResponse.status === 401 || dynamicResponse.status === 403) {
                handleAuthError();
                return;
            }

            const dynamicResult = await dynamicResponse.json();

            if (staticResult.success && staticResult.data) {
                const staticItem = staticResult.data;
                const dynamicItems = (dynamicResult.success && Array.isArray(dynamicResult.data)) ? dynamicResult.data : [];

                if (dynamicItems.length === 0) {
                    // One row (not started yet or no items returned)
                    const emptyRow = {
                        ...staticItem,
                        ricewObject: DOMPurify.sanitize(staticItem.riskIssue_title || '-', { ALLOWED_TAGS: [] }),
                        assignedDate: staticItem.assign_object_date || '-',
                        targetResolutionDate: staticItem.Target_Resolution_Date || '-',
                        statusVerification: DOMPurify.sanitize(staticItem.riskIssue_status || '-', { ALLOWED_TAGS: [] }),
                        startObject: '-',
                        ownerRiskIssueName: DOMPurify.sanitize(staticItem.Owner_Risk_Issue_name || '-', { ALLOWED_TAGS: [] }),
                        ownerRiskIssueEmail: DOMPurify.sanitize(staticItem.Owner_Risk_Issue_email || '-', { ALLOWED_TAGS: [] }),
                        uploadFiles: [],
                        fileName: '-',
                        approveStatus: '-',
                        comment: '',
                        endDate: '-',
                        isStarted: false,
                        isUploaded: false,
                    };
                    setWorkData([emptyRow]);
                } else {
                    const mappedRows = dynamicItems.map(item => ({
                        ...staticItem,
                        ...item,
                        ricewObject: DOMPurify.sanitize(item.riskIssue_title || staticItem.riskIssue_title || '-', { ALLOWED_TAGS: [] }),
                        assignedDate: staticItem.assign_object_date || '-',
                        targetResolutionDate: staticItem.Target_Resolution_Date || '-',
                        statusVerification: DOMPurify.sanitize(staticItem.riskIssue_status || '-', { ALLOWED_TAGS: [] }),
                        startObject: item.start_object_date || '-',
                        ownerRiskIssueName: DOMPurify.sanitize(staticItem.Owner_Risk_Issue_name || '-', { ALLOWED_TAGS: [] }),
                        ownerRiskIssueEmail: DOMPurify.sanitize(staticItem.Owner_Risk_Issue_email || '-', { ALLOWED_TAGS: [] }),
                        uploadFiles: item.Upload_Object || [],
                        fileName: (item.Upload_Object && item.Upload_Object.length > 0) ? DOMPurify.sanitize(item.Upload_Object[0].File_Name || 'View', { ALLOWED_TAGS: [] }) : '-',
                        approveStatus: (item.Upload_Object && item.Upload_Object.length > 0) ? DOMPurify.sanitize(item.Upload_Object[0].document_approved || '-', { ALLOWED_TAGS: [] }) : '-',
                        comment: DOMPurify.sanitize(item.Comment_section || '', { ALLOWED_TAGS: [] }),
                        endDate: item.Initiate_Work_Risk_Issue_end_date || '-',
                        isStarted: !!item.start_object_date && item.start_object_date !== '-',
                        isUploaded: item.Upload_Object && item.Upload_Object.length > 0,
                    }));

                    // Sort by ID
                    mappedRows.sort((a, b) => {
                        const idA = parseInt(String(a.Risk_Issue_Specification_Initiate_Work_id).replace(/\D/g, '')) || 0;
                        const idB = parseInt(String(b.Risk_Issue_Specification_Initiate_Work_id).replace(/\D/g, '')) || 0;
                        return idA - idB;
                    });

                    setWorkData(mappedRows);
                }

                // 3. Fetch Feedback Form History
                const feedbackUrl = `https://ves5hu7c23.execute-api.ap-south-1.amazonaws.com/New/ricew/riskIssueInitiateWork/getFeedback?Risk_Issue_Assignment_id=${id}&Project_id=${projectId}`;
                const feedbackResponse = await fetch(feedbackUrl, { headers });

                if (feedbackResponse.status === 401 || feedbackResponse.status === 403) {
                    handleAuthError();
                    return;
                }

                const feedbackResult = await feedbackResponse.json();

                if (feedbackResult.success && Array.isArray(feedbackResult.data)) {
                    const allItems = feedbackResult.data;

                    // Separate parent feedbacks (no parent_feedback_id) from sub feedbacks
                    const parentItems = allItems.filter(item => !item.parent_feedback_id);
                    const subItems = allItems.filter(item => item.parent_feedback_id);

                    // Build a map of sub-feedbacks by parent ID
                    const subFeedbackMap = {};
                    subItems.forEach(sub => {
                        const parentId = sub.parent_feedback_id;
                        if (!subFeedbackMap[parentId]) subFeedbackMap[parentId] = [];
                        subFeedbackMap[parentId].push({
                            id: sub.Risk_Issue_feedback_id,
                            text: DOMPurify.sanitize(sub.feedback_text || '-', { ALLOWED_TAGS: [] }),
                            fileName: DOMPurify.sanitize(sub.supported_document_name || '', { ALLOWED_TAGS: [] }),
                            fileUrl: sub.supported_document || '#',
                            business_owner_decision: DOMPurify.sanitize(sub.decisionbackend || '-', { ALLOWED_TAGS: [] })
                        });
                    });

                    const mappedFeedback = parentItems.map(fbox => {
                        const feedbackId = fbox.Risk_Issue_feedback_id;
                        // Use API-nested sub_feedbacks if available, otherwise use client-side map
                        const nestedSubs = Array.isArray(fbox.sub_feedbacks) && fbox.sub_feedbacks.length > 0
                            ? fbox.sub_feedbacks.map(sub => ({
                                id: sub.Risk_Issue_feedback_id,
                                text: DOMPurify.sanitize(sub.feedback_text || '-', { ALLOWED_TAGS: [] }),
                                fileName: DOMPurify.sanitize(sub.supported_document_name || '', { ALLOWED_TAGS: [] }),
                                fileUrl: sub.supported_document || '#',
                                business_owner_decision: DOMPurify.sanitize(sub.decisionbackend || '-', { ALLOWED_TAGS: [] })
                            }))
                            : (subFeedbackMap[feedbackId] || []);

                        return {
                            id: feedbackId,
                            initiateWorkId: fbox.Risk_Issue_Specification_Initiate_Work_id || '-',
                            bof: {
                                text: DOMPurify.sanitize(fbox.feedback_text || '-', { ALLOWED_TAGS: [] }),
                                fileName: DOMPurify.sanitize(fbox.supported_document_name || '', { ALLOWED_TAGS: [] }),
                                fileUrl: fbox.supported_document || '#',
                                business_owner_decision: DOMPurify.sanitize(fbox.decisionbackend || '-', { ALLOWED_TAGS: [] }),
                                subRows: nestedSubs
                            }
                        };
                    });

                    // Sort by Initiate Work ID (numerical)
                    mappedFeedback.sort((a, b) => {
                        const idA = parseInt(String(a.initiateWorkId).replace(/\D/g, '')) || 0;
                        const idB = parseInt(String(b.initiateWorkId).replace(/\D/g, '')) || 0;
                        return idA - idB;
                    });

                    setCombinedRows(mappedFeedback);
                } else {
                    setCombinedRows([]);
                }
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    }, [id, selectedProject, handleAuthError]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleStart = async (row) => {
        if (isStarting) return;
        setIsStarting(true);
        try {
            const token = await getIdToken();
            if (!token) {
                handleAuthError();
                return;
            }

            const userId = localStorage.getItem('user_id') || 'system';
            const projectId = localStorage.getItem('project_id') || selectedProject?.id || row.Project_id || '101';
            const currentTimestamp = new Date().toISOString();

            const payload = {
                Risk_Issue_Assignment_id: DOMPurify.sanitize(row.Risk_Issue_Assignment_id || '', { ALLOWED_TAGS: [] }),
                Project_id: projectId,
                RiskAndIssueFormId: DOMPurify.sanitize(row.RiskAndIssueFormId || '', { ALLOWED_TAGS: [] }),
                RiskAndIssueDisplayId: DOMPurify.sanitize(row.RiskAndIssueDisplayId || '', { ALLOWED_TAGS: [] }),
                Resource_Roster_Form_id: DOMPurify.sanitize(row.Resource_Roster_Form_id || '', { ALLOWED_TAGS: [] }),
                riskIssue_title: DOMPurify.sanitize(row.riskIssue_title || row.ricewObject || '', { ALLOWED_TAGS: [] }),
                assign_object_date: row.assign_object_date || row.assignedDate || "",
                start_object_date: currentTimestamp, // Cleared in ISO format
                assign_work_status: "yes",
                Target_Resolution_Date: row.Target_Resolution_Date || row.targetResolutionDate || "",
                Upload_Object: [],
                created_by: userId,
                updated_by: userId
            };

            if (row.Risk_Issue_Specification_Initiate_Work_id) {
                payload.Risk_Issue_Specification_Initiate_Work_id = DOMPurify.sanitize(row.Risk_Issue_Specification_Initiate_Work_id, { ALLOWED_TAGS: [] });
            }

            const response = await fetch('https://ves5hu7c23.execute-api.ap-south-1.amazonaws.com/New/ricew/riskIssueInitiateWork/createSubmit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.status === 401 || response.status === 403) {
                handleAuthError();
                return;
            }

            const result = await response.json();
            if (result.success) {
                setSuccessMsg('Work Initiated Successfully');
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 3000);
                fetchData();
            } else {
                setErrorMsg('Failed to initiate work: ' + (result.error || 'Unknown error'));
                setShowError(true);
                setTimeout(() => setShowError(false), 5000);
            }
        } catch (error) {
            console.error('Error initiating work:', error);
            setErrorMsg('Failed to initiate work');
            setShowError(true);
            setTimeout(() => setShowError(false), 5000);
        } finally {
            setIsStarting(false);
        }
    };

    const handleUploadClick = (row) => {
        setUploadingRow(row);

        const realFiles = (row.uploadFiles || []).filter(f =>
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

        setTechnicalOwnerName(row.ownerRiskIssueName === '-' ? '' : (row.ownerRiskIssueName || ''));
        setTechnicalOwnerEmail(row.ownerRiskIssueEmail === '-' ? '' : (row.ownerRiskIssueEmail || ''));
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

    const handleUploadSubmit = async () => {
        const filesToUpload = modalDocuments.filter(d => d.file && !d.isUploaded);
        if (filesToUpload.length === 0) return true;

        setLoading(true);
        try {
            const token = await getIdToken();
            if (!token) {
                handleAuthError();
                return;
            }

            const userId = localStorage.getItem('user_id') || 'system';
            const projectId = localStorage.getItem('project_id') || selectedProject?.id || uploadingRow.Project_id || '101';

            const payload = {
                Risk_Issue_Assignment_id: DOMPurify.sanitize(uploadingRow.Risk_Issue_Assignment_id || '', { ALLOWED_TAGS: [] }),
                Risk_Issue_Specification_Initiate_Work_id: DOMPurify.sanitize(uploadingRow.Risk_Issue_Specification_Initiate_Work_id || '', { ALLOWED_TAGS: [] }),
                Record_Title: DOMPurify.sanitize(uploadingRow.riskIssue_title || uploadingRow.ricewObject || '', { ALLOWED_TAGS: [] }),
                documents: filesToUpload.map(d => {
                    const timestamp = new Date().getTime();
                    const dotIndex = d.file.name.lastIndexOf('.');
                    const fileNameWithoutExt = dotIndex !== -1 ? d.file.name.substring(0, dotIndex) : d.file.name;
                    const extension = dotIndex !== -1 ? d.file.name.substring(dotIndex) : '';
                    const newFileName = `${fileNameWithoutExt}_${timestamp}${extension}`;
                    d.newFileName = newFileName; // Attach to doc object for step 3
                    return {
                        name: newFileName,
                        type: d.file.type
                    };
                })
            };

            const response = await fetch('https://ves5hu7c23.execute-api.ap-south-1.amazonaws.com/New/generate-presigned-urls/risk-issue-specification-initiate-work', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.status === 401 || response.status === 403) {
                handleAuthError();
                return;
            }

            const result = await response.json();
            if (result.success && result.urls) {
                // Upload each file to S3
                const uploadPromises = filesToUpload.map(async (doc, idx) => {
                    const s3Data = result.urls[idx];
                    await fetch(s3Data.signedUrl, {
                        method: 'PUT',
                        body: doc.file,
                        headers: { 'Content-Type': doc.file.type }
                    });
                    return { ...doc, isUploaded: true, uploadObject: s3Data.publicCloudFrontUrl, file: null };
                });

                const updatedDocs = await Promise.all(uploadPromises);

                // --- STEP 3: Update the record in DynamoDB with the new file links ---
                const savePayload = {
                    Risk_Issue_Specification_Initiate_Work_id: DOMPurify.sanitize(uploadingRow.Risk_Issue_Specification_Initiate_Work_id || '', { ALLOWED_TAGS: [] }),
                    Project_id: projectId,
                    Risk_Issue_Assignment_id: DOMPurify.sanitize(uploadingRow.Risk_Issue_Assignment_id || '', { ALLOWED_TAGS: [] }),
                    RiskAndIssueFormId: DOMPurify.sanitize(uploadingRow.RiskAndIssueFormId || '', { ALLOWED_TAGS: [] }),
                    RiskAndIssueDisplayId: DOMPurify.sanitize(uploadingRow.RiskAndIssueDisplayId || '', { ALLOWED_TAGS: [] }),
                    Resource_Roster_Form_id: DOMPurify.sanitize(uploadingRow.Resource_Roster_Form_id || '', { ALLOWED_TAGS: [] }),
                    riskIssue_title: DOMPurify.sanitize(uploadingRow.riskIssue_title || uploadingRow.ricewObject || '', { ALLOWED_TAGS: [] }),
                    Upload_Object: updatedDocs.map(d => ({
                        File_Name: DOMPurify.sanitize(d.newFileName || d.path || '', { ALLOWED_TAGS: [] }),
                        url: d.uploadObject
                    })),
                    created_by: userId,
                    updated_by: userId
                };

                const saveResponse = await fetch('https://ves5hu7c23.execute-api.ap-south-1.amazonaws.com/New/ricew/riskIssueInitiateWork/createSubmit', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(savePayload)
                });

                if (saveResponse.status === 401 || saveResponse.status === 403) {
                    handleAuthError();
                    return;
                }

                const saveResult = await saveResponse.json();
                if (saveResult.success) {
                    setModalDocuments(prev => prev.map(doc => {
                        const matched = updatedDocs.find(u => u.id === doc.id);
                        return matched || doc;
                    }));

                    setSuccessMsg('Files uploaded and record updated successfully');
                    setShowSuccess(true);
                    setTimeout(() => setShowSuccess(false), 3000);
                    fetchData(); // Refresh the main table
                    return true;
                } else {
                    setErrorMsg('Files uploaded but failed to update record');
                    setShowError(true);
                    setTimeout(() => setShowError(false), 5000);
                    return false;
                }
            } else {
                setErrorMsg('Failed to generate upload URLs');
                setShowError(true);
                setTimeout(() => setShowError(false), 5000);
                return false;
            }
        } catch (error) {
            console.error('Error uploading files:', error);
            setErrorMsg('Failed to upload files');
            setShowError(true);
            setTimeout(() => setShowError(false), 5000);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const handleAssignToTechnicalOwner = async () => {
        if (isAssigning) return;
        if (!uploadingRow?.Risk_Issue_Specification_Initiate_Work_id) {
            setErrorMsg('Initial work must be started before assigning');
            setShowError(true);
            setTimeout(() => setShowError(false), 5000);
            return;
        }

        if (!businessOwnerName || !businessOwnerEmail) {
            setErrorMsg('Owner name and email are required');
            setShowError(true);
            setTimeout(() => setShowError(false), 5000);
            return;
        }

        if (emailError) {
            setErrorMsg('Please enter a valid email address');
            setShowError(true);
            setTimeout(() => setShowError(false), 5000);
            return;
        }

        // Auto-upload pending files if any
        const pendingFiles = modalDocuments.filter(d => d.file && !d.isUploaded);
        if (pendingFiles.length > 0) {
            const uploadSuccess = await handleUploadSubmit();
            if (!uploadSuccess) return; // Stop if upload failed
        }

        setIsAssigning(true);
        setLoading(true);
        try {
            const token = await getIdToken();
            if (!token) {
                handleAuthError();
                return;
            }

            const projectId = localStorage.getItem('project_id') || selectedProject?.id || uploadingRow.Project_id || '101';
            const userId = localStorage.getItem('user_id') || 'system';
            const currentProjectName = localStorage.getItem('project_name') || selectedProject?.name || '';

            // API 1: Update Comment
            const commentPayload = {
                Risk_Issue_Specification_Initiate_Work_id: DOMPurify.sanitize(uploadingRow.Risk_Issue_Specification_Initiate_Work_id || '', { ALLOWED_TAGS: [] }),
                Project_id: projectId,
                Comment_section: DOMPurify.sanitize(uploadingRow.comment || '', { ALLOWED_TAGS: [] })
            };

            const commentRes = await fetch('https://ves5hu7c23.execute-api.ap-south-1.amazonaws.com/New/ricew/riskIssueInitiateWork/UpdateRiskIssueComment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(commentPayload)
            });

            if (commentRes.status === 401 || commentRes.status === 403) {
                handleAuthError();
                return;
            }

            // API 2: Assign Owner and trigger Email
            const emailPayload = {
                Risk_Issue_Assignment_id: DOMPurify.sanitize(uploadingRow.Risk_Issue_Assignment_id || id || '', { ALLOWED_TAGS: [] }),
                RiskAndIssueFormId: DOMPurify.sanitize(uploadingRow.RiskAndIssueFormId || '', { ALLOWED_TAGS: [] }),
                Project_id: projectId,
                project_name: currentProjectName,
                riskIssue_owner_email: DOMPurify.sanitize(businessOwnerEmail || '', { ALLOWED_TAGS: [] }),
                riskIssue_owner_name: DOMPurify.sanitize(businessOwnerName || '', { ALLOWED_TAGS: [] }),
                Risk_Issue_Specification_Initiate_Work_id: DOMPurify.sanitize(uploadingRow.Risk_Issue_Specification_Initiate_Work_id || '', { ALLOWED_TAGS: [] }),
                Initiate_Work_Risk_Issue_end_date: new Date().toISOString(),
                updated_by: userId
            };

            const emailRes = await fetch('https://ves5hu7c23.execute-api.ap-south-1.amazonaws.com/New/email-Send/assignRiskIssueOwner/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(emailPayload)
            });

            if (emailRes.status === 401 || emailRes.status === 403) {
                handleAuthError();
                return;
            }

            const commentResult = await commentRes.json();
            const emailResult = await emailRes.json();

            if (commentResult.success && emailResult.success) {
                setSuccessMsg('Owner assigned and comment updated successfully');
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 3000);
                setShowUploadModal(false);
                fetchData();
            } else {
                setErrorMsg('Failed to complete assignment. Please check owner details.');
                setShowError(true);
                setTimeout(() => setShowError(false), 5000);
            }
        } catch (error) {
            console.error('Error in assignment workflow:', error);
            setErrorMsg('Failed to assign owner');
            setShowError(true);
            setTimeout(() => setShowError(false), 5000);
        } finally {
            setLoading(false);
            setIsAssigning(false);
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
                    uploadFiles: [],
                    fileName: '-',
                    endDate: '-',
                    comment: '',
                    isStarted: false,
                    isUploaded: false,
                    statusVerification: template.statusVerification,
                    Risk_Issue_Specification_Initiate_Work_id: '',
                    isNewRow: true
                }
            ]);
        }
    };

    const handleWorkRemoveRow = (rowId) => {
        setWorkData(prev => prev.filter(row => row.id !== rowId));
    };

    const getFileViewUrl = (url, fileName) => {
        if (!url || url === '-' || !url.startsWith('http')) return url;
        const extension = (fileName || url.split('?')[0]).split('.').pop().toLowerCase();
        if (['xlsx', 'xls', 'csv', 'docx', 'doc'].includes(extension)) {
            return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`;
        }
        return url;
    };

    return (
        <div className="config-main" style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '0', margin: '0', fontFamily: 'Arial, sans-serif' }}>
            <div style={{ padding: '1rem 1rem 2rem 1rem', width: '100%', minWidth: '1470px', margin: '0', boxSizing: 'border-box' }}>
                <div style={{ backgroundColor: 'white', padding: '0', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>

                    {/* Header */}
                    <div style={{ padding: '2rem 1rem 1rem 2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project : <span style={{ color: '#007bff' }}> {localStorage.getItem('project_name') || selectedProject?.name}</span></h3>
                        </div>
                    </div>

                    <div className="config-header" style={{ marginTop: '0', marginRight: "0px", display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 2rem' }}>
                        <h2 style={{ margin: 0 }}>Initiate Work (Risk And Issue)</h2>
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
                                                    <p style={{ margin: '6px 0 0 0', color: '#555' }}>The <strong>Initiate Work (Risk And Issue)</strong> page allows you to manage and submit your risk/issue resolution items.</p>
                                                </div>
                                                <div style={{ marginBottom: '16px' }}>
                                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to use</strong>
                                                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                                        <li>Click <strong>Start</strong> to begin working on an object.</li>
                                                        <li>Upload your resolution documents using the <strong>Response</strong> button.</li>
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

                    {/* Table Section */}
                    <div style={{ padding: '20px' }}>
                        <div style={{ border: '1px solid #ddd', overflowX: 'auto', width: '100%', marginTop: '10px' }}>
                            {/* Table Header */}
                            <div style={{ display: 'flex', borderBottom: '1px solid #ddd', backgroundColor: 'white', minWidth: '1650px' }}>
                                <div style={{ width: '60px', flex: '0 0 60px', padding: '12px 8px', fontWeight: 'bold', fontSize: '14px', borderRight: '1px solid #ddd', textAlign: 'center' }}>Sr. No.</div>
                                <div style={{ flex: '0 0 150px', width: '150px', padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', borderRight: '1px solid #ddd' }}>Record ID</div>
                                <div style={{ flex: '0 0 250px', width: '250px', padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', borderRight: '1px solid #ddd' }}>Record Title</div>
                                <div style={{ width: '150px', flex: '0 0 150px', padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', borderRight: '1px solid #ddd', textAlign: 'center' }}>Work Status</div>
                                <div style={{ flex: '0 0 120px', width: '120px', padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', borderRight: '1px solid #ddd' }}>Assigned Date</div>
                                <div style={{ flex: '0 0 120px', width: '120px', padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', borderRight: '1px solid #ddd' }}>Target Resolution Date</div>
                                <div style={{ flex: '0 0 120px', width: '120px', padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', borderRight: '1px solid #ddd' }}>Start work</div>
                                <div style={{ flex: '0 0 600px', width: '600px', padding: '0', fontWeight: 'bold', fontSize: '14px', borderRight: '1px solid #ddd', display: 'flex' }}>
                                    <div style={{ flex: 1, padding: '12px 12px', borderRight: '1px solid #ddd' }}>Response</div>
                                    <div style={{ width: '150px', padding: '12px 12px', borderRight: '1px solid #ddd', flexShrink: 0 }}>Approve Status</div>
                                    <div style={{ width: '150px', padding: '12px 12px', flexShrink: 0 }}>End Date</div>
                                </div>
                                <div style={{ flex: 2, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', minWidth: '280px' }}>Comment</div>
                            </div>

                            {/* Table Body */}
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: '1650px', backgroundColor: 'white' }}>
                                {workData.map((row, index) => (
                                    <div key={index} style={{ display: 'flex', borderBottom: '1px solid #ddd', minWidth: '1650px' }}>
                                        <div style={{ width: '60px', flex: '0 0 60px', padding: '12px 8px', fontSize: '13px', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {row.isNewRow ? (
                                                <Trash2
                                                    size={14}
                                                    style={{ cursor: 'pointer', color: '#dc2626' }}
                                                    onClick={() => handleWorkRemoveRow(row.id)}
                                                />
                                            ) : (row.Risk_Issue_Specification_Initiate_Work_id || index + 1)}
                                        </div>
                                        <div style={{ flex: '0 0 150px', width: '150px', padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'center', fontWeight: '500' }}>
                                            {row.RiskAndIssueDisplayId || '-'}
                                        </div>
                                        <div style={{ flex: '0 0 250px', width: '250px', padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'center' }}>{row.ricewObject}</div>
                                        <div style={{ width: '150px', flex: '0 0 150px', padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <span style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: '#dbeafe', color: '#1e40af', fontWeight: '500', fontSize: '11px' }}>{row.statusVerification}</span>
                                        </div>
                                        <div style={{ flex: '0 0 120px', width: '120px', padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'center' }}>{formatToDDMMMYYYY(row.assignedDate)}</div>
                                        <div style={{ flex: '0 0 120px', width: '120px', padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'center' }}>{formatToDDMMMYYYY(row.targetResolutionDate)}</div>
                                        <div style={{ flex: '0 0 120px', width: '120px', padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'center' }}>
                                            {row.isStarted ? formatToDDMMMYYYY(row.startObject) : (
                                                <button
                                                    onClick={() => handleStart(row)}
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
                                                >
                                                    {isStarting ? 'Starting...' : 'Start'}
                                                </button>
                                            )}
                                        </div>
                                        <div style={{ flex: '0 0 600px', width: '600px', padding: '0', fontSize: '13px', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'stretch' }}>
                                            <div style={{ flex: '0 0 450px', width: '450px', borderRight: '1px solid #ddd', display: 'flex', flexDirection: 'column', alignSelf: 'stretch' }}>
                                                {row.uploadFiles && row.uploadFiles.length > 0 ? (
                                                    row.endDate === '-' ? (
                                                        <div style={{ flex: 1, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' }}>
                                                            <button onClick={() => handleUploadClick(row)} style={{ backgroundColor: '#f59e0b', color: 'white', border: 'none', padding: '6px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                                                                Re-Response
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        row.uploadFiles.map((file, fIdx) => {
                                                            const statusValue = file.document_approved === 'true' ? 'Approved' : file.document_approved === 'false' ? 'Rejected' : '-';
                                                            const statusColor = statusValue === 'Approved' ? '#059669' : statusValue === 'Rejected' ? '#dc2626' : '#64748b';

                                                            return (
                                                                <div key={fIdx} style={{ display: 'flex', borderBottom: fIdx < row.uploadFiles.length - 1 ? '1px solid #eee' : 'none', minHeight: '44px', flex: 1 }}>
                                                                    <div style={{ flex: 1, padding: '8px 12px', display: 'flex', alignItems: 'center', borderRight: '1px solid #eee', alignSelf: 'stretch' }}>
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
                                                                                padding: '4px 8px',
                                                                                borderRadius: '4px',
                                                                                border: '1px solid #bfdbfe',
                                                                                cursor: 'pointer',
                                                                                fontSize: '11px'
                                                                            }}
                                                                        >
                                                                            <span style={{ color: '#64748b', marginRight: '4px', fontWeight: '600' }}>{fIdx + 1}.</span>
                                                                            {file.File_Name}
                                                                        </a>
                                                                    </div>
                                                                    <div style={{ width: '150px', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, alignSelf: 'stretch' }}>
                                                                        <span style={{
                                                                            color: statusColor,
                                                                            fontWeight: '700',
                                                                            fontSize: '13px'
                                                                        }}>
                                                                            {statusValue}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    )
                                                ) : (
                                                    <div style={{ display: 'flex', flex: 1 }}>
                                                        <div style={{ flex: 1, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #eee' }}>
                                                            {(row.isStarted && (!row.endDate || row.endDate === '-')) ? (
                                                                <button onClick={() => handleUploadClick(row)} style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '6px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Response</button>
                                                            ) : '-'}
                                                        </div>
                                                        <div style={{ width: '150px', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</div>
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ width: '150px', flexShrink: 0, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' }}>
                                                {formatToDDMMMYYYY(row.endDate)}
                                            </div>
                                        </div>
                                        <div style={{ flex: 2, padding: '8px', minWidth: '280px' }}>
                                            <textarea value={row.comment} readOnly className="thin-scroll" style={{ width: '100%', height: '100%', minHeight: '60px', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '5px', fontSize: '12px', backgroundColor: '#f9f9f9', resize: 'none' }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Add Row Button */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '15px 0' }}>
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
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <Plus size={14} /> Add row
                            </button>
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
                                    value={workData[0]?.ownerRiskIssueName === '-' ? '' : (workData[0]?.ownerRiskIssueName || '')}
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
                                    value={workData[0]?.ownerRiskIssueEmail === '-' ? '' : (workData[0]?.ownerRiskIssueEmail || '')}
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
                                gridTemplateColumns: '60px 1.2fr 0.4fr 150px',
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
                                <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#fcfcfc' }}>Business Owner Decision</div>
                            </div>

                            {/* Feedback Rows */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '60px 1.2fr 0.4fr 150px',
                                borderLeft: '1px solid #ddd',
                                borderRadius: '0 0 4px 4px',
                                overflow: 'hidden',
                                backgroundColor: 'white'
                            }}>
                                {combinedRows.filter(r => r.bof.text || r.bof.fileName).length > 0 ? (
                                    combinedRows.filter(r => r.bof.text || r.bof.fileName).map((row, idx, arr) => {
                                        const isLast = idx === arr.length - 1;
                                        const cellBorderBottom = '1px solid #ddd';
                                        const rowSpan = 1 + (row.bof.subRows?.length || 0);
                                        return (
                                            <React.Fragment key={idx}>
                                                {/* Col 1: Sr. No. */}
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
                                                    color: row.bof.business_owner_decision === 'Close' ? '#718096' : '#666',
                                                    borderBottomLeftRadius: isLast && (row.bof.subRows?.length || 0) === 0 ? '4px' : '0'
                                                }}>
                                                    {row.initiateWorkId || '-'}
                                                </div>
                                                {/* Col 2: BOF Text (Read-only) */}
                                                <div style={{ borderBottom: (row.bof.subRows?.length > 0) ? '1px solid #eee' : cellBorderBottom, borderRight: '1px solid #ddd', padding: '5px', backgroundColor: row.bof.business_owner_decision === 'Close' ? '#f5f5f5' : '#f9f9f9' }}>
                                                    <textarea
                                                        value={row.bof.text}
                                                        readOnly={true}
                                                        style={{ width: '100%', border: 'none', outline: 'none', resize: 'none', minHeight: '35px', fontSize: '13px', fontFamily: 'Arial, sans-serif', padding: '5px', backgroundColor: 'transparent', cursor: 'not-allowed', color: row.bof.business_owner_decision === 'Close' ? '#718096' : '#333' }}
                                                    />
                                                </div>
                                                {/* Col 3: BOF Uploaded Document Name */}
                                                <div style={{ borderBottom: (row.bof.subRows?.length > 0) ? '1px solid #eee' : cellBorderBottom, borderRight: '1px solid #ddd', padding: '8px 5px', fontSize: '11px', color: row.bof.business_owner_decision === 'Close' ? '#718096' : 'black', display: 'flex', alignItems: 'center', overflow: 'hidden', backgroundColor: row.bof.business_owner_decision === 'Close' ? '#f5f5f5' : 'white' }}>
                                                    {row.bof.fileName ? (
                                                        <a href={getFileViewUrl(row.bof.fileUrl, row.bof.fileName)} target="_blank" rel="noopener noreferrer" style={{ color: '#3182ce', textDecoration: 'none', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', pointerEvents: 'auto' }} title={row.bof.fileName}>{row.bof.fileName}</a>
                                                    ) : <span style={{ color: '#999' }}>No doc</span>}
                                                </div>
                                                {/* Col 4: Business Owner Decision */}
                                                <div style={{ borderBottom: (row.bof.subRows?.length > 0) ? '1px solid #eee' : cellBorderBottom, borderRight: '1px solid #ddd', padding: '8px 5px', fontSize: '12px', color: row.bof.business_owner_decision === 'Close' ? '#718096' : '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: row.bof.business_owner_decision === 'Close' ? '#f5f5f5' : '#f9fafb', borderBottomRightRadius: isLast && (row.bof.subRows?.length || 0) === 0 ? '4px' : '0' }}>
                                                    {row.bof.business_owner_decision || 'Open'}
                                                </div>

                                                {/* Sub Rows */}
                                                {row.bof.subRows?.map((subRow, sIdx) => {
                                                    const isLastSubRow = sIdx === row.bof.subRows.length - 1;
                                                    const subCellBorderBottom = isLastSubRow ? cellBorderBottom : '1px solid #eee';
                                                    return (
                                                        <React.Fragment key={subRow.id || sIdx}>
                                                            {/* Sub Col 2: Sub Text (Read-only) */}
                                                            <div style={{ borderBottom: subCellBorderBottom, borderRight: '1px solid #ddd', padding: '5px', backgroundColor: subRow.business_owner_decision === 'Close' ? '#f5f5f5' : '#fffdee' }}>
                                                                <textarea value={subRow.text || ''} readOnly={true} style={{ width: '100%', border: 'none', outline: 'none', resize: 'none', minHeight: '30px', fontSize: '13px', fontFamily: 'Arial, sans-serif', padding: '5px', backgroundColor: 'transparent', cursor: 'not-allowed', color: subRow.business_owner_decision === 'Close' ? '#718096' : '#333' }} />
                                                            </div>
                                                            {/* Sub Col 3: Sub Uploaded Document Name */}
                                                            <div style={{ borderBottom: subCellBorderBottom, borderRight: '1px solid #ddd', padding: '8px 5px', fontSize: '11px', color: subRow.business_owner_decision === 'Close' ? '#718096' : 'black', display: 'flex', alignItems: 'center', overflow: 'hidden', backgroundColor: subRow.business_owner_decision === 'Close' ? '#f5f5f5' : 'white' }}>
                                                                {subRow.fileName ? <a href={getFileViewUrl(subRow.fileUrl, subRow.fileName)} target="_blank" rel="noopener noreferrer" style={{ color: '#3182ce', textDecoration: 'none', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', pointerEvents: 'auto' }} title={subRow.fileName}>{subRow.fileName}</a> : <span style={{ color: '#999' }}>No doc</span>}
                                                            </div>
                                                            {/* Sub Col 4: Sub Owner Decision */}
                                                            <div style={{ borderBottom: subCellBorderBottom, borderRight: '1px solid #ddd', padding: '8px 5px', fontSize: '12px', color: subRow.business_owner_decision === 'Close' ? '#718096' : '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: subRow.business_owner_decision === 'Close' ? '#f5f5f5' : '#f9fafb', borderBottomRightRadius: isLast && isLastSubRow ? '4px' : '0' }}>
                                                                {subRow.business_owner_decision || 'Open'}
                                                            </div>
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </React.Fragment>
                                        );
                                    })
                                ) : (
                                    <div style={{ gridColumn: 'span 4', padding: '20px', textAlign: 'center', color: '#999', borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd' }}>No feedback available</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {loading && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
                    <div style={{ width: '50px', height: '50px', border: '3px solid #f3f3f3', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                </div>
            )}

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
                        {/* Modal Header */}
                        <div className="config-header" style={{
                            margin: '0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0 20px',
                            height: '50px'
                        }}>
                            <h2 style={{ fontSize: '18px', margin: 0 }}>Upload Form (Risk / Issue)</h2>
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

                            {/* Global Upload Button */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '15px', marginBottom: '20px' }}>
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
                                            setWorkData(prev => prev.map(row =>
                                                row.Risk_Issue_Assignment_id === uploadingRow?.Risk_Issue_Assignment_id ? { ...row, comment: newVal } : row
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

                            {/* Client Technical Owner Section */}
                            <div style={{
                                display: 'flex',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                overflow: 'hidden',
                                width: '100%'
                            }}>
                                <div style={{
                                    flex: '0 0 140px',
                                    padding: '12px 12.5px',
                                    borderRight: '1px solid #ddd',
                                    fontWeight: 'bold',
                                    fontSize: '13px',
                                    color: '#333',
                                    backgroundColor: '#f8f9fa',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}>
                                    Owner (Risk/Issue)
                                </div>
                                <div style={{ flex: 1, backgroundColor: 'white' }}>
                                    <div style={{ display: 'flex', padding: '5px 10px', borderBottom: '1px solid #ddd', alignItems: 'center', height: '58px' }}>
                                        <div style={{ flex: '0 0 100px', fontSize: '13px', color: '#666' }}>Name <span style={{ color: '#ef4444' }}>*</span></div>
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                            <input
                                                type="text"
                                                value={businessOwnerName}
                                                readOnly={true}
                                                placeholder="Enter Name"
                                                style={{ width: '100%', height: '32px', padding: '0 10px', fontSize: '13px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', padding: '5px 10px', alignItems: 'center', height: '58px' }}>
                                        <div style={{ flex: '0 0 100px', fontSize: '13px', color: '#666' }}>Email <span style={{ color: '#ef4444' }}>*</span></div>
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                            <input
                                                type="email"
                                                value={businessOwnerEmail}
                                                readOnly={true}
                                                placeholder="Enter Email"
                                                style={{ width: '100%', height: '32px', padding: '0 10px', fontSize: '13px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                                            />
                                            {emailError && <span style={{ color: '#ef4444', fontSize: '11px' }}>{emailError}</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Assign Button */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                                <button
                                    onClick={handleAssignToTechnicalOwner}
                                    disabled={isAssigning}
                                    style={{
                                        backgroundColor: isAssigning ? '#6c757d' : '#28a745',
                                        color: 'white',
                                        border: 'none',
                                        padding: '10px 20px',
                                        borderRadius: '4px',
                                        cursor: isAssigning ? 'not-allowed' : 'pointer',
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        transition: 'all 0.2s',
                                        opacity: isAssigning ? 0.7 : 1
                                    }}
                                >
                                    {isAssigning ? 'Assigning...' : 'Assign Owner (Risk/Issue)'}
                                </button>
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
                        <span style={{ fontSize: '16px', color: '#333', fontWeight: '500' }}>
                            Loading...
                        </span>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .thin-scroll::-webkit-scrollbar { width: 4px; }
                .thin-scroll::-webkit-scrollbar-track { background: #f1f1f1; }
                .thin-scroll::-webkit-scrollbar-thumb { background: #888; border-radius: 4px; }
                .thin-scroll-textarea::-webkit-scrollbar { width: 4px; }
                .thin-scroll-textarea::-webkit-scrollbar-track { background: #f1f1f1; }
                .thin-scroll-textarea::-webkit-scrollbar-thumb { background: #888; border-radius: 4px; }
                .help-modal-scroll::-webkit-scrollbar { width: 4px; }
                .help-modal-scroll::-webkit-scrollbar-track { background: transparent; margin: 8px 0; }
                .help-modal-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                .help-modal-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}</style>
        </div>
    );
};

export default RiskAndIssueWriterInitiateWork;
