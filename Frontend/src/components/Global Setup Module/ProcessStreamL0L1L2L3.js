import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import '../../utils/GlobalSetupShared.css';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, X, Filter } from 'lucide-react';
import { getIdToken } from '../../utils/cognito-auth';
import DOMPurify from 'dompurify';
import { useAuth } from '../../context/AuthContext';
import GLOBAL_SETUP_API_CONFIG from './config/apiConfig';
import { useSession } from '../../context/SessionContext';
import SessionExpiredPopup from '../SessionExpiredPopup';
import Loader from '../../utils/Loader';

const ProcessStreamL0L1L2L3 = ({ onClose, selectedProject }) => {
  const { handleAuthError } = useSession();
  const navigate = useNavigate();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const [filterL0, setFilterL0] = useState('');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const helpPopupRef = useRef(null);
  const filterDropdownRef = useRef(null);

  const sanitizeConfig = { ALLOWED_TAGS: [] };

  const validateAndSanitizeData = (data) => {
    if (!Array.isArray(data)) return [];

    const sanitized = data.map(item => ({
      l0: DOMPurify.sanitize(String(item.PROCESS_STREAM_NAME || '').trim(), sanitizeConfig),
      l1_id: item.L1_ID || null,
      l1: DOMPurify.sanitize(String(item.L1_NAME || '').trim(), sanitizeConfig),
      l2_id: item.L2_ID || null,
      l2: DOMPurify.sanitize(String(item.L2_NAME || '').trim(), sanitizeConfig),
      l3_id: item.L3_ID || null,
      l3: DOMPurify.sanitize(String(item.L3_NAME || '').trim(), sanitizeConfig),
      process_stream_id: item.PROCESS_STREAM_ID || null,
      process_stream_code: DOMPurify.sanitize(String(item.PROCESS_STREAM_CODE || '').trim(), sanitizeConfig),
      created_by: DOMPurify.sanitize(String(item.CREATED_BY || '').trim(), sanitizeConfig),
      creation_date: item.CREATION_DATE || null,
    }));

    return sanitized;
  };

  const fetchProcessStreamL0L1L2L3Data = async () => {
    const idToken = await getIdToken();
    if (!idToken) {
      handleAuthError('Token not found - please login again');
      throw new Error('Token not found - please login again');
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    };

    const response = await fetch(GLOBAL_SETUP_API_CONFIG.PROCESS_STREAM_L0_L1_L2_L3_API_URL, {
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

  const { data: processStreamL0L1L2L3Data = [], isLoading: loading } = useQuery({
    queryKey: ['processStreamL0L1L2L3', selectedProject?.id || 'all'],
    queryFn: fetchProcessStreamL0L1L2L3Data,
    enabled: !!selectedProject,
  });

  const filteredData = processStreamL0L1L2L3Data.filter(item => {
    if (!filterL0) return true;
    return item.l0.toLowerCase().includes(filterL0.toLowerCase());
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setIsFilterDropdownOpen(false);
      }
      if (helpPopupRef.current && !helpPopupRef.current.contains(event.target)) {
        setShowHelpPopup(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="config-main" style={{ margin: '2rem 2rem 0 2rem' }}>
      <div style={{ padding: '2rem 2rem 1rem 2rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project : <span style={{ color: '#007bff' }}>{selectedProject?.name}</span></h3>
      </div>
      <div className="config-header" style={{ marginTop: '0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <h2 style={{ margin: 0, color: '#333', lineHeight: '1', whiteSpace: 'nowrap' }}>Process Stream (L0 / L1 / L2 / L3)</h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={16} color="#6b7280" />
              <span style={{ fontSize: '12px', fontWeight: '500', color: '#4b5563', whiteSpace: 'nowrap' }}>Filter L0:</span>
            </div>

            <div style={{ position: 'relative', width: '180px' }} ref={filterDropdownRef}>
              <button
                onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                style={{
                  width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '4px',
                  fontSize: '12px', color: filterL0 ? '#333' : '#999', backgroundColor: 'white',
                  cursor: 'pointer', outline: 'none', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{filterL0 || 'All'}</span>
                <span style={{ fontSize: '11px', color: '#999', marginLeft: '4px' }}>▼</span>
              </button>

              {isFilterDropdownOpen && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '6px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 1000, maxHeight: '300px',
                  overflowY: 'auto', marginTop: '6px'
                }}>
                  <div
                    onClick={() => { setFilterL0(''); setIsFilterDropdownOpen(false); }}
                    style={{
                      padding: '10px 12px', cursor: 'pointer', backgroundColor: filterL0 === '' ? '#f0f9ff' : 'white',
                      color: '#333', fontSize: '14px', borderBottom: '1px solid #f0f0f0'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = filterL0 === '' ? '#f0f9ff' : 'white'}
                  >
                    All Process Streams
                  </div>
                  {[...new Set(processStreamL0L1L2L3Data.map(item => item.l0))].sort().map((l0Value, index) => (
                    <div
                      key={index}
                      onClick={() => { setFilterL0(l0Value); setIsFilterDropdownOpen(false); }}
                      style={{
                        padding: '10px 12px', cursor: 'pointer', backgroundColor: filterL0 === l0Value ? '#f0f9ff' : 'white',
                        color: '#333', fontSize: '14px', borderBottom: '1px solid #f0f0f0'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = filterL0 === l0Value ? '#f0f9ff' : 'white'}
                    >
                      {l0Value}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {filterL0 && (
              <button
                onClick={() => setFilterL0('')}
                style={{
                  padding: '6px 12px', backgroundColor: '#dc3545', border: 'none', borderRadius: '4px',
                  cursor: 'pointer', fontSize: '11px', color: 'white', transition: 'background-color 0.2s', whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => { e.target.style.backgroundColor = '#c82333'; }}
                onMouseLeave={(e) => { e.target.style.backgroundColor = '#dc3545'; }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

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
                        The <strong>Process Stream Hierarchy (L0 / L1 / L2 / L3)</strong> page displays the complete hierarchical structure of process streams across multiple levels. It shows how high-level strategic processes (L0) break down into detailed operational processes (L1, L2, L3) for the selected project.
                      </p>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <strong style={{ color: '#1f2937', fontSize: '15px' }}>Why is this used?</strong>
                      <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                        Understanding the process hierarchy is critical for project scoping, requirement mapping, and organizational alignment. It helps teams identify scope, define work streams, and establish clear ownership across different levels of process abstraction.
                      </p>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to read the table</strong>
                      <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                        <li><strong>L0 (Process Stream)</strong> — The strategic/top-level process stream (e.g., Cash & Treasury Management, Expense to Reimbursement).</li>
                        <li><strong>L1</strong> — The primary process category under L0 (e.g., Payments, Expense Approval).</li>
                        <li><strong>L2</strong> — The sub-process level (e.g., Cash Outflow, Manager Approval).</li>
                        <li><strong>L3</strong> — The detailed task/activity level (e.g., Process cash outflows, Review and approve expense reports).</li>
                      </ul>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <strong style={{ color: '#1f2937', fontSize: '15px' }}>Key behaviors</strong>
                      <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                        <li>Data is fetched live from the RICE master process hierarchy API and automatically sorted by sequence number.</li>
                        <li>Processes are organized by hierarchy level for easy navigation and understanding.</li>
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
              <th style={{ padding: '8px 12px', fontSize: '15px' }}>L0 (Process Stream)</th>
              <th style={{ padding: '8px 12px', fontSize: '15px' }}>L1</th>
              <th style={{ padding: '8px 12px', fontSize: '15px' }}>L2</th>
              <th style={{ padding: '8px 12px', fontSize: '15px' }}>L3</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length > 0 ? (
              filteredData.map((item, index) => (
                <tr key={index} style={{ height: '40px' }}>
                  <td style={{ padding: '6px 12px', verticalAlign: 'middle' }}>
                    {item.l0 || 'N/A'}
                  </td>
                  <td style={{ padding: '6px 12px', verticalAlign: 'middle' }}>
                    {item.l1 || 'N/A'}
                  </td>
                  <td style={{ padding: '6px 12px', verticalAlign: 'middle' }}>
                    {item.l2 || 'N/A'}
                  </td>
                  <td style={{ padding: '6px 12px', verticalAlign: 'middle' }}>
                    {item.l3 || 'N/A'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                  {processStreamL0L1L2L3Data.length > 0 ? 'No matching records found' : 'No process stream hierarchy data available'}
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

export default ProcessStreamL0L1L2L3;
