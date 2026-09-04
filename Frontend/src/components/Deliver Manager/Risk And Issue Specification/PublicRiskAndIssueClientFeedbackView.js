import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { Trash2, Plus, HelpCircle, X } from 'lucide-react';
import { getIdToken } from '../../../utils/cognito-auth';

const PublicRiskAndIssueClientFeedbackView = ({ selectedProject }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [formData, setFormData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [projectId, setProjectId] = useState('');
    const [projectName, setProjectName] = useState('');

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

    // Table 1 Data
    const [workData, setWorkData] = useState([]);
    const workDataRef = useRef([]);

    useEffect(() => {
        workDataRef.current = workData;
    }, [workData]);

    // Feedback Form (Table 2) State
    const [ownerName, setOwnerName] = useState('');
    const [ownerEmail, setOwnerEmail] = useState('');
    const [writerName, setWriterName] = useState('');
    const [writerEmail, setWriterEmail] = useState('');
    const [feedbackRows, setFeedbackRows] = useState([]);

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
            // Fetch both APIs in parallel
            const [assignmentRes, initiateWorkRes] = await Promise.all([
                fetch(`https://ves5hu7c23.execute-api.ap-south-1.amazonaws.com/New/publicView/feedbackForm/assignmentDetails?Risk_Issue_Assignment_id=${id}`),
                fetch(`https://ves5hu7c23.execute-api.ap-south-1.amazonaws.com/New/publicView/feedbackForm/initiateWorkDetails?Risk_Issue_Assignment_id=${id}`)
            ]);

            const [assignmentResult, initiateWorkResult] = await Promise.all([
                assignmentRes.json(),
                initiateWorkRes.json()
            ]);

            let workItems = [];

            // Always ensure formData is set so the page renders
            // (even when no feedback has been submitted yet)
            setFormData({ RiskAndIssueFormId: id, title: "Risk and Issue Specification" });

            // 1. Map work data from initiateWorkDetails (upper table)
            if (initiateWorkResult.success && initiateWorkResult.data) {
                workItems = initiateWorkResult.data;
                const mappedWorkData = workItems.map(item => ({
                    srNo: item.Risk_Issue_Specification_Initiate_Work_id || item.SrNo || "0",
                    recordType: DOMPurify.sanitize(item.riskIssue_title || "-", { ALLOWED_TAGS: [] }),
                    assignedDate: DOMPurify.sanitize(item.assign_object_date || "-", { ALLOWED_TAGS: [] }),
                    startObject: DOMPurify.sanitize(item.start_object_date || "-", { ALLOWED_TAGS: [] }),
                    uploadFiles: Array.isArray(item.Upload_Object)
                        ? item.Upload_Object
                            .filter(f => f.document_approved === 'true')
                            .map(f => ({ url: f.url, File_Name: DOMPurify.sanitize(f.File_Name || '', { ALLOWED_TAGS: [] }), document_approved: f.document_approved }))
                        : [],
                    endDate: DOMPurify.sanitize(item.Target_Resolution_Date || "-", { ALLOWED_TAGS: [] }),
                    comment: DOMPurify.sanitize(item.Comment_section || "-", { ALLOWED_TAGS: [] }),
                    RiskIssue_Work_id: item.Risk_Issue_Specification_Initiate_Work_id
                })).sort((a, b) => {
                    const idA = parseInt(String(a.srNo).replace(/\D/g, '')) || 0;
                    const idB = parseInt(String(b.srNo).replace(/\D/g, '')) || 0;
                    return idA - idB;
                });

                setWorkData(mappedWorkData);
            }

            // 2. Map feedback rows + owner info from assignmentDetails
            if (assignmentResult.success && assignmentResult.data && assignmentResult.data.length > 0) {
                const existingFeedback = assignmentResult.data;
                const firstItem = existingFeedback[0];

                if (firstItem) {
                    if (firstItem.Owner_Risk_Issue_name) setOwnerName(DOMPurify.sanitize(firstItem.Owner_Risk_Issue_name, { ALLOWED_TAGS: [] }));
                    if (firstItem.Owner_Risk_Issue_email) setOwnerEmail(DOMPurify.sanitize(firstItem.Owner_Risk_Issue_email, { ALLOWED_TAGS: [] }));
                    if (firstItem.Writer_Name) setWriterName(DOMPurify.sanitize(firstItem.Writer_Name, { ALLOWED_TAGS: [] }));
                    if (firstItem.Writer_Email) setWriterEmail(DOMPurify.sanitize(firstItem.Writer_Email, { ALLOWED_TAGS: [] }));

                    const fetchedProjectId = firstItem.Project_id || firstItem.project_id;
                    setProjectId(fetchedProjectId);

                    // Fetch project name
                    if (fetchedProjectId) {
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

                    setFormData({
                        RiskAndIssueFormId: firstItem.RiskAndIssueFormId || id,
                        record_type: DOMPurify.sanitize(firstItem.riskIssue_title || "Record", { ALLOWED_TAGS: [] }),
                        title: "Risk and Issue Specification"
                    });
                }

                // Sync feedback rows with work items
                const synchronizedFeedback = workItems.map((workItem) => {
                    const workId = workItem.Risk_Issue_Specification_Initiate_Work_id;
                    const fb = existingFeedback.find(f => String(f.Risk_Issue_Specification_Initiate_Work_id) === String(workId));

                    if (fb) {
                        const sanitizedSubRows = (fb.sub_feedbacks || []).map(sub => ({
                            ...sub,
                            feedback_text: DOMPurify.sanitize(sub.feedback_text || '', { ALLOWED_TAGS: [] }),
                            supported_document_name: DOMPurify.sanitize(sub.supported_document_name || '', { ALLOWED_TAGS: [] })
                        }));
                        return {
                            id: fb.Risk_Issue_feedback_id,
                            srNo: workId,
                            text: DOMPurify.sanitize(fb.feedback_text || "", { ALLOWED_TAGS: [] }),
                            fileUrl: fb.supported_document || "",
                            fileName: DOMPurify.sanitize(fb.supported_document_name || "", { ALLOWED_TAGS: [] }),
                            business_owner_decision: fb.business_owner_decision || 'Open',
                            subRows: sanitizedSubRows
                        };
                    } else {
                        return {
                            id: `init-${workId}`,
                            srNo: workId,
                            text: '',
                            fileName: '',
                            fileUrl: '',
                            business_owner_decision: 'Open',
                            subRows: []
                        };
                    }
                }).sort((a, b) => {
                    const idA = parseInt(String(a.srNo).replace(/\D/g, '')) || 0;
                    const idB = parseInt(String(b.srNo).replace(/\D/g, '')) || 0;
                    return idA - idB;
                });

                setFeedbackRows(synchronizedFeedback);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            setFormData({ RiskAndIssueFormId: id, title: "Risk and Issue Specification" });
        } finally {
            setLoading(false);
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
        setFeedbackRows(prev => prev.map(row => {
            if (row.id === parentId) {
                return {
                    ...row,
                    subRows: row.subRows.map(sub => {
                        const subId = sub.Risk_Issue_feedback_id || sub.id;
                        if (subId === subRowId) {
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
                <p style={{ color: '#666', fontSize: '14px' }}>Record not found or access denied.</p>
            </div>
        );
    }

    return (
        <div className="config-main" style={{ minHeight: '100vh', backgroundColor: '#f0f0f0', padding: '0', margin: '0', fontFamily: 'Arial, sans-serif' }}>
            <style>
                {`
                    .btn-upload { background-color: #f1f5f9 !important; color: #94a3b8 !important; border: 1px solid #e2e8f0 !important; cursor: not-allowed !important; }
                    .btn-trash-disabled { color: #9ca3af !important; cursor: not-allowed !important; }
                    button, label, select { transition: all 0.2s ease-in-out; }
                    .help-modal-scroll::-webkit-scrollbar { width: 4px; }
                    .help-modal-scroll::-webkit-scrollbar-track { background: transparent; margin: 8px 0; }
                    .help-modal-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                    .help-modal-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                `}
            </style>
            <div style={{ padding: '20px', width: '100%', minWidth: '1320px', margin: '0', boxSizing: 'border-box' }}>

                {/* Project Header */}
                <div style={{ backgroundColor: 'white', padding: '15px 25px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, color: '#333', fontSize: '16px' }}>Project : <span style={{ color: '#007bff' }}>{projectName || localStorage.getItem('project_name') || ''}</span></h3>
                </div>

                {/* Main Specification Section */}
                <div style={{ backgroundColor: 'white', padding: '0', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '30px', overflow: 'hidden' }}>
                    <div className="config-header" style={{ backgroundColor: '#fcfcfc', padding: '12px 20px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h4 style={{ margin: 0, color: '#333', fontSize: '14px', fontWeight: 'bold' }}>Feedback Form (Risk and Issue)</h4>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <button onClick={() => setShowHelpPopup(!showHelpPopup)} style={{ backgroundColor: '#4D5C74', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s ease', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3d495c'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4D5C74'}>
                                <HelpCircle size={14} />
                                Help
                            </button>
                            {showHelpPopup && (
                                <div style={{ position: 'fixed', top: '0', left: '0', right: '0', bottom: '0', backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 30000, padding: '20px' }}>
                                    <div ref={helpPopupRef} style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                                        <div className="help-modal-scroll" style={{ overflowY: 'auto', padding: '32px', textAlign: 'left', flex: '1', fontFamily: 'Arial, sans-serif' }}>
                                            <button onClick={() => setShowHelpPopup(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545' }}><X size={20} /></button>
                                            <h3 style={{ margin: '0 0 16px 0', color: '#333', fontSize: '18px', fontWeight: '600' }}>Help & Information</h3>
                                            <div style={{ color: '#444', fontSize: '14px', lineHeight: '1.6' }}>
                                                <div style={{ marginBottom: '16px' }}>
                                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>What is this page?</strong>
                                                    <p style={{ margin: '6px 0 0 0', color: '#555' }}>The <strong>Feedback Form</strong> allows client business owners to review risk and issue resolutions and provide their feedback.</p>
                                                </div>
                                                <div style={{ marginBottom: '16px' }}>
                                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to provide feedback</strong>
                                                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                                        <li>Review the uploaded documents in the top table.</li>
                                                        <li>Use the Feedback Form section to provide comments and additional documentation.</li>
                                                        <li>Select a <strong>Decision</strong> from the dropdown.</li>
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
                        <div style={{ border: '1px solid #ddd', borderRadius: '4px', overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px', tableLayout: 'fixed' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#fcfcfc', borderBottom: '1px solid #ddd' }}>
                                        <th style={{ padding: '12px 8px', width: '60px', textAlign: 'center', borderRight: '1px solid #ddd' }}>Sr. No.</th>
                                        <th style={{ padding: '12px 8px', width: '180px', borderRight: '1px solid #ddd', textAlign: 'center' }}>Title</th>
                                        <th style={{ padding: '12px 8px', width: '120px', borderRight: '1px solid #ddd', textAlign: 'center' }}>Assigned Date</th>
                                        <th style={{ padding: '12px 8px', width: '130px', borderRight: '1px solid #ddd', textAlign: 'center' }}>Start Object</th>
                                        <th style={{ padding: '12px 8px', width: '350px', borderRight: '1px solid #ddd', textAlign: 'center' }}>Response</th>
                                        <th style={{ padding: '12px 8px', width: '170px', borderRight: '1px solid #ddd', textAlign: 'center' }}>Document Approve</th>
                                        <th style={{ padding: '12px 8px', width: '120px', borderRight: '1px solid #ddd', textAlign: 'center' }}>End Date</th>
                                        <th style={{ padding: '12px 8px', width: '240px', textAlign: 'center' }}>Comment</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {workData.map((row, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #ddd' }}>
                                            <td style={{ padding: '12px 8px', textAlign: 'center', borderRight: '1px solid #ddd' }}>{row.srNo}</td>
                                            <td style={{ padding: '12px 8px', borderRight: '1px solid #ddd' }}>{row.recordType}</td>
                                            <td style={{ padding: '12px 8px', borderRight: '1px solid #ddd', textAlign: 'center' }}>{formatToDDMMMYYYY(row.assignedDate)}</td>
                                            <td style={{ padding: '12px 8px', borderRight: '1px solid #ddd', textAlign: 'center' }}>{formatToDDMMMYYYY(row.startObject)}</td>
                                            <td style={{ padding: '0', borderRight: '1px solid #ddd' }}>
                                                <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {row.uploadFiles && row.uploadFiles.length > 0 ? row.uploadFiles.map((file, fIdx) => (
                                                        <a
                                                            key={fIdx}
                                                            href={getFileViewUrl(file.url, file.File_Name)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                padding: '8px 12px',
                                                                backgroundColor: '#f0f7ff',
                                                                border: '1px solid #d1e9ff',
                                                                borderRadius: '4px',
                                                                color: '#2563eb',
                                                                textDecoration: 'none',
                                                                fontSize: '11px',
                                                                fontWeight: '500',
                                                                transition: 'all 0.2s ease',
                                                                width: 'calc(100% - 24px)'
                                                            }}
                                                        >
                                                            <span style={{ color: '#444', marginRight: '6px' }}>{fIdx + 1}.</span>
                                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.File_Name}</span>
                                                        </a>
                                                    )) : <div style={{ padding: '12px 8px', color: '#999', textAlign: 'center' }}>-</div>}
                                                </div>
                                            </td>
                                            <td style={{ padding: '0', borderRight: '1px solid #ddd' }}>
                                                <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {row.uploadFiles && row.uploadFiles.length > 0 ? row.uploadFiles.map((file, fIdx) => (
                                                        <div key={fIdx} style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            height: '35px' // Matches the visual height of the file container
                                                        }}>
                                                            <span style={{
                                                                padding: '4px 12px',
                                                                borderRadius: '4px',
                                                                fontSize: '11px',
                                                                fontWeight: 'bold',
                                                                color: 'white',
                                                                backgroundColor: file.document_approved === 'true' ? '#28a745' : file.document_approved === 'false' ? '#dc3545' : '#6c757d',
                                                                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                                            }}>
                                                                {file.document_approved === 'true' ? 'Approved' : file.document_approved === 'false' ? 'Rejected' : '-'}
                                                            </span>
                                                        </div>
                                                    )) : <div style={{ padding: '12px 8px', textAlign: 'center' }}>-</div>}
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px 8px', borderRight: '1px solid #ddd', textAlign: 'center' }}>{formatToDDMMMYYYY(row.endDate)}</td>
                                            <td style={{ padding: '12px 8px' }}>
                                                <div style={{ fontSize: '11px', color: '#666', lineHeight: '1.4' }}>{row.comment}</div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Feedback Section */}
                <div style={{ backgroundColor: 'white', padding: '0', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '30px', overflow: 'hidden' }}>
                    <div style={{ backgroundColor: '#fcfcfc', padding: '12px 20px', borderBottom: '1px solid #eee' }}>
                        <h4 style={{ margin: 0, color: '#333', fontSize: '15px', fontWeight: 'bold' }}>Feedback Form</h4>
                    </div>

                    <div style={{ padding: '20px' }}>
                        {/* Owner Info Alignment */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '40px', marginBottom: '25px', padding: '0 10px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 'bold' }}>
                                Risk And Issue object Owner <span style={{ color: 'red' }}>*</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '12px' }}>Name :</span>
                                <div style={{ minWidth: '180px', padding: '6px 10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px', backgroundColor: '#fff' }}>{ownerName || "-"}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '12px' }}>Email Address :</span>
                                <div style={{ minWidth: '250px', padding: '6px 10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px', backgroundColor: '#fff' }}>{ownerEmail || "-"}</div>
                            </div>
                        </div>

                        {/* Feedback Table */}
                        {/* Feedback Table */}
                        <div style={{ border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden' }}>
                            {/* Grid Header */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '60px 1.2fr 90px 0.4fr 60px 150px',
                                backgroundColor: 'white'
                            }}>
                                {/* Group Header Row */}
                                <div style={{ gridColumn: 'span 6', borderBottom: '1px solid #ddd', padding: '10px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#fcfcfc' }}>
                                    Client Business Owner Feedback
                                </div>
                                {/* Sub-Header Row */}
                                <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '10px 8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#fcfcfc' }}>Sr. No.</div>
                                <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '10px 12px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#fcfcfc' }}>Text</div>
                                <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '10px 8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#fcfcfc' }}>Upload</div>
                                <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '10px 12px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#fcfcfc' }}>Uploaded Document Name</div>
                                <div style={{ borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '10px 12px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#fcfcfc' }}>Action</div>
                                <div style={{ borderBottom: '1px solid #ddd', padding: '10px 12px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#fcfcfc' }}>Business Owner Decision</div>
                            </div>

                            {/* Grid Body */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '60px 1.2fr 90px 0.4fr 60px 150px',
                                backgroundColor: 'white'
                            }}>
                                {feedbackRows.filter(row => (row.text && row.text !== '-' && row.text !== 'Add Feedback Text') || row.fileName).length > 0 ? (
                                    feedbackRows.filter(row => (row.text && row.text !== '-' && row.text !== 'Add Feedback Text') || row.fileName).map((row, idx, arr) => {
                                        const isLast = idx === arr.length - 1;
                                        const cellBorderBottom = '1px solid #ddd';
                                        const rowSpan = 1 + (row.subRows?.length || 0);
                                        const isDecisionClosed = row.business_owner_decision === 'Close';

                                        return (
                                            <React.Fragment key={idx}>
                                                {/* Col 1: Sr. No. */}
                                                <div style={{
                                                    gridRow: `span ${rowSpan}`,
                                                    borderBottom: cellBorderBottom,
                                                    borderRight: '1px solid #ddd',
                                                    padding: '12px 8px',
                                                    textAlign: 'center',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '12px',
                                                    backgroundColor: isDecisionClosed ? '#f5f5f5' : '#fcfcfc',
                                                    color: isDecisionClosed ? '#718096' : 'inherit'
                                                }}>
                                                    {row.srNo}
                                                </div>
                                                {/* Col 2: Text */}
                                                <div style={{ borderBottom: row.subRows?.length > 0 ? '1px solid #eee' : cellBorderBottom, borderRight: '1px solid #ddd', padding: '12px 12px', color: isDecisionClosed ? '#718096' : '#555', backgroundColor: isDecisionClosed ? '#f5f5f5' : 'white', display: 'flex', alignItems: 'center', position: 'relative' }}>
                                                    {row.text}
                                                    {!isDecisionClosed && (
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
                                                {/* Col 3: Upload */}
                                                <div style={{ borderBottom: row.subRows?.length > 0 ? '1px solid #eee' : cellBorderBottom, borderRight: '1px solid #ddd', padding: '12px 8px', textAlign: 'center', backgroundColor: isDecisionClosed ? '#f5f5f5' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <label className="btn-upload" style={{ cursor: 'not-allowed', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '4px 12px', borderRadius: '4px', fontSize: '10px', fontWeight: '600' }}>
                                                        Upload
                                                    </label>
                                                </div>
                                                {/* Col 4: Document Name */}
                                                <div style={{ borderBottom: row.subRows?.length > 0 ? '1px solid #eee' : cellBorderBottom, borderRight: '1px solid #ddd', padding: '12px 12px', textAlign: 'center', backgroundColor: isDecisionClosed ? '#f5f5f5' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                                    {row.fileName ? (
                                                        <a href={getFileViewUrl(row.fileUrl, row.fileName)} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'none', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }} title={row.fileName}>
                                                            {row.fileName}
                                                        </a>
                                                    ) : <span style={{ color: '#999' }}>No doc</span>}
                                                </div>
                                                {/* Col 5: Action */}
                                                <div style={{ borderBottom: row.subRows?.length > 0 ? '1px solid #eee' : cellBorderBottom, borderRight: '1px solid #ddd', padding: '12px 12px', textAlign: 'center', backgroundColor: isDecisionClosed ? '#f5f5f5' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Trash2 size={18} className="btn-trash-disabled" />
                                                </div>
                                                {/* Col 6: Decision */}
                                                <div style={{ borderBottom: row.subRows?.length > 0 ? '1px solid #eee' : cellBorderBottom, padding: '12px 12px', textAlign: 'center', backgroundColor: isDecisionClosed ? '#f5f5f5' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <div style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#f9f9f9', display: 'inline-block', minWidth: '70px', color: isDecisionClosed ? '#718096' : 'inherit' }}>
                                                        {row.business_owner_decision}
                                                    </div>
                                                </div>

                                                {/* Sub Rows */}
                                                {row.subRows?.map((subRow, sIdx) => {
                                                    const isLastSubRow = sIdx === row.subRows.length - 1;
                                                    const subCellBorderBottom = isLastSubRow ? cellBorderBottom : '1px solid #eee';
                                                    const isSubDecisionClosed = subRow.business_owner_decision === 'Close' || subRow.decisionbackend === 'Close';
                                                    const subId = subRow.Risk_Issue_feedback_id || subRow.id;
                                                    const isSubNew = subRow.isNew || (typeof subId === 'string' && subId.startsWith('sub-new-'));
                                                    return (
                                                        <React.Fragment key={subId || sIdx}>
                                                            {/* Sub-row Text */}
                                                            <div style={{ borderBottom: subCellBorderBottom, borderRight: '1px solid #ddd', padding: isSubNew ? '0' : '12px 12px', color: isSubDecisionClosed ? '#718096' : '#555', backgroundColor: isSubDecisionClosed ? '#f5f5f5' : '#fffdee', display: 'flex', alignItems: isSubNew ? 'stretch' : 'center', position: 'relative' }}>
                                                                {isSubNew ? (
                                                                    <>
                                                                        <textarea
                                                                            value={subRow.feedback_text || subRow.text || ''}
                                                                            onChange={(e) => handleSubRowChange(row.id, subId, 'text', e.target.value)}
                                                                            style={{
                                                                                width: '100%',
                                                                                border: 'none',
                                                                                outline: 'none',
                                                                                resize: 'vertical',
                                                                                minHeight: '35px',
                                                                                fontSize: '13px',
                                                                                fontFamily: 'inherit',
                                                                                padding: '10px 12px',
                                                                                paddingBottom: '20px',
                                                                                backgroundColor: 'transparent',
                                                                                color: '#555'
                                                                            }}
                                                                            placeholder="Enter sub-feedback..."
                                                                        />
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
                                                                    </>
                                                                ) : (
                                                                    subRow.feedback_text || subRow.text
                                                                )}
                                                            </div>
                                                            {/* Sub-row Upload */}
                                                            <div style={{ borderBottom: subCellBorderBottom, borderRight: '1px solid #ddd', padding: '12px 8px', textAlign: 'center', backgroundColor: isSubDecisionClosed ? '#f5f5f5' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                {isSubNew && !isSubDecisionClosed ? (
                                                                    <>
                                                                        <button
                                                                            onClick={() => document.getElementById(`client-sub-file-${subId}`).click()}
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
                                                                        <input id={`client-sub-file-${subId}`} type="file" style={{ display: 'none' }} onChange={(e) => handleSubRowFileUpload(row.id, subId, e)} />
                                                                    </>
                                                                ) : (
                                                                    <label className="btn-upload" style={{ cursor: 'not-allowed', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '4px 12px', borderRadius: '4px', fontSize: '10px', fontWeight: '600' }}>
                                                                        Upload
                                                                    </label>
                                                                )}
                                                            </div>
                                                            {/* Sub-row Document Name */}
                                                            <div style={{ borderBottom: subCellBorderBottom, borderRight: '1px solid #ddd', padding: '12px 12px', textAlign: 'center', backgroundColor: isSubDecisionClosed ? '#f5f5f5' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                                                {(subRow.supported_document_name || subRow.fileName) ? (
                                                                    <a href={getFileViewUrl(subRow.supported_document || subRow.fileUrl, subRow.supported_document_name || subRow.fileName)} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'none', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }} title={subRow.supported_document_name || subRow.fileName}>
                                                                        {subRow.supported_document_name || subRow.fileName}
                                                                    </a>
                                                                ) : <span style={{ color: '#999' }}>No doc</span>}
                                                            </div>
                                                            {/* Sub-row Action */}
                                                            <div style={{ borderBottom: subCellBorderBottom, borderRight: '1px solid #ddd', padding: '12px 12px', textAlign: 'center', backgroundColor: isSubDecisionClosed ? '#f5f5f5' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                {isSubNew ? (
                                                                    <Trash2
                                                                        size={16}
                                                                        color="#e53e3e"
                                                                        style={{ cursor: 'pointer' }}
                                                                        onClick={() => handleRemoveSubRow(row.id, subId)}
                                                                        title="Remove sub-row"
                                                                    />
                                                                ) : (
                                                                    <Trash2 size={18} className="btn-trash-disabled" />
                                                                )}
                                                            </div>
                                                            {/* Sub-row Decision */}
                                                            <div style={{ borderBottom: subCellBorderBottom, padding: '12px 12px', textAlign: 'center', backgroundColor: isSubDecisionClosed ? '#f5f5f5' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <div style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#f9f9f9', display: 'inline-block', minWidth: '70px', color: isSubDecisionClosed ? '#718096' : 'inherit' }}>
                                                                    {subRow.business_owner_decision || subRow.decisionbackend || 'Open'}
                                                                </div>
                                                            </div>
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </React.Fragment>
                                        );
                                    })
                                ) : (
                                    <div style={{ gridColumn: 'span 6', padding: '30px', textAlign: 'center', color: '#999', borderBottom: '1px solid #ddd' }}>
                                        No feedback available for this record.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Branding Footer */}
                <div style={{ textAlign: 'center', paddingBottom: '20px' }}>
                    <p style={{ color: '#999', fontSize: '11px', margin: 0 }}>© {new Date().getFullYear()} ERP Enablement Platform | Read-Only View for Client Owner</p>
                </div>
            </div>
        </div>
    );
};

export default PublicRiskAndIssueClientFeedbackView;
