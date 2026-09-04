import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import '../../utils/GlobalSetupShared.css';
import { HelpCircle, X } from 'lucide-react';
import { getIdToken } from '../../utils/cognito-auth';
import { useSession } from '../../context/SessionContext';
import SessionExpiredPopup from '../SessionExpiredPopup';
import Loader from '../../utils/Loader';

const TechnicalScope = ({ onClose, selectedProject }) => {
  const { handleAuthError, userId } = useSession();
  const queryClient = useQueryClient();
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const helpPopupRef = useRef(null);

  const [tableData, setTableData] = useState([]);
  const [originalData, setOriginalData] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const { data: objectTypes = [], isLoading } = useQuery({
    queryKey: ['objectTypes', selectedProject?.id],
    queryFn: async () => {
      if (!selectedProject?.id) return [];
      const idToken = await getIdToken();
      if (!idToken) {
        handleAuthError('Token not found - please login again');
        throw new Error('Token not found');
      }
      const response = await fetch(`https://tuo1xmg14d.execute-api.ap-south-1.amazonaws.com/New/rice/get/objectTypeByProject?project_id=${selectedProject.id}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        }
      });
      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        throw new Error('Unauthorized');
      }
      if (!response.ok) throw new Error('Failed to fetch data');
      const result = await response.json();
      return result.data || [];
    },
    enabled: !!selectedProject?.id
  });

  const { data: activeScopeData = [], isLoading: isActiveLoading } = useQuery({
    queryKey: ['activeTechnicalScope', selectedProject?.id],
    queryFn: async () => {
      if (!selectedProject?.id) return [];
      const idToken = await getIdToken();
      if (!idToken) {
        handleAuthError('Token not found - please login again');
        throw new Error('Token not found');
      }
      const response = await fetch(`https://ec2450jptj.execute-api.ap-south-1.amazonaws.com/New/rice/get/technicalScope?project_id=${selectedProject.id}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        }
      });
      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        throw new Error('Unauthorized');
      }
      if (!response.ok) throw new Error('Failed to fetch saved data');
      const result = await response.json();
      return result.data || [];
    },
    enabled: !!selectedProject?.id
  });

  useEffect(() => {
    if (objectTypes.length > 0) {
      const sortedTypes = [...objectTypes].sort((a, b) => {
        return (parseInt(a.object_type_id) || 0) - (parseInt(b.object_type_id) || 0);
      });
      const initialData = sortedTypes.map(obj => {
        // Look for matching saved data for this object type
        const savedRecord = activeScopeData.find(d => String(d.OBJECT_TYPE) === String(obj.object_type_id));
        return {
          type: obj.objectType,
          oTypeId: obj.oTypeId,
          object_type_id: obj.object_type_id,
          vs: savedRecord && savedRecord.VERY_SIMPLE != null ? savedRecord.VERY_SIMPLE : '',
          s: savedRecord && savedRecord.SIMPLE != null ? savedRecord.SIMPLE : '',
          m: savedRecord && savedRecord.MEDIUM != null ? savedRecord.MEDIUM : '',
          c: savedRecord && savedRecord.COMPLEX != null ? savedRecord.COMPLEX : '',
          vc: savedRecord && savedRecord.VERY_COMPLEX != null ? savedRecord.VERY_COMPLEX : ''
        };
      });
      setTableData(initialData);
      setOriginalData(initialData);
    }
  }, [objectTypes, activeScopeData]);

  const hasChanges = JSON.stringify(tableData) !== JSON.stringify(originalData);

  const handleInputChange = (index, field, value) => {
    const newData = [...tableData];
    newData[index] = { ...newData[index], [field]: value };
    setTableData(newData);
  };

  const handleClear = () => {
    setTableData(tableData.map(row => ({
      ...row,
      vs: '', s: '', m: '', c: '', vc: ''
    })));
  };

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
      const idToken = await getIdToken();
      if (!idToken) {
        handleAuthError('Token not found - please login again');
        throw new Error('Token not found');
      }

      const rows = tableData.map(row => ({
        OBJECT_TYPE: row.object_type_id,
        VERY_SIMPLE: parseInt(row.vs) || 0,
        SIMPLE: parseInt(row.s) || 0,
        MEDIUM: parseInt(row.m) || 0,
        COMPLEX: parseInt(row.c) || 0,
        VERY_COMPLEX: parseInt(row.vc) || 0
      }));

      const payload = {
        project_id: selectedProject.id,
        created_by: userId || '',
        updated_by: userId || '',
        rows: rows
      };

      const response = await fetch('https://ec2450jptj.execute-api.ap-south-1.amazonaws.com/New/rice/save/technicalScope', {
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
        setSuccessMessage(result.message || 'Technical Scope saved successfully');
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 5000);
        
        // Refresh the saved values
        queryClient.invalidateQueries({ queryKey: ['activeTechnicalScope', selectedProject?.id] });
      } else {
        throw new Error(result.error || 'Failed to save technical scope');
      }
    } catch (err) {
      console.error('Error saving technical scope:', err);
      setErrorMessage(err.message || 'An error occurred while saving.');
      setShowErrorMessage(true);
      setTimeout(() => setShowErrorMessage(false), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const getRowTotal = (row) => {
    return (parseInt(row.vs) || 0) +
           (parseInt(row.s) || 0) +
           (parseInt(row.m) || 0) +
           (parseInt(row.c) || 0) +
           (parseInt(row.vc) || 0);
  };

  const getColTotal = (field) => {
    return tableData.reduce((sum, row) => sum + (parseInt(row[field]) || 0), 0);
  };

  const getGrandTotal = () => {
    return tableData.reduce((sum, row) => sum + getRowTotal(row), 0);
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
        <h2 style={{ margin: 0, color: '#333' }}>Technical Scope</h2>
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
                      Technical Scope Guide
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '15px' }}>
                      Use this page to define the technical complexity breakdown for different object types in your project.
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>How to Use This Table</h3>
                      <ul style={{ listStyleType: 'disc', paddingLeft: '20px', color: '#475569', fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <li><strong>Input Values:</strong> Enter the quantity of items for each complexity level (Very Simple, Simple, Medium, Complex, Very Complex) corresponding to the Object Type on the left.</li>
                        <li><strong>Dynamic Totals:</strong> The <strong>Total</strong> column on the right automatically sums the values for each row, while the bottom <strong>Total</strong> row sums the values for each complexity level across all object types.</li>
                        <li><strong>Saving:</strong> Once you have entered the data, the <strong>Submit</strong> button will become active. Click it to save your changes securely to the database.</li>
                        <li><strong>Resetting:</strong> Click the <strong>Clear</strong> button to rapidly wipe all fields across the entire table back to zero.</li>
                      </ul>
                    </div>

                    <div style={{ backgroundColor: '#f1f5f9', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', margin: '0 0 8px 0' }}>Important Notes</h4>
                      <p style={{ margin: '0', color: '#475569', fontSize: '14px', lineHeight: '1.5' }}>
                        The Object Types listed on the left are fetched dynamically based on your project configuration. The system automatically pre-fills any previously saved values when the page loads. If you don't make any modifications, the Submit button will intentionally remain inactive to prevent redundant saves.
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

      {isLoading || isActiveLoading ? (
        <Loader />
      ) : (
      <div className="table-container" style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto', marginTop: '20px' }}>
        <table className="config-table" style={{ fontSize: '15px', width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ padding: '10px 12px', fontSize: '15px', border: '1px solid #ddd', textAlign: 'left', fontWeight: 'bold' }}>Object Type</th>
              <th style={{ padding: '10px 12px', fontSize: '15px', border: '1px solid #ddd', textAlign: 'left', fontWeight: 'bold' }}>Very Simple</th>
              <th style={{ padding: '10px 12px', fontSize: '15px', border: '1px solid #ddd', textAlign: 'left', fontWeight: 'bold' }}>Simple</th>
              <th style={{ padding: '10px 12px', fontSize: '15px', border: '1px solid #ddd', textAlign: 'left', fontWeight: 'bold' }}>Medium</th>
              <th style={{ padding: '10px 12px', fontSize: '15px', border: '1px solid #ddd', textAlign: 'left', fontWeight: 'bold' }}>Complex</th>
              <th style={{ padding: '10px 12px', fontSize: '15px', border: '1px solid #ddd', textAlign: 'left', fontWeight: 'bold' }}>Very Complex</th>
              <th style={{ padding: '10px 12px', fontSize: '15px', border: '1px solid #ddd', textAlign: 'left', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, index) => (
              <tr key={index}>
                <td style={{ padding: '10px 12px', border: '1px solid #ddd' }}>{row.type}</td>
                <td style={{ padding: '0', border: '1px solid #ddd' }}>
                  <input
                    type="number"
                    className="no-spinner-input"
                    placeholder="0"
                    value={row.vs}
                    onChange={(e) => handleInputChange(index, 'vs', e.target.value)}
                    style={{ width: '100%', height: '100%', padding: '10px 12px', border: 'none', outline: 'none', boxSizing: 'border-box', backgroundColor: 'transparent' }}
                  />
                </td>
                <td style={{ padding: '0', border: '1px solid #ddd' }}>
                  <input
                    type="number"
                    className="no-spinner-input"
                    placeholder="0"
                    value={row.s}
                    onChange={(e) => handleInputChange(index, 's', e.target.value)}
                    style={{ width: '100%', height: '100%', padding: '10px 12px', border: 'none', outline: 'none', boxSizing: 'border-box', backgroundColor: 'transparent' }}
                  />
                </td>
                <td style={{ padding: '0', border: '1px solid #ddd' }}>
                  <input
                    type="number"
                    className="no-spinner-input"
                    placeholder="0"
                    value={row.m}
                    onChange={(e) => handleInputChange(index, 'm', e.target.value)}
                    style={{ width: '100%', height: '100%', padding: '10px 12px', border: 'none', outline: 'none', boxSizing: 'border-box', backgroundColor: 'transparent' }}
                  />
                </td>
                <td style={{ padding: '0', border: '1px solid #ddd' }}>
                  <input
                    type="number"
                    className="no-spinner-input"
                    placeholder="0"
                    value={row.c}
                    onChange={(e) => handleInputChange(index, 'c', e.target.value)}
                    style={{ width: '100%', height: '100%', padding: '10px 12px', border: 'none', outline: 'none', boxSizing: 'border-box', backgroundColor: 'transparent' }}
                  />
                </td>
                <td style={{ padding: '0', border: '1px solid #ddd' }}>
                  <input
                    type="number"
                    className="no-spinner-input"
                    placeholder="0"
                    value={row.vc}
                    onChange={(e) => handleInputChange(index, 'vc', e.target.value)}
                    style={{ width: '100%', height: '100%', padding: '10px 12px', border: 'none', outline: 'none', boxSizing: 'border-box', backgroundColor: 'transparent' }}
                  />
                </td>
                <td style={{ padding: '10px 12px', border: '1px solid #ddd', fontWeight: '600', backgroundColor: '#f8fafc', color: '#333' }}>
                  {getRowTotal(row)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>
              <td style={{ padding: '10px 12px', border: '1px solid #ddd', color: '#1e293b' }}>Total</td>
              <td style={{ padding: '10px 12px', border: '1px solid #ddd', color: '#1e293b' }}>{getColTotal('vs')}</td>
              <td style={{ padding: '10px 12px', border: '1px solid #ddd', color: '#1e293b' }}>{getColTotal('s')}</td>
              <td style={{ padding: '10px 12px', border: '1px solid #ddd', color: '#1e293b' }}>{getColTotal('m')}</td>
              <td style={{ padding: '10px 12px', border: '1px solid #ddd', color: '#1e293b' }}>{getColTotal('c')}</td>
              <td style={{ padding: '10px 12px', border: '1px solid #ddd', color: '#1e293b' }}>{getColTotal('vc')}</td>
              <td style={{ padding: '10px 12px', border: '1px solid #ddd', color: '#0f172a', backgroundColor: '#e2e8f0' }}>{getGrandTotal()}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '12px', padding: '20px', marginTop: '10px' }}>
        <button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          style={{
            padding: '8px 20px',
            backgroundColor: (isSaving || !hasChanges) ? '#6c757d' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: (isSaving || !hasChanges) ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => { if (!isSaving && hasChanges) e.currentTarget.style.backgroundColor = '#218838'; }}
          onMouseLeave={(e) => { if (!isSaving && hasChanges) e.currentTarget.style.backgroundColor = '#28a745'; }}
        >
          {isSaving ? 'Submitting...' : 'Submit'}
        </button>
        <button
          onClick={handleClear}
          style={{
            padding: '8px 20px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#c82333'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dc3545'}
        >
          Clear
        </button>
      </div>

      <SessionExpiredPopup />

      <style>{`
        .no-spinner-input::-webkit-outer-spin-button,
        .no-spinner-input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .no-spinner-input {
          -moz-appearance: textfield;
        }
        .no-spinner-input:hover,
        .no-spinner-input:focus {
          background-color: #f8fafc !important;
        }
      `}</style>
    </div>
  );
};

export default TechnicalScope;
