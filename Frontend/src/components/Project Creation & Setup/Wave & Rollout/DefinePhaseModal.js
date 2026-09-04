import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, CheckCircle, Calendar } from 'lucide-react';
import { TextField } from '@mui/material';
import { CustomDatePicker } from '../../Resource Roster Form/Components';
import { getIdToken } from '../../../utils/cognito-auth';
const addDays = (startDate, days, is5DayWeek) => {
  const date = new Date(startDate);
  if (!is5DayWeek) {
    date.setDate(date.getDate() + days);
    return date;
  }
  let added = 0;
  while (added < days) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 0 && date.getDay() !== 6) {
      added++;
    }
  }
  return date;
};

const subtractDays = (startDate, days, is5DayWeek) => {
  const date = new Date(startDate);
  if (!is5DayWeek) {
    date.setDate(date.getDate() - days);
    return date;
  }
  let subtracted = 0;
  while (subtracted < days) {
    date.setDate(date.getDate() - 1);
    if (date.getDay() !== 0 && date.getDay() !== 6) {
      subtracted++;
    }
  }
  return date;
};

const isWeekend = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  return day === 0 || day === 6;
};

const getPreviousWorkingDay = (date) => {
  const d = new Date(date);
  while (isWeekend(d)) {
    d.setDate(d.getDate() - 1);
  }
  return d;
};

const recalculatePhases = (dataObj, currentWorkingDays, phasesList) => {
  const is5DayWeek = currentWorkingDays === '5-day week';
  const newData = JSON.parse(JSON.stringify(dataObj));
  
  for (let i = 0; i < phasesList.length; i++) {
    const p = phasesList[i];
    if (i === 0) {
      if (newData[p].startDate && newData[p].elapsedDays !== '') {
        const start = new Date(newData[p].startDate);
        const elapsed = Number(newData[p].elapsedDays);
        const end = addDays(start, Math.max(0, elapsed - 1), is5DayWeek);
        newData[p].endDate = end.toISOString();
      } else {
        newData[p].endDate = '';
      }
    } else {
      const prevP = phasesList[i - 1];
      if (newData[prevP].endDate && newData[prevP].elapsedDays !== '') {
        const overlapDays = Math.round((Number(newData[p].overlap || 0) / 100) * Number(newData[prevP].elapsedDays));
        const start = subtractDays(new Date(newData[prevP].endDate), overlapDays, is5DayWeek);
        newData[p].startDate = start.toISOString();
        
        if (newData[p].elapsedDays !== '') {
          const elapsed = Number(newData[p].elapsedDays);
          const end = addDays(start, Math.max(0, elapsed - 1), is5DayWeek);
          newData[p].endDate = end.toISOString();
        } else {
          newData[p].endDate = '';
        }
      } else {
        newData[p].startDate = '';
        newData[p].endDate = '';
      }
    }
  }
  return newData;
};

const DefinePhaseModal = ({ isOpen, onClose, rolloutData, waveData, projectName, projectDates, onSaveSuccess }) => {
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showValidationPopup, setShowValidationPopup] = useState(false);
  const [validationPopupMessage, setValidationPopupMessage] = useState('');
  const [showValidationSuccessPopup, setShowValidationSuccessPopup] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const [isDraft, setIsDraft] = useState(() => rolloutData?.SaveDraft_phase === "true" || rolloutData?.SaveDraft_phase === true);
  const [hasSavedPhases, setHasSavedPhases] = useState(() => Array.isArray(rolloutData?.Phases) && rolloutData.Phases.length > 0);
  const [workingDays, setWorkingDays] = useState(() => rolloutData?.Working_days_mode || '7-day week');
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [lastSavedState, setLastSavedState] = useState(null);
  const [PHASES, setPHASES] = useState([]);
  const [ZERO_OVERLAP_PHASES, setZERO_OVERLAP_PHASES] = useState([]);
  const [phasesLoading, setPhasesLoading] = useState(false);
  const [validationErrorModalPosition, setValidationErrorModalPosition] = useState({ x: 0, y: 0 });
  const [isDraggingValidationError, setIsDraggingValidationError] = useState(false);
  const [dragOffsetValidationError, setDragOffsetValidationError] = useState({ x: 0, y: 0 });

  const [phasesData, setPhasesData] = useState(() => {
    const initialData = {};
    return initialData;
  });

  // Fetch phases from API
  useEffect(() => {
    if (!isOpen) return;
    const fetchPhases = async () => {
      try {
        setPhasesLoading(true);
        const projectId = localStorage.getItem('project_id');
        const idToken = await getIdToken();
        const response = await fetch(`https://mt6ywydebk.execute-api.ap-south-1.amazonaws.com/New/ricew/LOV/projectPhase/getDropdownList?project_id=${projectId}`, {
          headers: { 'Authorization': `Bearer ${idToken}` }
        });
        const result = await response.json();
        if (response.ok && result.data) {
          const systemDefaultPhases = result.data
            .filter(p => p.system_default === 'Yes')
            .sort((a, b) => Number(a.Project_Phase_id) - Number(b.Project_Phase_id));

          const phaseNames = systemDefaultPhases.map(p => p.Phase_Name);
          setPHASES(phaseNames);

          // Zero overlap phases are typically the last phases (HyperCare, Post-Go-Live Support, etc.)
          // Based on Phase_Code or Phase_Name patterns
          const zeroOverlapCodes = ['HYP', 'PGLS', 'AMS'];
          const zeroOverlapPhases = systemDefaultPhases
            .filter(p => zeroOverlapCodes.includes(p.Phase_Code))
            .map(p => p.Phase_Name);
          setZERO_OVERLAP_PHASES(zeroOverlapPhases);
        }
      } catch (err) {
        console.error('Error fetching phases:', err);
      } finally {
        setPhasesLoading(false);
      }
    };
    fetchPhases();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && PHASES.length > 0) {
      setLastSavedState(null);
      setWorkingDays(rolloutData?.Working_days_mode || '7-day week');
      setIsDraft(rolloutData?.SaveDraft_phase === "true" || rolloutData?.SaveDraft_phase === true);
      setHasSavedPhases(Array.isArray(rolloutData?.Phases) && rolloutData.Phases.length > 0);

      const initialData = {};
      const savedPhases = Array.isArray(rolloutData?.Phases) ? rolloutData.Phases : [];

      PHASES.forEach((phase, index) => {
        // Try to find saved phase by exact name match first
        let savedPhase = savedPhases.find(p => p?.M?.Phase?.S === phase || p.Phase === phase);

        // If not found, try to match by position (old phase order might match new order)
        if (!savedPhase && index < savedPhases.length) {
          savedPhase = savedPhases[index];
        }

        if (savedPhase) {
          // Handle DynamoDB wrapped (M, S) or unwrapped formats
          const getVal = (field) => savedPhase?.M ? savedPhase.M[field]?.S : savedPhase[field];

          initialData[phase] = {
            overlap: getVal('Overlap_Percent') || (phase === PHASES[0] ? '' : (ZERO_OVERLAP_PHASES.includes(phase) ? 0 : 20)),
            startDate: getVal('Start_Date') || '',
            endDate: getVal('End_Date') || '',
            elapsedDays: getVal('Elapsed_Days') || '',
          };
        } else {
          initialData[phase] = {
            overlap: phase === PHASES[0] ? '' : (ZERO_OVERLAP_PHASES.includes(phase) ? 0 : 20),
            startDate: phase === PHASES[0] ? (rolloutData?.startDate || '') : '',
            endDate: '',
            elapsedDays: '',
          };
        }
      });

      // Ensure first phase always has the rollout start date if no saved start date
      if (PHASES.length > 0 && initialData[PHASES[0]] && rolloutData?.startDate && !initialData[PHASES[0]].startDate) {
        initialData[PHASES[0]].startDate = rolloutData.startDate;
      }

      setPhasesData(initialData);
    }
  }, [isOpen, rolloutData, PHASES]);

  const checkIfUnsavedChanges = () => {
    if (lastSavedState) {
      if (workingDays !== lastSavedState.workingDays) return true;
      for (const phase of PHASES) {
        const current = phasesData[phase];
        const saved = lastSavedState.phasesData[phase];
        if (String(current.overlap || '') !== String(saved.overlap || '') ||
            current.startDate !== saved.startDate ||
            current.endDate !== saved.endDate ||
            String(current.elapsedDays || '') !== String(saved.elapsedDays || '')) {
          return true;
        }
      }
      return false;
    }

    const savedWorkingDays = rolloutData?.Working_days_mode || '7-day week';
    if (workingDays !== savedWorkingDays) return true;

    const normalizeDate = (d) => {
      if (!d) return '';
      const date = new Date(d);
      return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
    };

    const savedPhases = Array.isArray(rolloutData?.Phases) ? rolloutData.Phases : [];
    for (const phase of PHASES) {
      const savedPhase = savedPhases.find(p => p?.M?.Phase?.S === phase || p.Phase === phase);
      const getVal = (field) => savedPhase?.M ? savedPhase.M[field]?.S : savedPhase[field];
      
      const savedOverlap = savedPhase ? (getVal('Overlap_Percent') ?? (phase === PHASES[0] ? '' : (ZERO_OVERLAP_PHASES.includes(phase) ? 0 : 20))) : (phase === PHASES[0] ? '' : (ZERO_OVERLAP_PHASES.includes(phase) ? 0 : 20));
      const savedStartDate = savedPhase ? (getVal('Start_Date') || '') : '';
      const savedEndDate = savedPhase ? (getVal('End_Date') || '') : '';
      const savedElapsedDays = savedPhase ? (getVal('Elapsed_Days') ?? '') : '';
      
      const current = phasesData[phase];
      if (String(current.overlap || '') !== String(savedOverlap || '') ||
          normalizeDate(current.startDate) !== normalizeDate(savedStartDate) ||
          normalizeDate(current.endDate) !== normalizeDate(savedEndDate) ||
          String(current.elapsedDays || '') !== String(savedElapsedDays || '')) {
        return true;
      }
    }
    return false;
  };

  // Hack to bump the CustomDatePicker portal zIndex because we cannot modify Components.js
  // The calendar portal is hardcoded to z-index: 999, but this modal wrapper is 11000.
  useEffect(() => {
    if (isOpen) {
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
    }
  }, [isOpen]);

  // Validation Error Modal drag handler
  useEffect(() => {
    if (!isDraggingValidationError) return;
    const handleMouseMove = (e) => {
      setValidationErrorModalPosition({
        x: e.clientX - dragOffsetValidationError.x,
        y: e.clientY - dragOffsetValidationError.y
      });
    };
    const handleMouseUp = () => {
      setIsDraggingValidationError(false);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingValidationError, dragOffsetValidationError]);

  if (!isOpen) return null;

  const isPhasesDataReady = PHASES.length > 0 && PHASES.every(phase => phasesData[phase]);

  if (phasesLoading || PHASES.length === 0 || !isPhasesDataReady) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 11000,
        display: 'flex', justifyContent: 'center', alignItems: 'center'
      }}>
        <div style={{
          backgroundColor: 'white', width: '90%', maxWidth: '1000px',
          borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          padding: '40px', textAlign: 'center'
        }}>
          <p style={{ color: '#6b7280', fontSize: '16px' }}>Loading phases...</p>
        </div>
      </div>
    );
  }

  const handleInputChange = (phase, field, value) => {
    setIsValidated(false);
    setPhasesData(prev => {
      const newData = {
        ...prev,
        [phase]: {
          ...prev[phase],
          [field]: value
        }
      };
      return recalculatePhases(newData, workingDays, PHASES);
    });
  };

  const handleValidationErrorMouseDown = (e) => {
    if (e.target.tagName === 'BUTTON') return;
    setIsDraggingValidationError(true);
    setDragOffsetValidationError({
      x: e.clientX - validationErrorModalPosition.x,
      y: e.clientY - validationErrorModalPosition.y
    });
  };

  const handleWorkingDaysChange = (e) => {
    const newVal = e.target.value;
    setWorkingDays(newVal);
    setPhasesData(prev => recalculatePhases(prev, newVal, PHASES));
  };

  const handleSave = async (action = 'confirm') => {
    try {
      let validationPassed = false;
      const rolloutStartStr = rolloutData?.startDate;
      const rolloutEndStr = rolloutData?.endDate;
      const goLiveDateStr = rolloutData?.goLiveDate;

      const rolloutStart = rolloutStartStr ? new Date(rolloutStartStr) : null;
      let rolloutEnd = rolloutEndStr ? new Date(rolloutEndStr) : null;
      let goLiveDate = goLiveDateStr ? new Date(goLiveDateStr) : null;

      if (rolloutStart) rolloutStart.setHours(0, 0, 0, 0);
      if (rolloutEnd) rolloutEnd.setHours(0, 0, 0, 0);
      if (goLiveDate) goLiveDate.setHours(0, 0, 0, 0);

      const is5DayWeek = workingDays === '5-day week';
      if (is5DayWeek && goLiveDate && isWeekend(goLiveDate)) {
        goLiveDate = getPreviousWorkingDay(goLiveDate);
      }
      if (is5DayWeek && rolloutEnd && isWeekend(rolloutEnd)) {
        rolloutEnd = getPreviousWorkingDay(rolloutEnd);
      }

      // Check if all fields (Overlap, Start Date, End Date, Elapsed Days) are filled for every phase
      let allFilled = true;
      for (const phase of PHASES) {
        const pData = phasesData[phase];
        if (!pData.startDate || !pData.endDate || pData.elapsedDays === '' || (phase !== PHASES[0] && pData.overlap === '')) {
          allFilled = false;
          break;
        }
      }

      if (action === 'confirm' || allFilled) {
        let isInvalid = false;
        let deployMismatchError = false;
        let outOfBoundsPhase = '';
        let hyperCareError = false;
        let postGoLiveMismatchError = false;

        const deployEnd = phasesData['Deploy']?.endDate ? new Date(phasesData['Deploy'].endDate) : null;
        if (deployEnd) deployEnd.setHours(0, 0, 0, 0);

        const postGoLiveEnd = phasesData['Post-Go-Live Support']?.endDate ? new Date(phasesData['Post-Go-Live Support'].endDate) : null;
        if (postGoLiveEnd) postGoLiveEnd.setHours(0, 0, 0, 0);

        if (deployEnd && goLiveDate && deployEnd.getTime() !== goLiveDate.getTime()) {
           isInvalid = true;
           deployMismatchError = true;
        } else if (action === 'confirm' && rolloutEnd && (!postGoLiveEnd || postGoLiveEnd.getTime() !== rolloutEnd.getTime())) {
           isInvalid = true;
           postGoLiveMismatchError = true;
        } else if (postGoLiveEnd && rolloutEnd && postGoLiveEnd.getTime() !== rolloutEnd.getTime()) {
           isInvalid = true;
           postGoLiveMismatchError = true;
        } else {
          for (const phase of PHASES) {
            const pData = phasesData[phase];
            const pStart = pData.startDate ? new Date(pData.startDate) : null;
            const pEnd = pData.endDate ? new Date(pData.endDate) : null;

            if (pStart) pStart.setHours(0, 0, 0, 0);
            if (pEnd) pEnd.setHours(0, 0, 0, 0);

            if (ZERO_OVERLAP_PHASES.includes(phase)) {
              if ((goLiveDate && pStart && pStart < goLiveDate) ||
                  (rolloutEnd && pEnd && pEnd > rolloutEnd) ||
                  (goLiveDate && pEnd && pEnd < goLiveDate) ||
                  (rolloutEnd && pStart && pStart > rolloutEnd)) {
                 isInvalid = true;
                 outOfBoundsPhase = phase;
                 hyperCareError = true;
                 break;
              }
            } else {
              if ((rolloutStart && pStart && pStart < rolloutStart) ||
                  (rolloutEnd && pEnd && pEnd > rolloutEnd) ||
                  (rolloutStart && pEnd && pEnd < rolloutStart) ||
                  (rolloutEnd && pStart && pStart > rolloutEnd)) {
                 isInvalid = true;
                 outOfBoundsPhase = phase;
                 break;
              }
            }
          }
        }

        if (isInvalid) {
          const safeStart = new Date(rolloutStartStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase().replace(/ /g, '-');
          const safeEnd = new Date(rolloutEndStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase().replace(/ /g, '-');
          const safeGoLive = goLiveDateStr ? new Date(goLiveDateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase().replace(/ /g, '-') : '';

          if (deployMismatchError) {
            const deployEndStr = deployEnd ? deployEnd.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase().replace(/ /g, '-') : '';
            setValidationPopupMessage(`The End Date of "Deploy" (${deployEndStr}) does not match the Rollout Go-Live Date (${safeGoLive}). Please review and correct the Overlap % and/or Elapsed Days for the phases to ensure the dates are aligned.`);
            setShowValidationPopup(true);
          } else if (postGoLiveMismatchError) {
            if (!postGoLiveEnd) {
              setErrorMessage(`"Post-Go-Live Support" End Date is required and must match the End Date of Rollout (${safeEnd}) before confirming.`);
              setShowErrorMessage(true);
              setTimeout(() => setShowErrorMessage(false), 5000);
            } else {
              const postGoLiveEndStr = postGoLiveEnd.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase().replace(/ /g, '-');
              setValidationPopupMessage(`The End Date of "Post-Go-Live Support" (${postGoLiveEndStr}) does not match the End Date of Rollout (${safeEnd}). Please review and correct the Overlap % and/or Elapsed Days for the phases to ensure the dates are aligned.`);
              setShowValidationPopup(true);
            }
          } else if (hyperCareError) {
            setErrorMessage(`${outOfBoundsPhase} phase dates must be between the Rollout Go-Live Date (${safeGoLive}) and the rollout end date (${safeEnd}).`);
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 5000);
          } else {
            setErrorMessage(`${outOfBoundsPhase} phase dates must be between the rollout start date (${safeStart}) and end date (${safeEnd}).`);
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 5000);
          }

          if (action === 'confirm') {
            return;
          }
        } else if (allFilled) {
          setIsValidated(true);
          validationPassed = true;
        }
      }

      let idToken;
      try {
        idToken = await getIdToken();
      } catch (tokenError) {
        console.error('Error getting token:', tokenError);
        setErrorMessage('Authentication error. Please login again.');
        setShowErrorMessage(true);
        setTimeout(() => setShowErrorMessage(false), 5000);
        return;
      }

      const projectId = localStorage.getItem('project_id');
      const userId = localStorage.getItem('userid') || localStorage.getItem('username');
      
      const payload = {
        rice_Rollout_Definition_id: rolloutData?.id || rolloutData?.rice_Rollout_Definition_id,
        project_id: projectId,
        waveRolloutId: waveData?.id || waveData?.waveRolloutId,
        user_id: userId,
        updated_by: userId,
        action: action,
        Working_days_mode: workingDays,
        Phases: PHASES.map(phaseName => {
          const data = phasesData[phaseName];
          return {
            Phase: phaseName,
            Overlap_Percent: data.overlap !== '' ? data.overlap.toString() : "0",
            Start_Date: data.startDate || "",
            End_Date: data.endDate || "",
            Elapsed_Days: data.elapsedDays !== '' ? data.elapsedDays.toString() : ""
          };
        })
      };

      const response = await fetch('https://pewqu3v5b3.execute-api.ap-south-1.amazonaws.com/New/rice/save/rolloutPhases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (response.ok) {
        console.log('Saved phases successfully:', result);
        if (action === 'draft') {
          setIsDraft(true);
        } else if (action === 'confirm') {
          setIsDraft(false);
        }
        setHasSavedPhases(true);

        if (result.Working_days_mode) {
          setWorkingDays(result.Working_days_mode);
        }
        
        setLastSavedState({
          workingDays: result.Working_days_mode || workingDays,
          phasesData: JSON.parse(JSON.stringify(phasesData))
        });
        
        if (action === 'draft' && validationPassed) {
          setShowValidationSuccessPopup(true);
        } else {
          setSuccessMessage(action === 'draft' ? 'Draft saved successfully!' : 'Phases confirmed successfully!');
          setShowSuccessMessage(true);
          setTimeout(() => setShowSuccessMessage(false), 3000);
        }
        
        if (onSaveSuccess) {
          onSaveSuccess();
        }
      } else {
        console.error('Failed to save phases:', result);
        setErrorMessage('Failed to save phases: ' + (result.error || 'Unknown error'));
        setShowErrorMessage(true);
        setTimeout(() => setShowErrorMessage(false), 5000);
      }
    } catch (err) {
      console.error('Error saving phases:', err);
      setErrorMessage('Error saving phases: ' + err.message);
      setShowErrorMessage(true);
      setTimeout(() => setShowErrorMessage(false), 5000);
    }
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

  const headerStyle = {
    padding: '8px', 
    border: '1px solid #e5e7eb',
    fontWeight: '600', 
    backgroundColor: '#f9fafb'
  };

  const cellStyle = {
    padding: '8px', 
    border: '1px solid #e5e7eb'
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 11000,
      display: 'flex', justifyContent: 'center', alignItems: 'center'
    }}>
      <div style={{
        backgroundColor: 'white', width: '90%', maxWidth: '1000px',
        borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        display: 'flex', flexDirection: 'column', maxHeight: '90vh'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid #e5e7eb',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', color: '#111827' }}>
              Define Phase
            </h2>
            {isDraft && (
              <span style={{
                backgroundColor: '#fef3c7', color: '#d97706', padding: '4px 12px',
                borderRadius: '4px', fontSize: '13px', fontWeight: '600',
                border: '1px solid #fcd34d'
              }}>
                Save Draft
              </span>
            )}
            {!isDraft && hasSavedPhases && (
              <span style={{
                backgroundColor: '#dcfce7', color: '#16a34a', padding: '4px 12px',
                borderRadius: '4px', fontSize: '13px', fontWeight: '600',
                border: '1px solid #86efac'
              }}>
                Confirmed
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => {
              if (checkIfUnsavedChanges()) {
                setShowCloseConfirm(true);
              } else {
                onClose();
              }
            }} style={{
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
                <td style={headerStyle}>Project</td>
                <td style={cellStyle}>{projectName || 'Current Project'}</td>
                <td style={headerStyle}>Start Date</td>
                <td style={cellStyle}>{formatDateForDisplay(projectDates?.startDate)}</td>
                <td style={headerStyle}>End Date</td>
                <td style={cellStyle}>{formatDateForDisplay(projectDates?.endDate)}</td>
                <td style={{border: 'none', padding: '8px'}}></td>
              </tr>
              <tr>
                <td style={headerStyle}>Wave</td>
                <td style={cellStyle}>{waveData?.waveDescription || waveData?.waveCode || 'N/A'}</td>
                <td style={headerStyle}>Start Date</td>
                <td style={cellStyle}>{formatDateForDisplay(waveData?.startDate)}</td>
                <td style={headerStyle}>End Date</td>
                <td style={cellStyle}>{formatDateForDisplay(waveData?.endDate)}</td>
                <td style={{border: 'none', padding: '8px'}}></td>
              </tr>
              <tr>
                <td style={headerStyle}>Rollout</td>
                <td style={cellStyle}>
                  {rolloutData?.rolloutDescription || rolloutData?.rolloutCode || 'N/A'}
                  {isDraft && (
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
                  {!isDraft && hasSavedPhases && (
                    <span style={{
                      marginLeft: '8px',
                      backgroundColor: '#dcfce7',
                      color: '#16a34a',
                      fontSize: '11px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontWeight: '600',
                      whiteSpace: 'nowrap'
                    }}>Confirmed</span>
                  )}
                </td>
                <td style={headerStyle}>Start Date</td>
                <td style={cellStyle}>{formatDateForDisplay(rolloutData?.startDate)}</td>
                <td style={headerStyle}>End Date</td>
                <td style={cellStyle}>{formatDateForDisplay(rolloutData?.endDate)}</td>
                <td style={{ padding: '4px 8px', border: 'none', textAlign: 'center', verticalAlign: 'middle' }}>
                  <button
                    type="button"
                    style={{
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      transition: 'background-color 0.2s',
                      width: '100%'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#218838'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#28a745'}
                  >
                    Rollout Information
                  </button>
                </td>
              </tr>
              <tr>
                <td style={{border: 'none', padding: '8px'}}></td>
                <td style={{border: 'none', padding: '8px'}}></td>
                <td style={{border: 'none', padding: '8px'}}></td>
                <td style={{border: 'none', padding: '8px'}}></td>
                <td style={headerStyle}>Rollout Go-Live Date</td>
                <td style={cellStyle}>{formatDateForDisplay(rolloutData?.goLiveDate)}</td>
                <td style={{border: 'none', padding: '8px'}}></td>
              </tr>
            </tbody>
          </table>

          {/* Phases Table */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: '0', fontSize: '16px', color: '#111827' }}>Phases</h3>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '4px 8px'
            }}>
              <Calendar size={16} color="#475569" />
              <span style={{ fontSize: '13px', color: '#475569', fontWeight: '500' }}>Working days</span>
              <select
                value={workingDays}
                onChange={handleWorkingDaysChange}
                style={{
                  padding: '4px 28px 4px 8px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  color: '#0f172a',
                  backgroundColor: '#fff',
                  cursor: 'pointer',
                  outline: 'none',
                  appearance: 'none',
                  backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23475569%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 8px top 50%',
                  backgroundSize: '10px auto',
                }}
              >
                <option value="5-day week">5-day week</option>
                <option value="7-day week">7-day week</option>
              </select>
            </div>
          </div>
          <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '4px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <tr>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Phase</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151' }}>% Overlap with Next Phase</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151', width: '200px' }}>Start Date</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151', width: '200px' }}>End Date</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Elapsed Days</th>
                </tr>
              </thead>
              <tbody>
                {PHASES.map((phase) => (
                  <tr key={phase} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px', fontWeight: '500', color: '#374151' }}>{phase}</td>
                    
                    {/* % Overlap */}
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                       <TextField
                        size="small"
                        type={phase === PHASES[0] ? 'text' : 'number'}
                        value={phasesData[phase].overlap}
                        onChange={(e) => handleInputChange(phase, 'overlap', e.target.value)}
                        disabled={phase === PHASES[0]}
                        sx={{ 
                          width: '80px', 
                          '& .MuiInputBase-input': { padding: '6px 10px', fontSize: '13px', textAlign: 'center' },
                          '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': {
                            display: 'none',
                          },
                          '& input[type=number]': {
                            MozAppearance: 'textfield',
                          },
                          ...(phase === PHASES[0] && { backgroundColor: '#e5e7eb', borderRadius: '4px' })
                        }}
                        inputProps={{ min: 0, max: 100 }}
                      />
                    </td>

                    {/* Start Date */}
                    <td style={{ padding: '8px 12px' }}>
                      <TextField
                        size="small"
                        disabled
                        value={formatDateForDisplay(phasesData[phase].startDate)}
                        sx={{
                          width: '100%',
                          '& .MuiInputBase-input': { padding: '6px 10px', fontSize: '13px', textAlign: 'center' },
                          '& .MuiInputBase-input.Mui-disabled': {
                            WebkitTextFillColor: 'black',
                            color: 'black'
                          },
                          backgroundColor: '#e5e7eb', borderRadius: '4px'
                        }}
                      />
                    </td>

                    {/* End Date */}
                    <td style={{ padding: '8px 12px' }}>
                        <TextField
                          size="small"
                          disabled
                          value={formatDateForDisplay(phasesData[phase].endDate)}
                          sx={{ 
                            width: '100%', 
                            '& .MuiInputBase-input': { padding: '6px 10px', fontSize: '13px', textAlign: 'center' },
                            '& .MuiInputBase-input.Mui-disabled': {
                              WebkitTextFillColor: 'black',
                              color: 'black'
                            },
                            backgroundColor: '#e5e7eb', borderRadius: '4px'
                          }}
                        />
                    </td>

                    {/* Elapsed Days */}
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <TextField
                        size="small"
                        type="number"
                        value={phasesData[phase].elapsedDays}
                        onChange={(e) => handleInputChange(phase, 'elapsedDays', e.target.value)}
                        sx={{ 
                          width: '80px', 
                          '& .MuiInputBase-input': { padding: '6px 10px', fontSize: '13px', textAlign: 'center' },
                          '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': {
                            display: 'none',
                          },
                          '& input[type=number]': {
                            MozAppearance: 'textfield',
                          },
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid #e5e7eb',
          display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: '#f9fafb'
        }}>
          <button
            onClick={() => handleSave('draft')}
            style={{
              padding: '8px 16px', borderRadius: '4px', border: 'none',
              backgroundColor: '#3b82f6', color: 'white', cursor: 'pointer',
              fontWeight: '500', fontSize: '14px', transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
          >
            Save Draft / Validate
          </button>
          <button
            onClick={() => handleSave('confirm')}
            disabled={!isValidated}
            style={{
              padding: '8px 16px', borderRadius: '4px', border: 'none',
              backgroundColor: isValidated ? '#28a745' : '#6c757d', color: 'white', 
              cursor: isValidated ? 'pointer' : 'not-allowed',
              fontWeight: '500', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px',
              transition: 'background-color 0.2s', opacity: isValidated ? 1 : 0.6
            }}
            onMouseEnter={(e) => { if (isValidated) e.currentTarget.style.backgroundColor = '#218838'; }}
            onMouseLeave={(e) => { if (isValidated) e.currentTarget.style.backgroundColor = '#28a745'; }}
          >
            <Save size={16} />
            Confirm
          </button>
        </div>
      </div>

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
          zIndex: 12000,
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
          zIndex: 12000,
          animation: 'slideIn 0.3s ease-out'
        }}>
          <span style={{ fontWeight: '500' }}>{errorMessage}</span>
          <X size={18} style={{ cursor: 'pointer' }} onClick={() => setShowErrorMessage(false)} />
        </div>
      )}

      {/* Validation Successful Popup */}
      {showValidationSuccessPopup && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 12000,
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{
            backgroundColor: 'white', width: '400px', borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)', padding: '24px',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            position: 'relative'
          }}>
            <button onClick={() => setShowValidationSuccessPopup(false)} style={{
              position: 'absolute', top: '12px', right: '12px',
              background: 'none', border: 'none', cursor: 'pointer', color: '#16a34a'
            }}>
              <X size={20} />
            </button>
            <div style={{ color: '#16a34a', marginBottom: '16px' }}>
              <CheckCircle size={64} strokeWidth={2} />
            </div>
            <h3 style={{ margin: '0 0 16px 0', color: '#111827', fontSize: '18px' }}>Validation Successful</h3>
            <p style={{ margin: '0 0 24px 0', color: '#4b5563', fontSize: '14px', textAlign: 'center', lineHeight: '1.5' }}>
              All phase dates and overlaps are consistent.<br />You can now confirm the Rollout Phases.
            </p>
            <button
              onClick={() => setShowValidationSuccessPopup(false)}
              style={{
                backgroundColor: '#16a34a', color: 'white', border: 'none',
                padding: '8px 32px', borderRadius: '4px', cursor: 'pointer',
                fontWeight: '500', fontSize: '14px', width: '120px'
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Close Confirmation Popup */}
      {showCloseConfirm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 12000,
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{
            backgroundColor: 'white', width: '380px', borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)', padding: '24px',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            position: 'relative'
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#333', fontSize: '16px', fontWeight: 'bold' }}>Confirmation</h3>
            <p style={{ margin: '0 0 24px 0', color: '#666', fontSize: '14px', textAlign: 'center', lineHeight: '1.4' }}>
              You have unsaved changes in the Define Phase form.<br />
              Are you sure you want to close without saving?
            </p>
            <div style={{ display: 'flex', gap: '12px', width: '100%', justifyContent: 'center' }}>
              <button
                onClick={() => setShowCloseConfirm(false)}
                style={{
                  backgroundColor: '#6c757d', color: 'white', border: 'none',
                  padding: '8px 32px', borderRadius: '6px', cursor: 'pointer',
                  fontWeight: '500', fontSize: '14px', minWidth: '100px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowCloseConfirm(false);
                  onClose();
                }}
                style={{
                  backgroundColor: '#3b82f6', color: 'white', border: 'none',
                  padding: '8px 32px', borderRadius: '6px', cursor: 'pointer',
                  fontWeight: '500', fontSize: '14px', minWidth: '100px'
                }}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Data Validation Error Popup */}
      {showValidationPopup && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 12000,
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{
            backgroundColor: 'white', width: '400px', borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            display: 'flex', flexDirection: 'column',
            position: 'relative',
            transform: `translate(${validationErrorModalPosition.x}px, ${validationErrorModalPosition.y}px)`,
            transition: isDraggingValidationError ? 'none' : 'transform 0.1s'
          }}>
            {/* Header - draggable area */}
            <div
              style={{
                padding: '12px 24px', cursor: isDraggingValidationError ? 'grabbing' : 'grab',
                borderBottom: '1px solid #e5e7eb', borderRadius: '8px 8px 0 0',
                backgroundColor: '#f9fafb', transition: 'background-color 0.2s', height: '32px',
                display: 'flex', alignItems: 'center', position: 'relative'
              }}
              onMouseDown={handleValidationErrorMouseDown}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#eff6ff'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
            >
              <button onClick={() => {
                setShowValidationPopup(false);
                setValidationErrorModalPosition({ x: 0, y: 0 });
              }} style={{
                position: 'absolute', right: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444'
              }}>
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ color: '#ef4444', marginBottom: '16px' }}>
                <AlertCircle size={64} strokeWidth={1.5} />
              </div>
              <h3 style={{ margin: '0 0 16px 0', color: '#111827', fontSize: '18px' }}>Data Validation Error</h3>
              <p style={{ margin: '0 0 24px 0', color: '#4b5563', fontSize: '14px', textAlign: 'center', lineHeight: '1.5' }}>
                {validationPopupMessage}
              </p>
              <button
                onClick={() => {
                  setShowValidationPopup(false);
                  setValidationErrorModalPosition({ x: 0, y: 0 });
                }}
                style={{
                  backgroundColor: '#2563eb', color: 'white', border: 'none',
                  padding: '8px 32px', borderRadius: '4px', cursor: 'pointer',
                  fontWeight: '500', fontSize: '14px', width: '120px'
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DefinePhaseModal;
