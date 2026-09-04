import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import '../../utils/GlobalSetupShared.css';
import { HelpCircle, X } from 'lucide-react';
import { getIdToken } from '../../utils/cognito-auth';
import { useSession } from '../../context/SessionContext';
import SessionExpiredPopup from '../SessionExpiredPopup';
import Loader from '../../utils/Loader';

const DataMigration = ({ onClose, selectedProject }) => {
  const { handleAuthError, userId } = useSession();
  const queryClient = useQueryClient();
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const helpPopupRef = useRef(null);
  const [checkedItems, setCheckedItems] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleCheckboxChange = (id) => {
    setCheckedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const fetchConversionObjects = async () => {
    const idToken = await getIdToken();
    if (!idToken) {
      handleAuthError('Token not found - please login again');
      throw new Error('Token not found');
    }

    const response = await fetch('https://ec2450jptj.execute-api.ap-south-1.amazonaws.com/New/rice/get/conversionObjects', {
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
    return result.data || [];
  };

  const { data: rawConversionData = [], isLoading } = useQuery({
    queryKey: ['conversionObjects'],
    queryFn: fetchConversionObjects,
  });

  const fetchActiveScopes = async () => {
    if (!selectedProject?.id) return [];
    
    const idToken = await getIdToken();
    if (!idToken) {
      handleAuthError('Token not found - please login again');
      throw new Error('Token not found');
    }

    const response = await fetch(`https://ec2450jptj.execute-api.ap-south-1.amazonaws.com/New/rice/get/dataMigrationScope?project_id=${selectedProject.id}`, {
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
      throw new Error('Failed to fetch active data migration scopes');
    }

    const result = await response.json();
    return result.data || [];
  };

  const { data: activeScopesData = [], isLoading: isActiveScopesLoading } = useQuery({
    queryKey: ['activeDataMigration', selectedProject?.id],
    queryFn: fetchActiveScopes,
    enabled: !!selectedProject?.id
  });

  useEffect(() => {
    if (activeScopesData && activeScopesData.length > 0) {
      const initialChecked = {};
      activeScopesData.forEach(group => {
        if (group.conversion_objects && Array.isArray(group.conversion_objects)) {
          group.conversion_objects.forEach(obj => {
            initialChecked[obj.CONVERSION_OBJECT_ID] = true;
          });
        }
      });
      setCheckedItems(initialChecked);
    } else {
      setCheckedItems({});
    }
  }, [activeScopesData, selectedProject?.id]);

  const conversionData = React.useMemo(() => {
    return [...rawConversionData].sort((a, b) => {
      const streamA = (a.PROCESS_STREAM_NAME || '').toLowerCase();
      const streamB = (b.PROCESS_STREAM_NAME || '').toLowerCase();
      if (streamA < streamB) return -1;
      if (streamA > streamB) return 1;

      const classA = (a.CLASSIFICATION || '').toLowerCase();
      const classB = (b.CLASSIFICATION || '').toLowerCase();
      if (classA < classB) return -1;
      if (classA > classB) return 1;

      return 0;
    });
  }, [rawConversionData]);

  const handleSave = async () => {
    if (!selectedProject?.id) {
      setErrorMessage('Please select a project first.');
      setShowErrorMessage(true);
      setTimeout(() => setShowErrorMessage(false), 5000);
      return;
    }

    setIsSaving(true);
    setShowSuccessMessage(false);
    setShowErrorMessage(false);

    try {
      const selections = Object.keys(checkedItems)
        .filter(key => checkedItems[key])
        .map(key => {
          const item = conversionData.find(d => String(d.CONVERSION_OBJECT_ID) === String(key));
          return {
            CONVERSION_OBJECT_ID: key,
            PROCESS_STREAM_ID: item ? item.PROCESS_STREAM_ID : null
          };
        }).filter(sel => sel.PROCESS_STREAM_ID);

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

      const response = await fetch('https://ec2450jptj.execute-api.ap-south-1.amazonaws.com/New/rice/save/dataMigrationScope', {
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
        setSuccessMessage(result.message || 'Data Migration Scope synced successfully');
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 5000);
        
        // Silently fetch data again
        queryClient.invalidateQueries({ queryKey: ['activeDataMigration', selectedProject?.id] });
      } else {
        throw new Error(result.error || 'Failed to save data migration scope');
      }
    } catch (err) {
      console.error('Error saving data migration scope:', err);
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
    }
  }, [showHelpPopup]);

  return (
    <div className="config-main" style={{ margin: '2rem 2rem 0 2rem' }}>
      <div style={{ padding: '2rem 2rem 1rem 2rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project : <span style={{ color: '#007bff' }}>{selectedProject?.name}</span></h3>
      </div>
      <div className="config-header" style={{ marginTop: '0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, color: '#333' }}>Data Migration</h2>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                      color: '#64748b',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#0f172a'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
                  >
                    <X size={20} />
                  </button>

                  <div style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#0f172a', marginBottom: '8px' }}>
                      Data Migration Guide
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '15px' }}>
                      Use this page to define and select the necessary data migration objects for your project.
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>How to Use This Table</h3>
                      <ul style={{ listStyleType: 'disc', paddingLeft: '20px', color: '#475569', fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <li><strong>Selecting Objects:</strong> Review the available Conversion Objects logically grouped by Process Stream and Classification. Check the box in the Action column for any objects that apply to your project.</li>
                        <li><strong>Deselecting Objects:</strong> Uncheck any boxes for objects that are no longer required.</li>
                        <li><strong>Saving:</strong> Once you have made your selections, click the <strong>Submit</strong> button at the bottom to securely save your data migration scope to the database.</li>
                      </ul>
                    </div>

                    <div style={{ backgroundColor: '#f1f5f9', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', margin: '0 0 8px 0' }}>Important Notes</h4>
                      <p style={{ margin: '0', color: '#475569', fontSize: '14px', lineHeight: '1.5' }}>
                        The table automatically fetches all standardized conversion objects. The system securely saves only the specific objects you select. If you navigate away from this page before clicking Submit, any unsaved selections will be lost.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

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

      <Loader loading={isLoading || isActiveScopesLoading} />

      <div className="table-container" style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
        <table className="config-table" style={{ fontSize: '15px' }}>
          <thead>
            <tr>
              <th style={{ padding: '8px 12px', fontSize: '15px' }}>Process Stream</th>
              <th style={{ padding: '8px 12px', fontSize: '15px' }}>Classification</th>
              <th style={{ padding: '8px 12px', fontSize: '15px' }}>Conversion Object</th>
              <th style={{ padding: '8px 12px', fontSize: '15px' }}>Typical Conversion</th>
              <th style={{ padding: '8px 12px', fontSize: '15px', width: '50px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {conversionData.length === 0 && !isLoading ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>No records found.</td>
              </tr>
            ) : (
              conversionData.map((item, index) => {
                const currentStream = item.PROCESS_STREAM_NAME || 'N/A';
                const previousStream = index > 0 ? (conversionData[index - 1].PROCESS_STREAM_NAME || 'N/A') : null;
                const showStream = currentStream !== previousStream;

                const currentClass = item.CLASSIFICATION || 'N/A';
                const previousClass = index > 0 && !showStream ? (conversionData[index - 1].CLASSIFICATION || 'N/A') : null;
                const showClass = currentClass !== previousClass;

                return (
                  <tr key={item.CONVERSION_OBJECT_ID}>
                    <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>{showStream ? currentStream : ''}</td>
                    <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>{showClass ? currentClass : ''}</td>
                    <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>{item.CONVERSION_OBJECT}</td>
                    <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>{item.TYPICAL_CONVERSION}</td>
                    <td style={{ padding: '8px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={!!checkedItems[item.CONVERSION_OBJECT_ID]}
                        onChange={() => handleCheckboxChange(item.CONVERSION_OBJECT_ID)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                    </td>
                  </tr>
                );
              })
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

export default DataMigration;
