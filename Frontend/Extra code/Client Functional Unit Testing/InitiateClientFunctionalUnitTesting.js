import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trash2, Plus } from 'lucide-react';
import { getIdToken } from '../../../utils/cognito-auth';
import { SuccessMessage, ErrorMessage } from '../../Resource Roster Form/FormSections';

const InitiateClientFunctionalUnitTesting = ({ selectedProject }) => {
    const { id } = useParams();
    const navigate = useNavigate();
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
                                    business_owner_decision: normalizeDecision(subItem.SI_Technical_Owner_Decision_open_closed || subItem.business_owner_decision || subItem.business_owner_decission),
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
                const detailsResponse = await fetch(`https://07eirxky2f.execute-api.ap-south-1.amazonaws.com/New/api/ricew/assignInitiateWorkSITechnicalOwnerFunctionalTesting/detailInfo?project_id=${projectId}&ricew_id=${id}`, { headers });
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

        setFilePath('');
        setSelectedFile(null);

        // Auto-fill from row data if available, otherwise fallback to data from the extra details API
        const initialOwnerName = row.client_SI_Technical_Owner || row.SI_Technical_Owner_name || requestFormDetails?.client_SI_Technical_Owner || '';
        const initialOwnerEmail = row.client_SI_Technical_Owner_email || row.SI_Technical_Owner_email || requestFormDetails?.client_SI_Technical_Owner_email || '';

        setTechnicalOwnerName(initialOwnerName);
        setTechnicalOwnerEmail(initialOwnerEmail);
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
        const newDocs = modalDocuments.filter(d => d.file && !d.isUploaded);
        const existingDocs = modalDocuments.filter(d => d.isUploaded);

        if (newDocs.length === 0 && existingDocs.length === 0) {
            setErrorMsg('Please select at least one file to upload');
            setShowError(true);
            setTimeout(() => setShowError(false), 3000);
            return;
        }

        setLoading(true);
        try {
            const idToken = await getIdToken();
            const userId = localStorage.getItem('user_id') || 'system';
            const s3Timestamp = Date.now();
            const prettyTimestamp = new Date().toLocaleString('en-GB', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                hour12: false
            }).replace(',', '');

            let allUploadedDocs = [...existingDocs.map(d => ({ File_Name: d.path, url: d.uploadObject }))];

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

                const presignedUrlResponse = await fetch('https://07eirxky2f.execute-api.ap-south-1.amazonaws.com/New/generate-presigned-urls/client-functional-testing-Initiate-Work-pdf', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`
                    },
                    body: JSON.stringify({
                        Client_Roster_Form_id: uploadingRow.Client_Roster_Form_id || "",
                        ricew_object: uploadingRow.RICEW_Object || uploadingRow.ricewObject,
                        documents: docsPayload.map(d => ({ name: d.name, type: d.type }))
                    })
                });

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
                        File_Name: payload.name, // Record the timestamped name in database
                        url: urlData.publicCloudFrontUrl
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
                RICEW_Object: uploadingRow.ricewObject || uploadingRow.RICEW_Object,
                Assigned_Date: uploadingRow.assignedDate,
                Start_Object: uploadingRow.startObject || "",
                End_Date: uploadingRow.endDate || "",
                Upload_Object: allUploadedDocs,
                created_by: userId,
                updated_by: userId,
                Client_Roster_Form_id: uploadingRow.Client_Roster_Form_id || "",
                RICEWRequestFormId: id || uploadingRow.RICEWRequestFormId || "",
                Client_Functional_Testing_Specification_Assignment: uploadingRow.Client_Functional_Testing_Specification_Assignment || ""
            };

            if (uploadingRow.Client_Functional_Testing_Specification_Initiate_Work_id) {
                metadataPayload.Client_Functional_Testing_Specification_Initiate_Work_id = uploadingRow.Client_Functional_Testing_Specification_Initiate_Work_id;
            }

            const metadataUpdateResponse = await fetch('https://07eirxky2f.execute-api.ap-south-1.amazonaws.com/New/api/ricew/clientFunctionalTestingInitiateWork/createSubmit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify(metadataPayload)
            });

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
        if (!businessOwnerName.trim() || !businessOwnerEmail.trim() || !!emailError) {
            setErrorMsg('Please enter valid Client Owner Name and Email');
            setShowError(true);
            setTimeout(() => setShowError(false), 3000);
            return;
        }

        setLoading(true);
        try {
            const idToken = await getIdToken();
            const userId = localStorage.getItem('user_id') || 'system';
            const projectId = localStorage.getItem('project_id') || selectedProject?.id || '101';
            const currentTimestamp = new Date().toLocaleString('en-GB', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                hour12: false
            }).replace(',', '');

            // Prepare array of file objects
            const allUploadedDocs = modalDocuments
                .filter(doc => doc.isUploaded && doc.uploadObject)
                .map(doc => ({
                    File_Name: doc.path || doc.file?.name || "",
                    url: doc.uploadObject
                }));

            if (allUploadedDocs.length === 0) {
                if (uploadingRow.isUploaded && uploadingRow.uploadFiles && uploadingRow.uploadFiles.length > 0) {
                    allUploadedDocs.push(...uploadingRow.uploadFiles);
                } else {
                    throw new Error('No uploaded files to assign');
                }
            }

            const assignedRecord = {
                system_integrator_technical_owner_Initiate_Work_id: uploadingRow.system_integrator_technical_owner_Initiate_Work_id || "",
                Initiate_Work_id: uploadingRow.Client_Functional_Testing_Specification_Initiate_Work_id ? [uploadingRow.Client_Functional_Testing_Specification_Initiate_Work_id] : [],
                Upload_Object: allUploadedDocs,
                Client_Roster_Form_id: uploadingRow.Client_Roster_Form_id || "",
                RICEWRequestFormId: id || uploadingRow.RICEWRequestFormId || "",
                RICEW_Object: uploadingRow.ricewObject || uploadingRow.RICEW_Object || "",
                Client_Functional_Testing_Specification_Assignment: uploadingRow.Client_Functional_Testing_Specification_Assignment || "",
                Project_id: projectId,
                client_SI_Technical_Owner: businessOwnerName,
                client_SI_Technical_Owner_email: businessOwnerEmail,
                created_by: userId,
                End_Date: currentTimestamp
            };

            const payload = { records: [assignedRecord] };

            const response = await fetch('https://07eirxky2f.execute-api.ap-south-1.amazonaws.com/New/api/ricew/assignInitiateWorkSITechnicalOwner/createSubmit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (result.success) {
                setSuccessMsg('Assigned to SI Technical Owner successfully');
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 3000);
                setShowUploadModal(false);
                fetchData(); // Refresh to show pending status if applicable
            } else {
                throw new Error(result.error || result.details?.[0]?.error || 'Failed to assign Developer Owner');
            }
        } catch (error) {
            console.error('Assignment error:', error);
            setErrorMsg(error.message || 'Error assigning SI Technical Owner');
            setShowError(true);
            setTimeout(() => setShowError(false), 5000);
        } finally {
            setLoading(false);
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
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '150px', backgroundColor: 'white' }}>Upload Object</div>
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

                                            {/* Upload Object  */}
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
                                                        {row.isUploaded ? 'Re-upload' : 'Upload'}
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
                                        <button
                                            onClick={() => navigate(`/dashboard/client-functional-testing-work-copy/${id}`)}
                                            style={{
                                                backgroundColor: '#ebf8ff',
                                                color: '#2b6cb0',
                                                border: '1px solid #bee3f8',
                                                padding: '6px 12px',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '11px',
                                                fontWeight: '600',
                                                transition: 'all 0.2s',
                                                whiteSpace: 'nowrap',
                                                marginLeft: '10px'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.target.style.backgroundColor = '#bee3f8';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.backgroundColor = '#ebf8ff';
                                            }}
                                        >
                                            copy view
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
                                    value={requestFormDetails?.client_SI_Technical_Owner || ''}
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
                                    value={requestFormDetails?.client_SI_Technical_Owner_email || ''}
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
                            {/* Column order: Sr.No.(BOF) | Text(BOF) | DocName(BOF) | Text(FSWRN) | Upload(FSWRN) | Action(FSWRN) | DocName(FSWRN) */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '40px 1.2fr 0.4fr 1.2fr 90px 60px 0.5fr 150px',
                                borderLeft: '1px solid #ddd',
                                borderTop: '1px solid #ddd',
                                borderRadius: '4px 4px 0 0',
                                overflow: 'hidden',
                                backgroundColor: 'white'
                            }}>
                                {/* Group Header Row */}
                                <div style={{ gridColumn: 'span 3', borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '10px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px', backgroundColor: '#fcfcfc' }}>
                                    System Integrator Technical Owner Feedback
                                </div>
                                <div style={{ gridColumn: 'span 5', borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '10px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px', backgroundColor: '#edf2f7', color: '#2d3748' }}>
                                    Functional Tester Response
                                </div>
                                {/* Sub-Header Row */}
                                <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#fcfcfc' }}>Sr. No.</div>
                                <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#fcfcfc' }}>Text</div>
                                <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#fcfcfc' }}>Uploaded Document Name</div>
                                <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#edf2f7' }}>Text</div>
                                <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#edf2f7' }}>Upload</div>
                                <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#edf2f7' }}>Action</div>
                                <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#edf2f7' }}>Uploaded Document Name</div>
                                <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#edf2f7' }}>Technical Owner Decision</div>
                            </div>

                            {/* Feedback + Response Data Rows (BOF read-only | FSWRN editable) */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '40px 1.2fr 0.4fr 1.2fr 90px 60px 0.5fr 150px',
                                borderLeft: '1px solid #ddd',
                                borderRadius: '0 0 4px 4px',
                                overflow: 'hidden',
                                backgroundColor: 'white'
                            }}>
                                {combinedRows.map((row, idx) => {
                                    const isLast = idx === combinedRows.length - 1;
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
                                                fontSize: '12px',
                                                backgroundColor: row.bof.business_owner_decision === 'Close' ? '#f5f5f5' : '#fcfcfc',
                                                color: row.bof.business_owner_decision === 'Close' ? '#718096' : 'inherit',
                                                borderBottomLeftRadius: isLast && row.subRows?.length === 0 ? '4px' : '0'
                                            }}>
                                                {idx + 1}
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
                                            {/* Col 4: FSWRN Text (editable, with + sub-row button) */}
                                            <div style={{ borderBottom: row.subRows?.length > 0 ? '1px solid #eee' : cellBorderBottom, borderRight: '1px solid #ddd', padding: '5px', position: 'relative', backgroundColor: row.bof.business_owner_decision === 'Close' ? '#f5f5f5' : '#f9fafb' }}>
                                                <textarea
                                                    value={row.fswrn.text}
                                                    onChange={(e) => handleResponseChange(row.id, 'text', e.target.value)}
                                                    disabled={row.bof.business_owner_decision === 'Close'}
                                                    style={{ width: '100%', border: 'none', outline: 'none', resize: row.bof.business_owner_decision === 'Close' ? 'none' : 'vertical', minHeight: '35px', fontSize: '13px', fontFamily: 'Arial, sans-serif', padding: '5px', paddingBottom: '15px', backgroundColor: 'transparent', color: row.bof.business_owner_decision === 'Close' ? '#718096' : 'inherit', cursor: row.bof.business_owner_decision === 'Close' ? 'not-allowed' : 'text' }}
                                                    placeholder="Enter response..."
                                                />
                                                {/* <button
                                                    onClick={() => handleAddSubRow(row.id)}
                                                    style={{ position: 'absolute', right: '25px', bottom: '5px', background: 'none', border: 'none', padding: '0', cursor: 'pointer', color: '#3182ce', display: 'flex', alignItems: 'center' }}
                                                    title="Add sub-row"
                                                >
                                                    <Plus size={16} />
                                                </button> */}
                                            </div>
                                            {/* Col 5: FSWRN Upload */}
                                            <div style={{ borderBottom: row.subRows?.length > 0 ? '1px solid #eee' : cellBorderBottom, borderRight: '1px solid #ddd', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: row.bof.business_owner_decision === 'Close' ? '#f5f5f5' : '#f9fafb' }}>
                                                <button
                                                    onClick={() => document.getElementById(`fswrn-file-${row.id}`).click()}
                                                    disabled={row.bof.business_owner_decision === 'Close'}
                                                    style={{
                                                        backgroundColor: row.bof.business_owner_decision === 'Close' ? '#f1f5f9' : '#c6f6d5',
                                                        color: row.bof.business_owner_decision === 'Close' ? '#94a3b8' : '#22543d',
                                                        border: row.bof.business_owner_decision === 'Close' ? '1px solid #e2e8f0' : '1px solid #9ae6b4',
                                                        padding: '4px 8px',
                                                        borderRadius: '4px',
                                                        cursor: row.bof.business_owner_decision === 'Close' ? 'not-allowed' : 'pointer',
                                                        fontSize: '10px',
                                                        fontWeight: '600'
                                                    }}
                                                >
                                                    Upload
                                                </button>
                                                <input id={`fswrn-file-${row.id}`} type="file" style={{ display: 'none' }} disabled={row.bof.business_owner_decision === 'Close'} onChange={(e) => handleResponseFileUpload(row.id, e)} />
                                            </div>
                                            {/* Col 6: FSWRN Action (Trash to clear FSWRN data only) */}
                                            <div style={{ borderBottom: row.subRows?.length > 0 ? '1px solid #eee' : cellBorderBottom, borderRight: '1px solid #ddd', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: row.bof.business_owner_decision === 'Close' ? '#f5f5f5' : '#f9fafb' }}>
                                                {row.bof.business_owner_decision !== 'Close' && (
                                                    <Trash2 size={16} color="#e53e3e" style={{ cursor: 'pointer' }} onClick={() => handleRemoveRow(row.id)} />
                                                )}
                                            </div>
                                            {/* Col 7: FSWRN Uploaded Document Name */}
                                            <div style={{ borderBottom: row.subRows?.length > 0 ? '1px solid #eee' : cellBorderBottom, borderRight: '1px solid #ddd', padding: '8px 5px', fontSize: '11px', color: row.bof.business_owner_decision === 'Close' ? '#718096' : 'black', display: 'flex', alignItems: 'center', overflow: 'hidden', backgroundColor: row.bof.business_owner_decision === 'Close' ? '#f5f5f5' : '#f9fafb' }}>
                                                {row.fswrn.fileName ? (
                                                    <a href={row.fswrn.fileUrl !== '#' ? getFileViewUrl(row.fswrn.fileUrl, row.fswrn.fileName) : undefined} target="_blank" rel="noopener noreferrer" style={{ color: '#3182ce', textDecoration: 'none', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', pointerEvents: 'auto' }} title={row.fswrn.fileName}>{row.fswrn.fileName}</a>
                                                ) : <span style={{ color: '#999' }}>No doc</span>}
                                            </div>
                                            {/* Col 8: Technical Owner Decision */}
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
                                                        {/* Sub Col 4: FSWRN Sub Text (editable) */}
                                                        <div style={{ borderBottom: subCellBorderBottom, borderRight: '1px solid #ddd', padding: '5px', backgroundColor: subRow.bof.business_owner_decision === 'Close' ? '#f5f5f5' : '#f9fafb' }}>
                                                            <textarea
                                                                value={subRow.fswrn.text}
                                                                onChange={(e) => handleSubResponseChange(row.id, subRow.id, 'text', e.target.value)}
                                                                disabled={subRow.bof.business_owner_decision === 'Close'}
                                                                style={{ width: '100%', border: 'none', outline: 'none', resize: subRow.bof.business_owner_decision === 'Close' ? 'none' : 'vertical', minHeight: '30px', fontSize: '13px', fontFamily: 'Arial, sans-serif', padding: '5px', backgroundColor: 'transparent', color: subRow.bof.business_owner_decision === 'Close' ? '#718096' : 'inherit', cursor: subRow.bof.business_owner_decision === 'Close' ? 'not-allowed' : 'text' }}
                                                                placeholder="Enter sub-response..."
                                                            />
                                                        </div>
                                                        {/* Sub Col 5: FSWRN Sub Upload */}
                                                        <div style={{ borderBottom: subCellBorderBottom, borderRight: '1px solid #ddd', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: subRow.bof.business_owner_decision === 'Close' ? '#f5f5f5' : '#f9fafb' }}>
                                                            <button
                                                                onClick={() => document.getElementById(`fswrn-sub-file-${subRow.id}`).click()}
                                                                disabled={subRow.bof.business_owner_decision === 'Close'}
                                                                style={{
                                                                    backgroundColor: subRow.bof.business_owner_decision === 'Close' ? '#f1f5f9' : '#fff5f5',
                                                                    color: subRow.bof.business_owner_decision === 'Close' ? '#94a3b8' : '#c53030',
                                                                    border: subRow.bof.business_owner_decision === 'Close' ? '1px solid #e2e8f0' : '1px solid #feb2b2',
                                                                    padding: '4px 8px',
                                                                    borderRadius: '4px',
                                                                    cursor: subRow.bof.business_owner_decision === 'Close' ? 'not-allowed' : 'pointer',
                                                                    fontSize: '10px',
                                                                    fontWeight: '600'
                                                                }}
                                                            >
                                                                Upload
                                                            </button>
                                                            <input id={`fswrn-sub-file-${subRow.id}`} type="file" style={{ display: 'none' }} disabled={subRow.bof.business_owner_decision === 'Close'} onChange={(e) => handleSubResponseFileUpload(row.id, subRow.id, e)} />
                                                        </div>
                                                        {/* Sub Col 6: FSWRN Sub Action (Trash to remove sub-row) */}
                                                        <div style={{ borderBottom: subCellBorderBottom, borderRight: '1px solid #ddd', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: subRow.bof.business_owner_decision === 'Close' ? '#f5f5f5' : '#f9fafb' }}>
                                                            {subRow.bof.business_owner_decision !== 'Close' && (
                                                                <Trash2 size={14} color="#e53e3e" style={{ cursor: 'pointer' }} onClick={() => handleRemoveSubRow(row.id, subRow.id)} />
                                                            )}
                                                        </div>
                                                        {/* Sub Col 7: FSWRN Sub Uploaded Document Name */}
                                                        <div style={{ borderBottom: subCellBorderBottom, borderRight: '1px solid #ddd', padding: '8px 5px', fontSize: '11px', color: subRow.bof.business_owner_decision === 'Close' ? '#718096' : 'black', display: 'flex', alignItems: 'center', overflow: 'hidden', backgroundColor: subRow.bof.business_owner_decision === 'Close' ? '#f5f5f5' : '#f9fafb' }}>
                                                            {subRow.fswrn.fileName ? <a href={subRow.fswrn.fileUrl !== '#' ? getFileViewUrl(subRow.fswrn.fileUrl, subRow.fswrn.fileName) : undefined} target="_blank" rel="noopener noreferrer" style={{ color: '#3182ce', textDecoration: 'none', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', pointerEvents: 'auto' }} title={subRow.fswrn.fileName}>{subRow.fswrn.fileName}</a> : <span style={{ color: '#999' }}>No doc</span>}
                                                        </div>
                                                        {/* Sub Col 8: BOF Sub Technical Owner Decision */}
                                                        <div style={{ borderBottom: subCellBorderBottom, borderRight: '1px solid #ddd', padding: '8px 5px', fontSize: '12px', color: subRow.bof.business_owner_decision === 'Close' ? '#718096' : '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: subRow.bof.business_owner_decision === 'Close' ? '#f5f5f5' : '#f9fafb', borderBottomRightRadius: isLast && isLastSubRow ? '4px' : '0' }}>
                                                            {subRow.bof.business_owner_decision || 'Open'}
                                                        </div>
                                                    </React.Fragment>
                                                );
                                            })}
                                        </React.Fragment>
                                    );
                                })}
                                {/* + Add Row and Submit Response buttons aligned with FSWRN Upload column (col 5) */}
                                <div style={{ gridColumn: 'span 4' }} />
                                <div style={{ gridColumn: '5 / span 4', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', padding: '15px 0' }}>
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
                                    <button
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
                                    </button>
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
                        width: '700px',
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
                            <h2 style={{ fontSize: '18px', margin: 0 }}>Upload Form</h2>
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
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '15px' }}>
                                <button
                                    onClick={handleUploadSubmit}
                                    disabled={loading || !modalDocuments.some(d => d.file && !d.isUploaded)}
                                    style={{
                                        backgroundColor: (loading || !modalDocuments.some(d => d.file && !d.isUploaded)) ? '#cccccc' : '#3b82f6',
                                        color: 'white',
                                        border: 'none',
                                        marginBottom: '20px',
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



                            {/* Spacing if no view box */}
                            {!uploadingRow?.isUploaded && <div style={{ marginBottom: '20px' }}></div>}

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
                                    Technical Owner
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
                                            <input
                                                type="text"
                                                value={businessOwnerName}
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
                                                }}
                                                maxLength={100}
                                                placeholder="Enter Technical Owner Name"
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
                                                placeholder="Enter Technical Owner Email"
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
                                <button
                                    onClick={handleAssignToTechnicalOwner}
                                    disabled={!businessOwnerName.trim() || !businessOwnerEmail.trim() || !!emailError || !!nameError || !modalDocuments.some(d => d.isUploaded)}
                                    style={{
                                        backgroundColor: (!businessOwnerName.trim() || !businessOwnerEmail.trim() || !!emailError || !!nameError || !modalDocuments.some(d => d.isUploaded)) ? '#cccccc' : '#28a745',
                                        color: 'white',
                                        border: 'none',
                                        padding: '10px 20px',
                                        borderRadius: '4px',
                                        cursor: (!businessOwnerName.trim() || !businessOwnerEmail.trim() || !!emailError || !!nameError || !modalDocuments.some(d => d.isUploaded)) ? 'not-allowed' : 'pointer',
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        transition: 'all 0.2s',
                                        boxShadow: (!businessOwnerName.trim() || !businessOwnerEmail.trim() || !!emailError || !!nameError || !modalDocuments.some(d => d.isUploaded)) ? 'none' : '0 2px 4px rgba(0,0,0,0.1)',
                                        opacity: (!businessOwnerName.trim() || !businessOwnerEmail.trim() || !!emailError || !!nameError || !modalDocuments.some(d => d.isUploaded)) ? 0.8 : 1
                                    }}
                                    onMouseEnter={(e) => {
                                        if (businessOwnerName.trim() && businessOwnerEmail.trim() && !emailError && !nameError && modalDocuments.some(d => d.isUploaded)) {
                                            e.target.style.backgroundColor = '#218838';
                                            e.target.style.transform = 'translateY(-1px)';
                                            e.target.style.boxShadow = '0 4px 6px rgba(0,0,0,0.15)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (businessOwnerName.trim() && businessOwnerEmail.trim() && !emailError && !nameError && modalDocuments.some(d => d.isUploaded)) {
                                            e.target.style.backgroundColor = '#28a745';
                                            e.target.style.transform = 'none';
                                            e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                                        }
                                    }}
                                >
                                    Assign System Integrator Technical Owner
                                </button>
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

export default InitiateClientFunctionalUnitTesting;
