import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash2, Save, X, MoreVertical, ChevronDown, AlertCircle, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TextField } from '@mui/material';
import useLOV from '../../hooks/useLOV';
import { getIdToken } from '../../utils/cognito-auth';
import DOMPurify from 'dompurify';
import { useSession } from '../../context/SessionContext';

// Helper to normalize IDs (e.g., "9" vs "ORG009")
const normalizeId = (id) => {
    if (id === null || id === undefined) return '';
    const match = String(id).match(/\d+/);
    return match ? match[0].replace(/^0+/, '') : String(id);
};

// Custom ProcessStream LOV Component
const ProcessStreamLOV = ({ value, onChange, options, error }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputVal, setInputVal] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [dropdownPosition, setDropdownPosition] = useState(null);
    const dropdownRef = useRef(null);
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

    // Calculate dropdown position when opening
    const updateDropdownPosition = () => {
        if (inputRef.current) {
            const rect = inputRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom,
                left: rect.left
            });
        }
    };

    // Update position on scroll
    useEffect(() => {
        if (isOpen) {
            window.addEventListener('scroll', updateDropdownPosition, true);
            return () => window.removeEventListener('scroll', updateDropdownPosition, true);
        }
    }, [isOpen]);

    // Handle value prop changes
    useEffect(() => {
        const valueMismatch = isExternalChangeRef.current && value !== previousValueRef.current;

        if ((!isUserEditingRef.current && !isExternalChangeRef.current) || valueMismatch) {
            const matchingOption = options.find(opt => opt.value === value || opt.label === value);
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
            if (isOpenRef.current && dropdownRef.current && !dropdownRef.current.contains(event.target)) {
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
            setDropdownPosition(null);
            return;
        }

        if (!wasSelectionMade && previousValueRef.current !== undefined) {
            if (value !== previousValueRef.current) {
                onChangeRef.current(previousValueRef.current);
            }
            const matchingOption = options.find(opt => opt.value === previousValueRef.current || opt.label === previousValueRef.current);
            const displayText = matchingOption ? matchingOption.label : (previousValueRef.current || '');
            setInputVal(displayText);
        }
        setIsOpen(false);
        setHighlightedIndex(-1);
        isUserEditingRef.current = false;
        setDropdownPosition(null);
    };

    const openDropdown = () => {
        previousValueRef.current = value;
        selectionMadeRef.current = false;
        setInputVal('');
        setIsOpen(true);
        setTimeout(updateDropdownPosition, 0);

        if (value) {
            const index = options.findIndex(opt => opt.value === value || opt.label === value);
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
        setTimeout(updateDropdownPosition, 0);

        const matchingOption = options.find(opt =>
            opt.label.toLowerCase() === val.toLowerCase()
        );

        if (matchingOption) {
            onChangeRef.current(matchingOption.label);
        } else if (val === '' || val.trim() === '') {
            onChangeRef.current('');
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
                handleSelectOption(filteredOptions[highlightedIndex].label);
            } else {
                handleCloseDropdown(false);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            handleCloseDropdown(false);
        }
    };

    const handleSelectOption = (optionLabel) => {
        selectionMadeRef.current = true;
        isSelectingRef.current = true;
        isExternalChangeRef.current = true;

        previousValueRef.current = optionLabel;
        onChangeRef.current(optionLabel);
        setInputVal(optionLabel);
        setIsOpen(false);
        setHighlightedIndex(-1);
        isUserEditingRef.current = false;
        setDropdownPosition(null);

        setTimeout(() => {
            if (inputRef.current) inputRef.current.blur();
            isSelectingRef.current = false;
        }, 50);
    };

    const filteredOptions = inputVal.trim() === ''
        ? options
        : options.filter(option =>
            option.label.toLowerCase().includes(inputVal.toLowerCase())
        );

    return (
        <div style={{ position: 'relative' }} ref={dropdownRef}>
            <TextField
                inputRef={inputRef}
                fullWidth={false}
                size="small"
                variant="outlined"
                value={inputVal}
                placeholder={isOpen ? "Select Process Stream" : ""}
                InputProps={{
                    autoComplete: 'off',
                    style: { cursor: 'text' },
                    endAdornment: (
                        <ChevronDown
                            size={16}
                            style={{ color: '#666', cursor: 'pointer' }}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (isOpen) {
                                    handleCloseDropdown(false);
                                } else {
                                    openDropdown();
                                }
                            }}
                        />
                    )
                }}
                onChange={handleInputChange}
                onFocus={() => {
                    if (!isShiftTabRef.current) {
                        openDropdown();
                    }
                }}
                onBlur={() => {
                    setTimeout(() => {
                        const activeElement = document.activeElement;
                        const isFocusInDropdown = activeElement && dropdownRef.current?.contains(activeElement);
                        if (isSelectingRef.current || isFocusInDropdown) return;
                        handleCloseDropdown(false);
                    }, 150);
                }}
                onKeyDown={handleKeyDown}
                sx={{
                    width: '278px',
                    '& .MuiOutlinedInput-root': {
                        fontSize: '14px',
                        backgroundColor: 'white',
                        paddingRight: '8px',
                        '& fieldset': {
                            borderColor: error ? '#ef4444 !important' : 'rgba(0, 0, 0, 0.23)',
                        }
                    }
                }}
            />
            {isOpen && filteredOptions.length > 0 && (
                <div
                    ref={listRef}
                    style={{
                        position: 'fixed',
                        top: dropdownPosition?.top ?? 0,
                        left: dropdownPosition?.left ?? 0,
                        visibility: dropdownPosition ? 'visible' : 'hidden',
                        backgroundColor: 'white',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                        zIndex: 999999,
                        maxHeight: '200px',
                        overflowY: 'auto',
                        minWidth: '278px',
                        width: '278px',
                        marginTop: '2px'
                    }}>
                    {filteredOptions.map((option, index) => (
                        <div
                            key={option.value}
                            style={{
                                padding: '10px 12px',
                                cursor: 'pointer',
                                backgroundColor: index === highlightedIndex ? '#cce5ff' : (option.label === value ? '#e3f2fd' : 'white'),
                                fontSize: '14px',
                                borderBottom: '1px solid #eee',
                                whiteSpace: 'normal',
                                wordBreak: 'break-word',
                                transition: 'background-color 0.2s'
                            }}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleSelectOption(option.label);
                            }}
                            onMouseEnter={() => setHighlightedIndex(index)}
                        >
                            {option.label}
                        </div>
                    ))}
                </div>
            )}
            {isOpen && filteredOptions.length === 0 && (
                <div
                    style={{
                        position: 'fixed',
                        top: dropdownPosition?.top ?? 0,
                        left: dropdownPosition?.left ?? 0,
                        visibility: dropdownPosition ? 'visible' : 'hidden',
                        backgroundColor: 'white',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                        zIndex: 999999,
                        padding: '12px',
                        fontSize: '13px',
                        color: '#999',
                        textAlign: 'center',
                        minWidth: '278px',
                        width: '278px',
                        marginTop: '2px'
                    }}
                >
                    No options found
                </div>
            )}
        </div>
    );
};

// Custom Service Line LOV Component
const ServiceLineLOV = ({ value, onChange, options, error }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputVal, setInputVal] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [dropdownPosition, setDropdownPosition] = useState(null);
    const dropdownRef = useRef(null);
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

    // Calculate dropdown position when opening
    const updateDropdownPosition = () => {
        if (inputRef.current) {
            const rect = inputRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom,
                left: rect.left
            });
        }
    };

    // Update position on scroll
    useEffect(() => {
        if (isOpen) {
            window.addEventListener('scroll', updateDropdownPosition, true);
            return () => window.removeEventListener('scroll', updateDropdownPosition, true);
        }
    }, [isOpen]);

    // Handle value prop changes
    useEffect(() => {
        const valueMismatch = isExternalChangeRef.current && value !== previousValueRef.current;

        if ((!isUserEditingRef.current && !isExternalChangeRef.current) || valueMismatch) {
            const matchingOption = options.find(opt => opt.value === value || opt.label === value);
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
            if (isOpenRef.current && dropdownRef.current && !dropdownRef.current.contains(event.target)) {
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
            setDropdownPosition(null);
            return;
        }

        if (!wasSelectionMade && previousValueRef.current !== undefined) {
            if (value !== previousValueRef.current) {
                onChangeRef.current(previousValueRef.current);
            }
            const matchingOption = options.find(opt => opt.value === previousValueRef.current || opt.label === previousValueRef.current);
            const displayText = matchingOption ? matchingOption.label : (previousValueRef.current || '');
            setInputVal(displayText);
        }
        setIsOpen(false);
        setHighlightedIndex(-1);
        isUserEditingRef.current = false;
        setDropdownPosition(null);
    };

    const openDropdown = () => {
        previousValueRef.current = value;
        selectionMadeRef.current = false;
        setInputVal('');
        setIsOpen(true);
        setTimeout(updateDropdownPosition, 0);

        if (value) {
            const index = options.findIndex(opt => opt.value === value || opt.label === value);
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
        setTimeout(updateDropdownPosition, 0);

        const matchingOption = options.find(opt =>
            opt.label.toLowerCase() === val.toLowerCase()
        );

        if (matchingOption) {
            onChangeRef.current(matchingOption.label);
        } else if (val === '' || val.trim() === '') {
            onChangeRef.current('');
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
                handleSelectOption(filteredOptions[highlightedIndex].label);
            } else {
                handleCloseDropdown(false);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            handleCloseDropdown(false);
        }
    };

    const handleSelectOption = (optionLabel) => {
        selectionMadeRef.current = true;
        isSelectingRef.current = true;
        isExternalChangeRef.current = true;

        previousValueRef.current = optionLabel;
        onChangeRef.current(optionLabel);
        setInputVal(optionLabel);
        setIsOpen(false);
        setHighlightedIndex(-1);
        isUserEditingRef.current = false;
        setDropdownPosition(null);

        setTimeout(() => {
            if (inputRef.current) inputRef.current.blur();
            isSelectingRef.current = false;
        }, 50);
    };

    const filteredOptions = inputVal.trim() === ''
        ? options
        : options.filter(option =>
            option.label.toLowerCase().includes(inputVal.toLowerCase())
        );

    return (
        <div style={{ position: 'relative' }} ref={dropdownRef}>
            <TextField
                inputRef={inputRef}
                fullWidth={false}
                size="small"
                variant="outlined"
                value={inputVal}
                placeholder={isOpen ? "Select Service Line" : ""}
                InputProps={{
                    autoComplete: 'off',
                    style: { cursor: 'text' },
                    endAdornment: (
                        <ChevronDown
                            size={16}
                            style={{ color: '#666', cursor: 'pointer' }}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (isOpen) {
                                    handleCloseDropdown(false);
                                } else {
                                    openDropdown();
                                }
                            }}
                        />
                    )
                }}
                onChange={handleInputChange}
                onFocus={() => {
                    if (!isShiftTabRef.current) {
                        openDropdown();
                    }
                }}
                onBlur={() => {
                    setTimeout(() => {
                        const activeElement = document.activeElement;
                        const isFocusInDropdown = activeElement && dropdownRef.current?.contains(activeElement);
                        if (isSelectingRef.current || isFocusInDropdown) return;
                        handleCloseDropdown(false);
                    }, 150);
                }}
                onKeyDown={handleKeyDown}
                sx={{
                    width: '525px',
                    '& .MuiOutlinedInput-root': {
                        fontSize: '14px',
                        backgroundColor: 'white',
                        paddingRight: '8px',
                        '& fieldset': {
                            borderColor: error ? '#ef4444 !important' : 'rgba(0, 0, 0, 0.23)',
                        }
                    }
                }}
            />
            {isOpen && filteredOptions.length > 0 && (
                <div
                    ref={listRef}
                    style={{
                        position: 'fixed',
                        top: dropdownPosition?.top ?? 0,
                        left: dropdownPosition?.left ?? 0,
                        visibility: dropdownPosition ? 'visible' : 'hidden',
                        backgroundColor: 'white',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                        zIndex: 999999,
                        maxHeight: '200px',
                        overflowY: 'auto',
                        minWidth: '525px',
                        width: '525px',
                        marginTop: '2px'
                    }}>
                    {filteredOptions.map((option, index) => (
                        <div
                            key={option.value}
                            style={{
                                padding: '10px 12px',
                                cursor: 'pointer',
                                backgroundColor: index === highlightedIndex ? '#cce5ff' : (option.label === value ? '#e3f2fd' : 'white'),
                                fontSize: '14px',
                                borderBottom: '1px solid #eee',
                                whiteSpace: 'normal',
                                wordBreak: 'break-word',
                                transition: 'background-color 0.2s'
                            }}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleSelectOption(option.label);
                            }}
                            onMouseEnter={() => setHighlightedIndex(index)}
                        >
                            {option.label}
                        </div>
                    ))}
                </div>
            )}
            {isOpen && filteredOptions.length === 0 && (
                <div
                    style={{
                        position: 'fixed',
                        top: dropdownPosition?.top ?? 0,
                        left: dropdownPosition?.left ?? 0,
                        visibility: dropdownPosition ? 'visible' : 'hidden',
                        backgroundColor: 'white',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                        zIndex: 999999,
                        padding: '12px',
                        fontSize: '13px',
                        color: '#999',
                        textAlign: 'center',
                        minWidth: '525px',
                        width: '525px',
                        marginTop: '2px'
                    }}
                >
                    No options found
                </div>
            )}
        </div>
    );
};

// Custom Organization LOV Component
const OrganizationLOV = ({ value, onChange, options, error }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
    const dropdownRef = useRef(null);
    const inputRef = useRef(null);

    // Calculate dropdown position when opening
    const updateDropdownPosition = () => {
        if (inputRef.current) {
            const rect = inputRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom,
                left: rect.left
            });
        }
    };

    // Update position on scroll
    useEffect(() => {
        if (isOpen) {
            window.addEventListener('scroll', updateDropdownPosition, true);
            return () => window.removeEventListener('scroll', updateDropdownPosition, true);
        }
    }, [isOpen]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
                setHighlightedIndex(-1);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleInputChange = (inputValue) => {
        console.log('OrganizationLOV - Input changed:', inputValue);
        onChange(inputValue);
        setIsOpen(true);
        setHighlightedIndex(-1);
        setTimeout(updateDropdownPosition, 0);
    };

    const handleInputFocus = () => {
        setIsOpen(true);
        setTimeout(updateDropdownPosition, 0);
    };

    const handleKeyDown = (e) => {
        if (!isOpen) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(prev =>
                    prev < options.length - 1 ? prev + 1 : 0
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev =>
                    prev > 0 ? prev - 1 : options.length - 1
                );
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0 && options[highlightedIndex]) {
                    onChange(options[highlightedIndex].label);
                    setIsOpen(false);
                    setHighlightedIndex(-1);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                setHighlightedIndex(-1);
                break;
        }
    };

    const filteredOptions = options;

    console.log('OrganizationLOV - Render check:', {
        isOpen,
        value,
        optionsLength: options.length,
        filteredOptionsLength: filteredOptions.length,
        filteredOptions
    });

    return (
        <div style={{ position: 'relative' }} ref={dropdownRef}>
            <TextField
                fullWidth={false}
                size="small"
                variant="outlined"
                value={isOpen ? '' : (value || '')}
                placeholder={isOpen ? "Select Organization" : ""}
                InputProps={{
                    readOnly: true,
                    style: { cursor: 'pointer' },
                    endAdornment: <ChevronDown size={16} style={{ color: '#666', cursor: 'pointer' }} />
                }}
                onClick={() => setIsOpen(true)}
                onFocus={handleInputFocus}
                onKeyDown={handleKeyDown}
                inputRef={inputRef}
                autoComplete="off"
                sx={{
                    width: '200px',
                    '& .MuiOutlinedInput-root': {
                        fontSize: '14px',
                        backgroundColor: 'white',
                        cursor: 'pointer',
                        paddingRight: '8px',
                        '& fieldset': {
                            borderColor: error ? '#ef4444 !important' : 'rgba(0, 0, 0, 0.23)',
                        }
                    },
                    '& .MuiInputBase-input': {
                        cursor: 'pointer'
                    }
                }}
            />
            {isOpen && filteredOptions.length > 0 && (
                <div
                    ref={dropdownRef}
                    style={{
                        position: 'fixed',
                        top: dropdownPosition.top,
                        left: dropdownPosition.left,
                        backgroundColor: 'white',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                        zIndex: 999999,
                        maxHeight: '200px',
                        overflowY: 'auto',
                        minWidth: '200px',
                        width: '200px'
                    }}>
                    {filteredOptions.map((option, index) => (
                        <div
                            key={option.value}
                            style={{
                                padding: '10px 12px',
                                cursor: 'pointer',
                                backgroundColor: index === highlightedIndex ? '#f0f8ff' : 'white',
                                fontSize: '14px',
                                borderBottom: '1px solid #eee',
                                whiteSpace: 'normal',
                                wordBreak: 'break-word'
                            }}
                            onClick={() => {
                                onChange(option.label);
                                setIsOpen(false);
                                setHighlightedIndex(-1);
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

const ProcessStreamBusinessLinesMapping = ({ onClose, selectedProject, onBackToLanding, onLogout }) => {
    const navigate = useNavigate();
    const { handleAuthError } = useSession();
    const [showNoProjectSelectedPopup, setShowNoProjectSelectedPopup] = useState(false);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [mappingLoading, setMappingLoading] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [editValues, setEditValues] = useState({});
    const [hasNewRow, setHasNewRow] = useState(false);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const menuRef = useRef(null);
    const menuButtonRefs = useRef({});

    // LOV for Process Stream - Custom API call since response format differs from useLOV expectation
    const [processStreamOptions, setProcessStreamOptions] = useState([]);
    const [lovLoading, setLovLoading] = useState(true);
    const [lovError, setLovError] = useState(null);

    // LOV for Service Lines - Custom API call
    const [serviceLineOptions, setServiceLineOptions] = useState([]);
    const [serviceLineLoading, setServiceLineLoading] = useState(true);
    const [serviceLineError, setServiceLineError] = useState(null);

    // LOV for Organization Names - Custom API call
    const [organizationOptions, setOrganizationOptions] = useState([]);
    const [organizationLoading, setOrganizationLoading] = useState(true);
    const [organizationError, setOrganizationError] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});
    const [showHelpPopup, setShowHelpPopup] = useState(false);
    const helpPopupRef = useRef(null);

    useEffect(() => {
        if (!selectedProject?.id && !localStorage.getItem('project_id')) {
            setShowNoProjectSelectedPopup(true);
            setLovLoading(false);
            setOrganizationLoading(false);
            setServiceLineLoading(false);
            return;
        }

        const fetchProcessStreams = async () => {
            try {
                setLovLoading(true);
                setLovError(null);

                let idToken;
                try {
                    idToken = await getIdToken();
                } catch (tokenError) {
                    console.error('Error getting token:', tokenError);
                    handleAuthError(tokenError.message);
                    setLovError(tokenError.message);
                    setProcessStreamOptions([]);
                    setLovLoading(false);
                    return;
                }

                const headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                };

                const response = await fetch('https://vs7ws23ybl.execute-api.ap-south-1.amazonaws.com/rice/Stream-Business-Mapp/get-streams', {
                    headers: headers
                });

                if (response.status === 401 || response.status === 403) {
                    handleAuthError('Unauthorized - session expired');
                    setLovError('Unauthorized - session expired');
                    setProcessStreamOptions([]);
                    setLovLoading(false);
                    return;
                }

                const result = await response.json();

                if (result.data && Array.isArray(result.data)) {
                    const options = result.data.map(item => ({
                        value: DOMPurify.sanitize(String(item || '').trim(), { ALLOWED_TAGS: [] }),
                        label: DOMPurify.sanitize(String(item || '').trim(), { ALLOWED_TAGS: [] })
                    }));
                    setProcessStreamOptions(options);
                } else {
                    console.error('API Error - Data check failed:', result);
                    setProcessStreamOptions([]);
                }
            } catch (err) {
                console.error('Error fetching process streams:', err);
                handleAuthError(err.message);
                setLovError(err.message);
                setProcessStreamOptions([]);
            } finally {
                setLovLoading(false);
            }
        };

        const fetchOrganizationsAndServiceLines = async () => {
            try {
                setOrganizationLoading(true);
                setServiceLineLoading(true);
                setOrganizationError(null);
                setServiceLineError(null);

                let idToken;
                try {
                    idToken = await getIdToken();
                } catch (tokenError) {
                    console.error('Error getting token:', tokenError);
                    handleAuthError(tokenError.message);
                    setOrganizationError(tokenError.message);
                    setServiceLineError(tokenError.message);
                    setOrganizationOptions([]);
                    setServiceLineOptions([]);
                    setOrganizationLoading(false);
                    setServiceLineLoading(false);
                    return;
                }

                const headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                };

                const projectId = localStorage.getItem('project_id') || selectedProject?.id;
                const response = await fetch(`https://tfv4q9mq6g.execute-api.ap-south-1.amazonaws.com/New/ricew/resourceRateCard/LOV/si-organization-details?project_id=${projectId}`, {
                    headers: headers
                });

                if (response.status === 401 || response.status === 403) {
                    handleAuthError('Unauthorized - session expired');
                    setOrganizationError('Unauthorized - session expired');
                    setServiceLineError('Unauthorized - session expired');
                    setOrganizationOptions([]);
                    setServiceLineOptions([]);
                    setOrganizationLoading(false);
                    setServiceLineLoading(false);
                    return;
                }

                const result = await response.json();

                if (result.data && Array.isArray(result.data)) {
                    // Extract Organizations
                    const orgOptions = result.data.map(item => ({
                        value: DOMPurify.sanitize(String(item.SI_Organization_Details_id || '').trim(), { ALLOWED_TAGS: [] }),
                        label: DOMPurify.sanitize(String(item.SI_organization_name || '').trim(), { ALLOWED_TAGS: [] }),
                        SI_Organization_Details_id: DOMPurify.sanitize(String(item.SI_Organization_Details_id || '').trim(), { ALLOWED_TAGS: [] }),
                        SI_organization_name: DOMPurify.sanitize(String(item.SI_organization_name || '').trim(), { ALLOWED_TAGS: [] }),
                        ...Object.keys(item).reduce((acc, key) => {
                            if (typeof item[key] === 'string' && !['SI_Organization_Details_id', 'SI_organization_name'].includes(key)) {
                                acc[key] = DOMPurify.sanitize(String(item[key] || '').trim(), { ALLOWED_TAGS: [] });
                            } else if (!Array.isArray(item[key])) {
                                acc[key] = item[key];
                            }
                            return acc;
                        }, {})
                    }))
                        .sort((a, b) => {
                            const idA = parseInt(a.value) || 0;
                            const idB = parseInt(b.value) || 0;
                            return idA - idB;
                        });

                    setOrganizationOptions(orgOptions);

                    // Extract Service Lines
                    const slOptions = [];
                    result.data.forEach(org => {
                        if (org.ServiceLines && Array.isArray(org.ServiceLines)) {
                            org.ServiceLines.forEach(sl => {
                                const sanitizedBusinessLine = DOMPurify.sanitize(String(sl.Business_Line_Name || '').trim(), { ALLOWED_TAGS: [] });
                                const sanitizedPortfolio = DOMPurify.sanitize(String(sl.Portfolio_Name || '').trim(), { ALLOWED_TAGS: [] });
                                const sanitizedService = DOMPurify.sanitize(String(sl.Service_Name || '').trim(), { ALLOWED_TAGS: [] });
                                const formattedName = `${sanitizedBusinessLine} : ${sanitizedPortfolio} : ${sanitizedService}`;

                                slOptions.push({
                                    value: formattedName,
                                    label: formattedName,
                                    realServiceName: sanitizedService,
                                    SI_Organization_Details_id: DOMPurify.sanitize(String(org.SI_Organization_Details_id || '').trim(), { ALLOWED_TAGS: [] }),
                                    Business_Line_Name: sanitizedBusinessLine,
                                    Portfolio_Name: sanitizedPortfolio,
                                    Service_Name: sanitizedService,
                                    ...Object.keys(sl).reduce((acc, key) => {
                                        if (typeof sl[key] === 'string' && !['Business_Line_Name', 'Portfolio_Name', 'Service_Name'].includes(key)) {
                                            acc[key] = DOMPurify.sanitize(String(sl[key] || '').trim(), { ALLOWED_TAGS: [] });
                                        } else {
                                            acc[key] = sl[key];
                                        }
                                        return acc;
                                    }, {})
                                });
                            });
                        }
                    });
                    setServiceLineOptions(slOptions);
                } else {
                    console.error('Org & Service API Error - Data check failed:', result);
                    setOrganizationOptions([]);
                    setServiceLineOptions([]);
                }
            } catch (err) {
                console.error('Error fetching orgs & service lines:', err);
                handleAuthError(err.message);
                setOrganizationError(err.message);
                setServiceLineError(err.message);
                setOrganizationOptions([]);
                setServiceLineOptions([]);
            } finally {
                setOrganizationLoading(false);
                setServiceLineLoading(false);
            }
        };

        // Fetch all APIs
        fetchProcessStreams();
        fetchOrganizationsAndServiceLines();
    }, [selectedProject?.id]);

    // Fetch Mapping Data when organization loading is complete
    useEffect(() => {
        if (!organizationLoading) {
            fetchMappingData();
        }
    }, [organizationLoading, selectedProject?.id]);

    const fetchMappingData = async () => {
        try {
            setMappingLoading(true);
            let idToken;
            try {
                idToken = await getIdToken();
            } catch (tokenError) {
                console.error('Error getting token:', tokenError);
                handleAuthError(tokenError.message);
                setMappingLoading(false);
                return;
            }

            const projectId = localStorage.getItem('project_id') || selectedProject?.id;

            const response = await fetch(`https://vs7ws23ybl.execute-api.ap-south-1.amazonaws.com/rice/Stream-Business-Mapp/process-service-mapping/get?project_id=${projectId}`, {
                headers: {
                    'Authorization': `Bearer ${idToken}`
                }
            });

            if (response.status === 401 || response.status === 403) {
                handleAuthError('Unauthorized - session expired');
                setData([]);
                setMappingLoading(false);
                return;
            }

            const result = await response.json();
            console.log('Raw Mapping Data:', result);

            if (result.data && Array.isArray(result.data)) {
                // Collect all unique organization IDs from PB_mapping across all records
                const allOrgIdsInMapping = new Set();
                result.data.forEach(item => {
                    let pbMapping = item.PB_mapping || {};
                    if (pbMapping.M) pbMapping = pbMapping.M;
                    Object.keys(pbMapping).forEach(orgId => {
                        allOrgIdsInMapping.add(normalizeId(orgId));
                    });
                });

                // Check if there are any organization IDs in mapping data that aren't in organizationOptions
                const currentOrgIds = new Set(organizationOptions.map(org => normalizeId(org.value)));
                const missingOrgIds = [...allOrgIdsInMapping].filter(orgId => !currentOrgIds.has(orgId));

                // If there are missing organizations, add them to organizationOptions
                if (missingOrgIds.length > 0) {
                    console.log('Found missing organization IDs in mapping data:', missingOrgIds);

                    // Fetch organization details for missing IDs
                    const newOrganizations = [];
                    result.data.forEach(item => {
                        let pbMapping = item.PB_mapping || {};
                        if (pbMapping.M) pbMapping = pbMapping.M;

                        Object.keys(pbMapping).forEach(orgId => {
                            const normalizedId = normalizeId(orgId);
                            if (missingOrgIds.includes(normalizedId)) {
                                // Check if we haven't already added this org
                                if (!newOrganizations.find(org => normalizeId(org.value) === normalizedId)) {
                                    let orgData = pbMapping[orgId];
                                    if (orgData && orgData.M) orgData = orgData.M;

                                    let orgName = '';
                                    if (typeof orgData === 'object' && orgData !== null) {
                                        orgName = orgData.org_name?.S || orgData.org_name || '';
                                    }

                                    // Try to extract organization name from the mapping or use the ID
                                    newOrganizations.push({
                                        value: DOMPurify.sanitize(String(orgId || '').trim(), { ALLOWED_TAGS: [] }),
                                        label: DOMPurify.sanitize(String(orgName || `Organization ${orgId}` || '').trim(), { ALLOWED_TAGS: [] }),
                                        SI_Organization_Details_id: DOMPurify.sanitize(String(orgId || '').trim(), { ALLOWED_TAGS: [] })
                                    });
                                }
                            }
                        });
                    });

                    if (newOrganizations.length > 0) {
                        console.log('Adding new organizations to options:', newOrganizations);
                        // Merge and sort all organizations by SI_Organization_Details_id
                        setOrganizationOptions(prev => {
                            const combined = [...prev, ...newOrganizations];
                            return combined.sort((a, b) => {
                                const idA = parseInt(a.value) || 0;
                                const idB = parseInt(b.value) || 0;
                                return idA - idB;
                            });
                        });
                    }
                }

                const transformedData = result.data.map((item, idx) => {
                    const row = {
                        id: parseInt(item.Process_Business_id?.S || item.Process_Business_id) || (idx + 1),
                        dbId: DOMPurify.sanitize(String(item.Process_Business_id?.S || item.Process_Business_id || '').trim(), { ALLOWED_TAGS: [] }),
                        processStream: DOMPurify.sanitize(String(item.Process_Stream?.S || item.Process_Stream || '').trim(), { ALLOWED_TAGS: [] }),
                        isSaved: true
                    };

                    // Map PB_mapping to dynamic frontend fields
                    let pbMapping = item.PB_mapping || {};
                    if (pbMapping.M) pbMapping = pbMapping.M;

                    // Use the updated organizationOptions (including newly added ones)
                    const allOrgs = organizationOptions;

                    allOrgs.forEach((org, index) => {
                        const normalizedOrgId = normalizeId(org.value);

                        // Find a key in pbMapping that matches normalizedOrgId
                        const mappingKey = Object.keys(pbMapping).find(key =>
                            normalizeId(key) === normalizedOrgId
                        );

                        let slData = mappingKey ? pbMapping[mappingKey] : '';
                        if (slData && slData.M) slData = slData.M;

                        let slValue = '';
                        let slFormId = '';

                        if (typeof slData === 'object' && slData !== null) {
                            slValue = DOMPurify.sanitize(String(slData.service_line?.S || slData.service_line || '').trim(), { ALLOWED_TAGS: [] });
                            slFormId = DOMPurify.sanitize(String(slData.service_form_id?.S || slData.service_form_id || '').trim(), { ALLOWED_TAGS: [] });
                        } else {
                            slValue = DOMPurify.sanitize(String(slData || '').trim(), { ALLOWED_TAGS: [] });
                        }

                        // Also check flat legacy fields as fallback
                        if (!slValue) {
                            const flatSL = item[`Service_Lines${index + 1}`];
                            slValue = DOMPurify.sanitize(String(flatSL?.S || flatSL || '').trim(), { ALLOWED_TAGS: [] });
                            const flatSFID = item[`Service_Form_ID${index + 1}`];
                            slFormId = DOMPurify.sanitize(String(flatSFID?.S || flatSFID || slFormId || '').trim(), { ALLOWED_TAGS: [] });
                        }

                        // Map the raw backend Service_Name to the formatted Business : Portfolio : Service_Name
                        if (slValue || slFormId) {
                            let match = null;
                            if (slFormId) {
                                match = serviceLineOptions.find(opt =>
                                    normalizeId(opt.Service_Form_ID) === normalizeId(slFormId)
                                );
                            }

                            if (!match && slValue) {
                                match = serviceLineOptions.find(opt =>
                                    opt.realServiceName === slValue &&
                                    normalizeId(opt.SI_Organization_Details_id) === normalizedOrgId
                                );
                            }

                            if (!match && slValue) {
                                // Last resort: check if label matches
                                match = serviceLineOptions.find(opt =>
                                    opt.label === slValue &&
                                    normalizeId(opt.SI_Organization_Details_id) === normalizedOrgId
                                );
                            }

                            if (match) {
                                slValue = DOMPurify.sanitize(String(match.label || '').trim(), { ALLOWED_TAGS: [] });
                            }
                        }

                        row[`serviceLine${index + 1}`] = slValue;
                    });

                    return row;
                });

                // Sort the transformed data by Process_Business_id in ascending order (smallest first)
                const sortedData = transformedData.sort((a, b) => {
                    const idA = parseInt(a.dbId) || 0;
                    const idB = parseInt(b.dbId) || 0;
                    return idA - idB;
                });

                setData(sortedData);
            }
        } catch (err) {
            console.error('Error fetching mapping data:', err);
            handleAuthError(err.message);
            setErrorMessage('Failed to load mapping data');
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 3000);
        } finally {
            setMappingLoading(false);
        }
    };

    // Debug logging
    useEffect(() => {
        console.log('=== Process Stream LOV Debug ===');
        console.log('LOV Loading:', lovLoading);
        console.log('LOV Error:', lovError);
        console.log('Process Stream Options:', processStreamOptions);
        console.log('Options Count:', processStreamOptions.length);
        console.log('============================');
    }, [lovLoading, lovError, processStreamOptions]);

    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [showErrorMessage, setShowErrorMessage] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const [confirmMessage, setConfirmMessage] = useState('');

    // Update menu position on scroll
    const updateMenuPosition = () => {
        if (openMenuId && menuButtonRefs.current[openMenuId]) {
            const rect = menuButtonRefs.current[openMenuId].getBoundingClientRect();
            setMenuPosition({
                top: rect.bottom - 55,
                left: rect.left - 125 // Shift left to align from right
            });
        }
    };

    useEffect(() => {
        if (openMenuId) {
            window.addEventListener('scroll', updateMenuPosition, true);
            updateMenuPosition();
            return () => window.removeEventListener('scroll', updateMenuPosition, true);
        }
    }, [openMenuId]);

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

    const toggleMenu = (id) => {
        if (openMenuId === id) {
            setOpenMenuId(null);
        } else {
            setOpenMenuId(id);
            // Position will be set by useEffect
        }
    };

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

    const handleAddMapping = () => {
        if (editingItem !== null) {
            showConfirmation(
                'You have unsaved changes. Do you want to discard them and add a new mapping?',
                () => {
                    setEditingItem(null);
                    setEditValues({});
                    addNewMappingRow();
                }
            );
            return;
        }
        addNewMappingRow();
    };

    const addNewMappingRow = () => {
        const newId = data.length > 0 ? Math.max(...data.map(item => item.id)) + 1 : 1;
        const newRow = {
            id: newId,
            processStream: '',
            isSaved: false
        };

        // Add dynamic service line fields for each organization
        organizationOptions.forEach((org, index) => {
            newRow[`serviceLine${index + 1}`] = '';
        });

        setData([...data, newRow]);
        setEditingItem(newId);
        setEditValues(newRow);
        setHasNewRow(true);

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
            if (editingItem !== null && editingItem !== id) {
                showConfirmation(
                    'You have unsaved changes. Do you want to discard them and edit another record?',
                    () => {
                        setEditingItem(id);
                        setEditValues({ ...item });
                        setOpenMenuId(null);
                    }
                );
            } else {
                setEditingItem(id);
                setEditValues({ ...item });
                setOpenMenuId(null);
            }
        }
    };

    const handleCancelEdit = () => {
        if (!editValues.isSaved) {
            setData(data.filter(item => item.id !== editingItem));
            setHasNewRow(false);
        }
        setEditingItem(null);
        setEditValues({});
        setFieldErrors({});
    };

    const handleSaveEdit = async (id) => {
        if (!editValues.processStream || !editValues.processStream.trim()) {
            setFieldErrors(prev => ({ ...prev, [id]: { processStream: true } }));
            setErrorMessage('Please fill in the Process Stream field');
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 3000);
            return;
        }

        // Clear field errors if validation passes
        setFieldErrors(prev => {
            const newErrors = { ...prev };
            if (newErrors[id]) delete newErrors[id];
            return newErrors;
        });

        setLoading(true);
        try {
            let idToken;
            try {
                idToken = await getIdToken();
            } catch (tokenError) {
                console.error('Error getting token:', tokenError);
                handleAuthError(tokenError.message);
                setErrorMessage('Authentication error - session expired');
                setShowErrorMessage(true);
                setTimeout(() => setShowErrorMessage(false), 3000);
                setLoading(false);
                return;
            }

            console.log('Current editValues:', editValues);

            const org_names = [];
            const org_ids = [];
            const Service_Lines = [];
            const service_form_ids = [];

            organizationOptions.forEach((org, index) => {
                const serviceLine = editValues[`serviceLine${index + 1}`];
                const cleanSLine = (serviceLine && serviceLine.trim()) ? serviceLine.trim() : "";

                if (cleanSLine) {
                    org_names.push(DOMPurify.sanitize(String(org.label || '').trim(), { ALLOWED_TAGS: [] }));
                    org_ids.push(DOMPurify.sanitize(String(org.value || '').trim(), { ALLOWED_TAGS: [] }));

                    // Extract Service_Name if formatted as "Business_Line_Name : Portfolio_Name : Service_Name"
                    const parts = cleanSLine.split(" : ");
                    const serviceName = parts[parts.length - 1].trim();
                    Service_Lines.push(DOMPurify.sanitize(String(serviceName || '').trim(), { ALLOWED_TAGS: [] }));

                    // Find the Service_Form_ID from serviceLineOptions
                    const option = serviceLineOptions.find(opt =>
                        opt.label === cleanSLine &&
                        normalizeId(opt.SI_Organization_Details_id) === normalizeId(org.value)
                    );
                    service_form_ids.push(option ? DOMPurify.sanitize(String(option.Service_Form_ID || '').trim(), { ALLOWED_TAGS: [] }) : "");
                }
            });

            if (org_names.length === 0) {
                setFieldErrors(prev => ({ ...prev, [id]: { ...prev[id], serviceLine: true } }));
                setErrorMessage('Please fill in at least one Service Line');
                setShowErrorMessage(true);
                setTimeout(() => setShowErrorMessage(false), 3000);
                setLoading(false);
                return;
            }

            const currentProjectId = localStorage.getItem('project_id') || selectedProject?.id || '101';
            const currentUserId = localStorage.getItem('user_id') || selectedProject?.user_id || "1";

            let endpoint, payload;

            if (editValues.isSaved) {
                if (!editValues.dbId) {
                    console.error('Missing dbId for update!', editValues);
                    throw new Error('Internal error: Missing record ID for update');
                }
                endpoint = 'https://vs7ws23ybl.execute-api.ap-south-1.amazonaws.com/rice/Stream-Business-Mapp/process-service-mapping/update';
                payload = {
                    Process_Business_id: DOMPurify.sanitize(String(editValues.dbId || '').trim(), { ALLOWED_TAGS: [] }),
                    Process_Stream: DOMPurify.sanitize(String(editValues.processStream || '').trim(), { ALLOWED_TAGS: [] }),
                    org_names: org_names,
                    org_ids: org_ids,
                    Service_Lines: Service_Lines,
                    service_form_ids: service_form_ids,
                    user_id: DOMPurify.sanitize(String(currentUserId || '').trim(), { ALLOWED_TAGS: [] }),
                    project_id: DOMPurify.sanitize(String(currentProjectId || '').trim(), { ALLOWED_TAGS: [] }),
                    lastupdatedby: DOMPurify.sanitize(String(currentUserId || '').trim(), { ALLOWED_TAGS: [] })
                };
                console.log('Sending Update Payload:', payload);
            } else {
                endpoint = 'https://vs7ws23ybl.execute-api.ap-south-1.amazonaws.com/rice/Stream-Business-Mapp/process-service-mapping/post';
                payload = {
                    Process_Stream: DOMPurify.sanitize(String(editValues.processStream || '').trim(), { ALLOWED_TAGS: [] }),
                    org_names: org_names,
                    org_ids: org_ids,
                    Service_Lines: Service_Lines,
                    service_form_ids: service_form_ids,
                    user_id: DOMPurify.sanitize(String(currentUserId || '').trim(), { ALLOWED_TAGS: [] }),
                    project_id: DOMPurify.sanitize(String(currentProjectId || '').trim(), { ALLOWED_TAGS: [] }),
                    createdby: DOMPurify.sanitize(String(currentUserId || '').trim(), { ALLOWED_TAGS: [] })
                };
                console.log('Sending Create Payload:', payload);
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify(payload)
            });

            if (response.status === 401 || response.status === 403) {
                handleAuthError('Unauthorized - session expired');
                setErrorMessage('Session expired - please log in again');
                setShowErrorMessage(true);
                setTimeout(() => setShowErrorMessage(false), 3000);
                setLoading(false);
                return;
            }

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Failed to save mapping');
            }

            setSuccessMessage(editValues.isSaved ? 'Mapping updated successfully!' : 'Mapping saved successfully!');
            setShowSuccessMessage(true);
            setTimeout(() => setShowSuccessMessage(false), 3000);

            // Refresh data to get the latest state from DB
            await fetchMappingData();

            setEditingItem(null);
            setEditValues({});
            setHasNewRow(false);
        } catch (err) {
            console.error('Error saving mapping:', err);
            handleAuthError(err.message);
            setErrorMessage(err.message || 'Error saving mapping');
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 3000);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (id) => {
        // For new rows (unsaved), delete immediately without confirmation
        const item = data.find(d => d.id === id);
        if (item && !item.isSaved) {
            setData(data.filter(item => item.id !== id));
            setOpenMenuId(null);
            if (editingItem === id) {
                setEditingItem(null);
                setEditValues({});
                setFieldErrors({});
                setHasNewRow(false);
            }
            return;
        }

        // For existing rows, show confirmation dialog
        showConfirmation(
            'Are you sure you want to delete this mapping? This action cannot be undone.',
            async () => {
                setLoading(true);
                try {
                    let idToken;
                    try {
                        idToken = await getIdToken();
                    } catch (tokenError) {
                        console.error('Error getting token:', tokenError);
                        handleAuthError(tokenError.message);
                        setErrorMessage('Authentication error - session expired');
                        setShowErrorMessage(true);
                        setTimeout(() => setShowErrorMessage(false), 3000);
                        setLoading(false);
                        return;
                    }

                    const currentProjectId = localStorage.getItem('project_id') || selectedProject?.id || '101';
                    const currentUserId = localStorage.getItem('user_id') || selectedProject?.user_id || "1";

                    const response = await fetch('https://vs7ws23ybl.execute-api.ap-south-1.amazonaws.com/rice/Stream-Business-Mapp/process-service-mapping/delete', {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${idToken}`
                        },
                        body: JSON.stringify({
                            Process_Business_id: DOMPurify.sanitize(String(item.dbId || '').trim(), { ALLOWED_TAGS: [] }),
                            project_id: DOMPurify.sanitize(String(currentProjectId || '').trim(), { ALLOWED_TAGS: [] }),
                            lastupdatedby: DOMPurify.sanitize(String(currentUserId || '').trim(), { ALLOWED_TAGS: [] })
                        })
                    });

                    if (response.status === 401 || response.status === 403) {
                        handleAuthError('Unauthorized - session expired');
                        setErrorMessage('Session expired - please log in again');
                        setShowErrorMessage(true);
                        setTimeout(() => setShowErrorMessage(false), 3000);
                        setLoading(false);
                        return;
                    }

                    const result = await response.json();
                    if (!response.ok) {
                        throw new Error(result.error || 'Failed to delete mapping');
                    }

                    setSuccessMessage('Mapping deleted successfully!');
                    setShowSuccessMessage(true);
                    setTimeout(() => setShowSuccessMessage(false), 3000);

                    // Refresh data after deletion
                    await fetchMappingData();

                    setOpenMenuId(null);
                    if (editingItem === id) {
                        setEditingItem(null);
                        setEditValues({});
                    }
                } catch (err) {
                    console.error('Error deleting mapping:', err);
                    handleAuthError(err.message);
                    setErrorMessage(err.message || 'Error deleting mapping');
                    setShowErrorMessage(true);
                    setTimeout(() => setShowErrorMessage(false), 3000);
                } finally {
                    setLoading(false);
                }
            }
        );
    };

    const handleInputChange = (field, value) => {
        setEditValues(prev => ({ ...prev, [field]: value }));
        // Clear field error when user selects/types a value
        if (value && typeof value === 'string' && value.trim()) {
            setFieldErrors(prev => {
                const newErrors = { ...prev };
                if (newErrors[editingItem]) {
                    const rowErrors = { ...newErrors[editingItem] };
                    if (field === 'processStream') {
                        delete rowErrors.processStream;
                    } else if (field.startsWith('businessLines')) {
                        delete rowErrors.businessLines;
                    }

                    if (Object.keys(rowErrors).length === 0) {
                        delete newErrors[editingItem];
                    } else {
                        newErrors[editingItem] = rowErrors;
                    }
                }
                return newErrors;
            });
        }
    };

    return (
        <>
            <div className="config-main" style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '0', margin: '0' }}>
                <div style={{ padding: '1rem 1rem 2rem 1rem', width: '100%', minWidth: '1250px', margin: '0', boxSizing: 'border-box' }}>

                    {/* Main Content Area */}
                    <div style={{ backgroundColor: 'white', padding: '0', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>

                        {/* Project Info Header */}
                        <div style={{ padding: '2rem 1rem 1rem 2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project : <span style={{ color: '#007bff' }}>{localStorage.getItem('project_name') || selectedProject?.name}</span></h3>
                            </div>
                        </div>

                        {/* Page Title */}
                        <div className="config-header" style={{ marginTop: '0', marginRight: '0px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h2>Process Stream &amp; Service Line Mapping</h2>
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
                                                    The <strong>Process Stream &amp; Service Line Mapping</strong> page links each master process stream to the specific service lines provided by the implementing partner organizations. It defines which work streams (service lines) within each organization are responsible for delivering each process area.
                                                </p>
                                            </div>

                                            <div style={{ marginBottom: '16px' }}>
                                                <strong style={{ color: '#1f2937', fontSize: '15px' }}>Why is this used?</strong>
                                                <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                                                    This mapping is a critical planning artefact for ERP engagements. It ensures that every process stream has a clear organizational owner at the service line level — enabling accurate resource planning, effort estimation, and accountability across multiple partner organizations.
                                                </p>
                                            </div>

                                            <div style={{ marginBottom: '16px' }}>
                                                <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to read the table</strong>
                                                <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                                    <li><strong>Process Stream</strong> (first column) — The master process stream being mapped (e.g., Finance, HR, Supply Chain). Selected from the RICE master stream list.</li>
                                                    <li><strong>Organization columns</strong> — Each additional column represents one implementing partner organization. The column header shows the organization name.</li>
                                                    <li><strong>Service Line cells</strong> — Each cell shows the service line assigned to that organization for the given process stream. Service lines are displayed as <em>Business Line : Portfolio : Service Name</em>.</li>
                                                    <li><strong>Actions</strong> — Edit or Delete a mapping row via the ⋮ menu.</li>
                                                </ul>
                                            </div>

                                            <div style={{ marginBottom: '16px' }}>
                                                <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to use this page</strong>
                                                <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                                    <li>Click <strong>Add Mapping</strong> to create a new row. Select a Process Stream, then assign a Service Line for each organization column.</li>
                                                    <li>At least one Service Line must be filled in before saving — a mapping with only a Process Stream and no service lines is not allowed.</li>
                                                    <li>Use the <strong>⋮ Actions</strong> menu to Edit or Delete an existing mapping row.</li>
                                                    <li>Click <strong>Save (✓)</strong> to commit edits on a saved row, or <strong>X</strong> to cancel.</li>
                                                    <li>Service lines are filtered per organization — each organization column only shows service lines that belong to that organization.</li>
                                                </ul>
                                            </div>

                                            <div style={{ marginBottom: '4px' }}>
                                                <strong style={{ color: '#1f2937', fontSize: '15px' }}>Important notes</strong>
                                                <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                                    <li><strong>Process Stream</strong> is a required field — saving will fail without it.</li>
                                                    <li>At least <strong>one Service Line</strong> across all organization columns must be selected before the mapping can be saved.</li>
                                                    <li>Organization columns are dynamically generated based on the organizations configured for this project. If no organizations are set up, no service line columns will appear.</li>
                                                    <li>A project must be selected before this page loads. If none is selected, you will be redirected to the Project Definition Form.</li>
                                                </ul>
                                            </div>

                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Success Message Popup */}
                        {showSuccessMessage && (
                            <div style={{
                                position: 'fixed', top: '20px', right: '20px', backgroundColor: '#10b981', color: 'white',
                                padding: '12px 20px', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                zIndex: 1000, fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px'
                            }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22,4 12,14.01 9,11.01" />
                                </svg>
                                {successMessage}
                            </div>
                        )}

                        {/* Error Message Popup */}
                        {showErrorMessage && (
                            <div style={{
                                position: 'fixed', top: '20px', right: '20px', backgroundColor: '#ef4444', color: 'white',
                                padding: '12px 20px', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                zIndex: 1000, fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px',
                                maxWidth: '400px', wordWrap: 'break-word'
                            }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                                </svg>
                                {errorMessage}
                            </div>
                        )}

                        {/* Confirmation Dialog */}
                        {showConfirmDialog && (
                            <div style={{
                                position: 'fixed', top: '0', left: '0', right: '0', bottom: '0', backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
                            }}>
                                <div style={{
                                    backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                                    maxWidth: '400px', width: '90%', textAlign: 'center'
                                }}>
                                    <h3 style={{ margin: '0 0 16px 0', color: '#333', fontSize: '18px', fontWeight: '600' }}>Confirmation</h3>
                                    <p style={{ margin: '0 0 24px 0', color: '#666', fontSize: '16px', lineHeight: '1.5' }}>{confirmMessage}</p>
                                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                        <button onClick={handleConfirmCancel} style={{
                                            backgroundColor: '#6b7280', color: 'white', border: 'none', padding: '10px 24px',
                                            borderRadius: '6px', cursor: 'pointer', fontSize: '16px', fontWeight: '500', minWidth: '100px'
                                        }}>Cancel</button>
                                        <button onClick={handleConfirmYes} style={{
                                            backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '10px 24px',
                                            borderRadius: '6px', cursor: 'pointer', fontSize: '16px', fontWeight: '500', minWidth: '100px'
                                        }}>Yes</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Loading Overlay */}
                        {(loading || mappingLoading || organizationLoading || lovLoading || serviceLineLoading) && (
                            <div style={{
                                position: 'fixed',
                                top: '0',
                                left: '0',
                                right: '0',
                                bottom: '0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 1500
                            }}>
                                <div style={{
                                    backgroundColor: 'white',
                                    padding: '24px',
                                    borderRadius: '8px',
                                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '16px'
                                }}>
                                    <div style={{
                                        width: '50px',
                                        height: '50px',
                                        border: '3px solid #f3f3f3',
                                        borderTop: '3px solid #3b82f6',
                                        borderRadius: '50%',
                                        animation: 'spin 1s linear infinite'
                                    }}></div>
                                    <span style={{
                                        fontSize: '16px',
                                        color: '#333',
                                        fontWeight: '500'
                                    }}>
                                        Loading...
                                    </span>
                                </div>
                            </div>
                        )}

                        <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto', overflowX: 'auto' }}>
                            <table className="config-table" style={{ fontSize: '15px' }}>
                                <thead>
                                    <tr>
                                        <th style={{ padding: '8px 12px', fontSize: '16px', minWidth: '250px' }}></th>
                                        {organizationOptions.map((org, index) => (
                                            <th key={org.value} style={{ padding: '8px 12px', fontSize: '16px', minWidth: '525px' }}>
                                                {org.label}
                                            </th>
                                        ))}
                                        <th style={{ padding: '8px 12px', fontSize: '16px', minWidth: '100px', textAlign: 'center' }}></th>
                                    </tr>
                                    <tr>
                                        <th style={{ padding: '6px 12px', fontSize: '14px', backgroundColor: '#f5f5f5', minWidth: '250px' }}>Process Stream</th>
                                        {organizationOptions.map((org, index) => (
                                            <th key={`bl-${org.value}`} style={{ padding: '6px 12px', fontSize: '14px', backgroundColor: '#f5f5f5', minWidth: '525px', whiteSpace: 'nowrap' }}>
                                                Service Line
                                            </th>
                                        ))}
                                        <th style={{ padding: '6px 12px', fontSize: '14px', backgroundColor: '#f5f5f5', minWidth: '100px', textAlign: 'center' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading || mappingLoading || organizationLoading ? (
                                        <tr><td colSpan={organizationOptions.length + 2} style={{ textAlign: 'center', padding: '20px' }}>Loading...</td></tr>
                                    ) : data.length === 0 ? (
                                        <tr><td colSpan={organizationOptions.length + 2} style={{ textAlign: 'center', padding: '20px' }}>No mappings found. Click "Add Mapping" to create one.</td></tr>
                                    ) : (
                                        data.map((item) => (
                                            <tr key={item.id} style={{ height: '40px' }}>
                                                <td style={{ padding: '6px 12px', verticalAlign: 'top' }}>
                                                    {editingItem === item.id ? (
                                                        <div style={{ paddingTop: '6px' }}>
                                                            <ProcessStreamLOV
                                                                value={editValues.processStream || ''}
                                                                onChange={(value) => handleInputChange('processStream', value)}
                                                                options={processStreamOptions}
                                                                error={!!fieldErrors[item.id]?.processStream}
                                                            />
                                                            {fieldErrors[item.id]?.processStream && (
                                                                <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px', fontWeight: '500' }}>
                                                                    Required field
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div style={{ paddingTop: '6px' }}>{item.processStream || '-'}</div>
                                                    )}
                                                </td>
                                                {organizationOptions.map((org, index) => {
                                                    const normalizedOrgId = normalizeId(org.value);
                                                    const filteredBLOptions = serviceLineOptions.filter(bl =>
                                                        normalizeId(bl.SI_Organization_Details_id) === normalizedOrgId
                                                    );

                                                    return (
                                                        <td key={org.value} style={{ padding: '6px 12px', verticalAlign: 'top' }}>
                                                            {editingItem === item.id ? (
                                                                <div style={{ paddingTop: '6px' }}>
                                                                    <ServiceLineLOV
                                                                        value={editValues[`serviceLine${index + 1}`] || ''}
                                                                        onChange={(value) => handleInputChange(`serviceLine${index + 1}`, value)}
                                                                        options={filteredBLOptions}
                                                                        error={!!fieldErrors[item.id]?.serviceLine}
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div style={{ paddingTop: '6px' }}>{item[`serviceLine${index + 1}`] || '-'}</div>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                                <td style={{ padding: '6px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                                                        {editingItem === item.id ? (
                                                            !item.isSaved ? (
                                                                <button
                                                                    onClick={() => handleDelete(item.id)}
                                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            ) : (
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
                                                            )
                                                        ) : (
                                                            <div style={{ position: 'relative' }}>
                                                                <button
                                                                    ref={el => menuButtonRefs.current[item.id] = el}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        toggleMenu(item.id);
                                                                    }}
                                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '4px' }}
                                                                    title="Actions"
                                                                >
                                                                    <MoreVertical size={18} />
                                                                </button>
                                                                {openMenuId === item.id && (
                                                                    <div
                                                                        ref={menuRef}
                                                                        style={{
                                                                            position: 'fixed',
                                                                            top: menuPosition.top,
                                                                            left: menuPosition.left,
                                                                            backgroundColor: 'white',
                                                                            border: '1px solid #e0e0e0',
                                                                            borderRadius: '4px',
                                                                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                                                            zIndex: 999999,
                                                                            minWidth: '130px',
                                                                            marginTop: '4px'
                                                                        }}
                                                                    >
                                                                        <button
                                                                            onClick={() => {
                                                                                const editData = {
                                                                                    processStream: item.processStream || '',
                                                                                    isSaved: item.isSaved,
                                                                                    dbId: item.dbId
                                                                                };
                                                                                // Add dynamic service line fields for each organization
                                                                                organizationOptions.forEach((org, index) => {
                                                                                    editData[`serviceLine${index + 1}`] = item[`serviceLine${index + 1}`] || '';
                                                                                });
                                                                                setEditingItem(item.id);
                                                                                setEditValues(editData);
                                                                                setOpenMenuId(null);
                                                                            }}
                                                                            style={{
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                gap: '8px',
                                                                                width: '100%',
                                                                                padding: '8px 12px',
                                                                                border: 'none',
                                                                                backgroundColor: 'white',
                                                                                textAlign: 'left',
                                                                                cursor: 'pointer',
                                                                                fontSize: '14px',
                                                                                color: '#333'
                                                                            }}
                                                                            onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                                                                            onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                                                                        >
                                                                            <Edit size={14} style={{ color: '#3b82f6' }} />
                                                                            Edit
                                                                        </button>
                                                                        <button
                                                                            onClick={() => {
                                                                                handleDelete(item.id);
                                                                                setOpenMenuId(null);
                                                                            }}
                                                                            style={{
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                gap: '8px',
                                                                                width: '100%',
                                                                                padding: '8px 12px',
                                                                                border: 'none',
                                                                                backgroundColor: 'white',
                                                                                textAlign: 'left',
                                                                                cursor: 'pointer',
                                                                                fontSize: '14px',
                                                                                color: '#333',
                                                                                borderTop: '1px solid #e0e0e0'
                                                                            }}
                                                                            onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                                                                            onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                                                                        >
                                                                            <Trash2 size={14} style={{ color: '#ef4444' }} />
                                                                            Delete
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

                        <div className="table-actions-bottom" style={{ display: 'flex', gap: '12px', marginTop: '16px', marginLeft: '2rem' }}>
                            <button
                                className="add-btn"
                                style={{
                                    width: '180px',
                                    marginBottom: '1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px'
                                }}
                                onClick={hasNewRow ? () => handleSaveEdit(editingItem) : handleAddMapping}
                                disabled={loading}
                            >
                                {hasNewRow ? <Save size={18} /> : <Plus size={18} />}
                                <span>{hasNewRow ? 'Save Mapping' : 'Add Mapping'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

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

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .help-modal-scroll::-webkit-scrollbar { width: 4px; }
                .help-modal-scroll::-webkit-scrollbar-track { background: transparent; margin: 8px 0; }
                .help-modal-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                .help-modal-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}</style>
        </>
    );
};

export default ProcessStreamBusinessLinesMapping;

