import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import '../../utils/GlobalSetupShared.css';
import { HelpCircle, X } from 'lucide-react';
import { getIdToken } from '../../utils/cognito-auth';
import DOMPurify from 'dompurify';
import { useSession } from '../../context/SessionContext';
import SessionExpiredPopup from '../SessionExpiredPopup';
import Loader from '../../utils/Loader';

const FunctionalScope = ({ onClose, selectedProject }) => {
  const { handleAuthError, userId } = useSession();
  const queryClient = useQueryClient();
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const helpPopupRef = useRef(null);
  const [checkedModules, setCheckedModules] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleCheckboxChange = (moduleId) => {
    setCheckedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  const handleSave = async () => {
    if (!selectedProject?.id) {
      setErrorMessage("Please select a project first.");
      setShowErrorMessage(true);
      return;
    }

    const selections = functionalScopeData
      .filter(item => item.module_name && checkedModules[item.id])
      .map(item => ({
        APPLICATION_STREAM_PROCESS_MAP_ID: item.map_id,
        PROCESS_STREAM_ID: item.stream_id,
        MODULE_ID: item.module_id
      }));

    setIsSaving(true);
    setShowSuccessMessage(false);
    setShowErrorMessage(false);

    try {
      const idToken = await getIdToken();
      if (!idToken) {
        handleAuthError('Token not found - please login again');
        throw new Error('Token not found');
      }

      const payload = {
        project_id: selectedProject.id,
        created_by: userId || '',
        updated_by: userId || '',
        selections: selections
      };

      const response = await fetch('https://ec2450jptj.execute-api.ap-south-1.amazonaws.com/New/rice/save/functionalScope', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(payload)
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        throw new Error('Unauthorized');
      }

      const result = await response.json();
      if (response.ok && result.success) {
        setSuccessMessage(result.message || 'Functional Scope synced successfully');
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 5000);
        
        // Silently fetch data again
        queryClient.invalidateQueries({ queryKey: ['activeFunctionalScopes', selectedProject?.id] });
      } else {
        throw new Error(result.error || 'Failed to save functional scope');
      }
    } catch (err) {
      console.error('Error saving functional scope:', err);
      setErrorMessage(err.message || 'An error occurred while saving.');
      setShowErrorMessage(true);
      setTimeout(() => setShowErrorMessage(false), 5000);
    } finally {
      setIsSaving(false);
    }
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

  const sanitizeConfig = { ALLOWED_TAGS: [] };

  const validateAndSanitizeData = (data) => {
    if (!Array.isArray(data)) return [];

    const flattened = [];
    data.forEach(suiteItem => {
      const suiteName = DOMPurify.sanitize(String(suiteItem.APPLICATION_SUITE_NAME || '').trim(), sanitizeConfig);
      const processStreamName = DOMPurify.sanitize(String(suiteItem.PROCESS_STREAM_NAME || '').trim(), sanitizeConfig);

      if (suiteItem.MODULES && Array.isArray(suiteItem.MODULES) && suiteItem.MODULES.length > 0) {
        suiteItem.MODULES.forEach(mod => {
          flattened.push({
            id: `${suiteItem.APPLICATION_STREAM_PROCESS_MAP_ID}-${suiteItem.PROCESS_STREAM_ID}-${mod.MODULE_ID}`,
            map_id: suiteItem.APPLICATION_STREAM_PROCESS_MAP_ID,
            stream_id: suiteItem.PROCESS_STREAM_ID,
            module_id: mod.MODULE_ID,
            application_suite_name: suiteName,
            process_stream_name: processStreamName,
            module_name: DOMPurify.sanitize(String(mod.MODULE_NAME || '').trim(), sanitizeConfig)
          });
        });
      } else {
        flattened.push({
          id: `${suiteItem.APPLICATION_STREAM_PROCESS_MAP_ID}-${suiteItem.PROCESS_STREAM_ID}-none`,
          application_suite_name: suiteName,
          process_stream_name: processStreamName,
          module_name: ''
        });
      }
    });

    return flattened;
  };

  const fetchFunctionalScopeData = async () => {
    const idToken = await getIdToken();
    if (!idToken) {
      handleAuthError('Token not found - please login again');
      throw new Error('Token not found - please login again');
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    };

    const response = await fetch('https://ec2450jptj.execute-api.ap-south-1.amazonaws.com/New/rice/get/oracleApplicationProcessStream', {
      headers: headers
    });

    if (response.status === 401 || response.status === 403) {
      handleAuthError('Unauthorized - session expired');
      throw new Error('Unauthorized - session expired');
    }

    if (response.ok) {
      const result = await response.json();
      const streamArray = Array.isArray(result) ? result : (result.data || []);
      return validateAndSanitizeData(streamArray);
    }
    throw new Error('Failed to fetch data');
  };

  const { data: functionalScopeData = [], isLoading: loading } = useQuery({
    queryKey: ['functionalScope', selectedProject?.id || 'all'],
    queryFn: fetchFunctionalScopeData,
    enabled: !!selectedProject,
  });

  const fetchActiveScopesData = async () => {
    if (!selectedProject?.id) return [];
    const idToken = await getIdToken();
    if (!idToken) return [];
    
    const response = await fetch(`https://ec2450jptj.execute-api.ap-south-1.amazonaws.com/New/rice/get/functionalScope?project_id=${selectedProject.id}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      }
    });

    if (response.ok) {
      const result = await response.json();
      return result.data || [];
    }
    return [];
  };

  const { data: activeScopesData, isLoading: activeLoading } = useQuery({
    queryKey: ['activeFunctionalScopes', selectedProject?.id],
    queryFn: fetchActiveScopesData,
    enabled: !!selectedProject?.id,
  });

  useEffect(() => {
    if (!activeScopesData) return;

    if (activeScopesData.length > 0) {
      const initialChecked = {};
      activeScopesData.forEach(group => {
        const mapId = group.APPLICATION_STREAM_PROCESS_MAP_ID;
        (group.process_streams || []).forEach(stream => {
          const streamId = stream.PROCESS_STREAM_ID;
          (stream.modules || []).forEach(mod => {
            const moduleId = mod.MODULE_ID;
            const uniqueId = `${mapId}-${streamId}-${moduleId}`;
            initialChecked[uniqueId] = true;
          });
        });
      });
      setCheckedModules(initialChecked);
    } else {
      setCheckedModules({});
    }
  }, [activeScopesData, selectedProject?.id]);

  return (
    <div className="config-main" style={{ margin: '2rem 2rem 0 2rem' }}>
      <div style={{ padding: '2rem 2rem 1rem 2rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project : <span style={{ color: '#007bff' }}>{selectedProject?.name}</span></h3>
      </div>
      <div className="config-header" style={{ marginTop: '0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, color: '#333' }}>Functional Scope</h2>
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
                        The <strong>Functional Scope</strong> page defines the functional requirements and scope of the project.
                      </p>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <strong style={{ color: '#1f2937', fontSize: '15px' }}>Why is this used?</strong>
                      <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                        Understanding the functional scope is crucial for planning implementations, allocating resources, and tracking functionality changes across different phases.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Loader loading={loading || activeLoading} />

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

      <div className="table-container" style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
        <table className="config-table" style={{ fontSize: '15px' }}>
          <thead>
            <tr>
              <th style={{ padding: '8px 12px', fontSize: '15px' }}>Oracle Application Suite</th>
              <th style={{ padding: '8px 12px', fontSize: '15px' }}>Process Stream</th>
              <th style={{ padding: '8px 12px', fontSize: '15px' }}>Oracle Module</th>
              <th style={{ padding: '8px 12px', fontSize: '15px', width: '50px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {functionalScopeData.length > 0 ? (
              functionalScopeData.map((item, index) => {
                const currentSuiteName = item.application_suite_name || 'No Suite Data';
                const previousSuiteName = index > 0 ? (functionalScopeData[index - 1].application_suite_name || 'No Suite Data') : null;
                const showSuiteName = currentSuiteName !== previousSuiteName;

                const currentStreamName = item.process_stream_name || 'No Process Stream Data';
                // Group process stream if it's identical and part of the same suite
                const previousStreamName = index > 0 && !showSuiteName ? (functionalScopeData[index - 1].process_stream_name || 'No Process Stream Data') : null;
                const showStreamName = currentStreamName !== previousStreamName;

                return (
                  <tr key={item.id || index} style={{ height: '40px' }}>
                    <td style={{ padding: '6px 12px', verticalAlign: 'middle' }}>
                      {showSuiteName ? currentSuiteName : ''}
                    </td>
                    <td style={{ padding: '6px 12px', verticalAlign: 'middle' }}>
                      {showStreamName ? currentStreamName : ''}
                    </td>
                    <td style={{ padding: '6px 12px', verticalAlign: 'middle' }}>
                      {item.module_name || 'No Module Data'}
                    </td>
                    <td style={{ padding: '6px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                      {item.module_name ? (
                        <input
                          type="checkbox"
                          checked={!!checkedModules[item.id]}
                          onChange={() => handleCheckboxChange(item.id)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                      ) : null}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                  No Functional Scope data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ padding: '20px', display: 'flex', justifyContent: 'flex-start' }}>
        <button
          onClick={handleSave}
          disabled={isSaving}
          style={{
            backgroundColor: isSaving ? '#6c757d' : '#28a745',
            color: 'white',
            border: 'none',
            padding: '10px 24px',
            borderRadius: '4px',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            fontSize: '15px',
            fontWeight: '500',
            transition: 'background-color 0.2s',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
          onMouseEnter={(e) => { if (!isSaving) e.target.style.backgroundColor = '#218838'; }}
          onMouseLeave={(e) => { if (!isSaving) e.target.style.backgroundColor = '#28a745'; }}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <SessionExpiredPopup />

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default FunctionalScope;
