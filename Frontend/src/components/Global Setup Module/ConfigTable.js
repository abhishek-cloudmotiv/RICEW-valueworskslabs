import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import '../../utils/GlobalSetupShared.css';
import { HelpCircle, X } from 'lucide-react';
import { getIdToken } from '../../utils/cognito-auth';
import DOMPurify from 'dompurify';
import { useSession } from '../../context/SessionContext';
import Loader from '../../utils/Loader';
import GLOBAL_SETUP_API_CONFIG from './config/apiConfig';

const ConfigTable = ({ onClose, selectedProject, setUnsavedChangesChecker }) => {
  const { handleAuthError } = useSession();
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const helpPopupRef = useRef(null);

  // Since this table is read-only, there are never any unsaved changes
  useEffect(() => {
    if (setUnsavedChangesChecker) {
      setUnsavedChangesChecker(() => () => false);
    }
  }, [setUnsavedChangesChecker]);

  const validateAndSanitizeData = (data) => {
    if (!Array.isArray(data)) return [];
    return data.map((item, index) => ({
      id: index + 1,
      objectTypeId: DOMPurify.sanitize(String(item.OBJECT_TYPE_ID || item.objectTypeId || item.oTypeId || '').trim(), { ALLOWED_TAGS: [] }),
      m_obj_type: item.m_obj_type || null,
      objectCode: DOMPurify.sanitize(String(item.OBJECT_CODE || item.objectCode || '').trim(), { ALLOWED_TAGS: [] }),
      objectType: DOMPurify.sanitize(String(item.OBJECT_TYPE || item.objectType || '').trim(), { ALLOWED_TAGS: [] }),
      description: DOMPurify.sanitize(String(item.DESCRIPTION || item.description || '').trim(), { ALLOWED_TAGS: [] }),
      valueType: item.VALUE_TYPE || item.valueType || 'System',
      object_type_id: item.OBJECT_TYPE_ID || item.object_type_id || ''
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

  const { data: configData = [], isLoading, isError } = useQuery({
    queryKey: ['configData', selectedProject?.id],
    queryFn: async () => {
      const idToken = await getIdToken();
      if (!idToken) {
        handleAuthError('Token not found - please login again');
        throw new Error('Token not found');
      }

      const response = await fetch(GLOBAL_SETUP_API_CONFIG.CONFIG_API_URL, {
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

      let rawItems = [];
      if (Array.isArray(result)) {
        rawItems = result;
      } else if (result && Array.isArray(result.data)) {
        rawItems = result.data;
      }

      const filteredItems = rawItems.filter(item =>
        item.DELETE_STATUS !== "Y" && item.deleteStatus !== "true" && item.delete_status !== "true" && item.delete_status !== "yes"
      );

      return validateAndSanitizeData(filteredItems);
    }
  });

  return (
    <div className="config-main" style={{ margin: '2rem 2rem 0 2rem' }}>
      <div style={{ padding: '2rem 2rem 1rem 2rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project : <span style={{ color: '#007bff' }}>{selectedProject?.name}</span></h3>
      </div>
      <div className="config-header" style={{ marginTop: '0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, color: '#333' }}>RICEW Object Type</h2>
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
                        The <strong>RICEW Object Type</strong> page defines the specific categories of objects (Reports, Interfaces, Conversions, Extensions, and Workflows) used in the project. These categories help standardize how project components are classified and managed.
                      </p>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <strong style={{ color: '#1f2937', fontSize: '15px' }}>Why is this used?</strong>
                      <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                        Consistent object classification is essential for accurate project estimation, design, and development. It ensures that all stakeholders have a common understanding of the components being built, which aids in resource allocation and status reporting.
                      </p>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to read the table</strong>
                      <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                        <li><strong>Object Code</strong> — The standardized code for the object type (e.g., R for Report, I for Interface).</li>
                        <li><strong>Object Type</strong> — The full name of the RICEW category.</li>
                        <li><strong>Object Type Description</strong> — A detailed explanation of what falls under this category.</li>
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
        {configData.length === 0 && !isLoading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>No Object Types found.</div>
        ) : (
          <table className="config-table" style={{ fontSize: '15px', width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: '12px', fontSize: '15px', width: '30%', textAlign: 'left', fontWeight: '600' }}>Object Type ID</th>
                <th style={{ padding: '12px', fontSize: '15px', width: '30%', textAlign: 'left', fontWeight: '600' }}>Object Name</th>
                <th style={{ padding: '12px', fontSize: '15px', width: '40%', textAlign: 'left', fontWeight: '600' }}>Description</th>
              </tr>
            </thead>
            <tbody>
              {configData
                .sort((a, b) => {
                  const aId = parseInt(a.object_type_id) || 0;
                  const bId = parseInt(b.object_type_id) || 0;
                  if (aId !== bId) return aId - bId;
                  return 0;
                })
                .map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #edf2f7' }}>
                    <td style={{ padding: '12px', verticalAlign: 'middle', width: '30%', color: '#333' }}>
                      <div style={{ fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.objectCode}
                      </div>
                    </td>
                    <td style={{ padding: '12px', verticalAlign: 'middle', width: '30%', color: '#333' }}>
                      <div style={{ fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.objectType}
                      </div>
                    </td>
                    <td style={{ padding: '12px', verticalAlign: 'middle', width: '40%', color: '#333' }}>
                      <div style={{ fontSize: '14px', lineHeight: '1.5' }}>
                        {item.description}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>

      <Loader loading={isLoading} />
    </div>
  );
};

export default ConfigTable;