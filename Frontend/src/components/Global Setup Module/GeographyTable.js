import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import '../../utils/GlobalSetupShared.css';
import { ArrowLeft, HelpCircle, X } from 'lucide-react';
import { getIdToken } from '../../utils/cognito-auth';
import DOMPurify from 'dompurify';
import { useAuth } from '../../context/AuthContext';
import { useSession } from '../../context/SessionContext';
import SessionExpiredPopup from '../SessionExpiredPopup';
import Loader from '../../utils/Loader';
import GLOBAL_SETUP_API_CONFIG from './config/apiConfig';

const GeographyTable = ({ onClose, selectedProject, onBackToLanding, onLogout }) => {
  const { handleAuthError } = useSession();
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const helpPopupRef = useRef(null);

  const sanitizeConfig = { ALLOWED_TAGS: [] };

  const validateAndSanitizeData = (data) => {
    if (!Array.isArray(data)) return [];

    return data.map((item, index) => ({
      id: index + 1,
      geographyId: DOMPurify.sanitize(String(item.list_Of_Geography_id || '').trim(), sanitizeConfig),
      geographyCode: DOMPurify.sanitize(String(item.geoCode || '').trim(), sanitizeConfig),
      geographyName: DOMPurify.sanitize(String(item.description || '').trim(), sanitizeConfig),
      isSaved: true
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

  const fetchGeographyData = async () => {
    const idToken = await getIdToken();
    if (!idToken) {
      handleAuthError('Token not found - please login again');
      throw new Error('Token not found');
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    };

    const response = await fetch(GLOBAL_SETUP_API_CONFIG.GEOGRAPHY_API_URL, {
      headers: headers
    });

    if (response.status === 401 || response.status === 403) {
      handleAuthError('Unauthorized - session expired');
      throw new Error('Unauthorized');
    }

    if (response.ok) {
      const result = await response.json();
      if (Array.isArray(result) && result.length > 0) {
        return validateAndSanitizeData(result);
      }
      return [];
    }
    
    throw new Error('Failed to fetch geography data');
  };

  const { data: geographyData = [], isLoading: loading, isError, error } = useQuery({
    queryKey: ['geographyList'],
    queryFn: fetchGeographyData
  });

  return (
    <div className="config-main" style={{ margin: '2rem 2rem 0 2rem' }}>
      <div style={{ padding: '2rem 2rem 1rem 2rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project : <span style={{ color: '#007bff' }}>{selectedProject?.name}</span></h3>
      </div>
      <div className="config-header" style={{ marginTop: '0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, color: '#333' }}>Global Region Code</h2>
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
                        The <strong>Global Region Code</strong> page provides a master list of standardized geographic regions used throughout the enterprise system. This ensures consistent data entry and reporting across different countries and business units.
                      </p>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <strong style={{ color: '#1f2937', fontSize: '15px' }}>Why is this used?</strong>
                      <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                        Standardizing region codes is essential for global financial reporting, logistics tracking, and organizational mapping. It prevents duplication and ensures that data from various countries can be correctly aggregated at a regional level (e.g., EMEA, APAC).
                      </p>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to read the table</strong>
                      <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                        <li><strong>Global Region Code</strong> — The unique identifier for a specific geographic region.</li>
                        <li><strong>Global Region Name</strong> — The full descriptive name of the region.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {isError && (
        <div style={{
          backgroundColor: '#ef4444',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          margin: '0 0 20px 0'
        }}>
          <span style={{ fontWeight: '500' }}>{error.message || 'Failed to load data'}</span>
        </div>
      )}

      {/* Standardized Loading Overlay */}
      <Loader loading={loading} />

      <div className="table-container" style={{ height: 'calc(100vh - 280px)', overflowY: 'auto' }}>
        <table className="config-table" style={{ fontSize: '15px', width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ padding: '8px 12px', fontSize: '16px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Global Region Code</th>
              <th style={{ padding: '8px 12px', fontSize: '16px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Global Region Name</th>
            </tr>
          </thead>
          <tbody>
            {geographyData.length === 0 && !loading ? (
              <tr>
                <td colSpan={2} style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  No geography data found.
                </td>
              </tr>
            ) : (
              geographyData.map((item) => (
                <tr key={item.id} style={{ height: '40px', borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '6px 12px', verticalAlign: 'middle' }}>
                    {item.geographyCode}
                  </td>
                  <td style={{ padding: '6px 12px', verticalAlign: 'middle' }}>
                    {item.geographyName}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      <SessionExpiredPopup />
    </div>
  );
};

export default GeographyTable;
