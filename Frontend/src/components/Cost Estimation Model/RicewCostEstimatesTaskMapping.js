import React, { useState, useEffect, useRef, useMemo, Fragment } from 'react';
import { Edit, Trash2, X, Save, MoreVertical, HelpCircle, AlertCircle } from 'lucide-react';
import { TextField, MenuItem, Select, FormControl } from '@mui/material';
import DOMPurify from 'dompurify';
import { getIdToken } from '../../utils/cognito-auth';
import useLOV from '../../hooks/useLOV';
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

const RicewCostEstimatesTaskMapping = ({ onClose, selectedProject, setUnsavedChangesChecker }) => {
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
  const [hasActiveChanges, setHasActiveChanges] = useState(false);
  const [calculateCostLoading, setCalculateCostLoading] = useState(false);
  const [showLoading, setShowLoading] = useState(false);

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

  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState('');

  const [currencyCode, setCurrencyCode] = useState('');
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const [showNoRecordsFoundPopup, setShowNoRecordsFoundPopup] = useState(false);
  const [isMasterData, setIsMasterData] = useState(false);

  // Organization and Service Line State
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('');
  const [selectedBusinessLine, setSelectedBusinessLine] = useState('');
  const [serviceLineOptions, setServiceLineOptions] = useState([]);

  // Get consistent project_id
  const currentProjectId = (projectId || selectedProject?.id || '').toString();

  // Fetch organization options using same API as RicewOnsiteOffshoreTaskMap
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

  const showConfirmation = (message, action) => {
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setShowConfirmDialog(true);
  };

  // Helper function to extract currency code from currency string
  const extractCurrencyCode = (currencyString) => {
    if (!currencyString) return '';
    const match = currencyString.match(/\(([^)]+)\)/);
    return match ? match[1] : '';
  };

  // Helper function to clean contingency value (remove % sign and trim spaces)
  const cleanContingencyValue = (value) => {
    if (!value) return '';
    // Convert to string, remove % sign and trim whitespace
    return String(value).replace(/%/g, '').trim();
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



  // Handle Calculate Cost functionality
  const handleCalculateCost = async () => {
    console.log('Calculate Cost button clicked!');

    try {
      if (!currentProjectId || !selectedOrganizationId || !selectedBusinessLine || !userId) {
        setErrorMessage('Please ensure Project, Organization Name, Service Line, and User Session are active before calculating costs.');
        setShowErrorMessage(true);
        setTimeout(() => {
          setShowErrorMessage(false);
          setErrorMessage('');
        }, 5000);
        return;
      }
      console.log('Setting loading states to true...');
      setCalculateCostLoading(true);
      setShowLoading(true);
      setShowNoRecordsFoundPopup(false);
      console.log('showLoading should now be true');

      // Step 1: Call the POST API to calculate costs
      const postPayload = {
        project_id: currentProjectId,
        organization_id: selectedOrganizationId,
        Service_Line_name: selectedBusinessLine,
        user_id: userId,
        created_by: userId,
        updated_by: userId
      };

      console.log('Calling POST API with payload:', postPayload);

      let idToken = null;
      try {
        idToken = await getIdToken();
      } catch (tokenError) {
        console.error('Failed to get ID token for handleCalculateCost POST:', tokenError);
      }

      const headers = {
        'Content-Type': 'application/json',
      };

      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      const postResponse = await fetch('https://6v7ty9cd99.execute-api.ap-south-1.amazonaws.com/new/newApi/ricew/estimationModel/grouped', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(postPayload)
      });

      if (postResponse.status === 401 || postResponse.status === 403) {
        handleAuthError('Unauthorized - session expired');
        return;
      }

      if (!postResponse.ok) {
        const errorData = await postResponse.json().catch(() => ({}));
        console.error('POST API error:', errorData);

        // Handle specific error cases with user-friendly messages
        if (errorData.error === 'Missing required data') {
          let errorMsg = 'Cannot calculate costs. Missing required data:\n\n';

          if (errorData.missingTables && errorData.missingTables.length > 0) {
            errorMsg += 'Missing data from:\n';
            errorData.missingTables.forEach(table => {
              if (table === 'rice_RICEW_Estimation_Model') {
                errorMsg += '• RICEW Estimation Model (Base Hours)\n';
              } else if (table === 'rice_RICEW_Resource_Task_Mapping') {
                errorMsg += '• RICEW Resource Task Mapping\n';
              } else if (table === 'rice_RICEW_Onsite_Offshore_Task_Map') {
                errorMsg += '• RICEW Onsite Offshore Task Map\n';
              } else if (table === 'rice_RICEWOrganizationTaskMapping') {
                errorMsg += '• RICEW Organization Task Mapping\n';
              } else if (table === 'rice_Resource_Rate_Card') {
                errorMsg += '• Resource Rate Card\n';
              } else if (table.includes('Primary Implementation Partner')) {
                errorMsg += '• Resource Rate Card (Primary Implementation Partner for Currency)\n';
              } else {
                errorMsg += `• ${table}\n`;
              }
            });
          }

          errorMsg += '\nPlease complete all required data before calculating costs.';
          throw new Error(errorMsg);
        } else if (errorData.error === 'project_id is required') {
          throw new Error('Project ID is missing. Please ensure a project is selected.');
        } else {
          throw new Error(errorData.error || errorData.message || 'Failed to calculate costs. Please try again.');
        }
      }

      const postResult = await postResponse.json();
      console.log('POST API response:', postResult);

      // Step 2: Call the GET API to fetch updated data
      const queryString = `project_id=${currentProjectId}&organization_id=${selectedOrganizationId}&Service_Line_name=${encodeURIComponent(selectedBusinessLine)}`;

      // Get fresh token for the next call
      try {
        idToken = await getIdToken();
      } catch (tokenError) {
        console.error('Failed to get ID token for handleCalculateCost GET:', tokenError);
      }

      const getHeaders = {
        'Content-Type': 'application/json',
      };

      if (idToken) {
        getHeaders['Authorization'] = `Bearer ${idToken}`;
      }

      const getResponse = await fetch(`https://6v7ty9cd99.execute-api.ap-south-1.amazonaws.com/new/newApi/ricew/costEstimatesTaskMapping/getByProject?${queryString}`, {
        method: 'GET',
        headers: getHeaders
      });

      if (getResponse.status === 401 || getResponse.status === 403) {
        handleAuthError('Unauthorized - session expired');
        return;
      }

      if (!getResponse.ok) {
        const errorData = await getResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch updated cost data');
      }

      const getResult = await getResponse.json();
      console.log('GET API response:', getResult);

      // Step 3: Update the table data with the response
      if (getResult.success && getResult.data && getResult.data.length > 0) {
        const item = getResult.data[0];
        const currencyValue = item.currency || item.Code_Development_currency || Object.keys(item).find(key => key.endsWith('_currency') && item[key]) ? item[Object.keys(item).find(key => key.endsWith('_currency') && item[key])] : '';

        if (currencyValue) {
          const extractedCode = extractCurrencyCode(currencyValue);
          setCurrencyCode(extractedCode);
        }



        // Transform API data to match our frontend structure
        const transformedData = getResult.data.map((item, index) => ({
          id: index + 1,
          ricewName: item.Estimation_Name || '',
          complexity: item.ComplexityType || '',
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
          costExcludingContingency: item.Cost_excluding_Contingency || '',
          contingency: cleanContingencyValue(item.Contigency) || '',
          totalHours: item.Cost_Including_Contingency || '',
          projectId: item.project_id || currentProjectId,
          organization_id: item.organization_id,
          organization_name: item.organization_name,
          estimation_model_id: item.RICEW_Cost_Estimates_Task_id,
          isNew: false
        }));

        setData(transformedData);
        setOriginalData(transformedData.map(item => ({ ...item })));
        setDataFromBackend(true);

        // Clear any unsaved changes
        setChangedItems(new Set());
        setHasNewRow(false);
        setEditingItem(null);
        setEditValues({});
        setHasActiveChanges(false);
        setFieldErrors({});

        setSuccessMessage('Cost calculation completed successfully!');
        setShowSuccessMessage(true);
        setTimeout(() => {
          setShowSuccessMessage(false);
          setSuccessMessage('');
        }, 3000);
      } else {
        throw new Error('Invalid response format from API');
      }

    } catch (error) {
      console.error('Error calculating cost:', error);
      setErrorMessage(error.message || 'Error calculating cost. Please try again.');
      setShowErrorMessage(true);
      // Show error for longer (8 seconds) if it's a detailed validation error
      const timeout = error.message && error.message.includes('Missing required data') ? 8000 : 5000;
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, timeout);
    } finally {
      setCalculateCostLoading(false);
      setShowLoading(false);
    }
  };

  const getDefaultData = () => [
    {
      id: 1,
      ricewName: 'Report - Sales Analysis',
      complexity: 'High',
      isActive: true,
      originalActive: true,
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
      costExcludingContingency: '200',
      contingency: '10',
      totalHours: '249',
      projectId: currentProjectId
    },
    {
      id: 2,
      ricewName: 'Interface - Payment Gateway',
      complexity: 'Medium',
      isActive: true,
      originalActive: true,
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
      costExcludingContingency: '120',
      contingency: '5',
      totalHours: '126',
      projectId: currentProjectId
    }
  ];

  useEffect(() => {
    // Load data from backend when component mounts or project changes
    const fetchData = async () => {
      try {
        if (!selectedProject?.id && !projectId) {
          return;
        }

        if (!currentProjectId || !selectedOrganizationId || !selectedBusinessLine) {
          setData([]);
          setOriginalData([]);
          setCurrencyCode('');
          return;
        }
        setLoading(true);
        const queryString = `project_id=${currentProjectId}${selectedOrganizationId ? `&organization_id=${selectedOrganizationId}` : ''}${selectedBusinessLine ? `&Service_Line_name=${encodeURIComponent(selectedBusinessLine)}` : ''}`;

        let idToken = null;
        try {
          idToken = await getIdToken();
        } catch (tokenError) {
          console.error('Failed to get ID token for initial fetchData:', tokenError);
        }

        const headers = {
          'Content-Type': 'application/json',
        };

        if (idToken) {
          headers['Authorization'] = `Bearer ${idToken}`;
        }

        const response = await fetch(`https://6v7ty9cd99.execute-api.ap-south-1.amazonaws.com/new/newApi/ricew/costEstimatesTaskMapping/getByProject?${queryString}`, {
          method: 'GET',
          headers: headers
        });

        if (response.status === 401 || response.status === 403) {
          handleAuthError('Unauthorized - session expired');
          return;
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch cost estimates data');
        }

        const result = await response.json();
        console.log('Initial data fetch response:', result);

        if (result.success && result.data && result.data.length > 0) {
          const item = result.data[0];
          const currencyValue = item.currency || item.Code_Development_currency || Object.keys(item).find(key => key.endsWith('_currency') && item[key]) ? item[Object.keys(item).find(key => key.endsWith('_currency') && item[key])] : '';

          if (currencyValue) {
            const extractedCode = extractCurrencyCode(currencyValue);
            setCurrencyCode(extractedCode);
          }



          // Transform API data to match our frontend structure
          const transformedData = result.data.map((item, index) => ({
            id: index + 1,
            ricewName: item.Estimation_Name || '',
            complexity: item.ComplexityType || '',
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
            costExcludingContingency: item.Cost_excluding_Contingency || '',
            contingency: cleanContingencyValue(item.Contigency) || '',
            totalHours: item.Cost_Including_Contingency || '',
            projectId: item.project_id || currentProjectId,
            estimation_model_id: item.RICEW_Cost_Estimates_Task_id,
            isNew: false
          }));

          setData(transformedData);
          setOriginalData(transformedData.map(item => ({ ...item })));
          setDataFromBackend(true);
        } else {
          // No data found, initialize with empty table
          setData([]);
          setOriginalData([]);
          setCurrencyCode('');
          if (currentProjectId && selectedOrganizationId && selectedBusinessLine) {
            setShowNoRecordsFoundPopup(true);
          }
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
        // On error, initialize with empty table
        setData([]);
        setOriginalData([]);
        setCurrencyCode('');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedProject?.id, projectId, selectedOrganizationId, selectedBusinessLine]);

  // Derive service line options when organization changes (same logic as RicewOnsiteOffshoreTaskMap)
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
    setSelectedOrganizationId(newValue);
    setSelectedBusinessLine(''); // Reset service line when organization changes
    setData([]); // Clear data until service line is selected
    setOriginalData([]);
    setFieldErrors({});
    setValidationErrors({});
  };

  const handleServiceLineChange = (newValue) => {
    setSelectedBusinessLine(newValue);
    // fetchData will be triggered by useEffect
  };

  // Provide unsaved changes checker to parent component
  useEffect(() => {
    if (setUnsavedChangesChecker) {
      setUnsavedChangesChecker(() => () => {
        return hasNewRow || changedItems.size > 0 || editingItem !== null || hasActiveChanges;
      });
    }
  }, [hasNewRow, changedItems, editingItem, hasActiveChanges, setUnsavedChangesChecker]);

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



  const validateNumericField = (value) => {
    return /^\d+(\.\d{1,2})?$/.test(value) && parseFloat(value) >= 0;
  };

  const validateIntegerField = (value) => {
    return /^\d+$/.test(value) && parseInt(value) >= 0;
  };

  const handleFieldChange = (fieldName, value, id) => {
    // Auto-capitalize based on field type
    let capitalizedValue;
    if (fieldName === 'contingency') {
      // Allow decimal numbers for contingency
      capitalizedValue = value.replace(/[^0-9.]/g, '');
      const parts = capitalizedValue.split('.');
      if (parts.length > 2) {
        capitalizedValue = parts[0] + '.' + parts.slice(1).join('');
      }
    } else if (['fsWriting', 'fsReview', 'tsWriting', 'tsReview', 'codeDevlopment', 'codeReview', 'unitTesting', 'technicalSupport', 'migrationDocCreation', 'migrationEffort', 'pglSupport', 'pmoEffort', 'costExcludingContingency', 'totalHours'].includes(fieldName)) {
      // Only allow numeric input for these fields
      capitalizedValue = value.replace(/[^0-9]/g, '');
    } else {
      capitalizedValue = value;
    }

    handleInlineEdit(id, fieldName, capitalizedValue);
  };

  const handleEditFieldChange = (fieldName, value) => {
    let capitalizedValue;
    if (fieldName === 'contingency') {
      capitalizedValue = value.replace(/[^0-9.]/g, '');
      const parts = capitalizedValue.split('.');
      if (parts.length > 2) {
        capitalizedValue = parts[0] + '.' + parts.slice(1).join('');
      }
    } else if (['fsWriting', 'fsReview', 'tsWriting', 'tsReview', 'codeDevlopment', 'codeReview', 'unitTesting', 'technicalSupport', 'migrationDocCreation', 'migrationEffort', 'pglSupport', 'pmoEffort', 'costExcludingContingency', 'totalHours'].includes(fieldName)) {
      capitalizedValue = value.replace(/[^0-9]/g, '');
    } else {
      capitalizedValue = value;
    }

    setEditValues({ ...editValues, [fieldName]: capitalizedValue });
  };

  const handleInlineEdit = (id, field, value) => {
    const item = data.find(d => d.id === id);
    if (isSaved && !item.isNew) return;

    const updatedData = data.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setData(updatedData);

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
    const item = data.find(d => d.id === id);
    if (item) {
      setIsSaved(false);
      setEditingItem(id);
      setEditValues({
        isActive: item.isActive,
        contingency: item.contingency,
        costExcludingContingency: item.costExcludingContingency,
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
        pmoEffort: item.pmoEffort,
        totalHours: item.totalHours
      });

      setTimeout(() => {
        const editedRow = document.querySelector(`tr[data-row-id="${id}"]`);
        if (editedRow) {
          editedRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  };

  const handleSaveEdit = async (id) => {
    try {
      // TODO: Replace with actual API call
      console.log('Saving edit for item:', id, editValues);

      const updatedItem = {
        ...data.find(d => d.id === id),
        ...editValues,
        originalActive: editValues.isActive
      };

      const updatedData = data.map(item =>
        item.id === id ? updatedItem : item
      );

      setData(updatedData);
      setEditingItem(null);
      setEditValues({});
      setOriginalData(updatedData.map(item => ({ ...item })));

      const hasAnyActiveChanges = updatedData.some(item => item.isActive !== item.originalActive);
      setHasActiveChanges(hasAnyActiveChanges);

      setSuccessMessage('Cost estimate updated successfully!');
      setShowSuccessMessage(true);
      setTimeout(() => {
        setShowSuccessMessage(false);
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error updating item:', error);
      setErrorMessage('Error updating cost estimate. Please try again.');
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
  };

  const handleDelete = async (id) => {
    try {
      showConfirmation(
        'Are you sure you want to delete this cost estimate? This action cannot be undone.',
        async () => {
          try {
            // TODO: Replace with actual API call
            console.log('Deleting item:', id);

            const updatedData = data.filter(item => item.id !== id);
            setData(updatedData);

            setSuccessMessage('Cost estimate deleted successfully!');
            setShowSuccessMessage(true);
            setTimeout(() => {
              setShowSuccessMessage(false);
              setSuccessMessage('');
            }, 3000);
          } catch (error) {
            console.error('Error deleting item:', error);
          }
        }
      );
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  return (
    <Fragment>
    <div className="config-main" style={{ minHeight: '80vh' }}>
      <div style={{ padding: '2rem 2rem 1rem 2rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project : <span style={{ color: '#007bff' }}>{projectName || selectedProject?.name}</span></h3>
      </div>

      <div className="config-header" style={{ marginTop: '0', display: 'flex', alignItems: 'center', gap: '20px', justifyContent: 'flex-start' }}>
        <h2>RICEW Cost Rate Card (Base)</h2>
        <button
          onClick={handleCalculateCost}
          disabled={calculateCostLoading}
          style={{
            backgroundColor: calculateCostLoading ? '#6c757d' : '#28a745',
            color: 'white',
            border: 'none',
            height: '36px',
            padding: '0px 20px',
            borderRadius: '4px',
            cursor: calculateCostLoading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            opacity: calculateCostLoading ? 0.6 : 1,
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
            marginLeft: '20px'
          }}
          onMouseEnter={(e) => { if (!calculateCostLoading) e.target.style.backgroundColor = '#218838'; }}
          onMouseLeave={(e) => { if (!calculateCostLoading) e.target.style.backgroundColor = '#28a745'; }}
        >
          {calculateCostLoading ? 'Calculating...' : 'Calculate Cost'}
        </button>

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
                        The <strong>RICEW Cost Rate Card (Base)</strong> page displays the fully calculated cost breakdown for every RICEW item in the project. Costs are derived automatically from the upstream modules — Estimation Model, Resource Task Mapping, Onsite/Offshore Task Map, Organization Task Mapping, and Resource Rate Card — and are presented grouped by RICEW item name and complexity level, making it easy to compare costs across phases and complexity tiers.
                      </p>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <strong style={{ color: '#1f2937', fontSize: '15px' }}>Why is this used?</strong>
                      <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                        This page consolidates data from all upstream modules into a single financial view. It allows you to: (1) see the cost contribution of each delivery phase (FS, TS, Build, Testing, Migration, PGL, PMO) per RICEW item and complexity, (2) review base costs before and after applying a contingency buffer, (3) identify which RICEW items drive the highest project cost, and (4) support financial sign-off and client billing decisions.
                      </p>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <strong style={{ color: '#1f2937', fontSize: '15px' }}>Understanding the columns</strong>
                      <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                        <li><strong>RICEW Item</strong> — The estimation name (e.g., a Report, Interface, or Conversion). Rows with the same RICEW item are merged so each item can have Low / Medium / High complexity rows beneath it.</li>
                        <li><strong>Complexity</strong> — The complexity tier for that row (Low, Medium, High), as defined in the RICEW Estimation Model.</li>
                        <li><strong>Active</strong> — Indicates whether the row is active and included in cost totals.</li>
                        <li><strong>Functional Specifications (FS): FS Writing / FS Review</strong> — Cost for writing and reviewing functional specification documents.</li>
                        <li><strong>Technical Specification (TS): TS Writing / TS Review</strong> — Cost for writing and reviewing technical specification documents.</li>
                        <li><strong>Build: Code Development / Code Review</strong> — Cost for developing and reviewing the code for this RICEW item.</li>
                        <li><strong>Code Testing: Unit Testing</strong> — Cost for unit testing activities.</li>
                        <li><strong>SIT / INT / UAT: Technical Support</strong> — Cost for providing technical support during system integration, interface, and user acceptance testing.</li>
                        <li><strong>Migration: Migration Document Creation / Migration Effort</strong> — Cost for creating migration documents and executing the data migration.</li>
                        <li><strong>Post Go-Live Support (PGL): PGL Support</strong> — Cost for supporting the system after go-live.</li>
                        <li><strong>Delivery PMO: PMO Effort</strong> — Cost for project management office oversight and coordination.</li>
                        <li><strong>Cost (excluding Contingency)</strong> — The total base cost across all phases before any contingency buffer is applied.</li>
                        <li><strong>Percentage Contingency</strong> — The contingency buffer (%) added to cover project risks and uncertainties.</li>
                        <li><strong>Cost (Including Contingency)</strong> — The final project cost after applying the contingency percentage to the base cost.</li>
                      </ul>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to use this page</strong>
                      <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                        <li>Select an <strong>Organization Name</strong> from the dropdown — this filters cost estimates to the chosen implementation partner organisation.</li>
                        <li>Select a <strong>Service Line Name</strong> — this further narrows results to the business line / portfolio / service combination for that organisation.</li>
                        <li>Once both filters are set, click the green <strong>Calculate Cost</strong> button. The system will process data from all upstream modules and populate the table with calculated costs.</li>
                        <li>The table groups rows by <strong>RICEW Item</strong> (merged cells) with each row representing one complexity tier (Low / Medium / High). Review the phase-level cost columns to see where effort and cost are concentrated.</li>
                        <li>If the calculation fails, a detailed error message will indicate which upstream modules are missing data (e.g., "RICEW Estimation Model", "Resource Rate Card"). Complete those modules first, then retry.</li>
                        <li>After reviewing, use the upstream modules to adjust effort estimates or resource rates, then click <strong>Calculate Cost</strong> again to refresh the cost data.</li>
                      </ul>
                    </div>

                    <div style={{ marginBottom: '4px' }}>
                      <strong style={{ color: '#1f2937', fontSize: '15px' }}>Important notes</strong>
                      <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                        <li>All costs on this page are <strong>calculated automatically</strong> — the table is read-only. To change cost figures, update the source data in the upstream modules and recalculate.</li>
                        <li>The <strong>Calculate Cost</strong> button requires all five upstream modules to have saved data: RICEW Estimation Model, Resource Task Mapping, Onsite/Offshore Task Map, Organization Task Mapping, and Resource Rate Card.</li>
                        <li>Both <strong>Organization Name</strong> and <strong>Service Line Name</strong> are mandatory before clicking Calculate Cost.</li>
                        <li>The currency shown in the cost column headers (e.g., USD, INR) is derived from the <strong>Primary Implementation Partner</strong> entry in the Resource Rate Card.</li>
                        <li>Rows where <strong>Active</strong> is unchecked are excluded from cost roll-ups — verify active status if totals appear lower than expected.</li>
                        <li>Each time resource rates or effort estimates are updated in upstream modules, you must click <strong>Calculate Cost</strong> again to refresh this page.</li>
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
        padding: '16px 2rem',
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

      {/* Standardized Loading Overlay */}
      <Loader 
        loading={loading || showLoading || calculateCostLoading} 
        message={calculateCostLoading ? 'Calculating Costs...' : 'Processing...'} 
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



      <div className="table-container" style={{ maxHeight: '500px', overflowY: 'auto', overflowX: 'auto', position: 'relative' }}>
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
              <th rowSpan="2" style={{ padding: '12px 12px', fontSize: '15px', fontWeight: '600', width: '6%', textAlign: 'center', verticalAlign: 'middle', border: '1px solid #ddd', backgroundColor: '#f5f5f5' }}>Cost (excluding Contingency){currencyCode ? ` (${currencyCode})` : ''}</th>
              <th rowSpan="2" style={{ padding: '12px 12px', fontSize: '15px', fontWeight: '600', width: '6%', textAlign: 'center', verticalAlign: 'middle', border: '1px solid #ddd', backgroundColor: '#f5f5f5' }}>Percentage Contingency</th>
              <th rowSpan="2" style={{ padding: '12px 12px', fontSize: '15px', fontWeight: '600', width: '6%', textAlign: 'center', verticalAlign: 'middle', border: '1px solid #ddd', backgroundColor: '#f5f5f5' }}>Cost (Including Contingency){currencyCode ? ` (${currencyCode})` : ''}</th>
              {/* <th rowSpan="2" style={{padding: '12px 12px', fontSize: '15px', fontWeight: '600', width: '3%', textAlign: 'center', verticalAlign: 'middle', border: '1px solid #ddd', backgroundColor: '#f5f5f5'}}>Actions</th> */}
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
                // For existing items, sort by estimation_model_id ascending
                const aId = parseInt(a.estimation_model_id) || 0;
                const bId = parseInt(b.estimation_model_id) || 0;
                if (aId !== bId) {
                  return aId - bId;
                }
                return 0;
              });

              // Calculate rowSpan for each ricewName group
              const groupInfo = {};
              sortedData.forEach((item, index) => {
                if (index === 0 || sortedData[index - 1].ricewName !== item.ricewName) {
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

              if (sortedData.length === 0) {
                return (
                  <tr>
                    <td colSpan="18" style={{ padding: '40px', textAlign: 'center', color: '#999', fontSize: '14px' }}>
                      No data available. Click "Calculate Cost" to calculate and load cost estimates.
                    </td>
                  </tr>
                );
              }

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

                return (
                <tr key={item.id} data-row-id={item.id} style={{ backgroundColor: '#f5f5f5', borderBottom: '1px solid #ddd' }}>
                  {groupInfo[index] && (
                    <td rowSpan={groupInfo[index]} style={{ padding: '8px 12px', verticalAlign: 'middle', border: '1px solid #ddd', textAlign: 'left', backgroundColor: '#f5f5f5' }}>
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
                  <td style={{ padding: '8px 12px', verticalAlign: 'middle', border: '1px solid #ddd', textAlign: 'center' }}>
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
                  <td style={{ padding: '8px 12px', verticalAlign: 'middle', border: '1px solid #ddd', textAlign: 'center' }}>
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
                  <td style={{ padding: '6px 12px', verticalAlign: 'top', border: '1px solid #ddd' }}>
                    {editingItem === item.id ? (
                      <TextField
                        size="small"
                        value={editValues.fsWriting}
                        onChange={(e) => handleEditFieldChange('fsWriting', e.target.value)}
                        placeholder="0"
                        variant="outlined"
                        inputProps={{ maxLength: 10 }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            fontSize: '14px',
                          },
                          width: `${Math.max(40, (editValues.fsWriting?.length || 0) * 8 + 40)}px`,
                          maxWidth: '120px',
                          minWidth: '40px',
                        }}
                      />
                    ) : (
                      <div style={{
                        fontSize: '14px',
                        padding: '8px 0',
                        color: '#333',
                        minHeight: '40px',
                        display: 'flex',
                        alignItems: 'center'
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
                        value={editValues.fsReview}
                        onChange={(e) => handleEditFieldChange('fsReview', e.target.value)}
                        placeholder="0"
                        variant="outlined"
                        inputProps={{ maxLength: 10 }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            fontSize: '14px',
                          },
                          width: `${Math.max(40, (editValues.fsReview?.length || 0) * 8 + 40)}px`,
                          maxWidth: '120px',
                          minWidth: '40px',
                        }}
                      />
                    ) : (
                      <div style={{
                        fontSize: '14px',
                        padding: '8px 0',
                        color: '#333',
                        minHeight: '40px',
                        display: 'flex',
                        alignItems: 'center'
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
                        value={editValues.tsWriting}
                        onChange={(e) => handleEditFieldChange('tsWriting', e.target.value)}
                        placeholder="0"
                        variant="outlined"
                        inputProps={{ maxLength: 10 }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            fontSize: '14px',
                          },
                          width: `${Math.max(40, (editValues.tsWriting?.length || 0) * 8 + 40)}px`,
                          maxWidth: '120px',
                          minWidth: '40px',
                        }}
                      />
                    ) : (
                      <div style={{
                        fontSize: '14px',
                        padding: '8px 0',
                        color: '#333',
                        minHeight: '40px',
                        display: 'flex',
                        alignItems: 'center'
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
                        value={editValues.tsReview}
                        onChange={(e) => handleEditFieldChange('tsReview', e.target.value)}
                        placeholder="0"
                        variant="outlined"
                        inputProps={{ maxLength: 10 }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            fontSize: '14px',
                          },
                          width: `${Math.max(40, (editValues.tsReview?.length || 0) * 8 + 40)}px`,
                          maxWidth: '120px',
                          minWidth: '40px',
                        }}
                      />
                    ) : (
                      <div style={{
                        fontSize: '14px',
                        padding: '8px 0',
                        color: '#333',
                        minHeight: '40px',
                        display: 'flex',
                        alignItems: 'center'
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
                        value={editValues.codeDevlopment}
                        onChange={(e) => handleEditFieldChange('codeDevlopment', e.target.value)}
                        placeholder="0"
                        variant="outlined"
                        inputProps={{ maxLength: 10 }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            fontSize: '14px',
                          },
                          width: `${Math.max(60, (editValues.codeDevlopment?.length || 0) * 8 + 40)}px`,
                          maxWidth: '120px',
                          minWidth: '60px',
                        }}
                      />
                    ) : (
                      <div style={{
                        fontSize: '14px',
                        padding: '8px 0',
                        color: '#333',
                        minHeight: '40px',
                        display: 'flex',
                        alignItems: 'center'
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
                        value={editValues.codeReview}
                        onChange={(e) => handleEditFieldChange('codeReview', e.target.value)}
                        placeholder="0"
                        variant="outlined"
                        inputProps={{ maxLength: 10 }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            fontSize: '14px',
                          },
                          width: `${Math.max(40, (editValues.codeReview?.length || 0) * 8 + 40)}px`,
                          maxWidth: '120px',
                          minWidth: '40px',
                        }}
                      />
                    ) : (
                      <div style={{
                        fontSize: '14px',
                        padding: '8px 0',
                        color: '#333',
                        minHeight: '40px',
                        display: 'flex',
                        alignItems: 'center'
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
                        value={editValues.unitTesting}
                        onChange={(e) => handleEditFieldChange('unitTesting', e.target.value)}
                        placeholder="0"
                        variant="outlined"
                        inputProps={{ maxLength: 10 }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            fontSize: '14px',
                          },
                          width: `${Math.max(40, (editValues.unitTesting?.length || 0) * 8 + 40)}px`,
                          maxWidth: '120px',
                          minWidth: '40px',
                        }}
                      />
                    ) : (
                      <div style={{
                        fontSize: '14px',
                        padding: '8px 0',
                        color: '#333',
                        minHeight: '40px',
                        display: 'flex',
                        alignItems: 'center'
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
                        value={editValues.technicalSupport}
                        onChange={(e) => handleEditFieldChange('technicalSupport', e.target.value)}
                        placeholder="0"
                        variant="outlined"
                        inputProps={{ maxLength: 10 }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            fontSize: '14px',
                          },
                          width: `${Math.max(60, (editValues.technicalSupport?.length || 0) * 8 + 40)}px`,
                          maxWidth: '120px',
                          minWidth: '60px',
                        }}
                      />
                    ) : (
                      <div style={{
                        fontSize: '14px',
                        padding: '8px 0',
                        color: '#333',
                        minHeight: '40px',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        {sanitizedTechnicalSupport}
                      </div>
                    )}
                  </td>
                  {/* Migration Document Creation */}
                  <td style={{ padding: '6px 12px', verticalAlign: 'top', border: '1px solid #ddd' }}>
                    {editingItem === item.id ? (
                      <TextField
                        size="small"
                        value={editValues.migrationDocCreation}
                        onChange={(e) => handleEditFieldChange('migrationDocCreation', e.target.value)}
                        placeholder="0"
                        variant="outlined"
                        inputProps={{ maxLength: 10 }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            fontSize: '14px',
                          },
                          width: `${Math.max(80, (editValues.migrationDocCreation?.length || 0) * 8 + 40)}px`,
                          maxWidth: '150px',
                          minWidth: '80px',
                        }}
                      />
                    ) : (
                      <div style={{
                        fontSize: '14px',
                        padding: '8px 0',
                        color: '#333',
                        minHeight: '40px',
                        display: 'flex',
                        alignItems: 'center'
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
                        value={editValues.migrationEffort}
                        onChange={(e) => handleEditFieldChange('migrationEffort', e.target.value)}
                        placeholder="0"
                        variant="outlined"
                        inputProps={{ maxLength: 10 }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            fontSize: '14px',
                          },
                          width: `${Math.max(60, (editValues.migrationEffort?.length || 0) * 8 + 40)}px`,
                          maxWidth: '120px',
                          minWidth: '60px',
                        }}
                      />
                    ) : (
                      <div style={{
                        fontSize: '14px',
                        padding: '8px 0',
                        color: '#333',
                        minHeight: '40px',
                        display: 'flex',
                        alignItems: 'center'
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
                        value={editValues.pglSupport}
                        onChange={(e) => handleEditFieldChange('pglSupport', e.target.value)}
                        placeholder="0"
                        variant="outlined"
                        inputProps={{ maxLength: 10 }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            fontSize: '14px',
                          },
                          width: `${Math.max(40, (editValues.pglSupport?.length || 0) * 8 + 40)}px`,
                          maxWidth: '120px',
                          minWidth: '40px',
                        }}
                      />
                    ) : (
                      <div style={{
                        fontSize: '14px',
                        padding: '8px 0',
                        color: '#333',
                        minHeight: '40px',
                        display: 'flex',
                        alignItems: 'center'
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
                        value={editValues.pmoEffort}
                        onChange={(e) => handleEditFieldChange('pmoEffort', e.target.value)}
                        placeholder="0"
                        variant="outlined"
                        inputProps={{ maxLength: 10 }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            fontSize: '14px',
                          },
                          width: `${Math.max(40, (editValues.pmoEffort?.length || 0) * 8 + 40)}px`,
                          maxWidth: '120px',
                          minWidth: '40px',
                        }}
                      />
                    ) : (
                      <div style={{
                        fontSize: '14px',
                        padding: '8px 0',
                        color: '#333',
                        minHeight: '40px',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        {sanitizedPmoEffort}
                      </div>
                    )}
                  </td>
                  {/* Cost (excluding Contingency) */}
                  <td style={{ padding: '6px 12px', verticalAlign: 'top', border: '1px solid #ddd' }}>
                    {editingItem === item.id ? (
                      <TextField
                        size="small"
                        value={editValues.costExcludingContingency}
                        onChange={(e) => handleEditFieldChange('costExcludingContingency', e.target.value)}
                        placeholder="0"
                        variant="outlined"
                        inputProps={{ maxLength: 10 }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            fontSize: '14px',
                          },
                          width: `${Math.max(40, (editValues.costExcludingContingency?.length || 0) * 8 + 40)}px`,
                          maxWidth: '120px',
                          minWidth: '40px',
                        }}
                      />
                    ) : (
                      <div style={{
                        fontSize: '14px',
                        padding: '8px 0',
                        color: '#333',
                        minHeight: '40px',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        {item.costExcludingContingency}
                      </div>
                    )}
                  </td>
                  {/* Contingency */}
                  <td style={{ padding: '6px 12px', verticalAlign: 'top', border: '1px solid #ddd' }}>
                    {editingItem === item.id ? (
                      <TextField
                        size="small"
                        value={editValues.contingency}
                        onChange={(e) => handleEditFieldChange('contingency', e.target.value)}
                        placeholder="0"
                        variant="outlined"
                        inputProps={{ maxLength: 10 }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            fontSize: '14px',
                          },
                          width: `${Math.max(40, (editValues.contingency?.length || 0) * 8 + 40)}px`,
                          maxWidth: '120px',
                          minWidth: '40px',
                        }}
                      />
                    ) : (
                      <div style={{
                        fontSize: '14px',
                        padding: '8px 0',
                        color: '#333',
                        minHeight: '40px',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        {item.contingency ? `${item.contingency}%` : ''}
                      </div>
                    )}
                  </td>
                  {/* Total Hours */}
                  <td style={{ padding: '6px 12px', verticalAlign: 'top', border: '1px solid #ddd' }}>
                    {editingItem === item.id ? (
                      <TextField
                        size="small"
                        value={editValues.totalHours}
                        onChange={(e) => handleEditFieldChange('totalHours', e.target.value)}
                        placeholder="0"
                        variant="outlined"
                        inputProps={{ maxLength: 10 }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            fontSize: '14px',
                          },
                          width: `${Math.max(40, (editValues.totalHours?.length || 0) * 8 + 40)}px`,
                          maxWidth: '120px',
                          minWidth: '40px',
                        }}
                      />
                    ) : (
                      <div style={{
                        fontSize: '14px',
                        padding: '8px 0',
                        color: '#333',
                        minHeight: '40px',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        {item.totalHours ? (Math.round(parseFloat(item.totalHours) * 100) / 100).toString() : ''}
                      </div>
                    )}
                  </td>
                  <td style={{padding: '6px 4px', verticalAlign: 'middle', textAlign: 'center', border: '1px solid #ddd'}}>
                    <div className="action-icons" style={{display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center'}}>
                      {editingItem === item.id ? (
                        <>
                          <button
                            className="action-btn save-btn"
                            onClick={() => handleSaveEdit(item.id)}
                            style={{background: 'none', border: 'none', cursor: 'pointer', color: '#10b981', padding: '4px'}}
                            title="Save"
                          >
                            <Save size={16} />
                          </button>
                          <button
                            className="action-btn cancel-btn"
                            onClick={handleCancelEdit}
                            style={{background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '4px'}}
                            title="Cancel"
                          >
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <div style={{position: 'relative'}} ref={openMenuId === item.id ? menuRef : null}>
                          <button
                            className="action-btn menu-btn"
                            disabled={isMasterData}
                            onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: isMasterData ? 'not-allowed' : 'pointer',
                              color: isMasterData ? '#ccc' : '#6b7280',
                              padding: '4px'
                            }}
                            title={isMasterData ? "Actions disabled while viewing master data" : "Actions"}
                          >
                            <MoreVertical size={18} />
                          </button>
                          {openMenuId === item.id && (
                            <div style={{
                              position: 'absolute',
                              right: '100%',
                              top: data.indexOf(item) >= data.length - 2 ? 'auto' : '50%',
                              bottom: data.indexOf(item) >= data.length - 2 ? '0' : 'auto',
                              transform: data.indexOf(item) >= data.length - 2 ? 'none' : 'translateY(-50%)',
                              backgroundColor: '#fff',
                              border: '1px solid #e0e0e0',
                              borderRadius: '4px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                              zIndex: 1000,
                              minWidth: '120px',
                              marginRight: '8px',
                              whiteSpace: 'nowrap'
                            }}>
                              <button
                                onClick={() => {
                                  handleEdit(item.id);
                                  setOpenMenuId(null);
                                }}
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
                                <Edit size={14} style={{color: '#3b82f6'}} />
                                <span>Edit</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
                );
              });
            }, [data, editingItem, editValues, currencyCode])}
          </tbody>
        </table>
      </div>

      {/* No Records Found Popup */}
      {showNoRecordsFoundPopup && (
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
            <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '12px', color: '#1f2937' }}>No Records Found</h2>
            <p style={{ color: '#4b5563', marginBottom: '28px', lineHeight: '1.6', fontSize: '15px' }}>
              No cost estimates found for this selection. Please create <strong>RICEW Cost Rate Card (Base)</strong> records by clicking the <strong>Calculate Cost</strong> button.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowNoRecordsFoundPopup(false)}
                style={{
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  flex: 1,
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowNoRecordsFoundPopup(false);
                  handleCalculateCost();
                }}
                style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  flex: 2,
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
              >
                Calculate Now
              </button>
            </div>
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

export default RicewCostEstimatesTaskMapping;