import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { ChangeTypeAutocomplete, ChangeCategoryAutocomplete, ChangeSubCategoryAutocomplete, StreamAutocomplete, ApplicationAutocomplete, ModuleAutocomplete, ProjectPhaseAutocomplete, PriorityAutocomplete, ImpactAreaAutocomplete, CurrencyAutocomplete, RicewImpactedAutocomplete, RicewIdAutocomplete, CRRequestorAutocomplete, CRClientOwnerAutocomplete, BusinessOwnerAutocomplete, ApprovalStatusAutocomplete } from './ChangeRequestFormAutocomplete';
import { useCascadingLOV, useProjectPhaseLOV, useRicewLOV, useCategorySubcategoryLOV, useRosterLOV, useClientRosterLOV, useOrganizationCurrencyLOV } from './ChangeRequestHooks';
import { changeRequestSubmitApiClient } from './ChangeRequestClient';
import { getIdToken } from '../../../utils/cognito-auth';
import { HelpCircle, X } from 'lucide-react';
import ChangeRequestPrintReport from './ChangeRequestPrintReport';

const ChangeRequestForm = ({ onClose, onBackToLanding, onLogout, selectedProject }) => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [isDataLoading, setIsDataLoading] = useState(false);

    const [form, setForm] = useState({
        changeRequestId: '',
        changeRequestDisplayId: '', // Added
        changeRequestTitle: '',
        changeType: '',
        changeCategory: '',
        subCategory: '',
        stream: '',
        application: '',
        module: [],
        projectPhase: '',
        priority: '',
        impactArea: [],
        changeDescription: '',
        businessJustification: '',
        proposedSolution: '',
        // Updated fields for Name and Email
        crRequestorName: '',
        crRequestorEmail: '',
        crRequestorRosterId: '',
        crClientOwnerName: '',
        crClientOwnerEmail: '',
        businessOwnerName: '',
        businessOwnerEmail: '',
        effortEstimate: '',
        costEstimate: '',
        currency: 'USD',
        scheduleImpact: 'No',
        scheduleImpactExplanation: '',
        ricewImpacted: 'No',
        ricewId: '',
        ricewName: '',
        dateRaised: new Date().toISOString().split('T')[0],
        aging: '',
        approvalStatus: 'Submitted',
        approvedBy: '',
        approvalDate: '',
        rejectionReason: '',
        isDraftRecord: false,
        changeDescriptionDocuments: [],
        businessJustificationDocuments: [],
        proposedSolutionDocuments: [],
        Change_Request_Print_PDF_link: '',
    });

    const descFileRef = React.useRef(null);
    const justFileRef = React.useRef(null);
    const solFileRef = React.useRef(null);

    // Refs for textareas to handle cursor-based paste injection
    const descriptionTextAreaRef = React.useRef(null);
    const justificationTextAreaRef = React.useRef(null);
    const solutionTextAreaRef = React.useRef(null);

    // State for pasted images (temporary blobs before upload) and link maps (CloudFront URLs)
    const [pastedImages, setPastedImages] = React.useState({
        changeDescription: [],
        businessJustification: [],
        proposedSolution: []
    });

    const [previewContent, setPreviewContent] = React.useState({ url: '', name: '' });
    const [isPreviewModalOpen, setIsPreviewModalOpen] = React.useState(false);

    const [linkMaps, setLinkMaps] = React.useState({
        changeDescription: {},
        businessJustification: {},
        proposedSolution: {}
    });

    const projectId = localStorage.getItem('project_id') || selectedProject?.id;

    const fetchRecordDetails = React.useCallback(async (silent = false) => {
        if (!id || !projectId) return;

        try {
            if (!silent) setIsDataLoading(true);
            const response = await changeRequestSubmitApiClient.get(`/ricew/ChangeRequest/getDetails?Change_Request_Form_id=${id}&Project_id=${projectId}`);

            if (response.success && response.data) {
                const d = response.data;
                setForm(prev => ({
                    changeRequestId: d.Change_Request_Form_id || '',
                    changeRequestDisplayId: DOMPurify.sanitize(d.Change_Request_Display_id || '', { ALLOWED_TAGS: [] }),
                    changeRequestTitle: DOMPurify.sanitize(d.Change_Request_Title || '', { ALLOWED_TAGS: [] }),
                    changeType: DOMPurify.sanitize(d.Change_Request_Change_Type || '', { ALLOWED_TAGS: [] }),
                    changeCategory: DOMPurify.sanitize(d.Change_Category || '', { ALLOWED_TAGS: [] }),
                    subCategory: DOMPurify.sanitize(d.Change_Sub_category || '', { ALLOWED_TAGS: [] }),
                    stream: DOMPurify.sanitize(d.Change_Request_Stream || '', { ALLOWED_TAGS: [] }),
                    application: DOMPurify.sanitize(d.Change_Application || '', { ALLOWED_TAGS: [] }),
                    module: (d.Change_Module ? d.Change_Module.split(',').map(m => DOMPurify.sanitize(m.trim() || '', { ALLOWED_TAGS: [] })) : []),
                    projectPhase: DOMPurify.sanitize(d.Change_Project_Phase || '', { ALLOWED_TAGS: [] }),
                    priority: DOMPurify.sanitize(d.Change_Priority || '', { ALLOWED_TAGS: [] }),
                    impactArea: (d.Change_Impact_Area ? d.Change_Impact_Area.split(',').map(m => DOMPurify.sanitize(m.trim() || '', { ALLOWED_TAGS: [] })) : []),
                    changeDescription: DOMPurify.sanitize(d.Change_Description || '', { ALLOWED_TAGS: [] }),
                    businessJustification: DOMPurify.sanitize(d.Change_Business_Justification || '', { ALLOWED_TAGS: [] }),
                    proposedSolution: DOMPurify.sanitize(d.Change_Proposed_Solution || '', { ALLOWED_TAGS: [] }),
                    crRequestorName: DOMPurify.sanitize(d.CR_Requestor_name || '', { ALLOWED_TAGS: [] }),
                    crRequestorEmail: DOMPurify.sanitize(d.CR_Requestor_email || '', { ALLOWED_TAGS: [] }),
                    crRequestorRosterId: prev.crRequestorRosterId || '',
                    crClientOwnerName: DOMPurify.sanitize(d.CR_Client_Owner_name || '', { ALLOWED_TAGS: [] }),
                    crClientOwnerEmail: DOMPurify.sanitize(d.CR_Client_Owner_email || '', { ALLOWED_TAGS: [] }),
                    businessOwnerName: DOMPurify.sanitize(d.Change_Business_Owner_name || '', { ALLOWED_TAGS: [] }),
                    businessOwnerEmail: DOMPurify.sanitize(d.Change_Business_Owner_email || '', { ALLOWED_TAGS: [] }),
                    effortEstimate: DOMPurify.sanitize(d.Change_Effort_Estimate_Hours || '', { ALLOWED_TAGS: [] }),
                    costEstimate: DOMPurify.sanitize(d.Change_Cost_Estimate_Amount || '', { ALLOWED_TAGS: [] }),
                    currency: DOMPurify.sanitize(d.Change_Cost_Estimate_Currency || 'USD', { ALLOWED_TAGS: [] }),
                    scheduleImpact: DOMPurify.sanitize(d.Schedule_Impact || 'No', { ALLOWED_TAGS: [] }),
                    scheduleImpactExplanation: DOMPurify.sanitize(d.Schedule_Impact_details || '', { ALLOWED_TAGS: [] }),
                    ricewImpacted: DOMPurify.sanitize(d.Change_RICEW_Impacted || 'No', { ALLOWED_TAGS: [] }),
                    ricewId: DOMPurify.sanitize(d.Change_RICEW_ID || '', { ALLOWED_TAGS: [] }),
                    ricewName: DOMPurify.sanitize(d.Change_RICEW_Name || '', { ALLOWED_TAGS: [] }),
                    dateRaised: d.created_timestamp ? d.created_timestamp.split('T')[0] : new Date().toISOString().split('T')[0],
                    aging: DOMPurify.sanitize(d.Change_Aging || '', { ALLOWED_TAGS: [] }),
                    approvalStatus: DOMPurify.sanitize(d.Change_Approval_Status || 'Draft', { ALLOWED_TAGS: [] }),
                    approvedBy: DOMPurify.sanitize(d.Change_Approved_By || '', { ALLOWED_TAGS: [] }),
                    approvalDate: d.Change_Approval_Date || '',
                    rejectionReason: DOMPurify.sanitize(d.Change_Approval_Status === 'More Information Needed'
                        ? (d.Request_Reason || d.Change_Rejection_Reason || d.Change_Rejected_Reason || '')
                        : (d.Change_Rejected_Reason || d.Change_Rejection_Reason || d.Request_Reason || ''), { ALLOWED_TAGS: [] }),
                    isDraftRecord: d.Change_Request_Save_Draft === 'true',
                    changeDescriptionDocuments: (d.Change_Description_docs_list || []).map(url => ({ url, name: DOMPurify.sanitize(url.split('/').pop() || '', { ALLOWED_TAGS: [] }) })),
                    businessJustificationDocuments: (d.Business_Justification_docs_list || []).map(url => ({ url, name: DOMPurify.sanitize(url.split('/').pop() || '', { ALLOWED_TAGS: [] }) })),
                    proposedSolutionDocuments: (d.Proposed_Solution_docs_list || []).map(url => ({ url, name: DOMPurify.sanitize(url.split('/').pop() || '', { ALLOWED_TAGS: [] }) })),
                    Change_Request_Print_PDF_link: d.Change_Request_Print_PDF_link || d.change_request_print_pdf_URL || '',
                    rawBackendData: d,
                }));

                setLinkMaps({
                    changeDescription: d.Change_Description_screenshot_map || d.Change_Description_Link_Map || {},
                    businessJustification: d.Business_Justification_screenshot_map || d.Change_Business_Justification_Link_Map || {},
                    proposedSolution: d.Proposed_Solution_screenshot_map || d.Change_Proposed_Solution_Link_Map || {}
                });
            }
        } catch (error) {
            console.error('Error fetching record details:', error);
        } finally {
            if (!silent) setIsDataLoading(false);
        }
    }, [id, projectId]);

    // Fetch existing record details if in edit mode
    React.useEffect(() => {
        fetchRecordDetails();
    }, [fetchRecordDetails]);

    const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
    const [isClearModalOpen, setIsClearModalOpen] = useState(false);
    const [showHelpPopup, setShowHelpPopup] = useState(false);
    const [showPrintReport, setShowPrintReport] = useState(false);
    const [pendingPdfUpload, setPendingPdfUpload] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [showErrorMessage, setShowErrorMessage] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [errors, setErrors] = useState({});

    const executeClear = () => {
        setForm({
            changeRequestId: '', changeRequestDisplayId: '', changeRequestTitle: '', changeType: '',
            changeCategory: '', subCategory: '', stream: '',
            application: '', module: [], projectPhase: '',
            priority: '', impactArea: [], changeDescription: '',
            businessJustification: '', proposedSolution: '',
            crRequestorName: '', crRequestorEmail: '', crRequestorRosterId: '',
            crClientOwnerName: '', crClientOwnerEmail: '',
            businessOwnerName: '', businessOwnerEmail: '',
            effortEstimate: '', costEstimate: '', currency: 'USD',
            scheduleImpact: 'No', scheduleImpactExplanation: '',
            ricewImpacted: 'No', ricewId: '', ricewName: '',
            dateRaised: new Date().toISOString().split('T')[0],
            aging: '0',
            approvalStatus: 'Submitted', approvedBy: '',
            approvalDate: '', rejectionReason: '',
            changeDescriptionDocuments: [],
            businessJustificationDocuments: [],
            proposedSolutionDocuments: [],
            Change_Request_Print_PDF_link: '',
            isDraftRecord: false,
        });
        setErrors({});
        setShowErrorMessage(false);
        setStatusMessage('');
    };

    const handleClear = () => {
        setIsClearModalOpen(true);
    };

    const { streamOptions, getApplicationOptions, getModuleOptions } = useCascadingLOV();
    const { options: projectPhaseOptions } = useProjectPhaseLOV(localStorage.getItem('project_id') || selectedProject?.id || '');
    const { ricewOptions, ricewData } = useRicewLOV(localStorage.getItem('project_id') || selectedProject?.id || '');
    const { categoryOptions, getSubcategoryOptions } = useCategorySubcategoryLOV();
    const { options: rosterOptions } = useRosterLOV(localStorage.getItem('project_id') || selectedProject?.id || '');
    const { options: clientRosterOptions } = useClientRosterLOV(localStorage.getItem('project_id') || selectedProject?.id || '');
    const { options: currencyOptions } = useOrganizationCurrencyLOV(localStorage.getItem('project_id') || selectedProject?.id || '');

    // Sync crRequestorRosterId for existing records once rosterOptions loads
    React.useEffect(() => {
        if (!rosterOptions.length || form.crRequestorRosterId) return;
        if (!form.crRequestorName && !form.crRequestorEmail) return;
        const match = rosterOptions.find(
            o => o.displayName === form.crRequestorName && o.email === form.crRequestorEmail
        );
        if (match) {
            setForm(prev => ({ ...prev, crRequestorRosterId: match.id }));
        }
    }, [rosterOptions, form.crRequestorName, form.crRequestorEmail, form.crRequestorRosterId]);

    const [isApprovedByOpen, setIsApprovedByOpen] = useState(false);
    const [approvedBySearch, setApprovedBySearch] = useState('');

    const clientOptions = ['Client A', 'Client B', 'Global Tech Solutions', 'Future Corp'];

    const [isScheduleImpactOpen, setIsScheduleImpactOpen] = useState(false);
    const [schedImpactHighlight, setSchedImpactHighlight] = useState(-1);

    const handleChange = (field) => (e) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
        setErrors(prev => ({ ...prev, [field]: undefined }));
    };



    const cellStyle = {
        display: 'flex',
        alignItems: 'flex-start',
        padding: '10px 12px',
        flex: 1,
        minWidth: 0,
    };

    const rowStyle = (borderBottom = true) => ({
        display: 'flex',
        borderBottom: borderBottom ? '1px solid #ddd' : 'none',
    });

    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (isApprovedByOpen && !event.target.closest('.approved-by-container')) {
                setIsApprovedByOpen(false);
            }
            if (isScheduleImpactOpen && !event.target.closest('.schedule-impact-container')) {
                setIsScheduleImpactOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isApprovedByOpen, isScheduleImpactOpen]);


    const handleScheduleImpactKeyDown = (e) => {
        if (!isScheduleImpactOpen) {
            if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                setIsScheduleImpactOpen(true);
                setSchedImpactHighlight(0);
            }
            return;
        }

        const options = ['No', 'Yes'];
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSchedImpactHighlight(prev => prev < options.length - 1 ? prev + 1 : 0);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSchedImpactHighlight(prev => prev > 0 ? prev - 1 : options.length - 1);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (schedImpactHighlight >= 0 && schedImpactHighlight < options.length) {
                setForm(prev => ({ ...prev, scheduleImpact: options[schedImpactHighlight] }));
            }
            setIsScheduleImpactOpen(false);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setIsScheduleImpactOpen(false);
        }
    };

    const [isEditingDocs, setIsEditingDocs] = React.useState({
        changeDescription: false,
        businessJustification: false,
        proposedSolution: false
    });

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
                    <div style={{ padding: '28px 24px 20px', color: '#333', fontSize: '14px', lineHeight: '1.7', textAlign: 'center', background: '#fff' }}>
                        <div style={{ marginBottom: '8px', color: '#555' }}>Are you sure you want to clear all the data?</div>
                        <div style={{ fontWeight: '600', color: '#333' }}>This action cannot be undone.</div>
                    </div>
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

    const handlePaste = (e, field, ref) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let index in items) {
            const item = items[index];
            if (item.kind === 'file' && item.type.startsWith('image/')) {
                const blob = item.getAsFile();
                const now = new Date();
                const timestamp = `${now.getHours()}${now.getMinutes()}${now.getSeconds()}`;
                const placeholder = `[Screenshot_${timestamp}.png]`;

                // Add to temporary storage for that specific field
                setPastedImages(prev => ({
                    ...prev,
                    [field]: [...prev[field], { placeholder, file: blob }]
                }));

                // Inject placeholder into textarea at cursor position
                const input = ref.current;
                if (input) {
                    const start = input.selectionStart;
                    const end = input.selectionEnd;
                    const text = form[field];
                    const newText = text.substring(0, start) + placeholder + text.substring(end);

                    setForm(prev => ({ ...prev, [field]: newText }));

                    // Move cursor after the inserted placeholder
                    setTimeout(() => {
                        input.selectionStart = input.selectionEnd = start + placeholder.length;
                    }, 0);
                }

                e.preventDefault();
            }
        }
    };

    const updateLinksOnBackend = async (formId, section, updateType, links) => {
        try {
            const token = await getIdToken();
            const response = await fetch('https://q4f0h3wwq2.execute-api.ap-south-1.amazonaws.com/New/ricew/ChangeRequest/updateLinks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { Authorization: `Bearer ${token}` })
                },
                body: JSON.stringify({
                    Change_Request_Form_id: formId,
                    section: section,
                    updateType: updateType,
                    links: updateType === 'print_pdf' ? undefined : links,
                    print_pdf_url: updateType === 'print_pdf' ? links : undefined
                })
            });
            return await response.json();
        } catch (error) {
            console.error(`Error updating links for ${section} ${updateType}:`, error);
            throw error;
        }
    };

    const uploadGeneric = async (formId, section, uploadType, files) => {
        if (!files || files.length === 0) return [];

        const userId = localStorage.getItem('user_id') || 'System';
        const projectTitle = form.changeRequestTitle || 'ChangeRequest';
        const changeType = form.changeType || 'Standard';

        const stampedFiles = files.map(f => {
            const originalName = f.name || f.placeholder || `File_${Date.now()}`;
            const lastDot = originalName.lastIndexOf('.');
            const base = lastDot !== -1 ? originalName.substring(0, lastDot) : originalName;
            const ext = lastDot !== -1 ? originalName.substring(lastDot) : (uploadType === 'screenshot' ? '.png' : '');
            const stampedName = `${base}_${Date.now()}${ext}`;
            return { ...f, stampedName, file: f.file || f }; // handle both {file} and File objects
        });

        try {
            const token = await getIdToken();
            const urlResponse = await fetch('https://q4f0h3wwq2.execute-api.ap-south-1.amazonaws.com/New/generate-presigned-urls/change-request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { Authorization: `Bearer ${token}` })
                },
                body: JSON.stringify({
                    section: section,
                    uploadType: uploadType,
                    CR_ID: formId,
                    user_id: userId,
                    Title: projectTitle,
                    Change_Type: changeType,
                    documents: stampedFiles.map(img => ({ name: img.stampedName, type: img.file.type }))
                })
            });

            const urlData = await urlResponse.json();
            if (!urlData.success) throw new Error(`Failed to generate upload URLs for ${uploadType} in ${section}`);

            const results = [];
            await Promise.all(urlData.urls.map(async (item) => {
                const originalFile = stampedFiles.find(f => f.stampedName === item.documentName);
                if (originalFile) {
                    await fetch(item.signedUrl, {
                        method: 'PUT',
                        body: originalFile.file,
                        headers: { 'Content-Type': originalFile.file.type }
                    });
                    results.push({
                        placeholder: originalFile.placeholder || originalFile.name,
                        publicUrl: item.publicCloudFrontUrl
                    });
                }
            }));

            return results;
        } catch (error) {
            console.error(`Error uploading ${uploadType} for ${section}:`, error);
            throw error;
        }
    };

    // Legacy helper replaced by uploadGeneric logic during submit flow
    const uploadDocuments = async (docs, sectionTitle) => { return []; };

    const uploadPrintPdf = async (pdfBlob, formId) => {
        const userId = localStorage.getItem('user_id') || 'System';
        const rosterId = form.crRequestorRosterId || '';
        const displayId = form.changeRequestDisplayId || formId || 'CR';
        const fileName = `CR_Print_${displayId}_${Date.now()}.pdf`;

        try {
            const token = await getIdToken();
            const urlResponse = await fetch('https://q4f0h3wwq2.execute-api.ap-south-1.amazonaws.com/New/generate-presigned-urls/change-request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { Authorization: `Bearer ${token}` })
                },
                body: JSON.stringify({
                    section: 'Print_PDF',
                    uploadType: 'print',
                    CR_ID: formId,
                    user_id: userId,
                    Title: form.changeRequestTitle || 'ChangeRequest',
                    Change_Type: form.changeType || 'Standard',
                    documents: [],
                    print_pdf_name: fileName,
                    CR_Requestor_Resource_Roster_Form_id: rosterId
                })
            });

            const urlData = await urlResponse.json();
            if (!urlData.success || !urlData.printPdfUrl) throw new Error('Failed to generate print PDF upload URL');

            await fetch(urlData.printPdfUrl.signedUrl, {
                method: 'PUT',
                body: pdfBlob,
                headers: { 'Content-Type': 'application/pdf' }
            });

            return urlData.printPdfUrl.publicCloudFrontUrl;
        } catch (error) {
            console.error('Error uploading print PDF:', error);
            throw error;
        }
    };

    const handlePrintPdfUpload = async (pdfBlob) => {
        const formId = form.changeRequestId || id;
        if (!formId) return;

        const cloudFrontUrl = await uploadPrintPdf(pdfBlob, formId);
        if (!cloudFrontUrl) return;

        // Use updateLinks API instead of a general update for the PDF link
        await updateLinksOnBackend(formId, null, 'print_pdf', cloudFrontUrl);
    };

    const handleFormSubmit = async (isDraft, shouldNotify = true) => {
        const projectId = localStorage.getItem('project_id') || selectedProject?.id;
        const userId = localStorage.getItem('user_id');

        const newErrors = {};

        if (!form.changeRequestTitle.trim()) {
            newErrors.changeRequestTitle = 'Field Required';
        }

        if (!isDraft) {
            const submitMandatory = ['changeType', 'changeCategory', 'changeDescription', 'businessJustification', 'proposedSolution', 'crRequestorName', 'crClientOwnerName', 'businessOwnerName'];
            submitMandatory.forEach(field => {
                if (!form[field] || (Array.isArray(form[field]) && form[field].length === 0) || (typeof form[field] === 'string' && !form[field].trim())) {
                    newErrors[field] = 'Field Required';
                }
            });
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            setStatusMessage('Please fill all mandatory fields before submitting');
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 3000);
            return;
        }

        setErrors({});

        if (!isDraft) {
            if (form.ricewImpacted === 'Yes' && !form.ricewId) {
                newErrors.ricewId = 'Field Required';
                setErrors(newErrors);
                setStatusMessage('RICEW ID is required when RICEW Impacted is Yes');
                setShowErrorMessage(true);
                setTimeout(() => setShowErrorMessage(false), 3000);
                return;
            }

            if ((form.approvalStatus === 'Rejected' || form.approvalStatus === 'More Information Needed') && !form.rejectionReason.trim()) {
                newErrors.rejectionReason = 'Field Required';
                setErrors(newErrors);
                setStatusMessage(`${form.approvalStatus === 'Rejected' ? 'Rejection Reason' : 'Request Reason'} is required when Approval Status is ${form.approvalStatus}`);
                setShowErrorMessage(true);
                setTimeout(() => setShowErrorMessage(false), 3000);
                return;
            }
        }

        setIsSubmitting(true);

        try {
            // If Save Draft is clicked, force "Draft".
            // If Update/Submit is clicked: 
            //   - Automatically move "Draft" to "Submitted".
            //   - Otherwise, preserve your manual selection (e.g. Approved, Rejected).
            const currentStatus = isDraft ? "Draft" : (form.approvalStatus === 'Draft' ? 'Submitted' : form.approvalStatus);

            console.log(`[Form Submit] isDraft: ${isDraft}, Dropdown Status: ${form.approvalStatus}, Final Status to Send: ${currentStatus}`);

            const payload = {
                Change_Request_Title: DOMPurify.sanitize(form.changeRequestTitle || '', { ALLOWED_TAGS: [] }),
                Change_Request_Change_Type: DOMPurify.sanitize(form.changeType || '', { ALLOWED_TAGS: [] }),
                Change_Category: DOMPurify.sanitize(form.changeCategory || '', { ALLOWED_TAGS: [] }),
                Change_Sub_category: DOMPurify.sanitize(form.subCategory || '', { ALLOWED_TAGS: [] }),
                Change_Request_Stream: DOMPurify.sanitize(form.stream || '', { ALLOWED_TAGS: [] }),
                Change_Application: DOMPurify.sanitize(form.application || '', { ALLOWED_TAGS: [] }),
                Change_Module: Array.isArray(form.module) ? form.module.map(m => DOMPurify.sanitize(m || '', { ALLOWED_TAGS: [] })).join(', ') : DOMPurify.sanitize(form.module || '', { ALLOWED_TAGS: [] }),
                Change_Project_Phase: DOMPurify.sanitize(form.projectPhase || '', { ALLOWED_TAGS: [] }),
                Change_Priority: DOMPurify.sanitize(form.priority || '', { ALLOWED_TAGS: [] }),
                Change_Impact_Area: Array.isArray(form.impactArea) ? form.impactArea.map(a => DOMPurify.sanitize(a || '', { ALLOWED_TAGS: [] })).join(', ') : DOMPurify.sanitize(form.impactArea || '', { ALLOWED_TAGS: [] }),
                Change_Description: DOMPurify.sanitize(form.changeDescription || '', { ALLOWED_TAGS: [] }),
                Change_Business_Justification: DOMPurify.sanitize(form.businessJustification || '', { ALLOWED_TAGS: [] }),
                Change_Proposed_Solution: DOMPurify.sanitize(form.proposedSolution || '', { ALLOWED_TAGS: [] }),
                CR_Requestor_name: DOMPurify.sanitize(form.crRequestorName || '', { ALLOWED_TAGS: [] }),
                CR_Requestor_email: DOMPurify.sanitize(form.crRequestorEmail || '', { ALLOWED_TAGS: [] }),
                CR_Client_Owner_name: DOMPurify.sanitize(form.crClientOwnerName || '', { ALLOWED_TAGS: [] }),
                CR_Client_Owner_email: DOMPurify.sanitize(form.crClientOwnerEmail || '', { ALLOWED_TAGS: [] }),
                Change_Business_Owner_name: DOMPurify.sanitize(form.businessOwnerName || '', { ALLOWED_TAGS: [] }),
                Change_Business_Owner_email: DOMPurify.sanitize(form.businessOwnerEmail || '', { ALLOWED_TAGS: [] }),
                Change_Effort_Estimate_Hours: DOMPurify.sanitize(form.effortEstimate || '', { ALLOWED_TAGS: [] }),
                Change_Cost_Estimate_Amount: DOMPurify.sanitize(form.costEstimate || '', { ALLOWED_TAGS: [] }),
                Change_Cost_Estimate_Currency: DOMPurify.sanitize(form.currency || '', { ALLOWED_TAGS: [] }),
                Schedule_Impact: DOMPurify.sanitize(form.scheduleImpact || '', { ALLOWED_TAGS: [] }),
                Schedule_Impact_details: DOMPurify.sanitize(form.scheduleImpactExplanation || '', { ALLOWED_TAGS: [] }),
                Change_RICEW_Impacted: DOMPurify.sanitize(form.ricewImpacted || '', { ALLOWED_TAGS: [] }),
                Change_RICEW_ID: DOMPurify.sanitize(form.ricewId || '', { ALLOWED_TAGS: [] }),
                Change_RICEW_Name: DOMPurify.sanitize(form.ricewName || '', { ALLOWED_TAGS: [] }),
                Change_Request_Save_Draft: isDraft ? "true" : "false",
                Change_Approval_Status: DOMPurify.sanitize(currentStatus || '', { ALLOWED_TAGS: [] }),
                Request_Reason: currentStatus === 'More Information Needed' ? DOMPurify.sanitize(form.rejectionReason || '', { ALLOWED_TAGS: [] }) : undefined,
                Change_Rejection_Reason: currentStatus === 'Rejected' ? DOMPurify.sanitize(form.rejectionReason || '', { ALLOWED_TAGS: [] }) : undefined,
                Project_id: projectId,
                change_request_print_pdf_URL: form.Change_Request_Print_PDF_link
            };

            // If updating, include the current links in the payload (backend now supports this)
            if (id) {
                payload.Change_Description_screenshot_map = linkMaps.changeDescription;
                payload.Change_Description_docs_list = form.changeDescriptionDocuments.filter(d => !d.file && d.url).map(d => d.url);

                payload.Business_Justification_screenshot_map = linkMaps.businessJustification;
                payload.Business_Justification_docs_list = form.businessJustificationDocuments.filter(d => !d.file && d.url).map(d => d.url);

                payload.Proposed_Solution_screenshot_map = linkMaps.proposedSolution;
                payload.Proposed_Solution_docs_list = form.proposedSolutionDocuments.filter(d => !d.file && d.url).map(d => d.url);
            }

            let response;
            if (id) {
                // UPDATE EXISTING RECORD
                payload.Change_Request_Form_id = id;
                payload.updated_by = userId;
                response = await changeRequestSubmitApiClient.post('/ricew/ChangeRequest/update', payload);
            } else {
                // CREATE NEW RECORD
                payload.created_by = userId;
                response = await changeRequestSubmitApiClient.post('/ricew/ChangeRequest/createSubmit', payload);
            }

            if (response.success) {
                const finalTechnicalId = response.Change_Request_Form_id || id;
                const finalDisplayId = response.Change_Request_Display_id || (response.data && response.data.newDisplayId) || form.changeRequestDisplayId;

                // SECTION 2: ASYNC FILE PROCESSING (SEQUENTIAL FLOW)
                const sections = {
                    changeDescription: "Change_Description",
                    businessJustification: "Business_Justification",
                    proposedSolution: "Proposed_Solution"
                };

                // Track if we need to update state with new link maps and document lists
                const nextLinkMaps = { ...linkMaps };
                const nextDocs = {};

                for (const field of Object.keys(sections)) {
                    const sectionName = sections[field];

                    // 1. Process Screenshots
                    const fieldPastedImages = pastedImages[field];
                    const currentText = form[field];
                    const screenshotsToUpload = fieldPastedImages.filter(img => currentText.includes(img.placeholder));

                    if (screenshotsToUpload.length > 0) {
                        const uploadResults = await uploadGeneric(finalTechnicalId, sectionName, 'screenshot', screenshotsToUpload);
                        const newMap = { ...(linkMaps[field] || {}) };
                        uploadResults.forEach(res => { newMap[res.placeholder] = res.publicUrl; });

                        // Update Backend Links
                        await updateLinksOnBackend(finalTechnicalId, sectionName, 'screenshot', newMap);
                        nextLinkMaps[field] = newMap;
                    }

                    // 2. Process Binary Documents
                    const docsInState = form[`${field}Documents`] || [];
                    const newFiles = docsInState.filter(d => d.file);
                    const existingDocs = docsInState.filter(d => !d.file && d.url);
                    const existingUrls = existingDocs.map(d => d.url);

                    if (newFiles.length > 0) {
                        const uploadResults = await uploadGeneric(finalTechnicalId, sectionName, 'document', newFiles);
                        const newDocsFromUpload = uploadResults.map(r => ({ url: r.publicUrl, name: r.name }));
                        const finalDocs = [...existingDocs, ...newDocsFromUpload];
                        const finalUrls = [...existingUrls, ...uploadResults.map(r => r.publicUrl)];

                        // Update Backend Links
                        await updateLinksOnBackend(finalTechnicalId, sectionName, 'document', finalUrls);
                        
                        // Save to our local tracker for the final setForm update
                        nextDocs[`${field}Documents`] = finalDocs;
                    }
                }

                // Final State Update
                setForm(prev => ({
                    ...prev,
                    ...nextDocs, // Incorporate the new document URLs
                    isDraftRecord: isDraft,
                    approvalStatus: isDraft ? "Draft" : "Submitted",
                    changeRequestId: finalTechnicalId,
                    changeRequestDisplayId: finalDisplayId
                }));

                // SECTION 3: EMAIL NOTIFICATION
                // Triggered only on "Submit" AND if notification is confirmed (only for Updates)
                if (!isDraft && shouldNotify) {
                    try {
                        const emailPayload = {
                            Project_id: projectId,
                            Project_Name: localStorage.getItem('project_name') || selectedProject?.name || 'N/A',
                            Change_Request_Form_id: finalTechnicalId,
                            Change_Request_Title: form.changeRequestTitle,
                            // Requestor Details
                            CR_Requestor_email: form.crRequestorEmail,
                            CR_Requestor_name: form.crRequestorName,
                            // Client Owner Details
                            CR_Client_Owner_email: form.crClientOwnerEmail,
                            CR_Client_Owner_name: form.crClientOwnerName,
                            // Business Owner Details
                            Change_Business_Owner_email: form.businessOwnerEmail,
                            Change_Business_Owner_name: form.businessOwnerName
                        };

                        console.log('[Email Notification] Sending payload:', emailPayload);
                        await changeRequestSubmitApiClient.post('/email-Send/changeRequest/notify', emailPayload);
                    } catch (emailError) {
                        console.error('[Email Notification] Failed to send emails:', emailError);
                    }
                }

                setLinkMaps(nextLinkMaps);
                setPastedImages({ changeDescription: [], businessJustification: [], proposedSolution: [] });

                // For non-draft updates: PDF upload fires first (S3 → update API), then GET.
                // For draft saves: just reload immediately (no PDF upload).
                // For both new records and updates: PDF upload fires if not a draft.
                if (!isDraft) {
                    setPendingPdfUpload(true);
                } else if (id) {
                    await fetchRecordDetails(true);
                }

                setTimeout(() => {
                    setShowSuccessMessage(false);
                    if (!id) {
                        navigate('/dashboard/change-request-form');
                    }
                }, 2000);
            } else {
                throw new Error(response.error || 'Server error occurred');
            }
        } catch (error) {
            console.error('Submission error:', error);
            setStatusMessage(error.message || 'An error occurred during submission');
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 4000);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div
            className="config-main"
            style={{
                minHeight: '80vh',
                paddingBottom: '10px',
                overflowY: 'visible',
            }}
        >
            <style>
                {`
                    @media print {
                        /* Global reset for print */
                        body * {
                            visibility: hidden;
                        }
                        .config-main, .config-main * {
                            visibility: visible;
                        }
                        .config-main {
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 100% !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            background-color: white !important;
                        }
                        /* Maintain the 1400px "virtual" width to prevent overlaps, then zoom it down to fit A4 (~800px) */
                        .dashboard-content {
                            width: 1400px !important;
                            min-width: 1400px !important;
                            zoom: 0.58 !important; 
                            margin: 0 !important;
                            padding: 0 !important;
                            background-color: white !important;
                        }
                        /* Hide navigation and buttons */
                        .no-print, .sidebar, .header-wrapper, .Header_container, nav, aside {
                            display: none !important;
                        }
                        /* Preserve colors and adjust text area for print */
                        * {
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        .dropdown-arrow {
                            font-size: 8px !important;
                            font-weight: normal !important;
                            color: #666 !important;
                        }
                        /* Replace native bold select arrows with normal subtle ones */
                        select {
                            -webkit-appearance: none !important;
                            -moz-appearance: none !important;
                            appearance: none !important;
                            background-image: url("data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23666666%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E") !important;
                            background-repeat: no-repeat !important;
                            background-position: right 4px center !important;
                            padding-right: 18px !important;
                        }
                        body {
                            background-color: white !important;
                        }
                    }

                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    @keyframes fadeIn { 
                        from { opacity: 0; } 
                        to { opacity: 1; } 
                    } 
                    @keyframes scaleUp { 
                        from { transform: scale(0.95); opacity: 0; } 
                        to { transform: scale(1); opacity: 1; } 
                    }
                `}
            </style>
            <div className="dashboard-content" style={{ width: '100%', minWidth: '1400px', maxWidth: 'none', margin: '0', padding: '0' }}>

                {/* Project Info */}
                <div style={{ padding: '2rem 1rem 1rem 2rem' }}>
                    <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>
                        Project : <span style={{ color: '#007bff' }}>{localStorage.getItem('project_name') || selectedProject?.name}</span>
                    </h3>
                </div>

                <div className="config-header" style={{ marginTop: '0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h2>Change Request Form</h2>
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

                <style>{`
                .no-spinner::-webkit-inner-spin-button,
                .no-spinner::-webkit-outer-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }
                .no-spinner {
                    -moz-appearance: textfield;
                    appearance: textfield;
                }
            `}</style>

                {/* Status Notifications */}
                {showSuccessMessage && (
                    <div style={{ position: 'fixed', top: '20px', right: '20px', backgroundColor: '#10b981', color: 'white', padding: '12px 20px', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 10001, fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                        {statusMessage}
                    </div>
                )}
                {showErrorMessage && (
                    <div style={{ position: 'fixed', top: '20px', right: '20px', backgroundColor: '#ef4444', color: 'white', padding: '12px 20px', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 10001, fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                        {statusMessage}
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
                        zIndex: 10002
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
                            <span style={{ fontSize: '16px', color: '#333', fontWeight: '500' }}>Loading Change Request Details...</span>
                        </div>
                    </div>
                )}

                {/* Submitting Overlay (Action) */}
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
                        zIndex: 10002
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
                                {form.changeRequestId ? 'Updating Change Request...' : 'Submitting Change Request...'}
                            </span>
                        </div>
                    </div>
                )}

                <div style={{ padding: '1.5rem 2rem' }}>
                    {/* Draft Indicator Banner */}
                    {form.isDraftRecord && (
                        <div style={{
                            backgroundColor: '#fff3cd',
                            color: '#856404',
                            padding: '16px 20px',
                            borderRadius: '6px',
                            border: '1px solid #ffeeba',
                            marginBottom: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                            borderLeft: '4px solid #ffc107'
                        }}>
                            <span style={{ fontSize: '20px' }}>⚠️</span>
                            <div style={{ fontSize: '14px', lineHeight: '1.5' }}>
                                <strong style={{ fontSize: '15px', display: 'block', marginBottom: '4px' }}>Draft Record Mode</strong>
                                This Change Request is currently saved as a draft. You can continue updating it and save again as a draft, or click the <strong>Update</strong> button below to officially submit this request for approval.
                            </div>
                        </div>
                    )}

                    {/* SECTION A: IDENTIFICATION */}
                    <div style={{ border: '1px solid #ddd', borderRadius: '4px', overflow: 'visible', marginBottom: '20px' }}>

                        {/* Section Header */}
                        <div style={{
                            background: '#f8f9fa',
                            borderBottom: '1px solid #dee2e6',
                            padding: '10px 12px',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            color: '#333',
                        }}>
                            Section A: Identification
                        </div>

                        {/* Row 1: Change Request ID | Change Request Title | Change Type */}
                        <div style={rowStyle()}>

                            {/* Change Request ID */}
                            <div style={{ ...cellStyle, borderRight: '1px solid #ddd', flex: 1.3 }}>
                                <span style={{
                                    minWidth: '160px', maxWidth: '160px',
                                    fontWeight: 'bold', fontSize: '13px', color: '#333',
                                    flexShrink: 0, paddingRight: '8px', paddingTop: '5px',
                                }}>
                                    Change Request ID
                                </span>
                                <input
                                    type="text"
                                    readOnly
                                    placeholder="Auto-generated"
                                    value={form.changeRequestDisplayId}
                                    style={{
                                        flex: 1, padding: '5px 8px',
                                        border: '1px solid #ddd', borderRadius: '4px',
                                        fontSize: '13px', color: '#333',
                                        background: '#fff', outline: 'none',
                                    }}
                                />
                            </div>

                            {/* Change Request Title */}
                            <div style={{ ...cellStyle, borderRight: '1px solid #ddd', flex: 1.3 }}>
                                <span style={{
                                    minWidth: '160px', maxWidth: '160px',
                                    fontWeight: 'bold', fontSize: '13px', color: '#333',
                                    flexShrink: 0, paddingRight: '12px', paddingTop: '5px',
                                    whiteSpace: 'nowrap'
                                }}>
                                    Change Request Title <span style={{ color: 'red' }}>*</span>
                                </span>
                                <div style={{ flex: 1 }}>
                                    <input
                                        type="text"
                                        placeholder="Enter Change Request Title"
                                        value={form.changeRequestTitle}
                                        onChange={handleChange('changeRequestTitle')}
                                        style={{
                                            width: '100%', padding: '5px 8px',
                                            border: `1px solid ${errors.changeRequestTitle ? '#dc3545' : '#ddd'}`, borderRadius: '4px',
                                            fontSize: '13px', color: '#333',
                                            background: '#fff', outline: 'none', boxSizing: 'border-box',
                                        }}
                                    />
                                    <div data-error-field="true" style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: '500', lineHeight: '1.3', wordWrap: 'break-word' }}>{errors.changeRequestTitle && errors.changeRequestTitle}</div>
                                </div>
                            </div>

                            {/* Change Type */}
                            <ChangeTypeAutocomplete
                                value={form.changeType}
                                onChange={(val) => { setForm(prev => ({ ...prev, changeType: val })); setErrors(prev => ({ ...prev, changeType: undefined })); }}
                                label="Change Type"
                                required={true}
                                flex={1}
                                minWidth="100px"
                                error={errors.changeType ? 'Field Required' : ''}
                            />

                        </div>

                        {/* Row 2: Change Category | Sub-category | Project Phase */}
                        <div style={rowStyle()}>

                            {/* Change Category */}
                            <ChangeCategoryAutocomplete
                                value={form.changeCategory}
                                onChange={(val) => { setForm(prev => ({ ...prev, changeCategory: val, subCategory: '' })); setErrors(prev => ({ ...prev, changeCategory: undefined })); }}
                                options={categoryOptions}
                                label="Change Category"
                                required={true}
                                flex={1.3}
                                minWidth="160px"
                                style={{ borderRight: '1px solid #ddd' }}
                                error={errors.changeCategory ? 'Field Required' : ''}
                            />

                            {/* Sub-category */}
                            <ChangeSubCategoryAutocomplete
                                value={form.subCategory}
                                onChange={(val) => setForm(prev => ({ ...prev, subCategory: val }))}
                                options={getSubcategoryOptions(form.changeCategory)}
                                disabled={!form.changeCategory}
                                label="Sub-category"
                                flex={1.3}
                                minWidth="160px"
                                style={{ borderRight: '1px solid #ddd' }}
                            />

                            {/* Project Phase */}
                            <ProjectPhaseAutocomplete
                                value={form.projectPhase}
                                onChange={(val) => setForm(prev => ({ ...prev, projectPhase: val }))}
                                options={projectPhaseOptions}
                                label="Project Phase"
                                flex={1}
                                minWidth="100px"
                            />

                        </div>

                        {/* Row 3: Stream | Application | Module */}
                        <div style={rowStyle()}>

                            {/* Stream */}
                            <StreamAutocomplete
                                value={form.stream}
                                onChange={(val) => setForm(prev => {
                                    if (prev.stream === val) return prev;
                                    return { ...prev, stream: val, application: '', module: [] };
                                })}
                                options={streamOptions}
                                label="Stream"
                                flex={1.3}
                                minWidth="160px"
                                style={{ borderRight: '1px solid #ddd' }}
                            />

                            {/* Application */}
                            <ApplicationAutocomplete
                                value={form.application}
                                onChange={(val) => setForm(prev => {
                                    if (prev.application === val) return prev;
                                    return { ...prev, application: val, module: [] };
                                })}
                                options={getApplicationOptions(form.stream)}
                                label="Application"
                                flex={1.3}
                                minWidth="160px"
                                style={{ borderRight: '1px solid #ddd' }}
                            />

                            {/* Module */}
                            <ModuleAutocomplete
                                value={form.module}
                                onChange={(val) => setForm(prev => ({ ...prev, module: val }))}
                                options={getModuleOptions(form.stream, form.application)}
                                label="Module"
                                flex={1}
                                minWidth="100px"
                            />

                        </div>

                        {/* Row 4: Priority | Impact Area (spans 2 columns) */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1.293fr 1.3fr 1fr' }}>

                            {/* Priority */}
                            <PriorityAutocomplete
                                value={form.priority}
                                onChange={(val) => setForm(prev => ({ ...prev, priority: val }))}
                                label="Priority"
                                style={{ borderRight: '1px solid #ddd' }}
                            />

                            <ImpactAreaAutocomplete
                                value={form.impactArea}
                                onChange={(val) => setForm(prev => ({ ...prev, impactArea: val }))}
                                label="Impact Area"
                                style={{ gridColumn: 'span 2' }}
                            />

                        </div>

                    </div>

                    <div style={{ border: '1px solid #ddd', borderRadius: '4px', overflow: 'visible', marginBottom: '20px' }}>
                        {/* Section Header */}
                        <div style={{
                            background: '#f8f9fa',
                            borderBottom: '1px solid #dee2e6',
                            padding: '10px 12px',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            color: '#333',
                        }}>
                            Section B: Change Details
                        </div>

                        {/* Row with 3 columns for Description, Justification, and Solution */}
                        <div style={rowStyle(false)}>
                            {/* Change Description */}
                            <div style={{ ...cellStyle, borderRight: '1px solid #ddd', flex: 1 }}>
                                <span style={{
                                    minWidth: '160px', maxWidth: '160px',
                                    fontWeight: 'bold', fontSize: '13px', color: '#333',
                                    flexShrink: 0, paddingRight: '12px', paddingTop: '5px',
                                    whiteSpace: 'nowrap'
                                }}>
                                    Change Description <span style={{ color: 'red' }}>*</span>
                                </span>
                                <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    {Object.keys(linkMaps.changeDescription).length > 0 && !isEditingDocs.changeDescription ? (
                                        <div style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', color: '#333', background: '#fff', minHeight: '100px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: '1.6', paddingRight: '32px' }}>
                                            {renderDescriptionWithLinks(form.changeDescription, linkMaps.changeDescription).map((part, i) =>
                                                part.type === 'link' ? (
                                                    <a key={i} href="#" onClick={(e) => { e.preventDefault(); handlePreview(part.url, part.name); }} style={{ color: '#1976d2', textDecoration: 'underline', cursor: 'pointer', fontWeight: '500' }}>
                                                        {part.key}
                                                    </a>
                                                ) : (
                                                    <span key={i}>{part.value}</span>
                                                )
                                            )}
                                        </div>
                                    ) : (
                                        <textarea
                                            ref={descriptionTextAreaRef}
                                            placeholder="Description"
                                            value={form.changeDescription}
                                            onChange={handleChange('changeDescription')}
                                            onPaste={(e) => handlePaste(e, 'changeDescription', descriptionTextAreaRef)}
                                            style={{
                                                flex: 1, padding: '8px',
                                                border: `1px solid ${errors.changeDescription ? '#dc3545' : '#ddd'}`, borderRadius: '4px',
                                                fontSize: '13px', color: '#333',
                                                background: '#fff', outline: 'none',
                                                minHeight: '100px', fontFamily: 'inherit',
                                                resize: 'vertical', paddingRight: '32px'
                                            }}
                                        />
                                    )}
                                    {Object.keys(linkMaps.changeDescription).length > 0 && (
                                        <button
                                            type="button"
                                            title={isEditingDocs.changeDescription ? 'Done editing' : 'Edit description'}
                                            onClick={() => setIsEditingDocs(prev => ({ ...prev, changeDescription: !prev.changeDescription }))}
                                            style={{ position: 'absolute', top: '6px', right: '6px', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: isEditingDocs.changeDescription ? '#28a745' : '#666', lineHeight: 1 }}
                                        >
                                            {isEditingDocs.changeDescription ? (
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                            ) : (
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                            )}
                                        </button>
                                    )}
                                    <div data-error-field="true" style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: '500', lineHeight: '1.3', wordWrap: 'break-word' }}>{errors.changeDescription && errors.changeDescription}</div>
                                </div>
                            </div>

                            {/* Business Justification */}
                            <div style={{ ...cellStyle, borderRight: '1px solid #ddd', flex: 1 }}>
                                <span style={{
                                    minWidth: '160px', maxWidth: '160px',
                                    fontWeight: 'bold', fontSize: '13px', color: '#333',
                                    flexShrink: 0, paddingRight: '12px', paddingTop: '5px',
                                    whiteSpace: 'nowrap'
                                }}>
                                    Business Justification <span style={{ color: 'red' }}>*</span>
                                </span>
                                <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    {Object.keys(linkMaps.businessJustification).length > 0 && !isEditingDocs.businessJustification ? (
                                        <div style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', color: '#333', background: '#fff', minHeight: '100px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: '1.6', paddingRight: '32px' }}>
                                            {renderDescriptionWithLinks(form.businessJustification, linkMaps.businessJustification).map((part, i) =>
                                                part.type === 'link' ? (
                                                    <a key={i} href="#" onClick={(e) => { e.preventDefault(); handlePreview(part.url, part.name); }} style={{ color: '#1976d2', textDecoration: 'underline', cursor: 'pointer', fontWeight: '500' }}>
                                                        {part.key}
                                                    </a>
                                                ) : (
                                                    <span key={i}>{part.value}</span>
                                                )
                                            )}
                                        </div>
                                    ) : (
                                        <textarea
                                            ref={justificationTextAreaRef}
                                            placeholder="Justification"
                                            value={form.businessJustification}
                                            onChange={handleChange('businessJustification')}
                                            onPaste={(e) => handlePaste(e, 'businessJustification', justificationTextAreaRef)}
                                            style={{
                                                flex: 1, padding: '8px',
                                                border: `1px solid ${errors.businessJustification ? '#dc3545' : '#ddd'}`, borderRadius: '4px',
                                                fontSize: '13px', color: '#333',
                                                background: '#fff', outline: 'none',
                                                minHeight: '100px', fontFamily: 'inherit',
                                                resize: 'vertical', paddingRight: '32px'
                                            }}
                                        />
                                    )}
                                    {Object.keys(linkMaps.businessJustification).length > 0 && (
                                        <button
                                            type="button"
                                            title={isEditingDocs.businessJustification ? 'Done editing' : 'Edit justification'}
                                            onClick={() => setIsEditingDocs(prev => ({ ...prev, businessJustification: !prev.businessJustification }))}
                                            style={{ position: 'absolute', top: '6px', right: '6px', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: isEditingDocs.businessJustification ? '#28a745' : '#666', lineHeight: 1 }}
                                        >
                                            {isEditingDocs.businessJustification ? (
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                            ) : (
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                            )}
                                        </button>
                                    )}
                                    <div data-error-field="true" style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: '500', lineHeight: '1.3', wordWrap: 'break-word' }}>{errors.businessJustification && errors.businessJustification}</div>
                                </div>
                            </div>

                            {/* Proposed Solution */}
                            <div style={{ ...cellStyle, flex: 1 }}>
                                <span style={{
                                    minWidth: '160px', maxWidth: '160px',
                                    fontWeight: 'bold', fontSize: '13px', color: '#333',
                                    flexShrink: 0, paddingRight: '12px', paddingTop: '5px',
                                    whiteSpace: 'nowrap'
                                }}>
                                    Proposed Solution <span style={{ color: 'red' }}>*</span>
                                </span>
                                <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    {Object.keys(linkMaps.proposedSolution).length > 0 && !isEditingDocs.proposedSolution ? (
                                        <div style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', color: '#333', background: '#fff', minHeight: '100px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: '1.6', paddingRight: '32px' }}>
                                            {renderDescriptionWithLinks(form.proposedSolution, linkMaps.proposedSolution).map((part, i) =>
                                                part.type === 'link' ? (
                                                    <a key={i} href="#" onClick={(e) => { e.preventDefault(); handlePreview(part.url, part.name); }} style={{ color: '#1976d2', textDecoration: 'underline', cursor: 'pointer', fontWeight: '500' }}>
                                                        {part.key}
                                                    </a>
                                                ) : (
                                                    <span key={i}>{part.value}</span>
                                                )
                                            )}
                                        </div>
                                    ) : (
                                        <textarea
                                            ref={solutionTextAreaRef}
                                            placeholder="Solution"
                                            value={form.proposedSolution}
                                            onChange={handleChange('proposedSolution')}
                                            onPaste={(e) => handlePaste(e, 'proposedSolution', solutionTextAreaRef)}
                                            style={{
                                                flex: 1, padding: '8px',
                                                border: `1px solid ${errors.proposedSolution ? '#dc3545' : '#ddd'}`, borderRadius: '4px',
                                                fontSize: '13px', color: '#333',
                                                background: '#fff', outline: 'none',
                                                minHeight: '100px', fontFamily: 'inherit',
                                                resize: 'vertical', paddingRight: '32px'
                                            }}
                                        />
                                    )}
                                    {Object.keys(linkMaps.proposedSolution).length > 0 && (
                                        <button
                                            type="button"
                                            title={isEditingDocs.proposedSolution ? 'Done editing' : 'Edit solution'}
                                            onClick={() => setIsEditingDocs(prev => ({ ...prev, proposedSolution: !prev.proposedSolution }))}
                                            style={{ position: 'absolute', top: '6px', right: '6px', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: isEditingDocs.proposedSolution ? '#28a745' : '#666', lineHeight: 1 }}
                                        >
                                            {isEditingDocs.proposedSolution ? (
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                            ) : (
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                            )}
                                        </button>
                                    )}
                                    <div data-error-field="true" style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: '500', lineHeight: '1.3', wordWrap: 'break-word' }}>{errors.proposedSolution && errors.proposedSolution}</div>
                                </div>
                            </div>
                        </div>

                        {/* Row: Add Document Buttons (Below columns) */}
                        <div style={rowStyle()}>
                            {/* Change Description Docs */}
                            <div style={{ ...cellStyle, borderRight: '1px solid #ddd', flex: 1, alignItems: 'flex-start' }}>
                                <div style={{ minWidth: '160px', flexShrink: 0 }}></div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                                    <input
                                        type="file"
                                        ref={descFileRef}
                                        style={{ display: 'none' }}
                                        multiple
                                        onChange={(e) => {
                                            const files = Array.from(e.target.files);
                                            setForm(prev => ({
                                                ...prev,
                                                changeDescriptionDocuments: [
                                                    ...prev.changeDescriptionDocuments,
                                                    ...files.map(f => ({ name: f.name, size: f.size, file: f }))
                                                ]
                                            }));
                                            e.target.value = '';
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => descFileRef.current && descFileRef.current.click()}
                                        style={{ alignSelf: 'flex-start', padding: '6px 14px', backgroundColor: '#0d6efd', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.41 17.41a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
                                        Add Document
                                    </button>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                        {form.changeDescriptionDocuments.map((doc, idx) => (
                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 8px', backgroundColor: '#f0f4ff', border: '1px solid #c7d9ff', borderRadius: '4px', fontSize: '11px', color: '#333' }}>
                                                {doc.url ? (
                                                    <a href="#" onClick={(e) => { e.preventDefault(); handlePreview(doc.url, doc.name); }} style={{ color: '#0d6efd', textDecoration: 'none', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} onMouseEnter={e => e.target.style.textDecoration = 'underline'} onMouseLeave={e => e.target.style.textDecoration = 'none'}>{doc.name}</a>
                                                ) : (
                                                    <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</span>
                                                )}
                                                <button type="button" onClick={() => setForm(prev => ({ ...prev, changeDescriptionDocuments: prev.changeDescriptionDocuments.filter((_, i) => i !== idx) }))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0', color: '#dc3545', display: 'flex', alignItems: 'center' }}>
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Business Justification Docs */}
                            <div style={{ ...cellStyle, borderRight: '1px solid #ddd', flex: 1, alignItems: 'flex-start' }}>
                                <div style={{ minWidth: '160px', flexShrink: 0 }}></div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                                    <input
                                        type="file"
                                        ref={justFileRef}
                                        style={{ display: 'none' }}
                                        multiple
                                        onChange={(e) => {
                                            const files = Array.from(e.target.files);
                                            setForm(prev => ({
                                                ...prev,
                                                businessJustificationDocuments: [
                                                    ...prev.businessJustificationDocuments,
                                                    ...files.map(f => ({ name: f.name, size: f.size, file: f }))
                                                ]
                                            }));
                                            e.target.value = '';
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => justFileRef.current && justFileRef.current.click()}
                                        style={{ alignSelf: 'flex-start', padding: '6px 14px', backgroundColor: '#0d6efd', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.41 17.41a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
                                        Add Document
                                    </button>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                        {form.businessJustificationDocuments.map((doc, idx) => (
                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 8px', backgroundColor: '#f0f4ff', border: '1px solid #c7d9ff', borderRadius: '4px', fontSize: '11px', color: '#333' }}>
                                                {doc.url ? (
                                                    <a href="#" onClick={(e) => { e.preventDefault(); handlePreview(doc.url, doc.name); }} style={{ color: '#0d6efd', textDecoration: 'none', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} onMouseEnter={e => e.target.style.textDecoration = 'underline'} onMouseLeave={e => e.target.style.textDecoration = 'none'}>{doc.name}</a>
                                                ) : (
                                                    <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</span>
                                                )}
                                                <button type="button" onClick={() => setForm(prev => ({ ...prev, businessJustificationDocuments: prev.businessJustificationDocuments.filter((_, i) => i !== idx) }))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0', color: '#dc3545', display: 'flex', alignItems: 'center' }}>
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Proposed Solution Docs */}
                            <div style={{ ...cellStyle, flex: 1, alignItems: 'flex-start' }}>
                                <div style={{ minWidth: '160px', flexShrink: 0 }}></div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                                    <input
                                        type="file"
                                        ref={solFileRef}
                                        style={{ display: 'none' }}
                                        multiple
                                        onChange={(e) => {
                                            const files = Array.from(e.target.files);
                                            setForm(prev => ({
                                                ...prev,
                                                proposedSolutionDocuments: [
                                                    ...prev.proposedSolutionDocuments,
                                                    ...files.map(f => ({ name: f.name, size: f.size, file: f }))
                                                ]
                                            }));
                                            e.target.value = '';
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => solFileRef.current && solFileRef.current.click()}
                                        style={{ alignSelf: 'flex-start', padding: '6px 14px', backgroundColor: '#0d6efd', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.41 17.41a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
                                        Add Document
                                    </button>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                        {form.proposedSolutionDocuments.map((doc, idx) => (
                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 8px', backgroundColor: '#f0f4ff', border: '1px solid #c7d9ff', borderRadius: '4px', fontSize: '11px', color: '#333' }}>
                                                {doc.url ? (
                                                    <a href="#" onClick={(e) => { e.preventDefault(); handlePreview(doc.url, doc.name); }} style={{ color: '#0d6efd', textDecoration: 'none', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} onMouseEnter={e => e.target.style.textDecoration = 'underline'} onMouseLeave={e => e.target.style.textDecoration = 'none'}>{doc.name}</a>
                                                ) : (
                                                    <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</span>
                                                )}
                                                <button type="button" onClick={() => setForm(prev => ({ ...prev, proposedSolutionDocuments: prev.proposedSolutionDocuments.filter((_, i) => i !== idx) }))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0', color: '#dc3545', display: 'flex', alignItems: 'center' }}>
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION C: SOURCE & OWNERSHIP */}
                    <div style={{ border: '1px solid #ddd', borderRadius: '4px', overflow: 'visible', marginBottom: '20px' }}>
                        {/* Section Header */}
                        <div style={{
                            background: '#f8f9fa',
                            borderBottom: '1px solid #dee2e6',
                            padding: '10px 12px',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            color: '#333',
                        }}>
                            Section C: Source & Ownership
                        </div>

                        {/* Row: CR Requestor | CR Client Owner */}
                        <div style={rowStyle(false)}>
                            {/* CR Requestor */}
                            <CRRequestorAutocomplete
                                value={form.crRequestorName ? `${form.crRequestorName} (${form.crRequestorEmail})` : ''}
                                onChange={(val) => {
                                    const opt = rosterOptions.find(o => o.value === val);
                                    setForm(prev => ({ ...prev, crRequestorName: opt?.displayName || '', crRequestorEmail: opt?.email || '', crRequestorRosterId: opt?.id || '' }));
                                    setErrors(prev => ({ ...prev, crRequestorName: undefined }));
                                }}
                                options={rosterOptions}
                                label="CR Requestor"
                                flex={1}
                                required={true}
                                style={{ borderRight: '1px solid #ddd' }}
                                error={errors.crRequestorName ? 'Field Required' : ''}
                            />

                            {/* CR Client Owner */}
                            <CRClientOwnerAutocomplete
                                value={form.crClientOwnerName ? `${form.crClientOwnerName} (${form.crClientOwnerEmail})` : ''}
                                onChange={(val) => {
                                    const opt = clientRosterOptions.find(o => o.value === val);
                                    setForm(prev => ({ ...prev, crClientOwnerName: opt?.displayName || '', crClientOwnerEmail: opt?.email || '' }));
                                    setErrors(prev => ({ ...prev, crClientOwnerName: undefined }));
                                }}
                                options={clientRosterOptions}
                                label="CR Client Owner"
                                flex={1}
                                required={true}
                                style={{ borderRight: '1px solid #ddd' }}
                                error={errors.crClientOwnerName ? 'Field Required' : ''}
                            />

                            {/* Business Owner */}
                            <BusinessOwnerAutocomplete
                                value={form.businessOwnerName ? `${form.businessOwnerName} (${form.businessOwnerEmail})` : ''}
                                onChange={(val) => {
                                    const opt = clientRosterOptions.find(o => o.value === val);
                                    setForm(prev => ({ ...prev, businessOwnerName: opt?.displayName || '', businessOwnerEmail: opt?.email || '' }));
                                    setErrors(prev => ({ ...prev, businessOwnerName: undefined }));
                                }}
                                options={clientRosterOptions}
                                label="Business Owner"
                                flex={1}
                                required={true}
                                error={errors.businessOwnerName ? 'Field Required' : ''}
                            />
                        </div>
                    </div>

                    {/* SECTION D: COST & EFFORT ESTIMATE */}
                    <div style={{ border: '1px solid #ddd', borderRadius: '4px', overflow: 'visible', marginBottom: '20px' }}>
                        <div style={{
                            background: '#f8f9fa',
                            borderBottom: '1px solid #dee2e6',
                            padding: '10px 12px',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            color: '#333',
                        }}>
                            Section D: Cost & Effort Estimate
                        </div>

                        {/* Row 1: Effort | Cost | Schedule Impact */}
                        <div style={rowStyle()}>
                            {/* Effort Estimate */}
                            <div style={{ ...cellStyle, borderRight: '1px solid #ddd', flex: 1.2 }}>
                                <span style={{
                                    minWidth: '160px', maxWidth: '160px',
                                    fontWeight: 'bold', fontSize: '13px', color: '#333',
                                    flexShrink: 0, paddingRight: '12px', paddingTop: '5px',
                                }}>
                                    Effort Estimate
                                </span>
                                <input
                                    type="number"
                                    className="no-spinner"
                                    placeholder="Number"
                                    value={form.effortEstimate}
                                    onChange={handleChange('effortEstimate')}
                                    style={{
                                        flex: 1, padding: '5px 12px',
                                        border: '1px solid #ddd', borderRadius: '4px',
                                        fontSize: '13px', color: '#333',
                                        background: '#fff', outline: 'none',
                                    }}
                                />
                                <span style={{ marginLeft: '8px', fontSize: '13px', color: '#666', fontWeight: 'bold' }}>Hrs</span>
                            </div>

                            {/* Cost Estimate */}
                            <div style={{ ...cellStyle, borderRight: '1px solid #ddd', flex: 1.1, gap: '4px' }}>
                                <span style={{
                                    minWidth: '120px', maxWidth: '120px',
                                    fontWeight: 'bold', fontSize: '13px', color: '#333',
                                    flexShrink: 0, paddingRight: '12px', paddingTop: '5px',
                                }}>
                                    Cost Estimate
                                </span>
                                <input
                                    type="number"
                                    className="no-spinner"
                                    placeholder="Amt"
                                    value={form.costEstimate}
                                    onChange={handleChange('costEstimate')}
                                    style={{
                                        flex: 0, padding: '5px 8px',
                                        border: '1px solid #ddd', borderRadius: '4px',
                                        fontSize: '13px', color: '#333',
                                        background: '#fff', outline: 'none',
                                        width: '180px'
                                    }}
                                />
                                <CurrencyAutocomplete
                                    options={currencyOptions}
                                    value={form.currency}
                                    onChange={(val) => setForm(prev => ({ ...prev, currency: val }))}
                                    flex={1}
                                    minWidth="150px"
                                    style={{ padding: '0px' }}
                                />
                            </div>

                            {/* Schedule Impact */}
                            <div style={{ ...cellStyle, flex: 1.2, gap: '18px' }}>
                                <span style={{
                                    minWidth: '120px', maxWidth: '160px',
                                    fontWeight: 'bold', fontSize: '13px', color: '#333',
                                    flexShrink: 0, paddingRight: '12px', paddingTop: '5px',
                                }}>
                                    Schedule Impact
                                </span>
                                <div className="schedule-impact-container" style={{ position: 'relative' }}>
                                    <div
                                        tabIndex={0}
                                        onMouseDown={(e) => { e.preventDefault(); setIsScheduleImpactOpen(!isScheduleImpactOpen); }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Tab') {
                                                setIsScheduleImpactOpen(false);
                                                return;
                                            }
                                            handleScheduleImpactKeyDown(e);
                                        }}
                                        onKeyUp={(e) => {
                                            if (e.key === 'Tab') {
                                                setIsScheduleImpactOpen(true);
                                                setSchedImpactHighlight(0);
                                            }
                                        }}
                                        onBlur={() => setTimeout(() => setIsScheduleImpactOpen(false), 150)}
                                        style={{
                                            padding: '5px 4px',
                                            border: `1px solid ${errors.scheduleImpact ? '#dc3545' : '#ddd'}`, borderRadius: '4px',
                                            fontSize: '13px', color: '#333',
                                            background: '#fff',
                                            width: '60px',
                                            cursor: 'pointer',
                                            boxSizing: 'border-box',
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            outline: 'none'
                                        }}
                                    >
                                        <span>{form.scheduleImpact || 'No'}</span>
                                        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ marginLeft: '4px' }}>
                                            <path d="M1 1L5 5L9 1" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                    {isScheduleImpactOpen && (
                                        <div style={{
                                            position: 'absolute', top: '100%', left: 0,
                                            background: '#fff', border: '1px solid #ddd',
                                            borderRadius: '4px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                            zIndex: 1000, marginTop: '2px', minWidth: '100%'
                                        }}>
                                            {['No', 'Yes'].map((opt, index) => (
                                                <div
                                                    key={opt}
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        setForm(prev => ({ ...prev, scheduleImpact: opt }));
                                                        setIsScheduleImpactOpen(false);
                                                    }}
                                                    style={{
                                                        padding: '8px 12px', cursor: 'pointer', fontSize: '13px',
                                                        background: schedImpactHighlight === index ? '#cce5ff' : (form.scheduleImpact === opt ? '#e3f2fd' : '#fff')
                                                    }}
                                                    onMouseEnter={() => setSchedImpactHighlight(index)}
                                                    onMouseLeave={() => setSchedImpactHighlight(-1)}
                                                >
                                                    {opt}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <input
                                    type="text"
                                    placeholder="Details..."
                                    value={form.scheduleImpactExplanation}
                                    onChange={handleChange('scheduleImpactExplanation')}
                                    disabled={form.scheduleImpact === 'No'}
                                    style={{
                                        flex: 1, padding: '5px 12px',
                                        border: '1px solid #ddd', borderRadius: '4px',
                                        fontSize: '13px', color: '#333',
                                        background: form.scheduleImpact === 'No' ? '#f5f5f5' : '#fff',
                                        outline: 'none',
                                    }}
                                />
                            </div>
                        </div>

                        {/* Row 2: RICEW Impacted? | RICEW ID | RICEW Name */}
                        <div style={rowStyle(false)}>
                            {/* RICEW Impacted? */}
                            <div style={{ ...cellStyle, borderRight: '1px solid #ddd', flex: 1.2 }}>
                                <span style={{
                                    minWidth: '160px', maxWidth: '160px',
                                    fontWeight: 'bold', fontSize: '13px', color: '#333',
                                    flexShrink: 0, paddingRight: '12px', paddingTop: '5px',
                                    whiteSpace: 'nowrap'
                                }}>
                                    RICEW Impacted?
                                </span>
                                <RicewImpactedAutocomplete
                                    value={form.ricewImpacted}
                                    onChange={(val) => {
                                        setForm(prev => ({
                                            ...prev,
                                            ricewImpacted: val,
                                            ricewId: val === 'No' ? '' : prev.ricewId,
                                            ricewName: val === 'No' ? '' : prev.ricewName,
                                        }));
                                    }}
                                    flex={1}
                                    style={{ padding: '0px' }}
                                />
                            </div>

                            {/* RICEW ID */}
                            <div style={{ ...cellStyle, borderRight: '1px solid #ddd', flex: 1.1 }}>
                                <span style={{
                                    minWidth: '120px', maxWidth: '120px',
                                    fontWeight: 'bold', fontSize: '13px', color: '#333',
                                    flexShrink: 0, paddingRight: '12px', paddingTop: '5px',
                                    whiteSpace: 'nowrap'
                                }}>
                                    RICEW ID {form.ricewImpacted === 'Yes' && <span style={{ color: 'red' }}>*</span>}
                                </span>
                                <RicewIdAutocomplete
                                    value={form.ricewId}
                                    onChange={(val) => {
                                        const selectedRicew = ricewData.find(item => item.RICE_ID === val);
                                        setForm(prev => ({
                                            ...prev,
                                            ricewId: val,
                                            ricewName: selectedRicew ? selectedRicew.RICE_NAME : ''
                                        }));
                                    }}
                                    options={ricewOptions}
                                    disabled={form.ricewImpacted === 'No'}
                                    placeholder={form.ricewImpacted === 'No' ? 'N/A' : 'Select...'}
                                    error={errors.ricewId ? 'Field Required' : ''}
                                />
                            </div>

                            {/* RICEW Name */}
                            <div style={{ ...cellStyle, flex: 1.2 }}>
                                <span style={{
                                    minWidth: '130px', maxWidth: '130px',
                                    fontWeight: 'bold', fontSize: '13px', color: '#333',
                                    flexShrink: 0, paddingRight: '12px', paddingTop: '5px',
                                }}>
                                    RICEW Name
                                </span>
                                <input
                                    type="text"
                                    readOnly
                                    placeholder="Auto-fill"
                                    value={form.ricewName}
                                    style={{
                                        flex: 1,
                                        padding: '5px 12px',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        fontSize: '13px',
                                        color: form.ricewImpacted === 'No' ? '#666' : '#333',
                                        background: form.ricewImpacted === 'No' ? '#f5f5f5' : '#fff',
                                        outline: 'none',
                                        cursor: form.ricewImpacted === 'No' ? 'not-allowed' : 'default',
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECTION E: APPROVAL TRACKING */}
                    <div style={{ border: '1px solid #ddd', borderRadius: '4px', overflow: 'visible', marginBottom: '20px' }}>
                        <div style={{
                            background: '#f8f9fa',
                            borderBottom: '1px solid #dee2e6',
                            padding: '10px 12px',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            color: '#333',
                        }}>
                            Section E: Approval Tracking
                        </div>

                        {/* Row 1: Approval Status | Approved By | Approval Date */}
                        <div style={rowStyle()}>
                            {/* Approval Status */}
                            <ApprovalStatusAutocomplete
                                value={form.approvalStatus}
                                onChange={(val) => setForm(prev => {
                                    const raw = prev.rawBackendData;
                                    let rejectionReason = prev.rejectionReason;
                                    if (raw) {
                                        if (val === 'More Information Needed') {
                                            rejectionReason = raw.Request_Reason || '';
                                        } else if (val === 'Rejected') {
                                            rejectionReason = raw.Change_Rejection_Reason || raw.Change_Rejected_Reason || '';
                                        }
                                    }
                                    return { ...prev, approvalStatus: val, rejectionReason };
                                })}
                                label="Approval Status"
                                flex={1.2}
                                style={{ borderRight: '1px solid #ddd' }}
                            />

                            {/* Approved By */}
                            <div style={{ ...cellStyle, borderRight: '1px solid #ddd', flex: 1.1, position: 'relative' }} className="approved-by-container">
                                <span style={{
                                    minWidth: '120px', maxWidth: '120px',
                                    fontWeight: 'bold', fontSize: '13px', color: '#333',
                                    flexShrink: 0, paddingRight: '12px', paddingTop: '5px',
                                }}>
                                    Approved By
                                </span>
                                <div style={{ flex: 1 }}>
                                    <input
                                        type="text"
                                        readOnly
                                        placeholder="Auto-fill"
                                        value={form.approvedBy}
                                        style={{
                                            flex: 1, padding: '5px 12px',
                                            border: '1px solid #ddd', borderRadius: '4px',
                                            fontSize: '13px', color: '#333',
                                            background: '#f5f5f5', outline: 'none',
                                            width: '100%', boxSizing: 'border-box',
                                            cursor: 'default'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Approval Date */}
                            <div style={{ ...cellStyle, flex: 1.2 }}>
                                <span style={{
                                    minWidth: '160px', maxWidth: '160px',
                                    fontWeight: 'bold', fontSize: '13px', color: '#333',
                                    flexShrink: 0, paddingRight: '12px', paddingTop: '5px',
                                }}>
                                    Approval Date
                                </span>
                                <input
                                    type="text"
                                    readOnly
                                    placeholder="N/A"
                                    value={(() => {
                                        if (!form.approvalDate) return '';
                                        const date = new Date(form.approvalDate);
                                        if (isNaN(date.getTime())) return form.approvalDate;
                                        const day = date.getDate().toString().padStart(2, '0');
                                        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
                                        return `${day}-${months[date.getMonth()]}-${date.getFullYear()}`;
                                    })()}
                                    style={{
                                        flex: 1, padding: '5px 8px',
                                        border: '1px solid #ddd', borderRadius: '4px',
                                        fontSize: '13px', color: '#333',
                                        background: '#f5f5f5', outline: 'none',
                                        cursor: 'default'
                                    }}
                                />
                            </div>
                        </div>

                        {/* Row 2: Rejection Reason | Aging */}
                        <div style={rowStyle(false)}>
                            {/* Rejection Reason */}
                            <div style={{ ...cellStyle, borderRight: '1px solid #ddd', flex: 2.37 }}>
                                <span style={{
                                    minWidth: '160px', maxWidth: '160px',
                                    fontWeight: 'bold', fontSize: '13px', color: '#333',
                                    flexShrink: 0, paddingRight: '12px', paddingTop: '5px',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {(form.approvalStatus === 'Rejected' || form.approvalStatus === 'More Information Needed') ? (form.approvalStatus === 'Rejected' ? 'Rejection Reason' : 'Request Reason') : 'Reason'} {(form.approvalStatus === 'Rejected' || form.approvalStatus === 'More Information Needed') && <span style={{ color: 'red' }}>*</span>}
                                </span>
                                <input
                                    type="text"
                                    placeholder={(form.approvalStatus === 'Rejected' || form.approvalStatus === 'More Information Needed') ? (form.approvalStatus === 'Rejected' ? 'Rejection reason' : 'Request reason') : 'N/A'}
                                    value={(form.approvalStatus === 'Rejected' || form.approvalStatus === 'More Information Needed') ? form.rejectionReason : ''}
                                    onChange={handleChange('rejectionReason')}
                                    disabled={true}
                                    style={{
                                        flex: 1, padding: '5px 12px',
                                        border: `1px solid ${errors.rejectionReason ? '#dc3545' : '#ddd'}`, borderRadius: '4px',
                                        fontSize: '13px', color: '#333',
                                        background: '#f5f5f5',
                                        outline: 'none',
                                    }}
                                />
                                {errors.rejectionReason && <div data-error-field="true" style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: '500', lineHeight: '1.3', wordWrap: 'break-word' }}>{errors.rejectionReason}</div>}
                            </div>

                            {/* Aging */}
                            <div style={{ ...cellStyle, flex: 1.2 }}>
                                <span style={{
                                    minWidth: '160px', maxWidth: '160px',
                                    fontWeight: 'bold', fontSize: '13px', color: '#333',
                                    flexShrink: 0, paddingRight: '12px', paddingTop: '5px',
                                }}>
                                    Aging
                                </span>
                                <input
                                    type="text"
                                    readOnly
                                    value={form.aging ? `${form.aging} ${parseInt(form.aging) === 1 ? 'Day' : 'Days'}` : ''}
                                    style={{
                                        flex: 1, padding: '5px 12px',
                                        border: '1px solid #ddd', borderRadius: '4px',
                                        fontSize: '13px', color: '#333',
                                        background: '#f5f5f5', outline: 'none',
                                        fontWeight: 'bold',
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                        {/* Print Button */}
                        <button
                            onClick={() => setShowPrintReport(true)}
                            style={{
                                padding: '8px 20px',
                                backgroundColor: '#4D5C74',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: '600',
                                transition: 'background-color 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '7px',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#3d4a5c'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#4D5C74'; }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
                            </svg>
                            Print Change Request
                        </button>

                        {/* Clear Button (Renamed from Cancel) */}
                        <button
                            onClick={handleClear}
                            style={{
                                padding: '8px 20px',
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: '600',
                                transition: 'background-color 0.2s',
                            }}
                            onMouseEnter={(e) => { e.target.style.backgroundColor = '#c82333'; }}
                            onMouseLeave={(e) => { e.target.style.backgroundColor = '#dc3545'; }}
                        >
                            Clear
                        </button>

                        {/* Save Draft Button */}
                        <button
                            onClick={() => handleFormSubmit(true)}
                            disabled={isSubmitting}
                            style={{
                                padding: '8px 20px',
                                backgroundColor: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                fontSize: '13px',
                                fontWeight: '600',
                                opacity: isSubmitting ? 0.7 : 1,
                                transition: 'background-color 0.2s',
                            }}
                            onMouseEnter={(e) => { if (!isSubmitting) e.target.style.backgroundColor = '#0069d9'; }}
                            onMouseLeave={(e) => { if (!isSubmitting) e.target.style.backgroundColor = '#007bff'; }}
                        >
                            Save Draft
                        </button>

                        {/* Submit Button */}
                        <button
                            onClick={() => {
                                if (id) {
                                    setShowUpdateConfirm(true);
                                } else {
                                    handleFormSubmit(false, true);
                                }
                            }}
                            disabled={isSubmitting}
                            style={{
                                padding: '8px 20px',
                                backgroundColor: '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                fontSize: '13px',
                                fontWeight: '600',
                                opacity: isSubmitting ? 0.7 : 1,
                                transition: 'background-color 0.2s',
                            }}
                            onMouseEnter={(e) => { if (!isSubmitting) e.target.style.backgroundColor = '#218838'; }}
                            onMouseLeave={(e) => { if (!isSubmitting) e.target.style.backgroundColor = '#28a745'; }}
                        >
                            {isSubmitting ? (id ? 'Updating...' : 'Submitting...') : 'Submit'}
                        </button>
                    </div>

                </div>
            </div>

            {/* Update Confirmation Modal */}
            {showUpdateConfirm && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', zIndex: 10005, animation: 'fadeIn 0.2s ease'
                }}>
                    <div style={{
                        width: '480px', backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '6px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.18)', overflow: 'hidden',
                        animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}>
                        {/* Modal Header — matches page brand color #4D5C74 */}
                        <div style={{
                            padding: '12px 16px', borderBottom: '1px solid #3d4a5c',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            background: '#4D5C74'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#fff', letterSpacing: '0.5px' }}>Save Confirmation</h3>
                            </div>
                            <button
                                onClick={() => setShowUpdateConfirm(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.75)', lineHeight: 1, padding: '2px 4px', fontSize: '18px', display: 'flex', alignItems: 'center' }}
                                onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.75)'}
                                title="Close"
                            >&#x2715;</button>
                        </div>
                        {/* Modal Body */}
                        <div style={{ padding: '28px 24px 20px', color: '#333', fontSize: '14px', lineHeight: '1.7', textAlign: 'center', background: '#fff' }}>
                            <div style={{ marginBottom: '8px', color: '#555' }}>Your changes are ready to be saved.</div>
                            <div style={{ fontWeight: '600', color: '#333' }}>Would you like to notify stakeholders about this update?</div>
                        </div>
                        {/* Modal Footer — matches section footer style */}
                        <div style={{
                            padding: '14px 24px', borderTop: '1px solid #dee2e6', display: 'flex',
                            justifyContent: 'center', gap: '10px', background: '#f8f9fa'
                        }}>
                            <button
                                onClick={() => { setShowUpdateConfirm(false); handleFormSubmit(false, true); }}
                                style={{
                                    padding: '7px 18px', backgroundColor: '#28a745', color: 'white',
                                    border: 'none', borderRadius: '4px', cursor: 'pointer',
                                    fontWeight: '600', fontSize: '13px', transition: 'background-color 0.2s',
                                    display: 'flex', alignItems: 'center', gap: '7px'
                                }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#218838'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#28a745'}
                            >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-5.27 4a2 2 0 0 1-3.46 0"></path></svg>
                                Update and Notify
                            </button>
                            <button
                                onClick={() => setShowUpdateConfirm(false)}
                                style={{
                                    padding: '7px 18px', backgroundColor: '#dc3545', color: 'white',
                                    border: 'none', borderRadius: '4px', cursor: 'pointer',
                                    fontWeight: '600', fontSize: '13px', transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#c82333'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#dc3545'}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}


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
                                        The <strong>Change Request Form</strong> is used to formally log and track a scope or process change request for the ERP project. It captures all details required for review and approval — including the change type, business impact, priority, affected workstream, and approval status.
                                    </p>
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>Why is this used?</strong>
                                    <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                                        Uncontrolled scope changes are one of the biggest risks to ERP delivery. This form ensures every change is formally documented, assessed for impact, assigned an owner, and reviewed through the appropriate approval process before any work begins.
                                    </p>
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>Key fields</strong>
                                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                        <li><strong>Change Request Title</strong> — A short, descriptive name for the change (required).</li>
                                        <li><strong>Change Type / Category / Sub-Category</strong> — Classification of the nature of the change.</li>
                                        <li><strong>Stream / Application / Module</strong> — The ERP workstream or technical area affected by the change.</li>
                                        <li><strong>Project Phase</strong> — The delivery phase during which this change is being raised.</li>
                                        <li><strong>Priority</strong> — Business priority level assigned to the change request.</li>
                                        <li><strong>Impact Area</strong> — The functional or technical areas impacted by this change.</li>
                                        <li><strong>RICEW Impacted / RICEW ID</strong> — Whether an existing RICEW object is affected and which one.</li>
                                        <li><strong>Requestor / Business Owner / Client Owner</strong> — Who is requesting and who owns the change.</li>
                                        <li><strong>Approval Status</strong> — The current state of the change request in the approval workflow.</li>
                                        <li><strong>Cost / Currency</strong> — Estimated cost impact of implementing the change if applicable.</li>
                                        <li><strong>Description / Justification</strong> — Detailed explanation of the change and its business justification.</li>
                                    </ul>
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to use this page</strong>
                                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                        <li>Fill in the required fields and any available optional fields, then click <strong>Submit</strong> to raise the change request.</li>
                                        <li>When editing an existing record, click <strong>Update</strong> to save changes.</li>
                                        <li>Click <strong>Clear</strong> to reset all fields — a confirmation will appear before clearing.</li>
                                        <li>Supporting documents or evidence can be attached using the document upload section if available.</li>
                                    </ul>
                                </div>

                                <div style={{ marginBottom: '4px' }}>
                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>Important notes</strong>
                                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                        <li><strong>Change Request Title</strong> is required to submit the form.</li>
                                        <li>Once submitted, the record appears in the Change Request Dashboard where it can be filtered and monitored.</li>
                                        <li>The Approval Status field tracks where the change is in the governance process — update it as approvals are received.</li>
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
            {showPrintReport && (
                <ChangeRequestPrintReport
                    form={form}
                    linkMaps={linkMaps}
                    onClose={() => setShowPrintReport(false)}
                    onUploadPdf={handlePrintPdfUpload}
                />
            )}
            {pendingPdfUpload && (
                <ChangeRequestPrintReport
                    form={form}
                    linkMaps={linkMaps}
                    onClose={() => {}}
                    autoUpload={true}
                    onUploadPdf={handlePrintPdfUpload}
                    onAutoUploadComplete={async () => {
                        setPendingPdfUpload(false);
                        await fetchRecordDetails(true);
                    }}
                />
            )}
        </div>
    );
};

export default ChangeRequestForm;
