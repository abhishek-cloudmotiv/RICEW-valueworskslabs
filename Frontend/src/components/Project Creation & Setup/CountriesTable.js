import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextField } from '@mui/material';
import { ChevronDown, HelpCircle, X, AlertCircle } from 'lucide-react';
import DOMPurify from 'dompurify';
import { getIdToken } from '../../utils/cognito-auth';
import { useSession } from '../../context/SessionContext';
import SessionExpiredPopup from '../SessionExpiredPopup';
import Loader from '../../utils/Loader';

// Custom Region Autocomplete Component (Matching Project ID LOV logic)
const RegionAutocomplete = React.memo(({
  value,
  onChange,
  options,
  placeholder = "Filter by region",
  error = false,
  width = '180px',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const autocompleteRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const isExternalChangeRef = useRef(false);
  const isUserEditingRef = useRef(false);
  const isSelectingRef = useRef(false);
  const isShiftTabRef = useRef(false);
  const isTabRef = useRef(false);

  const previousValueRef = useRef(value);
  const isOpenRef = useRef(false);
  const onChangeRef = useRef(onChange);
  const selectionMadeRef = useRef(false);

  // Keep onChangeRef updated
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Keep isOpenRef updated
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // Handle value prop changes
  useEffect(() => {
    const valueMismatch = isExternalChangeRef.current && value !== previousValueRef.current;

    if ((!isUserEditingRef.current && !isExternalChangeRef.current) || valueMismatch) {
      const matchingOption = options.find(opt => opt.value === value);
      const displayText = matchingOption ? matchingOption.label : (value || '');
      setInputVal(displayText);
    }

    if (isExternalChangeRef.current) {
      isExternalChangeRef.current = false;
    }
  }, [value, options]);

  // Global listeners
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpenRef.current && autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        handleCloseDropdown(false);
      }
    };

    const handleGlobalKeyDown = (event) => {
      if (event.key === 'Tab' && event.shiftKey) {
        isShiftTabRef.current = true;
        setTimeout(() => { isShiftTabRef.current = false; }, 100);
      } else if (event.key === 'Tab' && !event.shiftKey) {
        isTabRef.current = true;
        setTimeout(() => { isTabRef.current = false; }, 100);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleGlobalKeyDown, true);
    };
  }, []);

  // Auto-scroll logic
  useEffect(() => {
    if (isOpen && listRef.current && highlightedIndex >= 0) {
      const listElement = listRef.current;
      const optionElement = listElement.children[highlightedIndex];
      if (optionElement) {
        const optionTop = optionElement.offsetTop;
        const optionHeight = optionElement.clientHeight;
        const listTop = listElement.scrollTop;
        const listHeight = listElement.clientHeight;

        if (optionTop < listTop) {
          listElement.scrollTop = optionTop;
        } else if (optionTop + optionHeight > listTop + listHeight) {
          listElement.scrollTop = optionTop + optionHeight - listHeight;
        }
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleCloseDropdown = (wasSelectionMade = false) => {
    if (!isOpenRef.current) return;

    if (selectionMadeRef.current) {
      selectionMadeRef.current = false;
      setIsOpen(false);
      setHighlightedIndex(-1);
      isUserEditingRef.current = false;
      return;
    }

    if (!wasSelectionMade && previousValueRef.current !== undefined) {
      if (value !== previousValueRef.current) {
        onChangeRef.current(previousValueRef.current);
      }
      const matchingOption = options.find(opt => opt.value === previousValueRef.current);
      const displayText = matchingOption ? matchingOption.label : (previousValueRef.current || '');
      setInputVal(displayText);
    }
    setIsOpen(false);
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;
  };

  const openDropdown = () => {
    if (disabled) return;
    previousValueRef.current = value;
    selectionMadeRef.current = false;
    setInputVal('');
    setIsOpen(true);

    if (value) {
      const index = options.findIndex(opt => opt.value === value);
      setHighlightedIndex(index);
    } else {
      setHighlightedIndex(-1);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputVal(val);
    setIsOpen(true);
    setHighlightedIndex(-1);
    isUserEditingRef.current = true;

    const matchingOption = options.find(opt =>
      opt.label.toLowerCase() === val.toLowerCase() ||
      opt.value.toLowerCase() === val.toLowerCase()
    );

    if (matchingOption) {
      onChangeRef.current(matchingOption.value);
    } else if (val === '' || val.trim() === '') {
      onChangeRef.current('');
    } else {
      onChangeRef.current(val);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        openDropdown();
        return;
      }
      if (e.key === 'ArrowDown') {
        setHighlightedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
      }
      return;
    }

    if (!isOpen) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        handleSelectOption(filteredOptions[highlightedIndex].value);
      } else {
        handleCloseDropdown(false);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCloseDropdown(false);
    }
  };

  const handleSelectOption = (optionValue) => {
    const selectedOption = options.find(opt => opt.value === optionValue);
    const displayLabel = selectedOption ? selectedOption.label : optionValue;

    selectionMadeRef.current = true;
    isSelectingRef.current = true;
    isExternalChangeRef.current = true;

    previousValueRef.current = optionValue;
    onChangeRef.current(optionValue);
    setInputVal(displayLabel);
    setIsOpen(false);
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;

    setTimeout(() => {
      if (inputRef.current) inputRef.current.blur();
      isSelectingRef.current = false;
    }, 50);
  };

  const filteredOptions = inputVal.trim() === ''
    ? options
    : options.filter(option =>
      option.label.toLowerCase().includes(inputVal.toLowerCase()) ||
      option.value.toLowerCase().includes(inputVal.toLowerCase())
    );

  return (
    <div style={{ position: 'relative', width: width, overflow: 'visible' }} ref={autocompleteRef}>
      <div style={{ position: 'relative', overflow: 'visible' }}>
        <TextField
          inputRef={inputRef}
          value={inputVal}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          onFocus={() => {
            if (!isShiftTabRef.current) {
              openDropdown();
            }
          }}
          onBlur={() => {
            setTimeout(() => {
              const activeElement = document.activeElement;
              const isFocusInDropdown = activeElement && autocompleteRef.current?.contains(activeElement);
              if (isSelectingRef.current || isFocusInDropdown) return;
              handleCloseDropdown(false);
            }, 150);
          }}
          placeholder={placeholder}
          size="small"
          error={error}
          disabled={disabled}
          sx={{
            width: '100%',
            '& .MuiInputBase-root': {
              backgroundColor: disabled ? '#f5f5f5' : 'white',
              fontSize: '13px',
              fontFamily: 'inherit',
              cursor: disabled ? 'not-allowed' : 'text'
            },
            '& .MuiInputBase-input': {
              padding: '8px 30px 8px 10px',
              fontSize: '13px',
              color: disabled ? '#666' : 'inherit'
            },
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: '#ddd',
                borderRadius: '6px',
              },
              '&:hover fieldset': {
                borderColor: '#ccc',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#007bff',
                borderWidth: '1px',
              },
              '&.Mui-error fieldset': {
                borderColor: '#d32f2f',
              }
            }
          }}
        />
        <ChevronDown
          size={16}
          style={{
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: disabled ? '#999' : '#666',
            cursor: disabled ? 'not-allowed' : 'pointer',
            zIndex: 2
          }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            if (disabled) return;
            if (!isOpen) openDropdown();
            else handleCloseDropdown(false);
          }}
        />
      </div>

      {isOpen && (
        <div
          ref={listRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            width: '100%',
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '4px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            maxHeight: '200px',
            overflowY: 'auto',
            marginTop: '4px'
          }}
          tabIndex={-1}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={option.value}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectOption(option.value);
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  backgroundColor: index === highlightedIndex ? '#cce5ff' : (option.value === value ? '#e3f2fd' : 'white'),
                  color: 'inherit',
                  fontSize: '13px',
                  transition: 'background-color 0.2s',
                  borderBottom: '1px solid #f0f0f0'
                }}
              >
                {option.label}
              </div>
            ))
          ) : (
            <div style={{ padding: '12px', fontSize: '13px', color: '#999', textAlign: 'center' }}>
              No options found
            </div>
          )}
        </div>
      )}
    </div>
  );
});

const CountriesTable = ({ onClose, selectedProject, onBackToLanding, onLogout, setUnsavedChangesChecker }) => {
  const navigate = useNavigate();
  const { handleAuthError, userId, projectId, projectName } = useSession();
  const [data, setData] = useState([]);
  const [showNoProjectSelectedPopup, setShowNoProjectSelectedPopup] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState('');

  const filteredData = useMemo(() => {
    let result = [...data];
    if (selectedRegion) {
      result = result.filter(item => item.geographyCode === selectedRegion);
    }
    
    return result.sort((a, b) => {
      // Sort by Global Region Code first
      const regionA = (a.geographyCode || '').toLowerCase();
      const regionB = (b.geographyCode || '').toLowerCase();
      if (regionA < regionB) return -1;
      if (regionA > regionB) return 1;

      // Then by Country Name alphabetically
      const countryA = (a.country || '').toLowerCase();
      const countryB = (b.country || '').toLowerCase();
      if (countryA < countryB) return -1;
      if (countryA > countryB) return 1;
      
      return 0;
    });
  }, [data, selectedRegion]);

  const [regionOptions, setRegionOptions] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Project Selection State — now from session context
  const [projectOptions, setProjectOptions] = useState([]);
  const [licenseOptions, setLicenseOptions] = useState([]);
  // const [userProjectData, setUserProjectData] = useState([]);

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const helpPopupRef = useRef(null);

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
    };
  }, [showHelpPopup]);

  // Check for project selection
  useEffect(() => {
    if (projectId) {
      setShowNoProjectSelectedPopup(false);
    } else {
      setShowNoProjectSelectedPopup(true);
    }
  }, [projectId]);

  // Load data when projectId changes
  useEffect(() => {
    const loadData = async () => {
      // Load geography mapping first
      await loadRegionOptions();
      // Then load countries data
      if (projectId) {
        await loadCountriesData();
      } else {
        setData([]);
      }
    };
    loadData();
  }, [projectId]);

  const fetchProjectName = async (id) => {
    /* try {
      const idToken = await getIdToken();
      const response = await fetch(`https://3oi9y6i52k.execute-api.ap-south-1.amazonaws.com/New/api/rice-project-definition/getProjectData?Project_ID=${encodeURIComponent(id)}`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && result.data.length > 0) {
          const projectData = result.data[0];
          setLocalProjectName(projectData.Project_Name || id);
          // Also extract subscription license from project data
          const license = projectData.Subscription_License;
          if (license) {
            setSubscriptionLicense(Array.isArray(license) ? license[0] : license);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching project name:", error);
    } */
  };

  // Auto-derive subscription license from userProjectData when projectId is set (fallback)
  /* useEffect(() => {
    if (projectId && !subscriptionLicense && userProjectData.length > 0) {
      for (const item of userProjectData) {
        // Handle Project_ID as both array and string
        const projectIds = Array.isArray(item.Project_ID) ? item.Project_ID : (item.Project_ID ? [item.Project_ID] : []);
        if (projectIds.includes(projectId)) {
          // Handle Subscription_License as both array and string
          const license = Array.isArray(item.Subscription_License)
            ? item.Subscription_License[0]
            : item.Subscription_License;
          if (license) {
            setSubscriptionLicense(license);
            break;
          }
        }
      }
    }
  }, [projectId, userProjectData]); */

  const fetchUserProjectSpecifics = async () => {
    /* const userId = localStorage.getItem('user_id');
    if (!userId) return;

    try {
      const idToken = await getIdToken();
      const response = await fetch(`https://3oi9y6i52k.execute-api.ap-south-1.amazonaws.com/New/project-details/get/by-user?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setUserProjectData(result.data);

          // Extract unique licenses
          const licenses = new Set();
          result.data.forEach(item => {
            if (Array.isArray(item.Subscription_License)) {
              item.Subscription_License.forEach(l => licenses.add(l));
            }
          });
          setLicenseOptions(Array.from(licenses).map(l => ({ value: l, label: l })));
        }
      }
    } catch (error) {
      console.error("Error fetching user project specifics:", error);
    } */
  };

  // Handlers removed — subscription & project are now auto-populated from selectedProject

  const loadCountriesData = async (isRetry = false, isSilent = false) => {
    if (!projectId) {
      if (!isSilent) setLoading(false);
      return;
    }
    if (!isSilent) setLoading(true);
    try {
      const idToken = await getIdToken();
      if (!idToken) {
        handleAuthError('Token not found - please login again');
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      };

      const project_id = projectId;

      const url = `https://ec2450jptj.execute-api.ap-south-1.amazonaws.com/New/rice/get/CountriesTable/activeCountries?project_id=${project_id}`;

      const response = await fetch(url, {
        headers: headers
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        return;
      }

      if (response.ok) {
        const result = await response.json();
        console.log('Fetched countries data:', result);

        const countriesArray = Array.isArray(result) ? result : (result.data || []);

        if (countriesArray.length > 0) {
          const sanitizeConfig = { ALLOWED_TAGS: [] };
          const safeString = (val) => DOMPurify.sanitize(String(val || '').trim(), sanitizeConfig);

          // Get geography mapping from sessionStorage
          let geoMapping = {};
          const storedMapping = sessionStorage.getItem('geoMapping');
          if (storedMapping) {
            geoMapping = JSON.parse(storedMapping);
          }

          const transformedData = countriesArray.map((item, index) => {
            const countryId = safeString(item.list_Of_Countrie_id?.S || item.list_Of_Countrie_id);
            const activeValue = item.Active?.S || item.Active || '';
            const countryCode = safeString(item.Code?.S || item.Code);
            const countryName = safeString(item.Country_Name?.S || item.Country_Name || item['Country/Region']);
            const geocodeId = safeString(item.GEOCODE?.S || item.GEOCODE);
            // Map the GEOCODE ID to the actual geoCode
            const geographyCode = geoMapping[geocodeId] || geocodeId;
            const phoneCode = safeString(item.PhoneCode?.S || item.PhoneCode);
            const currencyName = safeString(item.Currency_Name?.S || item.Currency_Name);
            const currencyCode = safeString(item.Currency_Code?.S || item.Currency_Code);

            const isActive = activeValue === 'Yes' || activeValue === 'Active';

            return {
              id: index + 1,
              countryId: countryId,
              countryCode: countryCode,
              countryName: countryName || 'N/A',
              geographyCode: geographyCode,
              phoneCode: phoneCode,
              currencyName: currencyName,
              currencyCode: currencyCode,
              active: isActive,
              originalActive: isActive,
              isSaved: true
            };
          });

          const validData = transformedData.filter(item => item.countryName && item.countryName !== 'N/A');
          validData.sort((a, b) => {
            if (b.active !== a.active) return b.active - a.active;
            const idA = parseInt(a.countryId) || 0;
            const idB = parseInt(b.countryId) || 0;
            return idA - idB;
          });

          setData(validData);

          const uniqueRegions = [...new Set(validData.map(item => item.geographyCode))].filter(Boolean).sort();
          if (uniqueRegions.length > 0 && regionOptions.length === 0) {
            const fallbackRegions = uniqueRegions.map(code => ({
              value: code,
              label: code
            }));
            setRegionOptions(fallbackRegions);
          }
        } else if (project_id && !isRetry) {
          console.log('No countries found for project, initializing from master...');
          try {
            const userId = localStorage.getItem('user_id');
            const initResponse = await fetch('https://ec2450jptj.execute-api.ap-south-1.amazonaws.com/New/api/rice/move-countries', {
              method: 'POST',
              headers: headers,
              body: JSON.stringify({
                project_id: project_id,
                created_by: userId
              })
            });

            if (initResponse.status === 401 || initResponse.status === 403) {
              handleAuthError('Unauthorized - session expired');
              return;
            }

            if (initResponse.ok) {
              console.log('Successfully initialized countries data. Retrying fetch...');
              await loadCountriesData(true);
              return;
            } else {
              console.error('Failed to initialize countries data');
              setData([]);
            }
          } catch (initError) {
            console.error('Error initializing countries data:', initError);
            handleAuthError(initError.message);
          }
        } else {
          setData([]);
        }
      } else {
        console.error('API fetch failed with status:', response.status);
      }
    } catch (error) {
      console.error('Error fetching countries data:', error);
      handleAuthError(error.message);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const handleActiveChange = (id, newActiveStatus) => {
    setData(prevData => {
      const updatedData = prevData.map(item =>
        item.id === id ? { ...item, active: newActiveStatus } : item
      );

      const hasAnyChanges = updatedData.some(item => item.active !== item.originalActive);
      setHasChanges(hasAnyChanges);

      return updatedData;
    });
  };

  const loadRegionOptions = async () => {
    try {
      const idToken = await getIdToken();
      if (!idToken) {
        handleAuthError('Token not found - please login again');
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      };

      const response = await fetch('https://ec2450jptj.execute-api.ap-south-1.amazonaws.com/New/rice/get/listOfGeography', {
        headers: headers
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        return;
      }

      if (response.ok) {
        const result = await response.json();

        const regionsArray = Array.isArray(result) ? result : (result.data || []);

        if (regionsArray.length > 0) {
          const sanitizeConfig = { ALLOWED_TAGS: [] };
          const safeString = (val) => DOMPurify.sanitize(String(val || '').trim(), sanitizeConfig);

          const transformedRegions = regionsArray.map(item => ({
            list_Of_Geography_id: safeString(item.list_Of_Geography_id?.S || item.list_Of_Geography_id),
            geoCode: safeString(item.geoCode?.S || item.geoCode),
            description: safeString(item.description?.S || item.description)
          }));

          const sortedRegions = transformedRegions.sort((a, b) => {
            const codeA = a.geoCode || '';
            const codeB = b.geoCode || '';
            return codeA.localeCompare(codeB);
          });

          const autocompleteOptions = sortedRegions.map(reg => ({
            value: reg.geoCode,
            label: reg.geoCode,
            id: reg.list_Of_Geography_id
          }));

          setRegionOptions(autocompleteOptions);

          // Store geography mapping for later use
          const geoMapping = {};
          transformedRegions.forEach(reg => {
            geoMapping[reg.list_Of_Geography_id] = reg.geoCode;
          });
          sessionStorage.setItem('geoMapping', JSON.stringify(geoMapping));
        } else {
          setRegionOptions([]);
        }
      } else {
        console.error('API fetch failed with status:', response.status);
        setRegionOptions([]);
      }
    } catch (error) {
      console.error('Error fetching region options:', error);
      handleAuthError(error.message);
    }
  };

  const handleFilterChange = useCallback((value) => {
    setSelectedRegion(value);
  }, []);

  const saveChanges = async () => {
    setSaving(true);
    try {
      const changedItems = data.filter(item => item.active !== item.originalActive);

      const idToken = await getIdToken();
      if (!idToken) {
        handleAuthError('Token not found - please login again');
        setSaving(false);
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      };

      const payload = changedItems.map(item => ({
        list_Of_Countrie_id: item.countryId,
        Active: item.active ? 'Active' : 'Inactive'
      }));

      const response = await fetch('https://ec2450jptj.execute-api.ap-south-1.amazonaws.com/New/rice/post/countriesActiveStatus', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        setSaving(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to save changes. Please try again.');
      }

      setData(prevData =>
        prevData.map(item => ({ ...item, originalActive: item.active }))
      );
      setHasChanges(false);
      setSuccessMessage('Changes saved successfully!');
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);

      // Silently reload the data to re-sort active items to the top
      loadCountriesData(false, true);

    } catch (error) {
      console.error('Error saving changes:', error);
      handleAuthError(error.message);
    } finally {
      setSaving(false);
    }
  };

  // Expose unsaved changes checker to parent component
  const checkUnsavedChanges = useCallback(() => {
    return hasChanges;
  }, [hasChanges]);

  useEffect(() => {
    if (setUnsavedChangesChecker) {
      setUnsavedChangesChecker(() => checkUnsavedChanges);
    }
  }, [checkUnsavedChanges, setUnsavedChangesChecker]);

  // Update browser tab title
  useEffect(() => {
    document.title = 'Geographical Scope';
  }, []);

  return (
    <div className="config-main" style={{ minHeight: '80vh' }}>
      <div style={{ padding: '2rem 2rem 1rem 2rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project : <span style={{ color: '#007bff' }}>{localStorage.getItem('project_name') || selectedProject?.name}</span></h3>
      </div>
      <div className="config-header" style={{ marginTop: '0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <h2 style={{ margin: 0, color: '#333', whiteSpace: 'nowrap' }}>Geographical Scope</h2>
          <label style={{ fontSize: '14px', fontWeight: '500', color: '#333', whiteSpace: 'nowrap' }}>
            Filter by Region:
          </label>
          <RegionAutocomplete
            value={selectedRegion}
            onChange={handleFilterChange}
            options={regionOptions}
            width="180px"
          />
            {selectedRegion && (
              <>
                <button
                  onClick={() => handleFilterChange('')}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#dc3545',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: 'white',
                    whiteSpace: 'nowrap',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => { e.target.style.backgroundColor = '#c82333'; }}
                  onMouseLeave={(e) => { e.target.style.backgroundColor = '#dc3545'; }}
                  title="Clear filter"
                >
                  Clear
                </button>
                <div style={{
                  fontSize: '13px',
                  color: '#6b7280',
                  whiteSpace: 'nowrap'
                }}>
                  Showing {filteredData.length} {filteredData.length === 1 ? 'country' : 'countries'} in {selectedRegion}
                </div>
              </>
            )}
        </div>

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

                    <div style={{ marginBottom: '16px' }}>
                      <strong style={{ color: '#1f2937', fontSize: '15px' }}>What is this page?</strong>
                      <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                        The <strong>List of Countries</strong> page lets you manage which countries are in scope for the selected ERP project. Each country can be individually activated or deactivated to control its inclusion in the project rollout.
                      </p>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <strong style={{ color: '#1f2937', fontSize: '15px' }}>Why is this used?</strong>
                      <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                        In multi-country ERP implementations, not all countries go live at the same time or at all. This page allows project teams to define the exact geographical footprint of the implementation — ensuring that reporting, localization settings, and rollout planning reflect only the countries that are actively in scope.
                      </p>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <strong style={{ color: '#1f2937', fontSize: '15px' }}>Understanding the columns</strong>
                      <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                        <li><strong>Global Region Code</strong> — The geography group this country belongs to (e.g., EMEA, APAC, AMER). Use the <em>Filter by Region</em> dropdown to narrow the list to a specific region.</li>
                        <li><strong>Country Code</strong> — The standard ISO 2-letter code for the country (e.g., US, DE, IN).</li>
                        <li><strong>Country</strong> — The full official name of the country.</li>
                        <li><strong>Phone Code</strong> — The international dialing prefix for the country (e.g., +1, +49).</li>
                        <li><strong>Primary Currency</strong> — The official currency used in that country (e.g., US Dollar, Euro).</li>
                        <li><strong>Currency Code</strong> — The ISO 3-letter currency code (e.g., USD, EUR, INR).</li>
                        <li><strong>Active</strong> — Check to include this country in the project scope; uncheck to exclude it. Changes must be saved using the <em>Save Changes</em> button.</li>
                      </ul>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to make changes</strong>
                      <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                        <li>Toggle the <strong>Active</strong> checkbox for any country to change its in-scope status.</li>
                        <li>Use <strong>Filter by Region</strong> to focus on a specific geography and bulk-manage countries within it.</li>
                        <li>Click <strong>Save Changes</strong> at the bottom to persist all your updates. The button is only enabled when there are unsaved changes.</li>
                        <li>If no data exists for the selected project yet, it is automatically initialized from the master country list.</li>
                      </ul>
                    </div>

                    <div style={{ marginBottom: '4px' }}>
                      <strong style={{ color: '#1f2937', fontSize: '15px' }}>Important notes</strong>
                      <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                        <li>A project must be selected before data loads. If none is selected, go to the <strong>Project Definition Form</strong> first.</li>
                        <li>Active countries appear at the top of the list, sorted alphabetically within each group.</li>
                        <li>Your session must remain active — if it expires, you will be prompted to log in again.</li>
                      </ul>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>



      <div className="table-container" style={{ height: 'calc(100vh - 240px)', overflowY: 'auto' }}>
        {/* marginTop: '14px' */}
        <table className="config-table" style={{ fontSize: '15px' }}>
          <thead>
            <tr>
              <th style={{ padding: '8px 12px', fontSize: '16px', width: '15%' }}>Global Region Code</th>
              <th style={{ padding: '8px 12px', fontSize: '16px', width: '10%' }}>Country Code</th>
              <th style={{ padding: '8px 12px', fontSize: '16px', width: '20%' }}>Country</th>
              <th style={{ padding: '8px 12px', fontSize: '16px', width: '10%' }}>Phone Code</th>
              <th style={{ padding: '8px 12px', fontSize: '16px', width: '15%' }}>Primary Currency</th>
              <th style={{ padding: '8px 12px', fontSize: '16px', width: '10%' }}>Currency Code</th>
              <th style={{ padding: '8px 12px', fontSize: '16px', width: '20%', textAlign: 'center' }}>Active</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  {selectedRegion ? `No countries found in ${selectedRegion} region.` : 'No countries available.'}
                </td>
              </tr>
            ) : (
              filteredData.map((item) => (
                <tr key={item.id} style={{ height: '40px' }}>
                  <td style={{ padding: '6px 12px', verticalAlign: 'middle', width: '15%' }}>
                    {item.geographyCode}
                  </td>
                  <td style={{ padding: '6px 12px', verticalAlign: 'middle', width: '10%' }}>
                    {item.countryCode}
                  </td>
                  <td style={{ padding: '6px 12px', verticalAlign: 'middle', width: '20%' }}>
                    {item.countryName}
                  </td>
                  <td style={{ padding: '6px 12px', verticalAlign: 'middle', width: '10%' }}>
                    {item.phoneCode}
                  </td>
                  <td style={{ padding: '6px 12px', verticalAlign: 'middle', width: '15%' }}>
                    {item.currencyName}
                  </td>
                  <td style={{ padding: '6px 12px', verticalAlign: 'middle', width: '10%' }}>
                    {item.currencyCode}
                  </td>
                  <td style={{ padding: '6px 12px', verticalAlign: 'middle', width: '20%', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={item.active}
                      onChange={(e) => handleActiveChange(item.id, e.target.checked)}
                      style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ padding: '1rem 2rem', textAlign: 'left' }}>
        <button
          onClick={saveChanges}
          disabled={!hasChanges || saving}
          style={{
            backgroundColor: hasChanges ? '#28a745' : '#6c757d',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: (!hasChanges || saving) ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            opacity: (!hasChanges || saving) ? 0.6 : 1,
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => { if (hasChanges && !saving) e.target.style.backgroundColor = '#218838'; }}
          onMouseLeave={(e) => { if (hasChanges && !saving) e.target.style.backgroundColor = '#28a745'; }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {showSuccessMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: '#28a745',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          fontSize: '14px',
          fontWeight: '500'
        }}>
          <span style={{ fontSize: '16px' }}>✓</span>
          Changes saved successfully!
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

      <Loader loading={loading || saving} message={saving ? "Saving Changes..." : "Loading..."} />

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

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .help-modal-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .help-modal-scroll::-webkit-scrollbar-track {
          background: transparent;
          margin: 8px 0;
        }
        .help-modal-scroll::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .help-modal-scroll::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '450px',
            padding: '30px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>Confirm Action</h3>
            <p style={{ margin: '0 0 25px 0', color: '#4b5563', lineHeight: '1.5' }}>{confirmMessage}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={handleConfirmCancel}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  backgroundColor: 'white',
                  color: '#374151',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                No, Keep
              </button>
              <button
                onClick={handleConfirmYes}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Yes, Continue
              </button>
            </div>
          </div>
        </div>
      )}

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
      <SessionExpiredPopup />
    </div>
  );
};

export default CountriesTable;
