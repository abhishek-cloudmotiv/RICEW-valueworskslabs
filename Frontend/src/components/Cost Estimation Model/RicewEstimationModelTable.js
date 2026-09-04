import React, { useState, useEffect, useRef, useMemo, Fragment } from 'react';
import SessionExpiredPopup from '../SessionExpiredPopup';
import { Edit, Trash2, X, Save, MoreVertical, Lock, Unlock, HelpCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TextField, MenuItem, Select, FormControl } from '@mui/material';
import DOMPurify from 'dompurify';
import useLOV from '../../hooks/useLOV';
import { getIdToken } from '../../utils/cognito-auth';
import { useSession } from '../../context/SessionContext';
import Loader from '../../utils/Loader';

// Custom Organization Autocomplete Component with wider width
const WideOrganizationAutocomplete = ({
  value,
  onChange,
  options,
  error = false,
  width = '260px'
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
  const previousValueRef = useRef(value);

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
      if (matchingOption.value !== value) {
        onChange(matchingOption.value);
      }
    } else if (capitalizedVal === '' || capitalizedVal.trim() === '') {
      if (value !== '') {
        onChange('');
      }
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


const RicewEstimationModelTable = ({ onClose, selectedProject, setUnsavedChangesChecker }) => {
  const navigate = useNavigate();
  const { handleAuthError, userId, projectId, projectName } = useSession();
  const [showNoProjectSelectedPopup, setShowNoProjectSelectedPopup] = useState(false);
  const [data, setData] = useState([]);
  const [isSaved, setIsSaved] = useState(false);
  const [changedItems, setChangedItems] = useState(new Set());
  const [isFirstSave, setIsFirstSave] = useState(true);
  const [savedItemIds, setSavedItemIds] = useState(new Set());
  const [hasNewRow, setHasNewRow] = useState(false);
  const [hasActiveChanges, setHasActiveChanges] = useState(false);
  const [savingActiveChanges, setSavingActiveChanges] = useState(false);

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

  const [editingItem, setEditingItem] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [focusedField, setFocusedField] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);
  const helpPopupRef = useRef(null);
  const [editingFields, setEditingFields] = useState({}); // Track which fields are being edited

  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState('');


  // Draft functionality
  const [isDraftOrganization, setIsDraftOrganization] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  // Lock/Unlock functionality
  const [isLocked, setIsLocked] = useState(false);
  const [showHelpPopup, setShowHelpPopup] = useState(false);

  // Global organization selection
  const [selectedOrganization, setSelectedOrganization] = useState('');
  const [selectedServiceLine, setSelectedServiceLine] = useState('');
  const [serviceLineOptions, setServiceLineOptions] = useState([]);

  // Get consistent project_id
  const currentProjectId = projectId || selectedProject?.id || '';

  // Fetch organization options
  const { options: organizationOptions } = useLOV(
    `https://tfv4q9mq6g.execute-api.ap-south-1.amazonaws.com/New/ricew/resourceRateCard/LOV/si-organization-details?project_id=${currentProjectId}`,
    'SI_Organization_Details_id',
    'SI_organization_name'
  );

  // Auto-select organization if only one option exists
  useEffect(() => {
    if (!selectedOrganization && organizationOptions && organizationOptions.length === 1) {
      setSelectedOrganization(organizationOptions[0].value);
    }
  }, [organizationOptions, selectedOrganization]);

  // Update service line options when organization is selected
  useEffect(() => {
    if (selectedOrganization && organizationOptions.length > 0) {
      const selectedOrg = organizationOptions.find(opt => opt.value === selectedOrganization);

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
        if (selectedServiceLine && !blOptions.some(opt => opt.value === selectedServiceLine)) {
          setSelectedServiceLine('');
        }
      } else if (selectedOrg && selectedOrg.Process_Service_Val_Array) {
        const blOptions = selectedOrg.Process_Service_Val_Array.map(bl => ({
          value: bl,
          label: bl
        }));
        setServiceLineOptions(blOptions);

        // Clear selected service line if it's not in the new options
        if (selectedServiceLine && !selectedOrg.Process_Service_Val_Array.includes(selectedServiceLine)) {
          setSelectedServiceLine('');
        }
      } else {
        setServiceLineOptions([]);
        setSelectedServiceLine('');
      }
    } else {
      setServiceLineOptions([]);
      setSelectedServiceLine('');
    }
  }, [selectedOrganization, organizationOptions]);

  const isSelectionComplete = (() => {
    return (selectedOrganization && selectedOrganization.trim() !== '') &&
      (selectedServiceLine && selectedServiceLine.trim() !== '');
  })();


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
      /* Commented out for now as per user request
      showConfirmation(
        'You have unsaved changes. Do you want to discard them and continue?',
        () => {
      */
      setEditingItem(null);
      setEditValues({});
      callback();
      /*
        }
      );
      */
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
      fsWriting: '40',
      fsReview: '10',
      tsWriting: '35',
      tsReview: '8',
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
      projectId: currentProjectId
    },
    {
      id: 2,
      ricewName: 'Module Configuration',
      complexity: 'Medium',
      isActive: true,
      fsWriting: '20',
      fsReview: '5',
      tsWriting: '18',
      tsReview: '4',
      codeDevlopment: '30',
      codeReview: '8',
      unitTesting: '10',
      technicalSupport: '6',
      migrationDocCreation: '4',
      migrationEffort: '8',
      pglSupport: '5',
      pmoEffort: '3',
      contingency: '5',
      totalHours: '126',
      projectId: currentProjectId
    },
  ];

  // Reset selection when project changes
  useEffect(() => {
    setSelectedOrganization('');
    setSelectedServiceLine('');
  }, [selectedProject?.id, projectId]);

  useEffect(() => {
    if (!selectedProject?.id && !projectId) {
      setShowNoProjectSelectedPopup(true);
      return;
    }

    if (isSelectionComplete) {
      loadData();
    } else {
      setData([]);
      setOriginalData([]);
      setIsDraftOrganization(false);
      setIsLocked(false);
    }
  }, [selectedProject?.id, projectId, isSelectionComplete, selectedOrganization, selectedServiceLine]);

  // Provide unsaved changes checker to parent component
  useEffect(() => {
    if (setUnsavedChangesChecker) {
      // Wrap in another function to properly set state to a function value
      setUnsavedChangesChecker(() => () => {
        let isEditingActive = false;
        if (editingItem !== null) {
          const originalItem = originalData.find(o => o.id === editingItem);
          const fieldsToCompare = [
            'ricewName', 'complexity', 'contingency', 'fsWriting', 'fsReview',
            'tsWriting', 'tsReview', 'codeDevlopment', 'codeReview', 'unitTesting',
            'technicalSupport', 'migrationDocCreation', 'migrationEffort',
            'pglSupport', 'pmoEffort', 'isActive'
          ];
          isEditingActive = !originalItem || fieldsToCompare.some(field => {
            const currentVal = editValues[field] !== undefined ? editValues[field] : '';
            const originalVal = originalItem[field] !== undefined ? originalItem[field] : '';
            return String(currentVal) !== String(originalVal);
          });
        }
        return hasNewRow || changedItems.size > 0 || isEditingActive || hasActiveChanges;
      });
    }
  }, [hasNewRow, changedItems, editingItem, editValues, hasActiveChanges, originalData, setUnsavedChangesChecker]);

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

  // Click away to save editing row
  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (editingItem === null) return;

      // Check if click is outside the editing row
      const editedRow = document.querySelector(`tr[data-row-id="${editingItem}"]`);
      if (editedRow && !editedRow.contains(e.target)) {
        // Find the item to check if it's new
        const item = data.find(d => d.id === editingItem);
        if (item) {
          if (item.isNew) {
            handleSaveAll();
          } else {
            handleSaveEdit(editingItem);
          }
        }
      }
    };

    if (editingItem !== null) {
      document.addEventListener('mousedown', handleGlobalClick);
      return () => document.removeEventListener('mousedown', handleGlobalClick);
    }
  }, [editingItem, editValues, data]);

  const handleCopyFromMaster = async () => {
    try {
      setLoading(true);
      const currentProjectId = projectId || selectedProject?.id || '';
      const org = organizationOptions.find(o => o.value === selectedOrganization);
      const orgName = org ? org.label : selectedOrganization;

      const payload = {
        organization_id: selectedOrganization,
        organization_name: orgName,
        user_id: userId,
        project_id: currentProjectId.toString(),
        created_by: userId,
        Service_Line_name: selectedServiceLine
      };

      console.log('Calling copyFromMaster API with payload:', payload);

      let idToken = null;
      try {
        idToken = await getIdToken();
      } catch (tokenError) {
        console.error('Failed to get ID token for copyFromMaster:', tokenError);
      }

      const headers = {
        'Content-Type': 'application/json',
      };

      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      const response = await fetch('https://jlkchl84ba.execute-api.ap-south-1.amazonaws.com/New/ricew/Master/estimationModel/copyFromMaster', {
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
        console.log('Successfully copied from master:', result);
        // Wait a small bit for DB consistency before reloading
        await new Promise(resolve => setTimeout(resolve, 500));
        await loadData(true);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to copy from master:', errorData);
        setErrorMessage(errorData.error || 'Failed to initialize data from master template');
        setShowErrorMessage(true);
        // If copy fails, still clear loading
        setLoading(false);
      }
    } catch (error) {
      console.error('Error in handleCopyFromMaster:', error);
      setErrorMessage('Error initializing data. Please try again.');
      setShowErrorMessage(true);
      setLoading(false);
    }
  };

  const loadData = async (skipCopy = false) => {
    const currentProjectId = projectId || selectedProject?.id || '';

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

      const response = await fetch(`https://jlkchl84ba.execute-api.ap-south-1.amazonaws.com/New/newApi/ricew/estimationModel/getByProject?project_id=${currentProjectId}&organization_id=${encodeURIComponent(selectedOrganization)}&Service_Line_name=${encodeURIComponent(selectedServiceLine)}`, {
        method: 'GET',
        headers: headers
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        return;
      }

      if (response.ok) {
        const result = await response.json();
        console.log('Fetched RICEW estimation model data:', result);

        const apiData = result.success && Array.isArray(result.data) ? result.data : [];

        if (apiData.length === 0 && !skipCopy) {
          console.log('No data found for this selection, attempting to copy from master...');
          await handleCopyFromMaster();
          return;
        }

        const transformedData = apiData.map((item, index) => ({
          id: index + 1,
          ricewName: item.Estimation_Name || '',
          complexity: item.ComplexityType || '',
          estimation_model_id: item.RICEW_Estimation_Model_id || null,
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
          contingency: (item.Contigency || '').replace('%', ''),
          totalHours: item.Total_Hours || '',
          projectId: currentProjectId.toString(),
          isNew: false,
          system_default: item.system_default || "false",
          saveDraft: item.saveDraft || "false",
          isLockedField: item.isLocked || "false"
        }));


        // Check if any record has saveDraft === "true"
        const hasDraftRecords = transformedData.some(item =>
          item.saveDraft === "true" || item.saveDraft === true
        );
        setIsDraftOrganization(hasDraftRecords);

        // Check if any record has isLocked === "true"
        const isTableLocked = transformedData.some(item =>
          item.isLockedField === "true" || item.isLockedField === true
        );
        setIsLocked(isTableLocked);

        setData(transformedData);
        setOriginalData(transformedData.map(item => ({ ...item })));
        console.log('RICEW estimation model data loaded successfully');
      } else {
        console.error('Failed to fetch data');
        setErrorMessage('Failed to load estimation model data');
        setShowErrorMessage(true);
      }
    } catch (error) {
      console.error('Error fetching RICEW estimation model data:', error);
      setErrorMessage('Error loading estimation model data');
      setShowErrorMessage(true);
    } finally {
      setLoading(false);
    }
  };

  // Handle Save Draft functionality
  const handleSaveDraft = () => {
    checkUnsavedChanges(async () => {
      try {
        setSavingDraft(true);
        const currentProjectId = projectId || selectedProject?.id || '101';

        const payload = {
          project_id: currentProjectId.toString(),
          organization_id: selectedOrganization,
          Service_Line_name: selectedServiceLine,
          saveDraft: "true",
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

        const response = await fetch('https://jlkchl84ba.execute-api.ap-south-1.amazonaws.com/New/newApi/ricew/estimationModel/updateSaveDraft/byProject', {
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
          setSuccessMessage(result.message || 'Estimation models set to draft successfully!');
          setShowSuccessMessage(true);
          setTimeout(() => {
            setShowSuccessMessage(false);
            setSuccessMessage('');
          }, 3000);

          // Clear any unsaved changes tracking
          setChangedItems(new Set());
          setHasNewRow(false);
          setEditingFields({});
          setHasActiveChanges(false);

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
      try {
        setLoading(true);
        const newLockedState = !isLocked;
        const currentProjectId = projectId || selectedProject?.id || '101';

        const payload = {
          project_id: currentProjectId.toString(),
          organization_id: selectedOrganization,
          Service_Line_name: selectedServiceLine,
          isLocked: newLockedState ? "true" : "false",
          updated_by: userId
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

        const response = await fetch('https://jlkchl84ba.execute-api.ap-south-1.amazonaws.com/New/newApi/ricew/estimationModel/updateLocked/byProject', {
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
        setLoading(false);
      }
    });
  };

  const loadFromLocalStorage = (storageKey) => {
    const savedData = localStorage.getItem(storageKey);

    if (savedData) {
      const parsedData = JSON.parse(savedData);
      setData(parsedData);
      const hasBackendData = parsedData.some(item => item.estimation_model_id !== null && item.estimation_model_id !== undefined);
      setOriginalData(parsedData.map(item => ({ ...item })));
      setDataFromBackend(hasBackendData);
    } else {
      const defaultData = getDefaultData().map(item => ({ ...item, estimation_model_id: null }));
      setData(defaultData);
      setDataFromBackend(false);
      localStorage.setItem(storageKey, JSON.stringify(defaultData));
    }
  };

  const saveToLocalStorage = (updatedData) => {
    const currentProjectId = projectId || selectedProject?.id || '101';
    const storageKey = `ricewEstimationModelData_${currentProjectId}`;
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

  const calculateTotalHours = (item) => {
    // Step 1: Calculate Base Effort
    // Helper function to safely parse float values
    const safeParseFloat = (val) => {
      const parsed = parseFloat(val);
      return isNaN(parsed) ? 0 : parsed;
    };

    const fs_writing = safeParseFloat(item.fsWriting);
    const fs_review = safeParseFloat(item.fsReview);
    const ts_writing = safeParseFloat(item.tsWriting);
    const ts_review = safeParseFloat(item.tsReview);
    const code_dev = safeParseFloat(item.codeDevlopment);
    const code_review = safeParseFloat(item.codeReview);
    const unit_testing = safeParseFloat(item.unitTesting);
    const tech_support = safeParseFloat(item.technicalSupport);
    const migration_doc = safeParseFloat(item.migrationDocCreation);
    const migration_effort = safeParseFloat(item.migrationEffort);
    const pgl_support = safeParseFloat(item.pglSupport);
    const pmo_effort = safeParseFloat(item.pmoEffort);

    let baseEffort = fs_writing + fs_review + ts_writing + ts_review + code_dev + code_review + unit_testing + tech_support + migration_doc + migration_effort + pgl_support + pmo_effort;

    // Step 2: Calculate Total Hours (including contingency and rounding)
    // Note: Contingency is assumed to be an integer percentage (e.g., 10, 15)
    let contingencyFactor = (1 + (parseFloat(item.contingency || 0) / 100));
    let totalHoursFloat = baseEffort * contingencyFactor;
    let totalHours = Math.round(totalHoursFloat); // Use Math.round() for integer rounding

    return totalHours;
  };

  const handleFieldChange = (fieldName, value, id) => {
    if (editingItem !== null && editingItem !== id) {
      showConfirmation(
        'You have unsaved changes. Do you want to discard them and continue?',
        () => {
          setEditingItem(null);
          setEditValues({});
          handleFieldChange(fieldName, value, id);
        }
      );
      return;
    }

    // Special handling for boolean fields
    if (fieldName === 'isActive') {
      setData(prevData => {
        const updatedData = prevData.map(item =>
          item.id === id ? { ...item, isActive: value } : item
        );

        // Check if there are any active status changes
        const hasAnyActiveChanges = updatedData.some(item => item.isActive !== item.originalActive);
        setHasActiveChanges(hasAnyActiveChanges);

        return updatedData;
      });
      return;
    }

    // Auto-capitalize based on field type
    let capitalizedValue;
    if (fieldName === 'ricewName') {
      capitalizedValue = value.charAt(0).toUpperCase() + value.slice(1);
    } else if (fieldName === 'contingency') {
      // Allow decimal numbers for contingency
      capitalizedValue = value.replace(/[^0-9.]/g, '');
      // Ensure only one decimal point
      const parts = capitalizedValue.split('.');
      if (parts.length > 2) {
        capitalizedValue = parts[0] + '.' + parts.slice(1).join('');
      }
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
    } else if (fieldName === 'contingency') {
      // Allow decimal numbers for contingency
      capitalizedValue = value.replace(/[^0-9.]/g, '');
      // Ensure only one decimal point
      const parts = capitalizedValue.split('.');
      if (parts.length > 2) {
        capitalizedValue = parts[0] + '.' + parts.slice(1).join('');
      }
    } else if (['fsWriting', 'fsReview', 'tsWriting', 'tsReview', 'codeDevlopment', 'codeReview', 'unitTesting', 'technicalSupport', 'migrationDocCreation', 'migrationEffort', 'pglSupport', 'pmoEffort', 'totalHours'].includes(fieldName)) {
      // Only allow numeric input for these fields
      capitalizedValue = value.replace(/[^0-9]/g, '');
    } else {
      capitalizedValue = value;
    }

    setEditValues(prevValues => {
      const newValues = { ...prevValues, [fieldName]: capitalizedValue };
      // Auto-calculate Total Hours when any effort field changes
      if (['fsWriting', 'fsReview', 'tsWriting', 'tsReview', 'codeDevlopment', 'codeReview', 'unitTesting', 'technicalSupport', 'migrationDocCreation', 'migrationEffort', 'pglSupport', 'pmoEffort', 'contingency'].includes(fieldName)) {
        newValues.totalHours = calculateTotalHours(newValues);
      }
      return newValues;
    });
  };

  const handleInlineEdit = (id, field, value) => {
    // Restrict updates when table is locked
    if (isLocked) {
      setErrorMessage('Cannot edit records while table is locked. Please unlock the table first.');
      setShowErrorMessage(true);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 5000);
      return;
    }

    const item = data.find(d => d.id === id);

    if (isSaved && !item.isNew) return;

    // Validate input based on field type
    if (field === 'ricewName') {
      if (!validateRicewName(value)) {
        return;
      }
    } else if (field === 'contingency') {
      if (value && !validateNumericField(value)) {
        return;
      }
    } else if (['fsWriting', 'fsReview', 'tsWriting', 'tsReview', 'codeDevlopment', 'codeReview', 'unitTesting', 'technicalSupport', 'migrationDocCreation', 'migrationEffort', 'pglSupport', 'pmoEffort', 'totalHours'].includes(field)) {
      if (value && !validateIntegerField(value)) {
        return;
      }
    }

    const updatedData = data.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        // Auto-calculate Total Hours when any effort field changes
        if (['fsWriting', 'fsReview', 'tsWriting', 'tsReview', 'codeDevlopment', 'codeReview', 'unitTesting', 'technicalSupport', 'migrationDocCreation', 'migrationEffort', 'pglSupport', 'pmoEffort', 'contingency'].includes(field)) {
          updatedItem.totalHours = calculateTotalHours(updatedItem);
        }
        return updatedItem;
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
    // Restrict updates when table is locked
    if (isLocked) {
      setErrorMessage('Cannot edit records while table is locked. Please unlock the table first.');
      setShowErrorMessage(true);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 5000);
      return;
    }

    // Store the field that was clicked for potential focus
    if (fieldName) {
      // We'll use this to set autoFocus on the correct input
      setFocusedField(fieldName);
    }

    // If already editing this item, do nothing
    if (editingItem === id) return;

    const item = data.find(d => d.id === id);
    if (item) {
      // Check if another item is already being edited
      if (editingItem !== null && editingItem !== id) {
        /* Commented out for now as per user request
        showConfirmation(
          'You have unsaved changes. Do you want to discard them and edit another record?',
          () => {
        */
        // User confirmed, proceed to edit the new item
        setIsSaved(false);
        setEditingItem(id);
        setEditValues({
          ricewName: item.ricewName,
          complexity: item.complexity,
          isActive: item.isActive,
          contingency: item.contingency,
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

        // Auto-scroll to show the edited row
        setTimeout(() => {
          const editedRow = document.querySelector(`tr[data-row-id="${id}"]`);
          if (editedRow) {
            editedRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
        /*
          }
        );
        */
      } else if (hasNewRow) {
        /* Commented out for now as per user request
        showConfirmation(
          'You have unsaved changes. Do you want to continue?',
          () => {
        */
        // User clicked Yes - discard the unsaved row and proceed with edit
        const savedData = data.filter(row => !row.isNew);
        setData(savedData);
        setHasNewRow(false);
        setChangedItems(new Set());

        // Now set the edit mode
        setIsSaved(false);
        setEditingItem(id);
        setEditValues({
          ricewName: item.ricewName,
          complexity: item.complexity,
          isActive: item.isActive,
          contingency: item.contingency,
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

        // Auto-scroll to show the edited row
        setTimeout(() => {
          const editedRow = document.querySelector(`tr[data-row-id="${id}"]`);
          if (editedRow) {
            editedRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
        /*
          }
        );
        */
      } else {
        // No unsaved changes, proceed normally
        setIsSaved(false);
        setEditingItem(id);
        setEditValues({
          ricewName: item.ricewName,
          complexity: item.complexity,
          isActive: item.isActive,
          contingency: item.contingency,
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

        // Auto-scroll to show the edited row
        setTimeout(() => {
          const editedRow = document.querySelector(`tr[data-row-id="${id}"]`);
          if (editedRow) {
            editedRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
    }
  };

  const handleSaveEdit = async (id) => {
    try {
      const item = data.find(d => d.id === id);
      if (!item) return;

      const updatedItem = {
        ...item,
        ricewName: editValues.ricewName !== undefined ? editValues.ricewName : item.ricewName,
        complexity: editValues.complexity !== undefined ? editValues.complexity : item.complexity,
        contingency: editValues.contingency !== undefined ? editValues.contingency : item.contingency,
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
        pmoEffort: editValues.pmoEffort !== undefined ? editValues.pmoEffort : item.pmoEffort,
        totalHours: calculateTotalHours(editValues), // Auto-calculate Total Hours
        isActive: editValues.isActive !== undefined ? editValues.isActive : item.isActive,
      };

      const updatedData = data.map(d => d.id === id ? updatedItem : d);
      setData(updatedData);
      saveToLocalStorage(updatedData);

      // Compare with original data to determine if there are actual changes
      const originalItem = originalData.find(orig => orig.id === id);
      const fieldsToCompare = [
        'ricewName', 'complexity', 'contingency', 'fsWriting', 'fsReview',
        'tsWriting', 'tsReview', 'codeDevlopment', 'codeReview', 'unitTesting',
        'technicalSupport', 'migrationDocCreation', 'migrationEffort',
        'pglSupport', 'pmoEffort', 'isActive'
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

    } catch (error) {
      console.error('Error in handleSaveEdit:', error);
      setErrorMessage('Error updating record locally. Please try again.');
      setShowErrorMessage(true);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 5000);
    }
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditValues({});
    setFocusedField(null);
  };

  const saveActiveChanges = () => {
    checkUnsavedChanges(async () => {
      setSavingActiveChanges(true);
      try {
        let idToken = null;
        try {
          idToken = await getIdToken();
        } catch (tokenError) {
          console.error('Failed to get ID token for saveActiveChanges:', tokenError);
        }

        const headers = {
          'Content-Type': 'application/json',
        };

        if (idToken) {
          headers['Authorization'] = `Bearer ${idToken}`;
        }

        const currentProjectId = projectId || selectedProject?.id || '101';
        let dataSaved = true;
        let statusSaved = true;

        // 1. Save Record Data Changes (items in changedItems)
        if (changedItems.size > 0) {
          const dataPayloads = Array.from(changedItems).map(id => {
            const item = data.find(d => d.id === id);
            return {
              RICEW_Estimation_Model_id: item.estimation_model_id,
              updated_by: userId,
              Contigency: item.contingency,
              FS_Writing: item.fsWriting,
              FS_Review: item.fsReview,
              TS_Writing: item.tsWriting,
              TS_Review: item.tsReview,
              Code_Development: item.codeDevlopment,
              Code_Review: item.codeReview,
              Unit_Testing: item.unitTesting,
              Technical_Support: item.technicalSupport,
              Migration_Document_Creation: item.migrationDocCreation,
              Migration_Effort: item.migrationEffort,
              PGL_Support: item.pglSupport,
              PMO_Effort: item.pmoEffort,
              Total_Hours: item.totalHours,
              ActiveStatus: item.isActive ? "true" : "false"
            };
          }).filter(payload => payload.RICEW_Estimation_Model_id); // Only include items with an ID (not new unsaved items)

          if (dataPayloads.length > 0) {
            const dataResponse = await fetch('https://jlkchl84ba.execute-api.ap-south-1.amazonaws.com/New/newApi/ricew/estimationModel/multiRecord/updateCascade', {
              method: 'POST',
              headers: headers,
              body: JSON.stringify(dataPayloads)
            });
            if (dataResponse.status === 401 || dataResponse.status === 403) {
              handleAuthError('Unauthorized - session expired');
              return;
            }
            if (!dataResponse.ok) dataSaved = false;
          }
        }

        // 2. Save Active Status Changes
        const changedActiveItems = data.filter(item => item.isActive !== item.originalActive);
        if (changedActiveItems.length > 0) {
          const statusRecords = changedActiveItems.map(item => ({
            RICEW_Estimation_Model_id: item.estimation_model_id,
            ActiveStatus: item.isActive ? "true" : "false"
          })).filter(r => r.RICEW_Estimation_Model_id);

          if (statusRecords.length > 0) {
            const statusPayload = {
              records: statusRecords,
              updated_by: userId,
              project_id: currentProjectId.toString(),
              organization_id: selectedOrganization,
              Service_Line_name: selectedServiceLine
            };

            const statusResponse = await fetch('https://jlkchl84ba.execute-api.ap-south-1.amazonaws.com/New/newApi/ricew/estimationModel/updateStatusOnlyCascade', {
              method: 'POST',
              headers: headers,
              body: JSON.stringify(statusPayload)
            });
            if (statusResponse.status === 401 || statusResponse.status === 403) {
              handleAuthError('Unauthorized - session expired');
              return;
            }
            if (!statusResponse.ok) statusSaved = false;
          }
        }

        if (dataSaved && statusSaved) {
          // Update original data to match current
          const updatedWithOriginals = data.map(item => ({
            ...item,
            originalActive: item.isActive
          }));
          setData(updatedWithOriginals);
          setOriginalData(updatedWithOriginals.map(item => ({ ...item })));
          setHasActiveChanges(false);
          setChangedItems(new Set());
          saveToLocalStorage(updatedWithOriginals);

          // Reload data from backend to ensure synchronization
          await loadData(true);

          setSuccessMessage('All changes saved successfully!');
          setShowSuccessMessage(true);
          setTimeout(() => {
            setShowSuccessMessage(false);
            setSuccessMessage('');
          }, 3000);
        } else {
          throw new Error('Some changes failed to save. Please try again.');
        }

      } catch (error) {
        console.error('Error saving changes:', error);
        setErrorMessage(error.message || 'Error saving changes. Please try again.');
        setShowErrorMessage(true);
        setTimeout(() => {
          setShowErrorMessage(false);
          setErrorMessage('');
        }, 5000);
      } finally {
        setSavingActiveChanges(false);
      }
    });
  };

  const handleKeyDown = (e, id) => {
    if (e.key === 'Enter') {
      const item = data.find(item => item.id === id);
      if (item && item.isNew) {
        handleSaveAll();
      } else {
        handleSaveEdit(id);
      }
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleSaveAll = async () => {
    console.log('Save All button clicked');

    // Check for validation errors before saving
    const hasValidationErrors = Object.values(validationErrors).some(error => error !== undefined);
    if (hasValidationErrors) {
      setErrorMessage('Please fix validation errors before saving.');
      setShowErrorMessage(true);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 5000);
      return;
    }

    // Validate all fields
    const invalidItems = data.filter(item =>
      !validateRicewName(item.ricewName)
    );
    if (invalidItems.length > 0) {
      setErrorMessage('Please check all fields for valid formats.');
      setShowErrorMessage(true);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 5000);
      return;
    }

    // Check if there are new items that need validation
    const newItems = data.filter(item =>
      item.isNew
    );

    // Validate required fields for new items
    if (newItems.length > 0) {
      for (const newItem of newItems) {
        const requiredFields = [
          { field: 'ricewName', name: 'RICEW Name', value: newItem.ricewName }
        ];

        const missingFields = requiredFields.filter(field => {
          const value = field.value;
          return !value || (typeof value === 'string' && value.trim() === '');
        });

        if (missingFields.length > 0) {
          const fieldNames = missingFields.map(field => field.name).join(', ');
          setErrorMessage(`Cannot save estimation model. Please fill in the following required fields: ${fieldNames}`);
          setShowErrorMessage(true);
          setTimeout(() => {
            setShowErrorMessage(false);
            setErrorMessage('');
          }, 5000);
          return;
        }
      }
    }

    try {
      setLoading(true);
      const currentProjectId = projectId || selectedProject?.id || '101';

      // Separate new items from changed items
      const changedSystemItems = data.filter(item =>
        changedItems.has(item.id) &&
        item.estimation_model_id
      );

      // Update changed items
      for (const item of changedSystemItems) {
        const payload = {
          RICEW_Estimation_Model_Id: item.estimation_model_id,
          RICEW_Name: item.ricewName,
          Complexity: item.complexity,
          FS_Writing: item.fsWriting,
          FS_Review: item.fsReview,
          TS_Writing: item.tsWriting,
          TS_Review: item.tsReview,
          Code_Development: item.codeDevlopment,
          Code_Review: item.codeReview,
          Unit_Testing: item.unitTesting,
          Technical_Support: item.technicalSupport,
          Migration_Doc_Creation: item.migrationDocCreation,
          Migration_Effort: item.migrationEffort,
          PGL_Support: item.pglSupport,
          PMO_Effort: item.pmoEffort,
          Contingency: item.contingency + '%',
          Total_Hours: calculateTotalHours(item),
          updated_by: userId
        };

        let idToken = null;
        try {
          idToken = await getIdToken();
        } catch (tokenError) {
          console.error('Failed to get ID token for handleSaveAll update:', tokenError);
        }

        const headers = {
          'Content-Type': 'application/json',
        };

        if (idToken) {
          headers['Authorization'] = `Bearer ${idToken}`;
        }

        const updateResponse = await fetch('https://047kqyev3f.execute-api.ap-south-1.amazonaws.com/New/api/cost-estimation/ricew-estimation-model/update', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(payload)
        });
        if (updateResponse.status === 401 || updateResponse.status === 403) {
          handleAuthError('Unauthorized - session expired');
          return;
        }
      }

      // Save new items
      if (newItems.length > 0) {
        for (const item of newItems) {
          const itemData = {
            RICEW_Name: item.ricewName,
            Complexity: item.complexity,
            FS_Writing: item.fsWriting,
            FS_Review: item.fsReview,
            TS_Writing: item.tsWriting,
            TS_Review: item.tsReview,
            Code_Development: item.codeDevlopment,
            Code_Review: item.codeReview,
            Unit_Testing: item.unitTesting,
            Technical_Support: item.technicalSupport,
            Migration_Doc_Creation: item.migrationDocCreation,
            Migration_Effort: item.migrationEffort,
            PGL_Support: item.pglSupport,
            PMO_Effort: item.pmoEffort,
            Contingency: item.contingency,
            Total_Hours: calculateTotalHours(item),
            project_id: currentProjectId.toString(),
            user_id: userId,
            created_by: userId
          };

          let idToken = null;
          try {
            idToken = await getIdToken();
          } catch (tokenError) {
            console.error('Failed to get ID token for handleSaveAll post:', tokenError);
          }

          const headers = {
            'Content-Type': 'application/json',
          };

          if (idToken) {
            headers['Authorization'] = `Bearer ${idToken}`;
          }

          const response = await fetch('https://047kqyev3f.execute-api.ap-south-1.amazonaws.com/New/api/cost-estimation/ricew-estimation-model/post', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(itemData)
          });

          if (response.status === 401 || response.status === 403) {
            handleAuthError('Unauthorized - session expired');
            return;
          }

          if (!response.ok) {
            throw new Error(`Failed to save item ${item.ricewName}`);
          }
        }

        // Update data to mark all new items as saved
        const updatedData = data.map(item => {
          if (item.isNew) {
            return { ...item, isNew: false };
          }
          return item;
        });
        setData(updatedData);
        saveToLocalStorage(updatedData);
      }

      // Show appropriate success message based on what was saved
      let successMessage = '';
      if (newItems.length > 0 && changedSystemItems.length === 0) {
        successMessage = 'Estimation model saved successfully!';
      } else if (newItems.length > 0 || changedSystemItems.length > 0) {
        successMessage = 'Changes saved successfully!';
      } else {
        successMessage = 'Changes saved successfully!';
      }

      setSuccessMessage(successMessage);
      setShowSuccessMessage(true);

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccessMessage(false);
        setSuccessMessage('');
      }, 3000);

      setIsSaved(true);
      setIsFirstSave(false);
      setSavedItemIds(new Set(data.map(item => item.id)));
      setChangedItems(new Set());
      setHasNewRow(false);
      setOriginalData(data.map(item => ({ ...item })));
      console.log('All changes saved successfully');
    } catch (error) {
      console.error('Error saving changes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    checkUnsavedChanges(async () => {
      try {
        setSavingDraft(true);
        const currentProjectId = projectId || selectedProject?.id || '101';

        const payload = {
          project_id: currentProjectId.toString(),
          organization_id: selectedOrganization,
          Service_Line_name: selectedServiceLine,
          saveDraft: "false",
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

        const response = await fetch('https://jlkchl84ba.execute-api.ap-south-1.amazonaws.com/New/newApi/ricew/estimationModel/updateSaveDraft/byProject', {
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
          setSuccessMessage(result.message || 'Estimation models finalized successfully!');
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

  const handleDelete = async (id) => {
    if (editingItem !== null && editingItem !== id) {
      /* Commented out for now as per user request
      showConfirmation(
        'You have unsaved changes. Do you want to discard them and delete this record?',
        () => {
      */
      setEditingItem(null);
      setEditValues({});
      handleDelete(id);
      /*
        }
      );
      */
      return;
    }

    try {
      const item = data.find(d => d.id === id);

      // If deleting an unsaved new row, just remove it from the data
      if (item.isNew) {
        const updatedData = data.filter(item => item.id !== id);
        setData(updatedData);
        saveToLocalStorage(updatedData);
        setHasNewRow(false);

        // Clear the deleted item from changedItems Set
        setChangedItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });

        // Clear validation errors for this item
        setValidationErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[id];
          return newErrors;
        });

        // Clear field errors for this item
        setFieldErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[`${id}_ricewName`];
          delete newErrors[`${id}_estimationType`];
          delete newErrors[`${id}_complexityLevel`];
          delete newErrors[`${id}_estimatedHours`];
          delete newErrors[`${id}_rate`];
          delete newErrors[`${id}_totalCost`];
          delete newErrors[`${id}_description`];
          return newErrors;
        });

        // Update originalData to reflect the deletion
        setOriginalData(updatedData.map(item => ({ ...item })));
        return;
      }

      // For saved records, use custom confirmation dialog
      showConfirmation(
        'Are you sure you want to delete this estimation model? This action cannot be undone.',
        async () => {
          try {
            let idToken = null;
            try {
              idToken = await getIdToken();
            } catch (tokenError) {
              console.error('Failed to get ID token for handleDelete:', tokenError);
            }

            const headers = {
              'Content-Type': 'application/json',
            };

            if (idToken) {
              headers['Authorization'] = `Bearer ${idToken}`;
            }

            const response = await fetch(`https://047kqyev3f.execute-api.ap-south-1.amazonaws.com/New/api/cost-estimation/ricew-estimation-model/delete?RICEW_Estimation_Model_Id=${item.estimation_model_id || item.ricewName}`, {
              method: 'DELETE',
              headers: headers
            });

            if (response.status === 401 || response.status === 403) {
              handleAuthError('Unauthorized - session expired');
              return;
            }

            if (response.ok) {
              const updatedData = data.filter(item => item.id !== id);
              setData(updatedData);
              saveToLocalStorage(updatedData);

              // Show success message
              setSuccessMessage('Estimation model deleted successfully!');
              setShowSuccessMessage(true);
              setTimeout(() => {
                setShowSuccessMessage(false);
                setSuccessMessage('');
              }, 3000);
            } else {
              console.error('Failed to delete item');
            }
          } catch (error) {
            console.error('Error deleting item:', error);
          }
        }
      );
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const handleAddRow = async () => {
    // If currently editing a record, show confirmation dialog
    if (editingItem !== null) {
      /* Commented out for now as per user request
      showConfirmation(
        'You have unsaved changes. Do you want to discard them and add a new record?',
        () => {
      */
      // User clicked Yes - cancel the edit and add a new row
      setEditingItem(null);
      setEditValues({});
      setValidationErrors({});

      // Add a new empty row
      const id = Math.max(...data.map(item => item.id)) + 1;
      const newRow = {
        id,
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
        projectId: (projectId || selectedProject?.id || '101').toString(),
        isNew: true
      };
      const newData = [...data, newRow];
      setData(newData);
      setHasNewRow(true);
      if (isSaved) {
        setIsSaved(false);
      }

      setTimeout(() => {
        const tableContainer = document.querySelector('.table-container');
        if (tableContainer) {
          tableContainer.scrollTop = tableContainer.scrollHeight;
        }
      }, 100);

      // Enter edit mode for the new row
      setIsSaved(false);
      setEditingItem(id);
      setEditValues({
        isActive: true,
        contingency: '',
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
        pmoEffort: ''
      });
      setShowAddForm(false);
      /*
        }
      );
      */
      return;
    }

    // If there are changes, save them FIRST, then add
    const hasChanges = Array.from(changedItems).some(id => {
      const item = data.find(d => d.id === id);
      return item && item.estimation_model_id;
    });

    if (hasChanges) {
      handleSaveAll();
      return;
    } else if (hasNewRow) {
      handleSaveNewRow();
      return;
    }

    // No changes/editing: Directly add
    const id = Math.max(...data.map(item => item.id)) + 1;
    const newRow = {
      id,
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
      projectId: (projectId || selectedProject?.id || '101').toString(),
      isNew: true
    };
    const newData = [...data, newRow];
    setData(newData);
    setHasNewRow(true);
    if (isSaved) {
      setIsSaved(false);
    }

    setTimeout(() => {
      const tableContainer = document.querySelector('.table-container');
      if (tableContainer) {
        tableContainer.scrollTop = tableContainer.scrollHeight;
      }
    }, 100);

    // Enter edit mode for the new row
    setIsSaved(false);
    setEditingItem(id);
    setFocusedField('ricewName');
    setEditValues({
      isActive: true,
      contingency: '',
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
      pmoEffort: ''
    });
    setShowAddForm(false);
  };

  const handleSaveNewRow = async () => {
    const newItem = data.find(item => item.isNew);
    if (!newItem) return;

    // Validate required fields - check for undefined, null, or empty strings
    const errors = {};

    if (!newItem.ricewName || newItem.ricewName.trim() === '') {
      errors[`${newItem.id}_ricewName`] = 'Required field';
    } else if (!validateRicewName(newItem.ricewName)) {
      errors[`${newItem.id}_ricewName`] = 'Must contain only valid characters';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);

      // Auto-scroll to show validation errors
      setTimeout(() => {
        const tableContainer = document.querySelector('.table-container');
        if (tableContainer) {
          // Scroll to bottom to show the new row with errors
          tableContainer.scrollTo({
            top: tableContainer.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 100);

      return;
    }

    try {
      const itemData = {
        RICEW_Name: newItem.ricewName,
        Complexity: newItem.complexity,
        FS_Writing: newItem.fsWriting,
        FS_Review: newItem.fsReview,
        TS_Writing: newItem.tsWriting,
        TS_Review: newItem.tsReview,
        Code_Development: newItem.codeDevlopment,
        Code_Review: newItem.codeReview,
        Unit_Testing: newItem.unitTesting,
        Technical_Support: newItem.technicalSupport,
        Migration_Doc_Creation: newItem.migrationDocCreation,
        Migration_Effort: newItem.migrationEffort,
        PGL_Support: newItem.pglSupport,
        PMO_Effort: newItem.pmoEffort,
        Contingency: newItem.contingency + '%',
        Total_Hours: calculateTotalHours(newItem),
        project_id: (projectId || selectedProject?.id || "101").toString(),
        organization_id: selectedOrganization,
        Service_Line_name: selectedServiceLine,
        user_id: userId,
        created_by: userId
      };

      let idToken = null;
      try {
        idToken = await getIdToken();
      } catch (tokenError) {
        console.error('Failed to get ID token for handleSaveNewRow:', tokenError);
      }

      const headers = {
        'Content-Type': 'application/json',
      };

      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      const response = await fetch('https://047kqyev3f.execute-api.ap-south-1.amazonaws.com/New/api/cost-estimation/ricew-estimation-model/post', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(itemData)
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        return;
      }

      if (response.ok) {
        const result = await response.json();
        console.log('Single save result:', result);

        // Update the new item with the returned ID
        let updatedData;
        if (result.data && result.data.id) {
          updatedData = data.map(item =>
            item.isNew ? { ...item, estimation_model_id: result.data.id, isNew: false } : item
          );
        } else {
          updatedData = data.map(item =>
            item.isNew ? { ...item, isNew: false } : item
          );
        }

        setData(updatedData);
        saveToLocalStorage(updatedData);
        setHasNewRow(false);

        // Update original data to include the newly saved item
        setOriginalData(updatedData.map(item => ({ ...item })));
        setSuccessMessage('Estimation model saved successfully!');
        setShowSuccessMessage(true);

        // Clear changed items since the new row has been saved
        setChangedItems(new Set());

        // Auto-hide success message after 3 seconds
        setTimeout(() => {
          setShowSuccessMessage(false);
          setSuccessMessage('');
        }, 3000);
      } else {
        // Handle API error response
        setErrorMessage('Unable to save estimation model. Please check your information and try again.');
        setShowErrorMessage(true);
        setTimeout(() => {
          setShowErrorMessage(false);
          setErrorMessage('');
        }, 5000);
      }
    } catch (error) {
      console.error('Error saving new row:', error);
      setErrorMessage('Unable to save estimation model. Please try again later.');
      setShowErrorMessage(true);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 5000);
    }
  };

  return (
    <Fragment>
    <div className="config-main" style={{ minHeight: '80vh' }}>
      <div style={{ padding: '2rem 2rem 1rem 2rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project : <span style={{ color: '#2563eb' }}>{projectName || selectedProject?.name || ''}</span></h3>
      </div>
      <div className="config-header" style={{ marginTop: '0', display: 'flex', alignItems: 'center', gap: '100px', justifyContent: 'flex-start' }}>
        <h2 style={{ margin: 0 }}>RICEW Estimation Model (Hours)</h2>

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
                        The <strong>RICEW Estimation Model</strong> (Requirements, Implementation, Enhancement, Warranty/Support) is used to estimate the effort required for software development activities across different work phases. It allows you to define effort hours for various phases including functional specifications, technical specifications, code development, testing, technical support, migration, and project management for each RICEW item in your project scope.
                      </p>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <strong style={{ color: '#1f2937', fontSize: '15px' }}>Why is this used?</strong>
                      <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                        RICEW estimation provides a structured approach to project planning and budgeting. It helps you: (1) accurately estimate project duration and resource requirements across all development phases, (2) determine labor costs and budget allocation, (3) plan resource capacity and workload distribution, (4) track effort consumption throughout the project lifecycle, and (5) communicate detailed project scope and effort requirements to stakeholders and team members.
                      </p>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <strong style={{ color: '#1f2937', fontSize: '15px' }}>Understanding the columns</strong>
                      <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                        <li><strong>RICEW Name</strong> — Identifier for the RICEW item representing a distinct scope element (e.g., Feature A, Integration Module, Data Migration).</li>
                        <li><strong>Complexity</strong> — Difficulty level of the RICEW item (Low, Medium, High) that affects effort estimation.</li>
                        <li><strong>Active</strong> — Status indicator showing whether the RICEW item is active or inactive in the current estimation model.</li>
                        <li><strong>FS (Functional Specifications) Writing/Review</strong> — Effort hours for writing and reviewing functional requirements and specifications.</li>
                        <li><strong>TS (Technical Specifications) Writing/Review</strong> — Effort hours for writing and reviewing technical design specifications and architecture.</li>
                        <li><strong>Code Development/Review</strong> — Effort hours for developing code and conducting peer reviews.</li>
                        <li><strong>Unit Testing</strong> — Effort hours for unit-level testing and validation.</li>
                        <li><strong>Technical Support</strong> — Effort hours for technical assistance, issue resolution, and troubleshooting.</li>
                        <li><strong>Migration Doc Creation/Migration Effort</strong> — Effort hours for creating migration documentation and executing migration activities.</li>
                        <li><strong>PGL Support/PMO Effort</strong> — Effort hours for program governance, compliance, and project management office support.</li>
                      </ul>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to use this page</strong>
                      <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                        <li>Select an <strong>Organization Name</strong> from the dropdown. This determines which organization's estimation data you want to work with.</li>
                        <li>Select a <strong>Service Line Name</strong>. The system will automatically load RICEW items configured for the selected organization and service line.</li>
                        <li>Optionally enter a <strong>RICEW Estimation Model Name</strong> to identify this estimation model (e.g., "Project XYZ Estimation" or "Q4 2024 Release").</li>
                        <li>The table displays all RICEW items with their complexity levels and status. Click the <strong>Edit</strong> (pencil) icon on any row to modify effort hours.</li>
                        <li>When editing a row: Enter the effort hours in <strong>actual hours</strong> for each phase (FS Writing, FS Review, TS Writing, TS Review, Code Development, Code Review, Unit Testing, etc.).</li>
                        <li>Click the <strong>Save</strong> (✓) icon to confirm changes, or <strong>Cancel</strong> (✕) to discard them.</li>
                        <li>Use <strong>Save Draft</strong> to keep your work in progress without finalizing. Use <strong>Submit</strong> to finalize the estimation model.</li>
                        <li>Click the <strong>Lock</strong> button to prevent concurrent editing by multiple users. Click <strong>Unlock</strong> to allow edits again.</li>
                      </ul>
                    </div>

                    <div style={{ marginBottom: '4px' }}>
                      <strong style={{ color: '#1f2937', fontSize: '15px' }}>Important notes</strong>
                      <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                        <li>Both <strong>Organization Name</strong> and <strong>Service Line Name</strong> are mandatory. The system will not load RICEW items until both are selected.</li>
                        <li>RICEW items are auto-populated from your organization and service line configuration and cannot be added or deleted on this page.</li>
                        <li>Enter effort hours as actual hours required for each phase. Ensure estimates are realistic and based on project scope and team capability.</li>
                        <li><strong>Save Draft</strong> preserves your changes without finalizing, allowing you to continue editing later. <strong>Submit</strong> finalizes and locks all estimates for that model.</li>
                        <li>The <strong>Lock</strong> feature prevents concurrent editing by multiple users. Always unlock before allowing others to modify estimates.</li>
                        <li>Different complexity levels typically require different effort allocations. Ensure effort hours reflect the actual complexity and scope of each RICEW item.</li>
                        <li>If an estimation model has been saved as a draft, you must complete and submit it before creating a new model for the same organization and service line.</li>
                      </ul>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Organization Name & Service Line Selectors */}
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
          <label style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#333',
            whiteSpace: 'nowrap',
            marginRight: '8px'
          }}>
            Organization Name <span style={{ color: 'red' }}>*</span>
          </label>
          <div style={{ width: '260px' }}>
            <WideOrganizationAutocomplete
              value={selectedOrganization}
              onChange={(value) => {
                setSelectedOrganization(value);
                // Clear all field errors when organization changes
                setFieldErrors({});
                setValidationErrors({});
                setEditingFields({});
                setChangedItems(new Set());
                // Clear service line when organization changes
                setSelectedServiceLine('');
              }}
              options={organizationOptions}
              error={false}
            />
          </div>
        </div>

        {/* Service Line */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#333',
            whiteSpace: 'nowrap',
            marginRight: '8px'
          }}>
            Service Line Name <span style={{ color: 'red' }}>*</span>
          </label>
          <div style={{ width: '500px' }}>
            <WideOrganizationAutocomplete
              value={selectedServiceLine}
              onChange={(value) => {
                setSelectedServiceLine(value);
              }}
              options={serviceLineOptions}
              error={false}
              width="500px"
            />
          </div>
        </div>
      </div>

      {/* Standardized Loading Overlay */}
      <Loader 
        loading={loading || savingActiveChanges || savingDraft} 
        message={savingDraft ? 'Saving Draft...' : 'Processing...'} 
      />

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
          <span style={{ fontWeight: '500' }}>{successMessage || 'Operation successful!'}</span>
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
          <span style={{ fontWeight: '500' }}>{errorMessage || 'Something went wrong!'}</span>
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
      )}


      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
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

        /* Custom scrollbar for table container */
        .table-container::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .table-container::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        .table-container::-webkit-scrollbar-thumb {
          background: #888;
          borderRadius: 3px;
        }
        .table-container::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}</style>


      {/* Draft Status Banner */}
      {isDraftOrganization && (
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
      )}

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
              <th rowSpan="2" style={{ padding: '12px 12px', fontSize: '15px', fontWeight: '600', width: '6%', textAlign: 'center', verticalAlign: 'middle', border: '1px solid #ddd', backgroundColor: '#f5f5f5' }}>Contingency</th>
              <th rowSpan="2" style={{ padding: '12px 12px', fontSize: '15px', fontWeight: '600', width: '6%', textAlign: 'center', verticalAlign: 'middle', border: '1px solid #ddd', backgroundColor: '#f5f5f5' }}>Total Hours (Integers)</th>
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

                // For existing items, sort by estimation_model_id ascending
                const aId = parseInt(a.estimation_model_id) || 0;
                const bId = parseInt(b.estimation_model_id) || 0;
                if (aId !== bId) {
                  return aId - bId;
                }

                // If same estimation_model_id, maintain original order
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
                const sanitizedContingency = DOMPurify.sanitize(String(item.contingency) || '', { ALLOWED_TAGS: [] });
                const sanitizedTotalHours = DOMPurify.sanitize(String(calculateTotalHours(item)) || '', { ALLOWED_TAGS: [] });

                return (
                <tr key={item.id} data-row-id={item.id} style={{ backgroundColor: isLocked ? '#f5f5f5' : '#fff', borderBottom: '1px solid #ddd' }}>
                  {groupInfo[index] && (
                    <td rowSpan={groupInfo[index]} style={{ padding: '8px 12px', verticalAlign: 'middle', border: '1px solid #ddd', textAlign: 'left' }}>
                      <div
                        onClick={() => !isLocked && handleEdit(item.id)}
                        style={{
                          fontSize: '14px',
                          padding: '8px 0',
                          color: '#333',
                          minHeight: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          cursor: isLocked ? 'default' : 'pointer'
                        }}>
                        {sanitizedRicewName}
                      </div>
                    </td>
                  )}
                  <td style={{ padding: '8px 12px', verticalAlign: 'middle', border: '1px solid #ddd', textAlign: 'center' }}>
                    <div
                      onClick={() => !isLocked && handleEdit(item.id)}
                      style={{
                        fontSize: '14px',
                        padding: '8px 0',
                        color: '#333',
                        minHeight: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: isLocked ? 'default' : 'pointer'
                      }}>
                      {sanitizedComplexity}
                    </div>
                  </td>
                  <td style={{ padding: '8px 12px', verticalAlign: 'middle', border: '1px solid #ddd', textAlign: 'center' }}>
                    <input
                      key={`active-${item.id}-${item.isActive}`}
                      type="checkbox"
                      checked={item.isActive}
                      disabled={isLocked}
                      onChange={(e) => handleFieldChange('isActive', e.target.checked, item.id)}
                      style={{ cursor: isLocked ? 'not-allowed' : 'pointer' }}
                    />
                  </td>
                  {/* FS Writing */}
                  <td style={{ padding: '6px 12px', verticalAlign: 'top', border: '1px solid #ddd' }}>
                    {editingItem === item.id ? (
                      <TextField
                        size="small"
                        autoFocus={focusedField === 'fsWriting'}
                        value={editValues.fsWriting}
                        onChange={(e) => handleEditFieldChange('fsWriting', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, item.id)}
                        placeholder="0"
                        variant="outlined"
                        disabled={isLocked}
                        inputProps={{ maxLength: 10 }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            fontSize: '14px',
                          },
                          width: `${Math.max(60, (editValues.fsWriting?.length || 0) * 10 + 40)}px`,
                          maxWidth: '120px',
                          minWidth: '40px',
                        }}
                      />
                    ) : (
                      <div
                        onClick={() => !isLocked && handleEdit(item.id, 'fsWriting')}
                        style={{
                          fontSize: '14px',
                          padding: '8px 0',
                          color: '#333',
                          minHeight: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          cursor: isLocked ? 'default' : 'pointer'
                        }}>
                        {sanitizedFsWriting}
                      </div>
                    )}
                  </td>
                  {/* FS Review */}
                  <td style={{ padding: '6px 12px', verticalAlign: 'top', border: '1px solid #ddd' }}>
                    {editingItem === item.id ? (
                      <TextField
                        size="small"
                        autoFocus={focusedField === 'fsReview'}
                        value={editValues.fsReview}
                        onChange={(e) => handleEditFieldChange('fsReview', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, item.id)}
                        placeholder="0"
                        variant="outlined"
                        disabled={isLocked}
                        inputProps={{ maxLength: 10 }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            fontSize: '14px',
                          },
                          width: `${Math.max(60, (editValues.fsReview?.length || 0) * 10 + 40)}px`,
                          maxWidth: '120px',
                          minWidth: '40px',
                        }}
                      />
                    ) : (
                      <div
                        onClick={() => !isLocked && handleEdit(item.id, 'fsReview')}
                        style={{
                          fontSize: '14px',
                          padding: '8px 0',
                          color: '#333',
                          minHeight: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          cursor: isLocked ? 'default' : 'pointer'
                        }}>
                        {sanitizedFsReview}
                      </div>
                    )}
                  </td>
                  {/* TS Writing */}
                  <td style={{ padding: '6px 12px', verticalAlign: 'top', border: '1px solid #ddd' }}>
                    {editingItem === item.id ? (
                      <TextField
                        size="small"
                        autoFocus={focusedField === 'tsWriting'}
                        value={editValues.tsWriting}
                        onChange={(e) => handleEditFieldChange('tsWriting', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, item.id)}
                        placeholder="0"
                        variant="outlined"
                        disabled={isLocked}
                        inputProps={{ maxLength: 10 }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            fontSize: '14px',
                          },
                          width: `${Math.max(60, (editValues.tsWriting?.length || 0) * 10 + 40)}px`,
                          maxWidth: '120px',
                          minWidth: '40px',
                        }}
                      />
                    ) : (
                      <div
                        onClick={() => !isLocked && handleEdit(item.id, 'tsWriting')}
                        style={{
                          fontSize: '14px',
                          padding: '8px 0',
                          color: '#333',
                          minHeight: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          cursor: isLocked ? 'default' : 'pointer'
                        }}>
                        {sanitizedTsWriting}
                      </div>
                    )}
                  </td>
                  {/* TS Review */}
                  <td style={{ padding: '6px 12px', verticalAlign: 'top', border: '1px solid #ddd' }}>
                    {editingItem === item.id ? (
                      <TextField
                        size="small"
                        autoFocus={focusedField === 'tsReview'}
                        value={editValues.tsReview}
                        onChange={(e) => handleEditFieldChange('tsReview', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, item.id)}
                        placeholder="0"
                        variant="outlined"
                        disabled={isLocked}
                        inputProps={{ maxLength: 10 }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            fontSize: '14px',
                          },
                          width: `${Math.max(60, (editValues.tsReview?.length || 0) * 10 + 40)}px`,
                          maxWidth: '120px',
                          minWidth: '40px',
                        }}
                      />
                    ) : (
                      <div
                        onClick={() => !isLocked && handleEdit(item.id, 'tsReview')}
                        style={{
                          fontSize: '14px',
                          padding: '8px 0',
                          color: '#333',
                          minHeight: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          cursor: isLocked ? 'default' : 'pointer'
                        }}>
                        {sanitizedTsReview}
                      </div>
                    )}
                  </td>
                  {/* Code Development */}
                  <td style={{ padding: '6px 12px', verticalAlign: 'top', border: '1px solid #ddd' }}>
                    {editingItem === item.id ? (
                      <TextField
                        size="small"
                        autoFocus={focusedField === 'codeDevlopment'}
                        value={editValues.codeDevlopment}
                        onChange={(e) => handleEditFieldChange('codeDevlopment', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, item.id)}
                        placeholder="0"
                        variant="outlined"
                        disabled={isLocked}
                        inputProps={{ maxLength: 10 }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            fontSize: '14px',
                          },
                          width: `${Math.max(80, (editValues.codeDevlopment?.length || 0) * 10 + 40)}px`,
                          maxWidth: '120px',
                          minWidth: '60px',
                        }}
                      />
                    ) : (
                      <div
                        onClick={() => !isLocked && handleEdit(item.id, 'codeDevlopment')}
                        style={{
                          fontSize: '14px',
                          padding: '8px 0',
                          color: '#333',
                          minHeight: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          cursor: isLocked ? 'default' : 'pointer'
                        }}>
                        {sanitizedCodeDevlopment}
                      </div>
                    )}
                  </td>
                  {/* Code Review */}
                  <td style={{ padding: '6px 12px', verticalAlign: 'top', border: '1px solid #ddd' }}>
                    {editingItem === item.id ? (
                      <TextField
                        size="small"
                        autoFocus={focusedField === 'codeReview'}
                        value={editValues.codeReview}
                        onChange={(e) => handleEditFieldChange('codeReview', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, item.id)}
                        placeholder="0"
                        variant="outlined"
                        disabled={isLocked}
                        inputProps={{ maxLength: 10 }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            fontSize: '14px',
                          },
                          width: `${Math.max(60, (editValues.codeReview?.length || 0) * 10 + 40)}px`,
                          maxWidth: '120px',
                          minWidth: '40px',
                        }}
                      />
                    ) : (
                      <div
                        onClick={() => !isLocked && handleEdit(item.id, 'codeReview')}
                        style={{
                          fontSize: '14px',
                          padding: '8px 0',
                          color: '#333',
                          minHeight: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          cursor: isLocked ? 'default' : 'pointer'
                        }}>
                        {sanitizedCodeReview}
                      </div>
                    )}
                  </td>
                  {/* Unit Testing */}
                  <td style={{ padding: '6px 12px', verticalAlign: 'top', border: '1px solid #ddd' }}>
                    {editingItem === item.id ? (
                      <TextField
                        size="small"
                        autoFocus={focusedField === 'unitTesting'}
                        value={editValues.unitTesting}
                        onChange={(e) => handleEditFieldChange('unitTesting', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, item.id)}
                        placeholder="0"
                        variant="outlined"
                        disabled={isLocked}
                        inputProps={{ maxLength: 10 }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            fontSize: '14px',
                          },
                          width: `${Math.max(60, (editValues.unitTesting?.length || 0) * 10 + 40)}px`,
                          maxWidth: '120px',
                          minWidth: '40px',
                        }}
                      />
                    ) : (
                      <div
                        onClick={() => !isLocked && handleEdit(item.id, 'unitTesting')}
                        style={{
                          fontSize: '14px',
                          padding: '8px 0',
                          color: '#333',
                          minHeight: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          cursor: isLocked ? 'default' : 'pointer'
                        }}>
                        {sanitizedUnitTesting}
                      </div>
                    )}
                  </td>
                  {/* Technical Support */}
                  <td style={{ padding: '6px 12px', verticalAlign: 'top', border: '1px solid #ddd' }}>
                    {editingItem === item.id ? (
                      <TextField
                        size="small"
                        autoFocus={focusedField === 'technicalSupport'}
                        value={editValues.technicalSupport}
                        onChange={(e) => handleEditFieldChange('technicalSupport', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, item.id)}
                        placeholder="0"
                        variant="outlined"
                        disabled={isLocked}
                        inputProps={{ maxLength: 10 }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            fontSize: '14px',
                          },
                          width: `${Math.max(60, (editValues.technicalSupport?.length || 0) * 10 + 40)}px`,
                          maxWidth: '120px',
                          minWidth: '40px',
                        }}
                      />
                    ) : (
                      <div
                        onClick={() => !isLocked && handleEdit(item.id, 'technicalSupport')}
                        style={{
                          fontSize: '14px',
                          padding: '8px 0',
                          color: '#333',
                          minHeight: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          cursor: isLocked ? 'default' : 'pointer'
                        }}>
                        {sanitizedTechnicalSupport}
                      </div>
                    )}
                  </td>
                  {/* Migration Doc Creation */}
                  <td style={{ padding: '6px 12px', verticalAlign: 'top', border: '1px solid #ddd' }}>
                    {editingItem === item.id ? (
                      <TextField
                        size="small"
                        autoFocus={focusedField === 'migrationDocCreation'}
                        value={editValues.migrationDocCreation}
                        onChange={(e) => handleEditFieldChange('migrationDocCreation', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, item.id)}
                        placeholder="0"
                        variant="outlined"
                        disabled={isLocked}
                        inputProps={{ maxLength: 10 }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            fontSize: '14px',
                          },
                          width: `${Math.max(60, (editValues.migrationDocCreation?.length || 0) * 10 + 40)}px`,
                          maxWidth: '120px',
                          minWidth: '40px',
                        }}
                      />
                    ) : (
                      <div
                        onClick={() => !isLocked && handleEdit(item.id, 'migrationDocCreation')}
                        style={{
                          fontSize: '14px',
                          padding: '8px 0',
                          color: '#333',
                          minHeight: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          cursor: isLocked ? 'default' : 'pointer'
                        }}>
                        {sanitizedMigrationDocCreation}
                      </div>
                    )}
                  </td>
                  {/* Migration Effort */}
                  <td style={{ padding: '6px 12px', verticalAlign: 'top', border: '1px solid #ddd' }}>
                    {editingItem === item.id ? (
                      <TextField
                        size="small"
                        autoFocus={focusedField === 'migrationEffort'}
                        value={editValues.migrationEffort}
                        onChange={(e) => handleEditFieldChange('migrationEffort', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, item.id)}
                        placeholder="0"
                        variant="outlined"
                        disabled={isLocked}
                        inputProps={{ maxLength: 10 }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            fontSize: '14px',
                          },
                          width: `${Math.max(60, (editValues.migrationEffort?.length || 0) * 10 + 40)}px`,
                          maxWidth: '120px',
                          minWidth: '40px',
                        }}
                      />
                    ) : (
                      <div
                        onClick={() => !isLocked && handleEdit(item.id, 'migrationEffort')}
                        style={{
                          fontSize: '14px',
                          padding: '8px 0',
                          color: '#333',
                          minHeight: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          cursor: isLocked ? 'default' : 'pointer'
                        }}>
                        {sanitizedMigrationEffort}
                      </div>
                    )}
                  </td>
                  {/* PGL Support */}
                  <td style={{ padding: '6px 12px', verticalAlign: 'top', border: '1px solid #ddd' }}>
                    {editingItem === item.id ? (
                      <TextField
                        size="small"
                        autoFocus={focusedField === 'pglSupport'}
                        value={editValues.pglSupport}
                        onChange={(e) => handleEditFieldChange('pglSupport', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, item.id)}
                        placeholder="0"
                        variant="outlined"
                        disabled={isLocked}
                        inputProps={{ maxLength: 10 }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            fontSize: '14px',
                          },
                          width: `${Math.max(60, (editValues.pglSupport?.length || 0) * 10 + 40)}px`,
                          maxWidth: '120px',
                          minWidth: '40px',
                        }}
                      />
                    ) : (
                      <div
                        onClick={() => !isLocked && handleEdit(item.id, 'pglSupport')}
                        style={{
                          fontSize: '14px',
                          padding: '8px 0',
                          color: '#333',
                          minHeight: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          cursor: isLocked ? 'default' : 'pointer'
                        }}>
                        {sanitizedPglSupport}
                      </div>
                    )}
                  </td>
                  {/* PMO Effort */}
                  <td style={{ padding: '6px 12px', verticalAlign: 'top', border: '1px solid #ddd' }}>
                    {editingItem === item.id ? (
                      <TextField
                        size="small"
                        autoFocus={focusedField === 'pmoEffort'}
                        value={editValues.pmoEffort}
                        onChange={(e) => handleEditFieldChange('pmoEffort', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, item.id)}
                        placeholder="0"
                        variant="outlined"
                        disabled={isLocked}
                        inputProps={{ maxLength: 10 }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            fontSize: '14px',
                          },
                          width: `${Math.max(60, (editValues.pmoEffort?.length || 0) * 10 + 40)}px`,
                          maxWidth: '120px',
                          minWidth: '40px',
                        }}
                      />
                    ) : (
                      <div
                        onClick={() => !isLocked && handleEdit(item.id, 'pmoEffort')}
                        style={{
                          fontSize: '14px',
                          padding: '8px 0',
                          color: '#333',
                          minHeight: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          cursor: isLocked ? 'default' : 'pointer'
                        }}>
                        {sanitizedPmoEffort}
                      </div>
                    )}
                  </td>
                  {/* Contingency */}
                  <td style={{ padding: '6px 12px', verticalAlign: 'top', border: '1px solid #ddd' }}>
                    {editingItem === item.id ? (
                      <TextField
                        size="small"
                        autoFocus={focusedField === 'contingency'}
                        value={editValues.contingency}
                        onChange={(e) => handleEditFieldChange('contingency', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, item.id)}
                        placeholder="0"
                        variant="outlined"
                        error={!!fieldErrors[`${item.id}_contingency`]}
                        disabled={isLocked}
                        inputProps={{ maxLength: 5 }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            fontSize: '14px',
                          },
                          width: `${Math.max(60, (editValues.contingency?.length || 0) * 10 + 40)}px`,
                          maxWidth: '80px',
                          minWidth: '40px',
                        }}
                      />
                    ) : (
                      <div
                        onClick={() => !isLocked && handleEdit(item.id, 'contingency')}
                        style={{
                          fontSize: '14px',
                          padding: '8px 0',
                          color: '#333',
                          minHeight: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          cursor: isLocked ? 'default' : 'pointer'
                        }}>
                        {sanitizedContingency}%
                      </div>
                    )}
                  </td>
                  {/* Total Hours */}
                  <td style={{ padding: '6px 12px', verticalAlign: 'top', border: '1px solid #ddd' }}>
                    <div style={{
                      fontSize: '14px',
                      padding: '8px 0',
                      color: '#333',
                      minHeight: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      fontWeight: 'bold'
                    }}>
                      {editingItem === item.id ? calculateTotalHours(editValues) : (item.totalHours || calculateTotalHours(item))}
                    </div>
                  </td>
                  {/* Actions */}
                  {/* <td style={{ padding: '6px 4px', verticalAlign: 'middle', textAlign: 'center', border: '1px solid #ddd' }}>
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
                      ) : item.estimation_model_id && (
                        <button
                          className="action-btn menu-btn"
                          onClick={() => handleEdit(item.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#6b7280',
                            padding: '4px'
                          }}
                          title="Edit"
                        >
                          <MoreVertical size={18} />
                        </button>
                      )}
                    </div>
                  </td> */}
                </tr>
                );
              });
            }, [data, editingItem, editValues, isLocked, focusedField])}
          </tbody>
        </table>
      </div>

      <div className="table-actions-bottom" style={{ display: 'flex', gap: '12px', marginTop: '16px', alignItems: 'center', marginLeft: '16px' }}>
        {!isDraftOrganization ? (
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={savingDraft || isLocked || !isSelectionComplete}
            style={{
              padding: '00px 24px',
              backgroundColor: (savingDraft || isLocked || !isSelectionComplete) ? '#6c757d' : '#3b82f6',
              color: 'white',
              border: 'none',
              height: "32px",
              borderRadius: '4px',
              width: "140px",
              cursor: (savingDraft || isLocked || !isSelectionComplete) ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              opacity: (savingDraft || isLocked || !isSelectionComplete) ? 0.6 : 1,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { if (!savingDraft && !isLocked && isSelectionComplete) e.target.style.backgroundColor = '#2563eb'; }}
            onMouseLeave={(e) => { if (!savingDraft && !isLocked && isSelectionComplete) e.target.style.backgroundColor = '#3b82f6'; }}
          >
            {savingDraft ? 'Saving Draft...' : 'Save Draft'}
          </button>

        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={savingDraft || isLocked || !isSelectionComplete}
            style={{
              padding: '00px 24px',
              backgroundColor: (savingDraft || isLocked || !isSelectionComplete) ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              height: "32px",
              borderRadius: '4px',
              width: "140px",
              cursor: (savingDraft || isLocked || !isSelectionComplete) ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              opacity: (savingDraft || isLocked || !isSelectionComplete) ? 0.6 : 1,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => !savingDraft && !isLocked && isSelectionComplete && (e.target.style.backgroundColor = '#218838')}
            onMouseLeave={(e) => !savingDraft && !isLocked && isSelectionComplete && (e.target.style.backgroundColor = '#28a745')}
          >
            {savingDraft ? 'Submitting...' : 'Submit'}
          </button>

        )}
        <button
          onClick={saveActiveChanges}
          disabled={(!hasActiveChanges && changedItems.size === 0) || savingActiveChanges || !isSelectionComplete}
          style={{
            backgroundColor: ((!hasActiveChanges && changedItems.size === 0) || savingActiveChanges || !isSelectionComplete) ? '#6c757d' : '#28a745',
            color: 'white',
            border: 'none',
            height: '32px',
            padding: '0px 12px',
            borderRadius: '4px',
            cursor: ((!hasActiveChanges && changedItems.size === 0) || savingActiveChanges || !isSelectionComplete) ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            opacity: ((!hasActiveChanges && changedItems.size === 0) || savingActiveChanges || !isSelectionComplete) ? 0.6 : 1,
            transition: 'all 0.2s',
            width: '140px'
          }}
          onMouseEnter={(e) => { if ((hasActiveChanges || changedItems.size > 0) && !savingActiveChanges && isSelectionComplete) e.target.style.backgroundColor = '#218838'; }}
          onMouseLeave={(e) => { if ((hasActiveChanges || changedItems.size > 0) && !savingActiveChanges && isSelectionComplete) e.target.style.backgroundColor = '#28a745'; }}
        >
          {savingActiveChanges ? 'Saving...' : 'Save Changes'}
        </button>
        <button
          onClick={handleLockUnlock}
          disabled={savingActiveChanges || !isSelectionComplete}
          style={{
            backgroundColor: isLocked ? '#dc3545' : (isSelectionComplete ? '#17a2b8' : '#6c757d'),
            color: 'white',
            border: 'none',
            height: '32px',
            width: "140px",
            padding: '0px 12px',
            borderRadius: '4px',
            cursor: (savingActiveChanges || !isSelectionComplete) ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            opacity: (savingActiveChanges || !isSelectionComplete) ? 0.6 : 1,
            transition: 'all 0.2s',
            marginLeft: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
          onMouseEnter={(e) => {
            if (!savingActiveChanges && isSelectionComplete) {
              e.target.style.backgroundColor = isLocked ? '#c82333' : '#156a8a';
            }
          }}
          onMouseLeave={(e) => {
            if (!savingActiveChanges && isSelectionComplete) {
              e.target.style.backgroundColor = isLocked ? '#dc3545' : '#17a2b8';
            }
          }}
          title={isLocked ? 'Unlock editing' : 'Lock editing'}
        >
          {isLocked ? <Unlock size={16} /> : <Lock size={16} />}
          {isLocked ? 'Unlock' : 'Lock'}
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
    </Fragment>
  );
};

export default RicewEstimationModelTable;