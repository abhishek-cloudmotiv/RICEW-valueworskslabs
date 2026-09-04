import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import '../../utils/GlobalSetupShared.css';
import { HelpCircle, X } from 'lucide-react';
import { getIdToken } from '../../utils/cognito-auth';
import DOMPurify from 'dompurify';
import { useSession } from '../../context/SessionContext';
import Loader from '../../utils/Loader';
import GLOBAL_SETUP_API_CONFIG from './config/apiConfig';

const RicewStatusTable = ({ onClose, selectedProject, setUnsavedChangesChecker }) => {
  const { handleAuthError } = useSession();
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const helpPopupRef = useRef(null);

  // Since this table is read-only, there are never any unsaved changes
  useEffect(() => {
    if (setUnsavedChangesChecker) {
      setUnsavedChangesChecker(() => () => false);
    }
  }, [setUnsavedChangesChecker]);

  const sanitizeConfig = { ALLOWED_TAGS: [] };

  const validateAndSanitizeData = (data) => {
    if (!Array.isArray(data)) return [];
    return data.map((item, index) => ({
      id: index + 1,
      statusId: DOMPurify.sanitize(String(item.Status_Code || '').trim(), sanitizeConfig),
      status_id: item.RICEW_Status_Id || null,
      statusName: DOMPurify.sanitize(String(item.Status_Name || '').trim(), sanitizeConfig),
      description: DOMPurify.sanitize(String(item.Status_Description || '').trim(), sanitizeConfig)
    }));
  };

  // Click outside handler for help popup
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

  const { data: ricewData = [], isLoading } = useQuery({
    queryKey: ['ricewStatuses'],
    queryFn: async () => {
      const idToken = await getIdToken();
      if (!idToken) {
        handleAuthError('Token not found - please login again');
        throw new Error('Token not found');
      }

      const response = await fetch(GLOBAL_SETUP_API_CONFIG.RICEW_STATUS_API_URL, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        throw new Error('Unauthorized');
      }

      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      const result = await response.json();
      const dataArray = Array.isArray(result) ? result : (result.data || []);
      const apiData = dataArray.filter(item => item.delete_status !== "true");

      return validateAndSanitizeData(apiData);
    }
  });

  return (
    <div className="config-main" style={{ margin: '2rem 2rem 0 2rem' }}>
      <div style={{ padding: '2rem 2rem 1rem 2rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project : <span style={{ color: '#007bff' }}>{selectedProject?.name}</span></h3>
      </div>
      <div className="config-header" style={{ marginTop: '0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, color: '#333' }}>RICEW Status</h2>
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

          {/* Help Modal Overlay */}
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
              zIndex: 3000,
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
                    <div style={{ marginBottom: '14px' }}>
                      <strong style={{ color: '#1f2937', fontSize: '15px' }}>What is this page?</strong>
                      <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                        The <strong>RICEW Status</strong> page defines the standardized lifecycle stages a RICEW object goes through, from initial request to deployment.
                      </p>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <strong style={{ color: '#1f2937', fontSize: '15px' }}>Why is this used?</strong>
                      <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                        Defining these statuses ensures a consistent workflow across the project. It provides visibility into the progress of individual components and helps project managers track development velocity and identify bottlenecks.
                      </p>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to read the table</strong>
                      <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                        <li><strong>Status Code</strong> — A short identifier for the status (e.g., RQR for Requested).</li>
                        <li><strong>Status Name</strong> — The descriptive name of the lifecycle stage.</li>
                        <li><strong>Description</strong> — A detailed explanation of what this status means in the development process.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="table-container" style={{ height: 'calc(100vh - 265px)', overflowY: 'auto' }}>
        <table className="config-table" style={{ fontSize: '15px', width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ padding: '16px 24px', fontSize: '15px', width: '25%', textAlign: 'left', borderBottom: '1px solid #dee2e6', fontWeight: 'bold' }}>Status Code</th>
              <th style={{ padding: '16px 24px', fontSize: '15px', width: '35%', textAlign: 'left', borderBottom: '1px solid #dee2e6', fontWeight: 'bold' }}>Status Name</th>
              <th style={{ padding: '16px 24px', fontSize: '15px', width: '40%', textAlign: 'left', borderBottom: '1px solid #dee2e6', fontWeight: 'bold' }}>Description</th>
            </tr>
          </thead>
          <tbody>
            {ricewData.length === 0 && !isLoading ? (
              <tr>
                <td colSpan="3" style={{ textAlign: 'center', padding: '20px' }}>
                  No RICEW status definitions found.
                </td>
              </tr>
            ) : (
              ricewData
                .sort((a, b) => {
                  const aId = parseInt(a.status_id) || 0;
                  const bId = parseInt(b.status_id) || 0;
                  return aId - bId;
                })
                .map((item) => (
                  <tr key={item.id} style={{ height: '56px', backgroundColor: 'transparent' }}>
                    <td style={{ padding: '16px 24px', verticalAlign: 'middle', borderBottom: '1px solid #dee2e6' }}>
                      <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#555' }}>
                        {item.statusId}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', verticalAlign: 'middle', borderBottom: '1px solid #dee2e6' }}>
                      <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#555' }}>
                        {item.statusName}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', verticalAlign: 'middle', borderBottom: '1px solid #dee2e6' }}>
                      <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#555' }}>
                        {item.description}
                      </div>
                    </td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>

      <Loader loading={isLoading} />
      
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default RicewStatusTable;