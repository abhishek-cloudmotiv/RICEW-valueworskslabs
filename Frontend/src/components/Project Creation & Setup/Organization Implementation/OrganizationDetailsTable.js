import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Save, X, MoreVertical, Eye, AlertCircle, HelpCircle } from 'lucide-react';
import { TextField, MenuItem, Select, FormControl } from '@mui/material';
import BusinessLineForm from './BusinessLineForm';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import DOMPurify from 'dompurify';
import { getIdToken } from '../../../utils/cognito-auth';
import { useSession } from '../../../context/SessionContext';
import Loader from '../../../utils/Loader';

// Custom Date Picker Component for OrganizationDetailsTable (without auto-scroll, opens above)
const OrganizationDatePicker = ({ value, onChange, placeholder, error = false, onError, onFocus, clearDateValidationError, onCalendarOpen }) => {
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
  const [view, setView] = useState('calendar'); // 'years', 'months', 'calendar'
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [inputValue, setInputValue] = useState(formatDateForDisplay(value));
  const [inputError, setInputError] = useState('');
  const calendarRef = useRef(null);
  const inputRef = useRef(null);
  const isUserEditingRef = useRef(false);
  const pendingValueRef = useRef(null);
  const [calendarPosition, setCalendarPosition] = useState({ top: 0, left: 0 });
  const yearContainerRef = useRef(null);

  // Scroll to current year when switching to year view
  useEffect(() => {
    if (view === 'years' && yearContainerRef.current) {
      const currentYearElement = document.getElementById(`org-year-${currentMonth.getFullYear()}`);
      if (currentYearElement) {
        const container = yearContainerRef.current;
        container.scrollTop = currentYearElement.offsetTop - container.offsetTop - (container.clientHeight / 2) + (currentYearElement.clientHeight / 2);
      }
    }
  }, [view, currentMonth]);

  // Notify parent when calendar opens/closes and scroll into view
  useEffect(() => {
    if (onCalendarOpen) {
      onCalendarOpen(isOpen);
    }

    // Auto-scroll to make calendar visible when it opens
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        const rect = inputRef.current.getBoundingClientRect();
        const calendarHeight = 330;
        const viewportHeight = window.innerHeight;

        // Check if calendar would be cut off at the bottom
        if (rect.bottom + calendarHeight > viewportHeight) {
          // Scroll to bring the calendar into view
          window.scrollBy({
            top: (rect.bottom + calendarHeight) - viewportHeight + 20,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  }, [isOpen, onCalendarOpen]);

  useEffect(() => {
    // Only update input value when prop value changes AND user is not actively editing
    if (!isUserEditingRef.current) {
      setInputValue(formatDateForDisplay(value));
      setInputError('');
    }

    // Update the calendar's current month to match the value
    if (value) {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        setCurrentMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
      }
    } else {
      // If value is cleared, revert to today's month
      setCurrentMonth(new Date());
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setIsOpen(false);
        setTimeout(() => setView('calendar'), 300); // Reset after close animation
      }
    };

    const updateCalendarPosition = () => {
      if (inputRef.current && isOpen) {
        const rect = inputRef.current.getBoundingClientRect();
        setCalendarPosition({
          top: rect.bottom + 4,
          left: rect.left
        });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', updateCalendarPosition, true);
    window.addEventListener('resize', updateCalendarPosition);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', updateCalendarPosition, true);
      window.removeEventListener('resize', updateCalendarPosition);
    };
  }, [isOpen]);

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
    setTimeout(() => setView('calendar'), 300);
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

  const handleYearSelect = (year) => {
    setCurrentMonth(new Date(year, currentMonth.getMonth(), 1));
    setView('months');
  };

  const handleMonthSelect = (monthIndex) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), monthIndex, 1));
    setView('calendar');
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthAbbreviations = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  // Generate years (current year +/- 50 years)
  const currentYearVal = new Date().getFullYear();
  const years = [];
  for (let i = currentYearVal - 50; i <= currentYearVal + 50; i++) {
    years.push(i);
  }

  return (
    <div style={{ position: 'static', width: '180px' }} ref={calendarRef}>
      <div style={{ position: 'relative' }} ref={inputRef}>
        <TextField
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => {
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
        <Calendar
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
              if (inputRef.current) {
                const rect = inputRef.current.getBoundingClientRect();
                setCalendarPosition({
                  top: rect.bottom + 4,
                  left: rect.left
                });
              }
              setIsOpen(true);
              setView('calendar');
            } else {
              setIsOpen(false);
              setView('calendar');
            }
          }}
        />
      </div>

      {inputError && <div style={{ color: '#dc2626', fontSize: '10.5px', fontWeight: '500', marginTop: '4px' }}>{inputError}</div>}

      {isOpen && (
        <div style={{
          position: 'fixed',
          top: `${calendarPosition.top}px`,
          left: `${calendarPosition.left}px`,
          zIndex: 10000, // Very high z-index to appear above everything
          backgroundColor: 'white',
          border: '1px solid #ddd',
          borderRadius: '4px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          width: '280px',
          padding: '16px'
        }}>
          {view === 'calendar' ? (
            <>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
              }}>
                <button
                  type="button"
                  onClick={() => navigateMonth(-1)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: '4px' }}
                >
                  <ChevronLeft size={16} />
                </button>
                <span
                  onClick={() => setView('years')}
                  style={{
                    fontWeight: '600',
                    color: '#333',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </span>
                <button
                  type="button"
                  onClick={() => navigateMonth(1)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: '4px' }}
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
                  const isSelected = value && day && (() => {
                    const selectedDate = new Date(value);
                    return selectedDate.getDate() === day &&
                      selectedDate.getMonth() === currentMonth.getMonth() &&
                      selectedDate.getFullYear() === currentMonth.getFullYear();
                  })();

                  return (
                    <button
                      type="button"
                      key={index}
                      onClick={() => handleDateSelect(day)}
                      disabled={!day}
                      style={{
                        padding: '8px',
                        border: 'none',
                        borderRadius: '4px',
                        backgroundColor: day ? (isSelected ? '#007bff' : '#f8f9fa') : 'transparent',
                        color: day ? (isSelected ? 'white' : '#333') : 'transparent',
                        cursor: day ? 'pointer' : 'default',
                        fontSize: '14px',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (day && !isSelected) e.target.style.backgroundColor = '#e3f2fd';
                      }}
                      onMouseLeave={(e) => {
                        if (day && !isSelected) e.target.style.backgroundColor = '#f8f9fa';
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
                    const apiDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                    onChange(apiDate);
                    if (typeof onError === 'function') onError(null);
                    setCurrentMonth(new Date(today.getFullYear(), today.getMonth()));
                    setIsOpen(false);
                    setTimeout(() => setView('calendar'), 300);
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
            </>
          ) : view === 'months' ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              padding: '8px'
            }}>
              <div style={{ gridColumn: 'span 3', textAlign: 'center', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
                <span
                  onClick={() => setView('years')}
                  style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: '4px' }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  {currentMonth.getFullYear()}
                </span>
              </div>
              {monthAbbreviations.map((month, index) => (
                <button
                  key={month}
                  onClick={() => handleMonthSelect(index)}
                  style={{
                    padding: '12px 0',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: index === currentMonth.getMonth() ? '#007bff' : 'transparent',
                    color: index === currentMonth.getMonth() ? 'white' : '#333',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => index !== currentMonth.getMonth() && (e.target.style.backgroundColor = '#f3f4f6')}
                  onMouseLeave={(e) => index !== currentMonth.getMonth() && (e.target.style.backgroundColor = 'transparent')}
                >
                  {month}
                </button>
              ))}
            </div>
          ) : (
            <div
              ref={yearContainerRef}
              style={{ maxHeight: '250px', overflowY: 'auto', scrollBehavior: 'smooth' }}
            >
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                padding: '4px'
              }}>
                {years.map(year => (
                  <button
                    key={year}
                    id={`org-year-${year}`}
                    onClick={() => handleYearSelect(year)}
                    style={{
                      padding: '8px 4px',
                      border: 'none',
                      borderRadius: '4px',
                      backgroundColor: year === currentMonth.getFullYear() ? '#007bff' : 'transparent',
                      color: year === currentMonth.getFullYear() ? 'white' : '#333',
                      cursor: 'pointer',
                      fontSize: '14px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (year !== currentMonth.getFullYear()) e.target.style.backgroundColor = '#f3f4f6';
                    }}
                    onMouseLeave={(e) => {
                      if (year !== currentMonth.getFullYear()) e.target.style.backgroundColor = 'transparent';
                    }}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Helper function to format date for display in DD-MMM-YYYY format
const formatDateForDisplay = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString; // Return original if invalid date
  const day = date.getDate().toString().padStart(2, '0');
  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

const OrganizationDetailsTable = ({ onClose, selectedProject, onBackToLanding, onLogout, setUnsavedChangesChecker }) => {
  const navigate = useNavigate();
  const { handleAuthError } = useSession();
  const [data, setData] = useState([]);
  const [showNoProjectSelectedPopup, setShowNoProjectSelectedPopup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [hasNewRow, setHasNewRow] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState('');

  const [showBusinessLinePopup, setShowBusinessLinePopup] = useState(false);
  const [selectedOrganizationForBL, setSelectedOrganizationForBL] = useState(null);
  const [businessLineUnsavedChangesChecker, setBusinessLineUnsavedChangesChecker] = useState(null);

  const [countryOptions, setCountryOptions] = useState([]);

  const [regionOptions, setRegionOptions] = useState([]);

  const [currencyOptions, setCurrencyOptions] = useState([]);

  const [validationErrors, setValidationErrors] = useState({});
  const [editValidationErrors, setEditValidationErrors] = useState({});

  // State to track date input format errors (from date picker component)
  const [dateInputErrors, setDateInputErrors] = useState({});

  const [showHierarchyPopup, setShowHierarchyPopup] = useState(false);
  const [hierarchyData, setHierarchyData] = useState(null);
  const [hierarchyLoading, setHierarchyLoading] = useState(false);
  const [selectedOrganizationForHierarchy, setSelectedOrganizationForHierarchy] = useState(null);

  const [organizationUsageStatus, setOrganizationUsageStatus] = useState([]);

  const [isAnyCalendarOpen, setIsAnyCalendarOpen] = useState(false);
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const helpPopupRef = useRef(null);

  // Refs to track if date inputs are currently focused
  const fiscalStartDateInputRef = useRef(null);
  const fiscalEndDateInputRef = useRef(null);

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

  // Function to convert text to title case (capitalize first letter of each word)
  const toTitleCase = (str) => {
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
  };

  // Function to convert text to sentence case (capitalize first letter of first word only)
  const toSentenceCase = (str) => {
    if (!str || str.length === 0) return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  // Function to capitalize only the first character
  const capitalizeFirstChar = (str) => {
    if (!str || str.length === 0) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  // Load data from API on component mount
  useEffect(() => {
    // Reset states on mount or when project changes to ensure clean state
    setHasNewRow(false);
    setEditingItem(null);
    setEditValues({});

    const pId = selectedProject?.id || localStorage.getItem('project_id');
    if (!pId) {
      setShowNoProjectSelectedPopup(true);
      return;
    }

    setShowNoProjectSelectedPopup(false);

    loadOrganizationData();
    loadOrganizationUsageStatus();
    loadCountryOptions();
    loadRegionOptions();
  }, [selectedProject?.id]);

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
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHelpPopup]);

  const loadCountryOptions = async () => {
    try {
      const idToken = await getIdToken();

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      };

      const projectId = selectedProject?.id || localStorage.getItem('project_id');

      const response = await fetch(`https://ec2450jptj.execute-api.ap-south-1.amazonaws.com/New/rice/get/activeCountriesAll?project_id=${projectId}`, {
        headers: headers
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        return;
      }

      if (response.ok) {
        const result = await response.json();

        if (Array.isArray(result)) {
          // Filter to only active countries (Active === "Active")
          const activeCountries = result.filter(country => country.Active === "Active");

          // Sort by Country_Name
          activeCountries.sort((a, b) => {
            const nameA = a.Country_Name || '';
            const nameB = b.Country_Name || '';
            return nameA.localeCompare(nameB);
          });

          setCountryOptions(activeCountries);

          // Extract unique currencies from countries data
          const currencyMap = new Map();
          result.forEach(country => {
            if (country.Currency_Name && country.Currency_Code) {
              const sanitizedName = DOMPurify.sanitize(String(country.Currency_Name || '').trim(), { ALLOWED_TAGS: [] });
              const sanitizedCode = DOMPurify.sanitize(String(country.Currency_Code || '').trim(), { ALLOWED_TAGS: [] });
              const currencyKey = `${sanitizedName} (${sanitizedCode})`;
              if (!currencyMap.has(currencyKey)) {
                currencyMap.set(currencyKey, {
                  displayName: currencyKey,
                  currencyName: sanitizedName,
                  currencyCode: sanitizedCode,
                  id: currencyKey
                });
              }
            }
          });

          // Convert map to array and sort by currency name
          const currencies = Array.from(currencyMap.values()).sort((a, b) => {
            return a.currencyName.localeCompare(b.currencyName);
          });

          setCurrencyOptions(currencies);
        } else {
          setCountryOptions([]);
          setCurrencyOptions([]);
        }
      } else {
        console.error('API fetch failed with status:', response.status);
        setCountryOptions([]);
        setCurrencyOptions([]);
      }
    } catch (error) {
      console.error('Error loading countries:', error);
      handleAuthError(error.message);
    }
  };

  const loadRegionOptions = async () => {
    try {
      const idToken = await getIdToken();

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

        if (Array.isArray(result)) {
          // Sort by geoCode for consistent ordering
          const sortedRegions = result.sort((a, b) => {
            const codeA = a.geoCode || '';
            const codeB = b.geoCode || '';
            return codeA.localeCompare(codeB);
          });

          setRegionOptions(sortedRegions);
        } else {
          setRegionOptions([]);
        }
      } else {
        console.error('API fetch failed with status:', response.status);
        setRegionOptions([]);
      }
    } catch (error) {
      console.error('Error loading geography:', error);
      handleAuthError(error.message);
    }
  };

  const getNextOrganizationId = async () => {
    try {
      const idToken = await getIdToken();

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      };

      const response = await fetch('https://vs7ws23ybl.execute-api.ap-south-1.amazonaws.com/rice/api/organization/next-id', {
        headers: headers
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        return null;
      }

      if (response.ok) {
        const result = await response.json();

        if (result.success && result.formattedId) {
          return DOMPurify.sanitize(String(result.formattedId || '').trim(), { ALLOWED_TAGS: [] });
        } else {
          console.error('Invalid response format for next organization ID');
          return null;
        }
      } else {
        console.error('API fetch failed with status:', response.status);
        return null;
      }
    } catch (error) {
      console.error('Error fetching next organization ID:', error);
      handleAuthError(error.message);
      return null;
    }
  };

  const loadOrganizationData = async () => {
    setLoading(true);
    try {
      const projectId = selectedProject?.id || localStorage.getItem('project_id') || "101";
      const idToken = await getIdToken();

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      };

      const response = await fetch(`https://vs7ws23ybl.execute-api.ap-south-1.amazonaws.com/rice/organization/get?project_id=${projectId}`, {
        headers: headers
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        setData([]);
        setLoading(false);
        return;
      }

      if (response.ok) {
        const result = await response.json();

        if (result && result.data && Array.isArray(result.data) && result.data.length > 0) {
          const activeRecords = result.data.filter(item =>
            item.delete_status === "false"
          );

          const transformedData = activeRecords.map((item, index) => ({
            id: index + 1,
            siOrgDetailsId: DOMPurify.sanitize(String(item.SI_Organization_Details_id || '').trim(), { ALLOWED_TAGS: [] }),
            organizationId: DOMPurify.sanitize(String(item.organization_id || `ORG${index + 1}`).trim(), { ALLOWED_TAGS: [] }),
            organizationName: DOMPurify.sanitize(String(item.SI_organization_name || '').trim(), { ALLOWED_TAGS: [] }),
            organizationShortName: DOMPurify.sanitize(String(item.SI_organization_short_name || '').trim(), { ALLOWED_TAGS: [] }),
            countryOfOperations: DOMPurify.sanitize(String(item.country_of_operations || '').trim(), { ALLOWED_TAGS: [] }),
            globalRegion: DOMPurify.sanitize(String(item.global_region || '').trim(), { ALLOWED_TAGS: [] }),
            primaryCurrency: DOMPurify.sanitize(String(item.primary_currency || '').trim(), { ALLOWED_TAGS: [] }),
            createdBy: DOMPurify.sanitize(String(item.createdby || 'SYSTEM').trim(), { ALLOWED_TAGS: [] }),
            createdDate: DOMPurify.sanitize(String(item.createddate || '').trim(), { ALLOWED_TAGS: [] }),
            lastUpdatedBy: DOMPurify.sanitize(String(item.lastupdatedby || 'SYSTEM').trim(), { ALLOWED_TAGS: [] }),
            lastUpdatedDate: DOMPurify.sanitize(String(item.lastupdateddate || '').trim(), { ALLOWED_TAGS: [] }),
            comments: DOMPurify.sanitize(String(item.comments || '').trim(), { ALLOWED_TAGS: [] }),
            fiscalStartDate: DOMPurify.sanitize(String(item.fiscal_start_date || '').trim(), { ALLOWED_TAGS: [] }),
            fiscalEndDate: DOMPurify.sanitize(String(item.fiscal_end_date || '').trim(), { ALLOWED_TAGS: [] }),
            isSaved: true
          }));

          // Sort by SI_Organization_Details_id (primary key) - ascending order
          transformedData.sort((a, b) => {
            const idA = parseInt(a.siOrgDetailsId) || 0;
            const idB = parseInt(b.siOrgDetailsId) || 0;
            return idA - idB;
          });

          setData(transformedData);
        } else {
          setData([]);
        }
      } else {
        console.error('API fetch failed with status:', response.status);
        setData([]);
      }
    } catch (error) {
      console.error('Error loading organization data:', error);
      handleAuthError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to check if organization is used in rate cards
  const isOrganizationUsedInRateCard = (siOrgDetailsId) => {
    const usageStatus = organizationUsageStatus.find(
      status => status.SI_Organization_Details_id === siOrgDetailsId
    );
    return usageStatus ? usageStatus.isUsedInRateCard : false;
  };

  const loadOrganizationUsageStatus = async () => {
    try {
      const idToken = await getIdToken();
      const projectId = selectedProject?.id || localStorage.getItem('project_id');

      if (!projectId) {
        setOrganizationUsageStatus([]);
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      };

      const response = await fetch(`https://vs7ws23ybl.execute-api.ap-south-1.amazonaws.com/rice/ricew/organization/get/all-with-usage-status?project_id=${projectId}`, {
        headers: headers
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        return;
      }

      if (response.ok) {
        const result = await response.json();

        if (result && result.data && Array.isArray(result.data)) {
          setOrganizationUsageStatus(result.data);
        } else {
          setOrganizationUsageStatus([]);
        }
      } else {
        console.error('API fetch failed with status:', response.status);
        setOrganizationUsageStatus([]);
      }
    } catch (error) {
      console.error('Error loading organization usage status:', error);
      handleAuthError(error.message);
    }
  };

  const handleAddOrganization = async () => {
    // Check if there's an unsaved edit in progress on an existing record
    if (editingItem !== null) {
      const editingItemData = data.find(item => item.id === editingItem);
      if (editingItemData && editingItemData.isSaved) {
        // Editing an existing saved record
        showConfirmation(
          'You have unsaved changes. Do you want to discard them and add a new organization?',
          async () => {
            // User confirmed - cancel the current edit and add new row
            setEditingItem(null);
            setEditValues({});
            setEditValidationErrors({});
            setDateInputErrors({});

            // Now add the new row
            await addNewOrganizationRow();
          }
        );
        return;
      }
    }

    // If there's already a new row being edited, save it
    if (hasNewRow && editingItem) {
      await handleSaveEdit(editingItem);
      return;
    }

    // Otherwise, add a new row
    await addNewOrganizationRow();
  };

  const addNewOrganizationRow = async () => {
    // Get the next organization ID from API
    const nextOrgId = await getNextOrganizationId();
    if (!nextOrgId) {
      setErrorMessage('Failed to generate organization ID. Please try again.');
      setShowErrorMessage(true);
      setTimeout(() => setShowErrorMessage(false), 3000);
      return;
    }

    const newId = data.length > 0 ? Math.max(...data.map(item => item.id)) + 1 : 1;
    const currentDate = new Date().toISOString().split('T')[0];

    let autoCountry = '';
    let autoRegion = '';
    let autoCurrency = '';

    if (countryOptions && countryOptions.length === 1) {
      const country = countryOptions[0];
      autoCountry = country.Country_Name || '';
      autoRegion = country.GEOCODE || country.global_region || '';
      if (country.Currency_Name && country.Currency_Code) {
        autoCurrency = `${country.Currency_Name} (${country.Currency_Code})`;
      }
    }

    const newRow = {
      id: newId,
      organizationId: nextOrgId, // Use the API-generated formatted ID
      organizationName: '',
      organizationShortName: '',
      countryOfOperations: autoCountry,
      globalRegion: autoRegion,
      primaryCurrency: autoCurrency,
      createdBy: 'MKOTHARI',
      createdDate: currentDate,
      lastUpdatedBy: 'PMADMIN',
      lastUpdatedDate: currentDate,
      comments: '',
      fiscalStartDate: '',
      fiscalEndDate: '',
      isSaved: false
    };

    setData([...data, newRow]);
    setEditingItem(newId);
    setEditValues(newRow);
    setHasNewRow(true);
    // Clear date input errors when adding new row
    setDateInputErrors({});

    // Auto-scroll to the new row
    setTimeout(() => {
      const tableContainer = document.querySelector('.table-container');
      if (tableContainer) {
        tableContainer.scrollTop = tableContainer.scrollHeight;
      }
    }, 100);
  };

  const handleEdit = (id) => {
    const item = data.find(d => d.id === id);
    if (item) {
      // Check if there's an unsaved new row
      if (hasNewRow) {
        showConfirmation(
          'You have unsaved changes. Do you want to continue?',
          () => {
            // User confirmed - discard the unsaved row and proceed with edit
            setData(data.filter(row => row.isSaved));
            setHasNewRow(false);
            setValidationErrors({});
            setEditValidationErrors({});
            setDateInputErrors({});

            // Now set the edit mode
            setEditingItem(id);
            setEditValues({ ...item });
            setOpenMenuId(null);
          }
        );
      } else if (editingItem !== null && editingItem !== id) {
        showConfirmation(
          'You have unsaved changes. Do you want to discard them and edit another record?',
          () => {
            // User confirmed, proceed to edit the new item
            setEditingItem(id);
            setEditValues({ ...item });
            setOpenMenuId(null);
            setDateInputErrors({});
          }
        );
      } else {
        // No unsaved changes, proceed normally
        setEditingItem(id);
        setEditValues({ ...item });
        setOpenMenuId(null);
        setDateInputErrors({});
      }
    }
  };

  const handleCancelEdit = () => {
    if (!editValues.isSaved) {
      setData(data.filter(item => item.id !== editingItem));
      setHasNewRow(false);
      // Clear validation errors for the cancelled new row
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[editingItem];
        return newErrors;
      });
    } else {
      setEditValidationErrors({});
    }
    setEditingItem(null);
    setEditValues({});
    // Clear date input errors when canceling
    setDateInputErrors({});
  };

  // Helper function to validate date format (YYYY-MM-DD ISO format)
  const isValidDateFormat = (dateString) => {
    if (!dateString || dateString.trim() === '') return true; // Empty is handled separately
    // Check if it's a valid ISO date format (YYYY-MM-DD)
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!isoDateRegex.test(dateString)) return false;
    // Also check if it's a valid date
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  };

  // Helper function to validate date input field value from DOM (dd-mmm-yyyy or other formats)
  const validateDateInputValue = (inputValue) => {
    if (!inputValue || inputValue.trim() === '') return { valid: true, error: null };

    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

    // Try parsing dd-mmm-yyyy format (e.g., 03-DEC-2025)
    let parts = inputValue.split('-');
    if (parts.length === 3 && isNaN(parts[1])) {
      const dayStr = parts[0].trim();
      const monthStr = parts[1].trim();
      const yearStr = parts[2].trim();

      if (!/^\d{1,2}$/.test(dayStr)) {
        return { valid: false, error: 'Invalid format (dd-mmm-yyyy)' };
      }
      const day = parseInt(dayStr, 10);
      if (day < 1 || day > 31) {
        return { valid: false, error: 'Invalid format (dd-mmm-yyyy)' };
      }

      if (!/^[a-zA-Z]{3}$/.test(monthStr)) {
        return { valid: false, error: 'Invalid format (dd-mmm-yyyy)' };
      }
      const monthIndex = monthNames.indexOf(monthStr.toUpperCase());
      if (monthIndex === -1) {
        return { valid: false, error: 'Invalid format (dd-mmm-yyyy)' };
      }

      if (!/^\d{4}$/.test(yearStr)) {
        return { valid: false, error: 'Invalid format (dd-mmm-yyyy)' };
      }

      return { valid: true, error: null };
    }

    // Try parsing dd-mm-yyyy or dd/mm/yyyy format
    const separators = ['-', '/'];
    for (const sep of separators) {
      parts = inputValue.split(sep);
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const monthNum = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);

        if (!isNaN(day) && !isNaN(monthNum) && !isNaN(year) && monthNum >= 1 && monthNum <= 12) {
          const date = new Date(year, monthNum - 1, day);
          if (!isNaN(date.getTime())) {
            return { valid: true, error: null };
          }
        }
      }
    }

    // Try parsing yyyy-mm-dd format (ISO format)
    parts = inputValue.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const monthNum = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);

      if (!isNaN(day) && !isNaN(monthNum) && !isNaN(year) && monthNum >= 1 && monthNum <= 12) {
        const date = new Date(year, monthNum - 1, day);
        if (!isNaN(date.getTime())) {
          return { valid: true, error: null };
        }
      }
    }

    return { valid: false, error: 'Invalid format (dd-mmm-yyyy)' };
  };

  const handleSaveEdit = async (id) => {
    try {

      // Programmatically blur the date input fields to trigger validation
      // This ensures that if the user is still typing in a date field, the onBlur validation runs
      if (fiscalStartDateInputRef.current) {
        const inputElement = fiscalStartDateInputRef.current.querySelector('input');
        if (inputElement) {
        }
        if (inputElement && document.activeElement === inputElement) {
          inputElement.blur();
          // Wait for the blur event to complete and state updates to process
          await new Promise(resolve => setTimeout(resolve, 250));
        }
      }
      if (fiscalEndDateInputRef.current) {
        const inputElement = fiscalEndDateInputRef.current.querySelector('input');
        if (inputElement) {
        }
        if (inputElement && document.activeElement === inputElement) {
          inputElement.blur();
          // Wait for the blur event to complete and state updates to process
          await new Promise(resolve => setTimeout(resolve, 250));
        }
      }


      // DIRECT VALIDATION: Check actual input values from DOM (fixes React state timing issue)
      let fiscalStartInputValidation = { valid: true, error: null };
      let fiscalEndInputValidation = { valid: true, error: null };

      if (fiscalStartDateInputRef.current) {
        const inputElement = fiscalStartDateInputRef.current.querySelector('input');
        if (inputElement && inputElement.value) {
          fiscalStartInputValidation = validateDateInputValue(inputElement.value);
        }
      }

      if (fiscalEndDateInputRef.current) {
        const inputElement = fiscalEndDateInputRef.current.querySelector('input');
        if (inputElement && inputElement.value) {
          fiscalEndInputValidation = validateDateInputValue(inputElement.value);
        }
      }


      // First, check direct validation results (from DOM)
      if (!fiscalStartInputValidation.valid) {
        setErrorMessage('Fiscal Year Start Date: ' + fiscalStartInputValidation.error);
        setShowErrorMessage(true);
        setTimeout(() => setShowErrorMessage(false), 3000);
        return;
      }

      if (!fiscalEndInputValidation.valid) {
        setErrorMessage('Fiscal Year End Date: ' + fiscalEndInputValidation.error);
        setShowErrorMessage(true);
        setTimeout(() => setShowErrorMessage(false), 3000);
        return;
      }

      // Also check for date input format errors from state (backup check)
      if (dateInputErrors.fiscalStartDate || dateInputErrors.fiscalEndDate) {
        setErrorMessage('Please fix the date format errors before saving.');
        setShowErrorMessage(true);
        setTimeout(() => setShowErrorMessage(false), 3000);
        return;
      }

      // Also validate date format even if onBlur hasn't been triggered yet
      if (editValues.fiscalStartDate && !isValidDateFormat(editValues.fiscalStartDate)) {
        setErrorMessage('Fiscal Year Start Date has an invalid format. Please correct it before saving.');
        setShowErrorMessage(true);
        setTimeout(() => setShowErrorMessage(false), 3000);
        return;
      }
      if (editValues.fiscalEndDate && !isValidDateFormat(editValues.fiscalEndDate)) {
        setErrorMessage('Fiscal Year End Date has an invalid format. Please correct it before saving.');
        setShowErrorMessage(true);
        setTimeout(() => setShowErrorMessage(false), 3000);
        return;
      }

      // Validation - check required fields
      const missingFields = [];
      const fieldsWithErrors = {};

      if (!editValues.organizationName || editValues.organizationName.trim() === '') {
        missingFields.push('Organization Name');
        fieldsWithErrors.organizationName = true;
      }
      // Organization Code is now auto-generated/updated by backend, no frontend validation needed
      if (!editValues.countryOfOperations || editValues.countryOfOperations.trim() === '') {
        missingFields.push('Country of Operations');
        fieldsWithErrors.countryOfOperations = true;
      }
      if (!editValues.globalRegion || editValues.globalRegion.trim() === '') {
        missingFields.push('Global Region');
        fieldsWithErrors.globalRegion = true;
      }
      if (!editValues.primaryCurrency || editValues.primaryCurrency.trim() === '') {
        missingFields.push('Primary Currency');
        fieldsWithErrors.primaryCurrency = true;
      }
      if (!editValues.fiscalStartDate || editValues.fiscalStartDate.trim() === '') {
        missingFields.push('Fiscal Year Start Date');
        fieldsWithErrors.fiscalStartDate = true;
      }
      if (!editValues.fiscalEndDate || editValues.fiscalEndDate.trim() === '') {
        missingFields.push('Fiscal Year End Date');
        fieldsWithErrors.fiscalEndDate = true;
      }

      // Check for existing fiscal date validation errors (these are now handled in real-time)
      const existingFiscalErrors = editValues.isSaved ?
        (editValidationErrors.fiscalStartDate || editValidationErrors.fiscalEndDate) :
        (validationErrors[id]?.fiscalStartDate || validationErrors[id]?.fiscalEndDate);

      if (existingFiscalErrors) {
        // Don't save if there are fiscal date validation errors
        setErrorMessage('Please fix the fiscal year date validation errors before saving.');
        setShowErrorMessage(true);
        setTimeout(() => setShowErrorMessage(false), 3000);
        return;
      }

      // Set validation errors to show messages below fields
      if (Object.keys(fieldsWithErrors).length > 0) {
        // Check if this is a new row (not saved) or existing record
        if (editValues.isSaved === false) {
          // For new rows, use validationErrors with row id
          setValidationErrors(prev => ({
            ...prev,
            [id]: fieldsWithErrors
          }));
        } else {
          // For existing records, use editValidationErrors
          setEditValidationErrors(fieldsWithErrors);
        }

        // Show error popup message
        const fieldCount = Object.keys(fieldsWithErrors).length;
        setErrorMessage(fieldCount > 1 ? 'The required fields are missing' : 'The required field is missing');
        setShowErrorMessage(true);
        setTimeout(() => setShowErrorMessage(false), 3000);

        // Auto-scroll to the first error field
        setTimeout(() => {
          const errorFields = document.querySelectorAll('[data-error-field="true"]');
          for (let i = 0; i < errorFields.length; i++) {
            const errorField = errorFields[i];
            // Check if this error field is actually visible (has error text content)
            const hasError = errorField.textContent.trim() !== '';
            if (hasError) {
              errorField.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'nearest'
              });
              break; // Only scroll to the first visible error
            }
          }
        }, 100);

        return;
      }

      // Clear validation errors
      if (editValues.isSaved === false) {
        setValidationErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[id];
          return newErrors;
        });
      } else {
        setEditValidationErrors({});
      }

      const currentDate = new Date().toISOString().split('T')[0];

      // Check if this is an existing record (has siOrgDetailsId) or new record
      const isUpdate = editValues.siOrgDetailsId && editValues.siOrgDetailsId !== '';

      let payload;
      let endpoint;

      if (isUpdate) {
        // Find the original item to get the SI_Organization_Details_id
        const originalItem = data.find(item => item.id === id);
        const orgDetailsId = originalItem?.siOrgDetailsId || editValues.siOrgDetailsId;

        if (!orgDetailsId) {
          setErrorMessage('Unable to find organization ID for update');
          setShowErrorMessage(true);
          setTimeout(() => setShowErrorMessage(false), 3000);
          return;
        }

        // Update existing record
        const projectId = selectedProject?.id || localStorage.getItem('project_id');
        payload = {
          SI_Organization_Details_id: orgDetailsId,
          project_id: projectId.toString(),
          lastupdatedby: selectedProject?.userId || "1"
        };

        // Only include fields that were changed/edited
        if (editValues.organizationName !== undefined && editValues.organizationName.trim() !== '') {
          payload.SI_organization_name = editValues.organizationName;
        }
        // SI_organization_short_name is now auto-generated/updated by the backend based on SI_organization_name
        if (editValues.countryOfOperations !== undefined && editValues.countryOfOperations.trim() !== '') {
          payload.country_of_operations = editValues.countryOfOperations;
        }
        if (editValues.globalRegion !== undefined && editValues.globalRegion.trim() !== '') {
          payload.global_region = editValues.globalRegion;
        }
        if (editValues.primaryCurrency !== undefined && editValues.primaryCurrency.trim() !== '') {
          payload.primary_currency = editValues.primaryCurrency;
        }
        if (editValues.comments !== undefined) {
          payload.comments = editValues.comments;
        }
        if (editValues.fiscalStartDate !== undefined && editValues.fiscalStartDate.trim() !== '') {
          payload.fiscal_start_date = editValues.fiscalStartDate;
        }
        if (editValues.fiscalEndDate !== undefined && editValues.fiscalEndDate.trim() !== '') {
          payload.fiscal_end_date = editValues.fiscalEndDate;
        }
        endpoint = 'https://vs7ws23ybl.execute-api.ap-south-1.amazonaws.com/rice/organization/update';
      } else {
        // Create new record
        payload = {
          SI_organization_name: editValues.organizationName,
          // SI_organization_short_name is now auto-generated by the backend
          country_of_operations: editValues.countryOfOperations,
          global_region: editValues.globalRegion,
          primary_currency: editValues.primaryCurrency,
          comments: editValues.comments || '',
          fiscal_start_date: editValues.fiscalStartDate || '',
          fiscal_end_date: editValues.fiscalEndDate || '',
          user_id: selectedProject?.userId || "1",
          createdby: selectedProject?.userId || "1",
          project_id: (selectedProject?.id || localStorage.getItem('project_id'))?.toString()
        };

        endpoint = 'https://vs7ws23ybl.execute-api.ap-south-1.amazonaws.com/rice/organization/post';
      }

      const idToken = await getIdToken();

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        return;
      }

      if (response.ok) {
        setSuccessMessage(isUpdate ? 'Organization updated successfully!' : 'Organization saved successfully!');
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);

        setData(data.map(item =>
          item.id === id
            ? { ...editValues, isSaved: true, lastUpdatedBy: 'PMADMIN', lastUpdatedDate: currentDate }
            : item
        ));

        setEditingItem(null);
        setEditValues({});
        setHasNewRow(false);
        // Clear date input errors after successful save
        setDateInputErrors({});

        await loadOrganizationData();
      } else {
        let errorMessage = 'Failed to save or update organization';
        try {
          const errorData = await response.json();
          if (errorData && errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData && errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (e) {
          console.error('Error parsing error response:', e);
        }
        setErrorMessage(errorMessage);
        setShowErrorMessage(true);
        setTimeout(() => setShowErrorMessage(false), 3000);
      }
    } catch (error) {
      console.error('Error saving organization:', error);
      handleAuthError(error.message);
    }
  };

  const handleDelete = async (id) => {
    const rowToDelete = data.find(item => item.id === id);

    if (rowToDelete) {
      // Check if deleting an unsaved row
      if (!rowToDelete.isSaved) {
        // Always allow deleting unsaved rows
        setHasNewRow(false);
        setEditingItem(null);
        setEditValues({});
        setData(data.filter(item => item.id !== id));
        // Clear validation errors for the deleted row
        setValidationErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[id];
          return newErrors;
        });
      } else {
        // Check if organization is used in a rate card
        if (isOrganizationUsedInRateCard(rowToDelete.siOrgDetailsId)) {
          setErrorMessage('Cannot delete organization. It is currently in use in a Rate Card.');
          setShowErrorMessage(true);
          setTimeout(() => setShowErrorMessage(false), 4000);
          return;
        }

        // For saved records, use custom confirmation dialog
        showConfirmation(
          'Are you sure you want to delete this organization? This action cannot be undone.',
          async () => {
            try {
              const idToken = await getIdToken();

              const projectId = selectedProject?.id || localStorage.getItem('project_id');
              const payload = {
                SI_Organization_Details_id: rowToDelete.siOrgDetailsId,
                project_id: projectId.toString()
              };

              const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
              };

              const response = await fetch('https://vs7ws23ybl.execute-api.ap-south-1.amazonaws.com/rice/organization/delete', {
                method: 'DELETE',
                headers: headers,
                body: JSON.stringify(payload)
              });

              if (response.status === 401 || response.status === 403) {
                handleAuthError('Unauthorized - session expired');
                return;
              }

              if (response.ok) {
                setSuccessMessage('Organization deleted successfully!');
                setShowSuccessMessage(true);
                setTimeout(() => setShowSuccessMessage(false), 3000);

                setData(data.filter(d => d.id !== id));
                setOpenMenuId(null);

                // Clear editing state if this was the item being edited
                if (editingItem === id) {
                  setEditingItem(null);
                  setEditValues({});
                }
              } else {
                setErrorMessage('Failed to delete organization');
                setShowErrorMessage(true);
                setTimeout(() => setShowErrorMessage(false), 3000);
              }
            } catch (error) {
              console.error('Error deleting organization:', error);
              handleAuthError(error.message);
            }
          }
        );
      }
    }
  };

  const getFilteredCountryOptions = (selectedRegion) => {
    if (!selectedRegion) {
      return [];
    }
    return countryOptions.filter(country => country.GEOCODE === selectedRegion);
  };

  const getFilteredCurrencyOptions = (selectedCountry) => {
    if (!selectedCountry) {
      return [];
    }
    return currencyOptions;
  };

  const handleInputChange = (field, value) => {
    setEditValues(prev => {
      const newValues = { ...prev, [field]: value };

      // If global region changes, clear the country selection
      if (field === 'globalRegion') {
        newValues.countryOfOperations = '';
        newValues.primaryCurrency = '';
      }

      // If country changes, auto-select the corresponding currency
      if (field === 'countryOfOperations' && value) {
        const selectedCountry = countryOptions.find(country => country.Country_Name === value);
        if (selectedCountry && selectedCountry.Currency_Name && selectedCountry.Currency_Code) {
          newValues.primaryCurrency = `${selectedCountry.Currency_Name} (${selectedCountry.Currency_Code})`;
        }
      }

      // Fiscal Year Date Validation - trigger immediately when dates change
      if (field === 'fiscalStartDate' || field === 'fiscalEndDate') {
        const startDate = newValues.fiscalStartDate;
        const endDate = newValues.fiscalEndDate;

        // Clear both fiscal date errors first
        if (editingItem && data.find(item => item.id === editingItem)) {
          const currentItem = data.find(item => item.id === editingItem);

          if (currentItem.isSaved) {
            // For existing records, use editValidationErrors
            setEditValidationErrors(prev => {
              const newErrors = { ...prev };
              delete newErrors.fiscalStartDate;
              delete newErrors.fiscalEndDate;
              return newErrors;
            });
          } else {
            // For new rows, use validationErrors with row id
            setValidationErrors(prev => {
              const newErrors = { ...prev };
              if (newErrors[editingItem]) {
                delete newErrors[editingItem].fiscalStartDate;
                delete newErrors[editingItem].fiscalEndDate;
                if (Object.keys(newErrors[editingItem]).length === 0) {
                  delete newErrors[editingItem];
                }
              }
              return newErrors;
            });
          }
        }

        // Now validate if both dates are present
        if (startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);

          if (start > end) {
            const fieldsWithErrors = {};

            if (field === 'fiscalStartDate') {
              fieldsWithErrors.fiscalStartDate = true;
            } else {
              fieldsWithErrors.fiscalEndDate = true;
            }

            // Set the appropriate error
            if (editingItem && data.find(item => item.id === editingItem)) {
              const currentItem = data.find(item => item.id === editingItem);

              if (currentItem.isSaved) {
                // For existing records, use editValidationErrors
                setEditValidationErrors(fieldsWithErrors);
              } else {
                // For new rows, use validationErrors with row id
                setValidationErrors(prev => ({
                  ...prev,
                  [editingItem]: fieldsWithErrors
                }));
              }
            }
          }
        }
      }

      return newValues;
    });
  };

  const handleBackToLanding = () => {
    // Check for unsaved changes
    const hasUnsavedChanges = hasNewRow || editingItem !== null;

    if (hasUnsavedChanges) {
      showConfirmation(
        'You have unsaved changes. Please save your changes before going back. Do you want to continue anyway?',
        () => onBackToLanding()
      );
    } else {
      // Proceed with going back
      onBackToLanding();
    }
  };

  const handleLogout = () => {
    // Check for unsaved changes
    const hasUnsavedChanges = hasNewRow || editingItem !== null;

    if (hasUnsavedChanges) {
      showConfirmation(
        'You have unsaved changes. Please save your changes before logging out. Do you want to continue logging out anyway?',
        () => onLogout()
      );
    } else {
      // Proceed with logout
      onLogout();
    }
  };

  const handleViewHierarchy = async (item) => {
    try {
      setHierarchyLoading(true);
      setSelectedOrganizationForHierarchy(item);
      setOpenMenuId(null);

      const idToken = await getIdToken();

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      };

      const projectId = selectedProject?.id || localStorage.getItem('project_id');
      const response = await fetch(`https://vs7ws23ybl.execute-api.ap-south-1.amazonaws.com/rice/allData/allform/getDataByOrganization?organizationId=${item.organizationId}&project_id=${projectId}`, {
        headers: headers
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        setHierarchyLoading(false);
        return;
      }

      if (response.ok) {
        const result = await response.json();

        if (result && result.data && Array.isArray(result.data)) {
          setHierarchyData({
            businessLines: result.data,
            summary: result.summary
          });
          setShowHierarchyPopup(true);
        } else {
          setErrorMessage('Failed to load hierarchy data');
          setShowErrorMessage(true);
          setTimeout(() => setShowErrorMessage(false), 3000);
        }
      } else {
        console.error('API fetch failed with status:', response.status);
        setErrorMessage('Failed to load hierarchy data');
        setShowErrorMessage(true);
        setTimeout(() => setShowErrorMessage(false), 3000);
      }
    } catch (error) {
      console.error('Error loading hierarchy data:', error);
      handleAuthError(error.message);
    } finally {
      setHierarchyLoading(false);
    }
  };

  const handleAddBusinessLines = (organizationId) => {
    // Find the organization details for the popup
    const organization = data.find(item => item.organizationId === organizationId);
    if (organization) {
      setSelectedOrganizationForBL({
        id: organization.organizationId,
        name: organization.organizationName
      });
      setShowBusinessLinePopup(true);
    }
    setOpenMenuId(null);
  };

  const handleAddBusinessLinesWithChecks = (organizationId) => {
    // Check if there's an unsaved edit in progress on an existing record
    if (editingItem !== null) {
      const editingItemData = data.find(item => item.id === editingItem);
      if (editingItemData && editingItemData.isSaved) {
        // Editing an existing saved record
        showConfirmation(
          'You have unsaved changes. Do you want to discard them and add business lines?',
          () => {
            // User confirmed - cancel the current edit and add business lines
            setEditingItem(null);
            setEditValues({});
            setEditValidationErrors({});

            // Now add the business lines
            proceedWithAddBusinessLines(organizationId);
          }
        );
        return;
      }
    }

    // If there's already a new row being edited, save it first
    if (hasNewRow && editingItem) {
      // Don't cancel the row yet - just show confirmation
      showConfirmation(
        'You have unsaved changes in the new organization. Do you want to save it first before adding business lines?',
        async () => {
          // User wants to save first
          const currentItem = data.find(d => d.id === editingItem);
          if (currentItem) {
            // Try to save
            const saveSuccess = await handleSaveEdit(currentItem.id);

            // If save failed, remove the row from data before proceeding
            if (!saveSuccess) {
              setData(prevData => prevData.filter(item => item.id !== currentItem.id));
            }

            // Always proceed with adding business lines
            proceedWithAddBusinessLines(organizationId);
          }
        }
      );
      return;
    }

    // Otherwise, proceed directly
    proceedWithAddBusinessLines(organizationId);
  };

  const proceedWithAddBusinessLines = (organizationId) => {
    // Clear any editing state and error messages before navigating
    setEditingItem(null);
    setEditValues({});
    setHasNewRow(false);
    setShowErrorMessage(false);
    setErrorMessage('');
    setValidationErrors({});
    setEditValidationErrors({});

    // Now proceed with the original logic
    handleAddBusinessLines(organizationId);
  };

  const handleCloseBusinessLinePopup = () => {
    // Check for unsaved changes in BusinessLineForm
    if (businessLineUnsavedChangesChecker && businessLineUnsavedChangesChecker()) {
      showConfirmation(
        'You have unsaved changes in the Business Line form. Are you sure you want to close without saving?',
        () => {
          setShowBusinessLinePopup(false);
          setSelectedOrganizationForBL(null);
          setBusinessLineUnsavedChangesChecker(null);
        }
      );
    } else {
      setShowBusinessLinePopup(false);
      setSelectedOrganizationForBL(null);
      setBusinessLineUnsavedChangesChecker(null);
    }
  };

  // Expose unsaved changes checker to parent component
  const checkUnsavedChanges = useCallback(() => {
    return hasNewRow || editingItem !== null;
  }, [hasNewRow, editingItem]);

  useEffect(() => {
    if (setUnsavedChangesChecker) {
      setUnsavedChangesChecker(() => checkUnsavedChanges);
    }
  }, [checkUnsavedChanges, setUnsavedChangesChecker]);

  return (
    <>
      <div className="config-main" style={{ minHeight: '80vh', paddingBottom: isAnyCalendarOpen ? '200px' : '0px' }}>
        <div style={{ padding: '2rem 2rem 1rem 2rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project : <span style={{ color: '#007bff' }}>{selectedProject?.name || localStorage.getItem('project_name') || 'None'}</span></h3>
        </div>
        <div className="config-header" style={{ marginTop: '0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2>Organization Details (Implementation Partners)</h2>
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
                      The <strong>Organization Details</strong> page manages the implementation partner organizations involved in the ERP project. Each organization entry represents a legal or operational entity (e.g., a consulting firm, subsidiary, or regional office) that participates in the engagement.
                    </p>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>Why is this used?</strong>
                    <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                      Defining organizations is a foundational step for resource planning. Organizations are used to structure Business Lines, Rate Cards, and Resource Rosters. Each organization must be set up here before its business lines and rates can be configured in downstream modules.
                    </p>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>Understanding the columns</strong>
                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                      <li><strong>Organization ID</strong> — System-generated unique identifier for the organization.</li>
                      <li><strong>Organization Name</strong> — Full legal or operational name of the implementing partner.</li>
                      <li><strong>Organization Short Name</strong> — Auto-generated abbreviation based on the organization name, used in reports and dropdowns.</li>
                      <li><strong>Country of Operations</strong> — The country where this organization primarily operates (filtered by selected Global Region).</li>
                      <li><strong>Global Region</strong> — The broader geography (e.g., EMEA, APAC) this organization belongs to.</li>
                      <li><strong>Primary Currency</strong> — The currency used for rate cards and billing for this organization.</li>
                      <li><strong>Fiscal Year Start / End Date</strong> — The organization's fiscal year boundaries, used for financial planning and reporting.</li>
                      <li><strong>Comments</strong> — Optional free-text notes about the organization.</li>
                    </ul>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to use this page</strong>
                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                      <li>Click <strong>Add Organization</strong> to create a new row. Fill in all required fields and click the <strong>Save</strong> (✓) icon to save.</li>
                      <li>Use the <strong>⋮ (Actions)</strong> menu on any row to <strong>Edit</strong>, <strong>Delete</strong>, or <strong>Add Business Lines</strong>.</li>
                      <li>Click on the <strong>Organization Name</strong> (value) to <strong>View Hierarchy</strong> and see all associated data.</li>
                      <li>When selecting a Global Region, the Country and Currency fields are filtered automatically.</li>
                      <li>Fiscal Year End Date must be after the Fiscal Year Start Date — a validation error will appear if not.</li>
                      <li>Click the <strong>X</strong> (Cancel) icon to discard unsaved changes on a row.</li>
                    </ul>
                  </div>

                  <div style={{ marginBottom: '4px' }}>
                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>Important notes</strong>
                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                      <li>Organization Name, Country, Global Region, Primary Currency, and Fiscal Dates are all required fields.</li>
                      <li>An organization that is already linked to a Rate Card cannot be deleted.</li>
                      <li>Click on an <strong>Organization Name</strong> to see all Business Lines and associated data under that organization.</li>
                      <li>A project must be selected before organizations can be loaded or added.</li>
                    </ul>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <strong style={{ color: '#1f2937', fontSize: '15px' }}>Organization Hierarchy</strong>
                    <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                      Organizations are the top level of the project hierarchy: <strong>Organization → Business Line → Portfolio → Service Line</strong>.
                    </p>
                  </div>

                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Message Popup */}
        {showSuccessMessage && (
          <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: '#10b981',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22,4 12,14.01 9,11.01" />
            </svg>
            {successMessage}
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
            padding: '12px 20px',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            maxWidth: '400px',
            wordWrap: 'break-word'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            {errorMessage}
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
            zIndex: 9999
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

        <Loader loading={loading || hierarchyLoading} message="Loading..." />

        <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto', overflowX: 'auto' }}>
          <table className="config-table" style={{ fontSize: '15px' }}>
            <thead>
              <tr>
                <th style={{ padding: '8px 12px', fontSize: '16px', width: '10%' }}>Organization ID</th>
                <th style={{ padding: '8px 12px', fontSize: '16px', width: '14%' }}>Organization Name</th>
                <th style={{ padding: '8px 12px', fontSize: '16px', width: '10%' }}>Organization Code</th>
                <th style={{ padding: '8px 12px', fontSize: '16px', width: '8%' }}>Global Region</th>
                <th style={{ padding: '8px 12px', fontSize: '16px', width: '12%' }}>Country of Operations</th>
                <th style={{ padding: '8px 12px', fontSize: '16px', width: '12%' }}>Primary Currency</th>
                <th style={{ padding: '8px 12px', fontSize: '16px', width: '12%' }}>Fiscal Year Start Date</th>
                <th style={{ padding: '8px 12px', fontSize: '16px', width: '12%' }}>Fiscal Year End Date</th>
                <th style={{ padding: '8px 12px', fontSize: '16px', width: '20%' }}>Comments</th>
                <th style={{ padding: '8px 12px', fontSize: '16px', width: '10%', textAlign: 'center' }}>Add Business Lines</th>
                <th style={{ padding: '8px 12px', fontSize: '16px', width: '9%', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '20px' }}>
                    Loading...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '20px' }}>
                    No organizations found. Click "Add Organization" to create one.
                  </td>
                </tr>
              ) : (
                data.map((item, index) => (
                  <tr key={item.id} style={{ height: '40px', backgroundColor: 'transparent' }}>
                    <td style={{ padding: '6px 12px', verticalAlign: 'top' }}>
                      <div style={{ paddingTop: '6px' }}>
                        {editingItem === item.id && item.isSaved ? (
                          // Organization ID is read-only for existing records
                          <span style={{ fontWeight: '500', color: '#374151' }}>{item.organizationId}</span>
                        ) : (
                          <span>{item.organizationId}</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '6px 12px', verticalAlign: 'top' }}>
                      {editingItem === item.id ? (
                        <div style={{ paddingTop: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <TextField
                              size="small"
                              style={{ flex: 1, minWidth: '200px' }}
                              value={editValues.organizationName || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Enforce 240 character limit, capitalize first character
                                const formattedValue = capitalizeFirstChar(value.substring(0, 240));
                                handleInputChange('organizationName', formattedValue);
                              }}
                              onPaste={(e) => {
                                e.preventDefault();
                                const pastedText = e.clipboardData.getData('text');
                                const currentValue = editValues.organizationName || '';
                                // Enforce 240 character limit on pasted text, capitalize first character
                                const newValue = (currentValue + pastedText).substring(0, 240);
                                const formattedValue = capitalizeFirstChar(newValue);
                                handleInputChange('organizationName', formattedValue);
                              }}
                              placeholder="Full legal name"
                              variant="outlined"
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  fontSize: '14px',
                                  backgroundColor: 'white',
                                },
                              }}
                            />
                            <div style={{ fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                              {(editValues.organizationName || '').length}/240
                            </div>
                          </div>
                          {(editValues.organizationName || '').length >= 240 && (
                            <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: '500' }}>
                              240 Limit exceeded
                            </div>
                          )}
                          <div data-error-field="true" style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: '500', lineHeight: '1.3', wordWrap: 'break-word' }}>
                            {(item.isSaved ? editValidationErrors.organizationName : validationErrors[item.id]?.organizationName) && 'Required field'}
                          </div>
                        </div>
                      ) : (
                        <span
                          onClick={() => handleViewHierarchy(item)}
                          style={{
                            cursor: 'pointer',
                            color: '#2563eb',
                            fontWeight: '500',
                            textDecoration: 'none'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.textDecoration = 'underline';
                            e.target.style.color = '#1e40af';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.textDecoration = 'none';
                            e.target.style.color = '#2563eb';
                          }}
                          title="Click to view hierarchy"
                        >
                          {item.organizationName}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '6px 12px', verticalAlign: 'top' }}>
                      {editingItem === item.id ? (
                        <div style={{ paddingTop: '6px' }}>
                          <div style={{
                            padding: '8px 12px',
                            backgroundColor: '#f3f4f6',
                            borderRadius: '4px',
                            fontSize: '14px',
                            color: '#6b7280',
                            fontStyle: 'italic',
                            border: '1px solid #ddd',
                            width: '150px'
                          }}>
                            {item.isSaved ? (editValues.organizationShortName || 'Auto-updating...') : 'Auto-generated'}
                          </div>
                        </div>
                      ) : (
                        <span>{item.organizationShortName}</span>
                      )}
                    </td>

                    <td style={{ padding: '6px 12px', verticalAlign: 'top' }}>
                      {editingItem === item.id ? (
                        <div style={{ paddingTop: '6px' }}>
                          <FormControl fullWidth size="small">
                            <Select
                              value={editValues.globalRegion || ''}
                              onChange={(e) => handleInputChange('globalRegion', e.target.value)}
                              displayEmpty
                              sx={{
                                fontSize: '14px',
                                backgroundColor: 'white',
                              }}
                            >
                              <MenuItem value="" disabled>Select Region</MenuItem>
                              {regionOptions.map((region, index) => (
                                <MenuItem
                                  key={region.list_Of_Geography_id}
                                  value={region.geoCode}
                                  sx={{
                                    backgroundColor: region.geoCode === editValues.globalRegion ? '#e3f2fd' : 'white',
                                    '&.Mui-focusVisible': {
                                      backgroundColor: '#accafaff',
                                    }
                                  }}
                                >
                                  {region.geoCode}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <div data-error-field="true" style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: '500', lineHeight: '1.3', wordWrap: 'break-word' }}>
                            {(item.isSaved ? editValidationErrors.globalRegion : validationErrors[item.id]?.globalRegion) && 'Required field'}
                          </div>
                        </div>
                      ) : (
                        <span>{item.globalRegion}</span>
                      )}
                    </td>
                    <td style={{ padding: '6px 12px', verticalAlign: 'top' }}>
                      {editingItem === item.id ? (
                        <div style={{ paddingTop: '6px' }}>
                          <FormControl fullWidth size="small">
                            <Select
                              value={editValues.countryOfOperations || ''}
                              onChange={(e) => handleInputChange('countryOfOperations', e.target.value)}
                              displayEmpty
                              sx={{
                                fontSize: '14px',
                                backgroundColor: 'white',
                              }}
                            >
                              <MenuItem value="" disabled>Select Country</MenuItem>
                              {getFilteredCountryOptions(editValues.globalRegion).map((country, index) => (
                                <MenuItem
                                  key={country.list_Of_Countrie_id || country.Code}
                                  value={country.Country_Name}
                                  sx={{
                                    backgroundColor: country.Country_Name === editValues.countryOfOperations ? '#e3f2fd' : 'white',
                                    '&.Mui-focusVisible': {
                                      backgroundColor: '#accafaff',
                                    }
                                  }}
                                >
                                  {country.Country_Name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <div data-error-field="true" style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: '500', lineHeight: '1.3', wordWrap: 'break-word' }}>
                            {(item.isSaved ? editValidationErrors.countryOfOperations : validationErrors[item.id]?.countryOfOperations) && 'Required field'}
                          </div>
                        </div>
                      ) : (
                        <span>{item.countryOfOperations}</span>
                      )}
                    </td>
                    <td style={{ padding: '6px 12px', verticalAlign: 'top' }}>
                      {editingItem === item.id ? (
                        <div style={{ paddingTop: '6px' }}>
                          <FormControl fullWidth size="small">
                            <Select
                              value={editValues.primaryCurrency || ''}
                              onChange={(e) => handleInputChange('primaryCurrency', e.target.value)}
                              displayEmpty
                              disabled={isOrganizationUsedInRateCard(item.siOrgDetailsId)}
                              sx={{
                                fontSize: '14px',
                                backgroundColor: isOrganizationUsedInRateCard(item.siOrgDetailsId) ? '#f5f5f5' : 'white',
                              }}
                            >
                              <MenuItem value="" disabled>Select Currency</MenuItem>
                              {getFilteredCurrencyOptions(editValues.countryOfOperations).map((currency, index) => (
                                <MenuItem
                                  key={currency.id}
                                  value={currency.displayName}
                                  sx={{
                                    backgroundColor: currency.displayName === editValues.primaryCurrency ? '#e3f2fd' : 'white',
                                    '&.Mui-focusVisible': {
                                      backgroundColor: '#accafaff',
                                    }
                                  }}
                                >
                                  {currency.displayName}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <div data-error-field="true" style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: '500', lineHeight: '1.3', wordWrap: 'break-word' }}>
                            {(item.isSaved ? editValidationErrors.primaryCurrency : validationErrors[item.id]?.primaryCurrency) && 'Required field'}
                          </div>
                        </div>
                      ) : (
                        <span>{item.primaryCurrency}</span>
                      )}
                    </td>
                    <td style={{ padding: '6px 12px', verticalAlign: 'top' }}>
                      {editingItem === item.id ? (
                        <>
                          <div style={{ paddingTop: '6px' }} ref={fiscalStartDateInputRef}>
                            <OrganizationDatePicker
                              value={editValues.fiscalStartDate || ''}
                              onChange={(value) => handleInputChange('fiscalStartDate', value)}
                              placeholder="Start Date"
                              error={!!(item.isSaved ? editValidationErrors.fiscalStartDate : validationErrors[item.id]?.fiscalStartDate)}
                              onError={(error) => {
                                // Track date input format errors
                                setDateInputErrors(prev => {
                                  const newErrors = {
                                    ...prev,
                                    fiscalStartDate: error
                                  };
                                  return newErrors;
                                });
                              }}
                              onCalendarOpen={setIsAnyCalendarOpen}
                              clearDateValidationError={() => {
                                // Clear fiscal date validation errors when user starts editing
                                if (item.isSaved) {
                                  setEditValidationErrors(prev => {
                                    const newErrors = { ...prev };
                                    delete newErrors.fiscalStartDate;
                                    return newErrors;
                                  });
                                } else {
                                  setValidationErrors(prev => {
                                    const newErrors = { ...prev };
                                    if (newErrors[item.id]) {
                                      delete newErrors[item.id].fiscalStartDate;
                                      if (Object.keys(newErrors[item.id]).length === 0) {
                                        delete newErrors[item.id];
                                      }
                                    }
                                    return newErrors;
                                  });
                                }
                              }}
                            />
                          </div>
                          <div data-error-field="true" style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: '500', lineHeight: '1.3', wordWrap: 'break-word' }}>
                            {(item.isSaved ? editValidationErrors.fiscalStartDate : validationErrors[item.id]?.fiscalStartDate) &&
                              (!editValues.fiscalStartDate || editValues.fiscalStartDate.trim() === '' ? 'Required field' : 'Fiscal Year Start Date cannot be greater than Fiscal Year End Date')
                            }
                          </div>
                        </>
                      ) : (
                        <span>{formatDateForDisplay(item.fiscalStartDate) || '-'}</span>
                      )}
                    </td>
                    <td style={{ padding: '6px 12px', verticalAlign: 'top' }}>
                      {editingItem === item.id ? (
                        <>
                          <div style={{ paddingTop: '6px' }} ref={fiscalEndDateInputRef}>
                            <OrganizationDatePicker
                              value={editValues.fiscalEndDate || ''}
                              onChange={(value) => handleInputChange('fiscalEndDate', value)}
                              placeholder="End Date"
                              error={!!(item.isSaved ? editValidationErrors.fiscalEndDate : validationErrors[item.id]?.fiscalEndDate)}
                              onError={(error) => {
                                // Track date input format errors
                                setDateInputErrors(prev => {
                                  const newErrors = {
                                    ...prev,
                                    fiscalEndDate: error
                                  };
                                  return newErrors;
                                });
                              }}
                              onCalendarOpen={setIsAnyCalendarOpen}
                              clearDateValidationError={() => {
                                // Clear fiscal date validation errors when user starts editing
                                if (item.isSaved) {
                                  setEditValidationErrors(prev => {
                                    const newErrors = { ...prev };
                                    delete newErrors.fiscalEndDate;
                                    return newErrors;
                                  });
                                } else {
                                  setValidationErrors(prev => {
                                    const newErrors = { ...prev };
                                    if (newErrors[item.id]) {
                                      delete newErrors[item.id].fiscalEndDate;
                                      if (Object.keys(newErrors[item.id]).length === 0) {
                                        delete newErrors[item.id];
                                      }
                                    }
                                    return newErrors;
                                  });
                                }
                              }}
                            />
                          </div>
                          <div data-error-field="true" style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: '500', lineHeight: '1.3', wordWrap: 'break-word' }}>
                            {(item.isSaved ? editValidationErrors.fiscalEndDate : validationErrors[item.id]?.fiscalEndDate) &&
                              (!editValues.fiscalEndDate || editValues.fiscalEndDate.trim() === '' ? 'Required field' : 'Fiscal Year End Date cannot be less than Fiscal Year Start Date')
                            }
                          </div>
                        </>
                      ) : (
                        <span>{formatDateForDisplay(item.fiscalEndDate) || '-'}</span>
                      )}
                    </td>
                    <td style={{ padding: '6px 12px', verticalAlign: 'top' }}>
                      {editingItem === item.id ? (
                        <div style={{ paddingTop: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <TextField
                              size="small"
                              style={{ flex: 1, minWidth: '200px' }}
                              value={editValues.comments || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Enforce 240 character limit, capitalize first character
                                const formattedValue = capitalizeFirstChar(value.substring(0, 240));
                                handleInputChange('comments', formattedValue);
                              }}
                              onPaste={(e) => {
                                e.preventDefault();
                                const pastedText = e.clipboardData.getData('text');
                                const currentValue = editValues.comments || '';
                                // Enforce 240 character limit on pasted text, capitalize first character
                                const newValue = (currentValue + pastedText).substring(0, 240);
                                const formattedValue = capitalizeFirstChar(newValue);
                                handleInputChange('comments', formattedValue);
                              }}
                              placeholder="Add comments"
                              variant="outlined"
                              multiline
                              minRows={1}
                              maxRows={2}
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  fontSize: '14px',
                                  backgroundColor: 'white',
                                },
                              }}
                            />
                            <div style={{ fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                              {(editValues.comments || '').length}/240
                            </div>
                          </div>
                          {(editValues.comments || '').length >= 240 && (
                            <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: '500' }}>
                              240 Limit exceeded
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{
                          display: 'block',
                          wordWrap: 'break-word',
                          whiteSpace: 'normal',
                          fontSize: '14px',
                          lineHeight: '1.4'
                        }}>
                          {item.comments || ''}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '6px 4px', verticalAlign: 'middle', textAlign: 'center' }}>
                      {editingItem === null ? (
                        <button
                          onClick={() => handleAddBusinessLinesWithChecks(item.organizationId)}
                          style={{
                            backgroundColor: '#28a745',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            color: 'white',
                            padding: '6px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            fontSize: '12px',
                            fontWeight: '500',
                            minWidth: '80px'
                          }}
                          title="Add Business Lines"
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#218838'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#28a745'}
                        >
                          <Plus size={14} />
                          <span>Add</span>
                        </button>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: '12px' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '6px 4px', verticalAlign: 'middle', textAlign: 'center' }}>
                      <div className="action-icons" style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
                        {editingItem === item.id && item.isSaved ? (
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
                        ) : !item.isSaved ? (
                          <button
                            className="action-btn delete-btn"
                            onClick={() => handleDelete(item.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : (
                          <div style={{ position: 'relative' }} ref={openMenuId === item.id ? menuRef : null}>
                            <button
                              className="action-btn menu-btn"
                              onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '4px' }}
                              title="Actions"
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
                                  <Edit size={14} style={{ color: '#3b82f6' }} />
                                  <span>Edit</span>
                                </button>

                                <button
                                  onClick={() => {
                                    handleDelete(item.id);
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
                                    color: '#333',
                                    borderTop: '1px solid #e0e0e0'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                >
                                  <Trash2 size={14} style={{ color: '#ef4444' }} />
                                  <span>Delete</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Add New Organization Button */}
        <div className="table-actions-bottom" style={{ display: 'flex', gap: '12px', marginTop: '16px', alignItems: 'center', marginLeft: '2rem' }}>
          <button
            className="add-btn"
            style={{
              width: '180px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            onClick={handleAddOrganization}
            disabled={loading}
          >
            {hasNewRow ? <Save size={18} /> : <Plus size={18} />}
            <span>{hasNewRow ? 'Save Organization' : 'Add Organization'}</span>
          </button>
        </div>

        <div style={{ height: '20px' }}></div>
      </div >
      {/* Business Line Popup */}
      {
        showBusinessLinePopup && selectedOrganizationForBL && (
          <BusinessLineForm
            organizationId={selectedOrganizationForBL.id}
            organizationName={selectedOrganizationForBL.name}
            onClose={handleCloseBusinessLinePopup}
            setUnsavedChangesChecker={setBusinessLineUnsavedChangesChecker}
            selectedProject={selectedProject}
          />
        )
      }

      {/* Hierarchy Popup */}
      {
        showHierarchyPopup && selectedOrganizationForHierarchy && (
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
            zIndex: 1001
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              maxWidth: '900px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Header */}
              <div style={{
                padding: '20px 24px',
                borderBottom: '1px solid #e5e7eb',
                backgroundColor: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <h2 style={{
                    margin: '0',
                    color: '#1f2937',
                    fontSize: '20px',
                    fontWeight: '600'
                  }}>
                    Organization Hierarchy
                  </h2>
                </div>
                <button
                  onClick={() => setShowHierarchyPopup(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: '6px',
                    color: 'black',
                    fontWeight: 'bold',
                    fontSize: '14px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  ✕
                </button>
              </div>

              {/* Content */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '24px'
              }}>
                {hierarchyLoading ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '40px',
                    color: '#6b7280'
                  }}>
                    Loading hierarchy data...
                  </div>
                ) : hierarchyData ? (
                  <div>
                    {/* Summary */}
                    {/* {hierarchyData.summary && (
                      <div style={{
                        backgroundColor: '#f0f9ff',
                        border: '1px solid #bae6fd',
                        borderRadius: '8px',
                        padding: '16px',
                        marginBottom: '24px'
                      }}>
                        <h3 style={{
                          margin: '0 0 12px 0',
                          color: '#0369a1',
                          fontSize: '16px',
                          fontWeight: '600'
                        }}>
                          Summary
                        </h3>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                          gap: '12px'
                        }}>
                          <div style={{
                            padding: '8px 12px',
                            backgroundColor: 'white',
                            borderRadius: '6px',
                            border: '1px solid #e5e7eb'
                          }}>
                            <span style={{ fontWeight: '600', color: '#374151' }}>
                              Business Lines: {hierarchyData.summary.businessLinesCount}
                            </span>
                          </div>
                          <div style={{
                            padding: '8px 12px',
                            backgroundColor: 'white',
                            borderRadius: '6px',
                            border: '1px solid #e5e7eb'
                          }}>
                            <span style={{ fontWeight: '600', color: '#374151' }}>
                              Portfolios: {hierarchyData.summary.portfoliosCount}
                            </span>
                          </div>
                          <div style={{
                            padding: '8px 12px',
                            backgroundColor: 'white',
                            borderRadius: '6px',
                            border: '1px solid #e5e7eb'
                          }}>
                            <span style={{ fontWeight: '600', color: '#374151' }}>
                              Services: {hierarchyData.summary.servicesCount}
                            </span>
                          </div>
                        </div>
                      </div>
                    )} */}

                    {/* Hierarchy Table */}
                    <div>
                      <h3 style={{
                        margin: '0 0 16px 0',
                        color: '#374151',
                        fontSize: '18px',
                        fontWeight: '600'
                      }}>
                        {selectedOrganizationForHierarchy.organizationName}
                      </h3>

                      {hierarchyData.businessLines.length === 0 ? (
                        <div style={{
                          padding: '40px',
                          textAlign: 'center',
                          color: '#6b7280',
                          backgroundColor: '#f9fafb',
                          borderRadius: '8px'
                        }}>
                          No business lines found for this organization.
                        </div>
                      ) : (
                        <div style={{
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          backgroundColor: 'white'
                        }}>
                          <table style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            fontSize: '14px'
                          }}>
                            <thead>
                              <tr style={{ backgroundColor: '#f8fafc' }}>
                                <th style={{
                                  padding: '12px 16px',
                                  textAlign: 'left',
                                  fontWeight: '600',
                                  color: '#374151',
                                  borderBottom: '1px solid #e5e7eb',
                                  borderRight: '1px solid #e5e7eb'
                                }}>
                                  Organization Name
                                </th>
                                <th style={{
                                  padding: '12px 16px',
                                  textAlign: 'left',
                                  fontWeight: '600',
                                  color: '#374151',
                                  borderBottom: '1px solid #e5e7eb',
                                  borderRight: '1px solid #e5e7eb'
                                }}>
                                  Business Line Name
                                </th>
                                <th style={{
                                  padding: '12px 16px',
                                  textAlign: 'left',
                                  fontWeight: '600',
                                  color: '#374151',
                                  borderBottom: '1px solid #e5e7eb',
                                  borderRight: '1px solid #e5e7eb'
                                }}>
                                  Portfolio Name
                                </th>
                                <th style={{
                                  padding: '12px 16px',
                                  textAlign: 'left',
                                  fontWeight: '600',
                                  color: '#374151',
                                  borderBottom: '1px solid #e5e7eb'
                                }}>
                                  Service Line Name
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                const rows = [];
                                hierarchyData.businessLines.forEach((businessLine) => {
                                  if (businessLine.portfolios && businessLine.portfolios.length > 0) {
                                    businessLine.portfolios.forEach((portfolio) => {
                                      if (portfolio.services && portfolio.services.length > 0) {
                                        portfolio.services.forEach((service) => {
                                          rows.push({
                                            organizationName: selectedOrganizationForHierarchy.organizationName,
                                            businessLineName: businessLine.Business_Line_Name,
                                            portfolioName: portfolio.Portfolio_Name,
                                            serviceName: service.Service_Name
                                          });
                                        });
                                      } else {
                                        // Portfolio with no services
                                        rows.push({
                                          organizationName: selectedOrganizationForHierarchy.organizationName,
                                          businessLineName: businessLine.Business_Line_Name,
                                          portfolioName: portfolio.Portfolio_Name,
                                          serviceName: '-'
                                        });
                                      }
                                    });
                                  } else {
                                    // Business line with no portfolios
                                    rows.push({
                                      organizationName: selectedOrganizationForHierarchy.organizationName,
                                      businessLineName: businessLine.Business_Line_Name,
                                      portfolioName: '-',
                                      serviceName: '-'
                                    });
                                  }
                                });

                                // Sort the rows alphabetically:
                                // 1. Business Line
                                // 2. Portfolio
                                // 3. Service Line
                                rows.sort((a, b) => {
                                  // Sort by Business Line
                                  const blComp = a.businessLineName.localeCompare(b.businessLineName);
                                  if (blComp !== 0) return blComp;

                                  // If Business Lines are the same, sort by Portfolio
                                  if (a.portfolioName === '-' && b.portfolioName !== '-') return -1;
                                  if (a.portfolioName !== '-' && b.portfolioName === '-') return 1;
                                  const portComp = a.portfolioName.localeCompare(b.portfolioName);
                                  if (portComp !== 0) return portComp;

                                  // If Portfolios are the same, sort by Service Line
                                  if (a.serviceName === '-' && b.serviceName !== '-') return -1;
                                  if (a.serviceName !== '-' && b.serviceName === '-') return 1;
                                  return a.serviceName.localeCompare(b.serviceName);
                                });

                                return rows;
                              })().map((row, index) => (
                                <tr key={index} style={{
                                  backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb',
                                  borderBottom: '1px solid #f3f4f6'
                                }}>
                                  <td style={{
                                    padding: '12px 16px',
                                    borderRight: '1px solid #e5e7eb',
                                    color: '#374151',
                                    fontWeight: '500'
                                  }}>
                                    {row.organizationName}
                                  </td>
                                  <td style={{
                                    padding: '12px 16px',
                                    borderRight: '1px solid #e5e7eb',
                                    color: '#374151'
                                  }}>
                                    {row.businessLineName}
                                  </td>
                                  <td style={{
                                    padding: '12px 16px',
                                    borderRight: '1px solid #e5e7eb',
                                    color: '#374151'
                                  }}>
                                    {row.portfolioName}
                                  </td>
                                  <td style={{
                                    padding: '12px 16px',
                                    color: row.serviceName === '-' ? '#9ca3af' : '#374151'
                                  }}>
                                    {row.serviceName}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '40px',
                    color: '#ef4444'
                  }}>
                    Failed to load hierarchy data
                  </div>
                )}
              </div>


            </div>
          </div>
        )
      }

      {/* No Project Selected Popup */}
      {
        showNoProjectSelectedPopup && (
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
        )
      }

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .help-modal-scroll::-webkit-scrollbar { width: 4px; }
        .help-modal-scroll::-webkit-scrollbar-track { background: transparent; margin: 8px 0; }
        .help-modal-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .help-modal-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </>
  );
};

export default OrganizationDetailsTable;
