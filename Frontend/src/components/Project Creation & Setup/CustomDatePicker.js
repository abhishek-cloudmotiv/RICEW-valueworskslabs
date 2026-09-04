import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { TextField } from '@mui/material';

const CustomDatePicker = ({ name, value, onChange, placeholder, error = false, onFocus, disabled = false }) => {
    // Format date for display: DD-MMM-YYYY (e.g., 12-OCT-2025)
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
    const calendarRef = useRef(null);
    const inputRef = useRef(null);
    const yearContainerRef = useRef(null);

    // Update input value when prop value changes
    useEffect(() => {
        setInputValue(formatDateForDisplay(value));
        // Reset current view month to today if the value is cleared (e.g., from form reset)
        if (!value) {
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

    // Handle clicks outside to close calendar
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (calendarRef.current && !calendarRef.current.contains(event.target)) {
                setIsOpen(false);
                setTimeout(() => setView('calendar'), 300); // Reset after close animation
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Calendar utility functions
    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const days = [];
        for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
        for (let day = 1; day <= daysInMonth; day++) days.push(day);
        return days;
    };

    const handleDateSelect = (day) => {
        if (!day) return;
        const selectedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        const apiDate = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
        onChange({ target: { name: inputRef.current?.name || '', value: apiDate } });
        setIsOpen(false);
        setTimeout(() => setView('calendar'), 300);
    };

    const navigateMonth = (direction) => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
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

    const textFieldSx = {
        width: '100%',
        '& .MuiInputBase-root': {
            backgroundColor: disabled ? '#f5f5f5' : 'white',
            fontSize: '14px',
            fontFamily: 'inherit',
            height: '40px',
        },
        '& .MuiInputBase-input': {
            padding: '8px 30px 8px 12px',
            cursor: disabled ? 'not-allowed' : 'pointer',
        },
        '& .MuiOutlinedInput-root': {
            '& fieldset': {
                borderColor: '#ddd',
                borderRadius: '6px',
            },
            '&:hover fieldset': {
                borderColor: disabled ? '#ddd' : '#3b82f6',
            },
            '&.Mui-focused fieldset': {
                borderColor: '#3b82f6',
                borderWidth: '1px',
            },
        },
    };

    // Generate years (current year +/- 10 years or similar)
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 50; i <= currentYear + 50; i++) {
        years.push(i);
    }

    const openCalendar = () => {
        if (!disabled) {
            setIsOpen(true);
            setView('calendar');
        }
    };

    return (
        <div style={{ position: 'relative', width: '100%' }} ref={calendarRef}>
            <div style={{ position: 'relative' }}>
                <TextField
                    inputRef={inputRef}
                    name={name}
                    value={inputValue}
                    placeholder={placeholder}
                    size="small"
                    error={error}
                    disabled={disabled}
                    onClick={openCalendar}
                    onFocus={() => {
                        openCalendar();
                        onFocus && onFocus();
                    }}
                    readOnly
                    sx={textFieldSx}
                />
                <Calendar
                    size={18}
                    style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: disabled ? '#999' : '#666',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        pointerEvents: disabled ? 'none' : 'auto',
                    }}
                    onClick={openCalendar}
                />
            </div>

            {isOpen && !disabled && (
                <div style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '0',
                    zIndex: 2000,
                    backgroundColor: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    boxShadow: '0 -10px 25px rgba(0,0,0,0.1)',
                    width: '280px',
                    padding: '16px',
                    marginBottom: '8px'
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
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <span
                                    onClick={() => setView('years')}
                                    style={{
                                        fontWeight: '600',
                                        color: '#333',
                                        fontSize: '15px',
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
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' }}>
                                {weekDays.map(day => (
                                    <div key={day} style={{ textAlign: 'center', fontSize: '12px', fontWeight: 'bold', color: '#999' }}>{day}</div>
                                ))}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
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
                                                padding: '8px 0',
                                                border: 'none',
                                                borderRadius: '4px',
                                                backgroundColor: day ? (isSelected ? '#3b82f6' : 'transparent') : 'transparent',
                                                color: day ? (isSelected ? 'white' : '#333') : 'transparent',
                                                cursor: day ? 'pointer' : 'default',
                                                fontSize: '14px',
                                                transition: 'all 0.2s',
                                            }}
                                            onMouseEnter={(e) => {
                                                if (day && !isSelected) e.target.style.backgroundColor = '#f0f7ff';
                                            }}
                                            onMouseLeave={(e) => {
                                                if (day && !isSelected) e.target.style.backgroundColor = 'transparent';
                                            }}
                                        >
                                            {day}
                                        </button>
                                    );
                                })}
                            </div>

                            <div style={{ marginTop: '16px', borderTop: '1px solid #eee', paddingTop: '12px', textAlign: 'center' }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const today = new Date();
                                        const apiDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                                        onChange({ target: { name: inputRef.current?.name || '', value: apiDate } });
                                        setCurrentMonth(new Date(today.getFullYear(), today.getMonth()));
                                        setIsOpen(false);
                                        setTimeout(() => setView('calendar'), 300);
                                    }}
                                    style={{
                                        padding: '6px 16px',
                                        backgroundColor: '#f0f7ff',
                                        color: '#3b82f6',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontWeight: '600'
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
                                        backgroundColor: index === currentMonth.getMonth() ? '#3b82f6' : 'transparent',
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
                                            backgroundColor: year === currentMonth.getFullYear() ? '#3b82f6' : 'transparent',
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

export default CustomDatePicker;
