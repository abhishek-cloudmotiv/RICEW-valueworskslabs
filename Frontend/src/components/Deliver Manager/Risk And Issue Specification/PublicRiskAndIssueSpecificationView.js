import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getIdToken } from '../../../utils/cognito-auth';
import DOMPurify from 'dompurify';
import { Trash2, Plus, HelpCircle, X } from 'lucide-react';

const PublicRiskAndIssueSpecificationView = ({ selectedProject, onBackToLanding }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [formData, setFormData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [projectId, setProjectId] = useState('');
    const [projectName, setProjectName] = useState('');

    // Table 1 Data
    const [workData, setWorkData] = useState([]);
    const workDataRef = useRef([]);

    useEffect(() => {
        workDataRef.current = workData;
    }, [workData]);

    // Feedback Form (Table 2) State
    const [ownerName, setOwnerName] = useState('');
    const [ownerEmail, setOwnerEmail] = useState('');
    const [ownerId, setOwnerId] = useState('');
    const [clientOwnerName, setClientOwnerName] = useState('');
    const [clientOwnerEmail, setClientOwnerEmail] = useState('');
    const [clientOwnerId, setClientOwnerId] = useState('');
    const [writerName, setWriterName] = useState('');
    const [writerEmail, setWriterEmail] = useState('');
    const [recordDisplayId, setRecordDisplayId] = useState('');
    const [workStatus, setWorkStatus] = useState('');
    const [feedbackRows, setFeedbackRows] = useState([
        { id: Date.now(), text: '', fileName: '', fileUrl: '', feedback_business_owner_id: '', subRows: [] }
    ]);

    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [showErrorMessage, setShowErrorMessage] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const [docApprovalStatus, setDocApprovalStatus] = useState({});

    const [showHelpPopup, setShowHelpPopup] = useState(false);
    const helpPopupRef = useRef(null);

    useEffect(() => {
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

    // Confirmation Dialog States
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [confirmMessage, setConfirmMessage] = useState('');
    const [pendingDecisionChange, setPendingDecisionChange] = useState(null);

    // Email Selection Modal States
    const [clientRoster, setClientRoster] = useState([]);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [showEmailLOV, setShowEmailLOV] = useState(false);
    const [emailModalSearchName, setEmailModalSearchName] = useState('');
    const [emailModalSearchEmail, setEmailModalSearchEmail] = useState('');
    const [selectedRosterId, setSelectedRosterId] = useState('');
    const emailLovRef = useRef(null);

    const fetchClientRoster = useCallback(async (manualProjectId) => {
        try {
            const projectId = manualProjectId || localStorage.getItem('project_id') || selectedProject?.id;
            if (!projectId) return;

            const response = await fetch(`https://ves5hu7c23.execute-api.ap-south-1.amazonaws.com/New/ricew/ClientRosterForm/getAll?project_id=${projectId}`, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const result = await response.json();
            if (result.success && result.data) {
                const sanitizedRoster = result.data.map(item => ({
                    ...item,
                    Client_name: DOMPurify.sanitize(item.Client_name || '', { ALLOWED_TAGS: [] }),
                    Email_Address: DOMPurify.sanitize(item.Email_Address || '', { ALLOWED_TAGS: [] })
                }));
                setClientRoster(sanitizedRoster);
            }
        } catch (error) {
            console.error("Error fetching client roster:", error);
        }
    }, [selectedProject]);

    useEffect(() => {
        const storedProjectId = localStorage.getItem('project_id');
        if (storedProjectId) {
            fetchClientRoster(storedProjectId);
        }
    }, [fetchClientRoster]);

    const handleDocAction = async (riskIssueWorkId, fileName, fileUrl, action) => {
        if (!riskIssueWorkId || !fileName) {
            console.error("Missing ID or file name for approval action");
            return;
        }

        setLoading(true);
        try {
            const isApproved = action === 'Approved' ? 'true' : 'false';
            const payload = {
                Risk_Issue_Specification_Initiate_Work_id: riskIssueWorkId,
                File_Name: DOMPurify.sanitize(fileName || '', { ALLOWED_TAGS: [] }),
                document_approved: isApproved,
                updated_by: DOMPurify.sanitize(localStorage.getItem('user_id') || 'Risk Issue Manager', { ALLOWED_TAGS: [] })
            };

            const response = await fetch('https://ves5hu7c23.execute-api.ap-south-1.amazonaws.com/New/publicView/approveSingleDoc/riskIssue/syncUpdateDocumentStatusByWorkId', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                setDocApprovalStatus(prev => ({ ...prev, [fileUrl]: action }));
                setSuccessMessage(`Document ${fileName} ${action === 'Approved' ? 'approved' : 'rejected'} successfully.`);
                setShowSuccessMessage(true);
                setTimeout(() => setShowSuccessMessage(false), 4000);

                // Only refresh work items (Document Approve section), preserving unsaved feedback text
                fetchWorkDataOnly();
            } else {
                const resText = await response.text();
                console.error('Failed to update status:', resText);
                setErrorMessage(`Failed to update status: ${resText}`);
                setShowErrorMessage(true);
                setTimeout(() => setShowErrorMessage(false), 4000);
            }
        } finally {
            setLoading(false);
        }
    };

    const isClosed = (val) => {
        if (!val) return false;
        const lower = val.toLowerCase();
        return lower === 'close' || lower === 'closed' || lower === 'submitted';
    };

    const formatToDDMMMYYYY = (dateStr) => {
        if (!dateStr || dateStr === '-') return '-';
        try {
            const cleanStr = dateStr.replace('_', '/').replace(',', '').trim();
            const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

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
            return `${day}-${months[dateObj.getMonth()]}-${dateObj.getFullYear()}`;
        } catch (e) {
            return dateStr;
        }
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Call all 3 APIs in parallel
            const [assignmentRes, initiateWorkRes, ownerDetailsRes] = await Promise.all([
                fetch(`https://ves5hu7c23.execute-api.ap-south-1.amazonaws.com/New/publicView/feedbackForm/assignmentDetails?Risk_Issue_Assignment_id=${id}`),
                fetch(`https://ves5hu7c23.execute-api.ap-south-1.amazonaws.com/New/publicView/feedbackForm/initiateWorkDetails?Risk_Issue_Assignment_id=${id}`),
                fetch(`https://ves5hu7c23.execute-api.ap-south-1.amazonaws.com/New/publicView/assignment/ownerDetails?Risk_Issue_Assignment_id=${id}`)
            ]);

            const [assignmentResult, initiateWorkResult, ownerDetailsResult] = await Promise.all([
                assignmentRes.json(),
                initiateWorkRes.json(),
                ownerDetailsRes.json()
            ]);

            // 1. Owner info + Project_id from ownerDetails (dedicated source)
            const fetchedProjectId = ownerDetailsResult.success ? ownerDetailsResult.data?.Project_id || '' : '';

            // Always ensure formData is set so the page renders
            // (even when no feedback has been submitted yet)
            setFormData({ RiskAndIssueFormId: id, title: "Risk and Issue Specification" });

            if (ownerDetailsResult.success && ownerDetailsResult.data) {
                const {
                    Owner_Risk_Issue_name,
                    Owner_Risk_Issue_email,
                    assigned_to_name,
                    assigned_to,
                    RiskAndIssueDisplayId,
                    riskIssue_status,
                    Business_Owner_Client_name,
                    business_owner,
                    Business_Owner_Client_id,
                    Owner_Risk_Issue_id
                } = ownerDetailsResult.data;

                setOwnerName(DOMPurify.sanitize(Owner_Risk_Issue_name || '', { ALLOWED_TAGS: [] }));
                setOwnerEmail(DOMPurify.sanitize(Owner_Risk_Issue_email || '', { ALLOWED_TAGS: [] }));
                setOwnerId(Owner_Risk_Issue_id || '');

                setClientOwnerName(DOMPurify.sanitize(Business_Owner_Client_name || '', { ALLOWED_TAGS: [] }));
                setClientOwnerEmail(DOMPurify.sanitize(business_owner || '', { ALLOWED_TAGS: [] }));
                setClientOwnerId(Business_Owner_Client_id || '');

                if (assigned_to_name) setWriterName(DOMPurify.sanitize(assigned_to_name, { ALLOWED_TAGS: [] }));
                if (assigned_to) setWriterEmail(DOMPurify.sanitize(assigned_to, { ALLOWED_TAGS: [] }));

                if (RiskAndIssueDisplayId) setRecordDisplayId(DOMPurify.sanitize(RiskAndIssueDisplayId || '', { ALLOWED_TAGS: [] }));
                if (riskIssue_status) setWorkStatus(DOMPurify.sanitize(riskIssue_status || '', { ALLOWED_TAGS: [] }));
            }

            if (fetchedProjectId) {
                setProjectId(fetchedProjectId);
                await fetchClientRoster(fetchedProjectId);

                try {
                    const projectRes = await fetch(`https://ves5hu7c23.execute-api.ap-south-1.amazonaws.com/New/publicView/projectDefinition?Project_id=${fetchedProjectId}`);
                    const projectResult = await projectRes.json();
                    if (projectResult.success && projectResult.data?.length > 0) {
                        setProjectName(DOMPurify.sanitize(projectResult.data[0].Project_Name || '', { ALLOWED_TAGS: [] }));
                    }
                } catch (projErr) {
                    console.error('Failed to fetch project name:', projErr);
                }
            }

            // 2. Process Initiate Work Data (Top Review Table)
            let workItems = [];
            if (initiateWorkResult.success && initiateWorkResult.data) {
                workItems = initiateWorkResult.data;
                const mappedWorkData = workItems.map(item => ({
                    srNo: item.Risk_Issue_Specification_Initiate_Work_id || item.SrNo || "0",
                    recordType: DOMPurify.sanitize(item.riskIssue_title || "-", { ALLOWED_TAGS: [] }),
                    assignedDate: DOMPurify.sanitize(item.assign_object_date || "-", { ALLOWED_TAGS: [] }),
                    startObject: DOMPurify.sanitize(item.start_object_date || "-", { ALLOWED_TAGS: [] }),
                    uploadFiles: Array.isArray(item.Upload_Object) ? item.Upload_Object.map(f => ({
                        url: f.url,
                        File_Name: DOMPurify.sanitize(f.File_Name || '', { ALLOWED_TAGS: [] }),
                        document_approved: f.document_approved
                    })) : [],
                    endDate: DOMPurify.sanitize(item.Target_Resolution_Date || "-", { ALLOWED_TAGS: [] }),
                    comment: DOMPurify.sanitize(item.Comment_section || "-", { ALLOWED_TAGS: [] }),
                    RiskIssue_Work_id: item.Risk_Issue_Specification_Initiate_Work_id,
                    approve_reject_Decision: DOMPurify.sanitize(item.approve_reject_Decision || "Pending", { ALLOWED_TAGS: [] })
                })).sort((a, b) => {
                    const idA = parseInt(String(a.srNo).replace(/\D/g, '')) || 0;
                    const idB = parseInt(String(b.srNo).replace(/\D/g, '')) || 0;
                    return idA - idB;
                });

                setWorkData(mappedWorkData);

                const fetchedRiskAndIssueFormId = workItems[0]?.RiskAndIssueFormId;

                if (workItems[0]?.riskIssue_title || fetchedRiskAndIssueFormId) {
                    setFormData(prev => ({
                        ...prev,
                        record_type: workItems[0]?.riskIssue_title || prev?.record_type,
                        RiskAndIssueFormId: fetchedRiskAndIssueFormId || prev?.RiskAndIssueFormId
                    }));
                }
            }

            // 3. Process Feedback rows + writer info (Assignment Details)
            if (assignmentResult.success && assignmentResult.data) {
                const existingFeedback = assignmentResult.data;
                const firstItem = existingFeedback[0];

                if (firstItem) {
                    if (firstItem.Business_Owner_Client_id) setOwnerId(firstItem.Business_Owner_Client_id);
                    else if (firstItem.Owner_Risk_Issue_id) setOwnerId(firstItem.Owner_Risk_Issue_id);

                    setFormData(prev => ({
                        ...(prev || {}),
                        RiskAndIssueFormId: prev?.RiskAndIssueFormId || firstItem.RiskAndIssueFormId || id,
                        title: "Risk and Issue Specification",
                        ricew_status: "Fetched",
                        riskIssue_status: "Open"
                    }));
                }

                // Synchronize Feedback Rows with Work Items
                // Every work item must have a feedback row, even if empty.
                const synchronizedFeedback = workItems.map((workItem) => {
                    const workId = workItem.Risk_Issue_Specification_Initiate_Work_id;
                    const fb = existingFeedback.find(f => String(f.Risk_Issue_Specification_Initiate_Work_id) === String(workId));

                    // Default decision should be "Close" if the work item is already submitted/closed
                    const defaultDecision = isClosed(workItem.approve_reject_Decision) ? 'Close' : 'Open';

                    const normalizeDecision = (val) => {
                        if (!val) return null;
                        return val === 'Closed' ? 'Close' : val;
                    };

                    if (fb) {
                        const rawDecision = fb.business_owner_decision;
                        const normalizedSubRows = (fb.sub_feedbacks || []).map(sub => ({
                            ...sub,
                            feedback_text: DOMPurify.sanitize(sub.feedback_text || '', { ALLOWED_TAGS: [] }),
                            supported_document_name: DOMPurify.sanitize(sub.supported_document_name || '', { ALLOWED_TAGS: [] }),
                            business_owner_decision: normalizeDecision(sub.business_owner_decision) || 'Open'
                        }));
                        return {
                            id: fb.Risk_Issue_feedback_id,
                            srNo: workId,
                            text: DOMPurify.sanitize(fb.feedback_text || "", { ALLOWED_TAGS: [] }),
                            fileUrl: fb.supported_document || "",
                            fileName: DOMPurify.sanitize(fb.supported_document_name || "", { ALLOWED_TAGS: [] }),
                            business_owner_decision: normalizeDecision(rawDecision) || defaultDecision,
                            workId: workId,
                            subRows: normalizedSubRows
                        };
                    } else {
                        return {
                            id: `new-${workId}-${Date.now()}`,
                            srNo: workId,
                            text: '',
                            fileName: '',
                            fileUrl: '',
                            business_owner_decision: defaultDecision,
                            workId: workId,
                            subRows: []
                        };
                    }
                }).sort((a, b) => {
                    const idA = parseInt(String(a.srNo).replace(/\D/g, '')) || 0;
                    const idB = parseInt(String(b.srNo).replace(/\D/g, '')) || 0;
                    return idA - idB;
                });

                setFeedbackRows(synchronizedFeedback.length > 0 ? synchronizedFeedback : [
                    { id: Date.now(), text: '', fileName: '', fileUrl: '', business_owner_decision: 'Open', subRows: [] }
                ]);
            } else if (initiateWorkResult.success) {
                // If assignment endpoint fails but we have work items, still show empty feedback rows
                const emptyFeedback = workItems.map(workItem => ({
                    id: `new-${workItem.Risk_Issue_Specification_Initiate_Work_id}-${Date.now()}`,
                    srNo: workItem.Risk_Issue_Specification_Initiate_Work_id,
                    text: '',
                    fileName: '',
                    fileUrl: '',
                    business_owner_decision: 'Open',
                    workId: workItem.Risk_Issue_Specification_Initiate_Work_id,
                    subRows: []
                })).sort((a, b) => {
                    const idA = parseInt(String(a.srNo).replace(/\D/g, '')) || 0;
                    const idB = parseInt(String(b.srNo).replace(/\D/g, '')) || 0;
                    return idA - idB;
                });
                setFeedbackRows(emptyFeedback);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            setFormData({ RiskAndIssueFormId: id });
        } finally {
            setLoading(false);
        }
    }, [id, fetchClientRoster]);



    const fetchFeedback = useCallback(async () => {
        await fetchData();
    }, [fetchData]);

    // Only refreshes the upper work items table (Document Approve section)
    // without touching feedbackRows — preserves any unsaved feedback text
    const fetchWorkDataOnly = useCallback(async () => {
        try {
            const [initiateWorkRes, ownerDetailsRes] = await Promise.all([
                fetch(`https://ves5hu7c23.execute-api.ap-south-1.amazonaws.com/New/publicView/feedbackForm/initiateWorkDetails?Risk_Issue_Assignment_id=${id}`),
                fetch(`https://ves5hu7c23.execute-api.ap-south-1.amazonaws.com/New/publicView/assignment/ownerDetails?Risk_Issue_Assignment_id=${id}`)
            ]);

            const [initiateWorkResult, ownerDetailsResult] = await Promise.all([
                initiateWorkRes.json(),
                ownerDetailsRes.json()
            ]);

            if (ownerDetailsResult.success && ownerDetailsResult.data) {
                if (ownerDetailsResult.data.RiskAndIssueDisplayId) setRecordDisplayId(ownerDetailsResult.data.RiskAndIssueDisplayId);
                if (ownerDetailsResult.data.riskIssue_status) setWorkStatus(ownerDetailsResult.data.riskIssue_status);
            }

            if (initiateWorkResult.success && initiateWorkResult.data) {
                const mappedWorkData = initiateWorkResult.data.map(item => ({
                    srNo: item.Risk_Issue_Specification_Initiate_Work_id || item.SrNo || "0",
                    recordType: DOMPurify.sanitize(item.riskIssue_title || "-", { ALLOWED_TAGS: [] }),
                    assignedDate: DOMPurify.sanitize(item.assign_object_date || "-", { ALLOWED_TAGS: [] }),
                    startObject: DOMPurify.sanitize(item.start_object_date || "-", { ALLOWED_TAGS: [] }),
                    uploadFiles: Array.isArray(item.Upload_Object) ? item.Upload_Object.map(f => ({
                        url: f.url,
                        File_Name: DOMPurify.sanitize(f.File_Name || '', { ALLOWED_TAGS: [] }),
                        document_approved: f.document_approved
                    })) : [],
                    endDate: DOMPurify.sanitize(item.Target_Resolution_Date || "-", { ALLOWED_TAGS: [] }),
                    comment: DOMPurify.sanitize(item.Comment_section || "-", { ALLOWED_TAGS: [] }),
                    RiskIssue_Work_id: item.Risk_Issue_Specification_Initiate_Work_id,
                    approve_reject_Decision: DOMPurify.sanitize(item.approve_reject_Decision || "Pending", { ALLOWED_TAGS: [] })
                })).sort((a, b) => {
                    const idA = parseInt(String(a.srNo).replace(/\D/g, '')) || 0;
                    const idB = parseInt(String(b.srNo).replace(/\D/g, '')) || 0;
                    return idA - idB;
                });

                setWorkData(mappedWorkData);
                const fetchedRiskAndIssueFormId = initiateWorkResult.data[0]?.RiskAndIssueFormId;
                if (fetchedRiskAndIssueFormId) {
                    setFormData(prev => ({ ...prev, RiskAndIssueFormId: fetchedRiskAndIssueFormId }));
                }
            }
        } catch (error) {
            console.error('Error refreshing work data:', error);
        }
    }, [id]);



    useEffect(() => {
        fetchData();
    }, [fetchData]);

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

    const handleConfirmYes = async () => {
        const action = pendingDecisionChange;
        setShowConfirmDialog(false);
        setConfirmMessage('');

        if (action) {
            await action();
            // If the action was an individual decision change, handleEmailModal(true) won't have been called.
            // But state updates are async, so we use the knowledge of our action types.
            // However, to be safe and clean, we'll only clear it if we ARE NOT in the email modal flow.
            // The cleanest way is to clear it in the actions themselves or check the modal state if possible.
            // Since we can't easily check state here, and handleEmailModalSubmit clears it anyway,
            // we will only clear it here if it's NOT the close work flow (which doesn't pass a client yet).
        }
    };

    const handleConfirmCancel = () => {
        setShowConfirmDialog(false);
        setConfirmMessage('');
        setPendingDecisionChange(null);
    };

    const handleEmailModalSubmit = () => {
        let selectedClient = clientRoster.find(c => (c.Resource_Roster_Form_id && c.Resource_Roster_Form_id === selectedRosterId) || c.Client_name === selectedRosterId);

        // Fallback: If no roster match found but we have name/email in the modal state, construct a virtual client object
        if (!selectedClient && emailModalSearchEmail) {
            selectedClient = {
                Client_name: emailModalSearchName,
                Email_Address: emailModalSearchEmail,
                Resource_Roster_Form_id: selectedRosterId || emailModalSearchName
            };
        }

        setShowEmailModal(false);
        if (pendingDecisionChange) {
            pendingDecisionChange(selectedClient);
        }
        setPendingDecisionChange(null);
    };

    const handleEmailModalCancel = () => {
        setShowEmailModal(false);
        setShowEmailLOV(false);
        setPendingDecisionChange(null);
    };

    const handleRowChange = (rowId, field, value) => {
        if (field === 'business_owner_decision') {
            const currentRow = feedbackRows.find(r => r.id === rowId);
            if (currentRow && currentRow.business_owner_decision !== value) {
                showConfirmation(
                    `Are you sure you want to change the decision to "${value}"?`,
                    async () => {
                        const decision = value === 'Close' ? 'Closed' : value;
                        try {
                            const response = await fetch('https://ves5hu7c23.execute-api.ap-south-1.amazonaws.com/New/publicView/feedbackForm/FeedbackDecisionUpdateOnly', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    Risk_Issue_Assignment_id: id,
                                    Project_id: projectId,
                                    decision: DOMPurify.sanitize(decision, { ALLOWED_TAGS: [] }),
                                    Risk_Issue_feedback_id: rowId.toString()
                                })
                            });

                            if (response.ok) {
                                // Update only this specific feedback row
                                setFeedbackRows(prev => prev.map(row =>
                                    row.id === rowId ? { ...row, business_owner_decision: value, decisionbackend: value } : row
                                ));
                            } else {
                                const errText = await response.text();
                                throw new Error(errText || 'Failed to update decision');
                            }
                        } catch (err) {
                            console.error("Error updating decision:", err);
                            setErrorMessage(`Failed to update decision: ${err.message}`);
                            setShowErrorMessage(true);
                            setTimeout(() => setShowErrorMessage(false), 5000);
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

    const handleFileUpload = (rowId, event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Just store the file object locally — actual upload happens on Submit Feedback
        setFeedbackRows(prev => prev.map(row =>
            row.id === rowId ? { ...row, fileName: file.name, fileObject: file, fileUrl: '' } : row
        ));

        if (event.target) {
            event.target.value = null;
        }
    };

    const handleAddSubRow = (parentId) => {
        setFeedbackRows(prev => prev.map(row => {
            if (row.id === parentId) {
                const newSubRow = {
                    id: `sub-new-${Date.now()}`,
                    Risk_Issue_feedback_id: `sub-new-${Date.now()}`,
                    feedback_text: '',
                    text: '',
                    supported_document: '',
                    supported_document_name: '',
                    fileName: '',
                    fileUrl: '',
                    fileObject: null,
                    business_owner_decision: 'Open',
                    isNew: true
                };
                return { ...row, subRows: [...(row.subRows || []), newSubRow] };
            }
            return row;
        }));
    };

    const handleSubRowChange = (parentId, subRowId, field, value) => {
        if (field === 'business_owner_decision') {
            let isExisting = false;
            let currentSubVal = '';
            feedbackRows.forEach(r => {
                if (r.id === parentId && r.subRows) {
                    const sub = r.subRows.find(s => (s.Risk_Issue_feedback_id || s.id) === subRowId);
                    if (sub) {
                        isExisting = !sub.isNew && !(typeof subRowId === 'string' && subRowId.startsWith('sub-new-'));
                        currentSubVal = sub.business_owner_decision || 'Open';
                    }
                }
            });

            if (isExisting && currentSubVal !== value) {
                showConfirmation(
                    `Are you sure you want to change the decision to "${value}"?`,
                    async () => {
                        const decision = value === 'Close' ? 'Closed' : value;
                        try {
                            const response = await fetch('https://ves5hu7c23.execute-api.ap-south-1.amazonaws.com/New/publicView/feedbackForm/FeedbackDecisionUpdateOnly', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    Risk_Issue_Assignment_id: id,
                                    Project_id: projectId,
                                    decision: DOMPurify.sanitize(decision, { ALLOWED_TAGS: [] }),
                                    Risk_Issue_feedback_id: subRowId.toString()
                                })
                            });

                            if (response.ok) {
                                setFeedbackRows(prev => prev.map(row => {
                                    if (row.id === parentId) {
                                        return {
                                            ...row,
                                            subRows: row.subRows.map(sub => {
                                                const sId = sub.Risk_Issue_feedback_id || sub.id;
                                                if (sId === subRowId) {
                                                    return { ...sub, business_owner_decision: value, decisionbackend: value };
                                                }
                                                return sub;
                                            })
                                        };
                                    }
                                    return row;
                                }));
                            } else {
                                const errText = await response.text();
                                throw new Error(errText || 'Failed to update decision');
                            }
                        } catch (err) {
                            console.error("Error updating sub-row decision:", err);
                            setErrorMessage(`Failed to update decision: ${err.message}`);
                            setShowErrorMessage(true);
                            setTimeout(() => setShowErrorMessage(false), 5000);
                        }
                    }
                );
                return;
            }
        }

        setFeedbackRows(prev => prev.map(row => {
            if (row.id === parentId) {
                return {
                    ...row,
                    subRows: row.subRows.map(sub => {
                        const subIdLocal = sub.Risk_Issue_feedback_id || sub.id;
                        if (subIdLocal === subRowId) {
                            if (field === 'text' || field === 'feedback_text') {
                                return { ...sub, text: value, feedback_text: value };
                            }
                            return { ...sub, [field]: value };
                        }
                        return sub;
                    })
                };
            }
            return row;
        }));
    };

    const handleSubRowFileUpload = (parentId, subRowId, event) => {
        const file = event.target.files[0];
        if (!file) return;
        setFeedbackRows(prev => prev.map(row => {
            if (row.id === parentId) {
                return {
                    ...row,
                    subRows: row.subRows.map(sub => {
                        const subId = sub.Risk_Issue_feedback_id || sub.id;
                        if (subId === subRowId) {
                            return { ...sub, fileName: file.name, supported_document_name: file.name, fileObject: file, fileUrl: '', supported_document: '' };
                        }
                        return sub;
                    })
                };
            }
            return row;
        }));
        if (event.target) event.target.value = null;
    };

    const handleRemoveSubRow = (parentId, subRowId) => {
        setFeedbackRows(prev => prev.map(row => {
            if (row.id === parentId) {
                return {
                    ...row,
                    subRows: row.subRows.filter(sub => {
                        const subId = sub.Risk_Issue_feedback_id || sub.id;
                        return subId !== subRowId;
                    })
                };
            }
            return row;
        }));
    };

    const handleCloseWork = async (selectedClient) => {
        if (!id) return;

        setLoading(true);
        try {
            if (!projectId) {
                setErrorMessage("Project context is missing. Please refresh the page and try again.");
                setShowErrorMessage(true);
                setLoading(false);
                return;
            }
            const currentProjectId = projectId;
            const userId = localStorage.getItem('user_id') || 'Risk Issue Manager';
            const userEmail = localStorage.getItem('userEmail') || 'manager@example.com';
            const currentOwnerName = ownerName || localStorage.getItem('user_name') || 'UnknownOwner';

            // Step 1: Submit any unsaved new feedback rows (with file upload if needed)
            const newRows = feedbackRows.filter((row) => {
                const isNew = typeof row.id === 'string' && (row.id.startsWith('new-') || row.id.startsWith('init-') || row.id.startsWith('existing-')) || typeof row.id === 'number';
                const hasContent = (row.text && row.text.trim() !== '') || row.fileObject || (row.fileUrl && row.fileUrl.trim() !== '');
                return isNew && hasContent;
            });

            if (newRows.length > 0) {
                const rowsWithUrls = await Promise.all(newRows.map(async (row) => {
                    if (!row.fileObject) return row;
                    const workId = row.workId || workData.find(w => String(w.srNo) === String(row.srNo))?.RiskIssue_Work_id || 'General';
                    const presignedRes = await fetch('https://ves5hu7c23.execute-api.ap-south-1.amazonaws.com/New/generate-presigned-urls/risk-issue-owner-feedback', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            Risk_Issue_Assignment_id: id,
                            Risk_Issue_Specification_Initiate_Work_id: workId.toString(),
                            Risk_Issue_object_owner_name: currentOwnerName,
                            documents: [{ name: row.fileObject.name, type: row.fileObject.type || 'application/octet-stream' }]
                        })
                    });
                    const presignedResult = await presignedRes.json();
                    if (!presignedResult.success || !presignedResult.urls?.length) throw new Error(`Failed to get upload URL for: ${row.fileObject.name}`);
                    const { signedUrl, publicCloudFrontUrl, documentName } = presignedResult.urls[0];
                    const uploadRes = await fetch(signedUrl, { method: 'PUT', headers: { 'Content-Type': row.fileObject.type || 'application/octet-stream' }, body: row.fileObject });
                    if (!uploadRes.ok) throw new Error(`Failed to upload file: ${row.fileObject.name}`);
                    return { ...row, fileUrl: publicCloudFrontUrl, fileName: documentName || row.fileObject.name };
                }));

                const newRecords = rowsWithUrls.map((row, idx) => {
                    const workId = row.workId || (workData[idx] ? workData[idx].RiskIssue_Work_id : "");
                    return {
                        Risk_Issue_Assignment_id: id,
                        Risk_Issue_Specification_Initiate_Work_id: workId.toString(),
                        RiskAndIssueFormId: formData?.RiskAndIssueFormId || id,
                        Project_id: currentProjectId,
                        parent_feedback_id: "",
                        row_number: (row.srNo || idx + 1).toString(),
                        sub_row_number: "",
                        feedback_text: DOMPurify.sanitize(row.text || '', { ALLOWED_TAGS: [] }),
                        supported_document: row.fileUrl || '',
                        supported_document_name: DOMPurify.sanitize(row.fileName || '', { ALLOWED_TAGS: [] }),
                        created_by: DOMPurify.sanitize(userId || '', { ALLOWED_TAGS: [] }),
                        business_owner_decision: 'Closed',
                        decisionbackend: 'Closed'
                    };
                });

                await fetch('https://ves5hu7c23.execute-api.ap-south-1.amazonaws.com/New/ricew/RiskIssue/FeedbackSubmit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ records: newRecords })
                });

                await new Promise(resolve => setTimeout(resolve, 1500));
            }

            // Step 2: Close all existing feedback records
            const existingFeedbackIds = feedbackRows
                .filter(row => typeof row.id === 'string' && !row.id.startsWith('new-') && !row.id.startsWith('init-') && !row.id.startsWith('existing-') && typeof row.id !== 'number')
                .map(row => row.id);

            if (existingFeedbackIds.length > 0) {
                await Promise.all(existingFeedbackIds.map(feedbackId =>
                    fetch('https://ves5hu7c23.execute-api.ap-south-1.amazonaws.com/New/publicView/feedbackForm/FeedbackDecisionUpdateOnly', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ Risk_Issue_feedback_id: feedbackId, decision: 'Closed' })
                    })
                ));
            }

            // Step 3: Close all initiate work records in a single batch call
            const workItems = feedbackRows
                .map((row, idx) => {
                    const workId = row.workId || workData[idx]?.RiskIssue_Work_id;
                    if (!workId) return null;
                    return { Risk_Issue_Specification_Initiate_Work_id: workId.toString(), Project_id: currentProjectId };
                })
                .filter(Boolean);

            if (workItems.length > 0) {
                await fetch('https://ves5hu7c23.execute-api.ap-south-1.amazonaws.com/New/publicView/feedbackForm/initiateWorkDetails/DecisionUpdate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(workItems)
                });
            }

            // Step 4: Send email + closure evidence
            const finalOwnerEmail = selectedClient ? selectedClient.Email_Address : ownerEmail;
            const finalOwnerName = selectedClient ? selectedClient.Client_name : ownerName;
            const finalOwnerId = selectedClient ? selectedClient.Resource_Roster_Form_id : (ownerId || '');

            const response = await fetch('https://ves5hu7c23.execute-api.ap-south-1.amazonaws.com/New/email-Send/clientBusinessOwner/verification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    RiskAndIssueFormId: formData?.RiskAndIssueFormId || id,
                    Risk_Issue_Assignment_id: id,
                    Project_id: currentProjectId,
                    Project_Name: DOMPurify.sanitize(projectName || '', { ALLOWED_TAGS: [] }),
                    riskIssue_title: DOMPurify.sanitize(formData?.record_type || workData[0]?.recordType || "Risk/Issue Object", { ALLOWED_TAGS: [] }),
                    Business_Owner_Client_email: DOMPurify.sanitize(finalOwnerEmail || '', { ALLOWED_TAGS: [] }),
                    Business_Owner_Client_name: DOMPurify.sanitize(finalOwnerName || '', { ALLOWED_TAGS: [] }),
                    Business_Owner_Client_id: finalOwnerId,
                    Writer_Name: DOMPurify.sanitize(writerName || '', { ALLOWED_TAGS: [] }),
                    Writer_Email: DOMPurify.sanitize(writerEmail || '', { ALLOWED_TAGS: [] }),
                    updated_by: DOMPurify.sanitize(userId || userEmail || '', { ALLOWED_TAGS: [] })
                })
            });

            if (response.ok) {
                try {
                    await fetch('https://ves5hu7c23.execute-api.ap-south-1.amazonaws.com/New/ricew/RiskIssue/ClosureEvidence', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            Risk_Issue_Assignment_id: id,
                            Project_id: projectId,
                            RiskAndIssueFormId: formData?.RiskAndIssueFormId || id,
                            closure_date: new Date().toISOString(),
                            closure_approved_by: DOMPurify.sanitize(finalOwnerEmail || '', { ALLOWED_TAGS: [] })
                        })
                    });
                } catch (ceError) {
                    console.error("Failed to process closure evidence:", ceError);
                }

                setSuccessMessage("Record closed and notification emails triggered successfully!");
                setShowSuccessMessage(true);
                setTimeout(() => setShowSuccessMessage(false), 4000);
                fetchData();
            } else {
                const resText = await response.text();
                throw new Error(resText || 'Failed to close record');
            }
        } catch (error) {
            console.error('Close record error:', error);
            setErrorMessage(`Failed to close record: ${error.message}`);
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 5000);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitDocument = async () => {
        if (!id) return;
        const userId = localStorage.getItem('user_id') || 'Risk Issue Manager';
        setLoading(true);
        try {
            if (!projectId) {
                setErrorMessage("Project context is missing. Please refresh the page and try again.");
                setShowErrorMessage(true);
                setLoading(false);
                return;
            }
            const currentProjectId = projectId;
            const currentOwnerName = ownerName || localStorage.getItem('user_name') || 'UnknownOwner';

            // Only process NEW rows (not existing DB records) that have actual content
            const newRows = feedbackRows.filter((row) => {
                const isNew = typeof row.id === 'string' && (row.id.startsWith('new-') || row.id.startsWith('init-') || row.id.startsWith('existing-')) || typeof row.id === 'number';
                const hasContent = (row.text && row.text.trim() !== '') || row.fileObject || (row.fileUrl && row.fileUrl.trim() !== '');
                return isNew && hasContent;
            });

            // Step 1: Upload any pending files first, resolve their CloudFront URLs
            const rowsWithUrls = await Promise.all(newRows.map(async (row) => {
                if (!row.fileObject) return row;

                const workId = row.workId || workData.find(w => String(w.srNo) === String(row.srNo))?.RiskIssue_Work_id || 'General';

                const presignedRes = await fetch('https://ves5hu7c23.execute-api.ap-south-1.amazonaws.com/New/generate-presigned-urls/risk-issue-owner-feedback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        Risk_Issue_Assignment_id: id,
                        Risk_Issue_Specification_Initiate_Work_id: workId.toString(),
                        Risk_Issue_object_owner_name: currentOwnerName,
                        documents: [{ name: row.fileObject.name, type: row.fileObject.type || 'application/octet-stream' }]
                    })
                });

                const presignedResult = await presignedRes.json();
                if (!presignedResult.success || !presignedResult.urls?.length) {
                    throw new Error(`Failed to get upload URL for file: ${row.fileObject.name}`);
                }

                const { signedUrl, publicCloudFrontUrl, documentName } = presignedResult.urls[0];

                const uploadRes = await fetch(signedUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': row.fileObject.type || 'application/octet-stream' },
                    body: row.fileObject
                });

                if (!uploadRes.ok) throw new Error(`Failed to upload file: ${row.fileObject.name}`);

                return { ...row, fileUrl: publicCloudFrontUrl, fileName: documentName || row.fileObject.name };
            }));

            // Step 2: Build and submit records with resolved file URLs
            const newRecords = rowsWithUrls.map((row, idx) => {
                const workId = row.workId || (workData[idx] ? workData[idx].RiskIssue_Work_id : "");
                return {
                    Risk_Issue_Assignment_id: id,
                    Risk_Issue_Specification_Initiate_Work_id: workId.toString(),
                    RiskAndIssueFormId: formData?.RiskAndIssueFormId || id,
                    Project_id: currentProjectId,
                    parent_feedback_id: "",
                    row_number: (row.srNo || idx + 1).toString(),
                    sub_row_number: "",
                    feedback_text: row.text,
                    supported_document: row.fileUrl || '',
                    supported_document_name: row.fileName || '',
                    created_by: userId,
                    business_owner_decision: row.business_owner_decision || 'Open',
                    decisionbackend: row.business_owner_decision || 'Open'
                };
            });

            if (newRecords.length > 0) {
                const response = await fetch('https://ves5hu7c23.execute-api.ap-south-1.amazonaws.com/New/ricew/RiskIssue/FeedbackSubmit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ records: newRecords })
                });

                if (!response.ok) {
                    const errText = await response.text();
                    throw new Error(errText || 'Failed to submit feedback');
                }
            }

            // Step 3: Process new sub-feedback rows from all parent rows
            const newSubRows = [];
            feedbackRows.forEach((row) => {
                if (!row.subRows || row.subRows.length === 0) return;
                const parentFeedbackId = row.id;
                const workId = row.workId || workData.find(w => String(w.srNo) === String(row.srNo))?.RiskIssue_Work_id || '';
                row.subRows.forEach((sub, sIdx) => {
                    const subId = sub.Risk_Issue_feedback_id || sub.id;
                    const isSubNew = sub.isNew || (typeof subId === 'string' && subId.startsWith('sub-new-'));
                    if (isSubNew) {
                        newSubRows.push({ ...sub, parentFeedbackId: parentFeedbackId.toString(), workId: workId.toString(), srNo: row.srNo, subIndex: sIdx });
                    }
                });
            });

            if (newSubRows.length > 0) {
                // Upload sub-row files
                const subRowsWithUrls = await Promise.all(newSubRows.map(async (sub) => {
                    if (!sub.fileObject) return sub;
                    const presignedRes = await fetch('https://ves5hu7c23.execute-api.ap-south-1.amazonaws.com/New/generate-presigned-urls/risk-issue-owner-feedback', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            Risk_Issue_Assignment_id: id,
                            Risk_Issue_Specification_Initiate_Work_id: sub.workId,
                            Risk_Issue_object_owner_name: currentOwnerName,
                            documents: [{ name: sub.fileObject.name, type: sub.fileObject.type || 'application/octet-stream' }]
                        })
                    });
                    const presignedResult = await presignedRes.json();
                    if (!presignedResult.success || !presignedResult.urls?.length) {
                        throw new Error(`Failed to get upload URL for sub-row file: ${sub.fileObject.name}`);
                    }
                    const { signedUrl, publicCloudFrontUrl, documentName } = presignedResult.urls[0];
                    const uploadRes = await fetch(signedUrl, {
                        method: 'PUT',
                        headers: { 'Content-Type': sub.fileObject.type || 'application/octet-stream' },
                        body: sub.fileObject
                    });
                    if (!uploadRes.ok) throw new Error(`Failed to upload sub-row file: ${sub.fileObject.name}`);
                    return { ...sub, fileUrl: publicCloudFrontUrl, fileName: documentName || sub.fileObject.name };
                }));

                // Build sub-row records
                const subRecords = subRowsWithUrls.map((sub) => ({
                    Risk_Issue_Assignment_id: id,
                    Risk_Issue_Specification_Initiate_Work_id: sub.workId,
                    RiskAndIssueFormId: formData?.RiskAndIssueFormId || id,
                    Project_id: currentProjectId,
                    parent_feedback_id: sub.parentFeedbackId,
                    row_number: (sub.srNo || '').toString(),
                    sub_row_number: (sub.subIndex + 1).toString(),
                    feedback_text: sub.text || sub.feedback_text || '',
                    supported_document: sub.fileUrl || sub.supported_document || '',
                    supported_document_name: sub.fileName || sub.supported_document_name || '',
                    created_by: userId,
                    business_owner_decision: sub.business_owner_decision || 'Open',
                    decisionbackend: sub.business_owner_decision || 'Open'
                }));

                const subResponse = await fetch('https://ves5hu7c23.execute-api.ap-south-1.amazonaws.com/New/ricew/RiskIssue/FeedbackSubmit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ records: subRecords })
                });

                if (!subResponse.ok) {
                    const errText = await subResponse.text();
                    throw new Error(errText || 'Failed to submit sub-feedback');
                }
            }

            // Wait 1.5 seconds for DynamoDB GSI to sync the new inserts
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Close all initiate work records in a single batch call
            const workItems = feedbackRows
                .map((row, idx) => {
                    const workId = row.workId || workData[idx]?.RiskIssue_Work_id;
                    if (!workId) return null;
                    return {
                        Risk_Issue_Specification_Initiate_Work_id: workId.toString(),
                        Project_id: currentProjectId
                    };
                })
                .filter(Boolean);

            if (workItems.length > 0) {
                await fetch('https://ves5hu7c23.execute-api.ap-south-1.amazonaws.com/New/publicView/feedbackForm/initiateWorkDetails/DecisionUpdate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(workItems)
                });
            }

            // NEW: Call the backend API to disable the upper table for all items
            try {
                const allWorkIds = workData.map(item => item.RiskIssue_Work_id).filter(Boolean);
                if (allWorkIds.length > 0) {
                    await fetch('https://ves5hu7c23.execute-api.ap-south-1.amazonaws.com/New/ricew/riskIssueInitiateWork/DisableIssueInitiateWorkRow', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ risk_work_ids: allWorkIds })
                    });

                    // Update local state to immediately disable upper table
                    setWorkData(prev => prev.map(item => ({ ...item, approve_reject_Decision: 'Submitted' })));
                }
            } catch (disableErr) {
                console.error("Failed to disable upper table:", disableErr);
            }

            setSuccessMessage("Feedback submitted successfully!");
            setShowSuccessMessage(true);
            setTimeout(() => setShowSuccessMessage(false), 3000);

            // Reload feedback records to reflect latest state
            await fetchData();

        } catch (error) {
            console.error('Submission error:', error);
            setErrorMessage("Failed to submit feedback. Please try again.");
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 5000);
        } finally {
            // Always send email notification to the writer regardless of other API results
            try {
                const emailPayload = {
                    writer_email: writerEmail,
                    writer_name: writerName,
                    riskIssue_title: formData?.record_type || workData[0]?.recordType || "Risk/Issue Object",
                    Project_id: projectId,
                    Project_Name: projectName,
                    Risk_Issue_Assignment_id: id,
                    RiskAndIssueFormId: formData?.RiskAndIssueFormId || id,
                    status_update: "feedback to review doccument",
                    updated_by: userId
                };

                console.log('[Email] Sending writer notification with payload:', emailPayload);

                const emailRes = await fetch('https://ves5hu7c23.execute-api.ap-south-1.amazonaws.com/New/email-Send/riskIssueWriter/notification', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(emailPayload)
                });
                const emailResult = await emailRes.json().catch(() => emailRes.text());
                console.log('[Email] Response status:', emailRes.status, '| Body:', emailResult);
            } catch (emailErr) {
                console.error('[Email] Failed to send writer notification:', emailErr);
            }
            setLoading(false);
        }
    };

    if (loading && !formData) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', flexDirection: 'column', gap: '20px' }}>
                <div className="loader" style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #3498db', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 2s linear infinite' }}></div>
                <p style={{ color: '#666', fontSize: '14px' }}>Loading record details...</p>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (!formData) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', flexDirection: 'column', gap: '20px' }}>
                <p style={{ color: '#666', fontSize: '14px' }}>Record not found.</p>
                <button onClick={() => navigate(-1)} style={{ padding: '8px 20px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>Go Back</button>
            </div>
        );
    }

    return (
        <div className="config-main" style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '0', margin: '0' }}>
            <style>
                {`
                    .btn-start:hover { background-color: #218838 !important; transform: translateY(-1px); }
                    .btn-upload { background-color: #f1f5f9 !important; color: #94a3b8 !important; border: 1px solid #e2e8f0 !important; cursor: not-allowed !important; }
                    .btn-upload:hover { background-color: #e2e8f0 !important; color: #64748b !important; }
                    .btn-upload-active { background-color: #c6f6d5 !important; color: #22543d !important; border: 1px solid #9ae6b4 !important; }
                    .btn-submit:hover { background-color: #9ae6b4 !important; color: #22543d !important; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
                    .btn-back:hover { background-color: #4b5563 !important; }
                    .btn-trash:hover { color: #dc2626 !important; transform: scale(1.1); }
                    button, label, select { transition: all 0.2s ease-in-out; }
                `}
            </style>
            <div style={{ padding: '1rem 1rem 2rem 1rem', width: '100%', minWidth: '1320px', margin: '0', boxSizing: 'border-box' }}>
                <div style={{
                    backgroundColor: 'white',
                    padding: '0',
                    borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                    {/* Project Info Header */}
                    <div style={{ padding: '2rem 1rem 1rem 2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project : <span style={{ color: '#007bff' }}>{projectName || localStorage.getItem('project_name') || selectedProject?.name}</span></h3>

                        </div>
                    </div>

                    {/* Page Title */}
                    <div className="config-header" style={{ marginTop: '0', marginRight: '0px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 2rem' }}>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#333' }}>Feedback Form (Risk and Issue)</h2>
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
                                                    <p style={{ margin: '6px 0 0 0', color: '#555' }}>The <strong>Feedback Form (Risk and Issue)</strong> allows RICEW owners to review testing results and issue resolution submitted by resolution writers and provide feedback.</p>
                                                </div>
                                                <div style={{ marginBottom: '16px' }}>
                                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to provide feedback</strong>
                                                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                                        <li>Review the uploaded documents in the upper table.</li>
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
                        {/* Table Layout */}
                        <div style={{
                            borderTop: '1px solid #ddd',
                            borderLeft: '1px solid #ddd',
                            borderRight: '1px solid #ddd',
                            borderBottom: 'none',
                            borderRadius: '4px 4px 0 0',
                            overflow: 'auto',
                            backgroundColor: 'white'
                        }}>
                            {/* Header Row */}
                            <div style={{
                                display: 'flex',
                                backgroundColor: '#fcfcfc',
                                borderBottom: '1px solid #ddd',
                                fontWeight: 'bold',
                                fontSize: '12px',
                                minWidth: 'fit-content'
                            }}>
                                <div style={{ flex: '0 0 60px', width: '60px', padding: '12px 10px', textAlign: 'center', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Sr. No.</div>
                                <div style={{ flex: '0 0 140px', width: '140px', padding: '12px 12px', textAlign: 'center', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Record ID</div>
                                <div style={{ flex: '0 0 180px', width: '180px', padding: '12px 12px', textAlign: 'center', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Title</div>
                                <div style={{ flex: '0 0 110px', width: '110px', padding: '12px 12px', textAlign: 'center', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Work Status</div>
                                <div style={{ flex: '0 0 120px', width: '120px', padding: '12px 12px', textAlign: 'center', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Assigned Date</div>
                                <div style={{ flex: '0 0 130px', width: '130px', padding: '12px 12px', textAlign: 'center', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Start Object</div>
                                <div style={{ flex: '2', minWidth: '350px', display: 'flex', borderRight: '1px solid #ddd' }}>
                                    <div style={{ flex: 1, padding: '12px 12px', textAlign: 'center', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Response</div>
                                    <div style={{ width: '170px', padding: '12px 12px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Document Approve</div>
                                </div>
                                <div style={{ flex: '0 0 120px', width: '120px', padding: '12px 12px', textAlign: 'center', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>End Date</div>
                                <div style={{ flex: '1', minWidth: '240px', padding: '12px 12px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Comment</div>
                            </div>

                            {/* Data Rows */}
                            <div style={{ minHeight: '60px' }}>
                                {workData.length > 0 ? (
                                    workData.map((row, index) => {
                                        const isDecisionLocked = isClosed(row.approve_reject_Decision);

                                        return (
                                            <div key={index} style={{
                                                display: 'flex',
                                                minHeight: '44px',
                                                minWidth: 'fit-content',
                                                backgroundColor: isDecisionLocked ? '#f8f9fa' : 'white',
                                                color: isDecisionLocked ? '#6c757d' : 'inherit'
                                            }}>
                                                <div style={{ flex: '0 0 60px', width: '60px', padding: '12px 10px', textAlign: 'center', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd' }}>
                                                    {row.srNo}
                                                </div>
                                                <div style={{ flex: '0 0 140px', width: '140px', padding: '12px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd', justifyContent: 'center' }}>
                                                    {recordDisplayId}
                                                </div>
                                                <div style={{ flex: '0 0 180px', width: '180px', padding: '12px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd', fontWeight: '500', justifyContent: 'center' }}>
                                                    {row.recordType}
                                                </div>
                                                <div style={{ flex: '0 0 110px', width: '110px', padding: '12px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd', justifyContent: 'center' }}>
                                                    {workStatus}
                                                </div>
                                                <div style={{ flex: '0 0 120px', width: '120px', padding: '12px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd', justifyContent: 'center' }}>
                                                    {formatToDDMMMYYYY(row.assignedDate)}
                                                </div>
                                                <div style={{ flex: '0 0 130px', width: '130px', padding: '12px', borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd', display: 'flex', alignItems: 'center', fontSize: '13px', justifyContent: 'center' }}>
                                                    {formatToDDMMMYYYY(row.startObject)}
                                                </div>

                                                {/* Files and Approval Column */}
                                                <div style={{ flex: '2', minWidth: '350px', display: 'flex', flexDirection: 'column', borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd' }}>
                                                    {row.uploadFiles && row.uploadFiles.length > 0 ? (
                                                        row.uploadFiles.map((file, fIdx) => {
                                                            const status = docApprovalStatus[file.url] ||
                                                                (file.document_approved === 'true' ? 'Approved' :
                                                                    file.document_approved === 'false' ? 'Rejected' :
                                                                        '');
                                                            const isFileApproved = status === 'Approved';
                                                            let isFileRejected = status === 'Rejected';

                                                            if (isDecisionLocked && !isFileApproved && !isFileRejected) {
                                                                isFileRejected = true;
                                                            }

                                                            const disableApprove = isFileApproved || isDecisionLocked;
                                                            const disableReject = isFileRejected || isDecisionLocked;

                                                            let approveBgColor = 'white';
                                                            let approveTextColor = '#64748b';
                                                            let approveBorder = '1px solid #cbd5e1';
                                                            let rejectBgColor = 'white';
                                                            let rejectTextColor = '#64748b';
                                                            let rejectBorder = '1px solid #cbd5e1';

                                                            if (isFileApproved) {
                                                                approveBgColor = '#28a745';
                                                                approveTextColor = 'white';
                                                                approveBorder = '1px solid #28a745';
                                                            }
                                                            if (isFileRejected) {
                                                                rejectBgColor = '#dc3545';
                                                                rejectTextColor = 'white';
                                                                rejectBorder = '1px solid #dc3545';
                                                            }

                                                            if (isDecisionLocked) {
                                                                if (!isFileApproved) {
                                                                    approveBgColor = '#f9fafb';
                                                                    approveTextColor = '#9ca3af';
                                                                    approveBorder = '1px solid #e5e7eb';
                                                                }
                                                                if (!isFileRejected) {
                                                                    rejectBgColor = '#f9fafb';
                                                                    rejectTextColor = '#9ca3af';
                                                                    rejectBorder = '1px solid #e5e7eb';
                                                                }
                                                            }

                                                            return (
                                                                <div key={fIdx} style={{ display: 'flex', alignItems: 'stretch', minHeight: '44px' }}>
                                                                    {/* File name cell */}
                                                                    <div style={{ flex: 1, padding: '8px 12px', display: 'flex', alignItems: 'center', borderRight: '1px solid #ddd' }}>
                                                                        <a
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
                                                                                fontSize: '12px',
                                                                                width: '100%',
                                                                                opacity: '1'
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
                                                                            {file.File_Name || `document_${fIdx + 1}.pdf`}
                                                                        </a>
                                                                    </div>
                                                                    {/* Approve/Reject cell */}
                                                                    <div style={{ width: '170px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, justifyContent: 'center' }}>
                                                                        <button
                                                                            disabled={disableApprove}
                                                                            onClick={() => handleDocAction(row.RiskIssue_Work_id, file.File_Name || '', file.url || '', 'Approved')}
                                                                            onMouseEnter={(e) => {
                                                                                if (!disableApprove) {
                                                                                    e.currentTarget.style.backgroundColor = '#f0fdf4';
                                                                                    e.currentTarget.style.borderColor = '#22c55e';
                                                                                    e.currentTarget.style.color = '#15803d';
                                                                                }
                                                                            }}
                                                                            onMouseLeave={(e) => {
                                                                                if (!disableApprove) {
                                                                                    e.currentTarget.style.backgroundColor = isFileApproved ? '#28a745' : 'white';
                                                                                    e.currentTarget.style.borderColor = isFileApproved ? '#28a745' : '#cbd5e1';
                                                                                    e.currentTarget.style.color = isFileApproved ? 'white' : '#64748b';
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
                                                                            {loading ? '...' : (isFileApproved ? 'Approved' : 'Approve')}
                                                                        </button>
                                                                        <button
                                                                            disabled={disableReject}
                                                                            onClick={() => handleDocAction(row.RiskIssue_Work_id, file.File_Name || '', file.url || '', 'Rejected')}
                                                                            onMouseEnter={(e) => {
                                                                                if (!disableReject) {
                                                                                    e.currentTarget.style.backgroundColor = '#fef2f2';
                                                                                    e.currentTarget.style.borderColor = '#ef4444';
                                                                                    e.currentTarget.style.color = '#b91c1c';
                                                                                }
                                                                            }}
                                                                            onMouseLeave={(e) => {
                                                                                if (!disableReject) {
                                                                                    e.currentTarget.style.backgroundColor = isFileRejected ? '#dc3545' : 'white';
                                                                                    e.currentTarget.style.borderColor = isFileRejected ? '#dc3545' : '#cbd5e1';
                                                                                    e.currentTarget.style.color = isFileRejected ? 'white' : '#64748b';
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
                                                                            {loading ? '...' : (isFileRejected ? 'Rejected' : 'Reject')}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    ) : (
                                                        <div style={{ display: 'flex', alignItems: 'stretch', minHeight: '44px' }}>
                                                            <div style={{ flex: 1, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #ddd', color: '#999', fontSize: '13px' }}>-</div>
                                                            <div style={{ width: '170px', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '13px' }}>-</div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div style={{ flex: '0 0 120px', width: '120px', padding: '12px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd', justifyContent: 'center' }}>
                                                    {formatToDDMMMYYYY(row.endDate)}
                                                </div>
                                                <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', minWidth: '240px', wordBreak: 'break-word', justifyContent: 'flex-start', borderBottom: '1px solid #ddd' }}>
                                                    {row.comment}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div style={{ display: 'flex', minHeight: '100px', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '14px' }}>
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
                            gap: '32px'
                        }}>
                            <label style={{ fontWeight: '600', color: '#333', fontSize: '14px' }}>
                                Risk And Issue object Owner <span style={{ color: 'red' }}>*</span>
                            </label>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <label style={{ fontSize: '13px', color: 'black', fontWeight: '500' }}>Name :</label>
                                <input type="text" value={ownerName} readOnly style={{ width: '200px', height: '32px', padding: '0 8px', border: '1px solid #000', borderRadius: '2px', backgroundColor: '#f9f9f9', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }} />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <label style={{ fontSize: '13px', color: 'black', fontWeight: '500' }}>Email Address :</label>
                                <input type="email" value={ownerEmail} readOnly style={{ width: '320px', height: '32px', padding: '0 8px', border: '1px solid #000', borderRadius: '2px', backgroundColor: '#f9f9f9', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }} />
                            </div>
                        </div>

                        <div style={{ padding: '20px' }}>
                            {/* Feedback Table */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '60px 2fr 100px 1.5fr 80px 150px',
                                borderLeft: '1px solid #ddd',
                                borderTop: '1px solid #ddd',
                                borderRadius: '4px 4px 0 0',
                                backgroundColor: 'white'
                            }}>
                                <div style={{ gridColumn: 'span 6', borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '10px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px', backgroundColor: '#fcfcfc' }}>
                                    Client Business Owner Feedback
                                </div>
                                <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '12px 8px', textAlign: 'center', fontWeight: '700', fontSize: '12px', backgroundColor: '#f9f9f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Sr. No.</div>
                                <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '12px 8px', textAlign: 'center', fontWeight: '700', fontSize: '12px', backgroundColor: '#f9f9f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Text</div>
                                <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '12px 8px', textAlign: 'center', fontWeight: '700', fontSize: '12px', backgroundColor: '#f9f9f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Upload</div>
                                <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '12px 8px', textAlign: 'center', fontWeight: '700', fontSize: '12px', backgroundColor: '#f9f9f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Uploaded Document Name</div>
                                <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '12px 8px', textAlign: 'center', fontWeight: '700', fontSize: '12px', backgroundColor: '#f9f9f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Action</div>
                                <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '12px 8px', textAlign: 'center', fontWeight: '700', fontSize: '12px', backgroundColor: '#f9f9f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Business Owner Decision</div>

                                {feedbackRows.map((row, index) => {
                                    const isRowNew = typeof row.id === 'string' && (row.id.startsWith('new-') || row.id.startsWith('init-') || row.id.startsWith('existing-')) || typeof row.id === 'number';
                                    // Only disable editing if row is saved in backend AND closed
                                    const isRowClosed = !isRowNew && row.business_owner_decision === 'Close';
                                    const rowSpan = 1 + (row.subRows?.length || 0);

                                    return (
                                        <React.Fragment key={row.id}>
                                            <div style={{ gridRow: `span ${rowSpan}`, borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '16px 8px', textAlign: 'center', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', backgroundColor: isRowClosed ? '#f5f5f5' : '#fcfcfc' }}>{row.srNo || index + 1}</div>
                                            <div style={{ borderBottom: row.subRows?.length > 0 ? '1px solid #eee' : '1px solid #ddd', borderRight: '1px solid #ddd', padding: '0', backgroundColor: isRowClosed ? '#f9fafb' : 'transparent', position: 'relative' }}>
                                                <textarea disabled={isRowClosed} value={row.text} onChange={(e) => handleRowChange(row.id, 'text', e.target.value)} style={{ width: '100%', border: 'none', padding: '12px 8px', paddingBottom: '20px', resize: 'none', height: '100%', minHeight: '40px', fontSize: '13px', outline: 'none', fontFamily: 'inherit', backgroundColor: 'transparent', color: isRowClosed ? '#9ca3af' : 'inherit', cursor: isRowClosed ? 'not-allowed' : 'text' }} placeholder="Add Feedback Text" />
                                                {!isRowNew && !isRowClosed && (
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
                                                        title="Add sub-row"
                                                    >
                                                        <Plus size={16} />
                                                    </button>
                                                )}
                                            </div>
                                            <div style={{ borderBottom: row.subRows?.length > 0 ? '1px solid #eee' : '1px solid #ddd', borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: isRowClosed ? '#f9fafb' : 'transparent' }}>
                                                <label
                                                    className={((row.fileName && row.fileName !== 'No doc') || isRowClosed) ? "btn-upload" : "btn-upload-active"}
                                                    style={{
                                                        cursor: ((row.fileName && row.fileName !== 'No doc') || isRowClosed) ? 'not-allowed' : 'pointer',
                                                        pointerEvents: ((row.fileName && row.fileName !== 'No doc') || isRowClosed) ? 'none' : 'auto',
                                                        opacity: ((row.fileName && row.fileName !== 'No doc') || isRowClosed) ? 0.7 : 1,
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        padding: '4px 12px',
                                                        borderRadius: '4px',
                                                        fontSize: '10px',
                                                        fontWeight: '600'
                                                    }}
                                                >
                                                    Upload
                                                    <input type="file" disabled={isRowClosed} style={{ display: 'none' }} onChange={(e) => handleFileUpload(row.id, e)} />
                                                </label>
                                            </div>
                                            <div style={{ borderBottom: row.subRows?.length > 0 ? '1px solid #eee' : '1px solid #ddd', borderRight: '1px solid #ddd', padding: '8px', fontSize: '11px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: isRowClosed ? '#f5f5f5' : 'white' }}>
                                                {row.fileName && row.fileName !== '-' ? (
                                                    <a
                                                        href={getFileViewUrl(row.fileUrl, row.fileName)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{
                                                            color: '#3182ce',
                                                            textDecoration: 'none',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            display: 'block',
                                                            width: '100%'
                                                        }}
                                                        title={row.fileName}
                                                    >
                                                        {row.fileName}
                                                    </a>
                                                ) : (
                                                    <span style={{ color: '#999' }}>No doc</span>
                                                )}
                                            </div>
                                            <div style={{ borderBottom: row.subRows?.length > 0 ? '1px solid #eee' : '1px solid #ddd', borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: isRowClosed ? '#f5f5f5' : 'white' }}>
                                                <Trash2
                                                    size={18}
                                                    className={isRowClosed ? "" : "btn-trash"}
                                                    style={{ cursor: isRowClosed ? 'not-allowed' : 'pointer', color: isRowClosed ? '#9ca3af' : '#ef4444' }}
                                                    onClick={() => {
                                                        if (isRowClosed) return;
                                                        handleRowChange(row.id, 'fileName', '');
                                                        handleRowChange(row.id, 'fileUrl', '');
                                                    }}
                                                    title={isRowClosed ? "Cannot remove document while closed" : "Remove Document"}
                                                />
                                            </div>
                                            <div style={{ borderBottom: row.subRows?.length > 0 ? '1px solid #eee' : '1px solid #ddd', borderRight: '1px solid #ddd', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: isRowClosed ? '#f5f5f5' : 'white' }}>
                                                <select
                                                    value={row.business_owner_decision || 'Open'}
                                                    onChange={(e) => handleRowChange(row.id, 'business_owner_decision', e.target.value)}
                                                    disabled={isRowNew}
                                                    title={isRowNew ? "Submit feedback first before changing the decision" : ""}
                                                    style={{
                                                        width: '100%',
                                                        padding: '6px',
                                                        fontSize: '13px',
                                                        borderRadius: '4px',
                                                        fontFamily: 'inherit',
                                                        border: '1px solid #ccc',
                                                        outline: 'none',
                                                        cursor: isRowNew ? 'not-allowed' : 'pointer',
                                                        opacity: isRowNew ? 0.5 : 1,
                                                        backgroundColor: isRowNew ? '#f3f4f6' : 'white',
                                                        color: '#333'
                                                    }}
                                                >
                                                    <option value="Open">Open</option>
                                                    <option value="Close">Close</option>
                                                </select>
                                            </div>

                                            {/* Sub-feedbacks (Replies/History) rendering */}
                                            {row.subRows && row.subRows.length > 0 && row.subRows.map((sub, sIdx) => {
                                                const isLastSubRow = sIdx === row.subRows.length - 1;
                                                const subCellBorderBottom = isLastSubRow ? '1px solid #ddd' : '1px solid #eee';
                                                const isSubDecisionClosed = sub.business_owner_decision === 'Close' || sub.decisionbackend === 'Close';
                                                const subId = sub.Risk_Issue_feedback_id || sub.id;
                                                const isSubNew = sub.isNew || (typeof subId === 'string' && subId.startsWith('sub-new-'));

                                                return (
                                                    <React.Fragment key={subId || `sub-${sIdx}`}>
                                                        {/* Sub-row Text */}
                                                        <div style={{ borderBottom: subCellBorderBottom, borderRight: '1px solid #ddd', padding: isSubNew ? '0' : '10px 15px', backgroundColor: isSubDecisionClosed ? '#f5f5f5' : '#fffdee', gridColumn: 'span 1', position: 'relative' }}>
                                                            {isSubNew ? (
                                                                <>
                                                                    <textarea
                                                                        value={sub.feedback_text || sub.text || ''}
                                                                        onChange={(e) => handleSubRowChange(row.id, subId, 'text', e.target.value)}
                                                                        disabled={isSubDecisionClosed}
                                                                        style={{
                                                                            width: '100%',
                                                                            border: 'none',
                                                                            outline: 'none',
                                                                            resize: 'vertical',
                                                                            minHeight: '35px',
                                                                            fontSize: '13px',
                                                                            fontFamily: 'inherit',
                                                                            padding: '10px 15px',
                                                                            paddingBottom: '20px',
                                                                            backgroundColor: 'transparent',
                                                                            color: isSubDecisionClosed ? '#718096' : 'inherit',
                                                                            cursor: isSubDecisionClosed ? 'not-allowed' : 'text'
                                                                        }}
                                                                        placeholder="Enter sub-feedback..."
                                                                    />
                                                                    {!isSubDecisionClosed && (
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
                                                                            title="Add sub-row"
                                                                        >
                                                                            <Plus size={16} />
                                                                        </button>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <div style={{ fontSize: '13px', color: isSubDecisionClosed ? '#718096' : '#555' }}>{sub.feedback_text}</div>
                                                            )}
                                                        </div>
                                                        {/* Sub-row Upload */}
                                                        <div style={{ borderBottom: subCellBorderBottom, borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', backgroundColor: isSubDecisionClosed ? '#f5f5f5' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            {isSubNew && !isSubDecisionClosed ? (
                                                                <>
                                                                    <button
                                                                        onClick={() => document.getElementById(`sub-file-${subId}`).click()}
                                                                        style={{
                                                                            backgroundColor: '#c6f6d5',
                                                                            color: '#22543d',
                                                                            border: '1px solid #9ae6b4',
                                                                            padding: '4px 12px',
                                                                            borderRadius: '4px',
                                                                            cursor: 'pointer',
                                                                            fontSize: '10px',
                                                                            fontWeight: '600'
                                                                        }}
                                                                    >
                                                                        Upload
                                                                    </button>
                                                                    <input id={`sub-file-${subId}`} type="file" style={{ display: 'none' }} onChange={(e) => handleSubRowFileUpload(row.id, subId, e)} />
                                                                </>
                                                            ) : (
                                                                <label className="btn-upload" style={{ cursor: 'not-allowed', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '4px 12px', borderRadius: '4px', fontSize: '10px', fontWeight: '600' }}>
                                                                    Upload
                                                                </label>
                                                            )}
                                                        </div>
                                                        {/* Sub-row Document Name */}
                                                        <div style={{ borderBottom: subCellBorderBottom, borderRight: '1px solid #ddd', backgroundColor: isSubDecisionClosed ? '#f5f5f5' : 'white', padding: '8px 15px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                                            {(sub.supported_document || sub.fileName) ? (
                                                                <a href={getFileViewUrl(sub.supported_document || sub.fileUrl, sub.supported_document_name || sub.fileName)} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: '#2563eb', textDecoration: 'none', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }} title={sub.supported_document_name || sub.fileName}>
                                                                    {sub.supported_document_name || sub.fileName || 'View Doc'}
                                                                </a>
                                                            ) : (
                                                                <span style={{ color: '#999', fontSize: '11px' }}>No doc</span>
                                                            )}
                                                        </div>
                                                        {/* Sub-row Action */}
                                                        <div style={{ borderBottom: subCellBorderBottom, borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', backgroundColor: isSubDecisionClosed ? '#f5f5f5' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <Trash2
                                                                size={18}
                                                                className={isSubDecisionClosed ? "" : "btn-trash"}
                                                                style={{ cursor: isSubDecisionClosed ? 'not-allowed' : 'pointer', color: isSubDecisionClosed ? '#9ca3af' : '#ef4444' }}
                                                                onClick={() => {
                                                                    if (isSubDecisionClosed) return;
                                                                    if (isSubNew) {
                                                                        handleRemoveSubRow(row.id, subId);
                                                                    } else {
                                                                        handleSubRowChange(row.id, subId, 'fileName', '');
                                                                        handleSubRowChange(row.id, subId, 'fileUrl', '');
                                                                        handleSubRowChange(row.id, subId, 'supported_document_name', '');
                                                                        handleSubRowChange(row.id, subId, 'supported_document', '');
                                                                    }
                                                                }}
                                                                title={isSubDecisionClosed ? "Cannot remove while closed" : (isSubNew ? "Remove sub-row" : "Remove Document")}
                                                            />
                                                        </div>
                                                        {/* Sub-row Decision */}
                                                        <div style={{ borderBottom: subCellBorderBottom, borderRight: '1px solid #ddd', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: isSubDecisionClosed ? '#f5f5f5' : 'white', borderBottomRightRadius: isLastSubRow ? '4px' : '0' }}>
                                                            <select
                                                                value={sub.business_owner_decision || 'Open'}
                                                                onChange={(e) => handleSubRowChange(row.id, subId, 'business_owner_decision', e.target.value)}
                                                                disabled={isSubNew}
                                                                title={isSubNew ? "Submit feedback first before changing the decision" : ""}
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '6px',
                                                                    fontSize: '13px',
                                                                    borderRadius: '4px',
                                                                    fontFamily: 'inherit',
                                                                    border: '1px solid #ccc',
                                                                    outline: 'none',
                                                                    cursor: isSubNew ? 'not-allowed' : 'pointer',
                                                                    opacity: isSubNew ? 0.5 : 1,
                                                                    backgroundColor: isSubNew ? '#f3f4f6' : 'white',
                                                                    color: '#333'
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
                                })}

                            </div>

                            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button
                                    onClick={() => showConfirmation("Are you sure you want to submit the feedback?", handleSubmitDocument)}
                                    className="btn-submit"
                                    style={{
                                        padding: '10px 24px',
                                        backgroundColor: '#c6f6d5',
                                        color: '#22543d',
                                        border: '1px solid #9ae6b4',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontWeight: '500',
                                        fontSize: '13px',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {loading ? 'Submitting...' : 'Submit Feedback'}
                                </button>
                                <button
                                    onClick={() => showConfirmation("Are you sure you want to close this Risk/Issue record? This will trigger notification emails and finalize the status.", (client) => {
                                        if (client) {
                                            handleCloseWork(client);
                                        } else {
                                            setEmailModalSearchName(clientOwnerName || '');
                                            setEmailModalSearchEmail(clientOwnerEmail || '');
                                            setSelectedRosterId(clientOwnerId || '');
                                            setShowEmailModal(true);
                                        }
                                    })}
                                    className="btn-submit"
                                    style={{
                                        padding: '10px 24px',
                                        backgroundColor: '#c6f6d5',
                                        color: '#22543d',
                                        border: '1px solid #9ae6b4',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontWeight: '500',
                                        fontSize: '13px',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {loading ? 'Closing...' : 'Close'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirmation Dialog */}
            {showConfirmDialog && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
                    <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '4px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxWidth: '450px', width: '90%', textAlign: 'center' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '700', color: '#1f2937' }}>Confirmation</h3>
                        <p style={{ margin: '0 0 24px 0', fontSize: '15px', color: '#4b5563', lineHeight: '1.5' }}>{confirmMessage}</p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button onClick={handleConfirmCancel} style={{ padding: '10px 24px', backgroundColor: '#f3f4f6', color: '#4b5563', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                            <button onClick={handleConfirmYes} style={{ padding: '10px 24px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>Continue</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Email Selection Modal */}
            {showEmailModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
                    <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '4px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', maxWidth: '650px', width: '95%', display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: '700', color: '#333', textAlign: 'center' }}>Select Business Owner Email</h3>
                        <p style={{ margin: '0 0 20px 0', fontSize: '15px', color: '#666', lineHeight: '1.5', textAlign: 'center' }}>Please select the email address for the business owner to receive the notification.</p>

                        <div style={{ border: '1px solid #666', borderRadius: '4px', display: 'flex', marginBottom: '20px', overflow: 'visible' }}>
                            <div style={{ width: '150px', backgroundColor: '#fcfcfc', padding: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', borderRight: '1px solid #666', fontSize: '14px', color: '#333', textAlign: 'center' }}>
                                Client Business Owner
                            </div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                {/* Name Row */}
                                <div style={{ padding: '16px 15px', borderBottom: '1px solid #666', display: 'flex', alignItems: 'center', gap: '15px', position: 'relative' }}>
                                    <label style={{ width: '110px', fontSize: '13px', color: '#444', fontWeight: '500', flexShrink: 0 }}>Name <span style={{ color: 'red' }}>*</span></label>
                                    <div style={{ flex: 1, position: 'relative' }} ref={emailLovRef}>
                                        <input
                                            type="text"
                                            value={emailModalSearchName}
                                            onFocus={() => setShowEmailLOV(true)}
                                            onBlur={() => setTimeout(() => setShowEmailLOV(false), 200)}
                                            onChange={(e) => {
                                                setEmailModalSearchName(e.target.value);
                                                setShowEmailLOV(true);
                                                if (selectedRosterId) {
                                                    setSelectedRosterId('');
                                                    setEmailModalSearchEmail('');
                                                }
                                            }}
                                            placeholder="Enter or Select Client Business Owner Name"
                                            style={{
                                                width: '100%',
                                                height: '38px',
                                                padding: '0 12px',
                                                fontSize: '13px',
                                                border: '1px solid #666',
                                                borderRadius: '4px',
                                                backgroundColor: 'white',
                                                color: '#333',
                                                outline: 'none'
                                            }}
                                        />
                                        {showEmailLOV && clientRoster.length > 0 && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '100%',
                                                left: 0,
                                                width: '100%',
                                                backgroundColor: 'white',
                                                border: '1px solid #ccc',
                                                borderRadius: '4px',
                                                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                                zIndex: 9999,
                                                maxHeight: '200px',
                                                overflowY: 'auto',
                                                marginTop: '4px'
                                            }}>
                                                {clientRoster
                                                    .filter(item => {
                                                        if (!emailModalSearchName) return true;
                                                        const term = emailModalSearchName.toLowerCase();
                                                        return item.Client_name?.toLowerCase().includes(term) || item.Email_Address?.toLowerCase().includes(term);
                                                    })
                                                    .map((item, i) => (
                                                        <div
                                                            key={i}
                                                            onClick={() => {
                                                                setEmailModalSearchName(item.Client_name);
                                                                setEmailModalSearchEmail(item.Email_Address || "");
                                                                setSelectedRosterId(item.Resource_Roster_Form_id || item.Client_name);
                                                                setShowEmailLOV(false);
                                                            }}
                                                            style={{
                                                                padding: '10px 12px',
                                                                fontSize: '13px',
                                                                cursor: 'pointer',
                                                                borderBottom: i < clientRoster.length - 1 ? '1px solid #f0f0f0' : 'none',
                                                                textAlign: 'left'
                                                            }}
                                                            onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                                                            onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                                                        >
                                                            <div style={{ fontWeight: '600', color: '#111827' }}>{item.Client_name}</div>
                                                            <div style={{ fontSize: '11px', color: '#666' }}>{item.Email_Address}</div>
                                                        </div>
                                                    ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {/* Email Row */}
                                <div style={{ padding: '16px 15px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <label style={{ width: '110px', fontSize: '13px', color: '#444', fontWeight: '500', flexShrink: 0 }}>Email Address <span style={{ color: 'red' }}>*</span></label>
                                    <input
                                        type="email"
                                        value={emailModalSearchEmail}
                                        readOnly
                                        placeholder="Enter Client Business Owner Email"
                                        style={{
                                            width: '100%',
                                            height: '38px',
                                            padding: '0 12px',
                                            fontSize: '13px',
                                            border: '1px solid #666',
                                            borderRadius: '4px',
                                            backgroundColor: '#f9fafb',
                                            color: '#333',
                                            outline: 'none',
                                            cursor: 'not-allowed'
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button onClick={handleEmailModalCancel} style={{ padding: '8px 24px', backgroundColor: '#f3f4f6', color: '#4b5563', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>Cancel</button>
                            <button onClick={handleEmailModalSubmit} style={{ padding: '8px 24px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }} disabled={!selectedRosterId && !emailModalSearchEmail}>Submit</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success and Error messages */}
            {(showSuccessMessage || showErrorMessage) && (
                <div style={{
                    position: 'fixed',
                    top: '20px',
                    right: '20px',
                    backgroundColor: showSuccessMessage ? '#10b981' : '#ef4444',
                    color: 'white',
                    padding: '12px 20px',
                    borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 11000,
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    {showSuccessMessage ? successMessage : errorMessage}
                </div>
            )}

            {/* Global Full-Screen Loader */}
            {loading && formData && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ backgroundColor: 'white', padding: '20px 40px', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div className="loader" style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #3498db', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 2s linear infinite', marginBottom: '15px' }}></div>
                        <p style={{ margin: 0, color: '#333', fontWeight: '500' }}>Loading...</p>
                        <style>{`
                            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                            .help-modal-scroll::-webkit-scrollbar { width: 4px; }
                            .help-modal-scroll::-webkit-scrollbar-track { background: transparent; margin: 8px 0; }
                            .help-modal-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                            .help-modal-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                        `}</style>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PublicRiskAndIssueSpecificationView;
