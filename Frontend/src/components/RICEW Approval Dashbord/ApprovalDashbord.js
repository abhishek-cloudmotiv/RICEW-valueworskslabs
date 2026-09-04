import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { MoreVertical, Save, X, Loader2, ChevronDown, AlertCircle, HelpCircle } from 'lucide-react';
import DOMPurify from 'dompurify';
import { getIdToken } from '../../utils/cognito-auth';
import { useSession } from '../../context/SessionContext';

const StatusAutocomplete = ({ value, options, onChange, isUpdating }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputVal, setInputVal] = useState(value || '');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
    const autocompleteRef = useRef(null);
    const isSelectingRef = useRef(false);

    // Keep input in sync with external value changes
    useEffect(() => {
        setInputVal(value || '');
    }, [value]);

    const updateCoords = () => {
        if (autocompleteRef.current) {
            const rect = autocompleteRef.current.getBoundingClientRect();
            setCoords({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width
            });
        }
    };

    useEffect(() => {
        if (isOpen) {
            updateCoords();
            window.addEventListener('scroll', updateCoords, true);
            window.addEventListener('resize', updateCoords);

            // Auto scroll to ensure the input and its dropdown are visible
            if (autocompleteRef.current) {
                setTimeout(() => {
                    autocompleteRef.current.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                }, 50);
            }
        }
        return () => {
            window.removeEventListener('scroll', updateCoords, true);
            window.removeEventListener('resize', updateCoords);
        };
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
                const dropdown = document.getElementById('status-autocomplete-portal');
                if (dropdown && dropdown.contains(event.target)) return;

                if (!isSelectingRef.current) {
                    setInputVal(value || '');
                }
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, value]);

    const filteredOptions = options.filter(option =>
        (option || '').toLowerCase().includes(inputVal.toLowerCase())
    );

    const handleSelect = (val) => {
        isSelectingRef.current = true;
        setInputVal(val);
        onChange(val);
        setIsOpen(false);
        // Reset selecting flag after a short delay
        setTimeout(() => {
            isSelectingRef.current = false;
        }, 200);
    };

    return (
        <div ref={autocompleteRef} style={{ position: 'relative', width: '100%' }}>
            <div style={{ position: 'relative' }}>
                <input
                    type="text"
                    value={inputVal}
                    onChange={(e) => {
                        setInputVal(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => {
                        setInputVal('');
                        setIsOpen(true);
                    }}
                    onBlur={() => {
                        // Delay revert to allow handleSelect to trigger first
                        setTimeout(() => {
                            if (!isSelectingRef.current) {
                                setInputVal(value || '');
                                setIsOpen(false);
                            }
                        }, 150);
                    }}
                    disabled={isUpdating}
                    placeholder="Select Status"
                    style={{
                        width: '100%',
                        padding: '6px 25px 6px 8px',
                        fontSize: '12px',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        outline: 'none',
                        backgroundColor: isUpdating ? '#f3f4f6' : 'white'
                    }}
                />
                <ChevronDown
                    size={14}
                    style={{
                        position: 'absolute',
                        right: '6px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#666',
                        cursor: 'pointer'
                    }}
                    onClick={() => {
                        if (isUpdating) return;
                        if (!isOpen) {
                            setInputVal(''); // Clear value when opening via arrow
                        } else {
                            if (!isSelectingRef.current) {
                                setInputVal(value || ''); // Revert when closing via arrow if no selection
                            }
                        }
                        setIsOpen(!isOpen);
                    }}
                />
            </div>
            {isOpen && createPortal(
                <div
                    id="status-autocomplete-portal"
                    style={{
                        position: 'absolute',
                        top: `${coords.top}px`,
                        left: `${coords.left}px`,
                        width: `${coords.width}px`,
                        backgroundColor: 'white',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        zIndex: 99999,
                        maxHeight: '180px',
                        overflowY: 'auto',
                        marginTop: '2px'
                    }}
                >
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((opt, i) => (
                            <div
                                key={i}
                                onClick={() => handleSelect(opt)}
                                style={{
                                    padding: '8px 12px',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    backgroundColor: opt === inputVal ? '#eff6ff' : 'white',
                                    borderBottom: i !== filteredOptions.length - 1 ? '1px solid #f3f4f6' : 'none',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = opt === inputVal ? '#eff6ff' : 'white'}
                            >
                                {opt}
                            </div>
                        ))
                    ) : (
                        <div style={{ padding: '10px', fontSize: '11px', color: '#9ca3af', textAlign: 'center' }}>
                            No results found
                        </div>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
};

const ApprovalDashbord = ({ onClose, onBackToLanding, onLogout, selectedProject }) => {
    const navigate = useNavigate();
    const { handleAuthError } = useSession();
    const [showNoProjectSelectedPopup, setShowNoProjectSelectedPopup] = useState(false);
    const [showHelpPopup, setShowHelpPopup] = useState(false);
    const helpPopupRef = useRef(null);

    useEffect(() => {
        const projectId = localStorage.getItem('project_id');
        if (!selectedProject?.id && !projectId) {
            setShowNoProjectSelectedPopup(true);
        }
    }, [selectedProject?.id]);

    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showErrorMessage, setShowErrorMessage] = useState(false);

    // Inline Edit State
    const [editingRowId, setEditingRowId] = useState(null);
    const [tempStatus, setTempStatus] = useState('');
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [filteredData, setFilteredData] = useState([]);
    const [tableSearchText, setTableSearchText] = useState('');
    const [searchError, setSearchError] = useState('');
    const [tableStatusLov, setTableStatusLov] = useState([]);
    const [selectedRows, setSelectedRows] = useState([]);
    const [selectAll, setSelectAll] = useState(false);

    // Confirmation Dialog State (Matched with RosterMassUploadForm styles)
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [confirmMessage, setConfirmMessage] = useState('');
    const [confirmAction, setConfirmAction] = useState(null);
    const [cancelAction, setCancelAction] = useState(null);

    // Computed filtered data that includes search filtering
    const displayedData = filteredData.filter(item => {
        if (!tableSearchText.trim()) return true;
        const searchTerm = tableSearchText.toLowerCase();
        // Search the RICEW_Name field from table data
        const ricewName = (item.RICEW_Name || '').toLowerCase();
        return ricewName.includes(searchTerm);
    });

    // Fetch specific RICEW Status LOV for table editing
    useEffect(() => {
        const fetchTableStatusLov = async () => {
            try {
                let idToken;
                try {
                    idToken = await getIdToken();
                } catch (tokenError) {
                    console.error('Failed to get ID token for Table Status LOV:', tokenError);
                    return;
                }

                const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` };

                const response = await fetch(
                    'https://7o6jl6k0pd.execute-api.ap-south-1.amazonaws.com/New/LOV/ricew/get/ricew-status',
                    { headers }
                );

                if (response.status === 401 || response.status === 403) {
                    console.error('Unauthorized - session expired');
                    return;
                }

                const result = await response.json();

                if (result.success && result.data) {
                    // Sort by RICEW_Status_Id numerically
                    const sanitizedData = result.data.map(item => ({
                        RICEW_Status_Id: item.RICEW_Status_Id,
                        Status_Name: DOMPurify.sanitize(String(item.Status_Name || '').trim(), { ALLOWED_TAGS: [] })
                    }));
                    const sortedData = sanitizedData.sort((a, b) =>
                        parseInt(a.RICEW_Status_Id) - parseInt(b.RICEW_Status_Id)
                    );
                    // Extract just the Status_Name for the autocomplete
                    setTableStatusLov(sortedData.map(item => item.Status_Name));
                }
            } catch (error) {
                console.error('Error fetching Table Status LOV:', error);
            }
        };
        fetchTableStatusLov();
    }, []);

    // Sync Select All checkbox with individual selections
    useEffect(() => {
        if (displayedData.length > 0 && selectedRows.length === displayedData.length) {
            setSelectAll(true);
        } else {
            setSelectAll(false);
        }
    }, [selectedRows, displayedData]);

    // Reset selection when data changes
    useEffect(() => {
        setSelectedRows([]);
        setSelectAll(false);
    }, [filteredData]);

    const handleSelectAll = (e) => {
        const isChecked = e.target.checked;
        setSelectAll(isChecked);
        if (isChecked) {
            setSelectedRows(displayedData.map(item => item.RICEWRequestFormId));
        } else {
            setSelectedRows([]);
        }
    };

    const showConfirmation = (message, action, onCancel) => {
        setConfirmMessage(message);
        setConfirmAction(() => action);
        setCancelAction(() => onCancel || null);
        setShowConfirmDialog(true);
    };

    const handleConfirmYes = () => {
        if (confirmAction) {
            confirmAction();
        }
        setShowConfirmDialog(false);
        setConfirmAction(null);
        setCancelAction(null);
        setConfirmMessage('');
    };

    const handleConfirmCancel = () => {
        if (cancelAction) {
            cancelAction();
        }
        setShowConfirmDialog(false);
        setConfirmAction(null);
        setCancelAction(null);
        setConfirmMessage('');
    };

    const handleSelectRow = (requestId) => {
        setSelectedRows(prev => {
            if (prev.includes(requestId)) {
                return prev.filter(id => id !== requestId);
            } else {
                return [...prev, requestId];
            }
        });
    };

    const handleApproval = async () => {
        if (selectedRows.length === 0) {
            setErrorMessage(`Please select at least one record to approve.`);
            setShowErrorMessage(true);
            setTimeout(() => {
                setShowErrorMessage(false);
                setErrorMessage('');
            }, 5000);
            return;
        }

        // Validation: Verify Functional and Technical Owners are present (Commented out)
        /*
        const invalidRecords = [];
        selectedRows.forEach(rowId => {
            const record = filteredData.find(item => item.RICEWRequestFormId === rowId);
            if (record) {
                const hasFunctional = record.Functional_Owner_Email && record.Functional_Owner_Email !== '-';
                const hasTechnical = record.Technical_Owner_Email && record.Technical_Owner_Email !== '-';

                if (!hasFunctional || !hasTechnical) {
                    invalidRecords.push({
                        name: record.RICEW_Name,
                        missing: [
                            !hasFunctional ? 'Functional Owner' : null,
                            !hasTechnical ? 'Technical Owner' : null
                        ].filter(Boolean)
                    });
                }
            }
        });

        if (invalidRecords.length > 0) {
            const errorText = invalidRecords.map(rec =>
                `• "${rec.name}" is missing ${rec.missing.join(' and ')}`
            ).join('\n');

            setErrorMessage(`Cannot approve records with missing mandatory information:\n\n${errorText}\n\nPlease click on the RICEW Name to update the owners before approving.`);
            setShowErrorMessage(true);
            setTimeout(() => {
                setShowErrorMessage(false);
                setErrorMessage('');
            }, 8000);
            return;
        }
        */

        showConfirmation(
            `Are you sure you want to approve ${selectedRows.length} ${selectedRows.length === 1 ? 'record' : 'records'}?`,
            async () => {
                try {
                    setIsUpdatingStatus(true);
                    let idToken;
                    try {
                        idToken = await getIdToken();
                    } catch (tokenError) {
                        handleAuthError(tokenError.message);
                        setErrorMessage('Session expired. Please log in again.');
                        setShowErrorMessage(true);
                        setIsUpdatingStatus(false);
                        return;
                    }

                    const sanitizedIds = selectedRows.map(id => DOMPurify.sanitize(String(id || '').trim(), { ALLOWED_TAGS: [] }));
                    const response = await fetch('https://7o6jl6k0pd.execute-api.ap-south-1.amazonaws.com/New/ricew-request-form/Approval-Dashboard/update-status', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${idToken}`
                        },
                        body: JSON.stringify({
                            RICEWRequestFormId: sanitizedIds,
                            RICEW_Status: DOMPurify.sanitize('Approved', { ALLOWED_TAGS: [] }),
                            updated_by: DOMPurify.sanitize('1', { ALLOWED_TAGS: [] })
                        })
                    });

                    if (response.status === 401 || response.status === 403) {
                        handleAuthError('Unauthorized - session expired');
                        setErrorMessage('Session expired. Please log in again.');
                        setShowErrorMessage(true);
                        setIsUpdatingStatus(false);
                        return;
                    }

                    const result = await response.json();
                    if (result.success) {
                        const count = selectedRows.length;
                        setSuccessMessage(`Successfully approved ${count} ${count === 1 ? 'record' : 'records'}.`);
                        setShowSuccessMessage(true);
                        setSelectedRows([]);
                        submitFilters(); // Refresh the table data
                        setTimeout(() => {
                            setShowSuccessMessage(false);
                            setSuccessMessage('');
                        }, 3000);
                    } else {
                        setErrorMessage(result.error || 'Failed to approve records.');
                        setShowErrorMessage(true);
                        setTimeout(() => {
                            setShowErrorMessage(false);
                            setErrorMessage('');
                        }, 5000);
                    }
                } catch (error) {
                    console.error('Error approving records:', error);
                    setErrorMessage('An error occurred while approving records.');
                    setShowErrorMessage(true);
                    setTimeout(() => {
                        setShowErrorMessage(false);
                        setErrorMessage('');
                    }, 5000);
                } finally {
                    setIsUpdatingStatus(false);
                }
            }
        );
    };

    const handleRejected = async () => {
        if (selectedRows.length === 0) {
            setErrorMessage(`Please select at least one record to reject.`);
            setShowErrorMessage(true);
            setTimeout(() => {
                setShowErrorMessage(false);
                setErrorMessage('');
            }, 5000);
            return;
        }

        showConfirmation(
            `Are you sure you want to reject ${selectedRows.length} ${selectedRows.length === 1 ? 'record' : 'records'}?`,
            async () => {
                try {
                    setIsUpdatingStatus(true);
                    let idToken;
                    try {
                        idToken = await getIdToken();
                    } catch (tokenError) {
                        handleAuthError(tokenError.message);
                        setErrorMessage('Session expired. Please log in again.');
                        setShowErrorMessage(true);
                        setIsUpdatingStatus(false);
                        return;
                    }

                    const sanitizedIds = selectedRows.map(id => DOMPurify.sanitize(String(id || '').trim(), { ALLOWED_TAGS: [] }));
                    const response = await fetch('https://7o6jl6k0pd.execute-api.ap-south-1.amazonaws.com/New/ricew-request-form/Approval-Dashboard/update-status', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${idToken}`
                        },
                        body: JSON.stringify({
                            RICEWRequestFormId: sanitizedIds,
                            RICEW_Status: DOMPurify.sanitize('Rejected', { ALLOWED_TAGS: [] }),
                            updated_by: DOMPurify.sanitize('1', { ALLOWED_TAGS: [] })
                        })
                    });

                    if (response.status === 401 || response.status === 403) {
                        handleAuthError('Unauthorized - session expired');
                        setErrorMessage('Session expired. Please log in again.');
                        setShowErrorMessage(true);
                        setIsUpdatingStatus(false);
                        return;
                    }

                    const result = await response.json();
                    if (result.success) {
                        const count = selectedRows.length;
                        setSuccessMessage(`Successfully rejected ${count} ${count === 1 ? 'record' : 'records'}.`);
                        setShowSuccessMessage(true);
                        setSelectedRows([]);
                        submitFilters(); // Refresh the table data
                        setTimeout(() => {
                            setShowSuccessMessage(false);
                            setSuccessMessage('');
                        }, 3000);
                    } else {
                        setErrorMessage(result.error || 'Failed to reject records.');
                        setShowErrorMessage(true);
                        setTimeout(() => {
                            setShowErrorMessage(false);
                            setErrorMessage('');
                        }, 5000);
                    }
                } catch (error) {
                    console.error('Error rejecting records:', error);
                    setErrorMessage('An error occurred while rejecting records.');
                    setShowErrorMessage(true);
                    setTimeout(() => {
                        setShowErrorMessage(false);
                        setErrorMessage('');
                    }, 5000);
                } finally {
                    setIsUpdatingStatus(false);
                }
            }
        );
    };

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



    // Restore dashboard state from localStorage on component mount
    useEffect(() => {
        const savedState = localStorage.getItem('ricewApprovalDashboardState');
        if (savedState) {
            try {
                const dashboardState = JSON.parse(savedState);
                setTableSearchText(dashboardState.tableSearchText || '');
                localStorage.removeItem('ricewApprovalDashboardState');

                // Always call API fresh when returning
                submitFilters();
            } catch (error) {
                console.error('Error restoring dashboard state:', error);
                localStorage.removeItem('ricewApprovalDashboardState');
                submitFilters();
            }
        } else {
            // If no saved state, fetch all records by default
            submitFilters();
        }
    }, [selectedProject]); // Re-fetch only if project changes or on mount


    const handleSearchChange = (value) => {
        const maxLength = 100;
        if (value.length > maxLength) {
            const truncatedValue = value.substring(0, maxLength);
            setTableSearchText(truncatedValue);
            setSearchError(`Search Result cannot exceed ${maxLength} characters`);
            return;
        }
        setTableSearchText(value);
        setSearchError('');
    };

    const submitFilters = () => {
        console.log('=== FETCHING PENDING APPROVALS ===');
        setLoading(true);

        const projectId = localStorage.getItem('project_id') || selectedProject?.id;
        const apiUrl = `https://7o6jl6k0pd.execute-api.ap-south-1.amazonaws.com/New/ricew-request-form/Approval-Dashboard/getPendingApprovals?projectId=${projectId}`;

        getIdToken()
            .then(idToken => {
                const headers = { 'Content-Type': 'application/json' };
                if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
                return fetch(apiUrl, { headers: headers });
            })
            .then(response => response.json())
            .then(data => {
                setLoading(false);
                if (data.success && data.data) {
                    // Map data to handle any nested fields if necessary
                    const mappedData = data.data.map(item => ({
                        ...item,
                        // Extract email fields from potential nested objects (DynamoDB format)
                        Business_Owner_Email: item.Business_Owner_Email?.S || item.Business_Owner_Email || '',
                        Functional_Owner_Email: item.Functional_Owner_Email?.S || item.Functional_Owner_Email || '',
                        Technical_Owner_Email: item.Technical_Owner_Email?.S || item.Technical_Owner_Email || ''
                    }));

                    // Sort the data based on RICEWRequestFormId (latest/largest first)
                    const sortedData = mappedData.sort((a, b) => {
                        const idA = parseInt(a.RICEWRequestFormId) || 0;
                        const idB = parseInt(b.RICEWRequestFormId) || 0;
                        return idB - idA;
                    });
                    setFilteredData(sortedData);
                } else {
                    setFilteredData([]);
                    if (data.success) {
                        setErrorMessage('No pending approval records found.');
                        setShowErrorMessage(true);
                        setTimeout(() => {
                            setShowErrorMessage(false);
                            setErrorMessage('');
                        }, 5000);
                    }
                }
            })
            .catch(error => {
                setLoading(false);
                console.error('Error fetching pending approvals:', error);
                setFilteredData([]);
            });
    };

    const handleViewDetails = async (requestId) => {
        // Save current dashboard state to localStorage before navigating
        const dashboardState = {
            tableSearchText
        };
        localStorage.setItem('ricewApprovalDashboardState', JSON.stringify(dashboardState));

        try {
            let idToken;
            try {
                idToken = await getIdToken();
            } catch (tokenError) {
                handleAuthError(tokenError.message);
                alert('Session expired. Please log in again.');
                return;
            }

            const sanitizedRequestId = DOMPurify.sanitize(String(requestId || '').trim(), { ALLOWED_TAGS: [] });
            const apiUrl = `https://7o6jl6k0pd.execute-api.ap-south-1.amazonaws.com/New/ricew/get/byRICEWRequestFormId?RICEWRequestFormId=${sanitizedRequestId}`;
            const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` };

            const response = await fetch(apiUrl, { headers: headers });

            if (response.status === 401 || response.status === 403) {
                handleAuthError('Unauthorized - session expired');
                alert('Session expired. Please log in again.');
                return;
            }

            const result = await response.json();

            if (result.success && result.data) {
                localStorage.setItem('ricewFormData', JSON.stringify(result.data));
                navigate(`/dashboard/ricew-dashboard/RICEW-request/edit/${sanitizedRequestId}?from=approval`);
            } else {
                console.error('Failed to fetch RICEW request data:', result);
                alert('Failed to load RICEW request data. Please try again.');
            }
        } catch (error) {
            console.error('Error fetching RICEW request data:', error);
            alert('Error loading RICEW request data. Please try again.');
        }
    };

    const handleEditStatus = (item) => {
        setEditingRowId(item.RICEWRequestFormId);
        setTempStatus(item.RICEW_Status || '');
    };

    const handleCancelStatusEdit = () => {
        setEditingRowId(null);
        setTempStatus('');
    };

    const handleSaveStatus = async (item) => {
        if (!tempStatus) return;

        setIsUpdatingStatus(true);
        try {
            let idToken;
            try {
                idToken = await getIdToken();
            } catch (tokenError) {
                handleAuthError(tokenError.message);
                setErrorMessage('Session expired. Please log in again.');
                setShowErrorMessage(true);
                setIsUpdatingStatus(false);
                return;
            }

            const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` };

            const updateUrl = 'https://7o6jl6k0pd.execute-api.ap-south-1.amazonaws.com/New/ricew-request-form/Approval-Dashboard/update-status';
            const sanitizedId = DOMPurify.sanitize(String(item.RICEWRequestFormId || '').trim(), { ALLOWED_TAGS: [] });
            const sanitizedStatus = DOMPurify.sanitize(String(tempStatus || '').trim(), { ALLOWED_TAGS: [] });

            const updateResponse = await fetch(updateUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    ids: sanitizedId,
                    RICEW_Status: sanitizedStatus
                })
            });

            if (updateResponse.status === 401 || updateResponse.status === 403) {
                handleAuthError('Unauthorized - session expired');
                setErrorMessage('Session expired. Please log in again.');
                setShowErrorMessage(true);
                setIsUpdatingStatus(false);
                return;
            }

            const updateResult = await updateResponse.json();
            if (updateResult.success || updateResponse.ok) {
                // Update local state
                setFilteredData(prev =>
                    prev.map(row =>
                        row.RICEWRequestFormId === item.RICEWRequestFormId
                            ? { ...row, RICEW_Status: tempStatus }
                            : row
                    )
                );
                setEditingRowId(null);
                setSuccessMessage('Status updated successfully!');
                setShowSuccessMessage(true);
                setTimeout(() => setShowSuccessMessage(false), 3000);
            } else {
                setErrorMessage(updateResult.error || 'Failed to update status');
                setShowErrorMessage(true);
                setTimeout(() => setShowErrorMessage(false), 5000);
            }
        } catch (error) {
            console.error('Error updating status:', error);
            setErrorMessage('Error updating status. Please try again.');
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 5000);
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const [maxWidth, setMaxWidth] = useState('1400px');
    const [marginRight, setMarginRight] = useState('30px');
    const [paddingBottom, setPaddingBottom] = useState('10px');

    useEffect(() => {
        const handleZoomChange = () => {
            const zoomLevel = Math.round((window.outerWidth / window.innerWidth) * 100);
            if (zoomLevel <= 60) {
                setMaxWidth('2400px');
                setMarginRight('80px');
            } else if (zoomLevel <= 80) {
                setMaxWidth('1800px');
                setMarginRight('50px');
            } else {
                setMaxWidth('1500px');
                setMarginRight('0px');
            }

            // Base padding plus extra padding if we are editing a row
            // this ensures the LOV is always visible and the page becomes scrollable
            if (editingRowId) {
                setPaddingBottom('150px');
            } else {
                setPaddingBottom('10px');
            }
        };
        window.addEventListener('resize', handleZoomChange);
        handleZoomChange();
        return () => window.removeEventListener('resize', handleZoomChange);
    }, [editingRowId]);


    return (
        <div className="config-main" style={{ minHeight: '80vh', width: 'calc(98% - 2rem)', margin: '2rem auto', marginLeft: '2rem', marginRight: '2rem', paddingBottom: paddingBottom, overflowY: 'visible' }}>
            <div className="dashboard-content" style={{ width: '100%', maxWidth: 'none', margin: '0', padding: '0' }}>

                {/* Project Info */}
                <div style={{ padding: '2rem 1rem 1rem 2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project : <span style={{ color: '#007bff' }}>{localStorage.getItem('project_name') || selectedProject?.name}</span></h3>
                    </div>
                </div>

                <div className="config-header" style={{
                    marginTop: '0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 2rem'
                }}>
                    <h2 style={{ margin: 0 }}>RICEW Approval Dashboard</h2>
                    
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <button
                            onClick={() => setShowHelpPopup(!showHelpPopup)}
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
                                transition: 'all 0.2s ease',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3d495c'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4D5C74'}
                        >
                            <HelpCircle size={18} />
                            Help
                        </button>

                        {/* Help Modal Overlay */}
                        {showHelpPopup && (
                            <div style={{
                                position: 'fixed',
                                top: '0',
                                left: '0',
                                right: '0',
                                bottom: '0',
                                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 30000,
                                padding: '20px'
                            }}>
                                <div
                                    ref={helpPopupRef}
                                    style={{
                                        backgroundColor: 'white',
                                        borderRadius: '12px',
                                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                                        width: '100%',
                                        maxWidth: '800px',
                                        maxHeight: '90vh',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        position: 'relative'
                                    }}
                                >
                                    <div className="help-modal-scroll" style={{
                                        overflowY: 'auto',
                                        padding: '32px',
                                        textAlign: 'left',
                                        flex: '1'
                                    }}>
                                        <button
                                            onClick={() => setShowHelpPopup(false)}
                                            style={{
                                                position: 'absolute',
                                                top: '16px',
                                                right: '16px',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: '#dc3545'
                                            }}
                                        >
                                            <X size={20} />
                                        </button>
                                        <h3 style={{
                                            margin: '0 0 16px 0',
                                            color: '#333',
                                            fontSize: '18px',
                                            fontWeight: '600'
                                        }}>
                                            Help & Information
                                        </h3>
                                        <div style={{ color: '#444', fontSize: '14px', lineHeight: '1.6' }}>
                                            <div style={{ marginBottom: '16px' }}>
                                                <strong style={{ color: '#1f2937', fontSize: '15px' }}>What is this page?</strong>
                                                <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                                                    The <strong>Approval Dashboard</strong> lets you review and manage pending RICEW requests for the selected project. You can approve or reject these requests to progress them to the next stage.
                                                </p>
                                            </div>

                                            <div style={{ marginBottom: '16px' }}>
                                                <strong style={{ color: '#1f2937', fontSize: '15px' }}>Why is this used?</strong>
                                                <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                                                    This dashboard provides a centralized view for project managers or approvers to track RICEW items that require their approval. It ensures that all RICEW items are reviewed before proceeding with development.
                                                </p>
                                            </div>

                                            <div style={{ marginBottom: '16px' }}>
                                                <strong style={{ color: '#1f2937', fontSize: '15px' }}>Understanding the columns</strong>
                                                <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                                    <li><strong>RICEW Name</strong> — The name of the RICEW request. Click it to view full details.</li>
                                                    <li><strong>RICEW Type</strong> — The type of the RICEW item (e.g., Report, Interface, Conversion).</li>
                                                    <li><strong>RICEW Status</strong> — The current status of the request (e.g., Pending Approval).</li>
                                                    <li><strong>Process Stream</strong> — The business process stream related to the request.</li>
                                                    <li><strong>RICEW Effort (Hours)</strong> — Estimated effort in hours for the RICEW item.</li>
                                                    <li><strong>RICEW Cost</strong> — Estimated cost for the RICEW item.</li>
                                                    <li><strong>Select</strong> — Checkbox to select the item for bulk approval or rejection.</li>
                                                </ul>
                                            </div>

                                            <div style={{ marginBottom: '16px' }}>
                                                <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to make changes</strong>
                                                <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                                    <li>Select the checkbox for one or more records in the table.</li>
                                                    <li>Click the <strong>Approve</strong> or <strong>Reject</strong> button at the top to update their status.</li>
                                                    <li>You can also click on the <strong>RICEW Name</strong> to open the detailed form and review all information before making a decision.</li>
                                                    <li>Use the <strong>Search</strong> box to find specific RICEW items by name.</li>
                                                </ul>
                                            </div>

                                            <div style={{ marginBottom: '4px' }}>
                                                <strong style={{ color: '#1f2937', fontSize: '15px' }}>Important notes</strong>
                                                <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                                                    <li>A project must be selected to view pending approvals. If no project is selected, go to the <strong>Project Definition Form</strong> first.</li>
                                                    <li>Ensure all mandatory information is present in the RICEW request before approving.</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Filter Section (Hidden) */}
                {/* Filters were here */}

                {/* Search and Action Section */}
                <div style={{
                    padding: '1rem 1rem 1rem 2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'white',
                    borderTop: '1px solid #f0f0f0'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontSize: '14px', color: '#495057', fontWeight: '600' }}>Search Results :</span>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '10px', color: '#666', pointerEvents: 'none' }}>
                                <circle cx="11" cy="11" r="8" />
                                <path d="m21 21-4.35-4.35" />
                            </svg>
                            <input
                                type="text"
                                value={tableSearchText}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                placeholder="Search by RICEW Name..."
                                style={{ padding: '8px 12px 8px 32px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', width: '250px', outline: 'none' }}
                            />
                        </div>
                        {searchError && (
                            <div style={{ color: '#dc2626', fontSize: '14px', fontWeight: '500', padding: '8px 12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '4px' }}>
                                {searchError}
                            </div>
                        )}
                    </div>

                    {/* Bulk Actions moved here */}
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                            onClick={handleRejected}
                            disabled={isUpdatingStatus}
                            style={{
                                padding: '8px 20px',
                                backgroundColor: isUpdatingStatus ? '#f8d7da' : '#dc3545',
                                color: isUpdatingStatus ? '#721c24' : 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: isUpdatingStatus ? 'not-allowed' : 'pointer',
                                fontSize: '13px',
                                fontWeight: '600',
                                transition: 'background-color 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                            onMouseEnter={(e) => { if (!isUpdatingStatus) e.target.style.backgroundColor = '#c82333'; }}
                            onMouseLeave={(e) => { if (!isUpdatingStatus) e.target.style.backgroundColor = '#dc3545'; }}
                        >
                            {isUpdatingStatus && <Loader2 size={14} className="animate-spin" />}
                            Reject
                        </button>
                        <button
                            onClick={handleApproval}
                            disabled={isUpdatingStatus}
                            style={{
                                padding: '8px 20px',
                                backgroundColor: isUpdatingStatus ? '#d4edda' : '#28a745',
                                color: isUpdatingStatus ? '#155724' : 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: isUpdatingStatus ? 'not-allowed' : 'pointer',
                                fontSize: '13px',
                                fontWeight: '600',
                                transition: 'background-color 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                            onMouseEnter={(e) => { if (!isUpdatingStatus) e.target.style.backgroundColor = '#218838'; }}
                            onMouseLeave={(e) => { if (!isUpdatingStatus) e.target.style.backgroundColor = '#28a745'; }}
                        >
                            {isUpdatingStatus && <Loader2 size={14} className="animate-spin" />}
                            Approve
                        </button>
                    </div>
                </div>

                {/* Unified Scrollable Table Container */}
                <div style={{ backgroundColor: '#f8f9fa', overflowX: 'auto', width: '100%', boxSizing: 'border-box' }}>
                    {/* Single inner wrapper: ALL rows share this — no per-row padding so they always scroll in sync */}
                    <div style={{ minWidth: '1430px', boxSizing: 'border-box' }}>
                        {/* Grouped Header Row for Ownership Information */}
                        {/* 
                        <div style={{ display: 'flex', backgroundColor: '#fff' }}>
                            <div style={{ flex: 1, minWidth: '170px' }}></div>
                            <div style={{ flex: 1, minWidth: '120px' }}></div>
                            <div style={{ flex: 1, minWidth: '170px' }}></div>
                            <div style={{ flex: 1, minWidth: '140px' }}></div>
                            <div style={{ flex: 1, minWidth: '150px' }}></div>
                            <div style={{ flex: 1, minWidth: '150px' }}></div>
                            <div style={{
                                padding: '12px 12px',
                                fontWeight: 'bold',
                                fontSize: '14px',
                                color: '#333',
                                textAlign: 'center',
                                backgroundColor: '#f8f9fa',
                                borderLeft: '1px solid #ddd',
                                borderRight: '1px solid #ddd',
                                borderTop: '1px solid #ddd',
                                width: '720px',
                                flex: '0 0 720px'
                            }}>
                                Ownership (Project Track) Informaiton
                            </div>
                            <div style={{ width: '100px' }}></div>
                        </div>
                        */}

                        {/* Table Header Row */}
                        <div style={{ display: 'flex', borderBottom: '1px solid #ddd', borderTop: '1px solid #ddd' }}>
                            <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '170px' }}>RICEW Name</div>
                            <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '120px' }}>RICEW Type</div>
                            <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '170px' }}>RICEW Status</div>
                            <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '140px' }}>Process Stream</div>
                            <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '150px' }}>RICEW Effort (Hours)</div>
                            <div style={{ flex: 1, padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd', minWidth: '150px' }}>RICEW Cost</div>
                            {/* 
                            <div style={{ width: '240px', flex: '0 0 240px', padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd' }}>Business Owner</div>
                            <div style={{ width: '240px', flex: '0 0 240px', padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd' }}>Functional Owner</div>
                            <div style={{ width: '240px', flex: '0 0 240px', padding: '12px 12px', fontWeight: 'bold', fontSize: '14px', color: '#333', borderRight: '1px solid #ddd' }}>Technical Owner</div>
                            */}
                            <div style={{
                                width: '100px',
                                padding: '12px 12px',
                                fontWeight: 'bold',
                                fontSize: '14px',
                                color: '#333',
                                textAlign: 'center',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                                <div style={{ lineHeight: '1.2', whiteSpace: 'nowrap' }}>Select</div>
                                <input
                                    type="checkbox"
                                    checked={selectAll}
                                    onChange={handleSelectAll}
                                    style={{
                                        cursor: 'pointer',
                                        width: '18px',
                                        height: '18px',
                                        marginTop: '2px'
                                    }}
                                    title="Select All"
                                />
                            </div>
                        </div>

                        {/* Table Body Rows */}
                        {displayedData.length > 0 ? (
                            displayedData.map((item, index) => {
                                const rowBgColor = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
                                return (
                                    <div key={item.RICEWRequestFormId || index} style={{ display: 'flex', backgroundColor: rowBgColor, borderBottom: '1px solid #ddd' }}>
                                        <div
                                            style={{ flex: 1, padding: '12px 12px', fontSize: '13px', color: '#3b82f6', borderRight: '1px solid #ddd', minWidth: '170px', fontWeight: '500', cursor: 'pointer' }}
                                            onClick={() => handleViewDetails(item.RICEWRequestFormId)}
                                            onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                            onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                                        >
                                            {item.RICEW_Name || '-'}
                                        </div>
                                        <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', color: '#333', borderRight: '1px solid #ddd', minWidth: '120px' }}>{item.RICEW_Type || '-'}</div>
                                        <div style={{
                                            flex: 1,
                                            padding: '12px 12px',
                                            fontSize: '13px',
                                            color: '#333',
                                            borderRight: '1px solid #ddd',
                                            minWidth: '170px',
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            position: 'relative'
                                        }}>
                                            {editingRowId === item.RICEWRequestFormId ? (
                                                <StatusAutocomplete
                                                    value={tempStatus}
                                                    options={tableStatusLov}
                                                    onChange={(val) => setTempStatus(val)}
                                                    isUpdating={isUpdatingStatus}
                                                />
                                            ) : (
                                                <span style={{
                                                    padding: '4px 10px',
                                                    borderRadius: '12px',
                                                    fontSize: '11px',
                                                    fontWeight: '700',
                                                    backgroundColor: '#dbeafe',
                                                    color: '#1e40af',
                                                    border: '1px solid #bfdbfe',
                                                    textTransform: 'uppercase'
                                                }}>
                                                    {item.RICEW_Status || '-'}
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', color: '#333', borderRight: '1px solid #ddd', minWidth: '140px' }}>{item.GI_Process_Stream || '-'}</div>
                                        <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', color: '#333', borderRight: '1px solid #ddd', minWidth: '150px' }}>{item.RICEW_Effort_Hours || '-'}</div>
                                        <div style={{ flex: 1, padding: '12px 12px', fontSize: '13px', color: '#333', borderRight: '1px solid #ddd', minWidth: '150px' }}>
                                            {(() => {
                                                if (!item.RICEW_Cost || item.RICEW_Cost === '-') return '-';

                                                // Remove parentheses and clean up extra spaces
                                                const cleanValue = item.RICEW_Cost.replace(/[()]/g, '').trim();
                                                const parts = cleanValue.split(/\s+/);

                                                if (parts.length === 2) {
                                                    // Detect which part is the number
                                                    const isFirstNumeric = !isNaN(parseFloat(parts[0])) && isFinite(parts[0].replace(/,/g, ''));
                                                    const amount = isFirstNumeric ? parts[0] : parts[1];
                                                    const currency = isFirstNumeric ? parts[1] : parts[0];

                                                    return `${amount} (${currency})`;
                                                }
                                                return item.RICEW_Cost;
                                            })()}
                                        </div>
                                        {/* 
                                        <div style={{ width: '240px', flex: '0 0 240px', padding: '12px 12px', fontSize: '13px', color: '#333', borderRight: '1px solid #ddd', wordBreak: 'break-all', whiteSpace: 'normal', overflowWrap: 'anywhere' }}>{item.Business_Owner_Email || '-'}</div>
                                        <div style={{ width: '240px', flex: '0 0 240px', padding: '12px 12px', fontSize: '13px', color: '#333', borderRight: '1px solid #ddd', wordBreak: 'break-all', whiteSpace: 'normal', overflowWrap: 'anywhere' }}>{item.Functional_Owner_Email || '-'}</div>
                                        <div style={{ width: '240px', flex: '0 0 240px', padding: '12px 12px', fontSize: '13px', color: '#333', borderRight: '1px solid #ddd', wordBreak: 'break-all', whiteSpace: 'normal', overflowWrap: 'anywhere' }}>{item.Technical_Owner_Email || '-'}</div>
                                        */}
                                        <div style={{
                                            width: '100px',
                                            padding: '8px 12px',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center'
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedRows.includes(item.RICEWRequestFormId)}
                                                onChange={() => handleSelectRow(item.RICEWRequestFormId)}
                                                style={{
                                                    cursor: 'pointer',
                                                    width: '18px',
                                                    height: '18px'
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#666', fontSize: '14px', borderTop: 'none' }}>
                                {filteredData.length === 0 ? 'No RICEW requests found.' : `No search results found for "${tableSearchText}".`}
                            </div>
                        )}
                    </div>{/* end inner minWidth wrapper */}
                </div>

                {/* Table container ends */}
            </div>

            {/* Confirmation Dialog (Matched with RosterMassUploadForm styles) */}
            {showConfirmDialog && (
                <div style={{
                    position: 'fixed',
                    top: '0',
                    left: '0',
                    right: '0',
                    bottom: '0',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 20000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '24px',
                        borderRadius: '8px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                        maxWidth: '400px',
                        width: '90%',
                        textAlign: 'center'
                    }}>
                        <h3 style={{
                            margin: '0 0 16px 0',
                            color: '#333',
                            fontSize: '18px',
                            fontWeight: '600'
                        }}>
                            Confirmation
                        </h3>
                        <p style={{
                            margin: '0 0 24px 0',
                            color: '#666',
                            fontSize: '14px',
                            lineHeight: '1.6',
                            whiteSpace: 'pre-line',
                            textAlign: 'center'
                        }}>
                            {confirmMessage}
                        </p>
                        <div style={{
                            display: 'flex',
                            gap: '12px',
                            justifyContent: 'center'
                        }}>
                            <button
                                onClick={handleConfirmCancel}
                                style={{
                                    backgroundColor: '#6b7280',
                                    color: 'white',
                                    border: 'none',
                                    padding: '10px 24px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '16px',
                                    fontWeight: '500',
                                    minWidth: '100px',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#4b5563'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = '#6b7280'}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmYes}
                                style={{
                                    backgroundColor: '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    padding: '10px 24px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '16px',
                                    fontWeight: '500',
                                    minWidth: '100px',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
                            >
                                Yes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Loading Overlay */}
            {(loading || isUpdatingStatus) && (
                <div style={{
                    position: 'fixed',
                    top: '0',
                    left: '0',
                    right: '0',
                    bottom: '0',
                    //backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 15000
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

            {/* Success Message Popup */}
            {showSuccessMessage && (
                <div style={{
                    position: 'fixed',
                    top: '20px',
                    right: '20px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    padding: '12px 20px',
                    borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 10000,
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    animation: 'slideIn 0.3s ease-out'
                }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22,4 12,14.01 9,11.01" />
                    </svg>
                    {successMessage}
                </div>
            )}

            {/* Error Message Popup */}
            {showErrorMessage && (
                <div style={{
                    position: 'fixed',
                    top: '20px',
                    right: '20px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    padding: '16px 20px',
                    borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 10000,
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    animation: 'slideIn 0.3s ease-out',
                    maxWidth: '500px',
                    wordWrap: 'break-word'
                }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                        <circle cx="12" cy="12" r="10" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    <div style={{ whiteSpace: 'pre-line', lineHeight: '1.5' }}>
                        {errorMessage}
                    </div>
                </div>
            )}

            <style>{`
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                    .animate-spin {
                        animation: spin 1s linear infinite;
                    }
                    @keyframes slideIn {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                    .help-modal-scroll::-webkit-scrollbar {
                        width: 4px;
                    }
                    .help-modal-scroll::-webkit-scrollbar-track {
                        background: transparent;
                        margin: 8px 0;
                    }
                    .help-modal-scroll::-webkit-scrollbar-thumb {
                        background: #cbd5e1;
                        border-radius: 4px;
                    }
                    .help-modal-scroll::-webkit-scrollbar-thumb:hover {
                        background: #94a3b8;
                    }
                `}</style>

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
        </div>
    );
};

export default ApprovalDashbord;
