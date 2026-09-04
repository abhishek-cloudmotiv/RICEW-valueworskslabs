import React, { useState, useEffect, useRef } from 'react';
import { TextField } from '@mui/material';
import { ChevronDown } from 'lucide-react';

// Cost Organization Autocomplete Component
export const CostOrganizationAutocomplete = ({
  value,
  onChange,
  options = [],
  error = false,
  width = '180px',
  disabled = false,
  readonly = false
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
  const inputRef = useRef(null);
  const listRef = useRef(null);
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
    if (!isUserEditingRef.current && !isExternalChangeRef.current) {
      const matchingOption = value ? options.find(opt => opt.value === value) : null;
      const newInputVal = matchingOption ? matchingOption.label : (value || '');
      setInputVal(newInputVal);
    }

    if (isExternalChangeRef.current) {
      isExternalChangeRef.current = false;
    }
  }, [value, options]);

  // Auto-select if only 1 option exists
  useEffect(() => {
    if (options && options.length === 1 && (!value || value === '') && !disabled && !readonly) {
      const singleOption = options[0];
      isExternalChangeRef.current = true;
      onChangeRef.current(singleOption.value);
      setInputVal(singleOption.label);
    }
  }, [options, value, disabled, readonly]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const listElement = listRef.current;
      const highlightedElement = listElement.children[highlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [highlightedIndex, isOpen]);

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

    if (!wasSelectionMade && previousValueRef.current) {
      onChangeRef.current(previousValueRef.current);
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
    const capitalizedVal = val.charAt(0).toUpperCase() + val.slice(1);
    setInputVal(capitalizedVal);
    setIsOpen(true);
    setHighlightedIndex(-1);
    isUserEditingRef.current = true;

    // Don't call onChange here - only update when selection is confirmed
  };

  const handleKeyDown = (e) => {
    // Handle Tab key to close dropdown
    if (e.key === 'Tab') {
      if (isOpen) {
        handleCloseDropdown(false);
      }
      return; // Allow default Tab behavior
    }

    // Handle arrow keys to open dropdown if closed
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();

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

    // Blur the input so next click will trigger onFocus and clear the value
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.blur();
      }
      isSelectingRef.current = false;
    }, 50);
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
          inputRef={inputRef}
          value={inputVal}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          InputProps={{
            readOnly: disabled || readonly
          }}
          onFocus={() => {
            if (!disabled && !readonly && !isShiftTabRef.current) {
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
            width: width,
            '& .MuiInputBase-root': {
              backgroundColor: (disabled || readonly) ? '#f5f5f5' : 'white',
              fontSize: '13px',
              fontFamily: 'inherit',
            },
            '& .MuiInputBase-input': {
              padding: '6px 30px 6px 10px',
              fontSize: '13px',
              color: (disabled || readonly) ? 'black' : 'inherit'
            },
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: error ? '#dc2626' : '#ddd',
                borderRadius: '3px',
              },
              '&:hover fieldset': {
                borderColor: error ? '#dc2626' : '#ddd',
              },
              '&.Mui-focused fieldset': {
                borderColor: error ? '#dc2626' : '#007bff',
                borderWidth: '1px',
              },
              '&.Mui-disabled fieldset': {
                borderColor: '#ddd',
              }
            },
            '& .MuiInputLabel-root': {
              display: 'none',
            },
          }}
        />
        {!disabled && !readonly && (
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
        )}
      </div>

      {isOpen && (
        <div
          ref={listRef}
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
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={`${option.value}-${index}`}
                onMouseDown={(e) => {
                  // Use onMouseDown to capture selection BEFORE any blur/click-outside events
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectOption(option.value);
                }}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  backgroundColor: index === highlightedIndex ? '#cce5ff' : (option.value === previousValueRef.current ? '#e3f2fd' : 'white'),
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: '13px',
                  transition: 'background-color 0.15s',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word'
                }}
                onMouseEnter={(e) => {
                  if (index !== highlightedIndex) {
                    e.currentTarget.style.backgroundColor = '#cce5ff';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    index === highlightedIndex ? '#cce5ff' : (option.value === previousValueRef.current ? '#e3f2fd' : 'white');
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

// RICEW Type Autocomplete Component (Original behavior - used by other components)
export const RicewTypeAutocomplete = ({
  value,
  onChange,
  options = [],
  error = false,
  width = '180px',
  disabled = false,
  readonly = false
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

  useEffect(() => {
    if (!isUserEditingRef.current && !isExternalChangeRef.current) {
      const matchingOption = value ? options.find(opt => opt.value === value) : null;
      setInputVal(matchingOption ? matchingOption.label : value);
    }

    if (isExternalChangeRef.current) {
      isExternalChangeRef.current = false;
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
    onChange(optionValue);
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
          InputProps={{
            readOnly: disabled || readonly
          }}
          onFocus={() => {
            if (!disabled && !readonly && value && !isShiftTabRef.current && !isTabRef.current) {
              setInputVal('');
              onChange('');
            }
            if (!disabled && !readonly) {
              setIsOpen(true);
              setHighlightedIndex(-1);
            }
          }}
          onBlur={() => {
            setTimeout(() => {
              if (inputVal.trim() === '') {
                setHighlightedIndex(-1);
                return;
              }

              const activeElement = document.activeElement;
              const isFocusInDropdown = activeElement && autocompleteRef.current?.contains(activeElement);
              const isSelecting = isSelectingRef.current;

              if (isSelecting || isFocusInDropdown) {
                return;
              }

              const isValidOption = options.some(opt => opt.value === inputVal || opt.label === inputVal);
              if (!isValidOption && inputVal.trim() !== '') {
                setInputVal('');
                onChange('');
                setIsOpen(false);
                setHighlightedIndex(-1);
                isUserEditingRef.current = false;
              } else {
                setIsOpen(false);
                setHighlightedIndex(-1);
                isUserEditingRef.current = false;
              }
            }, 150);
          }}
          placeholder="Select from list..."
          size="small"
          error={error}
          sx={{
            width: width,
            '& .MuiInputBase-root': {
              backgroundColor: (disabled || readonly) ? '#f5f5f5' : 'white',
              fontSize: '13px',
              fontFamily: 'inherit',
            },
            '& .MuiInputBase-input': {
              padding: '6px 30px 6px 10px',
              fontSize: '13px',
              color: (disabled || readonly) ? 'black' : 'inherit'
            },
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: error ? '#dc2626' : '#ddd',
                borderRadius: '3px',
              },
              '&:hover fieldset': {
                borderColor: error ? '#dc2626' : '#ddd',
              },
              '&.Mui-focused fieldset': {
                borderColor: error ? '#dc2626' : '#007bff',
                borderWidth: '1px',
              },
              '&.Mui-disabled fieldset': {
                borderColor: '#ddd',
              }
            },
            '& .MuiInputLabel-root': {
              display: 'none',
            },
          }}
        />
        {!disabled && !readonly && (
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
              if (!isOpen && value) {
                setInputVal('');
                onChange('');
              }
              setIsOpen(!isOpen);
              setHighlightedIndex(-1);
            }}
          />
        )}
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
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={`${option.value}-${index}`}
                onClick={() => handleSelectOption(option.value)}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  backgroundColor: index === highlightedIndex ? '#cce5ff' : (option.value === value ? '#e3f2fd' : 'white'),
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: '13px',
                  transition: 'background-color 0.15s',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word'
                }}
                onMouseEnter={(e) => {
                  if (index !== highlightedIndex) {
                    e.currentTarget.style.backgroundColor = '#cce5ff';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    index === highlightedIndex ? '#cce5ff' : (option.value === value ? '#e3f2fd' : 'white');
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

// RICEW Type Field Autocomplete - Special behavior: restores previous value when closed without selection
// Use this ONLY for the RICEW Type field
export const RicewTypeFieldAutocomplete = ({
  value,
  onChange,
  options = [],
  error = false,
  width = '180px',
  disabled = false,
  readonly = false
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
  const inputRef = useRef(null);
  const listRef = useRef(null);
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
    if (!isUserEditingRef.current && !isExternalChangeRef.current) {
      const matchingOption = value ? options.find(opt => opt.value === value) : null;
      setInputVal(matchingOption ? matchingOption.label : (value || ''));
    }

    if (isExternalChangeRef.current) {
      isExternalChangeRef.current = false;
    }
  }, [value, options]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const listElement = listRef.current;
      const highlightedElement = listElement.children[highlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [highlightedIndex, isOpen]);

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

    if (!wasSelectionMade && previousValueRef.current) {
      // Restore the previous value
      onChangeRef.current(previousValueRef.current);
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
    const capitalizedVal = val.charAt(0).toUpperCase() + val.slice(1);
    setInputVal(capitalizedVal);
    setIsOpen(true);
    setHighlightedIndex(-1);
    isUserEditingRef.current = true;
  };

  const handleKeyDown = (e) => {
    // Handle Tab key to close dropdown
    if (e.key === 'Tab') {
      if (isOpen) {
        handleCloseDropdown(false);
      }
      return; // Allow default Tab behavior
    }

    // Handle arrow keys to open dropdown if closed
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();

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

    // Blur the input so next click will trigger onFocus and clear the value
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.blur();
      }
      isSelectingRef.current = false;
    }, 50);
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
          inputRef={inputRef}
          value={inputVal}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          InputProps={{
            readOnly: disabled || readonly
          }}
          onFocus={() => {
            if (!disabled && !readonly && !isShiftTabRef.current) {
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
            width: width,
            '& .MuiInputBase-root': {
              backgroundColor: (disabled || readonly) ? '#f5f5f5' : 'white',
              fontSize: '13px',
              fontFamily: 'inherit',
            },
            '& .MuiInputBase-input': {
              padding: '6px 30px 6px 10px',
              fontSize: '13px',
              color: (disabled || readonly) ? 'black' : 'inherit'
            },
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: error ? '#dc2626' : '#ddd',
                borderRadius: '3px',
              },
              '&:hover fieldset': {
                borderColor: error ? '#dc2626' : '#ddd',
              },
              '&.Mui-focused fieldset': {
                borderColor: error ? '#dc2626' : '#007bff',
                borderWidth: '1px',
              },
              '&.Mui-disabled fieldset': {
                borderColor: '#ddd',
              }
            },
            '& .MuiInputLabel-root': {
              display: 'none',
            },
          }}
        />
        {!disabled && !readonly && (
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
        )}
      </div>

      {isOpen && (
        <div
          ref={listRef}
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
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={`${option.value}-${index}`}
                onMouseDown={(e) => {
                  // Use onMouseDown to capture selection BEFORE any blur/click-outside events
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectOption(option.value);
                }}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  backgroundColor: index === highlightedIndex ? '#cce5ff' : (option.value === previousValueRef.current ? '#e3f2fd' : 'white'),
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: '13px',
                  transition: 'background-color 0.15s',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word'
                }}
                onMouseEnter={(e) => {
                  if (index !== highlightedIndex) {
                    e.currentTarget.style.backgroundColor = '#cce5ff';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    index === highlightedIndex ? '#cce5ff' : (option.value === previousValueRef.current ? '#e3f2fd' : 'white');
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


// Process Stream Autocomplete Component - Special behavior: restores previous value when closed without selection
export const ProcessStreamAutocomplete = ({
  value,
  onChange,
  options = [],
  error = false,
  width = '180px',
  disabled = false,
  readonly = false
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
  const inputRef = useRef(null);
  const listRef = useRef(null);
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
    if (!isUserEditingRef.current && !isExternalChangeRef.current) {
      const matchingOption = value ? options.find(opt => opt.value === value) : null;
      const newInputVal = matchingOption ? matchingOption.label : (value || '');
      setInputVal(newInputVal);
    }

    if (isExternalChangeRef.current) {
      isExternalChangeRef.current = false;
    }
  }, [value, options]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const listElement = listRef.current;
      const highlightedElement = listElement.children[highlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [highlightedIndex, isOpen]);

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

    if (!wasSelectionMade && previousValueRef.current) {
      onChangeRef.current(previousValueRef.current);
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
    const capitalizedVal = val.charAt(0).toUpperCase() + val.slice(1);
    setInputVal(capitalizedVal);
    setIsOpen(true);
    setHighlightedIndex(-1);
    isUserEditingRef.current = true;

    // Don't call onChange here - only update when selection is confirmed
  };

  const handleKeyDown = (e) => {
    // Handle Tab key to close dropdown
    if (e.key === 'Tab') {
      if (isOpen) {
        handleCloseDropdown(false);
      }
      return; // Allow default Tab behavior
    }

    // Handle arrow keys to open dropdown if closed
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();

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

    // Blur the input so next click will trigger onFocus and clear the value
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.blur();
      }
      isSelectingRef.current = false;
    }, 50);
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
          inputRef={inputRef}
          value={inputVal}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          InputProps={{
            readOnly: disabled || readonly
          }}
          onFocus={() => {
            if (!disabled && !readonly && !isShiftTabRef.current) {
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
            width: width,
            '& .MuiInputBase-root': {
              backgroundColor: (disabled || readonly) ? '#f5f5f5' : 'white',
              fontSize: '13px',
              fontFamily: 'inherit',
            },
            '& .MuiInputBase-input': {
              padding: '6px 30px 6px 10px',
              fontSize: '13px',
              color: (disabled || readonly) ? 'black' : 'inherit'
            },
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: error ? '#dc2626' : '#ddd',
                borderRadius: '3px',
              },
              '&:hover fieldset': {
                borderColor: error ? '#dc2626' : '#ddd',
              },
              '&.Mui-focused fieldset': {
                borderColor: error ? '#dc2626' : '#007bff',
                borderWidth: '1px',
              },
              '&.Mui-disabled fieldset': {
                borderColor: '#ddd',
              }
            },
            '& .MuiInputLabel-root': {
              display: 'none',
            },
          }}
        />
        {!disabled && !readonly && (
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
        )}
      </div>

      {isOpen && (
        <div
          ref={listRef}
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
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={`${option.value}-${index}`}
                onMouseDown={(e) => {
                  // Use onMouseDown to capture selection BEFORE any blur/click-outside events
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectOption(option.value);
                }}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  backgroundColor: index === highlightedIndex ? '#cce5ff' : (option.value === previousValueRef.current ? '#e3f2fd' : 'white'),
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: '13px',
                  transition: 'background-color 0.15s',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word'
                }}
                onMouseEnter={(e) => {
                  if (index !== highlightedIndex) {
                    e.currentTarget.style.backgroundColor = '#cce5ff';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    index === highlightedIndex ? '#cce5ff' : (option.value === previousValueRef.current ? '#e3f2fd' : 'white');
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

// Impact Process Stream Autocomplete Component - Separate component for impactProcessStream field
export const ImpactProcessStreamAutocomplete = ({
  value,
  onChange,
  options = [],
  error = false,
  width = '180px',
  disabled = false,
  readonly = false
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
  const inputRef = useRef(null);
  const listRef = useRef(null);
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
    if (!isUserEditingRef.current && !isExternalChangeRef.current) {
      const matchingOption = value ? options.find(opt => opt.value === value) : null;
      setInputVal(matchingOption ? matchingOption.label : (value || ''));
    }

    if (isExternalChangeRef.current) {
      isExternalChangeRef.current = false;
    }
  }, [value, options]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const listElement = listRef.current;
      const highlightedElement = listElement.children[highlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [highlightedIndex, isOpen]);

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

    if (!wasSelectionMade && previousValueRef.current) {
      // Restore the previous value
      onChangeRef.current(previousValueRef.current);
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
    const capitalizedVal = val.charAt(0).toUpperCase() + val.slice(1);
    setInputVal(capitalizedVal);
    setIsOpen(true);
    setHighlightedIndex(-1);
    isUserEditingRef.current = true;

    // Don't call onChange here - only update when selection is confirmed
  };

  const handleKeyDown = (e) => {
    // Handle Tab key to close dropdown
    if (e.key === 'Tab') {
      if (isOpen) {
        handleCloseDropdown(false);
      }
      return; // Allow default Tab behavior
    }

    // Handle arrow keys to open dropdown if closed
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();

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

    // Blur the input so next click will trigger onFocus and clear the value
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.blur();
      }
      isSelectingRef.current = false;
    }, 50);
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
          inputRef={inputRef}
          value={inputVal}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          InputProps={{
            readOnly: disabled || readonly
          }}
          onFocus={() => {
            if (!disabled && !readonly && !isShiftTabRef.current) {
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
          placeholder={readonly ? "-" : "Select from list..."}
          size="small"
          error={error}
          sx={{
            width: width,
            '& .MuiInputBase-root': {
              backgroundColor: (disabled || readonly) ? '#f5f5f5' : 'white',
              fontSize: '13px',
              fontFamily: 'inherit',
            },
            '& .MuiInputBase-input': {
              padding: '6px 30px 6px 10px',
              fontSize: '13px',
              color: (disabled || readonly) ? 'black' : 'inherit'
            },
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: error ? '#dc2626' : '#ddd',
                borderRadius: '3px',
              },
              '&:hover fieldset': {
                borderColor: error ? '#dc2626' : '#ddd',
              },
              '&.Mui-focused fieldset': {
                borderColor: error ? '#dc2626' : '#007bff',
                borderWidth: '1px',
              },
              '&.Mui-disabled fieldset': {
                borderColor: '#ddd',
              }
            },
            '& .MuiInputLabel-root': {
              display: 'none',
            },
          }}
        />
        {!disabled && !readonly && (
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
        )}
      </div>

      {isOpen && (
        <div
          ref={listRef}
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
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={`${option.value}-${index}`}
                onMouseDown={(e) => {
                  // Use onMouseDown to capture selection BEFORE any blur/click-outside events
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectOption(option.value);
                }}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  backgroundColor: index === highlightedIndex ? '#cce5ff' : (option.value === previousValueRef.current ? '#e3f2fd' : 'white'),
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: '13px',
                  transition: 'background-color 0.15s',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word'
                }}
                onMouseEnter={(e) => {
                  if (index !== highlightedIndex) {
                    e.currentTarget.style.backgroundColor = '#cce5ff';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    index === highlightedIndex ? '#cce5ff' : (option.value === previousValueRef.current ? '#e3f2fd' : 'white');
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

// Application Autocomplete Component
export const ApplicationAutocomplete = ({
  value,
  onChange,
  options = [],
  error = false,
  width = '180px',
  disabled = false,
  readonly = false
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
  const inputRef = useRef(null);
  const listRef = useRef(null);
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
    if (!isUserEditingRef.current && !isExternalChangeRef.current) {
      const matchingOption = value ? options.find(opt => opt.value === value) : null;
      setInputVal(matchingOption ? matchingOption.label : (value || ''));
    }

    if (isExternalChangeRef.current) {
      isExternalChangeRef.current = false;
    }
  }, [value, options]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const listElement = listRef.current;
      const highlightedElement = listElement.children[highlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Handle closing dropdown - restore previous value if no selection was made
  const handleCloseDropdown = (wasSelectionMade = false) => {
    if (!isOpenRef.current) {
      return;
    }

    if (selectionMadeRef.current) {
      selectionMadeRef.current = false;
      setIsOpen(false);
      setHighlightedIndex(-1);
      isUserEditingRef.current = false;
      return;
    }

    if (!wasSelectionMade && previousValueRef.current) {
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

  const openDropdown = () => {
    previousValueRef.current = value;
    const matchingOption = options.find(opt => opt.value === value);
    previousInputValRef.current = matchingOption ? matchingOption.label : (value || '');
    selectionMadeRef.current = false;

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
    isUserEditingRef.current = true;
  };

  const handleKeyDown = (e) => {
    // Handle Tab key to close dropdown
    if (e.key === 'Tab') {
      if (isOpen) {
        handleCloseDropdown(false);
      }
      return; // Allow default Tab behavior
    }

    // Handle arrow keys to open dropdown if closed
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();

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
    const selectedOption = options.find(opt => opt.value === optionValue);
    const displayLabel = selectedOption ? selectedOption.label : optionValue;

    selectionMadeRef.current = true;
    isSelectingRef.current = true;
    isExternalChangeRef.current = true;

    previousValueRef.current = optionValue;
    previousInputValRef.current = displayLabel;

    onChangeRef.current(optionValue);
    setInputVal(displayLabel);
    setIsOpen(false);
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.blur();
      }
      isSelectingRef.current = false;
    }, 50);
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
          inputRef={inputRef}
          value={inputVal}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          InputProps={{
            readOnly: disabled || readonly
          }}
          onFocus={() => {
            if (!disabled && !readonly && !isShiftTabRef.current) {
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
            width: width,
            '& .MuiInputBase-root': {
              backgroundColor: (disabled || readonly) ? '#f5f5f5' : 'white',
              fontSize: '13px',
              fontFamily: 'inherit',
            },
            '& .MuiInputBase-input': {
              padding: '6px 30px 6px 10px',
              fontSize: '13px',
              color: (disabled || readonly) ? 'black' : 'inherit'
            },
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: error ? '#dc2626' : '#ddd',
                borderRadius: '3px',
              },
              '&:hover fieldset': {
                borderColor: error ? '#dc2626' : '#ddd',
              },
              '&.Mui-focused fieldset': {
                borderColor: error ? '#dc2626' : '#007bff',
                borderWidth: '1px',
              },
              '&.Mui-disabled fieldset': {
                borderColor: '#ddd',
              }
            },
            '& .MuiInputLabel-root': {
              display: 'none',
            },
          }}
        />
        {!disabled && !readonly && (
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
        )}
      </div>

      {isOpen && (
        <div
          ref={listRef}
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
                  backgroundColor: index === highlightedIndex ? '#cce5ff' : (option.value === previousValueRef.current ? '#e3f2fd' : 'white'),
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: '13px',
                  transition: 'background-color 0.15s',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word'
                }}
                onMouseEnter={(e) => {
                  if (index !== highlightedIndex) {
                    e.currentTarget.style.backgroundColor = '#cce5ff';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    index === highlightedIndex ? '#cce5ff' : (option.value === previousValueRef.current ? '#e3f2fd' : 'white');
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

// Impact Application Autocomplete Component
export const ImpactApplicationAutocomplete = ({
  value,
  onChange,
  options = [],
  error = false,
  width = '180px',
  disabled = false,
  readonly = false
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
  const inputRef = useRef(null);
  const listRef = useRef(null);
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
    if (!isUserEditingRef.current && !isExternalChangeRef.current) {
      const matchingOption = value ? options.find(opt => opt.value === value) : null;
      setInputVal(matchingOption ? matchingOption.label : (value || ''));
    }

    if (isExternalChangeRef.current) {
      isExternalChangeRef.current = false;
    }
  }, [value, options]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const listElement = listRef.current;
      const highlightedElement = listElement.children[highlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Handle closing dropdown - restore previous value if no selection was made
  const handleCloseDropdown = (wasSelectionMade = false) => {
    if (!isOpenRef.current) {
      return;
    }

    if (selectionMadeRef.current) {
      selectionMadeRef.current = false;
      setIsOpen(false);
      setHighlightedIndex(-1);
      isUserEditingRef.current = false;
      return;
    }

    if (!wasSelectionMade && previousValueRef.current) {
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

  const openDropdown = () => {
    previousValueRef.current = value;
    const matchingOption = options.find(opt => opt.value === value);
    previousInputValRef.current = matchingOption ? matchingOption.label : (value || '');
    selectionMadeRef.current = false;

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
    isUserEditingRef.current = true;
  };

  const handleKeyDown = (e) => {
    // Handle Tab key to close dropdown
    if (e.key === 'Tab') {
      if (isOpen) {
        handleCloseDropdown(false);
      }
      return; // Allow default Tab behavior
    }

    // Handle arrow keys to open dropdown if closed
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();

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
    const selectedOption = options.find(opt => opt.value === optionValue);
    const displayLabel = selectedOption ? selectedOption.label : optionValue;

    selectionMadeRef.current = true;
    isSelectingRef.current = true;
    isExternalChangeRef.current = true;

    previousValueRef.current = optionValue;
    previousInputValRef.current = displayLabel;

    onChangeRef.current(optionValue);
    setInputVal(displayLabel);
    setIsOpen(false);
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.blur();
      }
      isSelectingRef.current = false;
    }, 50);
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
          inputRef={inputRef}
          value={inputVal}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          InputProps={{
            readOnly: disabled || readonly
          }}
          onFocus={() => {
            if (!disabled && !readonly && !isShiftTabRef.current) {
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
          placeholder={readonly ? "-" : "Select from list..."}
          size="small"
          error={error}
          sx={{
            width: width,
            '& .MuiInputBase-root': {
              backgroundColor: (disabled || readonly) ? '#f5f5f5' : 'white',
              fontSize: '13px',
              fontFamily: 'inherit',
            },
            '& .MuiInputBase-input': {
              padding: '6px 30px 6px 10px',
              fontSize: '13px',
              color: (disabled || readonly) ? 'black' : 'inherit'
            },
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: error ? '#dc2626' : '#ddd',
                borderRadius: '3px',
              },
              '&:hover fieldset': {
                borderColor: error ? '#dc2626' : '#ddd',
              },
              '&.Mui-focused fieldset': {
                borderColor: error ? '#dc2626' : '#007bff',
                borderWidth: '1px',
              },
              '&.Mui-disabled fieldset': {
                borderColor: '#ddd',
              }
            },
            '& .MuiInputLabel-root': {
              display: 'none',
            },
          }}
        />
        {!disabled && !readonly && (
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
        )}
      </div>

      {isOpen && (
        <div
          ref={listRef}
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
                  backgroundColor: index === highlightedIndex ? '#cce5ff' : (option.value === previousValueRef.current ? '#e3f2fd' : 'white'),
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: '13px',
                  transition: 'background-color 0.15s',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word'
                }}
                onMouseEnter={(e) => {
                  if (index !== highlightedIndex) {
                    e.currentTarget.style.backgroundColor = '#cce5ff';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    index === highlightedIndex ? '#cce5ff' : (option.value === previousValueRef.current ? '#e3f2fd' : 'white');
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

// L0 Process Autocomplete Component
export const L0ProcessAutocomplete = ({
  value,
  onChange,
  options = [],
  error = false,
  width = '180px',
  disabled = false,
  readonly = false
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
  const inputRef = useRef(null);
  const listRef = useRef(null);
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
    if (!isUserEditingRef.current && !isExternalChangeRef.current) {
      const matchingOption = value ? options.find(opt => opt.value === value) : null;
      setInputVal(matchingOption ? matchingOption.label : (value || ''));
    }

    if (isExternalChangeRef.current) {
      isExternalChangeRef.current = false;
    }
  }, [value, options]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const listElement = listRef.current;
      const highlightedElement = listElement.children[highlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Handle closing dropdown - restore previous value if no selection was made
  const handleCloseDropdown = (wasSelectionMade = false) => {
    if (!isOpenRef.current) {
      return;
    }

    if (selectionMadeRef.current) {
      selectionMadeRef.current = false;
      setIsOpen(false);
      setHighlightedIndex(-1);
      isUserEditingRef.current = false;
      return;
    }

    if (!wasSelectionMade && previousValueRef.current) {
      onChangeRef.current(previousValueRef.current);
      setInputVal(previousInputValRef.current);
    }
    setIsOpen(false);
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
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

  const openDropdown = () => {
    previousValueRef.current = value;
    const matchingOption = options.find(opt => opt.value === value);
    previousInputValRef.current = matchingOption ? matchingOption.label : (value || '');
    selectionMadeRef.current = false;

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
    isUserEditingRef.current = true;
  };

  const handleKeyDown = (e) => {
    // Handle Tab key to close dropdown
    if (e.key === 'Tab') {
      if (isOpen) {
        handleCloseDropdown(false);
      }
      return; // Allow default Tab behavior
    }

    // Handle arrow keys to open dropdown if closed
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();

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
    const selectedOption = options.find(opt => opt.value === optionValue);
    const displayLabel = selectedOption ? selectedOption.label : optionValue;

    selectionMadeRef.current = true;
    isSelectingRef.current = true;
    isExternalChangeRef.current = true;

    previousValueRef.current = optionValue;
    previousInputValRef.current = displayLabel;

    onChangeRef.current(optionValue);
    setInputVal(displayLabel);
    setIsOpen(false);
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.blur();
      }
      isSelectingRef.current = false;
    }, 50);
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
          inputRef={inputRef}
          value={inputVal}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          InputProps={{
            readOnly: disabled || readonly
          }}
          onFocus={() => {
            if (!disabled && !readonly && !isShiftTabRef.current) {
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
            width: width,
            '& .MuiInputBase-root': {
              backgroundColor: (disabled || readonly) ? '#f5f5f5' : 'white',
              fontSize: '13px',
              fontFamily: 'inherit',
            },
            '& .MuiInputBase-input': {
              padding: '6px 30px 6px 10px',
              fontSize: '13px',
              color: (disabled || readonly) ? 'black' : 'inherit'
            },
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: error ? '#dc2626' : '#ddd',
                borderRadius: '3px',
              },
              '&:hover fieldset': {
                borderColor: error ? '#dc2626' : '#ddd',
              },
              '&.Mui-focused fieldset': {
                borderColor: error ? '#dc2626' : '#007bff',
                borderWidth: '1px',
              },
              '&.Mui-disabled fieldset': {
                borderColor: '#ddd',
              }
            },
            '& .MuiInputLabel-root': {
              display: 'none',
            },
          }}
        />
        {!disabled && !readonly && (
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
        )}
      </div>

      {isOpen && (
        <div
          ref={listRef}
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
                  backgroundColor: index === highlightedIndex ? '#cce5ff' : (option.value === previousValueRef.current ? '#e3f2fd' : 'white'),
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: '13px',
                  transition: 'background-color 0.15s',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word'
                }}
                onMouseEnter={(e) => {
                  if (index !== highlightedIndex) {
                    e.currentTarget.style.backgroundColor = '#cce5ff';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    index === highlightedIndex ? '#cce5ff' : (option.value === previousValueRef.current ? '#e3f2fd' : 'white');
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

// Impact L0 Process Autocomplete Component
export const ImpactL0ProcessAutocomplete = ({
  value,
  onChange,
  options = [],
  error = false,
  width = '180px',
  disabled = false,
  readonly = false
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
  const inputRef = useRef(null);
  const listRef = useRef(null);
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
    if (!isUserEditingRef.current && !isExternalChangeRef.current) {
      const matchingOption = value ? options.find(opt => opt.value === value) : null;
      setInputVal(matchingOption ? matchingOption.label : (value || ''));
    }

    if (isExternalChangeRef.current) {
      isExternalChangeRef.current = false;
    }
  }, [value, options]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const listElement = listRef.current;
      const highlightedElement = listElement.children[highlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Handle closing dropdown - restore previous value if no selection was made
  const handleCloseDropdown = (wasSelectionMade = false) => {
    if (!isOpenRef.current) {
      return;
    }

    if (selectionMadeRef.current) {
      selectionMadeRef.current = false;
      setIsOpen(false);
      setHighlightedIndex(-1);
      isUserEditingRef.current = false;
      return;
    }

    if (!wasSelectionMade && previousValueRef.current) {
      onChangeRef.current(previousValueRef.current);
      setInputVal(previousInputValRef.current);
    }
    setIsOpen(false);
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
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

  const openDropdown = () => {
    previousValueRef.current = value;
    const matchingOption = options.find(opt => opt.value === value);
    previousInputValRef.current = matchingOption ? matchingOption.label : (value || '');
    selectionMadeRef.current = false;

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
    isUserEditingRef.current = true;
  };

  const handleKeyDown = (e) => {
    // Handle Tab key to close dropdown
    if (e.key === 'Tab') {
      if (isOpen) {
        handleCloseDropdown(false);
      }
      return; // Allow default Tab behavior
    }

    // Handle arrow keys to open dropdown if closed
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();

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
    const selectedOption = options.find(opt => opt.value === optionValue);
    const displayLabel = selectedOption ? selectedOption.label : optionValue;

    selectionMadeRef.current = true;
    isSelectingRef.current = true;
    isExternalChangeRef.current = true;

    previousValueRef.current = optionValue;
    previousInputValRef.current = displayLabel;

    onChangeRef.current(optionValue);
    setInputVal(displayLabel);
    setIsOpen(false);
    setHighlightedIndex(-1);
    isUserEditingRef.current = false;

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.blur();
      }
      isSelectingRef.current = false;
    }, 50);
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
          inputRef={inputRef}
          value={inputVal}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          InputProps={{
            readOnly: disabled || readonly
          }}
          onFocus={() => {
            if (!disabled && !readonly && !isShiftTabRef.current) {
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
          placeholder={readonly ? "-" : "Select from list..."}
          size="small"
          error={error}
          sx={{
            width: width,
            '& .MuiInputBase-root': {
              backgroundColor: (disabled || readonly) ? '#f5f5f5' : 'white',
              fontSize: '13px',
              fontFamily: 'inherit',
            },
            '& .MuiInputBase-input': {
              padding: '6px 30px 6px 10px',
              fontSize: '13px',
              color: (disabled || readonly) ? 'black' : 'inherit'
            },
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: error ? '#dc2626' : '#ddd',
                borderRadius: '3px',
              },
              '&:hover fieldset': {
                borderColor: error ? '#dc2626' : '#ddd',
              },
              '&.Mui-focused fieldset': {
                borderColor: error ? '#dc2626' : '#007bff',
                borderWidth: '1px',
              },
              '&.Mui-disabled fieldset': {
                borderColor: '#ddd',
              }
            },
            '& .MuiInputLabel-root': {
              display: 'none',
            },
          }}
        />
        {!disabled && !readonly && (
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
        )}
      </div>

      {isOpen && (
        <div
          ref={listRef}
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
                  backgroundColor: index === highlightedIndex ? '#cce5ff' : (option.value === previousValueRef.current ? '#e3f2fd' : 'white'),
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: '13px',
                  transition: 'background-color 0.15s',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word'
                }}
                onMouseEnter={(e) => {
                  if (index !== highlightedIndex) {
                    e.currentTarget.style.backgroundColor = '#cce5ff';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    index === highlightedIndex ? '#cce5ff' : (option.value === previousValueRef.current ? '#e3f2fd' : 'white');
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

// Module Multi-Select Component
export const ModuleMultiSelect = ({
  value = [],
  onChange,
  options = [],
  error = false,
  width = '220px',
  disabled = false,
  readonly = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const multiselectRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Ensure value is always an array
  const selectedValues = Array.isArray(value) ? value : [];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (multiselectRef.current && !multiselectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const listElement = listRef.current;
      const highlightedElement = listElement.children[highlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const openDropdown = () => {
    setIsOpen(true);
    setSearchValue('');
    setHighlightedIndex(-1);
  };

  const handleToggleOption = (optionValue) => {
    const isSelected = selectedValues.includes(optionValue);
    let newSelectedValues;

    if (isSelected) {
      // Remove the option
      newSelectedValues = selectedValues.filter(val => val !== optionValue);
    } else {
      // Add the option
      newSelectedValues = [...selectedValues, optionValue];
    }

    onChange(newSelectedValues);
  };

  const handleRemoveTag = (optionValue) => {
    const newSelectedValues = selectedValues.filter(val => val !== optionValue);
    onChange(newSelectedValues);
  };

  const handleSearchChange = (e) => {
    setSearchValue(e.target.value);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e) => {
    // Handle Tab key to close dropdown
    if (e.key === 'Tab') {
      if (isOpen) {
        setIsOpen(false);
      }
      return; // Allow default Tab behavior
    }

    // Handle arrow keys to open dropdown if closed
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();

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
        handleToggleOption(filteredOptions[highlightedIndex].value);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  // Filter options based on search
  const filteredOptions = searchValue.trim() === ''
    ? options
    : options.filter(option =>
      option.label.toLowerCase().includes(searchValue.toLowerCase())
    );

  // Get display labels for selected values
  const selectedLabels = selectedValues.map(val => {
    const option = options.find(opt => opt.value === val);
    return option ? option.label : val;
  });

  return (
    <div
      style={{ position: 'relative', width: width, overflow: 'visible' }}
      ref={multiselectRef}
    >
      {/* Main input field */}
      <div
        style={{
          position: 'relative',
          border: error ? '1px solid #dc2626' : '1px solid #ddd',
          borderRadius: '3px',
          backgroundColor: (disabled || readonly) ? '#f5f5f5' : 'white',
          minHeight: '36px',
          padding: selectedLabels.length > 0 ? '8px 30px 12px 8px' : '4px 30px 4px 10px',
          cursor: (disabled || readonly) ? 'not-allowed' : 'text',
          fontSize: '13px',
          fontFamily: 'inherit',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '4px'
        }}
        onClick={() => {
          if (!disabled && !readonly) {
            setIsOpen(!isOpen);
            setSearchValue('');
            setHighlightedIndex(-1);
          }
        }}
      >
        {/* Display selected items as tags */}
        {selectedLabels.map((label, index) => (
          <span
            key={selectedValues[index]}
            style={{
              backgroundColor: '#f5f5f5',
              color: '#000',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              maxWidth: '280px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {label}
            <span
              style={{
                cursor: (disabled || readonly) ? 'default' : 'pointer',
                fontWeight: 'bold',
                fontSize: '12px',
                lineHeight: '1'
              }}
              onClick={(e) => {
                if (!disabled && !readonly) {
                  e.stopPropagation();
                  handleRemoveTag(selectedValues[index]);
                }
              }}
            >
              ×
            </span>
          </span>
        ))}

        {/* Search input */}
        <input
          value={searchValue}
          onChange={handleSearchChange}
          onKeyDown={handleKeyDown}
          placeholder={readonly ? "-" : (selectedLabels.length === 0 ? "Select modules..." : "")}
          readOnly={disabled || readonly}
          style={{
            border: 'none',
            outline: 'none',
            flex: 1,
            minWidth: '80px',
            fontSize: '13px',
            fontFamily: 'inherit',
            backgroundColor: 'transparent',
            cursor: (disabled || readonly) ? 'not-allowed' : 'text'
          }}
          onClick={(e) => e.stopPropagation()}
          onFocus={() => {
            if (!disabled && !readonly) {
              setIsOpen(true);
              setHighlightedIndex(-1);
            }
          }}
        />

        {/* Dropdown arrow */}
        <ChevronDown
          size={16}
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#666',
            cursor: 'pointer',
            pointerEvents: 'none'
          }}
        />
      </div>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          ref={listRef}
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
            maxHeight: '200px',
            overflowY: 'auto',
            marginTop: '2px'
          }}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={option.value}
                onClick={() => handleToggleOption(option.value)}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  backgroundColor: index === highlightedIndex ? '#cce5ff' : (selectedValues.includes(option.value) ? '#f5f5f5' : 'white'),
                  color: selectedValues.includes(option.value) ? '#000' : 'inherit',
                  borderBottom: index < filteredOptions.length - 1 ? '1px solid #f0f0f0' : 'none',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  if (index !== highlightedIndex) {
                    e.currentTarget.style.backgroundColor = '#cce5ff';
                  }
                  e.currentTarget.style.color = 'inherit';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    index === highlightedIndex ? '#cce5ff' : (selectedValues.includes(option.value) ? '#f5f5f5' : 'white');
                  e.currentTarget.style.color = selectedValues.includes(option.value) ? '#000' : 'inherit';
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option.value)}
                  onChange={() => { }} // Controlled by onClick
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ flex: 1 }}>{option.label}</span>
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
              {searchValue ? 'No matching modules found' : 'No modules available'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Wave Autocomplete - reuses RicewTypeAutocomplete implementation
export const WaveAutocomplete = RicewTypeAutocomplete;

// Rollout Autocomplete - reuses RicewTypeAutocomplete implementation
export const RolloutAutocomplete = RicewTypeAutocomplete;

// Wave Code Autocomplete
export const WaveCodeAutocomplete = ({
  value,
  onChange,
  options = [],
  error = false,
  width = '180px',
  disabled = false,
  readonly = false
}) => {
  // Transform options to show codes instead of labels
  const codeOptions = options.map(opt => ({
    value: opt.code || opt.value,
    label: opt.code || opt.value
  }));

  const getInitialValue = () => {
    if (!value) return '';
    const matchingOption = codeOptions.find(opt => opt.value === value);
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
    if (!isUserEditingRef.current && !isExternalChangeRef.current) {
      const matchingOption = value ? codeOptions.find(opt => opt.value === value) : null;
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

    if (!wasSelectionMade && previousValueRef.current) {
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
    const matchingOption = codeOptions.find(opt => opt.value === value);
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
    isUserEditingRef.current = true;
  };

  const handleKeyDown = (e) => {
    // Handle Tab key to close dropdown
    if (e.key === 'Tab') {
      if (isOpen) {
        handleCloseDropdown(false);
      }
      return; // Allow default Tab behavior
    }

    // Handle arrow keys to open dropdown if closed
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();

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
    const selectedOption = codeOptions.find(opt => opt.value === optionValue);
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

    // Blur the input so next click will trigger onFocus and clear the value
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.blur();
      }
      isSelectingRef.current = false;
    }, 50);
  };

  const normalizedInput = inputVal.toLowerCase().replace(/^\+/, '');
  const filteredOptions = normalizedInput.length === 0
    ? codeOptions
    : codeOptions.filter(option => {
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
          inputRef={inputRef}
          value={inputVal}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          InputProps={{
            readOnly: disabled || readonly
          }}
          onFocus={() => {
            if (!disabled && !readonly && !isShiftTabRef.current) {
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
          placeholder="Select Wave..."
          size="small"
          error={error}
          sx={{
            width: width,
            '& .MuiInputBase-root': {
              backgroundColor: (disabled || readonly) ? '#f5f5f5' : 'white',
              fontSize: '13px',
              fontFamily: 'inherit',
            },
            '& .MuiInputBase-input': {
              padding: '6px 30px 6px 10px',
              fontSize: '13px',
              color: (disabled || readonly) ? 'black' : 'inherit'
            },
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: error ? '#dc2626' : '#ddd',
                borderRadius: '3px',
              },
              '&:hover fieldset': {
                borderColor: error ? '#dc2626' : '#ddd',
              },
              '&.Mui-focused fieldset': {
                borderColor: error ? '#dc2626' : '#007bff',
                borderWidth: '1px',
              },
              '&.Mui-disabled fieldset': {
                borderColor: '#ddd',
              }
            },
            '& .MuiInputLabel-root': {
              display: 'none',
            },
          }}
        />
        {!disabled && !readonly && (
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
        )}
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
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={`${option.value}-${index}`}
                onMouseDown={(e) => {
                  // Use onMouseDown to capture selection BEFORE any blur/click-outside events
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectOption(option.value);
                }}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  backgroundColor: index === highlightedIndex ? '#cce5ff' : (option.value === previousValueRef.current ? '#e3f2fd' : 'white'),
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: '13px',
                  transition: 'background-color 0.15s',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word'
                }}
                onMouseEnter={(e) => {
                  if (index !== highlightedIndex) {
                    e.currentTarget.style.backgroundColor = '#cce5ff';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    index === highlightedIndex ? '#cce5ff' : (option.value === previousValueRef.current ? '#e3f2fd' : 'white');
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
              {inputVal ? 'No matching waves found' : 'Start typing to search...'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Rollout Code Autocomplete
export const RolloutCodeAutocomplete = ({
  value,
  onChange,
  options = [],
  error = false,
  width = '180px',
  disabled = false,
  readonly = false
}) => {
  // Transform options to show codes instead of labels
  const codeOptions = options.map(opt => ({
    value: opt.code || opt.value,
    label: opt.code || opt.value
  }));

  const getInitialValue = () => {
    if (!value) return '';
    const matchingOption = codeOptions.find(opt => opt.value === value);
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
    if (!isUserEditingRef.current && !isExternalChangeRef.current) {
      const matchingOption = value ? codeOptions.find(opt => opt.value === value) : null;
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

    if (!wasSelectionMade && previousValueRef.current) {
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
    const matchingOption = codeOptions.find(opt => opt.value === value);
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
    isUserEditingRef.current = true;
  };

  const handleKeyDown = (e) => {
    // Handle Tab key to close dropdown
    if (e.key === 'Tab') {
      if (isOpen) {
        handleCloseDropdown(false);
      }
      return; // Allow default Tab behavior
    }

    // Handle arrow keys to open dropdown if closed
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();

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
    const selectedOption = codeOptions.find(opt => opt.value === optionValue);
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

    // Blur the input so next click will trigger onFocus and clear the value
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.blur();
      }
      isSelectingRef.current = false;
    }, 50);
  };

  const normalizedInput = inputVal.toLowerCase().replace(/^\+/, '');
  const filteredOptions = normalizedInput.length === 0
    ? codeOptions
    : codeOptions.filter(option => {
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
          inputRef={inputRef}
          value={inputVal}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          InputProps={{
            readOnly: disabled || readonly
          }}
          onFocus={() => {
            if (!disabled && !readonly && !isShiftTabRef.current) {
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
          placeholder="Select Rollout..."
          size="small"
          error={error}
          sx={{
            width: width,
            '& .MuiInputBase-root': {
              backgroundColor: (disabled || readonly) ? '#f5f5f5' : 'white',
              fontSize: '13px',
              fontFamily: 'inherit',
            },
            '& .MuiInputBase-input': {
              padding: '6px 30px 6px 10px',
              fontSize: '13px',
              color: (disabled || readonly) ? 'black' : 'inherit'
            },
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: error ? '#dc2626' : '#ddd',
                borderRadius: '3px',
              },
              '&:hover fieldset': {
                borderColor: error ? '#dc2626' : '#ddd',
              },
              '&.Mui-focused fieldset': {
                borderColor: error ? '#dc2626' : '#007bff',
                borderWidth: '1px',
              },
              '&.Mui-disabled fieldset': {
                borderColor: '#ddd',
              }
            },
            '& .MuiInputLabel-root': {
              display: 'none',
            },
          }}
        />
        {!disabled && !readonly && (
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
        )}
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
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={`${option.value}-${index}`}
                onMouseDown={(e) => {
                  // Use onMouseDown to capture selection BEFORE any blur/click-outside events
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectOption(option.value);
                }}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  backgroundColor: index === highlightedIndex ? '#cce5ff' : (option.value === previousValueRef.current ? '#e3f2fd' : 'white'),
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: '13px',
                  transition: 'background-color 0.15s',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word'
                }}
                onMouseEnter={(e) => {
                  if (index !== highlightedIndex) {
                    e.currentTarget.style.backgroundColor = '#cce5ff';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    index === highlightedIndex ? '#cce5ff' : (option.value === previousValueRef.current ? '#e3f2fd' : 'white');
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
              {inputVal ? 'No matching rollouts found' : 'Start typing to search...'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Functional Owner Autocomplete
export const FunctionalOwnerAutocomplete = ({
  value,
  onChange,
  options = [],
  error = false,
  width = '180px',
  disabled = false,
  readonly = false
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
  const inputRef = useRef(null);
  const listRef = useRef(null);
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
    if (!isUserEditingRef.current && !isExternalChangeRef.current) {
      const matchingOption = value ? options.find(opt => opt.value === value) : null;
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

    if (!wasSelectionMade && previousValueRef.current) {
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
    const capitalizedVal = val.charAt(0).toUpperCase() + val.slice(1);
    setInputVal(capitalizedVal);
    setIsOpen(true);
    setHighlightedIndex(-1);
    isUserEditingRef.current = true;
  };

  const handleKeyDown = (e) => {
    // Handle arrow keys to open dropdown if closed
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();

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

    // Blur the input so next click will trigger onFocus and clear the value
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.blur();
      }
      isSelectingRef.current = false;
    }, 50);
  };

  const normalizedInput = inputVal.toLowerCase().replace(/^\+/, '');
  const filteredOptions = normalizedInput.length === 0
    ? options
    : options.filter(option => {
      const normalizedLabel = option.label.toLowerCase().replace(/^\+/, '');
      return normalizedLabel.startsWith(normalizedInput);
    });

  // Scroll highlighted item into view when using keyboard navigation
  React.useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const listElement = listRef.current;
      const highlightedElement = listElement.children[highlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [highlightedIndex, isOpen]);

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
          InputProps={{
            readOnly: disabled || readonly
          }}
          onFocus={() => {
            if (!disabled && !readonly && !isShiftTabRef.current) {
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
          placeholder="Select Functional Owner..."
          size="small"
          error={error}
          sx={{
            width: width,
            '& .MuiInputBase-root': {
              backgroundColor: (disabled || readonly) ? '#f5f5f5' : 'white',
              fontSize: '13px',
              fontFamily: 'inherit',
            },
            '& .MuiInputBase-input': {
              padding: '6px 30px 6px 10px',
              fontSize: '13px',
              color: (disabled || readonly) ? 'black' : 'inherit'
            },
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: error ? '#dc2626' : '#ddd',
                borderRadius: '3px',
              },
              '&:hover fieldset': {
                borderColor: error ? '#dc2626' : '#ddd',
              },
              '&.Mui-focused fieldset': {
                borderColor: error ? '#dc2626' : '#007bff',
                borderWidth: '1px',
              },
              '&.Mui-disabled fieldset': {
                borderColor: '#ddd',
              }
            },
            '& .MuiInputLabel-root': {
              display: 'none',
            },
          }}
        />
        {!disabled && !readonly && (
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
              // Prevent default to avoid blurring the input when clicking the icon
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
        )}
      </div>

      {isOpen && (
        <div
          ref={listRef}
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
                  // Use onMouseDown to capture selection BEFORE any blur/click-outside events
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectOption(option.value);
                }}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  backgroundColor: index === highlightedIndex ? '#cce5ff' : (option.value === previousValueRef.current ? '#e3f2fd' : 'white'),
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: '13px',
                  transition: 'background-color 0.15s',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word'
                }}
                onMouseEnter={(e) => {
                  if (index !== highlightedIndex) {
                    e.currentTarget.style.backgroundColor = '#cce5ff';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    index === highlightedIndex ? '#cce5ff' : (option.value === previousValueRef.current ? '#e3f2fd' : 'white');
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
              {inputVal ? 'No matching functional owners found' : 'Start typing to search...'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Technical Owner Autocomplete
export const TechnicalOwnerAutocomplete = ({
  value,
  onChange,
  options = [],
  error = false,
  width = '180px',
  disabled = false,
  readonly = false
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
    if (!isUserEditingRef.current && !isExternalChangeRef.current) {
      const matchingOption = value ? options.find(opt => opt.value === value) : null;
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

    if (!wasSelectionMade && previousValueRef.current) {
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
    const capitalizedVal = val.charAt(0).toUpperCase() + val.slice(1);
    setInputVal(capitalizedVal);
    setIsOpen(true);
    setHighlightedIndex(-1);
    isUserEditingRef.current = true;
  };

  const handleKeyDown = (e) => {
    // Handle arrow keys to open dropdown if closed
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();

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

    // Blur the input so next click will trigger onFocus and clear the value
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.blur();
      }
      isSelectingRef.current = false;
    }, 50);
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
          inputRef={inputRef}
          value={inputVal}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          InputProps={{
            readOnly: disabled || readonly
          }}
          onFocus={() => {
            if (!disabled && !readonly && !isShiftTabRef.current) {
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
          placeholder="Select Technical Owner..."
          size="small"
          error={error}
          sx={{
            width: width,
            '& .MuiInputBase-root': {
              backgroundColor: (disabled || readonly) ? '#f5f5f5' : 'white',
              fontSize: '13px',
              fontFamily: 'inherit',
            },
            '& .MuiInputBase-input': {
              padding: '6px 30px 6px 10px',
              fontSize: '13px',
              color: (disabled || readonly) ? 'black' : 'inherit'
            },
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: error ? '#dc2626' : '#ddd',
                borderRadius: '3px',
              },
              '&:hover fieldset': {
                borderColor: error ? '#dc2626' : '#ddd',
              },
              '&.Mui-focused fieldset': {
                borderColor: error ? '#dc2626' : '#007bff',
                borderWidth: '1px',
              },
              '&.Mui-disabled fieldset': {
                borderColor: '#ddd',
              }
            },
            '& .MuiInputLabel-root': {
              display: 'none',
            },
          }}
        />
        {!disabled && !readonly && (
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
              // Prevent default to avoid blurring the input when clicking the icon
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
        )}
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
                  // Use onMouseDown to capture selection BEFORE any blur/click-outside events
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectOption(option.value);
                }}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  backgroundColor: index === highlightedIndex ? '#cce5ff' : (option.value === previousValueRef.current ? '#e3f2fd' : 'white'),
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: '13px',
                  transition: 'background-color 0.15s',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word'
                }}
                onMouseEnter={(e) => {
                  if (index !== highlightedIndex) {
                    e.currentTarget.style.backgroundColor = '#cce5ff';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    index === highlightedIndex ? '#cce5ff' : (option.value === previousValueRef.current ? '#e3f2fd' : 'white');
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
              {inputVal ? 'No matching technical owners found' : 'Start typing to search...'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Generic Ricew Select Component (backward compatible)
export const RicewSelect = ({
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  error = false,
  width = '180px',
  disabled = false,
  readonly = false
}) => (
  <RicewTypeAutocomplete
    value={value}
    onChange={onChange}
    options={options}
    error={error}
    width={width}
    disabled={disabled}
    readonly={readonly}
  />
);

// Legal Entity Autocomplete
export const LegalEntityAutocomplete = ({
  value,
  onChange,
  options = [],
  error = false,
  width = '180px',
  disabled = false,
  readonly = false
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
    if (!isUserEditingRef.current && !isExternalChangeRef.current) {
      const matchingOption = value ? options.find(opt => opt.value === value) : null;
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

    if (!wasSelectionMade && previousValueRef.current) {
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
    const capitalizedVal = val.charAt(0).toUpperCase() + val.slice(1);
    setInputVal(capitalizedVal);
    setIsOpen(true);
    setHighlightedIndex(-1);
    isUserEditingRef.current = true;
  };

  const handleKeyDown = (e) => {
    // Handle arrow keys to open dropdown if closed
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();

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

    // Blur the input so next click will trigger onFocus and clear the value
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.blur();
      }
      isSelectingRef.current = false;
    }, 50);
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
          inputRef={inputRef}
          value={inputVal}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          InputProps={{
            readOnly: disabled || readonly
          }}
          onFocus={() => {
            if (!disabled && !readonly && !isShiftTabRef.current) {
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
          placeholder="Select Legal Entity..."
          size="small"
          error={error}
          sx={{
            width: width,
            '& .MuiInputBase-root': {
              backgroundColor: (disabled || readonly) ? '#f5f5f5' : 'white',
              fontSize: '13px',
              fontFamily: 'inherit',
            },
            '& .MuiInputBase-input': {
              padding: '6px 30px 6px 10px',
              fontSize: '13px',
              color: (disabled || readonly) ? 'black' : 'inherit'
            },
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: error ? '#dc2626' : '#ddd',
                borderRadius: '3px',
              },
              '&:hover fieldset': {
                borderColor: error ? '#dc2626' : '#ddd',
              },
              '&.Mui-focused fieldset': {
                borderColor: error ? '#dc2626' : '#007bff',
                borderWidth: '1px',
              },
              '&.Mui-disabled fieldset': {
                borderColor: '#ddd',
              }
            },
            '& .MuiInputLabel-root': {
              display: 'none',
            },
          }}
        />
        {!disabled && !readonly && (
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
        )}
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
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={`${option.value}-${index}`}
                onMouseDown={(e) => {
                  // Use onMouseDown to capture selection BEFORE any blur/click-outside events
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectOption(option.value);
                }}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  backgroundColor: index === highlightedIndex ? '#cce5ff' : (option.value === previousValueRef.current ? '#e3f2fd' : 'white'),
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: '13px',
                  transition: 'background-color 0.15s',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word'
                }}
                onMouseEnter={(e) => {
                  if (index !== highlightedIndex) {
                    e.currentTarget.style.backgroundColor = '#cce5ff';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    index === highlightedIndex ? '#cce5ff' : (option.value === previousValueRef.current ? '#e3f2fd' : 'white');
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
              {inputVal ? 'No matching legal entities found' : 'Start typing to search...'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Complexity Autocomplete
export const ComplexityAutocomplete = ({
  value,
  onChange,
  options = [],
  error = false,
  width = '180px',
  disabled = false,
  readonly = false
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
    if (!isUserEditingRef.current && !isExternalChangeRef.current) {
      const matchingOption = value ? options.find(opt => opt.value === value) : null;
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

    if (!wasSelectionMade && previousValueRef.current) {
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
    const capitalizedVal = val.charAt(0).toUpperCase() + val.slice(1);
    setInputVal(capitalizedVal);
    setIsOpen(true);
    setHighlightedIndex(-1);
    isUserEditingRef.current = true;
  };

  const handleKeyDown = (e) => {
    // Handle Tab key to close dropdown
    if (e.key === 'Tab') {
      if (isOpen) {
        handleCloseDropdown(false);
      }
      return; // Allow default Tab behavior
    }

    // Handle arrow keys to open dropdown if closed
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();

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

    // Blur the input so next click will trigger onFocus and clear the value
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.blur();
      }
      isSelectingRef.current = false;
    }, 50);
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
          inputRef={inputRef}
          value={inputVal}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          InputProps={{
            readOnly: disabled || readonly
          }}
          onFocus={() => {
            if (!disabled && !readonly && !isShiftTabRef.current) {
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
          placeholder="Select Complexity..."
          size="small"
          error={error}
          sx={{
            width: width,
            '& .MuiInputBase-root': {
              backgroundColor: (disabled || readonly) ? '#f5f5f5' : 'white',
              fontSize: '13px',
              fontFamily: 'inherit',
            },
            '& .MuiInputBase-input': {
              padding: '6px 30px 6px 10px',
              fontSize: '13px',
              color: (disabled || readonly) ? 'black' : 'inherit'
            },
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: error ? '#dc2626' : '#ddd',
                borderRadius: '3px',
              },
              '&:hover fieldset': {
                borderColor: error ? '#dc2626' : '#ddd',
              },
              '&.Mui-focused fieldset': {
                borderColor: error ? '#dc2626' : '#007bff',
                borderWidth: '1px',
              },
              '&.Mui-disabled fieldset': {
                borderColor: '#ddd',
              }
            },
            '& .MuiInputLabel-root': {
              display: 'none',
            },
          }}
        />
        {!disabled && !readonly && (
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
        )}
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
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={`${option.value}-${index}`}
                onMouseDown={(e) => {
                  // Use onMouseDown to capture selection BEFORE any blur/click-outside events
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectOption(option.value);
                }}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  backgroundColor: index === highlightedIndex ? '#cce5ff' : (option.value === previousValueRef.current ? '#e3f2fd' : 'white'),
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: '13px',
                  transition: 'background-color 0.15s',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word'
                }}
                onMouseEnter={(e) => {
                  if (index !== highlightedIndex) {
                    e.currentTarget.style.backgroundColor = '#cce5ff';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    index === highlightedIndex ? '#cce5ff' : (option.value === previousValueRef.current ? '#e3f2fd' : 'white');
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
              No matching complexity found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// RICEW Status Autocomplete
export const RicewStatusAutocomplete = ({
  value,
  onChange,
  options = [],
  error = false,
  width = '180px',
  disabled = false,
  readonly = false
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
    if (!isUserEditingRef.current && !isExternalChangeRef.current) {
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

    if (!wasSelectionMade && previousValueRef.current) {
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
    const capitalizedVal = val.charAt(0).toUpperCase() + val.slice(1);
    setInputVal(capitalizedVal);
    setIsOpen(true);
    setHighlightedIndex(-1);
    isUserEditingRef.current = true;
  };

  const handleKeyDown = (e) => {
    // Handle Tab key to close dropdown
    if (e.key === 'Tab') {
      if (isOpen) {
        handleCloseDropdown(false);
      }
      return; // Allow default Tab behavior
    }

    // Handle arrow keys to open dropdown if closed
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();

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

    // Blur the input so next click will trigger onFocus and clear the value
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.blur();
      }
      isSelectingRef.current = false;
    }, 50);
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
          inputRef={inputRef}
          value={inputVal}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          InputProps={{
            readOnly: disabled || readonly
          }}
          onFocus={() => {
            if (!disabled && !readonly && !isShiftTabRef.current && !isTabRef.current) {
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
          placeholder="Select RICEW Status..."
          size="small"
          error={error}
          sx={{
            width: width,
            '& .MuiInputBase-root': {
              backgroundColor: (disabled || readonly) ? '#f5f5f5' : 'white',
              fontSize: '13px',
              fontFamily: 'inherit',
            },
            '& .MuiInputBase-input': {
              padding: '6px 30px 6px 10px',
              fontSize: '13px',
              color: (disabled || readonly) ? 'black' : 'inherit'
            },
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: error ? '#dc2626' : '#ddd',
                borderRadius: '3px',
              },
              '&:hover fieldset': {
                borderColor: error ? '#dc2626' : '#ddd',
              },
              '&.Mui-focused fieldset': {
                borderColor: error ? '#dc2626' : '#007bff',
                borderWidth: '1px',
              },
              '&.Mui-disabled fieldset': {
                borderColor: '#ddd',
              }
            },
            '& .MuiInputLabel-root': {
              display: 'none',
            },
          }}
        />
        {!disabled && !readonly && (
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
        )}
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
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={`${option.value}-${index}`}
                onMouseDown={(e) => {
                  // Use onMouseDown to capture selection BEFORE any blur/click-outside events
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectOption(option.value);
                }}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  backgroundColor: index === highlightedIndex ? '#cce5ff' : (option.value === previousValueRef.current ? '#e3f2fd' : 'white'),
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: '13px',
                  transition: 'background-color 0.15s',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word'
                }}
                onMouseEnter={(e) => {
                  if (index !== highlightedIndex) {
                    e.currentTarget.style.backgroundColor = '#cce5ff';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    index === highlightedIndex ? '#cce5ff' : (option.value === previousValueRef.current ? '#e3f2fd' : 'white');
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
              No matching status found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Cross Stream Impact Autocomplete
export const CrossStreamImpactAutocomplete = ({
  value,
  onChange,
  options = [],
  error = false,
  width = '180px',
  disabled = false,
  readonly = false
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
    if (!isUserEditingRef.current && !isExternalChangeRef.current) {
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

    if (!wasSelectionMade && previousValueRef.current) {
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
    const capitalizedVal = val.charAt(0).toUpperCase() + val.slice(1);
    setInputVal(capitalizedVal);
    setIsOpen(true);
    setHighlightedIndex(-1);
    isUserEditingRef.current = true;
  };

  const handleKeyDown = (e) => {
    // Handle Tab key to close dropdown
    if (e.key === 'Tab') {
      if (isOpen) {
        handleCloseDropdown(false);
      }
      return; // Allow default Tab behavior
    }

    // Handle arrow keys to open dropdown if closed
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();

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

    // Blur the input so next click will trigger onFocus and clear the value
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.blur();
      }
      isSelectingRef.current = false;
    }, 50);
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
          inputRef={inputRef}
          value={inputVal}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          InputProps={{
            readOnly: disabled || readonly
          }}
          onFocus={() => {
            if (!disabled && !readonly && !isShiftTabRef.current) {
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
          placeholder="Select Cross Stream Impact..."
          size="small"
          error={error}
          sx={{
            width: width,
            '& .MuiInputBase-root': {
              backgroundColor: (disabled || readonly) ? '#f5f5f5' : 'white',
              fontSize: '13px',
              fontFamily: 'inherit',
            },
            '& .MuiInputBase-input': {
              padding: '6px 30px 6px 10px',
              fontSize: '13px',
              color: (disabled || readonly) ? 'black' : 'inherit'
            },
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: error ? '#dc2626' : '#ddd',
                borderRadius: '3px',
              },
              '&:hover fieldset': {
                borderColor: error ? '#dc2626' : '#ddd',
              },
              '&.Mui-focused fieldset': {
                borderColor: error ? '#dc2626' : '#007bff',
                borderWidth: '1px',
              },
              '&.Mui-disabled fieldset': {
                borderColor: '#ddd',
              }
            },
            '& .MuiInputLabel-root': {
              display: 'none',
            },
          }}
        />
        {!disabled && !readonly && (
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
        )}
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
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={`${option.value}-${index}`}
                onMouseDown={(e) => {
                  // Use onMouseDown to capture selection BEFORE any blur/click-outside events
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectOption(option.value);
                }}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  backgroundColor: index === highlightedIndex ? '#cce5ff' : (option.value === previousValueRef.current ? '#e3f2fd' : 'white'),
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: '13px',
                  transition: 'background-color 0.15s',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word'
                }}
                onMouseEnter={(e) => {
                  if (index !== highlightedIndex) {
                    e.currentTarget.style.backgroundColor = '#cce5ff';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    index === highlightedIndex ? '#cce5ff' : (option.value === previousValueRef.current ? '#e3f2fd' : 'white');
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
              No matching impact found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

