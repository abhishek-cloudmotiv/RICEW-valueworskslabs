import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import '../../utils/GlobalSetupShared.css';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, X } from 'lucide-react';
import { getIdToken } from '../../utils/cognito-auth';
import DOMPurify from 'dompurify';
import { useAuth } from '../../context/AuthContext';
import GLOBAL_SETUP_API_CONFIG from './config/apiConfig';
import { useSession } from '../../context/SessionContext';
import SessionExpiredPopup from '../SessionExpiredPopup';
import Loader from '../../utils/Loader';

const ProcessStreamOracleApplication = ({ onClose, selectedProject }) => {
  const { handleAuthError } = useSession();
  const navigate = useNavigate();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const helpPopupRef = useRef(null);

  const sanitizeConfig = { ALLOWED_TAGS: [] };

  const validateAndSanitizeData = (data) => {
    if (!Array.isArray(data)) return [];

    const sanitized = data.map(item => ({
      stream_module_map_id: item.STREAM_MODULE_MAP_ID || null,
      module_id: item.MODULE_ID || null,
      module_code: DOMPurify.sanitize(String(item.MODULE_CODE || '').trim(), sanitizeConfig),
      oracle_module: DOMPurify.sanitize(String(item.MODULE_NAME || '').trim(), sanitizeConfig),
      process_stream_id: item.PROCESS_STREAM_ID || null,
      process_stream: DOMPurify.sanitize(String(item.PROCESS_STREAM_NAME || '').trim(), sanitizeConfig),
      process_stream_code: DOMPurify.sanitize(String(item.PROCESS_STREAM_CODE || '').trim(), sanitizeConfig),
      created_by: DOMPurify.sanitize(String(item.CREATED_BY || '').trim(), sanitizeConfig),
      creation_date: item.CREATION_DATE || null,
    }));

    return sanitized;
  };

  const fetchProcessStreamOracleApplicationData = async () => {
    const idToken = await getIdToken();
    if (!idToken) {
      handleAuthError('Token not found - please login again');
      throw new Error('Token not found - please login again');
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    };

    const response = await fetch(GLOBAL_SETUP_API_CONFIG.PROCESS_STREAM_ORACLE_APPLICATION_API_URL, {
      headers: headers
    });

    if (response.status === 401 || response.status === 403) {
      handleAuthError('Unauthorized - session expired');
      throw new Error('Unauthorized - session expired');
    }

    if (response.ok) {
      const result = await response.json();
      const dataArray = Array.isArray(result) ? result : (result.data || []);
      return validateAndSanitizeData(dataArray);
    }
    throw new Error('Failed to fetch data');
  };

  const { data: processStreamOracleApplicationData = [], isLoading: loading } = useQuery({
    queryKey: ['processStreamOracleApplication', selectedProject?.id || 'all'],
    queryFn: fetchProcessStreamOracleApplicationData,
    enabled: !!selectedProject,
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (helpPopupRef.current && !helpPopupRef.current.contains(event.target)) {
        setShowHelpPopup(false);
      }
    };

    if (showHelpPopup) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showHelpPopup]);

  return (
    <div className="config-main" style={{ margin: '2rem 2rem 0 2rem' }}>
      <div style={{ padding: '2rem 2rem 1rem 2rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project : <span style={{ color: '#007bff' }}>{selectedProject?.name}</span></h3>
      </div>
      <div className="config-header" style={{ marginTop: '0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2>Process Streams</h2>
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
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#3b4b5e'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#4D5C74'}
          >
            <HelpCircle size={16} />
            Help
          </button>
          {showHelpPopup && (
            <div style={{
              position: 'fixed',
              top: '0',
              left: '0',
              right: '0',
              bottom: '0',
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 3000
            }}>
              <div ref={helpPopupRef} style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
                width: '800px',
                maxWidth: '90vw',
                maxHeight: '85vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative'
              }}>
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
                        The <strong>Process Streams</strong> page displays how specific Oracle Cloud modules (such as Fusion Service, Supply Planning, Field Service) support various business process streams. It provides a detailed view of module-to-process-stream relationships for the selected project.
                      </p>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <strong style={{ color: '#1f2937', fontSize: '15px' }}>Why is this used?</strong>
                      <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                        This view helps teams understand which Oracle applications support specific business processes. It's essential for cross-functional planning, requirement analysis, and ensuring that the selected Oracle modules align with the business process needs of the project.
                      </p>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to read the table</strong>
                      <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                        <li><strong>Process Stream</strong> — The business process stream name (e.g., Customer to Service, Supply to Deliver). When multiple modules support the same stream, the stream name appears only once (grouped).</li>
                        <li><strong>Oracle Module</strong> — The Oracle Cloud module/application name that supports this process stream (e.g., Fusion Service, Supply Planning, Field Service).</li>
                        <li><strong>Module Code</strong> — The unique code identifier for the Oracle module (e.g., SVC, SP, FS).</li>
                      </ul>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <strong style={{ color: '#1f2937', fontSize: '15px' }}>Key behaviors</strong>
                      <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                        <li>Data is fetched live from the Oracle Cloud master data API and automatically sorted by sequence number.</li>
                        <li>Process streams are grouped — when multiple modules support the same stream, the stream name appears only once for clarity.</li>
                        <li>Your session must be active — if it expires, you will be prompted to log in again.</li>
                        <li>Use the scrollbar to browse if the list is long.</li>
                        <li>All data is sanitized for security purposes before display.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Loader loading={loading} />

      {showSuccessMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: '#10b981',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          zIndex: 10000,
          animation: 'slideIn 0.3s ease-out'
        }}>
          <span style={{ fontWeight: '500' }}>{successMessage}</span>
          <X size={18} style={{ cursor: 'pointer' }} onClick={() => setShowSuccessMessage(false)} />
        </div>
      )}

      {showErrorMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: '#ef4444',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          zIndex: 10000,
          animation: 'slideIn 0.3s ease-out'
        }}>
          <span style={{ fontWeight: '500' }}>{errorMessage}</span>
          <X size={18} style={{ cursor: 'pointer' }} onClick={() => setShowErrorMessage(false)} />
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      <div className="table-container" style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
        <table className="config-table" style={{ fontSize: '15px' }}>
          <thead>
            <tr>
              <th style={{ padding: '8px 12px', fontSize: '15px' }}>Process Stream</th>
              <th style={{ padding: '8px 12px', fontSize: '15px' }}>Oracle Module</th>
              <th style={{ padding: '8px 12px', fontSize: '15px' }}>Module Code</th>
            </tr>
          </thead>
          <tbody>
            {processStreamOracleApplicationData.length > 0 ? (
              processStreamOracleApplicationData.map((item, index) => {
                const currentStreamName = item.process_stream || 'No Stream Data';
                const previousStreamName = index > 0 ? (processStreamOracleApplicationData[index - 1].process_stream || 'No Stream Data') : null;
                const showStreamName = currentStreamName !== previousStreamName;

                return (
                  <tr key={index} style={{ height: '40px' }}>
                    <td style={{ padding: '6px 12px', verticalAlign: 'middle' }}>
                      {showStreamName ? currentStreamName : ''}
                    </td>
                    <td style={{ padding: '6px 12px', verticalAlign: 'middle' }}>
                      {item.oracle_module || 'No Module Data'}
                    </td>
                    <td style={{ padding: '6px 12px', verticalAlign: 'middle' }}>
                      {item.module_code || 'No Code Data'}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                  No process stream & Oracle module mapping data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <SessionExpiredPopup />
    </div>
  );
};

export default ProcessStreamOracleApplication;
