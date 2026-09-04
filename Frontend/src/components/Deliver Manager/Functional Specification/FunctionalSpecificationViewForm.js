import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getIdToken } from '../../../utils/cognito-auth';
import { HelpCircle, X } from 'lucide-react';
import DOMPurify from 'dompurify';
import { useSession } from '../../../context/SessionContext';

// RICEW Type Mapping for display
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

const labelStyle = {
    fontSize: '13px',
    fontWeight: '400',
    color: '#333',
    marginRight: '2px'
};

const sectionHeaderStyle = {
    backgroundColor: '#f8f9fa',
    padding: '10px 16px',
    color: '#333',
    fontSize: '14px',
    fontWeight: '600',
    borderBottom: '1px solid #dee2e6'
};

const inputStyle = {
    width: '100%',
    padding: '6px 10px',
    border: '1px solid #ddd',
    borderRadius: '3px',
    fontSize: '13px',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    backgroundColor: '#f5f5f5',
    color: 'black'
};

const FunctionalSpecificationViewForm = ({ selectedProject, onBackToLanding }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { handleAuthError } = useSession();
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(true);
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

    useEffect(() => {
        const fetchRecordData = async () => {
            try {
                setLoading(true);
                const idToken = await getIdToken();
                if (!idToken) {
                    handleAuthError();
                    setLoading(false);
                    return;
                }

                const headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                };

                const response = await fetch(`https://7o6jl6k0pd.execute-api.ap-south-1.amazonaws.com/New/ricew/get/byRICEWRequestFormId?RICEWRequestFormId=${id}`, {
                    headers: headers
                });

                if (response.status === 401 || response.status === 403) {
                    handleAuthError();
                    setLoading(false);
                    return;
                }

                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.data) {
                        const data = result.data;
                        const sanitizeArray = (str) => {
                            if (!str) return [];
                            return str.split(', ').map(m => DOMPurify.sanitize(m.trim(), { ALLOWED_TAGS: [] })).filter(m => m);
                        };

                        setFormData({
                            ricewType: DOMPurify.sanitize(ricewTypeMapping[data.RICEW_Type] || data.RICEW_Type || '', { ALLOWED_TAGS: [] }),
                            ricewName: DOMPurify.sanitize(data.RICEW_Name || '', { ALLOWED_TAGS: [] }),
                            ricewDescription: DOMPurify.sanitize(data.RICEW_Description || '', { ALLOWED_TAGS: [] }),
                            processStream: DOMPurify.sanitize(data.GI_Process_Stream || '', { ALLOWED_TAGS: [] }),
                            application: DOMPurify.sanitize(data.GI_Application || '', { ALLOWED_TAGS: [] }),
                            l0Process: DOMPurify.sanitize(data.GI_L0_Process || '', { ALLOWED_TAGS: [] }),
                            module: sanitizeArray(data.GI_Module),
                            crossStreamImpact: DOMPurify.sanitize(data.Cross_Stream_Impact || '', { ALLOWED_TAGS: [] }),
                            psProcessStream: DOMPurify.sanitize(data.CS_Process_Stream || '', { ALLOWED_TAGS: [] }),
                            psApplication: DOMPurify.sanitize(data.CS_Application || '', { ALLOWED_TAGS: [] }),
                            psL0Process: DOMPurify.sanitize(data.CS_L0_Process || '', { ALLOWED_TAGS: [] }),
                            psModule: sanitizeArray(data.CS_Module),
                            ricewStatus: DOMPurify.sanitize(data.RICEW_Status || '', { ALLOWED_TAGS: [] }),
                            complexity: DOMPurify.sanitize(data.RICEW_Complexity || '', { ALLOWED_TAGS: [] }),
                            ricewEffort: DOMPurify.sanitize(data.RICEW_Effort_Hours || '', { ALLOWED_TAGS: [] }),
                            ricewCost: DOMPurify.sanitize(data.RICEW_Cost || '', { ALLOWED_TAGS: [] }),
                            waveCode: DOMPurify.sanitize(data.Wave_Code || '', { ALLOWED_TAGS: [] }),
                            waveName: DOMPurify.sanitize(data.Wave_Name || '', { ALLOWED_TAGS: [] }),
                            rolloutCode: DOMPurify.sanitize(data.Rollout_Code || '', { ALLOWED_TAGS: [] }),
                            rolloutName: DOMPurify.sanitize(data.Rollout_Name || '', { ALLOWED_TAGS: [] }),
                            legalEntityCode: DOMPurify.sanitize(data.Legal_Entity_Code || '', { ALLOWED_TAGS: [] }),
                            legalEntityName: DOMPurify.sanitize(data.Legal_Entity_Name || '', { ALLOWED_TAGS: [] }),
                            businessOwnerName: DOMPurify.sanitize(data.Business_Owner_Name || '', { ALLOWED_TAGS: [] }),
                            businessOwnerEmail: DOMPurify.sanitize(data.Business_Owner_Email || '', { ALLOWED_TAGS: [] }),
                            functionalOwnerName: DOMPurify.sanitize(data.Functional_Owner_Name || '', { ALLOWED_TAGS: [] }),
                            functionalOwnerEmail: DOMPurify.sanitize(data.Functional_Owner_Email || '', { ALLOWED_TAGS: [] }),
                            technicalOwnerName: DOMPurify.sanitize(data.Technical_Owner_Name || '', { ALLOWED_TAGS: [] }),
                            technicalOwnerEmail: DOMPurify.sanitize(data.Technical_Owner_Email || '', { ALLOWED_TAGS: [] }),
                            notes: DOMPurify.sanitize(data.RICEW_Note || '', { ALLOWED_TAGS: [] })
                        });
                    }
                }
            } catch (error) {
                console.error('Error fetching record data:', error);
                handleAuthError();
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchRecordData();
        }
    }, [id, handleAuthError]);

    const renderReadOnlyField = (label, value, required = false, width = '220px', labelWidth = '120px') => (
        <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <label style={{ ...labelStyle, width: labelWidth }}>
                    {label} {required && <span style={{ color: 'red' }}>*</span>}
                </label>
                <input
                    type="text"
                    value={Array.isArray(value) ? value.join(', ') : value || '-'}
                    readOnly={true}
                    style={{
                        ...inputStyle,
                        width: width,
                        cursor: 'not-allowed'
                    }}
                />
            </div>
        </div>
    );

    const renderSection = (title, children) => (
        <div style={{
            backgroundColor: 'white',
            border: '1px solid #dee2e6',
            marginBottom: '1rem',
            overflow: 'visible'
        }}>
            <div style={sectionHeaderStyle}>
                {title}
            </div>
            <div style={{ padding: '12px 16px' }}>
                {children}
            </div>
        </div>
    );

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                backgroundColor: '#f5f5f5'
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
                    <div className="animate-spin" style={{
                        width: '40px',
                        height: '40px',
                        border: '3px solid #f3f3f3',
                        borderTop: '3px solid #3b82f6',
                        borderRadius: '50%'
                    }}></div>
                    <span style={{ fontSize: '16px', color: '#333', fontWeight: '500' }}>
                        Loading...
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="config-main" style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '0', margin: '0' }}>
            {/* Project Info */}
            {selectedProject && (
                <div style={{ padding: '1.5rem 2rem 0.5rem 2rem' }}>
                    <h3 style={{ margin: '0', color: '#333', fontSize: '16px' }}>
                        Project : <span style={{ color: '#007bff' }}>{selectedProject?.name}</span>
                    </h3>
                </div>
            )}

            <div style={{ padding: '1rem 1rem 2rem 1rem', maxWidth: '100%', margin: '0' }}>
                {/* Form Title */}
                <div style={{
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #dee2e6',
                    marginBottom: '1rem',
                    overflow: 'visible',
                }}>
                    <div style={{
                        backgroundColor: '#f8f9fa',
                        padding: '10px 16px',
                        color: '#333',
                        fontSize: '16px',
                        fontWeight: '600',
                        borderBottom: '1px solid #dee2e6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <span>RICEW Request Form</span>
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
                                                        This is a <strong>read-only view</strong> of the RICEW Request Form showing all functional specification details including general information, process streams, status, and ownership.
                                                    </p>
                                                </div>

                                                <div style={{ marginBottom: '16px' }}>
                                                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>Sections overview</strong>
                                                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                                        <li><strong>General Information</strong> — RICEW type, name, description, process stream, and module details.</li>
                                                        <li><strong>Process Stream Information</strong> — Cross-stream impact and related details.</li>
                                                        <li><strong>Status & Effort</strong> — Current status, complexity, effort hours, and cost.</li>
                                                        <li><strong>Implementation Phase</strong> — Wave, rollout, and legal entity information.</li>
                                                        <li><strong>Ownership</strong> — Business, functional, and technical owner details.</li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Form Content */}
                <div>
                    {/* General Information Section */}
                    <div style={{
                        backgroundColor: 'white',
                        border: '1px solid #dee2e6',
                        marginBottom: '1rem',
                        minWidth: '1560px',
                        overflow: 'visible'
                    }}>
                        <div style={sectionHeaderStyle}>
                            General Information
                        </div>
                        <div style={{ padding: '12px 16px' }}>
                            {/* Row 1 */}
                            <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
                                {renderReadOnlyField('RICEW Type', formData.ricewType, true, '220px', '120px')}
                                {renderReadOnlyField('RICEW Name', formData.ricewName, true, '220px', '105px')}
                                {renderReadOnlyField('RICEW Description', formData.ricewDescription, true, '220px', '140px')}
                            </div>

                            {/* Row 2 */}
                            <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
                                {renderReadOnlyField('Process Stream', formData.processStream, true, '220px', '120px')}
                                {renderReadOnlyField('Application', formData.application, true, '220px', '105px')}
                                {renderReadOnlyField('L0 Process', formData.l0Process, false, '220px', '110px')}
                                {renderReadOnlyField('Module', formData.module, false, '300px', '70px')}
                            </div>
                        </div>
                    </div>

                    {/* Two Column Layout for Process Stream and Status */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        {/* Process Stream Information Section */}
                        {renderSection('Process Stream Information',
                            <>
                                {/* Row 1 - Cross Stream Impact */}
                                <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'flex-start' }}>
                                    {renderReadOnlyField('Cross Stream Impact', formData.crossStreamImpact, false, '220px', '150px')}
                                </div>

                                {/* Row 2 - Process Stream and Application */}
                                <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
                                    {renderReadOnlyField('Process Stream', formData.psProcessStream, false, '220px', '110px')}
                                    {renderReadOnlyField('Application', formData.psApplication, false, '220px', '82px')}
                                </div>

                                {/* Row 3 - L0 Process and Module */}
                                <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
                                    {renderReadOnlyField('L0 Process', formData.psL0Process, false, '220px', '110px')}
                                    {renderReadOnlyField('Module', formData.psModule, false, '300px', '82px')}
                                </div>
                            </>
                        )}

                        {/* Status & Effort Information Section */}
                        {renderSection('Status & Effort Information',
                            <>
                                {/* Row 1 - RICEW Status and Complexity */}
                                <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
                                    {renderReadOnlyField('RICEW Status', formData.ricewStatus, false, '220px', '140px')}
                                    {renderReadOnlyField('Complexity', formData.complexity, false, '220px', '98px')}
                                </div>

                                {/* Row 2 - RICEW Effort(Hours) and RICEW Cost */}
                                <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
                                    {renderReadOnlyField('RICEW Effort (Hours)', formData.ricewEffort, false, '220px', '140px')}
                                    {renderReadOnlyField('RICEW Cost', formData.ricewCost, false, '224px', '90px')}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Two Column Layout for Implementation Phase and Ownership */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        {/* Implementation Phase Information Section */}
                        {renderSection('Implementation Phase Information',
                            <>
                                {/* Row 1 - Wave Code and Wave Name */}
                                <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '30px', alignItems: 'flex-start' }}>
                                    {renderReadOnlyField('Wave Code', formData.waveCode, false, '220px', '90px')}
                                    {renderReadOnlyField('Wave Name', formData.waveName, false, '220px', '90px')}
                                </div>

                                {/* Row 2 - Rollout Code and Rollout Name */}
                                <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '30px', alignItems: 'flex-start' }}>
                                    {renderReadOnlyField('Rollout Code', formData.rolloutCode, false, '220px', '90px')}
                                    {renderReadOnlyField('Rollout Name', formData.rolloutName, false, '220px', '90px')}
                                </div>

                                {/* Row 3 - Legal Entity Code and Legal Entity Name */}
                                <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
                                    {renderReadOnlyField('Legal Entity Code', formData.legalEntityCode, false, '190px', '120px')}
                                    {renderReadOnlyField('Legal Entity Name', formData.legalEntityName, false, '220px', '120px')}
                                </div>
                            </>
                        )}

                        {/* Ownership (Project Track) Information Section */}
                        {renderSection('Ownership (Project Track) Information',
                            <>
                                {/* Row 1 - Business Owner and Email */}
                                <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
                                    {renderReadOnlyField('Business Owner', formData.businessOwnerName, false, '250px', '130px')}
                                    {renderReadOnlyField('Email', formData.businessOwnerEmail, false, '250px', '60px')}
                                </div>

                                {/* Row 2 - Functional Owner and Email */}
                                <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
                                    {renderReadOnlyField('Functional Owner', formData.functionalOwnerName, false, '250px', '130px')}
                                    {renderReadOnlyField('Email', formData.functionalOwnerEmail, false, '250px', '60px')}
                                </div>

                                {/* Row 3 - Technical Owner and Email */}
                                <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
                                    {renderReadOnlyField('Technical Owner', formData.technicalOwnerName, false, '250px', '130px')}
                                    {renderReadOnlyField('Email', formData.technicalOwnerEmail, false, '250px', '60px')}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Notes Section */}
                    {renderSection('Notes Section',
                        <div style={{ marginBottom: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                                <label style={{ ...labelStyle, width: '80px', marginTop: '4px' }}>
                                    Notes
                                </label>
                                <textarea
                                    value={formData.notes || '-'}
                                    readOnly={true}
                                    rows={4}
                                    style={{
                                        ...inputStyle,
                                        width: '1200px',
                                        resize: 'vertical',
                                        minHeight: '80px',
                                        cursor: 'not-allowed'
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin {
                    animation: spin 1s linear infinite;
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
        </div>
    );
};

export default FunctionalSpecificationViewForm;
