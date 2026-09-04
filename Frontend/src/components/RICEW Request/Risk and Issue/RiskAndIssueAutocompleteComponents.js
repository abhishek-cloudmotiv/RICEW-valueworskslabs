import React, { useState, useEffect, useRef } from 'react';
import { TextField } from '@mui/material';
import { ChevronDown, Search, X } from 'lucide-react';

const BaseAutocomplete = ({
    value,
    onChange,
    options = [],
    error = false,
    width = '100%',
    disabled = false,
    readonly = false,
    placeholder = "Select from list...",
    showSearchIcon = false,
    subLabelColor = '#666',
    includeSubLabelInInput = false,
    dropUp = false,
    allowFreeText = false
}) => {
    const getInitialValue = () => {
        if (!value) return '';
        const matchingOption = options.find(opt => opt.value === value);
        if (matchingOption) {
            return includeSubLabelInInput && matchingOption.subLabel 
                ? matchingOption.subLabel 
                : matchingOption.label;
        }
        return value;
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
    const previousValueRef = useRef(value);
    const previousInputValRef = useRef(inputVal);
    const selectionMadeRef = useRef(false);
    const onChangeRef = useRef(onChange);
    const isOpenRef = useRef(false);

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        isOpenRef.current = isOpen;
    }, [isOpen]);

    useEffect(() => {
        if (!isUserEditingRef.current && !isExternalChangeRef.current) {
            const matchingOption = value ? options.find(opt => opt.value === value) : null;
            let newInputVal = matchingOption ? matchingOption.label : (value || '');
            if (matchingOption && includeSubLabelInInput && matchingOption.subLabel) {
                newInputVal = matchingOption.subLabel;
            }
            setInputVal(newInputVal);
        }
        if (isExternalChangeRef.current) {
            isExternalChangeRef.current = false;
        }
    }, [value, options]);

    useEffect(() => {
        if (isOpen && highlightedIndex >= 0 && listRef.current) {
            const listElement = listRef.current;
            const highlightedElement = listElement.children[highlightedIndex];
            if (highlightedElement) {
                highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
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
            // When allowFreeText is enabled and user typed something, accept it
            if (allowFreeText && inputVal.trim() !== '') {
                onChangeRef.current(inputVal);
                previousValueRef.current = inputVal;
                previousInputValRef.current = inputVal;
            } else {
                onChangeRef.current(previousValueRef.current);
                setInputVal(previousInputValRef.current);
            }
        }
        setIsOpen(false);
        setHighlightedIndex(-1);
        isUserEditingRef.current = false;
    };

    const handleCloseDropdownRef = useRef();

    useEffect(() => {
        handleCloseDropdownRef.current = handleCloseDropdown;
    });

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isOpenRef.current && autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
                if (handleCloseDropdownRef.current) {
                    handleCloseDropdownRef.current(false);
                }
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
        setInputVal(''); // clear input to show all options initially
        setIsOpen(true);
        setHighlightedIndex(-1);
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        const capitalizedVal = val.length > 0 ? val.charAt(0).toUpperCase() + val.slice(1) : val;
        setInputVal(capitalizedVal);
        setIsOpen(true);
        setHighlightedIndex(-1);
        isUserEditingRef.current = true;

        // For free text handling where options is [], immediately let it pass as value
        if (options.length === 0) {
            onChangeRef.current(capitalizedVal);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Tab') {
            if (isOpen) handleCloseDropdown(false);
            return;
        }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            e.stopPropagation();
            if (!isOpen) {
                openDropdown();
                setHighlightedIndex(0);
                return;
            }
            if (e.key === 'ArrowDown') {
                setHighlightedIndex(prev => prev < filteredOptions.length - 1 ? prev + 1 : 0);
            } else if (e.key === 'ArrowUp') {
                setHighlightedIndex(prev => prev > 0 ? prev - 1 : filteredOptions.length - 1);
            }
            return;
        }
        if (!isOpen) return;
        if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
                handleSelectOption(filteredOptions[highlightedIndex].value);
            } else if (options.length === 0 || allowFreeText) {
                handleSelectOption(inputVal); // Save custom typing for generic inputs
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
        let displayLabel = selectedOption ? selectedOption.label : optionValue;
        if (selectedOption && includeSubLabelInInput && selectedOption.subLabel) {
            displayLabel = selectedOption.subLabel;
        }

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

    const normalizedInput = inputVal.toLowerCase().replace(/^\+/, '');
    const filteredOptions = normalizedInput.length === 0
        ? options
        : options.filter(option => {
            const normalizedLabel = option.label.toLowerCase().replace(/^\+/, '');
            return normalizedLabel.startsWith(normalizedInput);
        });

    return (
        <div style={{ position: 'relative', width: width, overflow: 'visible' }} ref={autocompleteRef}>
            <div style={{ position: 'relative', overflow: 'visible' }}>
                <TextField
                    inputRef={inputRef}
                    value={inputVal}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    autoComplete="off"
                    InputProps={{ readOnly: disabled || readonly }}
                    onFocus={() => {
                        if (!disabled && !readonly && !isShiftTabRef.current) {
                            if (options.length > 0) openDropdown();
                        }
                    }}
                    onBlur={() => {
                        setTimeout(() => {
                            const activeElement = document.activeElement;
                            const isFocusInDropdown = activeElement && autocompleteRef.current?.contains(activeElement);
                            if (isSelectingRef.current || isFocusInDropdown) return;

                            // Check if exact match required
                            if (options.length > 0) {
                                const isValidOption = options.some(opt => opt.label === inputVal || opt.value === inputVal);
                                if (!isValidOption && inputVal.trim() !== '') {
                                    if (allowFreeText) {
                                        // Accept custom text entry
                                        onChangeRef.current(inputVal);
                                        previousValueRef.current = inputVal;
                                        previousInputValRef.current = inputVal;
                                        selectionMadeRef.current = true;
                                        setIsOpen(false);
                                        setHighlightedIndex(-1);
                                        isUserEditingRef.current = false;
                                    } else {
                                        // Invalid generic user typing for controlled dropdown, reset
                                        handleCloseDropdown(false);
                                    }
                                } else {
                                    handleCloseDropdown(false);
                                }
                            } else {
                                // free text
                                setIsOpen(false);
                            }
                        }, 150);
                    }}
                    placeholder={placeholder}
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
                            padding: showSearchIcon ? '6px 30px 6px 28px' : '6px 30px 6px 10px',
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
                {showSearchIcon && (
                    <Search
                        size={14}
                        style={{
                            position: 'absolute',
                            left: '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#999',
                            pointerEvents: 'none',
                            zIndex: 2
                        }}
                    />
                )}
                {!disabled && !readonly && options.length > 0 && (
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
                            if (!isOpen) openDropdown();
                            else handleCloseDropdown(false);
                        }}
                    />
                )}
            </div>

            {isOpen && options.length > 0 && (
                <div
                    ref={listRef}
                    style={{
                        ...(dropUp ? {
                            position: 'fixed',
                            top: autocompleteRef.current ? (autocompleteRef.current.getBoundingClientRect().bottom + 4) + 'px' : 'auto',
                            left: autocompleteRef.current ? autocompleteRef.current.getBoundingClientRect().left + 'px' : 0,
                            width: autocompleteRef.current ? autocompleteRef.current.getBoundingClientRect().width + 'px' : width,
                        } : {
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            width: width,
                        }),
                        backgroundColor: 'white',
                        border: '1px solid #ddd',
                        ...(dropUp ? { borderTop: 'none', borderRadius: '0 0 4px 4px' } : { borderTop: 'none', borderRadius: '0 0 4px 4px' }),
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        zIndex: 9999,
                        maxHeight: '240px',
                        overflowY: 'auto',
                        ...(dropUp ? { marginBottom: '0px' } : { marginTop: '4px' })
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
                                    if (index !== highlightedIndex) e.currentTarget.style.backgroundColor = '#cce5ff';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = index === highlightedIndex ? '#cce5ff' : (option.value === previousValueRef.current ? '#e3f2fd' : 'white');
                                }}
                                title={option.label}
                            >
                                {showSearchIcon ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <span style={{ fontWeight: '600', color: '#1f2937' }}>{option.label}</span>
                                        {option.subLabel && (
                                            <span style={{
                                                color: subLabelColor,
                                                fontSize: '11px',
                                                lineHeight: '1.2'
                                            }}>
                                                {option.subLabel}
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    option.label
                                )}
                            </div>
                        ))
                    ) : (
                        <div style={{ padding: '12px', fontSize: '13px', color: '#999', textAlign: 'center' }}>
                            {inputVal ? 'No matching options found' : 'Start typing to search...'}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export const RecordTypeAutocomplete = (props) => (
    <BaseAutocomplete {...props} options={[
        { label: 'Risk', value: 'Risk' },
        { label: 'Issue', value: 'Issue' },
    ]} />
);

export const WorkstreamAutocomplete = (props) => (
    <BaseAutocomplete
        options={[
            'Enterprise Resource Planning (ERP)',
            'Supply Chain & Manufacturing (SCM)',
            'Human Capital Management (HCM)',
            'Customer Experience (CX)',
            'Fusion Analytics (FAN)'
        ].map(o => ({ label: o, value: o }))}
        {...props}
    />
);

export const ApplicationAutocomplete = (props) => (
    <BaseAutocomplete
        options={['Procurement', 'Financials', 'Supply Chain Management', 'Project Management'].map(o => ({ label: o, value: o }))}
        {...props}
    />
);

/**
 * BaseMultiSelectAutocomplete Component
 * Handles selection of multiple values from a dropdown list.
 */
const BaseMultiSelectAutocomplete = ({ value = [], onChange, label, options, placeholder, minWidth = "100px", flex = 1, style = {}, disabled = false }) => {
    const selectedValues = Array.isArray(value) ? value : [];
    const [isOpen, setIsOpen] = useState(false);
    const [inputVal, setInputVal] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const autocompleteRef = useRef(null);
    const inputRef = useRef(null);
    const listRef = useRef(null);

    const isSelectingRef = useRef(false);
    const isShiftTabRef = useRef(false);
    const isTabRef = useRef(false);
    const isOpenRef = useRef(false);

    useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isOpenRef.current && autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
                setIsOpen(false);
                isSelectingRef.current = false;
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
        document.addEventListener('keydown', handleGlobalKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleGlobalKeyDown);
        };
    }, []);

    const handleInputChange = (e) => {
        const val = e.target.value;
        const capitalizedVal = val.length > 0 ? val.charAt(0).toUpperCase() + val.slice(1) : val;
        setInputVal(capitalizedVal);
        setIsOpen(true);
        setHighlightedIndex(-1);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (!isOpen) {
                setIsOpen(true);
                setHighlightedIndex(0);
                return;
            }
            if (e.key === 'ArrowDown') {
                setHighlightedIndex(prev => prev < filteredOptions.length - 1 ? prev + 1 : 0);
            } else if (e.key === 'ArrowUp') {
                setHighlightedIndex(prev => prev > 0 ? prev - 1 : filteredOptions.length - 1);
            }
            return;
        }
        if (!isOpen) return;
        if (e.key === 'Enter') {
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

        isSelectingRef.current = true;
        onChange(newSelectedValues);
        setInputVal('');
        setHighlightedIndex(-1);

        setTimeout(() => {
            isSelectingRef.current = false;
        }, 200);
    };

    const removeSelection = (optionValue) => {
        const newSelectedValues = selectedValues.filter(v => v !== optionValue);
        onChange(newSelectedValues);
    };

    const normalizedInput = inputVal.toLowerCase().replace(/^\+/, '');
    const filteredOptions = normalizedInput.length === 0
        ? options.filter(option => !selectedValues.includes(option.value))
        : options.filter(option => {
            const normalizedLabel = option.label.toLowerCase().replace(/^\+/, '');
            return normalizedLabel.startsWith(normalizedInput) && !selectedValues.includes(option.value);
        });

    return (
        <div style={{ position: 'relative', width: '100%', overflow: 'visible' }} ref={autocompleteRef}>
            <div
                style={{
                    minHeight: '32px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: disabled ? '#f5f5f5' : 'white',
                    padding: '4px 30px 4px 8px',
                    cursor: disabled ? 'not-allowed' : 'text',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    color: disabled ? '#666' : '#333'
                }}
                onClick={() => {
                    if (disabled) return;
                    setIsOpen(true);
                    if (inputRef.current) inputRef.current.focus();
                }}
            >
                {selectedValues.map(val => {
                    const opt = options.find(o => o.value === val);
                    const displayLabel = opt ? opt.label : val;
                    return (
                        <span
                            key={val}
                            style={{
                                backgroundColor: '#dee2e6',
                                color: 'black',
                                padding: '1px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            {displayLabel}
                            <X
                                size={12}
                                style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (disabled) return;
                                    removeSelection(val);
                                }}
                            />
                        </span>
                    );
                })}
                <input
                    ref={inputRef}
                    value={inputVal}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={selectedValues.length === 0 ? placeholder || "Select..." : ""}
                    onFocus={() => {
                        if (!disabled && !isShiftTabRef.current && !isTabRef.current) {
                            setIsOpen(true);
                        }
                    }}
                    disabled={disabled}
                    onBlur={() => {
                        setTimeout(() => {
                            const activeElement = document.activeElement;
                            const isFocusInDropdown = activeElement && autocompleteRef.current?.contains(activeElement);
                            if (isSelectingRef.current || isFocusInDropdown) return;
                            setIsOpen(false);
                        }, 150);
                    }}
                    style={{
                        border: 'none',
                        outline: 'none',
                        fontSize: '13px',
                        flex: '1',
                        minWidth: '30px',
                        background: 'transparent',
                        padding: '2px 0'
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
                        cursor: disabled ? 'not-allowed' : 'pointer'
                    }}
                />
            </div>
            {isOpen && !disabled && (
                <div
                    ref={listRef}
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        width: '100%',
                        backgroundColor: 'white',
                        border: '1px solid #ddd',
                        borderTop: 'none',
                        borderRadius: '0 0 4px 4px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        zIndex: 1000,
                        maxHeight: '200px',
                        overflowY: 'auto',
                        marginTop: '2px'
                    }}
                >
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((opt, i) => (
                            <div
                                key={i}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    toggleSelection(opt.value);
                                }}
                                style={{
                                    padding: '8px 12px',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    background: highlightedIndex === i ? '#f0f7ff' : 'white',
                                    borderBottom: i !== filteredOptions.length - 1 ? '1px solid #f3f4f6' : 'none'
                                }}
                                onMouseEnter={() => setHighlightedIndex(i)}
                            >
                                {opt.label}
                            </div>
                        ))
                    ) : (
                        <div style={{ padding: '10px', fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>
                            No results found
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export const ModuleAutocomplete = (props) => (
    <BaseMultiSelectAutocomplete
        {...props}
        options={props.options || []}
    />
);


export const ProjectPhaseAutocomplete = (props) => (
    <BaseAutocomplete {...props} showSearchIcon={true} />
);

export const CategoryAutocomplete = (props) => (
    <BaseAutocomplete {...props} showSearchIcon={true} />
);

export const SubCategoryAutocomplete = (props) => (
    <BaseAutocomplete {...props} showSearchIcon={true} />
);

export const RicewIdAutocomplete = (props) => (
    <BaseAutocomplete {...props} showSearchIcon={true} />
);

export const SeverityAutocomplete = (props) => (
    <BaseAutocomplete {...props} />
);

export const WaveRolloutAutocomplete = (props) => (
    <BaseAutocomplete {...props} showSearchIcon={true} />
);

export const GoLiveImpactAutocomplete = (props) => (
    <BaseAutocomplete {...props} options={['Yes', 'No'].map(o => ({ label: o, value: o }))} />
);

export const EnvironmentAutocomplete = (props) => (
    <BaseAutocomplete {...props} showSearchIcon={true} />
);

export const RiskIssueStatusAutocomplete = (props) => (
    <BaseAutocomplete {...props} />
);

export const EscalationRequiredAutocomplete = (props) => (
    <BaseAutocomplete {...props} options={[
        { label: 'Yes', value: 'Yes' },
        { label: 'No', value: 'No' },
    ]} />
);

export const GenericUserAutocomplete = ({ placeholder, options = [], dropUp = false, includeSubLabelInInput = true, allowFreeText = false, ...props }) => (
    <BaseAutocomplete {...props} options={options} placeholder={placeholder || "Search..."} showSearchIcon={true} includeSubLabelInInput={includeSubLabelInInput} dropUp={dropUp} allowFreeText={allowFreeText} />
);

export const OwnerTypeAutocomplete = (props) => (
    <BaseAutocomplete {...props} options={[
        { label: 'Implementation Team', value: 'Implementation Roster' },
        { label: 'Client Team', value: 'Client Roster' },
    ]} />
);
