import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getIdToken } from '../../../utils/cognito-auth';

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

const ClientFunctionalTestingWritingSummary = ({ selectedProject }) => {
    const navigate = useNavigate();
    const [ricewData, setRicewData] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchRicewData = useCallback(async () => {
        setLoading(true);
        try {
            const userId = localStorage.getItem('user_id') || 'system';
            const projectId = localStorage.getItem('project_id') || selectedProject?.id || '101';
            const idToken = await getIdToken();
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            };

            // Fetch records for the current user and project using SI Technical Assignment API
            const response = await fetch(`https://07eirxky2f.execute-api.ap-south-1.amazonaws.com/New/api/ricew/clientFunctionalTestingSpecificationAssignment/byUserRecords?client_user_id=${userId}&project_id=${projectId}`, { headers });
            const result = await response.json();

            if (result.success && result.data) {
                // Map API data to display fields
                const mappedData = result.data.map(item => {
                    const rawTimestamp = item.updated_timestamp || '-';
                    let displayTimestamp = rawTimestamp;

                    if (rawTimestamp !== '-') {
                        try {
                            const cleanDate = rawTimestamp.replace('_', '/').replace(',', '');
                            const [datePart, timePart] = cleanDate.split(' ');
                            if (datePart && timePart) {
                                const [d, m, y] = datePart.split('/').map(Number);
                                const [h, min, s] = timePart.split(':').map(Number);
                                // Create Date assuming it was UTC from backend
                                const dateUTC = new Date(Date.UTC(y, m - 1, d, h, min, s));

                                displayTimestamp = dateUTC.toLocaleString('en-IN', {
                                    timeZone: 'Asia/Kolkata',
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit'
                                });
                            }
                        } catch (e) {
                            console.error("Error formatting date:", e);
                        }
                    }

                    return {
                        ...item,
                        // Mapped Fields
                        displayType: ricewTypeMapping[item.RICEW_Type] || item.RICEW_Type || '-',
                        displayStatus: item.RICEW_Status || '-',
                        displayDescription: item.RICEW_Description || '-',
                        displayApplication: item.GI_Application || '-',
                        displayWorkStatus: (() => {
                            const submittedStatus = (item.Status_Submitted_Of_Work || '').toLowerCase();
                            
                            if (submittedStatus === 'approved') return 'Approved';
                            if (submittedStatus === 'pending for verify') return 'Uploaded and pending for Verifiy';
                            if (submittedStatus === 'feedback to review doccument') return 'Feedback Received';
                            if (submittedStatus === 'feedback send') return 'Feedback Sent';
                            if (submittedStatus === 'response received') return 'Response Received';

                            // Fallback to client_SI_Technical_Owner_Status if Status_Submitted_Of_Work is N/A or empty
                            if (!submittedStatus || submittedStatus === 'n/a' || submittedStatus === 'na') {
                                const toStatus = (item.client_SI_Technical_Owner_Status || '').toLowerCase();
                                if (toStatus === 'approved') return 'Approved';
                                if (toStatus === 'pending for verify') return 'Uploaded and pending for Verifiy';
                                if (toStatus === 'feedback to review doccument') return 'Feedback Received';
                                if (!toStatus || toStatus === 'n/a' || toStatus === 'na') {
                                    return item.assign_work_status === 'yes' ? 'Initiated' : '-';
                                }
                                return item.client_SI_Technical_Owner_Status || '-';
                            }
                            return item.Status_Submitted_Of_Work || '-';
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
                        if (status === 'Feedback Sent') return 3;
                        if (status === 'Feedback Received') return 4;
                        if (status === 'Response Received') return 5;
                        if (status === 'Uploaded and pending for Verifiy') return 6;
                        if (status === 'Approved') return 7;
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
    }, [selectedProject]);

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
                                                        row.displayWorkStatus === 'Feedback Sent' ? '#fffbeb' :
                                                            row.displayWorkStatus === 'Response Received' ? '#eff6ff' :
                                                                row.displayWorkStatus === 'Uploaded and pending for Verifiy' ? '#fafafa' : '#ffffff',
                                                borderBottom: '1px solid #ddd',
                                                minWidth: '1260px',
                                                color: row.displayWorkStatus === 'Approved' ? '#166534' :
                                                    row.displayWorkStatus === 'Feedback Received' ? '#92400e' :
                                                        row.displayWorkStatus === 'Response Received' ? '#1e40af' :
                                                            row.displayWorkStatus === 'Uploaded and pending for Verifiy' ? '#999' : '#333',
                                                opacity: (row.displayWorkStatus === 'Uploaded and pending for Verifiy') ? 0.85 : 1
                                            }}
                                        >
                                            {/* Sr. No. */}
                                            <div style={{ width: '60px', flex: '0 0 60px', padding: '12px 8px', fontSize: '13px', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '500' }}>
                                                {index + 1}
                                            </div>

                                            {/* RICEW Name */}
                                            <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', borderRight: '1px solid #ddd', minWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center' }}>
                                                <span
                                                    style={{
                                                        cursor: 'pointer',
                                                        color: '#3b82f6',
                                                        textDecoration: 'none',
                                                        fontWeight: '500'
                                                    }}
                                                    onClick={() => navigate(`/dashboard/client-functional-testing-work-copy/${row.RICEWRequestFormId}`)}
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
                                                            row.displayWorkStatus === 'Feedback Sent' ? '#f59e0b' :
                                                                row.displayWorkStatus === 'Response Received' ? '#3b82f6' :
                                                                    row.displayWorkStatus === 'Uploaded and pending for Verifiy' ? '#6366f1' :
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
            `}</style>
        </div >
    );
};

export default ClientFunctionalTestingWritingSummary;
