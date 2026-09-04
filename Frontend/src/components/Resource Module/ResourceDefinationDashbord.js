import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, HelpCircle, X } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import DOMPurify from 'dompurify';
import { useSession } from '../../context/SessionContext';

const ResourceDefinationDashbord = ({ onClose, onBackToLanding, onLogout, selectedProject }) => {
  const { handleAuthError, userId } = useSession();
  const { getCachedToken } = useAuth();
  const navigate = useNavigate();
  const [filterText, setFilterText] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({
    // Row 1
    organizationName: false,
    businessLine: false,
    portfolioName: false,
    serviceLineName: false,
    employmentType: false,
    workLocation: false,
    nationality: false,
    // Row 2
    processStream: false,
    application: false,
    l0Process: false,
    resourceLevel: false,
    onboardingStatus: false
  });


  const [lovData, setLovData] = useState({
    organizationName: [],
    businessLine: [],
    portfolioName: [],
    serviceLineName: [],
    employmentType: [],
    workLocation: [],
    nationality: [],
    processStream: [],
    application: [],
    l0Process: [],
    resourceLevel: [],
    onboardingStatus: []
  });
  const [levelDefinitions, setLevelDefinitions] = useState([]);

  const [lovLoading, setLovLoading] = useState(true);
  const [filteredData, setFilteredData] = useState([]);
  const [lovError, setLovError] = useState(null);
  const [tableSearchText, setTableSearchText] = useState('');
  const [searchError, setSearchError] = useState('');
  const [openDropdown, setOpenDropdown] = useState(null);
  const [showHelpPopup, setShowHelpPopup] = useState(false);

  // Message and confirmation states
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState('');

  // Selection state
  const [selectedGrantRows, setSelectedGrantRows] = useState([]);
  const [selectedRevokeRows, setSelectedRevokeRows] = useState([]);
  const [selectAllGrant, setSelectAllGrant] = useState(false);
  const [selectAllRevoke, setSelectAllRevoke] = useState(false);

  // Helper function to sort data
  // 1. First sort by created_at (Newest/Latest date first)
  // 2. Then ensure records with Grant_Access="true" appear at the end
  const sortDataByGrantAccess = (data) => {
    return [...data].sort((a, b) => {
      // Primary Sort: Grant Access (True values go to the bottom)
      const aGranted = String(a.Grant_Access) === "true";
      const bGranted = String(b.Grant_Access) === "true";

      if (aGranted && !bGranted) return 1;
      if (!aGranted && bGranted) return -1;

      // Secondary Sort: created_at (Latest/Newest first)
      // Check for both lowercase and capitalized keys
      const dateStrA = a.created_at || a.Created_at;
      const dateStrB = b.created_at || b.Created_at;

      const dateA = dateStrA ? new Date(dateStrA) : new Date(0);
      const dateB = dateStrB ? new Date(dateStrB) : new Date(0);

      // Sort descending (Newest date first)
      return dateB - dateA;
    });
  };

  // Computed filtered data that includes search filtering
  const displayedData = filteredData.filter(item => {
    if (!tableSearchText.trim()) return true;
    const fullName = (item.Full_Name || item.IC_full_name || '').toLowerCase();
    const searchTerm = tableSearchText.toLowerCase();
    return fullName.includes(searchTerm);
  });

  const [selectedValues, setSelectedValues] = useState({
    organizationName: [],
    businessLine: [],
    portfolioName: [],
    serviceLineName: [],
    employmentType: [],
    workLocation: [],
    nationality: [],
    processStream: [],
    application: [],
    l0Process: [],
    resourceLevel: [],
    onboardingStatus: []
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

  // Set LOV loading to false on mount since we have mock data pre-populated
  // Load data from API on mount
  useEffect(() => {
    const fetchLevelDefinitions = async () => {
      try {
        const idToken = await getCachedToken();
        const response = await fetch('https://fuahu3jqsc.execute-api.ap-south-1.amazonaws.com/New/api/get/LOV/leveldefinitions', {
          headers: { 'Authorization': `Bearer ${idToken}` }
        });
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setLevelDefinitions(result.data);
          }
        }
      } catch (error) {
        console.error('Error fetching level definitions:', error);
      } finally {
        setLovLoading(false);
      }
    };

    fetchLevelDefinitions();
  }, []);

  // Fetch LOV dropdown data from API on mount
  useEffect(() => {
    const fetchLOVData = async () => {
      try {
        const idToken = await getCachedToken();
        const headers = {
          'Content-Type': 'application/json'
        };
        if (idToken) {
          headers['Authorization'] = `Bearer ${idToken}`;
        }

        // Fetch hierarchical LOV data (Organization, Business Line, etc.)
        const response1 = await fetch(
          'https://jvphz6t79l.execute-api.ap-south-1.amazonaws.com/New/filter/ricew/LOV/resource-definition-dropdownList',
          {
            method: 'GET',
            headers: headers
          }
        );

        // Fetch Employee Level and Employment Status data
        const response2 = await fetch(
          'https://jvphz6t79l.execute-api.ap-south-1.amazonaws.com/New/filter/ricew/LOV/resource-definition-dropdownList-2',
          {
            method: 'GET',
            headers: headers
          }
        );

        if (response1.status === 401 || response1.status === 403 || response2.status === 401 || response2.status === 403) {
          handleAuthError('Unauthorized - session expired');
          return;
        }

        const result1 = await response1.json();
        const result2 = await response2.json();

        if (result1.success && result2.success) {
          // Transform hierarchical data for other fields
          const transformedData = transformHierarchicalLOVData(result1);

          // Add Employee Level from the new endpoint
          if (result2.data?.levels && result2.data.levels.length > 0) {
            // Sort by Level_Definition_id and store designations
            const sortedLevels = result2.data.levels.sort((a, b) => {
              const idA = parseInt(a.Level_Definition_id) || 0;
              const idB = parseInt(b.Level_Definition_id) || 0;
              return idA - idB;
            });
            transformedData.resourceLevel = sortedLevels.map(level => level.designation);
          }

          // Add Employment Status from the new endpoint
          if (result2.data?.employee_status_options && result2.data.employee_status_options.length > 0) {
            transformedData.onboardingStatus = result2.data.employee_status_options;
          }

          setLovData(transformedData);
        } else {
          setErrorMessage('Failed to load filter dropdown options');
          setShowErrorMessage(true);
          setTimeout(() => setShowErrorMessage(false), 5000);
        }
      } catch (error) {
        console.error('Error fetching LOV data:', error);
        setErrorMessage('Failed to load filter dropdown options. Please try again.');
        setShowErrorMessage(true);
        setTimeout(() => setShowErrorMessage(false), 5000);
      }
    };

    fetchLOVData();
  }, []);

  const [isInitialized, setIsInitialized] = useState(false);

  // Restore dashboard state from localStorage on component mount
  useEffect(() => {
    const savedState = localStorage.getItem('resourceDashboardState');
    if (savedState) {
      try {
        const dashboardState = JSON.parse(savedState);

        setSelectedFilters(dashboardState.selectedFilters || selectedFilters);
        setSelectedValues(dashboardState.selectedValues || selectedValues);
        setTableSearchText(dashboardState.tableSearchText || '');

        if (dashboardState.lovData && Object.keys(dashboardState.lovData).length > 0) {
          setLovData(dashboardState.lovData);
        }

        // Trigger filter submission with the restored values
        submitFilters(dashboardState.selectedValues);
      } catch (error) {
        console.error('Error restoring dashboard state:', error);
      }
    }
    setIsInitialized(true);
  }, []);

  // Save dashboard state to localStorage whenever filters, search text, or filtered data change (only after initialization)
  useEffect(() => {
    if (isInitialized) {
      if (filteredData && filteredData.length > 0) {
        const dashboardState = {
          selectedFilters,
          selectedValues,
          tableSearchText,
          lovData
        };
        localStorage.setItem('resourceDashboardState', JSON.stringify(dashboardState));
      } else {
        localStorage.removeItem('resourceDashboardState');
      }
    }
  }, [selectedFilters, selectedValues, tableSearchText, lovData, filteredData, isInitialized]);

  const toggleFilter = (filterKey) => {
    setSelectedFilters(prev => ({
      ...prev,
      [filterKey]: !prev[filterKey]
    }));
  };

  const clearAllFilters = () => {
    const emptyValues = {
      organizationName: [],
      businessLine: [],
      portfolioName: [],
      serviceLineName: [],
      employmentType: [],
      workLocation: [],
      nationality: [],
      processStream: [],
      application: [],
      l0Process: [],
      resourceLevel: [],
      onboardingStatus: []
    };

    setSelectedFilters({
      organizationName: false,
      businessLine: false,
      portfolioName: false,
      serviceLineName: false,
      employmentType: false,
      workLocation: false,
      nationality: false,
      processStream: false,
      application: false,
      l0Process: false,
      resourceLevel: false,
      onboardingStatus: false
    });
    setSelectedValues(emptyValues);
    setFilteredData([]);
    setTableSearchText('');
    setOpenDropdown(null);
    setSelectedGrantRows([]);
    setSelectAllGrant(false);
    setSelectedRevokeRows([]);
    setSelectAllRevoke(false);

    // Remove saved state
    localStorage.removeItem('resourceDashboardState');
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

  const handleViewDetails = (resourceId) => {
    // Save state only if there is data in the filter table, otherwise clear it
    if (filteredData && filteredData.length > 0) {
      const dashboardState = {
        selectedFilters,
        selectedValues,
        tableSearchText,
        lovData
      };
      localStorage.setItem('resourceDashboardState', JSON.stringify(dashboardState));
    } else {
      localStorage.removeItem('resourceDashboardState');
    }

    navigate(`/dashboard/resource-definition-form/edit/${resourceId}`);
  };

  const handleCreateNewForm = () => {
    // Save state only if there is data in the filter table, otherwise clear it
    if (filteredData && filteredData.length > 0) {
      const dashboardState = {
        selectedFilters,
        selectedValues,
        tableSearchText,
        lovData
      };
      localStorage.setItem('resourceDashboardState', JSON.stringify(dashboardState));
    } else {
      localStorage.removeItem('resourceDashboardState');
    }

    navigate('/dashboard/resource-definition-form');
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



  const handleGrantAccess = () => {
    if (selectedGrantRows.length === 0) {
      setErrorMessage('Please select at least one record to grant access.');
      setShowErrorMessage(true);
      setTimeout(() => setShowErrorMessage(false), 3000);
      return;
    }

    const executeGrantAccess = async () => {
      try {
        // Get resource IDs and user details from selected rows
        const selectedUsers = selectedGrantRows.map(index => displayedData[index]);
        const resourceIds = selectedUsers.map(u => String(u.Resource_Defination_Form_record_id || u.Resource_Roster_Form_id));
        const projectId = selectedProject?.id;

        // Get auth token
        const idToken = await getCachedToken();

        // 1. Call the new Assign User API for each selected user in parallel
        const assignPromises = selectedUsers.map(user => {
          const payload = {
            email: user.Email_Address || user.IC_email,
            name: user.Full_Name || user.IC_full_name,
            project_id: projectId
          };

          return fetch('https://d0aynp5ued.execute-api.ap-south-1.amazonaws.com/dev/api/admin/assign-user-to-project', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify(payload)
          }).then(res => res.json());
        });

        // We'll wait for all user assignments to complete/fail
        const assignResults = await Promise.all(assignPromises);
        console.log('Assign User Results:', assignResults);

        // 2. Original batch update to update Grant_Access flag in the resource roster table
        const response = await fetch(
          'https://m4wh3q1onb.execute-api.ap-south-1.amazonaws.com/New/api/update/rice-resource-roster/grant-access',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({
              resource_ids: resourceIds,
              grant_access: true,
              updated_by: userId
            })
          }
        );

        if (response.status === 401 || response.status === 403) {
          handleAuthError('Unauthorized - session expired');
          return;
        }

        const result = await response.json();

        if (result.success) {
          const recordText = result.data.success_count === 1 ? 'record' : 'records';
          setSuccessMessage(`Access granted for ${result.data.success_count} ${recordText}`);
          setShowSuccessMessage(true);
          setTimeout(() => setShowSuccessMessage(false), 3000);
          // Clear selections
          setSelectedGrantRows([]);
          setSelectAllGrant(false);
          // Reload data with current filters
          submitFilters();
        } else {
          setErrorMessage(result.error || 'Failed to grant access');
          setShowErrorMessage(true);
          setTimeout(() => setShowErrorMessage(false), 3000);
        }
      } catch (error) {
        console.error('Error granting access:', error);
        setErrorMessage('Failed to grant access. Please try again.');
        setShowErrorMessage(true);
        setTimeout(() => setShowErrorMessage(false), 3000);
      }
    };

    const recordText = selectedGrantRows.length === 1 ? 'record' : 'records';
    showConfirmation(
      `Are you sure you want to grant access to the ${selectedGrantRows.length} selected ${recordText}?`,
      executeGrantAccess
    );
  };

  const handleRevokeAccess = () => {
    if (selectedRevokeRows.length === 0) {
      setErrorMessage('Please select at least one record to revoke access.');
      setShowErrorMessage(true);
      setTimeout(() => setShowErrorMessage(false), 3000);
      return;
    }

    const executeRevokeAccess = async () => {
      try {
        // Get resource IDs and user details from selected rows
        const selectedUsers = selectedRevokeRows.map(index => displayedData[index]);
        const resourceIds = selectedUsers.map(u => String(u.Resource_Defination_Form_record_id || u.Resource_Roster_Form_id));
        const projectId = selectedProject?.id;

        // Get auth token
        const idToken = await getCachedToken();

        // 1. Call the new Remove User Access API for each selected user in parallel
        const removePromises = selectedUsers.map(user => {
          const payload = {
            email: user.Email_Address || user.IC_email,
            project_id: projectId
          };

          return fetch('https://d0aynp5ued.execute-api.ap-south-1.amazonaws.com/dev/api/admin/remove-user-access', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify(payload)
          }).then(res => res.json());
        });

        // Wait for all removal requests to complete
        const removeResults = await Promise.all(removePromises);
        console.log('Remove User Results:', removeResults);

        // 2. Batch update to update Grant_Access flag in the resource roster table
        const response = await fetch(
          'https://m4wh3q1onb.execute-api.ap-south-1.amazonaws.com/New/api/update/rice-resource-roster/grant-access',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({
              resource_ids: resourceIds,
              grant_access: false,
              updated_by: userId
            })
          }
        );

        if (response.status === 401 || response.status === 403) {
          handleAuthError('Unauthorized - session expired');
          return;
        }

        const result = await response.json();

        if (result.success) {
          const recordText = result.data.success_count === 1 ? 'record' : 'records';
          setSuccessMessage(`Access revoked for ${result.data.success_count} ${recordText}`);
          setShowSuccessMessage(true);
          setTimeout(() => setShowSuccessMessage(false), 3000);
          // Clear selections
          setSelectedRevokeRows([]);
          setSelectAllRevoke(false);
          // Reload data with current filters
          submitFilters();
        } else {
          setErrorMessage(result.error || 'Failed to revoke access');
          setShowErrorMessage(true);
          setTimeout(() => setShowErrorMessage(false), 3000);
        }
      } catch (error) {
        console.error('Error revoking access:', error);
        setErrorMessage('Failed to revoke access. Please try again.');
        setShowErrorMessage(true);
        setTimeout(() => setShowErrorMessage(false), 3000);
      }
    };

    const recordText = selectedRevokeRows.length === 1 ? 'record' : 'records';
    showConfirmation(
      `Are you sure you want to revoke access for the ${selectedRevokeRows.length} selected ${recordText}?`,
      executeRevokeAccess
    );
  };

  const submitFilters = async (overrideValues = null) => {
    console.log('=== SUBMITTING FILTERS (API) ===');
    setLovLoading(true);

    try {
      const idToken = await getCachedToken();
      const headers = {
        'Content-Type': 'application/json'
      };
      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      const paramMapping = {
        organizationName: 'Organization_Name',
        businessLine: 'Business_Line',
        portfolioName: 'Portfolio_Name',
        serviceLineName: 'Service_Line_Name',
        employmentType: 'Employment_Type',
        workLocation: 'Work_Location',
        nationality: 'Nationality',
        resourceLevel: 'Employee_Level',
        onboardingStatus: 'Employment_Status'
      };

      const valuesToUse = overrideValues || selectedValues;

      // Check if any filters are selected
      const hasActiveFilters = Object.values(valuesToUse).some(v => v && v.length > 0);

      console.log('Selected Values:', valuesToUse);
      console.log('Has Active Filters:', hasActiveFilters);

      const queryParams = new URLSearchParams();
      Object.entries(valuesToUse).forEach(([key, values]) => {
        const dbKey = paramMapping[key];
        if (dbKey && values && values.length > 0) {
          values.forEach(val => {
            queryParams.append(dbKey, val);
          });
        }
      });

      const url = `https://jvphz6t79l.execute-api.ap-south-1.amazonaws.com/New/filter/ricew/allData/resource-definition-filter?${queryParams.toString()}`;
      console.log('Filter API URL:', url);
      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        return;
      }

      const result = await response.json();

      if (result.success && result.data && result.data.length > 0) {
        const records = result.data;
        setFilteredData(sortDataByGrantAccess(records));


      } else {
        // No records found - show error without fallback
        setFilteredData([]);
        setErrorMessage(result.error || 'No records found matching your filter criteria.');
        setShowErrorMessage(true);
        setTimeout(() => setShowErrorMessage(false), 5000);
      }
    } catch (error) {
      console.error('Error applying filters:', error);
      setFilteredData([]);
      setErrorMessage('Failed to apply filters. Please try again.');
      setShowErrorMessage(true);
      setTimeout(() => setShowErrorMessage(false), 5000);
    } finally {
      setLovLoading(false);
    }

    setSelectedGrantRows([]);
    setSelectAllGrant(false);
    setSelectedRevokeRows([]);
    setSelectAllRevoke(false);
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
  useEffect(() => {
    const handleZoomChange = () => {
      const zoomLevel = Math.round((window.outerWidth / window.innerWidth) * 100);

      if (zoomLevel <= 60) {
        setMaxWidth('2400px'); // For zoom <= 60%
        setMarginRight('80px'); // Adjust margin for 60% zoom
      } else if (zoomLevel <= 80) {
        setMaxWidth('1800px'); // For zoom <= 80%
        setMarginRight('50px'); // Adjust margin for 80% zoom
      } else {
        setMaxWidth('1500px'); // For zoom 100% or higher
        setMarginRight('0px'); // Default margin
      }
    };

    window.addEventListener('resize', handleZoomChange);
    handleZoomChange(); // Initial call

    return () => window.removeEventListener('resize', handleZoomChange);
  }, []);

  // Transform hierarchical LOV data to flat dropdown lists
  const transformHierarchicalLOVData = (apiResponse) => {
    const transformed = {
      organizationName: [],
      businessLine: [],
      portfolioName: [],
      serviceLineName: [],
      employmentType: [],
      workLocation: [],
      nationality: [],
      processStream: [],
      application: [],
      l0Process: [],
      resourceLevel: [],
      onboardingStatus: []
    };

    // Extract employment types (already flat in API response)
    if (apiResponse.employmentTypes && Array.isArray(apiResponse.employmentTypes)) {
      transformed.employmentType = apiResponse.employmentTypes
        .map(item => item.Employment_Type)
        .filter(Boolean);
    }

    // Extract organization, business line, portfolio, and service names from hierarchy
    if (apiResponse.organizations && Array.isArray(apiResponse.organizations)) {
      // Use an array keyed by organization_id so all orgs appear (even same-name ones)
      const orgEntries = []; // [{ id, name }]
      const blMap = new Map();
      const portfolioMap = new Map();
      const serviceMap = new Map();
      const countries = new Set();

      apiResponse.organizations.forEach(org => {
        // Add organization — unique by organization_id, display SI_organization_name
        if (org.organization_id && org.SI_organization_name) {
          orgEntries.push({ id: org.organization_id, name: org.SI_organization_name });
        }

        // Add country of operations for Work Location and Nationality
        if (org.country_of_operations) {
          org.country_of_operations.split(',').forEach(c => {
            const trimmed = c.trim();
            if (trimmed) {
              countries.add(trimmed);
            }
          });
        }

        // Extract business lines, portfolios, and services
        if (org.businessLines && Array.isArray(org.businessLines)) {
          org.businessLines.forEach(bl => {
            // Add business line name
            if (bl.Business_Line_Name) {
              blMap.set(bl.Business_Line_Name, bl.Business_Line_DisplayID || '');
            }

            // Extract portfolios and services (businessLines property contains portfolios)
            if (bl.businessLines && Array.isArray(bl.businessLines)) {
              bl.businessLines.forEach(portfolio => {
                // Add portfolio name
                if (portfolio.Portfolio_Name) {
                  portfolioMap.set(portfolio.Portfolio_Name, portfolio.Portfolio_DisplayID || '');
                }

                // Add service names
                if (portfolio.services && Array.isArray(portfolio.services)) {
                  portfolio.services.forEach(service => {
                    if (service.Service_Name) {
                      serviceMap.set(service.Service_Name, service.Service_DisplayID || '');
                    }
                  });
                }
              });
            }
          });
        }
      });

      // Sort orgs by organization_id (numeric-aware), extract names, then deduplicate
      // Sorting first ensures the lowest organization_id wins when names clash
      // The name (SI_organization_name) is what gets sent to the filter API
      transformed.organizationName = orgEntries
        .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
        .map(entry => `${entry.name} (${entry.id})`)
        .filter((val, index, arr) => arr.indexOf(val) === index); // unique values only

      transformed.businessLine = Array.from(blMap.entries())
        .sort((a, b) => a[1].localeCompare(b[1], undefined, { numeric: true }))
        .map(entry => entry[0]);

      transformed.portfolioName = Array.from(portfolioMap.entries())
        .sort((a, b) => a[1].localeCompare(b[1], undefined, { numeric: true }))
        .map(entry => entry[0]);

      transformed.serviceLineName = Array.from(serviceMap.entries())
        .sort((a, b) => a[1].localeCompare(b[1], undefined, { numeric: true }))
        .map(entry => entry[0]);

      transformed.workLocation = Array.from(countries).sort();
      transformed.nationality = Array.from(countries).sort();
    }

    return transformed;
  };

  return (
    <div className="config-main" style={{ minHeight: '80vh', width: 'calc(98% - 2rem)', maxWidth: maxWidth, margin: '2rem auto', marginLeft: '2rem', marginRight: '2rem' }}>
      <div style={{ padding: '2rem 1rem 1rem 2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
          {/* <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project : <span style={{ color: '#007bff' }}>{selectedProject?.name}</span></h3> */}
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
              // marginRight: marginRight,
              transition: 'all 0.2s'
            }}
          >
            <Plus size={18} />
            Resource Defination Form
          </button>
        </div>
      </div>
      <div className="config-header" style={{ marginTop: '0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2>Resource Defination Dashboard</h2>
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
          {DOMPurify.sanitize(successMessage, { ALLOWED_TAGS: [] })}
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
          {DOMPurify.sanitize(errorMessage, { ALLOWED_TAGS: [] })}
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
              {DOMPurify.sanitize(confirmMessage, { ALLOWED_TAGS: [] })}
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

      {/* Filter Section */}
      <div
        style={{
          padding: '1.5rem 2rem',
          backgroundColor: 'white',
        }}>
        {/* First Row Filters */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            marginBottom: '1rem',
            flexWrap: 'wrap'
          }}>
            {/* Organization Name Dropdown */}
            <div style={{ position: 'relative', width: '140px' }}>
              <button
                data-filter-button="true"
                onClick={() => toggleDropdown('organizationName')}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  backgroundColor: selectedValues.organizationName.length > 0 ? '#3b82f6' : '#f9f9f9',
                  color: selectedValues.organizationName.length > 0 ? 'white' : '#333',
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
                Organization Name
              </button>
              {openDropdown === 'organizationName' && (
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
                  {(lovData.organizationName || []).map((option, index) => (
                    <label
                      key={index}
                      data-dropdown-option="true"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 10px',
                        cursor: 'pointer',
                        backgroundColor: selectedValues.organizationName.includes(option) ? '#e3f2fd' : 'white',
                        borderBottom: '1px solid #f0f0f0',
                        fontSize: '12px'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedValues.organizationName.includes(option)}
                        onChange={() => toggleFilterValue('organizationName', option)}
                        style={{ marginRight: '8px', cursor: 'pointer' }}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              )}
            </div>
            {/* Business Line Dropdown */}
            <div style={{ position: 'relative', width: '140px' }}>
              <button
                data-filter-button="true"
                onClick={() => toggleDropdown('businessLine')}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  backgroundColor: selectedValues.businessLine.length > 0 ? '#3b82f6' : '#f9f9f9',
                  color: selectedValues.businessLine.length > 0 ? 'white' : '#333',
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
                Business Line
              </button>
              {openDropdown === 'businessLine' && (
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
                  {(lovData.businessLine || []).map((option, index) => (
                    <label
                      key={index}
                      data-dropdown-option="true"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 10px',
                        cursor: 'pointer',
                        backgroundColor: selectedValues.businessLine.includes(option) ? '#e3f2fd' : 'white',
                        borderBottom: '1px solid #f0f0f0',
                        fontSize: '12px'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedValues.businessLine.includes(option)}
                        onChange={() => toggleFilterValue('businessLine', option)}
                        style={{ marginRight: '8px', cursor: 'pointer' }}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              )}
            </div>
            {/* Portfolio Name Dropdown */}
            <div style={{ position: 'relative', width: '140px' }}>
              <button
                data-filter-button="true"
                onClick={() => toggleDropdown('portfolioName')}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  backgroundColor: selectedValues.portfolioName.length > 0 ? '#3b82f6' : '#f9f9f9',
                  color: selectedValues.portfolioName.length > 0 ? 'white' : '#333',
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
                Portfolio Name
              </button>
              {openDropdown === 'portfolioName' && (
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
                  {(lovData.portfolioName || []).map((option, index) => (
                    <label
                      key={index}
                      data-dropdown-option="true"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 10px',
                        cursor: 'pointer',
                        backgroundColor: selectedValues.portfolioName.includes(option) ? '#e3f2fd' : 'white',
                        borderBottom: '1px solid #f0f0f0',
                        fontSize: '12px'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedValues.portfolioName.includes(option)}
                        onChange={() => toggleFilterValue('portfolioName', option)}
                        style={{ marginRight: '8px', cursor: 'pointer' }}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              )}
            </div>
            {/* Service Line Name Dropdown */}
            <div style={{ position: 'relative', width: '140px' }}>
              <button
                data-filter-button="true"
                onClick={() => toggleDropdown('serviceLineName')}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  backgroundColor: selectedValues.serviceLineName.length > 0 ? '#3b82f6' : '#f9f9f9',
                  color: selectedValues.serviceLineName.length > 0 ? 'white' : '#333',
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
                Service Line Name
              </button>
              {openDropdown === 'serviceLineName' && (
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
                  {(lovData.serviceLineName || []).map((option, index) => (
                    <label
                      key={index}
                      data-dropdown-option="true"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 10px',
                        cursor: 'pointer',
                        backgroundColor: selectedValues.serviceLineName.includes(option) ? '#e3f2fd' : 'white',
                        borderBottom: '1px solid #f0f0f0',
                        fontSize: '12px'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedValues.serviceLineName.includes(option)}
                        onChange={() => toggleFilterValue('serviceLineName', option)}
                        style={{ marginRight: '8px', cursor: 'pointer' }}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              )}
            </div>
            {/* Nationality Dropdown */}
            <div style={{ position: 'relative', width: '140px' }}>
              <button
                data-filter-button="true"
                onClick={() => toggleDropdown('nationality')}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  backgroundColor: selectedValues.nationality.length > 0 ? '#3b82f6' : '#f9f9f9',
                  color: selectedValues.nationality.length > 0 ? 'white' : '#333',
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
                Nationality
              </button>
              {openDropdown === 'nationality' && (
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
                  {(lovData.nationality || []).map((option, index) => (
                    <label
                      key={index}
                      data-dropdown-option="true"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 10px',
                        cursor: 'pointer',
                        backgroundColor: selectedValues.nationality.includes(option) ? '#e3f2fd' : 'white',
                        borderBottom: '1px solid #f0f0f0',
                        fontSize: '12px'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedValues.nationality.includes(option)}
                        onChange={() => toggleFilterValue('nationality', option)}
                        style={{ marginRight: '8px', cursor: 'pointer' }}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              )}
            </div>
            {/* Work Location Dropdown */}
            <div style={{ position: 'relative', width: '140px' }}>
              <button
                data-filter-button="true"
                onClick={() => toggleDropdown('workLocation')}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  backgroundColor: selectedValues.workLocation.length > 0 ? '#3b82f6' : '#f9f9f9',
                  color: selectedValues.workLocation.length > 0 ? 'white' : '#333',
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
                Work Location
              </button>
              {openDropdown === 'workLocation' && (
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
                  {(lovData.workLocation || []).map((option, index) => (
                    <label
                      key={index}
                      data-dropdown-option="true"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 10px',
                        cursor: 'pointer',
                        backgroundColor: selectedValues.workLocation.includes(option) ? '#e3f2fd' : 'white',
                        borderBottom: '1px solid #f0f0f0',
                        fontSize: '12px'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedValues.workLocation.includes(option)}
                        onChange={() => toggleFilterValue('workLocation', option)}
                        style={{ marginRight: '8px', cursor: 'pointer' }}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => submitFilters()}
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
        </div>

        {/* Second Row Filters */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            marginBottom: '1rem',
            flexWrap: 'wrap'
          }}>
            {/* Process Stream Dropdown */}
            <div style={{ position: 'relative', width: '140px' }}>
              <button
                data-filter-button="true"
                onClick={() => toggleDropdown('processStream')}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  backgroundColor: selectedValues.processStream.length > 0 ? '#3b82f6' : '#f9f9f9',
                  color: selectedValues.processStream.length > 0 ? 'white' : '#333',
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
              {openDropdown === 'processStream' && (
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
                  {(lovData.processStream || []).map((option, index) => (
                    <label
                      key={index}
                      data-dropdown-option="true"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 10px',
                        cursor: 'pointer',
                        backgroundColor: selectedValues.processStream.includes(option) ? '#e3f2fd' : 'white',
                        borderBottom: '1px solid #f0f0f0',
                        fontSize: '12px'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedValues.processStream.includes(option)}
                        onChange={() => toggleFilterValue('processStream', option)}
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
                onClick={() => toggleDropdown('application')}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  backgroundColor: selectedValues.application.length > 0 ? '#3b82f6' : '#f9f9f9',
                  color: selectedValues.application.length > 0 ? 'white' : '#333',
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
              {openDropdown === 'application' && (
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
                  {(lovData.application || []).map((option, index) => (
                    <label
                      key={index}
                      data-dropdown-option="true"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 10px',
                        cursor: 'pointer',
                        backgroundColor: selectedValues.application.includes(option) ? '#e3f2fd' : 'white',
                        borderBottom: '1px solid #f0f0f0',
                        fontSize: '12px'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedValues.application.includes(option)}
                        onChange={() => toggleFilterValue('application', option)}
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
                onClick={() => toggleDropdown('l0Process')}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  backgroundColor: selectedValues.l0Process.length > 0 ? '#3b82f6' : '#f9f9f9',
                  color: selectedValues.l0Process.length > 0 ? 'white' : '#333',
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
              {openDropdown === 'l0Process' && (
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
                  {(lovData.l0Process || []).map((option, index) => (
                    <label
                      key={index}
                      data-dropdown-option="true"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 10px',
                        cursor: 'pointer',
                        backgroundColor: selectedValues.l0Process.includes(option) ? '#e3f2fd' : 'white',
                        borderBottom: '1px solid #f0f0f0',
                        fontSize: '12px'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedValues.l0Process.includes(option)}
                        onChange={() => toggleFilterValue('l0Process', option)}
                        style={{ marginRight: '8px', cursor: 'pointer' }}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              )}
            </div>
            {/* Employee Level Dropdown */}
            <div style={{ position: 'relative', width: '140px' }}>
              <button
                data-filter-button="true"
                onClick={() => toggleDropdown('resourceLevel')}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  backgroundColor: selectedValues.resourceLevel.length > 0 ? '#3b82f6' : '#f9f9f9',
                  color: selectedValues.resourceLevel.length > 0 ? 'white' : '#333',
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
                Employee Level
              </button>
              {openDropdown === 'resourceLevel' && (
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
                  {(lovData.resourceLevel || []).map((designation, index) => (
                    <label
                      key={index}
                      data-dropdown-option="true"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 10px',
                        cursor: 'pointer',
                        backgroundColor: selectedValues.resourceLevel.includes(designation) ? '#e3f2fd' : 'white',
                        borderBottom: '1px solid #f0f0f0',
                        fontSize: '12px'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedValues.resourceLevel.includes(designation)}
                        onChange={() => toggleFilterValue('resourceLevel', designation)}
                        style={{ marginRight: '8px', cursor: 'pointer' }}
                      />
                      {designation}
                    </label>
                  ))}
                </div>
              )}
            </div>
            {/* Employment Type Dropdown */}
            <div style={{ position: 'relative', width: '140px' }}>
              <button
                data-filter-button="true"
                onClick={() => toggleDropdown('employmentType')}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  backgroundColor: selectedValues.employmentType.length > 0 ? '#3b82f6' : '#f9f9f9',
                  color: selectedValues.employmentType.length > 0 ? 'white' : '#333',
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
                Employment Type
              </button>
              {openDropdown === 'employmentType' && (
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
                  {(lovData.employmentType || []).map((option, index) => (
                    <label
                      key={index}
                      data-dropdown-option="true"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 10px',
                        cursor: 'pointer',
                        backgroundColor: selectedValues.employmentType.includes(option) ? '#e3f2fd' : 'white',
                        borderBottom: '1px solid #f0f0f0',
                        fontSize: '12px'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedValues.employmentType.includes(option)}
                        onChange={() => toggleFilterValue('employmentType', option)}
                        style={{ marginRight: '8px', cursor: 'pointer' }}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              )}
            </div>
            {/* Employment Status Dropdown */}
            <div style={{ position: 'relative', width: '140px' }}>
              <button
                data-filter-button="true"
                onClick={() => toggleDropdown('onboardingStatus')}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  backgroundColor: selectedValues.onboardingStatus.length > 0 ? '#3b82f6' : '#f9f9f9',
                  color: selectedValues.onboardingStatus.length > 0 ? 'white' : '#333',
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
                Employment Status
              </button>
              {openDropdown === 'onboardingStatus' && (
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
                  {(lovData.onboardingStatus || []).map((option, index) => (
                    <label
                      key={index}
                      data-dropdown-option="true"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 10px',
                        cursor: 'pointer',
                        backgroundColor: selectedValues.onboardingStatus.includes(option) ? '#e3f2fd' : 'white',
                        borderBottom: '1px solid #f0f0f0',
                        fontSize: '12px'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedValues.onboardingStatus.includes(option)}
                        onChange={() => toggleFilterValue('onboardingStatus', option)}
                        style={{ marginRight: '8px', cursor: 'pointer' }}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={clearAllFilters}
              style={{
                width: '140px',
                padding: '6px 10px',
                backgroundColor: '#dc2626',
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
              Clear All Filters
            </button>
          </div>
        </div>
      </div>

      {/* Table Search Bar */}
      <div style={{
        padding: '1rem 2rem',
        backgroundColor: '#f8f9fa',
        borderTop: '1px solid #ddd',
        border: '1px solid #ddd',
        borderBottom: 'none'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <label style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#333',
            minWidth: '120px'
          }}>
            Search Results:
          </label>
          <div style={{ flex: 1 }}>
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
                placeholder="Search by Full Name..."
                value={tableSearchText}
                onChange={(e) => handleSearchChange(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 12px 8px 32px',
                  border: searchError ? '1px solid #ef4444' : '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '13px',
                  maxWidth: '300px',
                  width: '100%'
                }}
              />
            </div>
            {searchError && (
              <div style={{
                marginTop: '4px',
                padding: '4px 8px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '4px',
                color: '#dc2626',
                fontSize: '12px',
                fontWeight: '500',
                width: '100%',
                maxWidth: '300px'
              }}>
                {searchError}
              </div>
            )}
          </div>
          {tableSearchText && !searchError && (
            <span style={{
              fontSize: '12px',
              color: '#666',
              marginLeft: '0.5rem'
            }}>
              {tableSearchText.length}/100 characters
            </span>
          )}
        </div>
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
        {/* Action Row - Above Headers */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #ddd',
          padding: '0 0 0 2rem',
          backgroundColor: 'white'
        }}>
          {/* Full Name spacer */}
          <div style={{ flex: 1, minWidth: '150px', padding: '12px 12px', borderRight: '1px solid transparent' }}></div>
          {/* Primary Role spacer */}
          <div style={{ flex: 1, minWidth: '120px', padding: '12px 12px', borderRight: '1px solid transparent' }}></div>
          {/* Employee Level spacer */}
          <div style={{ flex: 1, minWidth: '120px', padding: '12px 12px', borderRight: '1px solid transparent' }}></div>
          {/* Application spacer */}
          <div style={{ flex: 1, minWidth: '120px', padding: '12px 12px', borderRight: '1px solid transparent' }}></div>
          {/* Start Date spacer - removed */}
          {/* End Date spacer - removed */}
          {/* Organization Name spacer */}
          <div style={{ flex: 1, minWidth: '140px', padding: '12px 12px', borderRight: '1px solid transparent' }}></div>
          {/* Email Address spacer */}
          <div style={{ flex: 1, minWidth: '150px', borderRight: '1px solid #ddd', padding: '12px 12px' }}></div>

          {/* Grant Access Button
          <div style={{
            flex: '0 0 130px',
            minWidth: '130px',
            padding: '6px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            borderRight: '1px solid #ddd'
          }}>
            <button
              onClick={handleGrantAccess}
              style={{
                marginLeft: '5px',
                marginRight: '5px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                padding: '6px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: '500',
                width: '100%',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
              title="Grant Access to selected records"
              onMouseEnter={(e) => e.target.style.backgroundColor = '#218838'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#28a745'}
            >
              Grant Access{selectedGrantRows.length > 0 ? ` (${selectedGrantRows.length})` : ''}
            </button>
          </div>
          */}

          {/* Revoke Access Button
          <div style={{
            flex: '0 0 130px',
            minWidth: '130px',
            padding: '6px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <button
              onClick={handleRevokeAccess}
              style={{
                marginLeft: '5px',
                marginRight: '5px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                padding: '6px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: '500',
                width: '100%',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
              title="Revoke Access for selected records"
              onMouseEnter={(e) => e.target.style.backgroundColor = '#dc2626'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#ef4444'}
            >
              Revoke Access{selectedRevokeRows.length > 0 ? ` (${selectedRevokeRows.length})` : ''}
            </button>
          </div>
          */}
        </div>

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
            Full Name
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
            Primary Skill
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
            Employee Level
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
            Employee ID
          </div>
          <div style={{
            flex: 1,
            padding: '12px 12px',
            fontWeight: 'bold',
            fontSize: '14px',
            color: '#333',
            borderRight: '1px solid #ddd',
            minWidth: '140px'
          }}>
            Organization Name
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
            Email Address
          </div>
        </div>

        {/* Table Body Rows */}
        {displayedData.length > 0 ? (
          displayedData.map((item, index) => {
            const rowBgColor = index % 2 === 0 ? '#ffffff' : '#ffffff';
            const recordId = item.Resource_Defination_Form_record_id || '';
            const sanitizedFullName = DOMPurify.sanitize(item.Full_Name || '', { ALLOWED_TAGS: [] });
            const sanitizedPrimarySkill = DOMPurify.sanitize(item.Primary_Skill?.skill_name || item.Primary_Skill || '', { ALLOWED_TAGS: [] });
            const sanitizedResourceLevel = DOMPurify.sanitize(item.Employee_Level || '', { ALLOWED_TAGS: [] });
            const sanitizedEmployeeID = DOMPurify.sanitize(item.Employee_ID || '', { ALLOWED_TAGS: [] });
            const sanitizedOrgName = DOMPurify.sanitize(item.Organization_Name || '', { ALLOWED_TAGS: [] });
            const sanitizedEmail = DOMPurify.sanitize(item.Email_Address || '', { ALLOWED_TAGS: [] });
            return (
              <div
                key={recordId || index}
                style={{
                  display: 'flex',
                  backgroundColor: rowBgColor,
                  borderLeft: '1px solid #ddd',
                  borderRight: '1px solid #ddd',
                  borderBottom: '1px solid #ddd',
                  padding: '0 0 0 2rem'
                }}
              >
                <div style={{
                  flex: 1,
                  padding: '12px 12px',
                  fontSize: '13px',
                  color: '#333',
                  backgroundColor: rowBgColor,
                  borderRight: '1px solid #ddd',
                  minWidth: '150px',
                  wordBreak: 'break-word',
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '4px'
                }}>
                  <span
                    onClick={() => handleViewDetails(recordId)}
                    style={{
                      fontWeight: '500',
                      color: '#007bff',
                      cursor: 'pointer',
                      textDecoration: 'none'
                    }}
                    onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                    onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                  >
                    {sanitizedFullName || '-'}
                  </span>
                  {(String(item.save_draft) === "true" || String(item.save_Draft) === "true") && (
                    <span style={{
                      backgroundColor: '#fef3c7',
                      color: '#92400e',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      border: '1px solid #fde68a',
                      display: 'inline-flex',
                      alignItems: 'center',
                      verticalAlign: 'middle'
                    }}>
                      Draft
                    </span>
                  )}
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
                  {sanitizedPrimarySkill || '-'}
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
                  {DOMPurify.sanitize(levelDefinitions.find(ld => ld.Level_Code === (item.Employee_Level || item.ER_resource_level))?.designation || sanitizedResourceLevel || '-', { ALLOWED_TAGS: [] })}
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
                  {sanitizedEmployeeID || '-'}
                </div>
                <div style={{
                  flex: 1,
                  padding: '12px 12px',
                  fontSize: '13px',
                  color: '#333',
                  backgroundColor: rowBgColor,
                  borderRight: '1px solid #ddd',
                  minWidth: '140px',
                  wordBreak: 'break-word'
                }}>
                  {sanitizedOrgName || '-'}
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
                  {sanitizedEmail || '-'}
                </div>
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
              ? 'No filtered data available. Please apply filters and click "Apply Filters" to see results.'
              : tableSearchText
                ? `No results found for "${tableSearchText}". Try a different search term.`
                : 'No data to display.'
            }
          </div>
        )}
      </div>

      <style>{`
        .help-modal-scroll::-webkit-scrollbar { width: 4px; }
        .help-modal-scroll::-webkit-scrollbar-track { background: transparent; margin: 8px 0; }
        .help-modal-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .help-modal-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>

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
                    The <strong>Resource Defination Dashboard</strong> is a centralized view of all resources registered on the project. It allows administrators to filter, search, and manage system access for each resource by granting or revoking their project login.
                  </p>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <strong style={{ color: '#1f2937', fontSize: '15px' }}>Why is this used?</strong>
                  <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                    Large ERP projects involve many resources across multiple organizations and roles. This dashboard gives project administrators a single place to review resource details and control who has active system access, ensuring only authorized personnel can log in to the project environment.
                  </p>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <strong style={{ color: '#1f2937', fontSize: '15px' }}>Using the filters</strong>
                  <p style={{ margin: '6px 0 0 0', color: '#555' }}>
                    Two rows of multi-select filter dropdowns let you narrow the resource list:
                  </p>
                  <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                    <li><strong>Row 1</strong> — Organization Name, Business Line, Portfolio Name, Service Line Name, Nationality, Work Location. Click <strong>Apply Filters</strong> to fetch matching records.</li>
                    <li><strong>Row 2</strong> — Process Stream, Application, L0 Process, Employee Level, Employment Type, Employment Status. Click <strong>Apply Filters</strong> in Row 1 to apply all active selections.</li>
                    <li>Active filters turn <strong>blue</strong>. Click <strong>Clear All Filters</strong> to reset everything.</li>
                  </ul>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <strong style={{ color: '#1f2937', fontSize: '15px' }}>Understanding the table columns</strong>
                  <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                    <li><strong>Full Name</strong> — Click the name (shown in blue) to open and edit the full Resource Roster Form for that resource. Records marked with a <strong>DRAFT</strong> tag indicate incomplete forms.</li>
                    <li><strong>Primary Role</strong> — The resource&#39;s main role on the project.</li>
                    <li><strong>Employee Level</strong> — The resource&#39;s seniority level (mapped to a designation).</li>
                    <li><strong>Process Stream</strong> — The ERP process stream the resource is assigned to.</li>
                    <li><strong>Organization Name</strong> — The organization the resource belongs to.</li>
                    <li><strong>Email Address</strong> — The resource&#39;s login email.</li>
                    <li><strong>Grant Access</strong> — Select rows and click <strong>Grant Access</strong> to enable project login. Only available for resources without access.</li>
                    <li><strong>Revoke Access</strong> — Select rows and click <strong>Revoke Access</strong> to remove project login. Only available for resources with active access.</li>
                  </ul>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <strong style={{ color: '#1f2937', fontSize: '15px' }}>How to use this page</strong>
                  <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                    <li>Select one or more filter values and click <strong>Apply Filters</strong> to load matching resources.</li>
                    <li>Use the <strong>Search Results</strong> bar to further narrow results by full name.</li>
                    <li>Click a <strong>Full Name</strong> link to view or edit the resource&#39;s full roster form.</li>
                    <li>Click <strong>+ Resource Form</strong> (top right) to register a new resource.</li>
                    <li>Select checkboxes in the <strong>Grant Access</strong> column, then click the <strong>Grant Access</strong> button to activate logins in bulk.</li>
                    <li>Select checkboxes in the <strong>Revoke Access</strong> column, then click <strong>Revoke Access</strong> to remove access in bulk.</li>
                  </ul>
                </div>

                <div style={{ marginBottom: '4px' }}>
                  <strong style={{ color: '#1f2937', fontSize: '15px' }}>Important notes</strong>
                  <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#555' }}>
                    <li>Records with access already granted are sorted to the bottom of the list and their Grant Access checkbox is disabled.</li>
                    <li>Records without access have their Revoke Access checkbox disabled.</li>
                    <li><strong>Draft Records</strong> — Records marked with a <strong>DRAFT</strong> tag are incomplete. Access cannot be granted or revoked for these records until they are fully submitted. They are also excluded from bulk selection.</li>
                    <li>You must apply filters first — the table is empty until a filter search is submitted.</li>
                    <li>A project must be selected before resources can be loaded.</li>
                  </ul>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default ResourceDefinationDashbord;