import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextField } from '@mui/material';
import { ChevronDown, HelpCircle, X, AlertCircle } from 'lucide-react';
import DOMPurify from 'dompurify';
import { getIdToken } from '../../utils/cognito-auth';
import { useSession } from '../../context/SessionContext';
import Loader from '../../utils/Loader';

// Custom Region Autocomplete Component
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

const MasterListofCountries = ({ onClose, selectedProject, onBackToLanding, onLogout }) => {
  const { handleAuthError } = useSession();
  const [data, setData] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState('');
  const [regionOptions, setRegionOptions] = useState([]);
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const helpPopupRef = useRef(null);

  const filteredData = useMemo(() => {
    if (!selectedRegion) return data;
    return data.filter(item => item.geographyCode === selectedRegion);
  }, [data, selectedRegion]);

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

  // Load geography mapping from API
  const loadGeographyMapping = async (idToken, headers) => {
    try {
      const response = await fetch('https://ec2450jptj.execute-api.ap-south-1.amazonaws.com/New/rice/get/listOfGeography', {
        headers: headers
      });

      if (response.ok) {
        const result = await response.json();
        const regionsArray = Array.isArray(result) ? result : (result.data || []);

        if (regionsArray.length > 0) {
          const geoMapping = {};
          regionsArray.forEach(reg => {
            const id = reg.list_Of_Geography_id?.S || reg.list_Of_Geography_id;
            const code = reg.geoCode?.S || reg.geoCode;
            if (id && code) {
              geoMapping[id] = code;
            }
          });
          sessionStorage.setItem('geoMapping', JSON.stringify(geoMapping));
          return geoMapping;
        }
      }
    } catch (error) {
      console.error('Error loading geography mapping:', error);
    }
    return {};
  };

  // Load master countries data from API
  const loadMasterCountries = async () => {
    setLoading(true);
    try {
      const idToken = await getIdToken();
      if (!idToken) {
        console.error('Token not found');
        handleAuthError('Token not found - please login again');
        setLoading(false);
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      };

      // Load geography mapping first
      let geoMapping = {};
      const storedMapping = sessionStorage.getItem('geoMapping');
      if (!storedMapping) {
        geoMapping = await loadGeographyMapping(idToken, headers);
      } else {
        geoMapping = JSON.parse(storedMapping);
      }

      console.log('Fetching master countries...');
      const response = await fetch('https://ec2450jptj.execute-api.ap-south-1.amazonaws.com/New/rice/get/trueMasterCountries', {
        headers: headers
      });

      console.log('Response status:', response.status);

      if (response.status === 401 || response.status === 403) {
        console.error('Unauthorized response - actual session issue');
        handleAuthError('Session expired - please login again');
        setLoading(false);
        return;
      }

      if (!response.ok) {
        const errorMsg = `API Error: ${response.status} ${response.statusText}`;
        console.error(errorMsg);
        setErrorMessage(errorMsg);
        setData([]);
        setLoading(false);
        return;
      }

      const result = await response.json();
      console.log('Fetched master countries data:', result);

      const countriesArray = Array.isArray(result) ? result : (result.data || []);

      if (countriesArray.length > 0) {
        const sanitizeConfig = { ALLOWED_TAGS: [] };
        const safeString = (val) => DOMPurify.sanitize(String(val || '').trim(), sanitizeConfig);

        const transformedData = countriesArray.map((item, index) => {
          const countryId = safeString(item.list_Of_Countrie_id?.S || item.list_Of_Countrie_id);
          const countryCode = safeString(item.Code?.S || item.Code);
          const countryName = safeString(item.Country_Name?.S || item.Country_Name);
          const geocodeId = safeString(item.GEOCODE?.S || item.GEOCODE);
          // Map the GEOCODE ID to the actual geoCode if mapping exists
          const geographyCode = geoMapping[geocodeId] || geocodeId;
          const phoneCode = safeString(item.PhoneCode?.S || item.PhoneCode);
          const currencyName = safeString(item.Currency_Name?.S || item.Currency_Name);
          const currencyCode = safeString(item.Currency_Code?.S || item.Currency_Code);

          return {
            id: index + 1,
            countryId: countryId,
            countryCode: countryCode,
            countryName: countryName || 'N/A',
            geographyCode: geographyCode,
            phoneCode: phoneCode,
            currencyName: currencyName,
            currencyCode: currencyCode
          };
        });

        const validData = transformedData.filter(item => item.countryName && item.countryName !== 'N/A');
        validData.sort((a, b) => {
          const idA = parseInt(a.countryId) || 0;
          const idB = parseInt(b.countryId) || 0;
          return idA - idB;
        });

        setData(validData);
        setErrorMessage('');

        const uniqueRegions = [...new Set(validData.map(item => item.geographyCode))].filter(Boolean).sort();
        const regionOpts = uniqueRegions.map(code => ({
          value: code,
          label: code
        }));
        setRegionOptions(regionOpts);
      } else {
        setData([]);
        setRegionOptions([]);
        setErrorMessage('No countries found');
      }
    } catch (error) {
      console.error('Error fetching master countries data:', error);
      setErrorMessage(`Error: ${error.message}`);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadMasterCountries();
  }, []);

  const handleFilterChange = useCallback((value) => {
    setSelectedRegion(value);
  }, []);

  return (
    <div className="config-main" style={{ margin: '2rem 2rem 0 2rem' }}>
      <div style={{ padding: '2rem 2rem 1rem 2rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project : <span style={{ color: '#007bff' }}>{selectedProject?.name}</span></h3>
      </div>
      <div className="config-header" style={{ marginTop: '0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <h2 style={{ margin: 0, color: '#333', whiteSpace: 'nowrap' }}>Master List of Countries</h2>
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
                        The <strong>Master List of Countries</strong> page displays the complete database of all countries available in the system. This is a reference view showing all country master data without modification capabilities.
                      </p>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <strong style={{ color: '#1f2937', fontSize: '15px' }}>Why is this used?</strong>
                      <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                        This master list provides a comprehensive reference of all countries, regions, currencies, and phone codes available in the system. It serves as a lookup resource for understanding what country data is available when configuring projects and other entities.
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
                      </ul>
                    </div>

                    <div style={{ marginBottom: '4px' }}>
                      <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to use</strong>
                      <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                        <li>Use <strong>Filter by Region</strong> to focus on a specific geography and view countries within it.</li>
                        <li>Review country codes, currencies, and phone codes to understand master data available in the system.</li>
                        <li>This is a read-only reference list — no modifications can be made here.</li>
                      </ul>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {errorMessage && (
        <div style={{
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          color: '#c33',
          padding: '12px 16px',
          margin: '0 2rem 1rem',
          borderRadius: '4px',
          fontSize: '14px'
        }}>
          {errorMessage}
        </div>
      )}

      <div className="table-container" style={{ height: 'calc(100vh - 240px)', overflowY: 'auto' }}>
        <table className="config-table" style={{ fontSize: '15px' }}>
          <thead>
            <tr>
              <th style={{ padding: '8px 12px', fontSize: '16px', width: '15%' }}>Global Region Code</th>
              <th style={{ padding: '8px 12px', fontSize: '16px', width: '10%' }}>Country Code</th>
              <th style={{ padding: '8px 12px', fontSize: '16px', width: '20%' }}>Country</th>
              <th style={{ padding: '8px 12px', fontSize: '16px', width: '10%' }}>Phone Code</th>
              <th style={{ padding: '8px 12px', fontSize: '16px', width: '15%' }}>Primary Currency</th>
              <th style={{ padding: '8px 12px', fontSize: '16px', width: '10%' }}>Currency Code</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <style>{`
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

      <Loader loading={loading} message="Loading master countries..." />
    </div>
  );
};

export default MasterListofCountries;