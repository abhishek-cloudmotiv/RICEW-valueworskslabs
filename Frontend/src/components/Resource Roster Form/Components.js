import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { TextField, MenuItem } from '@mui/material';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, Info } from 'lucide-react';

// Custom Date Picker Component
export const CustomDatePicker = ({ value, onChange, placeholder, error = false, onError, onFocus, clearDateValidationError, width = '180px', disabled = false }) => {
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
  const dropdownRef = useRef(null);
  const isUserEditingRef = useRef(false);
  const pendingValueRef = useRef(null);
  const yearContainerRef = useRef(null);
  const [dropdownCoords, setDropdownCoords] = useState({ top: 0, left: 0, bottom: 'auto' });

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

  // Scroll to current year when switching to year view
  useEffect(() => {
    if (view === 'years' && yearContainerRef.current) {
      const currentYearElement = document.getElementById(`year-${currentMonth.getFullYear()}`);
      if (currentYearElement) {
        const container = yearContainerRef.current;
        container.scrollTop = currentYearElement.offsetTop - container.offsetTop - (container.clientHeight / 2) + (currentYearElement.clientHeight / 2);
      }
    }
  }, [view, currentMonth]);

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
      if (
        calendarRef.current && !calendarRef.current.contains(event.target) &&
        (!dropdownRef.current || !dropdownRef.current.contains(event.target))
      ) {
        setIsOpen(false);
        setTimeout(() => setView('calendar'), 300); // Reset after close animation
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && calendarRef.current) {
      const updatePosition = () => {
        if (calendarRef.current) {
          const rect = calendarRef.current.getBoundingClientRect();
          const spaceBelow = window.innerHeight - rect.bottom;
          const showAbove = spaceBelow < 320 && rect.top > 320;
          
          setDropdownCoords({
            top: showAbove ? 'auto' : rect.bottom + 4,
            bottom: showAbove ? window.innerHeight - rect.top + 4 : 'auto',
            left: rect.left
          });
        }
      };
      
      updatePosition();
      
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
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

  // Generate years (current year +/- 10 years or similar)
  const currentYearVal = new Date().getFullYear();
  const years = [];
  for (let i = currentYearVal - 50; i <= currentYearVal + 50; i++) {
    years.push(i);
  }

  return (
    <div style={{ position: 'relative', width: width, overflow: 'visible' }} ref={calendarRef}>
      <div style={{ position: 'relative', overflow: 'visible' }}>
        <TextField
          value={inputValue}
          onChange={handleInputChange}
          disabled={disabled}
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
          sx={{
            width: '100%',
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
            if (disabled) return;
            if (!isOpen) {
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

      {isOpen && createPortal(
        <div 
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: dropdownCoords.top !== 'auto' ? `${dropdownCoords.top}px` : 'auto',
            bottom: dropdownCoords.bottom !== 'auto' ? `${dropdownCoords.bottom}px` : 'auto',
            left: `${dropdownCoords.left}px`,
            zIndex: 999,
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '4px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            width: '280px',
            padding: '16px',
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
                    id={`year-${year}`}
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
      , document.body)}
    </div>
  );
};

