import React, { useState, useEffect, useRef } from 'react';
import { TextField } from '@mui/material';
import { ChevronDown } from 'lucide-react';
import { getIdToken } from '../../../utils/cognito-auth';

// Resource Autocomplete Component for Client Roster Assignment
export const ClientResourceAutocomplete = ({
    value,
    emailValue = "",
    onChange,
    projectId,
    error = false,
    placeholder = "Select Client...",
    options: externalOptions,
    onDropdownStateChange
}) => {
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);

    const [isOpen, setIsOpen] = useState(false);
    const [inputVal, setInputVal] = useState(value || '');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [dropdownStyle, setDropdownStyle] = useState({});
    const autocompleteRef = useRef(null);
    const inputRef = useRef(null);
    const listRef = useRef(null);

    const isExternalChangeRef = useRef(false);
    const isUserEditingRef = useRef(false);
    const isSelectingRef = useRef(false);
    const isShiftTabRef = useRef(false);
    const isTabRef = useRef(false);

    const previousValueRef = useRef(value);
    const previousEmailRef = useRef(emailValue);
    const previousDisplayNameRef = useRef('');
    const previousInputValRef = useRef(value || '');
    const isOpenRef = useRef(false);
    const onChangeRef = useRef(onChange);
    const selectionMadeRef = useRef(false);

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

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

    // Fetch roster data from API or use external options
    useEffect(() => {
        const fetchRosterData = async () => {
            // If external options are provided, use them and skip fetch
            if (externalOptions) {
                setOptions(externalOptions);
                setLoading(false);

                if (!isUserEditingRef.current) {
                    const matchingOption = externalOptions.find(opt => opt.value === value);
                    setInputVal(matchingOption ? matchingOption.label : (value || ''));
                }
                return;
            }

            if (!projectId) return;

            try {
                setLoading(true);
                setLoadError(null);

                const idToken = await getIdToken();
                const headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                };

                const response = await fetch(`https://07eirxky2f.execute-api.ap-south-1.amazonaws.com/New/api/ClientRosterForm/getAll?project_id=${projectId}`, {
                    headers: headers
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();

                if (result.success && result.data) {
                    // Map API data to options using Client_Roster_Form_id as unique value
                    const transformedOptions = result.data.map(item => ({
                        id: item.Client_Roster_Form_id || '',
                        value: item.Client_Roster_Form_id || '',
                        label: item.Client_name || '',
                        displayName: item.Client_name || '',
                        email: item.Email_Address || item.Email || '',
                        userId: item.Client_user_id || item.user_id || ''
                    })).filter(opt => opt.label !== '');

                    // Sort by label (name)
                    transformedOptions.sort((a, b) => a.label.localeCompare(b.label));

                    setOptions(transformedOptions);

                    if (!isUserEditingRef.current) {
                        const matchingOption = transformedOptions.find(opt => opt.value === value);
                        setInputVal(matchingOption ? matchingOption.label : (value || ''));
                    }
                }
            } catch (error) {
                console.error('Error fetching roster data:', error);
                setLoadError(error.message);
                setOptions([]);
            } finally {
                setLoading(false);
            }
        };

        fetchRosterData();
    }, [projectId, externalOptions]);

    useEffect(() => {
        if (!isUserEditingRef.current && !isExternalChangeRef.current) {
            const matchingOption = options.find(opt => opt.value === value);
            setInputVal(matchingOption ? matchingOption.label : (value || ''));
        }
        if (isExternalChangeRef.current) {
            isExternalChangeRef.current = false;
        }
    }, [value, options]);

    // Auto-scroll when dropdown opens
    useEffect(() => {
        if (isOpen && autocompleteRef.current) {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    if (!autocompleteRef.current) return;

                    const rect = autocompleteRef.current.getBoundingClientRect();
                    const dropdownHeight = 200; 
                    const dropdownBottom = rect.bottom + 4 + dropdownHeight;
                    const viewportHeight = window.innerHeight;

                    if (dropdownBottom > viewportHeight) {
                        const neededSpace = dropdownBottom - viewportHeight + 40;
                        window.scrollBy({
                            top: neededSpace,
                            behavior: 'smooth'
                        });
                    }
                });
            });
        }
    }, [isOpen]);

    const handleCloseDropdown = (wasSelectionMade = false) => {
        if (!isOpenRef.current) return;

        if (selectionMadeRef.current) {
            selectionMadeRef.current = false;
            setIsOpen(false);
            setHighlightedIndex(-1);
            isUserEditingRef.current = false;
            if (onDropdownStateChange) onDropdownStateChange(false);
            return;
        }

        if (!wasSelectionMade && previousValueRef.current !== undefined) {
            if (value !== previousValueRef.current || emailValue !== previousEmailRef.current) {
                onChangeRef.current(previousValueRef.current, previousDisplayNameRef.current, previousEmailRef.current, options.find(opt => opt.value === previousValueRef.current)?.userId || '');
            }
            setInputVal(previousInputValRef.current);
        }
        setIsOpen(false);
        setHighlightedIndex(-1);
        isUserEditingRef.current = false;
        if (onDropdownStateChange) onDropdownStateChange(false);
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
                setTimeout(() => { isShiftTabRef.current = false; }, 100);
            } else if (event.key === 'Tab' && !event.shiftKey) {
                isTabRef.current = true;
                setTimeout(() => { isTabRef.current = false; }, 100);
            }
        };

        const handleScrollOrResize = () => {
            if (isOpen) {
                updateDropdownPosition();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleGlobalKeyDown);
        window.addEventListener('scroll', handleScrollOrResize, true);
        window.addEventListener('resize', handleScrollOrResize);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleGlobalKeyDown);
            window.removeEventListener('scroll', handleScrollOrResize, true);
            window.removeEventListener('resize', handleScrollOrResize);
        };
    }, [isOpen]);

    const updateDropdownPosition = () => {
        if (autocompleteRef.current) {
            const rect = autocompleteRef.current.getBoundingClientRect();
            setDropdownStyle({
                position: 'fixed',
                top: `${rect.bottom + 4}px`,
                left: `${rect.left}px`,
                width: `${rect.width}px`
            });
        }
    };

    const openDropdown = () => {
        previousValueRef.current = value;
        previousEmailRef.current = emailValue;
        const matchingOption = options.find(opt => opt.value === value);
        previousInputValRef.current = matchingOption ? matchingOption.label : (value || '');
        previousDisplayNameRef.current = matchingOption ? matchingOption.displayName : '';
        selectionMadeRef.current = false;

        setInputVal('');
        updateDropdownPosition();
        setIsOpen(true);
        if (onDropdownStateChange) onDropdownStateChange(true);

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
        if (!isOpen) {
            setIsOpen(true);
            if (onDropdownStateChange) onDropdownStateChange(true);
        }
        setHighlightedIndex(-1);
        isUserEditingRef.current = true;

        const matchingOption = options.find(opt =>
            opt.label.toLowerCase() === val.toLowerCase() ||
            opt.displayName.toLowerCase() === val.toLowerCase()
        );

        if (matchingOption) {
            onChangeRef.current(matchingOption.value, matchingOption.displayName || matchingOption.label || '', matchingOption.email || '', matchingOption.userId || '');
        } else if (val === '' || val.trim() === '') {
            onChangeRef.current('', '', '', '');
        } else {
            onChangeRef.current(val, val, '', '');
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

        if (e.key === 'Tab') {
            if (isOpen) {
                handleCloseDropdown(false);
            }
            return;
        }

        if (!isOpen) return;

        if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
                handleSelectOption(filteredOptions[highlightedIndex]);
            } else {
                handleCloseDropdown(false);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            handleCloseDropdown(false);
        }
    };

    const handleSelectOption = (option) => {
        selectionMadeRef.current = true;
        isSelectingRef.current = true;
        isExternalChangeRef.current = true;

        previousValueRef.current = option.value;
        previousInputValRef.current = option.label;

        onChangeRef.current(option.value, option.displayName || option.label || '', option.email || '', option.userId || '');
        setInputVal(option.label);
        setIsOpen(false);
        if (onDropdownStateChange) onDropdownStateChange(false);
        setHighlightedIndex(-1);
        isUserEditingRef.current = false;

        setTimeout(() => {
            if (inputRef.current) inputRef.current.blur();
            isSelectingRef.current = false;
        }, 50);
    };

    const normalizedInput = inputVal.toLowerCase();
    const filteredOptions = normalizedInput.length === 0
        ? options
        : options.filter(option =>
            option.label.toLowerCase().includes(normalizedInput) ||
            option.email.toLowerCase().includes(normalizedInput)
        );

    return (
        <div
            style={{ position: 'relative', width: '220px', overflow: 'visible' }}
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
                        if (!isShiftTabRef.current) openDropdown();
                    }}
                    onBlur={() => {
                        setTimeout(() => {
                            const activeElement = document.activeElement;
                            const isFocusInDropdown = activeElement && autocompleteRef.current?.contains(activeElement);
                            if (isSelectingRef.current || isFocusInDropdown) return;
                            handleCloseDropdown(false);
                        }, 150);
                    }}
                    placeholder={loading ? 'Loading...' : loadError ? 'Error loading' : placeholder}
                    size="small"
                    error={error}
                    sx={{
                        width: '220px',
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
                            '& fieldset': { borderColor: '#ddd', borderRadius: '3px' },
                            '&:hover fieldset': { borderColor: '#ddd' },
                            '&.Mui-focused fieldset': { borderColor: '#007bff', borderWidth: '1px' },
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
                        zIndex: 2
                    }}
                    onClick={() => {
                        if (!isOpen) openDropdown();
                        else handleCloseDropdown(false);
                    }}
                />
            </div>

            {isOpen && (
                <div
                    ref={listRef}
                    style={{
                        ...dropdownStyle,
                        backgroundColor: 'white',
                        border: '1px solid #ddd',
                        borderRadius: '0 0 4px 4px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        zIndex: 10000,
                        maxHeight: '200px',
                        overflowY: 'auto'
                    }}
                >
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((option, index) => (
                            <div
                                key={`${option.value}-${index}`}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleSelectOption(option);
                                }}
                                style={{
                                    padding: '8px 12px',
                                    cursor: 'pointer',
                                    backgroundColor: index === highlightedIndex ? '#cce5ff' : (option.value === value ? '#e3f2fd' : 'white'),
                                    borderBottom: '1px solid #f0f0f0',
                                    fontSize: '12px',
                                    transition: 'background-color 0.2s',
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}
                                onMouseEnter={() => setHighlightedIndex(index)}
                            >
                                <span style={{ fontWeight: '500' }}>{option.label}</span>
                                <span style={{ fontSize: '11px', color: '#666' }}>{option.email}</span>
                            </div>
                        ))
                    ) : (
                        <div style={{ padding: '12px', fontSize: '12px', color: '#999', textAlign: 'center' }}>
                            {inputVal ? 'No matches found' : 'Start typing...'}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
