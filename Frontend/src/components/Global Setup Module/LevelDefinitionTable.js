import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import '../../utils/GlobalSetupShared.css';
import { HelpCircle, X } from 'lucide-react';
import { getIdToken } from '../../utils/cognito-auth';
import DOMPurify from 'dompurify';
import { useSession } from '../../context/SessionContext';
import SessionExpiredPopup from '../SessionExpiredPopup';
import Loader from '../../utils/Loader';
import GLOBAL_SETUP_API_CONFIG from './config/apiConfig';

const LevelDefinitionTable = ({ onClose, selectedProject, onBackToLanding, onLogout }) => {
  const { handleAuthError } = useSession();
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const helpPopupRef = useRef(null);

  // Click outside handler for help popup
  useEffect(() => {
    const handleClickOutsideHelp = (event) => {
      if (helpPopupRef.current && !helpPopupRef.current.contains(event.target)) {
        setShowHelpPopup(false);
      }
    };

    if (showHelpPopup) {
      document.addEventListener('mousedown', handleClickOutsideHelp);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutsideHelp);
    };
  }, [showHelpPopup]);

  const validateAndSanitizeData = (data) => {
    if (!Array.isArray(data)) return [];
    return data.map((item, index) => ({
      id: item.Level_Definition_id || index + 1,
      levelCode: DOMPurify.sanitize(String(item.Level_Code || '').trim(), { ALLOWED_TAGS: [] }),
      levelShortCode: DOMPurify.sanitize(String(item.Level_Short_Code || '').trim(), { ALLOWED_TAGS: [] }),
      designationTitle: DOMPurify.sanitize(String(item.designation || '').trim(), { ALLOWED_TAGS: [] }),
      roleSummary: DOMPurify.sanitize(String(item.role_summary || '').trim(), { ALLOWED_TAGS: [] }),
      displayOrder: item.display_order || '',
    }));
  };

  const { data: levelData = [], isLoading } = useQuery({
    queryKey: ['levelDefinitions'],
    queryFn: async () => {
      const idToken = await getIdToken();
      if (!idToken) {
        handleAuthError('Token not found - please login again');
        throw new Error('Token not found');
      }

      const response = await fetch(GLOBAL_SETUP_API_CONFIG.LEVEL_DEFINITION_API_URL, {
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
        throw new Error('Failed to fetch level data');
      }

      const result = await response.json();
      const rowsArray = Array.isArray(result) ? result : (result.data || []);

      const activeRecords = rowsArray.filter(item =>
        item.delete_status === "false" || item.delete_status === undefined
      );

      const sanitizedData = validateAndSanitizeData(activeRecords);

      // Sort by display order
      return sanitizedData.sort((a, b) => {
        const orderA = parseInt(a.displayOrder) || 999;
        const orderB = parseInt(b.displayOrder) || 999;
        return orderA - orderB;
      });
    }
  });

  return (
    <div className="config-main" style={{ margin: '2rem 2rem 0 2rem' }}>
      <div style={{ padding: '2rem 2rem 1rem 2rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project : <span style={{ color: '#007bff' }}>{selectedProject?.name}</span></h3>
      </div>
      <div className="config-header" style={{ marginTop: '0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, color: '#333' }}>Resource Level Definition</h2>
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
                        The <strong>Resource Level Definition</strong> page is used to define standardized seniority or proficiency levels for project personnel. These levels help in categorizing team members based on their experience and technical expertise.
                      </p>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <strong style={{ color: '#1f2937', fontSize: '15px' }}>Why is this used?</strong>
                      <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                        Defining clear resource levels is critical for financial planning, as different levels typically map to different cost and bill rates. It also ensures that RICEW requests and tasks are assigned to resources with the appropriate seniority level for the complexity involved.
                      </p>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to read the table</strong>
                      <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                        <li><strong>Level</strong> — The hierarchical rank (e.g., L1, L2).</li>
                        <li><strong>Level Code</strong> — A standardized short code used across the enterprise.</li>
                        <li><strong>Title</strong> — The official designation for the level (e.g., Senior Consultant).</li>
                        <li><strong>Role Description</strong> — A brief overview of the expectations for this level.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="table-container" style={{ maxHeight: 'calc(100vh - 265px)', overflowY: 'auto' }}>
        <table className="config-table" style={{ fontSize: '15px' }}>
          <thead>
            <tr>
              <th style={{ padding: '8px 12px', fontSize: '16px', width: '6%', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Level</th>
              <th style={{ padding: '8px 12px', fontSize: '16px', width: '12%', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Level Code</th>
              <th style={{ padding: '8px 12px', fontSize: '16px', width: '15%', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Title</th>
              <th style={{ padding: '8px 12px', fontSize: '16px', width: '28%', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Role Description</th>
            </tr>
          </thead>
          <tbody>
            {levelData.length === 0 && !isLoading ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>
                  No level definitions found.
                </td>
              </tr>
            ) : (
              levelData.map((item) => (
                <tr key={item.id} data-row-id={item.id} style={{ height: '40px', backgroundColor: 'transparent' }}>
                  <td style={{ padding: '8px 12px', verticalAlign: 'middle', borderBottom: '1px solid #dee2e6' }}>
                    <span>{item.levelCode}</span>
                  </td>
                  <td style={{ padding: '8px 12px', verticalAlign: 'middle', borderBottom: '1px solid #dee2e6' }}>
                    <span>{item.levelShortCode}</span>
                  </td>
                  <td style={{ padding: '8px 12px', verticalAlign: 'middle', borderBottom: '1px solid #dee2e6' }}>
                    <span>{item.designationTitle}</span>
                  </td>
                  <td style={{ padding: '8px 12px', verticalAlign: 'top', borderBottom: '1px solid #dee2e6' }}>
                    <div style={{
                      wordWrap: 'break-word',
                      whiteSpace: 'normal',
                      fontSize: '14px',
                      lineHeight: '1.4'
                    }}>
                      {item.roleSummary || ''}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Standardized Loading Overlay */}
      <Loader loading={isLoading} />

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      <SessionExpiredPopup />
    </div>
  );
};

export default LevelDefinitionTable;
