import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { TextField } from '@mui/material';
import { getIdToken } from '../../utils/cognito-auth';
import DOMPurify from 'dompurify';
import { useSession } from '../../context/SessionContext';

export const ResourceLevelAutocomplete = ({
    value,
    onChange,
    projectId,
    error = false,
    isPopulated = false,
    optionsList = []
}) => {
    const { handleAuthError } = useSession();
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    const [inputVal, setInputVal] = useState(value || '');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [dropdownStyles, setDropdownStyles] = useState({});
    const autocompleteRef = useRef(null);
    const inputRef = useRef(null);
    const listRef = useRef(null);

    const updatePosition = () => {
        if (autocompleteRef.current) {
            const rect = autocompleteRef.current.getBoundingClientRect();
            setDropdownStyles({
                position: 'fixed',
                top: `${rect.bottom + 4}px`,
                left: `${rect.left}px`,
                width: `${rect.width}px`,
                backgroundColor: 'white',
                border: '1px solid #ddd',
                borderRadius: '0 0 4px 4px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                zIndex: 999,
                maxHeight: '300px',
                overflowY: 'auto'
            });
        }
    };

    useEffect(() => {
        if (isOpen) {
            updatePosition();
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
            return () => {
                window.removeEventListener('scroll', updatePosition, true);
                window.removeEventListener('resize', updatePosition);
            };
        }
    }, [isOpen]);

    const isUserEditingRef = useRef(false);
    const isOpenRef = useRef(false);
    const selectionMadeRef = useRef(false);
    const previousValueRef = useRef(value);
    const previousInputValRef = useRef(value || '');

    useEffect(() => {
        isOpenRef.current = isOpen;
    }, [isOpen]);

    useEffect(() => {
        if (!isUserEditingRef.current) {
            setInputVal(value || '');
        }
    }, [value]);

    useEffect(() => {
        if (optionsList && optionsList.length > 0) {
            const sortedData = [...optionsList].sort((a, b) => {
                const idA = Number(a.Level_Definition_id) || 0;
                const idB = Number(b.Level_Definition_id) || 0;
                return idA - idB;
            });
            const transformedOptions = sortedData.map(item => ({
                value: DOMPurify.sanitize(item.designation || '', { ALLOWED_TAGS: [] }),
                label: DOMPurify.sanitize(item.designation || '', { ALLOWED_TAGS: [] })
            }));
            setOptions(transformedOptions);
        }
        setLoading(false);
    }, [optionsList]);

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

        if (!wasSelectionMade) {
            setInputVal(previousInputValRef.current);
            onChange(previousValueRef.current);
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

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const openDropdown = () => {
        if (isPopulated) return;
        previousValueRef.current = value;
        previousInputValRef.current = value || '';
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
        onChange(val);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (!isOpen) {
                openDropdown();
                return;
            }
            if (e.key === 'ArrowDown') {
                setHighlightedIndex(prev => (prev < options.filter(option => option.label.toLowerCase().includes(inputVal.toLowerCase())).length - 1 ? prev + 1 : 0));
            } else {
                setHighlightedIndex(prev => (prev > 0 ? prev - 1 : options.filter(option => option.label.toLowerCase().includes(inputVal.toLowerCase())).length - 1));
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const filteredOptions = options.filter(option => option.label.toLowerCase().includes(inputVal.toLowerCase()));
            if (isOpen && highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
                handleSelectOption(filteredOptions[highlightedIndex].value);
            } else {
                handleCloseDropdown(false);
            }
        } else if (e.key === 'Tab') {
            if (isOpen) {
                handleCloseDropdown(false);
            }
        } else if (e.key === 'Escape') {
            handleCloseDropdown(false);
        }
    };

    const handleSelectOption = (optionValue) => {
        selectionMadeRef.current = true;
        previousValueRef.current = optionValue;
        previousInputValRef.current = optionValue;
        onChange(optionValue);
        setInputVal(optionValue);
        setIsOpen(false);
        setHighlightedIndex(-1);
        isUserEditingRef.current = false;
        if (inputRef.current) inputRef.current.blur();
    };

    const filteredOptions = inputVal.length === 0
        ? options
        : options.filter(option => option.label.toLowerCase().includes(inputVal.toLowerCase()));

    return (
        <div style={{ position: 'relative', width: '100%' }} ref={autocompleteRef}>
            <div style={{ position: 'relative' }}>
                <TextField
                    inputRef={inputRef}
                    value={inputVal}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    autoComplete="off"
                    onFocus={openDropdown}
                    placeholder={loading ? 'Loading...' : 'Select level...'}
                    size="small"
                    error={error}
                    disabled={isPopulated}
                    sx={{
                        width: '100%',
                        '& .MuiInputBase-root': { backgroundColor: 'white', fontSize: '13px', fontFamily: 'inherit' },
                        '& .MuiInputBase-input': { padding: '6px 10px 6px 10px', fontSize: '13px' },
                        '& .MuiOutlinedInput-root': {
                            '& fieldset': { borderColor: error ? '#dc2626' : '#3b82f6', borderRadius: '4px', borderWidth: '2px' },
                            '&:hover fieldset': { borderColor: error ? '#dc2626' : 'black' },
                            '&.Mui-focused fieldset': { borderColor: error ? '#dc2626' : 'black', borderWidth: '2px' }
                        }
                    }}
                />
            </div>
            {isOpen && typeof document !== 'undefined' && createPortal(
                <div
                    ref={listRef}
                    style={dropdownStyles}
                >
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((option, index) => (
                            <div
                                key={index}
                                onMouseDown={(e) => { e.preventDefault(); handleSelectOption(option.value); }}
                                onMouseEnter={() => setHighlightedIndex(index)}
                                style={{
                                    padding: '8px 12px', cursor: 'pointer',
                                    backgroundColor: index === highlightedIndex ? '#cce5ff' : (option.value === value ? '#e3f2fd' : 'white'),
                                    fontSize: '13px', borderBottom: '1px solid #f0f0f0', transition: 'background-color 0.2s'
                                }}
                            >
                                {DOMPurify.sanitize(option.label, { ALLOWED_TAGS: [] })}
                            </div>
                        ))
                    ) : (
                        <div style={{ padding: '10px', fontSize: '13px', color: '#999', textAlign: 'center' }}>No levels found</div>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
};

export const OrganizationAutocomplete = ({
    value,
    onChange,
    projectId,
    error = false,
    isPopulated = false,
    optionsList = []
}) => {
    const { handleAuthError } = useSession();
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    const [inputVal, setInputVal] = useState(value || '');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [dropdownStyles, setDropdownStyles] = useState({});
    const autocompleteRef = useRef(null);
    const inputRef = useRef(null);
    const listRef = useRef(null);

    const updatePosition = () => {
        if (autocompleteRef.current) {
            const rect = autocompleteRef.current.getBoundingClientRect();
            setDropdownStyles({
                position: 'fixed',
                top: `${rect.bottom + 4}px`,
                left: `${rect.left}px`,
                width: `${rect.width}px`,
                backgroundColor: 'white',
                border: '1px solid #ddd',
                borderRadius: '0 0 4px 4px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                zIndex: 999,
                maxHeight: '300px',
                overflowY: 'auto'
            });
        }
    };

    useEffect(() => {
        if (isOpen) {
            updatePosition();
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
            return () => {
                window.removeEventListener('scroll', updatePosition, true);
                window.removeEventListener('resize', updatePosition);
            };
        }
    }, [isOpen]);

    const isUserEditingRef = useRef(false);
    const isOpenRef = useRef(false);
    const selectionMadeRef = useRef(false);
    const previousValueRef = useRef(value);
    const previousInputValRef = useRef(value || '');

    useEffect(() => {
        isOpenRef.current = isOpen;
    }, [isOpen]);

    useEffect(() => {
        if (!isUserEditingRef.current) {
            setInputVal(value || '');
        }
    }, [value]);

    useEffect(() => {
        if (optionsList && optionsList.length > 0) {
            const sortedData = [...optionsList].sort((a, b) => {
                const idA = Number(a.SI_Organization_Details_id) || 0;
                const idB = Number(b.SI_Organization_Details_id) || 0;
                return idA - idB;
            });
            const transformedOptions = sortedData.map(org => {
                const labelStr = `${org.SI_organization_name} (${org.organization_id})`;
                return {
                    value: DOMPurify.sanitize(labelStr, { ALLOWED_TAGS: [] }),
                    label: DOMPurify.sanitize(labelStr, { ALLOWED_TAGS: [] })
                };
            });
            setOptions(transformedOptions);
        }
        setLoading(false);
    }, [optionsList]);

    useEffect(() => {
        if (options && options.length === 1 && (!value || value === '') && !isPopulated) {
            const singleOption = options[0];
            onChange(singleOption.value);
            setInputVal(singleOption.label);
        }
    }, [options, value, isPopulated, onChange]);

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

        if (!wasSelectionMade) {
            setInputVal(previousInputValRef.current);
            onChange(previousValueRef.current);
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

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const openDropdown = () => {
        if (isPopulated) return;
        previousValueRef.current = value;
        previousInputValRef.current = value || '';
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
        onChange(val);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (!isOpen) {
                openDropdown();
                return;
            }
            if (e.key === 'ArrowDown') {
                setHighlightedIndex(prev => (prev < options.filter(option => option.label.toLowerCase().includes(inputVal.toLowerCase())).length - 1 ? prev + 1 : 0));
            } else {
                setHighlightedIndex(prev => (prev > 0 ? prev - 1 : options.filter(option => option.label.toLowerCase().includes(inputVal.toLowerCase())).length - 1));
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const filteredOptions = options.filter(option => option.label.toLowerCase().includes(inputVal.toLowerCase()));
            if (isOpen && highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
                handleSelectOption(filteredOptions[highlightedIndex].value);
            } else {
                handleCloseDropdown(false);
            }
        } else if (e.key === 'Tab') {
            if (isOpen) {
                handleCloseDropdown(false);
            }
        } else if (e.key === 'Escape') {
            handleCloseDropdown(false);
        }
    };

    const handleSelectOption = (optionValue) => {
        selectionMadeRef.current = true;
        previousValueRef.current = optionValue;
        previousInputValRef.current = optionValue;
        onChange(optionValue);
        setInputVal(optionValue);
        setIsOpen(false);
        setHighlightedIndex(-1);
        isUserEditingRef.current = false;
        if (inputRef.current) inputRef.current.blur();
    };

    const filteredOptions = inputVal.length === 0
        ? options
        : options.filter(option => option.label.toLowerCase().includes(inputVal.toLowerCase()));

    return (
        <div style={{ position: 'relative', width: '100%' }} ref={autocompleteRef}>
            <div style={{ position: 'relative' }}>
                <TextField
                    inputRef={inputRef}
                    value={inputVal}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    autoComplete="off"
                    onFocus={openDropdown}
                    placeholder={loading ? 'Loading...' : 'Select organization...'}
                    size="small"
                    error={error}
                    disabled={isPopulated}
                    sx={{
                        width: '100%',
                        '& .MuiInputBase-root': { backgroundColor: 'white', fontSize: '13px', fontFamily: 'inherit' },
                        '& .MuiInputBase-input': { padding: '6px 10px 6px 10px', fontSize: '13px' },
                        '& .MuiOutlinedInput-root': {
                            '& fieldset': { borderColor: error ? '#dc2626' : '#3b82f6', borderRadius: '4px', borderWidth: '2px' },
                            '&:hover fieldset': { borderColor: error ? '#dc2626' : 'black' },
                            '&.Mui-focused fieldset': { borderColor: error ? '#dc2626' : 'black', borderWidth: '2px' }
                        }
                    }}
                />
            </div>
            {isOpen && typeof document !== 'undefined' && createPortal(
                <div
                    ref={listRef}
                    style={dropdownStyles}
                >
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((option, index) => (
                            <div
                                key={index}
                                onMouseDown={(e) => { e.preventDefault(); handleSelectOption(option.value); }}
                                onMouseEnter={() => setHighlightedIndex(index)}
                                style={{
                                    padding: '8px 12px', cursor: 'pointer',
                                    backgroundColor: index === highlightedIndex ? '#cce5ff' : (option.value === value ? '#e3f2fd' : 'white'),
                                    fontSize: '13px', borderBottom: '1px solid #f0f0f0', transition: 'background-color 0.2s'
                                }}
                            >
                                {DOMPurify.sanitize(option.label, { ALLOWED_TAGS: [] })}
                            </div>
                        ))
                    ) : (
                        <div style={{ padding: '10px', fontSize: '13px', color: '#999', textAlign: 'center' }}>No organizations found</div>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
};

export const SkillAutocomplete = ({
    value,
    onChange,
    error = false,
    isPopulated = false,
    placeholder = "Select skill...",
    optionsList = []
}) => {
    const { handleAuthError } = useSession();
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    const [inputVal, setInputVal] = useState(value || '');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [dropdownStyles, setDropdownStyles] = useState({});
    const autocompleteRef = useRef(null);
    const inputRef = useRef(null);
    const listRef = useRef(null);

    const updatePosition = () => {
        if (autocompleteRef.current) {
            const rect = autocompleteRef.current.getBoundingClientRect();
            setDropdownStyles({
                position: 'fixed',
                top: `${rect.bottom + 4}px`,
                left: `${rect.left}px`,
                width: `${rect.width}px`,
                backgroundColor: 'white',
                border: '1px solid #ddd',
                borderRadius: '0 0 4px 4px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                zIndex: 999,
                maxHeight: '300px',
                overflowY: 'auto'
            });
        }
    };

    useEffect(() => {
        if (isOpen) {
            updatePosition();
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
            return () => {
                window.removeEventListener('scroll', updatePosition, true);
                window.removeEventListener('resize', updatePosition);
            };
        }
    }, [isOpen]);

    const isUserEditingRef = useRef(false);
    const isOpenRef = useRef(false);
    const selectionMadeRef = useRef(false);
    const previousValueRef = useRef(value);
    const previousInputValRef = useRef(value || '');

    useEffect(() => {
        isOpenRef.current = isOpen;
    }, [isOpen]);

    useEffect(() => {
        if (!isUserEditingRef.current) {
            setInputVal(value || '');
        }
    }, [value]);

    useEffect(() => {
        if (optionsList && optionsList.length > 0) {
            const sortedData = [...optionsList].sort((a, b) => {
                const idA = Number(a.Category_Subcategory_id) || 0;
                const idB = Number(b.Category_Subcategory_id) || 0;
                return idA - idB;
            });
            const transformedOptions = sortedData.map(skill => {
                const labelStr = skill.Category_Name || '';
                return {
                    value: DOMPurify.sanitize(labelStr, { ALLOWED_TAGS: [] }),
                    label: DOMPurify.sanitize(labelStr, { ALLOWED_TAGS: [] })
                };
            });
            setOptions(transformedOptions);
        }
        setLoading(false);
    }, [optionsList]);

    useEffect(() => {
        if (options && options.length === 1 && (!value || value === '') && !isPopulated) {
            const singleOption = options[0];
            onChange(singleOption.value);
            setInputVal(singleOption.label);
        }
    }, [options, value, isPopulated, onChange]);

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

        if (!wasSelectionMade) {
            setInputVal(previousInputValRef.current);
            onChange(previousValueRef.current);
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

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const openDropdown = () => {
        if (isPopulated) return;
        previousValueRef.current = value;
        previousInputValRef.current = value || '';
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
        onChange(val);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (!isOpen) {
                openDropdown();
                return;
            }
            if (e.key === 'ArrowDown') {
                setHighlightedIndex(prev => (prev < options.filter(option => option.label.toLowerCase().includes(inputVal.toLowerCase())).length - 1 ? prev + 1 : 0));
            } else {
                setHighlightedIndex(prev => (prev > 0 ? prev - 1 : options.filter(option => option.label.toLowerCase().includes(inputVal.toLowerCase())).length - 1));
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const filteredOptions = options.filter(option => option.label.toLowerCase().includes(inputVal.toLowerCase()));
            if (isOpen && highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
                handleSelectOption(filteredOptions[highlightedIndex].value);
            } else {
                handleCloseDropdown(false);
            }
        } else if (e.key === 'Tab') {
            if (isOpen) {
                handleCloseDropdown(false);
            }
        } else if (e.key === 'Escape') {
            handleCloseDropdown(false);
        }
    };

    const handleSelectOption = (optionValue) => {
        selectionMadeRef.current = true;
        previousValueRef.current = optionValue;
        previousInputValRef.current = optionValue;
        onChange(optionValue);
        setInputVal(optionValue);
        setIsOpen(false);
        setHighlightedIndex(-1);
        isUserEditingRef.current = false;
        if (inputRef.current) inputRef.current.blur();
    };

    const filteredOptions = inputVal.length === 0
        ? options
        : options.filter(option => option.label.toLowerCase().includes(inputVal.toLowerCase()));

    return (
        <div style={{ position: 'relative', width: '100%' }} ref={autocompleteRef}>
            <div style={{ position: 'relative' }}>
                <TextField
                    inputRef={inputRef}
                    value={inputVal}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    autoComplete="off"
                    onFocus={openDropdown}
                    placeholder={loading ? 'Loading...' : placeholder}
                    size="small"
                    error={error}
                    disabled={isPopulated}
                    sx={{
                        width: '100%',
                        '& .MuiInputBase-root': { backgroundColor: 'white', fontSize: '13px', fontFamily: 'inherit' },
                        '& .MuiInputBase-input': { padding: '6px 10px 6px 10px', fontSize: '13px' },
                        '& .MuiOutlinedInput-root': {
                            '& fieldset': { borderColor: error ? '#dc2626' : '#3b82f6', borderRadius: '4px', borderWidth: '2px' },
                            '&:hover fieldset': { borderColor: error ? '#dc2626' : 'black' },
                            '&.Mui-focused fieldset': { borderColor: error ? '#dc2626' : 'black', borderWidth: '2px' }
                        }
                    }}
                />
            </div>
            {isOpen && typeof document !== 'undefined' && createPortal(
                <div
                    ref={listRef}
                    style={dropdownStyles}
                >
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((option, index) => (
                            <div
                                key={index}
                                onMouseDown={(e) => { e.preventDefault(); handleSelectOption(option.value); }}
                                onMouseEnter={() => setHighlightedIndex(index)}
                                style={{
                                    padding: '8px 12px', cursor: 'pointer',
                                    backgroundColor: index === highlightedIndex ? '#cce5ff' : (option.value === value ? '#e3f2fd' : 'white'),
                                    fontSize: '13px', borderBottom: '1px solid #f0f0f0', transition: 'background-color 0.2s'
                                }}
                            >
                                {DOMPurify.sanitize(option.label, { ALLOWED_TAGS: [] })}
                            </div>
                        ))
                    ) : (
                        <div style={{ padding: '10px', fontSize: '13px', color: '#999', textAlign: 'center' }}>No skills found</div>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
};
