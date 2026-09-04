import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, AlertCircle, HelpCircle, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import DOMPurify from 'dompurify';
import { downloadRICEWTemplate, parseRICEWTemplate } from '../../utils/excelTemplateUtils';
import { getIdToken } from '../../utils/cognito-auth';
import { useSession } from '../../context/SessionContext';

// Helper function to format RICEW Cost strings like "USD 130" or "(INR) (946.78)" into "130 (USD)"
const formatRicewCost = (costStr) => {
  if (!costStr || costStr === '-') return costStr;

  // Remove all parentheses and trim
  const cleanStr = costStr.replace(/[()]/g, ' ').trim();

  // Split by whitespace and filter empty strings
  const parts = cleanStr.split(/\s+/).filter(Boolean);

  let amount = '';
  let currency = '';

  parts.forEach(part => {
    // Check if it's a number (allowing for decimals and commas)
    const numericPart = part.replace(/,/g, '');
    if (numericPart.length > 0 && !isNaN(numericPart) && !isNaN(parseFloat(numericPart))) {
      amount = numericPart;
    } else if (part.length > 0) {
      currency = part;
    }
  });

  if (amount && currency) {
    return `${amount} (${currency})`;
  } else if (amount) {
    return amount;
  } else if (currency) {
    return currency;
  }

  return costStr;
};

const NewRicewDashboard = ({ onClose, onBackToLanding, onLogout, selectedProject }) => {
  const { handleAuthError } = useSession();
  const navigate = useNavigate();
  const [showNoProjectSelectedPopup, setShowNoProjectSelectedPopup] = useState(false);

  useEffect(() => {
    const projectId = localStorage.getItem('project_id');
    if (!selectedProject?.id && !projectId) {
      setShowNoProjectSelectedPopup(true);
    }
  }, [selectedProject?.id]);

  const [filterText, setFilterText] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({
    // Row 1 - RICEW Filters
    ricewName: false,
    ricewType: false,
    rolloutName: false,
    waveName: false,
    legalEntityName: false,
    technicalOwnerName: false,
    functionalOwnerName: false,
    businessOwnerName: false,
    ricewStatus: false,
    // Row 2 - GI and CS Filters
    giProcessStream: false,
    giApplication: false,
    giL0Process: false,
    giModule: false,
    csProcessStream: false,
    csApplication: false,
    csL0Process: false,
    csModule: false
  });

  const [lovData, setLovData] = useState({
    // Row 1 - RICEW Filters
    ricewName: [],
    ricewStatus: [],
    ricewType: [],
    rolloutName: [],
    waveName: [],
    legalEntityName: [],
    technicalOwnerName: [],
    functionalOwnerName: [],
    businessOwnerName: [],
    // Row 2 - GI and CS Filters
    giProcessStream: [],
    giApplication: [],
    giL0Process: [],
    giModule: [],
    csProcessStream: [],
    csApplication: [],
    csL0Process: [],
    csModule: []
  });

  const [lovLoading, setLovLoading] = useState(true);
  const [filteredData, setFilteredData] = useState([]);
  const [lovError, setLovError] = useState(null);
  const [tableSearchText, setTableSearchText] = useState('');
  const [searchError, setSearchError] = useState('');
  const [openDropdown, setOpenDropdown] = useState(null);

  // Message and confirmation states
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(false);

  // Computed filtered data that includes search filtering
  const displayedData = filteredData.filter(item => {
    if (!tableSearchText.trim()) return true;
    const searchTerm = tableSearchText.toLowerCase();

    // Search the RICEW_Name field from table data
    const ricewName = (item.RICEW_Name || '').toLowerCase();

    return ricewName.includes(searchTerm);
  });

  const [selectedValues, setSelectedValues] = useState({
    // Row 1 - RICEW Filters
    ricewName: [],
    ricewStatus: [],
    ricewType: [],
    rolloutName: [],
    waveName: [],
    legalEntityName: [],
    technicalOwnerName: [],
    functionalOwnerName: [],
    businessOwnerName: [],
    // Row 2 - GI and CS Filters
    giProcessStream: [],
    giApplication: [],
    giL0Process: [],
    giModule: [],
    csProcessStream: [],
    csApplication: [],
    csL0Process: [],
    csModule: []
  });

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const target = event.target;

      // Check if click is on a filter button or inside a dropdown
      const isFilterButton = target.closest('[data-filter-button]');
      const isDropdownOption = target.closest('[data-dropdown-option]');
      const isDropdownCheckbox = target.closest('input[type="checkbox"]');

      // Check if click is inside any dropdown container (including scrollbar area)
      const isInsideDropdown = target.closest('div[style*="overflowY"]') ||
        target.closest('div[style*="position: absolute"]');

      // Only close if click is NOT on a filter button, dropdown option, checkbox, or inside dropdown
      if (!isFilterButton && !isDropdownOption && !isDropdownCheckbox && !isInsideDropdown) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch LOV data for Row 1 RICEW filters
  useEffect(() => {
    const fetchLovData = async () => {
      try {
        setLovLoading(true);
        let idToken;
        try {
          idToken = await getIdToken();
        } catch (tokenError) {
          handleAuthError(tokenError.message);
          setLovLoading(false);
          return;
        }

        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        };

        const projectId = DOMPurify.sanitize(String(localStorage.getItem('project_id') || selectedProject?.id || '101').trim(), { ALLOWED_TAGS: [] });
        const response = await fetch(
          `https://7o6jl6k0pd.execute-api.ap-south-1.amazonaws.com/New/filter/ricew/first/ricew-request-lov?projectId=${projectId}`,
          { headers: headers }
        );

        if (response.status === 401 || response.status === 403) {
          handleAuthError('Unauthorized - session expired');
          setLovLoading(false);
          return;
        }

        const result = await response.json();

        if (result.success && result.data) {
          const sanitizeArray = (arr) => arr.map(item => DOMPurify.sanitize(String(item || '').trim(), { ALLOWED_TAGS: [] }));
          setLovData(prev => ({
            ...prev,
            ricewName: sanitizeArray(result.data.RICEW_Name || []),
            ricewStatus: sanitizeArray(result.data.RICEW_Status || []),
            ricewType: sanitizeArray(result.data.RICEW_Type || []),
            rolloutName: sanitizeArray(result.data.Rollout_Name || []),
            waveName: sanitizeArray(result.data.Wave_Name || []),
            legalEntityName: sanitizeArray(result.data.Legal_Entity_Name || []),
            technicalOwnerName: sanitizeArray(result.data.Technical_Owner_Name || []),
            functionalOwnerName: sanitizeArray(result.data.Functional_Owner_Name || []),
            businessOwnerName: sanitizeArray(result.data.Business_Owner_Name || [])
          }));
        }
        setLovLoading(false);
      } catch (error) {
        console.error('Error fetching RICEW LOV data:', error);
        setLovError(error.message);
        setLovLoading(false);
      }
    };

    if (selectedProject?.id) {
      fetchLovData();
    }
  }, [selectedProject?.id]);

  // Fetch LOV data for Row 2 GI/CS filters
  useEffect(() => {
    const fetchLovDataRow2 = async () => {
      try {
        console.log('Fetching Row 2 RICEW LOV data...');
        let idToken;
        try {
          idToken = await getIdToken();
        } catch (tokenError) {
          handleAuthError(tokenError.message);
          return;
        }

        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        };

        const projectId = DOMPurify.sanitize(String(localStorage.getItem('project_id') || selectedProject?.id || '101').trim(), { ALLOWED_TAGS: [] });
        const response = await fetch(
          `https://7o6jl6k0pd.execute-api.ap-south-1.amazonaws.com/New/filter/ricew/second/ricew-request-lov?projectId=${projectId}`,
          { headers: headers }
        );

        if (response.status === 401 || response.status === 403) {
          handleAuthError('Unauthorized - session expired');
          return;
        }

        const result = await response.json();

        console.log('Row 2 RICEW LOV API Response:', result);

        if (result.success && result.data) {
          const sanitizeArray = (arr) => arr.map(item => DOMPurify.sanitize(String(item || '').trim(), { ALLOWED_TAGS: [] }));
          console.log('Row 2 RICEW LOV Data received:', {
            giProcessStream: result.data.GI_Process_Stream?.length || 0,
            giApplication: result.data.GI_Application?.length || 0,
            giL0Process: result.data.GI_L0_Process?.length || 0,
            giModule: result.data.GI_Module?.length || 0,
            csProcessStream: result.data.CS_Process_Stream?.length || 0,
            csApplication: result.data.CS_Application?.length || 0,
            csL0Process: result.data.CS_L0_Process?.length || 0,
            csModule: result.data.CS_Module?.length || 0
          });

          setLovData(prev => ({
            ...prev,
            giProcessStream: sanitizeArray(result.data.GI_Process_Stream || []),
            giApplication: sanitizeArray(result.data.GI_Application || []),
            giL0Process: sanitizeArray(result.data.GI_L0_Process || []),
            giModule: sanitizeArray(result.data.GI_Module || []),
            csProcessStream: sanitizeArray(result.data.CS_Process_Stream || []),
            csApplication: sanitizeArray(result.data.CS_Application || []),
            csL0Process: sanitizeArray(result.data.CS_L0_Process || []),
            csModule: sanitizeArray(result.data.CS_Module || [])
          }));
        } else {
          console.warn('Row 2 RICEW LOV API returned no data or success=false:', result);
        }
      } catch (error) {
        console.error('Error fetching Row 2 RICEW LOV data:', error);
        setLovError(error.message);
      }
    };

    if (selectedProject?.id) {
      fetchLovDataRow2();
    }
  }, [selectedProject?.id]);

  // Restore dashboard state from localStorage on component mount
  useEffect(() => {
    const savedState = localStorage.getItem('ricewDashboardState');
    const needsRefresh = sessionStorage.getItem('ricew_refresh_needed') === 'true';

    if (savedState) {
      try {
        const dashboardState = JSON.parse(savedState);

        // Restore state only if LOV data is loaded to avoid conflicts
        if (!lovLoading && Object.keys(lovData).some(key => lovData[key].length > 0)) {
          // ALWAYS restore filters and search text
          setSelectedFilters(dashboardState.selectedFilters || selectedFilters);
          setSelectedValues(dashboardState.selectedValues || selectedValues);
          setTableSearchText(dashboardState.tableSearchText || '');

          if (needsRefresh) {
            console.log('Refresh needed. Preserving filters but triggering data reload.');
            sessionStorage.removeItem('ricew_refresh_needed');
            // Trigger an automatic submit to get fresh data including new records
            setRefreshTrigger(true);
          } else {
            // No refresh needed, restore the previous table results
            setFilteredData(dashboardState.filteredData || []);
          }

          // Clear the saved state after restoring
          localStorage.removeItem('ricewDashboardState');
        }
      } catch (error) {
        console.error('Error restoring dashboard state:', error);
        localStorage.removeItem('ricewDashboardState');
      }
    } else if (needsRefresh) {
      // If no saved state but refresh needed (e.g. initial load after save)
      sessionStorage.removeItem('ricew_refresh_needed');
    }
  }, [lovLoading, lovData]);

  // Effect to handle automatic filter submission after state restoration
  useEffect(() => {
    if (refreshTrigger) {
      submitFilters();
      setRefreshTrigger(false);
    }
  }, [refreshTrigger]);

  const toggleFilter = (filterKey) => {
    setSelectedFilters(prev => ({
      ...prev,
      [filterKey]: !prev[filterKey]
    }));
  };

  const clearAllFilters = () => {
    setSelectedFilters({
      ricewName: false,
      ricewStatus: false,
      ricewType: false,
      rolloutName: false,
      waveName: false,
      legalEntityName: false,
      technicalOwnerName: false,
      functionalOwnerName: false,
      businessOwnerName: false,
      giProcessStream: false,
      giApplication: false,
      giL0Process: false,
      giModule: false,
      csProcessStream: false,
      csApplication: false,
      csL0Process: false,
      csModule: false
    });
    setSelectedValues({
      ricewName: [],
      ricewStatus: [],
      ricewType: [],
      rolloutName: [],
      waveName: [],
      legalEntityName: [],
      technicalOwnerName: [],
      functionalOwnerName: [],
      businessOwnerName: [],
      giProcessStream: [],
      giApplication: [],
      giL0Process: [],
      giModule: [],
      csProcessStream: [],
      csApplication: [],
      csL0Process: [],
      csModule: []
    });
    setFilteredData([]);
    setTableSearchText('');
    setOpenDropdown(null);
  };

  const handleSearchChange = (value) => {
    const maxLength = 100;

    // If the input exceeds the limit, truncate it and show error
    if (value.length > maxLength) {
      const truncatedValue = value.substring(0, maxLength);
      setTableSearchText(truncatedValue);
      setSearchError(`Search Result cannot exceed ${maxLength} characters`);
      return;
    }

    // Clear any previous error and update the value
    setTableSearchText(value);
    setSearchError(''); // Clear error when valid
  };

  const handleViewDetails = async (requestId) => {
    // Save current dashboard state to localStorage before navigating
    const dashboardState = {
      selectedFilters,
      selectedValues,
      filteredData,
      tableSearchText,
      lovData
    };
    localStorage.setItem('ricewDashboardState', JSON.stringify(dashboardState));

    try {
      let idToken;
      try {
        idToken = await getIdToken();
      } catch (tokenError) {
        handleAuthError(tokenError.message);
        return;
      }

      const sanitizedRequestId = DOMPurify.sanitize(String(requestId || '').trim(), { ALLOWED_TAGS: [] });
      const apiUrl = `https://7o6jl6k0pd.execute-api.ap-south-1.amazonaws.com/New/ricew/get/byRICEWRequestFormId?RICEWRequestFormId=${sanitizedRequestId}`;

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      };

      const response = await fetch(apiUrl, { headers: headers });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        return;
      }

      const result = await response.json();

      if (result.success && result.data) {
        // Store the fetched data in localStorage for the edit form to load
        localStorage.setItem('ricewFormData', JSON.stringify(result.data));
        // Navigate to edit page
        navigate(`/dashboard/ricew-dashboard/RICEW-request/edit/${sanitizedRequestId}`);
      } else {
        console.error('Failed to fetch RICEW request data:', result);
        alert('Failed to load RICEW request data. Please try again.');
      }
    } catch (error) {
      console.error('Error fetching RICEW request data:', error);
      alert('Error loading RICEW request data. Please try again.');
    }
  };

  const handleCreateNewForm = () => {
    // Save current dashboard state to localStorage before navigating
    const dashboardState = {
      selectedFilters,
      selectedValues,
      filteredData,
      tableSearchText,
      lovData
    };
    localStorage.setItem('ricewDashboardState', JSON.stringify(dashboardState));

    navigate('/dashboard/ricew-dashboard/RICEW-request-create');
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

  const submitFilters = () => {
    console.log('=== SUBMITTING FILTERS ===');

    // Map frontend field names to backend parameter names
    const fieldMapping = {
      ricewName: 'RICEW_Name',
      ricewStatus: 'RICEW_Status',
      ricewType: 'RICEW_Type',
      rolloutName: 'Rollout_Name',
      waveName: 'Wave_Name',
      legalEntityName: 'Legal_Entity_Name',
      technicalOwnerName: 'Technical_Owner_Name',
      functionalOwnerName: 'Functional_Owner_Name',
      businessOwnerName: 'Business_Owner_Name',
      giProcessStream: 'GI_Process_Stream',
      giApplication: 'GI_Application',
      giL0Process: 'GI_L0_Process',
      giModule: 'GI_Module',
      csProcessStream: 'CS_Process_Stream',
      csApplication: 'CS_Application',
      csL0Process: 'CS_L0_Process',
      csModule: 'CS_Module'
    };

    // Build query parameters
    const queryParams = new URLSearchParams();

    // Add Project_id
    const projectId = (localStorage.getItem('project_id') || selectedProject?.id || '101').toString();
    queryParams.append('Project_id', projectId);

    // Add selected values
    Object.entries(selectedValues).forEach(([key, values]) => {
      if (values.length > 0) {
        const backendParam = fieldMapping[key];
        if (backendParam) {
          // For multiple values, append each value as a separate query parameter with the same name
          // This creates an array in the backend (Express.js automatically handles this)
          values.forEach(value => {
            queryParams.append(backendParam, value.trim());
          });
          console.log(` - ${key} → ${backendParam}: [${values.map(v => `"${v.trim()}"`).join(', ')}]`);
        }
      }
    });

    // Add search text if present
    if (filterText.trim()) {
      console.log(` - Search Text: "${filterText}"`);
      // Note: Backend API doesn't seem to handle search text in query params
      // You might need to add search logic separately or modify backend
    }

    // Make API call - Note: This might need to be updated for RICEW Request specific API
    const apiUrl = `https://7o6jl6k0pd.execute-api.ap-south-1.amazonaws.com/New/filter/ricew/allData/ricew-request-forms-filter?${queryParams.toString()}`;

    console.log('API URL:', apiUrl);

    // Get ID token for authorization
    getIdToken()
      .then(idToken => {
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        };

        return fetch(apiUrl, { headers: headers });
      })
      .catch(tokenError => {
        console.error('Failed to get ID token for filter submission:', tokenError);
        handleAuthError(tokenError.message);
        return Promise.reject(tokenError);
      })
      .then(response => {
        if (response.status === 401 || response.status === 403) {
          handleAuthError('Unauthorized - session expired');
          return Promise.reject(new Error('Session expired'));
        }
        return response.json();
      })
      .then(data => {
        console.log('=== FILTER RESULTS ===');
        console.log('Success:', data.success);
        console.log('Count:', data.count);
        console.log('Records:', data.data);

        // Store filtered data in state for table display
        if (data.success && data.data && data.data.length > 0) {
          // Sanitize data and sort: created_date descending, then RICEWRequestFormId descending (larger first)
          const sanitizeData = (item) => ({
            ...item,
            RICEWRequestFormId: DOMPurify.sanitize(String(item.RICEWRequestFormId || '').trim(), { ALLOWED_TAGS: [] }),
            RICEW_Name: DOMPurify.sanitize(String(item.RICEW_Name || '').trim(), { ALLOWED_TAGS: [] }),
            RICEW_Type: DOMPurify.sanitize(String(item.RICEW_Type || '').trim(), { ALLOWED_TAGS: [] }),
            created_date: DOMPurify.sanitize(String(item.created_date || '').trim(), { ALLOWED_TAGS: [] })
          });

          const sortedData = data.data.map(sanitizeData).sort((a, b) => {
            // Primary sort: RICEWRequestFormId (descending - largest ID first)
            const idA = parseInt(a.RICEWRequestFormId || 0, 10);
            const idB = parseInt(b.RICEWRequestFormId || 0, 10);
            if (idB - idA !== 0) {
              return idB - idA;
            }

            // Secondary sort: created_date (descending)
            const dateA = new Date(a.created_date || 0);
            const dateB = new Date(b.created_date || 0);
            return dateB - dateA;
          });

          setFilteredData(sortedData);
        } else if (data.success && (!data.data || data.data.length === 0)) {
          // Show user-friendly message when no data is found
          setFilteredData([]);

          setErrorMessage('No records found matching your filter criteria. Please try different filters.');
          setShowErrorMessage(true);
          setTimeout(() => setShowErrorMessage(false), 5000);
        } else {
          setFilteredData([]);
        }
      })
      .catch(error => {
        console.error('Error fetching filtered data:', error);
        setFilteredData([]);
      });

    console.log('=== END FILTER SUBMISSION ===');
  };

  const handleDownloadTemplate = async () => {
    try {
      const result = await downloadRICEWTemplate();

      if (result.success) {
        setSuccessMessage(result.message);
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
      } else {
        setErrorMessage(result.message);
        setShowErrorMessage(true);
        setTimeout(() => setShowErrorMessage(false), 5000);
      }
    } catch (error) {
      console.error('Error downloading template:', error);
      setErrorMessage('Failed to download template. Please try again.');
      setShowErrorMessage(true);
      setTimeout(() => setShowErrorMessage(false), 5000);
    }
  };

  const handleUploadTemplate = () => {
    // Create a file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx, .xls';

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        // Show loading state
        setSuccessMessage('Processing template...');
        setShowSuccessMessage(true);

        // Parse the uploaded file
        const result = await parseRICEWTemplate(file);

        if (result.success) {
          console.log('Parsed data:', result.data);
          console.log('Validation errors:', result.errors);

          if (result.errors.length > 0) {
            // Show validation errors
            const errorSummary = `Template uploaded with ${result.errors.length} validation error(s). Check console for details.`;
            setErrorMessage(errorSummary);
            setShowErrorMessage(true);
            setTimeout(() => setShowErrorMessage(false), 5000);

            // Log detailed errors
            console.warn('Validation Errors:', result.errors);
          } else {
            // Success - all data is valid
            setSuccessMessage(`Template uploaded successfully! ${result.totalRows} row(s) processed.`);
            setShowSuccessMessage(true);
            setTimeout(() => setShowSuccessMessage(false), 3000);
          }

          // TODO: Process the parsed data (e.g., send to API, update state, etc.)
          // You can access result.data here to work with the parsed records

        } else {
          setErrorMessage(result.message);
          setShowErrorMessage(true);
          setTimeout(() => setShowErrorMessage(false), 5000);
        }
      } catch (error) {
        console.error('Error uploading template:', error);
        setErrorMessage('Failed to process template. Please try again.');
        setShowErrorMessage(true);
        setTimeout(() => setShowErrorMessage(false), 5000);
      }
    };

    // Trigger file selection
    input.click();
  };

  const searchText = () => {
    // Handle search bar search logic here
    console.log('Searching for:', filterText);
    // You can add search logic here
  };

  const toggleDropdown = (filterKey) => {
    setOpenDropdown(openDropdown === filterKey ? null : filterKey);
  };

  const toggleFilterValue = (filterKey, value) => {
    setSelectedValues(prev => {
      const currentValues = prev[filterKey] || [];
      const isSelected = currentValues.includes(value);
      return {
        ...prev,
        [filterKey]: isSelected
          ? currentValues.filter(v => v !== value)
          : [...currentValues, value]
      };
    });
  };

  const [maxWidth, setMaxWidth] = useState('1400px');
  const [marginRight, setMarginRight] = useState('30px');
  const [paddingBottom, setPaddingBottom] = useState('10px');
  useEffect(() => {
    const handleZoomChange = () => {
      const zoomLevel = Math.round((window.outerWidth / window.innerWidth) * 100);

      if (zoomLevel <= 60) {
        setMaxWidth('2400px'); // For zoom <= 60%
        setMarginRight('80px'); // Adjust margin for 60% zoom
        //setPaddingBottom('1rem'); // Standard padding for lower zoom
      } else if (zoomLevel <= 80) {
        setMaxWidth('1800px'); // For zoom <= 80%
        setMarginRight('50px'); // Adjust margin for 80% zoom
        //setPaddingBottom('1rem'); // Standard padding for 80% zoom
      } else {
        setMaxWidth('1500px'); // For zoom 100% or higher
        setMarginRight('0px'); // Default margin
        setPaddingBottom('10px'); // Extra padding for 100% zoom to prevent cutoff
      }
    };

    window.addEventListener('resize', handleZoomChange);
    handleZoomChange(); // Initial call

    return () => window.removeEventListener('resize', handleZoomChange);
  }, []);

  return (
    <div className="config-main" style={{ minHeight: '80vh', width: 'calc(98% - 2rem)', maxWidth: maxWidth, margin: '2rem auto', marginLeft: '2rem', marginRight: '2rem', paddingBottom: paddingBottom }}>
      {/* Inner Content Container */}
      <div className="dashboard-content" style={{ width: '100%', maxWidth: 'none', margin: '0', padding: '0' }}>
        {/* Project Info */}
        <div style={{ padding: '2rem 1rem 1rem 2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project : <span style={{ color: '#007bff' }}>{localStorage.getItem('project_name') || selectedProject?.name}</span></h3>
            <button
              onClick={handleCreateNewForm}
              className="add-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                marginRight: marginRight,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#218838'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#28a745'}
            >
              <Plus size={18} />
              RICEW Request Form
            </button>
          </div>
        </div>
        <div className="config-header" style={{ marginTop: '0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2>RICEW Dashboard</h2>
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
            zIndex: 1000,
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
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
            padding: '12px 20px',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            maxWidth: '400px',
            wordWrap: 'break-word'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            {errorMessage}
          </div>
        )}

        {/* Confirmation Dialog */}
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
            zIndex: 2000
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
                fontSize: '16px',
                lineHeight: '1.5'
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
                    minWidth: '100px'
                  }}
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
                    minWidth: '100px'
                  }}
                >
                  Yes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filter Section */}
        <div
          style={{
            padding: '1.5rem 2rem',
            backgroundColor: 'white',
          }}>

          {/* General Information Heading */}
          <div style={{ marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#333', margin: '0 0 0.5rem 0' }}>General Information</h4>

            {/* First Row - General Information Filters */}
            <div style={{
              display: 'flex',
              gap: '0.75rem',
              marginBottom: '1rem',
              flexWrap: 'wrap',
              alignItems: 'center'
            }}>
              {/* RICEW Name Dropdown */}
              <div style={{ position: 'relative', width: '140px' }}>
                <button
                  data-filter-button="true"
                  onClick={() => toggleDropdown('ricewName')}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    backgroundColor: selectedValues.ricewName.length > 0 ? '#3b82f6' : '#f9f9f9',
                    color: selectedValues.ricewName.length > 0 ? 'white' : '#333',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  RICEW Name
                </button>
                {openDropdown === 'ricewName' && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    marginTop: '4px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 9999,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}>
                    {(lovData.ricewName || []).map((option, index) => (
                      <label
                        key={index}
                        data-dropdown-option="true"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px 10px',
                          cursor: 'pointer',
                          backgroundColor: selectedValues.ricewName.includes(option) ? '#e3f2fd' : 'white',
                          borderBottom: '1px solid #f0f0f0',
                          fontSize: '12px'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedValues.ricewName.includes(option)}
                          onChange={() => toggleFilterValue('ricewName', option)}
                          style={{ marginRight: '8px', cursor: 'pointer' }}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* RICEW Status Dropdown */}
              <div style={{ position: 'relative', width: '140px' }}>
                <button
                  data-filter-button="true"
                  onClick={() => toggleDropdown('ricewStatus')}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    backgroundColor: selectedValues.ricewStatus.length > 0 ? '#3b82f6' : '#f9f9f9',
                    color: selectedValues.ricewStatus.length > 0 ? 'white' : '#333',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  RICEW Status
                </button>
                {openDropdown === 'ricewStatus' && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    marginTop: '4px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 9999,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}>
                    {(lovData.ricewStatus || []).map((option, index) => (
                      <label
                        key={index}
                        data-dropdown-option="true"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px 10px',
                          cursor: 'pointer',
                          backgroundColor: selectedValues.ricewStatus.includes(option) ? '#e3f2fd' : 'white',
                          borderBottom: '1px solid #f0f0f0',
                          fontSize: '12px'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedValues.ricewStatus.includes(option)}
                          onChange={() => toggleFilterValue('ricewStatus', option)}
                          style={{ marginRight: '8px', cursor: 'pointer' }}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* RICEW Type Dropdown */}
              <div style={{ position: 'relative', width: '140px' }}>
                <button
                  data-filter-button="true"
                  onClick={() => toggleDropdown('ricewType')}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    backgroundColor: selectedValues.ricewType.length > 0 ? '#3b82f6' : '#f9f9f9',
                    color: selectedValues.ricewType.length > 0 ? 'white' : '#333',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  RICEW Type
                </button>
                {openDropdown === 'ricewType' && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    marginTop: '4px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 9999,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}>
                    {(lovData.ricewType || []).map((option, index) => (
                      <label
                        key={index}
                        data-dropdown-option="true"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px 10px',
                          cursor: 'pointer',
                          backgroundColor: selectedValues.ricewType.includes(option) ? '#e3f2fd' : 'white',
                          borderBottom: '1px solid #f0f0f0',
                          fontSize: '12px'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedValues.ricewType.includes(option)}
                          onChange={() => toggleFilterValue('ricewType', option)}
                          style={{ marginRight: '8px', cursor: 'pointer' }}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Rollout Name Dropdown */}
              <div style={{ position: 'relative', width: '140px' }}>
                <button
                  data-filter-button="true"
                  onClick={() => toggleDropdown('rolloutName')}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    backgroundColor: selectedValues.rolloutName.length > 0 ? '#3b82f6' : '#f9f9f9',
                    color: selectedValues.rolloutName.length > 0 ? 'white' : '#333',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  Rollout Name
                </button>
                {openDropdown === 'rolloutName' && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    marginTop: '4px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 9999,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}>
                    {(lovData.rolloutName || []).map((option, index) => (
                      <label
                        key={index}
                        data-dropdown-option="true"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px 10px',
                          cursor: 'pointer',
                          backgroundColor: selectedValues.rolloutName.includes(option) ? '#e3f2fd' : 'white',
                          borderBottom: '1px solid #f0f0f0',
                          fontSize: '12px'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedValues.rolloutName.includes(option)}
                          onChange={() => toggleFilterValue('rolloutName', option)}
                          style={{ marginRight: '8px', cursor: 'pointer' }}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Wave Name Dropdown */}
              <div style={{ position: 'relative', width: '140px' }}>
                <button
                  data-filter-button="true"
                  onClick={() => toggleDropdown('waveName')}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    backgroundColor: selectedValues.waveName.length > 0 ? '#3b82f6' : '#f9f9f9',
                    color: selectedValues.waveName.length > 0 ? 'white' : '#333',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  Wave Name
                </button>
                {openDropdown === 'waveName' && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    marginTop: '4px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 9999,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}>
                    {(lovData.waveName || []).map((option, index) => (
                      <label
                        key={index}
                        data-dropdown-option="true"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px 10px',
                          cursor: 'pointer',
                          backgroundColor: selectedValues.waveName.includes(option) ? '#e3f2fd' : 'white',
                          borderBottom: '1px solid #f0f0f0',
                          fontSize: '12px'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedValues.waveName.includes(option)}
                          onChange={() => toggleFilterValue('waveName', option)}
                          style={{ marginRight: '8px', cursor: 'pointer' }}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                onClick={submitFilters}
                style={{
                  width: '140px',
                  padding: '6px 10px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#218838'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#28a745'}
              >
                Apply Filters
              </button>
            </div>

            {/* Second Row - General Information Filters */}
            <div style={{
              display: 'flex',
              gap: '0.75rem',
              marginBottom: '1rem',
              flexWrap: 'wrap',
              alignItems: 'center'
            }}>
              {/* Legal Entity Name Dropdown */}
              <div style={{ position: 'relative', width: '140px' }}>
                <button
                  data-filter-button="true"
                  onClick={() => toggleDropdown('legalEntityName')}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    backgroundColor: selectedValues.legalEntityName.length > 0 ? '#3b82f6' : '#f9f9f9',
                    color: selectedValues.legalEntityName.length > 0 ? 'white' : '#333',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  Legal Entity Name
                </button>
                {openDropdown === 'legalEntityName' && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    marginTop: '4px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 9999,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}>
                    {(lovData.legalEntityName || []).map((option, index) => (
                      <label
                        key={index}
                        data-dropdown-option="true"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px 10px',
                          cursor: 'pointer',
                          backgroundColor: selectedValues.legalEntityName.includes(option) ? '#e3f2fd' : 'white',
                          borderBottom: '1px solid #f0f0f0',
                          fontSize: '12px'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedValues.legalEntityName.includes(option)}
                          onChange={() => toggleFilterValue('legalEntityName', option)}
                          style={{ marginRight: '8px', cursor: 'pointer' }}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Process Stream Dropdown */}
              <div style={{ position: 'relative', width: '140px' }}>
                <button
                  data-filter-button="true"
                  onClick={() => toggleDropdown('giProcessStream')}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    backgroundColor: selectedValues.giProcessStream.length > 0 ? '#3b82f6' : '#f9f9f9',
                    color: selectedValues.giProcessStream.length > 0 ? 'white' : '#333',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  Process Stream
                </button>
                {openDropdown === 'giProcessStream' && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    marginTop: '4px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 9999,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}>
                    {(lovData.giProcessStream || []).map((option, index) => (
                      <label
                        key={index}
                        data-dropdown-option="true"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px 10px',
                          cursor: 'pointer',
                          backgroundColor: selectedValues.giProcessStream.includes(option) ? '#e3f2fd' : 'white',
                          borderBottom: '1px solid #f0f0f0',
                          fontSize: '12px'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedValues.giProcessStream.includes(option)}
                          onChange={() => toggleFilterValue('giProcessStream', option)}
                          style={{ marginRight: '8px', cursor: 'pointer' }}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Application Dropdown */}
              <div style={{ position: 'relative', width: '140px' }}>
                <button
                  data-filter-button="true"
                  onClick={() => toggleDropdown('giApplication')}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    backgroundColor: selectedValues.giApplication.length > 0 ? '#3b82f6' : '#f9f9f9',
                    color: selectedValues.giApplication.length > 0 ? 'white' : '#333',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  Application
                </button>
                {openDropdown === 'giApplication' && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    marginTop: '4px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 9999,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}>
                    {(lovData.giApplication || []).map((option, index) => (
                      <label
                        key={index}
                        data-dropdown-option="true"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px 10px',
                          cursor: 'pointer',
                          backgroundColor: selectedValues.giApplication.includes(option) ? '#e3f2fd' : 'white',
                          borderBottom: '1px solid #f0f0f0',
                          fontSize: '12px'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedValues.giApplication.includes(option)}
                          onChange={() => toggleFilterValue('giApplication', option)}
                          style={{ marginRight: '8px', cursor: 'pointer' }}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* L0 Process Dropdown */}
              <div style={{ position: 'relative', width: '140px' }}>
                <button
                  data-filter-button="true"
                  onClick={() => toggleDropdown('giL0Process')}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    backgroundColor: selectedValues.giL0Process.length > 0 ? '#3b82f6' : '#f9f9f9',
                    color: selectedValues.giL0Process.length > 0 ? 'white' : '#333',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  L0 Process
                </button>
                {openDropdown === 'giL0Process' && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    marginTop: '4px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 9999,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}>
                    {(lovData.giL0Process || []).map((option, index) => (
                      <label
                        key={index}
                        data-dropdown-option="true"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px 10px',
                          cursor: 'pointer',
                          backgroundColor: selectedValues.giL0Process.includes(option) ? '#e3f2fd' : 'white',
                          borderBottom: '1px solid #f0f0f0',
                          fontSize: '12px'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedValues.giL0Process.includes(option)}
                          onChange={() => toggleFilterValue('giL0Process', option)}
                          style={{ marginRight: '8px', cursor: 'pointer' }}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Module Dropdown */}
              <div style={{ position: 'relative', width: '140px' }}>
                <button
                  data-filter-button="true"
                  onClick={() => toggleDropdown('giModule')}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    backgroundColor: selectedValues.giModule.length > 0 ? '#3b82f6' : '#f9f9f9',
                    color: selectedValues.giModule.length > 0 ? 'white' : '#333',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  Module
                </button>
                {openDropdown === 'giModule' && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    marginTop: '4px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 9999,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}>
                    {(lovData.giModule || []).map((option, index) => (
                      <label
                        key={index}
                        data-dropdown-option="true"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px 10px',
                          cursor: 'pointer',
                          backgroundColor: selectedValues.giModule.includes(option) ? '#e3f2fd' : 'white',
                          borderBottom: '1px solid #f0f0f0',
                          fontSize: '12px'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedValues.giModule.includes(option)}
                          onChange={() => toggleFilterValue('giModule', option)}
                          style={{ marginRight: '8px', cursor: 'pointer' }}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Clear All Filters Button */}
              <button
                onClick={clearAllFilters}
                style={{
                  width: '140px',
                  padding: '6px 10px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#c82333'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#dc3545'}
              >
                Clear All Filter
              </button>
            </div>
          </div>

          {/* Ownership Heading */}
          <div style={{ marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#333', margin: '0 0 0.5rem 0' }}>Ownership</h4>

            {/* Ownership Filters */}
            <div style={{
              display: 'flex',
              gap: '2.5rem',
              marginBottom: '1rem',
              flexWrap: 'wrap'
            }}>
              {/* Business Owner Name Dropdown */}
              <div style={{ position: 'relative', width: '140px' }}>
                <button
                  data-filter-button="true"
                  onClick={() => toggleDropdown('businessOwnerName')}
                  style={{
                    width: '170px',
                    padding: '6px 10px',
                    backgroundColor: selectedValues.businessOwnerName.length > 0 ? '#3b82f6' : '#f9f9f9',
                    color: selectedValues.businessOwnerName.length > 0 ? 'white' : '#333',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  Business Owner Name
                </button>
                {openDropdown === 'businessOwnerName' && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    width: '170px',
                    left: 0,
                    right: 0,
                    backgroundColor: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    marginTop: '4px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 9999,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}>
                    {(lovData.businessOwnerName || []).map((option, index) => (
                      <label
                        key={index}
                        data-dropdown-option="true"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px 10px',
                          cursor: 'pointer',
                          backgroundColor: selectedValues.businessOwnerName.includes(option) ? '#e3f2fd' : 'white',
                          borderBottom: '1px solid #f0f0f0',
                          fontSize: '12px'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedValues.businessOwnerName.includes(option)}
                          onChange={() => toggleFilterValue('businessOwnerName', option)}
                          style={{ marginRight: '8px', cursor: 'pointer' }}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Functional Owner Name Dropdown */}
              <div style={{ position: 'relative', width: '140px' }}>
                <button
                  data-filter-button="true"
                  onClick={() => toggleDropdown('functionalOwnerName')}
                  style={{
                    width: '170px',
                    padding: '6px 10px',
                    backgroundColor: selectedValues.functionalOwnerName.length > 0 ? '#3b82f6' : '#f9f9f9',
                    color: selectedValues.functionalOwnerName.length > 0 ? 'white' : '#333',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  Functional Owner Name
                </button>
                {openDropdown === 'functionalOwnerName' && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    width: '170px',
                    left: 0,
                    right: 0,
                    backgroundColor: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    marginTop: '4px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 9999,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}>
                    {(lovData.functionalOwnerName || []).map((option, index) => (
                      <label
                        key={index}
                        data-dropdown-option="true"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px 10px',
                          cursor: 'pointer',
                          backgroundColor: selectedValues.functionalOwnerName.includes(option) ? '#e3f2fd' : 'white',
                          borderBottom: '1px solid #f0f0f0',
                          fontSize: '12px'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedValues.functionalOwnerName.includes(option)}
                          onChange={() => toggleFilterValue('functionalOwnerName', option)}
                          style={{ marginRight: '8px', cursor: 'pointer' }}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Technical Owner Name Dropdown */}
              <div style={{ position: 'relative', width: '140px' }}>
                <button
                  data-filter-button="true"
                  onClick={() => toggleDropdown('technicalOwnerName')}
                  style={{
                    width: '170px',
                    padding: '6px 10px',
                    backgroundColor: selectedValues.technicalOwnerName.length > 0 ? '#3b82f6' : '#f9f9f9',
                    color: selectedValues.technicalOwnerName.length > 0 ? 'white' : '#333',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  Technical Owner Name
                </button>
                {openDropdown === 'technicalOwnerName' && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    width: '170px',
                    left: 0,
                    right: 0,
                    backgroundColor: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    marginTop: '4px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 9999,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}>
                    {(lovData.technicalOwnerName || []).map((option, index) => (
                      <label
                        key={index}
                        data-dropdown-option="true"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px 10px',
                          cursor: 'pointer',
                          backgroundColor: selectedValues.technicalOwnerName.includes(option) ? '#e3f2fd' : 'white',
                          borderBottom: '1px solid #f0f0f0',
                          fontSize: '12px'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedValues.technicalOwnerName.includes(option)}
                          onChange={() => toggleFilterValue('technicalOwnerName', option)}
                          style={{ marginRight: '8px', cursor: 'pointer' }}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Cross Stream Impact Heading */}
          <div style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#333', margin: '0' }}>Cross Stream Impact</h4>
          </div>

          {/* CS Filters */}
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            marginBottom: '1rem',
            flexWrap: 'wrap'
          }}>
            {/* CS Process Stream Dropdown */}
            <div style={{ position: 'relative', width: '140px' }}>
              <button
                data-filter-button="true"
                onClick={() => toggleDropdown('csProcessStream')}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  backgroundColor: selectedValues.csProcessStream.length > 0 ? '#3b82f6' : '#f9f9f9',
                  color: selectedValues.csProcessStream.length > 0 ? 'white' : '#333',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                Process Stream
              </button>
              {openDropdown === 'csProcessStream' && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  marginTop: '4px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  zIndex: 9999,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}>
                  {(lovData.csProcessStream || []).map((option, index) => (
                    <label
                      key={index}
                      data-dropdown-option="true"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 10px',
                        cursor: 'pointer',
                        backgroundColor: selectedValues.csProcessStream.includes(option) ? '#e3f2fd' : 'white',
                        borderBottom: '1px solid #f0f0f0',
                        fontSize: '12px'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedValues.csProcessStream.includes(option)}
                        onChange={() => toggleFilterValue('csProcessStream', option)}
                        style={{ marginRight: '8px', cursor: 'pointer' }}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              )}
            </div>
            {/* CS Application Dropdown */}
            <div style={{ position: 'relative', width: '140px' }}>
              <button
                data-filter-button="true"
                onClick={() => toggleDropdown('csApplication')}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  backgroundColor: selectedValues.csApplication.length > 0 ? '#3b82f6' : '#f9f9f9',
                  color: selectedValues.csApplication.length > 0 ? 'white' : '#333',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                Application
              </button>
              {openDropdown === 'csApplication' && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  marginTop: '4px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  zIndex: 9999,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}>
                  {(lovData.csApplication || []).map((option, index) => (
                    <label
                      key={index}
                      data-dropdown-option="true"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 10px',
                        cursor: 'pointer',
                        backgroundColor: selectedValues.csApplication.includes(option) ? '#e3f2fd' : 'white',
                        borderBottom: '1px solid #f0f0f0',
                        fontSize: '12px'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedValues.csApplication.includes(option)}
                        onChange={() => toggleFilterValue('csApplication', option)}
                        style={{ marginRight: '8px', cursor: 'pointer' }}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              )}
            </div>
            {/* CS L0 Process Dropdown */}
            <div style={{ position: 'relative', width: '140px' }}>
              <button
                data-filter-button="true"
                onClick={() => toggleDropdown('csL0Process')}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  backgroundColor: selectedValues.csL0Process.length > 0 ? '#3b82f6' : '#f9f9f9',
                  color: selectedValues.csL0Process.length > 0 ? 'white' : '#333',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                L0 Process
              </button>
              {openDropdown === 'csL0Process' && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  marginTop: '4px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  zIndex: 9999,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}>
                  {(lovData.csL0Process || []).map((option, index) => (
                    <label
                      key={index}
                      data-dropdown-option="true"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 10px',
                        cursor: 'pointer',
                        backgroundColor: selectedValues.csL0Process.includes(option) ? '#e3f2fd' : 'white',
                        borderBottom: '1px solid #f0f0f0',
                        fontSize: '12px'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedValues.csL0Process.includes(option)}
                        onChange={() => toggleFilterValue('csL0Process', option)}
                        style={{ marginRight: '8px', cursor: 'pointer' }}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              )}
            </div>
            {/* CS Module Dropdown */}
            <div style={{ position: 'relative', width: '140px' }}>
              <button
                data-filter-button="true"
                onClick={() => toggleDropdown('csModule')}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  backgroundColor: selectedValues.csModule.length > 0 ? '#3b82f6' : '#f9f9f9',
                  color: selectedValues.csModule.length > 0 ? 'white' : '#333',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                Module
              </button>
              {openDropdown === 'csModule' && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  marginTop: '4px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  zIndex: 9999,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}>
                  {(lovData.csModule || []).map((option, index) => (
                    <label
                      key={index}
                      data-dropdown-option="true"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 10px',
                        cursor: 'pointer',
                        backgroundColor: selectedValues.csModule.includes(option) ? '#e3f2fd' : 'white',
                        borderBottom: '1px solid #f0f0f0',
                        fontSize: '12px'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedValues.csModule.includes(option)}
                        onChange={() => toggleFilterValue('csModule', option)}
                        style={{ marginRight: '8px', cursor: 'pointer' }}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Table Search Section */}
        <div style={{
          padding: '1rem 2rem',
          backgroundColor: '#f8f9fa',
          border: '1px solid #ddd',
          borderTop: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>Search Results :</span>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  position: 'absolute',
                  left: '10px',
                  color: '#666',
                  pointerEvents: 'none'
                }}
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                value={tableSearchText}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search by RICEW Name..."
                style={{
                  padding: '8px 12px 8px 32px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  width: '250px',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#007bff'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
            </div>
          </div>
          {/* Error Message for Search */}
          {searchError && (
            <div style={{
              color: '#dc2626',
              fontSize: '14px',
              fontWeight: '500',
              padding: '8px 12px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '4px',
              marginLeft: '1rem'
            }}>
              {searchError}
            </div>
          )}
        </div>

        {/* Table Header and Body Section - Unified Scrollable Container */}
        <div style={{
          backgroundColor: '#f8f9fa',
          border: '1px solid #ddd',
          overflowX: 'auto',
          overflowY: 'hidden',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {/* Table Header Row */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid #ddd',
            padding: '0 0 0 2rem'
          }}>
            <div style={{
              flex: 1,
              padding: '12px 12px',
              fontWeight: 'bold',
              fontSize: '14px',
              color: '#333',
              borderRight: '1px solid #ddd',
              minWidth: '150px'
            }}>
              RICEW Name
            </div>
            <div style={{
              flex: 1,
              padding: '12px 12px',
              fontWeight: 'bold',
              fontSize: '14px',
              color: '#333',
              borderRight: '1px solid #ddd',
              minWidth: '120px'
            }}>
              RICEW Type
            </div>
            <div style={{
              flex: 1,
              padding: '12px 12px',
              fontWeight: 'bold',
              fontSize: '14px',
              color: '#333',
              borderRight: '1px solid #ddd',
              minWidth: '130px'
            }}>
              RICEW Status
            </div>
            <div style={{
              flex: 1,
              padding: '12px 12px',
              fontWeight: 'bold',
              fontSize: '14px',
              color: '#333',
              borderRight: '1px solid #ddd',
              minWidth: '180px'
            }}>
              RICEW Description
            </div>
            {/* <div style={{
              flex: 1,
              padding: '12px 12px',
              fontWeight: 'bold',
              fontSize: '14px',
              color: '#333',
              borderRight: '1px solid #ddd',
              minWidth: '140px'
            }}>
              Process Stream
            </div> */}
            <div style={{
              flex: 1,
              padding: '12px 12px',
              fontWeight: 'bold',
              fontSize: '14px',
              color: '#333',
              borderRight: '1px solid #ddd',
              minWidth: '120px'
            }}>
              Process Stream
            </div>
            {/* <div style={{
              flex: 1,
              padding: '12px 12px',
              fontWeight: 'bold',
              fontSize: '14px',
              color: '#333',
              borderRight: '1px solid #ddd',
              minWidth: '120px'
            }}>
              L0 Process
            </div> */}

            {/* <div style={{
              flex: 1,
              padding: '12px 12px',
              fontWeight: 'bold',
              fontSize: '14px',
              color: '#333',
              borderRight: '1px solid #ddd',
              minWidth: '160px'
            }}>
              Impact Process Stream
            </div>
            <div style={{
              flex: 1,
              padding: '12px 12px',
              fontWeight: 'bold',
              fontSize: '14px',
              color: '#333',
              borderRight: '1px solid #ddd',
              minWidth: '150px'
            }}>
              Impact Application
            </div>
            <div style={{
              flex: 1,
              padding: '12px 12px',
              fontWeight: 'bold',
              fontSize: '14px',
              color: '#333',
              borderRight: '1px solid #ddd',
              minWidth: '150px'
            }}>
              Impact L0 Process
            </div>
            <div style={{
              flex: 1,
              padding: '12px 12px',
              fontWeight: 'bold',
              fontSize: '14px',
              color: '#333',
              borderRight: '1px solid #ddd',
              minWidth: '130px'
            }}>
              Impact Module
            </div> */}
            <div style={{
              flex: 1,
              padding: '12px 12px',
              fontWeight: 'bold',
              fontSize: '14px',
              color: '#333',
              borderRight: '1px solid #ddd',
              minWidth: '120px'
            }}>
              Complexity
            </div>
            {/* <div style={{
              flex: 1,
              padding: '12px 12px',
              fontWeight: 'bold',
              fontSize: '14px',
              color: '#333',
              borderRight: '1px solid #ddd',
              minWidth: '160px'
            }}>
              Rate Card Name
            </div>
            <div style={{
              flex: 1,
              padding: '12px 12px',
              fontWeight: 'bold',
              fontSize: '14px',
              color: '#333',
              borderRight: '1px solid #ddd',
              minWidth: '150px'
            }}>
              RICEW Effort (Hours)
            </div>
            <div style={{
              flex: 1,
              padding: '12px 12px',
              fontWeight: 'bold',
              fontSize: '14px',
              color: '#333',
              borderRight: '1px solid #ddd',
              minWidth: '150px'
            }}>
              RICEW Cost
            </div>
            <div style={{
              flex: 1,
              padding: '12px 12px',
              fontWeight: 'bold',
              fontSize: '14px',
              color: '#333',
              borderRight: '1px solid #ddd',
              minWidth: '120px'
            }}>
              Wave Name
            </div>
            <div style={{
              flex: 1,
              padding: '12px 12px',
              fontWeight: 'bold',
              fontSize: '14px',
              color: '#333',
              borderRight: '1px solid #ddd',
              minWidth: '120px'
            }}>
              Rollout Name
            </div>
            <div style={{
              flex: 1,
              padding: '12px 12px',
              fontWeight: 'bold',
              fontSize: '14px',
              color: '#333',
              borderRight: '1px solid #ddd',
              minWidth: '150px'
            }}>
              Legal Entity Name
            </div>
            <div style={{
              flex: 1,
              padding: '12px 12px',
              fontWeight: 'bold',
              fontSize: '14px',
              color: '#333',
              borderRight: '1px solid #ddd',
              minWidth: '160px'
            }}>
              Business Owner Name
            </div>
            <div style={{
              flex: 1,
              padding: '12px 12px',
              fontWeight: 'bold',
              fontSize: '14px',
              color: '#333',
              borderRight: '1px solid #ddd',
              minWidth: '180px'
            }}>
              Business Owner Email
            </div>
            <div style={{
              flex: 1,
              padding: '12px 12px',
              fontWeight: 'bold',
              fontSize: '14px',
              color: '#333',
              borderRight: '1px solid #ddd',
              minWidth: '170px'
            }}>
              Functional Owner Name
            </div>
            <div style={{
              flex: 1,
              padding: '12px 12px',
              fontWeight: 'bold',
              fontSize: '14px',
              color: '#333',
              borderRight: '1px solid #ddd',
              minWidth: '190px'
            }}>
              Functional Owner Email
            </div>
            <div style={{
              flex: 1,
              padding: '12px 12px',
              fontWeight: 'bold',
              fontSize: '14px',
              color: '#333',
              borderRight: '1px solid #ddd',
              minWidth: '170px'
            }}>
              Technical Owner Name
            </div>
            <div style={{
              flex: 1,
              padding: '12px 12px',
              fontWeight: 'bold',
              fontSize: '14px',
              color: '#333',
              minWidth: '190px'
            }}>
              Technical Owner Email
            </div> */}
          </div>

          {/* Table Body Rows */}
          {displayedData.length > 0 ? (
            displayedData.map((item, index) => {
              const rowBgColor = index % 2 === 0 ? '#ffffff' : '#ffffff';
              return (
                <div
                  key={item.RICEWRequestFormId || index}
                  style={{
                    display: 'flex',
                    backgroundColor: rowBgColor,
                    border: '1px solid #ddd',
                    // borderBottom: index === displayedData.length - 1 ? '1px solid #ddd' : 'none',
                    borderBottom: '1px solid #ddd',
                    borderTop: 'none',
                    padding: '0 0 0 2rem',
                  }}
                >
                  <div style={{
                    flex: 1,
                    padding: '12px 12px',
                    fontSize: '13px',
                    color: '#333',
                    backgroundColor: rowBgColor,
                    borderRight: '1px solid #ddd',
                    minWidth: '150px'
                  }}>
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span
                        style={{
                          cursor: 'pointer',
                          color: '#3b82f6',
                          textDecoration: 'none',
                          fontWeight: '500',
                          wordBreak: 'break-word',
                          whiteSpace: 'normal'
                        }}
                        onClick={() => handleViewDetails(item.RICEWRequestFormId)}
                        onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                        onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                      >
                        {item.RICEW_Name || '-'}
                      </span>
                      {(item.saveDraft === "true" || item.save_Draft === "true") && (
                        <span style={{
                          backgroundColor: '#fef3c7',
                          color: '#92400e',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '10px',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          border: '1px solid #fde68a',
                          whiteSpace: 'nowrap',
                          display: 'inline-flex',
                          alignItems: 'center',
                          height: 'fit-content'
                        }}>
                          Draft
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{
                    flex: 1,
                    padding: '12px 12px',
                    fontSize: '13px',
                    color: '#333',
                    backgroundColor: rowBgColor,
                    borderRight: '1px solid #ddd',
                    minWidth: '120px',
                    wordBreak: 'break-word',
                    whiteSpace: 'normal'
                  }}>
                    {item.RICEW_Type || '-'}
                  </div>
                  <div style={{
                    flex: 1,
                    padding: '12px 12px',
                    fontSize: '13px',
                    color: '#333',
                    backgroundColor: rowBgColor,
                    borderRight: '1px solid #ddd',
                    minWidth: '130px',
                    wordBreak: 'break-word',
                    whiteSpace: 'normal'
                  }}>
                    {item.RICEW_Status || '-'}
                  </div>
                  <div style={{
                    flex: 1,
                    padding: '12px 12px',
                    fontSize: '13px',
                    color: '#333',
                    backgroundColor: rowBgColor,
                    borderRight: '1px solid #ddd',
                    minWidth: '180px',
                    wordBreak: 'break-word',
                    whiteSpace: 'normal'
                  }}>
                    {item.RICEW_Description || '-'}
                  </div>
                  {/* <div style={{
                    flex: 1,
                    padding: '12px 12px',
                    fontSize: '13px',
                    color: '#333',
                    backgroundColor: rowBgColor,
                    borderRight: '1px solid #ddd',
                    minWidth: '140px',
                    wordBreak: 'break-word'
                  }}>
                    {item.GI_Process_Stream || '-'}
                  </div> */}
                  <div style={{
                    flex: 1,
                    padding: '12px 12px',
                    fontSize: '13px',
                    color: '#333',
                    backgroundColor: rowBgColor,
                    borderRight: '1px solid #ddd',
                    minWidth: '120px',
                    wordBreak: 'break-word',
                    whiteSpace: 'normal'
                  }}>
                    {item.GI_Process_Stream || '-'}
                  </div>
                  {/* <div style={{
                    flex: 1,
                    padding: '12px 12px',
                    fontSize: '13px',
                    color: '#333',
                    backgroundColor: rowBgColor,
                    borderRight: '1px solid #ddd',
                    minWidth: '120px',
                    wordBreak: 'break-word'
                  }}>
                    {item.GI_L0_Process || '-'}
                  </div> */}

                  {/* <div style={{
                    flex: 1,
                    padding: '12px 12px',
                    fontSize: '13px',
                    color: '#333',
                    backgroundColor: rowBgColor,
                    borderRight: '1px solid #ddd',
                    minWidth: '160px',
                    wordBreak: 'break-word'
                  }}>
                    {item.CS_Process_Stream || '-'}
                  </div>
                  <div style={{
                    flex: 1,
                    padding: '12px 12px',
                    fontSize: '13px',
                    color: '#333',
                    backgroundColor: rowBgColor,
                    borderRight: '1px solid #ddd',
                    minWidth: '150px',
                    wordBreak: 'break-word'
                  }}>
                    {item.CS_Application || '-'}
                  </div>
                  <div style={{
                    flex: 1,
                    padding: '12px 12px',
                    fontSize: '13px',
                    color: '#333',
                    backgroundColor: rowBgColor,
                    borderRight: '1px solid #ddd',
                    minWidth: '150px',
                    wordBreak: 'break-word'
                  }}>
                    {item.CS_L0_Process || '-'}
                  </div>
                  <div style={{
                    flex: 1,
                    padding: '12px 12px',
                    fontSize: '13px',
                    color: '#333',
                    backgroundColor: rowBgColor,
                    borderRight: '1px solid #ddd',
                    minWidth: '130px',
                    wordBreak: 'break-word'
                  }}>
                    {item.CS_Module || '-'}
                  </div> */}
                  <div style={{
                    flex: 1,
                    padding: '12px 12px',
                    fontSize: '13px',
                    color: '#333',
                    backgroundColor: rowBgColor,
                    borderRight: '1px solid #ddd',
                    minWidth: '120px',
                    wordBreak: 'break-word',
                    whiteSpace: 'normal'
                  }}>
                    {item.RICEW_Complexity || '-'}
                  </div>
                  {/* <div style={{
                    flex: 1,
                    padding: '12px 12px',
                    fontSize: '13px',
                    color: '#333',
                    backgroundColor: rowBgColor,
                    borderRight: '1px solid #ddd',
                    minWidth: '160px',
                    wordBreak: 'break-word'
                  }}>
                    {item.Rate_Card_Name || '-'}
                  </div>
                  <div style={{
                    flex: 1,
                    padding: '12px 12px',
                    fontSize: '13px',
                    color: '#333',
                    backgroundColor: rowBgColor,
                    borderRight: '1px solid #ddd',
                    minWidth: '150px',
                    wordBreak: 'break-word'
                  }}>
                    {item.RICEW_Effort_Hours || '-'}
                  </div>
                  <div style={{
                    flex: 1,
                    padding: '12px 12px',
                    fontSize: '13px',
                    color: '#333',
                    backgroundColor: rowBgColor,
                    borderRight: '1px solid #ddd',
                    minWidth: '150px',
                    wordBreak: 'break-word'
                  }}>
                    {formatRicewCost(item.RICEW_Cost) || '-'}
                  </div>
                  <div style={{
                    flex: 1,
                    padding: '12px 12px',
                    fontSize: '13px',
                    color: '#333',
                    backgroundColor: rowBgColor,
                    borderRight: '1px solid #ddd',
                    minWidth: '120px',
                    wordBreak: 'break-word'
                  }}>
                    {item.Wave_Name || '-'}
                  </div>
                  <div style={{
                    flex: 1,
                    padding: '12px 12px',
                    fontSize: '13px',
                    color: '#333',
                    backgroundColor: rowBgColor,
                    borderRight: '1px solid #ddd',
                    minWidth: '120px',
                    wordBreak: 'break-word'
                  }}>
                    {item.Rollout_Name || '-'}
                  </div>
                  <div style={{
                    flex: 1,
                    padding: '12px 12px',
                    fontSize: '13px',
                    color: '#333',
                    backgroundColor: rowBgColor,
                    borderRight: '1px solid #ddd',
                    minWidth: '150px',
                    wordBreak: 'break-word'
                  }}>
                    {item.Legal_Entity_Name || '-'}
                  </div>
                  <div style={{
                    flex: 1,
                    padding: '12px 12px',
                    fontSize: '13px',
                    color: '#333',
                    backgroundColor: rowBgColor,
                    borderRight: '1px solid #ddd',
                    minWidth: '160px',
                    wordBreak: 'break-word'
                  }}>
                    {item.Business_Owner_Name || '-'}
                  </div>
                  <div style={{
                    flex: 1,
                    padding: '12px 12px',
                    fontSize: '13px',
                    color: '#333',
                    backgroundColor: rowBgColor,
                    borderRight: '1px solid #ddd',
                    minWidth: '180px',
                    wordBreak: 'break-word'
                  }}>
                    {item.Business_Owner_Email || '-'}
                  </div>
                  <div style={{
                    flex: 1,
                    padding: '12px 12px',
                    fontSize: '13px',
                    color: '#333',
                    backgroundColor: rowBgColor,
                    borderRight: '1px solid #ddd',
                    minWidth: '170px',
                    wordBreak: 'break-word'
                  }}>
                    {item.Functional_Owner_Name || '-'}
                  </div>
                  <div style={{
                    flex: 1,
                    padding: '12px 12px',
                    fontSize: '13px',
                    color: '#333',
                    backgroundColor: rowBgColor,
                    borderRight: '1px solid #ddd',
                    minWidth: '190px',
                    wordBreak: 'break-word'
                  }}>
                    {item.Functional_Owner_Email || '-'}
                  </div>
                  <div style={{
                    flex: 1,
                    padding: '12px 12px',
                    fontSize: '13px',
                    color: '#333',
                    backgroundColor: rowBgColor,
                    borderRight: '1px solid #ddd',
                    minWidth: '170px',
                    wordBreak: 'break-word'
                  }}>
                    {item.Technical_Owner_Name || '-'}
                  </div>
                  <div style={{
                    flex: 1,
                    padding: '12px 12px',
                    fontSize: '13px',
                    color: '#333',
                    backgroundColor: rowBgColor,
                    minWidth: '190px',
                    wordBreak: 'break-word'
                  }}>
                    {item.Technical_Owner_Email || '-'}
                  </div> */}
                </div>
              );
            })
          ) : (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              color: '#666',
              fontSize: '14px',
              border: '1px solid #ddd',
              borderTop: 'none'
            }}>
              {filteredData.length === 0
                ? (lovLoading ? 'Loading RICEW requests...' : 'No RICEW requests found. Click "RICEW Request Dashboard" to create one.')
                : tableSearchText
                  ? `No results found for "${tableSearchText}". Try a different search term.`
                  : 'No data to display.'
              }
            </div>
          )}
        </div>

        {/* Template Action Buttons - Below Table */}
        {/* <div style={{
          padding: '1.5rem 2rem',
          backgroundColor: 'white',
          display: 'flex',
          gap: '12px'
        }}>
          <button
            onClick={handleDownloadTemplate}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7,10 12,15 17,10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download Template
          </button>
          <button
            onClick={handleUploadTemplate}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#218838'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#28a745'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17,8 12,3 7,8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Upload Template
          </button>
        </div> */}

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
      `}</style>
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
      )}

      {/* Help Modal */}
      {showHelpPopup && (
        <div
          onClick={() => setShowHelpPopup(false)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
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
            }}
          >
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
                    The <strong>RICEW Dashboard</strong> is the central hub for managing RICEW (Reports, Interfaces, Conversions, Enhancements, and Workflows) request forms for the ERP project. It provides a filterable, searchable list of all RICEW requests and allows administrators to create new ones or review existing ones.
                  </p>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <strong style={{ color: '#1f2937', fontSize: '15px' }}>Why is this used?</strong>
                  <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                    ERP implementations typically require custom-built technical objects — reports, data conversions, integrations, and workflow enhancements. The RICEW Dashboard tracks all such requests in one place, giving project teams visibility into scope, priority, effort estimates, and delivery status.
                  </p>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <strong style={{ color: '#1f2937', fontSize: '15px' }}>Using the filters</strong>
                  <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                    Use the filter dropdowns at the top to narrow the list by attributes such as Process Stream, Application, Priority, and Status. Click <strong>Apply Filters</strong> to fetch matching records, or <strong>Clear All Filters</strong> to reset. Active filters are highlighted in blue.
                  </p>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <strong style={{ color: '#1f2937', fontSize: '15px' }}>Understanding the table</strong>
                  <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                    <li><strong>RICEW ID / Name</strong> — Unique identifier and name of the request. Click the name to open and edit the full form.</li>
                    <li><strong>Type</strong> — The RICEW category: Report, Interface, Conversion, Enhancement, or Workflow.</li>
                    <li><strong>Process Stream / Application</strong> — The ERP workstream and application the request belongs to.</li>
                    <li><strong>Priority</strong> — Business priority level assigned to the request.</li>
                    <li><strong>Status</strong> — Current delivery or approval status of the request.</li>
                  </ul>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to use this page</strong>
                  <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                    <li>Apply one or more filters and click <strong>Apply Filters</strong> to load matching RICEW requests.</li>
                    <li>Use the <strong>Search</strong> bar to further narrow results by name or ID.</li>
                    <li>Click a <strong>RICEW name</strong> (shown in blue) to open its full detail form (Exsiting Data).</li>
                    <li>Click <strong>+ RICEW Request Form </strong> (top right) to create a new request.</li>
                    <li>Use the bulk upload option to import multiple RICEW requests from an Excel template at once.</li>
                  </ul>
                </div>

                <div style={{ marginBottom: '4px' }}>
                  <strong style={{ color: '#1f2937', fontSize: '15px' }}>Important notes</strong>
                  <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                    <li>A project must be selected before RICEW data can be loaded or created.</li>
                    <li>The table is empty until filters are applied and submitted.</li>
                    <li>Records are sorted by creation date (newest first) by default.</li>
                    <li><strong>DRAFT Tag</strong> — Indicates the record was saved as a draft and is not yet finalized.</li>
                  </ul>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .help-modal-scroll::-webkit-scrollbar { width: 4px; }
        .help-modal-scroll::-webkit-scrollbar-track { background: transparent; margin: 8px 0; }
        .help-modal-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .help-modal-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
};

export default NewRicewDashboard;
