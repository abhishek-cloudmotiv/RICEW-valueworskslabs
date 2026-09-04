import React, { useState, useEffect, useRef } from 'react';
import { TextField, MenuItem } from '@mui/material';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, Info } from 'lucide-react';
import { getIdToken } from '../../utils/cognito-auth';
import DOMPurify from 'dompurify';
import { useSession } from '../../context/SessionContext';

// Resource Level Autocomplete Component
export const ResourceLevelAutocomplete = ({
  value,
  onChange,
  error = false,
  projectId
}) => {
  const { handleAuthError } = useSession();
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Initialize with the designation if value matches an option, otherwise use the value
  const getInitialValue = () => {
    if (!value) return '';
    const matchingOption = options.find(opt => opt.value === value);
    return matchingOption ? matchingOption.label : value;
  };

  const [isOpen, setIsOpen] = useState(false);
  const [inputVal, setInputVal] = useState(getInitialValue());
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const autocompleteRef = useRef(null);
  const inputRef = useRef(null);

  const isExternalChangeRef = useRef(false);
  const isUserEditingRef = useRef(false);
  const isSelectingRef = useRef(false);
  const isShiftTabRef = useRef(false);
  const isTabRef = useRef(false);

  // Store the value before opening dropdown to restore if closed without selection
  const previousValueRef = useRef(value);
  const previousInputValRef = useRef(inputVal);
  // Track if dropdown is open for this specific instance
  const isOpenRef = useRef(false);
  // Store latest onChange in ref to avoid stale closures
  const onChangeRef = useRef(onChange);
  // Track if a selection was just made to prevent restore
  const selectionMadeRef = useRef(false);

  const listRef = useRef(null);

  // Keep onChangeRef updated
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Keep isOpenRef in sync with isOpen state
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // Auto-scroll to highlighted option
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

  // Fetch resource level definitions from API
  useEffect(() => {
    const fetchResourceLevels = async () => {
      try {
        setLoading(true);
        setLoadError(null);

        // Get ID token for authorization
        let idToken = null;
        try {
          idToken = await getIdToken();
        } catch (tokenError) {
          console.error('Failed to get ID token for resource levels:', tokenError);
          // Continue without token - API might still work or will return 401
        }

        const headers = {
          'Content-Type': 'application/json',
        };

        if (idToken) {
          headers['Authorization'] = `Bearer ${idToken}`;
        }

        const response = await fetch(`https://fuahu3jqsc.execute-api.ap-south-1.amazonaws.com/New/api/get/LOV/leveldefinitions`, {
          headers: headers
        });

        if (response.status === 401 || response.status === 403) {
          handleAuthError('Session expired - please login again');
          return;
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.success && result.data) {
          // Sort data by Level_Definition_id in ascending order (1, 2, 3, ..., 12)
          const sortedData = result.data.sort((a, b) => {
            const idA = parseInt(a.Level_Definition_id) || 0;
            const idB = parseInt(b.Level_Definition_id) || 0;
            return idA - idB;
          });

          // Transform API data to match our expected format
          const transformedOptions = sortedData.map(item => ({
            value: item.Level_Short_Code,
            label: DOMPurify.sanitize(item.designation, { ALLOWED_TAGS: [] })
          }));

          setOptions(transformedOptions);

          // After options are loaded, update inputVal if user isn't editing
          if (!isUserEditingRef.current) {
            const matchingOption = transformedOptions.find(opt => opt.value === value);
            setInputVal(matchingOption ? matchingOption.label : (value || ''));
          }
        } else {
          throw new Error('Invalid API response format');
        }
      } catch (error) {
        console.error('Error fetching resource level definitions:', error);
        setLoadError(error.message);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchResourceLevels();
  }, []);

  useEffect(() => {
    // Only update inputVal when prop value changes AND user is not actively editing
    if (!isUserEditingRef.current && !isExternalChangeRef.current) {
      // Find the option that matches the value and display its label
      const matchingOption = options.find(opt => opt.value === value);
      setInputVal(matchingOption ? matchingOption.label : (value || ''));
    }

    if (isExternalChangeRef.current) {
      isExternalChangeRef.current = false;
    }
  }, [value, options]);

  // Handle closing dropdown - restore previous value if no selection was made
  const handleCloseDropdown = (wasSelectionMade = false) => {
    // Only process if this dropdown is actually open
    if (!isOpenRef.current) {
      return;
    }

    // If a selection was just made, don't restore
    if (selectionMadeRef.current) {
      selectionMadeRef.current = false;
      setIsOpen(false);
      setHighlightedIndex(-1);
      isUserEditingRef.current = false;
      return;
    }

    if (!wasSelectionMade && previousValueRef.current !== undefined) {
      // Restore the previous value only if it's different from the current prop value
      if (value !== previousValueRef.current) {
        onChangeRef.current(previousValueRef.current);
      }
      setInputVal(previousInputValRef.current);
    }
    setIsOpen(false);
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Only handle if this dropdown is open AND click is outside this component
      if (isOpenRef.current && autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        handleCloseDropdown(false);
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

  // Function to open dropdown and store current value
  const openDropdown = () => {
    // Store current value before opening
    previousValueRef.current = value;
    const matchingOption = options.find(opt => opt.value === value);
    previousInputValRef.current = matchingOption ? matchingOption.label : (value || '');
    selectionMadeRef.current = false;

    // Clear input to show all options, but don't clear the actual value yet
    setInputVal('');
    setIsOpen(true);

    // Find the index of the current value to scroll to it
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
    setIsOpen(true); // Keep dropdown open when typing
    setHighlightedIndex(-1); // Reset highlight when typing
    isUserEditingRef.current = true;

    // Check if the value matches a valid LOV option
    const matchingOption = options.find(opt =>
      opt.label.toLowerCase() === val.toLowerCase() ||
      opt.value === val
    );

    if (matchingOption) {
      // If it's a valid LOV option, notify parent with the value (Level_Short_Code)
      onChangeRef.current(matchingOption.value);
    } else if (val === '' || val.trim() === '') {
      // If user is clearing the field, notify parent
      onChangeRef.current('');
    } else {
      // Allow free text entry - notify parent with the entered text
      onChangeRef.current(val);
    }
  };

  const handleKeyDown = (e) => {
    // Handle arrow keys to open dropdown if closed
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      // No stopPropagation needed here typically unless nested, but adding it for consistency if desired.
      // e.stopPropagation(); 

      if (!isOpen) {
        openDropdown();
        return;
      }

      // Navigate through options when dropdown is open
      if (e.key === 'ArrowDown') {
        setHighlightedIndex(prev => {
          const nextIndex = prev < filteredOptions.length - 1 ? prev + 1 : 0;
          return nextIndex;
        });
      } else if (e.key === 'ArrowUp') {
        setHighlightedIndex(prev => {
          const nextIndex = prev > 0 ? prev - 1 : filteredOptions.length - 1;
          return nextIndex;
        });
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
    // Find the selected option to get its label
    const selectedOption = options.find(opt => opt.value === optionValue);
    const displayLabel = selectedOption ? selectedOption.label : optionValue;

    // Mark that a selection was made BEFORE any state changes
    selectionMadeRef.current = true;
    isSelectingRef.current = true;
    isExternalChangeRef.current = true;

    // Update the previous value refs since a selection was made
    previousValueRef.current = optionValue;
    previousInputValRef.current = displayLabel;

    onChangeRef.current(optionValue);  // Send the value (Level_Short_Code) to parent form
    setInputVal(displayLabel);  // Display the designation in input
    setIsOpen(false);
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;

    // Blur the input so next click will trigger onFocus and clear the value
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.blur();
      }
      isSelectingRef.current = false;
    }, 50);
  };

  // Filter options based on input
  const normalizedInput = inputVal.toLowerCase();
  const filteredOptions = normalizedInput.length === 0
    ? options
    : options.filter(option => {
      const normalizedLabel = option.label.toLowerCase();
      const normalizedValue = option.value.toLowerCase();
      return normalizedLabel.includes(normalizedInput) || normalizedValue.includes(normalizedInput);
    });

  return (
    <div
      style={{ position: 'relative', width: '180px', overflow: 'visible' }}
      ref={autocompleteRef}
    >
      <div style={{ position: 'relative', overflow: 'visible' }}>
        <TextField
          inputRef={inputRef}
          value={inputVal}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          onFocus={() => {
            // Only clear LOV values if focus was NOT caused by Tab or Shift + Tab
            if (!isShiftTabRef.current) {
              openDropdown();
            }
          }}
          onBlur={() => {
            // Delay the validation to allow selection to complete
            setTimeout(() => {
              const activeElement = document.activeElement;
              const isFocusInDropdown = activeElement && autocompleteRef.current?.contains(activeElement);
              const isSelecting = isSelectingRef.current;

              if (isSelecting || isFocusInDropdown) {
                return;
              }

              handleCloseDropdown(false);
            }, 150);
          }}
          placeholder={loading ? 'Loading...' : loadError ? 'Error loading...' : 'Select level...'}
          size="small"
          error={error}
          sx={{
            width: '180px',
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
                borderRadius: '3px',
              },
              '&:hover fieldset': {
                borderColor: '#ddd',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#007bff',
                borderWidth: '1px',
              },
            },
            '& .MuiInputLabel-root': {
              display: 'none',
            },
          }}
        />
        <ChevronDown
          size={16}
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#666',
            cursor: 'pointer',
            pointerEvents: 'auto',
            zIndex: 2
          }}
          onMouseDown={(e) => {
            e.preventDefault();
          }}
          onClick={() => {
            if (!isOpen) {
              openDropdown();
            } else {
              handleCloseDropdown(false);
            }
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
            width: '180px',
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderTop: 'none',
            borderRadius: '0 0 4px 4px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            zIndex: 1000,
            maxHeight: '240px',
            overflowY: 'auto',
            marginTop: '4px'
          }}
          tabIndex={-1}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={`${option.value}-${index}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectOption(option.value);
                }}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  backgroundColor: index === highlightedIndex ? '#cce5ff' : (option.value === value ? '#e3f2fd' : 'white'),
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: '13px',
                  transition: 'background-color 0.2s',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                onMouseEnter={() => {
                  setHighlightedIndex(index);
                }}
                title={DOMPurify.sanitize(option.label, { ALLOWED_TAGS: [] })}
              >
                {DOMPurify.sanitize(option.label, { ALLOWED_TAGS: [] })}
              </div>
            ))
          ) : (
            <div
              style={{
                padding: '12px',
                zIndex: 1000,
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

// Organization Autocomplete Component
export const OrganizationAutocomplete = ({
  value,
  onChange,
  options = [],
  error = false
}) => {
  // Initialize with the label if value matches an option, otherwise use the value
  const getInitialValue = () => {
    if (!value) return '';
    const matchingOption = options.find(opt => opt.value === value);
    return matchingOption ? matchingOption.label : value;
  };

  const [isOpen, setIsOpen] = useState(false);
  const [inputVal, setInputVal] = useState(getInitialValue());
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const autocompleteRef = useRef(null);
  const inputRef = useRef(null);

  const isExternalChangeRef = useRef(false);
  const isUserEditingRef = useRef(false);
  const isSelectingRef = useRef(false);
  const isShiftTabRef = useRef(false);
  const isTabRef = useRef(false);

  // Store the value before opening dropdown to restore if closed without selection
  const previousValueRef = useRef(value);
  const previousInputValRef = useRef(inputVal);
  // Track if dropdown is open for this specific instance
  const isOpenRef = useRef(false);
  // Store latest onChange in ref to avoid stale closures
  const onChangeRef = useRef(onChange);
  // Track if a selection was just made to prevent restore
  const selectionMadeRef = useRef(false);

  // Keep onChangeRef updated
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Keep isOpenRef in sync with isOpen state
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    // Only update inputVal when prop value changes AND user is not actively editing
    if (!isUserEditingRef.current && !isExternalChangeRef.current) {
      // Find the option that matches the value and display its label
      const matchingOption = options.find(opt => opt.value === value);
      setInputVal(matchingOption ? matchingOption.label : (value || ''));
    }

    if (isExternalChangeRef.current) {
      isExternalChangeRef.current = false;
    }
  }, [value, options]);

  // Auto-select if only 1 option exists
  useEffect(() => {
    if (options && options.length === 1 && (!value || value === '')) {
      const singleOption = options[0];
      isExternalChangeRef.current = true;
      onChangeRef.current(singleOption.value);
      setInputVal(singleOption.label);
    }
  }, [options, value]);

  // Handle closing dropdown - restore previous value if no selection was made
  const handleCloseDropdown = (wasSelectionMade = false) => {
    // Only process if this dropdown is actually open
    if (!isOpenRef.current) {
      return;
    }

    // If a selection was just made, don't restore
    if (selectionMadeRef.current) {
      selectionMadeRef.current = false;
      setIsOpen(false);
      setHighlightedIndex(-1);
      isUserEditingRef.current = false;
      return;
    }

    if (!wasSelectionMade && previousValueRef.current !== undefined) {
      // Restore the previous value only if it's different from the current prop value
      if (value !== previousValueRef.current) {
        onChangeRef.current(previousValueRef.current);
      }
      setInputVal(previousInputValRef.current);
    }
    setIsOpen(false);
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Only handle if this dropdown is open AND click is outside this component
      if (isOpenRef.current && autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        handleCloseDropdown(false);
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

  // Function to open dropdown and store current value
  const openDropdown = () => {
    // Store current value before opening
    previousValueRef.current = value;
    const matchingOption = options.find(opt => opt.value === value);
    previousInputValRef.current = matchingOption ? matchingOption.label : (value || '');
    selectionMadeRef.current = false;

    // Clear input to show all options, but don't clear the actual value yet
    setInputVal('');
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    // Automatically capitalize the first character
    const capitalizedVal = val.charAt(0).toUpperCase() + val.slice(1);
    setInputVal(capitalizedVal);
    setIsOpen(true); // Keep dropdown open when typing
    setHighlightedIndex(-1); // Reset highlight when typing
    isUserEditingRef.current = true;

    // Check if the capitalized value matches a valid LOV option
    const matchingOption = options.find(opt =>
      opt.label.toLowerCase() === capitalizedVal.toLowerCase() ||
      opt.value === capitalizedVal
    );

    if (matchingOption) {
      // If it's a valid LOV option, notify parent with the value
      onChangeRef.current(matchingOption.value);
    } else if (capitalizedVal === '' || capitalizedVal.trim() === '') {
      // If user is clearing a valid LOV selection, notify parent
      onChangeRef.current('');
    }
  };

  const handleKeyDown = (e) => {
    // Handle arrow keys to open dropdown if closed
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      // No stopPropagation needed here typically unless nested, but adding it for consistency if desired.
      // e.stopPropagation(); 

      if (!isOpen) {
        openDropdown();
        setHighlightedIndex(0);
        return;
      }

      // Navigate through options when dropdown is open
      if (e.key === 'ArrowDown') {
        setHighlightedIndex(prev => {
          const nextIndex = prev < filteredOptions.length - 1 ? prev + 1 : 0;
          return nextIndex;
        });
      } else if (e.key === 'ArrowUp') {
        setHighlightedIndex(prev => {
          const nextIndex = prev > 0 ? prev - 1 : filteredOptions.length - 1;
          return nextIndex;
        });
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
    // Find the selected option to get its label
    const selectedOption = options.find(opt => opt.value === optionValue);
    const displayLabel = selectedOption ? selectedOption.label : optionValue;

    // Mark that a selection was made BEFORE any state changes
    selectionMadeRef.current = true;
    isSelectingRef.current = true;
    isExternalChangeRef.current = true;

    // Update the previous value refs since a selection was made
    previousValueRef.current = optionValue;
    previousInputValRef.current = displayLabel;

    onChangeRef.current(optionValue);  // Send the value (ID) to parent form
    setInputVal(displayLabel);  // Display the label (name) in input
    setIsOpen(false);
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;

    // Blur the input so next click will trigger onFocus and clear the value
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.blur();
      }
      isSelectingRef.current = false;
    }, 50);
  };

  // Normalize input by removing + for comparison, but only filter if input has length
  const normalizedInput = inputVal.toLowerCase().replace(/^\+/, '');
  const filteredOptions = normalizedInput.length === 0
    ? options
    : options.filter(option => {
      const normalizedLabel = option.label.toLowerCase().replace(/^\+/, '');
      return normalizedLabel.startsWith(normalizedInput);
    });

  return (
    <div
      style={{ position: 'relative', width: '180px', overflow: 'visible' }}
      ref={autocompleteRef}
    >
      <div style={{ position: 'relative', overflow: 'visible' }}>
        <TextField
          inputRef={inputRef}
          value={inputVal}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          onFocus={() => {
            // Only clear LOV values if focus was NOT caused by Tab or Shift + Tab
            if (!isShiftTabRef.current) {
              openDropdown();
            }
          }}
          onBlur={() => {
            // Delay the validation to allow selection to complete
            setTimeout(() => {
              const activeElement = document.activeElement;
              const isFocusInDropdown = activeElement && autocompleteRef.current?.contains(activeElement);
              const isSelecting = isSelectingRef.current;

              if (isSelecting || isFocusInDropdown) {
                return;
              }

              handleCloseDropdown(false);
            }, 150);
          }}
          placeholder="Select from list..."
          size="small"
          error={error}
          sx={{
            width: '180px',
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
                borderRadius: '3px',
              },
              '&:hover fieldset': {
                borderColor: '#ddd',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#007bff',
                borderWidth: '1px',
              },
            },
            '& .MuiInputLabel-root': {
              display: 'none',
            },
          }}
        />
        <ChevronDown
          size={16}
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#666',
            cursor: 'pointer',
            pointerEvents: 'auto',
            zIndex: 2
          }}
          onMouseDown={(e) => {
            e.preventDefault();
          }}
          onClick={() => {
            if (!isOpen) {
              openDropdown();
            } else {
              handleCloseDropdown(false);
            }
          }}
        />
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            width: '180px',
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderTop: 'none',
            borderRadius: '0 0 4px 4px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            zIndex: 1000,
            maxHeight: '240px',
            overflowY: 'auto',
            marginTop: '4px'
          }}
          tabIndex={-1}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={`${option.value}-${index}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectOption(option.value);
                }}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  backgroundColor: index === highlightedIndex ? '#cce5ff' : (option.value === value ? '#e3f2fd' : 'white'),
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: '13px',
                  transition: 'background-color 0.2s',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#cce5ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    index === highlightedIndex ? '#cce5ff' : (option.value === value ? '#e3f2fd' : 'white');
                }}
                title={DOMPurify.sanitize(option.label, { ALLOWED_TAGS: [] })}
              >
                {DOMPurify.sanitize(option.label, { ALLOWED_TAGS: [] })}
              </div>
            ))
          ) : (
            <div
              style={{
                padding: '12px',
                zIndex: 1000,
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

// Full Name Autocomplete Component
export const FullNameAutocomplete = ({
  value,
  onChange,
  options = [],
  error = false,
  resourceRosterId = '',
  onResourceChange,
  setFieldErrors
}) => {
  // Initialize with the label if value matches an option, otherwise use the value
  const getInitialValue = () => {
    if (!value) return '';
    const matchingOption = options.find(opt => opt.value === value);
    return matchingOption ? matchingOption.label : (value || '');
  };

  const [isOpen, setIsOpen] = useState(false);
  const [inputVal, setInputVal] = useState(getInitialValue());
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const autocompleteRef = useRef(null);
  const inputRef = useRef(null);

  const isExternalChangeRef = useRef(false);
  const isUserEditingRef = useRef(false);
  const isSelectingRef = useRef(false);
  const isShiftTabRef = useRef(false);
  const isTabRef = useRef(false);

  // Store the value before opening dropdown to restore if closed without selection
  const previousValueRef = useRef(value);
  const previousInputValRef = useRef(inputVal);
  // Track if dropdown is open for this specific instance
  const isOpenRef = useRef(false);
  // Store latest onChange in ref to avoid stale closures
  const onChangeRef = useRef(onChange);
  // Track if a selection was just made to prevent restore
  const selectionMadeRef = useRef(false);

  // Keep onChangeRef updated
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Keep isOpenRef in sync with isOpen state
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    // Only update inputVal when prop value changes AND user is not actively editing
    if (!isUserEditingRef.current && !isExternalChangeRef.current) {
      // Find the option that matches the value and display its label
      const matchingOption = options.find(opt => opt.value === value);
      setInputVal(matchingOption ? matchingOption.label : (value || ''));
    }

    if (isExternalChangeRef.current) {
      isExternalChangeRef.current = false;
    }
  }, [value, options]);

  // Handle closing dropdown - restore previous value if no selection was made
  const handleCloseDropdown = (wasSelectionMade = false) => {
    // Only process if this dropdown is actually open
    if (!isOpenRef.current) {
      return;
    }

    // If a selection was just made, don't restore
    if (selectionMadeRef.current) {
      selectionMadeRef.current = false;
      setIsOpen(false);
      setHighlightedIndex(-1);
      isUserEditingRef.current = false;
      return;
    }

    if (!wasSelectionMade && previousValueRef.current !== undefined) {
      // Restore the previous value only if it's different from the current prop value
      if (value !== previousValueRef.current) {
        onChangeRef.current(previousValueRef.current);
      }
      setInputVal(previousInputValRef.current);
    }
    setIsOpen(false);
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Only handle if this dropdown is open AND click is outside this component
      if (isOpenRef.current && autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        handleCloseDropdown(false);
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

  // Function to open dropdown and store current value
  const openDropdown = () => {
    // Store current value before opening
    previousValueRef.current = value;
    const matchingOption = options.find(opt => opt.value === value);
    previousInputValRef.current = matchingOption ? matchingOption.label : (value || '');
    selectionMadeRef.current = false;

    // Clear input to show all options, but don't clear the actual value yet
    setInputVal('');
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;

    // Check character limit first
    if (val.length > 100) {
      if (setFieldErrors) {
        setFieldErrors(prev => ({
          ...prev,
          fullName: 'Full Name cannot exceed 100 characters'
        }));
      }
      return; // Block input if it exceeds 100 characters
    } else {
      // Clear the error if character count is within limit
      if (setFieldErrors) {
        setFieldErrors(prev => ({
          ...prev,
          fullName: ''
        }));
      }
    }

    // Validate against legalName pattern: letters, numbers, spaces, and & - . , ' ( ) /
    const legalNameRegex = /^[a-zA-Z0-9\s&\-.,\'()\/]*$/;
    if (!legalNameRegex.test(val)) {
      // If validation fails, don't update the value
      return;
    }

    // Automatically capitalize the first character
    const capitalizedVal = val.charAt(0).toUpperCase() + val.slice(1);
    setInputVal(capitalizedVal);
    setIsOpen(true); // Keep dropdown open when typing
    setHighlightedIndex(-1); // Reset highlight when typing
    isUserEditingRef.current = true;

    // Check if the capitalized value matches a valid LOV option
    const matchingOption = options.find(opt =>
      opt.label.toLowerCase() === capitalizedVal.toLowerCase() ||
      opt.value === capitalizedVal
    );

    if (matchingOption) {
      // If it's a valid LOV option, notify parent with the value (ID)
      onChangeRef.current(matchingOption.value);
    } else {
      // Allow free text entry - notify parent with the entered text
      onChangeRef.current(capitalizedVal);
    }
  };

  const handleKeyDown = (e) => {
    // Handle arrow keys to open dropdown if closed
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      // No stopPropagation needed here typically unless nested, but adding it for consistency if desired.
      // e.stopPropagation(); 

      if (!isOpen) {
        openDropdown();
        setHighlightedIndex(0);
        return;
      }

      // Navigate through options when dropdown is open
      if (e.key === 'ArrowDown') {
        setHighlightedIndex(prev => {
          const nextIndex = prev < filteredOptions.length - 1 ? prev + 1 : 0;
          return nextIndex;
        });
      } else if (e.key === 'ArrowUp') {
        setHighlightedIndex(prev => {
          const nextIndex = prev > 0 ? prev - 1 : filteredOptions.length - 1;
          return nextIndex;
        });
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
    // Find the selected option to get its label
    const selectedOption = options.find(opt => opt.value === optionValue);
    const displayLabel = selectedOption ? selectedOption.label : optionValue;

    // Check if this is a different resource than the currently loaded one
    const isDifferentResource = optionValue !== resourceRosterId;

    // Mark that a selection was made BEFORE any state changes
    selectionMadeRef.current = true;
    isSelectingRef.current = true;
    isExternalChangeRef.current = true;

    // Update the previous value refs since a selection was made
    previousValueRef.current = optionValue;
    previousInputValRef.current = displayLabel;

    onChangeRef.current(optionValue);  // Send the value (ID) to parent form
    setInputVal(displayLabel);  // Display the label (name) in input
    setIsOpen(false);
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;

    // If a different resource was selected, trigger data reload
    if (isDifferentResource && onResourceChange) {
      onResourceChange(optionValue);
    }

    // Blur the input so next click will trigger onFocus and clear the value
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.blur();
      }
      isSelectingRef.current = false;
    }, 50);
  };

  // Filter options based on input
  const normalizedInput = inputVal.toLowerCase();
  const filteredOptions = normalizedInput.length === 0
    ? options
    : options.filter(option => {
      const normalizedLabel = option.label.toLowerCase();
      const normalizedValue = String(option.value).toLowerCase();
      return normalizedLabel.includes(normalizedInput) || normalizedValue.includes(normalizedInput);
    });

  return (
    <div
      style={{ position: 'relative', width: '180px', overflow: 'visible' }}
      ref={autocompleteRef}
    >
      <div style={{ position: 'relative', overflow: 'visible' }}>
        <TextField
          inputRef={inputRef}
          value={inputVal}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          onFocus={() => {
            // Only clear LOV values if focus was NOT caused by Tab or Shift + Tab
            if (!isShiftTabRef.current) {
              openDropdown();
            }
          }}
          onBlur={() => {
            // Delay the validation to allow selection to complete
            setTimeout(() => {
              const activeElement = document.activeElement;
              const isFocusInDropdown = activeElement && autocompleteRef.current?.contains(activeElement);
              const isSelecting = isSelectingRef.current;

              if (isSelecting || isFocusInDropdown) {
                return;
              }

              handleCloseDropdown(false);
            }, 150);
          }}
          placeholder="Select from list..."
          size="small"
          error={error}
          sx={{
            width: '180px',
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
                borderRadius: '3px',
              },
              '&:hover fieldset': {
                borderColor: '#ddd',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#007bff',
                borderWidth: '1px',
              },
            },
            '& .MuiInputLabel-root': {
              display: 'none',
            },
          }}
        />
        <ChevronDown
          size={16}
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#666',
            cursor: 'pointer',
            pointerEvents: 'auto',
            zIndex: 2
          }}
          onMouseDown={(e) => {
            e.preventDefault();
          }}
          onClick={() => {
            if (!isOpen) {
              openDropdown();
            } else {
              handleCloseDropdown(false);
            }
          }}
        />
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            width: '180px',
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderTop: 'none',
            borderRadius: '0 0 4px 4px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            zIndex: 1000,
            maxHeight: '240px',
            overflowY: 'auto',
            marginTop: '4px'
          }}
          tabIndex={-1}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={`${option.value}-${index}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectOption(option.value);
                }}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  backgroundColor: index === highlightedIndex ? '#cce5ff' : (option.value === value ? '#e3f2fd' : 'white'),
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: '13px',
                  transition: 'background-color 0.2s',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#cce5ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    index === highlightedIndex ? '#cce5ff' : (option.value === value ? '#e3f2fd' : 'white');
                }}
                title={DOMPurify.sanitize(option.label, { ALLOWED_TAGS: [] })}
              >
                {DOMPurify.sanitize(option.label, { ALLOWED_TAGS: [] })}
              </div>
            ))
          ) : (
            <div
              style={{
                padding: '12px',
                zIndex: 1000,
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

// Employment Type Autocomplete Component
export const EmploymentTypeAutocomplete = ({
  value,
  onChange,
  options: propOptions,
  error = false
}) => {
  const { handleAuthError } = useSession();
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch employment types from API
  useEffect(() => {
    const fetchEmploymentTypes = async () => {
      try {
        setLoading(true);
        const idToken = await getIdToken();
        if (!idToken) {
          handleAuthError('Token not found - please login again');
          setOptions([]);
          return;
        }

        const response = await fetch('https://tuo1xmg14d.execute-api.ap-south-1.amazonaws.com/New/rice/get/employmentTypes', {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          }
        });

        if (response.status === 401 || response.status === 403) {
          handleAuthError('Unauthorized - session expired');
          setOptions([]);
          return;
        }

        if (response.ok) {
          const result = await response.json();
          const dataArray = result.data || result;

          if (Array.isArray(dataArray) && dataArray.length > 0) {
            const formattedOptions = dataArray.map((item, index) => {
              const typeKey = Object.keys(item).find(k => k.toLowerCase().includes('type')) || 'employment_type';
              const typeName = String(item[typeKey] || item.employment_type || item.employment_type_name || item.name || '').trim();
              return {
                value: typeName,
                label: typeName
              };
            });
            setOptions(formattedOptions);
          } else {
            setOptions([]);
          }
        } else {
          console.error('Failed to fetch employment types:', response.statusText);
          setOptions([]);
        }
      } catch (error) {
        console.error('Error fetching employment types:', error);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEmploymentTypes();
  }, [handleAuthError]);

  // Initialize with the label if value matches an option, otherwise use the value
  const getInitialValue = () => {
    if (!value) return '';
    const matchingOption = options.find(opt => opt.value === value);
    return matchingOption ? matchingOption.label : (value || '');
  };

  const [isOpen, setIsOpen] = useState(false);
  const [inputVal, setInputVal] = useState(getInitialValue());
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const autocompleteRef = useRef(null);
  const inputRef = useRef(null);

  const isExternalChangeRef = useRef(false);
  const isUserEditingRef = useRef(false);
  const isSelectingRef = useRef(false);
  const isShiftTabRef = useRef(false);
  const isTabRef = useRef(false);

  // Store the value before opening dropdown to restore if closed without selection
  const previousValueRef = useRef(value);
  const previousInputValRef = useRef(inputVal);
  // Track if dropdown is open for this specific instance
  const isOpenRef = useRef(false);
  // Store latest onChange in ref to avoid stale closures
  const onChangeRef = useRef(onChange);
  // Track if a selection was just made to prevent restore
  const selectionMadeRef = useRef(false);

  // Keep onChangeRef updated
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Keep isOpenRef in sync with isOpen state
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    // Only update inputVal when prop value changes AND user is not actively editing
    if (!isUserEditingRef.current && !isExternalChangeRef.current) {
      // Find the option that matches the value and display its label
      const matchingOption = options.find(opt => opt.value === value);
      setInputVal(matchingOption ? matchingOption.label : (value || ''));
    }

    if (isExternalChangeRef.current) {
      isExternalChangeRef.current = false;
    }
  }, [value, options]);

  // Handle closing dropdown - restore previous value if no selection was made
  const handleCloseDropdown = (wasSelectionMade = false) => {
    // Only process if this dropdown is actually open
    if (!isOpenRef.current) {
      return;
    }

    // If a selection was just made, don't restore
    if (selectionMadeRef.current) {
      selectionMadeRef.current = false;
      setIsOpen(false);
      setHighlightedIndex(-1);
      isUserEditingRef.current = false;
      return;
    }

    if (!wasSelectionMade && previousValueRef.current !== undefined) {
      // Restore the previous value only if it's different from the current prop value
      if (value !== previousValueRef.current) {
        onChangeRef.current(previousValueRef.current);
      }
      setInputVal(previousInputValRef.current);
    }
    setIsOpen(false);
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Only handle if this dropdown is open AND click is outside this component
      if (isOpenRef.current && autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        handleCloseDropdown(false);
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

  // Function to open dropdown and store current value
  const openDropdown = () => {
    // Store current value before opening
    previousValueRef.current = value;
    const matchingOption = options.find(opt => opt.value === value);
    previousInputValRef.current = matchingOption ? matchingOption.label : (value || '');
    selectionMadeRef.current = false;

    // Clear input to show all options, but don't clear the actual value yet
    setInputVal('');
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    // Automatically capitalize the first character
    const capitalizedVal = val.charAt(0).toUpperCase() + val.slice(1);
    setInputVal(capitalizedVal);
    setIsOpen(true); // Keep dropdown open when typing
    setHighlightedIndex(-1); // Reset highlight when typing
    isUserEditingRef.current = true;

    // Check if the capitalized value matches a valid LOV option
    const matchingOption = options.find(opt =>
      opt.label.toLowerCase() === capitalizedVal.toLowerCase() ||
      opt.value === capitalizedVal
    );

    if (matchingOption) {
      // If it's a valid LOV option, notify parent with the value
      onChangeRef.current(matchingOption.value);
    } else if (capitalizedVal === '' || capitalizedVal.trim() === '') {
      // If user is clearing a valid LOV selection, notify parent
      onChangeRef.current('');
    }
  };

  const handleKeyDown = (e) => {
    // Handle arrow keys to open dropdown if closed
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      // No stopPropagation needed here typically unless nested, but adding it for consistency if desired.
      // e.stopPropagation(); 

      if (!isOpen) {
        openDropdown();
        setHighlightedIndex(0);
        return;
      }

      // Navigate through options when dropdown is open
      if (e.key === 'ArrowDown') {
        setHighlightedIndex(prev => {
          const nextIndex = prev < filteredOptions.length - 1 ? prev + 1 : 0;
          return nextIndex;
        });
      } else if (e.key === 'ArrowUp') {
        setHighlightedIndex(prev => {
          const nextIndex = prev > 0 ? prev - 1 : filteredOptions.length - 1;
          return nextIndex;
        });
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
    // Find the selected option to get its label
    const selectedOption = options.find(opt => opt.value === optionValue);
    const displayLabel = selectedOption ? selectedOption.label : optionValue;

    // Mark that a selection was made BEFORE any state changes
    selectionMadeRef.current = true;
    isSelectingRef.current = true;
    isExternalChangeRef.current = true;

    // Update the previous value refs since a selection was made
    previousValueRef.current = optionValue;
    previousInputValRef.current = displayLabel;

    onChangeRef.current(optionValue);  // Send the value (ID) to parent form
    setInputVal(displayLabel);  // Display the label (name) in input
    setIsOpen(false);
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;

    // Blur the input so next click will trigger onFocus and clear the value
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.blur();
      }
      isSelectingRef.current = false;
    }, 50);
  };

  // Filter options based on input
  const normalizedInput = inputVal.toLowerCase();
  const filteredOptions = normalizedInput.length === 0
    ? options
    : options.filter(option => {
      const normalizedLabel = option.label.toLowerCase();
      const normalizedValue = String(option.value).toLowerCase();
      return normalizedLabel.includes(normalizedInput) || normalizedValue.includes(normalizedInput);
    });

  return (
    <div
      style={{ position: 'relative', width: '180px', overflow: 'visible' }}
      ref={autocompleteRef}
    >
      <div style={{ position: 'relative', overflow: 'visible' }}>
        <TextField
          inputRef={inputRef}
          value={inputVal}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          onFocus={() => {
            // Only clear LOV values if focus was NOT caused by Tab or Shift + Tab
            if (!isShiftTabRef.current) {
              openDropdown();
            }
          }}
          onBlur={() => {
            // Delay the validation to allow selection to complete
            setTimeout(() => {
              const activeElement = document.activeElement;
              const isFocusInDropdown = activeElement && autocompleteRef.current?.contains(activeElement);
              const isSelecting = isSelectingRef.current;

              if (isSelecting || isFocusInDropdown) {
                return;
              }

              handleCloseDropdown(false);
            }, 150);
          }}
          placeholder="Select..."
          size="small"
          error={error}
          sx={{
            width: '180px',
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
                borderRadius: '3px',
              },
              '&:hover fieldset': {
                borderColor: '#ddd',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#007bff',
                borderWidth: '1px',
              },
            },
            '& .MuiInputLabel-root': {
              display: 'none',
            },
          }}
        />
        <ChevronDown
          size={16}
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#666',
            cursor: 'pointer',
            pointerEvents: 'auto',
            zIndex: 2
          }}
          onMouseDown={(e) => {
            e.preventDefault();
          }}
          onClick={() => {
            if (!isOpen) {
              openDropdown();
            } else {
              handleCloseDropdown(false);
            }
          }}
        />
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            width: '180px',
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderTop: 'none',
            borderRadius: '0 0 4px 4px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            zIndex: 1000,
            maxHeight: '240px',
            overflowY: 'auto',
            marginTop: '4px'
          }}
          tabIndex={-1}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={`${option.value}-${index}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectOption(option.value);
                }}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  backgroundColor: index === highlightedIndex ? '#cce5ff' : (option.value === value ? '#e3f2fd' : 'white'),
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: '13px',
                  transition: 'background-color 0.2s',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#cce5ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    index === highlightedIndex ? '#cce5ff' : (option.value === value ? '#e3f2fd' : 'white');
                }}
                title={DOMPurify.sanitize(option.label, { ALLOWED_TAGS: [] })}
              >
                {DOMPurify.sanitize(option.label, { ALLOWED_TAGS: [] })}
              </div>
            ))
          ) : (
            <div
              style={{
                padding: '12px',
                zIndex: 1000,
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

// Billability Status Autocomplete Component
export const BillabilityStatusAutocomplete = ({
  value,
  onChange,
  options = [],
  error = false
}) => {
  // Initialize with the label if value matches an option, otherwise use the value
  const getInitialValue = () => {
    if (!value) return '';
    const matchingOption = options.find(opt => opt.value === value);
    return matchingOption ? matchingOption.label : (value || '');
  };

  const [isOpen, setIsOpen] = useState(false);
  const [inputVal, setInputVal] = useState(getInitialValue());
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const autocompleteRef = useRef(null);
  const inputRef = useRef(null);

  const isExternalChangeRef = useRef(false);
  const isUserEditingRef = useRef(false);
  const isSelectingRef = useRef(false);
  const isShiftTabRef = useRef(false);
  const isTabRef = useRef(false);

  // Store the value before opening dropdown to restore if closed without selection
  const previousValueRef = useRef(value);
  const previousInputValRef = useRef(inputVal);
  // Track if dropdown is open for this specific instance
  const isOpenRef = useRef(false);
  // Store latest onChange in ref to avoid stale closures
  const onChangeRef = useRef(onChange);
  // Track if a selection was just made to prevent restore
  const selectionMadeRef = useRef(false);

  // Keep onChangeRef updated
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Keep isOpenRef in sync with isOpen state
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    // Only update inputVal when prop value changes AND user is not actively editing
    if (!isUserEditingRef.current && !isExternalChangeRef.current) {
      // Find the option that matches the value and display its label
      const matchingOption = options.find(opt => opt.value === value);
      setInputVal(matchingOption ? matchingOption.label : (value || ''));
    }

    if (isExternalChangeRef.current) {
      isExternalChangeRef.current = false;
    }
  }, [value, options]);

  // Handle closing dropdown - restore previous value if no selection was made
  const handleCloseDropdown = (wasSelectionMade = false) => {
    // Only process if this dropdown is actually open
    if (!isOpenRef.current) {
      return;
    }

    // If a selection was just made, don't restore
    if (selectionMadeRef.current) {
      selectionMadeRef.current = false;
      setIsOpen(false);
      setHighlightedIndex(-1);
      isUserEditingRef.current = false;
      return;
    }

    if (!wasSelectionMade && previousValueRef.current !== undefined) {
      // Restore the previous value only if it's different from the current prop value
      if (value !== previousValueRef.current) {
        onChangeRef.current(previousValueRef.current);
      }
      setInputVal(previousInputValRef.current);
    }
    setIsOpen(false);
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Only handle if this dropdown is open AND click is outside this component
      if (isOpenRef.current && autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        handleCloseDropdown(false);
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

  // Function to open dropdown and store current value
  const openDropdown = () => {
    // Store current value before opening
    previousValueRef.current = value;
    const matchingOption = options.find(opt => opt.value === value);
    previousInputValRef.current = matchingOption ? matchingOption.label : (value || '');
    selectionMadeRef.current = false;

    // Clear input to show all options, but don't clear the actual value yet
    setInputVal('');
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    // Automatically capitalize the first character
    const capitalizedVal = val.charAt(0).toUpperCase() + val.slice(1);
    setInputVal(capitalizedVal);
    setIsOpen(true); // Keep dropdown open when typing
    setHighlightedIndex(-1); // Reset highlight when typing
    isUserEditingRef.current = true;

    // Check if the capitalized value matches a valid LOV option
    const matchingOption = options.find(opt =>
      opt.label.toLowerCase() === capitalizedVal.toLowerCase() ||
      opt.value === capitalizedVal
    );

    if (matchingOption) {
      // If it's a valid LOV option, notify parent with the value
      onChangeRef.current(matchingOption.value);
    } else if (capitalizedVal === '' || capitalizedVal.trim() === '') {
      // If user is clearing a valid LOV selection, notify parent
      onChangeRef.current('');
    }
  };

  const handleKeyDown = (e) => {
    // Handle arrow keys to open dropdown if closed
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      // No stopPropagation needed here typically unless nested, but adding it for consistency if desired.
      // e.stopPropagation(); 

      if (!isOpen) {
        openDropdown();
        setHighlightedIndex(0);
        return;
      }

      // Navigate through options when dropdown is open
      if (e.key === 'ArrowDown') {
        setHighlightedIndex(prev => {
          const nextIndex = prev < filteredOptions.length - 1 ? prev + 1 : 0;
          return nextIndex;
        });
      } else if (e.key === 'ArrowUp') {
        setHighlightedIndex(prev => {
          const nextIndex = prev > 0 ? prev - 1 : filteredOptions.length - 1;
          return nextIndex;
        });
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
    // Find the selected option to get its label
    const selectedOption = options.find(opt => opt.value === optionValue);
    const displayLabel = selectedOption ? selectedOption.label : optionValue;

    // Mark that a selection was made BEFORE any state changes
    selectionMadeRef.current = true;
    isSelectingRef.current = true;
    isExternalChangeRef.current = true;

    // Update the previous value refs since a selection was made
    previousValueRef.current = optionValue;
    previousInputValRef.current = displayLabel;

    onChangeRef.current(optionValue);  // Send the value (ID) to parent form
    setInputVal(displayLabel);  // Display the label (name) in input
    setIsOpen(false);
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;

    // Blur the input so next click will trigger onFocus and clear the value
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.blur();
      }
      isSelectingRef.current = false;
    }, 50);
  };

  // Filter options based on input
  const normalizedInput = inputVal.toLowerCase();
  const filteredOptions = normalizedInput.length === 0
    ? options
    : options.filter(option => {
      const normalizedLabel = option.label.toLowerCase();
      const normalizedValue = String(option.value).toLowerCase();
      return normalizedLabel.includes(normalizedInput) || normalizedValue.includes(normalizedInput);
    });

  return (
    <div
      style={{ position: 'relative', width: '180px', overflow: 'visible' }}
      ref={autocompleteRef}
    >
      <div style={{ position: 'relative', overflow: 'visible' }}>
        <TextField
          inputRef={inputRef}
          value={inputVal}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          onFocus={() => {
            // Only clear LOV values if focus was NOT caused by Tab or Shift + Tab
            if (!isShiftTabRef.current) {
              openDropdown();
            }
          }}
          onBlur={() => {
            // Delay the validation to allow selection to complete
            setTimeout(() => {
              const activeElement = document.activeElement;
              const isFocusInDropdown = activeElement && autocompleteRef.current?.contains(activeElement);
              const isSelecting = isSelectingRef.current;

              if (isSelecting || isFocusInDropdown) {
                return;
              }

              handleCloseDropdown(false);
            }, 150);
          }}
          placeholder="Select..."
          size="small"
          error={error}
          sx={{
            width: '180px',
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
                borderRadius: '3px',
              },
              '&:hover fieldset': {
                borderColor: '#ddd',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#007bff',
                borderWidth: '1px',
              },
            },
            '& .MuiInputLabel-root': {
              display: 'none',
            },
          }}
        />
        <ChevronDown
          size={16}
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#666',
            cursor: 'pointer',
            pointerEvents: 'auto',
            zIndex: 2
          }}
          onMouseDown={(e) => {
            e.preventDefault();
          }}
          onClick={() => {
            if (!isOpen) {
              openDropdown();
            } else {
              handleCloseDropdown(false);
            }
          }}
        />
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            width: '180px',
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderTop: 'none',
            borderRadius: '0 0 4px 4px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            zIndex: 1000,
            maxHeight: '240px',
            overflowY: 'auto',
            marginTop: '4px'
          }}
          tabIndex={-1}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={`${option.value}-${index}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectOption(option.value);
                }}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  backgroundColor: index === highlightedIndex ? '#cce5ff' : (option.value === value ? '#e3f2fd' : 'white'),
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: '13px',
                  transition: 'background-color 0.2s',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#cce5ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    index === highlightedIndex ? '#cce5ff' : (option.value === value ? '#e3f2fd' : 'white');
                }}
                title={DOMPurify.sanitize(option.label, { ALLOWED_TAGS: [] })}
              >
                {DOMPurify.sanitize(option.label, { ALLOWED_TAGS: [] })}
              </div>
            ))
          ) : (
            <div
              style={{
                padding: '12px',
                zIndex: 1000,
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


// Onboarding Status Autocomplete Component
export const OnboardingStatusAutocomplete = ({
  value,
  onChange,
  options = [],
  error = false
}) => {
  // Initialize with the label if value matches an option, otherwise use the value
  const getInitialValue = () => {
    if (!value) return '';
    const matchingOption = options.find(opt => opt.value === value);
    return matchingOption ? matchingOption.label : (value || '');
  };

  const [isOpen, setIsOpen] = useState(false);
  const [inputVal, setInputVal] = useState(getInitialValue());
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const autocompleteRef = useRef(null);
  const inputRef = useRef(null);

  const isExternalChangeRef = useRef(false);
  const isUserEditingRef = useRef(false);
  const isSelectingRef = useRef(false);
  const isShiftTabRef = useRef(false);
  const isTabRef = useRef(false);

  // Store the value before opening dropdown to restore if closed without selection
  const previousValueRef = useRef(value);
  const previousInputValRef = useRef(inputVal);
  // Track if dropdown is open for this specific instance
  const isOpenRef = useRef(false);
  // Store latest onChange in ref to avoid stale closures
  const onChangeRef = useRef(onChange);
  // Track if a selection was just made to prevent restore
  const selectionMadeRef = useRef(false);

  // Keep onChangeRef updated
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Keep isOpenRef in sync with isOpen state
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    // Only update inputVal when prop value changes AND user is not actively editing
    if (!isUserEditingRef.current && !isExternalChangeRef.current) {
      // Find the option that matches the value and display its label
      const matchingOption = options.find(opt => opt.value === value);
      setInputVal(matchingOption ? matchingOption.label : (value || ''));
    }

    if (isExternalChangeRef.current) {
      isExternalChangeRef.current = false;
    }
  }, [value, options]);

  // Handle closing dropdown - restore previous value if no selection was made
  const handleCloseDropdown = (wasSelectionMade = false) => {
    // Only process if this dropdown is actually open
    if (!isOpenRef.current) {
      return;
    }

    // If a selection was just made, don't restore
    if (selectionMadeRef.current) {
      selectionMadeRef.current = false;
      setIsOpen(false);
      setHighlightedIndex(-1);
      isUserEditingRef.current = false;
      return;
    }

    if (!wasSelectionMade && previousValueRef.current !== undefined) {
      // Restore the previous value only if it's different from the current prop value
      if (value !== previousValueRef.current) {
        onChangeRef.current(previousValueRef.current);
      }
      setInputVal(previousInputValRef.current);
    }
    setIsOpen(false);
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Only handle if this dropdown is open AND click is outside this component
      if (isOpenRef.current && autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        handleCloseDropdown(false);
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

  // Function to open dropdown and store current value
  const openDropdown = () => {
    // Store current value before opening
    previousValueRef.current = value;
    const matchingOption = options.find(opt => opt.value === value);
    previousInputValRef.current = matchingOption ? matchingOption.label : (value || '');
    selectionMadeRef.current = false;

    // Clear input to show all options, but don't clear the actual value yet
    setInputVal('');
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    // Automatically capitalize the first character
    const capitalizedVal = val.charAt(0).toUpperCase() + val.slice(1);
    setInputVal(capitalizedVal);
    setIsOpen(true); // Keep dropdown open when typing
    setHighlightedIndex(-1); // Reset highlight when typing
    isUserEditingRef.current = true;

    // Check if the capitalized value matches a valid LOV option
    const matchingOption = options.find(opt =>
      opt.label.toLowerCase() === capitalizedVal.toLowerCase() ||
      opt.value === capitalizedVal
    );

    if (matchingOption) {
      // If it's a valid LOV option, notify parent with the value
      onChangeRef.current(matchingOption.value);
    } else if (capitalizedVal === '' || capitalizedVal.trim() === '') {
      // If user is clearing a valid LOV selection, notify parent
      onChangeRef.current('');
    }
  };

  const handleKeyDown = (e) => {
    // Handle arrow keys to open dropdown if closed
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      // No stopPropagation needed here typically unless nested, but adding it for consistency if desired.
      // e.stopPropagation(); 

      if (!isOpen) {
        openDropdown();
        setHighlightedIndex(0);
        return;
      }

      // Navigate through options when dropdown is open
      if (e.key === 'ArrowDown') {
        setHighlightedIndex(prev => {
          const nextIndex = prev < filteredOptions.length - 1 ? prev + 1 : 0;
          return nextIndex;
        });
      } else if (e.key === 'ArrowUp') {
        setHighlightedIndex(prev => {
          const nextIndex = prev > 0 ? prev - 1 : filteredOptions.length - 1;
          return nextIndex;
        });
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
    // Find the selected option to get its label
    const selectedOption = options.find(opt => opt.value === optionValue);
    const displayLabel = selectedOption ? selectedOption.label : optionValue;

    // Mark that a selection was made BEFORE any state changes
    selectionMadeRef.current = true;
    isSelectingRef.current = true;
    isExternalChangeRef.current = true;

    // Update the previous value refs since a selection was made
    previousValueRef.current = optionValue;
    previousInputValRef.current = displayLabel;

    onChangeRef.current(optionValue);  // Send the value (ID) to parent form
    setInputVal(displayLabel);  // Display the label (name) in input
    setIsOpen(false);
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;

    // Blur the input so next click will trigger onFocus and clear the value
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.blur();
      }
      isSelectingRef.current = false;
    }, 50);
  };

  // Filter options based on input
  const normalizedInput = inputVal.toLowerCase();
  const filteredOptions = normalizedInput.length === 0
    ? options
    : options.filter(option => {
      const normalizedLabel = option.label.toLowerCase();
      const normalizedValue = String(option.value).toLowerCase();
      return normalizedLabel.includes(normalizedInput) || normalizedValue.includes(normalizedInput);
    });

  return (
    <div
      style={{ position: 'relative', width: '200px', overflow: 'visible' }}
      ref={autocompleteRef}
    >
      <div style={{ position: 'relative', overflow: 'visible' }}>
        <TextField
          inputRef={inputRef}
          value={inputVal}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          onFocus={() => {
            // Only clear LOV values if focus was NOT caused by Tab or Shift + Tab
            if (!isShiftTabRef.current) {
              openDropdown();
            }
          }}
          onBlur={() => {
            // Delay the validation to allow selection to complete
            setTimeout(() => {
              const activeElement = document.activeElement;
              const isFocusInDropdown = activeElement && autocompleteRef.current?.contains(activeElement);
              const isSelecting = isSelectingRef.current;

              if (isSelecting || isFocusInDropdown) {
                return;
              }

              handleCloseDropdown(false);
            }, 150);
          }}
          placeholder="Select..."
          size="small"
          error={error}
          sx={{
            width: '200px',
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
                borderRadius: '3px',
              },
              '&:hover fieldset': {
                borderColor: '#ddd',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#007bff',
                borderWidth: '1px',
              },
            },
            '& .MuiInputLabel-root': {
              display: 'none',
            },
          }}
        />
        <ChevronDown
          size={16}
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#666',
            cursor: 'pointer',
            pointerEvents: 'auto',
            zIndex: 2
          }}
          onMouseDown={(e) => {
            e.preventDefault();
          }}
          onClick={() => {
            if (!isOpen) {
              openDropdown();
            } else {
              handleCloseDropdown(false);
            }
          }}
        />
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            width: '200px',
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderTop: 'none',
            borderRadius: '0 0 4px 4px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            zIndex: 1000,
            maxHeight: '240px',
            overflowY: 'auto',
            marginTop: '4px'
          }}
          tabIndex={-1}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={`${option.value}-${index}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectOption(option.value);
                }}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  backgroundColor: index === highlightedIndex ? '#cce5ff' : (option.value === value ? '#e3f2fd' : 'white'),
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: '13px',
                  transition: 'background-color 0.2s',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#cce5ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    index === highlightedIndex ? '#cce5ff' : (option.value === value ? '#e3f2fd' : 'white');
                }}
                title={DOMPurify.sanitize(option.label, { ALLOWED_TAGS: [] })}
              >
                {DOMPurify.sanitize(option.label, { ALLOWED_TAGS: [] })}
              </div>
            ))
          ) : (
            <div
              style={{
                padding: '12px',
                zIndex: 1000,
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

// Application Autocomplete Component
export const ApplicationAutocomplete = ({
  value,
  onChange,
  options = [],
  error = false
}) => {
  // Initialize with the label if value matches an option, otherwise use the value
  const getInitialValue = () => {
    if (!value) return '';
    const matchingOption = options.find(opt => opt.value === value);
    return matchingOption ? matchingOption.label : (value || '');
  };

  const [isOpen, setIsOpen] = useState(false);
  const [inputVal, setInputVal] = useState(getInitialValue());
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const autocompleteRef = useRef(null);
  const inputRef = useRef(null);

  const isExternalChangeRef = useRef(false);
  const isUserEditingRef = useRef(false);
  const isSelectingRef = useRef(false);
  const isShiftTabRef = useRef(false);
  const isTabRef = useRef(false);

  // Store the value before opening dropdown to restore if closed without selection
  const previousValueRef = useRef(value);
  const previousInputValRef = useRef(inputVal);
  // Track if dropdown is open for this specific instance
  const isOpenRef = useRef(false);
  // Store latest onChange in ref to avoid stale closures
  const onChangeRef = useRef(onChange);
  // Track if a selection was just made to prevent restore
  const selectionMadeRef = useRef(false);

  // Keep onChangeRef updated
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Keep isOpenRef in sync with isOpen state
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    // Only update inputVal when prop value changes AND user is not actively editing
    if (!isUserEditingRef.current && !isExternalChangeRef.current) {
      // Find the option that matches the value and display its label
      const matchingOption = options.find(opt => opt.value === value);
      setInputVal(matchingOption ? matchingOption.label : (value || ''));
    }

    if (isExternalChangeRef.current) {
      isExternalChangeRef.current = false;
    }
  }, [value, options]);

  // Handle closing dropdown - restore previous value if no selection was made
  const handleCloseDropdown = (wasSelectionMade = false) => {
    // Only process if this dropdown is actually open
    if (!isOpenRef.current) {
      return;
    }

    // If a selection was just made, don't restore
    if (selectionMadeRef.current) {
      selectionMadeRef.current = false;
      setIsOpen(false);
      setHighlightedIndex(-1);
      isUserEditingRef.current = false;
      return;
    }

    if (!wasSelectionMade && previousValueRef.current !== undefined) {
      // Restore the previous value only if it's different from the current prop value
      if (value !== previousValueRef.current) {
        onChangeRef.current(previousValueRef.current);
      }
      setInputVal(previousInputValRef.current);
    }
    setIsOpen(false);
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Only handle if this dropdown is open AND click is outside this component
      if (isOpenRef.current && autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        handleCloseDropdown(false);
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

  // Function to open dropdown and store current value
  const openDropdown = () => {
    // Store current value before opening
    previousValueRef.current = value;
    const matchingOption = options.find(opt => opt.value === value);
    previousInputValRef.current = matchingOption ? matchingOption.label : (value || '');
    selectionMadeRef.current = false;

    // Clear input to show all options, but don't clear the actual value yet
    setInputVal('');
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    // Automatically capitalize the first character
    const capitalizedVal = val.charAt(0).toUpperCase() + val.slice(1);
    setInputVal(capitalizedVal);
    setIsOpen(true); // Keep dropdown open when typing
    setHighlightedIndex(-1); // Reset highlight when typing
    isUserEditingRef.current = true;

    // Check if the capitalized value matches a valid LOV option
    const matchingOption = options.find(opt =>
      opt.label.toLowerCase() === capitalizedVal.toLowerCase() ||
      opt.value === capitalizedVal
    );

    if (matchingOption) {
      // If it's a valid LOV option, notify parent with the value
      onChangeRef.current(matchingOption.value);
    } else if (capitalizedVal === '' || capitalizedVal.trim() === '') {
      // If user is clearing a valid LOV selection, notify parent
      onChangeRef.current('');
    }
  };

  const handleKeyDown = (e) => {
    // Handle arrow keys to open dropdown if closed
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      // No stopPropagation needed here typically unless nested, but adding it for consistency if desired.
      // e.stopPropagation(); 

      if (!isOpen) {
        openDropdown();
        setHighlightedIndex(0);
        return;
      }

      // Navigate through options when dropdown is open
      if (e.key === 'ArrowDown') {
        setHighlightedIndex(prev => {
          const nextIndex = prev < filteredOptions.length - 1 ? prev + 1 : 0;
          return nextIndex;
        });
      } else if (e.key === 'ArrowUp') {
        setHighlightedIndex(prev => {
          const nextIndex = prev > 0 ? prev - 1 : filteredOptions.length - 1;
          return nextIndex;
        });
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
    // Find the selected option to get its label
    const selectedOption = options.find(opt => opt.value === optionValue);
    const displayLabel = selectedOption ? selectedOption.label : optionValue;

    // Mark that a selection was made BEFORE any state changes
    selectionMadeRef.current = true;
    isSelectingRef.current = true;
    isExternalChangeRef.current = true;

    // Update the previous value refs since a selection was made
    previousValueRef.current = optionValue;
    previousInputValRef.current = displayLabel;

    onChangeRef.current(optionValue);  // Send the value (ID) to parent form
    setInputVal(displayLabel);  // Display the label (name) in input
    setIsOpen(false);
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;

    // Blur the input so next click will trigger onFocus and clear the value
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.blur();
      }
      isSelectingRef.current = false;
    }, 50);
  };

  // Filter options based on input
  const normalizedInput = inputVal.toLowerCase();
  const filteredOptions = normalizedInput.length === 0
    ? options
    : options.filter(option => {
      const normalizedLabel = option.label.toLowerCase();
      const normalizedValue = String(option.value).toLowerCase();
      return normalizedLabel.includes(normalizedInput) || normalizedValue.includes(normalizedInput);
    });

  return (
    <div
      style={{ position: 'relative', width: '200px', overflow: 'visible' }}
      ref={autocompleteRef}
    >
      <div style={{ position: 'relative', overflow: 'visible' }}>
        <TextField
          inputRef={inputRef}
          value={inputVal}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          onFocus={() => {
            // Only clear LOV values if focus was NOT caused by Tab or Shift + Tab
            if (!isShiftTabRef.current) {
              openDropdown();
            }
          }}
          onBlur={() => {
            // Delay the validation to allow selection to complete
            setTimeout(() => {
              const activeElement = document.activeElement;
              const isFocusInDropdown = activeElement && autocompleteRef.current?.contains(activeElement);
              const isSelecting = isSelectingRef.current;

              if (isSelecting || isFocusInDropdown) {
                return;
              }

              handleCloseDropdown(false);
            }, 150);
          }}
          placeholder="Select..."
          size="small"
          error={error}
          sx={{
            width: '200px',
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
                borderRadius: '3px',
              },
              '&:hover fieldset': {
                borderColor: '#ddd',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#007bff',
                borderWidth: '1px',
              },
            },
            '& .MuiInputLabel-root': {
              display: 'none',
            },
          }}
        />
        <ChevronDown
          size={16}
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#666',
            cursor: 'pointer',
            pointerEvents: 'auto',
            zIndex: 2
          }}
          onMouseDown={(e) => {
            e.preventDefault();
          }}
          onClick={() => {
            if (!isOpen) {
              openDropdown();
            } else {
              handleCloseDropdown(false);
            }
          }}
        />
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            width: '200px',
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderTop: 'none',
            borderRadius: '0 0 4px 4px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            zIndex: 1000,
            maxHeight: '240px',
            overflowY: 'auto',
            marginTop: '4px'
          }}
          tabIndex={-1}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={`${option.value}-${index}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectOption(option.value);
                }}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  backgroundColor: index === highlightedIndex ? '#cce5ff' : (option.value === value ? '#e3f2fd' : 'white'),
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: '13px',
                  transition: 'background-color 0.2s',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#cce5ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    index === highlightedIndex ? '#cce5ff' : (option.value === value ? '#e3f2fd' : 'white');
                }}
                title={DOMPurify.sanitize(option.label, { ALLOWED_TAGS: [] })}
              >
                {DOMPurify.sanitize(option.label, { ALLOWED_TAGS: [] })}
              </div>
            ))
          ) : (
            <div
              style={{
                padding: '12px',
                zIndex: 1000,
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

// Nationality Autocomplete Component
export const NationalityAutocomplete = ({
  value,
  onChange,
  options = [],
  error = false
}) => {
  // Initialize with the label if value matches an option, otherwise use the value
  const getInitialValue = () => {
    if (!value) return '';
    const matchingOption = options.find(opt => opt.value === value);
    return matchingOption ? matchingOption.label : (value || '');
  };

  const [isOpen, setIsOpen] = useState(false);
  const [inputVal, setInputVal] = useState(getInitialValue());
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const autocompleteRef = useRef(null);
  const inputRef = useRef(null);

  const isExternalChangeRef = useRef(false);
  const isUserEditingRef = useRef(false);
  const isSelectingRef = useRef(false);
  const isShiftTabRef = useRef(false);
  const isTabRef = useRef(false);

  // Store the value before opening dropdown to restore if closed without selection
  const previousValueRef = useRef(value);
  const previousInputValRef = useRef(inputVal);
  // Track if dropdown is open for this specific instance
  const isOpenRef = useRef(false);
  // Store latest onChange in ref to avoid stale closures
  const onChangeRef = useRef(onChange);
  // Track if a selection was just made to prevent restore
  const selectionMadeRef = useRef(false);

  // Keep onChangeRef updated
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Keep isOpenRef in sync with isOpen state
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    // Only update inputVal when prop value changes AND user is not actively editing
    if (!isUserEditingRef.current && !isExternalChangeRef.current) {
      // Find the option that matches the value and display its label
      const matchingOption = options.find(opt => opt.value === value);
      setInputVal(matchingOption ? matchingOption.label : (value || ''));
    }

    if (isExternalChangeRef.current) {
      isExternalChangeRef.current = false;
    }
  }, [value, options]);

  // Handle closing dropdown - restore previous value if no selection was made
  const handleCloseDropdown = (wasSelectionMade = false) => {
    // Only process if this dropdown is actually open
    if (!isOpenRef.current) {
      return;
    }

    // If a selection was just made, don't restore
    if (selectionMadeRef.current) {
      selectionMadeRef.current = false;
      setIsOpen(false);
      setHighlightedIndex(-1);
      isUserEditingRef.current = false;
      return;
    }

    if (!wasSelectionMade && previousValueRef.current !== undefined) {
      // Restore the previous value only if it's different from the current prop value
      if (value !== previousValueRef.current) {
        onChangeRef.current(previousValueRef.current);
      }
      setInputVal(previousInputValRef.current);
    }
    setIsOpen(false);
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Only handle if this dropdown is open AND click is outside this component
      if (isOpenRef.current && autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        handleCloseDropdown(false);
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

  // Function to open dropdown and store current value
  const openDropdown = () => {
    // Store current value before opening
    previousValueRef.current = value;
    const matchingOption = options.find(opt => opt.value === value);
    previousInputValRef.current = matchingOption ? matchingOption.label : (value || '');
    selectionMadeRef.current = false;

    // Clear input to show all options, but don't clear the actual value yet
    setInputVal('');
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    // Automatically capitalize the first character
    const capitalizedVal = val.charAt(0).toUpperCase() + val.slice(1);
    setInputVal(capitalizedVal);
    setIsOpen(true); // Keep dropdown open when typing
    setHighlightedIndex(-1); // Reset highlight when typing
    isUserEditingRef.current = true;

    // Check if the capitalized value matches a valid LOV option
    const matchingOption = options.find(opt =>
      opt.label.toLowerCase() === capitalizedVal.toLowerCase() ||
      opt.value === capitalizedVal
    );

    if (matchingOption) {
      // If it's a valid LOV option, notify parent with the value
      onChangeRef.current(matchingOption.value);
    } else if (capitalizedVal === '' || capitalizedVal.trim() === '') {
      // If user is clearing a valid LOV selection, notify parent
      onChangeRef.current('');
    }
  };

  const handleKeyDown = (e) => {
    // Handle arrow keys to open dropdown if closed
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      // No stopPropagation needed here typically unless nested, but adding it for consistency if desired.
      // e.stopPropagation(); 

      if (!isOpen) {
        openDropdown();
        setHighlightedIndex(0);
        return;
      }

      // Navigate through options when dropdown is open
      if (e.key === 'ArrowDown') {
        setHighlightedIndex(prev => {
          const nextIndex = prev < filteredOptions.length - 1 ? prev + 1 : 0;
          return nextIndex;
        });
      } else if (e.key === 'ArrowUp') {
        setHighlightedIndex(prev => {
          const nextIndex = prev > 0 ? prev - 1 : filteredOptions.length - 1;
          return nextIndex;
        });
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
    // Find the selected option to get its label
    const selectedOption = options.find(opt => opt.value === optionValue);
    const displayLabel = selectedOption ? selectedOption.label : optionValue;

    // Mark that a selection was made BEFORE any state changes
    selectionMadeRef.current = true;
    isSelectingRef.current = true;
    isExternalChangeRef.current = true;

    // Update the previous value refs since a selection was made
    previousValueRef.current = optionValue;
    previousInputValRef.current = displayLabel;

    onChangeRef.current(optionValue);  // Send the value (ID) to parent form
    setInputVal(displayLabel);  // Display the label (name) in input
    setIsOpen(false);
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;

    // Blur the input so next click will trigger onFocus and clear the value
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.blur();
      }
      isSelectingRef.current = false;
    }, 50);
  };

  // Filter options based on input
  const normalizedInput = inputVal.toLowerCase();
  const filteredOptions = normalizedInput.length === 0
    ? options
    : options.filter(option => {
      const normalizedLabel = option.label.toLowerCase();
      const normalizedValue = String(option.value).toLowerCase();
      return normalizedLabel.includes(normalizedInput) || normalizedValue.includes(normalizedInput);
    });

  return (
    <div
      style={{ position: 'relative', width: '180px', overflow: 'visible' }}
      ref={autocompleteRef}
    >
      <div style={{ position: 'relative', overflow: 'visible' }}>
        <TextField
          inputRef={inputRef}
          value={inputVal}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          onFocus={() => {
            // Only clear LOV values if focus was NOT caused by Tab or Shift + Tab
            if (!isShiftTabRef.current) {
              openDropdown();
            }
          }}
          onBlur={() => {
            // Delay the validation to allow selection to complete
            setTimeout(() => {
              const activeElement = document.activeElement;
              const isFocusInDropdown = activeElement && autocompleteRef.current?.contains(activeElement);
              const isSelecting = isSelectingRef.current;

              if (isSelecting || isFocusInDropdown) {
                return;
              }

              handleCloseDropdown(false);
            }, 150);
          }}
          placeholder="Select..."
          size="small"
          error={error}
          sx={{
            width: '180px',
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
                borderRadius: '3px',
              },
              '&:hover fieldset': {
                borderColor: '#ddd',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#007bff',
                borderWidth: '1px',
              },
            },
            '& .MuiInputLabel-root': {
              display: 'none',
            },
          }}
        />
        <ChevronDown
          size={16}
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#666',
            cursor: 'pointer',
            pointerEvents: 'auto',
            zIndex: 2
          }}
          onMouseDown={(e) => {
            e.preventDefault();
          }}
          onClick={() => {
            if (!isOpen) {
              openDropdown();
            } else {
              handleCloseDropdown(false);
            }
          }}
        />
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            width: '180px',
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderTop: 'none',
            borderRadius: '0 0 4px 4px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            zIndex: 1000,
            maxHeight: '240px',
            overflowY: 'auto',
            marginTop: '4px'
          }}
          tabIndex={-1}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={`${option.value}-${index}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectOption(option.value);
                }}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  backgroundColor: index === highlightedIndex ? '#cce5ff' : (option.value === value ? '#e3f2fd' : 'white'),
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: '13px',
                  transition: 'background-color 0.2s',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#cce5ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    index === highlightedIndex ? '#cce5ff' : (option.value === value ? '#e3f2fd' : 'white');
                }}
                title={DOMPurify.sanitize(option.label, { ALLOWED_TAGS: [] })}
              >
                {DOMPurify.sanitize(option.label, { ALLOWED_TAGS: [] })}
              </div>
            ))
          ) : (
            <div
              style={{
                padding: '12px',
                zIndex: 1000,
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

// Work Location Autocomplete Component
export const WorkLocationAutocomplete = ({
  value,
  onChange,
  options = [],
  error = false
}) => {
  // Initialize with the label if value matches an option, otherwise use the value
  const getInitialValue = () => {
    if (!value) return '';
    const matchingOption = options.find(opt => opt.value === value);
    return matchingOption ? matchingOption.label : (value || '');
  };

  const [isOpen, setIsOpen] = useState(false);
  const [inputVal, setInputVal] = useState(getInitialValue());
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const autocompleteRef = useRef(null);
  const inputRef = useRef(null);

  const isExternalChangeRef = useRef(false);
  const isUserEditingRef = useRef(false);
  const isSelectingRef = useRef(false);
  const isShiftTabRef = useRef(false);
  const isTabRef = useRef(false);

  // Store the value before opening dropdown to restore if closed without selection
  const previousValueRef = useRef(value);
  const previousInputValRef = useRef(inputVal);
  // Track if dropdown is open for this specific instance
  const isOpenRef = useRef(false);
  // Store latest onChange in ref to avoid stale closures
  const onChangeRef = useRef(onChange);
  // Track if a selection was just made to prevent restore
  const selectionMadeRef = useRef(false);

  // Keep onChangeRef updated
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Keep isOpenRef in sync with isOpen state
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    // Only update inputVal when prop value changes AND user is not actively editing
    if (!isUserEditingRef.current && !isExternalChangeRef.current) {
      // Find the option that matches the value and display its label
      const matchingOption = options.find(opt => opt.value === value);
      setInputVal(matchingOption ? matchingOption.label : (value || ''));
    }

    if (isExternalChangeRef.current) {
      isExternalChangeRef.current = false;
    }
  }, [value, options]);

  // Handle closing dropdown - restore previous value if no selection was made
  const handleCloseDropdown = (wasSelectionMade = false) => {
    // Only process if this dropdown is actually open
    if (!isOpenRef.current) {
      return;
    }

    // If a selection was just made, don't restore
    if (selectionMadeRef.current) {
      selectionMadeRef.current = false;
      setIsOpen(false);
      setHighlightedIndex(-1);
      isUserEditingRef.current = false;
      return;
    }

    if (!wasSelectionMade && previousValueRef.current !== undefined) {
      // Restore the previous value only if it's different from the current prop value
      if (value !== previousValueRef.current) {
        onChangeRef.current(previousValueRef.current);
      }
      setInputVal(previousInputValRef.current);
    }
    setIsOpen(false);
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Only handle if this dropdown is open AND click is outside this component
      if (isOpenRef.current && autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        handleCloseDropdown(false);
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

  // Function to open dropdown and store current value
  const openDropdown = () => {
    // Store current value before opening
    previousValueRef.current = value;
    const matchingOption = options.find(opt => opt.value === value);
    previousInputValRef.current = matchingOption ? matchingOption.label : (value || '');
    selectionMadeRef.current = false;

    // Clear input to show all options, but don't clear the actual value yet
    setInputVal('');
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    // Automatically capitalize the first character
    const capitalizedVal = val.charAt(0).toUpperCase() + val.slice(1);
    setInputVal(capitalizedVal);
    setIsOpen(true); // Keep dropdown open when typing
    setHighlightedIndex(-1); // Reset highlight when typing
    isUserEditingRef.current = true;

    // Check if the capitalized value matches a valid LOV option
    const matchingOption = options.find(opt =>
      opt.label.toLowerCase() === capitalizedVal.toLowerCase() ||
      opt.value === capitalizedVal
    );

    if (matchingOption) {
      // If it's a valid LOV option, notify parent with the value
      onChangeRef.current(matchingOption.value);
    } else if (capitalizedVal === '' || capitalizedVal.trim() === '') {
      // If user is clearing a valid LOV selection, notify parent
      onChangeRef.current('');
    }
  };

  const handleKeyDown = (e) => {
    // Handle arrow keys to open dropdown if closed
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      // No stopPropagation needed here typically unless nested, but adding it for consistency if desired.
      // e.stopPropagation(); 

      if (!isOpen) {
        openDropdown();
        setHighlightedIndex(0);
        return;
      }

      // Navigate through options when dropdown is open
      if (e.key === 'ArrowDown') {
        setHighlightedIndex(prev => {
          const nextIndex = prev < filteredOptions.length - 1 ? prev + 1 : 0;
          return nextIndex;
        });
      } else if (e.key === 'ArrowUp') {
        setHighlightedIndex(prev => {
          const nextIndex = prev > 0 ? prev - 1 : filteredOptions.length - 1;
          return nextIndex;
        });
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
    // Find the selected option to get its label
    const selectedOption = options.find(opt => opt.value === optionValue);
    const displayLabel = selectedOption ? selectedOption.label : optionValue;

    // Mark that a selection was made BEFORE any state changes
    selectionMadeRef.current = true;
    isSelectingRef.current = true;
    isExternalChangeRef.current = true;

    // Update the previous value refs since a selection was made
    previousValueRef.current = optionValue;
    previousInputValRef.current = displayLabel;

    onChangeRef.current(optionValue);  // Send the value (ID) to parent form
    setInputVal(displayLabel);  // Display the label (name) in input
    setIsOpen(false);
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;

    // Blur the input so next click will trigger onFocus and clear the value
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.blur();
      }
      isSelectingRef.current = false;
    }, 50);
  };

  // Filter options based on input
  const normalizedInput = inputVal.toLowerCase();
  const filteredOptions = normalizedInput.length === 0
    ? options
    : options.filter(option => {
      const normalizedLabel = option.label.toLowerCase();
      const normalizedValue = String(option.value).toLowerCase();
      return normalizedLabel.includes(normalizedInput) || normalizedValue.includes(normalizedInput);
    });

  return (
    <div
      style={{ position: 'relative', width: '180px', overflow: 'visible' }}
      ref={autocompleteRef}
    >
      <div style={{ position: 'relative', overflow: 'visible' }}>
        <TextField
          inputRef={inputRef}
          value={inputVal}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          onFocus={() => {
            // Only clear LOV values if focus was NOT caused by Tab or Shift + Tab
            if (!isShiftTabRef.current) {
              openDropdown();
            }
          }}
          onBlur={() => {
            // Delay the validation to allow selection to complete
            setTimeout(() => {
              const activeElement = document.activeElement;
              const isFocusInDropdown = activeElement && autocompleteRef.current?.contains(activeElement);
              const isSelecting = isSelectingRef.current;

              if (isSelecting || isFocusInDropdown) {
                return;
              }

              handleCloseDropdown(false);
            }, 150);
          }}
          placeholder="Select..."
          size="small"
          error={error}
          sx={{
            width: '180px',
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
                borderRadius: '3px',
              },
              '&:hover fieldset': {
                borderColor: '#ddd',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#007bff',
                borderWidth: '1px',
              },
            },
            '& .MuiInputLabel-root': {
              display: 'none',
            },
          }}
        />
        <ChevronDown
          size={16}
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#666',
            cursor: 'pointer',
            pointerEvents: 'auto',
            zIndex: 2
          }}
          onMouseDown={(e) => {
            e.preventDefault();
          }}
          onClick={() => {
            if (!isOpen) {
              openDropdown();
            } else {
              handleCloseDropdown(false);
            }
          }}
        />
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            width: '180px',
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderTop: 'none',
            borderRadius: '0 0 4px 4px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            zIndex: 1000,
            maxHeight: '240px',
            overflowY: 'auto',
            marginTop: '4px'
          }}
          tabIndex={-1}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={`${option.value}-${index}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectOption(option.value);
                }}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  backgroundColor: index === highlightedIndex ? '#cce5ff' : (option.value === value ? '#e3f2fd' : 'white'),
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: '13px',
                  transition: 'background-color 0.2s',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#cce5ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    index === highlightedIndex ? '#cce5ff' : (option.value === value ? '#e3f2fd' : 'white');
                }}
                title={DOMPurify.sanitize(option.label, { ALLOWED_TAGS: [] })}
              >
                {DOMPurify.sanitize(option.label, { ALLOWED_TAGS: [] })}
              </div>
            ))
          ) : (
            <div
              style={{
                padding: '12px',
                zIndex: 1000,
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

// Process Stream Autocomplete Component
export const ProcessStreamAutocomplete = ({
  value,
  onChange,
  options = [],
  error = false,
  width = '180px'
}) => {
  // Initialize with the label if value matches an option, otherwise use the value
  const getInitialValue = () => {
    if (!value) return '';
    const matchingOption = options.find(opt => opt.value === value);
    return matchingOption ? matchingOption.label : (value || '');
  };

  const [isOpen, setIsOpen] = useState(false);
  const [inputVal, setInputVal] = useState(getInitialValue());
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const autocompleteRef = useRef(null);
  const inputRef = useRef(null);

  const isExternalChangeRef = useRef(false);
  const isUserEditingRef = useRef(false);
  const isSelectingRef = useRef(false);
  const isShiftTabRef = useRef(false);
  const isTabRef = useRef(false);

  // Store the value before opening dropdown to restore if closed without selection
  const previousValueRef = useRef(value);
  const previousInputValRef = useRef(inputVal);
  // Track if dropdown is open for this specific instance
  const isOpenRef = useRef(false);
  // Store latest onChange in ref to avoid stale closures
  const onChangeRef = useRef(onChange);
  // Track if a selection was just made to prevent restore
  const selectionMadeRef = useRef(false);

  // Keep onChangeRef updated
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Keep isOpenRef in sync with isOpen state
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    // Only update inputVal when prop value changes AND user is not actively editing
    if (!isUserEditingRef.current && !isExternalChangeRef.current) {
      // Find the option that matches the value and display its label
      const matchingOption = options.find(opt => opt.value === value);
      setInputVal(matchingOption ? matchingOption.label : (value || ''));
    }

    if (isExternalChangeRef.current) {
      isExternalChangeRef.current = false;
    }
  }, [value, options]);

  // Handle closing dropdown - restore previous value if no selection was made
  const handleCloseDropdown = (wasSelectionMade = false) => {
    // Only process if this dropdown is actually open
    if (!isOpenRef.current) {
      return;
    }

    // If a selection was just made, don't restore
    if (selectionMadeRef.current) {
      selectionMadeRef.current = false;
      setIsOpen(false);
      setHighlightedIndex(-1);
      isUserEditingRef.current = false;
      return;
    }

    if (!wasSelectionMade && previousValueRef.current !== undefined) {
      // Restore the previous value only if it's different from the current prop value
      if (value !== previousValueRef.current) {
        onChangeRef.current(previousValueRef.current);
      }
      setInputVal(previousInputValRef.current);
    }
    setIsOpen(false);
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Only handle if this dropdown is open AND click is outside this component
      if (isOpenRef.current && autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        handleCloseDropdown(false);
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

  // Function to open dropdown and store current value
  const openDropdown = () => {
    // Store current value before opening
    previousValueRef.current = value;
    const matchingOption = options.find(opt => opt.value === value);
    previousInputValRef.current = matchingOption ? matchingOption.label : (value || '');
    selectionMadeRef.current = false;

    // Clear input to show all options, but don't clear the actual value yet
    setInputVal('');
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    // Automatically capitalize the first character
    const capitalizedVal = val.charAt(0).toUpperCase() + val.slice(1);
    setInputVal(capitalizedVal);
    setIsOpen(true); // Keep dropdown open when typing
    setHighlightedIndex(-1); // Reset highlight when typing
    isUserEditingRef.current = true;

    // Check if the capitalized value matches a valid LOV option
    const matchingOption = options.find(opt =>
      opt.label.toLowerCase() === capitalizedVal.toLowerCase() ||
      opt.value === capitalizedVal
    );

    if (matchingOption) {
      // If it's a valid LOV option, notify parent with the value
      onChangeRef.current(matchingOption.value);
    } else if (capitalizedVal === '' || capitalizedVal.trim() === '') {
      // If user is clearing a valid LOV selection, notify parent
      onChangeRef.current('');
    }
  };

  const handleKeyDown = (e) => {
    // Handle arrow keys to open dropdown if closed
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      // No stopPropagation needed here typically unless nested, but adding it for consistency if desired.
      // e.stopPropagation(); 

      if (!isOpen) {
        openDropdown();
        setHighlightedIndex(0);
        return;
      }

      // Navigate through options when dropdown is open
      if (e.key === 'ArrowDown') {
        setHighlightedIndex(prev => {
          const nextIndex = prev < filteredOptions.length - 1 ? prev + 1 : 0;
          return nextIndex;
        });
      } else if (e.key === 'ArrowUp') {
        setHighlightedIndex(prev => {
          const nextIndex = prev > 0 ? prev - 1 : filteredOptions.length - 1;
          return nextIndex;
        });
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
    // Find the selected option to get its label
    const selectedOption = options.find(opt => opt.value === optionValue);
    const displayLabel = selectedOption ? selectedOption.label : optionValue;

    // Mark that a selection was made BEFORE any state changes
    selectionMadeRef.current = true;
    isSelectingRef.current = true;
    isExternalChangeRef.current = true;

    // Update the previous value refs since a selection was made
    previousValueRef.current = optionValue;
    previousInputValRef.current = displayLabel;

    onChangeRef.current(optionValue);  // Send the value (ID) to parent form
    setInputVal(displayLabel);  // Display the label (name) in input
    setIsOpen(false);
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;

    // Blur the input so next click will trigger onFocus and clear the value
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.blur();
      }
      isSelectingRef.current = false;
    }, 50);
  };

  // Filter options based on input
  const normalizedInput = inputVal.toLowerCase();
  const filteredOptions = normalizedInput.length === 0
    ? options
    : options.filter(option => {
      const normalizedLabel = option.label.toLowerCase();
      const normalizedValue = String(option.value).toLowerCase();
      return normalizedLabel.includes(normalizedInput) || normalizedValue.includes(normalizedInput);
    });

  return (
    <div
      style={{ position: 'relative', width: width, overflow: 'visible' }}
      ref={autocompleteRef}
    >
      <div style={{ position: 'relative', overflow: 'visible' }}>
        <TextField
          inputRef={inputRef}
          value={inputVal}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          onFocus={() => {
            // Only clear LOV values if focus was NOT caused by Tab or Shift + Tab
            if (!isShiftTabRef.current) {
              openDropdown();
            }
          }}
          onBlur={() => {
            // Delay the validation to allow selection to complete
            setTimeout(() => {
              const activeElement = document.activeElement;
              const isFocusInDropdown = activeElement && autocompleteRef.current?.contains(activeElement);
              const isSelecting = isSelectingRef.current;

              if (isSelecting || isFocusInDropdown) {
                return;
              }

              handleCloseDropdown(false);
            }, 150);
          }}
          placeholder="Select..."
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
                borderRadius: '3px',
              },
              '&:hover fieldset': {
                borderColor: '#ddd',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#007bff',
                borderWidth: '1px',
              },
            },
            '& .MuiInputLabel-root': {
              display: 'none',
            },
          }}
        />
        <ChevronDown
          size={16}
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#666',
            cursor: 'pointer',
            pointerEvents: 'auto',
            zIndex: 2
          }}
          onMouseDown={(e) => {
            e.preventDefault();
          }}
          onClick={() => {
            if (!isOpen) {
              openDropdown();
            } else {
              handleCloseDropdown(false);
            }
          }}
        />
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            width: width,
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderTop: 'none',
            borderRadius: '0 0 4px 4px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            zIndex: 1000,
            maxHeight: '240px',
            overflowY: 'auto',
            marginTop: '4px'
          }}
          tabIndex={-1}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={`${option.value}-${index}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectOption(option.value);
                }}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  backgroundColor: index === highlightedIndex ? '#cce5ff' : (option.value === value ? '#e3f2fd' : 'white'),
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: '13px',
                  transition: 'background-color 0.2s',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#cce5ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    index === highlightedIndex ? '#cce5ff' : (option.value === value ? '#e3f2fd' : 'white');
                }}
                title={DOMPurify.sanitize(option.label, { ALLOWED_TAGS: [] })}
              >
                {DOMPurify.sanitize(option.label, { ALLOWED_TAGS: [] })}
              </div>
            ))
          ) : (
            <div
              style={{
                padding: '12px',
                zIndex: 1000,
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

// L0 Process Autocomplete Component
export const L0ProcessAutocomplete = ({
  value,
  onChange,
  options = [],
  error = false
}) => {
  // Initialize with the label if value matches an option, otherwise use the value
  const getInitialValue = () => {
    if (!value) return '';
    const matchingOption = options.find(opt => opt.value === value);
    return matchingOption ? matchingOption.label : (value || '');
  };

  const [isOpen, setIsOpen] = useState(false);
  const [inputVal, setInputVal] = useState(getInitialValue());
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const autocompleteRef = useRef(null);
  const inputRef = useRef(null);

  const isExternalChangeRef = useRef(false);
  const isUserEditingRef = useRef(false);
  const isSelectingRef = useRef(false);
  const isShiftTabRef = useRef(false);
  const isTabRef = useRef(false);

  // Store the value before opening dropdown to restore if closed without selection
  const previousValueRef = useRef(value);
  const previousInputValRef = useRef(inputVal);
  // Track if dropdown is open for this specific instance
  const isOpenRef = useRef(false);
  // Store latest onChange in ref to avoid stale closures
  const onChangeRef = useRef(onChange);
  // Track if a selection was just made to prevent restore
  const selectionMadeRef = useRef(false);

  // Keep onChangeRef updated
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Keep isOpenRef in sync with isOpen state
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    // Only update inputVal when prop value changes AND user is not actively editing
    if (!isUserEditingRef.current && !isExternalChangeRef.current) {
      // Find the option that matches the value and display its label
      const matchingOption = options.find(opt => opt.value === value);
      setInputVal(matchingOption ? matchingOption.label : (value || ''));
    }

    if (isExternalChangeRef.current) {
      isExternalChangeRef.current = false;
    }
  }, [value, options]);

  // Handle closing dropdown - restore previous value if no selection was made
  const handleCloseDropdown = (wasSelectionMade = false) => {
    // Only process if this dropdown is actually open
    if (!isOpenRef.current) {
      return;
    }

    // If a selection was just made, don't restore
    if (selectionMadeRef.current) {
      selectionMadeRef.current = false;
      setIsOpen(false);
      setHighlightedIndex(-1);
      isUserEditingRef.current = false;
      return;
    }

    if (!wasSelectionMade && previousValueRef.current !== undefined) {
      // Restore the previous value only if it's different from the current prop value
      if (value !== previousValueRef.current) {
        onChangeRef.current(previousValueRef.current);
      }
      setInputVal(previousInputValRef.current);
    }
    setIsOpen(false);
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Only handle if this dropdown is open AND click is outside this component
      if (isOpenRef.current && autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        handleCloseDropdown(false);
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

  // Function to open dropdown and store current value
  const openDropdown = () => {
    // Store current value before opening
    previousValueRef.current = value;
    const matchingOption = options.find(opt => opt.value === value);
    previousInputValRef.current = matchingOption ? matchingOption.label : (value || '');
    selectionMadeRef.current = false;

    // Clear input to show all options, but don't clear the actual value yet
    setInputVal('');
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    // Automatically capitalize the first character
    const capitalizedVal = val.charAt(0).toUpperCase() + val.slice(1);
    setInputVal(capitalizedVal);
    setIsOpen(true); // Keep dropdown open when typing
    setHighlightedIndex(-1); // Reset highlight when typing
    isUserEditingRef.current = true;

    // Check if the capitalized value matches a valid LOV option
    const matchingOption = options.find(opt =>
      opt.label.toLowerCase() === capitalizedVal.toLowerCase() ||
      opt.value === capitalizedVal
    );

    if (matchingOption) {
      // If it's a valid LOV option, notify parent with the value
      onChangeRef.current(matchingOption.value);
    } else if (capitalizedVal === '' || capitalizedVal.trim() === '') {
      // If user is clearing a valid LOV selection, notify parent
      onChangeRef.current('');
    }
  };

  const handleKeyDown = (e) => {
    // Handle arrow keys to open dropdown if closed
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      // No stopPropagation needed here typically unless nested, but adding it for consistency if desired.
      // e.stopPropagation(); 

      if (!isOpen) {
        openDropdown();
        setHighlightedIndex(0);
        return;
      }

      // Navigate through options when dropdown is open
      if (e.key === 'ArrowDown') {
        setHighlightedIndex(prev => {
          const nextIndex = prev < filteredOptions.length - 1 ? prev + 1 : 0;
          return nextIndex;
        });
      } else if (e.key === 'ArrowUp') {
        setHighlightedIndex(prev => {
          const nextIndex = prev > 0 ? prev - 1 : filteredOptions.length - 1;
          return nextIndex;
        });
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
    // Find the selected option to get its label
    const selectedOption = options.find(opt => opt.value === optionValue);
    const displayLabel = selectedOption ? selectedOption.label : optionValue;

    // Mark that a selection was made BEFORE any state changes
    selectionMadeRef.current = true;
    isSelectingRef.current = true;
    isExternalChangeRef.current = true;

    // Update the previous value refs since a selection was made
    previousValueRef.current = optionValue;
    previousInputValRef.current = displayLabel;

    onChangeRef.current(optionValue);  // Send the value (ID) to parent form
    setInputVal(displayLabel);  // Display the label (name) in input
    setIsOpen(false);
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;

    // Blur the input so next click will trigger onFocus and clear the value
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.blur();
      }
      isSelectingRef.current = false;
    }, 50);
  };

  // Filter options based on input
  const normalizedInput = inputVal.toLowerCase();
  const filteredOptions = normalizedInput.length === 0
    ? options
    : options.filter(option => {
      const normalizedLabel = option.label.toLowerCase();
      const normalizedValue = String(option.value).toLowerCase();
      return normalizedLabel.includes(normalizedInput) || normalizedValue.includes(normalizedInput);
    });

  return (
    <div
      style={{ position: 'relative', width: '180px', overflow: 'visible', marginRight: '10px' }}
      ref={autocompleteRef}
    >
      <div style={{ position: 'relative', overflow: 'visible' }}>
        <TextField
          inputRef={inputRef}
          value={inputVal}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          onFocus={() => {
            // Only clear LOV values if focus was NOT caused by Tab or Shift + Tab
            if (!isShiftTabRef.current) {
              openDropdown();
            }
          }}
          onBlur={() => {
            // Delay the validation to allow selection to complete
            setTimeout(() => {
              const activeElement = document.activeElement;
              const isFocusInDropdown = activeElement && autocompleteRef.current?.contains(activeElement);
              const isSelecting = isSelectingRef.current;

              if (isSelecting || isFocusInDropdown) {
                return;
              }

              handleCloseDropdown(false);
            }, 150);
          }}
          placeholder="Select..."
          size="small"
          error={error}
          sx={{
            width: '180px',
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
                borderRadius: '3px',
              },
              '&:hover fieldset': {
                borderColor: '#ddd',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#007bff',
                borderWidth: '1px',
              },
            },
            '& .MuiInputLabel-root': {
              display: 'none',
            },
          }}
        />
        <ChevronDown
          size={16}
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#666',
            cursor: 'pointer',
            pointerEvents: 'auto',
            zIndex: 2
          }}
          onMouseDown={(e) => {
            e.preventDefault();
          }}
          onClick={() => {
            if (!isOpen) {
              openDropdown();
            } else {
              handleCloseDropdown(false);
            }
          }}
        />
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            width: '180px',
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderTop: 'none',
            borderRadius: '0 0 4px 4px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            zIndex: 1000,
            maxHeight: '240px',
            overflowY: 'auto',
            marginTop: '4px'
          }}
          tabIndex={-1}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={`${option.value}-${index}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectOption(option.value);
                }}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  backgroundColor: index === highlightedIndex ? '#cce5ff' : (option.value === value ? '#e3f2fd' : 'white'),
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: '13px',
                  transition: 'background-color 0.2s',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#cce5ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    index === highlightedIndex ? '#cce5ff' : (option.value === value ? '#e3f2fd' : 'white');
                }}
                title={DOMPurify.sanitize(option.label, { ALLOWED_TAGS: [] })}
              >
                {DOMPurify.sanitize(option.label, { ALLOWED_TAGS: [] })}
              </div>
            ))
          ) : (
            <div
              style={{
                padding: '12px',
                zIndex: 1000,
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

// Module Autocomplete Component
export const ModuleAutocomplete = ({
  value,
  onChange,
  options = [],
  error = false
}) => {
  // Initialize with the label if value matches an option, otherwise use the value
  const getInitialValue = () => {
    if (!value) return '';
    const matchingOption = options.find(opt => opt.value === value);
    return matchingOption ? matchingOption.label : (value || '');
  };

  const [isOpen, setIsOpen] = useState(false);
  const [inputVal, setInputVal] = useState(getInitialValue());
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const autocompleteRef = useRef(null);
  const inputRef = useRef(null);

  const isExternalChangeRef = useRef(false);
  const isUserEditingRef = useRef(false);
  const isSelectingRef = useRef(false);
  const isShiftTabRef = useRef(false);
  const isTabRef = useRef(false);

  // Store the value before opening dropdown to restore if closed without selection
  const previousValueRef = useRef(value);
  const previousInputValRef = useRef(inputVal);
  // Track if dropdown is open for this specific instance
  const isOpenRef = useRef(false);
  // Store latest onChange in ref to avoid stale closures
  const onChangeRef = useRef(onChange);
  // Track if a selection was just made to prevent restore
  const selectionMadeRef = useRef(false);

  // Keep onChangeRef updated
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Keep isOpenRef in sync with isOpen state
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    // Only update inputVal when prop value changes AND user is not actively editing
    if (!isUserEditingRef.current && !isExternalChangeRef.current) {
      // Find the option that matches the value and display its label
      const matchingOption = options.find(opt => opt.value === value);
      setInputVal(matchingOption ? matchingOption.label : (value || ''));
    }

    if (isExternalChangeRef.current) {
      isExternalChangeRef.current = false;
    }
  }, [value, options]);

  // Handle closing dropdown - restore previous value if no selection was made
  const handleCloseDropdown = (wasSelectionMade = false) => {
    // Only process if this dropdown is actually open
    if (!isOpenRef.current) {
      return;
    }

    // If a selection was just made, don't restore
    if (selectionMadeRef.current) {
      selectionMadeRef.current = false;
      setIsOpen(false);
      setHighlightedIndex(-1);
      isUserEditingRef.current = false;
      return;
    }

    if (!wasSelectionMade && previousValueRef.current !== undefined) {
      // Restore the previous value only if it's different from the current prop value
      if (value !== previousValueRef.current) {
        onChangeRef.current(previousValueRef.current);
      }
      setInputVal(previousInputValRef.current);
    }
    setIsOpen(false);
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Only handle if this dropdown is open AND click is outside this component
      if (isOpenRef.current && autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        handleCloseDropdown(false);
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

  // Function to open dropdown and store current value
  const openDropdown = () => {
    // Store current value before opening
    previousValueRef.current = value;
    const matchingOption = options.find(opt => opt.value === value);
    previousInputValRef.current = matchingOption ? matchingOption.label : (value || '');
    selectionMadeRef.current = false;

    // Clear input to show all options, but don't clear the actual value yet
    setInputVal('');
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    // Automatically capitalize the first character
    const capitalizedVal = val.charAt(0).toUpperCase() + val.slice(1);
    setInputVal(capitalizedVal);
    setIsOpen(true); // Keep dropdown open when typing
    setHighlightedIndex(-1); // Reset highlight when typing
    isUserEditingRef.current = true;

    // Check if the capitalized value matches a valid LOV option
    const matchingOption = options.find(opt =>
      opt.label.toLowerCase() === capitalizedVal.toLowerCase() ||
      opt.value === capitalizedVal
    );

    if (matchingOption) {
      // If it's a valid LOV option, notify parent with the value
      onChangeRef.current(matchingOption.value);
    } else if (capitalizedVal === '' || capitalizedVal.trim() === '') {
      // If user is clearing a valid LOV selection, notify parent
      onChangeRef.current('');
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
        handleCloseDropdown(false);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCloseDropdown(false);
    }
  };

  const handleSelectOption = (optionValue) => {
    // Find the selected option to get its label
    const selectedOption = options.find(opt => opt.value === optionValue);
    const displayLabel = selectedOption ? selectedOption.label : optionValue;

    // Mark that a selection was made BEFORE any state changes
    selectionMadeRef.current = true;
    isSelectingRef.current = true;
    isExternalChangeRef.current = true;

    // Update the previous value refs since a selection was made
    previousValueRef.current = optionValue;
    previousInputValRef.current = displayLabel;

    onChangeRef.current(optionValue);  // Send the value (ID) to parent form
    setInputVal(displayLabel);  // Display the label (name) in input
    setIsOpen(false);
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;

    // Blur the input so next click will trigger onFocus and clear the value
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.blur();
      }
      isSelectingRef.current = false;
    }, 50);
  };

  // Filter options based on input
  const normalizedInput = inputVal.toLowerCase();
  const filteredOptions = normalizedInput.length === 0
    ? options
    : options.filter(option => {
      const normalizedLabel = option.label.toLowerCase();
      const normalizedValue = String(option.value).toLowerCase();
      return normalizedLabel.includes(normalizedInput) || normalizedValue.includes(normalizedInput);
    });

  return (
    <div
      style={{ position: 'relative', width: '150px', overflow: 'visible' }}
      ref={autocompleteRef}
    >
      <div style={{ position: 'relative', overflow: 'visible' }}>
        <TextField
          inputRef={inputRef}
          value={inputVal}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          onFocus={() => {
            // Only clear LOV values if focus was NOT caused by Tab or Shift + Tab
            if (!isShiftTabRef.current && !isTabRef.current) {
              openDropdown();
            }
          }}
          onBlur={() => {
            // Delay the validation to allow selection to complete
            setTimeout(() => {
              const activeElement = document.activeElement;
              const isFocusInDropdown = activeElement && autocompleteRef.current?.contains(activeElement);
              const isSelecting = isSelectingRef.current;

              if (isSelecting || isFocusInDropdown) {
                return;
              }

              handleCloseDropdown(false);
            }, 150);
          }}
          placeholder="Select..."
          size="small"
          error={error}
          sx={{
            width: '150px',
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
                borderRadius: '3px',
              },
              '&:hover fieldset': {
                borderColor: '#ddd',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#007bff',
                borderWidth: '1px',
              },
            },
            '& .MuiInputLabel-root': {
              display: 'none',
            },
          }}
        />
        <ChevronDown
          size={16}
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#666',
            cursor: 'pointer',
            pointerEvents: 'auto',
            zIndex: 2
          }}
          onClick={() => {
            if (!isOpen) {
              openDropdown();
            } else {
              handleCloseDropdown(false);
            }
          }}
        />
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            width: '180px',
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderTop: 'none',
            borderRadius: '0 0 4px 4px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            zIndex: 1000,
            maxHeight: '240px',
            overflowY: 'auto',
            marginTop: '4px'
          }}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={`${option.value}-${index}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectOption(option.value);
                }}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  backgroundColor: index === highlightedIndex ? '#cce5ff' : (option.value === value ? '#e3f2fd' : 'white'),
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: '13px',
                  transition: 'background-color 0.2s',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#cce5ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    index === highlightedIndex ? '#cce5ff' : (option.value === value ? '#e3f2fd' : 'white');
                }}
                title={DOMPurify.sanitize(option.label, { ALLOWED_TAGS: [] })}
              >
                {DOMPurify.sanitize(option.label, { ALLOWED_TAGS: [] })}
              </div>
            ))
          ) : (
            <div
              style={{
                padding: '12px',
                zIndex: 1000,
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

// Module Multi-Select Autocomplete Component
export const ModuleMultiSelectAutocomplete = ({
  value = '',
  onChange,
  options,
  error = false
}) => {
  // Parse the comma-separated value into an array of selected values
  const selectedValues = value ? value.split(',').map(v => v.trim()).filter(v => v) : [];

  const [isOpen, setIsOpen] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const autocompleteRef = useRef(null);
  const isExternalChangeRef = useRef(false);
  const isUserEditingRef = useRef(false);
  const isShiftTabRef = useRef(false);
  const isTabRef = useRef(false);
  const isSelectingRef = useRef(false);

  useEffect(() => {
    // Only update when prop value changes AND user is not actively editing
    if (!isUserEditingRef.current && !isExternalChangeRef.current) {
      // Keep input empty for typing/searching
      setInputVal('');
    }
  }, [value, options]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleGlobalKeyDown = (event) => {
      if (event.key === 'Tab' && event.shiftKey) {
        // Shift + Tab was pressed - set flag for backward navigation
        isShiftTabRef.current = true;
        // Reset the flag after a short delay
        setTimeout(() => {
          isShiftTabRef.current = false;
        }, 100);
      } else if (event.key === 'Tab' && !event.shiftKey) {
        // Tab was pressed - set flag for forward navigation
        isTabRef.current = true;
        // Reset the flag after a short delay
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
    // Automatically capitalize the first character
    const capitalizedVal = val.charAt(0).toUpperCase() + val.slice(1);
    setInputVal(capitalizedVal);
    setIsOpen(true); // Keep dropdown open when typing
    setHighlightedIndex(-1); // Reset highlight when typing
    isUserEditingRef.current = true;
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
        toggleSelection(filteredOptions[highlightedIndex].value);
      } else {
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const toggleSelection = (optionValue) => {
    const newSelectedValues = selectedValues.includes(optionValue)
      ? selectedValues.filter(v => v !== optionValue)
      : [...selectedValues, optionValue];

    // Convert back to comma-separated string
    const newValue = newSelectedValues.join(',');

    isSelectingRef.current = true;
    isExternalChangeRef.current = true;
    onChange(newValue);
    setInputVal('');
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;

    // Reset selection flag after a short delay
    setTimeout(() => {
      isSelectingRef.current = false;
    }, 200);
  };

  const removeSelection = (optionValue) => {
    const newSelectedValues = selectedValues.filter(v => v !== optionValue);
    const newValue = newSelectedValues.join(',');

    isExternalChangeRef.current = true;
    onChange(newValue);
  };

  // Get selected option labels for display
  const selectedLabels = selectedValues.map(val => {
    const option = options.find(opt => opt.value === val);
    return option ? option.label : val;
  }).filter(label => label);

  // Filter options based on input - use startsWith for filtering
  const normalizedInput = inputVal.toLowerCase().replace(/^\+/, '');
  const filteredOptions = normalizedInput.length === 0
    ? options.filter(option => !selectedValues.includes(option.label))
    : options.filter(option => {
      const normalizedLabel = option.label.toLowerCase().replace(/^\+/, '');
      return normalizedLabel.startsWith(normalizedInput) && !selectedValues.includes(option.label);
    });

  return (
    <div
      style={{ position: 'relative', width: '300px', overflow: 'visible' }}
      ref={autocompleteRef}
    >
      <div style={{ position: 'relative', overflow: 'visible' }}>
        <div
          style={{
            minHeight: '40px',
            border: `1px solid ${error ? '#dc2626' : '#ddd'}`,
            borderRadius: '3px',
            backgroundColor: 'white',
            padding: '4px 30px 4px 10px',
            cursor: 'text',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '4px',
            fontSize: '13px',
            fontFamily: 'inherit',
          }}
          onClick={() => setIsOpen(true)}
        >
          {/* Display selected items as chips */}
          {selectedLabels.map((label, index) => {
            const value = selectedValues[index];
            return (
              <span
                key={value}
                style={{
                  backgroundColor: '#dee2e6',
                  color: 'black',
                  padding: '2px 6px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {label}
                <span
                  style={{
                    cursor: 'pointer',
                    fontSize: '14px',
                    lineHeight: '1',
                    marginLeft: '2px'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSelection(value);
                  }}
                >
                  ×
                </span>
              </span>
            );
          })}

          {/* Input for typing */}
          <input
            value={inputVal}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              // Only clear input values if focus was NOT caused by Tab or Shift + Tab
              if (inputVal && !isShiftTabRef.current && !isTabRef.current) {
                setInputVal('');
              }
              setIsOpen(true);
            }}
            onBlur={() => {
              // Close the dropdown when leaving the field
              setTimeout(() => {
                // Don't close if user is clicking on options
                if (isSelectingRef.current) {
                  return;
                }
                setIsOpen(false);
                isUserEditingRef.current = false;
              }, 150);
            }}
            placeholder={selectedValues.length === 0 ? "Select modules..." : ""}
            style={{
              border: 'none',
              outline: 'none',
              flex: 1,
              minWidth: '100px',
              fontSize: '13px',
              fontFamily: 'inherit',
              backgroundColor: 'transparent'
            }}
            autoComplete="off"
          />
        </div>

        <ChevronDown
          size={16}
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#666',
            cursor: 'pointer',
            pointerEvents: 'auto',
            zIndex: 2
          }}
          onClick={() => setIsOpen(!isOpen)}
        />
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            width: '320px',
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderTop: 'none',
            borderRadius: '0 0 4px 4px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            zIndex: 1000,
            maxHeight: '240px',
            overflowY: 'auto',
            marginTop: '4px'
          }}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => {
              const isSelected = selectedValues.includes(option.value);
              return (
                <div
                  key={`${option.value}-${index}`}
                  onClick={() => toggleSelection(option.value)}
                  style={{
                    padding: '10px 12px',
                    cursor: 'pointer',
                    backgroundColor: index === highlightedIndex ? '#cce5ff' : (isSelected ? '#e8f5e8' : 'white'),
                    borderBottom: '1px solid #f0f0f0',
                    fontSize: '13px',
                    transition: 'background-color 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#cce5ff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = index === highlightedIndex ? '#cce5ff' : (isSelected ? '#e8f5e8' : 'white');
                  }}
                  title={DOMPurify.sanitize(option.label, { ALLOWED_TAGS: [] })}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => { }} // Handled by onClick
                    style={{ margin: 0 }}
                  />
                  {DOMPurify.sanitize(option.label, { ALLOWED_TAGS: [] })}
                </div>
              );
            })
          ) : (
            <div
              style={{
                padding: '12px',
                zIndex: 1000,
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

// Work Arrangement Autocomplete Component
export const WorkArrangementAutocomplete = ({
  value,
  onChange,
  options = [],
  error = false
}) => {
  // Initialize with the label if value matches an option, otherwise use the value
  const getInitialValue = () => {
    if (!value) return '';
    const matchingOption = options.find(opt => opt.value === value);
    return matchingOption ? matchingOption.label : (value || '');
  };

  const [isOpen, setIsOpen] = useState(false);
  const [inputVal, setInputVal] = useState(getInitialValue());
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const autocompleteRef = useRef(null);
  const inputRef = useRef(null);

  const isExternalChangeRef = useRef(false);
  const isUserEditingRef = useRef(false);
  const isSelectingRef = useRef(false);
  const isShiftTabRef = useRef(false);
  const isTabRef = useRef(false);

  // Store the value before opening dropdown to restore if closed without selection
  const previousValueRef = useRef(value);
  const previousInputValRef = useRef(inputVal);
  // Track if dropdown is open for this specific instance
  const isOpenRef = useRef(false);
  // Store latest onChange in ref to avoid stale closures
  const onChangeRef = useRef(onChange);
  // Track if a selection was just made to prevent restore
  const selectionMadeRef = useRef(false);

  // Keep onChangeRef updated
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Keep isOpenRef in sync with isOpen state
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    // Only update inputVal when prop value changes AND user is not actively editing
    if (!isUserEditingRef.current && !isExternalChangeRef.current) {
      // Find the option that matches the value and display its label
      const matchingOption = options.find(opt => opt.value === value);
      setInputVal(matchingOption ? matchingOption.label : (value || ''));
    }

    if (isExternalChangeRef.current) {
      isExternalChangeRef.current = false;
    }
  }, [value, options]);

  // Handle closing dropdown - restore previous value if no selection was made
  const handleCloseDropdown = (wasSelectionMade = false) => {
    // Only process if this dropdown is actually open
    if (!isOpenRef.current) {
      return;
    }

    // If a selection was just made, don't restore
    if (selectionMadeRef.current) {
      selectionMadeRef.current = false;
      setIsOpen(false);
      setHighlightedIndex(-1);
      isUserEditingRef.current = false;
      return;
    }

    if (!wasSelectionMade && previousValueRef.current !== undefined) {
      // Restore the previous value only if it's different from the current prop value
      if (value !== previousValueRef.current) {
        onChangeRef.current(previousValueRef.current);
      }
      setInputVal(previousInputValRef.current);
    }
    setIsOpen(false);
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Only handle if this dropdown is open AND click is outside this component
      if (isOpenRef.current && autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        handleCloseDropdown(false);
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

  // Function to open dropdown and store current value
  const openDropdown = () => {
    // Store current value before opening
    previousValueRef.current = value;
    const matchingOption = options.find(opt => opt.value === value);
    previousInputValRef.current = matchingOption ? matchingOption.label : (value || '');
    selectionMadeRef.current = false;

    // Clear input to show all options, but don't clear the actual value yet
    setInputVal('');
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    // Automatically capitalize the first character
    const capitalizedVal = val.charAt(0).toUpperCase() + val.slice(1);
    setInputVal(capitalizedVal);
    setIsOpen(true); // Keep dropdown open when typing
    setHighlightedIndex(-1); // Reset highlight when typing
    isUserEditingRef.current = true;

    // Check if the capitalized value matches a valid LOV option
    const matchingOption = options.find(opt =>
      opt.label.toLowerCase() === capitalizedVal.toLowerCase() ||
      opt.value === capitalizedVal
    );

    if (matchingOption) {
      // If it's a valid LOV option, notify parent with the value
      onChangeRef.current(matchingOption.value);
    } else if (capitalizedVal === '' || capitalizedVal.trim() === '') {
      // If user is clearing a valid LOV selection, notify parent
      onChangeRef.current('');
    }
  };

  const handleKeyDown = (e) => {
    // Handle arrow keys to open dropdown if closed
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      // No stopPropagation needed here typically unless nested, but adding it for consistency if desired.
      // e.stopPropagation(); 

      if (!isOpen) {
        openDropdown();
        setHighlightedIndex(0);
        return;
      }

      // Navigate through options when dropdown is open
      if (e.key === 'ArrowDown') {
        setHighlightedIndex(prev => {
          const nextIndex = prev < filteredOptions.length - 1 ? prev + 1 : 0;
          return nextIndex;
        });
      } else if (e.key === 'ArrowUp') {
        setHighlightedIndex(prev => {
          const nextIndex = prev > 0 ? prev - 1 : filteredOptions.length - 1;
          return nextIndex;
        });
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
    // Find the selected option to get its label
    const selectedOption = options.find(opt => opt.value === optionValue);
    const displayLabel = selectedOption ? selectedOption.label : optionValue;

    // Mark that a selection was made BEFORE any state changes
    selectionMadeRef.current = true;
    isSelectingRef.current = true;
    isExternalChangeRef.current = true;

    // Update the previous value refs since a selection was made
    previousValueRef.current = optionValue;
    previousInputValRef.current = displayLabel;

    onChangeRef.current(optionValue);  // Send the value (ID) to parent form
    setInputVal(displayLabel);  // Display the label (name) in input
    setIsOpen(false);
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;

    // Blur the input so next click will trigger onFocus and clear the value
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.blur();
      }
      isSelectingRef.current = false;
    }, 50);
  };

  // Filter options based on input
  const normalizedInput = inputVal.toLowerCase();
  const filteredOptions = normalizedInput.length === 0
    ? options
    : options.filter(option => {
      const normalizedLabel = option.label.toLowerCase();
      const normalizedValue = String(option.value).toLowerCase();
      return normalizedLabel.includes(normalizedInput) || normalizedValue.includes(normalizedInput);
    });

  return (
    <div
      style={{ position: 'relative', width: '180px', overflow: 'visible' }}
      ref={autocompleteRef}
    >
      <div style={{ position: 'relative', overflow: 'visible' }}>
        <TextField
          inputRef={inputRef}
          value={inputVal}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          onFocus={() => {
            // Only clear LOV values if focus was NOT caused by Tab or Shift + Tab
            if (!isShiftTabRef.current) {
              openDropdown();
            }
          }}
          onBlur={() => {
            // Delay the validation to allow selection to complete
            setTimeout(() => {
              const activeElement = document.activeElement;
              const isFocusInDropdown = activeElement && autocompleteRef.current?.contains(activeElement);
              const isSelecting = isSelectingRef.current;

              if (isSelecting || isFocusInDropdown) {
                return;
              }

              handleCloseDropdown(false);
            }, 150);
          }}
          placeholder="Select..."
          size="small"
          error={error}
          sx={{
            width: '180px',
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
                borderRadius: '3px',
              },
              '&:hover fieldset': {
                borderColor: '#ddd',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#007bff',
                borderWidth: '1px',
              },
            },
            '& .MuiInputLabel-root': {
              display: 'none',
            },
          }}
        />
        <ChevronDown
          size={16}
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#666',
            cursor: 'pointer',
            pointerEvents: 'auto',
            zIndex: 2
          }}
          onMouseDown={(e) => {
            e.preventDefault();
          }}
          onClick={() => {
            if (!isOpen) {
              openDropdown();
            } else {
              handleCloseDropdown(false);
            }
          }}
        />
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            width: '180px',
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderTop: 'none',
            borderRadius: '0 0 4px 4px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            zIndex: 1000,
            maxHeight: '240px',
            overflowY: 'auto',
            marginTop: '4px'
          }}
          tabIndex={-1}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={`${option.value}-${index}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectOption(option.value);
                }}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  backgroundColor: index === highlightedIndex ? '#cce5ff' : (option.value === value ? '#e3f2fd' : 'white'),
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: '13px',
                  transition: 'background-color 0.2s',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#cce5ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    index === highlightedIndex ? '#cce5ff' : (option.value === value ? '#e3f2fd' : 'white');
                }}
                title={DOMPurify.sanitize(option.label, { ALLOWED_TAGS: [] })}
              >
                {DOMPurify.sanitize(option.label, { ALLOWED_TAGS: [] })}
              </div>
            ))
          ) : (
            <div
              style={{
                padding: '12px',
                zIndex: 1000,
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

// Phone Code Autocomplete Component
export const PhoneCodeAutocomplete = ({
  value,
  onChange,
  options = [],
  error = false
}) => {
  // Initialize with the label if value matches an option, otherwise use the value
  const getInitialValue = () => {
    if (!value) return '';
    const matchingOption = options.find(opt => opt.value === value);
    return matchingOption ? matchingOption.label : (value || '');
  };

  const [isOpen, setIsOpen] = useState(false);
  const [inputVal, setInputVal] = useState(getInitialValue());
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const autocompleteRef = useRef(null);
  const inputRef = useRef(null);

  const isExternalChangeRef = useRef(false);
  const isUserEditingRef = useRef(false);
  const isSelectingRef = useRef(false);
  const isShiftTabRef = useRef(false);
  const isTabRef = useRef(false);

  // Store the value before opening dropdown to restore if closed without selection
  const previousValueRef = useRef(value);
  const previousInputValRef = useRef(inputVal);
  // Track if dropdown is open for this specific instance
  const isOpenRef = useRef(false);
  // Store latest onChange in ref to avoid stale closures
  const onChangeRef = useRef(onChange);
  // Track if a selection was just made to prevent restore
  const selectionMadeRef = useRef(false);

  // Keep onChangeRef updated
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Keep isOpenRef in sync with isOpen state
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    // Only update inputVal when prop value changes AND user is not actively editing
    if (!isUserEditingRef.current && !isExternalChangeRef.current) {
      // Find the option that matches the value and display its label
      const matchingOption = options.find(opt => opt.value === value);
      setInputVal(matchingOption ? matchingOption.label : (value || ''));
    }

    if (isExternalChangeRef.current) {
      isExternalChangeRef.current = false;
    }
  }, [value, options]);

  // Handle closing dropdown - restore previous value if no selection was made
  const handleCloseDropdown = (wasSelectionMade = false) => {
    // Only process if this dropdown is actually open
    if (!isOpenRef.current) {
      return;
    }

    // If a selection was just made, don't restore
    if (selectionMadeRef.current) {
      selectionMadeRef.current = false;
      setIsOpen(false);
      setHighlightedIndex(-1);
      isUserEditingRef.current = false;
      return;
    }

    // Special auto-select logic for phone codes on blur
    let finalOption = options.find(opt => opt.label === inputVal || opt.value === inputVal);
    if (!finalOption && inputVal.trim() !== '' && /^\d+$/.test(inputVal.trim())) {
      const withPlus = '+' + inputVal.trim();
      finalOption = options.find(opt => opt.value === withPlus || opt.label === withPlus);
    }

    if (finalOption) {
      // User typed a valid thing (or it was auto-fixable), select it
      handleSelectOption(finalOption.value);
      return;
    }

    if (!wasSelectionMade && previousValueRef.current !== undefined) {
      // Restore the previous value only if it's different from the current prop value
      if (value !== previousValueRef.current) {
        onChangeRef.current(previousValueRef.current);
      }
      setInputVal(previousInputValRef.current);
    }
    setIsOpen(false);
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Only handle if this dropdown is open AND click is outside this component
      if (isOpenRef.current && autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        handleCloseDropdown(false);
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

  // Function to open dropdown and store current value
  const openDropdown = () => {
    // Store current value before opening
    previousValueRef.current = value;
    const matchingOption = options.find(opt => opt.value === value);
    previousInputValRef.current = matchingOption ? matchingOption.label : (value || '');
    selectionMadeRef.current = false;

    // Clear input to show all options, but don't clear the actual value yet
    setInputVal('');
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    // Only allow numbers (0-9) and plus sign (+)
    const numericVal = val.replace(/[^0-9+]/g, '');
    setInputVal(numericVal);
    setIsOpen(true); // Keep dropdown open when typing
    setHighlightedIndex(-1); // Reset highlight when typing
    isUserEditingRef.current = true;

    // Check if the value matches a valid LOV option
    const matchingOption = options.find(opt =>
      opt.label.toLowerCase() === numericVal.toLowerCase() ||
      opt.value === numericVal
    );

    if (matchingOption) {
      // If it's a valid LOV option, notify parent with the value
      onChangeRef.current(matchingOption.value);
    } else if (numericVal === '' || numericVal.trim() === '') {
      // If user is clearing a valid LOV selection, notify parent
      onChangeRef.current('');
    }
  };

  const handleKeyDown = (e) => {
    // Handle arrow keys to open dropdown if closed
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      // No stopPropagation needed here typically unless nested, but adding it for consistency if desired.
      // e.stopPropagation(); 

      if (!isOpen) {
        openDropdown();
        setHighlightedIndex(0);
        return;
      }

      // Navigate through options when dropdown is open
      if (e.key === 'ArrowDown') {
        setHighlightedIndex(prev => {
          const nextIndex = prev < filteredOptions.length - 1 ? prev + 1 : 0;
          return nextIndex;
        });
      } else if (e.key === 'ArrowUp') {
        setHighlightedIndex(prev => {
          const nextIndex = prev > 0 ? prev - 1 : filteredOptions.length - 1;
          return nextIndex;
        });
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
    // Find the selected option to get its label
    const selectedOption = options.find(opt => opt.value === optionValue);
    const displayLabel = selectedOption ? selectedOption.label : optionValue;

    // Mark that a selection was made BEFORE any state changes
    selectionMadeRef.current = true;
    isSelectingRef.current = true;
    isExternalChangeRef.current = true;

    // Update the previous value refs since a selection was made
    previousValueRef.current = optionValue;
    previousInputValRef.current = displayLabel;

    onChangeRef.current(optionValue);  // Send the value (ID) to parent form
    setInputVal(displayLabel);  // Display the label (name) in input
    setIsOpen(false);
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;

    // Blur the input so next click will trigger onFocus and clear the value
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.blur();
      }
      isSelectingRef.current = false;
    }, 50);
  };

  // Normalize input by removing + for comparison, but only filter if input has length
  const normalizedInput = inputVal.toLowerCase().replace(/^\+/, '');
  const filteredOptions = normalizedInput.length === 0
    ? options
    : options.filter(option => {
      const normalizedLabel = option.label.toLowerCase().replace(/^\+/, '');
      return normalizedLabel.startsWith(normalizedInput);
    });

  return (
    <div
      style={{ position: 'relative', width: '90px', overflow: 'visible' }}
      ref={autocompleteRef}
    >
      <div style={{ position: 'relative', overflow: 'visible' }}>
        <TextField
          inputRef={inputRef}
          value={inputVal}
          autoComplete="off"
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            // Only clear LOV values if focus was NOT caused by Tab or Shift + Tab
            if (!isShiftTabRef.current) {
              openDropdown();
            }
          }}
          onBlur={() => {
            // Delay the validation to allow selection to complete
            setTimeout(() => {
              const activeElement = document.activeElement;
              const isFocusInDropdown = activeElement && autocompleteRef.current?.contains(activeElement);
              const isSelecting = isSelectingRef.current;

              if (isSelecting || isFocusInDropdown) {
                return;
              }

              handleCloseDropdown(false);
            }, 150);
          }}
          placeholder="Select..."
          size="small"
          error={error}
          sx={{
            width: '90px',
            '& .MuiInputBase-root': {
              backgroundColor: 'white',
              fontSize: '13px',
              fontFamily: 'inherit',
            },
            '& .MuiInputBase-input': {
              padding: '6px 25px 6px 10px',
              fontSize: '13px',
            },
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: '#ddd',
                borderRadius: '3px',
              },
              '&:hover fieldset': {
                borderColor: '#ddd',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#007bff',
                borderWidth: '1px',
              },
            },
            '& .MuiInputLabel-root': {
              display: 'none',
            },
          }}
        />
        <ChevronDown
          size={14}
          style={{
            position: 'absolute',
            right: '6px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#666',
            cursor: 'pointer',
            pointerEvents: 'auto',
            zIndex: 2
          }}
          onMouseDown={(e) => {
            e.preventDefault();
          }}
          onClick={() => {
            if (!isOpen) {
              openDropdown();
            } else {
              handleCloseDropdown(false);
            }
          }}
        />
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            width: '120px',
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderTop: 'none',
            borderRadius: '0 0 4px 4px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
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
                key={`${option.value}-${index}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectOption(option.value);
                }}
                style={{
                  padding: '8px 10px',
                  cursor: 'pointer',
                  backgroundColor: index === highlightedIndex ? '#cce5ff' : (option.value === value ? '#e3f2fd' : 'white'),
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: '13px',
                  transition: 'background-color 0.2s',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#cce5ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    index === highlightedIndex ? '#cce5ff' : (option.value === value ? '#e3f2fd' : 'white');
                }}
                title={DOMPurify.sanitize(option.label, { ALLOWED_TAGS: [] })}
              >
                {DOMPurify.sanitize(option.label, { ALLOWED_TAGS: [] })}
              </div>
            ))
          ) : (
            <div
              style={{
                padding: '10px',
                zIndex: 1000,
                fontSize: '13px',
                color: '#999',
                textAlign: 'center'
              }}
            >
              {inputVal ? 'No matching options found' : 'Start typing...'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Primary Role Autocomplete Component
// Primary Role Autocomplete Component
export const PrimaryRoleAutocomplete = ({
  value,
  onChange,
  error = false,
  projectId
}) => {
  const { handleAuthError } = useSession();
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Initialize with the value or empty string
  const getInitialValue = () => {
    if (!value) return '';
    const matchingOption = options.find(opt => opt.value === value);
    return matchingOption ? matchingOption.label : value;
  };

  const [isOpen, setIsOpen] = useState(false);
  const [inputVal, setInputVal] = useState(getInitialValue());
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const autocompleteRef = useRef(null);
  const inputRef = useRef(null);

  const isExternalChangeRef = useRef(false);
  const isUserEditingRef = useRef(false);
  const isSelectingRef = useRef(false);
  const isShiftTabRef = useRef(false);
  const isTabRef = useRef(false);

  // Store the value before opening dropdown to restore if closed without selection
  const previousValueRef = useRef(value);
  const previousInputValRef = useRef(inputVal);
  // Track if dropdown is open for this specific instance
  const isOpenRef = useRef(false);
  // Store latest onChange in ref to avoid stale closures
  const onChangeRef = useRef(onChange);
  // Track if a selection was just made to prevent restore
  const selectionMadeRef = useRef(false);

  const listRef = useRef(null);

  // Keep onChangeRef updated
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Keep isOpenRef in sync with isOpen state
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // Auto-scroll to highlighted option
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

  // Fetch primary role definitions from API
  useEffect(() => {
    const fetchPrimaryRoles = async () => {
      // Wait for projectId to be available
      if (!projectId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setLoadError(null);

        // Get ID token for authorization
        let idToken = null;
        try {
          idToken = await getIdToken();
        } catch (tokenError) {
          console.error('Failed to get ID token for primary roles:', tokenError);
          // Continue without token - API might still work or will return 401
        }

        const headers = {
          'Content-Type': 'application/json',
        };

        if (idToken) {
          headers['Authorization'] = `Bearer ${idToken}`;
        }

        const response = await fetch(`https://m4wh3q1onb.execute-api.ap-south-1.amazonaws.com/New/rice/role-definitions`, {
          headers: headers
        });

        if (response.status === 401 || response.status === 403) {
          handleAuthError('Session expired - please login again');
          return;
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.count !== undefined && Array.isArray(result.data)) {
          // Sort data by role_Title
          const sortedData = result.data.sort((a, b) => {
            const nameA = a.role_Title || '';
            const nameB = b.role_Title || '';
            return nameA.localeCompare(nameB);
          });

          // Transform API data to match our expected format
          const transformedOptions = sortedData.map(item => {
            const roleName = item.role_Title || '';
            return {
              value: roleName,
              label: DOMPurify.sanitize(roleName, { ALLOWED_TAGS: [] })
            };
          }).filter(opt => opt.value); // Filter out empty values

          setOptions(transformedOptions);

          // After options are loaded, update inputVal if user isn't editing
          if (!isUserEditingRef.current) {
            const matchingOption = transformedOptions.find(opt => opt.value === value);
            setInputVal(matchingOption ? matchingOption.label : (value || ''));
          }
        } else if (result.success && result.data) {
          // Fallback for old structure if any
          const sortedData = result.data.sort((a, b) => {
            const nameA = a.Role_Name || a.role_name || '';
            const nameB = b.Role_Name || b.role_name || '';
            return nameA.localeCompare(nameB);
          });

          const transformedOptions = sortedData.map(item => {
            const roleName = item.Role_Name || item.role_name || item.name || '';
            return {
              value: roleName,
              label: DOMPurify.sanitize(roleName, { ALLOWED_TAGS: [] })
            };
          }).filter(opt => opt.value);

          setOptions(transformedOptions);
          if (!isUserEditingRef.current) {
            const matchingOption = transformedOptions.find(opt => opt.value === value);
            setInputVal(matchingOption ? matchingOption.label : (value || ''));
          }
        } else {
          // It might return empty list if count is 0
          if (result.count === 0) {
            setOptions([]);
          } else {
            throw new Error('Invalid API response format');
          }
        }
      } catch (error) {
        console.error('Error fetching primary role definitions:', error);
        setLoadError(error.message);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPrimaryRoles();
  }, [projectId]);

  useEffect(() => {
    // Only update inputVal when prop value changes AND user is not actively editing
    if (!isUserEditingRef.current && !isExternalChangeRef.current) {
      // Find the option that matches the value and display its label
      const matchingOption = options.find(opt => opt.value === value);
      setInputVal(matchingOption ? matchingOption.label : (value || ''));
    }

    if (isExternalChangeRef.current) {
      isExternalChangeRef.current = false;
    }
  }, [value, options]);

  // Handle closing dropdown - restore previous value if no selection was made
  const handleCloseDropdown = (wasSelectionMade = false) => {
    // Only process if this dropdown is actually open
    if (!isOpenRef.current) {
      return;
    }

    // If a selection was just made, don't restore
    if (selectionMadeRef.current) {
      selectionMadeRef.current = false;
      setIsOpen(false);
      setHighlightedIndex(-1);
      isUserEditingRef.current = false;
      return;
    }

    if (!wasSelectionMade && previousValueRef.current !== undefined) {
      // Restore the previous value only if it's different from the current prop value
      if (value !== previousValueRef.current) {
        onChangeRef.current(previousValueRef.current);
      }
      setInputVal(previousInputValRef.current);
    }
    setIsOpen(false);
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Only handle if this dropdown is open AND click is outside this component
      if (isOpenRef.current && autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        handleCloseDropdown(false);
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

  // Function to open dropdown and store current value
  const openDropdown = () => {
    // Store current value before opening
    previousValueRef.current = value;
    const matchingOption = options.find(opt => opt.value === value);
    previousInputValRef.current = matchingOption ? matchingOption.label : (value || '');
    selectionMadeRef.current = false;

    // Clear input to show all options, but don't clear the actual value yet
    setInputVal('');
    setIsOpen(true);
    // Find the index of the current value to scroll to it
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
    setIsOpen(true); // Keep dropdown open when typing
    setHighlightedIndex(-1); // Reset highlight when typing
    isUserEditingRef.current = true;

    // Check if the value matches a valid LOV option
    const matchingOption = options.find(opt =>
      opt.label.toLowerCase() === val.toLowerCase() ||
      opt.value === val
    );

    if (matchingOption) {
      // If it's a valid LOV option, notify parent with the value
      onChangeRef.current(matchingOption.value);
    } else if (val === '' || val.trim() === '') {
      // If user is clearing the field, notify parent
      onChangeRef.current('');
    } else {
      // Allow free text entry - notify parent with the entered text
      onChangeRef.current(val);
    }
  };

  const handleKeyDown = (e) => {
    // Handle arrow keys to open dropdown if closed
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      // No stopPropagation needed here typically unless nested, but adding it for consistency if desired.
      // e.stopPropagation(); 

      if (!isOpen) {
        openDropdown();
        return;
      }

      // Navigate through options when dropdown is open
      if (e.key === 'ArrowDown') {
        setHighlightedIndex(prev => {
          const nextIndex = prev < filteredOptions.length - 1 ? prev + 1 : 0;
          return nextIndex;
        });
      } else if (e.key === 'ArrowUp') {
        setHighlightedIndex(prev => {
          const nextIndex = prev > 0 ? prev - 1 : filteredOptions.length - 1;
          return nextIndex;
        });
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
    // Find the selected option to get its label
    const selectedOption = options.find(opt => opt.value === optionValue);
    const displayLabel = selectedOption ? selectedOption.label : optionValue;

    // Mark that a selection was made BEFORE any state changes
    selectionMadeRef.current = true;
    isSelectingRef.current = true;
    isExternalChangeRef.current = true;

    // Update the previous value refs since a selection was made
    previousValueRef.current = optionValue;
    previousInputValRef.current = displayLabel;

    onChangeRef.current(optionValue);  // Send the value to parent form
    setInputVal(displayLabel);  // Display the label in input
    setIsOpen(false);
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;

    // Blur the input so next click will trigger onFocus and clear the value
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.blur();
      }
      isSelectingRef.current = false;
    }, 50);
  };

  // Filter options based on input
  const normalizedInput = inputVal.toLowerCase();
  const filteredOptions = normalizedInput.length === 0
    ? options
    : options.filter(option => {
      const normalizedLabel = option.label.toLowerCase();
      const normalizedValue = option.value.toLowerCase();
      return normalizedLabel.includes(normalizedInput) || normalizedValue.includes(normalizedInput);
    });

  return (
    <div
      style={{ position: 'relative', width: '260px', overflow: 'visible' }}
      ref={autocompleteRef}
    >
      <div style={{ position: 'relative', overflow: 'visible' }}>
        <TextField
          inputRef={inputRef}
          value={inputVal}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          onFocus={() => {
            // Only clear LOV values if focus was NOT caused by Tab or Shift + Tab
            if (!isShiftTabRef.current) {
              openDropdown();
            }
          }}
          onBlur={() => {
            // Delay the validation to allow selection to complete
            setTimeout(() => {
              const activeElement = document.activeElement;
              const isFocusInDropdown = activeElement && autocompleteRef.current?.contains(activeElement);
              const isSelecting = isSelectingRef.current;

              if (isSelecting || isFocusInDropdown) {
                return;
              }

              handleCloseDropdown(false);
            }, 150);
          }}
          placeholder={loading ? 'Loading...' : loadError ? 'Error loading...' : 'Select role...'}
          size="small"
          error={error}
          sx={{
            width: '260px',
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
                borderRadius: '3px',
              },
              '&:hover fieldset': {
                borderColor: '#ddd',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#007bff',
                borderWidth: '1px',
              },
            },
            '& .MuiInputLabel-root': {
              display: 'none',
            },
          }}
        />
        <ChevronDown
          size={16}
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#666',
            cursor: 'pointer',
            pointerEvents: 'auto',
            zIndex: 2
          }}
          onMouseDown={(e) => {
            e.preventDefault();
          }}
          onClick={() => {
            if (!isOpen) {
              openDropdown();
            } else {
              handleCloseDropdown(false);
            }
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
            width: '260px',
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderTop: 'none',
            borderRadius: '0 0 4px 4px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            zIndex: 1000,
            maxHeight: '240px',
            overflowY: 'auto',
            marginTop: '4px'
          }}
          tabIndex={-1}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={`${option.value}-${index}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectOption(option.value);
                }}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  backgroundColor: index === highlightedIndex ? '#cce5ff' : (option.value === value ? '#e3f2fd' : 'white'),
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: '13px',
                  transition: 'background-color 0.2s',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                onMouseEnter={() => {
                  setHighlightedIndex(index);
                }}
                title={DOMPurify.sanitize(option.label, { ALLOWED_TAGS: [] })}
              >
                {DOMPurify.sanitize(option.label, { ALLOWED_TAGS: [] })}
              </div>
            ))
          ) : (
            <div
              style={{
                padding: '12px',
                zIndex: 1000,
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

// Service Line Autocomplete Component
export const ServiceLineAutocomplete = ({
  value,
  onChange,
  options = [],
  error = false
}) => {
  // Initialize with the label if value matches an option, otherwise use the value
  const getInitialValue = () => {
    if (!value) return '';
    const matchingOption = options.find(opt => opt.value === value);
    return matchingOption ? matchingOption.label : value;
  };

  const [isOpen, setIsOpen] = useState(false);
  const [inputVal, setInputVal] = useState(getInitialValue());
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const autocompleteRef = useRef(null);
  const inputRef = useRef(null);

  const isExternalChangeRef = useRef(false);
  const isUserEditingRef = useRef(false);
  const isSelectingRef = useRef(false);
  const isShiftTabRef = useRef(false);
  const isTabRef = useRef(false);

  // Store the value before opening dropdown to restore if closed without selection
  const previousValueRef = useRef(value);
  const previousInputValRef = useRef(inputVal);
  // Track if dropdown is open for this specific instance
  const isOpenRef = useRef(false);
  // Store latest onChange in ref to avoid stale closures
  const onChangeRef = useRef(onChange);
  // Track if a selection was just made to prevent restore
  const selectionMadeRef = useRef(false);

  const listRef = useRef(null);

  // Keep onChangeRef updated
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Keep isOpenRef in sync with isOpen state
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // Auto-scroll to highlighted option
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

  useEffect(() => {
    // Only update inputVal when prop value changes AND user is not actively editing
    if (!isUserEditingRef.current && !isExternalChangeRef.current) {
      // Find the option that matches the value and display its label
      const matchingOption = options.find(opt => opt.value === value);
      setInputVal(matchingOption ? matchingOption.label : (value || ''));
    }

    if (isExternalChangeRef.current) {
      isExternalChangeRef.current = false;
    }
  }, [value, options]);

  // Handle closing dropdown - restore previous value if no selection was made
  const handleCloseDropdown = (wasSelectionMade = false) => {
    // Only process if this dropdown is actually open
    if (!isOpenRef.current) {
      return;
    }

    // If a selection was just made, don't restore
    if (selectionMadeRef.current) {
      selectionMadeRef.current = false;
      setIsOpen(false);
      setHighlightedIndex(-1);
      isUserEditingRef.current = false;
      return;
    }

    if (!wasSelectionMade && previousValueRef.current !== undefined) {
      // Restore the previous value only if it's different from the current prop value
      if (value !== previousValueRef.current) {
        onChangeRef.current(previousValueRef.current);
      }
      setInputVal(previousInputValRef.current);
    }
    setIsOpen(false);
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Only handle if this dropdown is open AND click is outside this component
      if (isOpenRef.current && autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        handleCloseDropdown(false);
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

  // Function to open dropdown and store current value
  const openDropdown = () => {
    // Store current value before opening
    previousValueRef.current = value;
    const matchingOption = options.find(opt => opt.value === value);
    previousInputValRef.current = matchingOption ? matchingOption.label : (value || '');
    selectionMadeRef.current = false;

    // Clear input to show all options, but don't clear the actual value yet
    setInputVal('');
    setIsOpen(true);

    // Find the index of the current value to scroll to it
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
    setIsOpen(true); // Keep dropdown open when typing
    setHighlightedIndex(-1); // Reset highlight when typing
    isUserEditingRef.current = true;

    // Check if the value matches a valid LOV option
    const matchingOption = options.find(opt =>
      opt.label.toLowerCase() === val.toLowerCase() ||
      opt.value === val
    );

    if (matchingOption) {
      // If it's a valid LOV option, notify parent with the value
      onChangeRef.current(matchingOption.value);
    } else if (val === '' || val.trim() === '') {
      // If user is clearing a valid LOV selection, notify parent
      onChangeRef.current('');
    } else {
      // Allow free text
      onChangeRef.current(val);
    }
  };

  const handleKeyDown = (e) => {
    // Handle arrow keys to open dropdown if closed
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();

      if (!isOpen) {
        openDropdown();
        return;
      }

      // Navigate through options when dropdown is open
      if (e.key === 'ArrowDown') {
        setHighlightedIndex(prev => {
          const nextIndex = prev < filteredOptions.length - 1 ? prev + 1 : 0;
          return nextIndex;
        });
      } else if (e.key === 'ArrowUp') {
        setHighlightedIndex(prev => {
          const nextIndex = prev > 0 ? prev - 1 : filteredOptions.length - 1;
          return nextIndex;
        });
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
    // Find the selected option to get its label
    const selectedOption = options.find(opt => opt.value === optionValue);
    const displayLabel = selectedOption ? selectedOption.label : optionValue;

    // Mark that a selection was made BEFORE any state changes
    selectionMadeRef.current = true;
    isSelectingRef.current = true;
    isExternalChangeRef.current = true;

    // Update the previous value refs since a selection was made
    previousValueRef.current = optionValue;
    previousInputValRef.current = displayLabel;

    onChangeRef.current(optionValue);
    setInputVal(displayLabel);
    setIsOpen(false);
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;

    // Blur the input
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.blur();
      }
      isSelectingRef.current = false;
    }, 50);
  };

  const normalizedInput = inputVal.toLowerCase();
  const filteredOptions = normalizedInput.length === 0
    ? options
    : options.filter(option => {
      const normalizedLabel = option.label.toLowerCase();
      return normalizedLabel.includes(normalizedInput);
    });

  return (
    <div
      style={{ position: 'relative', width: '260px', overflow: 'visible' }}
      ref={autocompleteRef}
    >
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
              const isSelecting = isSelectingRef.current;

              if (isSelecting || isFocusInDropdown) {
                return;
              }

              handleCloseDropdown(false);
            }, 150);
          }}
          placeholder="Select from list..."
          size="small"
          error={error}
          sx={{
            width: '260px',
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
                borderRadius: '3px',
              },
              '&:hover fieldset': {
                borderColor: '#ddd',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#007bff',
                borderWidth: '1px',
              },
            },
            '& .MuiInputLabel-root': {
              display: 'none',
            },
          }}
        />
        <ChevronDown
          size={16}
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#666',
            cursor: 'pointer',
            pointerEvents: 'auto',
            zIndex: 2
          }}
          onMouseDown={(e) => {
            e.preventDefault();
          }}
          onClick={() => {
            if (!isOpen) {
              openDropdown();
            } else {
              handleCloseDropdown(false);
            }
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
            width: '260px',
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderTop: 'none',
            borderRadius: '0 0 4px 4px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            zIndex: 1000,
            maxHeight: '240px',
            overflowY: 'auto',
            marginTop: '4px'
          }}
          tabIndex={-1}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={`${option.value}-${index}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectOption(option.value);
                }}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  backgroundColor: index === highlightedIndex ? '#cce5ff' : (option.value === value ? '#e3f2fd' : 'white'),
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: '13px',
                  transition: 'background-color 0.2s',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                onMouseEnter={() => {
                  setHighlightedIndex(index);
                }}
                title={DOMPurify.sanitize(option.label, { ALLOWED_TAGS: [] })}
              >
                {DOMPurify.sanitize(option.label, { ALLOWED_TAGS: [] })}
              </div>
            ))
          ) : (
            <div
              style={{
                padding: '12px',
                zIndex: 1000,
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

// Business Line Autocomplete Component
export const BusinessLineAutocomplete = ({
  value,
  onChange,
  options = [],
  error = false
}) => {
  // Initialize with the label if value matches an option, otherwise use the value
  const getInitialValue = () => {
    if (!value) return '';
    const matchingOption = options.find(opt => opt.value === value);
    return matchingOption ? matchingOption.label : value;
  };

  const [isOpen, setIsOpen] = useState(false);
  const [inputVal, setInputVal] = useState(getInitialValue());
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const autocompleteRef = useRef(null);
  const inputRef = useRef(null);

  const isExternalChangeRef = useRef(false);
  const isUserEditingRef = useRef(false);
  const isSelectingRef = useRef(false);
  const isShiftTabRef = useRef(false);
  const isTabRef = useRef(false);

  // Store the value before opening dropdown to restore if closed without selection
  const previousValueRef = useRef(value);
  const previousInputValRef = useRef(inputVal);
  // Track if dropdown is open for this specific instance
  const isOpenRef = useRef(false);
  // Store latest onChange in ref to avoid stale closures
  const onChangeRef = useRef(onChange);
  // Track if a selection was just made to prevent restore
  const selectionMadeRef = useRef(false);

  const listRef = useRef(null);

  // Keep onChangeRef updated
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Keep isOpenRef in sync with isOpen state
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // Auto-scroll to highlighted option
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

  useEffect(() => {
    // Only update inputVal when prop value changes AND user is not actively editing
    if (!isUserEditingRef.current && !isExternalChangeRef.current) {
      // Find the option that matches the value and display its label
      const matchingOption = options.find(opt => opt.value === value);
      setInputVal(matchingOption ? matchingOption.label : (value || ''));
    }

    if (isExternalChangeRef.current) {
      isExternalChangeRef.current = false;
    }
  }, [value, options]);

  // Handle closing dropdown - restore previous value if no selection was made
  const handleCloseDropdown = (wasSelectionMade = false) => {
    // Only process if this dropdown is actually open
    if (!isOpenRef.current) {
      return;
    }

    // If a selection was just made, don't restore
    if (selectionMadeRef.current) {
      selectionMadeRef.current = false;
      setIsOpen(false);
      setHighlightedIndex(-1);
      isUserEditingRef.current = false;
      return;
    }

    if (!wasSelectionMade && previousValueRef.current !== undefined) {
      // Restore the previous value only if it's different from the current prop value
      if (value !== previousValueRef.current) {
        onChangeRef.current(previousValueRef.current);
      }
      setInputVal(previousInputValRef.current);
    }
    setIsOpen(false);
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Only handle if this dropdown is open AND click is outside this component
      if (isOpenRef.current && autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        handleCloseDropdown(false);
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

  // Function to open dropdown and store current value
  const openDropdown = () => {
    // Store current value before opening
    previousValueRef.current = value;
    const matchingOption = options.find(opt => opt.value === value);
    previousInputValRef.current = matchingOption ? matchingOption.label : (value || '');
    selectionMadeRef.current = false;

    // Clear input to show all options, but don't clear the actual value yet
    setInputVal('');
    setIsOpen(true);

    // Find the index of the current value to scroll to it
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
    setIsOpen(true); // Keep dropdown open when typing
    setHighlightedIndex(-1); // Reset highlight when typing
    isUserEditingRef.current = true;

    // Check if the value matches a valid LOV option
    const matchingOption = options.find(opt =>
      opt.label.toLowerCase() === val.toLowerCase() ||
      opt.value === val
    );

    if (matchingOption) {
      // If it's a valid LOV option, notify parent with the value
      onChangeRef.current(matchingOption.value);
    } else if (val === '' || val.trim() === '') {
      // If user is clearing a valid LOV selection, notify parent
      onChangeRef.current('');
    } else {
      // Allow free text
      onChangeRef.current(val);
    }
  };

  const handleKeyDown = (e) => {
    // Handle arrow keys to open dropdown if closed
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();

      if (!isOpen) {
        openDropdown();
        return;
      }

      // Navigate through options when dropdown is open
      if (e.key === 'ArrowDown') {
        setHighlightedIndex(prev => {
          const nextIndex = prev < filteredOptions.length - 1 ? prev + 1 : 0;
          return nextIndex;
        });
      } else if (e.key === 'ArrowUp') {
        setHighlightedIndex(prev => {
          const nextIndex = prev > 0 ? prev - 1 : filteredOptions.length - 1;
          return nextIndex;
        });
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
    // Find the selected option to get its label
    const selectedOption = options.find(opt => opt.value === optionValue);
    const displayLabel = selectedOption ? selectedOption.label : optionValue;

    // Mark that a selection was made BEFORE any state changes
    selectionMadeRef.current = true;
    isSelectingRef.current = true;
    isExternalChangeRef.current = true;

    // Update the previous value refs since a selection was made
    previousValueRef.current = optionValue;
    previousInputValRef.current = displayLabel;

    onChangeRef.current(optionValue);
    setInputVal(displayLabel);
    setIsOpen(false);
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;

    // Blur the input
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.blur();
      }
      isSelectingRef.current = false;
    }, 50);
  };

  const normalizedInput = inputVal.toLowerCase();
  const filteredOptions = normalizedInput.length === 0
    ? options
    : options.filter(option => {
      const normalizedLabel = option.label.toLowerCase();
      return normalizedLabel.includes(normalizedInput);
    });

  return (
    <div
      style={{ position: 'relative', width: '180px', overflow: 'visible' }}
      ref={autocompleteRef}
    >
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
              const isSelecting = isSelectingRef.current;

              if (isSelecting || isFocusInDropdown) {
                return;
              }

              handleCloseDropdown(false);
            }, 150);
          }}
          placeholder="Select from list..."
          size="small"
          error={error}
          sx={{
            width: '180px',
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
                borderRadius: '3px',
              },
              '&:hover fieldset': {
                borderColor: '#ddd',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#007bff',
                borderWidth: '1px',
              },
            },
            '& .MuiInputLabel-root': {
              display: 'none',
            },
          }}
        />
        <ChevronDown
          size={16}
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#666',
            cursor: 'pointer',
            pointerEvents: 'auto',
            zIndex: 2
          }}
          onMouseDown={(e) => {
            e.preventDefault();
          }}
          onClick={() => {
            if (!isOpen) {
              openDropdown();
            } else {
              handleCloseDropdown(false);
            }
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
            width: '180px',
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderTop: 'none',
            borderRadius: '0 0 4px 4px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            zIndex: 1000,
            maxHeight: '240px',
            overflowY: 'auto',
            marginTop: '4px'
          }}
          tabIndex={-1}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={`${option.value}-${index}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectOption(option.value);
                }}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  backgroundColor: index === highlightedIndex ? '#cce5ff' : (option.value === value ? '#e3f2fd' : 'white'),
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: '13px',
                  transition: 'background-color 0.2s',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                onMouseEnter={() => {
                  setHighlightedIndex(index);
                }}
                title={DOMPurify.sanitize(option.label, { ALLOWED_TAGS: [] })}
              >
                {DOMPurify.sanitize(option.label, { ALLOWED_TAGS: [] })}
              </div>
            ))
          ) : (
            <div
              style={{
                padding: '12px',
                zIndex: 1000,
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

// Portfolio Autocomplete Component
export const PortfolioAutocomplete = ({
  value,
  onChange,
  options = [],
  error = false
}) => {
  // Initialize with the label if value matches an option, otherwise use the value
  const getInitialValue = () => {
    if (!value) return '';
    const matchingOption = options.find(opt => opt.value === value);
    return matchingOption ? matchingOption.label : value;
  };

  const [isOpen, setIsOpen] = useState(false);
  const [inputVal, setInputVal] = useState(getInitialValue());
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const autocompleteRef = useRef(null);
  const inputRef = useRef(null);

  const isExternalChangeRef = useRef(false);
  const isUserEditingRef = useRef(false);
  const isSelectingRef = useRef(false);
  const isShiftTabRef = useRef(false);
  const isTabRef = useRef(false);

  // Store the value before opening dropdown to restore if closed without selection
  const previousValueRef = useRef(value);
  const previousInputValRef = useRef(inputVal);
  // Track if dropdown is open for this specific instance
  const isOpenRef = useRef(false);
  // Store latest onChange in ref to avoid stale closures
  const onChangeRef = useRef(onChange);
  // Track if a selection was just made to prevent restore
  const selectionMadeRef = useRef(false);

  const listRef = useRef(null);

  // Keep onChangeRef updated
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Keep isOpenRef in sync with isOpen state
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // Auto-scroll to highlighted option
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

  useEffect(() => {
    // Only update inputVal when prop value changes AND user is not actively editing
    if (!isUserEditingRef.current && !isExternalChangeRef.current) {
      // Find the option that matches the value and display its label
      const matchingOption = options.find(opt => opt.value === value);
      setInputVal(matchingOption ? matchingOption.label : (value || ''));
    }

    if (isExternalChangeRef.current) {
      isExternalChangeRef.current = false;
    }
  }, [value, options]);

  // Handle closing dropdown - restore previous value if no selection was made
  const handleCloseDropdown = (wasSelectionMade = false) => {
    // Only process if this dropdown is actually open
    if (!isOpenRef.current) {
      return;
    }

    // If a selection was just made, don't restore
    if (selectionMadeRef.current) {
      selectionMadeRef.current = false;
      setIsOpen(false);
      setHighlightedIndex(-1);
      isUserEditingRef.current = false;
      return;
    }

    if (!wasSelectionMade && previousValueRef.current !== undefined) {
      // Restore the previous value only if it's different from the current prop value
      if (value !== previousValueRef.current) {
        onChangeRef.current(previousValueRef.current);
      }
      setInputVal(previousInputValRef.current);
    }
    setIsOpen(false);
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Only handle if this dropdown is open AND click is outside this component
      if (isOpenRef.current && autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        handleCloseDropdown(false);
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

  // Function to open dropdown and store current value
  const openDropdown = () => {
    // Store current value before opening
    previousValueRef.current = value;
    const matchingOption = options.find(opt => opt.value === value);
    previousInputValRef.current = matchingOption ? matchingOption.label : (value || '');
    selectionMadeRef.current = false;

    // Clear input to show all options, but don't clear the actual value yet
    setInputVal('');
    setIsOpen(true);

    // Find the index of the current value to scroll to it
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
    setIsOpen(true); // Keep dropdown open when typing
    setHighlightedIndex(-1); // Reset highlight when typing
    isUserEditingRef.current = true;

    // Check if the value matches a valid LOV option
    const matchingOption = options.find(opt =>
      opt.label.toLowerCase() === val.toLowerCase() ||
      opt.value === val
    );

    if (matchingOption) {
      // If it's a valid LOV option, notify parent with the value
      onChangeRef.current(matchingOption.value);
    } else if (val === '' || val.trim() === '') {
      // If user is clearing a valid LOV selection, notify parent
      onChangeRef.current('');
    } else {
      // Allow free text
      onChangeRef.current(val);
    }
  };

  const handleKeyDown = (e) => {
    // Handle arrow keys to open dropdown if closed
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();

      if (!isOpen) {
        openDropdown();
        return;
      }

      // Navigate through options when dropdown is open
      if (e.key === 'ArrowDown') {
        setHighlightedIndex(prev => {
          const nextIndex = prev < filteredOptions.length - 1 ? prev + 1 : 0;
          return nextIndex;
        });
      } else if (e.key === 'ArrowUp') {
        setHighlightedIndex(prev => {
          const nextIndex = prev > 0 ? prev - 1 : filteredOptions.length - 1;
          return nextIndex;
        });
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
    // Find the selected option to get its label
    const selectedOption = options.find(opt => opt.value === optionValue);
    const displayLabel = selectedOption ? selectedOption.label : optionValue;

    // Mark that a selection was made BEFORE any state changes
    selectionMadeRef.current = true;
    isSelectingRef.current = true;
    isExternalChangeRef.current = true;

    // Update the previous value refs since a selection was made
    previousValueRef.current = optionValue;
    previousInputValRef.current = displayLabel;

    onChangeRef.current(optionValue);
    setInputVal(displayLabel);
    setIsOpen(false);
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;

    // Blur the input
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.blur();
      }
      isSelectingRef.current = false;
    }, 50);
  };

  const normalizedInput = inputVal.toLowerCase();
  const filteredOptions = normalizedInput.length === 0
    ? options
    : options.filter(option => {
      const normalizedLabel = option.label.toLowerCase();
      return normalizedLabel.includes(normalizedInput);
    });

  return (
    <div
      style={{ position: 'relative', width: '180px', overflow: 'visible' }}
      ref={autocompleteRef}
    >
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
              const isSelecting = isSelectingRef.current;

              if (isSelecting || isFocusInDropdown) {
                return;
              }

              handleCloseDropdown(false);
            }, 150);
          }}
          placeholder="Select from list..."
          size="small"
          error={error}
          sx={{
            width: '180px',
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
                borderRadius: '3px',
              },
              '&:hover fieldset': {
                borderColor: '#ddd',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#007bff',
                borderWidth: '1px',
              },
            },
            '& .MuiInputLabel-root': {
              display: 'none',
            },
          }}
        />
        <ChevronDown
          size={16}
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#666',
            cursor: 'pointer',
            pointerEvents: 'auto',
            zIndex: 2
          }}
          onMouseDown={(e) => {
            e.preventDefault();
          }}
          onClick={() => {
            if (!isOpen) {
              openDropdown();
            } else {
              handleCloseDropdown(false);
            }
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
            width: '180px',
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderTop: 'none',
            borderRadius: '0 0 4px 4px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            zIndex: 1000,
            maxHeight: '240px',
            overflowY: 'auto',
            marginTop: '4px'
          }}
          tabIndex={-1}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={`${option.value}-${index}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectOption(option.value);
                }}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  backgroundColor: index === highlightedIndex ? '#cce5ff' : (option.value === value ? '#e3f2fd' : 'white'),
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: '13px',
                  transition: 'background-color 0.2s',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                onMouseEnter={() => {
                  setHighlightedIndex(index);
                }}
                title={DOMPurify.sanitize(option.label, { ALLOWED_TAGS: [] })}
              >
                {DOMPurify.sanitize(option.label, { ALLOWED_TAGS: [] })}
              </div>
            ))
          ) : (
            <div
              style={{
                padding: '12px',
                zIndex: 1000,
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

// Primary Skill Autocomplete Component
// Primary Skill Autocomplete Component
export const PrimarySkillAutocomplete = ({
  value,
  onChange,
  options = [],
  error = false
}) => {
  // Initialize with the label if value matches an option, otherwise use the value
  const getInitialValue = () => {
    if (!value) return '';
    const matchingOption = options.find(opt => opt.value === value);
    return matchingOption ? matchingOption.label : value;
  };

  const [isOpen, setIsOpen] = useState(false);
  const [inputVal, setInputVal] = useState(getInitialValue());
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const autocompleteRef = useRef(null);
  const inputRef = useRef(null);

  const isExternalChangeRef = useRef(false);
  const isUserEditingRef = useRef(false);
  const isSelectingRef = useRef(false);
  const onChangeRef = useRef(onChange);
  const selectionMadeRef = useRef(false);
  const previousValueRef = useRef(value);
  const previousInputValRef = useRef(inputVal);
  const isOpenRef = useRef(false);

  // Keep onChangeRef updated
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Keep isOpenRef in sync with isOpen state
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    // Only update inputVal when prop value changes AND user is not actively editing
    if (!isUserEditingRef.current && !isExternalChangeRef.current) {
      // Find the option that matches the value and display its label
      const matchingOption = options.find(opt => opt.value === value);
      setInputVal(matchingOption ? matchingOption.label : (value || ''));
    }

    if (isExternalChangeRef.current) {
      isExternalChangeRef.current = false;
    }
  }, [value, options]);

  // Handle closing dropdown - restore previous value if no selection was made
  const handleCloseDropdown = (wasSelectionMade = false) => {
    // Only process if this dropdown is actually open
    if (!isOpenRef.current) {
      return;
    }

    // If a selection was just made, don't restore
    if (selectionMadeRef.current) {
      selectionMadeRef.current = false;
      setIsOpen(false);
      setHighlightedIndex(-1);
      isUserEditingRef.current = false;
      return;
    }

    if (!wasSelectionMade && previousValueRef.current !== undefined) {
      // Restore the previous value only if it's different from the current prop value
      if (value !== previousValueRef.current) {
        onChangeRef.current(previousValueRef.current);
      }
      setInputVal(previousInputValRef.current);
    }
    setIsOpen(false);
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        handleCloseDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openDropdown = () => {
    // Store current value before opening
    previousValueRef.current = value;
    const matchingOption = options.find(opt => opt.value === value);
    previousInputValRef.current = matchingOption ? matchingOption.label : (value || '');
    selectionMadeRef.current = false;

    // Clear input to show all options, but don't clear the actual value yet
    setInputVal('');
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    const capitalizedVal = val.charAt(0).toUpperCase() + val.slice(1);
    setInputVal(capitalizedVal);
    setIsOpen(true);
    setHighlightedIndex(-1);

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
    if (e.key === 'Tab') {
      handleCloseDropdown(false);
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        openDropdown();
        setHighlightedIndex(0);
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
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const handleSelectOption = (optionValue) => {
    const selectedOption = options.find(opt => opt.value === optionValue);
    const displayLabel = selectedOption ? selectedOption.label : optionValue;

    // Mark that a selection was made BEFORE any state changes
    selectionMadeRef.current = true;
    isSelectingRef.current = true;
    isExternalChangeRef.current = true;

    // Update the previous value refs since a selection was made
    previousValueRef.current = optionValue;

    onChangeRef.current(optionValue);  // Send the value to parent form
    setInputVal(displayLabel);  // Display the label in input
    setIsOpen(false);
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;

    // Blur the input so next click will trigger onFocus
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.blur();
      }
      isSelectingRef.current = false;
    }, 50);
  };

  const normalizedInput = inputVal.toLowerCase();
  const filteredOptions = normalizedInput.length === 0
    ? options
    : options.filter(option => {
      const normalizedLabel = option.label.toLowerCase();
      const normalizedValue = String(option.value).toLowerCase();
      return normalizedLabel.includes(normalizedInput) || normalizedValue.includes(normalizedInput);
    });

  return (
    <div style={{ position: 'relative', width: '180px', overflow: 'visible' }} ref={autocompleteRef}>
      <div style={{ position: 'relative', overflow: 'visible' }}>
        <TextField
          inputRef={inputRef}
          value={inputVal}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          onFocus={() => openDropdown()}
          onBlur={() => {
            // Delay the validation to allow selection to complete
            setTimeout(() => {
              const activeElement = document.activeElement;
              const isFocusInDropdown = activeElement && autocompleteRef.current?.contains(activeElement);
              const isSelecting = isSelectingRef.current;

              if (isSelecting || isFocusInDropdown) {
                return;
              }

              handleCloseDropdown(false);
            }, 150);
          }}
          placeholder="Select..."
          size="small"
          error={error}
          sx={{
            width: '180px',
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
                borderRadius: '3px',
              },
              '&:hover fieldset': {
                borderColor: '#ddd',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#007bff',
                borderWidth: '1px',
              },
            },
            '& .MuiInputLabel-root': {
              display: 'none',
            },
          }}
        />
        <ChevronDown
          size={16}
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#666',
            cursor: 'pointer',
            pointerEvents: 'auto',
            zIndex: 2
          }}
          onClick={() => {
            if (!isOpen) {
              openDropdown();
            } else {
              setIsOpen(false);
            }
          }}
        />
      </div>

      {isOpen && (
        <div style={{ position: 'absolute', top: '100%', left: 0, width: '100%', backgroundColor: 'white', border: '1px solid #ddd', borderTop: 'none', borderRadius: '0 0 4px 4px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', zIndex: 1000, maxHeight: '240px', overflowY: 'auto', marginTop: '4px' }}>
          {filteredOptions.length === 0 ? (
            <div style={{ padding: '12px', fontSize: '13px', color: '#999', textAlign: 'center' }}>No matches found</div>
          ) : (
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
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: '13px',
                  transition: 'background-color 0.2s',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                title={option.label}
              >
                {option.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// Secondary Skill Autocomplete Component
export const SecondarySkillAutocomplete = ({
  value,
  onChange,
  options = [],
  error = false
}) => {
  return (
    <PrimarySkillAutocomplete
      value={value}
      onChange={onChange}
      options={options}
      error={error}
    />
  );
};

// Employment Status Autocomplete Component
export const EmploymentStatusAutocomplete = ({
  value,
  onChange,
  error = false
}) => {
  const employmentStatusOptions = [
    { value: 'leave-of-absence', label: 'Leave of Absence' },
    { value: 'available', label: 'Available' },
    { value: 'not-available', label: 'Not Available' }
  ];

  // Initialize with the label if value matches an option, otherwise use the value
  const getInitialValue = () => {
    if (!value) return '';
    const matchingOption = employmentStatusOptions.find(opt => opt.value === value);
    return matchingOption ? matchingOption.label : value;
  };

  const [isOpen, setIsOpen] = useState(false);
  const [inputVal, setInputVal] = useState(getInitialValue());
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const autocompleteRef = useRef(null);
  const inputRef = useRef(null);

  const isExternalChangeRef = useRef(false);
  const isUserEditingRef = useRef(false);
  const isSelectingRef = useRef(false);
  const onChangeRef = useRef(onChange);
  const selectionMadeRef = useRef(false);
  const previousValueRef = useRef(value);
  const previousInputValRef = useRef(inputVal);
  const isOpenRef = useRef(false);

  // Keep onChangeRef updated
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Keep isOpenRef in sync with isOpen state
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    // Only update inputVal when prop value changes AND user is not actively editing
    if (!isUserEditingRef.current && !isExternalChangeRef.current) {
      // Find the option that matches the value and display its label
      const matchingOption = employmentStatusOptions.find(opt => opt.value === value);
      setInputVal(matchingOption ? matchingOption.label : (value || ''));
    }

    if (isExternalChangeRef.current) {
      isExternalChangeRef.current = false;
    }
  }, [value]);

  // Handle closing dropdown - restore previous value if no selection was made
  const handleCloseDropdown = (wasSelectionMade = false) => {
    // Only process if this dropdown is actually open
    if (!isOpenRef.current) {
      return;
    }

    // If a selection was just made, don't restore
    if (selectionMadeRef.current) {
      selectionMadeRef.current = false;
      setIsOpen(false);
      setHighlightedIndex(-1);
      isUserEditingRef.current = false;
      return;
    }

    if (!wasSelectionMade && previousValueRef.current !== undefined) {
      // Restore the previous value only if it's different from the current prop value
      if (value !== previousValueRef.current) {
        onChangeRef.current(previousValueRef.current);
      }
      setInputVal(previousInputValRef.current);
    }
    setIsOpen(false);
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        handleCloseDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openDropdown = () => {
    // Store current value before opening
    previousValueRef.current = value;
    const matchingOption = employmentStatusOptions.find(opt => opt.value === value);
    previousInputValRef.current = matchingOption ? matchingOption.label : (value || '');
    selectionMadeRef.current = false;

    // Clear input to show all options, but don't clear the actual value yet
    setInputVal('');
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    const capitalizedVal = val.charAt(0).toUpperCase() + val.slice(1);
    setInputVal(capitalizedVal);
    setIsOpen(true);
    setHighlightedIndex(-1);

    const matchingOption = employmentStatusOptions.find(opt =>
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
    if (e.key === 'Tab') {
      handleCloseDropdown(false);
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        openDropdown();
        setHighlightedIndex(0);
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
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const handleSelectOption = (optionValue) => {
    const selectedOption = employmentStatusOptions.find(opt => opt.value === optionValue);
    const displayLabel = selectedOption ? selectedOption.label : optionValue;

    // Mark that a selection was made BEFORE any state changes
    selectionMadeRef.current = true;
    isSelectingRef.current = true;
    isExternalChangeRef.current = true;

    // Update the previous value refs since a selection was made
    previousValueRef.current = optionValue;

    onChangeRef.current(optionValue);  // Send the value to parent form
    setInputVal(displayLabel);  // Display the label in input
    setIsOpen(false);
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;

    // Blur the input so next click will trigger onFocus
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.blur();
      }
      isSelectingRef.current = false;
    }, 50);
  };

  const normalizedInput = inputVal.toLowerCase();
  const filteredOptions = normalizedInput.length === 0
    ? employmentStatusOptions
    : employmentStatusOptions.filter(option => {
      const normalizedLabel = option.label.toLowerCase();
      const normalizedValue = String(option.value).toLowerCase();
      return normalizedLabel.includes(normalizedInput) || normalizedValue.includes(normalizedInput);
    });

  return (
    <div style={{ position: 'relative', width: '180px', overflow: 'visible' }} ref={autocompleteRef}>
      <div style={{ position: 'relative', overflow: 'visible' }}>
        <TextField
          inputRef={inputRef}
          value={inputVal}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          onFocus={() => openDropdown()}
          onBlur={() => {
            // Delay the validation to allow selection to complete
            setTimeout(() => {
              const activeElement = document.activeElement;
              const isFocusInDropdown = activeElement && autocompleteRef.current?.contains(activeElement);
              const isSelecting = isSelectingRef.current;

              if (isSelecting || isFocusInDropdown) {
                return;
              }

              handleCloseDropdown(false);
            }, 150);
          }}
          placeholder="Select..."
          size="small"
          error={error}
          sx={{
            width: '180px',
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
                borderRadius: '3px',
              },
              '&:hover fieldset': {
                borderColor: '#ddd',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#007bff',
                borderWidth: '1px',
              },
            },
            '& .MuiInputLabel-root': {
              display: 'none',
            },
          }}
        />
        <ChevronDown
          size={16}
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#666',
            cursor: 'pointer',
            pointerEvents: 'auto',
            zIndex: 2
          }}
          onClick={() => {
            if (!isOpen) {
              openDropdown();
            } else {
              setIsOpen(false);
            }
          }}
        />
      </div>

      {isOpen && (
        <div style={{ position: 'absolute', top: '100%', left: 0, width: '100%', backgroundColor: 'white', border: '1px solid #ddd', borderTop: 'none', borderRadius: '0 0 4px 4px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', zIndex: 1000, maxHeight: '240px', overflowY: 'auto', marginTop: '4px' }}>
          {filteredOptions.length === 0 ? (
            <div style={{ padding: '12px', fontSize: '13px', color: '#999', textAlign: 'center' }}>No matches found</div>
          ) : (
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
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: '13px',
                  transition: 'background-color 0.2s',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                title={option.label}
              >
                {option.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
