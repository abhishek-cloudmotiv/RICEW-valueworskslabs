import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import '../../utils/GlobalSetupShared.css';
import { HelpCircle, X } from 'lucide-react';
import { getIdToken } from '../../utils/cognito-auth';
import { useSession } from '../../context/SessionContext';
import SessionExpiredPopup from '../SessionExpiredPopup';
import Loader from '../../utils/Loader';

const DataMigrationMaster = ({ onClose, selectedProject }) => {
  const { handleAuthError } = useSession();
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const helpPopupRef = useRef(null);

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
        <h2 style={{ margin: 0, color: '#333' }}>Data Migration Master</h2>
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
                      Data Migration Master Guide
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '15px' }}>
                      Welcome to the Data Migration Master setup page.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Loader loading={isLoading} />

      <div className="table-container" style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
        <table className="config-table" style={{ fontSize: '15px' }}>
          <thead>
            <tr>
              <th style={{ padding: '8px 12px', fontSize: '15px' }}>Process Stream</th>
              <th style={{ padding: '8px 12px', fontSize: '15px' }}>Classification</th>
              <th style={{ padding: '8px 12px', fontSize: '15px' }}>Conversion Object</th>
              <th style={{ padding: '8px 12px', fontSize: '15px' }}>Typical Conversion</th>
            </tr>
          </thead>
          <tbody>
            {conversionData.length === 0 && !isLoading ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>No records found.</td>
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
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <SessionExpiredPopup />
    </div>
  );
};

export default DataMigrationMaster;
