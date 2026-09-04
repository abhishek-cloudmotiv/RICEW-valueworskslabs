import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import DOMPurify from 'dompurify';

/**
 * StandardAutocomplete Component
 * A high-density, searchable dropdown component used specifically for the Change Request Form.
 */
export const StandardAutocomplete = ({
    value,
    options = [],
    onChange,
    placeholder = "Search...",
    label,
    minWidth = "160px",
    flex = 1,
    isMulti = false,
    disabled = false,
    required = false,
    showSearch = true,
    style = {},
    error
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt => {
        const labelStr = typeof opt === 'string' ? opt : (opt.name || opt.label || '');
        return labelStr.toLowerCase().includes(search.toLowerCase());
    });

    const handleSelect = (opt) => {
        const optValue = typeof opt === 'string' ? opt : (opt.name || opt.label || opt);

        if (isMulti) {
            const current = Array.isArray(value) ? value : [];
            const newValue = current.includes(optValue)
                ? current.filter(v => v !== optValue)
                : [...current, optValue];
            onChange(newValue);
        } else {
            onChange(optValue);
            setIsOpen(false);
            setSearch('');
        }
    };

    const displayValue = isMulti
        ? (Array.isArray(value) && value.length > 0 ? value.join(', ') : '')
        : value;

    return (
        <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            padding: '10px 12px',
            flex: flex,
            minWidth: 0,
            borderRight: '1px solid #ddd',
            position: 'relative',
            ...style
        }} ref={containerRef}>
            {label && (
                <span style={{
                    minWidth: minWidth,
                    maxWidth: minWidth,
                    fontWeight: 'bold',
                    fontSize: '13px',
                    color: '#333',
                    flexShrink: 0,
                    paddingRight: '12px',
                    marginTop: '6px',
                }}>
                    {label} {required && <span style={{ color: 'red' }}>*</span>}
                </span>
            )}

            <div style={{ flex: 1, position: 'relative' }}>
                <div
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '5px 12px',
                        border: `1px solid ${error ? '#dc3545' : '#ddd'}`,
                        borderRadius: '4px',
                        fontSize: '13px',
                        color: displayValue ? '#333' : '#999',
                        background: disabled ? '#f8f9fa' : '#fff',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        minHeight: '31px',
                        width: '100%',
                        boxSizing: 'border-box'
                    }}
                >
                    <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {DOMPurify.sanitize(displayValue || placeholder, { ALLOWED_TAGS: [] })}
                    </div>
                    <ChevronDown size={14} color="#666" style={{ flexShrink: 0 }} />
                </div>
                {error && <div data-error-field="true" style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: '500', lineHeight: '1.3', wordWrap: 'break-word' }}>{error}</div>}

                {isOpen && (
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: '#fff',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        zIndex: 2000,
                        marginTop: '4px',
                        minWidth: '250px'
                    }}>
                        {showSearch && (
                            <div style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                                <div style={{ position: 'relative' }}>
                                    <Search size={14} color="#999" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }} />
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="Search..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '6px 8px 6px 28px',
                                            fontSize: '12px',
                                            border: '1px solid #ddd',
                                            borderRadius: '4px',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((opt, i) => {
                                    const optLabel = typeof opt === 'string' ? opt : (opt.name || opt.label);
                                    const isSelected = isMulti
                                        ? (Array.isArray(value) && value.includes(optLabel))
                                        : value === optLabel;

                                    return (
                                        <div
                                            key={i}
                                            onClick={() => handleSelect(opt)}
                                            style={{
                                                padding: '8px 12px',
                                                fontSize: '13px',
                                                cursor: 'pointer',
                                                background: isSelected ? '#f0f7ff' : '#fff',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                borderBottom: i !== filteredOptions.length - 1 ? '1px solid #f3f4f6' : 'none'
                                            }}
                                            onMouseEnter={(e) => e.target.style.background = '#f8f9fa'}
                                            onMouseLeave={(e) => e.target.style.background = isSelected ? '#f0f7ff' : '#fff'}
                                        >
                                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {typeof opt === 'object' && opt.email ? (
                                                    <div>
                                                        <div style={{ fontWeight: '500' }}>{DOMPurify.sanitize(opt.name || '', { ALLOWED_TAGS: [] })}</div>
                                                        <div style={{ fontSize: '11px', color: '#666' }}>{DOMPurify.sanitize(opt.email || '', { ALLOWED_TAGS: [] })}</div>
                                                    </div>
                                                ) : DOMPurify.sanitize(optLabel || '', { ALLOWED_TAGS: [] })}
                                            </div>
                                            {isSelected && <Check size={14} color="#007bff" />}
                                        </div>
                                    );
                                })
                            ) : (
                                <div style={{ padding: '12px', textAlign: 'center', color: '#999', fontSize: '12px' }}>
                                    No results found
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

/**
 * BaseAutocomplete Component
 * CARBON COPY of NationalityAutocomplete core logic for absolute consistency.
 */
const BaseAutocomplete = ({ value, onChange, label, options, placeholder, minWidth = "160px", flex = 1, style = {}, showSearchIcon = false, disabled = false, required = false, error }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputVal, setInputVal] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const autocompleteRef = useRef(null);
    const inputRef = useRef(null);
    const optionsRef = useRef(null);

    const isUserEditingRef = useRef(false);
    const isSelectingRef = useRef(false);
    const isExternalChangeRef = useRef(false);
    const isShiftTabRef = useRef(false);
    const isTabRef = useRef(false);

    const previousValueRef = useRef(value);
    const previousInputValRef = useRef('');
    const selectionMadeRef = useRef(false);
    const isOpenRef = useRef(false);

    // Store latest onChange in ref to avoid stale closures (matching original pattern)
    const onChangeRef = useRef(onChange);
    useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

    useEffect(() => {
        isOpenRef.current = isOpen;
    }, [isOpen]);

    useEffect(() => {
        if (!isUserEditingRef.current && !isExternalChangeRef.current) {
            const matchingOption = options.find(opt => opt.value === value);
            let displayLabel = matchingOption ? matchingOption.label : (value || '');

            // Special handling for "Name (email)" format to show only Name in the input field
            if (!matchingOption && typeof displayLabel === 'string' && displayLabel.includes('(') && displayLabel.includes(')')) {
                const match = displayLabel.match(/^(.*?)\s*\(/);
                if (match && match[1]) {
                    displayLabel = match[1].trim();
                }
            }

            setInputVal(displayLabel);
        }
        if (isExternalChangeRef.current) {
            isExternalChangeRef.current = false;
        }
    }, [value, options]);

    // Handle smooth scrolling to highlighted item
    useEffect(() => {
        if (isOpen && highlightedIndex >= 0 && optionsRef.current) {
            const highlightedEl = optionsRef.current.children[highlightedIndex];
            if (highlightedEl) {
                highlightedEl.scrollIntoView({
                    block: 'nearest',
                    inline: 'start'
                });
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
        setInputVal(''); // Clear to show all results on focus
        setIsOpen(true);
        setHighlightedIndex(-1); // Match Nationality exact behavior
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        const capitalizedVal = val.charAt(0).toUpperCase() + val.slice(1);
        setInputVal(capitalizedVal);
        setIsOpen(true);
        setHighlightedIndex(-1);
        isUserEditingRef.current = true;

        const matchingOption = options.find(opt =>
            opt.label.toLowerCase() === capitalizedVal.toLowerCase() ||
            String(opt.value).toLowerCase() === capitalizedVal.toLowerCase()
        );

        if (matchingOption) {
            onChangeRef.current(matchingOption.value);
        } else if (capitalizedVal === '' || capitalizedVal.trim() === '') {
            onChangeRef.current('');
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
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

    const normalizedInput = inputVal.toLowerCase();
    const filteredOptions = normalizedInput.length === 0
        ? options
        : options.filter(option => {
            const normalizedLabel = option.label.toLowerCase();
            const normalizedValue = String(option.value).toLowerCase();
            return normalizedLabel.includes(normalizedInput) || normalizedValue.includes(normalizedInput);
        });

    return (
        <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            padding: '10px 12px',
            flex: flex,
            minWidth: 0,
            position: 'relative',
            ...style
        }} ref={autocompleteRef}>
            {label && (
                <span style={{
                    minWidth: minWidth,
                    maxWidth: minWidth,
                    fontWeight: 'bold',
                    fontSize: '13px',
                    color: '#333',
                    flexShrink: 0,
                    paddingRight: '12px',
                    whiteSpace: 'nowrap',
                    marginTop: '6px'
                }}>
                    {label} {required && <span style={{ color: 'red' }}>*</span>}
                </span>
            )}
            <div style={{ flex: 1, position: 'relative' }}>
                <div style={{ position: 'relative' }}>
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputVal}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        autoComplete="off"
                        placeholder={placeholder || "Select..."}
                        onFocus={() => {
                            if (!disabled && !isShiftTabRef.current) {
                                openDropdown();
                            }
                        }}
                        disabled={disabled}
                        onBlur={() => {
                            setTimeout(() => {
                                const activeElement = document.activeElement;
                                const isFocusInDropdown = activeElement && autocompleteRef.current?.contains(activeElement);
                                if (isSelectingRef.current || isFocusInDropdown) {
                                    return;
                                }
                                handleCloseDropdown(false);
                            }, 150);
                        }}
                        style={{
                            width: '100%',
                            padding: '6px 25px 6px 8px',
                            fontSize: '13px',
                            border: `1px solid ${error ? '#dc3545' : '#ddd'}`,
                            borderRadius: '4px',
                            outline: 'none',
                            background: disabled ? '#f5f5f5' : '#fff',
                            boxSizing: 'border-box',
                            fontFamily: 'inherit',
                            cursor: disabled ? 'not-allowed' : 'text',
                            color: disabled ? '#666' : '#333'
                        }}
                    />
                    <ChevronDown
                        size={14}
                        style={{
                            position: 'absolute',
                            right: '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#666',
                            cursor: 'pointer'
                        }}
                        onMouseDown={(e) => {
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
                </div>
                {error && <div data-error-field="true" style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: '500', lineHeight: '1.3', wordWrap: 'break-word' }}>{error}</div>}
                {isOpen && (
                    <div
                        tabIndex={-1} // IMPORTANT: Prevent container from taking tab focus
                        style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            minWidth: '100%',
                            width: 'max-content',
                            maxWidth: '250px',
                            background: '#fff',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            zIndex: 2000,
                            marginTop: '2px',
                            maxHeight: '180px',
                            overflowY: 'auto'
                        }}
                    >
                        <div ref={optionsRef}>
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((opt, i) => (
                                    <div
                                        key={i}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleSelectOption(opt.value);
                                        }}
                                        style={{
                                            padding: '10px 12px',
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            background: highlightedIndex === i ? '#cce5ff' : (opt.value === value ? '#e3f2fd' : 'white'),
                                            borderBottom: i !== filteredOptions.length - 1 ? '1px solid #f3f4f6' : 'none',
                                            transition: 'background-color 0.2s',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}
                                        onMouseEnter={() => {
                                            setHighlightedIndex(i);
                                        }}
                                        onMouseLeave={() => {
                                            if (highlightedIndex === i) {
                                                setHighlightedIndex(-1);
                                            }
                                        }}
                                    >
                                        {showSearchIcon ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ fontWeight: '600', color: '#1f2937' }}>{DOMPurify.sanitize(opt.label || '', { ALLOWED_TAGS: [] })}</span>
                                                {opt.subLabel && (
                                                    <span style={{
                                                        color: '#666',
                                                        fontSize: '11px',
                                                        lineHeight: '1.2'
                                                    }}>
                                                        {DOMPurify.sanitize(opt.subLabel || '', { ALLOWED_TAGS: [] })}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            DOMPurify.sanitize(opt.label || '', { ALLOWED_TAGS: [] })
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div style={{ padding: '12px', fontSize: '11px', color: '#9ca3af', textAlign: 'center' }}>
                                    No results found
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

/**
 * BaseMultiSelectAutocomplete Component
 * CARBON COPY of ModuleMultiSelectAutocomplete logic for absolute parity.
 */
const BaseMultiSelectAutocomplete = ({ value = [], onChange, label, options, placeholder, minWidth = "160px", flex = 1, style = {}, disabled = false, required = false, error }) => {
    // Array of selected values (form state uses arrays for multi-select)
    const selectedValues = Array.isArray(value) ? value : [];

    const [isOpen, setIsOpen] = useState(false);
    const [inputVal, setInputVal] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const autocompleteRef = useRef(null);
    const inputRef = useRef(null);
    const optionsRef = useRef(null);

    const isUserEditingRef = useRef(false);
    const isSelectingRef = useRef(false);
    const isExternalChangeRef = useRef(false);
    const isShiftTabRef = useRef(false);
    const isTabRef = useRef(false);

    const isOpenRef = useRef(false);
    useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);

    // Handle initial value update (matches specific logic of the ref component)
    useEffect(() => {
        if (!isUserEditingRef.current && !isExternalChangeRef.current) {
            setInputVal('');
        }
    }, [value, options]);

    // Handle smooth scrolling to highlighted item during keyboard nav
    useEffect(() => {
        if (isOpen && highlightedIndex >= 0 && optionsRef.current) {
            const highlightedEl = optionsRef.current.children[highlightedIndex];
            if (highlightedEl) {
                highlightedEl.scrollIntoView({
                    block: 'nearest',
                    inline: 'start'
                });
            }
        }
    }, [highlightedIndex, isOpen]);

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
        const capitalizedVal = val.charAt(0).toUpperCase() + val.slice(1);
        setInputVal(capitalizedVal);
        setIsOpen(true);
        setHighlightedIndex(-1);
        isUserEditingRef.current = true;
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
        const opt = options.find(o => o.value === optionValue);
        const optLabel = opt ? opt.label : optionValue;

        const newSelectedValues = selectedValues.includes(optionValue)
            ? selectedValues.filter(v => v !== optionValue)
            : [...selectedValues, optionValue];

        isSelectingRef.current = true;
        isExternalChangeRef.current = true;
        onChange(newSelectedValues);
        setInputVal('');
        setHighlightedIndex(-1);
        isUserEditingRef.current = false;

        setTimeout(() => {
            isSelectingRef.current = false;
        }, 200);
    };

    const removeSelection = (optionValue) => {
        const newSelectedValues = selectedValues.filter(v => v !== optionValue);
        isExternalChangeRef.current = true;
        onChange(newSelectedValues);
    };

    // Filter logic: Filter OUT already selected items and use STARTS_WITH (matching ref component)
    const normalizedInput = inputVal.toLowerCase().replace(/^\+/, '');
    const filteredOptions = normalizedInput.length === 0
        ? options.filter(option => !selectedValues.includes(option.value))
        : options.filter(option => {
            const normalizedLabel = option.label.toLowerCase().replace(/^\+/, '');
            // Mirroring the specific .startsWith(normalizedInput) and exclusion logic
            return normalizedLabel.startsWith(normalizedInput) && !selectedValues.includes(option.value);
        });

    return (
        <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            padding: '10px 12px',
            flex: flex,
            minWidth: 0,
            position: 'relative',
            ...style
        }} ref={autocompleteRef}>
            {label && (
                <span style={{
                    minWidth: minWidth,
                    maxWidth: minWidth,
                    fontWeight: 'bold',
                    fontSize: '13px',
                    color: '#333',
                    flexShrink: 0,
                    paddingRight: '12px',
                    whiteSpace: 'nowrap',
                    marginTop: '6px'
                }}>
                    {label} {required && <span style={{ color: 'red' }}>*</span>}
                </span>
            )}
            <div style={{ flex: 1, position: 'relative' }}>
                <div
                    style={{
                        minHeight: '32px',
                        border: `1px solid ${error ? '#dc3545' : '#ddd'}`,
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
                                    padding: '1px 6px',
                                    borderRadius: '12px',
                                    fontSize: '11px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                }}
                            >
                                {DOMPurify.sanitize(displayLabel || '', { ALLOWED_TAGS: [] })}
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
                        placeholder={selectedValues.length === 0 ? (placeholder || "Select...") : ""}
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
                                if (isSelectingRef.current || isFocusInDropdown) {
                                    return;
                                }
                                setIsOpen(false);
                            }, 150);
                        }}
                        style={{
                            border: 'none',
                            outline: 'none',
                            flex: 1,
                            minWidth: '60px',
                            fontSize: '13px',
                            fontFamily: 'inherit',
                            backgroundColor: 'transparent'
                        }}
                        autoComplete="off"
                    />
                    <ChevronDown
                        size={14}
                        style={{
                            position: 'absolute',
                            right: '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#666',
                            cursor: 'pointer'
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen(!isOpen);
                        }}
                    />
                </div>
                {error && <div data-error-field="true" style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: '500', lineHeight: '1.3', wordWrap: 'break-word' }}>{error}</div>}

                {isOpen && (
                    <div
                        tabIndex={-1}
                        style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            minWidth: '100%',
                            width: 'max-content',
                            maxWidth: '400px',
                            background: '#fff',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            zIndex: 2000,
                            marginTop: '2px',
                            maxHeight: '180px',
                            overflowY: 'auto'
                        }}
                    >
                        <div ref={optionsRef}>
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((opt, i) => (
                                    <div
                                        key={opt.value}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            toggleSelection(opt.value);
                                        }}
                                        style={{
                                            padding: '10px 12px',
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            backgroundColor: highlightedIndex === i ? '#cce5ff' : 'white',
                                            borderBottom: i !== filteredOptions.length - 1 ? '1px solid #f3f4f6' : 'none',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            transition: 'background-color 0.2s',
                                        }}
                                        onMouseEnter={() => setHighlightedIndex(i)}
                                        onMouseLeave={() => setHighlightedIndex(-1)}
                                    >
                                        {DOMPurify.sanitize(opt.label || '', { ALLOWED_TAGS: [] })}
                                    </div>
                                ))
                            ) : (
                                <div style={{ padding: '12px', fontSize: '11px', color: '#9ca3af', textAlign: 'center' }}>
                                    {inputVal ? 'No matching results' : 'Select items...'}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Specialized Autocomplete Components

export const ChangeTypeAutocomplete = (props) => (
    <BaseAutocomplete
        {...props}
        options={[
            { value: 'Scope', label: 'Scope' },
            { value: 'Enhancement', label: 'Enhancement' },
            { value: 'Defect Fix', label: 'Defect Fix' },
            { value: 'Regulatory', label: 'Regulatory' },
            { value: 'Technical', label: 'Technical' }
        ]}
        placeholder="Select Change Type"
            error={props.error}
        />
);

export const ChangeCategoryAutocomplete = (props) => (
    <BaseAutocomplete
        {...props}
        showSearchIcon={true}
        placeholder="Select Category"
            error={props.error}
        />
);

export const ChangeSubCategoryAutocomplete = (props) => (
    <BaseAutocomplete
        {...props}
        showSearchIcon={true}
        placeholder="Select Sub-category"
            error={props.error}
        />
);

export const StreamAutocomplete = (props) => (
    <BaseAutocomplete
        {...props}
        options={props.options || [
            { value: 'Finance', label: 'Finance' },
            { value: 'Supply Chain', label: 'Supply Chain' },
            { value: 'HCM', label: 'HCM' },
            { value: 'Projects', label: 'Projects' },
            { value: 'Manufacturing', label: 'Manufacturing' },
            { value: 'Sales & Marketing', label: 'Sales & Marketing' }
        ]}
        placeholder="Select Stream"
            error={props.error}
        />
);

export const ApplicationAutocomplete = (props) => (
    <BaseAutocomplete
        {...props}
        options={props.options || [
            { value: 'Oracle Fusion', label: 'Oracle Fusion' },
            { value: 'EBS', label: 'EBS' }
        ]}
        placeholder="Select Application"
            error={props.error}
        />
);

export const ModuleAutocomplete = (props) => (
    <BaseMultiSelectAutocomplete
        {...props}
        options={props.options || [
            { value: 'General Ledger', label: 'General Ledger' },
            { value: 'Accounts Payable', label: 'Accounts Payable' },
            { value: 'Accounts Receivable', label: 'Accounts Receivable' },
            { value: 'Fixed Assets', label: 'Fixed Assets' },
            { value: 'Purchasing', label: 'Purchasing' },
            { value: 'Inventory', label: 'Inventory' },
            { value: 'Order Management', label: 'Order Management' }
        ]}
        placeholder="Select Module"
            error={props.error}
        />
);

export const ProjectPhaseAutocomplete = (props) => (
    <BaseAutocomplete
        {...props}
        showSearchIcon={true}
        options={props.options || [
            { value: 'Design', label: 'Design' },
            { value: 'Build', label: 'Build' },
            { value: 'SIT', label: 'SIT' },
            { value: 'UAT', label: 'UAT' },
            { value: 'Cutover', label: 'Cutover' },
            { value: 'Hypercare', label: 'Hypercare' }
        ]}
        placeholder="Select Project Phase"
            error={props.error}
        />
);

export const PriorityAutocomplete = (props) => (
    <BaseAutocomplete
        {...props}
        options={[
            { value: 'Critical', label: 'Critical' },
            { value: 'High', label: 'High' },
            { value: 'Medium', label: 'Medium' },
            { value: 'Low', label: 'Low' }
        ]}
        placeholder="Select Priority"
            error={props.error}
        />
);

export const ImpactAreaAutocomplete = (props) => (
    <BaseMultiSelectAutocomplete
        {...props}
        options={[
            { value: 'Scope', label: 'Scope' },
            { value: 'Timeline', label: 'Timeline' },
            { value: 'Cost', label: 'Cost' },
            { value: 'Quality', label: 'Quality' },
            { value: 'Compliance', label: 'Compliance' }
        ]}
        placeholder="Select Impact Area..."
            error={props.error}
        />
);

export const CurrencyAutocomplete = (props) => (
    <BaseAutocomplete
        {...props}
        options={props.options || [
            { value: 'USD', label: 'USD' },
            { value: 'EUR', label: 'EUR' },
            { value: 'INR', label: 'INR' }
        ]}
        placeholder="Select Currency"
            error={props.error}
        />
);

export const RicewIdAutocomplete = (props) => (
    <BaseAutocomplete {...props} showSearchIcon={true} />
);

export const RicewImpactedAutocomplete = (props) => (
    <BaseAutocomplete 
        {...props} 
        options={[
            { value: 'Yes', label: 'Yes' },
            { value: 'No', label: 'No' }
        ]}
        placeholder="Select"
    />
);

export const CRRequestorAutocomplete = (props) => (
    <BaseAutocomplete 
        {...props} 
        showSearchIcon={true}
        placeholder="Search Name / Email"
    />
);

export const CRClientOwnerAutocomplete = (props) => (
    <BaseAutocomplete 
        {...props} 
        showSearchIcon={true}
        placeholder="Search CR Client Owner"
    />
);

export const BusinessOwnerAutocomplete = (props) => (
    <BaseAutocomplete 
        {...props} 
        showSearchIcon={true}
        placeholder="Search Business Owner"
    />
);

export const ApprovalStatusAutocomplete = (props) => (
    <BaseAutocomplete
        {...props}
        options={[
            { value: 'Draft', label: 'Draft' },
            { value: 'Submitted', label: 'Submitted' },
            { value: 'Under Review', label: 'Under Review' },
            { value: 'More Information Needed', label: 'More Information Needed' },
            { value: 'Approved', label: 'Approved' },
            { value: 'Rejected', label: 'Rejected' }
        ]}
        placeholder="Select Status"
            error={props.error}
        />
);
