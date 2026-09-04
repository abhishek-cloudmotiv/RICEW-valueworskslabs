import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { useSession } from '../../../context/SessionContext';
import { getIdToken } from '../../../utils/cognito-auth';
import { CustomDatePicker } from '../../Resource Roster Form/Components';
import { ricewApiClient } from './RiskAndIssueClient';
import { getCurrentDateFormatted } from '../../../utils/date-utils';
import {
    RecordTypeAutocomplete, WorkstreamAutocomplete, ApplicationAutocomplete,
    ModuleAutocomplete, ProjectPhaseAutocomplete, CategoryAutocomplete, SubCategoryAutocomplete,
    RicewIdAutocomplete, SeverityAutocomplete, GoLiveImpactAutocomplete,
    EnvironmentAutocomplete, RiskIssueStatusAutocomplete, EscalationRequiredAutocomplete,
    GenericUserAutocomplete, WaveRolloutAutocomplete, OwnerTypeAutocomplete
} from './RiskAndIssueAutocompleteComponents';

import {
    useCascadingLOV, useRicewLOV, useProjectPhaseLOV, useCategorySubcategoryLOV,
    useSeverityLOV, useEnvironmentLOV, useWaveRolloutLOV, useRiskIssueStatusLOV,
    useRosterLOV
} from './RiskAndIssueHooks';
import { HelpCircle, X } from 'lucide-react';
import {
    cellStyle, rowStyle, getLabelStyle, inputStyle, SectionHeader
} from './RiskAndIssueStyles';

const formatDateForDisplay = (dateString) => {
    if (!dateString || dateString === 'Pending' || dateString === '-') return dateString;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const day = date.getDate().toString().padStart(2, '0');
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
};

// Converts any date string to YYYY-MM-DD format for <input type="date">
const formatDateForInput = (dateString) => {
    if (!dateString || dateString === 'Pending' || dateString === '-') return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};




const RiskAndIssueForm = ({ onClose, onBackToLanding, onLogout, selectedProject }) => {
    const navigate = useNavigate();
    const { id: editId } = useParams();
    const projectId = localStorage.getItem('project_id') || selectedProject?.id || '';
    const { logout } = useSession();

    const handleAuthError = useCallback(() => {
        localStorage.removeItem('id_token');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('expires_in');
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_name');
        localStorage.removeItem('user_email');
        onLogout?.();
    }, [logout]);

    const fileInputRef = useRef(null);

    // UI State
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadedDocuments, setUploadedDocuments] = useState([]);
    const [isDescriptionEditing, setIsDescriptionEditing] = useState(false);
    const [isDataLoading, setIsDataLoading] = useState(!!editId);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [showErrorMessage, setShowErrorMessage] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Preview Modal State
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [previewContent, setPreviewContent] = useState({ url: '', name: '' });
    const [isClearModalOpen, setIsClearModalOpen] = useState(false);
    const [showHelpPopup, setShowHelpPopup] = useState(false);

    // Fetching LOV Data
    const { streamOptions, getApplicationOptions, getModuleOptions, loading: cascadingLoading } = useCascadingLOV();
    const { ricewOptions, ricewData } = useRicewLOV(projectId);
    const { options: projectPhaseOptions } = useProjectPhaseLOV(projectId);
    const { categoryOptions, getSubcategoryOptions } = useCategorySubcategoryLOV();
    const { options: severityOptions } = useSeverityLOV();
    const { options: environmentOptions } = useEnvironmentLOV(projectId);
    const { options: waveRolloutOptions } = useWaveRolloutLOV(projectId);
    const { options: riskIssueStatusOptions } = useRiskIssueStatusLOV(projectId);
    const { getRosterOptions, rosterData } = useRosterLOV(projectId);

    const [form, setForm] = useState({
        recordId: '',
        displayId: '',
        recordType: '',
        stream: '',
        application: '',
        module: [],
        countryBuLegalEntity: '',
        projectPhase: '',
        title: '',
        detailedDescription: '',
        category: '',
        subCategory: '',
        ricewId: '',
        ricewName: '',
        ricewStatus: '',
        dateRaised: getCurrentDateFormatted(),
        raisedBy: localStorage.getItem('user_name') || 'Current User',
        ownerType: '',
        owner: '',
        assignedTo: '',
        businessOwner: '',
        severity: '',
        goLiveImpact: '',
        environment: '',
        deploymentWave: '',
        status: 'New',
        escalationRequired: '',
        targetResolutionDate: '',
        closureEvidence: null,
        closureApprovedBy: '',
        closureDate: '',
        aging: '0',
    });

    const getFileViewUrl = (url, fileName) => {
        if (!url || url === '-' || !url.startsWith('http')) return url;
        const extension = (fileName || url.split('?')[0]).split('.').pop().toLowerCase();
        if (['xlsx', 'xls', 'csv', 'docx', 'doc'].includes(extension)) {
            // Microsoft Office Viewer handles both Excel and Word files
            return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`;
        }
        return url;
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

    const handlePreview = (url, name) => {
        const extension = (name || url.split('?')[0]).split('.').pop().toLowerCase();
        if (['xlsx', 'xls', 'csv', 'docx', 'doc', 'pdf'].includes(extension)) {
            // Document files still open in new tab (via Office Viewer)
            window.open(getFileViewUrl(url, name), '_blank');
        } else {
            // Images open in the popup
            setPreviewContent({ url, name });
            setIsPreviewModalOpen(true);
        }
    };

    const ImagePreviewModal = () => {
        if (!isPreviewModalOpen) return null;
        return (
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    animation: 'fadeIn 0.2s ease'
                }}
                onClick={() => setIsPreviewModalOpen(false)}
            >
                <div
                    style={{
                        position: 'relative',
                        maxWidth: '90%',
                        maxHeight: '90%',
                        backgroundColor: '#fff',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        boxShadow: '0 5px 30px rgba(0,0,0,0.3)',
                        animation: 'scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div style={{
                        padding: '12px 20px',
                        borderBottom: '1px solid #eee',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: '#f8f9fa'
                    }}>
                        <span style={{ fontWeight: '600', color: '#333', fontSize: '14px' }}>
                            {previewContent.name || 'Image Preview'}
                        </span>
                        <button
                            onClick={() => setIsPreviewModalOpen(false)}
                            style={{
                                border: 'none',
                                background: 'none',
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '50%',
                                transition: 'background 0.2s',
                                color: '#666'
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#e9ecef'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>

                    {/* Content */}
                    <div style={{ padding: '10px', backgroundColor: '#f0f2f5', display: 'flex', justifyContent: 'center' }}>
                        <img
                            src={previewContent.url}
                            alt={previewContent.name}
                            style={{
                                maxWidth: '100%',
                                maxHeight: 'calc(90vh - 60px)',
                                objectFit: 'contain',
                                display: 'block',
                                borderRadius: '4px'
                            }}
                        />
                    </div>
                </div>
                <style>
                    {`
                    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                    @keyframes scaleUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                    `}
                </style>
            </div>
        );
    };

    const ClearConfirmationModal = () => {
        if (!isClearModalOpen) return null;
        return (
            <div style={{
                position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', zIndex: 10005, animation: 'fadeIn 0.2s ease'
            }} onClick={() => setIsClearModalOpen(false)}>
                <div style={{
                    width: '480px', backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '6px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.18)', overflow: 'hidden',
                    animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }} onClick={e => e.stopPropagation()}>
                    {/* Modal Header — matches page brand color #4D5C74 */}
                    <div style={{
                        padding: '12px 16px', borderBottom: '1px solid #3d4a5c',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: '#4D5C74'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#fff', letterSpacing: '0.5px' }}>Clear Confirmation</h3>
                        </div>
                        <button
                            onClick={() => setIsClearModalOpen(false)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.75)', lineHeight: 1, padding: '2px 4px', fontSize: '18px', display: 'flex', alignItems: 'center' }}
                            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.75)'}
                            title="Close"
                        >&#x2715;</button>
                    </div>
                    {/* Modal Body */}
                    <div style={{ padding: '28px 24px 20px', color: '#333', fontSize: '14px', lineHeight: '1.7', textAlign: 'center', background: '#fff' }}>
                        <div style={{ marginBottom: '8px', color: '#555' }}>Are you sure you want to clear all the data?</div>
                        <div style={{ fontWeight: '600', color: '#333' }}>This action cannot be undone.</div>
                    </div>
                    {/* Modal Footer — matches section footer style */}
                    <div style={{
                        padding: '14px 24px', borderTop: '1px solid #dee2e6', display: 'flex',
                        justifyContent: 'center', gap: '10px', background: '#f8f9fa'
                    }}>
                        <button
                            onClick={() => {
                                executeClear();
                                setIsClearModalOpen(false);
                            }}
                            style={{
                                padding: '7px 18px', backgroundColor: '#dc3545', color: 'white',
                                border: 'none', borderRadius: '4px', cursor: 'pointer',
                                fontWeight: '600', fontSize: '13px', transition: 'background-color 0.2s',
                                display: 'flex', alignItems: 'center', gap: '7px'
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#c82333'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#dc3545'}
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                            Yes, Clear
                        </button>
                        <button
                            onClick={() => setIsClearModalOpen(false)}
                            style={{
                                padding: '7px 18px', backgroundColor: '#6c757d', color: 'white',
                                border: 'none', borderRadius: '4px', cursor: 'pointer',
                                fontWeight: '600', fontSize: '13px', transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#5a6268'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#6c757d'}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const fetchRecordData = useCallback(async () => {
        if (!editId || !projectId) return;

        try {
            setIsDataLoading(true);
            const token = await getIdToken();
            if (!token) {
                handleAuthError();
                return;
            }

            const response = await fetch(`https://mt6ywydebk.execute-api.ap-south-1.amazonaws.com/New/ricew/risk-and-issue-form/get-by-id?id=${editId}&project_id=${projectId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 401 || response.status === 403) {
                handleAuthError();
                return;
            }

            const result = await response.json();
            if (result.success && result.data) {
                const data = result.data;
                const rType = DOMPurify.sanitize(data.record_type || '', { ALLOWED_TAGS: [] });
                setForm({
                    recordId: DOMPurify.sanitize(data.RiskAndIssueFormId || '', { ALLOWED_TAGS: [] }),
                    displayId: DOMPurify.sanitize(data.RiskAndIssueDisplayId || '', { ALLOWED_TAGS: [] }),
                    recordType: rType,
                    stream: DOMPurify.sanitize(data.riskIssue_stream || data.stream || '', { ALLOWED_TAGS: [] }),
                    application: DOMPurify.sanitize(data.application || '', { ALLOWED_TAGS: [] }),
                    module: (data.riskIssue_module ? data.riskIssue_module.split(',').map(m => DOMPurify.sanitize(m.trim(), { ALLOWED_TAGS: [] })) : (data.module ? data.module.split(',').map(m => DOMPurify.sanitize(m.trim(), { ALLOWED_TAGS: [] })) : [])),
                    countryBuLegalEntity: DOMPurify.sanitize(data.country_bu_legal_entity || '', { ALLOWED_TAGS: [] }),
                    projectPhase: DOMPurify.sanitize(data.project_phase || '', { ALLOWED_TAGS: [] }),
                    title: DOMPurify.sanitize(data.title || '', { ALLOWED_TAGS: [] }),
                    detailedDescription: DOMPurify.sanitize(data.detailed_description || '', { ALLOWED_TAGS: [] }),
                    category: DOMPurify.sanitize(data.riskIssue_category || data.category || '', { ALLOWED_TAGS: [] }),
                    subCategory: DOMPurify.sanitize(data.sub_category || '', { ALLOWED_TAGS: [] }),
                    ricewId: DOMPurify.sanitize(data.ricew_id || '', { ALLOWED_TAGS: [] }),
                    ricewName: DOMPurify.sanitize(data.riskIssue_name || data.ricew_name || '', { ALLOWED_TAGS: [] }),
                    ricewStatus: DOMPurify.sanitize(data.ricew_status || '', { ALLOWED_TAGS: [] }),
                    dateRaised: data.date_raised || '',
                    raisedBy: String(data.raised_by) === String(localStorage.getItem('user_id')) ? localStorage.getItem('user_name') : DOMPurify.sanitize(data.raised_by || '', { ALLOWED_TAGS: [] }),
                    ownerType: DOMPurify.sanitize(data.owner_type || data.riskIssue_owner_type || '', { ALLOWED_TAGS: [] }),
                    owner: DOMPurify.sanitize(data.riskIssue_owner || data.owner || '', { ALLOWED_TAGS: [] }),
                    assignedTo: DOMPurify.sanitize(data.assigned_to || '', { ALLOWED_TAGS: [] }),
                    businessOwner: DOMPurify.sanitize(data.business_owner || '', { ALLOWED_TAGS: [] }),
                    severity: DOMPurify.sanitize(data.severity || '', { ALLOWED_TAGS: [] }),
                    goLiveImpact: DOMPurify.sanitize(data.go_live_impact || '', { ALLOWED_TAGS: [] }),
                    environment: DOMPurify.sanitize(data.riskIssue_environment || data.environment || '', { ALLOWED_TAGS: [] }),
                    deploymentWave: DOMPurify.sanitize(data.deployment_wave || '', { ALLOWED_TAGS: [] }),
                    status: DOMPurify.sanitize(data.riskIssue_status || data.status || '', { ALLOWED_TAGS: [] }),
                    escalationRequired: DOMPurify.sanitize(data.escalation_required || '', { ALLOWED_TAGS: [] }),
                    targetResolutionDate: formatDateForInput(data.target_resolution_date || ''),
                    closureEvidence: null,
                    closureApprovedBy: DOMPurify.sanitize(data.closure_approved_by || '', { ALLOWED_TAGS: [] }),
                    closureDate: DOMPurify.sanitize(data.closure_date || '', { ALLOWED_TAGS: [] }),
                    aging: DOMPurify.sanitize(data.aging || '0', { ALLOWED_TAGS: [] }),
                });

                // NEW: Load existing documents into state (Handling raw DynamoDB L structure)
                let docLinks = data.riskIssue_documnet_links;
                let finalUrls = [];

                if (docLinks) {
                    if (docLinks.L && Array.isArray(docLinks.L)) {
                        // Extract S values from DynamoDB List
                        finalUrls = docLinks.L.map(item => item.S).filter(Boolean);
                    } else if (Array.isArray(docLinks)) {
                        // Already a standard array
                        finalUrls = docLinks.filter(url => typeof url === 'string');
                    }
                }

                if (finalUrls.length > 0) {
                    setUploadedDocuments(finalUrls.map(url => ({
                        name: url.split('/').pop() || 'Document',
                        url: url,
                        size: 0
                    })));
                }

                // Parse Closure Evidence Map
                let closureEv = data.closure_evidence;
                let evidenceLinks = [];
                if (closureEv) {
                    if (closureEv.M) {
                        evidenceLinks = Object.entries(closureEv.M).map(([name, val]) => ({ name, url: val.S }));
                    } else if (typeof closureEv === 'object') {
                        evidenceLinks = Object.entries(closureEv).map(([name, url]) => ({ name, url }));
                    } else if (typeof closureEv === 'string' && closureEv.startsWith('http')) {
                        evidenceLinks = [{ name: closureEv.split('/').pop(), url: closureEv }];
                    }
                }

                if (evidenceLinks.length > 0) {
                    setForm(prev => ({ ...prev, closureEvidence: evidenceLinks }));
                }

                // NEW: Load link map for description screenshots
                let linkMapRaw = data.detailed_description_documnet_link_map;
                if (linkMapRaw && linkMapRaw.M) {
                    // Extract values from DynamoDB Map
                    const cleanMap = {};
                    Object.entries(linkMapRaw.M).forEach(([key, val]) => {
                        cleanMap[key] = val.S;
                    });
                    setDescriptionLinkMap(cleanMap);
                } else if (linkMapRaw && typeof linkMapRaw === 'object' && !linkMapRaw.M) {
                    // Already standard object
                    setDescriptionLinkMap(linkMapRaw);
                } else {
                    setDescriptionLinkMap({});
                }
            }
        } catch (error) {
            console.error('Error fetching record data:', error);
            setErrorMessage('Failed to load record details.');
            setShowErrorMessage(true);
        } finally {
            setIsDataLoading(false);
        }
    }, [editId, projectId, handleAuthError]);

    // EFFECT: Load Record Data for Edit Mode
    useEffect(() => {

        if (editId) {
            // Check cache/localStorage first
            const storedData = localStorage.getItem('riskIssueFormData');
            if (storedData) {
                try {
                    const item = JSON.parse(storedData);
                    if (item.RiskAndIssueFormId === editId || item.id === editId) {
                        const rType = item.record_type || '';
                        setForm(prev => ({
                            ...prev,
                            // ... (rest of form setup remains)
                            recordId: item.RiskAndIssueFormId || '',
                            displayId: item.RiskAndIssueDisplayId || '',
                            recordType: rType,
                            stream: item.riskIssue_stream || item.stream || '',
                            application: item.application || '',
                            module: item.riskIssue_module ? item.riskIssue_module.split(',').map(m => m.trim()) : (item.module ? item.module.split(',').map(m => m.trim()) : []),
                            countryBuLegalEntity: item.country_bu_legal_entity || '',
                            projectPhase: item.project_phase || '',
                            title: item.title || '',
                            detailedDescription: item.detailed_description || '',
                            category: item.riskIssue_category || item.category || '',
                            subCategory: item.sub_category || '',
                            ricewId: item.ricew_id || '',
                            ricewName: item.riskIssue_name || item.ricew_name || '',
                            ricewStatus: item.ricew_status || '',
                            dateRaised: item.date_raised || '',
                            raisedBy: String(item.raised_by) === String(localStorage.getItem('user_id')) ? localStorage.getItem('user_name') : item.raised_by || '',
                            ownerType: item.owner_type || item.riskIssue_owner_type || '',
                            owner: item.riskIssue_owner || item.owner || '',
                            assignedTo: item.assigned_to || '',
                            businessOwner: item.business_owner || '',
                            severity: item.severity || '',
                            goLiveImpact: item.go_live_impact || '',
                            environment: item.riskIssue_environment || item.environment || '',
                            deploymentWave: item.deployment_wave || '',
                            status: item.riskIssue_status || item.status || '',
                            escalationRequired: item.escalation_required || '',
                            targetResolutionDate: formatDateForInput(item.target_resolution_date || ''),
                            closureApprovedBy: item.closure_approved_by || '',
                            closureDate: item.closure_date || '',
                            aging: item.aging || '0',
                        }));

                        // NEW: Load existing documents from cache if available
                        let cachedLinks = item.riskIssue_documnet_links;
                        let cachedUrls = [];

                        if (cachedLinks) {
                            if (cachedLinks.L && Array.isArray(cachedLinks.L)) {
                                cachedUrls = cachedLinks.L.map(i => i.S).filter(Boolean);
                            } else if (Array.isArray(cachedLinks)) {
                                cachedUrls = cachedLinks.filter(u => typeof u === 'string');
                            }
                        }

                        if (cachedUrls.length > 0) {
                            setUploadedDocuments(cachedUrls.map(u => ({
                                name: u.split('/').pop() || 'Document',
                                url: u,
                                size: 0
                            })));
                        }

                        // NEW: Load link map from cache
                        let cachedMap = item.detailed_description_documnet_link_map;
                        if (cachedMap) {
                            if (cachedMap.M) {
                                const cleanMap = {};
                                Object.entries(cachedMap.M).forEach(([k, v]) => { cleanMap[k] = v.S; });
                                setDescriptionLinkMap(cleanMap);
                            } else if (typeof cachedMap === 'object') {
                                setDescriptionLinkMap(cachedMap);
                            }
                        }
                    }
                } catch (e) {
                    console.error('Error parsing cached form data', e);
                }
            }
            fetchRecordData();
        }
    }, [editId, projectId]);

    const handleChange = (field) => (e) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
    };

    const validateForm = () => {
        const newErrors = {};
        const mandatoryFields = [
            'recordType', 'projectPhase', 'title', 'detailedDescription',
            'dateRaised', 'raisedBy', 'severity', 'goLiveImpact',
            'status', 'category', 'targetResolutionDate', 'ownerType', 'owner'
        ];

        mandatoryFields.forEach(field => {
            if (!form[field] || form[field].toString().trim() === '') {
                newErrors[field] = 'Field Required';
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const [descriptionLinkMap, setDescriptionLinkMap] = useState({}); // Mapping of [Placeholder] -> CloudFront URL
    const [pastedImages, setPastedImages] = useState([]); // Array of { placeholder: string, file: File }
    const descriptionRef = useRef(null);

    const handleDescriptionPaste = (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let index in items) {
            const item = items[index];
            if (item.kind === 'file' && item.type.startsWith('image/')) {
                const blob = item.getAsFile();
                const now = new Date();
                const timestamp = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
                const placeholder = `[Screenshot_${timestamp}.png]`;

                // Add to temporary storage (no upload yet)
                setPastedImages(prev => [...prev, { placeholder, file: blob }]);

                // Inject placeholder into textarea at cursor position
                const input = descriptionRef.current;
                if (input) {
                    const start = input.selectionStart;
                    const end = input.selectionEnd;
                    const text = form.detailedDescription;
                    const newText = text.substring(0, start) + placeholder + text.substring(end);

                    setForm(prev => ({ ...prev, detailedDescription: newText }));

                    // Move cursor after the inserted placeholder
                    setTimeout(() => {
                        input.selectionStart = input.selectionEnd = start + placeholder.length;
                    }, 0);
                }

                e.preventDefault(); // Stop raw binary from being pasted
            }
        }
    };

    const executeClear = () => {
        setForm({
            recordId: editId ? form.recordId : '',
            displayId: editId ? form.displayId : '',
            recordType: '',
            stream: '',
            application: '',
            module: [],
            countryBuLegalEntity: '',
            projectPhase: '',
            title: '',
            detailedDescription: '',
            category: '',
            subCategory: '',
            ricewId: '',
            ricewName: '',
            ricewStatus: '',
            dateRaised: getCurrentDateFormatted(),
            raisedBy: localStorage.getItem('user_name') || 'Current User',
            ownerType: '',
            owner: '',
            assignedTo: '',
            businessOwner: '',
            severity: '',
            goLiveImpact: '',
            environment: '',
            deploymentWave: '',
            status: 'New',
            escalationRequired: '',
            targetResolutionDate: '',
            closureEvidence: null,
            closureApprovedBy: '',
            closureDate: '',
            aging: '0',
        });
        setErrors({});
        setUploadedDocuments([]);
        setPastedImages([]);
    };

    const handleClear = () => {
        setIsClearModalOpen(true);
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            setErrorMessage('Please fill out all required fields marked with *');
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 5000);
            return;
        }

        setIsSubmitting(true);
        try {
            const token = await getIdToken();
            if (!token) {
                handleAuthError();
                return;
            }

            const isEditMode = !!editId;
            const currentUserId = localStorage.getItem('user_id') || 'System';
            const projectTitle = DOMPurify.sanitize(form.title || 'Untitled', { ALLOWED_TAGS: [] });

            // --- STEP 1: Process Screenshot Placeholders in Description ---
            let finalDescription = form.detailedDescription;
            let currentPastedImages = [...pastedImages];
            let descriptionLinkMap = {};

            // Filter images that are actually mentioned in the description text
            const actualImagesToUpload = currentPastedImages.filter(img => finalDescription.includes(img.placeholder));

            if (actualImagesToUpload.length > 0) {
                // Generate stamped filenames for screenshots
                const stampedScreenshots = actualImagesToUpload.map(img => {
                    const originalName = img.placeholder.replace('[', '').replace(']', '');
                    const lastDot = originalName.lastIndexOf('.');
                    const base = lastDot !== -1 ? originalName.substring(0, lastDot) : originalName;
                    const ext = lastDot !== -1 ? originalName.substring(lastDot) : '';
                    const stampedName = `${base}_${Date.now()}${ext}`;
                    return { ...img, stampedName };
                });

                // 1. Get Presigned URLs for screenshots
                const urlResponse = await fetch('https://mt6ywydebk.execute-api.ap-south-1.amazonaws.com/New/generate-presigned-urls/risk-issue-document', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        user_id: currentUserId,
                        Title: projectTitle,
                        documents: stampedScreenshots.map(img => ({ name: DOMPurify.sanitize(img.stampedName, { ALLOWED_TAGS: [] }), type: img.file.type }))
                    })
                });

                if (urlResponse.status === 401 || urlResponse.status === 403) {
                    handleAuthError();
                    return;
                }

                const urlData = await urlResponse.json();
                if (urlData.success && urlData.urls) {
                    // 2. Upload each screenshot and build the link map
                    await Promise.all(urlData.urls.map(async (item) => {
                        const originalImage = stampedScreenshots.find(img => img.stampedName === item.documentName);
                        if (originalImage) {
                            await fetch(item.signedUrl, {
                                method: 'PUT',
                                body: originalImage.file,
                                headers: { 'Content-Type': originalImage.file.type }
                            });

                            // Map the placeholder to the final CloudFront URL
                            // Note: We keep the placeholder in the text, so the map key MUST match the placeholder
                            descriptionLinkMap[originalImage.placeholder] = item.publicCloudFrontUrl;
                        }
                    }));
                }
            }

            // --- STEP 2: Handle Regular Document Uploads ---
            // ... (rest of the logic handles regular docs)
            let finalDocumentUrls = [];
            if (uploadedDocuments.length > 0) {
                const newFiles = uploadedDocuments.filter(doc => doc.file);
                if (newFiles.length > 0) {
                    const stampedDocuments = newFiles.map(doc => {
                        const originalName = doc.name;
                        const lastDot = originalName.lastIndexOf('.');
                        const base = lastDot !== -1 ? originalName.substring(0, lastDot) : originalName;
                        const ext = lastDot !== -1 ? originalName.substring(lastDot) : '';
                        const stampedName = `${base}_${Date.now()}${ext}`;
                        return { ...doc, stampedName };
                    });

                    const urlResponse = await fetch('https://mt6ywydebk.execute-api.ap-south-1.amazonaws.com/New/generate-presigned-urls/risk-issue-document', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            user_id: currentUserId,
                            Title: projectTitle,
                            documents: stampedDocuments.map(f => ({ name: DOMPurify.sanitize(f.stampedName, { ALLOWED_TAGS: [] }), type: f.file.type }))
                        })
                    });

                    if (urlResponse.status === 401 || urlResponse.status === 403) {
                        handleAuthError();
                        return;
                    }

                    const urlData = await urlResponse.json();
                    if (!urlData.success) throw new Error('Failed to generate upload URLs');

                    await Promise.all(urlData.urls.map(async (item) => {
                        const originalFile = stampedDocuments.find(f => f.stampedName === item.documentName);
                        if (originalFile) {
                            await fetch(item.signedUrl, { method: 'PUT', body: originalFile.file, headers: { 'Content-Type': originalFile.file.type } });
                            finalDocumentUrls.push(item.publicCloudFrontUrl);
                        }
                    }));
                }
                uploadedDocuments.filter(doc => !doc.file && doc.url).forEach(doc => {
                    finalDocumentUrls.push(doc.url);
                });
            }

            // --- STEP 2.5: Map new Roster fields ---
            let ownerName = '';
            if (form.ownerType && form.owner) {
                const list = form.ownerType === 'Implementation Roster'
                    ? (rosterData.implementation_roster || [])
                    : (rosterData.client_roster || []);
                const found = list.find(item => item.email === form.owner);
                if (found) ownerName = found.full_name;
            }

            let businessOwnerClientName = '';
            let businessOwnerClientId = '';
            if (form.businessOwner) {
                const found = (rosterData.client_roster || []).find(item => item.email === form.businessOwner);
                if (found) {
                    businessOwnerClientName = found.full_name;
                    businessOwnerClientId = found.email;
                }
            }

            // --- STEP 3: Submit Final Form Data ---
            const payload = {
                // Top-level fields for backend destructuring
                RiskAndIssueFormId: editId || '',
                RiskAndIssueDisplayId: form.displayId,
                project_id: projectId.toString(),
                updated_by: currentUserId,

                ...form,
                module: Array.isArray(form.module) ? form.module.join(', ') : form.module,
                detailed_description: finalDescription,
                detailed_description_documnet_link_map: descriptionLinkMap, // Only new screenshots (backend merges)
                riskIssue_documnet_links: finalDocumentUrls, // Full list (backend de-duplicates)

                // Mappings for nested/prefixed backend fields
                record_type: form.recordType,
                country_bu_legal_entity: form.countryBuLegalEntity,
                project_phase: form.projectPhase,
                sub_category: form.subCategory,
                ricew_id: form.ricewId,
                ricew_name: form.ricewName,
                ricew_status: form.ricewStatus,
                date_raised: form.dateRaised,
                raised_by: form.raisedBy,
                owner_type: form.ownerType,
                owner: form.owner, // Email
                riskIssue_owner_name: ownerName,
                business_owner: form.businessOwner, // Email
                Business_Owner_Client_id: businessOwnerClientId,
                Business_Owner_Client_name: businessOwnerClientName,
                go_live_impact: form.goLiveImpact,
                riskIssue_environment: form.environment,
                deployment_wave: form.deploymentWave,
                escalation_required: form.escalationRequired,
                target_resolution_date: form.targetResolutionDate || 'Pending',
                riskIssue_module: Array.isArray(form.module) ? form.module.join(', ') : form.module,
                closure_approved_by: form.closureApprovedBy,
                closure_date: form.closureDate
            };

            if (!isEditMode) {
                // Generate Display ID from our sequential counter API
                try {
                    const idResponse = await fetch('http://localhost:6100/api/risk-issue/generate-display-id', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ project_id: projectId.toString(), record_type: form.recordType })
                    });
                    const idData = await idResponse.json();
                    if (idData.success) {
                        payload.RiskAndIssueDisplayId = idData.displayId;
                    }
                } catch (idErr) {
                    console.error('Display ID generation failed:', idErr);
                }

                payload.user_id = currentUserId;
                payload.created_by = currentUserId;
                delete payload.RiskAndIssueFormId; // Let backend generate ID
                delete payload.updated_by;
                // Preserve legacy closure_evidence as the first document URL if available
                payload.closure_evidence = finalDocumentUrls.length > 0 ? finalDocumentUrls[0] : '';
            }

            const endpoint = isEditMode
                ? '/ricew/risk-and-issue-form/updateRecord'
                : '/ricew/risk-and-issue-form/createRecord';

            let result;
            try {
                result = await ricewApiClient.post(endpoint, payload);
            } catch (apiError) {
                if (apiError.message?.includes('401') || apiError.message?.includes('403')) {
                    handleAuthError();
                    return;
                }
                throw apiError;
            }

            if (result.success) {
                setSuccessMessage(`Risk and Issue record ${isEditMode ? 'updated' : 'created'} successfully!`);
                setShowSuccessMessage(true);
                setPastedImages([]); // Clear temporary screenshots state

                if (isEditMode) {
                    fetchRecordData(); // Re-fetch the updated data with live links
                }

                setTimeout(() => {
                    setShowSuccessMessage(false);
                    if (!isEditMode) {
                        navigate(-1);
                    }
                }, 2000);
            } else {
                setErrorMessage(result.error || result.message || `Failed to ${isEditMode ? 'update' : 'create'} record`);
                setShowErrorMessage(true);
            }
        } catch (error) {
            console.error(`Error in ${!!editId ? 'update' : 'create'}:`, error);
            setErrorMessage(error.message || 'A network error occurred.');
            setShowErrorMessage(true);
        } finally {
            setIsSubmitting(false);
        }
    };



    return (
        <div className="config-main" style={{ minHeight: '80vh', paddingBottom: '10px', overflowY: 'visible' }}>
            <div className="dashboard-content" style={{ width: '100%', minWidth: '1400px', maxWidth: 'none', margin: '0', padding: '0' }}>

                {/* Success Message */}
                {showSuccessMessage && (
                    <div style={{ position: 'fixed', top: '20px', right: '20px', backgroundColor: '#10b981', color: 'white', padding: '12px 20px', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000, fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                        {successMessage}
                    </div>
                )}

                {/* Error Message */}
                {showErrorMessage && (
                    <div style={{ position: 'fixed', top: '20px', right: '20px', backgroundColor: '#ef4444', color: 'white', padding: '12px 20px', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000, fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                        {errorMessage}
                    </div>
                )}

                {/* Loading Overlay (Page Load) */}
                {isDataLoading && (
                    <div style={{
                        position: 'fixed',
                        top: '0',
                        left: '0',
                        right: '0',
                        bottom: '0',
                        backgroundColor: 'rgba(255, 255, 255, 0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 15002
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
                            <span style={{ fontSize: '16px', color: '#333', fontWeight: '500' }}>Loading Risk and Issue Details...</span>
                        </div>
                    </div>
                )}

                {/* Loading Overlay (Action) */}
                {isSubmitting && (
                    <div style={{
                        position: 'fixed',
                        top: '0',
                        left: '0',
                        right: '0',
                        bottom: '0',
                        backgroundColor: 'rgba(255, 255, 255, 0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 15002
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
                                {editId ? 'Updating Record...' : 'Submitting Record...'}
                            </span>
                        </div>
                    </div>
                )}

                <style>{`
                        @keyframes spin {
                            from { transform: rotate(0deg); }
                            to { transform: rotate(360deg); }
                        }
                        @keyframes slideIn {
                            from { transform: translateX(100%); opacity: 0; }
                            to { transform: translateX(0); opacity: 1; }
                        }
                    `}</style>

                <div style={{ padding: '2rem 1rem 1rem 2rem' }}>
                    <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>
                        Project : <span style={{ color: '#007bff' }}>{localStorage.getItem('project_name') || selectedProject?.name}</span>
                    </h3>
                </div>

                <div className="config-header" style={{ marginTop: '0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h2>Risk and Issue</h2>
                    <button
                        onClick={() => setShowHelpPopup(true)}
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
                            transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3b4b5e'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4D5C74'}
                    >
                        <HelpCircle size={16} />
                        Help
                    </button>
                </div>

                <div style={{ padding: '1.5rem 2rem' }}>
                    {/* SECTION A: IDENTIFICATION */}
                    <div style={{ border: '1px solid #ddd', borderRadius: '4px', overflow: 'visible', marginBottom: '20px' }}>
                        <SectionHeader title="Identification" />
                        <div style={rowStyle()}>
                            <div style={{ ...cellStyle, borderRight: '1px solid #ddd', flex: 1.3 }}>
                                <span style={getLabelStyle('100px')}>Record ID <span style={{ color: 'red' }}>*</span></span>
                                <input type="text" readOnly placeholder="Auto-generated" value={form.displayId || form.recordId} style={{ ...inputStyle, background: '#f5f5f5', borderColor: errors.recordId ? '#dc3545' : '#ddd' }} />
                            </div>
                            <div style={{ ...cellStyle, borderRight: '1px solid #ddd', flex: 1.3 }}>
                                <span style={getLabelStyle('100px')}>Record Type <span style={{ color: 'red' }}>*</span></span>
                                <div style={{ flex: 1 }}>
                                    <RecordTypeAutocomplete
                                        value={form.recordType}
                                        onChange={(val) => {
                                            setForm(prev => {
                                                const updates = { ...prev, recordType: val };
                                                if (prev.displayId) {
                                                    const match = prev.displayId.match(/\d+/);
                                                    const digits = match ? match[0] : '';
                                                    const prefix = val === 'Risk' ? 'RSK' : (val === 'Issue' ? 'ISU' : '');
                                                    if (prefix && digits) {
                                                        updates.displayId = `${prefix}${digits.padStart(4, '0')}`;
                                                    }
                                                }
                                                return updates;
                                            });
                                            if (errors.recordType) setErrors(prev => ({ ...prev, recordType: undefined }));
                                        }}
                                        error={!!errors.recordType}
                                    />
                                    <div data-error-field="true" style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: '500', lineHeight: '1.3', wordWrap: 'break-word' }}>{errors.recordType && errors.recordType}</div>
                                </div>
                            </div>
                            <div style={{ ...cellStyle }}>
                                <span style={getLabelStyle('175px')}>Country / BU / Legal Entity</span>
                                <input type="text" placeholder="Enter Details" value={form.countryBuLegalEntity} onChange={handleChange('countryBuLegalEntity')} style={inputStyle} />
                            </div>
                        </div>

                        <div style={rowStyle()}>
                            <div style={{ ...cellStyle, borderRight: '1px solid #ddd', flex: 1.3 }}>
                                <span style={getLabelStyle('100px')}>Stream</span>
                                <WorkstreamAutocomplete
                                    value={form.stream}
                                    onChange={(val) => { setForm(prev => ({ ...prev, stream: val, application: '', module: '' })); }}
                                    options={streamOptions}
                                />
                            </div>
                            <div style={{ ...cellStyle, borderRight: '1px solid #ddd', flex: 1.3 }}>
                                <span style={getLabelStyle('100px')}>Application</span>
                                <ApplicationAutocomplete
                                    value={form.application}
                                    onChange={(val) => { setForm(prev => ({ ...prev, application: val, module: '' })); }}
                                    options={getApplicationOptions(form.stream)}
                                    disabled={!form.stream}
                                />
                            </div>
                            <div style={cellStyle}>
                                <span style={getLabelStyle('100px')}>Module</span>
                                <ModuleAutocomplete
                                    value={form.module}
                                    onChange={(val) => setForm(prev => ({ ...prev, module: val }))}
                                    options={getModuleOptions(form.stream, form.application)}
                                    disabled={!form.application}
                                />
                            </div>
                        </div>

                        <div style={{ ...rowStyle(), paddingRight: '25px' }}>
                            <div style={{ ...cellStyle, borderRight: '1px solid #ddd', flex: 1.3 }}>
                                <span style={getLabelStyle('115px')}>Project Phase <span style={{ color: 'red' }}>*</span></span>
                                <div style={{ flex: 1 }}>
                                    <ProjectPhaseAutocomplete
                                        value={form.projectPhase}
                                        onChange={(val) => { setForm(prev => ({ ...prev, projectPhase: val })); if (errors.projectPhase) setErrors(prev => ({ ...prev, projectPhase: undefined })); }}
                                        error={!!errors.projectPhase}
                                        options={projectPhaseOptions}
                                    />
                                    <div data-error-field="true" style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: '500', lineHeight: '1.3', wordWrap: 'break-word' }}>{errors.projectPhase && errors.projectPhase}</div>
                                </div>
                            </div>
                            <div style={{ ...cellStyle, borderRight: 'none', flex: 2.3 }}>
                                <span style={getLabelStyle('100px')}>Title <span style={{ color: 'red' }}>*</span></span>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <textarea rows="1" placeholder="Enter Title" value={form.title} onChange={handleChange('title')} style={{ ...inputStyle, width: '100%', flex: '1 1 auto', resize: 'vertical', minHeight: '36px', borderColor: errors.title ? '#dc3545' : '#ddd' }} />
                                    <div data-error-field="true" style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: '500', lineHeight: '1.3', wordWrap: 'break-word' }}>{errors.title && errors.title}</div>
                                </div>
                            </div>
                        </div>

                        <div style={rowStyle()}>
                            <div style={{ ...cellStyle, width: '100%' }}>
                                <span style={getLabelStyle('155px')}>Detailed Description <span style={{ color: 'red' }}>*</span></span>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative' }}>
                                    <div style={{ position: 'relative' }}>
                                        {Object.keys(descriptionLinkMap).length > 0 && !isDescriptionEditing ? (
                                            /* Rich read-only view: [filename] tokens are inline clickable links */
                                            <div style={{ ...inputStyle, minHeight: '80px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: '1.6', borderColor: errors.detailedDescription ? '#dc3545' : '#ddd', background: '#fff', paddingRight: '32px' }}>
                                                {renderDescriptionWithLinks(form.detailedDescription, descriptionLinkMap).map((part, i) =>
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
                                                )}
                                            </div>
                                        ) : (
                                            <textarea
                                                ref={descriptionRef}
                                                rows="3"
                                                placeholder="Enter Detailed Description (Paste screenshots here)"
                                                value={form.detailedDescription}
                                                onChange={handleChange('detailedDescription')}
                                                onPaste={handleDescriptionPaste}
                                                style={{ ...inputStyle, resize: 'vertical', minHeight: '80px', borderColor: errors.detailedDescription ? '#dc3545' : '#ddd', paddingRight: '32px' }}
                                            />
                                        )}
                                        {/* Edit / Done toggle button */}
                                        {Object.keys(descriptionLinkMap).length > 0 && (
                                            <button
                                                type="button"
                                                title={isDescriptionEditing ? 'Done editing' : 'Edit description'}
                                                onClick={() => setIsDescriptionEditing(prev => !prev)}
                                                style={{ position: 'absolute', top: '6px', right: '6px', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: isDescriptionEditing ? '#28a745' : '#666', lineHeight: 1 }}
                                            >
                                                {isDescriptionEditing ? (
                                                    /* checkmark — done */
                                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                                ) : (
                                                    /* pencil — edit */
                                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                                )}
                                            </button>
                                        )}
                                        <div data-error-field="true" style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: '500', lineHeight: '1.3', wordWrap: 'break-word' }}>{errors.detailedDescription && errors.detailedDescription}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ ...rowStyle(false), flexDirection: 'column', alignItems: 'flex-start', padding: '10px 16px', gap: '8px', borderBottom: '1px solid #ddd' }}>
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                    const files = Array.from(e.target.files);
                                    setUploadedDocuments(prev => [
                                        ...prev,
                                        ...files.map(f => ({ name: f.name, size: f.size, file: f }))
                                    ]);
                                    e.target.value = '';
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                                style={{ padding: '6px 14px', backgroundColor: '#0d6efd', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.41 17.41a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
                                Add Document
                            </button>
                            {uploadedDocuments.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                                    {uploadedDocuments.map((doc, idx) => (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', backgroundColor: '#f0f4ff', border: '1px solid #c7d9ff', borderRadius: '4px', fontSize: '12px', color: '#333' }}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0d6efd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                                            {doc.url ? (
                                                <a
                                                    href="#"
                                                    onClick={(e) => { e.preventDefault(); handlePreview(doc.url, doc.name); }}
                                                    style={{ color: '#0d6efd', textDecoration: 'none', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '500' }}
                                                    onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                                    onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                                                >
                                                    {doc.name}
                                                </a>
                                            ) : (
                                                <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</span>
                                            )}
                                            {doc.size > 0 && <span style={{ color: '#888', fontSize: '11px' }}>({(doc.size / 1024).toFixed(1)} KB)</span>}
                                            <button
                                                type="button"
                                                onClick={() => setUploadedDocuments(prev => prev.filter((_, i) => i !== idx))}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0', color: '#dc3545', lineHeight: 1, display: 'flex', alignItems: 'center' }}
                                            >
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div style={rowStyle(false)}>
                            <div style={{ ...cellStyle, borderRight: '1px solid #ddd', flex: 1.3 }}>
                                <span style={getLabelStyle('100px')}>Category <span style={{ color: 'red' }}>*</span></span>
                                <div style={{ flex: 1 }}>
                                    <CategoryAutocomplete
                                        value={form.category}
                                        onChange={(val) => { setForm(prev => ({ ...prev, category: val, subCategory: '' })); if (errors.category) setErrors(prev => ({ ...prev, category: undefined })); }}
                                        options={categoryOptions}
                                        error={!!errors.category}
                                    />
                                    <div data-error-field="true" style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: '500', lineHeight: '1.3', wordWrap: 'break-word' }}>{errors.category && errors.category}</div>
                                </div>
                            </div>
                            <div style={{ ...cellStyle, borderRight: '1px solid #ddd', flex: 1.3 }}>
                                <span style={getLabelStyle('100px')}>Sub-category</span>
                                <SubCategoryAutocomplete
                                    value={form.subCategory}
                                    onChange={(val) => setForm(prev => ({ ...prev, subCategory: val }))}
                                    options={getSubcategoryOptions(form.category)}
                                    disabled={!form.category}
                                />
                            </div>
                            <div style={cellStyle}></div>
                        </div>
                    </div>

                    {/* SECTION B: ORACLE-SPECIFIC TRACEABILITY */}
                    <div style={{ border: '1px solid #ddd', borderRadius: '4px', overflow: 'visible', marginBottom: '20px' }}>
                        <SectionHeader title="Oracle-Specific Traceability" />
                        <div style={rowStyle(false)}>
                            <div style={{ ...cellStyle, borderRight: '1px solid #ddd', flex: 1 }}>
                                <span style={getLabelStyle('100px')}>RICEW ID</span>
                                <RicewIdAutocomplete
                                    value={form.ricewId}
                                    onChange={(val) => {
                                        const selectedRicew = ricewData.find(item => item.RICE_ID === val);
                                        setForm(prev => ({
                                            ...prev,
                                            ricewId: val,
                                            ricewName: selectedRicew ? selectedRicew.RICE_NAME : '',
                                            ricewStatus: selectedRicew ? selectedRicew.RICEW_Status : ''
                                        }));
                                    }}
                                    options={ricewOptions}
                                />
                            </div>
                            <div style={{ ...cellStyle, borderRight: '1px solid #ddd', flex: 1 }}>
                                <span style={getLabelStyle('100px')}>RICEW Name</span>
                                <input type="text" readOnly placeholder="Auto-fill" value={form.ricewName} style={{ ...inputStyle, background: '#f5f5f5' }} />
                            </div>
                            <div style={cellStyle}>
                                <span style={getLabelStyle('100px')}>RICEW Status</span>
                                <input type="text" readOnly placeholder="Auto-fill" value={form.ricewStatus} style={{ ...inputStyle, background: '#f5f5f5' }} />
                            </div>
                        </div>
                    </div>

                    {/* SECTION C: SOURCE & OWNERSHIP */}
                    <div style={{ border: '1px solid #ddd', borderRadius: '4px', overflow: 'visible', marginBottom: '20px' }}>
                        <SectionHeader title="Source & Ownership" />
                        <div style={rowStyle()}>
                            <div style={{ ...cellStyle, borderRight: '1px solid #ddd', flex: 1 }}>
                                <span style={getLabelStyle('115px')}>Date Raised <span style={{ color: 'red' }}>*</span></span>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <input type="text" readOnly value={formatDateForDisplay(form.dateRaised)} style={{ ...inputStyle, background: '#f5f5f5', borderColor: errors.dateRaised ? '#dc3545' : '#ddd' }} />
                                    <div data-error-field="true" style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: '500', lineHeight: '1.3', wordWrap: 'break-word' }}>{errors.dateRaised && errors.dateRaised}</div>
                                </div>
                            </div>
                            <div style={{ ...cellStyle, borderRight: '1px solid #ddd', flex: 1 }}>
                                <span style={getLabelStyle('100px')}>Raised By <span style={{ color: 'red' }}>*</span></span>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <input type="text" readOnly value={form.raisedBy} style={{ ...inputStyle, background: '#f5f5f5', borderColor: errors.raisedBy ? '#dc3545' : '#ddd' }} />
                                    <div data-error-field="true" style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: '500', lineHeight: '1.3', wordWrap: 'break-word' }}>{errors.raisedBy && errors.raisedBy}</div>
                                </div>
                            </div>
                            <div style={{ ...cellStyle, flex: 1 }}>
                                <span style={getLabelStyle('100px')}>Assigned To</span>
                                <GenericUserAutocomplete placeholder="Search Assignee" value={form.assignedTo} onChange={(val) => setForm(prev => ({ ...prev, assignedTo: val }))} disabled={true} />
                            </div>
                        </div>
                        <div style={rowStyle(false)}>
                            <div style={{ ...cellStyle, borderRight: '1px solid #ddd', flex: 1 }}>
                                <span style={getLabelStyle('185px')}>Select Owner (Risk / Issue) <span style={{ color: 'red' }}>*</span></span>
                                <div style={{ flex: 1 }}>
                                    <OwnerTypeAutocomplete
                                        value={form.ownerType}
                                        onChange={(val) => {
                                            setForm(prev => ({ ...prev, ownerType: val, owner: '' }));
                                            if (errors.ownerType) setErrors(prev => ({ ...prev, ownerType: undefined }));
                                        }}
                                        error={!!errors.ownerType}
                                    />
                                    <div data-error-field="true" style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: '500', lineHeight: '1.3', wordWrap: 'break-word' }}>{errors.ownerType && errors.ownerType}</div>
                                </div>
                            </div>
                            <div style={{ ...cellStyle, borderRight: '1px solid #ddd', flex: 1 }}>
                                <span style={getLabelStyle('140px')}>Owner (Risk/Issue) <span style={{ color: 'red' }}>*</span></span>
                                <div style={{ flex: 1 }}>
                                    <GenericUserAutocomplete
                                        placeholder="Search Owner"
                                        value={form.owner}
                                        onChange={(val) => {
                                            setForm(prev => ({ ...prev, owner: val }));
                                            if (errors.owner) setErrors(prev => ({ ...prev, owner: undefined }));
                                        }}
                                        options={getRosterOptions(form.ownerType)}
                                        disabled={!form.ownerType}
                                        error={!!errors.owner}
                                    />
                                    <div data-error-field="true" style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: '500', lineHeight: '1.3', wordWrap: 'break-word' }}>{errors.owner && errors.owner}</div>
                                </div>
                            </div>
                            <div style={{ ...cellStyle, flex: 1 }}>
                                <span style={getLabelStyle('175px')}>Business Owner (Client)</span>
                                <GenericUserAutocomplete
                                    placeholder="Search Business Owner"
                                    value={form.businessOwner}
                                    onChange={(val) => setForm(prev => ({ ...prev, businessOwner: val }))}
                                    options={getRosterOptions('Client Roster')}
                                    disabled={false}
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECTION D: ASSESSMENT */}
                    <div style={{ border: '1px solid #ddd', borderRadius: '4px', overflow: 'visible', marginBottom: '20px' }}>
                        <SectionHeader title="Assessment" />
                        <div style={rowStyle()}>
                            <div style={{ ...cellStyle, borderRight: '1px solid #ddd', flex: 1 }}>
                                <span style={getLabelStyle('100px')}>Severity <span style={{ color: 'red' }}>*</span></span>
                                <div style={{ flex: 1 }}>
                                    <SeverityAutocomplete
                                        value={form.severity}
                                        onChange={(val) => { setForm(prev => ({ ...prev, severity: val })); if (errors.severity) setErrors(prev => ({ ...prev, severity: undefined })); }}
                                        error={!!errors.severity}
                                        options={severityOptions}
                                    />
                                    <div data-error-field="true" style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: '500', lineHeight: '1.3', wordWrap: 'break-word' }}>{errors.severity && errors.severity}</div>
                                </div>
                            </div>
                            <div style={{ ...cellStyle, borderRight: '1px solid #ddd', flex: 1 }}>
                                <span style={getLabelStyle('120px')}>Go-Live Impact <span style={{ color: 'red' }}>*</span></span>
                                <div style={{ flex: 1 }}>
                                    <GoLiveImpactAutocomplete
                                        value={form.goLiveImpact}
                                        onChange={(val) => { setForm(prev => ({ ...prev, goLiveImpact: val })); if (errors.goLiveImpact) setErrors(prev => ({ ...prev, goLiveImpact: undefined })); }}
                                        error={!!errors.goLiveImpact}
                                    />
                                    <div data-error-field="true" style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: '500', lineHeight: '1.3', wordWrap: 'break-word' }}>{errors.goLiveImpact && errors.goLiveImpact}</div>
                                </div>
                            </div>
                            <div style={{ ...cellStyle }}></div>
                        </div>
                        <div style={rowStyle(false)}>
                            <div style={{ ...cellStyle, borderRight: '1px solid #ddd', flex: 1 }}>
                                <span style={getLabelStyle('115px')}>Environment</span>
                                <EnvironmentAutocomplete
                                    value={form.environment}
                                    onChange={(val) => { setForm(prev => ({ ...prev, environment: val })); if (errors.environment) setErrors(prev => ({ ...prev, environment: undefined })); }}
                                    error={!!errors.environment}
                                    options={environmentOptions}
                                />
                            </div>
                            <div style={{ ...cellStyle, borderRight: '1px solid #ddd', flex: 1 }}>
                                <span style={getLabelStyle('125px')}>Wave / Rollout</span>
                                <WaveRolloutAutocomplete
                                    value={form.deploymentWave}
                                    onChange={(val) => setForm(prev => ({ ...prev, deploymentWave: val }))}
                                    options={waveRolloutOptions}
                                />
                            </div>
                            <div style={cellStyle}></div>
                        </div>
                    </div>

                    {/* SECTION E: TRACKING & GOVERNANCE */}
                    <div style={{ border: '1px solid #ddd', borderRadius: '4px', overflow: 'visible', marginBottom: '20px' }}>
                        <SectionHeader title="Tracking & Governance" />
                        <div style={rowStyle()}>
                            <div style={{ ...cellStyle, borderRight: '1px solid #ddd', flex: 1 }}>
                                <span style={getLabelStyle('100px')}>Status <span style={{ color: 'red' }}>*</span></span>
                                <div style={{ flex: 1 }}>
                                    <RiskIssueStatusAutocomplete
                                        value={form.status}
                                        onChange={(val) => { setForm(prev => ({ ...prev, status: val })); if (errors.status) setErrors(prev => ({ ...prev, status: undefined })); }}
                                        error={!!errors.status}
                                        options={riskIssueStatusOptions}
                                    />
                                    <div data-error-field="true" style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: '500', lineHeight: '1.3', wordWrap: 'break-word' }}>{errors.status && errors.status}</div>
                                </div>
                            </div>
                            <div style={{ ...cellStyle, borderRight: '1px solid #ddd', flex: 1 }}>
                                <span style={getLabelStyle('140px')}>Escalation Required</span>
                                <EscalationRequiredAutocomplete
                                    value={form.escalationRequired}
                                    onChange={(val) => setForm(prev => ({ ...prev, escalationRequired: val }))}
                                />
                            </div>
                            <div style={{ ...cellStyle, flex: 1 }}>
                                <span style={getLabelStyle('175px')}>Target Resolution Date <span style={{ color: 'red' }}>*</span></span>
                                <div style={{ flex: 1 }}>
                                    <CustomDatePicker
                                        value={form.targetResolutionDate || ''}
                                        onChange={(val) => { setForm(prev => ({ ...prev, targetResolutionDate: val })); if (errors.targetResolutionDate) setErrors(prev => ({ ...prev, targetResolutionDate: undefined })); }}
                                        placeholder="DD-MMM-YYYY"
                                        error={!!errors.targetResolutionDate}
                                        width="100%"
                                    />
                                    <div data-error-field="true" style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: '500', lineHeight: '1.3', wordWrap: 'break-word' }}>{errors.targetResolutionDate && errors.targetResolutionDate}</div>
                                </div>
                            </div>
                        </div>
                        <div style={rowStyle()}>
                            <div style={{ ...cellStyle, borderRight: '1px solid #ddd', flex: 1, height: 'auto', minHeight: '40px' }}>
                                <span style={getLabelStyle('120px')}>Closure Evidence</span>
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px',
                                    flex: 1,
                                    padding: '7px 12px',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    background: '#f8f9fa',
                                    minHeight: '20px',
                                    justifyContent: 'center',
                                    overflow: 'hidden'
                                }}>
                                    {Array.isArray(form.closureEvidence) && form.closureEvidence.length > 0 ? (
                                        form.closureEvidence.map((link, lIdx) => (
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
                                                    style={{ color: '#0ea5e9', textDecoration: 'none', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', fontWeight: '500', display: 'block' }}
                                                    onMouseEnter={e => e.target.style.textDecoration = 'underline'}
                                                    onMouseLeave={e => e.target.style.textDecoration = 'none'}
                                                    title={link.name}
                                                >
                                                    {link.name}
                                                </a>
                                            </div>
                                        ))
                                    ) : (
                                        <span style={{ color: '#888', fontSize: '13px' }}>No evidence selected</span>
                                    )}
                                </div>
                            </div>
                            <div style={{ ...cellStyle, borderRight: '1px solid #ddd', flex: 1 }}>
                                <span style={getLabelStyle('140px')}>Closure Approved By</span>
                                <GenericUserAutocomplete placeholder="Search Approver" value={form.closureApprovedBy} onChange={(val) => setForm(prev => ({ ...prev, closureApprovedBy: val }))} disabled={true} />
                            </div>
                            <div style={cellStyle}>
                                <span style={getLabelStyle('100px')}>Closure Date</span>
                                <input type="text" readOnly placeholder="DD-MMM-YYYY" value={formatDateForDisplay(form.closureDate) || ''} style={{ ...inputStyle, background: '#f5f5f5' }} />
                            </div>
                        </div>
                        <div style={rowStyle(false)}>
                            <div style={{ ...cellStyle, borderRight: '1px solid #ddd', flex: 1 }}>
                                <span style={getLabelStyle('100px')}>Aging</span>
                                <input type="text" readOnly disabled placeholder="Auto-calculated" value={form.aging} style={{ ...inputStyle, background: '#f5f5f5' }} />
                            </div>
                            <div style={{ ...cellStyle, borderRight: '1px solid #ddd', flex: 1 }}></div>
                            <div style={cellStyle}></div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                        <button
                            onClick={handleClear}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#c82333'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#dc3545'; }}
                            style={{ padding: '8px 20px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', transition: 'background-color 0.2s' }}
                        >
                            Clear
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            onMouseEnter={(e) => { if (!isSubmitting) e.currentTarget.style.backgroundColor = '#218838'; }}
                            onMouseLeave={(e) => { if (!isSubmitting) e.currentTarget.style.backgroundColor = '#28a745'; }}
                            style={{ padding: '8px 20px', backgroundColor: isSubmitting ? '#6c757d' : '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '600', transition: 'background-color 0.2s' }}
                        >
                            {isSubmitting ? (editId ? 'Updating...' : 'Submitting...') : 'Submit'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Help Modal */}
            {showHelpPopup && (
                <div
                    onClick={() => setShowHelpPopup(false)}
                    style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 3000
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '12px',
                            boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
                            width: '660px',
                            maxWidth: '90vw',
                            maxHeight: '85vh',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative'
                        }}
                    >
                        <div className="help-modal-scroll" style={{ overflowY: 'auto', padding: '32px', flex: '1' }}>
                            <button
                                onClick={() => setShowHelpPopup(false)}
                                style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545' }}
                            >
                                <X size={20} />
                            </button>

                            <h3 style={{ margin: '0 0 20px 0', color: '#333', fontSize: '18px', fontWeight: '600' }}>
                                Help &amp; Information
                            </h3>

                            <div style={{ color: '#444', fontSize: '14px', lineHeight: '1.6' }}>

                                <div style={{ marginBottom: '16px' }}>
                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>What is this page?</strong>
                                    <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                                        The <strong>Risk and Issue Form</strong> is used to log, describe, and track a single risk or issue identified during the ERP project. It captures all relevant details including type, severity, impact, ownership, status, and resolution information.
                                    </p>
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>Why is this used?</strong>
                                    <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                                        Risks and issues are a normal part of any ERP implementation. This form provides a structured way to document each one — capturing the business impact, responsible owner, escalation requirements, and resolution steps — so that nothing is missed and every item is properly tracked to closure.
                                    </p>
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>Key fields</strong>
                                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                        <li><strong>Record Type</strong> — Whether this is a Risk or an Issue.</li>
                                        <li><strong>Category / Sub-Category</strong> — Classification of the risk or issue type.</li>
                                        <li><strong>Severity / Go-Live Impact</strong> — How severe the item is and whether it affects a go-live date.</li>
                                        <li><strong>Project Phase / Wave / Rollout</strong> — The delivery phase and go-live event this item relates to.</li>
                                        <li><strong>Workstream / Application / Module</strong> — The ERP workstream or technical area impacted.</li>
                                        <li><strong>RICEW ID</strong> — Links this risk/issue to a specific RICEW object if applicable.</li>
                                        <li><strong>Status</strong> — Current state of the item (e.g., Open, In Progress, Resolved, Closed).</li>
                                        <li><strong>Escalation Required</strong> — Whether the item needs to be escalated to senior stakeholders.</li>
                                        <li><strong>Owner / Raised By</strong> — The person responsible for resolution and who logged the item.</li>
                                        <li><strong>Description / Resolution</strong> — Free-text detail about the item and how it was or will be resolved.</li>
                                    </ul>
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to use this page</strong>
                                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                        <li>Fill in the required fields and any available optional fields, then click <strong>Submit</strong> to save the record.</li>
                                        <li>When editing an existing record, click <strong>Update</strong> to save changes.</li>
                                        <li>Click <strong>Clear</strong> to reset all fields — a confirmation will appear before clearing.</li>
                                        <li>Documents or evidence can be attached using the document upload section if available.</li>
                                    </ul>
                                </div>

                                <div style={{ marginBottom: '4px' }}>
                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>Important notes</strong>
                                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                        <li><strong>Record Type</strong> is required — you must specify whether this is a Risk or an Issue.</li>
                                        <li>Once submitted, the record appears in the Risk and Issue Dashboard where it can be filtered and monitored.</li>
                                        <li>A project must be selected before this form can be used.</li>
                                    </ul>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .help-modal-scroll::-webkit-scrollbar { width: 4px; }
                .help-modal-scroll::-webkit-scrollbar-track { background: transparent; margin: 8px 0; }
                .help-modal-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                .help-modal-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}</style>
            <ImagePreviewModal />
            <ClearConfirmationModal />
        </div>
    );
};

export default RiskAndIssueForm;
