import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import '../../utils/GlobalSetupShared.css';
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { HelpCircle, X } from 'lucide-react';
import { getIdToken } from '../../utils/cognito-auth';
import DOMPurify from 'dompurify';
import { useSession } from '../../context/SessionContext';
import SessionExpiredPopup from '../SessionExpiredPopup';
import Loader from '../../utils/Loader';
import GLOBAL_SETUP_API_CONFIG from './config/apiConfig';

const RoleDefinitionTable = ({ onClose, selectedProject }) => {
  const { handleAuthError } = useSession();
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const helpPopupRef = useRef(null);

  const sanitizeConfig = { ALLOWED_TAGS: [] };

  const validateAndSanitizeData = (data) => {
    if (!Array.isArray(data)) return [];

    return data.map((item, index) => ({
      id: index + 1,
      roleTitle: DOMPurify.sanitize(String(item.role_Title || '').trim(), sanitizeConfig),
      roleDescription: DOMPurify.sanitize(String(item.role_Description || '').trim(), sanitizeConfig),
      roleDefinitionTableId: item.role_Definition_Table_id || '',
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

  const fetchRoleDefinitions = async () => {
    const idToken = await getIdToken();
    if (!idToken) {
      handleAuthError('Token not found - please login again');
      throw new Error('Token not found');
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    };

    const scan = localStorage.getItem('scan') || 'all';
    const response = await fetch(`${GLOBAL_SETUP_API_CONFIG.ROLE_DEFINITION_API_URLS.GET}?scan=${encodeURIComponent(scan)}`, {
      headers: headers
    });

    if (response.status === 401 || response.status === 403) {
      handleAuthError('Unauthorized - session expired');
      throw new Error('Unauthorized');
    }

    if (response.ok) {
      const result = await response.json();
      const dataArray = Array.isArray(result) ? result : (result.data || []);
      const activeRecords = dataArray.filter(item => item.delete_status !== "true");
      
      const sanitizedData = validateAndSanitizeData(activeRecords);
      
      return sanitizedData.sort((a, b) => {
        const aId = parseInt(a.roleDefinitionTableId) || 0;
        const bId = parseInt(b.roleDefinitionTableId) || 0;
        return aId - bId;
      });
    }
    
    throw new Error('Failed to load role definitions');
  };

  const { data: roleDefinitionsData = [], isLoading: loading, isError, error } = useQuery({
    queryKey: ['roleDefinitions', selectedProject?.id || 'all'],
    queryFn: fetchRoleDefinitions,
    enabled: !!selectedProject,
  });

  return (
    <div className="config-main" style={{ margin: '2rem 2rem 0 2rem' }}>
      <div style={{ padding: '2rem 2rem 1rem 2rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project : <span style={{ color: '#007bff' }}>{selectedProject?.name}</span></h3>
      </div>
      <div className="config-header" style={{ marginTop: '0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, color: '#333' }}>Project Role Definition</h2>
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
                        The <strong>Project Role Definition</strong> page is where you can define and manage the various roles required for your project. It serves as a master list of role titles and their associated descriptions.
                      </p>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <strong style={{ color: '#1f2937', fontSize: '15px' }}>Why is this used?</strong>
                      <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                        Defining clear roles ensures that responsibilities are well-understood across the project team. These roles are often mapped to specific users, tasks, or permissions throughout the ERP system, providing a foundation for accountability and workflow management.
                      </p>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to read the table</strong>
                      <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                        <li><strong>Role Title</strong> — The official name of the role (e.g., Project Manager, Solution Architect).</li>
                        <li><strong>Role Description</strong> — A brief summary of the role's responsibilities.</li>
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
          padding: '12px 20px',
          margin: '0 0 20px 0',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <X size={18} />
          {error.message || 'Failed to load data'}
        </div>
      )}

      <TableContainer component={Paper} sx={{ height: 'calc(100vh - 280px)', overflowY: 'auto' }}>
        <Table stickyHeader sx={{ minWidth: '800px' }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
              <TableCell sx={{ fontWeight: 'bold', borderBottom: '1px solid #dee2e6', padding: '8px 12px', fontSize: '15px', width: '25%' }}>
                Role Title
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', borderBottom: '1px solid #dee2e6', padding: '8px 12px', fontSize: '15px', width: '75%' }}>
                Role Description
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {roleDefinitionsData.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={2} sx={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  No role definitions found.
                </TableCell>
              </TableRow>
            ) : (
              roleDefinitionsData.map((row) => (
                <TableRow
                  key={row.id}
                  sx={{
                    '&:hover': { backgroundColor: '#f8f9fa' },
                    backgroundColor: 'transparent',
                    transition: 'background-color 0.3s ease'
                  }}
                >
                  <TableCell sx={{ padding: '12px', verticalAlign: 'top', borderBottom: '1px solid #dee2e6' }}>
                    <div style={{ fontSize: '14px', color: '#333', minHeight: '40px', display: 'flex', alignItems: 'center' }}>
                      {row.roleTitle || '-'}
                    </div>
                  </TableCell>
                  <TableCell sx={{ padding: '12px', verticalAlign: 'top', borderBottom: '1px solid #dee2e6' }}>
                    <div style={{ fontSize: '14px', color: '#333', wordWrap: 'break-word', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                      {row.roleDescription || '-'}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Loader loading={loading} />
      <SessionExpiredPopup />
    </div>
  );
};

export default RoleDefinitionTable;
