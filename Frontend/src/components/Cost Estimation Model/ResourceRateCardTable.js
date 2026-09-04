import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Edit, Trash2, X, Save, MoreVertical, Lock, Unlock, HelpCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TextField, Select, MenuItem, FormControl } from '@mui/material';
import DOMPurify from 'dompurify';
import { useSession } from '../../context/SessionContext';
import SessionExpiredPopup from '../SessionExpiredPopup';
import useLOV from '../../hooks/useLOV';
import { CustomDatePicker } from '../Resource Roster Form/Components';
import { getIdToken } from '../../utils/cognito-auth';
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
      {isOpen ? (
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
                onMouseDown={(e) => e.preventDefault()}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  backgroundColor: index === highlightedIndex ? '#accafaff' : (option.value === value ? '#e3f2fd' : 'white'),
                  borderBottom: '1px solid #eee',
                  fontSize: '13px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
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
      ) : null}
    </div>
  );
};

const ResourceRateCardTable = ({ onClose, selectedProject, setUnsavedChangesChecker }) => {
  const navigate = useNavigate();
  const { handleAuthError, userId, projectId, projectName } = useSession();
  const [showNoProjectSelectedPopup, setShowNoProjectSelectedPopup] = useState(false);
  const [data, setData] = useState([]);
  const [isSaved, setIsSaved] = useState(false);
  const [changedItems, setChangedItems] = useState(new Set());

  // Currency options
  const currencyOptions = [
    { value: 'INR', label: 'Indian (INR)' },
    { value: 'USD', label: 'US (USD)' },
    { value: 'PHP', label: 'Philippines (PHP)' },
    { value: 'EUR', label: 'Euro (EUR)' }
  ];
  const [isFirstSave, setIsFirstSave] = useState(true);
  const [savedItemIds, setSavedItemIds] = useState(new Set());
  const [isProcessingOrganization, setIsProcessingOrganization] = useState(false);
  const [hasNewRow, setHasNewRow] = useState(false);

  // Lock/Unlock functionality
  const [isLocked, setIsLocked] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({
    level: '',
    levelCode: '',
    title: '',
    currency: 'USD',
    amountPerHour: '',
    currencyOne: 'USD',
    amountPerHourOne: '',
    isActive: true,
    projectId: selectedProject?.id || 101
  });
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [dataFromBackend, setDataFromBackend] = useState(false);
  const [originalData, setOriginalData] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});

  const [editingItem, setEditingItem] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);
  const helpPopupRef = useRef(null);
  const [editingFields, setEditingFields] = useState({}); // Track which fields are being edited

  // Global organization selection
  const [selectedOrganization, setSelectedOrganization] = useState('');
  const [selectedServiceLine, setSelectedServiceLine] = useState('');
  const [serviceLineOptions, setServiceLineOptions] = useState([]);
  const [rateCardName, setRateCardName] = useState('');



  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [savingDraft, setSavingDraft] = useState(false);
  const [isDraftOrganization, setIsDraftOrganization] = useState(false);
  const [showHelpPopup, setShowHelpPopup] = useState(false);

  const currentProjectId = projectId || selectedProject?.id || '';

  // Fetch organization options using the LOV hook
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
  }, [selectedOrganization, organizationOptions, selectedServiceLine]);

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

  const getDefaultData = () => [
    {
      id: 1,
      level: 'L1',
      levelCode: 'DEV001',
      title: 'Junior Developer',
      currency: 'USD',
      amountPerHour: '50.00',
      currencyOne: 'EUR',
      amountPerHourOne: '45.00',
      isActive: true,
      projectId: selectedProject?.id || 101
    },
    {
      id: 2,
      level: 'L2',
      levelCode: 'BA001',
      title: 'Business Analyst',
      currency: 'USD',
      amountPerHour: '60.00',
      currencyOne: 'EUR',
      amountPerHourOne: '55.00',
      isActive: true,
      projectId: selectedProject?.id || 101
    },
  ];

  useEffect(() => {
    if (!selectedProject?.id && !projectId) {
      setShowNoProjectSelectedPopup(true);
      return;
    }

    if (!isProcessingOrganization) {
      loadData(selectedOrganization, selectedServiceLine);
    }
  }, [selectedProject?.id, selectedOrganization, selectedServiceLine, isProcessingOrganization, organizationOptions]);

  // Provide unsaved changes checker to parent component
  useEffect(() => {
    if (setUnsavedChangesChecker) {
      // Wrap in another function to properly set state to a function value
      setUnsavedChangesChecker(() => () => {
        return hasNewRow || changedItems.size > 0 || editingItem !== null;
      });
    }
  }, [hasNewRow, changedItems, editingItem, setUnsavedChangesChecker]);

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


  // Call API when organization and service line are selected to create rate cards for all level definitions
  const handleOrganizationSelect = async (organizationId, serviceLine = '') => {
    if (!organizationId || organizationId.trim() === '') {
      return;
    }

    try {
      setIsProcessingOrganization(true);
      setLoading(true);

      // First, fetch level definitions to know what should exist
      console.log('Fetching level definitions to check completeness');

      let idToken = null;
      try {
        idToken = await getIdToken();
      } catch (tokenError) {
        console.error('Failed to get ID token:', tokenError);
      }

      const headers = {
        'Content-Type': 'application/json',
      };

      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      // Build URL to check existing data for this organization and business line
      console.log('Checking existing data for organization:', organizationId, 'service line:', serviceLine);
      let checkUrl = `https://tfv4q9mq6g.execute-api.ap-south-1.amazonaws.com/New/ricew/rate-card/get/resourceRateCard?organization_id=${encodeURIComponent(organizationId)}&project_id=${currentProjectId}`;
      if (serviceLine) {
        checkUrl += `&ServiceLine_name=${encodeURIComponent(serviceLine)}`;
      }

      // Parallelize API Calls
      const [levelDefResponse, checkResponse] = await Promise.all([
        fetch(`https://tfv4q9mq6g.execute-api.ap-south-1.amazonaws.com/New/ricew/rate-card/LOV/get/levelDefinition`, { headers }),
        fetch(checkUrl, { headers })
      ]);

      let levelDefinitions = [];
      if (levelDefResponse.ok) {
        const levelDefResult = await levelDefResponse.json();
        levelDefinitions = levelDefResult.success && Array.isArray(levelDefResult.data) ? levelDefResult.data : [];
        console.log(`Found ${levelDefinitions.length} level definitions in system`);
      }

      let missingLevelDefinitions = [];

      if (checkResponse.ok) {
        const checkResult = await checkResponse.json();
        const existingData = checkResult.success && Array.isArray(checkResult.data) ? checkResult.data : [];

        console.log(`Organization/Business Line has ${existingData.length} existing rate cards`);

        // Check if we have rate cards for ALL level definitions
        const existingLevelIds = new Set(existingData.map(item => item.Level_Definition_id).filter(id => id));
        missingLevelDefinitions = levelDefinitions.filter(levelDef =>
          !existingLevelIds.has(levelDef.Level_Definition_id)
        );

        console.log(`Missing rate cards for ${missingLevelDefinitions.length} level definitions`);

        // If all level definitions already have rate cards, no need to create more
        if (missingLevelDefinitions.length === 0) {
          console.log('All level definitions already have rate cards. Skipping POST API call.');
          setSuccessMessage('Rate card data is complete.');
          setShowSuccessMessage(true);
          setTimeout(() => {
            setShowSuccessMessage(false);
            setSuccessMessage('');
          }, 3000);

          // Reload data to display existing records silently
          setLoading(false);
          await loadData(organizationId, serviceLine);
          return;
        }

        console.log(`Need to create rate cards for ${missingLevelDefinitions.length} missing level definitions`);
      }

      // Get organization name for the payload
      const organizationName = organizationOptions.find(opt => opt.value === organizationId)?.label || '';

      const payload = {
        user_id: userId,
        project_id: currentProjectId,
        created_by: userId,
        organization_id: organizationId,
        organization_name: organizationName,
        ServiceLine_name: serviceLine
      };

      console.log('Calling POST API to create missing rate cards:', payload);

      const response = await fetch('https://tfv4q9mq6g.execute-api.ap-south-1.amazonaws.com/New/ricew/rate-card/post/resourceRateCardCreate', {
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
        console.log('Rate cards created successfully:', result);
        setSuccessMessage(`Rate cards created for ${result.createdRecords || 0} level definitions!`);
        setShowSuccessMessage(true);
        setTimeout(() => {
          setShowSuccessMessage(false);
          setSuccessMessage('');
        }, 3000);

        // Add a small delay to ensure data is committed to database before reloading
        console.log('Waiting for data to be committed before reloading...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Reload table data from API silently
        setLoading(false);
        await loadData(organizationId, serviceLine);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to create rate cards:', errorData);
        setErrorMessage(errorData.error || 'Failed to create rate cards');
        setShowErrorMessage(true);
        setTimeout(() => {
          setShowErrorMessage(false);
          setErrorMessage('');
        }, 5000);
      }
    } catch (error) {
      console.error('Error in handleOrganizationSelect:', error);
      setErrorMessage('Error processing selection. Please try again.');
      setShowErrorMessage(true);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 5000);
    } finally {
      setLoading(false);
      setIsProcessingOrganization(false);
    }
  };

  const loadData = async (organizationId = null, serviceLine = null, retryCount = 0, maxRetries = 3) => {
    const projectId = currentProjectId;
    const storageKey = `resourceRateCardData_${projectId}`;

    // Use passed values or fall back to state
    const orgId = organizationId || selectedOrganization;
    const bl = serviceLine !== null ? serviceLine : selectedServiceLine;

    // Require BOTH organization and service line before fetching
    if (!orgId || orgId.trim() === '' || !bl || bl.trim() === '') {
      setData([]);
      setOriginalData([]);
      setIsDraftOrganization(false);
      console.log('Waiting for both Organization and Service Line selection...');
      return;
    }

    try {
      // Get ID token for authorization
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

      // Build URL with organization_id and optional BusinessLine_name
      let url = `https://tfv4q9mq6g.execute-api.ap-south-1.amazonaws.com/New/ricew/rate-card/get/resourceRateCard?organization_id=${encodeURIComponent(orgId)}&project_id=${currentProjectId}`;
      if (bl && bl.trim() !== '') {
        url += `&ServiceLine_name=${encodeURIComponent(bl)}`;
      }

      // Fetch both APIs in parallel
      const [resourceRateCardResponse, levelDefinitionResponse] = await Promise.all([
        // Fetch resource rate card data
        fetch(url, {
          headers: headers
        }),

        // Always fetch level definition data
        fetch(`https://tfv4q9mq6g.execute-api.ap-south-1.amazonaws.com/New/ricew/rate-card/LOV/get/levelDefinition`, {
          headers: headers
        })
      ]);

      // Check for session expiration
      if (resourceRateCardResponse.status === 401 || resourceRateCardResponse.status === 403 ||
        levelDefinitionResponse.status === 401 || levelDefinitionResponse.status === 403) {
        handleAuthError('Unauthorized - session expired');
        return;
      }

      let finalData = [];
      let hasOrganizationData = false;

      // Process resource rate card data (organization-specific)
      if (resourceRateCardResponse.ok && orgId) {
        const resourceRateCardResult = await resourceRateCardResponse.json();
        console.log('Fetched resource rate card data from API:', resourceRateCardResult);

        const resourceRateCardData = resourceRateCardResult.success && Array.isArray(resourceRateCardResult.data)
          ? resourceRateCardResult.data
          : [];

        if (resourceRateCardData.length > 0) {
          hasOrganizationData = true;

          // Extract first record for organization metadata
          const firstRecord = resourceRateCardData[0];

          // Check if any record has saveDraft === "true"
          const hasDraftRecords = resourceRateCardData.some(item =>
            item.saveDraft === "true" || item.saveDraft === true
          );
          setIsDraftOrganization(hasDraftRecords);

          // Check if any record has isLocked === "true"
          const isTableLocked = resourceRateCardData.some(item =>
            item.isLocked === "true" || item.isLocked === true
          );
          setIsLocked(isTableLocked);

          // Check for Resource Rate Card Name in the first record and set it
          if (firstRecord.Resource_Rate_Card_Name) {
            setRateCardName(firstRecord.Resource_Rate_Card_Name);
          } else {
            setRateCardName('');
          }

          // Transform resource rate card API data to match our frontend structure
          const transformedResourceRateCardData = resourceRateCardData.map((item, index) => ({
            id: index + 1,
            level: item.Level_id || '',
            levelCode: item.Level_Code || '',
            title: item.Designation_Title || '',
            level_definition_id: item.Level_Definition_id || null,
            rate_card_id: item.Resource_Rate_Card_id || null,
            currency: item.OR_PL_Currency || '',
            amountPerHour: item.OR_PL_Amount_hours || '',
            currencyOne: item.OR_BL_Currency || '',
            amountPerHourOne: item.OR_BL_Amount_hours || '',
            isActive: true,
            projectId: projectId.toString(),
            isNew: false,
            system_default: "false",
            organization_name: item.organization_name || '',
            organization_id: item.organization_id || '',
            saveDraft: item.saveDraft || "false"
          }));

          finalData = [...transformedResourceRateCardData];
        } else if (retryCount < maxRetries) {
          // If no data found and we haven't exceeded retry limit, wait and retry
          console.log(`No data found for organization. Retry ${retryCount + 1}/${maxRetries} in 1 second...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return loadData(orgId, bl, retryCount + 1, maxRetries);
        }
      }

      // Process level definition data (always fetched)
      if (levelDefinitionResponse.ok) {
        const levelDefinitionResult = await levelDefinitionResponse.json();
        console.log('Fetched level definition data from API:', levelDefinitionResult);

        const levelDefinitionData = levelDefinitionResult.success && Array.isArray(levelDefinitionResult.data)
          ? levelDefinitionResult.data
          : [];

        if (levelDefinitionData.length > 0) {
          // Extract Level_Definition_id from organization-specific data (if any)
          const existingLevelDefinitionIds = new Set(
            finalData.map(item => item.level_definition_id).filter(id => id !== null && id !== undefined)
          );

          console.log('Existing Level_Definition_ids in organization data:', Array.from(existingLevelDefinitionIds));

          // Find level definitions that are missing from organization data
          const missingLevelDefinitions = levelDefinitionData.filter(levelDef =>
            !existingLevelDefinitionIds.has(levelDef.Level_Definition_id)
          );

          console.log('Missing Level_Definition_ids to add:', missingLevelDefinitions.map(item => item.Level_Definition_id));

          if (missingLevelDefinitions.length > 0) {
            // Transform missing level definitions and add them to the data
            const transformedMissingLevels = missingLevelDefinitions.map((item, index) => ({
              id: finalData.length + index + 1,
              level: item.Level_Code || '',
              levelCode: item.Level_Short_Code || '',
              title: item.designation || '',
              level_definition_id: item.Level_Definition_id || null,
              rate_card_id: null,
              currency: '',
              amountPerHour: '',
              currencyOne: '',
              amountPerHourOne: '',
              isActive: true,
              projectId: projectId.toString(),
              isNew: false,
              system_default: "false"
            }));

            finalData = [...finalData, ...transformedMissingLevels];
            console.log(`Added ${transformedMissingLevels.length} missing level definitions to data`);
          }
        }
      }

      // Only show data if we have organization-specific rate card data
      if (hasOrganizationData && finalData.length > 0) {
        setData(finalData);
        setDataFromBackend(true);
        setOriginalData(finalData.map(item => ({ ...item })));
        localStorage.setItem(storageKey, JSON.stringify(finalData));
        console.log('Combined resource rate card data loaded successfully');
        return;
      }

      // If no organization data exists, show empty table
      console.log('No rate card data found for this organization. Showing empty table.');
      setData([]);
      setOriginalData([]);
      setDataFromBackend(false);
      setIsDraftOrganization(false);

    } catch (error) {
      console.error('Error fetching resource rate card data from API:', error);
      // Fallback to localStorage or default data
      loadFromLocalStorage(storageKey);
    }
  };

  const loadFromLocalStorage = (storageKey) => {
    const savedData = localStorage.getItem(storageKey);

    if (savedData) {
      const parsedData = JSON.parse(savedData);
      setData(parsedData);
      const hasBackendData = parsedData.some(item => item.rate_card_id !== null && item.rate_card_id !== undefined);
      setOriginalData(parsedData.map(item => ({ ...item })));
      setDataFromBackend(hasBackendData);
    } else {
      const defaultData = getDefaultData().map(item => ({ ...item, rate_card_id: null }));
      setData(defaultData);
      setDataFromBackend(false);
      localStorage.setItem(storageKey, JSON.stringify(defaultData));
    }
  };

  const saveToLocalStorage = (updatedData) => {
    const projectId = currentProjectId;
    const storageKey = `resourceRateCardData_${projectId}`;
    localStorage.setItem(storageKey, JSON.stringify(updatedData));
  };

  const validateLevel = (value) => {
    return value.length >= 1 && value.length <= 50 && /^[a-zA-Z0-9\s\-_]+$/.test(value);
  };

  const validateLevelCode = (value) => {
    return value.length >= 1 && value.length <= 50 && /^[a-zA-Z0-9\s\-_]+$/.test(value);
  };

  const validateTitle = (value) => {
    return value.length >= 1 && value.length <= 100 && /^[a-zA-Z0-9\s&\-.,'\\/()]+$/.test(value);
  };

  const validateAmount = (value) => {
    return /^\d+$/.test(value) && parseInt(value) > 0;
  };

  const validateBusinessName = (value) => {
    return /^[a-zA-Z0-9\s&\-.,'\/()]*$/.test(value);
  };

  const startEditingField = (itemId, fieldName) => {
    setEditingFields(prev => ({
      ...prev,
      [`${itemId}_${fieldName}`]: true
    }));

    // Reset isSaved when user starts editing to allow changes
    if (isSaved) {
      setIsSaved(false);
    }
  };

  const stopEditingField = (itemId, fieldName) => {
    setEditingFields(prev => {
      const newState = { ...prev };
      delete newState[`${itemId}_${fieldName}`];
      return newState;
    });
  };

  const isFieldBeingEdited = (itemId, fieldName) => {
    return editingFields[`${itemId}_${fieldName}`] === true;
  };

  const handleFieldChange = (fieldName, value, id) => {
    // Auto-capitalize based on field type
    let capitalizedValue;
    if (fieldName === 'title') {
      capitalizedValue = value.charAt(0).toUpperCase() + value.slice(1);
    } else if (fieldName === 'level' || fieldName === 'levelCode') {
      capitalizedValue = value.toUpperCase();
    } else {
      capitalizedValue = value;
    }

    handleInlineEdit(id, fieldName, capitalizedValue);
  };

  const handleEditFieldChange = (fieldName, value) => {
    // Auto-capitalize based on field type
    let capitalizedValue;
    if (fieldName === 'title') {
      capitalizedValue = value.charAt(0).toUpperCase() + value.slice(1);
    } else if (fieldName === 'level' || fieldName === 'levelCode') {
      capitalizedValue = value.toUpperCase();
    } else {
      capitalizedValue = value;
    }

    setEditValues({ ...editValues, [fieldName]: capitalizedValue });
  };

  const handleInlineEdit = (id, field, value) => {
    const item = data.find(d => d.id === id);

    // Allow editing for:
    // 1. New items (item.isNew)
    // 2. Items with rate_card_id that have editing fields active
    // Block editing only if isSaved is true AND item is not new AND no fields are being edited
    const hasActiveEditingFields =
      isFieldBeingEdited(item.id, 'currency') ||
      isFieldBeingEdited(item.id, 'amountPerHour') ||
      isFieldBeingEdited(item.id, 'currencyOne') ||
      isFieldBeingEdited(item.id, 'amountPerHourOne');

    if (isSaved && !item.isNew && !hasActiveEditingFields) return;

    // Validate input based on field type
    if (field === 'level' || field === 'levelCode' || field === 'title') {
      let isValid = false;

      if (field === 'level') {
        isValid = validateBusinessName(value);
      } else if (field === 'levelCode') {
        isValid = validateBusinessName(value);
      } else if (field === 'title') {
        isValid = validateBusinessName(value);
      }

      if (!isValid) {
        return;
      }
    }

    // Currency fields are validated by dropdown selection, so no need to validate here

    const updatedData = data.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    );
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
    if (field === 'level' && value.length >= 50) {
      setFieldErrors(prev => ({
        ...prev,
        [`${id}_level`]: '50/50 Limit exceeded'
      }));
    } else if (field === 'level' && value.length < 50 && fieldErrors[`${id}_level`] === '50/50 Limit exceeded') {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`${id}_level`];
        return newErrors;
      });
    }

    if (field === 'levelCode' && value.length >= 50) {
      setFieldErrors(prev => ({
        ...prev,
        [`${id}_levelCode`]: '50/50 Limit exceeded'
      }));
    } else if (field === 'levelCode' && value.length < 50 && fieldErrors[`${id}_levelCode`] === '50/50 Limit exceeded') {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`${id}_levelCode`];
        return newErrors;
      });
    }

    if (field === 'title' && value.length >= 100) {
      setFieldErrors(prev => ({
        ...prev,
        [`${id}_title`]: '100/100 Limit exceeded'
      }));
    } else if (field === 'title' && value.length < 100 && fieldErrors[`${id}_title`] === '100/100 Limit exceeded') {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`${id}_title`];
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

  const handleEdit = (id) => {
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
    if (item) {
      // Check if another item is already being edited
      if (editingItem !== null && editingItem !== id) {
        showConfirmation(
          'You have unsaved changes. Do you want to discard them and edit another record?',
          () => {
            // User confirmed, proceed to edit the new item
            setIsSaved(false);
            setEditingItem(id);
            setEditValues({
              level: item.level,
              levelCode: item.levelCode,
              title: item.title,
              currency: item.currency,
              amountPerHour: item.amountPerHour,
              currencyOne: item.currencyOne,
              amountPerHourOne: item.amountPerHourOne,
              isActive: item.isActive
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
        );
      } else if (hasNewRow) {
        // Check if there's an unsaved new row
        showConfirmation(
          'You have unsaved changes. Do you want to continue?',
          () => {
            // User clicked Yes - discard the unsaved row and proceed with edit
            const savedData = data.filter(row => !row.isNew);
            setData(savedData);
            setHasNewRow(false);
            setChangedItems(new Set());

            // Now set the edit mode
            setIsSaved(false);
            setEditingItem(id);
            setEditValues({
              level: item.level,
              levelCode: item.levelCode,
              title: item.title,
              currency: item.currency,
              amountPerHour: item.amountPerHour,
              currencyOne: item.currencyOne,
              amountPerHourOne: item.amountPerHourOne,
              isActive: item.isActive
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
        );
      } else {
        // No unsaved changes, proceed normally
        setIsSaved(false);
        setEditingItem(id);
        setEditValues({
          level: item.level,
          levelCode: item.levelCode,
          title: item.title,
          currency: item.currency,
          amountPerHour: item.amountPerHour,
          currencyOne: item.currencyOne,
          amountPerHourOne: item.amountPerHourOne,
          isActive: item.isActive
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

    // Check if organization is selected
    if (!selectedOrganization || selectedOrganization.trim() === '') {
      setErrorMessage('Please select an Organization Name before saving.');
      setShowErrorMessage(true);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 5000);
      return;
    }

    // Validate required fields for editing existing records
    const errors = {};

    if (!editValues.level || editValues.level.trim() === '') {
      errors[`${id}_level`] = 'Required field';
    }

    if (!editValues.levelCode || editValues.levelCode.trim() === '') {
      errors[`${id}_levelCode`] = 'Required field';
    }

    if (!editValues.title || editValues.title.trim() === '') {
      errors[`${id}_title`] = 'Required field';
    }

    if (!editValues.currency || editValues.currency.trim() === '') {
      errors[`${id}_currency`] = 'Required field';
    }

    if (!editValues.amountPerHour || editValues.amountPerHour.trim() === '') {
      errors[`${id}_amountPerHour`] = 'Required field';
    }

    if (!editValues.currencyOne || editValues.currencyOne.trim() === '') {
      errors[`${id}_currencyOne`] = 'Required field';
    }

    if (!editValues.amountPerHourOne || editValues.amountPerHourOne.trim() === '') {
      errors[`${id}_amountPerHourOne`] = 'Required field';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);

      // Auto-scroll to show validation errors
      setTimeout(() => {
        const editedRow = document.querySelector(`tr[data-row-id="${id}"]`);
        if (editedRow) {
          editedRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);

      return;
    }

    try {
      const item = data.find(d => d.id === id);
      const payload = {
        Resource_Rate_Card_id: item.rate_card_id,
        OR_PL_Currency: editValues.currency,
        OR_PL_Amount_hours: editValues.amountPerHour,
        OR_BL_Currency: editValues.currencyOne,
        OR_BL_Amount_hours: editValues.amountPerHourOne,
        updated_by: userId,
        saveDraft: false
      };

      // Get ID token for authorization
      let idToken = null;
      try {
        idToken = await getIdToken();
      } catch (tokenError) {
        console.error('Failed to get ID token for update:', tokenError);
      }

      const headers = {
        'Content-Type': 'application/json',
      };

      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      const response = await fetch('https://tfv4q9mq6g.execute-api.ap-south-1.amazonaws.com/New/ricew/rate-card/update/resourceRateCard', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        return;
      }

      if (response.ok) {
        setEditingItem(null);
        setEditValues({});

        // Clear field errors after successful edit
        setFieldErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[`${id}_level`];
          delete newErrors[`${id}_levelCode`];
          delete newErrors[`${id}_title`];
          delete newErrors[`${id}_currency`];
          delete newErrors[`${id}_amountPerHour`];
          delete newErrors[`${id}_currencyOne`];
          delete newErrors[`${id}_amountPerHourOne`];
          return newErrors;
        });

        // Show success message
        setSuccessMessage('Rate card updated successfully!');
        setShowSuccessMessage(true);
        setTimeout(() => {
          setShowSuccessMessage(false);
          setSuccessMessage('');
        }, 3000);

        // Reload table data from API to get fresh data
        await loadData(selectedOrganization, selectedServiceLine);
      } else {
        console.error('Failed to update item');
      }
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const handleCancelEdit = () => {
    // Clear field errors for the item that was being edited
    if (editingItem) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`${editingItem}_level`];
        delete newErrors[`${editingItem}_levelCode`];
        delete newErrors[`${editingItem}_title`];
        delete newErrors[`${editingItem}_currency`];
        delete newErrors[`${editingItem}_amountPerHour`];
        delete newErrors[`${editingItem}_currencyOne`];
        delete newErrors[`${editingItem}_amountPerHourOne`];
        return newErrors;
      });
    }

    setEditingItem(null);
    setEditValues({});
  };

  const handleClearFields = (id) => {
    const updatedData = data.map(item =>
      item.id === id ? {
        ...item,
        currency: '',
        amountPerHour: '',
        currencyOne: '',
        amountPerHourOne: ''
      } : item
    );
    setData(updatedData);
    saveToLocalStorage(updatedData);

    // Clear field errors for this item
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[`${id}_currency`];
      delete newErrors[`${id}_amountPerHour`];
      delete newErrors[`${id}_currencyOne`];
      delete newErrors[`${id}_amountPerHourOne`];
      return newErrors;
    });

    // Clear editing state for all fields of this item
    setEditingFields(prev => {
      const newState = { ...prev };
      delete newState[`${id}_currency`];
      delete newState[`${id}_amountPerHour`];
      delete newState[`${id}_currencyOne`];
      delete newState[`${id}_amountPerHourOne`];
      return newState;
    });

    // Remove from changed items since we're clearing the fields
    setChangedItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const handleSaveAll = async () => {
    console.log('Save All button clicked');

    // Restrict updates when table is locked
    if (isLocked) {
      setErrorMessage('Cannot save records while table is locked. Please unlock the table first.');
      setShowErrorMessage(true);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 5000);
      return;
    }

    // Check if organization is selected
    if (!selectedOrganization || selectedOrganization.trim() === '') {
      setErrorMessage('Please select an Organization Name before saving.');
      setShowErrorMessage(true);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 5000);
      return;
    }

    // Check if Rate Card Name is provided (Mandatory)
    if (!rateCardName || rateCardName.trim() === '') {
      setErrorMessage('Please enter a Resource Rate Card Name.');
      setShowErrorMessage(true);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 5000);
      return;
    }

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

    // Check ALL existing items for submit operation - ALL fields must be filled for every record
    const itemsToValidate = data.filter(item => !item.isNew); // Only validate existing (non-new) items

    if (itemsToValidate.length > 0) {
      // Validate all existing items - ALL fields must be filled for submit
      const allErrors = {};
      let hasCompleteRecords = false;

      for (const item of itemsToValidate) {
        const itemErrors = {};

        // For submit operation, ALL fields are required
        if (!item.currency || item.currency.trim() === '') {
          itemErrors[`${item.id}_currency`] = 'Required field';
        }

        if (!item.amountPerHour || item.amountPerHour.trim() === '') {
          itemErrors[`${item.id}_amountPerHour`] = 'Required field';
        } else if (!validateAmount(item.amountPerHour)) {
          itemErrors[`${item.id}_amountPerHour`] = 'Must be a valid positive number (e.g., 50)';
        }

        if (!item.currencyOne || item.currencyOne.trim() === '') {
          itemErrors[`${item.id}_currencyOne`] = 'Required field';
        }

        if (!item.amountPerHourOne || item.amountPerHourOne.trim() === '') {
          itemErrors[`${item.id}_amountPerHourOne`] = 'Required field';
        } else if (!validateAmount(item.amountPerHourOne)) {
          itemErrors[`${item.id}_amountPerHourOne`] = 'Must be a valid positive number (e.g., 50)';
        }

        // Check if this record is completely filled (all 4 rate fields)
        const isComplete = Object.keys(itemErrors).length === 0;

        if (isComplete) {
          hasCompleteRecords = true;
        } else {
          // Add errors for this incomplete record
          Object.assign(allErrors, itemErrors);
        }
      }

      // If there are validation errors, show them
      if (Object.keys(allErrors).length > 0) {
        setFieldErrors(allErrors);
        setErrorMessage('Please fill in all required fields for all records before submitting.');
        setShowErrorMessage(true);
        setTimeout(() => {
          setShowErrorMessage(false);
          setErrorMessage('');
        }, 5000);
        return;
      }

      // If no complete records to save, show message
      if (!hasCompleteRecords) {
        setErrorMessage('No complete records to save. Please fill in both Onsite and Offshore rates for at least one record.');
        setShowErrorMessage(true);
        setTimeout(() => {
          setShowErrorMessage(false);
          setErrorMessage('');
        }, 5000);
        return;
      }
    }

    // Filter only complete items for saving (both new items and items without rate_card_id)
    const newItems = data.filter(item =>
      (item.isNew || !item.rate_card_id) &&
      item.currency && item.currency.trim() !== '' &&
      item.amountPerHour && item.amountPerHour.trim() !== '' &&
      item.currencyOne && item.currencyOne.trim() !== '' &&
      item.amountPerHourOne && item.amountPerHourOne.trim() !== ''
    );

    try {
      setLoading(true);

      // Include all items that have a rate_card_id to ensure they are all finalized (saveDraft: false)
      const changedSystemItems = data.filter(item => !!item.rate_card_id);

      // Update changed items (only items with rate_card_id that have complete data)
      const bulkPayload = [];
      for (const item of changedSystemItems) {
        // Only add to payload if all rate fields are filled
        const hasCompleteData =
          item.currency && item.currency.trim() !== '' &&
          item.amountPerHour && item.amountPerHour.trim() !== '' &&
          item.currencyOne && item.currencyOne.trim() !== '' &&
          item.amountPerHourOne && item.amountPerHourOne.trim() !== '';

        if (!hasCompleteData) {
          console.log(`Skipping update for item ${item.id} - incomplete data`);
          continue;
        }

        bulkPayload.push({
          Resource_Rate_Card_id: item.rate_card_id,
          Resource_Rate_Card_Name: rateCardName, // Added mandatory field
          OR_PL_Currency: item.currency,
          OR_PL_Amount_hours: item.amountPerHour,
          OR_BL_Currency: item.currencyOne,
          OR_BL_Amount_hours: item.amountPerHourOne,
          updated_by: userId,
          saveDraft: false
        });
      }

      if (bulkPayload.length > 0) {
        console.log('Updating rate cards in bulk:', bulkPayload);

        // Get ID token for authorization
        let idToken = null;
        try {
          idToken = await getIdToken();
        } catch (tokenError) {
          console.error('Failed to get ID token for bulk update:', tokenError);
        }

        const headers = {
          'Content-Type': 'application/json',
        };

        if (idToken) {
          headers['Authorization'] = `Bearer ${idToken}`;
        }

        const response = await fetch('https://tfv4q9mq6g.execute-api.ap-south-1.amazonaws.com/New/ricew/rate-card/update/resourceRateCard', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(bulkPayload)
        });

        if (response.status === 401 || response.status === 403) {
          handleAuthError('Unauthorized - session expired');
          return;
        }

        if (response.ok) {
          console.log('Bulk update successful');
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('Bulk update failed:', errorData);
          throw new Error(errorData.error || 'Failed to update records');
        }
      }

      // Note: API calls to create new rate cards have been moved to handleOrganizationSelect
      // which is called when organization is selected

      // Show appropriate success message based on what was saved
      let successMessage = '';
      if (newItems.length > 0 && changedSystemItems.length === 0) {
        successMessage = 'Rate card saved successfully!';
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
      setEditingFields({}); // Clear all editing states after successful save
      setIsDraftOrganization(false); // Clear draft status after successful submit
      console.log('All changes saved successfully');

      // Reload table data from API to get fresh data silently
      setLoading(false);
      setSavingDraft && setSavingDraft(false); // If saving draft is true, toggle it too
      await loadData(selectedOrganization, selectedServiceLine);

      // Update originalData after reload completes
      // Note: loadData will update the data state, so we need to wait a bit
      setTimeout(() => {
        setOriginalData(data.map(item => ({ ...item })));
      }, 100);
    } catch (error) {
      console.error('Error saving changes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
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
          delete newErrors[`${id}_level`];
          delete newErrors[`${id}_levelCode`];
          delete newErrors[`${id}_title`];
          delete newErrors[`${id}_currency`];
          delete newErrors[`${id}_amountPerHour`];
          delete newErrors[`${id}_currencyOne`];
          delete newErrors[`${id}_amountPerHourOne`];
          return newErrors;
        });

        // Update originalData to reflect the deletion
        setOriginalData(updatedData.map(item => ({ ...item })));
        return;
      }

      // For saved records, use custom confirmation dialog
      showConfirmation(
        'Are you sure you want to delete this rate card? This action cannot be undone.',
        async () => {
          try {
            // Get ID token for authorization
            let idToken = null;
            try {
              idToken = await getIdToken();
            } catch (tokenError) {
              console.error('Failed to get ID token for delete:', tokenError);
            }

            const headers = {};

            if (idToken) {
              headers['Authorization'] = `Bearer ${idToken}`;
            }

            const response = await fetch(`https://047kqyev3f.execute-api.ap-south-1.amazonaws.com/New/api/cost-estimation/resource-rate-card/delete?Resource_Rate_Card_Id=${item.rate_card_id || item.levelCode}`, {
              method: 'DELETE',
              headers: headers
            });

            if (response.ok) {
              // Show success message
              setSuccessMessage('Item deleted successfully!');
              setShowSuccessMessage(true);
              setTimeout(() => {
                setShowSuccessMessage(false);
                setSuccessMessage('');
              }, 3000);

              // Reload table data silently
              setLoading(false);
              await loadData(selectedOrganization, selectedServiceLine);
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
      showConfirmation(
        'You have unsaved changes. Do you want to discard them and add a new record?',
        () => {
          // User clicked Yes - cancel the edit and add a new row
          setEditingItem(null);
          setEditValues({});
          setValidationErrors({});

          // Add a new empty row
          const id = Math.max(...data.map(item => item.id)) + 1;
          const newRow = {
            id,
            level: '',
            levelCode: '',
            title: '',
            currency: '',
            amountPerHour: '',
            currencyOne: '',
            amountPerHourOne: '',
            isActive: true,
            projectId: selectedProject?.id || 101,
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
        }
      );
      return;
    }

    // If there are changes, save them FIRST, then add
    const hasChanges = Array.from(changedItems).some(id => {
      const item = data.find(d => d.id === id);
      return item && item.rate_card_id;
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
      level: '',
      levelCode: '',
      title: '',
      currency: '',
      amountPerHour: '',
      currencyOne: '',
      amountPerHourOne: '',
      isActive: true,
      projectId: selectedProject?.id || 101,
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
  };

  const handleSaveNewRow = async () => {
    const newItem = data.find(item => item.isNew);
    if (!newItem) return;

    // Validate required fields - check for undefined, null, or empty strings
    const errors = {};

    // Check if organization is selected
    if (!selectedOrganization || selectedOrganization.trim() === '') {
      setErrorMessage('Please select an Organization Name before saving.');
      setShowErrorMessage(true);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 5000);
      return;
    }

    if (!newItem.level || newItem.level.trim() === '') {
      errors[`${newItem.id}_level`] = 'Required field';
    } else if (!validateBusinessName(newItem.level)) {
      errors[`${newItem.id}_level`] = 'Must contain only valid characters';
    }

    if (!newItem.levelCode || newItem.levelCode.trim() === '') {
      errors[`${newItem.id}_levelCode`] = 'Required field';
    } else if (!validateBusinessName(newItem.levelCode)) {
      errors[`${newItem.id}_levelCode`] = 'Must contain only valid characters';
    }

    if (!newItem.title || newItem.title.trim() === '') {
      errors[`${newItem.id}_title`] = 'Required field';
    } else if (!validateBusinessName(newItem.title)) {
      errors[`${newItem.id}_title`] = 'Must contain only valid characters';
    }

    if (!newItem.currency || newItem.currency.trim() === '') {
      errors[`${newItem.id}_currency`] = 'Required field';
    }

    if (!newItem.amountPerHour || newItem.amountPerHour.trim() === '') {
      errors[`${newItem.id}_amountPerHour`] = 'Required field';
    } else if (!validateAmount(newItem.amountPerHour)) {
      errors[`${newItem.id}_amountPerHour`] = 'Must be a valid positive number (e.g., 50)';
    }

    if (!newItem.currencyOne || newItem.currencyOne.trim() === '') {
      errors[`${newItem.id}_currencyOne`] = 'Required field';
    }

    if (!newItem.amountPerHourOne || newItem.amountPerHourOne.trim() === '') {
      errors[`${newItem.id}_amountPerHourOne`] = 'Required field';
    } else if (!validateAmount(newItem.amountPerHourOne)) {
      errors[`${newItem.id}_amountPerHourOne`] = 'Must be a valid positive number (e.g., 50)';
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
        Organization_Name: selectedOrganization,
        ServiceLine_name: selectedServiceLine,
        Level: newItem.level,
        Level_Code: newItem.levelCode,
        Title: newItem.title,
        Currency: newItem.currency,
        Amount_Per_Hour: newItem.amountPerHour,
        Currency_One: newItem.currencyOne,
        Amount_Per_Hour_One: newItem.amountPerHourOne,
        project_id: currentProjectId,
        user_id: userId,
        created_by: userId
      };

      // Get ID token for authorization
      let idToken = null;
      try {
        idToken = await getIdToken();
      } catch (tokenError) {
        console.error('Failed to get ID token for post:', tokenError);
      }

      const headers = {
        'Content-Type': 'application/json',
      };

      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      const response = await fetch('https://047kqyev3f.execute-api.ap-south-1.amazonaws.com/New/api/cost-estimation/resource-rate-card/post', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(itemData)
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        return;
      }

      if (response.ok) {
        setHasNewRow(false);
        setSuccessMessage('Rate card saved successfully!');
        setShowSuccessMessage(true);

        // Clear changed items since the new row has been saved
        setChangedItems(new Set());

        // Auto-hide success message after 3 seconds
        setTimeout(() => {
          setShowSuccessMessage(false);
          setSuccessMessage('');
        }, 3000);

        // Reload table data from API to get fresh data silently
        setLoading(false);
        await loadData(selectedOrganization, selectedServiceLine);
      } else {
        // Handle API error response
        setErrorMessage('Unable to save rate card. Please check your information and try again.');
        setShowErrorMessage(true);
        setTimeout(() => {
          setShowErrorMessage(false);
          setErrorMessage('');
        }, 5000);
      }
    } catch (error) {
      console.error('Error saving new row:', error);
      setErrorMessage('Unable to save rate card. Please try again later.');
      setShowErrorMessage(true);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 5000);
    }
  };

  const handleSaveDraft = async () => {
    // Restrict updates when table is locked
    if (isLocked) {
      setErrorMessage('Cannot save draft while table is locked. Please unlock the table first.');
      setShowErrorMessage(true);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 5000);
      return;
    }

    // Check if organization is selected
    if (!selectedOrganization || selectedOrganization.trim() === '') {
      setErrorMessage('Please select an Organization Name before saving draft.');
      setShowErrorMessage(true);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 5000);
      return;
    }

    try {
      setSavingDraft(true);
      setLoading(true);

      // Collect all records that have rate_card_id with their current values
      const recordsToUpdate = data
        .filter(item => item.rate_card_id) // Only include existing records with rate_card_id
        .map(item => ({
          Resource_Rate_Card_id: item.rate_card_id,
          Resource_Rate_Card_Name: rateCardName, // Added field to payload
          OR_PL_Currency: item.currency || '',
          OR_PL_Amount_hours: item.amountPerHour || '',
          OR_BL_Currency: item.currencyOne || '',
          OR_BL_Amount_hours: item.amountPerHourOne || ''
        }));

      const payload = {
        organization_id: selectedOrganization,
        ServiceLine_name: selectedServiceLine,
        updated_by: userId,
        records: recordsToUpdate
      };



      console.log('Sending draft payload:', payload);

      // Get ID token for authorization
      let idToken = null;
      try {
        idToken = await getIdToken();
      } catch (tokenError) {
        console.error('Failed to get ID token for save draft:', tokenError);
      }

      const headers = {
        'Content-Type': 'application/json',
      };

      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      const response = await fetch('https://tfv4q9mq6g.execute-api.ap-south-1.amazonaws.com/New/ricew/rate-card/draftAll/byOrganization', {
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
        setSuccessMessage(`${result.updatedCount || 0} rate cards set to draft successfully!`);
        setShowSuccessMessage(true);
        setTimeout(() => {
          setShowSuccessMessage(false);
          setSuccessMessage('');
        }, 3000);

        // Clear any unsaved changes tracking
        setChangedItems(new Set());
        setHasNewRow(false);
        setEditingFields({});

        // Reload table data to reflect draft status silently
        setLoading(false);
        setSavingDraft && setSavingDraft(false);
        await loadData(selectedOrganization, selectedServiceLine);
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
      setLoading(false);
    }
  };

  const handleLockUnlock = async () => {
    if (!selectedOrganization || !selectedServiceLine) {
      setErrorMessage('Please select both Organization and Service Line before locking/unlocking.');
      setShowErrorMessage(true);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 5000);
      return;
    }

    try {
      setLoading(true);
      const newLockedState = !isLocked;
      const payload = {
        organization_id: selectedOrganization,
        ServiceLine_name: selectedServiceLine,
        isLocked: newLockedState ? "true" : "false",
        updated_by: userId
      };

      console.log('Calling lock/unlock API with payload:', payload);

      // Get ID token for authorization
      let idToken = null;
      try {
        idToken = await getIdToken();
      } catch (tokenError) {
        console.error('Failed to get ID token for lock/unlock:', tokenError);
      }

      const headers = {
        'Content-Type': 'application/json',
      };

      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      const response = await fetch('https://tfv4q9mq6g.execute-api.ap-south-1.amazonaws.com/New/ricew/resourceRateCard/updateLocked/byOrganization', {
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

        // Reload data to ensure everything is in sync silently
        setLoading(false);
        await loadData(selectedOrganization, selectedServiceLine);
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
  };

  return (
    <>
      <div className="config-main" style={{ minHeight: '80vh' }}>
        <div style={{ padding: '2rem 2rem 1rem 2rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project : <span style={{ color: '#2563eb' }}>{projectName || selectedProject?.name || ''}</span></h3>
        </div>
        <div className="config-header" style={{ marginTop: '0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0 }}>Resource Rate Card</h2>
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
                      The <strong>Resource Rate Card</strong> page allows you to define and manage hourly billing rates for all resource levels within a selected organization and service line. It displays each resource level with its designation and enables you to set different rates for onsite (at client location) and offshore (at base location) delivery models. This forms the basis for accurate project costing and resource budgeting.
                    </p>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>Why is this used?</strong>
                    <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                      Rate cards are critical for project financial planning and billing. They enable you to: (1) establish consistent hourly rates across all resource levels for fair billing, (2) differentiate between onsite and offshore rates to reflect delivery model economics, (3) calculate accurate project costs and resource requirements, (4) manage budgets and revenue forecasts, and (5) provide clear cost structures to stakeholders and clients.
                    </p>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>Understanding the columns</strong>
                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                      <li><strong>Level</strong> — The resource seniority or role level identifier (e.g., L1, L2, L3) defined in your organization's Resource Level Definition.</li>
                      <li><strong>Level Code</strong> — A system code assigned to the resource level for reporting and integration purposes.</li>
                      <li><strong>Designation / Title</strong> — The job title or designation associated with this resource level (e.g., Senior Consultant, Junior Developer, Project Manager).</li>
                      <li><strong>Onsite Rate (Project Location) — Currency</strong> — The currency used for onsite billing (e.g., USD, EUR, INR).</li>
                      <li><strong>Onsite Rate — Amount / Hour</strong> — The hourly rate for resources working at the client's location.</li>
                      <li><strong>Offshore Rate (Base Location) — Currency</strong> — The currency used for offshore billing, typically matching onsite currency or reflecting base location economics.</li>
                      <li><strong>Offshore Rate — Amount / Hour</strong> — The hourly rate for resources working remotely from the organization's base location.</li>
                    </ul>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to use this page</strong>
                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                      <li>Select an <strong>Organization Name</strong> from the dropdown. This determines which organization's rates you want to configure.</li>
                      <li>Select a <strong>Service Line Name</strong>. The system will automatically populate resource levels for the selected organization and service line.</li>
                      <li>Enter a <strong>Resource Rate Card Name</strong> to identify this rate card (e.g., "FY2024 Standard Rates" or "Project ABC Rates").</li>
                      <li>The table displays all resource levels with their current onsite and offshore rates. Click the <strong>Edit</strong> (pencil) icon on any row to modify the rates.</li>
                      <li>When editing a row: Enter the <strong>Currency</strong> and <strong>Amount per Hour</strong> for both Onsite and Offshore delivery models.</li>
                      <li>Click the <strong>Save</strong> (✓) icon to confirm rate changes, or <strong>Cancel</strong> (✕) to discard them.</li>
                      <li>Use <strong>Save Draft</strong> to save your work in progress without finalizing. Use <strong>Submit</strong> to lock and finalize all rates.</li>
                      <li>Click the <strong>Lock</strong> button to prevent other users from editing these rates. Click <strong>Unlock</strong> to allow edits again.</li>
                    </ul>
                  </div>

                  <div style={{ marginBottom: '4px' }}>
                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>Important notes</strong>
                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                      <li>Both <strong>Organization Name</strong> and <strong>Service Line Name</strong> are mandatory. The system will not load resource levels until both are selected.</li>
                      <li>Resource levels are auto-populated from your organization's Resource Level Definition and cannot be added or deleted on this page.</li>
                      <li>Currency must match the organization's Primary Currency. If rates need to be in a different currency, contact your administrator to update the organization settings.</li>
                      <li><strong>Save Draft</strong> preserves your changes without finalizing, allowing you to continue editing later. <strong>Submit</strong> finalizes and locks all rates for that rate card.</li>
                      <li>The <strong>Lock</strong> feature prevents concurrent editing by multiple users. Always unlock before allowing others to modify rates.</li>
                      <li>Onsite and Offshore rates typically differ due to cost of living, delivery model, and resource location variations. Ensure rates reflect your commercial agreements.</li>
                      <li>If a rate card has been saved as a draft, you must complete and submit it before creating a new rate card for the same organization and service line.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <Loader loading={loading || savingDraft} message={savingDraft ? 'Saving Draft...' : 'Processing...'} />

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


        {/* Organization Name & Business Line Selectors */}
        <div style={{
          padding: '16px',
          borderBottom: '1px solid #e0e0e0',
          backgroundColor: '#f8f9fa',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          marginBottom: '0.2px',
        }}>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
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

                    // Clear all inline editing states
                    setEditingFields({});
                    setChangedItems(new Set());

                    // Clear service line and rate card name when organization changes
                    setSelectedServiceLine('');
                    setRateCardName('');
                  }}
                  options={organizationOptions}
                  error={false}
                  width="260px"
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

                    // Call API to create/check rate cards when service line is selected
                    if (selectedOrganization && value && value.trim() !== '') {
                      handleOrganizationSelect(selectedOrganization, value);
                    }
                  }}
                  options={serviceLineOptions}
                  error={false}
                  width="500px"
                />
              </div>
            </div>

            {/* Resource Rate Card Name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#333',
                whiteSpace: 'nowrap',
                marginRight: '0px'
              }}>
                Resource Rate Card Name <span style={{ color: 'red' }}>*</span>
              </label>
              <div style={{ width: '260px' }}>
                <TextField
                  size="small"
                  fullWidth
                  value={rateCardName}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow only alphabets, digits, spaces, and specific special characters: & - . , ' ( ) / _
                    const allowedCharsRegex = /^[A-Za-z0-9\s&\-.,')(\/_]*$/;

                    if (allowedCharsRegex.test(value) || value === '') {
                      // Capitalize first letter of each word, but allow subsequent letters to be whatever casing user types
                      const capitalizedValue = value
                        .split(' ')
                        .map(word => {
                          if (word.length === 0) return word;
                          return word.charAt(0).toUpperCase() + word.slice(1);
                        })
                        .join(' ');
                      setRateCardName(capitalizedValue);
                    }
                  }}
                  placeholder="Enter rate card name"
                  variant="outlined"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      fontSize: '14px',
                      backgroundColor: 'white',
                    },
                  }}
                />
              </div>
            </div>
          </div>
        </div>

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

        <div className="table-container" style={{
          maxHeight: '500px',
          overflowY: 'auto',
          position: 'relative',
          marginTop: isDraftOrganization ? '16px' : '0'
        }}>
          <table className="config-table" style={{ fontSize: '15px', borderCollapse: 'collapse', width: '100%' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 20, backgroundColor: '#fff' }}>
              <tr >
                <th rowSpan="2" style={{ padding: '12px 12px', fontSize: '15px', fontWeight: '600', width: '5%', verticalAlign: 'middle', border: '1px solid #ddd', backgroundColor: '#f5f5f5' }}>Level</th>
                <th rowSpan="2" style={{ padding: '12px 12px', fontSize: '15px', fontWeight: '600', width: '9%', verticalAlign: 'middle', border: '1px solid #ddd', backgroundColor: '#f5f5f5' }}>Level Code</th>
                <th rowSpan="2" style={{ padding: '12px 12px', fontSize: '15px', fontWeight: '600', width: '14%', verticalAlign: 'middle', border: '1px solid #ddd', backgroundColor: '#f5f5f5' }}>Designation / Title</th>
                <th colSpan="2" style={{ padding: '12px 12px', fontSize: '15px', fontWeight: '600', textAlign: 'center', border: '1px solid #ddd', borderRight: '2px solid #999', backgroundColor: '#f5f5f5' }}>Onsite Rate (Project Location)</th>
                <th colSpan="2" style={{ padding: '12px 12px', fontSize: '15px', fontWeight: '600', textAlign: 'center', border: '1px solid #ddd', backgroundColor: '#f5f5f5' }}>Offshore Rate (Base Location)</th>
                <th rowSpan="2" style={{ padding: '12px 12px', fontSize: '15px', fontWeight: '600', width: '3%', textAlign: 'center', verticalAlign: 'middle', border: '1px solid #ddd', backgroundColor: '#f5f5f5' }}>Edit</th>
              </tr>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ padding: '12px 12px', fontSize: '14px', fontWeight: '600', width: '9%', border: '1px solid #ddd', borderTop: '2px solid #999', backgroundColor: '#f5f5f5' }}>Currency</th>
                <th style={{ padding: '12px 12px', fontSize: '14px', fontWeight: '600', width: '10%', border: '1px solid #ddd', borderRight: '2px solid #999', borderTop: '2px solid #999', backgroundColor: '#f5f5f5' }}>Amount / Hour</th>
                <th style={{ padding: '12px 12px', fontSize: '14px', fontWeight: '600', width: '9%', border: '1px solid #ddd', borderTop: '2px solid #999', backgroundColor: '#f5f5f5' }}>Currency</th>
                <th style={{ padding: '12px 12px', fontSize: '14px', fontWeight: '600', width: '10%', border: '1px solid #ddd', borderTop: '2px solid #999', backgroundColor: '#f5f5f5' }}>Amount / Hour</th>
              </tr>
            </thead>
            <tbody>
              {useMemo(() => {
                return [...data]
                  .sort((a, b) => {
                    // Always put new items at the bottom
                    if (a.isNew && !b.isNew) return 1;
                    if (!a.isNew && b.isNew) return -1;

                    // Prioritize records with rate_card_id (existing records) over those without
                    const aHasRateCard = !!a.rate_card_id;
                    const bHasRateCard = !!b.rate_card_id;

                    if (aHasRateCard && !bHasRateCard) return -1;
                    if (!aHasRateCard && bHasRateCard) return 1;

                    // Within the same group, sort by level (Level_id) ascending (L1, L2, L3...)
                    const aLevelNum = parseInt(a.level?.replace(/[^\d]/g, '')) || 0;
                    const bLevelNum = parseInt(b.level?.replace(/[^\d]/g, '')) || 0;
                    if (aLevelNum !== bLevelNum) {
                      return aLevelNum - bLevelNum;
                    }

                    // If same level number, fallback to string comparison
                    return (a.level || '').localeCompare(b.level || '');
                  })
                  .map((item) => {
                    const sanitizedLevel = DOMPurify.sanitize(item.level || '', { ALLOWED_TAGS: [] });
                    const sanitizedLevelCode = DOMPurify.sanitize(item.levelCode || '', { ALLOWED_TAGS: [] });
                    const sanitizedTitle = DOMPurify.sanitize(item.title || '', { ALLOWED_TAGS: [] });
                    const sanitizedCurrency = DOMPurify.sanitize(item.currency || '', { ALLOWED_TAGS: [] });
                    const sanitizedCurrencyOne = DOMPurify.sanitize(item.currencyOne || '', { ALLOWED_TAGS: [] });
                    const sanitizedAmountPerHour = DOMPurify.sanitize(String(item.amountPerHour) || '', { ALLOWED_TAGS: [] });
                    const sanitizedAmountPerHourOne = DOMPurify.sanitize(String(item.amountPerHourOne) || '', { ALLOWED_TAGS: [] });

                    return (
                      <tr key={item.id} data-row-id={item.id} style={{ backgroundColor: isLocked ? '#f5f5f5' : '#fff', borderBottom: '1px solid #ddd' }}>
                        <td style={{ padding: '6px 12px', verticalAlign: 'middle', border: '1px solid #ddd', textAlign: 'center' }}>
                          {item.isNew ? (
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <TextField
                                  size="small"
                                  style={{ flex: 1 }}
                                  value={item.level}
                                  onChange={(e) => handleFieldChange('level', e.target.value, item.id)}
                                  placeholder="Level *"
                                  variant="outlined"
                                  error={!!fieldErrors[`${item.id}_level`]}
                                  inputProps={{ maxLength: 50 }}
                                  sx={{
                                    '& .MuiOutlinedInput-root': { fontSize: '14px' },
                                  }}
                                />
                                <div style={{ fontSize: '12px', color: (item.level || '').length >= 50 ? '#ef4444' : '#6b7280', whiteSpace: 'nowrap' }}>
                                  {(item.level || '').length}/50
                                </div>
                              </div>
                              {fieldErrors[`${item.id}_level`] && (
                                <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                                  {DOMPurify.sanitize(fieldErrors[`${item.id}_level`], { ALLOWED_TAGS: [] })}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{
                              fontSize: '14px',
                              padding: '8px 0',
                              color: '#333',
                              minHeight: '40px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              {sanitizedLevel}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '8px 12px', verticalAlign: 'middle', border: '1px solid #ddd' }}>
                          {item.isNew ? (
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <TextField
                                  size="small"
                                  style={{ flex: 1 }}
                                  value={item.levelCode}
                                  onChange={(e) => handleFieldChange('levelCode', e.target.value, item.id)}
                                  placeholder="Level Code *"
                                  variant="outlined"
                                  error={!!fieldErrors[`${item.id}_levelCode`]}
                                  inputProps={{ maxLength: 50 }}
                                  sx={{
                                    '& .MuiOutlinedInput-root': { fontSize: '14px' },
                                  }}
                                />
                                <div style={{ fontSize: '12px', color: (item.levelCode || '').length >= 50 ? '#ef4444' : '#6b7280', whiteSpace: 'nowrap' }}>
                                  {(item.levelCode || '').length}/50
                                </div>
                              </div>
                              {fieldErrors[`${item.id}_levelCode`] && (
                                <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                                  {DOMPurify.sanitize(fieldErrors[`${item.id}_levelCode`], { ALLOWED_TAGS: [] })}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{
                              fontSize: '14px',
                              padding: '8px 0',
                              color: '#333',
                              minHeight: '40px',
                              display: 'flex',
                              alignItems: 'center'
                            }}>
                              {sanitizedLevelCode}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '8px 12px', verticalAlign: 'top', border: '1px solid #ddd' }}>
                          {item.isNew ? (
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <TextField
                                  size="small"
                                  style={{ flex: 1 }}
                                  value={item.title}
                                  onChange={(e) => handleFieldChange('title', e.target.value, item.id)}
                                  placeholder="Title *"
                                  variant="outlined"
                                  error={!!fieldErrors[`${item.id}_title`]}
                                  inputProps={{ maxLength: 100 }}
                                  sx={{
                                    '& .MuiOutlinedInput-root': { fontSize: '14px' },
                                  }}
                                />
                                <div style={{ fontSize: '12px', color: (item.title || '').length >= 100 ? '#ef4444' : '#6b7280', whiteSpace: 'nowrap' }}>
                                  {(item.title || '').length}/100
                                </div>
                              </div>
                              {fieldErrors[`${item.id}_title`] && (
                                <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                                  {DOMPurify.sanitize(fieldErrors[`${item.id}_title`], { ALLOWED_TAGS: [] })}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{
                              fontSize: '14px',
                              padding: '8px 0',
                              color: '#333',
                              minHeight: '40px',
                              display: 'flex',
                              alignItems: 'center'
                            }}>
                              {sanitizedTitle}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '8px 12px', verticalAlign: 'top', border: '1px solid #ddd' }}>
                          <div style={{
                            fontSize: '14px',
                            padding: '8px 0',
                            color: '#333',
                            minHeight: '40px',
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            {item.currency ? DOMPurify.sanitize(currencyOptions.find(c => c.value === item.currency)?.label || item.currency, { ALLOWED_TAGS: [] }) : '-'}
                          </div>
                        </td>
                        <td style={{ padding: '6px 12px', verticalAlign: 'top', border: '1px solid #ddd', borderRight: '2px solid #999' }}>
                          {(item.isNew || editingItem === item.id || !item.rate_card_id || isFieldBeingEdited(item.id, 'amountPerHour') || !item.amountPerHour || !item.amountPerHour.trim()) ? (
                            <div>
                              <TextField
                                size="small"
                                value={editingItem === item.id ? editValues.amountPerHour : item.amountPerHour}
                                onChange={(e) => {
                                  if (item.rate_card_id && !item.isNew && editingItem !== item.id) {
                                    startEditingField(item.id, 'amountPerHour');
                                  }
                                  editingItem === item.id ? handleEditFieldChange('amountPerHour', e.target.value.replace(/[^0-9]/g, '')) : handleFieldChange('amountPerHour', e.target.value.replace(/[^0-9]/g, ''), item.id);
                                }}
                                onFocus={() => {
                                  if (item.rate_card_id && !item.isNew && editingItem !== item.id) {
                                    startEditingField(item.id, 'amountPerHour');
                                  }
                                }}
                                placeholder="0 *"
                                variant="outlined"
                                error={!!fieldErrors[`${item.id}_amountPerHour`]}
                                inputProps={{ maxLength: 10 }}
                                sx={{
                                  '& .MuiOutlinedInput-root': { fontSize: '14px' },
                                }}
                              />
                              {fieldErrors[`${item.id}_amountPerHour`] && (
                                <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                                  {DOMPurify.sanitize(fieldErrors[`${item.id}_amountPerHour`], { ALLOWED_TAGS: [] })}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div
                              style={{
                                fontSize: '14px',
                                padding: '8px 0',
                                color: '#333',
                                minHeight: '40px',
                                display: 'flex',
                                alignItems: 'center',
                                cursor: 'default'
                              }}>
                              {sanitizedAmountPerHour}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '6px 12px', verticalAlign: 'top', border: '1px solid #ddd' }}>
                          <div style={{
                            fontSize: '14px',
                            padding: '8px 0',
                            color: '#333',
                            minHeight: '40px',
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            {item.currencyOne ? DOMPurify.sanitize(currencyOptions.find(c => c.value === item.currencyOne)?.label || item.currencyOne, { ALLOWED_TAGS: [] }) : '-'}
                          </div>
                        </td>
                        <td style={{ padding: '6px 12px', verticalAlign: 'top', border: '1px solid #ddd' }}>
                          {(item.isNew || editingItem === item.id || !item.rate_card_id || isFieldBeingEdited(item.id, 'amountPerHourOne') || !item.amountPerHourOne || !item.amountPerHourOne.trim()) ? (
                            <div>
                              <TextField
                                size="small"
                                value={editingItem === item.id ? editValues.amountPerHourOne : item.amountPerHourOne}
                                onChange={(e) => {
                                  if (item.rate_card_id && !item.isNew && editingItem !== item.id) {
                                    startEditingField(item.id, 'amountPerHourOne');
                                  }
                                  editingItem === item.id ? handleEditFieldChange('amountPerHourOne', e.target.value.replace(/[^0-9]/g, '')) : handleFieldChange('amountPerHourOne', e.target.value.replace(/[^0-9]/g, ''), item.id);
                                }}
                                onFocus={() => {
                                  if (item.rate_card_id && !item.isNew && editingItem !== item.id) {
                                    startEditingField(item.id, 'amountPerHourOne');
                                  }
                                }}
                                placeholder="0 *"
                                variant="outlined"
                                error={!!fieldErrors[`${item.id}_amountPerHourOne`]}
                                inputProps={{ maxLength: 10 }}
                                sx={{
                                  '& .MuiOutlinedInput-root': { fontSize: '14px' },
                                }}
                              />
                              {fieldErrors[`${item.id}_amountPerHourOne`] && (
                                <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                                  {DOMPurify.sanitize(fieldErrors[`${item.id}_amountPerHourOne`], { ALLOWED_TAGS: [] })}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div
                              style={{
                                fontSize: '14px',
                                padding: '8px 0',
                                color: '#333',
                                minHeight: '40px',
                                display: 'flex',
                                alignItems: 'center',
                                cursor: 'default'
                              }}>
                              {sanitizedAmountPerHourOne}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '6px 4px', verticalAlign: 'middle', textAlign: 'center', border: '1px solid #ddd' }}>
                          <div className="action-icons" style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
                            {item.isNew ? (
                              <button
                                className="action-btn delete-btn"
                                onClick={() => handleDelete(item.id)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            ) : (
                              item.rate_card_id && editingItem === item.id ? (
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
                              ) : item.rate_card_id && (item.amountPerHour?.trim() || item.amountPerHourOne?.trim()) ? (
                                <button
                                  className="action-btn menu-btn"
                                  onClick={() => handleEdit(item.id)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '4px' }}
                                  title="Edit"
                                >
                                  <MoreVertical size={18} />
                                </button>
                              ) : !item.rate_card_id && !item.isNew && (
                                (item.currency && item.currency.trim() !== '') ||
                                (item.amountPerHour && item.amountPerHour.trim() !== '') ||
                                (item.currencyOne && item.currencyOne.trim() !== '') ||
                                (item.amountPerHourOne && item.amountPerHourOne.trim() !== '')
                              ) ? (
                                <button
                                  className="action-btn clear-btn"
                                  onClick={() => handleClearFields(item.id)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}
                                  title="Clear fields"
                                >
                                  <X size={16} />
                                </button>
                              ) : null
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  });
              }, [data, editingItem, editValues, isLocked, fieldErrors, editingFields])}
            </tbody>
          </table>
        </div>

        <div className="table-actions-bottom" style={{ display: 'flex', gap: '12px', marginTop: '16px', alignItems: 'center', marginLeft: '16px' }}>
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={savingDraft || isLocked || !isSelectionComplete}
            style={{
              padding: '00px 24px',
              backgroundColor: (savingDraft || isLocked || !isSelectionComplete) ? '#6c757d' : '#3b82f6',
              color: 'white',
              border: 'none',
              height: '31px',
              borderRadius: '4px',
              width: '140px',
              cursor: (savingDraft || isLocked || !isSelectionComplete) ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => !(savingDraft || isLocked || !isSelectionComplete) && (e.target.style.backgroundColor = '#2563eb')}
            onMouseLeave={(e) => !(savingDraft || isLocked || !isSelectionComplete) && (e.target.style.backgroundColor = '#3b82f6')}
          >
            {savingDraft ? 'Saving Draft...' : 'Save Draft'}
          </button>
          <button
            className="add-btn"
            style={{
              width: '120px',
              backgroundColor: (loading || isLocked || !isSelectionComplete) ? '#6c757d' : '',
              cursor: (loading || isLocked || !isSelectionComplete) ? 'not-allowed' : 'pointer'
            }}
            onClick={handleSaveAll}
            disabled={loading || isLocked || !isSelectionComplete}
          >
            Submit
          </button>
          <button
            onClick={handleLockUnlock}
            disabled={loading}
            style={{
              backgroundColor: isLocked ? '#dc3545' : '#17a2b8',
              color: 'white',
              border: 'none',
              height: '32px',
              width: '140px',
              padding: '0px 12px',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.backgroundColor = isLocked ? '#c82333' : '#156a8a';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.target.style.backgroundColor = isLocked ? '#dc3545' : '#17a2b8';
              }
            }}
            title={isLocked ? 'Unlock editing' : 'Lock editing'}
          >
            {isLocked ? <Unlock size={16} /> : <Lock size={16} />}
            {isLocked ? 'Unlock' : 'Lock'}
          </button>
        </div>

        {/* No Project Selected Popup */}
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

        <div style={{ height: '70px' }}></div>

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

export default ResourceRateCardTable;