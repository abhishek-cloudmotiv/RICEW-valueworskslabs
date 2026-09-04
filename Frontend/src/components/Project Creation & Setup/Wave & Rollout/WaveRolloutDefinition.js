import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash2, Save, X, MoreVertical, AlertCircle, HelpCircle, Lock, Unlock, BarChart3, GripVertical } from 'lucide-react';
import { TextField } from '@mui/material';
import { getIdToken } from '../../../utils/cognito-auth';
import { useNavigate } from 'react-router-dom';
import RolloutForm from './RolloutForm';
import GanttChartModal from './GanttChartModal';
import { CustomDatePicker } from '../../Resource Roster Form/Components';
import DOMPurify from 'dompurify';
import { useSession } from '../../../context/SessionContext';

// MenuDropdown component with fixed positioning to prevent clipping
const MenuDropdown = ({ item, data, onEdit, onDelete, buttonRef }) => {
  const [position, setPosition] = React.useState({ top: 0, left: 0 });

  React.useEffect(() => {
    if (buttonRef && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - 40,
        left: rect.left - 8
      });
    }
  }, [buttonRef]);

  return (
    <div
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateX(-95%)',
        backgroundColor: '#fff',
        border: '1px solid #e0e0e0',
        borderRadius: '4px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        zIndex: 4000,
        minWidth: '120px',
        whiteSpace: 'nowrap'
      }}
    >
      <button
        onClick={onEdit}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: 'none',
          background: 'none',
          textAlign: 'left',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          color: '#333'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
      >
        <Edit size={14} style={{ color: '#3b82f6' }} />
        <span>Edit</span>
      </button>
      <button
        onClick={onDelete}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: 'none',
          background: 'none',
          textAlign: 'left',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          color: '#333',
          borderTop: '1px solid #e0e0e0'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
      >
        <Trash2 size={14} style={{ color: '#ef4444' }} />
        <span>Delete</span>
      </button>
    </div>
  );
};

const WaveRolloutDefinition = ({ onClose, selectedProject, setUnsavedChangesChecker }) => {
  const navigate = useNavigate();
  const { handleAuthError } = useSession();
  const [showNoProjectSelectedPopup, setShowNoProjectSelectedPopup] = useState(false);
  const [showLastWaveEndDateMismatch, setShowLastWaveEndDateMismatch] = useState(false);
  const [lastWaveEndDateMismatchInfo, setLastWaveEndDateMismatchInfo] = useState({ waveEndDate: '', projectEndDate: '' });

  useEffect(() => {
    const projectId = localStorage.getItem('project_id');
    if (!selectedProject?.id && !projectId) {
      setShowNoProjectSelectedPopup(true);
    }
  }, [selectedProject?.id]);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editValues, setEditValues] = useState({});
  const editValuesRef = useRef(editValues);
  useEffect(() => {
    editValuesRef.current = editValues;
  }, [editValues]);
  const [hasNewRow, setHasNewRow] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState('');

  // Rollout modal state
  const [showRolloutPopup, setShowRolloutPopup] = useState(false);
  const [selectedWaveForRollout, setSelectedWaveForRollout] = useState(null);
  const [rolloutUnsavedChangesChecker, setRolloutUnsavedChangesChecker] = useState(null);

  // Gantt chart modal state
  const [showGanttChart, setShowGanttChart] = useState(false);

  // Wave Description hierarchy modal state
  const [showWaveDescModal, setShowWaveDescModal] = useState(false);
  const [selectedWaveForModal, setSelectedWaveForModal] = useState(null);
  const [modalRollouts, setModalRollouts] = useState([]);
  const [modalRolloutsLoading, setModalRolloutsLoading] = useState(false);

  // Dragging state for the hierarchy modal
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleWindowMouseMove = (e) => {
      if (!isDragging) return;
      setModalPosition({
        x: e.clientX - dragStartPos.current.x,
        y: e.clientY - dragStartPos.current.y
      });
    };

    const handleWindowMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleWindowMouseMove);
      window.addEventListener('mouseup', handleWindowMouseUp);
    } else {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isDragging]);

  const handleModalMouseDown = (e) => {
    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX - modalPosition.x,
      y: e.clientY - modalPosition.y
    };
  };

  const [validationErrors, setValidationErrors] = useState({});
  const startDateRef = useRef(null);
  const endDateRef = useRef(null);
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const helpPopupRef = useRef(null);

  const [projectDates, setProjectDates] = useState({ startDate: '', endDate: '' });

  useEffect(() => {
    const fetchProjectDates = async () => {
      const pId = selectedProject?.id || localStorage.getItem('project_id');
      if (!pId) return;
      try {
        let idToken;
        try {
          idToken = await getIdToken();
        } catch (tokenError) {
          console.error('Error getting token:', tokenError);
          handleAuthError(tokenError.message);
          return;
        }

        const response = await fetch(`https://pewqu3v5b3.execute-api.ap-south-1.amazonaws.com/New/rice/get/getProjectDates?Project_ID=${encodeURIComponent(pId)}`, {
          headers: { 'Authorization': `Bearer ${idToken}` }
        });

        if (response.status === 401 || response.status === 403) {
          handleAuthError('Unauthorized - session expired');
          return;
        }

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data && result.data.length > 0) {
            setProjectDates({
              startDate: DOMPurify.sanitize(String(result.data[0].Planned_Start_Date || '').trim(), { ALLOWED_TAGS: [] }),
              endDate: DOMPurify.sanitize(String(result.data[0].Planned_End_Date || '').trim(), { ALLOWED_TAGS: [] })
            });
          }
        }
      } catch (err) {
        console.error('Error fetching project dates:', err);
        handleAuthError(err.message);
      }
    };
    fetchProjectDates();
  }, [selectedProject?.id]);

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

  // Function to capitalize first character
  const capitalizeFirstChar = (str) => {
    if (!str || str.length === 0) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Load data from API on component mount
  useEffect(() => {
    loadWaveRolloutData();
  }, [selectedProject?.id]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Provide unsaved changes checker to parent component
  useEffect(() => {
    if (setUnsavedChangesChecker) {
      setUnsavedChangesChecker(() => () => {
        return hasNewRow || editingItem !== null;
      });
    }
  }, [hasNewRow, editingItem, setUnsavedChangesChecker]);

  const loadWaveRolloutData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      // Get projectId from localStorage
      const projectId = localStorage.getItem('project_id');
      if (!projectId) {
        setData([]);
        setLoading(false);
        return;
      }

      // Get ID token for authorization
      let idToken;
      try {
        idToken = await getIdToken();
      } catch (tokenError) {
        console.error('Error getting token:', tokenError);
        handleAuthError(tokenError.message);
        setData([]);
        if (!isSilent) setLoading(false);
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      };

      // Updated URL with project_id parameter
      const response = await fetch(`https://pewqu3v5b3.execute-api.ap-south-1.amazonaws.com/New/rice/get/waveRolloutDefinitions?project_id=${projectId}`, {
        headers: headers
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        setData([]);
        if (!isSilent) setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch wave rollout definitions');
      }

      const apiResponse = await response.json();
      const apiData = apiResponse.data || []; // Use the .data property

      // Map API response to component data structure and filter out deleted items
      const mappedData = apiData
        .filter(item => item.delete_status !== 'true')
        .map(item => ({
          id: item.waveRolloutId,
          waveCode: DOMPurify.sanitize(String(item.Wave_Code || '').trim(), { ALLOWED_TAGS: [] }),
          waveDescription: DOMPurify.sanitize(String(item.Wave_Description || '').trim(), { ALLOWED_TAGS: [] }),
          rollout: DOMPurify.sanitize(String(item.Rollout || '').trim(), { ALLOWED_TAGS: [] }),
          startDate: DOMPurify.sanitize(String(item.Start_Date || '').trim(), { ALLOWED_TAGS: [] }),
          endDate: DOMPurify.sanitize(String(item.End_Date || '').trim(), { ALLOWED_TAGS: [] }),
          comments: DOMPurify.sanitize(String(item.Wave_Comment || '').trim(), { ALLOWED_TAGS: [] }),
          rollouts: Array.isArray(item.rollouts) ? item.rollouts : [],
          createdBy: DOMPurify.sanitize(String(item.created_by || '').trim(), { ALLOWED_TAGS: [] }),
          createdDate: item.created_date ? new Date(item.created_date).toISOString().split('T')[0] : '',
          lastUpdatedBy: DOMPurify.sanitize(String(item.updated_by || '').trim(), { ALLOWED_TAGS: [] }),
          lastUpdatedDate: item.updated_date ? new Date(item.updated_date).toISOString().split('T')[0] : '',
          wave_confirm: item.wave_confirm === "true" || item.wave_confirm === true,
          lock_status: item.lock_status === "true" || item.lock_status === true || item.wave_lock === "true" || item.wave_lock === true || item.wave_Lock === "true" || item.wave_Lock === true,
          isSaved: true
        }))
        .sort((a, b) => a.id - b.id); // Sort by waveRolloutId

      setData(mappedData);
    } catch (error) {
      console.error('Error loading wave rollout data:', error);
      handleAuthError(error.message);
      setErrorMessage('Error loading wave rollout definitions. Please try again.');
      setShowErrorMessage(true);
      setTimeout(() => setShowErrorMessage(false), 3000);
      setData([]);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const handleOpenGanttChart = () => {
    setShowGanttChart(true);
  };

  const handleToggleLock = async () => {
    if (data.length === 0) return;

    // Check if all waves are confirmed
    const allConfirmed = data.every(w => w.wave_confirm);
    if (!allConfirmed) return;

    const isLocked = data.every(w => w.lock_status);
    const actionUrl = isLocked
      ? 'https://pewqu3v5b3.execute-api.ap-south-1.amazonaws.com/New/rice/unlock/waveRollout'
      : 'https://pewqu3v5b3.execute-api.ap-south-1.amazonaws.com/New/rice/lock/waveRollout';

    try {
      setLoading(true);
      let idToken = await getIdToken();
      const payload = data.map(w => ({
        waveRolloutId: w.id.toString(),
        project_id: localStorage.getItem('project_id')
      }));

      const response = await fetch(actionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setSuccessMessage(isLocked ? 'All waves unlocked successfully' : 'All waves locked successfully');
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
        await loadWaveRolloutData(true);
      } else {
        const errorData = await response.json().catch(() => null);
        throw new Error((errorData && errorData.error) || 'Failed to toggle lock status');
      }
    } catch (err) {
      console.error('Error toggling lock:', err);
      setErrorMessage(err.message);
      setShowErrorMessage(true);
      setTimeout(() => setShowErrorMessage(false), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleAddWaveRollout = () => {
    // Check if there's an unsaved edit in progress
    if (editingItem !== null) {
      const editingItemData = data.find(item => item.id === editingItem);
      if (editingItemData && editingItemData.isSaved) {
        showConfirmation(
          'You have unsaved changes. Do you want to discard them and add a new record?',
          () => {
            setEditingItem(null);
            setEditValues({});
            setValidationErrors({});
            addNewWaveRolloutRow();
          }
        );
        return;
      }
    }

    // If there's already a new row being edited, save it
    if (hasNewRow && editingItem) {
      handleSaveEdit(editingItem);
      return;
    }

    // Otherwise, add a new row
    addNewWaveRolloutRow();
  };

  const addNewWaveRolloutRow = () => {
    const newId = `TEMP_${Date.now()}`;
    const currentDate = new Date().toISOString().split('T')[0];

    const newRow = {
      id: newId,
      waveCode: '',
      waveDescription: '',
      rollouts: [], // Initialize rollouts array
      startDate: '',
      endDate: '',
      comments: '',
      createdBy: 'SYSTEM',
      createdDate: currentDate,
      lastUpdatedBy: 'SYSTEM',
      lastUpdatedDate: currentDate,
      isSaved: false
    };

    setData([...data, newRow]);
    setEditingItem(newId);
    setEditValues(newRow);
    setHasNewRow(true);

    // Auto-scroll to the new row
    setTimeout(() => {
      const tableContainer = document.querySelector('.table-container');
      if (tableContainer) {
        tableContainer.scrollTop = tableContainer.scrollHeight;
      }
    }, 100);
  };

  const handleEdit = (id) => {
    const item = data.find(d => d.id === id);
    if (item) {
      if (hasNewRow) {
        showConfirmation(
          'You have unsaved changes. Do you want to continue?',
          () => {
            setData(data.filter(row => row.isSaved));
            setHasNewRow(false);
            setValidationErrors({});
            setEditingItem(id);
            setEditValues({ ...item });
            setOpenMenuId(null);
            // Auto-scroll to make the edit row visible
            setTimeout(() => {
              const tableContainer = document.querySelector('.table-container');
              if (tableContainer) {
                const itemIndex = data.filter(row => row.isSaved).findIndex(d => d.id === id);
                if (itemIndex >= data.filter(row => row.isSaved).length - 2) {
                  tableContainer.scrollTop = tableContainer.scrollHeight;
                }
              }
            }, 100);
          }
        );
      } else if (editingItem !== null && editingItem !== id) {
        showConfirmation(
          'You have unsaved changes. Do you want to discard them and edit another record?',
          () => {
            setEditingItem(id);
            setEditValues({ ...item });
            setOpenMenuId(null);
            // Auto-scroll to make the edit row visible
            setTimeout(() => {
              const tableContainer = document.querySelector('.table-container');
              if (tableContainer) {
                const itemIndex = data.findIndex(d => d.id === id);
                if (itemIndex >= data.length - 2) {
                  tableContainer.scrollTop = tableContainer.scrollHeight;
                }
              }
            }, 100);
          }
        );
      } else {
        setEditingItem(id);
        setEditValues({ ...item });
        setOpenMenuId(null);
        // Auto-scroll to make the edit row visible
        setTimeout(() => {
          const tableContainer = document.querySelector('.table-container');
          if (tableContainer) {
            const itemIndex = data.findIndex(d => d.id === id);
            if (itemIndex >= data.length - 2) {
              tableContainer.scrollTop = tableContainer.scrollHeight;
            }
          }
        }, 100);
      }
    }
  };

  const handleCancelEdit = () => {
    if (!editValues.isSaved) {
      setData(data.filter(item => item.id !== editingItem));
      setHasNewRow(false);
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[editingItem];
        return newErrors;
      });
    }
    setEditingItem(null);
    setEditValues({});
  };

  // Manual date parser for real-time validation without relying on CustomDatePicker's delayed onChange
  const parseManualDateRealTime = (displayValue) => {
    if (!displayValue) return null;

    let day, month, year;
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

    // Try parsing dd-mmm-yyyy format (e.g., 12-Oct-2025)
    let parts = displayValue.split('-');
    if (parts.length === 3 && isNaN(parts[1])) {
      const dayStr = parts[0].trim();
      const monthStr = parts[1].trim();
      const yearStr = parts[2].trim();

      if (/^\d{1,2}$/.test(dayStr) && /^[a-zA-Z]{3}$/.test(monthStr) && /^\d{4}$/.test(yearStr)) {
        day = parseInt(dayStr, 10);
        const monthIndex = monthNames.indexOf(monthStr.toUpperCase());
        year = parseInt(yearStr, 10);
        if (day >= 1 && day <= 31 && monthIndex !== -1) {
          return `${year.toString().padStart(4, '0')}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      }
    }

    // Try parsing dd-mm-yyyy or dd/mm/yyyy format
    const separators = ['-', '/'];
    for (const sep of separators) {
      parts = displayValue.split(sep);
      if (parts.length === 3) {
        day = parseInt(parts[0], 10);
        const monthNum = parseInt(parts[1], 10);
        year = parseInt(parts[2], 10);

        if (!isNaN(day) && !isNaN(monthNum) && !isNaN(year) && monthNum >= 1 && monthNum <= 12) {
          const date = new Date(year, monthNum - 1, day);
          if (!isNaN(date.getTime())) {
            return `${year.toString().padStart(4, '0')}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          }
        }
      }
    }

    // Try parsing yyyy-mm-dd format (ISO format)
    parts = displayValue.split('-');
    if (parts.length === 3) {
      year = parseInt(parts[0], 10);
      const monthNum = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);

      if (!isNaN(day) && !isNaN(monthNum) && !isNaN(year) && monthNum >= 1 && monthNum <= 12) {
        const date = new Date(year, monthNum - 1, day);
        if (!isNaN(date.getTime())) {
          return `${year.toString().padStart(4, '0')}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      }
    }

    return null;
  };

  const validateDateBounds = (dateStr, field) => {
    if (!dateStr || !projectDates.startDate || !projectDates.endDate || !editingItem) return;
    const projStart = new Date(projectDates.startDate);
    const projEnd = new Date(projectDates.endDate);
    const waveDate = new Date(dateStr);

    const isFirstWave = data.length > 0 && data[0].id === editingItem;
    let errorType = null;

    if (field === 'startDate' && isFirstWave && waveDate.getTime() !== projStart.getTime()) {
      errorType = 'firstWaveStartMismatch';
    } else if (waveDate < projStart || waveDate > projEnd) {
      errorType = 'outOfBounds';
    }

    setValidationErrors(prev => {
      const newErrors = { ...(prev[editingItem] || {}) };
      if (errorType && newErrors[field] !== errorType) {
        newErrors[field] = errorType;
        return { ...prev, [editingItem]: newErrors };
      } else if (!errorType && newErrors[field]) {
        delete newErrors[field];
        return { ...prev, [editingItem]: newErrors };
      }
      return prev;
    });
  };

  // Validate when editValues change (e.g. from calendar clicks)
  useEffect(() => {
    if (editingItem && projectDates.startDate && projectDates.endDate) {
      if (editValues.startDate) validateDateBounds(editValues.startDate, 'startDate');
      if (editValues.endDate) validateDateBounds(editValues.endDate, 'endDate');
      if (editValues.startDate && editValues.endDate) {
        if (new Date(editValues.startDate) > new Date(editValues.endDate)) {
          setValidationErrors(prev => ({
            ...prev,
            [editingItem]: { ...(prev[editingItem] || {}), startDate: 'outOfBounds', endDate: 'outOfBounds' }
          }));
        }
      }
    }
  }, [editValues.startDate, editValues.endDate, editingItem, projectDates]);

  const handleSaveEdit = async (id) => {
    try {
      // If we're midway through editing Rollouts form
      if (showRolloutPopup) return false;

      // Wait for CustomDatePicker's onBlur timeout (200ms) and state update to settle
      // This ensures that if the user typed a date and immediately clicked Save,
      // the blur event has time to update the parent state.
      await new Promise(resolve => setTimeout(resolve, 300));

      const currentEditValues = editValuesRef.current;

      // Validation - check required fields
      const fieldsWithErrors = {};

      if (!currentEditValues.waveCode || currentEditValues.waveCode.trim() === '') {
        fieldsWithErrors.waveCode = true;
      }
      if (!currentEditValues.waveDescription || currentEditValues.waveDescription.trim() === '') {
        fieldsWithErrors.waveDescription = true;
      }
      if (!currentEditValues.startDate || currentEditValues.startDate.trim() === '') {
        fieldsWithErrors.startDate = true;
      }
      if (!currentEditValues.endDate || currentEditValues.endDate.trim() === '') {
        fieldsWithErrors.endDate = true;
      }

      if (Object.keys(fieldsWithErrors).length > 0) {
        setValidationErrors(prev => ({
          ...prev,
          [id]: fieldsWithErrors
        }));

        const fieldCount = Object.keys(fieldsWithErrors).length;
        setErrorMessage(fieldCount > 1 ? 'The required fields are missing' : 'The required field is missing');
        setShowErrorMessage(true);
        setTimeout(() => setShowErrorMessage(false), 3000);
        return false;
      }

      // Clear validation errors
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[id];
        return newErrors;
      });

      // Project date boundary validation
      if (projectDates.startDate && projectDates.endDate) {
        const projStart = new Date(projectDates.startDate);
        const projEnd = new Date(projectDates.endDate);
        const boundaryErrors = {};

        const isFirstWave = data.length > 0 && data[0].id === id;

        if (currentEditValues.startDate) {
          const waveStart = new Date(currentEditValues.startDate);
          if (isFirstWave && waveStart.getTime() !== projStart.getTime()) {
            boundaryErrors.startDate = 'firstWaveStartMismatch';
          } else if (waveStart < projStart || waveStart > projEnd) {
            boundaryErrors.startDate = 'outOfBounds';
          }
        }
        if (currentEditValues.endDate) {
          const waveEnd = new Date(currentEditValues.endDate);
          if (waveEnd < projStart || waveEnd > projEnd) {
            boundaryErrors.endDate = 'outOfBounds';
          }
        }
        if (currentEditValues.startDate && currentEditValues.endDate) {
          if (new Date(currentEditValues.startDate) > new Date(currentEditValues.endDate)) {
            if (!boundaryErrors.startDate) boundaryErrors.startDate = 'outOfBounds';
            boundaryErrors.endDate = 'outOfBounds';
          }
        }

        if (Object.keys(boundaryErrors).length > 0) {
          setValidationErrors(prev => ({
            ...prev,
            [id]: { ...prev[id], ...boundaryErrors }
          }));
          const projStartDisplay = formatDateForDisplay(projectDates.startDate);
          const projEndDisplay = formatDateForDisplay(projectDates.endDate);

          if (boundaryErrors.startDate === 'firstWaveStartMismatch') {
            setErrorMessage(`First wave must start exactly on project start date (${projStartDisplay})`);
          } else {
            setErrorMessage(`Dates must be within project bounds (${projStartDisplay} - ${projEndDisplay})`);
          }

          setShowErrorMessage(true);
          setTimeout(() => setShowErrorMessage(false), 4000);
          return false;
        }
      }

      const currentDate = new Date().toISOString().split('T')[0];
      const isUpdate = currentEditValues.isSaved === true;

      // API call to save or update wave rollout definition
      const apiUrl = isUpdate
        ? 'https://pewqu3v5b3.execute-api.ap-south-1.amazonaws.com/New/rice/update/waveRolloutDefinitions'
        : 'https://pewqu3v5b3.execute-api.ap-south-1.amazonaws.com/New/rice/save/waveRolloutDefinitions';

      const payload = isUpdate ? {
        waveRolloutId: currentEditValues.id.toString(),
        project_id: localStorage.getItem('project_id'),
        Wave_Code: currentEditValues.waveCode,
        Wave_Description: currentEditValues.waveDescription,
        Start_Date: currentEditValues.startDate,
        End_Date: currentEditValues.endDate,
        Wave_Comment: currentEditValues.comments || '',
        updated_by: localStorage.getItem('user_id') || "1"
      } : {
        Wave_Code: currentEditValues.waveCode,
        Wave_Description: currentEditValues.waveDescription,
        Start_Date: currentEditValues.startDate,
        End_Date: currentEditValues.endDate,
        Wave_Comment: currentEditValues.comments || '',
        project_id: localStorage.getItem('project_id'),
        user_id: localStorage.getItem('user_id') || "1",
        created_by: localStorage.getItem('user_id') || "1"
      };

      // Get ID token for authorization
      let idToken;
      try {
        idToken = await getIdToken();
      } catch (tokenError) {
        console.error('Error getting token:', tokenError);
        handleAuthError(tokenError.message);
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      };

      const sanitizedPayload = {
        ...payload,
        Wave_Code: DOMPurify.sanitize(String(payload.Wave_Code || '').trim(), { ALLOWED_TAGS: [] }),
        Wave_Description: DOMPurify.sanitize(String(payload.Wave_Description || '').trim(), { ALLOWED_TAGS: [] }),
        Wave_Comment: DOMPurify.sanitize(String(payload.Wave_Comment || '').trim(), { ALLOWED_TAGS: [] })
      };
      if (isUpdate) {
        sanitizedPayload.waveRolloutId = DOMPurify.sanitize(String(payload.waveRolloutId || '').trim(), { ALLOWED_TAGS: [] });
        sanitizedPayload.updated_by = DOMPurify.sanitize(String(payload.updated_by || '').trim(), { ALLOWED_TAGS: [] });
      } else {
        sanitizedPayload.created_by = DOMPurify.sanitize(String(payload.created_by || '').trim(), { ALLOWED_TAGS: [] });
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(sanitizedPayload)
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        setErrorMessage('Session expired - please log in again');
        setShowErrorMessage(true);
        setTimeout(() => setShowErrorMessage(false), 3000);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        if (errorData && errorData.error) {
          throw new Error(errorData.error);
        }
        throw new Error(`Failed to ${isUpdate ? 'update' : 'save'} wave rollout definition`);
      }

      // Simulating successful save
      setSuccessMessage(isUpdate ? 'Wave Rollout Definition updated successfully!' : 'Wave Rollout Definition saved successfully!');
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);

      setData(data.map(item =>
        item.id === id
          ? { ...currentEditValues, isSaved: true, lastUpdatedBy: 'SYSTEM', lastUpdatedDate: currentDate }
          : item
      ));

      setEditingItem(null);
      setEditValues({});
      setHasNewRow(false);

      // Silently reload data to get server-generated IDs and latest state
      await loadWaveRolloutData(true);

      // If editing the last wave, ensure its End Date matches the project's Planned End Date
      if (isUpdate && projectDates.endDate) {
        const savedWaves = data.filter(w => w.isSaved || w.id === id);
        const sortedWaves = [...savedWaves].sort((a, b) => Number(a.id) - Number(b.id));
        const lastWave = sortedWaves[sortedWaves.length - 1];

        if (lastWave && lastWave.id === id) {
          const waveEnd = new Date(currentEditValues.endDate);
          const projEnd = new Date(projectDates.endDate);
          waveEnd.setHours(0, 0, 0, 0);
          projEnd.setHours(0, 0, 0, 0);

          if (waveEnd.getTime() !== projEnd.getTime()) {
            setLastWaveEndDateMismatchInfo({
              waveEndDate: currentEditValues.endDate,
              projectEndDate: projectDates.endDate
            });
            setShowLastWaveEndDateMismatch(true);
          }
        }
      }
    } catch (error) {
      console.error('Error saving wave rollout definition:', error);
      handleAuthError(error.message);
      setErrorMessage(error.message || 'Error saving wave rollout definition. Please try again.');
      setShowErrorMessage(true);
      setTimeout(() => setShowErrorMessage(false), 3000);

      // Auto-scroll to make the error visible (usually on the last row)
      setTimeout(() => {
        const tableContainer = document.querySelector('.table-container');
        if (tableContainer) {
          tableContainer.scrollTop = tableContainer.scrollHeight;
        }
      }, 100);
    }
  };

  const handleDelete = (id) => {
    const rowToDelete = data.find(item => item.id === id);

    if (rowToDelete) {
      if (!rowToDelete.isSaved) {
        setHasNewRow(false);
        setEditingItem(null);
        setEditValues({});
        setData(data.filter(item => item.id !== id));
        setValidationErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[id];
          return newErrors;
        });
      } else {
        showConfirmation(
          'Are you sure you want to delete this wave rollout definition? This action cannot be undone.',
          async () => {
            try {
              // Get ID token for authorization
              let idToken;
              try {
                idToken = await getIdToken();
              } catch (tokenError) {
                console.error('Error getting token:', tokenError);
                handleAuthError(tokenError.message);
                setErrorMessage('Authentication error. Please login again.');
                setShowErrorMessage(true);
                setTimeout(() => setShowErrorMessage(false), 3000);
                return;
              }

              const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
              };

              // API call to soft delete wave rollout definition
              const projectId = localStorage.getItem('project_id');

              if (!projectId) {
                setErrorMessage('Project ID is missing. Please select a project and try again.');
                setShowErrorMessage(true);
                setTimeout(() => setShowErrorMessage(false), 3000);
                return;
              }

              const sanitizedId = DOMPurify.sanitize(String(id || '').trim(), { ALLOWED_TAGS: [] });
              const sanitizedProjectId = DOMPurify.sanitize(String(projectId || '').trim(), { ALLOWED_TAGS: [] });

              const response = await fetch(`https://pewqu3v5b3.execute-api.ap-south-1.amazonaws.com/New/rice/delete/waveRolloutDefinitions?waveRolloutId=${sanitizedId}&project_id=${sanitizedProjectId}`, {
                method: 'DELETE',
                headers: headers
              });

              if (response.status === 401 || response.status === 403) {
                handleAuthError('Unauthorized - session expired');
                setErrorMessage('Session expired - please log in again');
                setShowErrorMessage(true);
                setTimeout(() => setShowErrorMessage(false), 3000);
                return;
              }

              if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error((errorData && errorData.error) || 'Failed to delete wave rollout definition');
              }

              setSuccessMessage('Wave Rollout Definition deleted successfully!');
              setShowSuccessMessage(true);
              setTimeout(() => setShowSuccessMessage(false), 3000);

              setData(data.filter(d => d.id !== id));
              setOpenMenuId(null);

              if (editingItem === id) {
                setEditingItem(null);
                setEditValues({});
              }
            } catch (error) {
              console.error('Error deleting wave rollout definition:', error);
              handleAuthError(error.message);
              setErrorMessage(error.message || 'Error deleting wave rollout definition. Please try again.');
              setShowErrorMessage(true);
              setTimeout(() => setShowErrorMessage(false), 3000);
            }
          }
        );
      }
    }
  };

  const handleInputChange = (field, value) => {
    setEditValues(prev => ({ ...prev, [field]: value }));
  };

  const handleAddRolloutClick = (wave) => {
    if (editingItem && editingItem !== wave.id) {
      showConfirmation('You have unsaved changes in another row. Do you want to discard them?', () => {
        setEditingItem(null);
        setEditValues({});
        setHasNewRow(false);
        // Open popup for selected wave
        setSelectedWaveForRollout(wave);
        setShowRolloutPopup(true);
      });
      return;
    }

    if (hasNewRow && editingItem === wave.id) {
      showConfirmation('You must save the Wave first before adding Rollouts. Save now?', async () => {
        await handleSaveEdit(wave.id);
        // Only open if save was successful
        const savedRow = data.find(d => d.id === wave.id);
        if (savedRow && savedRow.isSaved) {
          setSelectedWaveForRollout(savedRow);
          setShowRolloutPopup(true);
        }
      });
      return;
    }

    setSelectedWaveForRollout(wave);
    setShowRolloutPopup(true);
  };

  const handleRolloutSave = (waveId, savedRollouts) => {
    setData(data.map(item =>
      item.id === waveId
        ? { ...item, rollouts: Array.isArray(savedRollouts) ? savedRollouts : [] }
        : item
    ));

    // If currently editing this row, update editValues too
    if (editingItem === waveId) {
      setEditValues(prev => ({ ...prev, rollouts: Array.isArray(savedRollouts) ? savedRollouts : [] }));
    }

    // Update selected wave too so it has the new rollouts
    setSelectedWaveForRollout(prev => prev && prev.id === waveId ? { ...prev, rollouts: Array.isArray(savedRollouts) ? savedRollouts : [] } : prev);

    // Refresh wave data silently to ensure wave_confirm and lock status are immediately accurate
    loadWaveRolloutData(true);
  };

  const handleCloseRolloutPopup = () => {
    if (rolloutUnsavedChangesChecker && rolloutUnsavedChangesChecker()) {
      showConfirmation(
        'You have unsaved changes in the Rollout form. Are you sure you want to close without saving?',
        () => {
          setShowRolloutPopup(false);
          setSelectedWaveForRollout(null);
          setRolloutUnsavedChangesChecker(null);
          loadWaveRolloutData(true); // refresh on close
        }
      );
    } else {
      setShowRolloutPopup(false);
      setSelectedWaveForRollout(null);
      setRolloutUnsavedChangesChecker(null);
      loadWaveRolloutData(true); // refresh on close
    }
  };

  const handleWaveDescClick = async (item) => {
    setSelectedWaveForModal(item);
    setModalRollouts([]);
    setShowWaveDescModal(true);
    setModalRolloutsLoading(true);
    try {
      const projectId = localStorage.getItem('project_id');
      let idToken;
      try {
        idToken = await getIdToken();
      } catch (tokenError) {
        console.error('Error getting token:', tokenError);
        handleAuthError(tokenError.message);
        setModalRolloutsLoading(false);
        return;
      }

      const headers = { 'Authorization': `Bearer ${idToken}` };

      const sanitizedProjectId = DOMPurify.sanitize(String(projectId || '').trim(), { ALLOWED_TAGS: [] });
      const sanitizedItemId = DOMPurify.sanitize(String(item.id || '').trim(), { ALLOWED_TAGS: [] });

      const response = await fetch(
        `https://pewqu3v5b3.execute-api.ap-south-1.amazonaws.com/New/rice/get/rolloutDefinitions?project_id=${sanitizedProjectId}&waveRolloutId=${sanitizedItemId}`,
        { headers }
      );

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        setModalRolloutsLoading(false);
        return;
      }

      if (response.ok) {
        const result = await response.json();
        const rolloutData = (result.data || []).filter(r => r.delete_status !== 'true');
        const sanitizedRollouts = rolloutData.map(r => ({
          ...r,
          Rollout_Description: DOMPurify.sanitize(String(r.Rollout_Description || '').trim(), { ALLOWED_TAGS: [] }),
          Rollout_Start_Date: DOMPurify.sanitize(String(r.Rollout_Start_Date || '').trim(), { ALLOWED_TAGS: [] }),
          Rollout_End_Date: DOMPurify.sanitize(String(r.Rollout_End_Date || '').trim(), { ALLOWED_TAGS: [] }),
          Start_Date: DOMPurify.sanitize(String(r.Start_Date || '').trim(), { ALLOWED_TAGS: [] }),
          End_Date: DOMPurify.sanitize(String(r.End_Date || '').trim(), { ALLOWED_TAGS: [] })
        })).sort((a, b) => {
          const idA = Number(a.rice_Rollout_Definition_id) || 0;
          const idB = Number(b.rice_Rollout_Definition_id) || 0;
          return idA - idB;
        });
        setModalRollouts(sanitizedRollouts);
      }
    } catch (err) {
      console.error('Error fetching rollouts for modal:', err);
      handleAuthError(err.message);
    } finally {
      setModalRolloutsLoading(false);
    }
  };

  const isRolloutDatesValid = () => {
    const savedWaves = data.filter(w => w.isSaved);
    if (savedWaves.length === 0) return true;
    if (!projectDates.startDate || !projectDates.endDate) return true;

    const projStart = new Date(projectDates.startDate);
    const projEnd = new Date(projectDates.endDate);
    projStart.setHours(0, 0, 0, 0);
    projEnd.setHours(0, 0, 0, 0);

    const sortedWaves = [...savedWaves].sort((a, b) => Number(a.id) - Number(b.id));

    if (sortedWaves.length === 1) {
      const wave = sortedWaves[0];
      const wStart = new Date(wave.startDate);
      const wEnd = new Date(wave.endDate);
      wStart.setHours(0, 0, 0, 0);
      wEnd.setHours(0, 0, 0, 0);

      return wStart >= projStart && wEnd.getTime() === projEnd.getTime();
    } else {
      const firstWave = sortedWaves[0];
      const lastWave = sortedWaves[sortedWaves.length - 1];
      const wStart = new Date(firstWave.startDate);
      const wEnd = new Date(lastWave.endDate);
      wStart.setHours(0, 0, 0, 0);
      wEnd.setHours(0, 0, 0, 0);

      return wStart >= projStart && wEnd.getTime() === projEnd.getTime();
    }
  };

  const isRolloutDisabled = !isRolloutDatesValid();

  return (
    <div className="config-main" style={{ minHeight: '80vh' }}>
      <div className="config-header" style={{ marginTop: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2>Project Implementation Plan</h2>
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

      <div style={{ padding: '0 2rem 1rem 2rem' }}>
        <div style={{ border: '1px solid #ddd', borderRadius: '4px', marginBottom: '1rem', overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #ddd', backgroundColor: '#fdfdfd' }}>
            <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd' }}>Project Name</div>
            <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd' }}>Planned Start Date</div>
            <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333' }}>Planned End Date</div>
          </div>
          <div style={{ display: 'flex', backgroundColor: '#fff' }}>
            <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', color: '#333', borderRight: '1px solid #ddd', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={localStorage.getItem('project_name') || selectedProject?.name || ''}>
              {localStorage.getItem('project_name') || selectedProject?.name ? (localStorage.getItem('project_name') || selectedProject?.name) : <span style={{ color: '#bbb' }}>â€”</span>}
            </div>
            <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', color: '#333', borderRight: '1px solid #ddd' }}>
              {projectDates.startDate ? formatDateForDisplay(projectDates.startDate) : <span style={{ color: '#bbb' }}>â€”</span>}
            </div>
            <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', color: '#333' }}>
              {projectDates.endDate ? formatDateForDisplay(projectDates.endDate) : <span style={{ color: '#bbb' }}>â€”</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="config-header" style={{ marginTop: '0', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2>Wave Rollout Definitions</h2>
      </div>

      {/* Help Modal */}
      {showHelpPopup && (
        <div
          onClick={() => setShowHelpPopup(false)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000
          }}>
          <div
            onClick={(e) => e.stopPropagation()}
            ref={helpPopupRef}
            style={{
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
                    The <strong>Wave Rollout Definitions</strong> page manages the phased deployment plan for the ERP project. A <strong>Wave</strong> is a high-level deployment group (e.g., Wave 1, Wave 2) with a defined date range. Each wave contains one or more <strong>Rollouts</strong>, which represent specific entity or country go-lives within that wave.
                  </p>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <strong style={{ color: '#1f2937', fontSize: '15px' }}>Why is this used?</strong>
                  <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                    Large ERP implementations are typically delivered in waves â€” not all entities or countries go live at once. Defining waves and rollouts provides a shared deployment roadmap that helps project managers, workstream leads, and stakeholders plan resources, track readiness, and manage risk across each go-live event.
                  </p>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <strong style={{ color: '#1f2937', fontSize: '15px' }}>Understanding the columns</strong>
                  <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                    <li><strong>Wave Code</strong> â€” A short uppercase identifier for the wave (e.g., W1, WAVE-2). Max 30 characters, letters, numbers, and hyphens only.</li>
                    <li><strong>Wave Description</strong> â€” The name or description of the wave (e.g., "Phase 1 Go-Live"). Click the description to view its rollout hierarchy. Required, max 100 characters.</li>
                    <li><strong>Start Date / End Date</strong> â€” The planned start and end dates for this wave. Both are required and must fall within the project's overall planned dates shown at the top.</li>
                    <li><strong>Comments</strong> â€” Optional notes about the wave. Max 240 characters.</li>
                    <li><strong>Add Rollout</strong> â€” Opens the Rollout form to add individual rollouts (country/entity go-lives) under this wave.</li>
                    <li><strong>Actions</strong> â€” Edit or Delete the wave via the â‹® menu.</li>
                  </ul>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to use this page</strong>
                  <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                    <li>Click <strong>Add Wave</strong> to create a new row. Fill in the Wave Code, Wave Description, Start Date, and End Date, then click <strong>Save (âœ“)</strong>.</li>
                    <li>Once a wave is saved, click <strong>+ Add</strong> in the Add Rollout column to open the Rollout form and add rollouts under that wave.</li>
                    <li>Click any <strong>Wave Description</strong> (shown in blue) to view the full rollout hierarchy for that wave.</li>
                    <li>Use the <strong>â‹® Actions</strong> menu to Edit or Delete a saved wave.</li>
                  </ul>
                </div>

                <div style={{ marginBottom: '4px' }}>
                  <strong style={{ color: '#1f2937', fontSize: '15px' }}>Important notes</strong>
                  <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                    <li><strong>Wave Code</strong>, <strong>Wave Description</strong>, <strong>Start Date</strong>, and <strong>End Date</strong> are all required.</li>
                    <li>Wave dates must fall within the project's planned start and end dates shown in the header panel. A validation error will appear if they are out of bounds.</li>
                    <li>Start Date cannot be later than End Date.</li>
                    <li>A project must be selected before wave data can be loaded or added.</li>
                  </ul>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}


      {/* Confirmation Dialog */}
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
          zIndex: 20000
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

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .help-modal-scroll::-webkit-scrollbar { width: 4px; }
        .help-modal-scroll::-webkit-scrollbar-track { background: transparent; margin: 8px 0; }
        .help-modal-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .help-modal-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>

      <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto', overflowX: 'auto', paddingBottom: '1rem' }}>
        <table className="config-table" style={{ fontSize: '15px', tableLayout: 'fixed', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ padding: '8px 12px', fontSize: '15px', width: '12%', wordBreak: 'break-word' }}>Wave Code</th>
              <th style={{ padding: '8px 12px', fontSize: '15px', width: '17%', wordBreak: 'break-word' }}>Wave Description</th>
              <th style={{ padding: '8px 12px', fontSize: '15px', width: '13%', wordBreak: 'break-word' }}>Start Date</th>
              <th style={{ padding: '8px 12px', fontSize: '15px', width: '13%', wordBreak: 'break-word' }}>End Date</th>
              <th style={{ padding: '8px 12px', fontSize: '15px', width: '22%', wordBreak: 'break-word' }}>Comments</th>
              <th style={{ padding: '8px 12px', fontSize: '15px', width: '13%', textAlign: 'center', wordBreak: 'break-word' }}>Add Rollout</th>
              <th style={{ padding: '8px 12px', fontSize: '15px', width: '10%', textAlign: 'center', wordBreak: 'break-word' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>
                  Loading...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>
                  No wave rollout definitions found. Click "+ Add Wave" to create one.
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr key={item.id} style={{
                  height: 'auto',
                  minHeight: '40px',
                  backgroundColor: 'transparent'
                }}>
                  <td style={{ padding: '6px 12px', verticalAlign: 'top', wordBreak: 'break-word' }}>
                    {editingItem === item.id ? (
                      <>
                        <div style={{ paddingTop: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <TextField
                              size="small"
                              style={{ flex: 1 }}
                              value={editValues.waveCode || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Only allow alphanumeric characters, hyphens, and convert to uppercase
                                const alphanumericValue = value.replace(/[^a-zA-Z0-9\-]/g, '').toUpperCase();
                                if (alphanumericValue.length <= 30) {
                                  handleInputChange('waveCode', alphanumericValue);
                                }
                              }}
                              placeholder="Wave Code *"
                              variant="outlined"
                              inputProps={{ maxLength: 30 }}
                              sx={{
                                '& .MuiOutlinedInput-root': { fontSize: '14px' },
                                '& .MuiInputBase-input': { padding: '6px 10px', fontSize: '14px' },
                              }}
                            />
                            <div style={{ fontSize: '12px', color: (editValues.waveCode || '').length >= 30 ? '#ef4444' : '#6b7280', whiteSpace: 'nowrap' }}>
                              {(editValues.waveCode || '').length}/30
                              {/* {(editValues.waveCode || '').length >= 30 && 'Limit'} */}
                            </div>
                          </div>
                          {(editValues.waveCode || '').length >= 30 && (
                            <div style={{ fontSize: '12px', color: '#ef4444', whiteSpace: 'nowrap', marginTop: '4px' }}>
                              30 Limit exceeded
                            </div>
                          )}
                          {validationErrors[editingItem]?.waveCode && (
                            <div style={{ fontSize: '12px', color: '#ef4444', whiteSpace: 'nowrap', marginTop: '4px' }}>
                              Wave Code is required
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <span style={{
                        display: 'block',
                        wordWrap: 'break-word',
                        whiteSpace: 'normal',
                        fontSize: '14px',
                        lineHeight: '1.4'
                      }}>
                        {item.waveCode}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '6px 12px', verticalAlign: 'top', wordBreak: 'break-word' }}>
                    {editingItem === item.id ? (
                      <>
                        <div style={{ paddingTop: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <TextField
                              size="small"
                              style={{ flex: 1 }}
                              value={editValues.waveDescription || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value.length <= 100) {
                                  handleInputChange('waveDescription', capitalizeFirstChar(value));
                                }
                              }}
                              placeholder="Wave Description *"
                              variant="outlined"
                              inputProps={{ maxLength: 100 }}
                              sx={{
                                '& .MuiOutlinedInput-root': { fontSize: '14px' },
                                '& .MuiInputBase-input': { padding: '6px 10px', fontSize: '14px' },
                              }}
                            />
                            <div style={{ fontSize: '12px', color: (editValues.waveDescription || '').length >= 100 ? '#ef4444' : '#6b7280', whiteSpace: 'nowrap' }}>
                              {(editValues.waveDescription || '').length}/100
                              {/* {(editValues.waveDescription || '').length >= 100 && 'Limit'} */}
                            </div>
                          </div>
                          {(editValues.waveDescription || '').length >= 100 && (
                            <div style={{ fontSize: '12px', color: '#ef4444', whiteSpace: 'nowrap', marginTop: '4px' }}>
                              100 Limit exceeded
                            </div>
                          )}
                          {validationErrors[editingItem]?.waveDescription && (
                            <div style={{ fontSize: '12px', color: '#ef4444', whiteSpace: 'nowrap', marginTop: '4px' }}>
                              Wave Description is required
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <span
                        onClick={() => handleWaveDescClick(item)}
                        style={{
                          display: 'block',
                          wordWrap: 'break-word',
                          whiteSpace: 'normal',
                          fontSize: '14px',
                          lineHeight: '1.4',
                          color: '#2563eb',
                          cursor: 'pointer',
                          textDecoration: 'none'
                        }}
                        title="Click to view rollout details"
                      >
                        {item.waveDescription}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '6px 12px', verticalAlign: 'top', wordBreak: 'break-word' }}>
                    {editingItem === item.id ? (
                      <>
                        <div style={{ paddingTop: '6px' }}>
                          <div
                            ref={startDateRef}
                            onInput={(e) => {
                              if (e.target.tagName === 'INPUT') {
                                const parsed = parseManualDateRealTime(e.target.value);
                                if (parsed) validateDateBounds(parsed, 'startDate');
                              }
                            }}
                          >
                            <CustomDatePicker
                              width="100%"
                              value={editValues.startDate || ''}
                              onChange={(date) => handleInputChange('startDate', date)}
                              placeholder="DD-MMM-YYYY"
                              error={!!validationErrors[editingItem]?.startDate}
                              clearDateValidationError={() => { }}
                            />
                          </div>
                          {validationErrors[editingItem]?.startDate && (
                            <div style={{ fontSize: '12px', color: '#ef4444', whiteSpace: 'nowrap', marginTop: '4px' }}>
                              {validationErrors[editingItem]?.startDate === 'outOfBounds'
                                ? `Must be within ${formatDateForDisplay(projectDates.startDate)} - ${formatDateForDisplay(projectDates.endDate)}`
                                : validationErrors[editingItem]?.startDate === 'firstWaveStartMismatch'
                                  ? `First wave must start exactly on project start date (${formatDateForDisplay(projectDates.startDate)})`
                                  : 'Start Date is required'}
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <span style={{
                        display: 'block',
                        wordWrap: 'break-word',
                        whiteSpace: 'normal',
                        fontSize: '14px',
                        lineHeight: '1.4'
                      }}>
                        {formatDateForDisplay(item.startDate)}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '6px 12px', verticalAlign: 'top', wordBreak: 'break-word' }}>
                    {editingItem === item.id ? (
                      <>
                        <div style={{ paddingTop: '6px' }}>
                          <div
                            ref={endDateRef}
                            onInput={(e) => {
                              if (e.target.tagName === 'INPUT') {
                                const parsed = parseManualDateRealTime(e.target.value);
                                if (parsed) validateDateBounds(parsed, 'endDate');
                              }
                            }}
                          >
                            <CustomDatePicker
                              width="100%"
                              value={editValues.endDate || ''}
                              onChange={(date) => handleInputChange('endDate', date)}
                              placeholder="DD-MMM-YYYY"
                              error={!!validationErrors[editingItem]?.endDate}
                              clearDateValidationError={() => { }}
                            />
                          </div>
                          {validationErrors[editingItem]?.endDate && (
                            <div style={{ fontSize: '12px', color: '#ef4444', whiteSpace: 'nowrap', marginTop: '4px' }}>
                              {validationErrors[editingItem]?.endDate === 'outOfBounds'
                                ? `Must be within ${formatDateForDisplay(projectDates.startDate)} Ã¢â‚¬â€œ ${formatDateForDisplay(projectDates.endDate)}`
                                : 'End Date is required'}
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <span style={{
                        display: 'block',
                        wordWrap: 'break-word',
                        whiteSpace: 'normal',
                        fontSize: '14px',
                        lineHeight: '1.4'
                      }}>
                        {formatDateForDisplay(item.endDate)}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '6px 12px', verticalAlign: 'top', wordBreak: 'break-word' }}>
                    {editingItem === item.id ? (
                      <>
                        <div style={{ paddingTop: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <TextField
                              size="small"
                              style={{ flex: 1 }}
                              value={editValues.comments || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value.length <= 240) {
                                  handleInputChange('comments', capitalizeFirstChar(value));
                                }
                              }}
                              placeholder="Comments"
                              variant="outlined"
                              inputProps={{ maxLength: 240 }}
                              sx={{
                                '& .MuiOutlinedInput-root': { fontSize: '14px' },
                                '& .MuiInputBase-input': { padding: '6px 10px', fontSize: '14px' },
                              }}
                            />
                            <div style={{ fontSize: '12px', color: (editValues.comments || '').length >= 240 ? '#ef4444' : '#6b7280', whiteSpace: 'nowrap' }}>
                              {(editValues.comments || '').length}/240 {(editValues.comments || '').length >= 240}
                            </div>
                          </div>
                          {(editValues.comments || '').length >= 240 && (
                            <div style={{ fontSize: '12px', color: '#ef4444', whiteSpace: 'nowrap', marginTop: '4px' }}>
                              240 Limit exceeded
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <span style={{
                        display: 'block',
                        wordWrap: 'break-word',
                        whiteSpace: 'normal',
                        fontSize: '14px',
                        lineHeight: '1.4'
                      }}>
                        {item.comments}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '6px 4px', verticalAlign: 'middle', textAlign: 'center' }}>
                    {editingItem === null || editingItem === item.id ? (
                      <button
                        onClick={() => handleAddRolloutClick(item)}
                        disabled={item.lock_status || isRolloutDisabled}
                        style={{
                          backgroundColor: (item.lock_status || isRolloutDisabled) ? '#cbd5e1' : '#28a745',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: (item.lock_status || isRolloutDisabled) ? 'not-allowed' : 'pointer',
                          color: 'white',
                          padding: '6px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          fontWeight: '500',
                          minWidth: '80px',
                          margin: '0 auto'
                        }}
                        title={item.lock_status ? "Locked" : isRolloutDisabled ? "Wave dates must match Project Planned dates" : "Add Rollouts"}
                        onMouseEnter={(e) => { if (!item.lock_status && !isRolloutDisabled) e.currentTarget.style.backgroundColor = '#218838'; }}
                        onMouseLeave={(e) => { if (!item.lock_status && !isRolloutDisabled) e.currentTarget.style.backgroundColor = '#28a745'; }}
                      >
                        <Plus size={14} />
                        <span>Add / Edit</span>
                      </button>
                    ) : (
                      <span style={{ color: '#9ca3af', fontSize: '12px' }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: '6px 4px', verticalAlign: 'middle', textAlign: 'center' }}>
                    <div className="action-icons" style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
                      {editingItem === item.id ? (
                        !item.isSaved ? (
                          <button
                            className="action-btn delete-btn"
                            onClick={() => handleDelete(item.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : (
                          <>
                            <button
                              className="action-btn save-btn"
                              onClick={() => handleSaveEdit(item.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981', padding: '4px' }}
                              title="Save"
                            >
                              <Save size={16} />
                            </button>
                            <button
                              className="action-btn cancel-btn"
                              onClick={handleCancelEdit}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}
                              title="Cancel"
                            >
                              <X size={16} />
                            </button>
                          </>
                        )
                      ) : !item.isSaved ? (
                        <button
                          className="action-btn delete-btn"
                          onClick={() => handleDelete(item.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : (
                        <div style={{ position: 'relative' }} ref={openMenuId === item.id ? menuRef : null}>
                          <button
                            ref={openMenuId === item.id ? menuRef : null}
                            className="action-btn menu-btn"
                            onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                            disabled={item.lock_status}
                            style={{ background: 'none', border: 'none', cursor: item.lock_status ? 'not-allowed' : 'pointer', color: item.lock_status ? '#cbd5e1' : '#6b7280', padding: '4px' }}
                            title={item.lock_status ? "Locked" : "Actions"}
                          >
                            <MoreVertical size={18} />
                          </button>
                          {openMenuId === item.id && (
                            <MenuDropdown
                              item={item}
                              data={data}
                              buttonRef={menuRef}
                              onEdit={() => {
                                handleEdit(item.id);
                                setOpenMenuId(null);
                              }}
                              onDelete={() => {
                                handleDelete(item.id);
                                setOpenMenuId(null);
                              }}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="table-actions-bottom" style={{ display: 'flex', gap: '12px', marginTop: '16px', alignItems: 'center', margin: '0 16px', justifyContent: 'space-between' }}>
        <button
          className="add-btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '180px',
            opacity: (loading || (data.length > 0 && data.every(w => w.lock_status))) ? 0.5 : 1,
            cursor: (loading || (data.length > 0 && data.every(w => w.lock_status))) ? 'not-allowed' : 'pointer'
          }}
          onClick={handleAddWaveRollout}
          disabled={loading || (data.length > 0 && data.every(w => w.lock_status))}
          title={(data.length > 0 && data.every(w => w.lock_status)) ? "Locked" : ""}
        >
          {hasNewRow ? <Save size={18} /> : <Plus size={18} />}
          <span>{hasNewRow ? 'Save Wave' : 'Add Wave'}</span>
        </button>

        <div style={{ display: 'flex', gap: '12px' }}>
          {(() => {
            const allConfirmed = data.length > 0 && data.every(w => w.wave_confirm);
            const isLocked = data.length > 0 && data.every(w => w.lock_status);
            return (
              <>
                <button
                  onClick={handleOpenGanttChart}
                  disabled={!isLocked}
                  title={!isLocked ? "Wave must be locked to view Gantt Chart" : ""}
                  style={{
                    backgroundColor: !isLocked ? '#9ca3af' : '#6f42c1',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: !isLocked ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (isLocked) {
                      e.currentTarget.style.backgroundColor = '#5a32a3';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isLocked) {
                      e.currentTarget.style.backgroundColor = '#6f42c1';
                    }
                  }}
                >
                  <BarChart3 size={16} />
                  Gantt Chart
                </button>
                <button
                  onClick={handleToggleLock}
                  disabled={!allConfirmed || loading}
                  title={!allConfirmed ? "All wave rollouts must be confirmed before locking/unlocking" : ""}
                  style={{
                    backgroundColor: !allConfirmed ? '#9ca3af' : (isLocked ? '#dc3545' : '#17a2b8'),
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: !allConfirmed ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (allConfirmed && !loading) {
                      e.currentTarget.style.backgroundColor = isLocked ? '#c82333' : '#156a8a';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (allConfirmed && !loading) {
                      e.currentTarget.style.backgroundColor = isLocked ? '#dc3545' : '#17a2b8';
                    }
                  }}
                >
                  {isLocked ? <Unlock size={16} /> : <Lock size={16} />}
                  {isLocked ? 'Unlock' : 'Lock'}
                </button>
              </>
            );
          })()}
        </div>
      </div>

      {showRolloutPopup && selectedWaveForRollout && (
        <RolloutForm
          organization={selectedWaveForRollout}
          data={selectedWaveForRollout.rollouts || []}
          onClose={handleCloseRolloutPopup}
          onSave={handleRolloutSave}
          setUnsavedChangesChecker={setRolloutUnsavedChangesChecker}
          projectDates={projectDates}
        />
      )}

      <GanttChartModal
        isOpen={showGanttChart}
        onClose={() => setShowGanttChart(false)}
        projectId={selectedProject?.id || localStorage.getItem('project_id')}
        projectName={localStorage.getItem('project_name') || selectedProject?.name}
        projectDates={projectDates}
      />

      <div style={{ height: '70px' }}></div>

      {showWaveDescModal && selectedWaveForModal && (
        <div
          onClick={() => { setShowWaveDescModal(false); setSelectedWaveForModal(null); setModalRollouts([]); }}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 5000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#fff',
              borderRadius: '8px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
              minWidth: '800px',
              maxWidth: '1000px',
              width: '90%',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              transform: `translate(${modalPosition.x}px, ${modalPosition.y}px)`,
              transition: isDragging ? 'none' : 'transform 0.1s',
              position: 'relative'
            }}>
            {/* Modal Header */}
            <div style={{ padding: '24px 24px 16px 24px', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3
                  style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1f2937', flex: 1, cursor: isDragging ? 'grabbing' : 'grab', padding: '8px', borderRadius: '4px', transition: 'background-color 0.2s' }}
                  onMouseDown={handleModalMouseDown}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#eff6ff'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  Wave Rollout Details
                </h3>
                <button
                  onClick={() => {
                    setShowWaveDescModal(false);
                    setSelectedWaveForModal(null);
                    setModalRollouts([]);
                    setModalPosition({ x: 0, y: 0 }); // reset position on close
                  }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#ef4444', fontSize: '20px', lineHeight: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '4px',
                    transition: 'all 0.2s',
                    borderRadius: '4px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  title="Close"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Wave Description title */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', marginBottom: '0' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px', border: '1px solid #e5e7eb', fontWeight: '600', backgroundColor: '#f9fafb', width: '15%' }}>Wave</td>
                    <td style={{ padding: '8px', border: '1px solid #e5e7eb', width: '25%' }}>{selectedWaveForModal.waveDescription}</td>
                    <td style={{ padding: '8px', border: '1px solid #e5e7eb', fontWeight: '600', backgroundColor: '#f9fafb', width: '15%' }}>Start Date</td>
                    <td style={{ padding: '8px', border: '1px solid #e5e7eb', width: '15%' }}>{formatDateForDisplay(selectedWaveForModal.startDate)}</td>
                    <td style={{ padding: '8px', border: '1px solid #e5e7eb', fontWeight: '600', backgroundColor: '#f9fafb', width: '15%' }}>End Date</td>
                    <td style={{ padding: '8px', border: '1px solid #e5e7eb', width: '15%' }}>{formatDateForDisplay(selectedWaveForModal.endDate)}</td>
                  </tr>
                  {!modalRolloutsLoading && modalRollouts.map((r, i) => (
                    <tr key={`header-r-${i}`}>
                      <td style={{ padding: '8px', border: '1px solid #e5e7eb', fontWeight: '600', backgroundColor: '#f9fafb' }}>Rollout</td>
                      <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>
                        {r.Rollout_Description || 'â€”'}
                        {(r.SaveDraft_phase === true || String(r.SaveDraft_phase).toLowerCase() === 'true') && (
                          <span style={{
                            marginLeft: '8px',
                            backgroundColor: '#fef3c7',
                            color: '#d97706',
                            fontSize: '11px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: '600',
                            whiteSpace: 'nowrap'
                          }}>Draft</span>
                        )}
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #e5e7eb', fontWeight: '600', backgroundColor: '#f9fafb' }}>Start Date</td>
                      <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>{formatDateForDisplay(r.Rollout_Start_Date || r.Start_Date)}</td>
                      <td style={{ padding: '8px', border: '1px solid #e5e7eb', fontWeight: '600', backgroundColor: '#f9fafb' }}>End Date</td>
                      <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>{formatDateForDisplay(r.Rollout_End_Date || r.End_Date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table */}
            <div style={{ borderTop: '1px solid #e5e7eb', overflowY: 'auto', flex: 1, padding: '0 24px 24px 24px' }}>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '6px', overflow: 'hidden', marginTop: '16px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb' }}>
                      <th style={{
                        padding: '10px 14px', textAlign: 'left', fontWeight: '600',
                        color: '#374151', borderBottom: '1px solid #e5e7eb',
                        width: '20%'
                      }}>
                        Wave Description
                      </th>
                      <th style={{
                        padding: '10px 14px', textAlign: 'left', fontWeight: '600',
                        color: '#374151', borderBottom: '1px solid #e5e7eb',
                        width: '20%'
                      }}>
                        Rollout Description
                      </th>
                      <th style={{
                        padding: '10px 14px', textAlign: 'left', fontWeight: '600',
                        color: '#374151', borderBottom: '1px solid #e5e7eb',
                        width: '15%'
                      }}>
                        Phase
                      </th>
                      <th style={{
                        padding: '10px 14px', textAlign: 'left', fontWeight: '600',
                        color: '#374151', borderBottom: '1px solid #e5e7eb',
                        width: '15%'
                      }}>
                        Start Date
                      </th>
                      <th style={{
                        padding: '10px 14px', textAlign: 'left', fontWeight: '600',
                        color: '#374151', borderBottom: '1px solid #e5e7eb',
                        width: '15%'
                      }}>
                        End Date
                      </th>
                      <th style={{
                        padding: '10px 14px', textAlign: 'left', fontWeight: '600',
                        color: '#374151', borderBottom: '1px solid #e5e7eb',
                        width: '15%'
                      }}>
                        Elapsed Days
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalRolloutsLoading ? (
                      <tr>
                        <td colSpan="6" style={{ padding: '16px 14px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
                          Loading...
                        </td>
                      </tr>
                    ) : modalRollouts.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{
                          padding: '16px 14px', textAlign: 'center',
                          color: '#9ca3af', fontSize: '14px'
                        }}>
                          No rollouts added for this wave.
                        </td>
                      </tr>
                    ) : (
                      modalRollouts.flatMap((rollout, rIdx) => {
                        const phases = rollout.Phases && rollout.Phases.length > 0 ? rollout.Phases : [null];
                        return phases.map((phase, pIdx) => {
                          const isLastInRollout = pIdx === phases.length - 1;
                          const isLastOverall = rIdx === modalRollouts.length - 1 && isLastInRollout;

                          return (
                            <tr key={`${rIdx}-${pIdx}`} style={{ borderBottom: isLastOverall ? 'none' : isLastInRollout ? '2px solid #d1d5db' : '1px dashed #e5e7eb' }}>
                              {pIdx === 0 && (
                                <td rowSpan={phases.length} style={{ padding: '10px 14px', color: '#374151', verticalAlign: 'top', borderRight: '1px solid #e5e7eb' }}>
                                  {selectedWaveForModal.waveDescription}
                                </td>
                              )}
                              {pIdx === 0 && (
                                <td rowSpan={phases.length} style={{ padding: '10px 14px', color: '#374151', verticalAlign: 'top', borderRight: '1px solid #e5e7eb' }}>
                                  {rollout.Rollout_Description || 'â€”'}
                                  {(rollout.SaveDraft_phase === true || String(rollout.SaveDraft_phase).toLowerCase() === 'true') && (
                                    <span style={{
                                      marginLeft: '8px',
                                      backgroundColor: '#fef3c7',
                                      color: '#d97706',
                                      fontSize: '11px',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      fontWeight: '600',
                                      whiteSpace: 'nowrap'
                                    }}>Draft</span>
                                  )}
                                </td>
                              )}
                              <td style={{ padding: '10px 14px', color: '#374151', verticalAlign: 'top' }}>
                                {phase ? phase.Phase : 'â€”'}
                              </td>
                              <td style={{ padding: '10px 14px', color: '#374151', verticalAlign: 'top' }}>
                                {phase ? formatDateForDisplay(phase.Start_Date) : formatDateForDisplay(rollout.Rollout_Start_Date || rollout.Start_Date) || 'â€”'}
                              </td>
                              <td style={{ padding: '10px 14px', color: '#374151', verticalAlign: 'top' }}>
                                {phase ? formatDateForDisplay(phase.End_Date) : formatDateForDisplay(rollout.Rollout_End_Date || rollout.End_Date) || 'â€”'}
                              </td>
                              <td style={{ padding: '10px 14px', color: '#374151', verticalAlign: 'top' }}>
                                {phase ? (phase.Elapsed_Days !== undefined && phase.Elapsed_Days !== null && phase.Elapsed_Days !== '' ? phase.Elapsed_Days : 'â€”') : 'â€”'}
                              </td>
                            </tr>
                          );
                        });
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Standardized Loading Overlay */}
      {loading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div className="loading-spinner" style={{
            width: '50px',
            height: '50px',
            border: '5px solid #f3f3f3',
            borderTop: '5px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ marginTop: '15px', color: '#1f2937', fontWeight: '500', fontSize: '16px' }}>Loading...</p>
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

      {showLastWaveEndDateMismatch && (
        <div style={{
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
            textAlign: 'center',
            maxWidth: '420px',
            width: '90%',
            position: 'relative'
          }}>
            <button
              onClick={() => setShowLastWaveEndDateMismatch(false)}
              style={{
                position: 'absolute', top: '12px', right: '12px',
                background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444'
              }}
            >
              <X size={20} />
            </button>
            <div style={{
              width: '64px',
              height: '64px',
              backgroundColor: '#fff1f2',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <AlertCircle size={36} color="#e11d48" />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '12px', color: '#1f2937' }}>Date Validation Error</h2>
            <p style={{ color: '#4b5563', marginBottom: '28px', lineHeight: '1.6', fontSize: '15px' }}>
              The End Date of the last wave ({formatDateForDisplay(lastWaveEndDateMismatchInfo.waveEndDate)}) does not match the Project Planned End Date ({formatDateForDisplay(lastWaveEndDateMismatchInfo.projectEndDate)}). Please update the wave dates to ensure the last wave ends on the project end date.
            </p>
            <button
              onClick={() => setShowLastWaveEndDateMismatch(false)}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                width: '100%',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {showNoProjectSelectedPopup && (
        <div style={{
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 10000
        }}>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
            textAlign: 'center',
            maxWidth: '380px',
            width: '90%'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              backgroundColor: '#fff1f2',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <AlertCircle size={36} color="#e11d48" />
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '12px', color: '#1f2937' }}>No Project Selected</h2>
            <p style={{ color: '#4b5563', marginBottom: '28px', lineHeight: '1.6', fontSize: '15px' }}>
              Please select a project from the <strong>Project Definition Form</strong> before accessing this page.
            </p>
            <button
              onClick={() => navigate('/dashboard/project-definition-form')}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                width: '100%',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
            >
              Go to Project Definition
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .help-modal-scroll::-webkit-scrollbar { width: 4px; }
        .help-modal-scroll::-webkit-scrollbar-track { background: transparent; margin: 8px 0; }
        .help-modal-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .help-modal-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
};

export default WaveRolloutDefinition;
