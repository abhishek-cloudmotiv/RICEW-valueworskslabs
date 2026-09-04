import React, { useState, useEffect, useRef } from 'react';
import { TextField } from '@mui/material';
import { ChevronDown } from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import { useAuth } from '../../context/AuthContext';

// Common Autocomplete component that implements the full logic from Resource Roster Form
export const CustomAutocomplete = ({ value, onChange, options, placeholder, error, width = '100%', disabled = false }) => {
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
    const previousInputValRef = useRef('');
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
    // Handle value prop changes
    useEffect(() => {
        // If the new value prop is DIFFERENT from what we just selected (previousValueRef),
        // we should update the input, even if isExternalChangeRef is true.
        // This handles cases like selecting "Create New Project" -> Parent sets value to "24-001-03"
        const valueMismatch = isExternalChangeRef.current && value !== previousValueRef.current;

        if ((!isUserEditingRef.current && !isExternalChangeRef.current) || valueMismatch) {
            const matchingOption = options.find(opt => opt.value === value);
            const displayText = matchingOption
                ? (matchingOption.displayValue !== undefined ? matchingOption.displayValue : matchingOption.label)
                : (value || '');
            setInputVal(displayText);
        }

        if (isExternalChangeRef.current) {
            isExternalChangeRef.current = false;
        }
    }, [value, options]);

    // Global listeners for outside click and tab detection
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
            // Use displayValue if available, otherwise use label
            const displayText = matchingOption
                ? (matchingOption.displayValue !== undefined ? matchingOption.displayValue : matchingOption.label)
                : (previousValueRef.current || '');
            setInputVal(displayText);
        }
        setIsOpen(false);
        setHighlightedIndex(-1);
        isUserEditingRef.current = false;
    };

    const openDropdown = () => {
        if (disabled) return;
        previousValueRef.current = value;
        const matchingOption = options.find(opt => opt.value === value);
        // Use displayValue if available, otherwise use label
        previousInputValRef.current = matchingOption
            ? (matchingOption.displayValue !== undefined ? matchingOption.displayValue : matchingOption.label)
            : (value || '');
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
        // Use displayValue if available, otherwise use label
        const displayLabel = selectedOption
            ? (selectedOption.displayValue !== undefined ? selectedOption.displayValue : selectedOption.label)
            : optionValue;

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
            if (inputRef.current) inputRef.current.blur();
            isSelectingRef.current = false;
        }, 50);
    };

    const filteredOptions = inputVal.trim() === ''
        ? options
        : options.filter(option =>
            option.label.toLowerCase().includes(inputVal.toLowerCase()) ||
            option.value.toLowerCase().includes(inputVal.toLowerCase()) ||
            (option.sublabel && option.sublabel.toLowerCase().includes(inputVal.toLowerCase()))
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
                                    if (option.disabled) return;
                                    handleSelectOption(option.value);
                                }}
                                onMouseEnter={() => !option.disabled && setHighlightedIndex(index)}
                                style={{
                                    padding: '10px 12px',
                                    cursor: option.disabled ? 'default' : 'pointer',
                                    backgroundColor: index === highlightedIndex ? '#cce5ff' : (option.value === value ? '#e3f2fd' : 'white'),
                                    color: option.disabled ? '#999' : 'inherit',
                                    fontSize: '13px',
                                    transition: 'background-color 0.2s',
                                    borderBottom: '1px solid #f0f0f0',
                                    fontStyle: option.disabled ? 'italic' : 'normal'
                                }}
                            >
                                {option.sublabel !== undefined ? (
                                    <div>
                                        <div style={{ fontWeight: '500', color: '#222', fontSize: '13px' }}>{option.label}</div>
                                        <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{option.sublabel}</div>
                                    </div>
                                ) : option.label}
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
};

// Subscription License Autocomplete
export const SubscriptionLicenseAutocomplete = (props) => {
    const options = [
        { value: 'Standard Edition - LIC1001', label: 'Standard Edition - LIC1001' },
        { value: 'Enterprise Edition - LIC1002', label: 'Enterprise Edition - LIC1002' },
        { value: 'Premium Plus - LIC1003', label: 'Premium Plus - LIC1003' },
        { value: 'Developer Pro - LIC1004', label: 'Developer Pro - LIC1004' },
        { value: 'Unlimited License - LIC1005', label: 'Unlimited License - LIC1005' },
        { value: 'Academic Edition - LIC1006', label: 'Academic Edition - LIC1006' }
    ];
    return <CustomAutocomplete {...props} options={options} placeholder="Select Subscription License..." />;
};

// Project Type Autocomplete
export const ProjectTypeAutocomplete = (props) => {
    const options = [
        { value: 'Implementation', label: 'Implementation' },
        { value: 'Upgrade', label: 'Upgrade' },
        { value: 'Migration', label: 'Migration' },
        { value: 'Support', label: 'Support' }
    ];
    return <CustomAutocomplete {...props} options={options} placeholder="Select Project Type..." />;
};

// Deployment Model Autocomplete
export const DeploymentModelAutocomplete = (props) => {
    const options = [
        { value: 'On-Premise', label: 'On-Premise' },
        { value: 'Cloud', label: 'Cloud' },
        { value: 'Hybrid', label: 'Hybrid' }
    ];
    return <CustomAutocomplete {...props} options={options} placeholder="Select Deployment Model..." />;
};

// Parent Project ID Autocomplete
export const parentProjectData = [
    { value: 'PRJ-24-001-01', label: 'PRJ-24-001-01', name: 'Global ERP Rollout', description: 'Core ERP implementation for global manufacturing sites.' },
    { value: 'PRJ-24-002-05', label: 'PRJ-24-002-05', name: 'HR Digital Transformation', description: 'Upgrading legacy HR systems to cloud-based platforms.' },
    { value: 'PRJ-25-010-02', label: 'PRJ-25-010-02', name: 'Supply Chain Optimization', description: 'Implementing AI-driven supply chain planning tools.' },
    { value: 'PRJ-25-015-08', label: 'PRJ-25-015-08', name: 'Customer Experience Portal', description: 'Developing a new customer-facing sales and support portal.' }
];

export const ParentProjectIdAutocomplete = (props) => {
    // If options are passed as props, use them; otherwise fallback to static data
    const displayOptions = props.options || parentProjectData;
    return <CustomAutocomplete {...props} options={displayOptions} placeholder="Select Parent Project ID..." />;
};
export const PrimaryCountryAutocomplete = ({ projectId, ...props }) => {
    const [options, setOptions] = useState([]);
    const { handleAuthError } = useSession();
    const { getCachedToken } = useAuth();

    useEffect(() => {
        const abortController = new AbortController();
        const fetchCountries = async () => {
            if (!projectId || projectId === 'System Generated') {
                setOptions([]);
                return;
            }

            try {
                const idToken = await getCachedToken();
                if (!idToken) {
                    handleAuthError('Authentication required');
                    return;
                }

                const response = await fetch(`https://ec2450jptj.execute-api.ap-south-1.amazonaws.com/New/rice/get/activeCountries?project_id=${encodeURIComponent(projectId)}`, {
                    headers: {
                        'Authorization': `Bearer ${idToken}`
                    },
                    signal: abortController.signal
                });

                if (response.status === 401 || response.status === 403) {
                    handleAuthError();
                    return;
                }

                if (response.ok) {
                    const result = await response.json();
                    const countriesArray = Array.isArray(result) ? result : (result.data || []);

                    const mappedOptions = countriesArray
                        .map(c => {
                            const name = c.Country_Name?.S || c.Country_Name || c['Country/Region'] || '';
                            const active = c.Active?.S || c.Active || 'No';
                            return { label: name, value: name, active: active };
                        })
                        .filter(c => c.label && (c.active === 'Yes' || c.active === 'Active'))
                        .sort((a, b) => a.label.localeCompare(b.label));

                    setOptions(mappedOptions);

                    if (mappedOptions.length === 1 && !props.value) {
                        if (props.onChange) {
                            props.onChange(mappedOptions[0].value);
                        }
                    }
                }
            } catch (error) {
                if (error.name === 'AbortError') return;
                console.error('Error fetching countries:', error);
                handleAuthError(error.message);
            }
        };

        fetchCountries();
        return () => abortController.abort();
    }, [projectId, handleAuthError, getCachedToken]);

    return (
        <CustomAutocomplete
            {...props}
            options={options}
            placeholder={!projectId || projectId === 'System Generated' ? "Select Project ID first" : "Select Primary Country..."}
            disabled={props.disabled || !projectId || projectId === 'System Generated'}
        />
    );
};
