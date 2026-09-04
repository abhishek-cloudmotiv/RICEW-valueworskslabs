import React, { useState, useEffect } from 'react';

const AutoRICEWFeedbackPopView = ({ ricewName, recordId, projectId, onClose }) => {
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchFeedbackData = async () => {
            if (!recordId || !projectId) {
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                const response = await fetch(`https://cf9ioid4b1.execute-api.ap-south-1.amazonaws.com/New/ricew/autoRICEWAI/getFeedback?Auto_RICEW_AI_id=${encodeURIComponent(recordId)}&Project_id=${encodeURIComponent(projectId)}`, {
                    headers: { 'Content-Type': 'application/json' }
                });
                
                if (!response.ok) {
                    throw new Error(`Failed to fetch feedback: ${response.statusText}`);
                }
                
                const result = await response.json();
                if (result.success && result.data) {
                    setFeedbacks(result.data);
                } else {
                    setFeedbacks([]);
                }
            } catch (err) {
                console.error("Error loading feedback history:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchFeedbackData();
    }, [recordId, projectId]);

    const getFileViewUrl = (url, fileName) => {
        if (!url || url === '-') return null;
        let finalUrl = url;
        if (!url.startsWith('http')) {
            finalUrl = `https://d1z1oiez6i3mzi.cloudfront.net/${url.startsWith('/') ? url.slice(1) : url}`;
        }
        const extension = (fileName || finalUrl.split('?')[0]).split('.').pop().toLowerCase();
        if (['xlsx', 'xls', 'csv', 'docx', 'doc'].includes(extension)) {
            return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(finalUrl)}`;
        }
        return finalUrl;
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px',
            fontFamily: 'inherit'
        }}>
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes pop {
                    0% { transform: scale(0.95); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }
                .feedback-spinner {
                    width: 24px;
                    height: 24px;
                    border: 2px solid #e2e8f0;
                    border-top-color: #007bff;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    display: inline-block;
                }
            `}} />

            <div style={{
                width: '600px',
                backgroundColor: '#ffffff',
                border: '1px solid #ddd',
                borderRadius: '8px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
                padding: '30px',
                color: '#333',
                animation: 'pop 0.2s ease-out',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '85vh',
                overflow: 'hidden',
                boxSizing: 'border-box'
            }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '6px',
                        background: 'linear-gradient(135deg, #007bff, #00c6ff)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(0, 123, 255, 0.25)',
                        flexShrink: 0
                    }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#333' }}>Client Feedback History</h2>
                        <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#666' }}>
                            RICEW Object: <span style={{ color: '#007bff', fontWeight: '600' }}>{ricewName}</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '24px',
                            color: '#999',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '4px',
                            transition: 'color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#999'}
                    >
                        &times;
                    </button>
                </div>

                {/* Content Area */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    paddingRight: '5px',
                    marginBottom: '20px'
                }}>
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: '12px' }}>
                            <div className="feedback-spinner" />
                            <span style={{ fontSize: '13px', color: '#666', fontWeight: '500' }}>Loading feedback history...</span>
                        </div>
                    ) : error ? (
                        <div style={{
                            padding: '12px 16px',
                            backgroundColor: '#fde8e8',
                            border: '1px solid #f8b4b4',
                            borderRadius: '6px',
                            color: '#9b1c1c',
                            fontSize: '13px'
                        }}>
                            Error: {error}
                        </div>
                    ) : feedbacks.length === 0 ? (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '40px 20px',
                            border: '1px dashed #ccc',
                            borderRadius: '6px',
                            backgroundColor: '#fafafa'
                        }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" style={{ marginBottom: '12px' }}>
                                <rect width="18" height="18" x="3" y="3" rx="2" />
                                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                            </svg>
                            <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#333', fontWeight: '600' }}>No Feedback Submitted</h4>
                            <p style={{ margin: 0, fontSize: '12px', color: '#666', textAlign: 'center' }}>
                                The client has not provided any comments or feedback for this object yet.
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {feedbacks.map((item, index) => {
                                const fileViewUrl = getFileViewUrl(item.Upload_file_url, item.Upload_file_name);
                                const isClosed = item.Decision_feedback === 'true' || item.Decision_feedback === 'Close';

                                return (
                                    <div key={item.Auto_RICEW_AI_Feedback_Form_id || index} style={{
                                        border: '1px solid #ddd',
                                        borderRadius: '6px',
                                        padding: '16px',
                                        backgroundColor: '#ffffff',
                                        transition: 'all 0.2s ease',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                    }}>
                                        {/* Meta Row */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                            <div>
                                                <span style={{ fontSize: '13px', fontWeight: '600', color: '#333' }}>
                                                    {item.created_by || 'Client Owner'}
                                                </span>
                                                <span style={{ fontSize: '11px', color: '#666', marginLeft: '10px' }}>
                                                    {item.created_timestamp ? new Date(item.created_timestamp).toLocaleString() : ''}
                                                </span>
                                            </div>
                                            
                                            {/* Decision Badge */}
                                            <span style={{
                                                fontSize: '10px',
                                                fontWeight: '700',
                                                textTransform: 'uppercase',
                                                padding: '3px 8px',
                                                borderRadius: '12px',
                                                letterSpacing: '0.05em',
                                                backgroundColor: isClosed ? '#e6f4ea' : '#fef3c7',
                                                color: isClosed ? '#137333' : '#92400e',
                                                border: isClosed ? '1px solid #ceead6' : '1px solid #fde68a'
                                            }}>
                                                {isClosed ? 'Closed' : 'Open'}
                                            </span>
                                        </div>

                                        {/* Text comment */}
                                        <div style={{
                                            fontSize: '13px',
                                            color: '#333',
                                            lineHeight: '1.5',
                                            backgroundColor: '#f8f9fa',
                                            padding: '10px 12px',
                                            borderRadius: '4px',
                                            border: '1px solid #e9ecef',
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word',
                                            marginBottom: fileViewUrl ? '12px' : '0'
                                        }}>
                                            {item.feedback_Text || <span style={{ color: '#999', fontStyle: 'italic' }}>No description comment.</span>}
                                        </div>

                                        {/* Attachment */}
                                        {fileViewUrl && (
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                <a
                                                    href={fileViewUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        backgroundColor: '#eff6ff',
                                                        color: '#2563eb',
                                                        border: '1px solid #bfdbfe',
                                                        padding: '6px 12px',
                                                        borderRadius: '6px',
                                                        fontSize: '11px',
                                                        fontWeight: '600',
                                                        textDecoration: 'none',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease',
                                                        maxWidth: '100%',
                                                        boxSizing: 'border-box'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.backgroundColor = '#dbeafe';
                                                        e.currentTarget.style.borderColor = '#93c5fd';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.backgroundColor = '#eff6ff';
                                                        e.currentTarget.style.borderColor = '#bfdbfe';
                                                    }}
                                                >
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px', flexShrink: 0 }}>
                                                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                                                        <polyline points="14 2 14 8 20 8" />
                                                    </svg>
                                                    <span style={{
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {item.Upload_file_name || 'Attachment'}
                                                    </span>
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '15px', borderTop: '1px solid #e2e8f0' }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '600',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#0069d9';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#007bff';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}
                    >
                        Close View
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AutoRICEWFeedbackPopView;
