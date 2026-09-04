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
import Loader from '../../utils/Loader';

const CloudModulesTable = ({ onClose, selectedProject }) => {
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

    return data.map(item => ({
      application: DOMPurify.sanitize(String(item.app_name || '').trim(), sanitizeConfig),
      module: DOMPurify.sanitize(String(item.module_name || '').trim(), sanitizeConfig),
      application_id: DOMPurify.sanitize(String(item.application_id || '').trim(), sanitizeConfig)
    }));
  };

  // Close help popup when clicking outside
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

  const fetchCloudModulesData = async () => {
    // Get ID token
    const idToken = await getIdToken();
    if (!idToken) {
      handleAuthError('Token not found - please login again');
      throw new Error('Token not found - please login again');
    }

    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    };

    const response = await fetch(GLOBAL_SETUP_API_CONFIG.CLOUD_MODULES_API_URL, {
      headers: headers
    });

    if (response.status === 401 || response.status === 403) {
      handleAuthError('Unauthorized');
      throw new Error('Unauthorized');
    }

    if (response.ok) {
      const result = await response.json();
      const cloudArray = Array.isArray(result) ? result : (result.data || []);
      
      // Sanitize and transform data
      const sanitizedData = validateAndSanitizeData(cloudArray);

      // Sort by application_id only (numeric sort)
      const sortedData = sanitizedData.sort((a, b) => {
        const aAppId = a.application_id || '';
        const bAppId = b.application_id || '';

        // Extract numeric part from application_id (e.g., "application_1" -> 1)
        const aNum = parseInt(aAppId.replace(/\D/g, '')) || 0;
        const bNum = parseInt(bAppId.replace(/\D/g, '')) || 0;

        return aNum - bNum;
      });

      return sortedData;
    }
    throw new Error('Failed to fetch data');
  };

  const { data: cloudModulesData = [], isLoading: loading } = useQuery({
    queryKey: ['cloudModules', selectedProject?.id || 'all'],
    queryFn: fetchCloudModulesData,
    enabled: !!selectedProject,
  });

  return (
    <div className="config-main" style={{ margin: '2rem 2rem 0 2rem' }}>
      <div style={{ padding: '2rem 2rem 1rem 2rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project : <span style={{ color: '#007bff' }}>{selectedProject?.name}</span></h3>
      </div>
      <div className="config-header" style={{ marginTop: '0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2>Cloud Modules</h2>
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
                        The <strong>Cloud Modules</strong> page provides a comprehensive list of all application modules available within the cloud environment for your ERP project. It maps specific functional modules to their parent applications.
                      </p>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <strong style={{ color: '#1f2937', fontSize: '15px' }}>Why is this used?</strong>
                      <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                        This view is essential for understanding the available modular scope of the cloud platform. It allows project managers and consultants to identify which specific modules belong to broader application suites (like Finance, SCM, or HCM), ensuring accurate requirement mapping and resource allocation.
                      </p>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to read the table</strong>
                      <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                        <li><strong>Application</strong> — The parent application or suite name. When multiple modules belong to the same application, the application name is grouped for clarity.</li>
                        <li><strong>Module</strong> — The specific functional module or component.</li>
                      </ul>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <strong style={{ color: '#1f2937', fontSize: '15px' }}>Key behaviors</strong>
                      <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                        <li>Data is automatically sorted by the application's unique ID to maintain a consistent structure.</li>
                        <li>The list is fetched live from the RICE master application registry.</li>
                        <li>Ensure a project is selected to see data relevant to your current project context.</li>
                        <li>The table supports vertical scrolling for large datasets.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Standardized Loading Overlay */}
      <Loader loading={loading} />


      {/* Success Message Popup */}
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

      {/* Error Message Popup */}
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
              <th style={{ padding: '8px 12px', fontSize: '15px' }}>Application</th>
              <th style={{ padding: '8px 12px', fontSize: '15px' }}>Module</th>
            </tr>
          </thead>
          <tbody>
            {cloudModulesData.length > 0 ? (
              cloudModulesData.map((item, index) => {
                const currentApplication = item.application || 'N/A';
                const previousApplication = index > 0 ? (cloudModulesData[index - 1].application || 'N/A') : null;
                const showApplication = currentApplication !== previousApplication;

                return (
                  <tr key={index} style={{ height: '40px' }}>
                    <td style={{ padding: '6px 12px', verticalAlign: 'middle' }}>
                      {showApplication ? currentApplication : ''}
                    </td>
                    <td style={{ padding: '6px 12px', verticalAlign: 'middle' }}>
                      {item.module || 'N/A'}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="2" style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                  No cloud modules data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>


    </div>
  );
};

export default CloudModulesTable;
