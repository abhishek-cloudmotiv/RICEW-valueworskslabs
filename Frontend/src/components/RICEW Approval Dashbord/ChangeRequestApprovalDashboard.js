import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { MoreVertical, Save, X, Loader2, ChevronDown, AlertCircle, HelpCircle } from 'lucide-react';
import DOMPurify from 'dompurify';
import { getIdToken } from '../../utils/cognito-auth';
import { changeRequestSubmitApiClient } from '../RICEW Request/Change Request/ChangeRequestClient';

const ChangeRequestApprovalDashboard = ({ onClose, onBackToLanding, onLogout, selectedProject }) => {
    const navigate = useNavigate();
    const [showNoProjectSelectedPopup, setShowNoProjectSelectedPopup] = useState(false);
    const [showHelpPopup, setShowHelpPopup] = useState(false);
    const helpPopupRef = useRef(null);

    const projectId = localStorage.getItem('project_id') || selectedProject?.id;

    useEffect(() => {
        if (!projectId) {
            setShowNoProjectSelectedPopup(true);
        }
    }, [projectId]);

    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showErrorMessage, setShowErrorMessage] = useState(false);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const [filteredData, setFilteredData] = useState([]);
    const [tableSearchText, setTableSearchText] = useState('');
    const [searchError, setSearchError] = useState('');
    const [selectedRows, setSelectedRows] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    // Confirmation Dialog State
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [confirmMessage, setConfirmMessage] = useState('');
    const [confirmAction, setConfirmAction] = useState(null);

    const displayedData = filteredData.filter(item => {
        if (!tableSearchText.trim()) return true;
        const searchTerm = tableSearchText.toLowerCase();
        const title = (item.Change_Request_Title || '').toLowerCase();
        const idStr = (item.Change_Request_Display_id || '').toLowerCase();
        return title.includes(searchTerm) || idStr.includes(searchTerm);
    });

    useEffect(() => {
        if (displayedData.length > 0 && selectedRows.length === displayedData.length) {
            setSelectAll(true);
        } else {
            setSelectAll(false);
        }
    }, [selectedRows, displayedData]);

    useEffect(() => {
        if (projectId) {
            fetchPendingApprovals();
        }
    }, [projectId]);

    const fetchPendingApprovals = async () => {
        setLoading(true);
        try {
            // Using the specific API endpoint for submitted records
            const response = await changeRequestSubmitApiClient.get(`/ChangeRequestApprovalDashboard/getSubmittedRecords?projectId=${projectId}`);
            if (response.success && response.data) {
                const sorted = response.data.sort((a, b) => {
                    const idA = parseInt(a.Change_Request_Form_id || 0);
                    const idB = parseInt(b.Change_Request_Form_id || 0);
                    return idB - idA;
                });
                setFilteredData(sorted);
            } else {
                setFilteredData([]);
            }
        } catch (error) {
            console.error('Error fetching pending approvals:', error);
            setErrorMessage('Failed to fetch pending approval records.');
            setShowErrorMessage(true);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAll = (e) => {
        const isChecked = e.target.checked;
        setSelectAll(isChecked);
        if (isChecked) {
            setSelectedRows(displayedData.map(item => item.Change_Request_Form_id));
        } else {
            setSelectedRows([]);
        }
    };

    const handleSelectRow = (id) => {
        setSelectedRows(prev => {
            if (prev.includes(id)) {
                return prev.filter(item => item !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    const showConfirmation = (message, action) => {
        setConfirmMessage(message);
        setConfirmAction(() => action);
        setShowConfirmDialog(true);
    };

    const handleMassAction = async (newStatus) => {
        if (selectedRows.length === 0) {
            setErrorMessage(`Please select at least one record to ${newStatus === 'Approved' ? 'approve' : 'reject'}.`);
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 5000);
            return;
        }

        showConfirmation(
            `Are you sure you want to ${newStatus === 'Approved' ? 'approve' : 'reject'} ${selectedRows.length} ${selectedRows.length === 1 ? 'record' : 'records'}?`,
            async () => {
                setIsUpdatingStatus(true);
                try {
                    const updates = selectedRows.map(id => {
                        const record = filteredData.find(item => item.Change_Request_Form_id === id);
                        return {
                            Change_Request_Form_id: id,
                            Project_id: projectId,
                            Change_Approval_Status: newStatus,
                            Change_Rejection_Reason: '' 
                        };
                    });

                    const response = await changeRequestSubmitApiClient.post('/ChangeRequestApprovalDashboard/updateStatus', {
                        updates,
                        updated_by: 'Dashboard Manager'
                    });

                    if (response.success) {
                        setSuccessMessage(`Successfully ${newStatus === 'Approved' ? 'approved' : 'rejected'} ${selectedRows.length} records.`);
                        setShowSuccessMessage(true);
                        setSelectedRows([]);
                        fetchPendingApprovals();
                        setTimeout(() => setShowSuccessMessage(false), 3000);
                    } else {
                        setErrorMessage(response.error || `Failed to ${newStatus === 'Approved' ? 'approve' : 'reject'} records.`);
                        setShowErrorMessage(true);
                        setTimeout(() => setShowErrorMessage(false), 5000);
                    }
                } catch (error) {
                    console.error(`Error during mass ${newStatus}:`, error);
                    setErrorMessage(`An error occurred during mass ${newStatus === 'Approved' ? 'approval' : 'rejection'}.`);
                    setShowErrorMessage(true);
                } finally {
                    setIsUpdatingStatus(false);
                }
            }
        );
    };

    const handleSearchChange = (value) => {
        if (value.length > 100) {
            setSearchError('Search text cannot exceed 100 characters');
            return;
        }
        setTableSearchText(value);
        setSearchError('');
    };

    const [maxWidth, setMaxWidth] = useState('1400px');
    const [marginRight, setMarginRight] = useState('0px');

    useEffect(() => {
        const handleZoomChange = () => {
            const zoomLevel = Math.round((window.outerWidth / window.innerWidth) * 100);
            if (zoomLevel <= 60) {
                setMaxWidth('2400px');
                setMarginRight('80px');
            } else if (zoomLevel <= 80) {
                setMaxWidth('1800px');
                setMarginRight('50px');
            } else {
                setMaxWidth('1500px');
                setMarginRight('0px');
            }
        };
        window.addEventListener('resize', handleZoomChange);
        handleZoomChange();
        return () => window.removeEventListener('resize', handleZoomChange);
    }, []);

    const handleViewDetails = (item) => {
        localStorage.setItem('changeRequestFormData', JSON.stringify(item));
        navigate(`/dashboard/change-request-form/edit/${item.Change_Request_Form_id}?from=approval`);
    };

    return (
        <div className="config-main" style={{ minHeight: '80vh', width: 'calc(98% - 2rem)', margin: '2rem auto', marginLeft: '2rem', marginRight: '2rem', paddingBottom: '10px', overflowY: 'visible' }}>
            <div className="dashboard-content" style={{ width: '100%', maxWidth: 'none', margin: '0', padding: '0' }}>

                {/* Project Info */}
                <div style={{ padding: '2rem 1rem 1rem 2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>
                            Project : <span style={{ color: '#007bff' }}>{DOMPurify.sanitize(localStorage.getItem('project_name') || selectedProject?.name || 'N/A', { ALLOWED_TAGS: [] })}</span>
                        </h3>
                    </div>
                </div>

                <div className="config-header" style={{
                    marginTop: '0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 2rem'
                }}>
                    <h2 style={{ margin: 0 }}>Change Request Approval Dashboard</h2>

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
                    </div>
                </div>

                {/* Search and Action Section */}
                <div style={{
                    padding: '1rem 1rem 1rem 2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'white',
                    borderTop: '1px solid #f0f0f0'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontSize: '14px', color: '#495057', fontWeight: '600' }}>Search Results :</span>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '10px', color: '#666', pointerEvents: 'none' }}>
                                <circle cx="11" cy="11" r="8" />
                                <path d="m21 21-4.35-4.35" />
                            </svg>
                            <input
                                type="text"
                                value={tableSearchText}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                placeholder="Search by CR ID or Title..."
                                style={{ padding: '8px 12px 8px 32px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', width: '250px', outline: 'none' }}
                            />
                        </div>
                        {searchError && (
                            <div style={{ color: '#dc2626', fontSize: '14px', fontWeight: '500', padding: '8px 12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '4px' }}>
                                {DOMPurify.sanitize(searchError, { ALLOWED_TAGS: [] })}
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                            onClick={() => handleMassAction('Rejected')}
                            disabled={isUpdatingStatus}
                            style={{
                                padding: '8px 20px',
                                backgroundColor: isUpdatingStatus ? '#f8d7da' : '#dc3545',
                                color: isUpdatingStatus ? '#721c24' : 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: isUpdatingStatus ? 'not-allowed' : 'pointer',
                                fontSize: '13px',
                                fontWeight: '600',
                                transition: 'background-color 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                            onMouseEnter={(e) => { if (!isUpdatingStatus) e.target.style.backgroundColor = '#c82333'; }}
                            onMouseLeave={(e) => { if (!isUpdatingStatus) e.target.style.backgroundColor = '#dc3545'; }}
                        >
                            {isUpdatingStatus && <Loader2 size={14} className="animate-spin" />}
                            Reject
                        </button>
                        <button
                            onClick={() => handleMassAction('Approved')}
                            disabled={isUpdatingStatus}
                            style={{
                                padding: '8px 20px',
                                backgroundColor: isUpdatingStatus ? '#d4edda' : '#28a745',
                                color: isUpdatingStatus ? '#155724' : 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: isUpdatingStatus ? 'not-allowed' : 'pointer',
                                fontSize: '13px',
                                fontWeight: '600',
                                transition: 'background-color 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                            onMouseEnter={(e) => { if (!isUpdatingStatus) e.target.style.backgroundColor = '#218838'; }}
                            onMouseLeave={(e) => { if (!isUpdatingStatus) e.target.style.backgroundColor = '#28a745'; }}
                        >
                            {isUpdatingStatus && <Loader2 size={14} className="animate-spin" />}
                            Approve
                        </button>
                    </div>
                </div>

                {/* Unified Scrollable Table Container */}
                <div style={{ backgroundColor: '#f8f9fa', overflowX: 'auto', width: '100%', boxSizing: 'border-box' }}>
                    <div style={{ minWidth: '1600px', boxSizing: 'border-box' }}>
                        {/* Table Header Row */}
                        <div style={{ display: 'flex', borderBottom: '1px solid #ddd', borderTop: '1px solid #ddd', backgroundColor: '#f8f9fa' }}>
                            <div style={{ width: '100px', padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', textAlign: 'left' }}>CR ID</div>
                            <div style={{ flex: 1, minWidth: '220px', padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd' }}>Change Request Title</div>
                            <div style={{ width: '120px', padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd' }}>Type</div>
                            <div style={{ width: '140px', padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', textAlign: 'center' }}>Status</div>
                            <div style={{ width: '140px', padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd' }}>Stream</div>
                            <div style={{ width: '130px', padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', textAlign: 'center' }}>Effort (Hours)</div>
                            <div style={{ width: '150px', padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', textAlign: 'center' }}>Cost (Currency)</div>
                            <div style={{ width: '160px', padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd' }}>Requestor</div>
                            <div style={{ width: '160px', padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd' }}>CR Client Owner</div>
                            <div style={{ width: '160px', padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd' }}>Business Owner</div>
                            <div style={{
                                width: '80px',
                                padding: '12px 12px',
                                fontWeight: 'bold',
                                fontSize: '14px',
                                color: '#333',
                                textAlign: 'center',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                                <div style={{ lineHeight: '1.2', whiteSpace: 'nowrap' }}>Select</div>
                                <input
                                    type="checkbox"
                                    checked={selectAll}
                                    onChange={handleSelectAll}
                                    style={{ cursor: 'pointer', width: '18px', height: '18px', marginTop: '2px' }}
                                    title="Select All"
                                />
                            </div>
                        </div>

                        {/* Table Body Rows */}
                        {loading ? (
                            <div style={{ padding: '40px', textAlign: 'center', backgroundColor: 'white' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                    <Loader2 className="animate-spin" size={30} color="#3b82f6" />
                                    <span style={{ color: '#6b7280' }}>Loading pending approvals...</span>
                                </div>
                            </div>
                        ) : displayedData.length > 0 ? (
                            displayedData.map((item, index) => {
                                const rowBgColor = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
                                const sanitizedDisplayId = DOMPurify.sanitize(item.Change_Request_Display_id || '-', { ALLOWED_TAGS: [] });
                                const sanitizedTitle = DOMPurify.sanitize(item.Change_Request_Title || 'Untitled', { ALLOWED_TAGS: [] });
                                const sanitizedType = DOMPurify.sanitize(item.Change_Request_Change_Type || '-', { ALLOWED_TAGS: [] });
                                const sanitizedStatus = DOMPurify.sanitize(item.Change_Approval_Status || 'SUBMITTED', { ALLOWED_TAGS: [] });
                                const sanitizedStream = DOMPurify.sanitize(item.Change_Request_Stream || '-', { ALLOWED_TAGS: [] });
                                const sanitizedEffort = DOMPurify.sanitize(String(item.Change_Effort_Estimate_Hours || '-'), { ALLOWED_TAGS: [] });
                                const sanitizedCost = item.Change_Cost_Estimate_Amount ? `${DOMPurify.sanitize(String(item.Change_Cost_Estimate_Amount) || '', { ALLOWED_TAGS: [] })} ${DOMPurify.sanitize(item.Change_Cost_Estimate_Currency || '', { ALLOWED_TAGS: [] })}` : '-';
                                const sanitizedRequestorName = DOMPurify.sanitize(item.CR_Requestor_name || '-', { ALLOWED_TAGS: [] });
                                const sanitizedClientOwnerName = DOMPurify.sanitize(item.CR_Client_Owner_name || '-', { ALLOWED_TAGS: [] });
                                const sanitizedBusinessOwnerName = DOMPurify.sanitize(item.Change_Business_Owner_name || '-', { ALLOWED_TAGS: [] });

                                return (
                                    <div key={item.Change_Request_Form_id || index} style={{ display: 'flex', backgroundColor: rowBgColor, borderBottom: '1px solid #ddd' }}>
                                        <div style={{ width: '100px', padding: '12px 12px', fontSize: '13px', color: '#333', borderRight: '1px solid #ddd', fontWeight: '600' }}>
                                            {sanitizedDisplayId}
                                        </div>
                                        <div
                                            style={{ flex: 1, minWidth: '220px', padding: '12px 12px', fontSize: '13px', color: '#3b82f6', borderRight: '1px solid #ddd', fontWeight: '500', cursor: 'pointer' }}
                                            onClick={() => handleViewDetails(item)}
                                            onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                            onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                                        >
                                            {sanitizedTitle}
                                        </div>
                                        <div style={{ width: '120px', padding: '12px 12px', fontSize: '13px', color: '#333', borderRight: '1px solid #ddd' }}>
                                            {sanitizedType}
                                        </div>
                                        <div style={{ width: '140px', padding: '12px 12px', fontSize: '13px', color: '#333', borderRight: '1px solid #ddd', textAlign: 'center' }}>
                                            <span style={{
                                                padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700',
                                                backgroundColor: '#dbeafe', color: '#1e40af', border: '1px solid #bfdbfe'
                                            }}>
                                                {sanitizedStatus}
                                            </span>
                                        </div>
                                        <div style={{ width: '140px', padding: '12px 12px', fontSize: '13px', color: '#333', borderRight: '1px solid #ddd' }}>
                                            {sanitizedStream}
                                        </div>
                                        <div style={{ width: '130px', padding: '12px 12px', fontSize: '13px', color: '#333', borderRight: '1px solid #ddd', textAlign: 'center' }}>
                                            {sanitizedEffort}
                                        </div>
                                        <div style={{ width: '150px', padding: '12px 12px', fontSize: '13px', color: '#333', borderRight: '1px solid #ddd', textAlign: 'center' }}>
                                            {sanitizedCost}
                                        </div>
                                        <div style={{ width: '160px', padding: '12px 12px', fontSize: '13px', color: '#333', borderRight: '1px solid #ddd' }}>
                                            {sanitizedRequestorName}
                                        </div>
                                        <div style={{ width: '160px', padding: '12px 12px', fontSize: '13px', color: '#333', borderRight: '1px solid #ddd' }}>
                                            {sanitizedClientOwnerName}
                                        </div>
                                        <div style={{ width: '160px', padding: '12px 12px', fontSize: '13px', color: '#333', borderRight: '1px solid #ddd' }}>
                                            {sanitizedBusinessOwnerName}
                                        </div>
                                        <div style={{ width: '80px', padding: '8px 12px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedRows.includes(item.Change_Request_Form_id)}
                                                onChange={() => handleSelectRow(item.Change_Request_Form_id)}
                                                style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                                            />
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div style={{ padding: '40px', textAlign: 'center', color: '#666', fontSize: '14px', backgroundColor: 'white' }}>
                                No pending approval records found.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Help Modal Overlay */}
            {showHelpPopup && (
                <div style={{
                    position: 'fixed', top: '0', left: '0', right: '0', bottom: '0',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', zIndex: 30000, padding: '20px'
                }}>
                    <div ref={helpPopupRef} style={{
                        backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                        width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', position: 'relative'
                    }}>
                        <div style={{ overflowY: 'auto', padding: '32px', textAlign: 'left', flex: '1' }}>
                            <button onClick={() => setShowHelpPopup(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545' }}>
                                <X size={20} />
                            </button>
                            <h3 style={{ margin: '0 0 16px 0', color: '#333', fontSize: '18px', fontWeight: '600' }}>Change Request Approval Dashboard Help</h3>
                            <div style={{ color: '#444', fontSize: '14px', lineHeight: '1.6' }}>
                                <div style={{ marginBottom: '16px' }}>
                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>What is this page?</strong>
                                    <p style={{ margin: '6px 0 0 0', color: '#555' }}>The <strong>Change Request Approval Dashboard</strong> lets you review and manage pending Change Requests for the selected project.</p>
                                </div>
                                <div style={{ marginBottom: '16px' }}>
                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>Understanding the columns</strong>
                                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                        <li><strong>CR ID</strong> — The unique identifier for the Change Request.</li>
                                        <li><strong>Change Request Title</strong> — Click to view full request details.</li>
                                        <li><strong>Type</strong> — The category of change (e.g., Enhancement, Bug Fix).</li>
                                        <li><strong>Status</strong> — Current approval state.</li>
                                        <li><strong>Effort (Hours)</strong> — Estimated workload.</li>
                                        <li><strong>Cost</strong> — Estimated financial impact.</li>
                                    </ul>
                                </div>
                                <div style={{ marginBottom: '16px' }}>
                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to make changes</strong>
                                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                        <li>Select the checkbox for one or more records.</li>
                                        <li>Click <strong>Approve</strong> or <strong>Reject</strong> to update status in bulk.</li>
                                        <li>Use the <strong>Search</strong> box to filter by ID or Title.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Dialog */}
            {showConfirmDialog && (
                <div style={{
                    position: 'fixed', top: '0', left: '0', right: '0', bottom: '0',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', zIndex: 20000
                }}>
                    <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', maxWidth: '400px', width: '90%', textAlign: 'center' }}>
                        <h3 style={{ margin: '0 0 16px 0', color: '#333', fontSize: '18px', fontWeight: '600' }}>Confirmation</h3>
                        <p style={{ margin: '0 0 24px 0', color: '#666', fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-line' }}>{DOMPurify.sanitize(confirmMessage, { ALLOWED_TAGS: [] })}</p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button onClick={() => setShowConfirmDialog(false)} style={{ backgroundColor: '#6b7280', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '6px', cursor: 'pointer', fontSize: '16px', fontWeight: '500', minWidth: '100px' }}>Cancel</button>
                            <button onClick={() => { confirmAction(); setShowConfirmDialog(false); }} style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '6px', cursor: 'pointer', fontSize: '16px', fontWeight: '500', minWidth: '100px' }}>Yes</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Notifications */}
            {showSuccessMessage && (
                <div style={{
                    position: 'fixed', top: '20px', right: '20px', backgroundColor: '#10b981', color: 'white',
                    padding: '12px 20px', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 10000, fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px', animation: 'slideIn 0.3s ease-out'
                }}>
                    <Save size={16} /> {DOMPurify.sanitize(successMessage, { ALLOWED_TAGS: [] })}
                </div>
            )}

            {showErrorMessage && (
                <div style={{
                    position: 'fixed', top: '20px', right: '20px', backgroundColor: '#ef4444', color: 'white',
                    padding: '16px 20px', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 10000, fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'flex-start', gap: '12px', animation: 'slideIn 0.3s ease-out', maxWidth: '500px'
                }}>
                    <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ whiteSpace: 'pre-line', lineHeight: '1.5' }}>{DOMPurify.sanitize(errorMessage, { ALLOWED_TAGS: [] })}</div>
                </div>
            )}

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            `}</style>
        </div>
    );
};

export default ChangeRequestApprovalDashboard;
