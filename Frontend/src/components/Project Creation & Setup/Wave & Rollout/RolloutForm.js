import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Plus, Edit, Trash2, Save, X, AlertCircle, MoreVertical, HelpCircle, GripVertical } from 'lucide-react';
import { TextField } from '@mui/material';
import DOMPurify from 'dompurify';
import { CustomDatePicker } from '../../Resource Roster Form/Components';
import { getIdToken } from '../../../utils/cognito-auth';
import { useSession } from '../../../context/SessionContext';
import DefinePhaseModal from './DefinePhaseModal';

const RolloutForm = ({
  organization: wave,
  onClose,
  data: initialRollouts = [],
  onSave,
  setUnsavedChangesChecker,
  projectDates
}) => {
  const { handleAuthError } = useSession();
  const [data, setData] = useState(Array.isArray(initialRollouts) ? initialRollouts : []);
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [editValues, setEditValues] = useState({});
  const editValuesRef = useRef(editValues);
  useEffect(() => {
    editValuesRef.current = editValues;
  }, [editValues]);
  const [hasNewRow, setHasNewRow] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // State for Rollout Description read-only modal
  const [showRolloutDescModal, setShowRolloutDescModal] = useState(false);
  const [selectedRolloutForModal, setSelectedRolloutForModal] = useState(null);

  // Hack to bump the CustomDatePicker portal zIndex because we cannot modify Components.js
  // The calendar portal is hardcoded to z-index: 999, but this modal wrapper is 10000.
  useEffect(() => {
    const interval = setInterval(() => {
      const portals = document.body.children;
      for (let i = 0; i < portals.length; i++) {
        const el = portals[i];
        if (el.style && (el.style.zIndex === '999' || el.style.zIndex === 999)) {
          el.style.zIndex = '12000';
        }
      }
    }, 50);
    return () => clearInterval(interval);
  }, []);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);
  const [isPhaseModalOpen, setIsPhaseModalOpen] = useState(false);
  const [selectedRolloutForPhase, setSelectedRolloutForPhase] = useState(null);
  const [showLastRolloutEndDateMismatch, setShowLastRolloutEndDateMismatch] = useState(false);
  const [lastRolloutEndDateMismatchInfo, setLastRolloutEndDateMismatchInfo] = useState({ rolloutEndDate: null, waveEndDate: null });
  const [dateValidationModalPosition, setDateValidationModalPosition] = useState({ x: 0, y: 0 });
  const [isDraggingDateValidationModal, setIsDraggingDateValidationModal] = useState(false);
  const [dragOffsetDateValidation, setDragOffsetDateValidation] = useState({ x: 0, y: 0 });

  // Wave date range — using field names from WaveRolloutDefinition mapped data
  const waveStartDate = wave?.startDate;
  const waveEndDate = wave?.endDate;

  // Date Validation Modal drag handlers
  const handleDateValidationMouseDown = (e) => {
    if (e.target.tagName === 'BUTTON') return;
    setIsDraggingDateValidationModal(true);
    setDragOffsetDateValidation({
      x: e.clientX - dateValidationModalPosition.x,
      y: e.clientY - dateValidationModalPosition.y
    });
  };

  useEffect(() => {
    if (!isDraggingDateValidationModal) return;
    const handleMouseMove = (e) => {
      setDateValidationModalPosition({
        x: e.clientX - dragOffsetDateValidation.x,
        y: e.clientY - dragOffsetDateValidation.y
      });
    };
    const handleMouseUp = () => {
      setIsDraggingDateValidationModal(false);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingDateValidationModal, dragOffsetDateValidation]);

  // Auto-hide error message after 3 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Load rollout data on mount
  useEffect(() => {
    loadRolloutData();
  }, [wave?.id]);

  const loadRolloutData = async () => {
    setLoading(true);
    try {
      const projectId = localStorage.getItem('project_id');
      let idToken;
      try {
        idToken = await getIdToken();
      } catch (tokenError) {
        handleAuthError(tokenError.message);
        return;
      }

      const response = await fetch(`https://pewqu3v5b3.execute-api.ap-south-1.amazonaws.com/New/rice/get/rolloutDefinitions?project_id=${projectId}&wave_code=${wave.waveCode}`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        return;
      }

      if (!response.ok) throw new Error('Failed to fetch rollouts');

      const result = await response.json();
      const allRollouts = result.data || [];

      const filteredRollouts = allRollouts
        .filter(r => r.waveRolloutId === wave.id.toString())
        .map(r => ({
          id: DOMPurify.sanitize(String(r.rice_Rollout_Definition_id || '').trim(), { ALLOWED_TAGS: [] }),
          rolloutCode: DOMPurify.sanitize(String(r.Rollout_Code || r.Rollout_Name || '').trim(), { ALLOWED_TAGS: [] }),
          rolloutDescription: DOMPurify.sanitize(String(r.Rollout_Description || '').trim(), { ALLOWED_TAGS: [] }),
          startDate: DOMPurify.sanitize(String(r.Rollout_Start_Date || r.Start_Date || '').trim(), { ALLOWED_TAGS: [] }),
          endDate: DOMPurify.sanitize(String(r.Rollout_End_Date || r.End_Date || '').trim(), { ALLOWED_TAGS: [] }),
          goLiveDate: DOMPurify.sanitize(String(r["Rollout_Go-Live-Date"] || '').trim(), { ALLOWED_TAGS: [] }),
          comments: DOMPurify.sanitize(String(r.Rollout_Comment || r.Rollout_Comments || '').trim(), { ALLOWED_TAGS: [] }),
          Phases: r.Phases || [],
          Working_days_mode: r.Working_days_mode,
          SaveDraft_phase: r.SaveDraft_phase,
          confirm: r.confirm,
          isSaved: true
        }))
        .sort((a, b) => {
          const codeA = a.rolloutCode || '';
          const codeB = b.rolloutCode || '';
          return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
        });

      setData(Array.isArray(filteredRollouts) ? filteredRollouts : []);
    } catch (error) {
      console.error('Error loading rollouts:', error);
      setErrorMessage('Failed to load rollouts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (setUnsavedChangesChecker) {
      setUnsavedChangesChecker(() => () => {
        return hasNewRow || editingItem !== null;
      });
    }
  }, [hasNewRow, editingItem, setUnsavedChangesChecker]);

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

  const handleAddRow = () => {
    if (editingItem !== null) {
      showConfirmation(
        "You have unsaved changes. Do you want to discard them and add a new row?",
        () => {
          if (hasNewRow) {
            setData(data.filter(item => item.id !== editingItem));
            setHasNewRow(false);
          }
          setEditingItem(null);
          setEditValues({});
          setValidationErrors({});
          const newId = `NEW_${Date.now()}`;
          const newRow = {
            id: newId,
            rolloutCode: '',
            rolloutDescription: '',
            startDate: '',
            endDate: '',
            goLiveDate: '',
            comments: '',
            isSaved: false
          };
          setData(prev => [...prev.filter(d => d.isSaved || d.id === newId), newRow]);
          setEditingItem(newId);
          setEditValues(newRow);
          setHasNewRow(true);
        }
      );
      return;
    }

    const newId = `NEW_${Date.now()}`;
    const newRow = {
      id: newId,
      rolloutCode: '',
      rolloutDescription: '',
      startDate: '',
      endDate: '',
      goLiveDate: '',
      comments: '',
      isSaved: false
    };

    setData([...data, newRow]);
    setEditingItem(newId);
    setEditValues(newRow);
    setHasNewRow(true);
  };

  const handleEdit = (id) => {
    if (editingItem !== null) {
      if (editingItem === id) return;
      showConfirmation(
        "You have unsaved changes. Do you want to discard them and edit another record?",
        () => {
          if (hasNewRow) {
            setData(data.filter(row => row.isSaved));
            setHasNewRow(false);
          }
          setValidationErrors({});
          const itemToEdit = data.find(item => item.id === id);
          setEditingItem(id);
          setEditValues({ ...itemToEdit });
        }
      );
      return;
    }
    const itemToEdit = data.find(item => item.id === id);
    setEditingItem(id);
    setEditValues({ ...itemToEdit });
  };

  const handleDelete = async (id) => {
    const item = data.find(d => d.id === id);
    if (!item.isSaved) {
      setData(data.filter(d => d.id !== id));
      setEditingItem(null);
      setEditValues({});
      setHasNewRow(false);
      setValidationErrors(prev => {
        const newErrs = { ...prev };
        delete newErrs[id];
        return newErrs;
      });
    } else {
      showConfirmation(
        "Are you sure you want to delete this Rollout? This action cannot be undone.",
        async () => {
          try {
            let idToken;
            try {
              idToken = await getIdToken();
            } catch (tokenError) {
              handleAuthError(tokenError.message);
              return;
            }

            const projectId = localStorage.getItem('project_id');
            const sanitizedId = DOMPurify.sanitize(String(id || '').trim(), { ALLOWED_TAGS: [] });
            const sanitizedProjectId = DOMPurify.sanitize(String(projectId || '').trim(), { ALLOWED_TAGS: [] });

            const response = await fetch(`https://pewqu3v5b3.execute-api.ap-south-1.amazonaws.com/New/rice/delete/rolloutDefinitions?rice_Rollout_Definition_id=${sanitizedId}&project_id=${sanitizedProjectId}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${idToken}`
              }
            });

            if (response.status === 401 || response.status === 403) {
              handleAuthError('Unauthorized - session expired');
              return;
            }

            if (!response.ok) {
              const errorData = await response.json().catch(() => null);
              throw new Error((errorData && errorData.error) || 'Failed to delete rollout');
            }

            const updatedData = data.filter(d => d.id !== id);
            setData(updatedData);
            if (editingItem === id) {
              setEditingItem(null);
              setEditValues({});
            }
            if (onSave) {
              onSave(wave.id, updatedData);
            }
          } catch (error) {
            console.error('Error deleting rollout:', error);
            setErrorMessage(error.message || 'Failed to delete rollout');
          }
        }
      );
    }
  };

  const handleCancelEdit = () => {
    if (hasNewRow) {
      setData(data.filter(item => item.id !== editingItem));
      setHasNewRow(false);
    }
    setEditingItem(null);
    setEditValues({});
    setValidationErrors({});
  };

  const handleInputChange = (field, value) => {
    setEditValues(prev => ({ ...prev, [field]: value }));
    if (editValuesRef) editValuesRef.current = { ...editValuesRef.current, [field]: value };

    if (validationErrors[editingItem]?.[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        if (newErrors[editingItem]) {
          newErrors[editingItem] = { ...newErrors[editingItem] };
          delete newErrors[editingItem][field];
          if (Object.keys(newErrors[editingItem]).length === 0) {
            delete newErrors[editingItem];
          }
        }
        return newErrors;
      });
    }
  };

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
    if (!dateStr || !editingItem) return;
    const dateToValidate = new Date(dateStr);
    
    let errorType = null;
    const isFirstRollout = data.length === 0 || (data.length > 0 && data[0].id === editingItem);
    
    if (field === 'startDate' && isFirstRollout && waveStartDate && dateToValidate.getTime() !== new Date(waveStartDate).getTime()) {
      errorType = 'firstRolloutStartMismatch';
    } else if (waveStartDate && dateToValidate < new Date(waveStartDate)) {
      errorType = 'beforeWave';
    } else if (waveEndDate && dateToValidate > new Date(waveEndDate)) {
      errorType = 'afterWave';
    }
    // For goLiveDate: must be >= rollout startDate AND <= rollout endDate
    if (field === 'goLiveDate') {
      const rolloutStart = editValues.startDate ? new Date(editValues.startDate) : null;
      const rolloutEnd = editValues.endDate ? new Date(editValues.endDate) : null;
      if (rolloutStart && dateToValidate < rolloutStart) {
        errorType = 'goLiveBeforeRolloutStart';
      } else if (rolloutEnd && dateToValidate > rolloutEnd) {
        errorType = 'goLiveAfterRolloutEnd';
      } else {
        errorType = null; // valid — clear any prior error
      }
    }
    
    setValidationErrors(prev => {
      const newErrors = { ...(prev[editingItem] || {}) };
      const errorKey = field === 'goLiveDate' ? 'goLiveDate' : field;
      const currentError = newErrors[errorKey];

      if (errorType && currentError !== errorType) {
        newErrors[errorKey] = errorType;
        return { ...prev, [editingItem]: newErrors };
      } else if (!errorType && currentError) {
        delete newErrors[errorKey];
        if (Object.keys(newErrors).length === 0) {
          const newState = { ...prev };
          delete newState[editingItem];
          return newState;
        }
        return { ...prev, [editingItem]: newErrors };
      }
      return prev;
    });
  };

  // Validate when editValues change (e.g. from calendar picker clicks)
  useEffect(() => {
    if (!editingItem || !waveStartDate || !waveEndDate) return;
    if (editValues.startDate) validateDateBounds(editValues.startDate, 'startDate');
    if (editValues.endDate) validateDateBounds(editValues.endDate, 'endDate');
    if (editValues.goLiveDate) validateDateBounds(editValues.goLiveDate, 'goLiveDate');
    // Cross-field: startDate must not exceed endDate
    if (editValues.startDate && editValues.endDate) {
      if (new Date(editValues.startDate) > new Date(editValues.endDate)) {
        setValidationErrors(prev => ({
          ...prev,
          [editingItem]: { ...(prev[editingItem] || {}), startDate: 'afterEnd', endDate: 'beforeStart' }
        }));
      }
    }
    // Cross-field: re-validate goLiveDate when rollout start/end change
    if (editValues.goLiveDate) validateDateBounds(editValues.goLiveDate, 'goLiveDate');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editValues.startDate, editValues.endDate, editValues.goLiveDate, editingItem, waveStartDate, waveEndDate]);

  const handleSave = async () => {
    // Wait for CustomDatePicker's onBlur timeout (200ms) and state update to settle
    await new Promise(resolve => setTimeout(resolve, 300));
    const currentEditValues = editValuesRef.current;
    const errors = {};

    // Required field validation
    if (!currentEditValues.rolloutCode || currentEditValues.rolloutCode.trim() === '') {
      errors.rolloutCode = 'required';
    } else if (currentEditValues.rolloutCode.length > 30) {
      errors.rolloutCode = 'maxLength';
    } else {
      const isDuplicate = data.some(
        (item) => item.id !== editingItem && (item.rolloutCode || '').trim().toLowerCase() === currentEditValues.rolloutCode.trim().toLowerCase()
      );
      if (isDuplicate) {
        errors.rolloutCode = 'duplicate';
        errors.duplicateMsg = 'Rollout code already exists in this wave.';
      }
    }

    if (!currentEditValues.rolloutDescription || currentEditValues.rolloutDescription.trim() === '') errors.rolloutDescription = 'required';
    else if (currentEditValues.rolloutDescription.length > 140) errors.rolloutDescription = 'maxLength';

    if (currentEditValues.comments && currentEditValues.comments.length > 240) errors.comments = 'maxLength';

    if (!currentEditValues.startDate) errors.startDate = 'required';
    if (!currentEditValues.endDate) errors.endDate = 'required';
    if (!currentEditValues.goLiveDate) errors.goLiveDate = 'required';

    // Date order check
    if (currentEditValues.startDate && currentEditValues.endDate) {
      if (new Date(currentEditValues.startDate) > new Date(currentEditValues.endDate)) {
        errors.dateOrder = true;
      }
    }

    // Go-Live Date: must be >= rollout startDate AND <= rollout endDate
    if (currentEditValues.goLiveDate && errors.goLiveDate !== 'required') {
      const goLive = new Date(currentEditValues.goLiveDate);
      if (currentEditValues.startDate && goLive < new Date(currentEditValues.startDate)) {
        errors.goLiveDate = 'goLiveBeforeRolloutStart';
      } else if (currentEditValues.endDate && goLive > new Date(currentEditValues.endDate)) {
        errors.goLiveDate = 'goLiveAfterRolloutEnd';
      }
    }

    // Wave date range check — rollout dates must fall within wave's startDate and endDate
    const isFirstRollout = data.length === 0 || (data.length > 0 && data[0].id === editingItem);

    if (currentEditValues.startDate && waveStartDate) {
      const rStartDate = new Date(currentEditValues.startDate);
      const wStartDate = new Date(waveStartDate);
      if (isFirstRollout && rStartDate.getTime() !== wStartDate.getTime()) {
        errors.startDate = 'firstRolloutStartMismatch';
      } else if (rStartDate < wStartDate) {
        errors.startDate = 'beforeWave';
      }
    }
    if (currentEditValues.startDate && waveEndDate) {
      if (new Date(currentEditValues.startDate) > new Date(waveEndDate)) {
        errors.startDate = 'afterWave';
      }
    }
    if (currentEditValues.endDate && waveEndDate) {
      if (new Date(currentEditValues.endDate) > new Date(waveEndDate)) {
        errors.endDate = 'afterWave';
      }
    }
    if (currentEditValues.endDate && waveStartDate) {
      if (new Date(currentEditValues.endDate) < new Date(waveStartDate)) {
        errors.endDate = 'beforeWave';
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors({ [editingItem]: errors });
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      let idToken;
      try {
        idToken = await getIdToken();
      } catch (tokenError) {
        handleAuthError(tokenError.message);
        return;
      }

      const projectId = localStorage.getItem('project_id');
      const userId = localStorage.getItem('user_id') || "1";

      const isNew = hasNewRow;

      const recordToSave = {
        Rollout_Code: DOMPurify.sanitize(String(editValues.rolloutCode || '').trim(), { ALLOWED_TAGS: [] }),
        Rollout_Description: DOMPurify.sanitize(String(editValues.rolloutDescription || '').trim(), { ALLOWED_TAGS: [] }),
        Rollout_Start_Date: DOMPurify.sanitize(String(editValues.startDate || '').trim(), { ALLOWED_TAGS: [] }),
        Rollout_End_Date: DOMPurify.sanitize(String(editValues.endDate || '').trim(), { ALLOWED_TAGS: [] }),
        "Rollout_Go-Live-Date": DOMPurify.sanitize(String(editValues.goLiveDate || '').trim(), { ALLOWED_TAGS: [] }),
        Rollout_Comment: DOMPurify.sanitize(String(editValues.comments || '').trim(), { ALLOWED_TAGS: [] }),
        project_id: DOMPurify.sanitize(String(projectId || '').trim(), { ALLOWED_TAGS: [] }),
        user_id: DOMPurify.sanitize(String(userId || '').trim(), { ALLOWED_TAGS: [] }),
        waveRolloutId: DOMPurify.sanitize(String(wave.id || '').trim(), { ALLOWED_TAGS: [] }),
        Wave_Code: DOMPurify.sanitize(String(wave.waveCode || '').trim(), { ALLOWED_TAGS: [] })
      };

      let newId = editingItem;

      if (isNew) {
        const response = await fetch('https://pewqu3v5b3.execute-api.ap-south-1.amazonaws.com/New/rice/save/rolloutDefinitions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
          body: JSON.stringify([recordToSave])
        });

        if (response.status === 401 || response.status === 403) {
          handleAuthError('Unauthorized - session expired');
          return;
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error((errorData && errorData.error) || 'Failed to save rollout');
        }

        const resData = await response.json();
        newId = resData.rice_Rollout_Definition_ids[0];
      } else {
        recordToSave.rice_Rollout_Definition_id = DOMPurify.sanitize(String(editingItem || '').trim(), { ALLOWED_TAGS: [] });
        recordToSave.updated_by = DOMPurify.sanitize(String(userId || '').trim(), { ALLOWED_TAGS: [] });

        const response = await fetch('https://pewqu3v5b3.execute-api.ap-south-1.amazonaws.com/New/rice/update/rolloutDefinitions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
          body: JSON.stringify(recordToSave)
        });

        if (response.status === 401 || response.status === 403) {
          handleAuthError('Unauthorized - session expired');
          return;
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error((errorData && errorData.error) || 'Failed to update rollout');
        }
      }

      const updatedData = data.map(item =>
        item.id === editingItem ? { ...editValues, id: newId, isSaved: true } : item
      );

      setData(updatedData);
      setEditingItem(null);
      setEditValues({});
      setHasNewRow(false);
      setValidationErrors({});

      if (onSave) {
        onSave(wave.id, updatedData);
      }

      // Check if the saved rollout is the last one and its End Date doesn't match the Wave End Date
      if (waveEndDate) {
        const savedRollouts = updatedData.filter(r => r.isSaved).sort((a, b) => Number(a.id) - Number(b.id));
        const lastRollout = savedRollouts[savedRollouts.length - 1];
        if (lastRollout && lastRollout.id === (newId || editingItem)) {
          const rolloutEnd = new Date(currentEditValues.endDate);
          const wEnd = new Date(waveEndDate);
          rolloutEnd.setHours(0, 0, 0, 0);
          wEnd.setHours(0, 0, 0, 0);
          if (rolloutEnd.getTime() !== wEnd.getTime()) {
            setLastRolloutEndDateMismatchInfo({ rolloutEndDate: currentEditValues.endDate, waveEndDate });
            setShowLastRolloutEndDateMismatch(true);
          }
        }
      }
    } catch (error) {
      console.error('Error saving rollout:', error);
      const msg = error.message || 'Failed to save rollout. Please try again.';

      if (msg.toLowerCase().includes('rollout code') && msg.toLowerCase().includes('already exists')) {
        setValidationErrors(prev => ({
          ...prev,
          [editingItem]: {
            ...prev[editingItem],
            rolloutCode: 'duplicate',
            duplicateMsg: msg
          }
        }));
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Helper: get start date error message
  const getStartDateError = (itemId) => {
    const err = validationErrors[itemId]?.startDate;
    if (!err) return null;
    if (err === 'firstRolloutStartMismatch') return `First rollout must match wave start (${formatDateForDisplay(waveStartDate)})`;
    if (err === 'beforeWave') return `Must be on or after wave start (${formatDateForDisplay(waveStartDate)})`;
    if (err === 'afterWave') return `Must be on or before wave end (${formatDateForDisplay(waveEndDate)})`;
    return 'Required';
  };

  // Helper: get end date error message
  const getEndDateError = (itemId) => {
    const err = validationErrors[itemId]?.endDate;
    const orderErr = validationErrors[itemId]?.dateOrder;
    if (!err && !orderErr) return null;
    if (err === 'afterWave') return `Must be on or before wave end (${formatDateForDisplay(waveEndDate)})`;
    if (err === 'beforeWave') return `Must be on or after wave start (${formatDateForDisplay(waveStartDate)})`;
    if (orderErr) return 'Must be after Start Date';
    return 'Required';
  };

  // Helper: get go-live date error message
  const getGoLiveDateError = (itemId) => {
    const err = validationErrors[itemId]?.goLiveDate;
    if (!err) return null;
    if (err === 'required') return 'Required';
    if (err === 'goLiveBeforeRolloutStart') {
      const startDisplay = editingItem === itemId
        ? formatDateForDisplay(editValues.startDate)
        : formatDateForDisplay(data.find(d => d.id === itemId)?.startDate);
      return `Must be on or after rollout start (${startDisplay})`;
    }
    if (err === 'goLiveAfterRolloutEnd') {
      const endDisplay = editingItem === itemId
        ? formatDateForDisplay(editValues.endDate)
        : formatDateForDisplay(data.find(d => d.id === itemId)?.endDate);
      return `Must be on or before rollout end (${endDisplay})`;
    }
    return 'Invalid Go-Live Date';
  };

  // Per-rollout: only disable Define Phase for the last rollout if its End Date != Wave End Date
  const isPhaseDisabledForRollout = (item) => {
    const savedRollouts = data.filter(r => r.isSaved);
    if (savedRollouts.length === 0) return true;
    if (!waveStartDate || !waveEndDate) return true;

    const sortedRollouts = [...savedRollouts].sort((a, b) => Number(a.id) - Number(b.id));
    const lastRollout = sortedRollouts[sortedRollouts.length - 1];

    // Only gray out Define Phase for the last rollout when its end date != wave end date
    if (item.id === lastRollout.id) {
      const rEnd = new Date(lastRollout.endDate);
      const wEnd = new Date(waveEndDate);
      rEnd.setHours(0, 0, 0, 0);
      wEnd.setHours(0, 0, 0, 0);
      if (rEnd.getTime() !== wEnd.getTime()) return true;
    }

    // For the first rollout (when only 1), also check start date matches
    if (sortedRollouts.length === 1 && item.id === sortedRollouts[0].id) {
      const rStart = new Date(sortedRollouts[0].startDate);
      const wStart = new Date(waveStartDate);
      rStart.setHours(0, 0, 0, 0);
      wStart.setHours(0, 0, 0, 0);
      if (rStart.getTime() !== wStart.getTime()) return true;
    }

    return false;
  };

  // Keep old isPhaseDisabled for the Add Rollout button (global check)
  const isPhaseDisabled = (() => {
    const savedRollouts = data.filter(r => r.isSaved);
    if (savedRollouts.length === 0) return true;
    if (!waveStartDate || !waveEndDate) return true;

    const wStart = new Date(waveStartDate);
    const wEnd = new Date(waveEndDate);
    wStart.setHours(0, 0, 0, 0);
    wEnd.setHours(0, 0, 0, 0);

    const sortedRollouts = [...savedRollouts].sort((a, b) => Number(a.id) - Number(b.id));

    if (sortedRollouts.length === 1) {
      const rollout = sortedRollouts[0];
      const rStart = new Date(rollout.startDate);
      const rEnd = new Date(rollout.endDate);
      rStart.setHours(0, 0, 0, 0);
      rEnd.setHours(0, 0, 0, 0);
      return !(rStart.getTime() === wStart.getTime() && rEnd.getTime() === wEnd.getTime());
    } else {
      const firstRollout = sortedRollouts[0];
      const lastRollout = sortedRollouts[sortedRollouts.length - 1];
      const rStart = new Date(firstRollout.startDate);
      const rEnd = new Date(lastRollout.endDate);
      rStart.setHours(0, 0, 0, 0);
      rEnd.setHours(0, 0, 0, 0);
      return !(rStart.getTime() === wStart.getTime() && rEnd.getTime() === wEnd.getTime());
    }
  })();

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10000
    }}>
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: 'white', width: '90%', maxWidth: '1200px',
        borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        display: 'flex', flexDirection: 'column', maxHeight: '90vh'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid #e5e7eb',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', color: '#111827' }}>
              Rollout Definitions
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
            <button onClick={onClose} style={{
              background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px',
              transition: 'all 0.2s', borderRadius: '4px'
            }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          
          {/* Header Info Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', marginBottom: '24px' }}>
            <tbody>
              <tr>
                <td style={{ padding: '8px', border: '1px solid #e5e7eb', fontWeight: '600', backgroundColor: '#f9fafb' }}>Project</td>
                <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>{localStorage.getItem('project_name') || 'Current Project'}</td>
                <td style={{ padding: '8px', border: '1px solid #e5e7eb', fontWeight: '600', backgroundColor: '#f9fafb' }}>Start Date</td>
                <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>{formatDateForDisplay(projectDates?.startDate)}</td>
                <td style={{ padding: '8px', border: '1px solid #e5e7eb', fontWeight: '600', backgroundColor: '#f9fafb' }}>End Date</td>
                <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>{formatDateForDisplay(projectDates?.endDate)}</td>
                <td style={{ border: 'none', padding: '8px' }}></td>
              </tr>
              <tr>
                <td style={{ padding: '8px', border: '1px solid #e5e7eb', fontWeight: '600', backgroundColor: '#f9fafb' }}>Wave</td>
                <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>{wave?.waveDescription || wave?.waveCode || 'N/A'}</td>
                <td style={{ padding: '8px', border: '1px solid #e5e7eb', fontWeight: '600', backgroundColor: '#f9fafb' }}>Start Date</td>
                <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>{formatDateForDisplay(waveStartDate)}</td>
                <td style={{ padding: '8px', border: '1px solid #e5e7eb', fontWeight: '600', backgroundColor: '#f9fafb' }}>End Date</td>
                <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>{formatDateForDisplay(waveEndDate)}</td>
                <td style={{ border: 'none', padding: '8px' }}></td>
              </tr>
            </tbody>
          </table>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>Loading rollouts...</div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '4px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <tr>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151', width: '15%' }}>Rollout Code</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151', width: '25%' }}>Rollout Description</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151', width: '15%' }}>Start Date</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151', width: '15%' }}>End Date</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151', width: '15%' }}>Rollout Go-Live Date</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151', width: '20%' }}>Define Phase</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151', width: '10%' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
                        No rollouts defined. Click "Add Rollout" to create one.
                      </td>
                    </tr>
                  ) : (
                    data.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>

                        {/* Rollout Code */}
                        <td style={{ padding: '6px 12px', verticalAlign: 'top', textAlign: 'center' }}>
                          {editingItem === item.id ? (
                            <div>
                              <TextField
                                size="small"
                                fullWidth
                                value={editValues.rolloutCode || ''}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^a-zA-Z0-9\-\s]/g, '').toUpperCase();
                                  handleInputChange('rolloutCode', val);
                                }}
                                placeholder="Rollout Code *"
                                inputProps={{ maxLength: 30 }}
                                error={!!validationErrors[item.id]?.rolloutCode || (editValues.rolloutCode && editValues.rolloutCode.length >= 30)}
                                sx={{ '& .MuiInputBase-input': { padding: '6px 10px', fontSize: '13px' } }}
                              />
                              {validationErrors[item.id]?.rolloutCode && (
                                <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', textAlign: 'left' }}>
                                  {validationErrors[item.id]?.rolloutCode === 'duplicate'
                                    ? validationErrors[item.id]?.duplicateMsg
                                    : validationErrors[item.id]?.rolloutCode === 'required'
                                      ? 'Required'
                                      : 'Max 30 characters'}
                                </div>
                              )}
                              {!validationErrors[item.id]?.rolloutCode && editValues.rolloutCode && editValues.rolloutCode.length >= 30 && (
                                <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', textAlign: 'left' }}>
                                  Max 30 characters
                                </div>
                              )}
                            </div>
                          ) : (
                            <span>{item.rolloutCode}</span>
                          )}
                        </td>

                        {/* Rollout Description */}
                        <td style={{ padding: '6px 12px', verticalAlign: 'top', textAlign: 'center' }}>
                          {editingItem === item.id ? (
                            <div>
                              <TextField
                                size="small"
                                fullWidth
                                value={editValues.rolloutDescription || ''}
                                onChange={(e) => handleInputChange('rolloutDescription', capitalizeFirstChar(e.target.value))}
                                placeholder="Rollout Description *"
                                inputProps={{ maxLength: 140 }}
                                error={!!validationErrors[item.id]?.rolloutDescription || (editValues.rolloutDescription && editValues.rolloutDescription.length >= 140)}
                                sx={{ '& .MuiInputBase-input': { padding: '6px 10px', fontSize: '13px' } }}
                              />
                              {validationErrors[item.id]?.rolloutDescription && (
                                <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', textAlign: 'left' }}>
                                  {validationErrors[item.id]?.rolloutDescription === 'required' ? 'Required' : 'Max 140 characters'}
                                </div>
                              )}
                              {!validationErrors[item.id]?.rolloutDescription && editValues.rolloutDescription && editValues.rolloutDescription.length >= 140 && (
                                <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', textAlign: 'left' }}>
                                  Max 140 characters
                                </div>
                              )}
                            </div>
                          ) : (
                            <span
                              onClick={() => {
                                setSelectedRolloutForModal(item);
                                setShowRolloutDescModal(true);
                              }}
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
                              {item.rolloutDescription}
                            </span>
                          )}
                        </td>

                        {/* Start Date */}
                        <td style={{ padding: '6px 12px', verticalAlign: 'top', textAlign: 'center' }}>
                          {editingItem === item.id ? (
                            <div 
                              onInput={(e) => {
                                if (e.target.tagName === 'INPUT') {
                                  const parsed = parseManualDateRealTime(e.target.value);
                                  if (parsed) {
                                    validateDateBounds(parsed, 'startDate');
                                    handleInputChange('startDate', parsed);
                                  }
                                }
                              }}
                            >
                              <CustomDatePicker
                                width="100%"
                                value={editValues.startDate || ''}
                                onChange={(date) => handleInputChange('startDate', date)}
                                placeholder="DD-MMM-YYYY"
                                error={!!validationErrors[item.id]?.startDate}
                                clearDateValidationError={() => {}}
                              />
                              {getStartDateError(item.id) && (
                                <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', textAlign: 'left' }}>
                                  {getStartDateError(item.id)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span>{formatDateForDisplay(item.startDate)}</span>
                          )}
                        </td>

                        {/* End Date */}
                        <td style={{ padding: '6px 12px', verticalAlign: 'top', textAlign: 'center' }}>
                          {editingItem === item.id ? (
                            <div 
                              onInput={(e) => {
                                if (e.target.tagName === 'INPUT') {
                                  const parsed = parseManualDateRealTime(e.target.value);
                                  if (parsed) {
                                    validateDateBounds(parsed, 'endDate');
                                    handleInputChange('endDate', parsed);
                                  }
                                }
                              }}
                            >
                              <CustomDatePicker
                                width="100%"
                                value={editValues.endDate || ''}
                                onChange={(date) => handleInputChange('endDate', date)}
                                placeholder="DD-MMM-YYYY"
                                error={
                                  !!validationErrors[item.id]?.endDate ||
                                  !!validationErrors[item.id]?.dateOrder
                                }
                                clearDateValidationError={() => {}}
                              />
                              {getEndDateError(item.id) && (
                                <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', textAlign: 'left' }}>
                                  {getEndDateError(item.id)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span>{formatDateForDisplay(item.endDate)}</span>
                          )}
                        </td>

                        {/* Rollout Go-Live Date */}
                        <td style={{ padding: '6px 12px', verticalAlign: 'top', textAlign: 'center' }}>
                          {editingItem === item.id ? (
                            <div
                              onInput={(e) => {
                                if (e.target.tagName === 'INPUT') {
                                  const parsed = parseManualDateRealTime(e.target.value);
                                  if (parsed) {
                                    validateDateBounds(parsed, 'goLiveDate');
                                    handleInputChange('goLiveDate', parsed);
                                  }
                                }
                              }}
                            >
                              <CustomDatePicker
                                width="100%"
                                value={editValues.goLiveDate || ''}
                                onChange={(date) => handleInputChange('goLiveDate', date)}
                                placeholder="DD-MMM-YYYY"
                                error={!!validationErrors[item.id]?.goLiveDate}
                                clearDateValidationError={() => {}}
                              />
                              {getGoLiveDateError(item.id) && (
                                <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', textAlign: 'left' }}>
                                  {getGoLiveDateError(item.id)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span>{formatDateForDisplay(item.goLiveDate)}</span>
                          )}
                        </td>

                        {/* Define Phase */}
                        <td style={{ padding: '6px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                          {(() => {
                            const phaseDisabled = wave?.lock_status || isPhaseDisabledForRollout(item);
                            const isLastRollout = (() => {
                              const saved = data.filter(r => r.isSaved).sort((a, b) => Number(a.id) - Number(b.id));
                              return saved.length > 0 && saved[saved.length - 1].id === item.id;
                            })();
                            const endMismatch = isLastRollout && waveEndDate && item.endDate &&
                              new Date(item.endDate).setHours(0,0,0,0) !== new Date(waveEndDate).setHours(0,0,0,0);
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedRolloutForPhase(item);
                                  setIsPhaseModalOpen(true);
                                }}
                                disabled={phaseDisabled}
                                style={{
                                  backgroundColor: phaseDisabled ? '#cbd5e1' : '#28a745',
                                  color: 'white',
                                  border: 'none',
                                  padding: '6px 16px',
                                  borderRadius: '4px',
                                  cursor: phaseDisabled ? 'not-allowed' : 'pointer',
                                  fontSize: '13px',
                                  fontWeight: '500',
                                  transition: 'background-color 0.2s',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px',
                                  margin: '0 auto'
                                }}
                                title={
                                  wave?.lock_status ? 'Locked' :
                                  endMismatch ? `Last rollout end date must match wave end (${formatDateForDisplay(waveEndDate)})` :
                                  phaseDisabled ? 'Rollout dates must match Wave dates' :
                                  'Define Phase'
                                }
                                onMouseEnter={(e) => { if (!phaseDisabled) e.currentTarget.style.backgroundColor = '#218838'; }}
                                onMouseLeave={(e) => { if (!phaseDisabled) e.currentTarget.style.backgroundColor = '#28a745'; }}
                              >
                                <Plus size={16} /> Add / Edit
                              </button>
                            );
                          })()}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '6px 12px', verticalAlign: 'top', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            {editingItem === item.id && !hasNewRow ? (
                              <>
                                <button
                                  onClick={handleSave}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981', padding: '4px' }}
                                  title="Save"
                                >
                                  <Save size={16} />
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}
                                  title="Cancel"
                                >
                                  <X size={16} />
                                </button>
                              </>
                            ) : editingItem === item.id && hasNewRow ? (
                              <button
                                onClick={handleCancelEdit}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            ) : (
                              <div style={{ position: 'relative' }}>
                                <button
                                  onClick={(e) => {
                                    if (openMenuId === item.id) {
                                      setOpenMenuId(null);
                                    } else {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      setMenuPosition({ top: rect.bottom + 2, left: rect.right - 120 });
                                      setOpenMenuId(item.id);
                                    }
                                  }}
                                  disabled={wave?.lock_status}
                                  style={{ background: 'none', border: 'none', cursor: wave?.lock_status ? 'not-allowed' : 'pointer', color: wave?.lock_status ? '#cbd5e1' : '#6b7280', padding: '4px' }}
                                  title="Actions"
                                >
                                  <MoreVertical size={18} />
                                </button>
                                {openMenuId === item.id && ReactDOM.createPortal(
                                  <div onClick={() => setOpenMenuId(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 19999 }} />,
                                  document.body
                                )}
                                {openMenuId === item.id && ReactDOM.createPortal(
                                  <div style={{
                                    position: 'fixed', top: menuPosition.top, left: menuPosition.left, zIndex: 20000,
                                    backgroundColor: 'white', border: '1px solid #e5e7eb',
                                    borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                                    minWidth: '120px', overflow: 'hidden'
                                  }}>
                                    <button
                                      onClick={() => { handleEdit(item.id); setOpenMenuId(null); }}
                                      style={{
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                        width: '100%', padding: '8px 14px', background: 'none',
                                        border: 'none', cursor: 'pointer', fontSize: '14px',
                                        color: '#374151', textAlign: 'left'
                                      }}
                                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                      <Edit size={14} color="#3b82f6" /> Edit
                                    </button>
                                    <button
                                      onClick={() => { handleDelete(item.id); setOpenMenuId(null); }}
                                      style={{
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                        width: '100%', padding: '8px 14px', background: 'none',
                                        border: 'none', cursor: 'pointer', fontSize: '14px',
                                        color: '#374151', textAlign: 'left'
                                      }}
                                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                      <Trash2 size={14} color="#ef4444" /> Delete
                                    </button>
                                  </div>,
                                  document.body
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
          )}

          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-start' }}>
            <button
              onClick={hasNewRow ? handleSave : handleAddRow}
              disabled={isSaving || wave?.lock_status}
              style={{
                backgroundColor: (isSaving || wave?.lock_status) ? '#cbd5e1' : '#28a745',
                color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: (isSaving || wave?.lock_status) ? 'not-allowed' : 'pointer',
                fontWeight: '500', fontSize: '14px', width: '180px'
              }}
            >
              {hasNewRow ? (
                <><Save size={18} /> <span>{isSaving ? 'Saving...' : 'Save Rollout'}</span></>
              ) : (
                <><Plus size={18} /> <span>Add Rollout</span></>
              )}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {errorMessage && ReactDOM.createPortal(
          <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: '#ef4444',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 30000,
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            maxWidth: '400px',
            wordWrap: 'break-word',
            animation: 'slideIn 0.3s ease-out'
          }}>
            <AlertCircle size={16} />
            {errorMessage}
          </div>,
          document.body
        )}

        {/* Confirmation Dialog */}
        {showConfirmDialog && ReactDOM.createPortal(
          <div style={{
            position: 'fixed', top: '0', left: '0', right: '0', bottom: '0',
            backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 40000
          }}>
            <div style={{
              backgroundColor: 'white', padding: '24px', borderRadius: '8px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)', maxWidth: '400px',
              width: '90%', textAlign: 'center'
            }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#333', fontSize: '18px', fontWeight: '600' }}>
                Confirmation
              </h3>
              <p style={{ margin: '0 0 24px 0', color: '#666', fontSize: '16px', lineHeight: '1.5' }}>
                {confirmMessage}
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  onClick={handleConfirmCancel}
                  style={{
                    backgroundColor: '#6b7280', color: 'white', border: 'none',
                    padding: '10px 24px', borderRadius: '6px', cursor: 'pointer',
                    fontSize: '16px', fontWeight: '500', minWidth: '100px'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmYes}
                  style={{
                    backgroundColor: '#3b82f6', color: 'white', border: 'none',
                    padding: '10px 24px', borderRadius: '6px', cursor: 'pointer',
                    fontSize: '16px', fontWeight: '500', minWidth: '100px'
                  }}
                >
                  Yes
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
      {/* Help Modal */}
      {showHelpPopup && ReactDOM.createPortal(
        <div
          onClick={() => setShowHelpPopup(false)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50000
          }}>
          <div
            onClick={(e) => e.stopPropagation()}
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
                    The <strong>Rollout Definitions</strong> page manages individual go-live events within a wave. A <strong>Rollout</strong> represents a specific entity, country, or business unit going live during the parent wave&#39;s date range shown in the header.
                  </p>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <strong style={{ color: '#1f2937', fontSize: '15px' }}>Why is this used?</strong>
                  <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                    Rollouts break down a wave into granular deployment units, allowing project teams to track go-live readiness, assign specific dates, and manage risk at an entity or country level within each wave.
                  </p>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <strong style={{ color: '#1f2937', fontSize: '15px' }}>Understanding the columns</strong>
                  <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                    <li><strong>Rollout Code</strong> — A short uppercase identifier for the rollout (e.g., R1, APAC-1). Max 30 characters, letters, numbers, hyphens, and spaces only. Must be unique within the wave.</li>
                    <li><strong>Rollout Description</strong> — The name or description of the rollout (e.g., &quot;APAC Go-Live&quot;). Required, max 140 characters.</li>
                    <li><strong>Start Date / End Date</strong> — The planned start and end dates for this rollout. Both are required and must fall within the parent wave&#39;s date range shown in the header.</li>
                    <li><strong>Comments</strong> — Optional notes about the rollout. Max 240 characters.</li>
                    <li><strong>Actions</strong> — Edit or Delete the rollout via the &#8942; menu.</li>
                  </ul>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to use this page</strong>
                  <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                    <li>Click <strong>Add Rollout</strong> to create a new row. Fill in the Rollout Code, Rollout Description, Start Date, and End Date, then click <strong>Save (&#10003;)</strong>.</li>
                    <li>Use the <strong>&#8942; Actions</strong> menu to Edit or Delete a saved rollout.</li>
                    <li>The wave&#39;s date range is displayed in the header — all rollout dates must fall within this range.</li>
                  </ul>
                </div>

                <div style={{ marginBottom: '4px' }}>
                  <strong style={{ color: '#1f2937', fontSize: '15px' }}>Important notes</strong>
                  <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                    <li><strong>Rollout Code</strong>, <strong>Rollout Description</strong>, <strong>Start Date</strong>, and <strong>End Date</strong> are all required.</li>
                    <li>Rollout dates must fall within the parent wave&#39;s planned start and end dates shown in the header.</li>
                    <li>Start Date cannot be later than End Date.</li>
                    <li>Rollout Code must be unique within the wave — duplicate codes will be rejected on save.</li>
                  </ul>
                </div>

              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Define Phase Modal */}
      <DefinePhaseModal
        isOpen={isPhaseModalOpen}
        onClose={() => {
          setIsPhaseModalOpen(false);
          setSelectedRolloutForPhase(null);
        }}
        rolloutData={selectedRolloutForPhase}
        waveData={wave}
        projectName={localStorage.getItem('project_name') || ''}
        projectDates={projectDates}
        onSaveSuccess={loadRolloutData}
      />
      {/* Rollout Hierarchy Modal */}
      {showRolloutDescModal && selectedRolloutForModal && ReactDOM.createPortal(
        <div
          onClick={() => { setShowRolloutDescModal(false); setSelectedRolloutForModal(null); }}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 50000,
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
              padding: '28px',
              minWidth: '480px',
              maxWidth: '680px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto'
            }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
                Rollout Phase Details
              </h3>
              <button
                onClick={() => { setShowRolloutDescModal(false); setSelectedRolloutForModal(null); }}
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

            {/* Rollout Description Title */}
            <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#374151' }}>
                {selectedRolloutForModal.rolloutDescription}
              </div>
            </div>

            {/* Table */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '6px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb', width: '25%' }}>Rollout Description</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb', width: '25%' }}>Phase</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb', width: '20%' }}>Start Date</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb', width: '20%' }}>End Date</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb', width: '10%' }}>Elapsed Days</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const rollout = selectedRolloutForModal;
                    const phases = rollout.Phases && rollout.Phases.length > 0 ? rollout.Phases : [null];
                    return phases.map((phase, pIdx) => {
                      const isLastInRollout = pIdx === phases.length - 1;
                      return (
                        <tr key={pIdx} style={{ borderBottom: isLastInRollout ? 'none' : '1px dashed #e5e7eb' }}>
                          {pIdx === 0 && (
                            <td rowSpan={phases.length} style={{ padding: '10px 14px', color: '#374151', verticalAlign: 'top', borderRight: '1px solid #e5e7eb' }}>
                              {rollout.rolloutDescription || '—'}
                            </td>
                          )}
                          <td style={{ padding: '10px 14px', color: '#374151', verticalAlign: 'top' }}>
                            {phase ? phase.Phase : '—'}
                          </td>
                          <td style={{ padding: '10px 14px', color: '#374151', verticalAlign: 'top' }}>
                            {phase ? formatDateForDisplay(phase.Start_Date) : formatDateForDisplay(rollout.startDate) || '—'}
                          </td>
                          <td style={{ padding: '10px 14px', color: '#374151', verticalAlign: 'top' }}>
                            {phase ? formatDateForDisplay(phase.End_Date) : formatDateForDisplay(rollout.endDate) || '—'}
                          </td>
                          <td style={{ padding: '10px 14px', color: '#374151', verticalAlign: 'top' }}>
                            {phase ? (phase.Elapsed_Days !== undefined && phase.Elapsed_Days !== null && phase.Elapsed_Days !== '' ? phase.Elapsed_Days : '—') : '—'}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* Last Rollout End Date Mismatch Warning Popup */}
      {showLastRolloutEndDateMismatch && ReactDOM.createPortal(
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 20000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.15)', textAlign: 'center',
            maxWidth: '420px', width: '90%', position: 'relative',
            transform: `translate(${dateValidationModalPosition.x}px, ${dateValidationModalPosition.y}px)`,
            transition: isDraggingDateValidationModal ? 'none' : 'transform 0.1s',
            display: 'flex', flexDirection: 'column'
          }}>
            {/* Header - draggable area with close button */}
            <div
              style={{
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                padding: '16px 24px', cursor: isDraggingDateValidationModal ? 'grabbing' : 'grab',
                borderBottom: '1px solid #e5e7eb', borderRadius: '12px 12px 0 0',
                backgroundColor: '#f9fafb', transition: 'background-color 0.2s', height: '40px',
                position: 'relative'
              }}
              onMouseDown={handleDateValidationMouseDown}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#eff6ff'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
            >
              <button
                onClick={() => {
                  setShowLastRolloutEndDateMismatch(false);
                  setDateValidationModalPosition({ x: 0, y: 0 });
                }}
                style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '30px' }}>
              <div style={{ width: '64px', height: '64px', backgroundColor: '#fff1f2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <AlertCircle size={36} color="#e11d48" />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '12px', color: '#1f2937' }}>Date Validation Warning</h2>
              <p style={{ color: '#4b5563', marginBottom: '28px', lineHeight: '1.6', fontSize: '15px' }}>
                The End Date of the last rollout ({formatDateForDisplay(lastRolloutEndDateMismatchInfo.rolloutEndDate)}) does not match the Wave End Date ({formatDateForDisplay(lastRolloutEndDateMismatchInfo.waveEndDate)}). Please update the rollout dates to ensure the last rollout ends on the wave end date. The Define Phase button for the last rollout will remain disabled until this is resolved.
              </p>
              <button
                onClick={() => {
                  setShowLastRolloutEndDateMismatch(false);
                  setDateValidationModalPosition({ x: 0, y: 0 });
                }}
                style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '6px', cursor: 'pointer', fontSize: '16px', fontWeight: '600', width: '100%', transition: 'background-color 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
              >
                OK
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default RolloutForm;