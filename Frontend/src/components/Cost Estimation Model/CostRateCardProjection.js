import React, { useState, useEffect, useRef, useMemo, Fragment } from 'react';
import { X, HelpCircle, Plus, Lock, Unlock, AlertCircle, Calendar, ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { MenuItem, Select, FormControl, TextField } from '@mui/material';
import { getIdToken } from '../../utils/cognito-auth';
import useLOV from '../../hooks/useLOV';
import { useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { useSession } from '../../context/SessionContext';
import SessionExpiredPopup from '../SessionExpiredPopup';


// Custom Date Picker Component
const CustomDatePicker = ({ value, onChange, placeholder, error = false, onError, onFocus, clearDateValidationError }) => {
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
    const [currentMonth, setCurrentMonth] = useState(new Date());
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
        }
    }, [value]);

    // Set currentMonth to show the selected date's month when calendar opens
    useEffect(() => {
        if (isOpen) {
            if (value) {
                const selectedDate = new Date(value);
                if (!isNaN(selectedDate.getTime())) {
                    setCurrentMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth()));
                }
            } else {
                setCurrentMonth(new Date());
            }
        }
    }, [isOpen]);

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
        <div style={{ position: 'relative', width: '220px', overflow: 'visible' }} ref={calendarRef}>
            <div style={{ position: 'relative', overflow: 'visible' }}>
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
                                        border: isSelected ? '2px solid #007bff' : 'none',
                                        borderRadius: '4px',
                                        backgroundColor: day ? (isSelected ? '#e3f2fd' : '#f8f9fa') : 'transparent',
                                        color: day ? (isSelected ? '#007bff' : '#333') : 'transparent',
                                        cursor: day ? 'pointer' : 'default',
                                        fontSize: '14px',
                                        fontWeight: isSelected ? '600' : 'normal',
                                        transition: 'background-color 0.2s',
                                        '&:hover': {
                                            backgroundColor: day ? '#e3f2fd' : 'transparent'
                                        }
                                    }}
                                    onMouseEnter={(e) => {
                                        if (day) e.target.style.backgroundColor = '#e3f2fd';
                                    }}
                                    onMouseLeave={(e) => {
                                        if (day) {
                                            e.target.style.backgroundColor = isSelected ? '#e3f2fd' : '#f8f9fa';
                                        }
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

// Disabled-Aware Date Picker Wrapper
const DisabledAwareDatePicker = ({ value, onChange, placeholder, error, disabled }) => {
    if (disabled) {
        // When disabled, show a read-only text field
        return (
            <div style={{ position: 'relative', width: '220px' }}>
                <TextField
                    value={value ? new Date(value).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                    }).replace(/ /g, '-').toUpperCase() : ''}
                    placeholder={placeholder}
                    size="small"
                    disabled={true}
                    sx={{
                        width: '100%',
                        '& .MuiInputBase-root': {
                            backgroundColor: '#f5f5f5',
                            fontSize: '13px',
                            fontFamily: 'inherit',
                        },
                        '& .MuiInputBase-input': {
                            padding: '6px 30px 6px 10px',
                            fontSize: '13px',
                            cursor: 'not-allowed',
                        },
                        '& .MuiOutlinedInput-root': {
                            '& fieldset': {
                                borderColor: '#ddd',
                                borderRadius: '3px',
                            },
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
                        color: '#999',
                        pointerEvents: 'none'
                    }}
                />
            </div>
        );
    }

    // When not disabled, use the original CustomDatePicker
    return (
        <CustomDatePicker
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            error={error}
        />
    );
};

// Rate Card Name Autocomplete Component
const RateCardNameAutocomplete = ({ value, onChange, onSelect, options, hasError }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState(value || '');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const dropdownRef = useRef(null);

    // Update inputValue when value prop changes (for external resets)
    useEffect(() => {
        setInputValue(value || '');
    }, [value]);

    // Filter options based on input
    const filteredOptions = options.filter(option =>
        option.label.toLowerCase().includes(inputValue.toLowerCase())
    );

    const handleInputChange = (e) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        onChange(newValue, null); // null index when typing
        setIsOpen(true);
        setHighlightedIndex(-1);
    };

    const handleSelectOption = (option) => {
        setInputValue(option.label);
        onChange(option.label, option.value); // Pass both label and value (index)
        if (onSelect) {
            onSelect(option.value); // Trigger the onSelect callback with the index
        }
        setIsOpen(false);
        setHighlightedIndex(-1);
    };

    const handleKeyDown = (e) => {
        if (!isOpen) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(prev =>
                    prev < filteredOptions.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0) {
                    handleSelectOption(filteredOptions[highlightedIndex]);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                setHighlightedIndex(-1);
                break;
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
            <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsOpen(true)}
                placeholder="Enter Rate Card Name"
                style={{
                    fontSize: '14px',
                    color: '#333',
                    padding: '6px 8px',
                    border: `1px solid ${hasError ? '#dc2626' : '#ddd'}`,
                    borderRadius: '4px',
                    width: '100%',
                    boxSizing: 'border-box'
                }}
            />
            {isOpen && filteredOptions.length > 0 && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'white',
                    border: '1px solid #ddd',
                    borderTop: 'none',
                    borderRadius: '0 0 4px 4px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 1000,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                    {filteredOptions.map((option, index) => (
                        <div
                            key={option.value}
                            onClick={() => handleSelectOption(option)}
                            style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                backgroundColor: index === highlightedIndex ? '#f0f8ff' : 'white',
                                borderBottom: '1px solid #eee',
                                fontSize: '14px'
                            }}
                            onMouseEnter={() => setHighlightedIndex(index)}
                        >
                            {option.label}
                        </div>
                    ))}
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
    error = false
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
            style={{ position: 'relative', width: '340px', overflow: 'visible' }}
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
                    placeholder="Select Organization..."
                    size="small"
                    error={error}
                    sx={{
                        width: '340px',
                        '& .MuiInputBase-root': {
                            backgroundColor: 'white',
                            fontSize: '13px',
                            fontFamily: 'inherit',
                            height: '32px',
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
                                    padding: '8px 12px',
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

const CostRateCardProjection = ({ onClose, selectedProject, setUnsavedChangesChecker }) => {
    const { handleAuthError, userId, projectId, projectName } = useSession();
    const navigate = useNavigate();
    const [showNoProjectSelectedPopup, setShowNoProjectSelectedPopup] = useState(false);

    useEffect(() => {
        if (!selectedProject?.id && !projectId) {
            setShowNoProjectSelectedPopup(true);
        }
    }, [selectedProject?.id, projectId]);

    const currentProjectId = (projectId || selectedProject?.id || '').toString();

    const [loading, setLoading] = useState(false);
    const [primaryOrgData, setPrimaryOrgData] = useState(null);
    const [selectedOrganizationId, setSelectedOrganizationId] = useState('');
    const [selectedBusinessLine, setSelectedBusinessLine] = useState('');
    const [serviceLineOptions, setServiceLineOptions] = useState([]);
    const [rateCardName, setRateCardName] = useState('');
    const [rateCardNameError, setRateCardNameError] = useState('');
    const [rateCardCode, setRateCardCode] = useState('');
    const [rateCardCodeError, setRateCardCodeError] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [endDateError, setEndDateError] = useState('');
    const [isLocked, setIsLocked] = useState(false);
    const [showHelpPopup, setShowHelpPopup] = useState(false);
    const [yoyEfficiency, setYoyEfficiency] = useState('');
    const [yoyRateIncrement, setYoyRateIncrement] = useState('');
    const [levelsData, setLevelsData] = useState([]);
    const [fiscalStartDate, setFiscalStartDate] = useState('');
    const [fiscalEndDate, setFiscalEndDate] = useState('');
    const [fiscalYearDates, setFiscalYearDates] = useState({ startDates: [], endDates: [] });
    const [fiscalYearLabels, setFiscalYearLabels] = useState([]);
    const [numberOfYears, setNumberOfYears] = useState(1);
    const [rateCardData, setRateCardData] = useState([]);
    const [onsiteEfficiencies, setOnsiteEfficiencies] = useState([]);
    const [offshoreEfficiencies, setOffshoreEfficiencies] = useState([]);
    const [onsiteCurrency, setOnsiteCurrency] = useState('');
    const [offshoreCurrency, setOffshoreCurrency] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [savingDraft, setSavingDraft] = useState(false);
    const [lockingUnlocking, setLockingUnlocking] = useState(false);
    const [isDraft, setIsDraft] = useState(false);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [showErrorMessage, setShowErrorMessage] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isUpdateMode, setIsUpdateMode] = useState(false);
    const [existingProjectionData, setExistingProjectionData] = useState([]);
    const [originalFiscalYearCount, setOriginalFiscalYearCount] = useState(0);
    const [originalFiscalYearLabels, setOriginalFiscalYearLabels] = useState([]);
    const [resourceRateCardProjectionNameIndex, setResourceRateCardProjectionNameIndex] = useState('');
    const helpPopupRef = useRef(null);
    const [projectDates, setProjectDates] = useState({ startDate: '', endDate: '' });

    const validateAndSanitizeData = (apiData) => {
        if (!Array.isArray(apiData)) return [];
        return apiData.map(item => {
            const sanitized = {};
            for (const key in item) {
                if (typeof item[key] === 'string') {
                    sanitized[key] = DOMPurify.sanitize(item[key].trim(), { ALLOWED_TAGS: [] });
                } else {
                    sanitized[key] = item[key];
                }
            }
            return sanitized;
        });
    };

    // Unsaved changes state
    const [originalState, setOriginalState] = useState({
        organizationId: '',
        serviceLine: '',
        startDate: '',
        endDate: '',
        onsiteEfficiencies: [],
        offshoreEfficiencies: []
    });
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const [confirmMessage, setConfirmMessage] = useState('');

    const hasUnsavedChanges = () => {
        // Compare efficiency arrays (only table data changes should trigger popup)
        const currentOnsite = onsiteEfficiencies.filter(val => val !== undefined && val !== '');
        const originalOnsite = originalState.onsiteEfficiencies.filter(val => val !== undefined && val !== '');

        if (currentOnsite.length !== originalOnsite.length) return true;

        for (let i = 0; i < onsiteEfficiencies.length; i++) {
            const currentVal = onsiteEfficiencies[i] !== undefined ? String(onsiteEfficiencies[i]) : '';
            const originalVal = originalState.onsiteEfficiencies[i] !== undefined ? String(originalState.onsiteEfficiencies[i]) : '';
            if (currentVal !== originalVal) return true;
        }

        for (let i = 0; i < offshoreEfficiencies.length; i++) {
            const currentVal = offshoreEfficiencies[i] !== undefined ? String(offshoreEfficiencies[i]) : '';
            const originalVal = originalState.offshoreEfficiencies[i] !== undefined ? String(originalState.offshoreEfficiencies[i]) : '';
            if (currentVal !== originalVal) return true;
        }

        return false;
    };

    const showConfirmation = (message, onConfirm) => {
        setConfirmMessage(message);
        setConfirmAction(() => onConfirm);
        setShowConfirmDialog(true);
    };

    const checkUnsavedChanges = (callback) => {
        if (hasUnsavedChanges()) {
            showConfirmation(
                'You have unsaved changes. Do you want to continue?',
                callback
            );
        } else {
            callback();
        }
    };

    // Provide unsaved changes checker to parent component
    useEffect(() => {
        if (setUnsavedChangesChecker) {
            setUnsavedChangesChecker(() => () => hasUnsavedChanges());
        }
    }, [selectedOrganizationId, selectedBusinessLine, startDate, endDate, onsiteEfficiencies, offshoreEfficiencies, originalState, setUnsavedChangesChecker]);

    // Fetch project planned dates from project definition API
    useEffect(() => {
        const fetchProjectDates = async () => {
            const pId = selectedProject?.id || projectId;
            if (!pId) return;
            try {
                let idToken = null;
                try {
                    idToken = await getIdToken();
                } catch (e) { }
                const response = await fetch(`https://hp60d1srbb.execute-api.ap-south-1.amazonaws.com/New/newApi/project/summaryByGSI?project_id=${encodeURIComponent(pId)}`, {
                    headers: idToken ? { 'Authorization': `Bearer ${idToken}` } : {}
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
                console.error('Error fetching project dates:', err);
                handleAuthError(err.message);
            }
        };
        fetchProjectDates();
    }, [selectedProject?.id, projectId]);

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

    // Fetch levels data whenever project changes
    useEffect(() => {
        const fetchData = async () => {
            try {
                if (!selectedProject?.id && !projectId) {
                    return;
                }

                setLoading(true);
                const token = await getIdToken();

                // Fetch levels data
                const levelsResponse = await fetch(
                    `https://3lwa3h2hm9.execute-api.ap-south-1.amazonaws.com/New/newApi/ricew/rateCard/levels`,
                    {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                    }
                );

                if (levelsResponse.status === 401 || levelsResponse.status === 403) {
                    handleAuthError('Unauthorized - session expired');
                    return;
                }

                if (levelsResponse.ok) {
                    const levelsResult = await levelsResponse.json();
                    if (levelsResult.success && levelsResult.data) {
                        const sanitizedData = validateAndSanitizeData(levelsResult.data);
                        // Sort data based on Level_Code (L1, L2, ... L10)
                        const sortedData = [...sanitizedData].sort((a, b) => {
                            const numA = parseInt(a.Level_Code?.replace('L', '') || '0');
                            const numB = parseInt(b.Level_Code?.replace('L', '') || '0');
                            return numA - numB;
                        });
                        setLevelsData(sortedData);
                    }
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                handleAuthError(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [currentProjectId]);

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

    // Helper function to calculate projected years based on contract dates
    const calculateProjectedYears = (contractStartDate, contractEndDate, fiscalStart, fiscalEnd) => {
        if (!contractStartDate || !contractEndDate || !fiscalStart || !fiscalEnd) {
            return { years: 1, labels: [], startDates: [], endDates: [] };
        }

        const contractEnd = new Date(contractEndDate);
        const baseFiscalStart = new Date(fiscalStart);
        const baseFiscalEnd = new Date(fiscalEnd);

        // Get base fiscal year start and end months and days
        const baseStartMonth = baseFiscalStart.getMonth();
        const baseStartDay = baseFiscalStart.getDate();
        const baseEndMonth = baseFiscalEnd.getMonth();
        const baseEndDay = baseFiscalEnd.getDate();

        // Find the fiscal year that contains the contract start date
        const storedYearDiff = baseFiscalEnd.getFullYear() - baseFiscalStart.getFullYear();
        const baseFiscalStartYear = getFiscalYearContaining(
            new Date(contractStartDate),
            baseStartMonth, baseStartDay,
            baseEndMonth, baseEndDay,
            storedYearDiff
        );
        const baseFiscalEndYear = baseFiscalStartYear + storedYearDiff;

        const labels = [];
        const startDates = [];
        const endDates = [];

        let yearIndex = 0;

        // Create fiscal years until we exceed the contract end date
        while (true) {
            const fyStartYear = baseFiscalStartYear + yearIndex;
            const fyEndYear = baseFiscalEndYear + yearIndex;

            const projectedStartDate = new Date(fyStartYear, baseStartMonth, baseStartDay);
            const projectedEndDate = new Date(fyEndYear, baseEndMonth, baseEndDay);

            // If projected start date exceeds contract end, stop
            if (projectedStartDate > contractEnd) {
                break;
            }

            // Generate fiscal year label (FY + last 2 digits of end year)
            const fiscalLabel = `FY${fyEndYear.toString().slice(-2)}`;
            labels.push(fiscalLabel);

            // Format dates as DD/MM/YYYY
            const formatDateDDMMYYYY = (date) => {
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                return `${day}/${month}/${year}`;
            };

            startDates.push(formatDateDDMMYYYY(projectedStartDate));
            endDates.push(formatDateDDMMYYYY(projectedEndDate));

            yearIndex++;

            // Check if next year would exceed contract end
            const nextYearStartDate = new Date(fyStartYear + 1, baseStartMonth, baseStartDay);
            if (nextYearStartDate > contractEnd) {
                break;
            }
        }

        return {
            years: Math.max(1, labels.length),
            labels,
            startDates,
            endDates
        };
    };

    // Auto-generate Rate Card Name and Code when Organization and Business Line are selected
    // Also fetch fiscal dates from the API
    useEffect(() => {
        if (selectedOrganizationId && selectedBusinessLine) {
            // Clear previous rate card name and state when selection changes
            setRateCardName('');
            setRateCardCode('');
            setStartDate('');
            setEndDate('');
            setIsUpdateMode(false);

            const selectedOrg = organizationOptions.find(org => org.value === selectedOrganizationId);

            if (selectedOrg) {
                // Generate Rate Card Code: YOY prefix and Ratecard suffix (using only the last part)
                const lastServiceLinePart = selectedBusinessLine.split(':').pop().trim();
                const blCode = lastServiceLinePart.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toUpperCase();
                const generatedCode = `YOY-${blCode}-Ratecard`;
                setRateCardCode(generatedCode);

                // Clear any errors
                setRateCardNameError('');
                setRateCardCodeError('');

                // Fetch fiscal dates and rate card data from API
                const fetchFiscalDates = async () => {
                    try {
                        setLoading(true);
                        const token = await getIdToken();
                        const response = await fetch(
                            `https://3lwa3h2hm9.execute-api.ap-south-1.amazonaws.com/New/newApi/ricew/rateCard/byOrgAndBusinessLine?organization_id=${primaryOrgData?.SI_Organization_Details_id || selectedOrganizationId}&ServiceLine_name=${encodeURIComponent(selectedBusinessLine)}&project_id=${currentProjectId}`,
                            {
                                method: 'GET',
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json',
                                },
                            }
                        );

                        if (response.status === 401 || response.status === 403) {
                            handleAuthError('Unauthorized - session expired');
                            return;
                        }

                        if (response.ok) {
                            const result = await response.json();
                            if (result.success && result.data && result.data.length > 0) {
                                const firstItem = result.data[0];

                                // Initialize originalState with fetched data
                                setOriginalState(prev => ({
                                    ...prev,
                                    organizationId: selectedOrganizationId,
                                    serviceLine: selectedBusinessLine,
                                    startDate: projectDates.startDate || '',
                                    endDate: projectDates.endDate || ''
                                }));

                                // Store fiscal dates
                                if (firstItem.fiscal_start_date && firstItem.fiscal_end_date) {
                                    setFiscalStartDate(firstItem.fiscal_start_date);
                                    setFiscalEndDate(firstItem.fiscal_end_date);
                                    setPrimaryOrgData({
                                        organization_id: selectedOrganizationId,
                                        fiscal_start_date: firstItem.fiscal_start_date,
                                        fiscal_end_date: firstItem.fiscal_end_date
                                    });
                                }

                                // Extract and store currency codes
                                if (firstItem.OR_PL_Currency) {
                                    setOnsiteCurrency(extractCurrencyCode(firstItem.OR_PL_Currency));
                                }
                                if (firstItem.OR_BL_Currency) {
                                    setOffshoreCurrency(extractCurrencyCode(firstItem.OR_BL_Currency));
                                }

                                // Store rate card data for all levels
                                setRateCardData(validateAndSanitizeData(result.data));

                                // Set Rate Card Name from API response
                                if (firstItem.Resource_Rate_Card_Name) {
                                    setRateCardName(firstItem.Resource_Rate_Card_Name);
                                }
                            }
                        }
                    } catch (error) {
                        console.error('Error fetching fiscal dates:', error);
                        handleAuthError(error.message);
                    } finally {
                        setLoading(false);
                    }
                };

                fetchFiscalDates();

                // Reset existing projection state whenever selection changes to avoid showing stale data
                const clearExistingProjectionState = () => {
                    setIsUpdateMode(false);
                    setExistingProjectionData([]);
                    setResourceRateCardProjectionNameIndex('');
                    setOriginalFiscalYearCount(0);
                    setOriginalFiscalYearLabels([]);
                    setStartDate(projectDates.startDate || '');
                    setEndDate(projectDates.endDate || '');
                    // Do not clear rateCardName here as it's being set by fetchFiscalDates
                    setOnsiteEfficiencies([]);
                    setOffshoreEfficiencies([]);
                    setIsDraft(false); // Reset draft status
                    setIsLocked(false); // Reset lock status
                };

                // Check for existing projection data
                const checkExistingProjection = async () => {
                    try {
                        setLoading(true);
                        clearExistingProjectionState(); // Clear before fetching new data
                        const token = await getIdToken();
                        const response = await fetch(
                            `https://3lwa3h2hm9.execute-api.ap-south-1.amazonaws.com/New/newApi/ricew/resourceRateCardProjection/uniqueEffortRateCards?organization_id=${primaryOrgData?.SI_Organization_Details_id || selectedOrganizationId}&ServiceLine_name=${encodeURIComponent(selectedBusinessLine)}&project_id=${currentProjectId}`,
                            {
                                method: 'GET',
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json',
                                },
                            }
                        );

                        if (response.status === 401 || response.status === 403) {
                            handleAuthError('Unauthorized - session expired');
                            return;
                        }

                        if (response.ok) {
                            const result = await response.json();
                            if (result.success && result.data && result.data.length > 0) {
                                const sanitizedData = validateAndSanitizeData(result.data);
                                // Existing projection found - switch to update mode
                                setIsUpdateMode(true);
                                setExistingProjectionData(sanitizedData);

                                // Load the existing data
                                const firstRecord = result.data[0];
                                const activeFYCount = parseInt(firstRecord.Active_Fiscal_Year_Count || '1');

                                // Store the name index for updates
                                if (firstRecord.ResourceRateCardProjection_name_index) {
                                    setResourceRateCardProjectionNameIndex(firstRecord.ResourceRateCardProjection_name_index);
                                }

                                // Set Rate Card Name from API response removed to prevent flicker
                                // Resource_Rate_Card_Name from byOrgAndBusinessLine is the authority

                                // Refresh labels and dates based on project planned dates (always from summaryByGSI)
                                const planStart = projectDates.startDate || firstRecord.Contract_Start_Date;
                                const planEnd = projectDates.endDate || firstRecord.Contract_End_Date;
                                if (planStart && planEnd && fiscalStartDate && fiscalEndDate) {
                                    const yearCalc = calculateProjectedYears(
                                        planStart,
                                        planEnd,
                                        fiscalStartDate,
                                        fiscalEndDate
                                    );
                                    // Use full calculated years from project dates — not limited by saved activeFYCount
                                    setNumberOfYears(yearCalc.years);
                                    setOriginalFiscalYearCount(yearCalc.years);
                                    setFiscalYearLabels(yearCalc.labels);
                                    setFiscalYearDates({
                                        startDates: yearCalc.startDates,
                                        endDates: yearCalc.endDates
                                    });
                                    setOriginalFiscalYearLabels(yearCalc.labels);
                                } else {
                                    setNumberOfYears(activeFYCount);
                                    setOriginalFiscalYearCount(activeFYCount);
                                }

                                // Extract efficiency values strictly up to Active_Fiscal_Year_Count
                                const onsiteEffs = Array(activeFYCount).fill('');
                                const offshoreEffs = Array(activeFYCount).fill('');

                                // Find all fiscal year columns
                                sanitizedData.forEach(record => {
                                    for (let i = 1; i <= activeFYCount; i++) {
                                        const fyIndex = i - 1;
                                        const osEffKey = `Onsite_Efficiency_FY${i}`;
                                        const offEffKey = `Offshore_Efficiency_FY${i}`;

                                        if (record[osEffKey] !== undefined && (onsiteEffs[fyIndex] === '')) {
                                            onsiteEffs[fyIndex] = record[osEffKey] || '';
                                        }
                                        if (record[offEffKey] !== undefined && (offshoreEffs[fyIndex] === '')) {
                                            offshoreEffs[fyIndex] = record[offEffKey] || '';
                                        }
                                    }
                                });

                                setOnsiteEfficiencies(onsiteEffs);
                                setOffshoreEfficiencies(offshoreEffs);

                                // Update originalState with loaded projection data
                                setOriginalState(prev => ({
                                    ...prev,
                                    organizationId: selectedOrganizationId,
                                    serviceLine: selectedBusinessLine,
                                    startDate: planStart || '',
                                    endDate: planEnd || '',
                                    onsiteEfficiencies: [...onsiteEffs],
                                    offshoreEfficiencies: [...offshoreEffs]
                                }));

                                // Check if any record has saveDraft === "true"
                                const hasDraftRecords = sanitizedData.some(record =>
                                    record.saveDraft === "true" || record.saveDraft === true
                                );
                                setIsDraft(hasDraftRecords);

                                // Check if any record has isLocked === "true"
                                const hasLockedRecords = sanitizedData.some(record =>
                                    record.isLocked === "true" || record.isLocked === true
                                );
                                setIsLocked(hasLockedRecords);

                                console.log('Existing projection data loaded strictly from active years:', {
                                    activeFYCount,
                                    onsiteEffs,
                                    offshoreEffs,
                                    isDraft: hasDraftRecords,
                                    isLocked: hasLockedRecords
                                });
                            } else {
                                // No existing projection - ensure we are in a clean create mode
                                clearExistingProjectionState();
                            }
                        } else {
                            // On API failure, default to clean create mode
                            clearExistingProjectionState();
                        }
                    } catch (error) {
                        console.error('Error checking existing projection:', error);
                        handleAuthError(error.message);
                        // On error, default to clean create mode
                        clearExistingProjectionState();
                    } finally {
                        setLoading(false);
                    }
                };

                checkExistingProjection();
            }
        }
    }, [selectedOrganizationId, selectedBusinessLine, organizationOptions, fiscalStartDate, fiscalEndDate, currentProjectId, projectDates]);

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

                if (selectedOrg.ServiceLines && Array.isArray(selectedOrg.ServiceLines)) {
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
                } else if (selectedOrg.Process_Service_Val_Array) {
                    const blOptions = selectedOrg.Process_Service_Val_Array.map(bl => ({
                        value: bl,
                        label: bl
                    }));
                    setServiceLineOptions(blOptions);

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

    // Reset selection when project changes
    useEffect(() => {
        setSelectedOrganizationId('');
        setSelectedBusinessLine('');
    }, [currentProjectId]);

    // Calculate fiscal years when contract dates and fiscal dates change
    useEffect(() => {
        if (startDate && endDate && fiscalStartDate && fiscalEndDate) {
            const result = calculateProjectedYears(startDate, endDate, fiscalStartDate, fiscalEndDate);
            setNumberOfYears(result.years);
            setFiscalYearLabels(result.labels);
            setFiscalYearDates({ startDates: result.startDates, endDates: result.endDates });
        } else if (fiscalStartDate && fiscalEndDate) {
            // No contract dates yet — derive the fiscal year containing today's date
            const formatDateDDMMYYYY = (dateStr) => {
                const date = new Date(dateStr);
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                return `${day}/${month}/${year}`;
            };

            const fsDate = new Date(fiscalStartDate);
            const feDate = new Date(fiscalEndDate);
            const yearDiff = feDate.getFullYear() - fsDate.getFullYear();
            const adjStartYear = getFiscalYearContaining(
                new Date(),
                fsDate.getMonth(), fsDate.getDate(),
                feDate.getMonth(), feDate.getDate(),
                yearDiff
            );
            const adjEndYear = adjStartYear + yearDiff;
            const adjStart = new Date(adjStartYear, fsDate.getMonth(), fsDate.getDate());
            const adjEnd = new Date(adjEndYear, feDate.getMonth(), feDate.getDate());
            const fiscalLabel = `FY${adjEndYear.toString().slice(-2)}`;

            setNumberOfYears(1);
            setFiscalYearLabels([fiscalLabel]);
            setFiscalYearDates({
                startDates: [formatDateDDMMYYYY(adjStart)],
                endDates: [formatDateDDMMYYYY(adjEnd)]
            });
        } else {
            // Default: show only base rate (current year) with no dates
            const currentYear = new Date().getFullYear();
            const fiscalLabel = `FY${currentYear.toString().slice(-2)}`;
            setNumberOfYears(1);
            setFiscalYearLabels([fiscalLabel]);
            setFiscalYearDates({ startDates: [], endDates: [] });
        }
    }, [startDate, endDate, fiscalStartDate, fiscalEndDate]);

    // Initialize efficiency arrays when numberOfYears or levelsData changes
    useEffect(() => {
        if (!numberOfYears || levelsData.length === 0) return;

        // Only reset if we're not in update mode or if arrays are currently empty
        if (!isUpdateMode) {
            setOnsiteEfficiencies(prev => {
                if (prev.length === numberOfYears) return prev;
                return Array(numberOfYears).fill('');
            });
            setOffshoreEfficiencies(prev => {
                if (prev.length === numberOfYears) return prev;
                return Array(numberOfYears).fill('');
            });
        } else {
            // In update mode, resize arrays if needed but preserve existing values
            // ONLY if the current size is less than what we need (don't clip if data was just loaded)
            setOnsiteEfficiencies(prev => {
                if (prev.length >= numberOfYears) return prev;
                const newArray = Array(numberOfYears).fill('');
                prev.forEach((val, idx) => {
                    if (idx < numberOfYears) newArray[idx] = val;
                });
                return newArray;
            });
            setOffshoreEfficiencies(prev => {
                if (prev.length >= numberOfYears) return prev;
                const newArray = Array(numberOfYears).fill('');
                prev.forEach((val, idx) => {
                    if (idx < numberOfYears) newArray[idx] = val;
                });
                return newArray;
            });
        }
    }, [numberOfYears, isUpdateMode, levelsData]);

    // Helper function to extract currency code from currency string
    // e.g., "Indian Rupee (INR)" -> "INR"
    const extractCurrencyCode = (currencyString) => {
        if (!currencyString) return '';
        const match = currencyString.match(/\(([^)]+)\)/);
        return match ? match[1] : '';
    };

    // Function to calculate adjusted rate based on base rate and efficiency percentage
    const calculateAdjustedRate = (baseRate, efficiencyValue) => {
        if (!baseRate || baseRate === 0 || !efficiencyValue || efficiencyValue.trim() === '') {
            return baseRate || 0;
        }

        const trimmedValue = efficiencyValue.trim();
        let percentage = 0;

        // Check if value starts with + or -
        if (trimmedValue.startsWith('+') || trimmedValue.startsWith('-')) {
            percentage = parseFloat(trimmedValue);
        } else {
            // If no sign, treat as positive
            percentage = parseFloat(trimmedValue);
        }

        if (isNaN(percentage)) {
            return baseRate;
        }

        // Apply percentage adjustment: baseRate + (baseRate * percentage / 100)
        const adjustment = (baseRate * percentage) / 100;
        const result = baseRate + adjustment;

        // Round to 2 decimal places
        return Math.round(result * 100) / 100;
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

    // Helper function to reload projection data after create/update
    const reloadProjectionData = async () => {
        try {
            setLoading(true);
            const token = await getIdToken();
            const response = await fetch(
                `https://3lwa3h2hm9.execute-api.ap-south-1.amazonaws.com/New/newApi/ricew/resourceRateCardProjection/uniqueEffortRateCards?organization_id=${primaryOrgData?.SI_Organization_Details_id || selectedOrganizationId}&ServiceLine_name=${encodeURIComponent(selectedBusinessLine)}&project_id=${currentProjectId}`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (response.status === 401 || response.status === 403) {
                handleAuthError('Unauthorized - session expired');
                return;
            }

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data && result.data.length > 0) {
                    const sanitizedData = validateAndSanitizeData(result.data);
                    // Existing projection found - switch to update mode
                    setIsUpdateMode(true);
                    setExistingProjectionData(sanitizedData);

                    // Load the existing data
                    const firstRecord = result.data[0];
                    const activeFYCount = parseInt(firstRecord.Active_Fiscal_Year_Count || '1');

                    // Store the name index for updates
                    if (firstRecord.ResourceRateCardProjection_name_index) {
                        setResourceRateCardProjectionNameIndex(firstRecord.ResourceRateCardProjection_name_index);
                    }

                    // Set Rate Card Name from API response removed to prevent flicker
                    // Resource_Rate_Card_Name from byOrgAndBusinessLine is the authority

                    // Refresh labels and dates based on project planned dates (always from summaryByGSI)
                    const planStart = projectDates.startDate || firstRecord.Contract_Start_Date;
                    const planEnd = projectDates.endDate || firstRecord.Contract_End_Date;
                    if (planStart && planEnd && fiscalStartDate && fiscalEndDate) {
                        const yearCalc = calculateProjectedYears(
                            planStart,
                            planEnd,
                            fiscalStartDate,
                            fiscalEndDate
                        );
                        // Use full calculated years from project dates — not limited by saved activeFYCount
                        setNumberOfYears(yearCalc.years);
                        setOriginalFiscalYearCount(yearCalc.years);
                        setFiscalYearLabels(yearCalc.labels);
                        setFiscalYearDates({
                            startDates: yearCalc.startDates,
                            endDates: yearCalc.endDates
                        });
                        setOriginalFiscalYearLabels(yearCalc.labels);
                    } else {
                        setNumberOfYears(activeFYCount);
                        setOriginalFiscalYearCount(activeFYCount);
                    }

                    // Extract efficiency values strictly up to Active_Fiscal_Year_Count
                    const onsiteEffs = Array(activeFYCount).fill('');
                    const offshoreEffs = Array(activeFYCount).fill('');

                    // Find all fiscal year columns
                    sanitizedData.forEach(record => {
                        for (let i = 1; i <= activeFYCount; i++) {
                            const fyIndex = i - 1;
                            const osEffKey = `Onsite_Efficiency_FY${i}`;
                            const offEffKey = `Offshore_Efficiency_FY${i}`;

                            if (record[osEffKey] !== undefined && (onsiteEffs[fyIndex] === '')) {
                                onsiteEffs[fyIndex] = record[osEffKey] || '';
                            }
                            if (record[offEffKey] !== undefined && (offshoreEffs[fyIndex] === '')) {
                                offshoreEffs[fyIndex] = record[offEffKey] || '';
                            }
                        }
                    });

                    setOnsiteEfficiencies(onsiteEffs);
                    setOffshoreEfficiencies(offshoreEffs);

                    // Reset originalState after successful reload
                    setOriginalState({
                        organizationId: selectedOrganizationId,
                        serviceLine: selectedBusinessLine,
                        startDate: planStart || '',
                        endDate: planEnd || '',
                        onsiteEfficiencies: [...onsiteEffs],
                        offshoreEfficiencies: [...offshoreEffs]
                    });

                    // Check if any record has saveDraft === "true"
                    const hasDraftRecords = sanitizedData.some(record =>
                        record.saveDraft === "true" || record.saveDraft === true
                    );
                    setIsDraft(hasDraftRecords);

                    // Check if any record has isLocked === "true"
                    const hasLockedRecords = sanitizedData.some(record =>
                        record.isLocked === "true" || record.isLocked === true
                    );
                    setIsLocked(hasLockedRecords);
                }
            }
        } catch (error) {
            console.error('Error reloading projection data:', error);
            handleAuthError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateNew = () => {
        // Reset all fields for creating a new rate card
        setSelectedOrganizationId('');
        setSelectedBusinessLine('');
        setRateCardName('');
        setRateCardCode('');
        setStartDate('');
        setEndDate('');
        setRateCardNameError('');
        setRateCardCodeError('');
        setEndDateError('');
        setYoyEfficiency('');
        setYoyRateIncrement('');
        setFiscalStartDate('');
        setFiscalEndDate('');
        setFiscalYearDates({ startDates: [], endDates: [] });
        setRateCardData([]);
        setOnsiteEfficiencies([]);
        setOffshoreEfficiencies([]);
        setOnsiteCurrency('');
        setOffshoreCurrency('');
        setIsUpdateMode(false);
        setExistingProjectionData([]);
        setOriginalFiscalYearCount(0);
        setOriginalFiscalYearLabels([]);
        setResourceRateCardProjectionNameIndex('');

        // Clear draft and locked status
        setIsDraft(false);
        setIsLocked(false);

        // Clear any success/error banners
        setShowSuccessMessage(false);
        setSuccessMessage('');
        setShowErrorMessage(false);
        setErrorMessage('');

        // Reset to default: show only base rate column with current year
        const currentYear = new Date().getFullYear();
        const fiscalLabel = `FY${currentYear.toString().slice(-2)}`;
        setNumberOfYears(1);
        setFiscalYearLabels([fiscalLabel]);
    };

    // Handle Lock/Unlock functionality
    const handleLockUnlock = async () => {
        try {
            setLockingUnlocking(true);

            // Validation - Check if we have an existing projection to lock/unlock
            if (!resourceRateCardProjectionNameIndex) {
                setErrorMessage('No existing rate card projection found. Please create or load a rate card first.');
                setShowErrorMessage(true);
                setTimeout(() => {
                    setShowErrorMessage(false);
                    setErrorMessage('');
                }, 5000);
                return;
            }

            const newLockedState = !isLocked;
            const payload = {
                project_id: currentProjectId,
                organization_id: (primaryOrgData?.SI_Organization_Details_id || selectedOrganizationId || '').toString(),
                ServiceLine_name: selectedBusinessLine,
                updated_by: userId,
                isLocked: newLockedState ? "true" : "false"
            };

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

            const response = await fetch('https://3lwa3h2hm9.execute-api.ap-south-1.amazonaws.com/New/newApi/ricew/resourceRateCardProjection/setLock', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });

            if (response.status === 401 || response.status === 403) {
                handleAuthError('Unauthorized - session expired');
                return;
            }

            if (response.ok) {
                setIsLocked(newLockedState);
                setSuccessMessage(`Rate Card ${newLockedState ? 'locked' : 'unlocked'} successfully!`);
                setShowSuccessMessage(true);
                setTimeout(() => {
                    setShowSuccessMessage(false);
                    setSuccessMessage('');
                }, 3000);
            } else {
                const errorData = await response.json().catch(() => ({}));
                setErrorMessage(errorData.error || 'Failed to lock/unlock rate card');
                setShowErrorMessage(true);
                setTimeout(() => {
                    setShowErrorMessage(false);
                    setErrorMessage('');
                }, 5000);
            }
        } catch (error) {
            handleAuthError(error.message);
            setErrorMessage('Error locking/unlocking rate card. Please try again.');
            setShowErrorMessage(true);
            setTimeout(() => {
                setShowErrorMessage(false);
                setErrorMessage('');
            }, 5000);
        } finally {
            setLockingUnlocking(false);
        }
    };

    // Handle Save Draft functionality
    const handleSaveDraft = async () => {
        try {
            setSavingDraft(true);
            setLoading(true);

            // Validation - Check if we have an existing projection to save as draft
            if (!resourceRateCardProjectionNameIndex) {
                setErrorMessage('No existing rate card projection found. Please create a rate card first before saving as draft.');
                setShowErrorMessage(true);
                setTimeout(() => {
                    setShowErrorMessage(false);
                    setErrorMessage('');
                }, 5000);
                return;
            }

            // Get auth token
            let token = null;
            try {
                token = await getIdToken();
            } catch (tokenError) {
                setErrorMessage('Authentication failed. Please try again.');
                setShowErrorMessage(true);
                setTimeout(() => {
                    setShowErrorMessage(false);
                    setErrorMessage('');
                }, 5000);
                return;
            }

            // Prepare detailed fiscal year data for the payload
            const fiscalYearsToUpdateData = [];

            // We calculate the rates for all levels to find the representative rates for the header 
            // (Matches backend expectation for fiscal_years_to_add structure)
            for (let i = 1; i <= numberOfYears; i++) {
                const fyIndex = i - 1;

                // Use the first level's data as a baseline for the payload rates
                const firstLevel = levelsData[0];
                const rateData = rateCardData.find(item => item.Level_Definition_id === firstLevel?.Level_Definition_id);
                const onsiteBaseRate = rateData ? parseFloat(rateData.OR_PL_Amount_hours) || 0 : 0;
                const offshoreBaseRate = rateData ? parseFloat(rateData.OR_BL_Amount_hours) || 0 : 0;

                // Calculate rates for this specific year
                let onsiteRate = onsiteBaseRate;
                let offshoreRate = offshoreBaseRate;
                for (let j = 0; j < i; j++) {
                    onsiteRate = calculateAdjustedRate(onsiteRate, onsiteEfficiencies[j]);
                    offshoreRate = calculateAdjustedRate(offshoreRate, offshoreEfficiencies[j]);
                }

                fiscalYearsToUpdateData.push({
                    fiscal_year_number: i,
                    onsite_rate_based: onsiteRate.toString(),
                    onsite_rate_projected: onsiteRate.toString(),
                    offshore_rate_based: offshoreRate.toString(),
                    offshore_rate_projected: offshoreRate.toString(),
                    onsite_efficiency: onsiteEfficiencies[fyIndex] || '',
                    offshore_efficiency: offshoreEfficiencies[fyIndex] || '',
                    fiscal_year_start_date: fiscalYearDates.startDates[fyIndex] || '',
                    fiscal_year_end_date: fiscalYearDates.endDates[fyIndex] || ''
                });
            }

            // Determine which fiscal years to remove (if duration decreased)
            const fiscalYearsToRemove = [];
            for (let i = numberOfYears + 1; i <= originalFiscalYearCount; i++) {
                fiscalYearsToRemove.push(i);
            }

            // Prepare payload for saveDraft API
            const payload = {
                project_id: currentProjectId,
                organization_id: (primaryOrgData?.SI_Organization_Details_id || selectedOrganizationId || '').toString(),
                ServiceLine_name: selectedBusinessLine,
                Contract_Start_Date: startDate,
                Contract_End_Date: endDate,
                fiscal_year_count: numberOfYears,
                fiscal_years_to_add: fiscalYearsToUpdateData,
                fiscal_years_to_remove: fiscalYearsToRemove,
                updated_by: userId
            };

            // Make API call to saveDraft endpoint
            const response = await fetch(
                'https://3lwa3h2hm9.execute-api.ap-south-1.amazonaws.com/New/newApi/ricew/resourceRateCardProjection/saveDraft',
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload)
                }
            );

            if (response.status === 401 || response.status === 403) {
                handleAuthError('Unauthorized - session expired');
                return;
            }

            const result = await response.json();

            if (response.ok && result.success) {
                setSuccessMessage(`Draft saved successfully! Updated ${result.updatedRecords} record(s).`);
                setShowSuccessMessage(true);

                // Reload the data smoothly without full page refresh immediately
                await reloadProjectionData();

                setTimeout(() => {
                    setShowSuccessMessage(false);
                    setSuccessMessage('');
                }, 2000);
            } else {
                throw new Error(result.error || result.details || 'Failed to save draft');
            }

        } catch (error) {
            handleAuthError(error.message);
            setErrorMessage(error.message || 'Failed to save draft. Please try again.');
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

    const handleSubmit = async () => {
        try {
            setSubmitting(true);

            // Validation
            if (!selectedOrganizationId) {
                setErrorMessage('Please select an Organization');
                setShowErrorMessage(true);
                setTimeout(() => {
                    setShowErrorMessage(false);
                    setErrorMessage('');
                }, 5000);
                return;
            }
            if (!selectedBusinessLine) {
                setErrorMessage('Please select a Service Line');
                setShowErrorMessage(true);
                setTimeout(() => {
                    setShowErrorMessage(false);
                    setErrorMessage('');
                }, 5000);
                return;
            }
            if (!rateCardName) {
                setErrorMessage('Rate Card Name is required');
                setShowErrorMessage(true);
                setTimeout(() => {
                    setShowErrorMessage(false);
                    setErrorMessage('');
                }, 5000);
                return;
            }
            if (!rateCardCode) {
                setErrorMessage('Rate Card Code is required');
                setShowErrorMessage(true);
                setTimeout(() => {
                    setShowErrorMessage(false);
                    setErrorMessage('');
                }, 5000);
                return;
            }
            if (!startDate) {
                setErrorMessage('Planned Start Date is required');
                setShowErrorMessage(true);
                setTimeout(() => {
                    setShowErrorMessage(false);
                    setErrorMessage('');
                }, 5000);
                return;
            }
            if (!endDate) {
                setErrorMessage('Planned End Date is required');
                setShowErrorMessage(true);
                setTimeout(() => {
                    setShowErrorMessage(false);
                    setErrorMessage('');
                }, 5000);
                return;
            }
            if (!onsiteCurrency || !offshoreCurrency) {
                setErrorMessage('Please select Organization and Service Line to load currency information');
                setShowErrorMessage(true);
                setTimeout(() => {
                    setShowErrorMessage(false);
                    setErrorMessage('');
                }, 5000);
                return;
            }
            if (levelsData.length === 0) {
                setErrorMessage('No level data available to submit');
                setShowErrorMessage(true);
                setTimeout(() => {
                    setShowErrorMessage(false);
                    setErrorMessage('');
                }, 5000);
                return;
            }

            // Get organization name
            const selectedOrg = organizationOptions.find(org => org.value === selectedOrganizationId);
            if (!selectedOrg) {
                setErrorMessage('Selected organization not found');
                setShowErrorMessage(true);
                setTimeout(() => {
                    setShowErrorMessage(false);
                    setErrorMessage('');
                }, 5000);
                return;
            }

            setLoading(true);

            // Get JWT token
            const token = await getIdToken();

            // Check if we're in update mode
            if (isUpdateMode) {
                // Prepare the list of years to remove (if duration decreased)
                const fiscalYearsToRemove = [];
                for (let i = numberOfYears + 1; i <= originalFiscalYearCount; i++) {
                    fiscalYearsToRemove.push(i);
                }

                // Prepare the data for ALL current active years to ensure values are updated
                const fiscalYearsToUpdateData = [];

                // We calculate the rates for all levels to find the representative rates for the header
                // (Matches backend expectation for fiscal_years_to_add structure)
                for (let i = 1; i <= numberOfYears; i++) {
                    const fyIndex = i - 1;

                    // Use the first level's data as a baseline for the payload rates
                    const firstLevel = levelsData[0];
                    const rateData = rateCardData.find(item => item.Level_Definition_id === firstLevel?.Level_Definition_id);
                    const onsiteBaseRate = rateData ? parseFloat(rateData.OR_PL_Amount_hours) || 0 : 0;
                    const offshoreBaseRate = rateData ? parseFloat(rateData.OR_BL_Amount_hours) || 0 : 0;

                    // Calculate rates for this specific year
                    let onsiteRate = onsiteBaseRate;
                    let offshoreRate = offshoreBaseRate;
                    for (let j = 0; j < i; j++) {
                        onsiteRate = calculateAdjustedRate(onsiteRate, onsiteEfficiencies[j]);
                        offshoreRate = calculateAdjustedRate(offshoreRate, offshoreEfficiencies[j]);
                    }

                    fiscalYearsToUpdateData.push({
                        fiscal_year_number: i,
                        onsite_rate_based: onsiteRate.toString(),
                        onsite_rate_projected: onsiteRate.toString(),
                        offshore_rate_based: offshoreRate.toString(),
                        offshore_rate_projected: offshoreRate.toString(),
                        onsite_efficiency: onsiteEfficiencies[fyIndex] || '',
                        offshore_efficiency: offshoreEfficiencies[fyIndex] || '',
                        fiscal_year_start_date: fiscalYearDates.startDates[fyIndex] || '',
                        fiscal_year_end_date: fiscalYearDates.endDates[fyIndex] || ''
                    });
                }

                const updatePayload = {
                    project_id: currentProjectId,
                    organization_id: (primaryOrgData?.SI_Organization_Details_id || selectedOrganizationId || '').toString(),
                    ServiceLine_name: selectedBusinessLine,
                    Contract_Start_Date: startDate,
                    Contract_End_Date: endDate,
                    fiscal_year_count: numberOfYears,
                    fiscal_years_to_add: fiscalYearsToUpdateData, // This updates existing or adds new
                    fiscal_years_to_remove: fiscalYearsToRemove,
                    saveDraft: "false", // Finalize the rate card (remove draft status)
                    updated_by: userId
                };

                const response = await fetch(
                    'https://3lwa3h2hm9.execute-api.ap-south-1.amazonaws.com/New/newApi/ricew/resourceRateCardProjection/update',
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(updatePayload)
                    }
                );

                if (response.status === 401 || response.status === 403) {
                    handleAuthError('Unauthorized - session expired');
                    return;
                }

                const result = await response.json();

                if (response.ok && result.success) {
                    setSuccessMessage(`Rate Card Projection updated successfully!`);
                    setShowSuccessMessage(true);

                    // Reload the data smoothly without full page refresh immediately
                    await reloadProjectionData();

                    setTimeout(() => {
                        setShowSuccessMessage(false);
                        setSuccessMessage('');
                    }, 3000);
                } else {
                    throw new Error(result.error || result.details || 'Failed to update rate card projection');
                }
            } else {
                // Create Mode: Use the original create logic
                // Prepare records - each record contains both onsite and offshore data
                const records = levelsData
                    .sort((a, b) => {
                        const numA = parseInt(a.Level_Code?.replace('L', '') || '0');
                        const numB = parseInt(b.Level_Code?.replace('L', '') || '0');
                        return numA - numB;
                    })
                    .map(level => {
                        const rateData = rateCardData.find(item => item.Level_Definition_id === level.Level_Definition_id);
                        const onsiteBaseRate = rateData ? parseFloat(rateData.OR_PL_Amount_hours) || 0 : 0;
                        const offshoreBaseRate = rateData ? parseFloat(rateData.OR_BL_Amount_hours) || 0 : 0;

                        // Calculate cascading onsite rates
                        const onsiteRates = [];
                        for (let i = 0; i < numberOfYears; i++) {
                            const previousRate = i === 0 ? onsiteBaseRate : onsiteRates[i - 1];
                            onsiteRates.push(calculateAdjustedRate(previousRate, onsiteEfficiencies[i]));
                        }

                        // Calculate cascading offshore rates
                        const offshoreRates = [];
                        for (let i = 0; i < numberOfYears; i++) {
                            const previousRate = i === 0 ? offshoreBaseRate : offshoreRates[i - 1];
                            offshoreRates.push(calculateAdjustedRate(previousRate, offshoreEfficiencies[i]));
                        }

                        const record = {
                            project_id: currentProjectId,
                            user_id: userId,
                            created_by: userId,
                            Level: level.Level_Code || '',
                            Level_Code: level.Level_Short_Code || '',
                            Designation: level.designation || ''
                        };

                        // Add fiscal year data for both onsite and offshore
                        fiscalYearLabels.forEach((fy, index) => {
                            const fyNum = index + 1;
                            // Onsite rates
                            record[`Onsite_Rate_based_FY${fyNum}`] = onsiteRates[index] || 0;
                            record[`Onsite_Rate_Projected_FY${fyNum}`] = onsiteRates[index] || 0;
                            // Offshore rates
                            record[`Offshore_Rate_based_FY${fyNum}`] = offshoreRates[index] || 0;
                            record[`Offshore_Rate_Projected_FY${fyNum}`] = offshoreRates[index] || 0;
                            // Efficiency fields
                            record[`Onsite_Efficiency_FY${fyNum}`] = onsiteEfficiencies[index] || '';
                            record[`Offshore_Efficiency_FY${fyNum}`] = offshoreEfficiencies[index] || '';
                        });

                        return record;
                    });

                // Prepare payload
                const payload = {
                    project_id: currentProjectId,
                    user_id: userId,
                    Organization_Name: selectedOrg.label,
                    Organization_id: (primaryOrgData?.SI_Organization_Details_id || selectedOrganizationId || '').toString(),
                    ServiceLine_name: selectedBusinessLine,
                    Effort_Rate_Card_Name: rateCardName,
                    Rate_Card_Code: rateCardCode,
                    Contract_Start_Date: startDate,
                    Contract_End_Date: endDate,
                    OR_PL_Currency: onsiteCurrency,
                    OR_BL_Currency: offshoreCurrency,
                    created_by: userId,
                    fiscal_years: fiscalYearLabels,
                    records
                };

                // Make API call
                const response = await fetch(
                    'https://3lwa3h2hm9.execute-api.ap-south-1.amazonaws.com/New/newApi/ricew/resourceRateCardProjection/create',
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(payload)
                    }
                );

                if (response.status === 401 || response.status === 403) {
                    handleAuthError('Unauthorized - session expired');
                    return;
                }

                const result = await response.json();

                if (response.ok && result.success) {
                    setSuccessMessage(`Rate Card Projection created successfully! Inserted ${result.data.totalRecords} records.`);
                    setShowSuccessMessage(true);
                    setTimeout(() => {
                        setShowSuccessMessage(false);
                        setSuccessMessage('');
                    }, 3000);

                    // Reload the data from backend to reflect changes
                    await reloadProjectionData();
                } else if (response.status === 409) {
                    // Handle duplicate rate card error
                    setErrorMessage(result.message || result.error || 'A rate card already exists for this Organization and Service Line combination.');
                    setShowErrorMessage(true);
                    setTimeout(() => {
                        setShowErrorMessage(false);
                        setErrorMessage('');
                    }, 5000);
                } else {
                    throw new Error(result.error || result.details || 'Failed to create rate card projection');
                }
            }

        } catch (error) {
            setErrorMessage(error.message || 'Failed to submit rate card. Please try again.');
            setShowErrorMessage(true);
            setTimeout(() => {
                setShowErrorMessage(false);
                setErrorMessage('');
            }, 5000);
        } finally {
            setSubmitting(false);
            setLoading(false);
        }
    };

    return (
        <Fragment>
            <SessionExpiredPopup />
            {/* Loading Overlay */}
            {(loading || lockingUnlocking || savingDraft || submitting) && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(255, 255, 255, 0.7)',
                    backdropFilter: 'blur(2px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '32px',
                        borderRadius: '16px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '16px',
                        minWidth: '200px'
                    }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            border: '3px solid #f3f3f3',
                            borderTop: '3px solid #3b82f6',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                        }}></div>
                        <span style={{ fontSize: '15px', color: '#4b5563', fontWeight: '500' }}>
                            {lockingUnlocking ? (isLocked ? 'Unlocking...' : 'Locking...') : 
                             (savingDraft || submitting) ? 'Processing...' : 'Loading Data...'}
                        </span>
                    </div>
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
                    <span style={{ fontWeight: '500' }}>{DOMPurify.sanitize(successMessage || 'Operation successful!', { ALLOWED_TAGS: [] })}</span>
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
                    <span style={{ fontWeight: '500' }}>{DOMPurify.sanitize(errorMessage || 'Something went wrong!', { ALLOWED_TAGS: [] })}</span>
                </div>
            )}

            <style>{`
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }

                .help-modal-scroll::-webkit-scrollbar { width: 4px; }
                .help-modal-scroll::-webkit-scrollbar-track { background: transparent; margin: 8px 0; }
                .help-modal-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                .help-modal-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}</style>


            <div className="config-main" style={{ minHeight: '80vh' }}>
                <div style={{ padding: '2rem 2rem 1rem 2rem' }}>
                    <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project : <span style={{ color: '#2563eb' }}>{projectName || selectedProject?.name || ''}</span></h3>
                </div>
                <div className="config-header" style={{ marginTop: '0', display: 'flex', alignItems: 'center', gap: '40px', justifyContent: 'flex-start' }}>
                    <h2>Resource Rate Card (YoY)</h2>
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
                                                    The <strong>Resource Rate Card (YoY)</strong> page allows you to create and manage year-over-year (YoY) projections of onsite and offshore resource billing rates for each resource level. It takes the base hourly rates from the Resource Rate Card and applies annual efficiency adjustment percentages per fiscal year to project how rates evolve across the life of the project.
                                                </p>
                                            </div>

                                            <div style={{ marginBottom: '16px' }}>
                                                <strong style={{ color: '#1f2937', fontSize: '15px' }}>Why is this used?</strong>
                                                <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                                                    Multi-year projects require resource rate projections that reflect annual billing changes and productivity improvements. This page enables you to: (1) model how onsite and offshore rates change each fiscal year using efficiency percentages, (2) provide a consistent rate schedule for project cost forecasting, (3) support long-term financial planning for both onsite (project location) and offshore (base location) resources, and (4) generate a rate card that can be locked once agreed with stakeholders.
                                                </p>
                                            </div>

                                            <div style={{ marginBottom: '16px' }}>
                                                <strong style={{ color: '#1f2937', fontSize: '15px' }}>Understanding the form fields</strong>
                                                <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                                    <li><strong>Organization Name</strong> — The implementation partner organisation for which this YoY rate card applies.</li>
                                                    <li><strong>Service Line Name</strong> — The business line / portfolio / service combination. Selecting this loads the base rates from the Resource Rate Card for that organisation and service line.</li>
                                                    <li><strong>Rate Card Name</strong> — A unique name to identify this YoY projection rate card (e.g., "FY25-FY27 Projection").</li>
                                                    <li><strong>Rate Card Code</strong> — A short reference code for this rate card.</li>
                                                    <li><strong>Project Start Date / Project End Date</strong> — Auto-populated from the Project Definition. Read-only. The fiscal year columns are automatically generated based on these dates and the organisation's fiscal calendar.</li>
                                                </ul>
                                            </div>

                                            <div style={{ marginBottom: '16px' }}>
                                                <strong style={{ color: '#1f2937', fontSize: '15px' }}>Understanding the table</strong>
                                                <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                                    <li><strong>Level</strong> — The resource level code (e.g., L1, L2, L3) as defined in the Resource Rate Card.</li>
                                                    <li><strong>Level Code</strong> — The short code for the level (e.g., SA, SSA, SrA).</li>
                                                    <li><strong>Designation / Title</strong> — The job title or role associated with that resource level.</li>
                                                    <li><strong>Onsite Rate (Project Location)</strong> — The billing rate for resources working at the client/project location. The first column shows the base rate; subsequent columns show the projected rate for each future fiscal year.</li>
                                                    <li><strong>Offshore Rate (Base Location)</strong> — The billing rate for resources working from their home/base location. Same structure: base rate in FY1, projected rates for subsequent years.</li>
                                                    <li><strong>% Efficiency (header input)</strong> — Enter the annual rate adjustment percentage for each fiscal year column. Positive values increase the rate (e.g., +5 means a 5% rate increase); negative values decrease it. Each year's rate is calculated cumulatively from the previous year using this percentage.</li>
                                                    <li><strong>Start Date / End Date (header rows)</strong> — The fiscal year start and end dates, derived automatically from the project duration and the organisation's fiscal calendar configuration.</li>
                                                </ul>
                                            </div>

                                            <div style={{ marginBottom: '16px' }}>
                                                <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to use this page</strong>
                                                <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                                    <li>Select an <strong>Organization Name</strong> and a <strong>Service Line Name</strong>. The table loads resource levels and their base onsite and offshore rates from the Resource Rate Card.</li>
                                                    <li>Enter a <strong>Rate Card Name</strong> and <strong>Rate Card Code</strong> to identify this projection.</li>
                                                    <li>The number of fiscal year columns is determined automatically from the project start/end dates and the organisation's fiscal calendar. Each column represents one full fiscal year.</li>
                                                    <li>In the <strong>% Efficiency</strong> input row, enter the rate adjustment percentage for each fiscal year (for both onsite and offshore separately). Rates in the table cells update automatically as you type.</li>
                                                    <li>Review the calculated projected rates for each resource level and fiscal year to validate they match your billing agreements.</li>
                                                    <li>Click <strong>Submit</strong> (new rate card) or <strong>Update</strong> (existing rate card) to save the finalised projections.</li>
                                                    <li>Use <strong>Save Draft</strong> to save work in progress. A draft banner will appear, reminding you to finalise with Update.</li>
                                                    <li>Use <strong>Lock</strong> to prevent further edits once the rate card is agreed. Use <strong>Unlock</strong> to re-enable editing if revisions are needed.</li>
                                                    <li>To start fresh, click <strong>Create New Rate Card</strong> to reset the form.</li>
                                                </ul>
                                            </div>

                                            <div style={{ marginBottom: '4px' }}>
                                                <strong style={{ color: '#1f2937', fontSize: '15px' }}>Important notes</strong>
                                                <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                                    <li>Base rates are sourced from the <strong>Resource Rate Card</strong> for the selected organisation and service line. Ensure that page has been saved before using this page.</li>
                                                    <li>The <strong>Rate Card Name</strong> must be unique — duplicate names will be rejected on submission.</li>
                                                    <li>Project Start and End Dates are read-only and pulled from the Project Definition. Update them there if incorrect.</li>
                                                    <li>Fiscal year columns are generated automatically — you cannot manually add or remove years. The count is driven by the project duration in the Project Definition.</li>
                                                    <li>The <strong>% Efficiency</strong> values are entered separately for Onsite and Offshore rates, allowing you to model different rate trajectories for each location type.</li>
                                                    <li>Projected rates are calculated <strong>cumulatively</strong> — FY2 applies its efficiency to FY1's projected rate, FY3 to FY2's, and so on.</li>
                                                    <li>A <strong>locked</strong> rate card cannot be edited. Unlock it first before making changes.</li>
                                                    <li>If you have unsaved efficiency changes and try to switch organisation or service line, the system will prompt you to confirm before discarding those changes.</li>
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
                    <label style={{ fontSize: '14px', fontWeight: '600', color: '#333', whiteSpace: 'nowrap', marginRight: '0px' }}>Organization Name <span style={{ color: 'red' }}>*</span> :</label>
                    <WideOrganizationAutocomplete
                        value={selectedOrganizationId}
                        onChange={(newValue) => {
                            checkUnsavedChanges(() => {
                                setSelectedOrganizationId(newValue);
                                setSelectedBusinessLine(''); // Reset service line when organization changes
                                setPrimaryOrgData(null);
                                setRateCardData([]);
                                setOnsiteEfficiencies([]);
                                setOffshoreEfficiencies([]);
                                setFiscalYearLabels([]);
                                setFiscalYearDates({ startDates: [], endDates: [] });
                                setOriginalState({
                                    organizationId: newValue,
                                    serviceLine: '',
                                    startDate: '',
                                    endDate: '',
                                    onsiteEfficiencies: [],
                                    offshoreEfficiencies: []
                                });
                            });
                        }}
                        options={organizationOptions}
                        width="260px"
                    />

                    <label style={{ fontSize: '14px', fontWeight: '600', color: '#333', whiteSpace: 'nowrap', marginLeft: '20px', marginRight: '22px' }}>Service Line Name <span style={{ color: 'red' }}>*</span> :</label>
                    <FormControl size="small" style={{ width: '480px' }}>
                        <Select
                            value={selectedBusinessLine}
                            onChange={(e) => {
                                const newValue = e.target.value;
                                checkUnsavedChanges(() => {
                                    setSelectedBusinessLine(newValue);
                                });
                            }}
                            disabled={!selectedOrganizationId}
                            displayEmpty
                            renderValue={(selected) => {
                                if (!selected || selected === '') {
                                    return <em style={{ color: '#999', fontStyle: 'normal' }}>Select Service Line</em>;
                                }
                                return selected;
                            }}
                            style={{
                                fontSize: '14px',
                                height: '32px',
                                backgroundColor: !selectedOrganizationId ? '#f5f5f5' : 'white',
                            }}
                            MenuProps={{
                                PaperProps: {
                                    style: {
                                        width: '480px',
                                        maxHeight: '300px'
                                    }
                                }
                            }}
                        >
                            <MenuItem value="" disabled style={{ fontSize: '14px' }}>
                                <em>Select Service Line</em>
                            </MenuItem>
                            {serviceLineOptions.map((option) => (
                                <MenuItem
                                    key={option.value}
                                    value={option.value}
                                    sx={{
                                        fontSize: '14px',
                                        whiteSpace: 'normal',
                                        wordBreak: 'break-word',
                                        display: 'block',
                                        '&:hover': {
                                            backgroundColor: '#cce5ff',
                                        },
                                        '&.Mui-selected': {
                                            backgroundColor: '#e3f2fd',
                                            '&:hover': {
                                                backgroundColor: '#cce5ff',
                                            },
                                        },
                                    }}
                                    title={option.label}
                                >
                                    {option.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </div>

                {/* Row 2: Rate Card Name and Rate Card Code */}
                <div style={{ padding: '5px 18px 15px 18px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <label style={{ marginRight: '18px', fontSize: '14px', fontWeight: '600', color: '#333', whiteSpace: 'nowrap' }}>Rate Card Name <span style={{ color: 'red' }}>*</span> :</label>
                    <div style={{ width: '340px', position: 'relative' }}>
                        <input
                            type="text"
                            value={rateCardName}
                            readOnly
                            placeholder="Auto-generated"
                            style={{
                                fontSize: '14px',
                                color: '#333',
                                padding: '6px 8px',
                                border: `1px solid ${rateCardNameError ? '#dc2626' : '#ddd'}`,
                                borderRadius: '4px',
                                width: '100%',
                                boxSizing: 'border-box',
                                backgroundColor: '#f5f5f5',
                                cursor: 'not-allowed'
                            }}
                        />
                        {rateCardNameError && (
                            <div style={{ color: '#dc2626', fontSize: '11px', marginTop: '4px', fontWeight: '500', position: 'absolute', whiteSpace: 'nowrap' }}>
                                {rateCardNameError}
                            </div>
                        )}
                    </div>

                    <label style={{ fontSize: '14px', fontWeight: '600', color: '#333', whiteSpace: 'nowrap', marginLeft: '20px' }}>Rate Card Code <span style={{ color: 'red' }}>*</span> :</label>
                    <div style={{ width: '340px', position: 'relative' }}>
                        <input
                            type="text"
                            value={rateCardCode}
                            readOnly
                            placeholder="Auto-generated"
                            style={{
                                fontSize: '14px',
                                color: '#333',
                                padding: '6px 8px',
                                border: `1px solid ${rateCardCodeError ? '#dc2626' : '#ddd'}`,
                                borderRadius: '4px',
                                backgroundColor: '#f5f5f5',
                                outline: 'none',
                                width: '100%',
                                cursor: 'not-allowed'
                            }}
                        />
                        {rateCardCodeError && (
                            <div style={{ color: '#dc2626', fontSize: '11px', marginTop: '4px', fontWeight: '500', position: 'absolute', whiteSpace: 'nowrap' }}>
                                {rateCardCodeError}
                            </div>
                        )}
                    </div>
                </div>

                {/* Planned Start Date and End Date */}
                {(selectedOrganizationId && selectedBusinessLine) && (
                    <div style={{ padding: '15px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <label style={{ fontSize: '14px', fontWeight: '600', color: '#333', whiteSpace: 'nowrap' }}>Project Start Date <span style={{ color: 'red' }}>*</span> :</label>
                        <div style={{ position: 'relative' }}>
                            <DisabledAwareDatePicker
                                value={startDate || ''}
                                onChange={() => { }}
                                placeholder="dd-mmm-yyyy"
                                disabled={true}
                            />
                        </div>

                        <label style={{ fontSize: '14px', fontWeight: '600', color: '#333', whiteSpace: 'nowrap', marginLeft: '20px' }}>Project End Date <span style={{ color: 'red' }}>*</span> :</label>
                        <div style={{ position: 'relative' }}>
                            <DisabledAwareDatePicker
                                value={endDate || ''}
                                onChange={() => { }}
                                placeholder="dd-mmm-yyyy"
                                error={!!endDateError}
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

                {/* Draft Mode Alert Banner */}
                {isDraft && (
                    <div style={{
                        margin: '16px 32px',
                        padding: '12px 16px',
                        backgroundColor: '#fff3cd',
                        border: '1px solid #ffc107',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <AlertCircle size={20} style={{ color: '#856404', flexShrink: 0 }} />
                        <span style={{
                            color: '#856404',
                            fontSize: '14px',
                            fontWeight: '500'
                        }}>
                            This is a saved draft Rate Card. Complete the form and click "Update" to finalize the Rate Card.
                        </span>
                    </div>
                )}

                {/* Table section */}
                <div className="table-container" style={{ maxHeight: '600px', overflowY: 'auto', position: 'relative', marginTop: '16px', padding: '0 18px 0px 0px' }}>
                    <style>{`
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
                    `}</style>
                    <table className="config-table" style={{ fontSize: '15px', borderCollapse: 'separate', borderSpacing: 0, width: '100%' }}>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 20, backgroundColor: '#fff' }}>
                            {/* Row 1: Main headings - Onsite and Offshore */}
                            <tr>
                                <th style={{ padding: '0', fontSize: '14px', fontWeight: '600', textAlign: 'center', backgroundColor: '#fff', border: 'none' }}></th>
                                <th style={{ padding: '0', fontSize: '14px', fontWeight: '600', textAlign: 'center', backgroundColor: '#fff', border: 'none' }}></th>
                                <th style={{ padding: '0', fontSize: '14px', fontWeight: '600', textAlign: 'center', backgroundColor: '#fff', border: 'none' }}></th>
                                <th colSpan={numberOfYears} style={{ padding: '8px 12px', fontSize: '15px', fontWeight: '700', textAlign: 'center', border: '1px solid #333', backgroundColor: '#60b7f2ff ', color: '#000' }}>
                                    Onsite Rate (Project Location)
                                </th>
                                <th colSpan={numberOfYears} style={{ padding: '8px 12px', fontSize: '15px', fontWeight: '700', textAlign: 'center', border: '1px solid #333', backgroundColor: '#60b7f2ff ', color: '#000' }}>
                                    Offshore Rate (Base Location)
                                </th>
                            </tr>

                            {/* Row 2: Fiscal Year labels */}
                            <tr>
                                <th style={{ padding: '0', fontSize: '14px', fontWeight: '600', textAlign: 'center', backgroundColor: '#fff', border: 'none' }}></th>
                                <th style={{ padding: '0', fontSize: '14px', fontWeight: '600', textAlign: 'center', backgroundColor: '#fff', border: 'none' }}></th>
                                <th style={{ padding: '0', fontSize: '14px', fontWeight: '600', textAlign: 'center', backgroundColor: '#fff', border: 'none' }}></th>
                                {/* Onsite fiscal years */}
                                {Array.from({ length: numberOfYears }).map((_, index) => (
                                    <th key={`onsite-fy-${index}`} style={{ padding: '6px 8px', fontSize: '14px', fontWeight: '600', textAlign: 'center', border: '1px solid #ddd', backgroundColor: '#fff' }}>
                                        {fiscalYearLabels[index] || `FY${(new Date().getFullYear()).toString().slice(-2)}`}
                                    </th>
                                ))}
                                {/* Offshore fiscal years */}
                                {Array.from({ length: numberOfYears }).map((_, index) => (
                                    <th key={`offshore-fy-${index}`} style={{ padding: '6px 8px', fontSize: '14px', fontWeight: '600', textAlign: 'center', border: '1px solid #ddd', backgroundColor: '#fff' }}>
                                        {fiscalYearLabels[index] || `FY${(new Date().getFullYear()).toString().slice(-2)}`}
                                    </th>
                                ))}
                            </tr>

                            {/* Row 3: Start Date */}
                            <tr>
                                <th colSpan="3" style={{ padding: '6px 12px', fontSize: '14px', fontWeight: '600', textAlign: 'left', border: '1px solid #ddd', backgroundColor: '#fff' }}>Start Date</th>
                                {/* Onsite start dates */}
                                {Array.from({ length: numberOfYears }).map((_, index) => (
                                    <th key={`onsite-start-${index}`} style={{ padding: '6px 8px', fontSize: '13px', fontWeight: '500', textAlign: 'center', border: '1px solid #ddd', backgroundColor: '#fff' }}>
                                        {fiscalYearDates.startDates[index] || '-'}
                                    </th>
                                ))}
                                {/* Offshore start dates */}
                                {Array.from({ length: numberOfYears }).map((_, index) => (
                                    <th key={`offshore-start-${index}`} style={{ padding: '6px 8px', fontSize: '13px', fontWeight: '500', textAlign: 'center', border: '1px solid #ddd', backgroundColor: '#fff' }}>
                                        {fiscalYearDates.startDates[index] || '-'}
                                    </th>
                                ))}
                            </tr>

                            {/* Row 4: End Date */}
                            <tr>
                                <th colSpan="3" style={{ padding: '6px 12px', fontSize: '14px', fontWeight: '600', textAlign: 'left', border: '1px solid #ddd', backgroundColor: '#fff' }}>End Date</th>
                                {/* Onsite end dates */}
                                {Array.from({ length: numberOfYears }).map((_, index) => (
                                    <th key={`onsite-end-${index}`} style={{ padding: '6px 8px', fontSize: '13px', fontWeight: '500', textAlign: 'center', border: '1px solid #ddd', backgroundColor: '#fff' }}>
                                        {fiscalYearDates.endDates[index] || '-'}
                                    </th>
                                ))}
                                {/* Offshore end dates */}
                                {Array.from({ length: numberOfYears }).map((_, index) => (
                                    <th key={`offshore-end-${index}`} style={{ padding: '6px 8px', fontSize: '13px', fontWeight: '500', textAlign: 'center', border: '1px solid #ddd', backgroundColor: '#fff' }}>
                                        {fiscalYearDates.endDates[index] || '-'}
                                    </th>
                                ))}
                            </tr>

                            {/* Row 5: % Efficiency labels */}
                            <tr>
                                <th colSpan="3" style={{ padding: '0', border: 'none', backgroundColor: '#fff' }}></th>
                                {/* Onsite % Efficiency labels */}
                                {Array.from({ length: numberOfYears }).map((_, index) => (
                                    <th key={`onsite-eff-label-${index}`} style={{ padding: '6px 8px', fontSize: '13px', fontWeight: '600', textAlign: 'center', border: '1px solid #ddd', backgroundColor: '#fff' }}>
                                        % Efficiency
                                    </th>
                                ))}
                                {/* Offshore % Efficiency labels */}
                                {Array.from({ length: numberOfYears }).map((_, index) => (
                                    <th key={`offshore-eff-label-${index}`} style={{ padding: '6px 8px', fontSize: '13px', fontWeight: '600', textAlign: 'center', border: '1px solid #ddd', backgroundColor: '#fff' }}>
                                        % Efficiency
                                    </th>
                                ))}
                            </tr>

                            {/* Row 6: Input fields for % Efficiency */}
                            <tr>
                                <th colSpan="3" style={{ padding: '0', border: 'none', backgroundColor: '#fff' }}></th>
                                {/* Onsite efficiency inputs */}
                                {Array.from({ length: numberOfYears }).map((_, index) => (
                                    <th key={`onsite-eff-input-${index}`} style={{ padding: '4px', textAlign: 'center', border: '1px solid #ddd', backgroundColor: '#fff' }}>
                                        <input
                                            type="text"
                                            value={onsiteEfficiencies[index] || ''}
                                            onChange={(e) => {
                                                const newEfficiencies = [...onsiteEfficiencies];
                                                newEfficiencies[index] = e.target.value;
                                                setOnsiteEfficiencies(newEfficiencies);
                                            }}
                                            placeholder="+0 or -0"
                                            disabled={isLocked}
                                            style={{
                                                width: '100%',
                                                padding: '6px',
                                                textAlign: 'center',
                                                fontSize: '13px',
                                                border: '1px solid #ccc',
                                                borderRadius: '3px',
                                                backgroundColor: isLocked ? '#f5f5f5' : '#fff',
                                                fontWeight: '600',
                                                color: '#1a56db'
                                            }}
                                        />
                                    </th>
                                ))}
                                {/* Offshore efficiency inputs */}
                                {Array.from({ length: numberOfYears }).map((_, index) => (
                                    <th key={`offshore-eff-input-${index}`} style={{ padding: '4px', textAlign: 'center', border: '1px solid #ddd', backgroundColor: '#fff' }}>
                                        <input
                                            type="text"
                                            value={offshoreEfficiencies[index] || ''}
                                            onChange={(e) => {
                                                const newEfficiencies = [...offshoreEfficiencies];
                                                newEfficiencies[index] = e.target.value;
                                                setOffshoreEfficiencies(newEfficiencies);
                                            }}
                                            placeholder="+0 or -0"
                                            disabled={isLocked}
                                            style={{
                                                width: '100%',
                                                padding: '6px',
                                                textAlign: 'center',
                                                fontSize: '13px',
                                                border: '1px solid #ccc',
                                                borderRadius: '3px',
                                                backgroundColor: isLocked ? '#f5f5f5' : '#fff',
                                                fontWeight: '600',
                                                color: '#1a56db'
                                            }}
                                        />
                                    </th>
                                ))}
                            </tr>

                            {/* Row 7: Main column headers */}
                            <tr>
                                <th style={{ padding: '12px 12px', fontSize: '15px', fontWeight: '600', width: '8%', textAlign: 'left', border: '1px solid #ddd', backgroundColor: '#f5f5f5' }}>Level</th>
                                <th style={{ padding: '12px 12px', fontSize: '15px', fontWeight: '600', width: '8%', textAlign: 'left', border: '1px solid #ddd', backgroundColor: '#f5f5f5' }}>Level Code</th>
                                <th style={{ padding: '12px 12px', fontSize: '15px', fontWeight: '600', width: '12%', textAlign: 'left', border: '1px solid #ddd', backgroundColor: '#f5f5f5' }}>Designation / Title</th>
                                {/* Onsite Base Rate and Projected Rates */}
                                {Array.from({ length: numberOfYears }).map((_, index) => (
                                    <th key={`onsite-header-${index}`} style={{ padding: '12px 12px', fontSize: '14px', fontWeight: '600', textAlign: 'center', border: '1px solid #ddd', backgroundColor: '#f5f5f5' }}>
                                        {index === 0 ? `Base Rate${onsiteCurrency ? ` (${onsiteCurrency})` : ''}` : `Projected${onsiteCurrency ? ` (${onsiteCurrency})` : ''}`}
                                    </th>
                                ))}
                                {/* Offshore Base Rate and Projected Rates */}
                                {Array.from({ length: numberOfYears }).map((_, index) => (
                                    <th key={`offshore-header-${index}`} style={{ padding: '12px 12px', fontSize: '14px', fontWeight: '600', textAlign: 'center', border: '1px solid #ddd', backgroundColor: '#f5f5f5' }}>
                                        {index === 0 ? `Base Rate${offshoreCurrency ? ` (${offshoreCurrency})` : ''}` : `Projected${offshoreCurrency ? ` (${offshoreCurrency})` : ''}`}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {useMemo(() => {
                                if (levelsData.length === 0) {
                                    return (
                                        <tr>
                                            <td colSpan={3 + (numberOfYears * 2)} style={{ padding: '40px', textAlign: 'center', color: '#666', fontSize: '14px' }}>
                                                No data available
                                            </td>
                                        </tr>
                                    );
                                }

                                return [...levelsData]
                                    .sort((a, b) => {
                                        const numA = parseInt(a.Level_Code?.replace('L', '') || '0');
                                        const numB = parseInt(b.Level_Code?.replace('L', '') || '0');
                                        return numA - numB;
                                    })
                                    .map((level, index) => {
                                        // Find matching rate card data for this level
                                        const rateData = rateCardData.find(item => item.Level_Definition_id === level.Level_Definition_id);

                                        // Get base rates
                                        const onsiteBaseRate = rateData ? parseFloat(rateData.OR_PL_Amount_hours) || 0 : 0;
                                        const offshoreBaseRate = rateData ? parseFloat(rateData.OR_BL_Amount_hours) || 0 : 0;

                                        // Calculate cascading onsite rates
                                        const onsiteRates = [];
                                        for (let i = 0; i < numberOfYears; i++) {
                                            const previousRate = i === 0 ? onsiteBaseRate : onsiteRates[i - 1];
                                            onsiteRates.push(calculateAdjustedRate(previousRate, onsiteEfficiencies[i]));
                                        }

                                        // Calculate cascading offshore rates
                                        const offshoreRates = [];
                                        for (let i = 0; i < numberOfYears; i++) {
                                            const previousRate = i === 0 ? offshoreBaseRate : offshoreRates[i - 1];
                                            offshoreRates.push(calculateAdjustedRate(previousRate, offshoreEfficiencies[i]));
                                        }

                                        const sanitizedLevelCode = DOMPurify.sanitize(level.Level_Code || '', { ALLOWED_TAGS: [] });
                                        const sanitizedLevelShortCode = DOMPurify.sanitize(level.Level_Short_Code || '', { ALLOWED_TAGS: [] });
                                        const sanitizedDesignation = DOMPurify.sanitize(level.designation || '', { ALLOWED_TAGS: [] });

                                        return (
                                            <tr key={level.Level_Definition_id}>
                                                <td style={{ padding: '8px 12px', fontSize: '13px', textAlign: 'left', border: '1px solid #ddd', backgroundColor: '#fff' }}>
                                                    {sanitizedLevelCode}
                                                </td>
                                                <td style={{ padding: '8px 12px', fontSize: '13px', textAlign: 'left', border: '1px solid #ddd', backgroundColor: '#fff' }}>
                                                    {sanitizedLevelShortCode}
                                                </td>
                                                <td style={{ padding: '8px 12px', fontSize: '13px', textAlign: 'left', border: '1px solid #ddd', backgroundColor: '#fff' }}>
                                                    {sanitizedDesignation}
                                                </td>
                                                {/* Onsite rates - dynamic number of columns */}
                                                {Array.from({ length: numberOfYears }).map((_, fyIndex) => (
                                                    <td key={`onsite-${fyIndex}`} style={{ padding: '4px', textAlign: 'center', border: '1px solid #ddd', backgroundColor: '#fff' }}>
                                                        <input
                                                            type="text"
                                                            value={onsiteRates[fyIndex] ? onsiteRates[fyIndex].toFixed(2) : ''}
                                                            placeholder="0.00"
                                                            readOnly
                                                            style={{
                                                                width: '100%',
                                                                padding: '6px',
                                                                textAlign: 'center',
                                                                fontSize: '13px',
                                                                border: 'none',
                                                                outline: 'none',
                                                                backgroundColor: 'transparent',
                                                                cursor: 'default'
                                                            }}
                                                        />
                                                    </td>
                                                ))}
                                                {/* Offshore rates - dynamic number of columns */}
                                                {Array.from({ length: numberOfYears }).map((_, fyIndex) => (
                                                    <td key={`offshore-${fyIndex}`} style={{ padding: '4px', textAlign: 'center', border: '1px solid #ddd', backgroundColor: '#fff' }}>
                                                        <input
                                                            type="text"
                                                            value={offshoreRates[fyIndex] ? offshoreRates[fyIndex].toFixed(2) : ''}
                                                            placeholder="0.00"
                                                            readOnly
                                                            style={{
                                                                width: '100%',
                                                                padding: '6px',
                                                                textAlign: 'center',
                                                                fontSize: '13px',
                                                                border: 'none',
                                                                outline: 'none',
                                                                backgroundColor: 'transparent',
                                                                cursor: 'default'
                                                            }}
                                                        />
                                                    </td>
                                                ))}
                                            </tr>
                                        );
                                    });
                            }, [levelsData, rateCardData, numberOfYears, onsiteEfficiencies, offshoreEfficiencies])}
                        </tbody>
                    </table>
                </div>

                {/* Action Buttons */}
                <div style={{ padding: '20px 18px', display: 'flex', gap: '12px', justifyContent: 'flex-start' }}>
                    <button
                        type="button"
                        onClick={handleSaveDraft}
                        disabled={savingDraft || isLocked}
                        style={{
                            padding: '0px 24px',
                            backgroundColor: (savingDraft || isLocked) ? '#6c757d' : '#3b82f6',
                            color: 'white',
                            border: 'none',
                            height: '32px',
                            borderRadius: '4px',
                            width: '140px',
                            cursor: (savingDraft || isLocked) ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            opacity: (savingDraft || isLocked) ? 0.6 : 1,
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => { if (!savingDraft && !isLocked) e.target.style.backgroundColor = '#2563eb'; }}
                        onMouseLeave={(e) => { if (!savingDraft && !isLocked) e.target.style.backgroundColor = '#3b82f6'; }}
                    >
                        {savingDraft ? 'Saving Draft...' : 'Save Draft'}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || isLocked}
                        style={{
                            backgroundColor: submitting || isLocked ? '#6c757d' : '#28a745',
                            color: 'white',
                            border: 'none',
                            height: '32px',
                            padding: '0px 12px',
                            borderRadius: '4px',
                            cursor: submitting || isLocked ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            transition: 'all 0.2s',
                            width: '140px',
                            opacity: submitting || isLocked ? 0.6 : 1
                        }}
                        onMouseEnter={(e) => { if (!submitting && !isLocked) e.target.style.backgroundColor = '#218838'; }}
                        onMouseLeave={(e) => { if (!submitting && !isLocked) e.target.style.backgroundColor = '#28a745'; }}
                    >
                        {submitting ? (isUpdateMode ? 'Updating...' : 'Submitting...') : (isUpdateMode ? 'Update' : 'Submit')}
                    </button>
                    <button
                        onClick={handleLockUnlock}
                        disabled={savingDraft || submitting || lockingUnlocking}
                        style={{
                            backgroundColor: isLocked ? '#dc3545' : '#17a2b8',
                            color: 'white',
                            border: 'none',
                            height: '32px',
                            width: '140px',
                            padding: '0px 12px',
                            borderRadius: '4px',
                            cursor: (savingDraft || submitting || lockingUnlocking) ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            opacity: (savingDraft || submitting || lockingUnlocking) ? 0.6 : 1,
                            transition: 'all 0.2s',
                            marginLeft: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            fontWeight: '500'
                        }}
                        onMouseEnter={(e) => {
                            if (!savingDraft && !submitting && !lockingUnlocking) {
                                e.target.style.backgroundColor = isLocked ? '#c82333' : '#156a8a';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!savingDraft && !submitting && !lockingUnlocking) {
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
                            <>{isLocked ? <Unlock size={16} /> : <Lock size={16} />}</>
                        )}
                        {lockingUnlocking ? (isLocked ? 'Unlocking...' : 'Locking...') : (isLocked ? 'Unlock' : 'Lock')}
                    </button>
                </div>
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
            )
            }
            {/* Unsaved Changes Confirmation Modal */}
            {showConfirmDialog && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '30px',
                        borderRadius: '8px',
                        width: '450px',
                        textAlign: 'center',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
                    }}>
                        <h3 style={{
                            margin: '0 0 15px 0',
                            fontSize: '20px',
                            fontWeight: '700',
                            color: '#333'
                        }}>Unsaved Changes</h3>
                        <p style={{
                            margin: '0 0 25px 0',
                            fontSize: '15px',
                            color: '#666',
                            lineHeight: '1.5'
                        }}>
                            {confirmMessage}
                        </p>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            gap: '15px'
                        }}>
                            <button
                                onClick={() => {
                                    setShowConfirmDialog(false);
                                    setConfirmAction(null);
                                }}
                                style={{
                                    padding: '10px 25px',
                                    backgroundColor: '#6c757d',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                    fontSize: '15px',
                                    fontWeight: '600'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (confirmAction) confirmAction();
                                    setShowConfirmDialog(false);
                                    setConfirmAction(null);
                                }}
                                style={{
                                    padding: '10px 25px',
                                    backgroundColor: '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                    fontSize: '15px',
                                    fontWeight: '600'
                                }}
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Fragment>
    );
};
export default CostRateCardProjection;
