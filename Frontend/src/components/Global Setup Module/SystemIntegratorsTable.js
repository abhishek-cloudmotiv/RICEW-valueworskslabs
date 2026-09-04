import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Edit, Trash2, Save, X, MoreVertical } from 'lucide-react';
import { TextField } from '@mui/material';
import { getIdToken } from '../../utils/cognito-auth';
import { useSession } from '../../context/SessionContext';


const SystemIntegratorsTable = ({ onClose, selectedProject, onBackToLanding, onLogout, setUnsavedChangesChecker }) => {
  const { handleAuthError } = useSession();
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [hasNewRow, setHasNewRow] = useState(false);
  const [hasStatusChanges, setHasStatusChanges] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const menuRef = useRef(null);
  const filterDropdownRef = useRef(null);

  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [editValidationErrors, setEditValidationErrors] = useState({});

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

  // Load data from API on component mount
  useEffect(() => {
    loadSystemIntegratorsData();
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setIsFilterDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadSystemIntegratorsData = async (isRetry = false) => {
    setLoading(true);
    try {
      // Get ID token for authorization
      const idToken = await getIdToken();
      if (!idToken) {
        handleAuthError('Token not found - please login again');
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      };

      const project_id = selectedProject?.id || localStorage.getItem('project_id');

      if (!project_id) {
        setErrorMessage('Project ID is required');
        setShowErrorMessage(true);
        setTimeout(() => {
          setShowErrorMessage(false);
          setErrorMessage('');
        }, 5000);
        setLoading(false);
        return;
      }

      const url = `https://ec2450jptj.execute-api.ap-south-1.amazonaws.com/New/rice/get/systemIntegrators`;

      const response = await fetch(url, {
        headers: headers
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        return;
      }

      if (response.ok) {
        const result = await response.json();
        console.log('Fetched system integrators data:', result);

        let integratorsArray = Array.isArray(result) ? result : (result.data || []);

        // If no data found for the project, try to copy master records
        if (project_id && integratorsArray.length === 0 && !isRetry) {
          console.log(`No data found for project ${project_id}, attempting to copy master records...`);
          try {
            const copyResponse = await fetch('https://ec2450jptj.execute-api.ap-south-1.amazonaws.com/New/rice/copy/systemIntegrators', {
              method: 'POST',
              headers: headers,
              body: JSON.stringify({ project_id })
            });

            if (copyResponse.status === 401 || copyResponse.status === 403) {
              handleAuthError('Unauthorized - session expired');
              return;
            }

            if (copyResponse.ok) {
              const copyResult = await copyResponse.json();
              if (copyResult.success) {
                console.log('Master records copied successfully. Re-fetching data...');
                // Recursive call with isRetry = true to avoid infinite loops
                return loadSystemIntegratorsData(true);
              }
            } else if (copyResponse.status === 409) {
              console.log('Master records already exist for this project (409).');
            } else {
              console.error('Failed to copy master records:', copyResponse.statusText);
            }
          } catch (copyError) {
            console.error('Error calling copy API:', copyError);
            handleAuthError(copyError.message);
          }
        }

        if (integratorsArray.length > 0) {
          // Filter out deleted records (handle both boolean true and string "true")
          const activeRecords = integratorsArray.filter(item =>
            item.delete_status !== true &&
            item.delete_status !== "true" &&
            item.delete_status?.S !== "true"
          );

          const transformedData = activeRecords.map((item, index) => ({
            id: index + 1,
            // Check both possible field names for the ID for robustness
            integratorId: item.system_integrator_id || item.list_Of_System_Integrator_id || '',
            companyName: item.company_name || '',
            category: item.category || '',
            typicalFocus: item.typical_focus || '',
            status: item.status || 'Active',
            required: (item.status === 'Active'),
            originalRequired: (item.status === 'Active'),
            defaultStatus: item.default_status || 'no',
            isSaved: true
          }));

          // Sort data by integratorId in ascending order (first added records first, new ones last)
          transformedData.sort((a, b) => {
            const idA = parseInt(a.integratorId) || 0;
            const idB = parseInt(b.integratorId) || 0;
            return idA - idB;
          });

          setData(transformedData);
          setFilteredData(transformedData);

          // Generate unique categories for filter dropdown
          const uniqueCategories = [...new Set(transformedData.map(item => item.category).filter(Boolean))].sort();
          setCategoryOptions(uniqueCategories);
        } else {
          setData([]);
          setFilteredData([]);
          setCategoryOptions([]);
        }
      } else {
        console.error('Failed to fetch system integrators data:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching system integrators data:', error);
      handleAuthError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryFilterChange = (value) => {
    setSelectedCategory(value);

    if (value === '') {
      setFilteredData(data);
    } else {
      const filtered = data.filter(item =>
        item.category === value
      );
      setFilteredData(filtered);
    }
  };

  const handleAddSystemIntegrator = () => {
    if (editingItem !== null) {
      showConfirmation(
        'You have unsaved changes. Do you want to discard them and add a new record?',
        () => {
          handleCancelEdit();
          addNewRow();
        }
      );
    } else if (hasNewRow) {
      handleSaveNewRow();
    } else if (hasStatusChanges) {
      saveStatusChanges();
    } else {
      addNewRow();
    }
  };





  const addNewRow = () => {
    // Always add a new empty row
    const newId = data.length > 0 ? Math.max(...data.map(item => item.id)) + 1 : 1;
    const newRow = {
      id: newId,
      companyName: '',
      category: '',
      typicalFocus: '',
      required: true,
      originalRequired: true,
      integratorId: '',
      isSaved: false
    };
    const newData = [...data, newRow];

    setData(newData);
    setFilteredData([...filteredData, newRow]);
    setHasNewRow(true);

    // Auto-scroll to bottom after adding new row
    setTimeout(() => {
      const tableContainer = document.querySelector('.table-container');
      if (tableContainer) {
        tableContainer.scrollTop = tableContainer.scrollHeight;
      }
    }, 100);
  };

  const updateRow = (index, field, value) => {
    // Apply validation before updating (allow empty during editing)
    if (!validateField(field, value, true)) {
      return; // Don't update if validation fails
    }
    const newData = [...data];
    newData[index][field] = value;
    setData(newData);
  };

  const handleEdit = (id) => {
    const item = data.find(d => d.id === id);
    if (item) {
      if (editingItem !== null && editingItem !== id) {
        showConfirmation(
          'You have unsaved changes. Do you want to discard them and edit another record?',
          () => {
            setEditingItem(id);
            setEditValues({
              ...item,
              companyName: item.companyName || '',
              category: item.category || '',
              typicalFocus: item.typicalFocus || ''
            });
          }
        );
      } else if (hasNewRow) {
        showConfirmation(
          'You have unsaved changes. Do you want to discard them and edit this record?',
          () => {
            const unsavedRow = data.find(row => !row.isSaved);
            if (unsavedRow) {
              const newData = data.filter(item => item.id !== unsavedRow.id);
              setData(newData);
              const newFilteredData = filteredData.filter(item => item.id !== unsavedRow.id);
              setFilteredData(newFilteredData);
              setHasNewRow(false);
              const newValidationErrors = { ...validationErrors };
              delete newValidationErrors[unsavedRow.id];
              setValidationErrors(newValidationErrors);
            }
            setEditingItem(id);
            setEditValues({
              ...item,
              companyName: item.companyName || '',
              category: item.category || '',
              typicalFocus: item.typicalFocus || ''
            });
          }
        );
      } else {
        setEditingItem(id);
        setEditValues({
          ...item,
          companyName: item.companyName || '',
          category: item.category || '',
          typicalFocus: item.typicalFocus || ''
        });
      }
    }
  };

  const handleSaveEdit = async (id) => {
    const missingFields = [];
    const fieldsWithErrors = {};

    if (!editValues.companyName || editValues.companyName.trim() === '') {
      missingFields.push('Company Name');
      fieldsWithErrors.companyName = true;
    }
    if (!editValues.category || editValues.category.trim() === '') {
      missingFields.push('Category');
      fieldsWithErrors.category = true;
    }
    if (!editValues.typicalFocus || editValues.typicalFocus.trim() === '') {
      missingFields.push('Typical Focus');
      fieldsWithErrors.typicalFocus = true;
    }

    if (missingFields.length > 0) {
      // Set validation errors to show messages below fields
      setEditValidationErrors(fieldsWithErrors);
      setErrorMessage(missingFields.length > 1 ? 'The required fields are missing' : 'The required field is missing');
      setShowErrorMessage(true);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 3000);
      return;
    }

    const success = await updateSystemIntegrator(editValues);
    if (success) {
      setSuccessMessage('System Integrator updated successfully!');
      setShowSuccessMessage(true);
      setTimeout(() => {
        setShowSuccessMessage(false);
        setSuccessMessage('');
      }, 3000);

      // Update the local data immediately without blocking UI
      const updatedData = data.map(item =>
        item.id === id ? { ...item, ...editValues } : item
      );
      setData(updatedData);
      setFilteredData(updatedData);
      setEditingItem(null);
      setEditValues({});
      setEditValidationErrors({});

      // Reload data from API after a short delay to sync with server without affecting UI position
      setTimeout(() => {
        loadSystemIntegratorsData();
      }, 1500);
    }
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditValues({});
    setEditValidationErrors({});
  };

  const handleRequiredChange = (id, newRequiredStatus) => {
    const item = data.find(d => d.id === id);
    if (!item || !item.isSaved) return;

    setData(prevData => {
      const updatedData = prevData.map(item =>
        item.id === id ? { ...item, required: newRequiredStatus } : item
      );

      // Check if there are any actual changes after this update
      const hasChanges = updatedData.some(item => item.required !== item.originalRequired);
      setHasStatusChanges(hasChanges);

      return updatedData;
    });

    // Also update filteredData to reflect the change in the UI
    setFilteredData(prevFilteredData => {
      return prevFilteredData.map(item =>
        item.id === id ? { ...item, required: newRequiredStatus } : item
      );
    });
  };

  const saveStatusChanges = async () => {
    const changedItems = data.filter(item => item.required !== item.originalRequired && item.isSaved);

    if (changedItems.length === 0) {
      setHasStatusChanges(false);
      return;
    }

    setLoading(true);
    try {
      // Get ID token for authorization
      const idToken = await getIdToken();
      if (!idToken) {
        handleAuthError('Token not found - please login again');
        setLoading(false);
        return;
      }

      const payload = changedItems.map(item => ({
        list_Of_System_Integrator_id: item.integratorId,
        company_name: item.companyName,
        category: item.category,
        typical_focus: item.typicalFocus,
        status: item.required ? "Active" : "Inactive",
        updatedBy: "1"
      }));

      const headers = {
        'Content-Type': 'application/json',
      };

      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      const response = await fetch('https://ec2450jptj.execute-api.ap-south-1.amazonaws.com/New/rice/update/systemIntegrators', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setData(prevData => {
          const updatedData = prevData.map(item => ({
            ...item,
            originalRequired: item.required
          }));
          return updatedData;
        });

        setHasStatusChanges(false);

        setSuccessMessage(`${changedItems.length} System Integrator status${changedItems.length > 1 ? 'es' : ''} updated successfully!`);
        setShowSuccessMessage(true);
        setTimeout(() => {
          setShowSuccessMessage(false);
          setSuccessMessage('');
        }, 3000);
      } else {
        setErrorMessage('Failed to update system integrator statuses. Please try again.');
        setShowErrorMessage(true);
        setTimeout(() => {
          setShowErrorMessage(false);
          setErrorMessage('');
        }, 5000);
      }
    } catch (error) {
      setErrorMessage('Error updating system integrator statuses. Please check your connection and try again.');
      setShowErrorMessage(true);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const rowToDelete = data.find(item => item.id === id);

    if (rowToDelete) {
      // Check if deleting an unsaved row
      if (!rowToDelete.isSaved) {
        // Allow deletion of unsaved rows - just remove from state
        setHasNewRow(false);
        const newData = data.filter(item => item.id !== id);
        setData(newData);

        // Update filtered data as well
        const newFilteredData = filteredData.filter(item => item.id !== id);
        setFilteredData(newFilteredData);

        // Clear validation errors for this row
        const newValidationErrors = { ...validationErrors };
        delete newValidationErrors[id];
        setValidationErrors(newValidationErrors);
      } else {
        // For saved records, show confirmation dialog and call the delete API
        showConfirmation('Are you sure you want to delete this system integrator?', async () => {
          const success = await deleteSystemIntegrator(rowToDelete.integratorId);
          if (success) {
            // Remove from local data without blocking UI
            const newData = data.filter(item => item.id !== id);
            setData(newData);
            setFilteredData(newData);

            // Reload data from API after a short delay to sync with server without affecting UI position
            setTimeout(() => {
              loadSystemIntegratorsData();
            }, 1500);
          }
        });
      }
    }
  };

  const validateField = (fieldName, value, isEditing = false) => {
    const validations = {
      companyName: { maxLength: 240, type: 'businessName', required: true },
      category: { maxLength: 50, type: 'businessName', required: true },
      typicalFocus: { maxLength: 240, type: 'businessName', required: true }
    };

    const validation = validations[fieldName];
    if (!validation) return true;

    if (isEditing && validation.required && (!value || value.trim() === '')) {
      return true;
    }

    if (!isEditing && validation.required && (!value || value.trim() === '')) {
      return false;
    }

    if (validation.type === 'businessName') {
      // Allow: A-Z, a-z, 0-9, spaces, &, -, ., ,, ', (), /
      const businessNameRegex = /^[a-zA-Z0-9\s&\-.,'\/()]*$/;
      return businessNameRegex.test(value);
    }

    return true;
  };

  const handleFieldChange = (fieldName, value, isEdit = false, index = null) => {
    let capitalizedValue = value;

    // For typicalFocus: capitalize only first character, preserve user's case for the rest
    if (fieldName === 'typicalFocus') {
      // Capitalize only first character
      capitalizedValue = value.charAt(0).toUpperCase() + value.slice(1);
    } else {
      // Title case: capitalize first letter of each word
      capitalizedValue = value.replace(/\b\w/g, char => char.toUpperCase());
    }

    // Trim to max length if exceeded
    const maxLength = getCharacterCount(fieldName);
    const trimmedValue = capitalizedValue.length > maxLength ? capitalizedValue.substring(0, maxLength) : capitalizedValue;

    if (validateField(fieldName, trimmedValue, true)) {
      if (isEdit) {
        setEditValues({ ...editValues, [fieldName]: trimmedValue });
      } else {
        updateRow(index, fieldName, trimmedValue);
      }
    }
  };

  const getCharacterCount = (fieldName) => {
    const maxLengths = {
      companyName: 240,
      category: 50,
      typicalFocus: 240
    };
    return maxLengths[fieldName] || 0;
  };

  const saveSystemIntegrator = async (entityData) => {
    setLoading(true);
    try {
      // Get ID token for authorization
      const idToken = await getIdToken();
      if (!idToken) {
        handleAuthError('Token not found - please login again');
        return false;
      }

      const project_id = selectedProject?.id || localStorage.getItem('project_id');
      if (!project_id) {
        setErrorMessage('Project ID is missing. Please select a project.');
        setShowErrorMessage(true);
        setTimeout(() => setShowErrorMessage(false), 5000);
        setLoading(false);
        return false;
      }

      const payload = {
        company_name: entityData.companyName,
        category: entityData.category,
        typical_focus: entityData.typicalFocus,
        status: "Active",
        default_status: "no",
        project_id: project_id,
        createdBy: localStorage.getItem('user_id') || "1",
        updatedBy: localStorage.getItem('user_id') || "1",
        user_id: localStorage.getItem('user_id') || "1"
      };

      const headers = {
        'Content-Type': 'application/json',
      };

      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      const response = await fetch('https://ec2450jptj.execute-api.ap-south-1.amazonaws.com/New/rice/save/systemIntegrators', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        return false;
      }

      if (response.ok) {
        const result = await response.json();
        console.log('System Integrator saved successfully:', result);
        setHasNewRow(false);
        return true;
      } else {
        console.error('Failed to save system integrator:', response.statusText);
        setErrorMessage('Failed to save system integrator. Please try again.');
        setShowErrorMessage(true);
        setTimeout(() => {
          setShowErrorMessage(false);
          setErrorMessage('');
        }, 5000);
        return false;
      }
    } catch (error) {
      console.error('Error saving system integrator:', error);
      setErrorMessage('Error saving system integrator. Please check your connection and try again.');
      setShowErrorMessage(true);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 5000);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateSystemIntegrator = async (entityData) => {
    setLoading(true);
    try {
      // Get ID token for authorization
      const idToken = await getIdToken();
      if (!idToken) {
        handleAuthError('Token not found - please login again');
        return false;
      }

      const payload = {
        list_Of_System_Integrator_id: entityData.integratorId,
        company_name: entityData.companyName,
        category: entityData.category,
        typical_focus: entityData.typicalFocus,
        updatedBy: "1"
      };

      console.log('Update payload:', payload);
      console.log('Integrator ID type:', typeof entityData.integratorId, 'Value:', entityData.integratorId);

      const headers = {
        'Content-Type': 'application/json',
      };

      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      const response = await fetch('https://ec2450jptj.execute-api.ap-south-1.amazonaws.com/New/rice/update/systemIntegrators', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        return false;
      }

      console.log('Update response status:', response.status);

      let responseData;
      try {
        responseData = await response.json();
        console.log('Update response JSON:', responseData);
      } catch (jsonError) {
        const responseText = await response.text();
        console.log('Update response text:', responseText);
        responseData = responseText;
      }

      if (response.ok) {
        console.log('System Integrator updated successfully');
        return true;
      } else {
        console.error('Failed to update system integrator:', response.status, responseData);
        const errorMsg = responseData?.message || responseData || 'Failed to update system integrator. Please try again.';
        setErrorMessage(errorMsg);
        setShowErrorMessage(true);
        setTimeout(() => {
          setShowErrorMessage(false);
          setErrorMessage('');
        }, 5000);
        return false;
      }
    } catch (error) {
      console.error('Network error updating system integrator:', error);
      setErrorMessage(`Network error: ${error.message}. Please check your connection and try again.`);
      setShowErrorMessage(true);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 5000);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteSystemIntegrator = async (integratorId) => {
    setLoading(true);
    try {
      console.log('Deleting integrator with ID:', integratorId);

      // Get ID token for authorization
      const idToken = await getIdToken();
      if (!idToken) {
        handleAuthError('Token not found - please login again');
        return false;
      }

      const headers = {
        'Content-Type': 'application/json',
      };

      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      const response = await fetch(`https://ec2450jptj.execute-api.ap-south-1.amazonaws.com/New/rice/delete/systemIntegrators?list_Of_System_Integrator_id=${integratorId}`, {
        method: 'DELETE',
        headers: headers
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        return false;
      }

      console.log('Delete response status:', response.status);
      const responseText = await response.text();
      console.log('Delete response:', responseText);

      if (response.ok) {
        console.log('System Integrator deleted successfully');
        setSuccessMessage('System Integrator deleted successfully!');
        setShowSuccessMessage(true);
        setTimeout(() => {
          setShowSuccessMessage(false);
          setSuccessMessage('');
        }, 3000);
        return true;
      } else {
        console.error('Failed to delete system integrator:', response.status, responseText);
        setErrorMessage('Failed to delete system integrator. Please try again.');
        setShowErrorMessage(true);
        setTimeout(() => {
          setShowErrorMessage(false);
          setErrorMessage('');
        }, 5000);
        return false;
      }
    } catch (error) {
      console.error('Error deleting system integrator:', error);
      setErrorMessage('Error deleting system integrator. Please check your connection and try again.');
      setShowErrorMessage(true);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 5000);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNewRow = async () => {
    const unsavedRows = data.filter(row => !row.isSaved);

    if (unsavedRows.length === 0) {
      setErrorMessage('No unsaved records found.');
      setShowErrorMessage(true);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 3000);
      return;
    }

    const validationErrorsList = [];
    const fieldsWithErrors = {};

    unsavedRows.forEach((row, index) => {
      const missingFields = [];
      const rowErrors = {};

      if (!row.companyName || row.companyName.trim() === '') {
        missingFields.push('Company Name');
        rowErrors.companyName = true;
      }
      if (!row.category || row.category.trim() === '') {
        missingFields.push('Category');
        rowErrors.category = true;
      }
      if (!row.typicalFocus || row.typicalFocus.trim() === '') {
        missingFields.push('Typical Focus');
        rowErrors.typicalFocus = true;
      }

      if (missingFields.length > 0) {
        validationErrorsList.push(`Row ${index + 1}: ${missingFields.join(', ')} ${missingFields.length > 1 ? 'are' : 'is'} required`);
        fieldsWithErrors[row.id] = rowErrors;
      }
    });

    if (validationErrorsList.length > 0) {
      // Set validation errors to show messages below fields
      setValidationErrors(fieldsWithErrors);

      // Show simple error message for missing required fields
      const totalMissingFields = Object.values(fieldsWithErrors).reduce((total, rowErrors) => {
        return total + Object.keys(rowErrors).length;
      }, 0);

      setErrorMessage(totalMissingFields > 1 ? 'The required fields are missing' : 'The required field is missing');
      setShowErrorMessage(true);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 3000);

      // Scroll to the first row with validation errors
      setTimeout(() => {
        const firstErrorRowId = Object.keys(fieldsWithErrors)[0];
        if (firstErrorRowId) {
          const errorRow = document.querySelector(`tr[data-row-id="${firstErrorRowId}"]`);
          if (errorRow) {
            const tableContainer = document.querySelector('.table-container');
            if (tableContainer) {
              // Scroll to show the row at the top with extra space for error messages visibility
              const rowTop = errorRow.offsetTop;
              const scrollPosition = Math.max(0, rowTop - 100); // 100px offset to show complete row and error messages
              tableContainer.scrollTop = scrollPosition;
            }
          }
        }
      }, 100);

      return;
    }

    const project_id = localStorage.getItem('project_id');
    if (!project_id) {
      setErrorMessage('Project ID is missing. Please select a project.');
      setShowErrorMessage(true);
      setTimeout(() => setShowErrorMessage(false), 3000);
      return;
    }

    const recordsToSave = unsavedRows.map(row => ({
      company_name: row.companyName,
      category: row.category,
      typical_focus: row.typicalFocus,
      status: "Active",
      default_status: "no",
      project_id: project_id,
      createdBy: localStorage.getItem('user_id') || "1",
      updatedBy: localStorage.getItem('user_id') || "1",
      user_id: localStorage.getItem('user_id') || "1"
    }));

    setLoading(true);
    try {
      // Get ID token for authorization
      let idToken = null;
      try {
        idToken = await getIdToken();
      } catch (tokenError) {
        console.error('Failed to get ID token for bulk save:', tokenError);
        setErrorMessage('Authentication error. Please login again.');
        setShowErrorMessage(true);
        setTimeout(() => {
          setShowErrorMessage(false);
          setErrorMessage('');
        }, 5000);
        setLoading(false);
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
      };

      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      // Send all records in a single API call
      const response = await fetch('https://ec2450jptj.execute-api.ap-south-1.amazonaws.com/New/rice/save/systemIntegrators', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(recordsToSave) // Send array of records
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`${unsavedRows.length} System Integrators saved successfully:`, result);

        // Mark all saved rows as saved and update their IDs if needed
        const updatedData = data.map(row => {
          if (!row.isSaved) {
            return { ...row, isSaved: true };
          }
          return row;
        });

        setData(updatedData);
        setFilteredData(updatedData);
        setHasNewRow(false);

        // Clear validation errors after successful save
        setValidationErrors({});

        setSuccessMessage(`${unsavedRows.length} System Integrator${unsavedRows.length > 1 ? 's' : ''} saved successfully!`);
        setShowSuccessMessage(true);
        setTimeout(() => {
          setShowSuccessMessage(false);
          setSuccessMessage('');
        }, 3000);

        // Reload data from API after a short delay to sync with server without affecting UI position
        setTimeout(() => {
          loadSystemIntegratorsData();
        }, 1500);
      } else {
        console.error('Failed to save system integrators:', response.statusText);
        setErrorMessage('Failed to save system integrators. Please try again.');
        setShowErrorMessage(true);
        setTimeout(() => {
          setShowErrorMessage(false);
          setErrorMessage('');
        }, 5000);
      }
    } catch (error) {
      console.error('Error saving system integrators:', error);
      setErrorMessage('Error saving system integrators. Please check your connection and try again.');
      setShowErrorMessage(true);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLanding = () => {
    const hasUnsavedChanges = hasNewRow || editingItem !== null || hasStatusChanges;

    if (hasUnsavedChanges) {
      showConfirmation(
        'You have unsaved changes. Please save your changes before going back. Do you want to continue anyway?',
        () => onBackToLanding()
      );
    } else {
      onBackToLanding();
    }
  };

  const handleLogout = () => {
    const hasUnsavedChanges = hasNewRow || editingItem !== null || hasStatusChanges;

    if (hasUnsavedChanges) {
      showConfirmation(
        'You have unsaved changes. Please save your changes before logging out. Do you want to continue logging out anyway?',
        () => onLogout()
      );
    } else {
      onLogout();
    }
  };

  // Expose unsaved changes checker to parent component
  const checkUnsavedChanges = useCallback(() => {
    return hasNewRow || editingItem !== null || hasStatusChanges;
  }, [hasNewRow, editingItem, hasStatusChanges]);

  useEffect(() => {
    if (setUnsavedChangesChecker) {
      setUnsavedChangesChecker(() => checkUnsavedChanges);
    }
  }, [checkUnsavedChanges, setUnsavedChangesChecker]);

  return (
    <div className="config-main" style={{ minHeight: '80vh' }}>
      <div style={{ padding: '2rem 2rem 1rem 2rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Project : <span style={{ color: '#2563eb' }}>{localStorage.getItem('project_name') || selectedProject?.name}</span></h3>
      </div>
      <div className="config-header" style={{ marginTop: '0' }}>
        <h2>List of System Integrators</h2>
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

      {/* Filter by Category */}
      <div style={{ padding: '1rem 2rem 1rem 2rem', position: 'relative', zIndex: 10, overflow: 'visible' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          justifyContent: 'flex-end',
          maxWidth: '100%',
          marginLeft: 'auto',
          position: 'relative',
          overflow: 'visible'
        }}>
          <label style={{ fontSize: '14px', fontWeight: '500', color: '#333', whiteSpace: 'nowrap' }}>
            Filter by Category:
          </label>
          <div
            ref={filterDropdownRef}
            style={{ position: 'relative', width: '220px', zIndex: 100 }}
          >
            <button
              onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                color: selectedCategory ? '#333' : '#999',
                backgroundColor: 'white',
                cursor: 'pointer',
                outline: 'none',
                textAlign: 'left',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span>{selectedCategory || 'All Categories'}</span>
              <span style={{ fontSize: '12px', color: '#999' }}>▼</span>
            </button>

            {isFilterDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                backgroundColor: 'white',
                border: '1px solid #d1d5db',
                borderRadius: '0 0 6px 6px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                zIndex: 1000,
                maxHeight: '300px',
                overflowY: 'auto',
                marginTop: '-1px'
              }}>
                <div
                  onClick={() => {
                    handleCategoryFilterChange('');
                    setIsFilterDropdownOpen(false);
                  }}
                  style={{
                    padding: '10px 12px',
                    cursor: 'pointer',
                    backgroundColor: selectedCategory === '' ? '#f0f9ff' : 'white',
                    color: '#333',
                    fontSize: '14px',
                    borderBottom: '1px solid #f0f0f0',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = selectedCategory === '' ? '#f0f9ff' : 'white'}
                >
                  All Categories
                </div>
                {categoryOptions.map((category, index) => (
                  <div
                    key={index}
                    onClick={() => {
                      handleCategoryFilterChange(category);
                      setIsFilterDropdownOpen(false);
                    }}
                    style={{
                      padding: '10px 12px',
                      cursor: 'pointer',
                      backgroundColor: selectedCategory === category ? '#f0f9ff' : 'white',
                      color: '#333',
                      fontSize: '14px',
                      borderBottom: '1px solid #f0f0f0',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = selectedCategory === category ? '#f0f9ff' : 'white'}
                  >
                    {category}
                  </div>
                ))}
              </div>
            )}
          </div>
          {selectedCategory && (
            <button
              onClick={() => handleCategoryFilterChange('')}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                color: '#6b7280',
                whiteSpace: 'nowrap'
              }}
              title="Clear filter"
            >
              Clear
            </button>
          )}
        </div>
        {selectedCategory && (
          <div style={{
            marginTop: '8px',
            fontSize: '13px',
            color: '#6b7280',
            textAlign: 'right'
          }}>
            Showing {filteredData.length} {filteredData.length === 1 ? 'integrator' : 'integrators'} for "{selectedCategory}"
          </div>
        )}
      </div>

      <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto', position: 'relative', zIndex: 1 }}>
        <table className="config-table" style={{ fontSize: '15px' }}>
          <thead>
            <tr>
              <th style={{ padding: '8px 12px', fontSize: '16px', width: '25%' }}>Company Name</th>
              <th style={{ padding: '8px 12px', fontSize: '16px', width: '15%' }}>Category</th>
              <th style={{ padding: '8px 12px', fontSize: '16px', width: '25%' }}>Typical Focus</th>

            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan="3" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  {selectedCategory ? `No system integrators found for "${selectedCategory}".` : 'No system integrators available.'}
                </td>
              </tr>
            ) : (
              filteredData.map((item, index) => (
                <tr key={item.id} data-row-id={item.id} style={{ height: '40px', backgroundColor: 'transparent' }}>
                  <td style={{ padding: '6px 12px', verticalAlign: 'middle' }}>
                    {editingItem === item.id ? (
                      <div style={{ minHeight: '52px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <TextField
                            size="small"
                            style={{ flex: 1 }}
                            value={editValues.companyName || ''}
                            onChange={(e) => handleFieldChange('companyName', e.target.value, true)}
                            placeholder="Company Name"
                            variant="outlined"
                            error={editValidationErrors.companyName}
                            sx={{ '& .MuiOutlinedInput-root': { fontSize: '14px', backgroundColor: 'white' } }}
                          />
                          <div style={{ fontSize: '12px', color: (editValues.companyName || '').length >= getCharacterCount('companyName') ? '#ef4444' : '#6b7280', whiteSpace: 'nowrap' }}>
                            {(editValues.companyName || '').length}/{getCharacterCount('companyName')} {(editValues.companyName || '').length >= getCharacterCount('companyName') && 'Limit'}
                          </div>
                        </div>
                        <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: '500', height: '18px' }}>
                          {editValidationErrors.companyName && 'Required field'}
                        </div>
                      </div>
                    ) : !item.isSaved ? (
                      <div style={{ minHeight: '52px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <TextField
                            size="small"
                            style={{ flex: 1 }}
                            value={item.companyName || ''}
                            onChange={(e) => handleFieldChange('companyName', e.target.value, false, index)}
                            placeholder="Company Name"
                            variant="outlined"
                            error={validationErrors[item.id]?.companyName}
                            sx={{ '& .MuiOutlinedInput-root': { fontSize: '14px', backgroundColor: 'white' } }}
                          />
                          <div style={{ fontSize: '12px', color: (item.companyName || '').length >= getCharacterCount('companyName') ? '#ef4444' : '#6b7280', whiteSpace: 'nowrap' }}>
                            {(item.companyName || '').length}/{getCharacterCount('companyName')} {(item.companyName || '').length >= getCharacterCount('companyName') && 'Limit'}
                          </div>
                        </div>
                        <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: '500', height: '18px' }}>
                          {validationErrors[item.id]?.companyName && 'Required field'}
                        </div>
                      </div>
                    ) : (
                      <span>{item.companyName}</span>
                    )}
                  </td>
                  <td style={{ padding: '6px 12px', verticalAlign: 'middle' }}>
                    {editingItem === item.id ? (
                      <div style={{ minHeight: '52px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <TextField
                            size="small"
                            style={{ flex: 1 }}
                            value={editValues.category || ''}
                            onChange={(e) => handleFieldChange('category', e.target.value, true)}
                            placeholder="Category"
                            variant="outlined"
                            error={editValidationErrors.category}
                            sx={{ '& .MuiOutlinedInput-root': { fontSize: '14px', backgroundColor: 'white' } }}
                          />
                          <div style={{ fontSize: '12px', color: (editValues.category || '').length >= getCharacterCount('category') ? '#ef4444' : '#6b7280', whiteSpace: 'nowrap' }}>
                            {(editValues.category || '').length}/{getCharacterCount('category')} {(editValues.category || '').length >= getCharacterCount('category') && 'Limit'}
                          </div>
                        </div>
                        <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: '500', height: '18px' }}>
                          {editValidationErrors.category && 'Required field'}
                        </div>
                      </div>
                    ) : !item.isSaved ? (
                      <div style={{ minHeight: '52px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <TextField
                            size="small"
                            style={{ flex: 1 }}
                            value={item.category || ''}
                            onChange={(e) => handleFieldChange('category', e.target.value, false, index)}
                            placeholder="Category"
                            variant="outlined"
                            error={validationErrors[item.id]?.category}
                            sx={{ '& .MuiOutlinedInput-root': { fontSize: '14px', backgroundColor: 'white' } }}
                          />
                          <div style={{ fontSize: '12px', color: (item.category || '').length >= getCharacterCount('category') ? '#ef4444' : '#6b7280', whiteSpace: 'nowrap' }}>
                            {(item.category || '').length}/{getCharacterCount('category')} {(item.category || '').length >= getCharacterCount('category') && 'Limit'}
                          </div>
                        </div>
                        <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: '500', height: '18px' }}>
                          {validationErrors[item.id]?.category && 'Required field'}
                        </div>
                      </div>
                    ) : (
                      <span>{item.category}</span>
                    )}
                  </td>
                  <td style={{ padding: '6px 12px', verticalAlign: 'middle' }}>
                    {editingItem === item.id ? (
                      <div style={{ minHeight: '52px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <TextField
                            size="small"
                            style={{ flex: 1 }}
                            value={editValues.typicalFocus || ''}
                            onChange={(e) => handleFieldChange('typicalFocus', e.target.value, true)}
                            placeholder="Typical Focus"
                            variant="outlined"
                            error={editValidationErrors.typicalFocus}
                            sx={{ '& .MuiOutlinedInput-root': { fontSize: '14px', backgroundColor: 'white' } }}
                          />
                          <div style={{ fontSize: '12px', color: (editValues.typicalFocus || '').length >= getCharacterCount('typicalFocus') ? '#ef4444' : '#6b7280', whiteSpace: 'nowrap' }}>
                            {(editValues.typicalFocus || '').length}/{getCharacterCount('typicalFocus')} {(editValues.typicalFocus || '').length >= getCharacterCount('typicalFocus') && 'Limit'}
                          </div>
                        </div>
                        <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: '500', height: '18px' }}>
                          {editValidationErrors.typicalFocus && 'Required field'}
                        </div>
                      </div>
                    ) : !item.isSaved ? (
                      <div style={{ minHeight: '52px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <TextField
                            size="small"
                            style={{ flex: 1 }}
                            value={item.typicalFocus || ''}
                            onChange={(e) => handleFieldChange('typicalFocus', e.target.value, false, index)}
                            placeholder="Typical Focus"
                            variant="outlined"
                            error={validationErrors[item.id]?.typicalFocus}
                            sx={{ '& .MuiOutlinedInput-root': { fontSize: '14px', backgroundColor: 'white' } }}
                          />
                          <div style={{ fontSize: '12px', color: (item.typicalFocus || '').length >= getCharacterCount('typicalFocus') ? '#ef4444' : '#6b7280', whiteSpace: 'nowrap' }}>
                            {(item.typicalFocus || '').length}/{getCharacterCount('typicalFocus')} {(item.typicalFocus || '').length >= getCharacterCount('typicalFocus') && 'Limit'}
                          </div>
                        </div>
                        <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: '500', height: '18px' }}>
                          {validationErrors[item.id]?.typicalFocus && 'Required field'}
                        </div>
                      </div>
                    ) : (
                      <span>{item.typicalFocus}</span>
                    )}
                  </td>

                </tr>
              )))}
          </tbody>
        </table>
      </div>      {/* Standardized Loading Overlay */}
      {loading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div className="loading-spinner" style={{
            width: '50px',
            height: '50px',
            border: '5px solid #f3f3f3',
            borderTop: '5px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ marginTop: '15px', color: '#1f2937', fontWeight: '500', fontSize: '16px' }}>Loading...</p>
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
          padding: '12px 24px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          zIndex: 10000,
          animation: 'slideIn 0.3s ease-out'
        }}>
          <span style={{ fontWeight: '500' }}>{successMessage}</span>
          <X size={18} style={{ cursor: 'pointer' }} onClick={() => setShowSuccessMessage(false)} />
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
          padding: '12px 24px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          zIndex: 10000,
          animation: 'slideIn 0.3s ease-out'
        }}>
          <span style={{ fontWeight: '500' }}>{errorMessage}</span>
          <X size={18} style={{ cursor: 'pointer' }} onClick={() => setShowErrorMessage(false)} />
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
      `}</style>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '450px',
            padding: '30px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>Confirm Action</h3>
            <p style={{ margin: '0 0 25px 0', color: '#4b5563', lineHeight: '1.5' }}>{confirmMessage}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={handleConfirmCancel}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  backgroundColor: 'white',
                  color: '#374151',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                No, Keep
              </button>
              <button
                onClick={handleConfirmYes}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Yes, Continue
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ height: '70px' }}></div>
    </div>
  );
};

export default SystemIntegratorsTable;
