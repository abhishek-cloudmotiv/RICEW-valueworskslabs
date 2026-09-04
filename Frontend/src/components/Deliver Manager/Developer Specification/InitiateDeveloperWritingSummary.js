import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { getIdToken } from '../../../utils/cognito-auth';
import { useSession } from '../../../context/SessionContext';
import { HelpCircle, X } from 'lucide-react';

// RICEW Type Mapping (for consistency with View Form if needed)
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

const InitiateDeveloperWritingSummary = ({ selectedProject }) => {
    const navigate = useNavigate();
    const [ricewData, setRicewData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showHelpPopup, setShowHelpPopup] = useState(false);
    const helpPopupRef = React.useRef(null);

    const { logout } = useSession();

    const handleAuthError = useCallback((status) => {
        if (status === 401 || status === 403) {
            logout();
        }
    }, [logout]);

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

            // Fetch records for the current user and project using the updated API
            const response = await fetch(`https://qxlkh4fu85.execute-api.ap-south-1.amazonaws.com/New/api/ricew/developerSpecificationAssignment/byUserRecords?developer_user_id=${userId}&project_id=${projectId}`, { headers });

            if (response.status === 401 || response.status === 403) {
                handleAuthError(response.status);
                setLoading(false);
                return;
            }

            const result = await response.json();

            if (result.success && result.data) {
                // Map API data to display fields
                const mappedData = result.data.map(item => {
                    const rawTimestamp = item.assign_object_date || item.created_timestamp || '-';
                    const displayTimestamp = formatToDDMMMYYYY(rawTimestamp);

                    return {
                        ...item,
                        // Mapped Fields directly from the enhanced backend response
                        displayType: DOMPurify.sanitize(ricewTypeMapping[item.RICEW_Type] || item.RICEW_Type || '-', { ALLOWED_TAGS: [] }),
                        displayStatus: DOMPurify.sanitize(item.RICEW_Status || '-', { ALLOWED_TAGS: [] }),
                        displayDescription: DOMPurify.sanitize(item.RICEW_Description || '-', { ALLOWED_TAGS: [] }),
                        displayApplication: DOMPurify.sanitize(item.GI_Application || '-', { ALLOWED_TAGS: [] }),
                        displayWorkStatus: (() => {
                            const toStatus = (item.Developer_Owner_Status || '').toLowerCase();
                            if (toStatus === 'approved') return 'Approved';
                            if (toStatus === 'pending for verify') return 'Uploaded and pending for Verifiy';
                            if (toStatus === 'feedback to review doccument') return 'Feedback Received';
                            if (!toStatus || toStatus === 'n/a' || toStatus === 'na') {
                                return item.assign_work_status === 'yes' ? 'Initiated' : '-';
                            }
                            return item.Developer_Owner_Status || '-';
                        })(),
                        assignmentTimestamp: displayTimestamp,
                        rawAssignmentTimestamp: rawTimestamp
                    };
                });

                // Sort logic: 
                // 1. '-' records at top
                // 2. 'Initiated' records in middle
                // 3. 'Uploaded' records at bottom
                // 4. Within each group, sort by Assignment Date descending
                mappedData.sort((a, b) => {
                    const getPriority = (status) => {
                        if (status === '-') return 1;
                        if (status === 'Initiated') return 2;
                        if (status === 'Feedback Received') return 3;
                        if (status === 'Uploaded and pending for Verifiy') return 4;
                        if (status === 'Approved') return 5;
                        return 0; // Default/Other
                    };

                    const priorityA = getPriority(a.displayWorkStatus);
                    const priorityB = getPriority(b.displayWorkStatus);

                    if (priorityA !== priorityB) {
                        return priorityA - priorityB;
                    }

                    // Rule 2: Fallback to timestamp descending (Latest at top)
                    const parseDate = (dateStr) => {
                        if (!dateStr || dateStr === '-') return 0;
                        try {
                            const d = new Date(dateStr);
                            if (!isNaN(d.getTime())) return d.getTime();

                            // Fallback for legacy DD/MM/YYYY formats
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

    return (
        <div className="config-main" style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '0', margin: '0' }}>
            <div style={{ padding: '1rem 1rem 2rem 1rem', width: '100%', minWidth: '1250px', margin: '0', boxSizing: 'border-box' }}>

                {/* Main Content Area */}
                <div style={{ backgroundColor: 'white', padding: '0', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>

                    {/* Project Info Header */}
                    <div style={{ padding: '2rem 1rem 1rem 2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project : <span style={{ color: '#007bff' }}> {localStorage.getItem('project_name') || selectedProject?.name}</span></h3>
                        </div>
                    </div>

                    {/* Page Title */}
                    <div className="config-header" style={{
                        marginTop: '0',
                        marginRight: "0px",
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.5rem 2rem'
                    }}>
                        <h2 style={{ margin: 0 }}>Initiate Code Development</h2>
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
                                    zIndex: 30000,
                                    padding: '20px'
                                }}>
                                    <div
                                        ref={helpPopupRef}
                                        style={{
                                            backgroundColor: 'white',
                                            borderRadius: '12px',
                                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                                            width: '100%',
                                            maxWidth: '800px',
                                            maxHeight: '90vh',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            position: 'relative'
                                        }}
                                    >
                                        <div className="help-modal-scroll" style={{
                                            overflowY: 'auto',
                                            padding: '32px',
                                            textAlign: 'left',
                                            flex: '1'
                                        }}>
                                            <button
                                                onClick={() => setShowHelpPopup(false)}
                                                style={{
                                                    position: 'absolute',
                                                    top: '16px',
                                                    right: '16px',
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    color: '#dc3545'
                                                }}
                                            >
                                                <X size={20} />
                                            </button>
                                            <h3 style={{
                                                margin: '0 0 16px 0',
                                                color: '#333',
                                                fontSize: '18px',
                                                fontWeight: '600'
                                            }}>
                                                Help & Information
                                            </h3>
                                            <div style={{ color: '#444', fontSize: '14px', lineHeight: '1.6' }}>
                                                <div style={{ marginBottom: '16px' }}>
                                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>What is this page?</strong>
                                                    <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                                                        The <strong>Initiate Code Development</strong> page allows developers to view and manage their assigned RICEW code development tasks.
                                                    </p>
                                                </div>

                                                <div style={{ marginBottom: '16px' }}>
                                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>Understanding the columns</strong>
                                                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                                        <li><strong>RICEW Name</strong> — Clickable link to view or update the code development details for the object.</li>
                                                        <li><strong>Assignment Date</strong> — The date when this object was assigned to you.</li>
                                                        <li><strong>Status Of Work</strong> — Displays the current status (e.g., Initiated, Uploaded, Feedback Received, Approved).</li>
                                                    </ul>
                                                </div>

                                                <div style={{ marginBottom: '16px' }}>
                                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to make changes</strong>
                                                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                                        <li>Click on the <strong>RICEW Name</strong> to open the detailed code development form where you can upload documents or update details.</li>
                                                        <li>Once approved, records will appear in green indicating successful completion.</li>
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
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '150px', backgroundColor: 'white' }}>RICEW Name</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '150px', backgroundColor: 'white' }}>RICEW Type</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '150px', backgroundColor: 'white' }}>RICEW Status</div>
                                <div style={{ flex: 2, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '200px', backgroundColor: 'white' }}>RICEW Description</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '150px', backgroundColor: 'white' }}>Application</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '150px', backgroundColor: 'white' }}>Assignment Date</div>
                                <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', minWidth: '150px', backgroundColor: 'white' }}>Status Of Work</div>
                            </div>

                            {/* Table Body */}
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                minWidth: '1260px',
                                backgroundColor: 'white'
                            }}>
                                {loading ? (
                                    <>
                                        {/* Keep table structure but visually empty underneath or just show no rows */}
                                    </>
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
                                                minWidth: '1260px',
                                                color: row.displayWorkStatus === 'Approved' ? '#166534' :
                                                    row.displayWorkStatus === 'Feedback Received' ? '#92400e' :
                                                        row.displayWorkStatus === 'Uploaded and pending for Verifiy' ? '#999' : '#333',
                                                opacity: row.displayWorkStatus === 'Uploaded and pending for Verifiy' ? 0.85 : 1
                                            }}
                                        >
                                            {/* Sr. No. */}
                                            <div style={{ width: '60px', flex: '0 0 60px', padding: '12px 8px', fontSize: '13px', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '500' }}>
                                                {index + 1}
                                            </div>

                                            {/* RICEW Name */}
                                            <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', minWidth: '150px', whiteSpace: 'normal', wordBreak: 'break-word', display: 'flex', alignItems: 'center' }}>
                                                <span
                                                    style={{
                                                        cursor: 'pointer',
                                                        color: '#3b82f6',
                                                        textDecoration: 'none',
                                                        fontWeight: '500'
                                                    }}
                                                    onClick={() => navigate(`/dashboard/developer-writer-initiate-work/${row.RICEWRequestFormId}`)}
                                                    onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                                    onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                                                >
                                                    {row.RICEW_Object || '-'}
                                                </span>
                                            </div>

                                            {/* RICEW Type */}
                                            <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', minWidth: '150px', display: 'flex', alignItems: 'center' }}>
                                                {row.displayType}
                                            </div>

                                            {/* RICEW Status */}
                                            <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', minWidth: '150px', display: 'flex', alignItems: 'center' }}>
                                                {row.displayStatus}
                                            </div>

                                            {/* RICEW Description */}
                                            <div style={{ flex: 2, padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', minWidth: '200px', display: 'flex', alignItems: 'center', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                                {row.displayDescription}
                                            </div>

                                            {/* Application */}
                                            <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', minWidth: '150px', display: 'flex', alignItems: 'center' }}>
                                                {row.displayApplication}
                                            </div>

                                            {/* Assignment Date */}
                                            <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', minWidth: '150px', display: 'flex', alignItems: 'center' }}>
                                                {row.assignmentTimestamp || '-'}
                                            </div>

                                            {/* Status Of Work */}
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

            {/* Loading Overlay */}
            {
                loading && (
                    <div style={{
                        position: 'fixed',
                        top: '0',
                        left: '0',
                        right: '0',
                        bottom: '0',
                        //backgroundColor: 'rgba(255, 255, 255, 0.8)',
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

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .help-modal-scroll::-webkit-scrollbar {
                    width: 4px;
                }
                .help-modal-scroll::-webkit-scrollbar-track {
                    background: transparent;
                    margin: 8px 0;
                }
                .help-modal-scroll::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 4px;
                }
                .help-modal-scroll::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
            `}</style>
        </div >
    );
};

export default InitiateDeveloperWritingSummary;
