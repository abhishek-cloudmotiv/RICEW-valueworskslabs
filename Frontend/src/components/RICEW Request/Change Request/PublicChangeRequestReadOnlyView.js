import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { changeRequestSubmitApiClient } from './ChangeRequestClient';

const PublicChangeRequestReadOnlyView = () => {
    const { token } = useParams();

    // Decode token (Expected format: base64(projectId|id))
    let projectId = '';
    let id = '';
    try {
        if (token) {
            const decoded = atob(token);
            const [pId, rId] = decoded.split('|');
            projectId = pId;
            id = rId;
        }
    } catch (e) {
        console.error('Error decoding token:', e);
    }

    const [isDataLoading, setIsDataLoading] = useState(true);
    const [statusMessage, setStatusMessage] = useState('');
    const [showError, setShowError] = useState(false);

    // Preview Modal State
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [previewContent, setPreviewContent] = useState({ url: '', name: '' });

    const [record, setRecord] = useState(null);

    const fetchDetails = useCallback(async () => {
        try {
            setIsDataLoading(true);
            // Using the specialized Read-Only GET API
            const response = await changeRequestSubmitApiClient.get(`/publicView/ricew/ChangeRequest/ReadOnly/getDetails?Change_Request_Form_id=${id}&Project_id=${projectId}`);

            if (response.success && response.data) {
                const d = response.data;
                const sanitizedRecord = {
                    ...d,
                    Project_Name: DOMPurify.sanitize(d.Project_Name || '', { ALLOWED_TAGS: [] }),
                    Change_Description: DOMPurify.sanitize(d.Change_Description || '', { ALLOWED_TAGS: [] }),
                    Change_Business_Justification: DOMPurify.sanitize(d.Change_Business_Justification || '', { ALLOWED_TAGS: [] }),
                    Change_Proposed_Solution: DOMPurify.sanitize(d.Change_Proposed_Solution || '', { ALLOWED_TAGS: [] }),
                    Change_Approval_Status: DOMPurify.sanitize(d.Change_Approval_Status || '', { ALLOWED_TAGS: [] }),
                    Change_Approved_By_Name: DOMPurify.sanitize(d.Change_Approved_By_Name || '', { ALLOWED_TAGS: [] }),
                    Change_Approved_By: DOMPurify.sanitize(d.Change_Approved_By || '', { ALLOWED_TAGS: [] }),
                    Change_Rejected_By_Name: DOMPurify.sanitize(d.Change_Rejected_By_Name || '', { ALLOWED_TAGS: [] }),
                    Change_Rejected_By: DOMPurify.sanitize(d.Change_Rejected_By || '', { ALLOWED_TAGS: [] }),
                    Change_Rejection_Reason: DOMPurify.sanitize(d.Change_Rejection_Reason || '', { ALLOWED_TAGS: [] }),
                    Change_Rejected_Reason: DOMPurify.sanitize(d.Change_Rejected_Reason || '', { ALLOWED_TAGS: [] }),
                    Request_Reason: DOMPurify.sanitize(d.Request_Reason || '', { ALLOWED_TAGS: [] }),
                    Change_Aging: DOMPurify.sanitize(d.Change_Aging || '', { ALLOWED_TAGS: [] })
                };
                setRecord(sanitizedRecord);
            } else {
                setStatusMessage(response.error || 'Failed to load Change Request details.');
                setShowError(true);
            }
        } catch (error) {
            console.error('Error fetching details:', error);
            setStatusMessage('A network error occurred while loading the page.');
            setShowError(true);
        } finally {
            setIsDataLoading(false);
        }
    }, [id, projectId]);

    useEffect(() => {
        if (id) {
            fetchDetails();
        }
    }, [id, fetchDetails]);

    const getFileViewUrl = (url, name) => {
        if (!url) return '';
        const extension = (name || url).split('.').pop().toLowerCase();
        if (['xlsx', 'xls', 'csv', 'docx', 'doc', 'ppt', 'pptx'].includes(extension)) {
            return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`;
        }
        return url;
    };

    const handlePreview = (url, name) => {
        const extension = (name || url.split('?')[0]).split('.').pop().toLowerCase();
        if (['xlsx', 'xls', 'csv', 'docx', 'doc', 'pdf', 'txt'].includes(extension)) {
            window.open(getFileViewUrl(url, name), '_blank');
        } else {
            setPreviewContent({ url, name });
            setIsPreviewModalOpen(true);
        }
    };

    const renderDescriptionWithLinks = (text, linkMap) => {
        if (!text) return [];
        const parts = [];
        const regex = /\[([^\]]+)\]/g;
        let lastIndex = 0;
        let match;
        const safeLinkMap = linkMap || {};

        while ((match = regex.exec(text)) !== null) {
            if (match.index > lastIndex) parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
            const bracketKey = match[0];
            const url = safeLinkMap[bracketKey];
            if (url) {
                parts.push({ type: 'link', key: bracketKey, name: match[1], url });
            } else {
                parts.push({ type: 'text', value: bracketKey });
            }
            lastIndex = match.index + match[0].length;
        }
        if (lastIndex < text.length) parts.push({ type: 'text', value: text.slice(lastIndex) });
        return parts;
    };

    const ImagePreviewModal = () => {
        if (!isPreviewModalOpen) return null;
        return (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, animation: 'fadeIn 0.2s ease' }} onClick={() => setIsPreviewModalOpen(false)}>
                <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%', backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 5px 30px rgba(0,0,0,0.3)', animation: 'scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }} onClick={e => e.stopPropagation()}>
                    <div style={{ padding: '12px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8f9fa' }}>
                        <span style={{ fontWeight: '600', color: '#333', fontSize: '14px' }}>{previewContent.name || 'Image Preview'}</span>
                        <button onClick={() => setIsPreviewModalOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', color: '#666' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#e9ecef'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: '#f0f2f5', display: 'flex', justifyContent: 'center' }}>
                        <img src={previewContent.url} alt={previewContent.name} style={{ maxWidth: '100%', maxHeight: 'calc(90vh - 60px)', objectFit: 'contain', display: 'block', borderRadius: '4px' }} />
                    </div>
                </div>
                <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } @keyframes scaleUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
            </div>
        );
    };

    const getFileUrl = (docs) => {
        if (!docs || !Array.isArray(docs) || docs.length === 0) return null;
        return docs[0];
    };

    if (isDataLoading) {
        return (
            <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f7fa' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '24px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    <div style={{ width: '40px', height: '40px', border: '3px solid #f3f3f3', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    <span style={{ fontSize: '16px', fontWeight: '500', color: '#333' }}>Loading Request...</span>
                </div>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (!record) {
        return (
            <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f7fa' }}>
                <div style={{ textAlign: 'center', padding: '40px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    <h2 style={{ color: '#dc3545', fontWeight: '700' }}>Change Request Not Found</h2>
                    <p style={{ color: '#666', marginTop: '10px' }}>The record associated with this token could not be retrieved from the server.</p>
                    <div style={{ marginTop: '20px', color: '#999', fontSize: '13px' }}>Please verify the link or contact your project administrator.</div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f4f7fa', padding: '30px 20px', fontFamily: 'inherit' }}>
            <ImagePreviewModal />

            {/* Error Notifications */}
            {showError && (
                <div style={{ position: 'fixed', top: '20px', right: '20px', backgroundColor: '#dc3545', color: 'white', padding: '12px 24px', borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 3000, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: '500' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    {statusMessage}
                </div>
            )}

            <div style={{ maxWidth: '1100px', minHeight: '650px', margin: '0 auto', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 10px 40px rgba(0,0,0,0.08)', overflow: 'hidden', border: '1px solid #ddd', display: 'flex', flexDirection: 'column' }}>

                <div style={{ padding: '18px 30px', borderBottom: '1px solid #ddd', backgroundColor: '#f8f9fa' }}>
                    <h3 style={{ margin: 0, color: '#333', fontSize: '15px', fontWeight: '700' }}>
                        Project: {record.Project_Name || 'N/A'}
                    </h3>
                </div>

                <div style={{ padding: '20px 50px', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
                        <h2 style={{ margin: 0, fontSize: '26px', color: '#333', fontWeight: '700' }}>Change Request Form</h2>
                        <button
                            onClick={() => {
                                const url = record.Change_Request_Print_PDF_link;
                                if (url) {
                                    window.open(url, '_blank');
                                }
                            }}
                            style={{
                                backgroundColor: '#e7f1ff',
                                color: '#0061f2',
                                padding: '10px 24px',
                                borderRadius: '4px',
                                border: '1px solid #b3d1ff',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '13px',
                                boxShadow: '0 2px 4px rgba(0,97,242,0.08)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#d0e3ff'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#e7f1ff'; }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                            View Request Document
                        </button>
                    </div>

                    <div style={{ border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden', marginBottom: '40px' }}>
                        <div style={{ display: 'flex', borderBottom: '1px solid #ddd', backgroundColor: '#f4f7fa', fontSize: '11px', fontWeight: 'bold', color: '#666', letterSpacing: '0.5px' }}>
                            <div style={{ width: '170px', padding: '10px 24px', borderRight: '1px solid #ddd' }}>Field</div>
                            <div style={{ flex: 1, padding: '10px 24px', borderRight: '1px solid #ddd' }}>Information</div>
                            <div style={{ width: '350px', padding: '10px 24px' }}>Attached File</div>
                        </div>

                        {/* Description Row */}
                        <div style={{ display: 'flex', borderBottom: '1px solid #ddd', alignItems: 'stretch' }}>
                            <div style={{ width: '170px', padding: '15px 24px', fontWeight: 'bold', fontSize: '13px', color: '#333', borderRight: '1px solid #ddd', background: '#f8f9fa', display: 'flex', alignItems: 'center' }}>
                                Description
                            </div>
                            <div style={{ flex: 1, padding: '15px 24px', fontSize: '13.5px', color: '#333', borderRight: '1px solid #ddd', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {record.Change_Description ? renderDescriptionWithLinks(record.Change_Description, record.Change_Description_screenshot_map).map((part, i) => (
                                    part.type === 'link' ? (
                                        <span key={i} onClick={() => handlePreview(part.url, part.name)} style={{ color: '#0d6efd', textDecoration: 'underline', cursor: 'pointer', fontWeight: '500' }}>{part.name}</span>
                                    ) : part.value
                                )) : 'N/A'}
                            </div>
                            <div style={{ width: '350px', padding: '15px 24px', display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'flex-start', alignItems: 'flex-start' }}>
                                {record.Change_Description_docs_list && record.Change_Description_docs_list.length > 0 ? (
                                    record.Change_Description_docs_list.map((url, idx) => (
                                        <a
                                            key={idx}
                                            href="#"
                                            onClick={(e) => { e.preventDefault(); handlePreview(url, url.split('/').pop()); }}
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#f0f4ff', color: '#0d6efd', padding: '5px 12px', borderRadius: '4px', textDecoration: 'none', fontSize: '13px', fontWeight: '500', border: '1px solid #c7d9ff', maxWidth: '100%' }}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{DOMPurify.sanitize(url.split('/').pop() || '', { ALLOWED_TAGS: [] })}</span>
                                        </a>
                                    ))
                                ) : (
                                    <span style={{ fontSize: '12px', color: '#999 italic' }}>No Files Attached</span>
                                )}
                            </div>
                        </div>

                        {/* Justification Row */}
                        <div style={{ display: 'flex', borderBottom: '1px solid #ddd', alignItems: 'stretch' }}>
                            <div style={{ width: '170px', padding: '15px 24px', fontWeight: 'bold', fontSize: '13px', color: '#333', borderRight: '1px solid #ddd', background: '#f8f9fa', display: 'flex', alignItems: 'center' }}>
                                Business Justification
                            </div>
                            <div style={{ flex: 1, padding: '15px 24px', fontSize: '13.5px', color: '#333', borderRight: '1px solid #ddd', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {record.Change_Business_Justification ? renderDescriptionWithLinks(record.Change_Business_Justification, record.Business_Justification_screenshot_map).map((part, i) => (
                                    part.type === 'link' ? (
                                        <span key={i} onClick={() => handlePreview(part.url, part.name)} style={{ color: '#0d6efd', textDecoration: 'underline', cursor: 'pointer', fontWeight: '500' }}>{part.name}</span>
                                    ) : part.value
                                )) : 'N/A'}
                            </div>
                            <div style={{ width: '350px', padding: '15px 24px', display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'flex-start', alignItems: 'flex-start' }}>
                                {record.Business_Justification_docs_list && record.Business_Justification_docs_list.length > 0 ? (
                                    record.Business_Justification_docs_list.map((url, idx) => (
                                        <a
                                            key={idx}
                                            href="#"
                                            onClick={(e) => { e.preventDefault(); handlePreview(url, url.split('/').pop()); }}
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#f0f4ff', color: '#0d6efd', padding: '5px 12px', borderRadius: '4px', textDecoration: 'none', fontSize: '13px', fontWeight: '500', border: '1px solid #c7d9ff', maxWidth: '100%' }}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{DOMPurify.sanitize(url.split('/').pop() || '', { ALLOWED_TAGS: [] })}</span>
                                        </a>
                                    ))
                                ) : (
                                    <span style={{ fontSize: '12px', color: '#999 italic' }}>No Files Attached</span>
                                )}
                            </div>
                        </div>

                        {/* Solution Row */}
                        <div style={{ display: 'flex', alignItems: 'stretch' }}>
                            <div style={{ width: '170px', padding: '15px 24px', fontWeight: 'bold', fontSize: '13px', color: '#333', borderRight: '1px solid #ddd', background: '#f8f9fa', display: 'flex', alignItems: 'center' }}>
                                Proposed Solution
                            </div>
                            <div style={{ flex: 1, padding: '15px 24px', fontSize: '13.5px', color: '#333', borderRight: '1px solid #ddd', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {record.Change_Proposed_Solution ? renderDescriptionWithLinks(record.Change_Proposed_Solution, record.Proposed_Solution_screenshot_map).map((part, i) => (
                                    part.type === 'link' ? (
                                        <span key={i} onClick={() => handlePreview(part.url, part.name)} style={{ color: '#0d6efd', textDecoration: 'underline', cursor: 'pointer', fontWeight: '500' }}>{part.name}</span>
                                    ) : part.value
                                )) : 'N/A'}
                            </div>
                            <div style={{ width: '350px', padding: '15px 24px', display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'flex-start', alignItems: 'flex-start' }}>
                                {record.Proposed_Solution_docs_list && record.Proposed_Solution_docs_list.length > 0 ? (
                                    record.Proposed_Solution_docs_list.map((url, idx) => (
                                        <a
                                            key={idx}
                                            href="#"
                                            onClick={(e) => { e.preventDefault(); handlePreview(url, url.split('/').pop()); }}
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#f0f4ff', color: '#0d6efd', padding: '5px 12px', borderRadius: '4px', textDecoration: 'none', fontSize: '13px', fontWeight: '500', border: '1px solid #c7d9ff', maxWidth: '100%' }}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{DOMPurify.sanitize(url.split('/').pop() || '', { ALLOWED_TAGS: [] })}</span>
                                        </a>
                                    ))
                                ) : (
                                    <span style={{ fontSize: '12px', color: '#999 italic' }}>No Files Attached</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Section: Approval Tracking */}
                    <div style={{ marginBottom: '40px' }}>
                        <div style={{ padding: '10px 15px', border: '1px solid #dee2e6', borderBottom: 'none', background: '#f8f9fa', fontSize: '12px', fontWeight: 'bold', color: '#333', letterSpacing: '0.5px', borderRadius: '4px 4px 0 0' }}>
                            Change Request Tracking
                        </div>
                        <div style={{ border: '1px solid #ddd', borderRadius: '0 0 4px 4px', overflow: 'hidden' }}>
                            {/* Row 1: Status & Approver */}
                            <div style={{ display: 'flex', borderBottom: '1px solid #ddd' }}>
                                <div style={{ width: '170px', padding: '12px 24px', fontWeight: 'bold', fontSize: '13px', color: '#333', borderRight: '1px solid #ddd', background: '#fcfcfc', display: 'flex', alignItems: 'center' }}>
                                    Approval Status
                                </div>
                                <div style={{ flex: 1, padding: '12px 24px', fontSize: '13.5px', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'center' }}>
                                    <span style={{
                                        backgroundColor: record.Change_Approval_Status === 'Approved' ? '#e8f5e9' : record.Change_Approval_Status === 'Rejected' ? '#ffebee' : '#e3f2fd',
                                        color: record.Change_Approval_Status === 'Approved' ? '#2e7d32' : record.Change_Approval_Status === 'Rejected' ? '#c62828' : '#1565c0',
                                        padding: '4px 12px', borderRadius: '20px', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase'
                                    }}>
                                        {DOMPurify.sanitize(record.Change_Approval_Status || 'Pending', { ALLOWED_TAGS: [] })}
                                    </span>
                                </div>
                                <div style={{ width: '170px', padding: '12px 24px', fontWeight: 'bold', fontSize: '13px', color: '#333', borderRight: '1px solid #ddd', background: '#fcfcfc', display: 'flex', alignItems: 'center' }}>
                                    {record.Change_Approval_Status === 'Rejected' ? 'Rejected By' : 'Approved By'}
                                </div>
                                <div style={{ width: '350px', padding: '12px 24px', fontSize: '13.5px', color: '#333', display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontWeight: '600' }}>
                                        {record.Change_Approval_Status === 'Rejected' ? (DOMPurify.sanitize(record.Change_Rejected_By_Name || 'N/A', { ALLOWED_TAGS: [] })) : (DOMPurify.sanitize(record.Change_Approved_By_Name || 'N/A', { ALLOWED_TAGS: [] }))}
                                    </span>
                                    <span style={{ fontSize: '12px', color: '#666' }}>
                                        {record.Change_Approval_Status === 'Rejected' ? (DOMPurify.sanitize(record.Change_Rejected_By || '', { ALLOWED_TAGS: [] })) : (DOMPurify.sanitize(record.Change_Approved_By || '', { ALLOWED_TAGS: [] }))}
                                    </span>
                                </div>
                            </div>

                            {/* Row 2: Date & Aging */}
                            <div style={{ display: 'flex' }}>
                                <div style={{ width: '170px', padding: '12px 24px', fontWeight: 'bold', fontSize: '13px', color: '#333', borderRight: '1px solid #ddd', background: '#fcfcfc', display: 'flex', alignItems: 'center' }}>
                                    {record.Change_Approval_Status === 'Rejected' ? 'Rejection Date' : 'Approval Date'}
                                </div>
                                <div style={{ flex: 1, padding: '12px 24px', fontSize: '13.5px', color: '#333', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'center' }}>
                                    {(() => {
                                        const dateVal = record.Change_Approval_Status === 'Rejected' 
                                            ? (record.Change_Rejected_Date || record.updated_timestamp) 
                                            : (record.Change_Approval_Date || record.updated_timestamp);
                                        
                                        if (!dateVal) return 'N/A';
                                        const date = new Date(dateVal);
                                        if (isNaN(date.getTime())) return dateVal;
                                        const day = date.getDate().toString().padStart(2, '0');
                                        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
                                        return `${day}-${months[date.getMonth()]}-${date.getFullYear()}`;
                                    })()}
                                </div>
                                <div style={{ width: '170px', padding: '12px 24px', fontWeight: 'bold', fontSize: '13px', color: '#333', borderRight: '1px solid #ddd', background: '#fcfcfc', display: 'flex', alignItems: 'center' }}>
                                    Aging
                                </div>
                                <div style={{ width: '350px', padding: '12px 24px', fontSize: '13.5px', color: '#333', display: 'flex', alignItems: 'center' }}>
                                    {record.Change_Aging ? `${DOMPurify.sanitize(record.Change_Aging || '', { ALLOWED_TAGS: [] })} ${parseInt(record.Change_Aging) === 1 ? 'Day' : 'Days'}` : 'N/A'}
                                </div>
                            </div>

                            {/* Optional: Reason / Rejection Reason Row */}
                            {(record.Change_Approval_Status === 'Rejected' || record.Change_Approval_Status === 'More Information Needed') && (record.Change_Rejected_Reason || record.Change_Rejection_Reason || record.Request_Reason) && (
                                <div style={{ display: 'flex', borderTop: '1px solid #ddd' }}>
                                    <div style={{
                                        width: '170px',
                                        padding: '12px 24px',
                                        fontWeight: 'bold',
                                        fontSize: '13px',
                                        color: record.Change_Approval_Status === 'Rejected' ? '#dc3545' : '#007bff',
                                        borderRight: '1px solid #ddd',
                                        background: record.Change_Approval_Status === 'Rejected' ? '#fff5f5' : '#f0f7ff',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}>
                                        {record.Change_Approval_Status === 'Rejected' ? 'Rejection Reason' : 'Request Reason'}
                                    </div>
                                    <div style={{
                                        flex: 1,
                                        padding: '12px 24px',
                                        fontSize: '13.5px',
                                        color: record.Change_Approval_Status === 'Rejected' ? '#dc3545' : '#333',
                                        lineHeight: '1.6'
                                    }}>
                                        {DOMPurify.sanitize(record.Change_Approval_Status === 'More Information Needed'
                                            ? (record.Request_Reason || record.Change_Rejected_Reason || record.Change_Rejection_Reason)
                                            : (record.Change_Rejected_Reason || record.Change_Rejection_Reason || record.Request_Reason), { ALLOWED_TAGS: [] })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ textAlign: 'center', padding: '10px', color: '#666', fontSize: '13px', borderTop: '1px solid #f0f0f0', fontStyle: 'italic' }}>
                        This is a secure read-only view of the Change Request record.
                    </div>
                </div>

                <div style={{ padding: '15px', textAlign: 'center', borderTop: '1px solid #ddd', backgroundColor: '#f8f9fa' }}>
                    <p style={{ margin: 0, color: '#999', fontSize: '11px' }}>
                        &copy; {new Date().getFullYear()} Cloude Motiv. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PublicChangeRequestReadOnlyView;
