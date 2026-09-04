import React, { useState, useEffect, useRef } from 'react';
import { TextField } from '@mui/material';
import { getIdToken } from '../../utils/cognito-auth';
import DOMPurify from 'dompurify';
import { useSession } from '../../context/SessionContext';

export const PrimaryRoleAutocomplete = ({
    value,
    onChange,
    projectId,
    error = false,
    isPopulated = false
}) => {
    const { handleAuthError } = useSession();
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    const [inputVal, setInputVal] = useState(value || '');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const autocompleteRef = useRef(null);
    const inputRef = useRef(null);
    const listRef = useRef(null);

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
        const fetchRoles = async () => {
            if (!projectId) return;
            try {
                setLoading(true);
                const token = await getIdToken();
                const response = await fetch(`https://m4wh3q1onb.execute-api.ap-south-1.amazonaws.com/New/rice/role-definitions`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.status === 401 || response.status === 403) {
                    handleAuthError('Session expired - please login again');
                    return;
                }

                if (response.ok) {
                    const result = await response.json();
                    const roles = result.data || [];
                    const transformedOptions = roles.map(role => ({
                        value: DOMPurify.sanitize(role.role_Title, { ALLOWED_TAGS: [] }),
                        label: DOMPurify.sanitize(role.role_Title, { ALLOWED_TAGS: [] })
                    })).sort((a, b) => a.label.localeCompare(b.label));
                    setOptions(transformedOptions);
                } else {
                    console.error('Failed to fetch role definitions');
                }
            } catch (error) {
                console.error('Error fetching role definitions:', error);
                setLoadError(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchRoles();
    }, [projectId]);

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
                setHighlightedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
            } else {
                setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
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
                    placeholder={loading ? 'Loading...' : 'Select role...'}
                    size="small"
                    error={error}
                    disabled={isPopulated}
                    sx={{
                        width: '100%',
                        '& .MuiInputBase-root': {
                            backgroundColor: 'white',
                            fontSize: '13px',
                            fontFamily: 'inherit',
                        },
                        '& .MuiInputBase-input': {
                            padding: '6px 10px 6px 10px',
                            fontSize: '13px',
                        },
                        '& .MuiOutlinedInput-root': {
                            '& fieldset': {
                                borderColor: error ? '#dc2626' : '#3b82f6',
                                borderRadius: '4px',
                                borderWidth: '2px',
                            },
                            '&:hover fieldset': {
                                borderColor: error ? '#dc2626' : 'black',
                            },
                            '&.Mui-focused fieldset': {
                                borderColor: error ? '#dc2626' : 'black',
                                borderWidth: '2px',
                            },
                        },
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
                        borderRadius: '0 0 4px 4px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        zIndex: 999,
                        maxHeight: '200px',
                        overflowY: 'auto',
                        marginTop: '4px'
                    }}
                >
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((option, index) => (
                            <div
                                key={index}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleSelectOption(option.value);
                                }}
                                onMouseEnter={() => setHighlightedIndex(index)}
                                style={{
                                    padding: '8px 12px',
                                    cursor: 'pointer',
                                    backgroundColor: index === highlightedIndex ? '#cce5ff' : (option.value === value ? '#e3f2fd' : 'white'),
                                    fontSize: '13px',
                                    borderBottom: '1px solid #f0f0f0',
                                    transition: 'background-color 0.2s'
                                }}
                            >
                                {DOMPurify.sanitize(option.label, { ALLOWED_TAGS: [] })}
                            </div>
                        ))
                    ) : (
                        <div style={{ padding: '10px', fontSize: '13px', color: '#999', textAlign: 'center' }}>
                            No roles found
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
export const ResourceLevelAutocomplete = ({
    value,
    onChange,
    projectId,
    error = false,
    isPopulated = false
}) => {
    const { handleAuthError } = useSession();
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    const [inputVal, setInputVal] = useState(value || '');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const autocompleteRef = useRef(null);
    const inputRef = useRef(null);
    const listRef = useRef(null);

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
        const fetchResourceLevels = async () => {
            try {
                setLoading(true);
                const token = await getIdToken();
                const resolvedProjectId = projectId || localStorage.getItem('project_id') || '101';
                const response = await fetch(`https://fuahu3jqsc.execute-api.ap-south-1.amazonaws.com/New/api/get/LOV/leveldefinitions`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.status === 401 || response.status === 403) {
                    handleAuthError('Session expired - please login again');
                    return;
                }

                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.data) {
                        const sortedData = result.data.sort((a, b) => {
                            return (a.Level_Short_Code || '').localeCompare(b.Level_Short_Code || '', undefined, { numeric: true, sensitivity: 'base' });
                        });
                        const transformedOptions = sortedData.map(item => ({
                            value: DOMPurify.sanitize(item.designation || '', { ALLOWED_TAGS: [] }),
                            label: DOMPurify.sanitize(item.designation || '', { ALLOWED_TAGS: [] })
                        }));
                        setOptions(transformedOptions);
                    }
                } else {
                    console.error('Failed to fetch resource levels');
                }
            } catch (error) {
                console.error('Error fetching resource levels:', error);
                setLoadError(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchResourceLevels();
    }, []);

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
                setHighlightedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
            } else {
                setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
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
                        '& .MuiInputBase-root': {
                            backgroundColor: 'white',
                            fontSize: '13px',
                            fontFamily: 'inherit',
                        },
                        '& .MuiInputBase-input': {
                            padding: '6px 10px 6px 10px',
                            fontSize: '13px',
                        },
                        '& .MuiOutlinedInput-root': {
                            '& fieldset': {
                                borderColor: error ? '#dc2626' : '#3b82f6',
                                borderRadius: '4px',
                                borderWidth: '2px',
                            },
                            '&:hover fieldset': {
                                borderColor: error ? '#dc2626' : 'black',
                            },
                            '&.Mui-focused fieldset': {
                                borderColor: error ? '#dc2626' : 'black',
                                borderWidth: '2px',
                            },
                        },
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
                        borderRadius: '0 0 4px 4px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        zIndex: 999,
                        maxHeight: '200px',
                        overflowY: 'auto',
                        marginTop: '4px'
                    }}
                >
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((option, index) => (
                            <div
                                key={index}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleSelectOption(option.value);
                                }}
                                onMouseEnter={() => setHighlightedIndex(index)}
                                style={{
                                    padding: '8px 12px',
                                    cursor: 'pointer',
                                    backgroundColor: index === highlightedIndex ? '#cce5ff' : (option.value === value ? '#e3f2fd' : 'white'),
                                    fontSize: '13px',
                                    borderBottom: '1px solid #f0f0f0',
                                    transition: 'background-color 0.2s'
                                }}
                            >
                                {DOMPurify.sanitize(option.label, { ALLOWED_TAGS: [] })}
                            </div>
                        ))
                    ) : (
                        <div style={{ padding: '10px', fontSize: '13px', color: '#999', textAlign: 'center' }}>
                            No levels found
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
export const ProcessStreamAutocomplete = ({
    value,
    onChange,
    projectId,
    error = false,
    isPopulated = false
}) => {
    const { handleAuthError } = useSession();
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    const [inputVal, setInputVal] = useState(value || '');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const autocompleteRef = useRef(null);
    const inputRef = useRef(null);
    const listRef = useRef(null);

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
        const fetchStreams = async () => {
            try {
                setLoading(true);
                const token = await getIdToken();
                const response = await fetch(`https://vs7ws23ybl.execute-api.ap-south-1.amazonaws.com/rice/Stream-Business-Mapp/get-streams`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.status === 401 || response.status === 403) {
                    handleAuthError('Session expired - please login again');
                    return;
                }

                if (response.ok) {
                    const result = await response.json();
                    const streamList = result.data || [];
                    const uniqueStreams = [...new Set(streamList.filter(Boolean))].sort();
                    const transformedOptions = uniqueStreams.map(streamName => ({
                        value: DOMPurify.sanitize(streamName, { ALLOWED_TAGS: [] }),
                        label: DOMPurify.sanitize(streamName, { ALLOWED_TAGS: [] })
                    }));
                    setOptions(transformedOptions);
                } else {
                    console.error('Failed to fetch process streams');
                }
            } catch (error) {
                console.error('Error fetching applications:', error);
                setLoadError(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchStreams();
    }, []);

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
                setHighlightedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
            } else {
                setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
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
                    placeholder={loading ? 'Loading...' : 'Select process stream...'}
                    size="small"
                    error={error}
                    disabled={isPopulated}
                    sx={{
                        width: '100%',
                        '& .MuiInputBase-root': {
                            backgroundColor: 'white',
                            fontSize: '13px',
                            fontFamily: 'inherit',
                        },
                        '& .MuiInputBase-input': {
                            padding: '6px 10px 6px 10px',
                            fontSize: '13px',
                        },
                        '& .MuiOutlinedInput-root': {
                            '& fieldset': {
                                borderColor: error ? '#dc2626' : '#3b82f6',
                                borderRadius: '4px',
                                borderWidth: '2px',
                            },
                            '&:hover fieldset': {
                                borderColor: error ? '#dc2626' : 'black',
                            },
                            '&.Mui-focused fieldset': {
                                borderColor: error ? '#dc2626' : 'black',
                                borderWidth: '2px',
                            },
                        },
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
                        borderRadius: '0 0 4px 4px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        zIndex: 999,
                        maxHeight: '200px',
                        overflowY: 'auto',
                        marginTop: '4px'
                    }}
                >
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((option, index) => (
                            <div
                                key={index}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleSelectOption(option.value);
                                }}
                                onMouseEnter={() => setHighlightedIndex(index)}
                                style={{
                                    padding: '8px 12px',
                                    cursor: 'pointer',
                                    backgroundColor: index === highlightedIndex ? '#cce5ff' : (option.value === value ? '#e3f2fd' : 'white'),
                                    fontSize: '13px',
                                    borderBottom: '1px solid #f0f0f0',
                                    transition: 'background-color 0.2s'
                                }}
                            >
                                {DOMPurify.sanitize(option.label, { ALLOWED_TAGS: [] })}
                            </div>
                        ))
                    ) : (
                        <div style={{ padding: '10px', fontSize: '13px', color: '#999', textAlign: 'center' }}>
                            No applications found
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export const OrganizationAutocomplete = ({
    value,
    onChange,
    projectId,
    error = false,
    isPopulated = false
}) => {
    const { handleAuthError } = useSession();
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    const [inputVal, setInputVal] = useState(value || '');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const autocompleteRef = useRef(null);
    const inputRef = useRef(null);
    const listRef = useRef(null);

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
        const fetchOrganizations = async () => {
            try {
                setLoading(true);
                const token = await getIdToken();
                const resolvedProjectId = projectId || localStorage.getItem('project_id') || '101';
                const response = await fetch(`https://fuahu3jqsc.execute-api.ap-south-1.amazonaws.com/New/api/get/LOV/si-organization-details?project_id=${resolvedProjectId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.status === 401 || response.status === 403) {
                    handleAuthError('Session expired - please login again');
                    return;
                }

                if (response.ok) {
                    const result = await response.json();
                    const data = result.data || [];
                    const transformedOptions = data.map(org => ({
                        value: DOMPurify.sanitize(org.SI_organization_name, { ALLOWED_TAGS: [] }),
                        label: DOMPurify.sanitize(org.SI_organization_name, { ALLOWED_TAGS: [] })
                    })).sort((a, b) => a.label.localeCompare(b.label));
                    setOptions(transformedOptions);
                } else {
                    console.error('Failed to fetch organizations');
                }
            } catch (error) {
                console.error('Error fetching organizations:', error);
                setLoadError(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchOrganizations();
    }, []);

    // Auto-select if only 1 option exists
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
                setHighlightedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
            } else {
                setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
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
                        '& .MuiInputBase-root': {
                            backgroundColor: 'white',
                            fontSize: '13px',
                            fontFamily: 'inherit',
                        },
                        '& .MuiInputBase-input': {
                            padding: '6px 10px 6px 10px',
                            fontSize: '13px',
                        },
                        '& .MuiOutlinedInput-root': {
                            '& fieldset': {
                                borderColor: error ? '#dc2626' : '#3b82f6',
                                borderRadius: '4px',
                                borderWidth: '2px',
                            },
                            '&:hover fieldset': {
                                borderColor: error ? '#dc2626' : 'black',
                            },
                            '&.Mui-focused fieldset': {
                                borderColor: error ? '#dc2626' : 'black',
                                borderWidth: '2px',
                            },
                        },
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
                        borderRadius: '0 0 4px 4px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        zIndex: 999,
                        maxHeight: '200px',
                        overflowY: 'auto',
                        marginTop: '4px'
                    }}
                >
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((option, index) => (
                            <div
                                key={index}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleSelectOption(option.value);
                                }}
                                onMouseEnter={() => setHighlightedIndex(index)}
                                style={{
                                    padding: '8px 12px',
                                    cursor: 'pointer',
                                    backgroundColor: index === highlightedIndex ? '#cce5ff' : (option.value === value ? '#e3f2fd' : 'white'),
                                    fontSize: '13px',
                                    borderBottom: '1px solid #f0f0f0',
                                    transition: 'background-color 0.2s'
                                }}
                            >
                                {DOMPurify.sanitize(option.label, { ALLOWED_TAGS: [] })}
                            </div>
                        ))
                    ) : (
                        <div style={{ padding: '10px', fontSize: '13px', color: '#999', textAlign: 'center' }}>
                            No organizations found
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
