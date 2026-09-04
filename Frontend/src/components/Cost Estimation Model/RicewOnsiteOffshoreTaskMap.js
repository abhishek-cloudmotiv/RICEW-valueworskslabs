import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Edit, Trash2, X, Save, MoreVertical, Lock, Unlock, HelpCircle, AlertCircle } from 'lucide-react';
import { TextField, MenuItem, Select, FormControl } from '@mui/material';
import DOMPurify from 'dompurify';
import useLOV from '../../hooks/useLOV';
import { getIdToken } from '../../utils/cognito-auth';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';
import SessionExpiredPopup from '../SessionExpiredPopup';
import Loader from '../../utils/Loader';

// Custom Organization Autocomplete Component with wider width
const WideOrganizationAutocomplete = ({
  value,
  onChange,
  options,
  error = false,
  width = '340px'
}) => {
  const getInitialValue = () => {
    if (!value) return '';
    const matchingOption = options.find(opt => opt.value === value);
    return matchingOption ? matchingOption.label : value;
  };

  const [isOpen, setIsOpen] = useState(false);
  const [inputVal, setInputVal] = useState(getInitialValue());
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const autocompleteRef = useRef(null);
  const isExternalChangeRef = useRef(false);
  const isUserEditingRef = useRef(false);
  const isSelectingRef = useRef(false);
  const isShiftTabRef = useRef(false);
  const isTabRef = useRef(false);
  const previousValueRef = useRef('');

  useEffect(() => {
    if (!isUserEditingRef.current && !isExternalChangeRef.current) {
      const matchingOption = options.find(opt => opt.value === value);
      setInputVal(matchingOption ? matchingOption.label : value);
    }
  }, [value, options]);

  // Force clear input when value becomes empty
  useEffect(() => {
    if (!value || value === '') {
      setInputVal('');
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleGlobalKeyDown = (event) => {
      if (event.key === 'Tab' && event.shiftKey) {
        isShiftTabRef.current = true;
        setTimeout(() => {
          isShiftTabRef.current = false;
        }, 100);
      } else if (event.key === 'Tab' && !event.shiftKey) {
        isTabRef.current = true;
        setTimeout(() => {
          isTabRef.current = false;
        }, 100);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    const capitalizedVal = val.charAt(0).toUpperCase() + val.slice(1);
    setInputVal(capitalizedVal);
    setIsOpen(true);
    setHighlightedIndex(-1);
    isUserEditingRef.current = true;

    const matchingOption = options.find(opt =>
      opt.label.toLowerCase() === capitalizedVal.toLowerCase() ||
      opt.value === capitalizedVal
    );

    if (matchingOption) {
      onChange(matchingOption.value);
    } else if (capitalizedVal === '' || capitalizedVal.trim() === '') {
      onChange('');
    }
  };

  const handleKeyDown = (e) => {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev =>
        prev < filteredOptions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev =>
        prev > 0 ? prev - 1 : filteredOptions.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        handleSelectOption(filteredOptions[highlightedIndex].value);
      } else {
        setIsOpen(false);
      }
    }
  };

  const handleSelectOption = (optionValue) => {
    const selectedOption = options.find(opt => opt.value === optionValue);
    const displayLabel = selectedOption ? selectedOption.label : optionValue;

    isSelectingRef.current = true;
    isExternalChangeRef.current = true;
    if (optionValue !== value) {
      onChange(optionValue);
    }
    setInputVal(displayLabel);
    setIsOpen(false);
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;

    setTimeout(() => {
      isSelectingRef.current = false;
    }, 200);
  };

  const normalizedInput = inputVal.toLowerCase().replace(/^\+/, '');
  const filteredOptions = normalizedInput.length === 0
    ? options
    : options.filter(option => {
      const normalizedLabel = option.label.toLowerCase().replace(/^\+/, '');
      return normalizedLabel.startsWith(normalizedInput);
    });

  return (
    <div
      style={{ position: 'relative', width: width, overflow: 'visible' }}
      ref={autocompleteRef}
    >
      <div style={{ position: 'relative', overflow: 'visible' }}>
        <TextField
          value={inputVal}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          onFocus={() => {
            if (value && !isShiftTabRef.current && !isTabRef.current) {
              previousValueRef.current = value;
              setInputVal('');
            }
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onBlur={() => {
            setTimeout(() => {
              if (isSelectingRef.current) {
                setIsOpen(false);
                isUserEditingRef.current = false;
                return;
              }

              const isValidOption = options.some(opt => opt.value === inputVal || opt.label === inputVal);
              if (!isValidOption && inputVal.trim() !== '') {
                setInputVal('');
                if (value !== '') {
                  onChange('');
                }
              } else if (inputVal.trim() === '' && previousValueRef.current) {
                const prevOpt = options.find(opt => opt.value === previousValueRef.current);
                if (prevOpt) {
                  setInputVal(prevOpt.label);
                  if (prevOpt.value !== value) {
                    onChange(prevOpt.value);
                  }
                } else {
                  setInputVal(previousValueRef.current);
                  if (previousValueRef.current !== value) {
                    onChange(previousValueRef.current);
                  }
                }
              }
              setIsOpen(false);
              setHighlightedIndex(-1);
              isUserEditingRef.current = false;
            }, 150);
          }}
          placeholder="Select from list..."
          size="small"
          error={error}
          sx={{
            width: width,
            '& .MuiInputBase-root': {
              backgroundColor: 'white',
              fontSize: '13px',
              fontFamily: 'inherit',
            },
            '& .MuiInputBase-input': {
              padding: '6px 30px 6px 10px',
              fontSize: '13px',
            },
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: '#ddd',
              },
              '&:hover fieldset': {
                borderColor: '#bbb',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#007bff',
              },
            },
          }}
        />
        <svg
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            width: '16px',
            height: '16px',
          }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            maxHeight: '200px',
            overflowY: 'auto',
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 1000,
          }}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={option.value}
                onClick={() => handleSelectOption(option.value)}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  backgroundColor: index === highlightedIndex ? '#accafaff' : (option.value === value ? '#e3f2fd' : 'white'),
                  fontSize: '13px',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#accafaff';
                  setHighlightedIndex(index);
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    index === highlightedIndex ? '#accafaff' : (option.value === value ? '#e3f2fd' : 'white');
                }}
                title={option.label}
              >
                {option.label}
              </div>
            ))
          ) : (
            <div
              style={{
                padding: '12px',
                fontSize: '13px',
                color: '#999',
                textAlign: 'center'
              }}
            >
              {inputVal ? 'No matching options found' : 'Start typing to search...'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// LOV data for resource task fields

const RicewOnsiteOffshoreTaskMap = ({ onClose, selectedProject, setUnsavedChangesChecker }) => {
  const navigate = useNavigate();
  const { handleAuthError, userId, projectId, projectName } = useSession();
  const [showNoProjectSelectedPopup, setShowNoProjectSelectedPopup] = useState(false);

  useEffect(() => {
    if (!selectedProject?.id && !projectId) {
      setShowNoProjectSelectedPopup(true);
    }
  }, [selectedProject?.id, projectId]);

  const [data, setData] = useState([]);
  const [isSaved, setIsSaved] = useState(false);
  const [changedItems, setChangedItems] = useState(new Set());
  const [isFirstSave, setIsFirstSave] = useState(true);
  const [savedItemIds, setSavedItemIds] = useState(new Set());
  const [hasNewRow, setHasNewRow] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({
    ricewName: '',
    complexity: '',
    isActive: true,
    fsWriting: '',
    fsReview: '',
    tsWriting: '',
    tsReview: '',
    codeDevlopment: '',
    codeReview: '',
    unitTesting: '',
    technicalSupport: '',
    migrationDocCreation: '',
    migrationEffort: '',
    pglSupport: '',
    pmoEffort: '',
    contingency: '',
    totalHours: '',
    projectId: projectId || selectedProject?.id || ''
  });
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [dataFromBackend, setDataFromBackend] = useState(false);
  const [originalData, setOriginalData] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});

  // Organization and Service Line State
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('');
  const [selectedBusinessLine, setSelectedBusinessLine] = useState('');
  const [serviceLineOptions, setServiceLineOptions] = useState([]);

  // Get consistent project_id
  const currentProjectId = projectId || selectedProject?.id || '';

  // Fetch organization options using same API as RicewResourceTaskMapping
  const { options: organizationOptions } = useLOV(
    `https://tfv4q9mq6g.execute-api.ap-south-1.amazonaws.com/New/ricew/resourceRateCard/LOV/si-organization-details?project_id=${currentProjectId}`,
    'SI_Organization_Details_id',
    'SI_organization_name'
  );

  // Auto-select organization if only one option exists
  useEffect(() => {
    if (!selectedOrganizationId && organizationOptions && organizationOptions.length === 1) {
      setSelectedOrganizationId(organizationOptions[0].value);
    }
  }, [organizationOptions, selectedOrganizationId]);

  // Static LOV data for Onsite/Offshore selection
  const lovData = [
    { value: 'Offshore', label: 'Offshore' },
    { value: 'Onsite', label: 'Onsite' }
  ];

  const [editingItem, setEditingItem] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [focusedField, setFocusedField] = useState(null);
  const [savingActiveChanges, setSavingActiveChanges] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);
  const helpPopupRef = useRef(null);

  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState('');

  const [isMasterData, setIsMasterData] = useState(false); // true when showing master data for copying

  // Draft functionality
  const [isDraftOrganization, setIsDraftOrganization] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  // Lock/Unlock functionality
  const [isLocked, setIsLocked] = useState(false);
  const [lockingUnlocking, setLockingUnlocking] = useState(false);

  const [showHelpPopup, setShowHelpPopup] = useState(false);

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

  const checkUnsavedChanges = (callback) => {
    if (editingItem !== null) {
      /* showConfirmation(
        'You have unsaved changes. Do you want to discard them and continue?',
        () => {
          setEditingItem(null);
          setEditValues({});
          callback();
        }
      ); */
      callback();
    } else {
      callback();
    }
  };

  const getDefaultData = () => [
    {
      id: 1,
      ricewName: 'ERP Implementation',
      complexity: 'High',
      isActive: true,
      fsWriting: 'SM',
      fsReview: 'C',
      tsWriting: 'MD',
      tsReview: 'BA',
      codeDevlopment: '60',
      codeReview: '15',
      unitTesting: '20',
      technicalSupport: '12',
      migrationDocCreation: '8',
      migrationEffort: '16',
      pglSupport: '10',
      pmoEffort: '5',
      contingency: '10',
      totalHours: '249',
      projectId: currentProjectId || ''
    },
    {
      id: 2,
      ricewName: 'Module Configuration',
      complexity: 'Medium',
      isActive: true,
      fsWriting: 'M',
      fsReview: 'A',
      tsWriting: 'SC',
      tsReview: 'SA',
      codeDevlopment: '30',
      codeReview: '8',
      unitTesting: '10',
      technicalSupport: '6',
      migrationDocCreation: '4',
      migrationEffort: '8',
      pglSupport: '5',
      pmoEffort: '3',
      totalHours: '126',
      projectId: currentProjectId || ''
    },
  ];

  // Handle Save Draft functionality
  const handleSaveDraft = () => {
    checkUnsavedChanges(async () => {
      const currentProjectId = projectId || selectedProject?.id || '';

      try {
        setSavingDraft(true);

        const payload = {
          project_id: projectId.toString(),
          organization_id: selectedOrganizationId,
          Service_Line_name: selectedBusinessLine,
          saveDraft: true,
          updated_by: userId
        };

        console.log('Calling draft API with payload:', payload);

        let idToken = null;
        try {
          idToken = await getIdToken();
        } catch (tokenError) {
          console.error('Failed to get ID token for handleSaveDraft:', tokenError);
        }

        const headers = {
          'Content-Type': 'application/json',
        };

        if (idToken) {
          headers['Authorization'] = `Bearer ${idToken}`;
        }

        const response = await fetch('https://15w4gxp10j.execute-api.ap-south-1.amazonaws.com/New/newApi/ricew/onsiteOffshoreTaskMap/saveDraft/byProject', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(payload)
        });

        if (response.status === 401 || response.status === 403) {
          handleAuthError('Unauthorized - session expired');
          return;
        }

        if (response.ok) {
          const result = await response.json();
          console.log('Draft saved successfully:', result);
          setSuccessMessage(`${result.updatedCount || 0} onsite offshore task mappings set to draft successfully!`);
          setShowSuccessMessage(true);
          setTimeout(() => {
            setShowSuccessMessage(false);
            setSuccessMessage('');
          }, 3000);

          // Clear any unsaved changes tracking
          setChangedItems(new Set());
          setHasNewRow(false);

          // Reload data to reflect draft status
          await loadData();
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('Failed to save draft:', errorData);
          setErrorMessage(errorData.error || 'Failed to save draft');
          setShowErrorMessage(true);
          setTimeout(() => {
            setShowErrorMessage(false);
            setErrorMessage('');
          }, 5000);
        }
      } catch (error) {
        console.error('Error saving draft:', error);
        setErrorMessage('Error saving draft. Please try again.');
        setShowErrorMessage(true);
        setTimeout(() => {
          setShowErrorMessage(false);
          setErrorMessage('');
        }, 5000);
      } finally {
        setSavingDraft(false);
      }
    });
  };

  const handleLockUnlock = () => {
    checkUnsavedChanges(async () => {
      const currentProjectId = projectId || selectedProject?.id || '';
      const currentUserId = userId || '1';

      try {
        setLockingUnlocking(true);
        const newLockedState = !isLocked;

        const payload = {
          project_id: currentProjectId.toString(),
          organization_id: selectedOrganizationId,
          Service_Line_name: selectedBusinessLine,
          isLocked: newLockedState,
          updated_by: currentUserId,
          user_id: currentUserId
        };

        console.log('Calling lock/unlock API with payload:', payload);

        let idToken = null;
        try {
          idToken = await getIdToken();
        } catch (tokenError) {
          console.error('Failed to get ID token for handleLockUnlock:', tokenError);
        }

        const headers = {
          'Content-Type': 'application/json',
        };

        if (idToken) {
          headers['Authorization'] = `Bearer ${idToken}`;
        }

        const response = await fetch('https://15w4gxp10j.execute-api.ap-south-1.amazonaws.com/New/newApi/ricew/onsiteOffshoreTaskMap/updateLocked/byProject', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(payload)
        });

        if (response.status === 401 || response.status === 403) {
          handleAuthError('Unauthorized - session expired');
          return;
        }

        if (response.ok) {
          const result = await response.json();
          console.log('Lock/unlock API call successful:', result);

          // Update local state
          setIsLocked(newLockedState);

          // Show success message
          setSuccessMessage(`Table ${newLockedState ? 'locked' : 'unlocked'} successfully!`);
          setShowSuccessMessage(true);
          setTimeout(() => {
            setShowSuccessMessage(false);
            setSuccessMessage('');
          }, 3000);
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('Failed to lock/unlock:', errorData);
          setErrorMessage(errorData.error || 'Failed to lock/unlock table');
          setShowErrorMessage(true);
          setTimeout(() => {
            setShowErrorMessage(false);
            setErrorMessage('');
          }, 5000);
        }
      } catch (error) {
        console.error('Error locking/unlocking:', error);
        setErrorMessage('Error locking/unlocking table. Please try again.');
        setShowErrorMessage(true);
        setTimeout(() => {
          setShowErrorMessage(false);
          setErrorMessage('');
        }, 5000);
      } finally {
        setLockingUnlocking(false);
      }
    });
  };

  // Derive service line options when organization changes (same logic as RicewResourceTaskMapping)
  useEffect(() => {
    if (selectedOrganizationId && organizationOptions.length > 0) {
      const selectedOrg = organizationOptions.find(opt => opt.value === selectedOrganizationId);

      if (selectedOrg && selectedOrg.ServiceLines && Array.isArray(selectedOrg.ServiceLines)) {
        const blOptions = selectedOrg.ServiceLines.map(sl => {
          const combinedName = `${sl.Business_Line_Name} : ${sl.Portfolio_Name} : ${sl.Service_Name}`;
          return {
            value: combinedName,
            label: combinedName
          };
        });
        setServiceLineOptions(blOptions);

        // Clear selected service line if it's not in the new options
        if (selectedBusinessLine && !blOptions.some(opt => opt.value === selectedBusinessLine)) {
          setSelectedBusinessLine('');
        }
      } else if (selectedOrg && selectedOrg.Process_Service_Val_Array) {
        const blOptions = selectedOrg.Process_Service_Val_Array.map(bl => ({
          value: bl,
          label: bl
        }));
        setServiceLineOptions(blOptions);

        // Clear selected service line if it's not in the new options
        if (selectedBusinessLine && !selectedOrg.Process_Service_Val_Array.includes(selectedBusinessLine)) {
          setSelectedBusinessLine('');
        }
      } else {
        setServiceLineOptions([]);
        setSelectedBusinessLine('');
      }
    } else {
      setServiceLineOptions([]);
      setSelectedBusinessLine('');
    }
  }, [selectedOrganizationId, organizationOptions]);

  // Reset selection when project changes
  useEffect(() => {
    setSelectedOrganizationId('');
    setSelectedBusinessLine('');
  }, [selectedProject?.id, projectId]);

  const handleOrganizationChange = (newValue) => {
    checkUnsavedChanges(() => {
      setSelectedOrganizationId(newValue);
      setSelectedBusinessLine(''); // Reset service line when organization changes
      setData([]); // Clear data until service line is selected
      setOriginalData([]);
      setIsMasterData(false);
      setIsLocked(false);
      setChangedItems(new Set());
      setFieldErrors({});
    });
  };

  const handleServiceLineChange = (newValue) => {
    setSelectedBusinessLine(newValue);
    setChangedItems(new Set());
    if (selectedOrganizationId && newValue) {
      loadData(selectedOrganizationId, newValue);
    } else {
      setData([]);
      setOriginalData([]);
    }
  };

  const handleMigration = async (orgId, serviceLine, projectId, headers) => {
    // Attempt to find organization name from useLOV options (same as RicewResourceTaskMapping)
    let orgName = '';
    const org = organizationOptions.find(o => o.value === orgId);
    if (org) {
      orgName = org.label;
    }

    // If orgName is still empty, warn and fail gracefully
    if (!orgName) {
      console.warn("Organization name not found for migration. Waiting for data to load or user to re-select.");
      return false;
    }

    try {
      const currentUserId = userId || '1';
      const currentProjectId = projectId || selectedProject?.id?.toString() || '';

      const payload = {
        organization_id: orgId,
        organization_name: orgName,
        created_by: userId,
        user_id: userId,
        project_id: currentProjectId,
        Service_Line_name: serviceLine
      };

      const response = await fetch('https://15w4gxp10j.execute-api.ap-south-1.amazonaws.com/New/ricew/migrate/masterToOrgOnsiteOffshore', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        return false;
      }

      if (response.ok) {
        const result = await response.json();
        console.log('Migration successful:', result);
        return true;
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Migration failed:', errorData);
        setErrorMessage(errorData.error || 'Auto-creation of records failed. Please ensure Resource Task Mappings exist for this Service Line.');
        setShowErrorMessage(true);
        setTimeout(() => {
          setShowErrorMessage(false);
          setErrorMessage('');
        }, 5000);
        return false;
      }
    } catch (error) {
      console.error('Error during migration:', error);
      return false;
    }
  };

  const loadData = async (orgId = selectedOrganizationId, serviceLine = selectedBusinessLine, isRetry = false) => {
    const currentProjectId = projectId || selectedProject?.id || '';

    // Check for mandatory fields
    if (!projectId || !orgId || !serviceLine) {
      setData([]);
      setOriginalData([]);
      setIsMasterData(false);
      setIsLocked(false);
      return;
    }

    setLoading(true);
    try {
      let idToken = null;
      try {
        idToken = await getIdToken();
      } catch (tokenError) {
        console.error('Failed to get ID token for loadData:', tokenError);
      }

      const headers = {
        'Content-Type': 'application/json',
      };

      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      const queryString = `project_id=${projectId.toString()}&organization_id=${orgId}&Service_Line_name=${encodeURIComponent(serviceLine)}`;

      const response = await fetch(`https://15w4gxp10j.execute-api.ap-south-1.amazonaws.com/New/newApi/ricew/onsiteOffshoreTaskMap/getByProject?${queryString}`, {
        method: 'GET',
        headers: headers
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        return;
      }

      if (response.ok) {
        const result = await response.json();
        console.log('Fetched RICEW Onsite Offshore Task Map data:', result);

        const apiData = result.success && Array.isArray(result.data) ? result.data : [];

        if (apiData.length > 0) {
          const transformedData = apiData.map((item, index) => ({
            id: index + 1,
            ricewName: item.Estimation_Name || '',
            complexity: item.ComplexityType || '',
            onsite_offshore_id: item.RICEW_Onsite_Offshore_id || null,
            resource_task_id: item.RICEW_Resource_Task_id || null,
            estimation_model_id: item.RICEW_Estimation_Model_id || null,
            master_estimation_model_id: item.Master_RICEW_Estimation_Model_id || null,
            isActive: item.ActiveStatus === "true",
            originalActive: item.ActiveStatus === "true",
            fsWriting: item.FS_Writing || '',
            fsReview: item.FS_Review || '',
            tsWriting: item.TS_Writing || '',
            tsReview: item.TS_Review || '',
            codeDevlopment: item.Code_Development || '',
            codeReview: item.Code_Review || '',
            unitTesting: item.Unit_Testing || '',
            technicalSupport: item.Technical_Support || '',
            migrationDocCreation: item.Migration_Document_Creation || '',
            migrationEffort: item.Migration_Effort || '',
            pglSupport: item.PGL_Support || '',
            pmoEffort: item.PMO_Effort || '',
            projectId: item.project_id || projectId.toString(),
            isNew: false,
            delete_status: item.delete_status || "false",
            saveDraft: item.saveDraft || "false",
            isLockedField: item.isLocked || "false"
          }));

          // Sort by RICEW_Onsite_Offshore_id in ascending order
          const sortedData = transformedData.sort((a, b) => {
            const aId = parseInt(a.onsite_offshore_id) || 0;
            const bId = parseInt(b.onsite_offshore_id) || 0;
            return aId - bId;
          });

          // Check if any record has saveDraft === "true"
          const hasDraftRecords = sortedData.some(item =>
            item.saveDraft === "true" || item.saveDraft === true
          );
          setIsDraftOrganization(hasDraftRecords);

          // Check if any record has isLocked === "true"
          const isTableLocked = sortedData.some(item =>
            item.isLockedField === "true" || item.isLockedField === true
          );
          setIsLocked(isTableLocked);

          setData(sortedData);
          setOriginalData(sortedData.map(item => ({ ...item })));
          setIsMasterData(false);
          console.log('RICEW Onsite Offshore Task Map data loaded successfully');
        } else {
          // No data found - attempt migration if not a retry
          if (!isRetry) {
            console.log('No data found for combination, attempting auto-migration...');
            const migrationSuccess = await handleMigration(orgId, serviceLine, projectId, headers);
            if (migrationSuccess) {
              setLoading(false); // Reset loading before retry to avoid stuck spinner if retry fails immediately
              await loadData(orgId, serviceLine, true);
              return;
            }
          }

          // If no data and migration failed/skipped/not retried
          console.log('No data found and no migration performed or migration failed');
          setData([]);
          setOriginalData([]);
          setIsMasterData(false);
          setIsLocked(false);
        }
      } else {
        console.error('Failed to fetch data');
        setErrorMessage('Failed to load Onsite Offshore Task Map data');
        setShowErrorMessage(true);
        setTimeout(() => {
          setShowErrorMessage(false);
          setErrorMessage('');
        }, 5000);
      }
    } catch (error) {
      console.error('Error fetching RICEW Onsite Offshore Task Map data:', error);
      setErrorMessage('Error loading Onsite Offshore Task Map data');
      setShowErrorMessage(true);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 5000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedProject?.id]);

  // Provide unsaved changes checker to parent component
  useEffect(() => {
    if (setUnsavedChangesChecker) {
      // Wrap in another function to properly set state to a function value
      setUnsavedChangesChecker(() => () => {
        let isEditingActive = false;
        if (editingItem !== null) {
          const originalItem = originalData.find(o => o.id === editingItem);
          const fieldsToCompare = [
            'fsWriting', 'fsReview', 'tsWriting', 'tsReview',
            'codeDevlopment', 'codeReview', 'unitTesting',
            'technicalSupport', 'migrationDocCreation',
            'migrationEffort', 'pglSupport', 'pmoEffort'
          ];
          isEditingActive = !originalItem || fieldsToCompare.some(field => {
            const currentVal = editValues[field] !== undefined ? editValues[field] : '';
            const originalVal = originalItem[field] !== undefined ? originalItem[field] : '';
            return String(currentVal) !== String(originalVal);
          });
        }
        return hasNewRow || changedItems.size > 0 || isEditingActive;
      });
    }
  }, [hasNewRow, changedItems, editingItem, editValues, originalData, setUnsavedChangesChecker]);

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



  const loadFromLocalStorage = (storageKey) => {
    const savedData = localStorage.getItem(storageKey);

    if (savedData) {
      const parsedData = JSON.parse(savedData);
      setData(parsedData);
      const hasBackendData = parsedData.some(item => item.resource_task_id !== null && item.resource_task_id !== undefined);
      setOriginalData(parsedData.map(item => ({ ...item })));
      setDataFromBackend(hasBackendData);
    } else {
      const defaultData = getDefaultData().map(item => ({ ...item, resource_task_id: null }));
      setData(defaultData);
      setDataFromBackend(false);
      localStorage.setItem(storageKey, JSON.stringify(defaultData));
    }
  };

  const saveToLocalStorage = (updatedData) => {
    const projectId = selectedProject?.id || 101;
    const storageKey = `ricewResourceTaskMappingData_${projectId}`;
    localStorage.setItem(storageKey, JSON.stringify(updatedData));
  };

  const validateRicewName = (value) => {
    return value.length >= 1 && value.length <= 100 && /^[a-zA-Z0-9\s\-_&.,()\/]*$/.test(value);
  };

  const validateNumericField = (value) => {
    return /^\d+(\.\d{1,2})?$/.test(value) && parseFloat(value) >= 0;
  };

  const validateIntegerField = (value) => {
    return /^\d+$/.test(value) && parseInt(value) >= 0;
  };

  const calculateTotalCost = (hours, rate) => {
    const hoursNum = parseFloat(hours) || 0;
    const rateNum = parseFloat(rate) || 0;
    return (hoursNum * rateNum).toFixed(2);
  };

  const handleFieldChange = (fieldName, value, id) => {
    // Auto-capitalize based on field type
    let capitalizedValue;
    if (fieldName === 'ricewName') {
      capitalizedValue = value.charAt(0).toUpperCase() + value.slice(1);
    } else if (['fsWriting', 'fsReview', 'tsWriting', 'tsReview', 'codeDevlopment', 'codeReview', 'unitTesting', 'technicalSupport', 'migrationDocCreation', 'migrationEffort', 'pglSupport', 'pmoEffort', 'totalHours'].includes(fieldName)) {
      // Only allow numeric input for these fields
      capitalizedValue = value.replace(/[^0-9]/g, '');
    } else {
      capitalizedValue = value;
    }

    handleInlineEdit(id, fieldName, capitalizedValue);
  };

  const handleEditFieldChange = (fieldName, value) => {
    // Auto-capitalize based on field type
    let capitalizedValue;
    if (fieldName === 'ricewName') {
      capitalizedValue = value.charAt(0).toUpperCase() + value.slice(1);
    } else if (['fsWriting', 'fsReview', 'tsWriting', 'tsReview', 'codeDevlopment', 'codeReview', 'unitTesting', 'technicalSupport', 'migrationDocCreation', 'migrationEffort', 'pglSupport', 'pmoEffort'].includes(fieldName)) {
      // LOV dropdown fields - use value as-is
      capitalizedValue = value;
    } else if (['codeDevlopment', 'codeReview', 'unitTesting', 'technicalSupport', 'migrationDocCreation', 'migrationEffort', 'pglSupport', 'pmoEffort', 'totalHours'].includes(fieldName)) {
      // Only allow numeric input for these fields
      capitalizedValue = value.replace(/[^0-9]/g, '');
    } else {
      capitalizedValue = value;
    }

    setEditValues({ ...editValues, [fieldName]: capitalizedValue });
  };

  const handleInlineEdit = (id, field, value) => {
    // Restrict updates when showing master data
    if (isMasterData) {
      setErrorMessage('Cannot edit records while viewing master data. Please select an organization and copy data first.');
      setShowErrorMessage(true);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 5000);
      return;
    }

    const item = data.find(d => d.id === id);

    // Check if item is inactive
    if (item && !item.isActive) {
      setErrorMessage('Cannot edit inactive records.');
      setShowErrorMessage(true);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 5000);
      return;
    }

    if (isSaved && !item.isNew) return;

    // Validate input based on field type
    if (field === 'ricewName') {
      if (!validateRicewName(value)) {
        return;
      }
    } else if (['fsWriting', 'fsReview', 'tsWriting', 'tsReview', 'codeDevlopment', 'codeReview', 'unitTesting', 'technicalSupport', 'migrationDocCreation', 'migrationEffort', 'pglSupport', 'pmoEffort'].includes(field)) {
      // LOV fields - no validation needed as they're dropdowns with predefined values
      // But ensure value is not empty if required
      if (!value || value.trim() === '') {
        return;
      }
    } else if (['codeDevlopment', 'codeReview', 'unitTesting', 'technicalSupport', 'migrationDocCreation', 'migrationEffort', 'pglSupport', 'pmoEffort', 'totalHours'].includes(field)) {
      if (value && !validateIntegerField(value)) {
        return;
      }
    }

    const updatedData = data.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setData(updatedData);
    saveToLocalStorage(updatedData);

    // Clear field error when user starts typing (except for limit exceeded errors)
    if (fieldErrors[`${id}_${field}`] && !fieldErrors[`${id}_${field}`].includes('Limit exceeded')) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`${id}_${field}`];
        return newErrors;
      });
    }

    // Check for limit exceeded and set error
    if (field === 'ricewName' && value.length >= 100) {
      setFieldErrors(prev => ({
        ...prev,
        [`${id}_ricewName`]: '100/100 Limit exceeded'
      }));
    } else if (field === 'ricewName' && value.length < 100 && fieldErrors[`${id}_ricewName`] === '100/100 Limit exceeded') {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`${id}_ricewName`];
        return newErrors;
      });
    }

    if (field === 'description' && value.length >= 240) {
      setFieldErrors(prev => ({
        ...prev,
        [`${id}_description`]: '240/240 Limit exceeded'
      }));
    } else if (field === 'description' && value.length < 240 && fieldErrors[`${id}_description`] === '240/240 Limit exceeded') {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`${id}_description`];
        return newErrors;
      });
    }

    // Compare with original data to determine if there are actual changes
    const originalItem = originalData.find(orig => orig.id === id);
    const hasChanged = !originalItem || originalItem[field] !== value;

    setChangedItems(prev => {
      const newSet = new Set(prev);
      if (hasChanged) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleEdit = (id, fieldName = null) => {
    // Restrict updates when showing master data
    if (isMasterData) {
      setErrorMessage('Cannot edit records while viewing master data. Please select an organization and copy data first.');
      setShowErrorMessage(true);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 5000);
      return;
    }

    const item = data.find(d => d.id === id);
    if (item && !item.isActive) {
      setErrorMessage('Cannot edit inactive records.');
      setShowErrorMessage(true);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 5000);
      return;
    }
    if (item) {
      // Check if another item is already being edited
      if (editingItem !== null && editingItem !== id) {
        // Just save the current item and move to the new one
        handleSaveEdit(editingItem);
      }

      checkUnsavedChanges(() => {
        // No unsaved changes (or they were just saved), proceed normally
        setIsSaved(false);
        setEditingItem(id);
        setFocusedField(fieldName);
        // We need to set focused field state similar to other components if we want autofocus
        // For now, let's just enable editing mode. 
        // Note: The previous logic for handleEdit was complex with confirmation dialogs.
        // Simplified based on "direct record edit" user request which usually implies auto-save behavior.

        setEditValues({
          fsWriting: item.fsWriting,
          fsReview: item.fsReview,
          tsWriting: item.tsWriting,
          tsReview: item.tsReview,
          codeDevlopment: item.codeDevlopment,
          codeReview: item.codeReview,
          unitTesting: item.unitTesting,
          technicalSupport: item.technicalSupport,
          migrationDocCreation: item.migrationDocCreation,
          migrationEffort: item.migrationEffort,
          pglSupport: item.pglSupport,
          pmoEffort: item.pmoEffort
        });
        setShowAddForm(false);
      });
    }
  };

  const handleSaveEdit = (id) => {
    // Restrict updates when showing master data
    if (isMasterData) {
      setErrorMessage('Cannot save while viewing master data.');
      setShowErrorMessage(true);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 5000);
      return;
    }

    const item = data.find(d => d.id === id);
    if (!item) return;

    const updatedItem = {
      ...item,
      fsWriting: editValues.fsWriting !== undefined ? editValues.fsWriting : item.fsWriting,
      fsReview: editValues.fsReview !== undefined ? editValues.fsReview : item.fsReview,
      tsWriting: editValues.tsWriting !== undefined ? editValues.tsWriting : item.tsWriting,
      tsReview: editValues.tsReview !== undefined ? editValues.tsReview : item.tsReview,
      codeDevlopment: editValues.codeDevlopment !== undefined ? editValues.codeDevlopment : item.codeDevlopment,
      codeReview: editValues.codeReview !== undefined ? editValues.codeReview : item.codeReview,
      unitTesting: editValues.unitTesting !== undefined ? editValues.unitTesting : item.unitTesting,
      technicalSupport: editValues.technicalSupport !== undefined ? editValues.technicalSupport : item.technicalSupport,
      migrationDocCreation: editValues.migrationDocCreation !== undefined ? editValues.migrationDocCreation : item.migrationDocCreation,
      migrationEffort: editValues.migrationEffort !== undefined ? editValues.migrationEffort : item.migrationEffort,
      pglSupport: editValues.pglSupport !== undefined ? editValues.pglSupport : item.pglSupport,
      pmoEffort: editValues.pmoEffort !== undefined ? editValues.pmoEffort : item.pmoEffort
    };

    const updatedData = data.map(d => d.id === id ? updatedItem : d);
    setData(updatedData);
    saveToLocalStorage(updatedData);

    // Compare with original data to determine if there are actual changes
    const originalItem = originalData.find(orig => orig.id === id);
    const fieldsToCompare = [
      'fsWriting', 'fsReview', 'tsWriting', 'tsReview',
      'codeDevlopment', 'codeReview', 'unitTesting',
      'technicalSupport', 'migrationDocCreation',
      'migrationEffort', 'pglSupport', 'pmoEffort'
    ];

    const hasActualChanges = !originalItem || fieldsToCompare.some(field =>
      String(updatedItem[field] || '') !== String(originalItem[field] || '')
    );

    // Add to or remove from changedItems to track for the bulk save
    setChangedItems(prev => {
      const newSet = new Set(prev);
      if (hasActualChanges) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });

    setEditingItem(null);
    setEditValues({});
    setFocusedField(null);
  };

  const saveActiveChanges = () => {
    checkUnsavedChanges(async () => {
      if (changedItems.size === 0) {
        setErrorMessage('No changes to save.');
        setShowErrorMessage(true);
        setTimeout(() => setShowErrorMessage(false), 3000);
        return;
      }

      setSavingActiveChanges(true);
      const currentProjectId = projectId || selectedProject?.id || '';
      const currentUserId = userId || '1';

      try {
        let records = [];

        changedItems.forEach(id => {
          const item = data.find(d => d.id === id);
          if (item) {
            const record = {
              RICEW_Onsite_Offshore_id: item.onsite_offshore_id
            };
            // Compare with original data to only send changed fields if possible, or send all essential fields
            // Since we updated local data state in handleSaveEdit, we can just send the current values of the item
            // However, the backend might expect only changed fields or full object. The previous implementation sent checked fields.
            // Let's send all editable LOV fields as they are cheap.

            record.FS_Writing = item.fsWriting;
            record.FS_Review = item.fsReview;
            record.TS_Writing = item.tsWriting;
            record.TS_Review = item.tsReview;
            record.Code_Development = item.codeDevlopment;
            record.Code_Review = item.codeReview;
            record.Unit_Testing = item.unitTesting;
            record.Technical_Support = item.technicalSupport;
            record.Migration_Document_Creation = item.migrationDocCreation;
            record.Migration_Effort = item.migrationEffort;
            record.PGL_Support = item.pglSupport;
            record.PMO_Effort = item.pmoEffort;

            records.push(record);
          }
        });

        const payload = {
          records: records,
          project_id: currentProjectId,
          updated_by: currentUserId,
          user_id: currentUserId,
          organization_id: selectedOrganizationId,
          Service_Line_name: selectedBusinessLine
        };

        const token = await getIdToken();
        const response = await fetch('https://15w4gxp10j.execute-api.ap-south-1.amazonaws.com/New/newApi/ricew/onsiteOffshoreTaskMap/bulkUpdate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        if (response.status === 401 || response.status === 403) {
          handleAuthError('Unauthorized - session expired');
          return;
        }

        if (response.ok) {
          const result = await response.json();
          console.log('Bulk update successful:', result);
          setChangedItems(new Set());
          setSuccessMessage('Changes saved successfully!');
          setShowSuccessMessage(true);
          setTimeout(() => setShowSuccessMessage(false), 3000);


          // Reload data from backend to ensure we have the latest state
          await loadData();

          // Update original data to reflect the saved changes
          setOriginalData(data.map(item => ({ ...item })));
        } else {
          throw new Error('Failed to save changes');
        }

      } catch (error) {
        console.error('Error saving changes:', error);
        setErrorMessage('Error saving changes. Please try again.');
        setShowErrorMessage(true);
        setTimeout(() => setShowErrorMessage(false), 5000);
      } finally {
        setSavingActiveChanges(false);
      }
    });
  };

  const handleSubmit = () => {
    checkUnsavedChanges(async () => {
      const currentProjectId = projectId || selectedProject?.id || '';

      try {
        setSavingDraft(true);

        const payload = {
          project_id: projectId.toString(),
          organization_id: selectedOrganizationId,
          Service_Line_name: selectedBusinessLine,
          saveDraft: false,
          updated_by: userId
        };

        console.log('Calling submit API with payload:', payload);

        let idToken = null;
        try {
          idToken = await getIdToken();
        } catch (tokenError) {
          console.error('Failed to get ID token for submit:', tokenError);
        }

        const headers = {
          'Content-Type': 'application/json',
        };

        if (idToken) {
          headers['Authorization'] = `Bearer ${idToken}`;
        }

        const response = await fetch('https://15w4gxp10j.execute-api.ap-south-1.amazonaws.com/New/newApi/ricew/onsiteOffshoreTaskMap/saveDraft/byProject', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(payload)
        });

        if (response.status === 401 || response.status === 403) {
          handleAuthError('Unauthorized - session expired');
          return;
        }

        if (response.ok) {
          const result = await response.json();
          console.log('Submitted successfully:', result);
          setSuccessMessage(`${result.updatedCount || 0} onsite offshore task mappings finalized successfully!`);
          setShowSuccessMessage(true);
          setTimeout(() => {
            setShowSuccessMessage(false);
            setSuccessMessage('');
          }, 3000);

          // Reload data to reflect final status
          await loadData();
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('Failed to submit:', errorData);
          setErrorMessage(errorData.error || 'Failed to submit');
          setShowErrorMessage(true);
          setTimeout(() => {
            setShowErrorMessage(false);
            setErrorMessage('');
          }, 5000);
        }
      } catch (error) {
        console.error('Error submitting:', error);
        setErrorMessage('Error submitting. Please try again.');
        setShowErrorMessage(true);
        setTimeout(() => {
          setShowErrorMessage(false);
          setErrorMessage('');
        }, 5000);
      } finally {
        setSavingDraft(false);
      }
    });
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditValues({});
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (editingItem !== null) {
        // Check if the click target is within the table container or any interactive element
        const isWithinTable = event.target.closest('tr');
        const isWithinSelect = event.target.closest('.MuiMenu-paper') || event.target.closest('.MuiPopover-root');

        // If the click is on a row, it's handled by handleEdit logic usually, but if it is the SAME row, we do nothing.
        // If it is a different row, user request says "edit record by click on the field" + "click on the out side... closed".
        // The handleEdit already saves previous item if we click another row.
        // This handler handles clicking completely outside the rows (e.g. whitespace, header).

        if (!isWithinTable && !isWithinSelect) {
          handleSaveEdit(editingItem);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editingItem, handleSaveEdit]);

  return (
    <>
    <div className="config-main" style={{ minHeight: '80vh' }}>
      <div style={{ padding: '2rem 2rem 1rem 2rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project : <span style={{ color: '#2563eb' }}>{projectName || selectedProject?.name || ''}</span></h3>
      </div>
      <div className="config-header" style={{ marginTop: '0', display: 'flex', alignItems: 'center', gap: '100px', justifyContent: 'flex-start' }}>
        <h2>RICEW Onsite Offshore Task Mapping</h2>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginLeft: 'auto' }}>
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
            onMouseEnter={(e) => e.target.style.backgroundColor = '#3b4b5e'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#4D5C74'}
          >
            <HelpCircle size={16} />
            Help
          </button>
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
                        The <strong>RICEW Onsite Offshore Task Mapping</strong> page allows you to define and manage the delivery location assignment for RICEW items and their associated task types. It enables you to specify whether each task within a RICEW component will be performed onsite (at the client location) or offshore (at your base location), supporting different delivery models and resource allocation strategies.
                      </p>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <strong style={{ color: '#1f2937', fontSize: '15px' }}>Why is this used?</strong>
                      <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                        Onsite-offshore mapping is critical for project delivery planning and cost management. It enables you to: (1) optimize resource costs by allocating appropriate tasks to onsite and offshore locations, (2) manage client expectations and on-site team coordination, (3) balance delivery locations based on task requirements and resource availability, (4) support different billing models for onsite versus offshore work, and (5) plan team composition and logistics for the project.
                      </p>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <strong style={{ color: '#1f2937', fontSize: '15px' }}>Understanding the columns</strong>
                      <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                        <li><strong>RICEW Item</strong> — The RICEW component (Requirements, Implementation, Enhancement, or Warranty/Support) being mapped for delivery location.</li>
                        <li><strong>Complexity</strong> — The difficulty level of the RICEW item (Low, Medium, High) which influences delivery location decisions.</li>
                        <li><strong>Resource Level</strong> — The skill level of the resource assigned to this task (e.g., L1, L2, L3).</li>
                        <li><strong>Task Type</strong> — The type of work being performed (e.g., Development, Testing, Code Review, Documentation).</li>
                        <li><strong>Onsite/Offshore</strong> — Designation showing where the task will be executed (Onsite = at client location, Offshore = at base location).</li>
                        <li><strong>Active</strong> — Status indicator showing whether this mapping is active or inactive.</li>
                      </ul>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to use this page</strong>
                      <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                        <li>Select an <strong>Organization Name</strong> from the dropdown to specify which organization's onsite-offshore mappings you want to configure.</li>
                        <li>Select a <strong>Service Line Name</strong>. The system will load onsite-offshore mappings for the selected organization and service line.</li>
                        <li>The table displays all RICEW items and their resource-task onsite/offshore assignments. Click the <strong>Edit</strong> (pencil) icon on any row to modify the delivery location.</li>
                        <li>When editing a row: Select whether the task will be executed <strong>Onsite</strong> or <strong>Offshore</strong> from the dropdown.</li>
                        <li>Click the <strong>Save</strong> (✓) icon to confirm changes, or <strong>Cancel</strong> (✕) to discard them.</li>
                        <li>Use <strong>Save Draft</strong> to save your work in progress without finalizing. Use <strong>Submit</strong> to lock and finalize all mappings.</li>
                        <li>Click the <strong>Lock</strong> button to prevent other users from editing these mappings. Click <strong>Unlock</strong> to allow edits again.</li>
                      </ul>
                    </div>

                    <div style={{ marginBottom: '4px' }}>
                      <strong style={{ color: '#1f2937', fontSize: '15px' }}>Important notes</strong>
                      <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                        <li>Both <strong>Organization Name</strong> and <strong>Service Line Name</strong> are mandatory. The system will not load onsite-offshore mappings until both are selected.</li>
                        <li>Onsite-offshore assignments should align with your delivery model, resource availability, and client requirements.</li>
                        <li>Onsite work typically incurs additional costs due to travel and accommodation, so plan onsite assignments strategically.</li>
                        <li><strong>Save Draft</strong> preserves your changes without finalizing, allowing you to continue editing later. <strong>Submit</strong> finalizes and locks all mappings for that configuration.</li>
                        <li>The <strong>Lock</strong> feature prevents concurrent editing by multiple users. Always unlock before allowing others to modify mappings.</li>
                        <li>Ensure all critical tasks have clear onsite/offshore designations defined to support accurate project planning and cost estimation.</li>
                        <li>Changes to onsite-offshore mappings may impact project budget and timeline estimates; review all dependencies before finalizing.</li>
                      </ul>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Organization and Service Line Selectors */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: '#f8f9fa',
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        marginBottom: '0.2px',
        flexWrap: 'wrap'
      }}>
        {/* Organization Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ fontSize: '14px', fontWeight: '600', color: '#333', whiteSpace: 'nowrap', marginRight: '8px' }}>
            Organization Name <span style={{ color: 'red' }}>*</span>
          </label>
          <div style={{ width: '260px' }}>
            <WideOrganizationAutocomplete
              value={selectedOrganizationId}
              onChange={handleOrganizationChange}
              options={organizationOptions}
              error={false}
              width="260px"
            />
          </div>
        </div>

        {/* Service Line */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ fontSize: '14px', fontWeight: '600', color: '#333', whiteSpace: 'nowrap', marginRight: '8px' }}>
            Service Line Name <span style={{ color: 'red' }}>*</span>
          </label>
          <div style={{ width: '500px' }}>
            <WideOrganizationAutocomplete
              value={selectedBusinessLine}
              onChange={handleServiceLineChange}
              options={serviceLineOptions}
              error={false}
              width="500px"
            />
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {(loading || lockingUnlocking || savingDraft || savingActiveChanges) && (
        <Loader 
          message={
            lockingUnlocking ? (isLocked ? 'Unlocking...' : 'Locking...') : 
            savingDraft ? 'Saving Draft...' :
            savingActiveChanges ? 'Saving Changes...' : 'Loading Data...'
          } 
        />
      )}

      {/* Success Message Popup */}
      {showSuccessMessage && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          backgroundColor: '#10b981',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'slideIn 0.3s ease-out'
        }}>
          <Save size={20} />
          <span style={{ fontWeight: '500' }}>{DOMPurify.sanitize(successMessage, { ALLOWED_TAGS: [] }) || 'Operation successful!'}</span>
        </div>
      )}

      {/* Error Message Popup */}
      {showErrorMessage && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          backgroundColor: '#ef4444',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'slideIn 0.3s ease-out'
        }}>
          <X size={20} />
          <span style={{ fontWeight: '500' }}>{DOMPurify.sanitize(errorMessage, { ALLOWED_TAGS: [] }) || 'Something went wrong!'}</span>
        </div>
      )}

      {/* Confirmation Dialog */}
      {
        showConfirmDialog && (
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
            zIndex: 2000
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
                {DOMPurify.sanitize(confirmMessage, { ALLOWED_TAGS: [] })}
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
        )
      }

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .config-table thead tr:first-child th[colspan] {
          position: relative;
        }

        .config-table thead tr:first-child th[colspan]::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          right: 0;
          height: 2px;
          background-color: #999;
          z-index: 1;
        }
      `}</style>

      {/* Draft Status Banner */}
      {
        isDraftOrganization && (
          <div style={{
            backgroundColor: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '6px',
            padding: '12px 16px',
            margin: '16px 16px 0 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              backgroundColor: '#f59e0b',
              color: 'white',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 'bold',
              flexShrink: 0
            }}>
              ⓘ
            </div>
            <div style={{
              color: '#92400e',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              This is a saved draft Organization. Complete the form and click "Submit" to finalize the Organization.
            </div>
          </div>
        )
      }

      <div className="table-container" style={{ maxHeight: '500px', overflowY: 'auto', overflowX: 'auto', position: 'relative', marginTop: isDraftOrganization ? '16px' : '0' }}>
        <table className="config-table" style={{ fontSize: '15px', borderCollapse: 'separate', borderSpacing: 0, width: '100%' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 20, backgroundColor: '#fff' }}>
            <tr>
              <th rowSpan="2" style={{ padding: '12px 12px', fontSize: '15px', fontWeight: '600', width: '12%', verticalAlign: 'middle', border: '1px solid #ddd', backgroundColor: '#f5f5f5' }}></th>
              <th rowSpan="2" style={{ padding: '12px 12px', fontSize: '15px', fontWeight: '600', width: '8%', textAlign: 'center', verticalAlign: 'middle', border: '1px solid #ddd', backgroundColor: '#f5f5f5' }}>Complexity</th>
              <th rowSpan="2" style={{ padding: '12px 12px', fontSize: '15px', fontWeight: '600', width: '3%', textAlign: 'center', verticalAlign: 'middle', border: '1px solid #ddd', backgroundColor: '#f5f5f5' }}>Active</th>
              <th colSpan="2" style={{ padding: '12px 12px', fontSize: '15px', fontWeight: '600', textAlign: 'center', border: '1px solid #ddd', borderRight: '2px solid #999', backgroundColor: '#f5f5f5' }}>Functional Specifications (FS)</th>
              <th colSpan="2" style={{ padding: '12px 12px', fontSize: '15px', fontWeight: '600', textAlign: 'center', border: '1px solid #ddd', borderRight: '2px solid #999', backgroundColor: '#f5f5f5' }}>Technical Specification (TS)</th>
              <th colSpan="2" style={{ padding: '12px 12px', fontSize: '15px', fontWeight: '600', textAlign: 'center', border: '1px solid #ddd', borderRight: '2px solid #999', backgroundColor: '#f5f5f5' }}>Build</th>
              <th colSpan="1" style={{ padding: '12px 12px', fontSize: '15px', fontWeight: '600', textAlign: 'center', border: '1px solid #ddd', borderRight: '2px solid #999', backgroundColor: '#f5f5f5' }}>Code Testing</th>
              <th colSpan="1" style={{ padding: '12px 12px', fontSize: '15px', fontWeight: '600', textAlign: 'center', border: '1px solid #ddd', borderRight: '2px solid #999', backgroundColor: '#f5f5f5' }}>SIT / INT / UAT</th>
              <th colSpan="2" style={{ padding: '12px 12px', fontSize: '15px', fontWeight: '600', textAlign: 'center', border: '1px solid #ddd', borderRight: '2px solid #999', backgroundColor: '#f5f5f5' }}>Migration</th>
              <th colSpan="1" style={{ padding: '12px 12px', fontSize: '15px', fontWeight: '600', textAlign: 'center', border: '1px solid #ddd', borderRight: '2px solid #999', backgroundColor: '#f5f5f5' }}>Post Go-Live Support (PGL)</th>
              <th colSpan="1" style={{ padding: '12px 12px', fontSize: '15px', fontWeight: '600', textAlign: 'center', border: '1px solid #ddd', borderRight: '2px solid #999', backgroundColor: '#f5f5f5' }}>Delivery PMO</th>
              {/* <th rowSpan="2" style={{ padding: '12px 12px', fontSize: '15px', fontWeight: '600', width: '3%', textAlign: 'center', verticalAlign: 'middle', border: '1px solid #ddd', backgroundColor: '#f5f5f5' }}>Edit</th> */}
            </tr>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th style={{ padding: '12px 12px', fontSize: '14px', fontWeight: '600', width: '5%', border: '1px solid #ddd', borderTop: '2px solid #999', backgroundColor: '#f5f5f5' }}>FS Writing</th>
              <th style={{ padding: '12px 12px', fontSize: '14px', fontWeight: '600', width: '5%', border: '1px solid #ddd', borderRight: '2px solid #999', borderTop: '2px solid #999', backgroundColor: '#f5f5f5' }}>FS Review</th>
              <th style={{ padding: '12px 12px', fontSize: '14px', fontWeight: '600', width: '5%', border: '1px solid #ddd', borderTop: '2px solid #999', backgroundColor: '#f5f5f5' }}>TS Writing</th>
              <th style={{ padding: '12px 12px', fontSize: '14px', fontWeight: '600', width: '5%', border: '1px solid #ddd', borderRight: '2px solid #999', borderTop: '2px solid #999', backgroundColor: '#f5f5f5' }}>TS Review</th>
              <th style={{ padding: '12px 12px', fontSize: '14px', fontWeight: '600', width: '5%', border: '1px solid #ddd', borderTop: '2px solid #999', backgroundColor: '#f5f5f5' }}>Code Development</th>
              <th style={{ padding: '12px 12px', fontSize: '14px', fontWeight: '600', width: '5%', border: '1px solid #ddd', borderRight: '2px solid #999', borderTop: '2px solid #999', backgroundColor: '#f5f5f5' }}>Code Review</th>
              <th style={{ padding: '12px 12px', fontSize: '14px', fontWeight: '600', width: '5%', border: '1px solid #ddd', borderRight: '2px solid #999', borderTop: '2px solid #999', backgroundColor: '#f5f5f5' }}>Unit Testing</th>
              <th style={{ padding: '12px 12px', fontSize: '14px', fontWeight: '600', width: '5%', border: '1px solid #ddd', borderRight: '2px solid #999', borderTop: '2px solid #999', backgroundColor: '#f5f5f5' }}>Technical Support</th>
              <th style={{ padding: '12px 12px', fontSize: '14px', fontWeight: '600', width: '5%', border: '1px solid #ddd', borderTop: '2px solid #999', backgroundColor: '#f5f5f5' }}>Migration Document Creation</th>
              <th style={{ padding: '12px 12px', fontSize: '14px', fontWeight: '600', width: '5%', border: '1px solid #ddd', borderRight: '2px solid #999', borderTop: '2px solid #999', backgroundColor: '#f5f5f5' }}>Migration Effort</th>
              <th style={{ padding: '12px 12px', fontSize: '14px', fontWeight: '600', width: '5%', border: '1px solid #ddd', borderRight: '2px solid #999', borderTop: '2px solid #999', backgroundColor: '#f5f5f5' }}>PGL Support</th>
              <th style={{ padding: '12px 12px', fontSize: '14px', fontWeight: '600', width: '5%', border: '1px solid #ddd', borderRight: '2px solid #999', borderTop: '2px solid #999', backgroundColor: '#f5f5f5' }}>PMO Effort</th>
            </tr>
          </thead>
          <tbody>
            {useMemo(() => {
              const sortedData = [...data].sort((a, b) => {
                // Always put new items at the bottom
                if (a.isNew && !b.isNew) return 1;
                if (!a.isNew && b.isNew) return -1;

                // For existing items, sort by resource_task_id ascending
                const aId = parseInt(a.resource_task_id) || 0;
                const bId = parseInt(b.resource_task_id) || 0;
                if (aId !== bId) {
                  return aId - bId;
                }

                // If same resource_task_id, maintain original order
                return 0;
              });

              // Calculate rowSpan for each ricewName group
              const groupInfo = {};
              sortedData.forEach((item, index) => {
                if (index === 0 || sortedData[index - 1].ricewName !== item.ricewName) {
                  // Start of a new group
                  let count = 1;
                  for (let i = index + 1; i < sortedData.length; i++) {
                    if (sortedData[i].ricewName === item.ricewName) {
                      count++;
                    } else {
                      break;
                    }
                  }
                  groupInfo[index] = count;
                }
              });

              return sortedData.map((item, index) => {
                const sanitizedRicewName = DOMPurify.sanitize(item.ricewName || '', { ALLOWED_TAGS: [] });
                const sanitizedComplexity = DOMPurify.sanitize(item.complexity || '', { ALLOWED_TAGS: [] });
                const sanitizedFsWriting = DOMPurify.sanitize(String(item.fsWriting) || '', { ALLOWED_TAGS: [] });
                const sanitizedFsReview = DOMPurify.sanitize(String(item.fsReview) || '', { ALLOWED_TAGS: [] });
                const sanitizedTsWriting = DOMPurify.sanitize(String(item.tsWriting) || '', { ALLOWED_TAGS: [] });
                const sanitizedTsReview = DOMPurify.sanitize(String(item.tsReview) || '', { ALLOWED_TAGS: [] });
                const sanitizedCodeDevlopment = DOMPurify.sanitize(String(item.codeDevlopment) || '', { ALLOWED_TAGS: [] });
                const sanitizedCodeReview = DOMPurify.sanitize(String(item.codeReview) || '', { ALLOWED_TAGS: [] });
                const sanitizedUnitTesting = DOMPurify.sanitize(String(item.unitTesting) || '', { ALLOWED_TAGS: [] });
                const sanitizedTechnicalSupport = DOMPurify.sanitize(String(item.technicalSupport) || '', { ALLOWED_TAGS: [] });
                const sanitizedMigrationDocCreation = DOMPurify.sanitize(String(item.migrationDocCreation) || '', { ALLOWED_TAGS: [] });
                const sanitizedMigrationEffort = DOMPurify.sanitize(String(item.migrationEffort) || '', { ALLOWED_TAGS: [] });
                const sanitizedPglSupport = DOMPurify.sanitize(String(item.pglSupport) || '', { ALLOWED_TAGS: [] });
                const sanitizedPmoEffort = DOMPurify.sanitize(String(item.pmoEffort) || '', { ALLOWED_TAGS: [] });
                const sanitizedOnsitePercentage = DOMPurify.sanitize(String(item.onsitePercentage) || '', { ALLOWED_TAGS: [] });

                return (
                <tr key={item.id} data-row-id={item.id} style={{
                  backgroundColor: isLocked ? '#f5f5f5' : (item.isActive ? '#fff' : '#f8f8f8'),
                  borderBottom: '1px solid #ddd'
                }}>

                  {groupInfo[index] && (
                    <td rowSpan={groupInfo[index]} style={{
                      padding: '8px 12px',
                      verticalAlign: 'middle',
                      border: '1px solid #ddd',
                      textAlign: 'left',
                      backgroundColor: (() => {
                        // Check if all items in this group are inactive
                        const groupRicewName = item.ricewName;
                        const groupItems = sortedData.filter(dataItem => dataItem.ricewName === groupRicewName);
                        const allInactive = groupItems.every(dataItem => !dataItem.isActive);
                        return allInactive ? '#f8f8f8' : '#fff';
                      })(),
                      opacity: (() => {
                        // Check if all items in this group are inactive
                        const groupRicewName = item.ricewName;
                        const groupItems = sortedData.filter(dataItem => dataItem.ricewName === groupRicewName);
                        const allInactive = groupItems.every(dataItem => !dataItem.isActive);
                        return allInactive ? 0.6 : 1;
                      })()
                    }}>
                      <div style={{
                        fontSize: '14px',
                        padding: '8px 0',
                        color: '#333',
                        minHeight: '40px',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        {sanitizedRicewName}
                      </div>
                    </td>
                  )}
                  <td style={{
                    padding: '8px 12px',
                    verticalAlign: 'middle',
                    border: '1px solid #ddd',
                    textAlign: 'center',
                    opacity: item.isActive ? 1 : 0.6
                  }}>
                    <div style={{
                      fontSize: '14px',
                      padding: '8px 0',
                      color: '#333',
                      minHeight: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {sanitizedComplexity}
                    </div>
                  </td>
                  <td style={{
                    padding: '8px 12px',
                    verticalAlign: 'middle',
                    border: '1px solid #ddd',
                    textAlign: 'center',
                    opacity: item.isActive ? 1 : 0.6
                  }}>
                    <div
                      key={`active-${item.id}-${item.isActive}`}
                      style={{
                        width: '16px',
                        height: '16px',
                        border: `2px solid ${item.isActive ? '#9ca3af' : '#6b7280'}`,
                        borderRadius: '3px',
                        backgroundColor: item.isActive ? '#9ca3af' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'not-allowed',
                        margin: '0 auto'
                      }}
                    >
                      {item.isActive && (
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="white"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20,6 9,17 4,12"></polyline>
                        </svg>
                      )}
                    </div>
                  </td>
                  {/* FS Writing */}
                  <td style={{
                    padding: '6px 12px',
                    verticalAlign: 'top',
                    border: '1px solid #ddd',
                    opacity: item.isActive ? 1 : 0.6
                  }}>
                    {editingItem === item.id ? (
                      <Select
                        value={editValues.fsWriting || ''}
                        onChange={(e) => handleEditFieldChange('fsWriting', e.target.value)}
                        autoFocus={focusedField === 'fsWriting'}
                        size="small"
                        disabled={isLocked}
                        style={{ width: '100%', fontSize: '14px' }}
                        displayEmpty
                        MenuProps={{
                          anchorOrigin: {
                            vertical: 'bottom',
                            horizontal: 'left',
                          },
                          transformOrigin: {
                            vertical: 'top',
                            horizontal: 'left',
                          },
                          PaperProps: {
                            style: {
                              maxHeight: 180,
                              maxWidth: 150,
                              overflow: 'auto',
                            },
                          },
                        }}
                      >
                        {lovData.map((option) => (
                          <MenuItem
                            key={option.value}
                            value={option.value}
                            sx={{
                              fontSize: '13px',
                              '&:hover': {
                                backgroundColor: '#cce5ff',
                              },
                              '&.Mui-selected': {
                                backgroundColor: '#e3f2fd',
                                '&:hover': {
                                  backgroundColor: '#cce5ff',
                                },
                              },
                              '&.Mui-focusVisible': {
                                backgroundColor: '#cce5ff',
                              },
                            }}
                          >
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    ) : (
                      <div
                        onClick={() => handleEdit(item.id, 'fsWriting')}
                        style={{
                          fontSize: '14px',
                          padding: '8px 0',
                          color: '#333',
                          minHeight: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          cursor: (isLocked || isMasterData || !item.isActive) ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {sanitizedFsWriting}
                      </div>
                    )}
                  </td>
                  {/* FS Review */}
                  <td style={{
                    padding: '6px 12px',
                    verticalAlign: 'top',
                    border: '1px solid #ddd',
                    opacity: item.isActive ? 1 : 0.6
                  }}>
                    {editingItem === item.id ? (
                      <Select
                        value={editValues.fsReview || ''}
                        onChange={(e) => handleEditFieldChange('fsReview', e.target.value)}
                        autoFocus={focusedField === 'fsReview'}
                        size="small"
                        disabled={isLocked}
                        style={{ width: '100%', fontSize: '14px' }}
                        displayEmpty
                        MenuProps={{
                          anchorOrigin: {
                            vertical: 'bottom',
                            horizontal: 'left',
                          },
                          transformOrigin: {
                            vertical: 'top',
                            horizontal: 'left',
                          },
                          PaperProps: {
                            style: {
                              maxHeight: 180,
                              maxWidth: 150,
                              overflow: 'auto',
                            },
                          },
                        }}
                      >
                        {lovData.map((option) => (
                          <MenuItem
                            key={option.value}
                            value={option.value}
                            sx={{
                              fontSize: '13px',
                              '&:hover': {
                                backgroundColor: '#cce5ff',
                              },
                              '&.Mui-selected': {
                                backgroundColor: '#e3f2fd',
                                '&:hover': {
                                  backgroundColor: '#cce5ff',
                                },
                              },
                              '&.Mui-focusVisible': {
                                backgroundColor: '#cce5ff',
                              },
                            }}
                          >
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    ) : (
                      <div
                        onClick={() => handleEdit(item.id, 'fsReview')}
                        style={{
                          fontSize: '14px',
                          padding: '8px 0',
                          color: '#333',
                          minHeight: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          cursor: (isLocked || isMasterData || !item.isActive) ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {sanitizedFsReview}
                      </div>
                    )}
                  </td>
                  {/* TS Writing */}
                  <td style={{
                    padding: '6px 12px',
                    verticalAlign: 'top',
                    border: '1px solid #ddd',
                    opacity: item.isActive ? 1 : 0.6
                  }}>
                    {editingItem === item.id ? (
                      <Select
                        value={editValues.tsWriting || ''}
                        onChange={(e) => handleEditFieldChange('tsWriting', e.target.value)}
                        autoFocus={focusedField === 'tsWriting'}
                        size="small"
                        disabled={isLocked}
                        style={{ width: '100%', fontSize: '14px' }}
                        displayEmpty
                        MenuProps={{
                          anchorOrigin: {
                            vertical: 'bottom',
                            horizontal: 'left',
                          },
                          transformOrigin: {
                            vertical: 'top',
                            horizontal: 'left',
                          },
                          PaperProps: {
                            style: {
                              maxHeight: 180,
                              maxWidth: 150,
                              overflow: 'auto',
                            },
                          },
                        }}
                      >
                        {lovData.map((option) => (
                          <MenuItem
                            key={option.value}
                            value={option.value}
                            sx={{
                              fontSize: '13px',
                              '&:hover': {
                                backgroundColor: '#cce5ff',
                              },
                              '&.Mui-selected': {
                                backgroundColor: '#e3f2fd',
                                '&:hover': {
                                  backgroundColor: '#cce5ff',
                                },
                              },
                              '&.Mui-focusVisible': {
                                backgroundColor: '#cce5ff',
                              },
                            }}
                          >
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    ) : (
                      <div
                        onClick={() => handleEdit(item.id, 'tsWriting')}
                        style={{
                          fontSize: '14px',
                          padding: '8px 0',
                          color: '#333',
                          minHeight: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          cursor: (isLocked || isMasterData || !item.isActive) ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {sanitizedTsWriting}
                      </div>
                    )}
                  </td>
                  {/* TS Review */}
                  <td style={{
                    padding: '6px 12px',
                    verticalAlign: 'top',
                    border: '1px solid #ddd',
                    opacity: item.isActive ? 1 : 0.6
                  }}>
                    {editingItem === item.id ? (
                      <Select
                        value={editValues.tsReview || ''}
                        onChange={(e) => handleEditFieldChange('tsReview', e.target.value)}
                        autoFocus={focusedField === 'tsReview'}
                        size="small"
                        disabled={isLocked}
                        style={{ width: '100%', fontSize: '14px' }}
                        displayEmpty
                        MenuProps={{
                          anchorOrigin: {
                            vertical: 'bottom',
                            horizontal: 'left',
                          },
                          transformOrigin: {
                            vertical: 'top',
                            horizontal: 'left',
                          },
                          PaperProps: {
                            style: {
                              maxHeight: 180,
                              maxWidth: 150,
                              overflow: 'auto',
                            },
                          },
                        }}
                      >
                        {lovData.map((option) => (
                          <MenuItem
                            key={option.value}
                            value={option.value}
                            sx={{
                              fontSize: '13px',
                              '&:hover': {
                                backgroundColor: '#cce5ff',
                              },
                              '&.Mui-selected': {
                                backgroundColor: '#e3f2fd',
                                '&:hover': {
                                  backgroundColor: '#cce5ff',
                                },
                              },
                              '&.Mui-focusVisible': {
                                backgroundColor: '#cce5ff',
                              },
                            }}
                          >
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    ) : (
                      <div
                        onClick={() => handleEdit(item.id, 'tsReview')}
                        style={{
                          fontSize: '14px',
                          padding: '8px 0',
                          color: '#333',
                          minHeight: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          cursor: (isLocked || isMasterData || !item.isActive) ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {sanitizedTsReview}
                      </div>
                    )}
                  </td>
                  {/* Code Development */}
                  <td style={{
                    padding: '6px 12px',
                    verticalAlign: 'top',
                    border: '1px solid #ddd',
                    opacity: item.isActive ? 1 : 0.6
                  }}>
                    {editingItem === item.id ? (
                      <Select
                        value={editValues.codeDevlopment || ''}
                        onChange={(e) => handleEditFieldChange('codeDevlopment', e.target.value)}
                        autoFocus={focusedField === 'codeDevlopment'}
                        size="small"
                        disabled={isLocked}
                        style={{ width: '100%', fontSize: '14px' }}
                        displayEmpty
                        MenuProps={{
                          anchorOrigin: {
                            vertical: 'bottom',
                            horizontal: 'left',
                          },
                          transformOrigin: {
                            vertical: 'top',
                            horizontal: 'left',
                          },
                          PaperProps: {
                            style: {
                              maxHeight: 180,
                              maxWidth: 150,
                              overflow: 'auto',
                            },
                          },
                        }}
                      >
                        {lovData.map((option) => (
                          <MenuItem
                            key={option.value}
                            value={option.value}
                            sx={{
                              fontSize: '13px',
                              '&:hover': {
                                backgroundColor: '#cce5ff',
                              },
                              '&.Mui-selected': {
                                backgroundColor: '#e3f2fd',
                                '&:hover': {
                                  backgroundColor: '#cce5ff',
                                },
                              },
                              '&.Mui-focusVisible': {
                                backgroundColor: '#cce5ff',
                              },
                            }}
                          >
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    ) : (
                      <div
                        onClick={() => handleEdit(item.id, 'codeDevlopment')}
                        style={{
                          fontSize: '14px',
                          padding: '8px 0',
                          color: '#333',
                          minHeight: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          cursor: (isLocked || isMasterData || !item.isActive) ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {sanitizedCodeDevlopment}
                      </div>
                    )}
                  </td>
                  {/* Code Review */}
                  <td style={{
                    padding: '6px 12px',
                    verticalAlign: 'top',
                    border: '1px solid #ddd',
                    opacity: item.isActive ? 1 : 0.6
                  }}>
                    {editingItem === item.id ? (
                      <Select
                        value={editValues.codeReview || ''}
                        onChange={(e) => handleEditFieldChange('codeReview', e.target.value)}
                        autoFocus={focusedField === 'codeReview'}
                        size="small"
                        disabled={isLocked}
                        style={{ width: '100%', fontSize: '14px' }}
                        displayEmpty
                        MenuProps={{
                          anchorOrigin: {
                            vertical: 'bottom',
                            horizontal: 'left',
                          },
                          transformOrigin: {
                            vertical: 'top',
                            horizontal: 'left',
                          },
                          PaperProps: {
                            style: {
                              maxHeight: 180,
                              maxWidth: 150,
                              overflow: 'auto',
                            },
                          },
                        }}
                      >
                        {lovData.map((option) => (
                          <MenuItem
                            key={option.value}
                            value={option.value}
                            sx={{
                              fontSize: '13px',
                              '&:hover': {
                                backgroundColor: '#cce5ff',
                              },
                              '&.Mui-selected': {
                                backgroundColor: '#e3f2fd',
                                '&:hover': {
                                  backgroundColor: '#cce5ff',
                                },
                              },
                              '&.Mui-focusVisible': {
                                backgroundColor: '#cce5ff',
                              },
                            }}
                          >
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    ) : (
                      <div
                        onClick={() => handleEdit(item.id, 'codeReview')}
                        style={{
                          fontSize: '14px',
                          padding: '8px 0',
                          color: '#333',
                          minHeight: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          cursor: (isLocked || isMasterData || !item.isActive) ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {sanitizedCodeReview}
                      </div>
                    )}
                  </td>
                  {/* Unit Testing */}
                  <td style={{
                    padding: '6px 12px',
                    verticalAlign: 'top',
                    border: '1px solid #ddd',
                    opacity: item.isActive ? 1 : 0.6
                  }}>
                    {editingItem === item.id ? (
                      <Select
                        value={editValues.unitTesting || ''}
                        onChange={(e) => handleEditFieldChange('unitTesting', e.target.value)}
                        autoFocus={focusedField === 'unitTesting'}
                        size="small"
                        disabled={isLocked}
                        style={{ width: '100%', fontSize: '14px' }}
                        displayEmpty
                        MenuProps={{
                          anchorOrigin: {
                            vertical: 'bottom',
                            horizontal: 'left',
                          },
                          transformOrigin: {
                            vertical: 'top',
                            horizontal: 'left',
                          },
                          PaperProps: {
                            style: {
                              maxHeight: 180,
                              maxWidth: 150,
                              overflow: 'auto',
                            },
                          },
                        }}
                      >
                        {lovData.map((option) => (
                          <MenuItem
                            key={option.value}
                            value={option.value}
                            sx={{
                              fontSize: '13px',
                              '&:hover': {
                                backgroundColor: '#cce5ff',
                              },
                              '&.Mui-selected': {
                                backgroundColor: '#e3f2fd',
                                '&:hover': {
                                  backgroundColor: '#cce5ff',
                                },
                              },
                              '&.Mui-focusVisible': {
                                backgroundColor: '#cce5ff',
                              },
                            }}
                          >
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    ) : (
                      <div
                        onClick={() => handleEdit(item.id, 'unitTesting')}
                        style={{
                          fontSize: '14px',
                          padding: '8px 0',
                          color: '#333',
                          minHeight: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          cursor: (isLocked || isMasterData || !item.isActive) ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {sanitizedUnitTesting}
                      </div>
                    )}
                  </td>
                  {/* Technical Support */}
                  <td style={{
                    padding: '6px 12px',
                    verticalAlign: 'top',
                    border: '1px solid #ddd',
                    opacity: item.isActive ? 1 : 0.6
                  }}>
                    {editingItem === item.id ? (
                      <Select
                        value={editValues.technicalSupport || ''}
                        onChange={(e) => handleEditFieldChange('technicalSupport', e.target.value)}
                        autoFocus={focusedField === 'technicalSupport'}
                        size="small"
                        disabled={isLocked}
                        style={{ width: '100%', fontSize: '14px' }}
                        displayEmpty
                        MenuProps={{
                          anchorOrigin: {
                            vertical: 'bottom',
                            horizontal: 'left',
                          },
                          transformOrigin: {
                            vertical: 'top',
                            horizontal: 'left',
                          },
                          PaperProps: {
                            style: {
                              maxHeight: 180,
                              maxWidth: 150,
                              overflow: 'auto',
                            },
                          },
                        }}
                      >
                        {lovData.map((option) => (
                          <MenuItem
                            key={option.value}
                            value={option.value}
                            sx={{
                              fontSize: '13px',
                              '&:hover': {
                                backgroundColor: '#cce5ff',
                              },
                              '&.Mui-selected': {
                                backgroundColor: '#e3f2fd',
                                '&:hover': {
                                  backgroundColor: '#cce5ff',
                                },
                              },
                              '&.Mui-focusVisible': {
                                backgroundColor: '#cce5ff',
                              },
                            }}
                          >
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    ) : (
                      <div
                        onClick={() => handleEdit(item.id, 'technicalSupport')}
                        style={{
                          fontSize: '14px',
                          padding: '8px 0',
                          color: '#333',
                          minHeight: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          cursor: (isLocked || isMasterData || !item.isActive) ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {sanitizedTechnicalSupport}
                      </div>
                    )}
                  </td>
                  {/* Migration Document Creation */}
                  <td style={{
                    padding: '6px 12px',
                    verticalAlign: 'top',
                    border: '1px solid #ddd',
                    opacity: item.isActive ? 1 : 0.6
                  }}>
                    {editingItem === item.id ? (
                      <Select
                        value={editValues.migrationDocCreation || ''}
                        onChange={(e) => handleEditFieldChange('migrationDocCreation', e.target.value)}
                        autoFocus={focusedField === 'migrationDocCreation'}
                        size="small"
                        disabled={isLocked}
                        style={{ width: '100%', fontSize: '14px' }}
                        displayEmpty
                        MenuProps={{
                          anchorOrigin: {
                            vertical: 'bottom',
                            horizontal: 'left',
                          },
                          transformOrigin: {
                            vertical: 'top',
                            horizontal: 'left',
                          },
                          PaperProps: {
                            style: {
                              maxHeight: 180,
                              maxWidth: 150,
                              overflow: 'auto',
                            },
                          },
                        }}
                      >
                        {lovData.map((option) => (
                          <MenuItem
                            key={option.value}
                            value={option.value}
                            sx={{
                              fontSize: '13px',
                              '&:hover': {
                                backgroundColor: '#cce5ff',
                              },
                              '&.Mui-selected': {
                                backgroundColor: '#e3f2fd',
                                '&:hover': {
                                  backgroundColor: '#cce5ff',
                                },
                              },
                              '&.Mui-focusVisible': {
                                backgroundColor: '#cce5ff',
                              },
                            }}
                          >
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    ) : (
                      <div
                        onClick={() => handleEdit(item.id, 'migrationDocCreation')}
                        style={{
                          fontSize: '14px',
                          padding: '8px 0',
                          color: '#333',
                          minHeight: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          cursor: (isLocked || isMasterData || !item.isActive) ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {sanitizedMigrationDocCreation}
                      </div>
                    )}
                  </td>
                  {/* Migration Effort */}
                  <td style={{
                    padding: '6px 12px',
                    verticalAlign: 'top',
                    border: '1px solid #ddd',
                    opacity: item.isActive ? 1 : 0.6
                  }}>
                    {editingItem === item.id ? (
                      <Select
                        value={editValues.migrationEffort || ''}
                        onChange={(e) => handleEditFieldChange('migrationEffort', e.target.value)}
                        autoFocus={focusedField === 'migrationEffort'}
                        size="small"
                        disabled={isLocked}
                        style={{ width: '100%', fontSize: '14px' }}
                        displayEmpty
                        MenuProps={{
                          anchorOrigin: {
                            vertical: 'bottom',
                            horizontal: 'left',
                          },
                          transformOrigin: {
                            vertical: 'top',
                            horizontal: 'left',
                          },
                          PaperProps: {
                            style: {
                              maxHeight: 180,
                              maxWidth: 150,
                              overflow: 'auto',
                            },
                          },
                        }}
                      >
                        {lovData.map((option) => (
                          <MenuItem
                            key={option.value}
                            value={option.value}
                            sx={{
                              fontSize: '13px',
                              '&:hover': {
                                backgroundColor: '#cce5ff',
                              },
                              '&.Mui-selected': {
                                backgroundColor: '#e3f2fd',
                                '&:hover': {
                                  backgroundColor: '#cce5ff',
                                },
                              },
                              '&.Mui-focusVisible': {
                                backgroundColor: '#cce5ff',
                              },
                            }}
                          >
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    ) : (
                      <div
                        onClick={() => handleEdit(item.id, 'migrationEffort')}
                        style={{
                          fontSize: '14px',
                          padding: '8px 0',
                          color: '#333',
                          minHeight: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          cursor: (isLocked || isMasterData || !item.isActive) ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {sanitizedMigrationEffort}
                      </div>
                    )}
                  </td>
                  {/* PGL Support */}
                  <td style={{
                    padding: '6px 12px',
                    verticalAlign: 'top',
                    border: '1px solid #ddd',
                    opacity: item.isActive ? 1 : 0.6
                  }}>
                    {editingItem === item.id ? (
                      <Select
                        value={editValues.pglSupport || ''}
                        onChange={(e) => handleEditFieldChange('pglSupport', e.target.value)}
                        autoFocus={focusedField === 'pglSupport'}
                        size="small"
                        disabled={isLocked}
                        style={{ width: '100%', fontSize: '14px' }}
                        displayEmpty
                        MenuProps={{
                          anchorOrigin: {
                            vertical: 'bottom',
                            horizontal: 'left',
                          },
                          transformOrigin: {
                            vertical: 'top',
                            horizontal: 'left',
                          },
                          PaperProps: {
                            style: {
                              maxHeight: 180,
                              maxWidth: 150,
                              overflow: 'auto',
                            },
                          },
                        }}
                      >
                        {lovData.map((option) => (
                          <MenuItem
                            key={option.value}
                            value={option.value}
                            sx={{
                              fontSize: '13px',
                              '&:hover': {
                                backgroundColor: '#cce5ff',
                              },
                              '&.Mui-selected': {
                                backgroundColor: '#e3f2fd',
                                '&:hover': {
                                  backgroundColor: '#cce5ff',
                                },
                              },
                              '&.Mui-focusVisible': {
                                backgroundColor: '#cce5ff',
                              },
                            }}
                          >
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    ) : (
                      <div
                        onClick={() => handleEdit(item.id, 'pglSupport')}
                        style={{
                          fontSize: '14px',
                          padding: '8px 0',
                          color: '#333',
                          minHeight: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          cursor: (isLocked || isMasterData || !item.isActive) ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {sanitizedPglSupport}
                      </div>
                    )}
                  </td>
                  {/* PMO Effort */}
                  <td style={{
                    padding: '6px 12px',
                    verticalAlign: 'top',
                    border: '1px solid #ddd',
                    opacity: item.isActive ? 1 : 0.6
                  }}>
                    {editingItem === item.id ? (
                      <Select
                        value={editValues.pmoEffort || ''}
                        onChange={(e) => handleEditFieldChange('pmoEffort', e.target.value)}
                        autoFocus={focusedField === 'pmoEffort'}
                        size="small"
                        disabled={isLocked}
                        style={{ width: '100%', fontSize: '14px' }}
                        displayEmpty
                        MenuProps={{
                          anchorOrigin: {
                            vertical: 'bottom',
                            horizontal: 'left',
                          },
                          transformOrigin: {
                            vertical: 'top',
                            horizontal: 'left',
                          },
                          PaperProps: {
                            style: {
                              maxHeight: 180,
                              maxWidth: 150,
                              overflow: 'auto',
                            },
                          },
                        }}
                      >
                        {lovData.map((option) => (
                          <MenuItem
                            key={option.value}
                            value={option.value}
                            sx={{
                              fontSize: '13px',
                              '&:hover': {
                                backgroundColor: '#cce5ff',
                              },
                              '&.Mui-selected': {
                                backgroundColor: '#e3f2fd',
                                '&:hover': {
                                  backgroundColor: '#cce5ff',
                                },
                              },
                              '&.Mui-focusVisible': {
                                backgroundColor: '#cce5ff',
                              },
                            }}
                          >
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    ) : (
                      <div
                        onClick={() => handleEdit(item.id, 'pmoEffort')}
                        style={{
                          fontSize: '14px',
                          padding: '8px 0',
                          color: '#333',
                          minHeight: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          cursor: (isLocked || isMasterData || !item.isActive) ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {sanitizedPmoEffort}
                      </div>
                    )}
                  </td>
                  <td style={{
                    padding: '6px 4px',
                    verticalAlign: 'middle',
                    textAlign: 'center',
                    border: '1px solid #ddd',
                    opacity: item.isActive ? 1 : 0.6
                  }}>
                    <div className="action-icons" style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
                      {editingItem === item.id ? (
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
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '4px' }}
                            title="Cancel"
                          >
                            <X size={16} />
                          </button>
                        </>
                      ) : item.onsite_offshore_id && item.isActive && (
                        <button
                          className="action-btn menu-btn"
                          disabled={isMasterData || isLocked}
                          onClick={() => handleEdit(item.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: (isMasterData || isLocked) ? 'not-allowed' : 'pointer',
                            color: (isMasterData || isLocked) ? '#ccc' : '#6b7280',
                            padding: '4px'
                          }}
                          title={isMasterData ? "Actions disabled while viewing master data" : isLocked ? "Cannot edit locked records" : "Edit"}
                        >
                          <MoreVertical size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                );
              });
            }, [data, editingItem, editValues, isLocked, isMasterData, focusedField])}
          </tbody>
        </table>
      </div>

      <div className="table-actions-bottom" style={{ display: 'flex', gap: '12px', marginTop: '16px', alignItems: 'center', marginLeft: '16px' }}>
        {!isDraftOrganization ? (
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={savingDraft || isLocked}
            style={{
              padding: '00px 24px',
              backgroundColor: (savingDraft || isLocked) ? '#6c757d' : '#3b82f6',
              color: 'white',
              border: 'none',
              height: "32px",
              borderRadius: '4px',
              width: "140px",
              cursor: (savingDraft || isLocked) ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              opacity: (savingDraft || isLocked) ? 0.6 : 1,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { if (!savingDraft && !isLocked) e.target.style.backgroundColor = '#2563eb'; }}
            onMouseLeave={(e) => { if (!savingDraft && !isLocked) e.target.style.backgroundColor = '#3b82f6'; }}
          >
            {savingDraft ? 'Saving Draft...' : 'Save Draft'}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={savingDraft || isLocked}
            style={{
              padding: '00px 24px',
              backgroundColor: (savingDraft || isLocked) ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              height: "32px",
              borderRadius: '4px',
              width: "140px",
              cursor: (savingDraft || isLocked) ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              opacity: (savingDraft || isLocked) ? 0.6 : 1,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => !savingDraft && !isLocked && (e.target.style.backgroundColor = '#218838')}
            onMouseLeave={(e) => !savingDraft && !isLocked && (e.target.style.backgroundColor = '#28a745')}
          >
            {savingDraft ? 'Submitting...' : 'Submit'}
          </button>
        )}
        <button
          onClick={saveActiveChanges}
          disabled={changedItems.size === 0 || savingActiveChanges}
          style={{
            backgroundColor: (changedItems.size === 0 || savingActiveChanges) ? '#6c757d' : '#28a745',
            color: 'white',
            border: 'none',
            height: '32px',
            padding: '0px 12px',
            borderRadius: '4px',
            cursor: (changedItems.size === 0 || savingActiveChanges) ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            transition: 'all 0.2s',
            width: '140px',
            opacity: (changedItems.size === 0 || savingActiveChanges) ? 0.6 : 1,
          }}
          onMouseEnter={(e) => {
            if (changedItems.size > 0 && !savingActiveChanges) {
              e.target.style.backgroundColor = '#218838';
            }
          }}
          onMouseLeave={(e) => {
            if (changedItems.size > 0 && !savingActiveChanges) {
              e.target.style.backgroundColor = '#28a745';
            }
          }}
        >
          {savingActiveChanges ? 'Saving...' : 'Save Changes'}
        </button>
        <button
          onClick={handleLockUnlock}
          disabled={savingDraft || isMasterData || lockingUnlocking}
          style={{
            backgroundColor: isLocked ? '#dc3545' : '#17a2b8',
            color: 'white',
            border: 'none',
            height: '32px',
            width: "140px",
            padding: '0px 12px',
            borderRadius: '4px',
            cursor: (savingDraft || isMasterData || lockingUnlocking) ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            opacity: (savingDraft || isMasterData || lockingUnlocking) ? 0.6 : 1,
            transition: 'all 0.2s',
            marginLeft: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
          onMouseEnter={(e) => {
            if (!savingDraft && !isMasterData && !lockingUnlocking) {
              e.target.style.backgroundColor = isLocked ? '#c82333' : '#156a8a';
            }
          }}
          onMouseLeave={(e) => {
            if (!savingDraft && !isMasterData && !lockingUnlocking) {
              e.target.style.backgroundColor = isLocked ? '#dc3545' : '#17a2b8';
            }
          }}
          title={isLocked ? 'Unlock editing' : 'Lock editing'}
        >
          {lockingUnlocking ? (
            <div style={{
              width: '16px',
              height: '16px',
              border: '2px solid white',
              borderTop: '2px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
          ) : (
            <>{isLocked ? <Unlock size={16} /> : <Lock size={16} />}</>
          )}
          {lockingUnlocking ? (isLocked ? 'Unlocking...' : 'Locking...') : (isLocked ? 'Unlock' : 'Lock')}
        </button>
      </div>

      {showNoProjectSelectedPopup && (
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
          zIndex: 2000
        }}>
          <div style={{
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

      <div style={{ height: '20px' }}></div>

      <style>{`
        .help-modal-scroll::-webkit-scrollbar { width: 4px; }
        .help-modal-scroll::-webkit-scrollbar-track { background: transparent; margin: 8px 0; }
        .help-modal-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .help-modal-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
    <SessionExpiredPopup />
    </>
  );
};

export default RicewOnsiteOffshoreTaskMap;