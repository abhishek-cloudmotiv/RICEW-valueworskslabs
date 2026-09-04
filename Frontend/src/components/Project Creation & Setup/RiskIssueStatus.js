import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash2, Save, X, MoreVertical, HelpCircle } from 'lucide-react';
import { TextField } from '@mui/material';
import DOMPurify from 'dompurify';
import { getIdToken } from '../../utils/cognito-auth';
import { useSession } from '../../context/SessionContext';

const RiskIssueStatus = ({ onClose, selectedProject, onBackToLanding, onLogout, setUnsavedChangesChecker }) => {
  const { handleAuthError } = useSession();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [showActionsMenu, setShowActionsMenu] = useState(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [hasNewRow, setHasNewRow] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState('');

  const menuRef = useRef(null);
  const editingItemRef = useRef(null);
  const hasNewRowRef = useRef(false);
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const helpPopupRef = useRef(null);

  // Constants
  const API_BASE_URL = 'https://35j96p30rd.execute-api.ap-south-1.amazonaws.com/New/ricew/riskIssueStatus';

  useEffect(() => {
    loadData();

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowActionsMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedProject]);

  // Close help popup when clicking outside
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

  // Keep refs in sync with state (no parent re-render)
  useEffect(() => { editingItemRef.current = editingItem; }, [editingItem]);
  useEffect(() => { hasNewRowRef.current = hasNewRow; }, [hasNewRow]);

  // Register unsaved-changes checker once â€” reads from refs so it always sees latest values
  useEffect(() => {
    if (setUnsavedChangesChecker) {
      setUnsavedChangesChecker(() => () => editingItemRef.current !== null || hasNewRowRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    if (!selectedProject?.id) return;
    setLoading(true);
    try {
      let idToken;
      try {
        idToken = await getIdToken();
      } catch (tokenError) {
        handleAuthError(tokenError.message);
        return;
      }

      const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` };

      const response = await fetch(`${API_BASE_URL}/getRecords?project_id=${selectedProject.id}`, {
        headers: headers
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        return;
      }

      if (response.ok) {
        const result = await response.json();
        const records = Array.isArray(result.data) ? result.data : [];
        const sortedRecords = [...records].sort((a, b) => {
          const idA = parseInt(a.RiskIssueStatus_id) || 0;
          const idB = parseInt(b.RiskIssueStatus_id) || 0;
          return idA - idB;
        });

        const mappedData = sortedRecords.map(item => ({
          id: DOMPurify.sanitize(String(item.RiskIssueStatus_id || '').trim(), { ALLOWED_TAGS: [] }),
          statusCode: DOMPurify.sanitize(String(item.Status_Code || '').trim(), { ALLOWED_TAGS: [] }),
          statusName: DOMPurify.sanitize(String(item.Status_Name || '').trim(), { ALLOWED_TAGS: [] }),
          definition: DOMPurify.sanitize(String(item.Status_Definition || '').trim(), { ALLOWED_TAGS: [] }),
          systemDefault: DOMPurify.sanitize(String(item.system_default || '').trim(), { ALLOWED_TAGS: [] }),
          projectId: DOMPurify.sanitize(String(item.project_id || '').trim(), { ALLOWED_TAGS: [] }),
          isSaved: true
        }));

        setData(mappedData);
      } else {
        console.error('Failed to fetch risk issue status data');
        setData([]);
      }
    } catch (error) {
      console.error('Error fetching risk issue status data:', error);
    } finally {
      setLoading(false);
    }
  };

  const capitalizeFirstChar = (str) => {
    if (!str || str.length === 0) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const showConfirmation = (message, action) => {
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setShowConfirmDialog(true);
  };

  const handleConfirmYes = () => {
    if (confirmAction) {
      confirmAction();
    }
    setShowConfirmDialog(false);
    setConfirmAction(null);
    setConfirmMessage('');
  };

  const handleConfirmCancel = () => {
    setShowConfirmDialog(false);
    setConfirmAction(null);
    setConfirmMessage('');
  };

  const handleInputChange = (field, value) => {
    setEditValues(prev => ({ ...prev, [field]: value }));
  };

  const addNewStatusRow = () => {
    const newId = `TEMP_${Date.now()}`;
    const newRow = {
      id: newId,
      statusCode: '',
      statusName: '',
      definition: '',
      isSaved: false
    };

    setData(prev => [...prev, newRow]);
    setEditingItem(newId);
    setEditValues(newRow);
    setHasNewRow(true);

    setTimeout(() => {
      const tableContainer = document.querySelector('.table-container');
      if (tableContainer) {
        tableContainer.scrollTop = tableContainer.scrollHeight;
      }
    }, 100);
  };

  const handleAddStatus = () => {
    // Check if there's an unsaved edit in progress on an existing saved record
    if (editingItem !== null) {
      const editingItemData = data.find(item => item.id === editingItem);
      if (editingItemData && editingItemData.isSaved) {
        showConfirmation(
          'You have unsaved changes. Do you want to discard them and add a new status?',
          () => {
            setEditingItem(null);
            setEditValues({});
            setValidationErrors({});
            addNewStatusRow();
          }
        );
        return;
      }
    }

    if (hasNewRow && editingItem) {
      handleSave(editingItem);
      return;
    }

    addNewStatusRow();
  };

  const handleEdit = (id) => {
    const item = data.find(d => d.id === id);
    if (item) {
      if (hasNewRow) {
        showConfirmation(
          'You have unsaved changes. Do you want to continue?',
          () => {
            setData(prev => prev.filter(row => row.isSaved));
            setHasNewRow(false);
            setValidationErrors({});
            setEditingItem(id);
            setEditValues({ ...item });
            setShowActionsMenu(null);
          }
        );
      } else if (editingItem !== null && editingItem !== id) {
        showConfirmation(
          'You have unsaved changes. Do you want to discard them and edit another record?',
          () => {
            setEditingItem(id);
            setEditValues({ ...item });
            setShowActionsMenu(null);
          }
        );
      } else {
        setEditingItem(id);
        setEditValues({ ...item });
        setShowActionsMenu(null);
      }
    }
  };

  const handleCancel = (id) => {
    if (!editValues.isSaved) {
      setData(data.filter(item => item.id !== id));
      setHasNewRow(false);
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[id];
        return newErrors;
      });
    }
    setEditingItem(null);
    setEditValues({});
  };

  const handleSave = async (id) => {
    const fieldsWithErrors = {};
    if (!editValues.statusCode || editValues.statusCode.trim() === '') {
      fieldsWithErrors.statusCode = true;
    }
    if (!editValues.statusName || editValues.statusName.trim() === '') {
      fieldsWithErrors.statusName = true;
    }

    if (Object.keys(fieldsWithErrors).length > 0) {
      setValidationErrors(prev => ({
        ...prev,
        [id]: fieldsWithErrors
      }));
      setErrorMessage('Status Code and Status Name are required.');
      setShowErrorMessage(true);
      setTimeout(() => setShowErrorMessage(false), 3000);
      return;
    }

    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[id];
      return newErrors;
    });

    setLoading(true);
    try {
      let idToken;
      try {
        idToken = await getIdToken();
      } catch (tokenError) {
        handleAuthError(tokenError.message);
        return;
      }

      const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` };

      let endpoint;
      let payload;

      if (hasNewRow) {
        endpoint = `${API_BASE_URL}/create`;
        payload = {
          project_id: DOMPurify.sanitize(String(selectedProject?.id || '').trim(), { ALLOWED_TAGS: [] }),
          Status_Code: DOMPurify.sanitize(String(editValues.statusCode || '').trim(), { ALLOWED_TAGS: [] }),
          Status_Name: DOMPurify.sanitize(String(editValues.statusName || '').trim(), { ALLOWED_TAGS: [] }),
          Status_Definition: DOMPurify.sanitize(String(editValues.definition || '').trim(), { ALLOWED_TAGS: [] }),
          created_by: DOMPurify.sanitize(String(localStorage.getItem('user_id') || '1').trim(), { ALLOWED_TAGS: [] })
        };
      } else {
        endpoint = `${API_BASE_URL}/update`;
        payload = {
          RiskIssueStatus_id: DOMPurify.sanitize(String(id || '').trim(), { ALLOWED_TAGS: [] }),
          Status_Code: DOMPurify.sanitize(String(editValues.statusCode || '').trim(), { ALLOWED_TAGS: [] }),
          Status_Name: DOMPurify.sanitize(String(editValues.statusName || '').trim(), { ALLOWED_TAGS: [] }),
          Status_Definition: DOMPurify.sanitize(String(editValues.definition || '').trim(), { ALLOWED_TAGS: [] }),
          updated_by: DOMPurify.sanitize(String(localStorage.getItem('user_id') || '1').trim(), { ALLOWED_TAGS: [] })
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        return;
      }

      if (response.ok) {
        setSuccessMessage(hasNewRow ? 'Risk / Issue Status added successfully!' : 'Risk / Issue Status updated successfully!');
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);

        setEditingItem(null);
        setEditValues({});
        setHasNewRow(false);
        loadData();
      } else {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || (hasNewRow ? 'Failed to create status' : 'Failed to update status'));
      }
    } catch (error) {
      console.error('Error saving risk issue status:', error);
      setErrorMessage(error.message || 'Failed to save risk / issue status');
      setShowErrorMessage(true);
      setTimeout(() => setShowErrorMessage(false), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    const itemToDelete = data.find(item => item.id === id);
    if (!itemToDelete.isSaved) {
      setData(data.filter(item => item.id !== id));
      setHasNewRow(false);
      setEditingItem(null);
      return;
    }
    setShowDeleteConfirm(id);
    setShowActionsMenu(null);
  };

  const confirmDelete = async () => {
    const id = showDeleteConfirm;
    setLoading(true);
    try {
      let idToken;
      try {
        idToken = await getIdToken();
      } catch (tokenError) {
        handleAuthError(tokenError.message);
        return;
      }

      const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` };

      const response = await fetch(`${API_BASE_URL}/delete`, {
        method: 'DELETE',
        headers: headers,
        body: JSON.stringify({
          RiskIssueStatus_id: DOMPurify.sanitize(String(id || '').trim(), { ALLOWED_TAGS: [] }),
          updated_by: DOMPurify.sanitize(String(localStorage.getItem('user_id') || '1').trim(), { ALLOWED_TAGS: [] })
        })
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        return;
      }

      if (response.ok) {
        setData(data.filter(item => item.id !== id));
        setSuccessMessage('Risk / Issue Status deleted successfully!');
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
      } else {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || 'Failed to delete risk / issue status');
      }
    } catch (error) {
      console.error('Error deleting risk issue status:', error);
      setErrorMessage(error.message || 'Failed to delete risk / issue status');
      setShowErrorMessage(true);
      setTimeout(() => setShowErrorMessage(false), 3000);
    } finally {
      setLoading(false);
      setShowDeleteConfirm(null);
    }
  };

  return (
    <div className="config-main" style={{ margin: '2rem 2rem 0 2rem', paddingBottom: '0.1rem' }}>
      <div style={{ padding: '2rem 2rem 1rem 2rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project : <span style={{ color: '#007bff' }}>{localStorage.getItem('project_name') || selectedProject?.name}</span></h3>
      </div>

      <div className="config-header" style={{ marginTop: '0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Risk / Issue Status</h2>
        <button
          onClick={() => setShowHelpPopup(true)}
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
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3b4b5e'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4D5C74'}
        >
          <HelpCircle size={16} />
          Help
        </button>
      </div>

      {/* Help Modal */}
      {showHelpPopup && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
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
            width: '660px',
            maxWidth: '90vw',
            maxHeight: '85vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative'
          }}>
            <div className="help-modal-scroll" style={{ overflowY: 'auto', padding: '32px', flex: '1' }}>
              <button
                onClick={() => setShowHelpPopup(false)}
                style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545' }}
              >
                <X size={20} />
              </button>

              <h3 style={{ margin: '0 0 20px 0', color: '#333', fontSize: '18px', fontWeight: '600' }}>
                Help &amp; Information
              </h3>

              <div style={{ color: '#444', fontSize: '14px', lineHeight: '1.6' }}>

                <div style={{ marginBottom: '16px' }}>
                  <strong style={{ color: '#1f2937', fontSize: '15px' }}>What is this page?</strong>
                  <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                    The <strong>Risk / Issue Status</strong> page manages the status codes used to track the lifecycle of risks and issues throughout the ERP project. Each status represents a stage in the resolution process (e.g., Open, In Progress, Resolved, Closed) and is applied when logging or updating risk and issue records.
                  </p>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <strong style={{ color: '#1f2937', fontSize: '15px' }}>Why is this used?</strong>
                  <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                    Standardized risk and issue statuses ensure consistent tracking and reporting across all project teams. When project managers or team members log risks or issues in the RICEW module, they select from these statuses — enabling accurate dashboards, escalation workflows, and audit trails for governance and compliance.
                  </p>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <strong style={{ color: '#1f2937', fontSize: '15px' }}>Understanding the columns</strong>
                  <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                    <li><strong>Status Code</strong> — A short uppercase code that identifies the status (e.g., OPEN, INPROG, CLOSED). Max 30 characters, letters, numbers, and hyphens only.</li>
                    <li><strong>Status Name</strong> — The full descriptive name of the status (e.g., Open, In Progress, Resolved). Required, max 100 characters.</li>
                    <li><strong>Definition</strong> — An optional explanation of what this status means in the context of the project. Max 240 characters.</li>
                    <li><strong>Actions</strong> — Edit or Delete a status via the ⋮ menu. System Default statuses show a label instead of actions.</li>
                  </ul>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to use this page</strong>
                  <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                    <li>Click <strong>Add Status</strong> to create a new row. Fill in Status Code and Status Name, then click <strong>Save (✓)</strong> to commit.</li>
                    <li>Use the <strong>⋮ Actions</strong> menu to <strong>Edit</strong> or <strong>Delete</strong> a saved status.</li>
                    <li>Click the <strong>X</strong> (Cancel) icon while editing to discard unsaved changes on that row.</li>
                  </ul>
                </div>

                <div style={{ marginBottom: '4px' }}>
                  <strong style={{ color: '#1f2937', fontSize: '15px' }}>Important notes</strong>
                  <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                    <li><strong>Status Code</strong> and <strong>Status Name</strong> are required — saving will fail without them.</li>
                    <li>Rows marked <em>System Default</em> are pre-configured statuses that cannot be edited or deleted.</li>
                    <li>Status Codes are automatically converted to uppercase and allow only letters, numbers, and hyphens.</li>
                    <li>A project must be selected before statuses can be loaded or added.</li>
                  </ul>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Message Popup */}
      {showSuccessMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: '#10b981',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 2000,
          fontSize: '14px',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'slideIn 0.3s ease-out'
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22,4 12,14.01 9,11.01" />
          </svg>
          {successMessage}
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
          padding: '12px 20px',
          borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 2000,
          fontSize: '14px',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          maxWidth: '400px',
          wordWrap: 'break-word',
          animation: 'slideIn 0.3s ease-out'
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          {errorMessage}
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div style={{
          position: 'fixed', top: '0', left: '0', right: '0', bottom: '0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(255,255,255,0.6)', zIndex: 1500
        }}>
          <div style={{ padding: '24px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="spinner" style={{
              width: '40px', height: '40px', border: '3px solid #f3f3f3',
              borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite'
            }}></div>
            <span style={{ fontSize: '16px', color: '#333', fontWeight: '500' }}>Processing...</span>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
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
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              color: '#333',
              fontSize: '18px',
              fontWeight: '600'
            }}>
              Confirmation
            </h3>
            <p style={{
              margin: '0 0 24px 0',
              color: '#666',
              fontSize: '16px',
              lineHeight: '1.5'
            }}>
              Are you sure you want to delete this risk / issue status? This action cannot be undone.
            </p>
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center'
            }}>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                style={{
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '500',
                  minWidth: '100px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '500',
                  minWidth: '100px'
                }}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Confirmation Dialog */}
      {showConfirmDialog && (
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
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              color: '#333',
              fontSize: '18px',
              fontWeight: '600'
            }}>
              Confirmation
            </h3>
            <p style={{
              margin: '0 0 24px 0',
              color: '#666',
              fontSize: '16px',
              lineHeight: '1.5'
            }}>
              {confirmMessage}
            </p>
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center'
            }}>
              <button
                onClick={handleConfirmCancel}
                style={{
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '500',
                  minWidth: '100px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmYes}
                style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '500',
                  minWidth: '100px'
                }}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="table-container" style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto', overflowX: 'auto', paddingBottom: '1rem' }}>
        <table className="config-table" style={{ fontSize: '15px', width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', width: '20%' }}>Status Code</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', width: '30%' }}>Status Name</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', width: '38%' }}>Definition</th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', width: '12%' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #eee', height: 'auto', minHeight: '40px' }}>
                <td style={{ padding: '6px 12px', verticalAlign: 'top' }}>
                  {editingItem === item.id ? (
                    <div style={{ paddingTop: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <TextField
                          size="small"
                          style={{ flex: 1 }}
                          value={editValues.statusCode || ''}
                          onChange={(e) => {
                            const value = e.target.value.toUpperCase().replace(/[^a-zA-Z0-9\-]/g, '');
                            if (value.length <= 30) {
                              handleInputChange('statusCode', value);
                            }
                          }}
                          placeholder="Status Code *"
                          variant="outlined"
                          inputProps={{ maxLength: 30 }}
                          sx={{
                            '& .MuiOutlinedInput-root': { fontSize: '14px' },
                            '& .MuiInputBase-input': { padding: '6px 10px', fontSize: '14px' },
                          }}
                        />
                        <div style={{ fontSize: '12px', color: (editValues.statusCode || '').length >= 30 ? '#ef4444' : '#6b7280', whiteSpace: 'nowrap' }}>
                          {(editValues.statusCode || '').length}/30
                        </div>
                      </div>
                      {(editValues.statusCode || '').length >= 30 && (
                        <div style={{ fontSize: '12px', color: '#ef4444', whiteSpace: 'nowrap', marginTop: '4px' }}>
                          30 Limit exceeded
                        </div>
                      )}
                      {validationErrors[editingItem]?.statusCode && (
                        <div style={{ fontSize: '12px', color: '#ef4444', whiteSpace: 'nowrap', marginTop: '4px' }}>
                          Status Code is required
                        </div>
                      )}
                    </div>
                  ) : (
                    <span style={{ display: 'block', wordWrap: 'break-word', whiteSpace: 'normal', fontSize: '14px', lineHeight: '1.4', paddingTop: '8px' }}>
                      {item.statusCode}
                    </span>
                  )}
                </td>
                <td style={{ padding: '6px 12px', verticalAlign: 'top' }}>
                  {editingItem === item.id ? (
                    <div style={{ paddingTop: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <TextField
                          size="small"
                          style={{ flex: 1 }}
                          value={editValues.statusName || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value.length <= 100) {
                              handleInputChange('statusName', capitalizeFirstChar(value));
                            }
                          }}
                          placeholder="Status Name *"
                          variant="outlined"
                          inputProps={{ maxLength: 100 }}
                          sx={{
                            '& .MuiOutlinedInput-root': { fontSize: '14px' },
                            '& .MuiInputBase-input': { padding: '6px 10px', fontSize: '14px' },
                          }}
                        />
                        <div style={{ fontSize: '12px', color: (editValues.statusName || '').length >= 100 ? '#ef4444' : '#6b7280', whiteSpace: 'nowrap' }}>
                          {(editValues.statusName || '').length}/100
                        </div>
                      </div>
                      {(editValues.statusName || '').length >= 100 && (
                        <div style={{ fontSize: '12px', color: '#ef4444', whiteSpace: 'nowrap', marginTop: '4px' }}>
                          100 Limit exceeded
                        </div>
                      )}
                      {validationErrors[editingItem]?.statusName && (
                        <div style={{ fontSize: '12px', color: '#ef4444', whiteSpace: 'nowrap', marginTop: '4px' }}>
                          Status Name is required
                        </div>
                      )}
                    </div>
                  ) : (
                    <span style={{ display: 'block', wordWrap: 'break-word', whiteSpace: 'normal', fontSize: '14px', lineHeight: '1.4', paddingTop: '8px' }}>
                      {item.statusName}
                    </span>
                  )}
                </td>
                <td style={{ padding: '6px 12px', verticalAlign: 'top' }}>
                  {editingItem === item.id ? (
                    <div style={{ paddingTop: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <TextField
                          size="small"
                          style={{ flex: 1 }}
                          value={editValues.definition || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value.length <= 240) {
                              handleInputChange('definition', capitalizeFirstChar(value));
                            }
                          }}
                          placeholder="Definition"
                          variant="outlined"
                          inputProps={{ maxLength: 240 }}
                          sx={{
                            '& .MuiOutlinedInput-root': { fontSize: '14px' },
                            '& .MuiInputBase-input': { padding: '6px 10px', fontSize: '14px' },
                          }}
                        />
                        <div style={{ fontSize: '12px', color: (editValues.definition || '').length >= 240 ? '#ef4444' : '#6b7280', whiteSpace: 'nowrap' }}>
                          {(editValues.definition || '').length}/240
                        </div>
                      </div>
                      {(editValues.definition || '').length >= 240 && (
                        <div style={{ fontSize: '12px', color: '#ef4444', whiteSpace: 'nowrap', marginTop: '4px' }}>
                          240 Limit exceeded
                        </div>
                      )}
                    </div>
                  ) : (
                    <span style={{ display: 'block', wordWrap: 'break-word', whiteSpace: 'normal', fontSize: '14px', lineHeight: '1.4', paddingTop: '8px' }}>
                      {item.definition}
                    </span>
                  )}
                </td>
                <td style={{ padding: '6px 4px', verticalAlign: 'middle', textAlign: 'center' }}>
                  <div className="action-icons" style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
                    {item.systemDefault === 'Yes' ? (
                      <span style={{ color: '#bbb', fontSize: '12px', fontStyle: 'italic' }}>System Default</span>
                    ) : (
                      editingItem === item.id ? (
                        !item.isSaved ? (
                          <button
                            onClick={() => handleDelete(item.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleSave(item.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981', padding: '4px' }}
                              title="Save"
                            >
                              <Save size={16} />
                            </button>
                            <button
                              onClick={() => handleCancel(item.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}
                              title="Cancel"
                            >
                              <X size={16} />
                            </button>
                          </>
                        )
                      ) : !item.isSaved ? (
                        <button
                          onClick={() => handleDelete(item.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : (
                        <div style={{ position: 'relative' }}>
                          <button
                            onClick={() => setShowActionsMenu(showActionsMenu === item.id ? null : item.id)}
                            style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#6b7280', padding: '4px' }}
                          >
                            <MoreVertical size={18} />
                          </button>
                          {showActionsMenu === item.id && (
                            <div ref={menuRef} style={{
                              position: 'absolute', right: '100%', bottom: '0', backgroundColor: 'white',
                              border: '1px solid #ddd', borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                              zIndex: 2000, width: '120px', marginRight: '5px'
                            }}>
                              <button
                                onClick={() => handleEdit(item.id)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                                  padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer',
                                  textAlign: 'left', fontSize: '13px', color: '#333'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                <Edit size={14} style={{ color: '#3b82f6' }} /> Edit
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                                  padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer',
                                  textAlign: 'left', fontSize: '13px', color: '#dc2626'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {data.length === 0 && !loading && (
              <tr>
                <td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                  No risk / issue statuses found. Click "Add Status" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Save Button */}
      <div className="table-actions-bottom" style={{ display: 'flex', gap: '12px', marginTop: '16px', marginBottom: '24px', alignItems: 'center', marginLeft: '2rem' }}>
        <button
          className="add-btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '180px'
          }}
          onClick={handleAddStatus}
          disabled={loading}
        >
          {hasNewRow ? <Save size={18} /> : <Plus size={18} />}
          <span>{hasNewRow ? 'Save Status' : 'Add Status'}</span>
        </button>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .help-modal-scroll::-webkit-scrollbar { width: 4px; }
        .help-modal-scroll::-webkit-scrollbar-track { background: transparent; margin: 8px 0; }
        .help-modal-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .help-modal-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        .config-table tr:hover {
          background-color: #fcfcfc;
        }
        .add-btn {
          background-color: #28a745;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          transition: background-color 0.2s;
        }
        .add-btn:hover {
          background-color: #218838;
        }
        .add-btn:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default RiskIssueStatus;

