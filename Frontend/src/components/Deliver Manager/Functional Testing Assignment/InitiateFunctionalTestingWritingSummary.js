import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getIdToken } from '../../../utils/cognito-auth';
import { HelpCircle, X } from 'lucide-react';
import DOMPurify from 'dompurify';
import { useSession } from '../../../context/SessionContext';

const ricewTypeMapping = {
    'Integration': 'Integrations',
    'Conversion': 'Conversions',
    'Report': 'Reports',
    'Analytics Report': 'Analytics Reports',
    'Alert': 'Alert',
    'Workflow': 'Workflow',
    'Personalization': 'Personalization',
    'Extension': 'Extensions'
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

const InitiateFunctionalTestingWritingSummary = ({ selectedProject }) => {
    const navigate = useNavigate();
    const { handleAuthError } = useSession();
    const [ricewData, setRicewData] = useState([]);
    const [loading, setLoading] = useState(false);
    // Confirmation dialog states
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
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const [confirmMessage, setConfirmMessage] = useState('');

    // API Status States
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [showErrorMessage, setShowErrorMessage] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const fetchRicewData = useCallback(async () => {
        setLoading(true);
        try {
            const userId = localStorage.getItem('user_id') || 'system';
            const projectId = localStorage.getItem('project_id') || selectedProject?.id || '101';
            const idToken = await getIdToken();
            if (!idToken) {
                handleAuthError(401);
                setLoading(false);
                return;
            }
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            };

            // Updated API endpoint for functional testing
            const response = await fetch(`https://h78086ug8d.execute-api.ap-south-1.amazonaws.com/New/api/ricew/functionalTestingAssignment/byUserRecords?functional_testing_user_id=${userId}&project_id=${projectId}`, { headers });

            if (response.status === 401 || response.status === 403) {
                handleAuthError(response.status);
                setLoading(false);
                return;
            }

            const result = await response.json();

            if (result.success && result.data) {
                const mappedData = result.data.map(item => {
                    const rawTimestamp = item.assign_object_date || item.created_timestamp || '-';

                    return {
                        ...item,
                        displayType: DOMPurify.sanitize(ricewTypeMapping[item.RICEW_Type] || item.RICEW_Type || '-', { ALLOWED_TAGS: [] }),
                        displayStatus: DOMPurify.sanitize(item.RICEW_Status || '-', { ALLOWED_TAGS: [] }),
                        displayDescription: DOMPurify.sanitize(item.RICEW_Description || '-', { ALLOWED_TAGS: [] }),
                        displayApplication: DOMPurify.sanitize(item.GI_Application || '-', { ALLOWED_TAGS: [] }),
                        displayWorkStatus: (() => {
                            const toStatus = (item.SI_Technical_Owner_Status || '').toLowerCase();
                            if (toStatus === 'approved') return 'Approved';
                            if (toStatus === 'pending for verify') return 'Uploaded and pending for Verifiy';
                            if (toStatus === 'feedback to review doccument') return 'Feedback Received';
                            if (!toStatus || toStatus === 'n/a' || toStatus === 'na') {
                                return item.assign_work_status === 'yes' ? 'Initiated' : '-';
                            }
                            return DOMPurify.sanitize(item.SI_Technical_Owner_Status || '-', { ALLOWED_TAGS: [] });
                        })(),
                        assignmentTimestamp: formatToDDMMMYYYY(rawTimestamp),
                        rawAssignmentTimestamp: DOMPurify.sanitize(rawTimestamp, { ALLOWED_TAGS: [] })
                    };
                });

                mappedData.sort((a, b) => {
                    const getPriority = (status) => {
                        if (status === '-') return 1;
                        if (status === 'Initiated') return 2;
                        if (status === 'Feedback Received') return 3;
                        if (status === 'Uploaded and pending for Verifiy') return 4;
                        if (status === 'Approved') return 5;
                        return 0;
                    };

                    const priorityA = getPriority(a.displayWorkStatus);
                    const priorityB = getPriority(b.displayWorkStatus);

                    if (priorityA !== priorityB) {
                        return priorityA - priorityB;
                    }

                    const parseDate = (dateStr) => {
                        if (!dateStr || dateStr === '-') return 0;
                        try {
                            const d = new Date(dateStr);
                            if (!isNaN(d.getTime())) return d.getTime();

                            const cleanDate = dateStr.replace('_', '/').replace(',', '');
                            const [datePart, timePart] = cleanDate.split(' ');
                            if (!datePart) return 0;
                            const [day, month, year] = datePart.split('/').map(Number);
                            let hours = 0, minutes = 0, seconds = 0;
                            if (timePart) {
                                const hms = timePart.split(':').map(Number);
                                hours = hms[0] || 0;
                                minutes = hms[1] || 0;
                                seconds = hms[2] || 0;
                            }
                            return new Date(year, month - 1, day, hours, minutes, seconds).getTime();
                        } catch (e) { return 0; }
                    };

                    const timeA = parseDate(a.rawAssignmentTimestamp);
                    const timeB = parseDate(b.rawAssignmentTimestamp);

                    if (timeA !== timeB) return timeB - timeA;

                    return (b.RICEWRequestFormId || 0).toString().localeCompare((a.RICEWRequestFormId || 0).toString());
                });

                setRicewData(mappedData);
            } else {
                setRicewData([]);
            }
        } catch (error) {
            console.error("Error fetching RICEW data:", error);
            setRicewData([]);
        } finally {
            setLoading(false);
        }
    }, [selectedProject, handleAuthError]);

    useEffect(() => {
        fetchRicewData();
    }, [fetchRicewData]);

    const handleConfirmYes = () => {
        if (confirmAction) confirmAction();
        setShowConfirmDialog(false);
        setConfirmAction(null);
    };

    const handleConfirmCancel = () => {
        setShowConfirmDialog(false);
        setConfirmAction(null);
    };

    return (
        <div className="config-main" style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '0', margin: '0' }}>
            <div style={{ padding: '1rem 1rem 2rem 1rem', width: '100%', minWidth: '1250px', margin: '0', boxSizing: 'border-box' }}>

                <div style={{ backgroundColor: 'white', padding: '0', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>

                    <div style={{ padding: '2rem 1rem 1rem 2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project : <span style={{ color: '#007bff' }}>{localStorage.getItem('project_name') || selectedProject?.name}</span></h3>
                        </div>
                    </div>

                    <div className="config-header" style={{
                        marginTop: '0',
                        marginRight: "0px",
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.5rem 2rem'
                    }}>
                        <h2 style={{ margin: 0 }}>Initiate Functional Testing</h2>
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

                            {showHelpPopup && (
                                <div style={{ position: 'fixed', top: '0', left: '0', right: '0', bottom: '0', backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 30000, padding: '20px' }}>
                                    <div ref={helpPopupRef} style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                                        <div className="help-modal-scroll" style={{ overflowY: 'auto', padding: '32px', textAlign: 'left', flex: '1' }}>
                                            <button onClick={() => setShowHelpPopup(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545' }}>
                                                <X size={20} />
                                            </button>
                                            <h3 style={{ margin: '0 0 16px 0', color: '#333', fontSize: '18px', fontWeight: '600' }}>Help & Information</h3>
                                            <div style={{ color: '#444', fontSize: '14px', lineHeight: '1.6' }}>
                                                <div style={{ marginBottom: '16px' }}>
                                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>What is this page?</strong>
                                                    <p style={{ margin: '6px 0 0 0', color: '#555' }}>The <strong>Initiate Functional Testing</strong> page allows testers to view and manage their assigned RICEW functional testing tasks.</p>
                                                </div>
                                                <div style={{ marginBottom: '16px' }}>
                                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>Understanding the columns</strong>
                                                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                                        <li><strong>RICEW Name</strong> — Clickable link to view or update the testing details.</li>
                                                        <li><strong>Assignment Date</strong> — The date when this object was assigned to you.</li>
                                                        <li><strong>Status Of Work</strong> — Displays the current status.</li>
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
                        <div style={{
                            border: '1px solid #ddd',
                            overflowX: 'auto',
                            overflowY: 'hidden',
                            width: '100%',
                            boxSizing: 'border-box',
                            marginTop: '10px'
                        }}>
                            <div style={{
                                display: 'flex',
                                borderBottom: '1px solid #ddd',
                                backgroundColor: 'white',
                                minWidth: '1250px'
                            }}>
                                <div style={{ width: '60px', flex: '0 0 60px', padding: '12px 8px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', backgroundColor: 'white', textAlign: 'center' }}>Sr. No.</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '150px', backgroundColor: 'white' }}>RICEW Name</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '150px', backgroundColor: 'white' }}>RICEW Type</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '150px', backgroundColor: 'white' }}>RICEW Status</div>
                                <div style={{ flex: 2, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '200px', backgroundColor: 'white' }}>RICEW Description</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '150px', backgroundColor: 'white' }}>Application</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '150px', backgroundColor: 'white' }}>Assignment Date</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', minWidth: '150px', backgroundColor: 'white' }}>Status Of Work</div>
                            </div>

                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                minWidth: '1250px',
                                backgroundColor: 'white'
                            }}>
                                {loading ? (
                                    <></>
                                ) : ricewData.length > 0 ? (
                                    ricewData.map((row, index) => (
                                        <div
                                            key={row.RICEWRequestFormId || index}
                                            style={{
                                                display: 'flex',
                                                backgroundColor: row.displayWorkStatus === 'Approved' ? '#f0fdf4' :
                                                    row.displayWorkStatus === 'Feedback Received' ? '#fffbeb' :
                                                        row.displayWorkStatus === 'Uploaded and pending for Verifiy' ? '#fafafa' : '#ffffff',
                                                borderBottom: '1px solid #ddd',
                                                minWidth: '1250px',
                                                color: row.displayWorkStatus === 'Approved' ? '#166534' :
                                                    row.displayWorkStatus === 'Feedback Received' ? '#92400e' :
                                                        row.displayWorkStatus === 'Uploaded and pending for Verifiy' ? '#999' : '#333',
                                                opacity: row.displayWorkStatus === 'Uploaded and pending for Verifiy' ? 0.85 : 1
                                            }}
                                        >
                                            <div style={{ width: '60px', flex: '0 0 60px', padding: '12px 8px', fontSize: '13px', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '500' }}>
                                                {index + 1}
                                            </div>

                                            <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', minWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center' }}>
                                                <span
                                                    style={{
                                                        cursor: 'pointer',
                                                        color: '#3b82f6',
                                                        textDecoration: 'none',
                                                        fontWeight: '500'
                                                    }}
                                                    onClick={() => navigate(`/dashboard/functional-testing-writer-initiate-work/${row.RICEWRequestFormId}`)}
                                                    onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                                    onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                                                >
                                                    {row.RICEW_Object || '-'}
                                                </span>
                                            </div>

                                            <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', minWidth: '150px', display: 'flex', alignItems: 'center' }}>
                                                {row.displayType}
                                            </div>

                                            <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', minWidth: '150px', display: 'flex', alignItems: 'center' }}>
                                                {row.displayStatus}
                                            </div>

                                            <div style={{ flex: 2, padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', minWidth: '200px', display: 'flex', alignItems: 'center', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                                {row.displayDescription}
                                            </div>

                                            <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', minWidth: '150px', display: 'flex', alignItems: 'center' }}>
                                                {row.displayApplication}
                                            </div>

                                            <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', minWidth: '150px', display: 'flex', alignItems: 'center' }}>
                                                {row.assignmentTimestamp || '-'}
                                            </div>

                                            <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', minWidth: '150px', display: 'flex', alignItems: 'center' }}>
                                                <span style={{
                                                    fontWeight: '600',
                                                    color: row.displayWorkStatus === 'Approved' ? '#10b981' :
                                                        row.displayWorkStatus === 'Feedback Received' ? '#f59e0b' :
                                                            row.displayWorkStatus === 'Uploaded and pending for Verifiy' ? '#3b82f6' :
                                                                row.displayWorkStatus === 'Initiated' ? '#8b5cf6' : '#666'
                                                }}>
                                                    {row.displayWorkStatus}
                                                </span>
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
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {
                loading && (
                    <div style={{
                        position: 'fixed',
                        top: '0',
                        left: '0',
                        right: '0',
                        bottom: '0',
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
                )
            }

            {/* Confirmation Dialog */}
            {showConfirmDialog && (
                <div style={{
                    position: 'fixed',
                    top: '0',
                    left: '0',
                    right: '0',
                    bottom: '0',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '24px',
                        borderRadius: '8px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                        maxWidth: '400px',
                        width: '90%',
                        textAlign: 'center'
                    }}>
                        <h3 style={{
                            margin: '0 0 16px 0',
                            color: '#333',
                            fontSize: '18px',
                            fontWeight: '600'
                        }}>
                            Confirmation
                        </h3>
                        <p style={{
                            margin: '0 0 24px 0',
                            color: '#666',
                            fontSize: '14px',
                            lineHeight: '1.6'
                        }}>
                            {confirmMessage}
                        </p>
                        <div style={{
                            display: 'flex',
                            gap: '12px',
                            justifyContent: 'center'
                        }}>
                            <button
                                onClick={handleConfirmCancel}
                                style={{
                                    backgroundColor: '#6b7280',
                                    color: 'white',
                                    border: 'none',
                                    padding: '10px 24px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '16px',
                                    fontWeight: '500',
                                    minWidth: '100px'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#4b5563'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = '#6b7280'}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmYes}
                                style={{
                                    backgroundColor: '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    padding: '10px 24px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '16px',
                                    fontWeight: '500',
                                    minWidth: '100px'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
                            >
                                Yes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Message Popup */}
            {showSuccessMessage && (
                <div style={{
                    position: 'fixed',
                    top: '20px',
                    right: '20px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    padding: '12px 20px',
                    borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 3000,
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22,4 12,14.01 9,11.01" />
                    </svg>
                    {successMessage}
                </div>
            )}

            {/* Error Message Popup */}
            {showErrorMessage && (
                <div style={{
                    position: 'fixed',
                    top: '20px',
                    right: '20px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    padding: '12px 20px',
                    borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 3000,
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    maxWidth: '400px'
                }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    <span style={{ flex: 1 }}>{errorMessage}</span>
                    <button
                        onClick={() => setShowErrorMessage(false)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'white',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                        title="Close"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
            )}

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .help-modal-scroll::-webkit-scrollbar { width: 4px; }
                .help-modal-scroll::-webkit-scrollbar-track { background: transparent; margin: 8px 0; }
                .help-modal-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                .help-modal-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}</style>
        </div>
    );
};

export default InitiateFunctionalTestingWritingSummary;
