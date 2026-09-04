import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { useSession } from '../../../context/SessionContext';
import { HelpCircle, X } from 'lucide-react';
import { getIdToken } from '../../../utils/cognito-auth';

const RiskAndIssueSpecificationViewForm = ({ selectedProject, onBackToLanding }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { logout } = useSession();
    const [formData, setFormData] = useState(null);

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
    const [loading, setLoading] = useState(true);
    const [documentLinks, setDocumentLinks] = useState([]);
    const [descriptionLinkMap, setDescriptionLinkMap] = useState({});
    const [closureEvidenceLinks, setClosureEvidenceLinks] = useState([]);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [previewContent, setPreviewContent] = useState({ url: '', name: '' });

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

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            try {
                setLoading(true);
                const token = await getIdToken();
                if (!token) {
                    handleAuthError();
                    return;
                }

                const projectId = localStorage.getItem('project_id') || selectedProject?.id || '101';
                const headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                };

                const response = await fetch(
                    `https://mt6ywydebk.execute-api.ap-south-1.amazonaws.com/New/ricew/risk-and-issue-form/get-by-id?id=${id}&project_id=${projectId}`,
                    { headers }
                );

                if (response.status === 401 || response.status === 403) {
                    handleAuthError();
                    return;
                }

                const result = await response.json();
                if (result.success && result.data) {
                    const data = result.data;
                    const sanitizedData = {
                        ...data,
                        RiskAndIssueDisplayId: DOMPurify.sanitize(data.RiskAndIssueDisplayId || '', { ALLOWED_TAGS: [] }),
                        RiskAndIssueFormId: DOMPurify.sanitize(data.RiskAndIssueFormId || '', { ALLOWED_TAGS: [] }),
                        record_type: DOMPurify.sanitize(data.record_type || '', { ALLOWED_TAGS: [] }),
                        country_bu_legal_entity: DOMPurify.sanitize(data.country_bu_legal_entity || '', { ALLOWED_TAGS: [] }),
                        riskIssue_stream: DOMPurify.sanitize(data.riskIssue_stream || '', { ALLOWED_TAGS: [] }),
                        stream: DOMPurify.sanitize(data.stream || '', { ALLOWED_TAGS: [] }),
                        application: DOMPurify.sanitize(data.application || '', { ALLOWED_TAGS: [] }),
                        riskIssue_module: DOMPurify.sanitize(data.riskIssue_module || '', { ALLOWED_TAGS: [] }),
                        module: DOMPurify.sanitize(data.module || '', { ALLOWED_TAGS: [] }),
                        project_phase: DOMPurify.sanitize(data.project_phase || '', { ALLOWED_TAGS: [] }),
                        title: DOMPurify.sanitize(data.title || '', { ALLOWED_TAGS: [] }),
                        detailed_description: DOMPurify.sanitize(data.detailed_description || '', { ALLOWED_TAGS: [] }),
                        riskIssue_category: DOMPurify.sanitize(data.riskIssue_category || '', { ALLOWED_TAGS: [] }),
                        category: DOMPurify.sanitize(data.category || '', { ALLOWED_TAGS: [] }),
                        sub_category: DOMPurify.sanitize(data.sub_category || '', { ALLOWED_TAGS: [] }),
                        ricew_id: DOMPurify.sanitize(data.ricew_id || '', { ALLOWED_TAGS: [] }),
                        riskIssue_name: DOMPurify.sanitize(data.riskIssue_name || '', { ALLOWED_TAGS: [] }),
                        ricew_name: DOMPurify.sanitize(data.ricew_name || '', { ALLOWED_TAGS: [] }),
                        ricew_status: DOMPurify.sanitize(data.ricew_status || '', { ALLOWED_TAGS: [] }),
                        raised_by: DOMPurify.sanitize(data.raised_by || '', { ALLOWED_TAGS: [] }),
                        assigned_to: DOMPurify.sanitize(data.assigned_to || '', { ALLOWED_TAGS: [] }),
                        owner_type: DOMPurify.sanitize(data.owner_type || '', { ALLOWED_TAGS: [] }),
                        riskIssue_owner_type: DOMPurify.sanitize(data.riskIssue_owner_type || '', { ALLOWED_TAGS: [] }),
                        riskIssue_owner: DOMPurify.sanitize(data.riskIssue_owner || '', { ALLOWED_TAGS: [] }),
                        owner: DOMPurify.sanitize(data.owner || '', { ALLOWED_TAGS: [] }),
                        business_owner: DOMPurify.sanitize(data.business_owner || '', { ALLOWED_TAGS: [] }),
                        severity: DOMPurify.sanitize(data.severity || '', { ALLOWED_TAGS: [] }),
                        go_live_impact: DOMPurify.sanitize(data.go_live_impact || '', { ALLOWED_TAGS: [] }),
                        riskIssue_environment: DOMPurify.sanitize(data.riskIssue_environment || '', { ALLOWED_TAGS: [] }),
                        environment: DOMPurify.sanitize(data.environment || '', { ALLOWED_TAGS: [] }),
                        deployment_wave: DOMPurify.sanitize(data.deployment_wave || '', { ALLOWED_TAGS: [] }),
                        riskIssue_status: DOMPurify.sanitize(data.riskIssue_status || '', { ALLOWED_TAGS: [] }),
                        status: DOMPurify.sanitize(data.status || '', { ALLOWED_TAGS: [] }),
                        escalation_required: DOMPurify.sanitize(data.escalation_required || '', { ALLOWED_TAGS: [] }),
                        closure_approved_by: DOMPurify.sanitize(data.closure_approved_by || '', { ALLOWED_TAGS: [] }),
                        aging: DOMPurify.sanitize(data.aging || '', { ALLOWED_TAGS: [] })
                    };
                    setFormData(sanitizedData);

                    // Parse document links
                    let docLinks = data.riskIssue_documnet_links;
                    let finalUrls = [];
                    if (docLinks) {
                        if (docLinks.L && Array.isArray(docLinks.L)) {
                            finalUrls = docLinks.L.map(item => item.S).filter(Boolean);
                        } else if (Array.isArray(docLinks)) {
                            finalUrls = docLinks.filter(url => typeof url === 'string');
                        }
                    }
                    setDocumentLinks(finalUrls.map(url => ({ name: DOMPurify.sanitize(url.split('/').pop() || 'Document', { ALLOWED_TAGS: [] }), url })));

                    // Parse description link map
                    let linkMapRaw = data.detailed_description_documnet_link_map;
                    if (linkMapRaw && linkMapRaw.M) {
                        const cleanMap = {};
                        Object.entries(linkMapRaw.M).forEach(([key, val]) => { cleanMap[key] = val.S; });
                        setDescriptionLinkMap(cleanMap);
                    } else if (linkMapRaw && typeof linkMapRaw === 'object' && !linkMapRaw.M) {
                        setDescriptionLinkMap(linkMapRaw);
                    }

                    // Parse closure evidence
                    let closureEv = data.closure_evidence;
                    let evidenceLinks = [];
                    if (closureEv) {
                        if (closureEv.M) {
                            evidenceLinks = Object.entries(closureEv.M).map(([name, val]) => ({ name: DOMPurify.sanitize(name || '', { ALLOWED_TAGS: [] }), url: val.S }));
                        } else if (typeof closureEv === 'object' && !closureEv.M) {
                            evidenceLinks = Object.entries(closureEv).map(([name, url]) => ({ name: DOMPurify.sanitize(name || '', { ALLOWED_TAGS: [] }), url }));
                        } else if (typeof closureEv === 'string' && closureEv.startsWith('http')) {
                            evidenceLinks = [{ name: DOMPurify.sanitize(closureEv.split('/').pop() || '', { ALLOWED_TAGS: [] }), url: closureEv }];
                        }
                    }
                    setClosureEvidenceLinks(evidenceLinks);
                }
            } catch (error) {
                console.error('Error fetching risk and issue data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, selectedProject, handleAuthError]);

    const getFileViewUrl = (url, fileName) => {
        if (!url || url === '-' || !url.startsWith('http')) return url;
        const extension = (fileName || url.split('?')[0]).split('.').pop().toLowerCase();
        if (['xlsx', 'xls', 'csv', 'docx', 'doc'].includes(extension)) {
            return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`;
        }
        return url;
    };

    const handlePreview = (url, name) => {
        const extension = (name || url.split('?')[0]).split('.').pop().toLowerCase();
        if (['xlsx', 'xls', 'csv', 'docx', 'doc', 'pdf'].includes(extension)) {
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
        while ((match = regex.exec(text)) !== null) {
            if (match.index > lastIndex) parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
            const bracketKey = match[0];
            const url = linkMap[bracketKey];
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

    const handleBack = () => {
        navigate('/dashboard/risk-and-issue-specification-assignment-form');
    };

    const labelStyle = {
        fontSize: '13px',
        fontWeight: '600',
        color: '#555',
        marginBottom: '4px',
        display: 'block'
    };

    const inputStyle = {
        width: '100%',
        padding: '8px 12px',
        fontSize: '13px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        backgroundColor: '#f9f9f9',
        color: '#333',
        boxSizing: 'border-box'
    };

    const renderReadOnlyField = (label, value, extraStyle = {}) => (
        <div style={{ flex: 1, minWidth: '200px', ...extraStyle }}>
            <span style={labelStyle}>{label}</span>
            <div style={inputStyle}>{value || '-'}</div>
        </div>
    );

    const renderSection = (title, children) => (
        <div style={{ border: '1px solid #ddd', borderRadius: '4px', marginBottom: '20px' }}>
            <div style={{
                backgroundColor: '#f8f9fa',
                padding: '10px 16px',
                borderBottom: '1px solid #ddd',
                fontSize: '14px',
                fontWeight: '600',
                color: '#333'
            }}>
                {title}
            </div>
            <div style={{ padding: '16px' }}>
                {children}
            </div>
        </div>
    );

    const ImagePreviewModal = () => {
        if (!isPreviewModalOpen) return null;
        return (
            <div
                style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
                onClick={() => setIsPreviewModalOpen(false)}
            >
                <div
                    style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%', backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 5px 30px rgba(0,0,0,0.3)' }}
                    onClick={e => e.stopPropagation()}
                >
                    <div style={{ padding: '12px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8f9fa' }}>
                        <span style={{ fontWeight: '600', color: '#333', fontSize: '14px' }}>{previewContent.name || 'Image Preview'}</span>
                        <button
                            onClick={() => setIsPreviewModalOpen(false)}
                            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px', color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#e9ecef'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: '#f0f2f5', display: 'flex', justifyContent: 'center' }}>
                        <img
                            src={previewContent.url}
                            alt={previewContent.name}
                            style={{ maxWidth: '100%', maxHeight: 'calc(90vh - 60px)', objectFit: 'contain', display: 'block', borderRadius: '4px' }}
                        />
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', flexDirection: 'column', gap: '20px' }}>
                <div style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #3498db', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 2s linear infinite' }}></div>
                <p style={{ color: '#666', fontSize: '14px' }}>Loading record details...</p>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (!formData) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', flexDirection: 'column', gap: '20px' }}>
                <p style={{ color: '#666', fontSize: '14px' }}>Record not found.</p>
                <button onClick={handleBack} style={{ padding: '8px 20px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>Go Back</button>
            </div>
        );
    }

    return (
        <div className="config-main" style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '0', margin: '0' }}>
            <div style={{ padding: '1rem 1rem 2rem 1rem', width: '100%', minWidth: '1320px', margin: '0', boxSizing: 'border-box' }}>
                <div style={{ backgroundColor: 'white', padding: '0', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    {/* Project Info Header */}
                    <div style={{ padding: '2rem 1rem 1rem 2rem' }}>
                        <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project : <span style={{ color: '#007bff' }}> {localStorage.getItem('project_name') || selectedProject?.name}</span></h3>
                    </div>

                    {/* Page Title */}
                    <div className="config-header" style={{ marginTop: '0', marginRight: '0px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 2rem' }}>
                        <h2 style={{ margin: 0 }}>Risk And Issue - View Details</h2>
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
                                                    <p style={{ margin: '6px 0 0 0', color: '#555' }}>This page provides a read-only view of the detailed specifications for a Risk and Issue.</p>
                                                </div>
                                                <div style={{ marginBottom: '16px' }}>
                                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to use</strong>
                                                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                                        <li>Review the risk/issue details, category, and Oracle-specific traceability.</li>
                                                        <li>Click on any document links to preview or download associated files.</li>
                                                        <li>Use the <strong>Back</strong> button to return to the previous page.</li>
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
                        {/* IDENTIFICATION */}
                        {renderSection('Identification', (
                            <>
                                <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                                    {renderReadOnlyField('Record ID', formData.RiskAndIssueDisplayId || formData.RiskAndIssueFormId)}
                                    {renderReadOnlyField('Record Type', formData.record_type)}
                                    {renderReadOnlyField('Country / BU / Legal Entity', formData.country_bu_legal_entity)}
                                </div>
                                <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                                    {renderReadOnlyField('Stream', formData.riskIssue_stream || formData.stream)}
                                    {renderReadOnlyField('Application', formData.application)}
                                    {renderReadOnlyField('Module', formData.riskIssue_module || formData.module)}
                                </div>
                                <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                                    {renderReadOnlyField('Project Phase', formData.project_phase)}
                                    {renderReadOnlyField('Title', formData.title, { flex: 2 })}
                                </div>
                                <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                                    <div style={{ flex: 1 }}>
                                        <span style={labelStyle}>Detailed Description</span>
                                        <div style={{ ...inputStyle, minHeight: '80px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: '1.6' }}>
                                            {Object.keys(descriptionLinkMap).length > 0
                                                ? renderDescriptionWithLinks(formData.detailed_description, descriptionLinkMap).map((part, i) =>
                                                    part.type === 'link' ? (
                                                        <a
                                                            key={i}
                                                            href="#"
                                                            onClick={(e) => { e.preventDefault(); handlePreview(part.url, part.name); }}
                                                            style={{ color: '#1976d2', textDecoration: 'underline', cursor: 'pointer', fontWeight: '500' }}
                                                        >
                                                            {part.key}
                                                        </a>
                                                    ) : (
                                                        <span key={i}>{part.value}</span>
                                                    )
                                                )
                                                : (formData.detailed_description || '-')
                                            }
                                        </div>
                                    </div>
                                </div>
                                {documentLinks.length > 0 && (
                                    <div style={{ marginBottom: '12px' }}>
                                        <span style={labelStyle}>Documents</span>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                            {documentLinks.map((doc, idx) => (
                                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', backgroundColor: '#f0f4ff', border: '1px solid #c7d9ff', borderRadius: '4px', fontSize: '12px', color: '#333' }}>
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0d6efd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                                                    <a
                                                        href="#"
                                                        onClick={(e) => { e.preventDefault(); handlePreview(doc.url, doc.name); }}
                                                        style={{ color: '#0d6efd', textDecoration: 'none', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '500' }}
                                                        onMouseEnter={e => e.target.style.textDecoration = 'underline'}
                                                        onMouseLeave={e => e.target.style.textDecoration = 'none'}
                                                    >
                                                        {doc.name}
                                                    </a>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: '16px' }}>
                                    {renderReadOnlyField('Category', formData.riskIssue_category || formData.category)}
                                    {renderReadOnlyField('Sub-category', formData.sub_category)}
                                    <div style={{ flex: 1 }}></div>
                                </div>
                            </>
                        ))}

                        {/* ORACLE-SPECIFIC TRACEABILITY */}
                        {renderSection('Oracle-Specific Traceability', (
                            <div style={{ display: 'flex', gap: '16px' }}>
                                {renderReadOnlyField('RICEW ID', formData.ricew_id)}
                                {renderReadOnlyField('RICEW Name', formData.riskIssue_name || formData.ricew_name)}
                                {renderReadOnlyField('RICEW Status', formData.ricew_status)}
                            </div>
                        ))}

                        {/* SOURCE & OWNERSHIP */}
                        {renderSection('Source & Ownership', (
                            <>
                                <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                                    {renderReadOnlyField('Date Raised', formData.date_raised)}
                                    {renderReadOnlyField('Raised By', formData.raised_by)}
                                    {renderReadOnlyField('Assigned To', formData.assigned_to)}
                                </div>
                                <div style={{ display: 'flex', gap: '16px' }}>
                                    {renderReadOnlyField('Select Owner (Risk / Issue)', formData.owner_type || formData.riskIssue_owner_type)}
                                    {renderReadOnlyField('Owner (Risk/Issue)', formData.riskIssue_owner || formData.owner)}
                                    {renderReadOnlyField('Business Owner (Client)', formData.business_owner)}
                                </div>
                            </>
                        ))}

                        {/* ASSESSMENT */}
                        {renderSection('Assessment', (
                            <>
                                <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                                    {renderReadOnlyField('Severity', formData.severity)}
                                    {renderReadOnlyField('Go-Live Impact', formData.go_live_impact)}
                                    <div style={{ flex: 1 }}></div>
                                </div>
                                <div style={{ display: 'flex', gap: '16px' }}>
                                    {renderReadOnlyField('Environment', formData.riskIssue_environment || formData.environment)}
                                    {renderReadOnlyField('Wave / Rollout', formData.deployment_wave)}
                                    <div style={{ flex: 1 }}></div>
                                </div>
                            </>
                        ))}

                        {/* TRACKING & GOVERNANCE */}
                        {renderSection('Tracking & Governance', (
                            <>
                                <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                                    {renderReadOnlyField('Status', formData.riskIssue_status || formData.status)}
                                    {renderReadOnlyField('Escalation Required', formData.escalation_required)}
                                    {renderReadOnlyField('Target Resolution Date', formData.target_resolution_date)}
                                </div>
                                <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                                    <div style={{ flex: 1, minWidth: '200px' }}>
                                        <span style={labelStyle}>Closure Evidence</span>
                                        <div style={{ ...inputStyle, display: 'flex', flexDirection: 'column', gap: '6px', minHeight: '36px', justifyContent: 'center' }}>
                                            {closureEvidenceLinks.length > 0 ? (
                                                closureEvidenceLinks.map((link, lIdx) => (
                                                    <div key={lIdx} style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#fff', border: '1px solid #e2e8f0', padding: '4px 8px', borderRadius: '4px' }}>
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                                            <polyline points="14 2 14 8 20 8"></polyline>
                                                            <line x1="16" y1="13" x2="8" y2="13"></line>
                                                            <line x1="16" y1="17" x2="8" y2="17"></line>
                                                            <polyline points="10 9 9 9 8 9"></polyline>
                                                        </svg>
                                                        <a
                                                            href="#"
                                                            onClick={(e) => { e.preventDefault(); handlePreview(link.url, link.name); }}
                                                            style={{ color: '#0ea5e9', textDecoration: 'none', fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', display: 'block' }}
                                                            onMouseEnter={e => e.target.style.textDecoration = 'underline'}
                                                            onMouseLeave={e => e.target.style.textDecoration = 'none'}
                                                            title={link.name}
                                                        >
                                                            {link.name}
                                                        </a>
                                                    </div>
                                                ))
                                            ) : (
                                                <span style={{ color: '#888', fontSize: '13px' }}>No evidence</span>
                                            )}
                                        </div>
                                    </div>
                                    {renderReadOnlyField('Closure Approved By', formData.closure_approved_by)}
                                    {renderReadOnlyField('Closure Date', formData.closure_date)}
                                </div>
                                <div style={{ display: 'flex', gap: '16px' }}>
                                    {renderReadOnlyField('Aging', formData.aging)}
                                    <div style={{ flex: 1 }}></div>
                                    <div style={{ flex: 1 }}></div>
                                </div>
                            </>
                        ))}
                    </div>
                </div>
                <style>{`
                    .help-modal-scroll::-webkit-scrollbar { width: 4px; }
                    .help-modal-scroll::-webkit-scrollbar-track { background: transparent; margin: 8px 0; }
                    .help-modal-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                    .help-modal-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                `}</style>
            </div>
            <ImagePreviewModal />
        </div>
    );
};

export default RiskAndIssueSpecificationViewForm;
