import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Edit, Trash2, X, Save, MoreVertical, Calendar, ChevronLeft, ChevronRight, Lock, Unlock, HelpCircle, Plus, AlertCircle } from 'lucide-react';
import { TextField, MenuItem, Select, FormControl } from '@mui/material';
import DOMPurify from 'dompurify';
import { CustomDatePicker } from '../Resource Roster Form/Components';

import { useNavigate } from 'react-router-dom';
import useLOV from '../../hooks/useLOV';
import { useAuth } from '../../context/AuthContext';
import { useSession } from '../../context/SessionContext';
import SessionExpiredPopup from '../SessionExpiredPopup';



// Local Custom Date Picker Component for Contract Dates
const RicewDatePicker = ({ value, onChange, placeholder, error = false, onError, onFocus, clearDateValidationError, disabled = false }) => {
  // Define formatDateForDisplay first, before using it
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

  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    // Initialize to the selected date's month if available, otherwise today
    if (value) {
      const selectedDate = new Date(value);
      if (!isNaN(selectedDate.getTime())) {
        return new Date(selectedDate.getFullYear(), selectedDate.getMonth());
      }
    }
    return new Date();
  });
  const [inputValue, setInputValue] = useState(formatDateForDisplay(value));
  const [inputError, setInputError] = useState('');
  const calendarRef = useRef(null);
  const isUserEditingRef = useRef(false);
  const pendingValueRef = useRef(null);

  useEffect(() => {
    // Only update input value when prop value changes AND user is not actively editing
    if (!isUserEditingRef.current) {
      setInputValue(formatDateForDisplay(value));
      setInputError('');

      // Update currentMonth to show the selected date's month when value changes
      if (value) {
        const selectedDate = new Date(value);
        if (!isNaN(selectedDate.getTime())) {
          setCurrentMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth()));
        }
      }
    }
  }, [value]);

  // Auto-scroll when calendar opens
  useEffect(() => {
    if (isOpen && calendarRef.current) {
      // Small delay to ensure the calendar is rendered
      setTimeout(() => {
        // Find the calendar popup element (the absolute positioned div)
        const calendarPopup = calendarRef.current.querySelector('div[style*="position: absolute"]');
        if (calendarPopup) {
          calendarPopup.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'nearest'
          });
        }
      }, 10);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const parseManualDate = (displayValue) => {
    if (!displayValue) return { date: null, error: null };

    let day, month, year;
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

    // Try parsing dd-mmm-yyyy format (e.g., 12-Oct-2025)
    let parts = displayValue.split('-');
    if (parts.length === 3 && isNaN(parts[1])) {
      const dayStr = parts[0].trim();
      const monthStr = parts[1].trim();
      const yearStr = parts[2].trim();

      // Validate day
      if (!/^\d{1,2}$/.test(dayStr)) {
        return { date: null, error: 'Day must be 1-2 digits' };
      }
      day = parseInt(dayStr, 10);
      if (day < 1 || day > 31) {
        return { date: null, error: 'Day must be between 1 and 31' };
      }

      // Validate month
      if (!/^[a-zA-Z]{3}$/.test(monthStr)) {
        return { date: null, error: 'Month must be 3 letters' };
      }
      const monthIndex = monthNames.indexOf(monthStr.toUpperCase());
      if (monthIndex === -1) {
        return { date: null, error: 'Invalid month abbreviation' };
      }
      month = monthIndex;

      // Validate year
      if (!/^\d{4}$/.test(yearStr)) {
        return { date: null, error: 'Year must be 4 digits' };
      }
      year = parseInt(yearStr, 10);

      // Construct date string directly to avoid timezone issues
      return { date: `${year.toString().padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`, error: null };
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
            return { date: `${year.toString().padStart(4, '0')}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`, error: null };
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
          return { date: `${year.toString().padStart(4, '0')}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`, error: null };
        }
      }
    }

    return { date: null, error: 'Invalid format (dd-mmm-yyyy)' };
  };

  const handleDateSelect = (day) => {
    if (!day) return;

    const selectedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const apiDate = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    onChange(apiDate);
    onError && onError(null); // Clear any input errors
    setIsOpen(false);
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    // Clear any pending validation state while user is typing
    pendingValueRef.current = null;
    // Clear date validation errors when user starts typing
    clearDateValidationError && clearDateValidationError();
  };

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div style={{ position: 'relative', width: '180px', overflow: 'visible' }} ref={calendarRef}>
      <div style={{ position: 'relative', overflow: 'visible' }}>
        <TextField
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => {
            if (disabled) return;
            isUserEditingRef.current = true;
            // Clear input errors when user starts editing
            setInputError('');
            onError && onError(null);
            // Call external onFocus callback if provided
            onFocus && onFocus();
            // Clear date validation errors when user starts editing
            clearDateValidationError && clearDateValidationError();
          }}
          onBlur={() => {
            // When user leaves the field, validate the input
            setTimeout(() => {
              if (inputValue === '') {
                // Empty field - clear everything
                onChange('');
                pendingValueRef.current = null;
                setInputError('');
                onError && onError(null);
              } else {
                // Non-empty input - validate it
                const parsed = parseManualDate(inputValue);
                if (parsed.date) {
                  // Valid date - commit it
                  onChange(parsed.date);
                  setInputValue(formatDateForDisplay(parsed.date));
                  setInputError('');
                  onError && onError(null);
                  pendingValueRef.current = null;
                } else {
                  // Invalid input - show error
                  setInputError(parsed.error || 'Invalid format (dd-mmm-yyyy)');
                  onError && onError(parsed.error || 'Invalid format (dd-mmm-yyyy)');
                  pendingValueRef.current = null;
                }
              }
              isUserEditingRef.current = false;
            }, 200);
          }}
          placeholder={placeholder}
          size="small"
          error={error}
          disabled={disabled}
          sx={{
            width: '180px',
            '& .MuiInputBase-root': {
              backgroundColor: disabled ? '#f5f5f5' : 'white',
              fontSize: '13px',
              fontFamily: 'inherit',
            },
            '& .MuiInputBase-input': {
              padding: '6px 30px 6px 10px',
              fontSize: '13px',
              color: disabled ? '#999' : 'inherit',
              cursor: disabled ? 'not-allowed' : 'text',
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
        <Calendar
          size={16}
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: disabled ? '#ccc' : '#666',
            cursor: disabled ? 'not-allowed' : 'pointer',
            pointerEvents: 'auto',
            zIndex: 2
          }}
          onClick={() => {
            if (disabled) return;
            setIsOpen(!isOpen);
          }}
        />
      </div>

      {inputError && <div style={{ color: '#dc2626', fontSize: '10.5px', fontWeight: '500', marginTop: '4px' }}>{inputError}</div>}

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: '0',
          zIndex: 1000,
          backgroundColor: 'white',
          border: '1px solid #ddd',
          borderRadius: '4px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          width: '280px',
          padding: '16px',
          marginTop: '4px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <button
              type="button"
              onClick={() => navigateMonth(-1)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#666',
                padding: '4px'
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontWeight: '600', color: '#333' }}>
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </span>
            <button
              type="button"
              onClick={() => navigateMonth(1)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#666',
                padding: '4px'
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Week Days Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '4px',
            marginBottom: '8px'
          }}>
            {weekDays.map(day => (
              <div key={day} style={{
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: '600',
                color: '#666',
                padding: '4px'
              }}>
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '4px'
          }}>
            {getDaysInMonth(currentMonth).map((day, index) => {
              // Check if this day is the selected date
              const isSelectedDate = day && value &&
                currentMonth.getFullYear() === new Date(value).getFullYear() &&
                currentMonth.getMonth() === new Date(value).getMonth() &&
                day === new Date(value).getDate();

              return (
                <button
                  type="button"
                  key={index}
                  onClick={() => handleDateSelect(day)}
                  disabled={!day}
                  style={{
                    padding: '8px',
                    border: isSelectedDate ? '2px solid #007bff' : 'none',
                    borderRadius: '4px',
                    backgroundColor: isSelectedDate ? '#007bff' : (day ? '#f8f9fa' : 'transparent'),
                    color: isSelectedDate ? 'white' : (day ? '#333' : 'transparent'),
                    cursor: day ? 'pointer' : 'default',
                    fontSize: '14px',
                    fontWeight: isSelectedDate ? '600' : '400',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (day && !isSelectedDate) e.target.style.backgroundColor = '#e3f2fd';
                  }}
                  onMouseLeave={(e) => {
                    if (day && !isSelectedDate) e.target.style.backgroundColor = '#f8f9fa';
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Today Button */}
          <div style={{ marginTop: '12px', textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                handleDateSelect(today.getDate());
                setCurrentMonth(new Date(today.getFullYear(), today.getMonth()));
              }}
              style={{
                padding: '6px 12px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

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
          onFocus={() => {
            if (value && !isShiftTabRef.current && !isTabRef.current) {
              setInputVal('');
              onChange('');
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
                onChange('');
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

const RicewEffortAndCostEstimate = ({ onClose, selectedProject, setUnsavedChangesChecker }) => {
  const navigate = useNavigate();
  const { handleAuthError, userId, projectId, projectName } = useSession();
  const { getCachedToken } = useAuth();
  const [showNoProjectSelectedPopup, setShowNoProjectSelectedPopup] = useState(false);

  useEffect(() => {
    if (!selectedProject?.id && !projectId) {
      setShowNoProjectSelectedPopup(true);
    }
  }, [selectedProject?.id, projectId]);

  const currentProjectId = (projectId || selectedProject?.id || '').toString();
  const [data, setData] = useState([]);
  const [isSaved, setIsSaved] = useState(false);

  const [changedItems, setChangedItems] = useState(new Set());
  const [isFirstSave, setIsFirstSave] = useState(true);
  const [savedItemIds, setSavedItemIds] = useState(new Set());
  const [hasNewRow, setHasNewRow] = useState(false);
  const [hasActiveChanges, setHasActiveChanges] = useState(false);
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
  const [startDate, setStartDate] = useState('');
  const [startDateError, setStartDateError] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endDateError, setEndDateError] = useState('');
  const [yoyEfficiency, setYoyEfficiency] = useState('');
  const [rateIncrement, setRateIncrement] = useState('');
  const [projectedYearsData, setProjectedYearsData] = useState([]);
  const [primaryOrgData, setPrimaryOrgData] = useState(null);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('');
  const [projectDates, setProjectDates] = useState({ startDate: '', endDate: '' });


  const [selectedBusinessLine, setSelectedBusinessLine] = useState('');
  const [serviceLineOptions, setServiceLineOptions] = useState([]);
  const [fiscalYearLabel, setFiscalYearLabel] = useState('');
  const [showProjectedColumns, setShowProjectedColumns] = useState(false);
  const [effortRateCardName, setEffortRateCardName] = useState('');
  const [effortRateCardNameError, setEffortRateCardNameError] = useState('');
  const [rateCardCode, setRateCardCode] = useState('');
  const [rateCardCodeError, setRateCardCodeError] = useState('');
  const [selectedEffortRateCardIndex, setSelectedEffortRateCardIndex] = useState(null);
  const [pendingProjectedData, setPendingProjectedData] = useState(null);
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [originalEfficiencyValues, setOriginalEfficiencyValues] = useState({ fy1Efficiency: '', fy1RateInc: '' });
  const [baseDataFromAPI, setBaseDataFromAPI] = useState([]);
  const [originalEffortRateCardName, setOriginalEffortRateCardName] = useState('');
  const [originalRateCardCode, setOriginalRateCardCode] = useState('');

  // Lock/Unlock functionality
  const [isLocked, setIsLocked] = useState(false);
  const [lockingUnlocking, setLockingUnlocking] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  // Draft functionality
  const [isDraft, setIsDraft] = useState(false);
  const [showHelpPopup, setShowHelpPopup] = useState(false);

  const validateAndSanitizeData = (data) => {
    if (!Array.isArray(data)) return [];
    return data.map(item => ({
      ricewName: DOMPurify.sanitize(String(item.Estimation_Name || '').trim(), { ALLOWED_TAGS: [] }),
      complexity: DOMPurify.sanitize(String(item.ComplexityType || '').trim(), { ALLOWED_TAGS: [] }),
      isActive: item.ActiveStatus === "true" || item.ActiveStatus === true,
      totalHours: DOMPurify.sanitize(String(item.Total_Hours_Base || item.Total_Hours || '0').trim(), { ALLOWED_TAGS: [] }),
      costIncludingContingency: DOMPurify.sanitize(String(item.Total_Cost_Base || item.Cost_Including_Contingency || '0').trim(), { ALLOWED_TAGS: [] }),
      projectId: item.project_id || currentProjectId,
      estimation_model_id: item.RICEW_Effort_Cost_Rate_Card_id || null,
      isNew: false
    }));
  };
  const effortRateCardNameOptions = []; // Empty since API is removed

  // Helper function to format date to DD-MMM-YYYY
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Helper function to generate fiscal year label from fiscal end date year
  const generateFiscalYearLabel = (fiscalEndDate) => {
    if (!fiscalEndDate) return '';
    const endYear = new Date(fiscalEndDate).getFullYear();
    return `FY${endYear.toString().slice(-2)}`;
  };

  // Returns the start year of the fiscal year period that contains projectStart.
  // Searches projectYear-1 through projectYear+1 to cover all boundary cases.
  const getFiscalYearContaining = (projectStart, fyStartMonth, fyStartDay, fyEndMonth, fyEndDay, fyYearDiff) => {
    const projectYear = projectStart.getFullYear();
    for (let y = projectYear - 1; y <= projectYear + 1; y++) {
      const fyStart = new Date(y, fyStartMonth, fyStartDay);
      const fyEnd = new Date(y + fyYearDiff, fyEndMonth, fyEndDay);
      if (projectStart >= fyStart && projectStart <= fyEnd) {
        return y;
      }
    }
    return projectYear; // fallback
  };

  // Compute FY1 dates: keep month/day from stored fiscal dates, derive year from project start date.
  // Defined early so fiscalYearLabel useEffect can depend on it and stay in sync automatically.
  const adjustedFiscalDates = React.useMemo(() => {
    if (!startDate || !primaryOrgData?.fiscal_start_date || !primaryOrgData?.fiscal_end_date) {
      return { start: null, end: null };
    }
    const fiscalStart = new Date(primaryOrgData.fiscal_start_date);
    const fiscalEnd = new Date(primaryOrgData.fiscal_end_date);
    const yearDiff = fiscalEnd.getFullYear() - fiscalStart.getFullYear();
    const adjStartYear = getFiscalYearContaining(
      new Date(startDate),
      fiscalStart.getMonth(), fiscalStart.getDate(),
      fiscalEnd.getMonth(), fiscalEnd.getDate(),
      yearDiff
    );
    const adjEndYear = adjStartYear + yearDiff;
    return {
      start: `${adjStartYear}-${String(fiscalStart.getMonth() + 1).padStart(2, '0')}-${String(fiscalStart.getDate()).padStart(2, '0')}`,
      end: `${adjEndYear}-${String(fiscalEnd.getMonth() + 1).padStart(2, '0')}-${String(fiscalEnd.getDate()).padStart(2, '0')}`
    };
  }, [startDate, primaryOrgData?.fiscal_start_date, primaryOrgData?.fiscal_end_date]);

  // Fetch project planned dates from project definition API
  useEffect(() => {
    const abortController = new AbortController();
    const fetchProjectDates = async () => {
      const pId = selectedProject?.id || projectId;
      if (!pId) return;
      try {
        const idToken = await getCachedToken();
        if (!idToken) {
          handleAuthError('Authentication required');
          return;
        }
        
        const response = await fetch(`https://hp60d1srbb.execute-api.ap-south-1.amazonaws.com/New/newApi/project/summaryByGSI?project_id=${encodeURIComponent(pId)}`, {
          headers: { 'Authorization': `Bearer ${idToken}` },
          signal: abortController.signal
        });

        if (response.status === 401 || response.status === 403) {
          handleAuthError('Unauthorized - session expired');
          return;
        }

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data && result.data.length > 0) {
            const newProjectDates = {
              startDate: result.data[0].Planned_Start_Date || '',
              endDate: result.data[0].Planned_End_Date || ''
            };
            setProjectDates(newProjectDates);
            // Auto-populate startDate and endDate from project planned dates
            if (newProjectDates.startDate) setStartDate(newProjectDates.startDate);
            if (newProjectDates.endDate) setEndDate(newProjectDates.endDate);
          }
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('Error fetching project dates:', err);
        handleAuthError(err.message);
      }
    };
    fetchProjectDates();
    return () => abortController.abort();
  }, [selectedProject?.id, projectId, getCachedToken]);

  // Fetch organization options using useLOV hook
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

  // Derive service line options when organization changes
  useEffect(() => {
    if (selectedOrganizationId && organizationOptions.length > 0) {
      const selectedOrg = organizationOptions.find(opt => opt.value === selectedOrganizationId);
      if (selectedOrg) {
        // Update primaryOrgData with all metadata from selected organization
        setPrimaryOrgData({
          SI_organization_name: selectedOrg.label,
          SI_Organization_Details_id: selectedOrg.value,
          organization_id: selectedOrg.organization_id || selectedOrg.value,
          fiscal_start_date: selectedOrg.fiscal_start_date || null,
          fiscal_end_date: selectedOrg.fiscal_end_date || null,
        });

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
        setPrimaryOrgData(null);
        setServiceLineOptions([]);
        setSelectedBusinessLine('');
      }
    } else {
      setPrimaryOrgData(null);
      setServiceLineOptions([]);
      setSelectedBusinessLine('');
    }
  }, [selectedOrganizationId, organizationOptions]);

  // fiscalYearLabel is always derived from adjustedFiscalDates.end so it never goes stale.
  useEffect(() => {
    if (adjustedFiscalDates.end) {
      setFiscalYearLabel(`FY${new Date(adjustedFiscalDates.end).getFullYear().toString().slice(-2)}`);
    } else {
      setFiscalYearLabel('');
    }
  }, [adjustedFiscalDates.end]);

  // Handle Organization Change
  const handleOrganizationChange = (newValue) => {
    // Clear all existing rate card specific values first
    clearRateCardSpecificValues();
    setSelectedOrganizationId(newValue);
  };

  // Reset selection when project changes
  useEffect(() => {
    setSelectedOrganizationId('');
    setSelectedBusinessLine('');
  }, [selectedProject?.id, projectId]);

  // Function to clear only rate card specific values while preserving selections that trigger them
  const clearRateCardSpecificValues = () => {
    setEffortRateCardName('');
    setRateCardCode('');
    setSelectedEffortRateCardIndex(null);
    setStartDate(projectDates.startDate || '');
    setEndDate(projectDates.endDate || '');
    setYoyEfficiency('');
    setRateIncrement('');
    setProjectedYearsData([]);
    setPendingProjectedData(null);
    setShowProjectedColumns(false);
    setData([]);
    setOriginalData([]);
    setBaseDataFromAPI([]);
    setChangedItems(new Set());
    setHasActiveChanges(false);
    setEditingItem(null);
    setEditValues({});
    setIsLocked(false);
    setIsDraft(false);
    setIsUpdateMode(false);
    setEffortRateCardNameError('');
    setRateCardCodeError('');
    setStartDateError('');
    setEndDateError('');
    setOriginalEfficiencyValues({ fy1Efficiency: '', fy1RateInc: '' });
    setOriginalEffortRateCardName('');
  };

  // Auto-generate Effort & Rate Card Name and Rate Card Code in Create Mode
  useEffect(() => {
    if (!isUpdateMode && primaryOrgData?.SI_organization_name && selectedBusinessLine) {

      const generatedName = `${primaryOrgData.SI_organization_name} - ${selectedBusinessLine}`;

      // Generate a code: YOY prefix and Ratecard suffix (using only the last part)
      const lastServiceLinePart = selectedBusinessLine.split(':').pop().trim();
      const blPart = lastServiceLinePart.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toUpperCase();
      const generatedCode = `YOY-${blPart}-Ratecard`;

      setEffortRateCardName(generatedName);
      setRateCardCode(generatedCode);

      // Clear validation errors
      if (effortRateCardNameError) setEffortRateCardNameError('');
      if (rateCardCodeError) setRateCardCodeError('');
    }
  }, [primaryOrgData, selectedBusinessLine, isUpdateMode]);

  const showConfirmation = (message, action) => {
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setShowConfirmDialog(true);
  };

  // Handle Lock/Unlock functionality
  const handleLockUnlock = async () => {
    if (!selectedEffortRateCardIndex) {
      setErrorMessage('Please select an Effort Rate Card first');
      setShowErrorMessage(true);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 5000);
      return;
    }

    try {
      setLockingUnlocking(true);
      const newLockedState = !isLocked;

      const payload = {
        Effort_Rate_Card_Name_index: selectedEffortRateCardIndex.toString(),
        isLocked: newLockedState.toString(),
        updated_by: userId
      };

      console.log('Calling lock/unlock API with payload:', payload);

      const idToken = await getCachedToken();
      if (!idToken) {
        handleAuthError('Authentication required');
        setLockingUnlocking(false);
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
      };

      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      const response = await fetch('https://hp60d1srbb.execute-api.ap-south-1.amazonaws.com/New/newApi/ricew/effortCostRateCard/updateLocked', {
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
        setSuccessMessage(`Table ${newLockedState ? 'locked' : 'unlocked'} successfully! ${result.updatedCount || 0} records updated.`);
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
      handleAuthError(error.message);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 5000);
    } finally {
      setLockingUnlocking(false);
    }
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

  // Helper function to calculate adjusted value based on percentage
  const calculateAdjustedValue = (baseValue, efficiencyPercent, rateIncrementPercent = 0) => {
    if (!baseValue) return baseValue;

    const base = parseFloat(baseValue) || 0;
    const efficiency = parseFloat(efficiencyPercent) || 0;
    const rateInc = parseFloat(rateIncrementPercent) || 0;

    // For hours: Apply efficiency adjustment
    // Base Hours × (1 + efficiency/100)
    // If efficiency is -6, it will subtract 6% from base
    // If efficiency is 6, it will add 6% to base
    const adjustedValue = base * (1 + efficiency / 100);

    // For cost: Apply both efficiency and rate increment
    // Base Cost × (1 + efficiency/100) × (1 + rateIncrement/100)
    const adjustedWithRate = adjustedValue * (1 + rateInc / 100);

    const finalValue = rateIncrementPercent !== 0 ? adjustedWithRate : adjustedValue;

    // Return value with up to 2 decimal places (remove trailing zeros)
    return parseFloat(finalValue.toFixed(2));
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

  // Function to fetch data by Effort Rate Card Name Index
  const fetchDataByRateCardIndex = async (index) => {
    setLoading(true);
    try {
      const baseDataMap = {};

      const idToken = await getCachedToken();
      if (!idToken) {
        handleAuthError('Authentication required');
        setLoading(false);
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
      };

      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      const response = await fetch(`https://6ooh8kh7i4.execute-api.ap-south-1.amazonaws.com/New/ricew/effortCostRateCard/getByProject?Effort_Rate_Card_Name_index=${index}`, {
        method: 'GET',
        headers: headers
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch rate card data');
      }

      const result = await response.json();
      console.log('Rate Card API response:', result);

      if (result.success && result.data && result.data.length > 0) {
        const firstRecord = result.data[0];
        const sanitizedData = validateAndSanitizeData(result.data);

        // Set header fields first
        setEffortRateCardName(firstRecord.Effort_Rate_Card_Name || '');
        setRateCardCode(firstRecord.Rate_Card_Code || '');
        setStartDate(projectDates.startDate || firstRecord.Contract_Start_Date || '');
        setEndDate(projectDates.endDate || firstRecord.Contract_End_Date || '');
        setOriginalEffortRateCardName(firstRecord.Effort_Rate_Card_Name || '');
        setOriginalRateCardCode(firstRecord.Rate_Card_Code || '');

        // Set Organization and Service Line from loaded record
        if (firstRecord.Organization_Name) {
          setPrimaryOrgData({
            SI_organization_name: firstRecord.Organization_Name,
            SI_Organization_Details_id: firstRecord.Organization_Name
          });
          setSelectedBusinessLine(firstRecord.Business_Line || '');
        }

        // Extract isLocked status from the first record
        if (firstRecord.isLocked !== undefined) {
          const lockedStatus = firstRecord.isLocked === 'true' || firstRecord.isLocked === true;
          setIsLocked(lockedStatus);
          console.log('Lock status set to:', lockedStatus);
        }

        // Extract isDraft status from the first record
        if (firstRecord.isDraft !== undefined) {
          const draftStatus = firstRecord.isDraft === 'true' || firstRecord.isDraft === true;
          setIsDraft(draftStatus);
          console.log('Draft status set to:', draftStatus);
        } else {
          setIsDraft(false);
        }

        // Extract fiscal year information from first record
        // Base fiscal year (Fiscal Year 1)
        const fy1Efficiency = firstRecord.Fiscal_Year_1_Effort_Efficiency || '';
        const fy1RateInc = firstRecord.Fiscal_Year_1_Rate_Increment || '';

        setYoyEfficiency(fy1Efficiency);
        setRateIncrement(fy1RateInc);

        // Store original efficiency values from backend
        setOriginalEfficiencyValues({
          fy1Efficiency: fy1Efficiency,
          fy1RateInc: fy1RateInc
        });

        // Build projected years data with original values
        const projectedYears = [];
        let yearIndex = 2;
        while (firstRecord[`Fiscal_Year_${yearIndex}_Name`]) {
          const efficiencyValue = firstRecord[`Fiscal_Year_${yearIndex}_Effort_Efficiency`];
          const rateIncrementValue = firstRecord[`Fiscal_Year_${yearIndex}_Rate_Increment`];

          projectedYears.push({
            fiscalLabel: firstRecord[`Fiscal_Year_${yearIndex}_Name`] || '',
            startDate: firstRecord[`Fiscal_Year_${yearIndex}_Start_Date`] || '',
            endDate: firstRecord[`Fiscal_Year_${yearIndex}_End_Date`] || '',
            efficiency: efficiencyValue !== undefined && efficiencyValue !== null ? String(efficiencyValue) : '',
            rateIncrement: rateIncrementValue !== undefined && rateIncrementValue !== null ? String(rateIncrementValue) : '',
            originalEfficiency: efficiencyValue !== undefined && efficiencyValue !== null ? String(efficiencyValue) : '',
            originalRateIncrement: rateIncrementValue !== undefined && rateIncrementValue !== null ? String(rateIncrementValue) : ''
          });
          yearIndex++;
        }

        console.log('Projected Years Data:', projectedYears);

        // Transform and sanitize API data
        const transformedData = sanitizedData.map((sanitizedItem, idx) => {
          const item = result.data[idx];
          const record = {
            ...sanitizedItem,
            id: idx + 1,
            originalActive: sanitizedItem.isActive,
            originalTotalHours: sanitizedItem.totalHours,
            originalCostIncludingContingency: sanitizedItem.costIncludingContingency,
            projectedYears: {}
          };

          // Extract projected year data from backend
          let yearIndex = 2;
          while (item[`Fiscal_Year_${yearIndex}_Hours`]) {
            record.projectedYears[yearIndex] = {
              hours: item[`Fiscal_Year_${yearIndex}_Hours`],
              cost: item[`Fiscal_Year_${yearIndex}_Cost`]
            };
            yearIndex++;
          }

          return record;
        });

        // Set all state together - use pending data for projected years
        setData(transformedData);
        setOriginalData(transformedData.map(item => ({ ...item })));
        setBaseDataFromAPI(transformedData.map(item => ({ ...item })));
        setDataFromBackend(true);
        setShowProjectedColumns(projectedYears.length > 0);
        setIsUpdateMode(true); // Enable update mode when loading existing data

        // Store projected data in pending state - the useEffect will apply it after columns mount
        setPendingProjectedData(projectedYears);

        // Reset change flags after loading existing data
        setHasActiveChanges(false);
        setChangedItems(new Set());
        setHasNewRow(false);
      }
    } catch (error) {
      console.error('Error fetching rate card data:', error);
      handleAuthError(error.message);
    } finally {
      setLoading(false);
    }
  };


  // Function to fetch base data or existing rate card by Service Line
  const fetchDataByServiceLine = async (orgId, serviceLineName) => {
    if (!orgId || !serviceLineName) return;

    setLoading(true);
    try {
      const idToken = await getCachedToken();
      if (!idToken) {
        handleAuthError('Authentication required');
        setLoading(false);
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
      };

      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      // Step 0: Always fetch OG Base Estimates from the base estimates API
      console.log('Fetching OG base estimates from RICEWEffortCostEstimate API...');
      const ogResponse = await fetch(`https://hp60d1srbb.execute-api.ap-south-1.amazonaws.com/New/newApi/ricew/RICEWEffortCostEstimate/getByServiceLine?project_id=${currentProjectId}&organization_id=${orgId}&service_line_name=${encodeURIComponent(serviceLineName)}`, {
        method: 'GET',
        headers: headers
      });

      if (ogResponse.status === 401 || ogResponse.status === 403) {
        handleAuthError('Unauthorized - session expired');
        return;
      }

      const ogResult = await ogResponse.json();
      const ogDataMap = {};
      let ogCurrency = '';

      if (ogResult.success && ogResult.data) {
        ogResult.data.forEach(item => {
          const key = `${item.Estimation_Name}_${item.ComplexityType}`;
          ogDataMap[key] = {
            totalHours: item.Total_Hours || '0',
            cost: item.Cost_Including_Contingency || '0'
          };
          if (!ogCurrency && item.FS_Review_currency) {
            ogCurrency = extractCurrencyCode(item.FS_Review_currency);
          }
        });
      }

      // Step 1: Check if an existing Effort Rate Card exists for this Org and Service Line
      console.log('Checking for existing rate card for:', orgId, serviceLineName);
      const checkResponse = await fetch(`https://hp60d1srbb.execute-api.ap-south-1.amazonaws.com/New/newApi/ricew/effortCostRateCard/getByServiceLine?project_id=${currentProjectId}&organization_id=${orgId}&Service_Line_name=${encodeURIComponent(serviceLineName)}`, {
        method: 'GET',
        headers: headers
      });

      if (checkResponse.status === 401 || checkResponse.status === 403) {
        handleAuthError('Unauthorized - session expired');
        return;
      }

      if (checkResponse.ok) {
        const checkResult = await checkResponse.json();
        if (checkResult.success && checkResult.data && checkResult.data.length > 0) {
          console.log('Existing rate card found, loading data...');
          const existingData = checkResult.data;
          const firstRecord = existingData[0];

          // 1. Set Header Fields
          setEffortRateCardName(firstRecord.Effort_Rate_Card_Name || '');
          setRateCardCode(firstRecord.Rate_Card_Code || '');
          setStartDate(projectDates.startDate || firstRecord.Contract_Start_Date || '');
          setEndDate(projectDates.endDate || firstRecord.Contract_End_Date || '');
          setOriginalEffortRateCardName(firstRecord.Effort_Rate_Card_Name || '');
          if (firstRecord.Effort_Rate_Card_Name_index) {
            setSelectedEffortRateCardIndex(firstRecord.Effort_Rate_Card_Name_index);
          }

          // 2. Lock/Draft Status
          if (firstRecord.isLocked !== undefined) {
            setIsLocked(firstRecord.isLocked === 'true' || firstRecord.isLocked === true);
          }
          if (firstRecord.isDraft !== undefined) {
            setIsDraft(firstRecord.isDraft === 'true' || firstRecord.isDraft === true);
          }

          // 3. Fiscal Year 1 Efficiency & Rate
          const fy1Efficiency = firstRecord.Fiscal_Year_1_Effort_Efficiency || '0';
          const fy1RateInc = firstRecord.Fiscal_Year_1_Rate_Increment || '0';
          setYoyEfficiency(fy1Efficiency);
          setRateIncrement(fy1RateInc);
          setOriginalEfficiencyValues({ fy1Efficiency, fy1RateInc });
          setOriginalEffortRateCardName(firstRecord.Effort_Rate_Card_Name || '');
          setOriginalRateCardCode(firstRecord.Rate_Card_Code || '');

          if (ogCurrency) setCurrencyCode(ogCurrency);

          // 4. Projected Years Metadata
          const projectedYears = [];
          let yrIdx = 2;
          while (firstRecord[`Fiscal_Year_${yrIdx}_Name`]) {
            const eff = firstRecord[`Fiscal_Year_${yrIdx}_Effort_Efficiency`];
            const rate = firstRecord[`Fiscal_Year_${yrIdx}_Rate_Increment`];
            projectedYears.push({
              fiscalLabel: firstRecord[`Fiscal_Year_${yrIdx}_Name`] || '',
              startDate: firstRecord[`Fiscal_Year_${yrIdx}_Start_Date`] || '',
              endDate: firstRecord[`Fiscal_Year_${yrIdx}_End_Date`] || '',
              efficiency: eff !== undefined && eff !== null ? String(eff) : '0',
              rateIncrement: rate !== undefined && rate !== null ? String(rate) : '0',
              originalEfficiency: eff !== undefined && eff !== null ? String(eff) : '0',
              originalRateIncrement: rate !== undefined && rate !== null ? String(rate) : '0'
            });
            yrIdx++;
          }

          // 5. Transform and sanitize Record Data
          const transformedData = validateAndSanitizeData(existingData).map((sanitizedItem, idx) => {
            const item = existingData[idx];
            const record = {
              ...sanitizedItem,
              id: idx + 1,
              originalActive: sanitizedItem.isActive,
              originalTotalHours: sanitizedItem.totalHours,
              originalCostIncludingContingency: sanitizedItem.costIncludingContingency,
              projectedYears: {}
            };

            // Extract yearly metrics from saved data
            let y = 2;
            while (item[`Fiscal_Year_${y}_Hours`]) {
              record.projectedYears[y] = {
                hours: item[`Fiscal_Year_${y}_Hours`],
                cost: item[`Fiscal_Year_${y}_Cost`]
              };
              y++;
            }
            return record;
          });

          setData(transformedData);
          setOriginalData(transformedData.map(item => ({ ...item })));
          setBaseDataFromAPI(transformedData.map(item => ({ ...item })));
          setDataFromBackend(true);
          setShowProjectedColumns(projectedYears.length > 0);
          setPendingProjectedData(projectedYears);
          setIsUpdateMode(true); // Switch to Update Mode

          // Reset change flags after loading existing data
          setHasActiveChanges(false);
          setChangedItems(new Set());
          setHasNewRow(false);

          setLoading(false);
          return; // Stop here as we found and loaded existing data
        }
      }

      // Step 2: No existing rate card found, use OG data as base (Original Logic)
      console.log('No existing rate card found, using base estimates from OG API...');
      if (ogResult.success && ogResult.data) {
        const sanitizedOgData = validateAndSanitizeData(ogResult.data);
        const transformedData = sanitizedOgData.map((sanitizedItem, idx) => ({
          ...sanitizedItem,
          id: idx + 1,
          originalActive: sanitizedItem.isActive,
          originalTotalHours: sanitizedItem.totalHours,
          originalCostIncludingContingency: sanitizedItem.costIncludingContingency
        }));

        setData(transformedData);
        setOriginalData(transformedData.map(item => ({ ...item })));
        setBaseDataFromAPI(transformedData.map(item => ({ ...item })));
        setDataFromBackend(true);
        if (ogCurrency) setCurrencyCode(ogCurrency);
      }
    } catch (error) {
      console.error('Error fetching service line data:', error);
      if (error.message.includes('401') || error.message.includes('403')) {
        handleAuthError('Unauthorized - session expired');
      } else {
        setErrorMessage(error.message);
        setShowErrorMessage(true);
      }
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 5000);
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch fiscal dates for an organization
  const fetchFiscalDates = async (orgId) => {
    if (!orgId) return;

    try {
      const idToken = await getCachedToken();
      if (!idToken) {
        handleAuthError('Authentication required');
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
      };

      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      const response = await fetch(`https://hp60d1srbb.execute-api.ap-south-1.amazonaws.com/New/organization/getFiscalDates?project_id=${currentProjectId}&organization_id=${orgId}`, {
        method: 'GET',
        headers: headers
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch fiscal dates');
      }

      const result = await response.json();
      console.log('Fiscal Dates response:', result);

      if (result.success && result.data) {
        const { fiscal_start_date, fiscal_end_date } = result.data;
        // Do not set editable startDate/endDate here for new starts, only update primaryOrgData for headers

        // Update primaryOrgData with latest fiscal dates
        setPrimaryOrgData(prev => ({
          ...prev,
          fiscal_start_date: fiscal_start_date,
          fiscal_end_date: fiscal_end_date
        }));
      }
    } catch (error) {
      console.error('Error fetching fiscal dates:', error);
      handleAuthError(error.message);
    }
  };

  // Effect to trigger fetch when Org and Service Line are selected
  useEffect(() => {
    if (primaryOrgData?.SI_Organization_Details_id && selectedBusinessLine) {
      fetchDataByServiceLine(primaryOrgData.SI_Organization_Details_id, selectedBusinessLine);
      fetchFiscalDates(primaryOrgData.SI_Organization_Details_id);
    }
  }, [primaryOrgData?.SI_Organization_Details_id, selectedBusinessLine]);


  const handleCreateNew = () => {
    // Clear all rate card specific values first
    clearRateCardSpecificValues();

    // Reset Organization/Service Line selections (these are what trigger the fetches)
    setSelectedOrganizationId('');
    setSelectedBusinessLine('');
    setStartDate('');
  };

  useEffect(() => {
    // Default to Create New Rate Card UI on first load or when project changes
    handleCreateNew();
  }, [selectedProject?.id, projectId]);

  // Provide unsaved changes checker to parent component
  useEffect(() => {
    if (setUnsavedChangesChecker) {
      setUnsavedChangesChecker(() => () => {
        return hasNewRow || changedItems.size > 0 || editingItem !== null || hasActiveChanges;
      });
    }
  }, [hasNewRow, changedItems.size, editingItem, hasActiveChanges, setUnsavedChangesChecker]);

  // Handle re-calculating hasActiveChanges when user reverts changes manually
  useEffect(() => {
    const isDifferent =
      effortRateCardName !== originalEffortRateCardName ||
      rateCardCode !== originalRateCardCode ||
      yoyEfficiency !== originalEfficiencyValues.fy1Efficiency ||
      rateIncrement !== originalEfficiencyValues.fy1RateInc;

    // If the user has manually changed something back, update the flag
    if (!isDifferent && hasActiveChanges) {
      setHasActiveChanges(false);
    }
  }, [effortRateCardName, rateCardCode, yoyEfficiency, rateIncrement, originalEffortRateCardName, originalRateCardCode, originalEfficiencyValues, hasActiveChanges]);

  // Calculate projected years based on contract period
  const calculateProjectedYears = React.useCallback((customEndDate = null) => {
    const dateToUse = customEndDate || endDate;
    if (!startDate || !dateToUse || !primaryOrgData?.fiscal_start_date || !primaryOrgData?.fiscal_end_date) {
      return [];
    }

    const contractEnd = new Date(dateToUse);
    const baseFiscalStart = new Date(primaryOrgData.fiscal_start_date);
    const baseFiscalEnd = new Date(primaryOrgData.fiscal_end_date);

    // Get base fiscal year start and end months and days
    const baseStartMonth = baseFiscalStart.getMonth();
    const baseStartDay = baseFiscalStart.getDate();
    const baseEndMonth = baseFiscalEnd.getMonth();
    const baseEndDay = baseFiscalEnd.getDate();

    // Find the fiscal year that contains the project start date
    const storedYearDiff = baseFiscalEnd.getFullYear() - baseFiscalStart.getFullYear();
    const baseFiscalStartYear = getFiscalYearContaining(
      new Date(startDate),
      baseStartMonth, baseStartDay,
      baseEndMonth, baseEndDay,
      storedYearDiff
    );
    const baseFiscalEndYear = baseFiscalStartYear + storedYearDiff;

    const projectedYears = [];

    // Start from the year after the base fiscal year
    let yearIndex = 0;

    // Keep creating projected years until we exceed the contract end date
    while (true) {
      yearIndex++;

      // Calculate fiscal year label (show only end year)
      const fyStartYear = baseFiscalStartYear + yearIndex;
      const fyEndYear = baseFiscalEndYear + yearIndex;
      const fiscalLabel = `FY${fyEndYear.toString().slice(-2)}`;

      // Create projected fiscal year dates with same month/day as base, only year changed
      const projectedStartDate = new Date(fyStartYear, baseStartMonth, baseStartDay);
      const projectedEndDate = new Date(fyEndYear, baseEndMonth, baseEndDay);

      // If projected start date exceeds contract end, stop creating more years
      if (projectedStartDate > contractEnd) {
        break;
      }

      projectedYears.push({
        fiscalLabel,
        startDate: formatDate(projectedStartDate),
        endDate: formatDate(projectedEndDate),
        efficiency: '',
        rateIncrement: ''
      });

      // If projected start date for next year would exceed contract end, stop
      const nextYearStartDate = new Date(fyStartYear + 1, baseStartMonth, baseStartDay);
      if (nextYearStartDate > contractEnd) {
        break;
      }
    }

    return projectedYears;
  }, [startDate, endDate, primaryOrgData]);

  // Derived source of truth for all table loops (headers, inputs, data)
  const activeProjectedYears = React.useMemo(() => {
    const calculated = calculateProjectedYears();
    // Merge calculated metadata with existing user-entered state
    return calculated.map(calcYear => {
      const stateYear = Array.isArray(projectedYearsData)
        ? projectedYearsData.find(p => p.fiscalLabel === calcYear.fiscalLabel)
        : null;

      if (stateYear) {
        return {
          ...calcYear,
          efficiency: stateYear.efficiency,
          rateIncrement: stateYear.rateIncrement,
          originalEfficiency: stateYear.originalEfficiency,
          originalRateIncrement: stateYear.originalRateIncrement
        };
      }
      return calcYear;
    });
  }, [calculateProjectedYears, projectedYearsData]);
  
  const yearMultipliers = React.useMemo(() => {
    let cumulativeEff = 1;
    let cumulativeCost = 1;
    const baseEffFactor = (1 + (parseFloat(yoyEfficiency) || 0) / 100);
    const baseRateFactor = (1 + (parseFloat(rateIncrement) || 0) / 100);
    const baseCostFactor = baseEffFactor * baseRateFactor;

    return activeProjectedYears.map((yearData) => {
      const yearEffFactor = (1 + (parseFloat(yearData.efficiency) || 0) / 100);
      const yearRateFactor = (1 + (parseFloat(yearData.rateIncrement) || 0) / 100);
      
      cumulativeEff *= yearEffFactor;
      cumulativeCost *= yearEffFactor * yearRateFactor;

      return {
        hoursMult: baseEffFactor * cumulativeEff,
        costMult: baseCostFactor * cumulativeCost
      };
    });
  }, [activeProjectedYears, yoyEfficiency, rateIncrement]);

  // Sync state with derived years whenever the contract period changes
  useEffect(() => {
    if (activeProjectedYears.length !== projectedYearsData.length) {
      setProjectedYearsData(activeProjectedYears);
    }
  }, [activeProjectedYears, projectedYearsData.length]);

  useEffect(() => {
    if (startDate && endDate && primaryOrgData?.fiscal_start_date && primaryOrgData?.fiscal_end_date) {
      setShowProjectedColumns(true);
    } else {
      setShowProjectedColumns(false);
    }
  }, [startDate, endDate, primaryOrgData]);

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

  // Effect to populate projectedYearsData after columns are mounted
  useEffect(() => {
    if (pendingProjectedData) {
      requestAnimationFrame(() => {
        setProjectedYearsData(pendingProjectedData);
        setShowProjectedColumns(true);
        setPendingProjectedData(null);
      });
    }
  }, [pendingProjectedData]);

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
    } else if (['fsWriting', 'fsReview', 'tsWriting', 'tsReview', 'codeDevlopment', 'codeReview', 'unitTesting', 'technicalSupport', 'migrationDocCreation', 'migrationEffort', 'pglSupport', 'pmoEffort', 'costIncludingContingency', 'totalHours'].includes(fieldName)) {
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
    } else if (['fsWriting', 'fsReview', 'tsWriting', 'tsReview', 'codeDevlopment', 'codeReview', 'unitTesting', 'technicalSupport', 'migrationDocCreation', 'migrationEffort', 'pglSupport', 'pmoEffort', 'costIncludingContingency', 'totalHours'].includes(fieldName)) {
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
        costIncludingContingency: item.costIncludingContingency,
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

      // Remove this item from changedItems set after local save
      setChangedItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });

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

  const handleSubmit = async () => {
    try {
      // Clear previous errors
      setEffortRateCardNameError('');
      setRateCardCodeError('');
      setEndDateError('');

      // Validate required fields
      let hasError = false;

      if (!effortRateCardName || effortRateCardName.trim() === '') {
        setEffortRateCardNameError('Effort & Rate Card Name is required');
        hasError = true;
      } else {
        // Check if name already exists in LOV
        const nameExists = effortRateCardNameOptions.some(option =>
          option.label.toLowerCase() === effortRateCardName.trim().toLowerCase()
        );
        if (nameExists) {
          setEffortRateCardNameError('This Effort & Rate Card Name already exists');
          hasError = true;
        }
      }

      if (!rateCardCode || rateCardCode.trim() === '') {
        setRateCardCodeError('Rate Card Code is required');
        hasError = true;
      }

      if (!endDate) {
        setEndDateError('Planned End Date is required');
        hasError = true;
      }

      if (data.length === 0) {
        setErrorMessage('No data available to submit');
        setShowErrorMessage(true);
        setTimeout(() => setShowErrorMessage(false), 5000);
        return;
      }

      // If any validation failed, stop here
      if (hasError) {
        return;
      }

      setShowLoading(true);

      // Prepare fiscal years array
      const fiscal_years = [
        {
          fiscal_year_name: fiscalYearLabel,
          fiscal_year_start_date: formatDate(adjustedFiscalDates.start),
          fiscal_year_end_date: formatDate(adjustedFiscalDates.end),
          effort_efficiency: yoyEfficiency,
          rate_increment: rateIncrement
        },
        ...projectedYearsData.map(year => ({
          fiscal_year_name: year.fiscalLabel,
          fiscal_year_start_date: year.startDate,
          fiscal_year_end_date: year.endDate,
          effort_efficiency: year.efficiency,
          rate_increment: year.rateIncrement
        }))
      ];

      // Prepare records array
      // Prepare records array
      const records = data.map(item => {
        const rawHours = parseFloat(item.totalHours) || 0;
        const rawCost = parseFloat(item.costIncludingContingency) || 0;

        const fy1Efficiency = parseFloat(yoyEfficiency) || 0;
        const fy1RateIncrement = parseFloat(rateIncrement) || 0;

        // Calculate FY1 values: Base + FY1 Adjustment
        const fy1Hours = parseFloat((rawHours * (1 + fy1Efficiency / 100)).toFixed(2));
        const fy1Cost = parseFloat((rawCost * (1 + fy1RateIncrement / 100)).toFixed(2));

        const record = {
          Estimation_Name: item.ricewName,
          ComplexityType: item.complexity,
          ActiveStatus: item.isActive ? 'true' : 'false',
          isDraft: 'false',
          isLocked: 'false',
          Total_Hours_Base: rawHours.toString(), // Base is Raw
          Total_Cost_Base: rawCost.toString(),   // Base is Raw
          fiscal_year_data: {
            Fiscal_Year_1_Effort_Efficiency: yoyEfficiency || '0',
            Fiscal_Year_1_Rate_Increment: rateIncrement || '0',
            Fiscal_Year_1_Hours: fy1Hours.toString(), // FY1 is Calculated
            Fiscal_Year_1_Cost: fy1Cost.toString()    // FY1 is Calculated
          }
        };

        // Add projected year data
        if (showProjectedColumns) {
          let previousHours = fy1Hours; // Start from FY1
          let previousCost = fy1Cost;   // Start from FY1

          projectedYearsData.forEach((yearData, yearIndex) => {
            const fiscalYearNum = yearIndex + 2;
            const efficiencyValue = parseFloat(yearData.efficiency) || 0;
            const yearRateIncrementValue = parseFloat(yearData.rateIncrement) || 0;

            const currentHours = parseFloat((parseFloat(previousHours) * (1 + efficiencyValue / 100)).toFixed(2));
            const currentCost = parseFloat((parseFloat(previousCost) * (1 + yearRateIncrementValue / 100)).toFixed(2));

            record.fiscal_year_data[`Fiscal_Year_${fiscalYearNum}_Effort_Efficiency`] = yearData.efficiency || '0';
            record.fiscal_year_data[`Fiscal_Year_${fiscalYearNum}_Rate_Increment`] = yearData.rateIncrement || '0';
            record.fiscal_year_data[`Fiscal_Year_${fiscalYearNum}_Hours`] = currentHours.toString();
            record.fiscal_year_data[`Fiscal_Year_${fiscalYearNum}_Cost`] = currentCost.toString();

            previousHours = currentHours;
            previousCost = currentCost;
          });
        }

        return record;
      });

      // Prepare request body
      const requestBody = {
        project_id: currentProjectId,
        organization_id: (primaryOrgData?.SI_Organization_Details_id || '').toString(),
        Service_Line_name: selectedBusinessLine || '',
        Effort_Rate_Card_Name: effortRateCardName,
        Rate_Card_Code: rateCardCode,
        Contract_Start_Date: formatDate(startDate),
        Contract_End_Date: formatDate(endDate),
        OR_PL_Currency: currencyCode,
        Primary_Implementation_Partner: '',
        created_by: userId,
        updated_by: userId,
        fiscal_years,
        records
      };

      console.log('Submitting data:', requestBody);

      const idToken = await getCachedToken();
      if (!idToken) {
        handleAuthError('Authentication required');
        setLoading(false);
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
      };

      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      const response = await fetch('https://hp60d1srbb.execute-api.ap-south-1.amazonaws.com/New/newApi/ricew/effortCostRateCard/createByServiceLine', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        return;
      }

      const result = await response.json();

      if (response.ok && result.success) {
        setSuccessMessage(result.message || `Successfully created ${records.length} records`);
        setShowSuccessMessage(true);

        // If response contains effortRateCardNameIndex, automatically load the new rate card data
        if (result.effortRateCardNameIndex) {
          console.log('Auto-loading newly created rate card with index:', result.effortRateCardNameIndex);

          // Set the form state for the new rate card
          setSelectedEffortRateCardIndex(result.effortRateCardNameIndex);
          setIsUpdateMode(true); // Switch to update mode

          // Load the data for the newly created rate card
          await fetchDataByRateCardIndex(result.effortRateCardNameIndex);
        }

        setTimeout(() => {
          setShowSuccessMessage(false);
          setSuccessMessage('');
        }, 5000);
      } else {
        throw new Error(result.error || 'Failed to create records');
      }
    } catch (error) {
      console.error('Error submitting data:', error);
      handleAuthError(error.message);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 5000);
    } finally {
      setShowLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      // Validate required fields
      if (!effortRateCardName) {
        setErrorMessage('Effort & Rate Card Name is required');
        setShowErrorMessage(true);
        setTimeout(() => setShowErrorMessage(false), 5000);
        return;
      }

      // Check if name changed and if new name already exists
      if (effortRateCardName !== originalEffortRateCardName) {
        const nameExists = effortRateCardNameOptions.some(option =>
          option.label.toLowerCase() === effortRateCardName.trim().toLowerCase()
        );
        if (nameExists) {
          setErrorMessage('This Effort & Rate Card Name already exists');
          setShowErrorMessage(true);
          setTimeout(() => setShowErrorMessage(false), 5000);
          return;
        }
      }
      if (!rateCardCode) {
        setErrorMessage('Rate Card Code is required');
        setShowErrorMessage(true);
        setTimeout(() => setShowErrorMessage(false), 5000);
        return;
      }
      if (!startDate || !endDate) {
        setErrorMessage('Planned Start Date and End Date are required');
        setShowErrorMessage(true);
        setTimeout(() => setShowErrorMessage(false), 5000);
        return;
      }
      if (data.length === 0) {
        setErrorMessage('No data available to update');
        setShowErrorMessage(true);
        setTimeout(() => setShowErrorMessage(false), 5000);
        return;
      }

      setShowLoading(true);

      // Prepare records array for update
      // Note: Backend protected fields that won't be updated: project_id, created_by, created_timestamp,
      // Effort_Rate_Card_Name_index, RICEW_Effort_Cost_Rate_Card_id, ActiveStatus
      const records = data.map(item => {
        // Calculate base values using original base data
        const baseItem = baseDataFromAPI.find(b => b.id === item.id);
        const rawHours = baseItem ? parseFloat(baseItem.originalTotalHours) || 0 : parseFloat(item.totalHours) || 0;
        const rawCost = baseItem ? parseFloat(baseItem.originalCostIncludingContingency) || 0 : parseFloat(item.costIncludingContingency) || 0;

        const fy1Efficiency = parseFloat(yoyEfficiency) || 0;
        const fy1RateIncrement = parseFloat(rateIncrement) || 0;

        // Calculate FY1 values: Base + FY1 Adjustment
        const fy1Hours = parseFloat((rawHours * (1 + fy1Efficiency / 100)).toFixed(2));
        const fy1Cost = parseFloat((rawCost * (1 + fy1RateIncrement / 100)).toFixed(2));

        const record = {
          // Required field for identifying the record
          RICEW_Effort_Cost_Rate_Card_id: item.estimation_model_id,

          // Updatable fields
          Estimation_Name: item.ricewName,
          ComplexityType: item.complexity,
          Effort_Rate_Card_Name: effortRateCardName,
          Rate_Card_Code: rateCardCode,
          Contract_Start_Date: formatDate(startDate),
          Contract_End_Date: formatDate(endDate),
          Organization_Name: primaryOrgData?.SI_organization_name || '',
          Business_Line: selectedBusinessLine || '',

          // Fiscal Year 1 data
          Fiscal_Year_1_Name: fiscalYearLabel,
          Fiscal_Year_1_Start_Date: formatDate(adjustedFiscalDates.start),
          Fiscal_Year_1_End_Date: formatDate(adjustedFiscalDates.end),
          Fiscal_Year_1_Effort_Efficiency: yoyEfficiency || '0',
          Fiscal_Year_1_Rate_Increment: rateIncrement || '0',
          Fiscal_Year_1_Hours: fy1Hours.toString(),
          Fiscal_Year_1_Cost: fy1Cost.toString(),

          // Base values (Raw)
          Total_Hours_Base: rawHours.toString(),
          Total_Cost_Base: rawCost.toString(),
        };

        // Add projected year data (Fiscal_Year_2, Fiscal_Year_3, etc.)
        if (showProjectedColumns && projectedYearsData.length > 0) {
          let previousHours = fy1Hours; // Start from FY1
          let previousCost = fy1Cost;   // Start from FY1

          projectedYearsData.forEach((yearData, yearIndex) => {
            const fiscalYearNum = yearIndex + 2; // Start from Fiscal_Year_2
            const yearEfficiency = parseFloat(yearData.efficiency) || 0;
            const yearRateIncrement = parseFloat(yearData.rateIncrement) || 0;

            // Calculate projected hours and cost
            const currentHours = parseFloat((parseFloat(previousHours) * (1 + yearEfficiency / 100)).toFixed(2));
            const currentCost = parseFloat((parseFloat(previousCost) * (1 + yearRateIncrement / 100)).toFixed(2));

            // Add fiscal year metadata and calculated values
            record[`Fiscal_Year_${fiscalYearNum}_Name`] = yearData.fiscalLabel || '';
            record[`Fiscal_Year_${fiscalYearNum}_Start_Date`] = yearData.startDate || '';
            record[`Fiscal_Year_${fiscalYearNum}_End_Date`] = yearData.endDate || '';
            record[`Fiscal_Year_${fiscalYearNum}_Effort_Efficiency`] = yearData.efficiency || '0';
            record[`Fiscal_Year_${fiscalYearNum}_Rate_Increment`] = yearData.rateIncrement || '0';
            record[`Fiscal_Year_${fiscalYearNum}_Hours`] = currentHours.toString();
            record[`Fiscal_Year_${fiscalYearNum}_Cost`] = currentCost.toString();

            previousHours = currentHours;
            previousCost = currentCost;
          });
        }

        return record;
      });

      // Prepare request body
      const requestBody = {
        records,
        updated_by: userId,
        clearUnusedProjectColumns: true // Clear old fiscal year columns not in current update
      };

      // If the selected rate card is a draft, include Effort_Rate_Card_Name_index to set isDraft to false
      if (isDraft && selectedEffortRateCardIndex) {
        requestBody.Effort_Rate_Card_Name_index = selectedEffortRateCardIndex.toString();
      }

      console.log('Updating data:', requestBody);

      const idToken = await getCachedToken();
      if (!idToken) {
        handleAuthError('Authentication required');
        setLoading(false);
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
      };

      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      const response = await fetch('https://hp60d1srbb.execute-api.ap-south-1.amazonaws.com/New/newApi/ricew/effortCostRateCard/updateByServiceLine', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        return;
      }

      const result = await response.json();

      if (response.ok && result.success) {
        setSuccessMessage(`Successfully updated ${result.totalUpdated} records`);
        setShowSuccessMessage(true);
        setTimeout(() => {
          setShowSuccessMessage(false);
          setSuccessMessage('');
        }, 5000);

        // Refresh data after successful update
        if (selectedEffortRateCardIndex) {
          fetchDataByRateCardIndex(selectedEffortRateCardIndex);
        }

        // Reset change flags after successful update
        setHasActiveChanges(false);
        setChangedItems(new Set());
        setHasNewRow(false);
        setOriginalEffortRateCardName(effortRateCardName);
        setOriginalRateCardCode(rateCardCode);
        setOriginalEfficiencyValues({ fy1Efficiency: yoyEfficiency, fy1RateInc: rateIncrement });
      } else {
        throw new Error(result.error || 'Failed to update records');
      }
    } catch (error) {
      console.error('Error updating data:', error);
      setErrorMessage(error.message || 'Failed to update data. Please try again.');
      setShowErrorMessage(true);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 5000);
    } finally {
      setShowLoading(false);
    }
  };

  // Handle Save Draft functionality
  const handleSaveDraft = async () => {
    try {
      // Validate that we have a selected rate card
      if (!selectedEffortRateCardIndex) {
        setErrorMessage('Please select an Effort Rate Card first or create a new one before saving draft');
        setShowErrorMessage(true);
        setTimeout(() => setShowErrorMessage(false), 5000);
        return;
      }

      if (data.length === 0) {
        setErrorMessage('No data available to save as draft');
        setShowErrorMessage(true);
        setTimeout(() => setShowErrorMessage(false), 5000);
        return;
      }

      setSavingDraft(true);

      // Prepare records array for save draft
      const records = data.map(item => {
        // Calculate base values using original base data
        const baseItem = baseDataFromAPI.find(b => b.id === item.id);
        const rawHours = baseItem ? parseFloat(baseItem.originalTotalHours) || 0 : parseFloat(item.totalHours) || 0;
        const rawCost = baseItem ? parseFloat(baseItem.originalCostIncludingContingency) || 0 : parseFloat(item.costIncludingContingency) || 0;

        const fy1Efficiency = parseFloat(yoyEfficiency) || 0;
        const fy1RateIncrement = parseFloat(rateIncrement) || 0;

        // Calculate FY1 values: Base + FY1 Adjustment
        const fy1Hours = parseFloat((rawHours * (1 + fy1Efficiency / 100)).toFixed(2));
        const fy1Cost = parseFloat((rawCost * (1 + fy1RateIncrement / 100)).toFixed(2));

        const record = {
          // Required field for identifying the record
          RICEW_Effort_Cost_Rate_Card_id: item.estimation_model_id,

          // Updatable fields
          Estimation_Name: item.ricewName,
          ComplexityType: item.complexity,
          Effort_Rate_Card_Name: effortRateCardName,
          Rate_Card_Code: rateCardCode,
          Contract_Start_Date: formatDate(startDate),
          Contract_End_Date: formatDate(endDate),
          Organization_Name: primaryOrgData?.SI_organization_name || '',
          Business_Line: selectedBusinessLine || '',

          // Fiscal Year 1 data
          Fiscal_Year_1_Name: fiscalYearLabel,
          Fiscal_Year_1_Start_Date: formatDate(adjustedFiscalDates.start),
          Fiscal_Year_1_End_Date: formatDate(adjustedFiscalDates.end),
          Fiscal_Year_1_Effort_Efficiency: yoyEfficiency || '0',
          Fiscal_Year_1_Rate_Increment: rateIncrement || '0',
          Fiscal_Year_1_Hours: fy1Hours.toString(),
          Fiscal_Year_1_Cost: fy1Cost.toString(),

          // Base values (Raw)
          Total_Hours_Base: rawHours.toString(),
          Total_Cost_Base: rawCost.toString(),
        };

        // Add projected year data (Fiscal_Year_2, Fiscal_Year_3, etc.)
        if (showProjectedColumns && projectedYearsData.length > 0) {
          let previousHours = fy1Hours; // Start from FY1
          let previousCost = fy1Cost;   // Start from FY1

          projectedYearsData.forEach((yearData, yearIndex) => {
            const fiscalYearNum = yearIndex + 2; // Start from Fiscal_Year_2
            const yearEfficiency = parseFloat(yearData.efficiency) || 0;
            const yearRateIncrement = parseFloat(yearData.rateIncrement) || 0;

            // Calculate projected hours and cost
            const currentHours = parseFloat((parseFloat(previousHours) * (1 + yearEfficiency / 100)).toFixed(2));
            const currentCost = parseFloat((parseFloat(previousCost) * (1 + yearRateIncrement / 100)).toFixed(2));

            // Add fiscal year metadata and calculated values
            record[`Fiscal_Year_${fiscalYearNum}_Name`] = yearData.fiscalLabel || '';
            record[`Fiscal_Year_${fiscalYearNum}_Start_Date`] = yearData.startDate || '';
            record[`Fiscal_Year_${fiscalYearNum}_End_Date`] = yearData.endDate || '';
            record[`Fiscal_Year_${fiscalYearNum}_Effort_Efficiency`] = yearData.efficiency || '0';
            record[`Fiscal_Year_${fiscalYearNum}_Rate_Increment`] = yearData.rateIncrement || '0';
            record[`Fiscal_Year_${fiscalYearNum}_Hours`] = currentHours.toString();
            record[`Fiscal_Year_${fiscalYearNum}_Cost`] = currentCost.toString();

            previousHours = currentHours;
            previousCost = currentCost;
          });
        }

        return record;
      });

      // Prepare request body
      const requestBody = {
        Effort_Rate_Card_Name_index: selectedEffortRateCardIndex.toString(),
        records,
        updated_by: userId,
        clearUnusedProjectColumns: true
      };

      console.log('Saving draft data:', requestBody);

      const idToken = await getCachedToken();
      if (!idToken) {
        handleAuthError('Authentication required');
        setSavingDraft(false);
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
      };

      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      const response = await fetch('https://hp60d1srbb.execute-api.ap-south-1.amazonaws.com/New/newApi/ricew/effortCostRateCard/saveDraftByServiceLine', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        return;
      }

      const result = await response.json();

      if (response.ok && result.success) {
        setSuccessMessage(`Draft saved successfully! ${result.totalUpdated} records saved.`);
        setShowSuccessMessage(true);
        setTimeout(() => {
          setShowSuccessMessage(false);
          setSuccessMessage('');
        }, 5000);

        // Optionally refresh data after successful save
        if (selectedEffortRateCardIndex) {
          fetchDataByRateCardIndex(selectedEffortRateCardIndex);
        }

        // Reset change flags after successful save draft
        setHasActiveChanges(false);
        setChangedItems(new Set());
        setHasNewRow(false);
        setOriginalEffortRateCardName(effortRateCardName);
        setOriginalRateCardCode(rateCardCode);
        setOriginalEfficiencyValues({ fy1Efficiency: yoyEfficiency, fy1RateInc: rateIncrement });
      } else {
        throw new Error(result.error || 'Failed to save draft');
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      handleAuthError(error.message);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 5000);
    } finally {
      setSavingDraft(false);
    }
  };

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


  return (
    <>
      <div className="config-main" style={{ minHeight: '80vh' }}>
        <div style={{ padding: '2rem 2rem 1rem 2rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project : <span style={{ color: '#2563eb' }}>{projectName || selectedProject?.name || ''}</span></h3>
        </div>
        <div className="config-header" style={{ marginTop: '0', display: 'flex', alignItems: 'center', gap: '40px', justifyContent: 'flex-start' }}>
          <h2>RICEW Effort & Cost Rate Card (YoY)</h2>
          <button
            onClick={handleCreateNew}
            style={{
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              height: '36px',
              padding: '0px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onMouseEnter={(e) => { e.target.style.backgroundColor = '#218838'; }}
            onMouseLeave={(e) => { e.target.style.backgroundColor = '#28a745'; }}
          >
            <Plus size={18} />
            Create New Rate Card
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
                          The <strong>RICEW Effort &amp; Cost Rate Card (YoY)</strong> page allows you to create and manage year-over-year (YoY) projections of effort hours and costs for each RICEW item. It takes the base effort and cost values calculated in the RICEW Cost Rate Card (Base) page and applies annual efficiency improvements and rate increment percentages to project future fiscal year estimates across the duration of the project.
                        </p>
                      </div>

                      <div style={{ marginBottom: '16px' }}>
                        <strong style={{ color: '#1f2937', fontSize: '15px' }}>Why is this used?</strong>
                        <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                          Multi-year projects require cost projections that account for changing resource rates and productivity improvements over time. This page enables you to: (1) model how effort hours will change year-on-year as teams gain efficiency, (2) apply rate increment percentages to reflect annual billing rate changes, (3) generate fiscal year-specific cost projections for each RICEW item, and (4) support long-term project budgeting and financial planning across multiple fiscal years.
                        </p>
                      </div>

                      <div style={{ marginBottom: '16px' }}>
                        <strong style={{ color: '#1f2937', fontSize: '15px' }}>Understanding the form fields</strong>
                        <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                          <li><strong>Organization Name</strong> — The implementation partner organisation for which this rate card applies.</li>
                          <li><strong>Service Line Name</strong> — The business line / portfolio / service combination. Selecting this loads the base effort and cost data from the RICEW Cost Rate Card (Base).</li>
                          <li><strong>Effort &amp; Rate Card Name</strong> — A unique name to identify this YoY rate card (e.g., "FY25 Projection - SI Partner A").</li>
                          <li><strong>Rate Card Code</strong> — A short code for this rate card used for reference and reporting.</li>
                          <li><strong>Project Start Date / Project End Date</strong> — Auto-populated from the Project Definition. These are read-only and define the project timeline.</li>
                        </ul>
                      </div>

                      <div style={{ marginBottom: '16px' }}>
                        <strong style={{ color: '#1f2937', fontSize: '15px' }}>Understanding the table columns</strong>
                        <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                          <li><strong>RICEW Item</strong> — The estimation name (e.g., a Report, Interface, or Conversion). Rows with the same RICEW item are merged, with one row per complexity tier.</li>
                          <li><strong>Complexity</strong> — The complexity tier (Low, Medium, High) for that row.</li>
                          <li><strong>Active</strong> — Whether the row is active and included in projections.</li>
                          <li><strong>Total Hours - Base / Total Cost - Base</strong> — The base effort hours and cost pulled directly from the RICEW Cost Rate Card (Base) for this RICEW item and complexity. These are the FY1 starting values before any YoY adjustments.</li>
                          <li><strong>Total Hours - Projected / Total Cost - Projected</strong> — For each additional fiscal year added, the projected hours and costs are calculated by applying the YoY efficiency and rate increment percentages cumulatively from the previous year.</li>
                        </ul>
                      </div>

                      <div style={{ marginBottom: '16px' }}>
                        <strong style={{ color: '#1f2937', fontSize: '15px' }}>Understanding the fiscal year header inputs</strong>
                        <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                          <li><strong>Fiscal Year label</strong> — Derived automatically from the organisation's fiscal year configuration and the project start date (e.g., FY25).</li>
                          <li><strong>Fiscal Year Start Date / End Date</strong> — Automatically calculated from the organisation's fiscal calendar. Read-only.</li>
                          <li><strong>% Effort Efficiency</strong> — Enter the expected productivity improvement percentage for FY1. For example, 5 means the team is 5% more efficient, reducing hours by 5% compared to base.</li>
                          <li><strong>% Rate Increment</strong> — Enter the annual billing rate increase percentage for FY1. For example, 3 means resource rates increase by 3%, increasing costs by 3%.</li>
                          <li>For each additional projected fiscal year, the same two inputs appear and apply their adjustments cumulatively on top of the previous year's projected values.</li>
                        </ul>
                      </div>

                      <div style={{ marginBottom: '16px' }}>
                        <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to use this page</strong>
                        <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                          <li>Select an <strong>Organization Name</strong> and a <strong>Service Line Name</strong>. The table will load base effort and cost values from the RICEW Cost Rate Card (Base).</li>
                          <li>Fill in the <strong>Effort &amp; Rate Card Name</strong> and <strong>Rate Card Code</strong> to identify this rate card.</li>
                          <li>Enter <strong>% Effort Efficiency</strong> and <strong>% Rate Increment</strong> in the FY1 column header inputs. The base values in the table reflect these adjustments for FY1.</li>
                          <li>To add projections for additional fiscal years, click <strong>Add Projected Year</strong>. New columns appear for each year with their own efficiency and rate increment inputs.</li>
                          <li>Projected hours and costs are calculated automatically — each year builds on the previous year's projected values using the entered percentages.</li>
                          <li>Click <strong>Submit</strong> (for a new rate card) or <strong>Update</strong> (for an existing one) to save the finalised rate card.</li>
                          <li>Use <strong>Save Draft</strong> to save your work in progress without finalising. A draft banner will appear indicating the card is not yet complete.</li>
                          <li>Use <strong>Lock</strong> to prevent further edits once the rate card is finalised. Use <strong>Unlock</strong> to re-enable editing if changes are needed.</li>
                          <li>To start fresh, click <strong>Create New Rate Card</strong> in the page header to reset the form.</li>
                        </ul>
                      </div>

                      <div style={{ marginBottom: '4px' }}>
                        <strong style={{ color: '#1f2937', fontSize: '15px' }}>Important notes</strong>
                        <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                          <li>Base effort and cost values are sourced from the <strong>RICEW Cost Rate Card (Base)</strong> page. Ensure that page has been calculated and saved before using this page.</li>
                          <li>The <strong>Effort &amp; Rate Card Name</strong> must be unique — duplicate names will be rejected on submission.</li>
                          <li>Project Start and End Dates are read-only and are pulled automatically from the Project Definition. Update them there if incorrect.</li>
                          <li>The fiscal year label (e.g., FY25) is derived from the selected organisation's fiscal calendar configuration, not the calendar year.</li>
                          <li>A <strong>locked</strong> rate card cannot be edited. Unlock it first before making any changes.</li>
                          <li>Rows where <strong>Active</strong> is unchecked are excluded from YoY projections — verify active status if projected totals appear lower than expected.</li>
                          <li>Once submitted, the rate card feeds into downstream financial reporting. Coordinate with project management and finance before making updates to a finalised rate card.</li>
                        </ul>
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Row 1: Organization and Service Line */}
        <div style={{ padding: '15px 18px 5px 18px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '14px', fontWeight: '600', color: '#333', whiteSpace: 'nowrap', marginRight: '36px' }}>Organization Name <span style={{ color: 'red' }}>*</span> :</label>
          <div style={{ width: '260px' }}>
            <WideOrganizationAutocomplete
              value={selectedOrganizationId}
              onChange={handleOrganizationChange}
              options={organizationOptions}
              width="260px"
            />
          </div>

          <label style={{ fontSize: '14px', fontWeight: '600', color: '#333', whiteSpace: 'nowrap', marginLeft: '20px', marginRight: '12px' }}>Service Line Name <span style={{ color: 'red' }}>*</span> :</label>
          <div style={{ width: '480px' }}>
            <WideOrganizationAutocomplete
              value={selectedBusinessLine}
              onChange={(newValue) => {
                clearRateCardSpecificValues();
                setSelectedBusinessLine(newValue);
              }}
              options={serviceLineOptions}
              width="480px"
            />
          </div>
        </div>

        {/* Row 2: Effort & Rate Card Name and Rate Card Code */}
        <div style={{ padding: '5px 18px 15px 18px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '14px', fontWeight: '600', color: '#333', whiteSpace: 'nowrap' }}>Effort & Rate Card Name <span style={{ color: 'red' }}>*</span> :</label>
          <div style={{ minWidth: '270px', position: 'relative' }}>
            <input
              type="text"
              value={effortRateCardName}
              onChange={(e) => {
                setEffortRateCardName(e.target.value);
                // Only set active changes if value is actually different from original
                if (e.target.value !== originalEffortRateCardName) {
                  setHasActiveChanges(true);
                }
                if (effortRateCardNameError) {
                  setEffortRateCardNameError('');
                }
              }}
              disabled={isLocked}
              placeholder="Effort & Rate Card Name"
              style={{
                fontSize: '14px',
                color: isLocked ? '#999' : '#333',
                padding: '6px 8px',
                border: `1px solid ${effortRateCardNameError ? '#dc2626' : '#ddd'}`,
                borderRadius: '4px',
                backgroundColor: isLocked ? '#f5f5f5' : '#fff',
                outline: 'none',
                width: '100%',
                boxSizing: 'border-box',
                cursor: isLocked ? 'not-allowed' : 'text'
              }}
            />
            {effortRateCardNameError && (
              <div style={{ color: '#dc2626', fontSize: '11px', marginTop: '4px', fontWeight: '500', position: 'absolute', whiteSpace: 'nowrap' }}>
                {effortRateCardNameError}
              </div>
            )}
          </div>

          <label style={{ fontSize: '14px', fontWeight: '600', color: '#333', whiteSpace: 'nowrap', marginLeft: '20px' }}>Rate Card Code <span style={{ color: 'red' }}>*</span> :</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={rateCardCode}
              onChange={(e) => {
                setRateCardCode(e.target.value);
                if (e.target.value !== originalRateCardCode) {
                  setHasActiveChanges(true);
                }
                if (rateCardCodeError) {
                  setRateCardCodeError('');
                }
              }}
              disabled={isLocked}
              placeholder="Enter Rate Card Code"
              style={{
                fontSize: '14px',
                color: isLocked ? '#999' : '#333',
                padding: '6px 8px',
                border: `1px solid ${rateCardCodeError ? '#dc2626' : '#ddd'}`,
                borderRadius: '4px',
                backgroundColor: isLocked ? '#f5f5f5' : '#fff',
                outline: 'none',
                minWidth: '200px',
                cursor: isLocked ? 'not-allowed' : 'text'
              }}
            />
            {rateCardCodeError && (
              <div style={{ color: '#dc2626', fontSize: '11px', marginTop: '4px', fontWeight: '500', position: 'absolute', whiteSpace: 'nowrap' }}>
                {rateCardCodeError}
              </div>
            )}
          </div>
        </div>

        {/* Planned Start Date */}
        {(selectedOrganizationId && selectedBusinessLine) && (
          <div style={{ padding: '15px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ fontSize: '14px', fontWeight: '600', color: '#333', whiteSpace: 'nowrap' }}>Project Start Date :</label>
            <div style={{ position: 'relative' }}>
              <RicewDatePicker
                value={startDate || ''}
                onChange={() => { }}
                placeholder="dd-mmm-yyyy"
                error={!!startDateError}
                disabled={true}
              />
              {startDateError && (
                <div style={{ color: '#dc2626', fontSize: '11px', marginTop: '4px', fontWeight: '500', position: 'absolute', whiteSpace: 'nowrap' }}>
                  {startDateError}
                </div>
              )}
            </div>

            <label style={{ fontSize: '14px', fontWeight: '600', color: '#333', whiteSpace: 'nowrap', marginLeft: '20px' }}>Project End Date <span style={{ color: 'red' }}>*</span> :</label>
            <div style={{ position: 'relative' }}>
              <RicewDatePicker
                value={endDate || ''}
                onChange={() => { }}
                placeholder="dd-mmm-yyyy"
                error={!!endDateError}
                clearDateValidationError={() => setEndDateError('')}
                disabled={true}
              />
              {endDateError && (
                <div style={{ color: '#dc2626', fontSize: '11px', marginTop: '4px', fontWeight: '500', position: 'absolute', whiteSpace: 'nowrap' }}>
                  {endDateError}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {(loading || showLoading || lockingUnlocking || savingDraft) && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(2px)'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid #f3f3f3',
              borderTop: '3px solid #3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <p style={{ marginTop: '12px', color: '#3b82f6', fontWeight: '600', fontSize: '14px' }}>
              {showLoading ? 'Calculating Cost...' :
                savingDraft ? 'Saving Draft...' :
                  lockingUnlocking ? (isLocked ? 'Unlocking...' : 'Locking...') :
                    'Processing...'}
            </p>
          </div>
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


        {/* Draft Status Banner */}
        {isDraft && (
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
              i
            </div>
            <div style={{
              color: '#92400e',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              This is a saved draft. Complete the form and click "Update" to finalize the Effort & Cost Rate Card.
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="table-container" style={{ maxHeight: '600px', overflowY: 'auto', position: 'relative', marginTop: isDraft ? '16px' : '0' }}>
          <table className="config-table" style={{ fontSize: '15px', borderCollapse: 'separate', borderSpacing: 0, width: '100%' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 20, backgroundColor: '#fff' }}>
              <tr>
                <th style={{ padding: '8px 12px', fontSize: '14px', fontWeight: '600', textAlign: 'center', backgroundColor: '#fff' }}></th>
                <th style={{ padding: '8px 12px', fontSize: '14px', fontWeight: '600', textAlign: 'center', backgroundColor: '#fff' }}></th>
                <th style={{ padding: '8px 12px', fontSize: '14px', fontWeight: '600', textAlign: 'center', backgroundColor: '#fff' }}></th>
                <th style={{ padding: '8px 12px', fontSize: '14px', fontWeight: '600', textAlign: 'center', border: '1px solid #ddd', backgroundColor: '#fff' }}>Fiscal Year</th>
                <th style={{ padding: '8px 12px', fontSize: '14px', fontWeight: '600', textAlign: 'center', border: '1px solid #ddd', backgroundColor: '#fff' }}>{fiscalYearLabel}</th>
                {showProjectedColumns && activeProjectedYears.map((year, index) => (
                  <React.Fragment key={`fiscal-year-${index}`}>
                    <th style={{ padding: '8px 12px', fontSize: '14px', fontWeight: '600', textAlign: 'center', border: '1px solid #ddd', backgroundColor: '#fff' }}>Fiscal Year</th>
                    <th style={{ padding: '8px 12px', fontSize: '14px', fontWeight: '600', textAlign: 'center', border: '1px solid #ddd', backgroundColor: '#fff' }}>
                      {year.fiscalLabel}
                    </th>
                  </React.Fragment>
                ))}
              </tr>
              <tr>
                <th style={{ padding: '8px 12px', fontSize: '14px', fontWeight: '600', textAlign: 'center', backgroundColor: '#fff' }}></th>
                <th style={{ padding: '8px 12px', fontSize: '14px', fontWeight: '600', textAlign: 'center', backgroundColor: '#fff' }}></th>
                <th style={{ padding: '8px 12px', fontSize: '14px', fontWeight: '600', textAlign: 'center', backgroundColor: '#fff' }}></th>
                <th style={{ padding: '8px 12px', fontSize: '14px', fontWeight: '600', textAlign: 'center', border: '1px solid #ddd', backgroundColor: '#fff', minWidth: '140px' }}>
                  <div style={{ lineHeight: '1.4' }}>
                    <div>Fiscal year</div>
                    <div>Start Date</div>
                    <div>{formatDate(adjustedFiscalDates.start)}</div>
                  </div>
                </th>
                <th style={{ padding: '8px 12px', fontSize: '14px', fontWeight: '600', textAlign: 'center', border: '1px solid #ddd', backgroundColor: '#fff' }}>
                  <div style={{ lineHeight: '1.4' }}>
                    <div>Fiscal Year</div>
                    <div>End Date</div>
                    <div>{formatDate(adjustedFiscalDates.end)}</div>
                  </div>
                </th>
                {showProjectedColumns && activeProjectedYears.map((year, index) => (
                  <React.Fragment key={`dates-${index}`}>
                    <th style={{ padding: '8px 12px', fontSize: '14px', fontWeight: '600', textAlign: 'center', border: '1px solid #ddd', backgroundColor: '#fff', minWidth: '140px' }}>
                      <div style={{ lineHeight: '1.4' }}>
                        <div>Fiscal year</div>
                        <div>Start Date</div>
                        <div>{year.startDate}</div>
                      </div>
                    </th>
                    <th style={{ padding: '8px 12px', fontSize: '14px', fontWeight: '600', textAlign: 'center', border: '1px solid #ddd', backgroundColor: '#fff' }}>
                      <div style={{ lineHeight: '1.4' }}>
                        <div>Fiscal Year</div>
                        <div>End Date</div>
                        <div>{year.endDate}</div>
                      </div>
                    </th>
                  </React.Fragment>
                ))}
              </tr>
              <tr>
                <th style={{ padding: '8px 12px', fontSize: '14px', fontWeight: '600', textAlign: 'center', backgroundColor: '#fff' }}></th>
                <th style={{ padding: '8px 12px', fontSize: '14px', fontWeight: '600', textAlign: 'center', backgroundColor: '#fff' }}></th>
                <th style={{ padding: '8px 12px', fontSize: '14px', fontWeight: '600', textAlign: 'center', backgroundColor: '#fff' }}></th>
                <th style={{ padding: '8px 12px', fontSize: '14px', fontWeight: '600', textAlign: 'center', border: '1px solid #ddd', backgroundColor: '#fff' }}>% Effort Efficiency</th>
                <th style={{ padding: '8px 12px', fontSize: '14px', fontWeight: '600', textAlign: 'center', border: '1px solid #ddd', backgroundColor: '#fff' }}>% Rate Increment</th>
                {showProjectedColumns && activeProjectedYears.map((year, index) => (
                  <React.Fragment key={`labels-${index}`}>
                    <th style={{ padding: '8px 12px', fontSize: '14px', fontWeight: '600', textAlign: 'center', border: '1px solid #ddd', backgroundColor: '#fff' }}>% Effort Efficiency</th>
                    <th style={{ padding: '8px 12px', fontSize: '14px', fontWeight: '600', textAlign: 'center', border: '1px solid #ddd', backgroundColor: '#fff' }}>% Rate Increment</th>
                  </React.Fragment>
                ))}
              </tr>
              <tr>
                <th style={{ padding: '8px 12px', fontSize: '14px', fontWeight: '600', textAlign: 'center', backgroundColor: '#fff' }}></th>
                <th style={{ padding: '8px 12px', fontSize: '14px', fontWeight: '600', textAlign: 'center', backgroundColor: '#fff' }}></th>
                <th style={{ padding: '8px 12px', fontSize: '14px', fontWeight: '600', textAlign: 'center', backgroundColor: '#fff' }}></th>
                <th style={{ padding: '0px', textAlign: 'center', border: '1px solid #1976d2', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                  <style>{`
                  input[type=number]::-webkit-outer-spin-button,
                  input[type=number]::-webkit-inner-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                  }
                  input[type=number] {
                    -moz-appearance: textfield;
                  }
                  .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline {
                    border-color: #1976d2 !important;
                  }
                  .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline {
                    border-color: #1976d2 !important;
                    border-width: 2px !important;
                  }
                  .MuiOutlinedInput-root:hover fieldset {
                    border-color: #1976d2 !important;
                    border-width: 2px !important;
                  }
                `}</style>
                  <TextField
                    size="small"
                    type="number"
                    value={yoyEfficiency}
                    onChange={(e) => {
                      setYoyEfficiency(e.target.value);
                      if (e.target.value !== originalEfficiencyValues.fy1Efficiency) {
                        setHasActiveChanges(true);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '-') {
                        e.preventDefault();
                      }
                    }}
                    disabled={isLocked}
                    style={{
                      width: '100%',
                    }}
                    InputProps={{
                      style: {
                        textAlign: 'center',
                        height: '40px',
                        fontSize: '14px',
                        border: 'none',
                        borderRadius: '4px',
                        backgroundColor: isLocked ? '#f5f5f5' : '#fff',
                        outline: 'none',
                      },
                      sx: {
                        '& .MuiOutlinedInput-root': {
                          '&.Mui-focused fieldset': {
                            borderColor: '#1976d2 !important',
                            borderWidth: '1px',
                          },
                          '&:hover:not(.Mui-disabled) .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#1976d2 !important',
                            borderWidth: '1px',
                          },
                          'fieldset': {
                            borderColor: '#ccc',
                            borderWidth: '1px',
                          }
                        }
                      },
                      inputProps: {
                        style: {
                          textAlign: 'center',
                          MozAppearance: 'textfield',
                          '&::-webkit-outer-spin-button': {
                            WebkitAppearance: 'none',
                            margin: 0
                          },
                          '&::-webkit-inner-spin-button': {
                            WebkitAppearance: 'none',
                            margin: 0
                          }
                        }
                      }
                    }}
                    placeholder="Enter Efficiency"
                    variant="outlined"
                  />
                </th>
                <th style={{ padding: '0px', textAlign: 'center', border: '1px solid #1976d2', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                  <style>{`
                  input[type=number]::-webkit-outer-spin-button,
                  input[type=number]::-webkit-inner-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                  }
                  input[type=number] {
                    -moz-appearance: textfield;
                  }
                  .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline {
                    border-color: #1976d2 !important;
                  }
                  .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline {
                    border-color: #1976d2 !important;
                    border-width: 2px !important;
                  }
                  .MuiOutlinedInput-root:hover fieldset {
                    border-color: #1976d2 !important;
                    border-width: 2px !important;
                  }
                `}</style>
                  <TextField
                    size="small"
                    type="number"
                    value={rateIncrement}
                    onChange={(e) => {
                      setRateIncrement(e.target.value);
                      setHasActiveChanges(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '-') {
                        e.preventDefault();
                      }
                    }}
                    disabled={isLocked}
                    style={{
                      width: '100%',
                    }}
                    InputProps={{
                      style: {
                        textAlign: 'center',
                        height: '40px',
                        fontSize: '14px',
                        border: 'none',
                        borderRadius: '4px',
                        backgroundColor: isLocked ? '#f5f5f5' : '#fff',
                        outline: 'none',
                      },
                      sx: {
                        '& .MuiOutlinedInput-root': {
                          '&.Mui-focused fieldset': {
                            borderColor: '#1976d2 !important',
                            borderWidth: '1px',
                          },
                          '&:hover:not(.Mui-disabled) .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#1976d2 !important',
                            borderWidth: '1px',
                          },
                          'fieldset': {
                            borderColor: '#ccc',
                            borderWidth: '1px',
                          }
                        }
                      },
                      inputProps: {
                        style: {
                          textAlign: 'center',
                          MozAppearance: 'textfield',
                          '&::-webkit-outer-spin-button': {
                            WebkitAppearance: 'none',
                            margin: 0
                          },
                          '&::-webkit-inner-spin-button': {
                            WebkitAppearance: 'none',
                            margin: 0
                          }
                        }
                      }
                    }}
                    placeholder="Enter Rate Increment"
                    variant="outlined"
                  />
                </th>
                {showProjectedColumns && activeProjectedYears.map((yearData, index) => (
                  <React.Fragment key={`inputs-${index}`}>
                    <th style={{ padding: '0px', textAlign: 'center', border: '1px solid #1976d2', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                      <style>{`
                      input[type=number]::-webkit-outer-spin-button,
                      input[type=number]::-webkit-inner-spin-button {
                        -webkit-appearance: none;
                        margin: 0;
                      }
                      input[type=number] {
                        -moz-appearance: textfield;
                      }
                    `}</style>
                      <TextField
                        size="small"
                        type="number"
                        value={yearData.efficiency}
                        onChange={(e) => {
                          const newData = [...projectedYearsData];
                          newData[index].efficiency = e.target.value;
                          setProjectedYearsData(newData);
                          setHasActiveChanges(true);
                        }}
                        disabled={isLocked}
                        style={{
                          width: '100%',
                        }}
                        InputProps={{
                          style: {
                            textAlign: 'center',
                            height: '40px',
                            fontSize: '14px',
                            border: 'none',
                            borderRadius: '4px',
                            backgroundColor: isLocked ? '#f5f5f5' : '#fff',
                            outline: 'none'
                          },
                          inputProps: {
                            style: {
                              textAlign: 'center',
                              MozAppearance: 'textfield',
                              '&::-webkit-outer-spin-button': {
                                WebkitAppearance: 'none',
                                margin: 0
                              },
                              '&::-webkit-inner-spin-button': {
                                WebkitAppearance: 'none',
                                margin: 0
                              }
                            }
                          }
                        }}
                        placeholder="Enter Efficiency"
                        variant="outlined"
                      />
                    </th>
                    <th style={{ padding: '0px', textAlign: 'center', border: '1px solid #1976d2', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                      <style>{`
                      input[type=number]::-webkit-outer-spin-button,
                      input[type=number]::-webkit-inner-spin-button {
                        -webkit-appearance: none;
                        margin: 0;
                      }
                      input[type=number] {
                        -moz-appearance: textfield;
                      }
                    `}</style>
                      <TextField
                        size="small"
                        type="number"
                        value={yearData.rateIncrement}
                        onChange={(e) => {
                          const newData = [...projectedYearsData];
                          newData[index].rateIncrement = e.target.value;
                          setProjectedYearsData(newData);
                          if (e.target.value !== newData[index].originalRateIncrement) {
                            setHasActiveChanges(true);
                          }
                        }}
                        disabled={isLocked}
                        style={{
                          width: '100%',
                        }}
                        InputProps={{
                          style: {
                            textAlign: 'center',
                            height: '40px',
                            fontSize: '14px',
                            border: 'none',
                            borderRadius: '4px',
                            backgroundColor: isLocked ? '#f5f5f5' : '#fff',
                            outline: 'none'
                          },
                          inputProps: {
                            style: {
                              textAlign: 'center',
                              MozAppearance: 'textfield',
                              '&::-webkit-outer-spin-button': {
                                WebkitAppearance: 'none',
                                margin: 0
                              },
                              '&::-webkit-inner-spin-button': {
                                WebkitAppearance: 'none',
                                margin: 0
                              }
                            }
                          }
                        }}
                        placeholder="Enter Rate"
                        variant="outlined"
                      />
                    </th>
                  </React.Fragment>
                ))}
              </tr>
              <tr>
                <th style={{ padding: '12px 12px', fontSize: '15px', fontWeight: '600', width: '2%', border: '1px solid #ddd', backgroundColor: '#f5f5f5' }}></th>
                <th style={{ padding: '12px 12px', fontSize: '15px', fontWeight: '600', width: '10%', textAlign: 'center', border: '1px solid #ddd', backgroundColor: '#f5f5f5' }}>Complexity</th>
                <th style={{ padding: '12px 12px', fontSize: '15px', fontWeight: '600', width: '6%', textAlign: 'center', border: '1px solid #ddd', backgroundColor: '#f5f5f5' }}>Active</th>
                <th style={{ padding: '12px 12px', fontSize: '15px', fontWeight: '600', width: '15%', textAlign: 'center', border: '1px solid #ddd', backgroundColor: '#f5f5f5' }}>Total Hours - Base</th>
                <th style={{ padding: '12px 12px', fontSize: '15px', fontWeight: '600', width: '15%', textAlign: 'center', border: '1px solid #ddd', backgroundColor: '#f5f5f5' }}>Total Cost - Base</th>
                {showProjectedColumns && activeProjectedYears.map((yearData, index) => (
                  <React.Fragment key={`columns-${index}`}>
                    <th style={{ padding: '12px 12px', fontSize: '15px', fontWeight: '600', width: '15%', textAlign: 'center', border: '1px solid #ddd', backgroundColor: '#f5f5f5' }}>Total Hours - Projected</th>
                    <th style={{ padding: '12px 12px', fontSize: '15px', fontWeight: '600', width: '15%', textAlign: 'center', border: '1px solid #ddd', backgroundColor: '#f5f5f5' }}>Total Cost - Projected</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {useMemo(() => {
                const sortedData = [...data].sort((a, b) => {
                  const aId = parseInt(a.estimation_model_id) || 0;
                  const bId = parseInt(b.estimation_model_id) || 0;
                  return aId - bId;
                });

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
                  const totalCols = 5 + (showProjectedColumns ? activeProjectedYears.length * 2 : 0);
                  return (
                    <tr>
                      <td colSpan={totalCols} style={{ padding: '40px', textAlign: 'center', color: '#999', fontSize: '14px' }}>
                        No data available.
                      </td>
                    </tr>
                  );
                }

                return sortedData.map((item, index) => {
                  const sanitizedRicewName = DOMPurify.sanitize(item.ricewName || '', { ALLOWED_TAGS: [] });
                  const sanitizedComplexity = DOMPurify.sanitize(item.complexity || '', { ALLOWED_TAGS: [] });

                  return (
                    <tr key={item.id} data-row-id={item.id} style={{ backgroundColor: '#f5f5f5', borderBottom: '1px solid #ddd' }}>
                      {groupInfo[index] && (
                        <td rowSpan={groupInfo[index]} style={{ padding: '8px 12px', verticalAlign: 'middle', border: '1px solid #ddd', textAlign: 'left', backgroundColor: '#f5f5f5' }}>
                          <div style={{ fontSize: '14px', padding: '8px 0', color: '#333', minHeight: '40px', display: 'flex', alignItems: 'center' }}>
                            {sanitizedRicewName}
                          </div>
                        </td>
                      )}
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle', border: '1px solid #ddd', textAlign: 'center' }}>
                        <div style={{ fontSize: '14px', padding: '8px 0', color: '#333', minHeight: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {sanitizedComplexity}
                        </div>
                      </td>
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle', border: '1px solid #ddd', textAlign: 'center' }}>
                        <div style={{
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
                        }}>
                          {item.isActive && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20,6 9,17 4,12"></polyline>
                            </svg>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle', border: '1px solid #ddd', textAlign: 'center' }}>
                        <div style={{ fontSize: '14px', padding: '8px 0', color: '#333', minHeight: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {(() => {
                            const baseHours = parseFloat(item.totalHours) || 0;
                            const efficiency = parseFloat(yoyEfficiency) || 0;
                            return efficiency === 0 ? (baseHours || '') : parseFloat((baseHours * (1 + efficiency / 100)).toFixed(2)) || '';
                          })()}
                        </div>
                      </td>
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle', border: '1px solid #ddd', textAlign: 'center' }}>
                        <div style={{ fontSize: '14px', padding: '8px 0', color: '#333', minHeight: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {(() => {
                            const baseCost = parseFloat(item.costIncludingContingency) || 0;
                            const rateInc = parseFloat(rateIncrement) || 0;
                            return rateInc === 0 ? (baseCost || '') : parseFloat((baseCost * (1 + rateInc / 100)).toFixed(2)) || '';
                          })()}
                        </div>
                      </td>
                      {showProjectedColumns && activeProjectedYears.map((yearData, yIdx) => {
                        const yearIndex = yIdx + 2;
                        const baseHours = parseFloat(item.totalHours) || 0;
                        const baseCost = parseFloat(item.costIncludingContingency) || 0;
                        const multipliers = yearMultipliers[yIdx];

                        const projectedHours = multipliers ? parseFloat((baseHours * multipliers.hoursMult).toFixed(2)) : 0;
                        const projectedCost = multipliers ? parseFloat((baseCost * multipliers.costMult).toFixed(2)) : 0;

                        return (
                          <React.Fragment key={`projected-${item.id}-${yearIndex}`}>
                            <td style={{ padding: '8px 12px', verticalAlign: 'middle', border: '1px solid #ddd', textAlign: 'center' }}>
                              <div style={{ fontSize: '14px', padding: '8px 0', color: '#333', minHeight: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {projectedHours > 0 ? projectedHours : ''}
                              </div>
                            </td>
                            <td style={{ padding: '8px 12px', verticalAlign: 'middle', border: '1px solid #ddd', textAlign: 'center' }}>
                              <div style={{ fontSize: '14px', padding: '8px 0', color: '#333', minHeight: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {projectedCost > 0 ? projectedCost : ''}
                              </div>
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  );
                });
              }, [data, yoyEfficiency, rateIncrement, showProjectedColumns, activeProjectedYears])}
            </tbody>
          </table>
        </div>
        <div style={{ height: '20px' }}></div>

        {/* Submit/Update Button */}
        <div style={{ padding: '0 2rem 2rem 2rem', display: 'flex', justifyContent: 'flex-start', gap: '12px' }}>
          {/* Save Draft Button */}
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={savingDraft || isLocked || !isUpdateMode}
            style={{
              padding: '0px 24px',
              backgroundColor: (savingDraft || isLocked || !isUpdateMode) ? '#6c757d' : '#3b82f6',
              color: 'white',
              border: 'none',
              height: "32px",
              borderRadius: '4px',
              width: "140px",
              cursor: (savingDraft || isLocked || !isUpdateMode) ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              opacity: (savingDraft || isLocked || !isUpdateMode) ? 0.6 : 1,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { if (!savingDraft && !isLocked && isUpdateMode) e.target.style.backgroundColor = '#2563eb'; }}
            onMouseLeave={(e) => { if (!savingDraft && !isLocked && isUpdateMode) e.target.style.backgroundColor = '#3b82f6'; }}
          >
            {savingDraft ? 'Saving Draft...' : 'Save Draft'}
          </button>

          <button
            onClick={isUpdateMode ? handleUpdate : handleSubmit}
            disabled={isLocked}
            style={{
              backgroundColor: isLocked ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              height: '32px',
              padding: '0px 12px',
              borderRadius: '4px',
              cursor: isLocked ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s',
              width: '140px',
              opacity: isLocked ? 0.6 : 1
            }}
            onMouseEnter={(e) => { if (!isLocked) e.target.style.backgroundColor = '#218838'; }}
            onMouseLeave={(e) => { if (!isLocked) e.target.style.backgroundColor = '#28a745'; }}
          >
            {isUpdateMode ? 'Update' : 'Submit'}
          </button>

          {/* Lock/Unlock Button */}
          <button
            onClick={handleLockUnlock}
            disabled={lockingUnlocking}
            style={{
              backgroundColor: isLocked ? '#dc3545' : '#17a2b8',
              color: 'white',
              border: 'none',
              height: '32px',
              width: "140px",
              padding: '0px 12px',
              borderRadius: '4px',
              cursor: lockingUnlocking ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              opacity: lockingUnlocking ? 0.6 : 1,
              transition: 'all 0.2s',
              marginLeft: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
            onMouseEnter={(e) => {
              if (!lockingUnlocking) {
                e.target.style.backgroundColor = isLocked ? '#c82333' : '#156a8a';
              }
            }}
            onMouseLeave={(e) => {
              if (!lockingUnlocking) {
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
              <React.Fragment>{isLocked ? <Unlock size={16} /> : <Lock size={16} />}</React.Fragment>
            )}
            {lockingUnlocking ? (isLocked ? 'Unlocking...' : 'Locking...') : (isLocked ? 'Unlock' : 'Lock')}
          </button>
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
              zIndex: 11000
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

              .help-modal-scroll::-webkit-scrollbar { width: 4px; }
              .help-modal-scroll::-webkit-scrollbar-track { background: transparent; margin: 8px 0; }
              .help-modal-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
              .help-modal-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
              
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

          {showNoProjectSelectedPopup ? (
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
          ) : null}
        </div>
      </div>
      <SessionExpiredPopup />
    </>
  );
};

export default RicewEffortAndCostEstimate;
