import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Edit, Trash2, Save, X, MoreVertical } from 'lucide-react';
import { TextField } from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { useSession } from '../../context/SessionContext';
import SessionExpiredPopup from '../SessionExpiredPopup';

const ThirdPartyPackTable = ({ onClose, selectedProject, onBackToLanding, onLogout, setUnsavedChangesChecker }) => {
  const { handleAuthError, projectId, userId } = useSession();
  const { getCachedToken } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [hasNewRow, setHasNewRow] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

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

  // Function to convert text to title case (capitalize first letter of each word)
  const toTitleCase = (str) => {
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
  };

  // Load data from API on component mount
  useEffect(() => {
    const abortController = new AbortController();
    loadThirdPartyPackData(abortController.signal);
    return () => abortController.abort();
  }, [selectedProject?.id, projectId, getCachedToken]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadThirdPartyPackData = async (signal) => {
    setLoading(true);
    try {
      // Get ID token for authorization
      const idToken = await getCachedToken();
      if (!idToken) {
        handleAuthError('Token not found - please login again');
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      };

      const currentProjectId = selectedProject?.id || projectId || 'TestPro001';
      const url = `https://ec2450jptj.execute-api.ap-south-1.amazonaws.com/New/rice/get/thirdPartyPack?project_id=${currentProjectId}`;

      const response = await fetch(url, {
        headers: headers,
        signal: signal
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        return;
      }

      if (response.ok) {
        const result = await response.json();
        console.log('Fetched third party pack data:', result);

        if (Array.isArray(result) && result.length > 0) {
          // Filter out deleted records (delete_status = "false" means active)
          const activeRecords = result.filter(item => item.delete_status === "false");

          const transformedData = activeRecords.map((item, index) => ({
            id: index + 1,
            company: item.Product_Vendor || '',
            product: item.Product_Name || '',
            categoryFunction: item.Category_Function || '',
            packId: item.List_Third_Party_Pack_id || '',
            systemDefault: item.system_default || '',
            isSaved: true // Data comes from backend
          }));

          // Sort data by packId in ascending order (first added records first)
          transformedData.sort((a, b) => {
            const idA = parseInt(a.packId) || 0;
            const idB = parseInt(b.packId) || 0;
            return idA - idB;
          });

          console.log('Sorted Third Party Pack IDs:', transformedData.map(item => ({
            packId: item.packId,
            company: item.company,
            product: item.product,
            categoryFunction: item.categoryFunction
          })));

          setData(transformedData);
        } else {
          setData([]);
        }
      } else {
        console.error('Failed to fetch third party pack data:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching third party pack data:', error);
      handleAuthError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddThirdParty = () => {
    if (editingItem !== null) {
      showConfirmation(
        'You have unsaved changes. Do you want to discard them and add a new record?',
        () => {
          handleCancelEdit();
          addNewRow();
        }
      );
    } else if (hasNewRow) {
      // If there are unsaved rows, save them
      handleSaveNewRow();
    } else {
      // Otherwise, add a new row
      addNewRow();
    }
  };

  const addNewRow = () => {
    // Always add a new empty row
    const newId = data.length > 0 ? Math.max(...data.map(item => item.id)) + 1 : 1;
    const newData = [...data, {
      id: newId,
      company: '',
      product: '',
      categoryFunction: '',
      packId: '', // Database primary key (empty for new records)
      systemDefault: '',
      isSaved: false
    }];

    // Don't sort here - new row should appear at the end for editing
    setData(newData);
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
      // Check if another item is already being edited
      if (editingItem !== null && editingItem !== id) {
        showConfirmation(
          'You have unsaved changes. Do you want to discard them and edit another record?',
          () => {
            // User confirmed, proceed to edit the new item
            setEditingItem(id);
            setEditValues({
              ...item,
              packId: item.packId,
              company: item.company || '',
              product: item.product || '',
              categoryFunction: item.categoryFunction || ''
            });

            // Auto-scroll to the editing row
            setTimeout(() => {
              const editingRow = document.querySelector(`tr[data-row-id="${id}"]`);
              if (editingRow) {
                const tableContainer = document.querySelector('.table-container');
                if (tableContainer) {
                  const rowTop = editingRow.offsetTop;
                  const scrollPosition = Math.max(0, rowTop - 100); // 100px offset for better visibility
                  tableContainer.scrollTop = scrollPosition;
                }
              }
            }, 100);
          }
        );
      } else if (data.some(row => !row.isSaved)) {
        // Check if there's an unsaved new row
        showConfirmation(
          'You have unsaved changes. Do you want to discard them and edit this record?',
          () => {
            // User clicked Yes - discard the unsaved row and proceed with edit
            const unsavedRow = data.find(row => !row.isSaved);
            if (unsavedRow) {
              const newData = data.filter(item => item.id !== unsavedRow.id);
              setData(newData);
              const newValidationErrors = { ...validationErrors };
              delete newValidationErrors[unsavedRow.id];
              setValidationErrors(newValidationErrors);
            }
            setHasNewRow(false);

            setEditingItem(id);
            setEditValues({
              ...item,
              packId: item.packId,
              company: item.company || '',
              product: item.product || '',
              categoryFunction: item.categoryFunction || ''
            });

            // Auto-scroll to the editing row
            setTimeout(() => {
              const editingRow = document.querySelector(`tr[data-row-id="${id}"]`);
              if (editingRow) {
                const tableContainer = document.querySelector('.table-container');
                if (tableContainer) {
                  const rowTop = editingRow.offsetTop;
                  const scrollPosition = Math.max(0, rowTop - 100); // 100px offset for better visibility
                  tableContainer.scrollTop = scrollPosition;
                }
              }
            }, 100);
          }
        );
      } else {
        // No unsaved changes, proceed normally
        setEditingItem(id);
        setEditValues({
          ...item,
          packId: item.packId,
          company: item.company || '',
          product: item.product || '',
          categoryFunction: item.categoryFunction || ''
        });

        // Auto-scroll to the editing row
        setTimeout(() => {
          const editingRow = document.querySelector(`tr[data-row-id="${id}"]`);
          if (editingRow) {
            const tableContainer = document.querySelector('.table-container');
            if (tableContainer) {
              const rowTop = editingRow.offsetTop;
              const scrollPosition = Math.max(0, rowTop - 100); // 100px offset for better visibility
              tableContainer.scrollTop = scrollPosition;
            }
          }
        }, 100);
      }
    }
  };

  const handleSaveEdit = async (id) => {
    // Validate required fields
    const missingFields = [];
    const fieldsWithErrors = {};

    if (!editValues.company || editValues.company.trim() === '') {
      missingFields.push('Product Vendor');
      fieldsWithErrors.company = true;
    }
    if (!editValues.product || editValues.product.trim() === '') {
      missingFields.push('Product Name');
      fieldsWithErrors.product = true;
    }
    if (!editValues.categoryFunction || editValues.categoryFunction.trim() === '') {
      missingFields.push('Category / Function');
      fieldsWithErrors.categoryFunction = true;
    }

    // Set validation errors to show messages below fields
    if (Object.keys(fieldsWithErrors).length > 0) {
      setEditValidationErrors(fieldsWithErrors);

      // Show error popup message
      const fieldCount = Object.keys(fieldsWithErrors).length;
      setErrorMessage(fieldCount > 1 ? 'The required fields are missing' : 'The required field is missing');
      setShowErrorMessage(true);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 3000);

      return;
    }

    // Clear validation errors
    setEditValidationErrors({});

    // Check field content validation
    const contentErrors = [];
    const allowedCharsRegex = /^[a-zA-Z0-9\s&\-.,'\\/()]*$/;
    if (editValues.company && !allowedCharsRegex.test(editValues.company)) {
      contentErrors.push('Product Vendor field contains invalid characters. Allowed: letters, digits, spaces, & - . , \' ( ) /');
    }
    if (editValues.product && !allowedCharsRegex.test(editValues.product)) {
      contentErrors.push('Product Name field contains invalid characters. Allowed: letters, digits, spaces, & - . , \' ( ) /');
    }
    if (editValues.categoryFunction && !allowedCharsRegex.test(editValues.categoryFunction)) {
      contentErrors.push('Category / Function field contains invalid characters. Allowed: letters, digits, spaces, & - . , \' ( ) /');
    }

    if (contentErrors.length > 0) {
      let errorMsg = contentErrors.join('\n');
      setErrorMessage(errorMsg);
      setShowErrorMessage(true);
      setTimeout(() => {
        setShowErrorMessage(false);
        setErrorMessage('');
      }, 5000);
      return;
    }

    const success = await updateThirdPartyPack(editValues);
    if (success) {
      setSuccessMessage('Third Party Pack updated successfully!');
      setShowSuccessMessage(true);
      setTimeout(() => {
        setShowSuccessMessage(false);
        setSuccessMessage('');
      }, 3000);

      // Update the local data immediately
      const updatedData = data.map(item =>
        item.id === id ? { ...item, ...editValues } : item
      );
      setData(updatedData);

      // Reload data from API after successful update
      await loadThirdPartyPackData();
      setEditingItem(null);
      setEditValues({});
    }
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditValues({});
    setEditValidationErrors({});
  };

  const handleDelete = async (id) => {
    const rowToDelete = data.find(item => item.id === id);

    if (rowToDelete) {
      // Check if deleting an unsaved row
      if (!rowToDelete.isSaved) {
        // Allow deletion of unsaved rows
        setHasNewRow(false);
        setData(data.filter(item => item.id !== id));

        // Clear validation errors for this row
        const newValidationErrors = { ...validationErrors };
        delete newValidationErrors[id];
        setValidationErrors(newValidationErrors);
      } else {
        // For saved records, show custom confirmation dialog
        showConfirmation('Are you sure you want to delete this third party pack?', async () => {
          const success = await deleteThirdPartyPack(rowToDelete.packId);
          if (success) {
            // Reload data from API after successful delete
            await loadThirdPartyPackData();
          }
        });
      }
    }
  };

  const validateField = (fieldName, value, isEditing = false) => {
    const validations = {
      company: { maxLength: 150, type: 'allowedChars', required: true },
      product: { maxLength: 100, type: 'allowedChars', required: true },
      categoryFunction: { maxLength: 150, type: 'allowedChars', required: true }
    };

    const validation = validations[fieldName];
    if (!validation) return true;

    // For editing mode, allow empty values for required fields (validate on save instead)
    if (isEditing && validation.required && (!value || value.trim() === '')) {
      return true; // Allow empty during editing
    }

    // For non-editing or save mode, check required fields
    if (!isEditing && validation.required && (!value || value.trim() === '')) {
      return false;
    }

    // Check length
    if (value.length > validation.maxLength) return false;

    // Check validation type
    if (validation.type === 'allowedChars') {
      // Allow: letters, digits, spaces, &, -, ., ,, ', (), /
      const allowedCharsRegex = /^[a-zA-Z0-9\s&\-.,'\\/()]*$/;
      return allowedCharsRegex.test(value);
    }

    return true;
  };

  const getCharacterCount = (fieldName) => {
    const maxLengths = {
      company: 150,
      product: 100,
      categoryFunction: 150
    };
    return maxLengths[fieldName] || 0;
  };

  const saveThirdPartyPack = async (entityData) => {
    setLoading(true);
    try {
      const idToken = await getCachedToken();
      if (!idToken) {
        handleAuthError('Token not found - please login again');
        setLoading(false);
        return false;
      }

      const currentProjectId = selectedProject?.id || projectId;
      if (!currentProjectId) {
        setErrorMessage('Project ID is missing. Please select a project.');
        setShowErrorMessage(true);
        setTimeout(() => setShowErrorMessage(false), 5000);
        setLoading(false);
        return false;
      }

      const currentUserId = userId || "1";

      const payload = {
        Product_Name: entityData.product,
        Product_Vendor: entityData.company,
        Category_Function: entityData.categoryFunction,
        project_id: currentProjectId,
        created_by: currentUserId,
        updated_by: currentUserId,
        status: "Active",
        user_id: currentUserId
      };

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      };

      const response = await fetch('https://ec2450jptj.execute-api.ap-south-1.amazonaws.com/New/rice/save/thirdPartyPack', {
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
        console.log('Third Party Pack saved successfully:', result);
        setHasNewRow(false);
        return true;
      } else {
        console.error('Failed to save third party pack:', response.statusText);
        setErrorMessage('Failed to save third party pack. Please try again.');
        setShowErrorMessage(true);
        setTimeout(() => {
          setShowErrorMessage(false);
          setErrorMessage('');
        }, 5000);
        return false;
      }
    } catch (error) {
      console.error('Error saving third party pack:', error);
      setErrorMessage('Error saving third party pack. Please check your connection and try again.');
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

  const updateThirdPartyPack = async (entityData) => {
    setLoading(true);
    try {
      // Get ID token for authorization
      const idToken = await getCachedToken();
      if (!idToken) {
        handleAuthError('Token not found - please login again');
        setLoading(false);
        return false;
      }

      const payload = {
        List_Third_Party_Pack_id: entityData.packId,
        Product_Name: entityData.product,
        Product_Vendor: entityData.company,
        Category_Function: entityData.categoryFunction,
        updated_by: userId || "1"
      };

      console.log('Update payload:', payload);
      console.log('Pack ID type:', typeof entityData.packId, 'Value:', entityData.packId);

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      };

      const response = await fetch('https://ec2450jptj.execute-api.ap-south-1.amazonaws.com/New/rice/update/thirdPartyPack', {
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
        console.log('Third Party Pack updated successfully');
        return true;
      } else {
        console.error('Failed to update third party pack:', response.status, responseData);
        const errorMsg = responseData?.message || responseData || 'Failed to update third party pack. Please try again.';
        setErrorMessage(errorMsg);
        setShowErrorMessage(true);
        setTimeout(() => {
          setShowErrorMessage(false);
          setErrorMessage('');
        }, 5000);
        return false;
      }
    } catch (error) {
      console.error('Network error updating third party pack:', error);
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

  const deleteThirdPartyPack = async (packId) => {
    setLoading(true);
    try {
      console.log('Deleting pack with ID:', packId);

      // Get ID token for authorization
      const idToken = await getCachedToken();
      if (!idToken) {
        handleAuthError('Token not found - please login again');
        setLoading(false);
        return false;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      };

      const response = await fetch('https://ec2450jptj.execute-api.ap-south-1.amazonaws.com/New/rice/delete/thirdPartyPack', {
        method: 'DELETE',
        headers: headers,
        body: JSON.stringify({
          List_Third_Party_Pack_id: packId,
          updated_by: userId || "1"
        })
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError('Unauthorized - session expired');
        return false;
      }

      console.log('Delete response status:', response.status);
      const responseText = await response.text();
      console.log('Delete response:', responseText);

      if (response.ok) {
        console.log('Third Party Pack deleted successfully');
        setSuccessMessage('Third Party Pack deleted successfully!');
        setShowSuccessMessage(true);
        setTimeout(() => {
          setShowSuccessMessage(false);
          setSuccessMessage('');
        }, 3000);
        return true;
      } else {
        console.error('Failed to delete third party pack:', response.status, responseText);
        setErrorMessage('Failed to delete third party pack. Please try again.');
        setShowErrorMessage(true);
        setTimeout(() => {
          setShowErrorMessage(false);
          setErrorMessage('');
        }, 5000);
        return false;
      }
    } catch (error) {
      console.error('Error deleting third party pack:', error);
      setErrorMessage('Error deleting third party pack. Please check your connection and try again.');
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
    // Find all unsaved rows
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

    // Validate all unsaved rows
    const validationErrorsList = [];
    const fieldsWithErrors = {};

    unsavedRows.forEach((row, index) => {
      const missingFields = [];
      const rowErrors = {};

      if (!row.company || row.company.trim() === '') {
        missingFields.push('Product Vendor');
        rowErrors.company = true;
      }
      if (!row.product || row.product.trim() === '') {
        missingFields.push('Product Name');
        rowErrors.product = true;
      }
      if (!row.categoryFunction || row.categoryFunction.trim() === '') {
        missingFields.push('Category / Function');
        rowErrors.categoryFunction = true;
      }

      if (missingFields.length > 0) {
        validationErrorsList.push(`Row ${index + 1}: ${missingFields.join(', ')} ${missingFields.length > 1 ? 'are' : 'is'} required`);
        fieldsWithErrors[row.id] = rowErrors;
      }

      // Additional validation for field content
      const allowedCharsRegex = /^[a-zA-Z0-9\s&\-.,'\\/()]*$/;
      if (row.company && !allowedCharsRegex.test(row.company)) {
        validationErrorsList.push(`Row ${index + 1}: Product Vendor field contains invalid characters. Allowed: letters, digits, spaces, & - . , ' ( ) /`);
      }
      if (row.product && !allowedCharsRegex.test(row.product)) {
        validationErrorsList.push(`Row ${index + 1}: Product Name field contains invalid characters. Allowed: letters, digits, spaces, & - . , ' ( ) /`);
      }
      if (row.categoryFunction && !allowedCharsRegex.test(row.categoryFunction)) {
        validationErrorsList.push(`Row ${index + 1}: Category / Function field contains invalid characters. Allowed: letters, digits, spaces, & - . , ' ( ) /`);
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

    const currentProjectId = selectedProject?.id || projectId;
    if (!currentProjectId) {
      setErrorMessage('Project ID is missing. Please select a project.');
      setShowErrorMessage(true);
      setTimeout(() => setShowErrorMessage(false), 5000);
      setLoading(false);
      return;
    }

    const currentUserId = userId || "1";


    const recordsToSave = unsavedRows.map(row => ({
      pack_name: row.packName,
      description: row.description,
      status: "Active",
      project_id: currentProjectId,
      createdBy: currentUserId,
      updatedBy: currentUserId,
      user_id: currentUserId
    }));

    setLoading(true);
    try {
      // Get ID token for authorization
      const idToken = await getCachedToken();
      if (!idToken) {
        handleAuthError('Token not found - please login again');
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
      const response = await fetch('https://ec2450jptj.execute-api.ap-south-1.amazonaws.com/New/rice/save/thirdPartyPack', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(recordsToSave) // Send array of records
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`${unsavedRows.length} Third Party Packs saved successfully:`, result);

        // Mark all saved rows as saved and update their IDs if needed
        const updatedData = data.map(row => {
          if (!row.isSaved) {
            return { ...row, isSaved: true };
          }
          return row;
        });

        // Sort by packId in ascending order (first added records first)
        updatedData.sort((a, b) => {
          const idA = parseInt(a.packId) || 0;
          const idB = parseInt(b.packId) || 0;
          return idA - idB;
        });

        setData(updatedData);
        setHasNewRow(false);

        // Clear validation errors after successful save
        setValidationErrors({});

        setSuccessMessage(`${unsavedRows.length} Third Party Pack${unsavedRows.length > 1 ? 's' : ''} saved successfully!`);
        setShowSuccessMessage(true);
        setTimeout(() => {
          setShowSuccessMessage(false);
          setSuccessMessage('');
        }, 3000);

        // Reload data from API to get the generated IDs
        await loadThirdPartyPackData();
      } else if (response.status === 409) {
        // Handle duplicate error
        const errorData = await response.json();
        console.error('Duplicate entry detected:', errorData);

        let errorMsg = 'Duplicate Product detected!\n\n';
        if (errorData.duplicates && errorData.duplicates.length > 0) {
          errorData.duplicates.forEach(dup => {
            errorMsg += `Product "${dup.Product_Name}" already exists for vendor "${dup.Product_Vendor}".\n`;
          });
        } else {
          errorMsg += errorData.message || 'One or more Products already exist in the database.';
        }

        setErrorMessage(errorMsg);
        setShowErrorMessage(true);
        setTimeout(() => {
          setShowErrorMessage(false);
          setErrorMessage('');
        }, 8000);
      } else {
        console.error('Failed to save third party packs:', response.statusText);
        const errorData = await response.json().catch(() => ({}));
        setErrorMessage(errorData.error || 'Failed to save third party packs. Please try again.');
        setShowErrorMessage(true);
        setTimeout(() => {
          setShowErrorMessage(false);
          setErrorMessage('');
        }, 5000);
      }
    } catch (error) {
      console.error('Error saving third party packs:', error);
      setErrorMessage('Error saving third party packs. Please check your connection and try again.');
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
    // Check for unsaved changes
    const hasUnsavedChanges = hasNewRow || editingItem !== null;

    if (hasUnsavedChanges) {
      showConfirmation(
        'You have unsaved changes. Please save your changes before going back. Do you want to continue anyway?',
        () => onBackToLanding()
      );
    } else {
      // Proceed with going back
      onBackToLanding();
    }
  };

  const handleLogout = () => {
    // Check for unsaved changes
    const hasUnsavedChanges = hasNewRow || editingItem !== null;

    if (hasUnsavedChanges) {
      showConfirmation(
        'You have unsaved changes. Please save your changes before logging out. Do you want to continue logging out anyway?',
        () => onLogout()
      );
    } else {
      // Proceed with logout
      onLogout();
    }
  };

  // Expose unsaved changes checker to parent component
  const checkUnsavedChanges = useCallback(() => {
    return hasNewRow || editingItem !== null;
  }, [hasNewRow, editingItem]);

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
        <h2>Master List of Third Party Package</h2>
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

      <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
        <table className="config-table" style={{ fontSize: '15px' }}>
          <thead>
            <tr>
              <th style={{ padding: '8px 12px', fontSize: '16px', width: '25%' }}>Product Vendor</th>
              <th style={{ padding: '8px 12px', fontSize: '16px', width: '25%' }}>Product Name</th>
              <th style={{ padding: '8px 12px', fontSize: '16px', width: '25%' }}>Category / Function</th>
              <th style={{ padding: '8px 12px', fontSize: '16px', width: '25%', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={item.id} data-row-id={item.id} style={{ height: '40px', backgroundColor: 'transparent' }}>
                <td style={{ padding: '6px 12px', verticalAlign: 'middle' }}>
                  {editingItem === item.id ? (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <TextField
                          size="small"
                          style={{ flex: 1 }}
                          value={editValues.company || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            const formattedValue = toTitleCase(value);
                            if (validateField('company', formattedValue, true)) {
                              setEditValues({ ...editValues, company: formattedValue });
                            }
                          }}
                          onPaste={(e) => {
                            e.preventDefault();
                            const pastedText = e.clipboardData.getData('text');
                            const currentValue = editValues.company || '';
                            const maxLength = getCharacterCount('company');
                            const remainingChars = maxLength - currentValue.length;
                            const textToAdd = pastedText.substring(0, remainingChars);
                            const newValue = currentValue + textToAdd;
                            const formattedValue = toTitleCase(newValue);
                            if (validateField('company', formattedValue, true)) {
                              setEditValues({ ...editValues, company: formattedValue });
                            }
                          }}
                          placeholder="Enter company name"
                          variant="outlined"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              fontSize: '14px',
                              backgroundColor: 'white',
                            },
                          }}
                        />
                        <div style={{ fontSize: '12px', color: editValues.company.length >= getCharacterCount('company') ? '#ef4444' : '#6b7280', whiteSpace: 'nowrap' }}>
                          {editValues.company.length}/{getCharacterCount('company')} {editValues.company.length >= getCharacterCount('company') && 'Limit'}
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: '500', height: '18px' }}>
                        {editValidationErrors.company && 'Required field'}
                      </div>
                    </div>
                  ) : !item.isSaved ? (
                    <div style={{ minHeight: '52px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <TextField
                          size="small"
                          style={{ flex: 1 }}
                          value={item.company || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            const formattedValue = toTitleCase(value);
                            if (validateField('company', formattedValue, true)) {
                              updateRow(index, 'company', formattedValue);
                            }
                          }}
                          onPaste={(e) => {
                            e.preventDefault();
                            const pastedText = e.clipboardData.getData('text');
                            const currentValue = item.company || '';
                            const maxLength = getCharacterCount('company');
                            const remainingChars = maxLength - currentValue.length;
                            const textToAdd = pastedText.substring(0, remainingChars);
                            const newValue = currentValue + textToAdd;
                            const formattedValue = toTitleCase(newValue);
                            if (validateField('company', formattedValue, true)) {
                              updateRow(index, 'company', formattedValue);
                            }
                          }}
                          placeholder="Enter company name"
                          variant="outlined"
                          error={validationErrors[item.id]?.company}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              fontSize: '14px',
                              backgroundColor: 'white',
                            },
                          }}
                        />
                        <div style={{ fontSize: '12px', color: item.company.length >= getCharacterCount('company') ? '#ef4444' : '#6b7280', whiteSpace: 'nowrap' }}>
                          {item.company.length}/{getCharacterCount('company')} {item.company.length >= getCharacterCount('company') && 'Limit'}
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: '500', height: '18px' }}>
                        {validationErrors[item.id]?.company && 'Required field'}
                      </div>
                    </div>
                  ) : (
                    <span>{item.company}</span>
                  )}
                </td>
                <td style={{ padding: '6px 12px', verticalAlign: 'middle' }}>
                  {editingItem === item.id ? (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <TextField
                          size="small"
                          style={{ flex: 1 }}
                          value={editValues.product || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            const formattedValue = toTitleCase(value);
                            if (validateField('product', formattedValue, true)) {
                              setEditValues({ ...editValues, product: formattedValue });
                            }
                          }}
                          onPaste={(e) => {
                            e.preventDefault();
                            const pastedText = e.clipboardData.getData('text');
                            const currentValue = editValues.product || '';
                            const maxLength = getCharacterCount('product');
                            const remainingChars = maxLength - currentValue.length;
                            const textToAdd = pastedText.substring(0, remainingChars);
                            const newValue = currentValue + textToAdd;
                            const formattedValue = toTitleCase(newValue);
                            if (validateField('product', formattedValue, true)) {
                              setEditValues({ ...editValues, product: formattedValue });
                            }
                          }}
                          placeholder="Enter product name"
                          variant="outlined"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              fontSize: '14px',
                              backgroundColor: 'white',
                            },
                          }}
                        />
                        <div style={{ fontSize: '12px', color: editValues.product.length >= getCharacterCount('product') ? '#ef4444' : '#6b7280', whiteSpace: 'nowrap' }}>
                          {editValues.product.length}/{getCharacterCount('product')} {editValues.product.length >= getCharacterCount('product') && 'Limit'}
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: '500', height: '18px' }}>
                        {editValidationErrors.product && 'Required field'}
                      </div>
                    </div>
                  ) : !item.isSaved ? (
                    <div style={{ minHeight: '52px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <TextField
                          size="small"
                          style={{ flex: 1 }}
                          value={item.product || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            const formattedValue = toTitleCase(value);
                            if (validateField('product', formattedValue, true)) {
                              updateRow(index, 'product', formattedValue);
                            }
                          }}
                          onPaste={(e) => {
                            e.preventDefault();
                            const pastedText = e.clipboardData.getData('text');
                            const currentValue = item.product || '';
                            const maxLength = getCharacterCount('product');
                            const remainingChars = maxLength - currentValue.length;
                            const textToAdd = pastedText.substring(0, remainingChars);
                            const newValue = currentValue + textToAdd;
                            const formattedValue = toTitleCase(newValue);
                            if (validateField('product', formattedValue, true)) {
                              updateRow(index, 'product', formattedValue);
                            }
                          }}
                          placeholder="Enter product name"
                          variant="outlined"
                          error={validationErrors[item.id]?.product}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              fontSize: '14px',
                              backgroundColor: 'white',
                            },
                          }}
                        />
                        <div style={{ fontSize: '12px', color: item.product.length >= getCharacterCount('product') ? '#ef4444' : '#6b7280', whiteSpace: 'nowrap' }}>
                          {item.product.length}/{getCharacterCount('product')} {item.product.length >= getCharacterCount('product') && 'Limit'}
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: '500', height: '18px' }}>
                        {validationErrors[item.id]?.product && 'Required field'}
                      </div>
                    </div>
                  ) : (
                    <span>{item.product}</span>
                  )}
                </td>
                <td style={{ padding: '6px 12px', verticalAlign: 'middle' }}>
                  {editingItem === item.id ? (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <TextField
                          size="small"
                          style={{ flex: 1 }}
                          value={editValues.categoryFunction || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            const formattedValue = toTitleCase(value);
                            if (validateField('categoryFunction', formattedValue, true)) {
                              setEditValues({ ...editValues, categoryFunction: formattedValue });
                            }
                          }}
                          onPaste={(e) => {
                            e.preventDefault();
                            const pastedText = e.clipboardData.getData('text');
                            const currentValue = editValues.categoryFunction || '';
                            const maxLength = getCharacterCount('categoryFunction');
                            const remainingChars = maxLength - currentValue.length;
                            const textToAdd = pastedText.substring(0, remainingChars);
                            const newValue = currentValue + textToAdd;
                            const formattedValue = toTitleCase(newValue);
                            if (validateField('categoryFunction', formattedValue, true)) {
                              setEditValues({ ...editValues, categoryFunction: formattedValue });
                            }
                          }}
                          placeholder="Enter category/function"
                          variant="outlined"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              fontSize: '14px',
                              backgroundColor: 'white',
                            },
                          }}
                        />
                        <div style={{ fontSize: '12px', color: editValues.categoryFunction.length >= getCharacterCount('categoryFunction') ? '#ef4444' : '#6b7280', whiteSpace: 'nowrap' }}>
                          {editValues.categoryFunction.length}/{getCharacterCount('categoryFunction')} {editValues.categoryFunction.length >= getCharacterCount('categoryFunction') && 'Limit'}
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: '500', height: '18px' }}>
                        {editValidationErrors.categoryFunction && 'Required field'}
                      </div>
                    </div>
                  ) : !item.isSaved ? (
                    <div style={{ minHeight: '52px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <TextField
                          size="small"
                          style={{ flex: 1 }}
                          value={item.categoryFunction || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            const formattedValue = toTitleCase(value);
                            if (validateField('categoryFunction', formattedValue, true)) {
                              updateRow(index, 'categoryFunction', formattedValue);
                            }
                          }}
                          onPaste={(e) => {
                            e.preventDefault();
                            const pastedText = e.clipboardData.getData('text');
                            const currentValue = item.categoryFunction || '';
                            const maxLength = getCharacterCount('categoryFunction');
                            const remainingChars = maxLength - currentValue.length;
                            const textToAdd = pastedText.substring(0, remainingChars);
                            const newValue = currentValue + textToAdd;
                            const formattedValue = toTitleCase(newValue);
                            if (validateField('categoryFunction', formattedValue, true)) {
                              updateRow(index, 'categoryFunction', formattedValue);
                            }
                          }}
                          placeholder="Enter category/function"
                          variant="outlined"
                          error={validationErrors[item.id]?.categoryFunction}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              fontSize: '14px',
                              backgroundColor: 'white',
                            },
                          }}
                        />
                        <div style={{ fontSize: '12px', color: item.categoryFunction.length >= getCharacterCount('categoryFunction') ? '#ef4444' : '#6b7280', whiteSpace: 'nowrap' }}>
                          {item.categoryFunction.length}/{getCharacterCount('categoryFunction')} {item.categoryFunction.length >= getCharacterCount('categoryFunction') && 'Limit'}
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: '500', height: '18px' }}>
                        {validationErrors[item.id]?.categoryFunction && 'Required field'}
                      </div>
                    </div>
                  ) : (
                    <span>{item.categoryFunction}</span>
                  )}
                </td>
                <td style={{ padding: '6px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                  <div className="action-icons" style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
                    {editingItem === item.id ? (
                      <>
                        <button
                          className="action-btn save-btn"
                          onClick={() => handleSaveEdit(item.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981', padding: '4px' }}
                          title="Save"
                        >
                          <Save size={16} />
                        </button>
                        <button
                          className="action-btn cancel-btn"
                          onClick={handleCancelEdit}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '4px' }}
                          title="Cancel"
                        >
                          <X size={16} />
                        </button>
                      </>
                    ) : !item.isSaved ? (
                      <button
                        className="action-btn delete-btn"
                        onClick={() => handleDelete(item.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    ) : item.systemDefault && item.systemDefault.toLowerCase() === 'yes' ? (
                      // Don't show three-dot menu for system default records
                      <span></span>
                    ) : (
                      <div style={{ position: 'relative' }} ref={openMenuId === item.id ? menuRef : null}>
                        <button
                          className="action-btn menu-btn"
                          onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '4px' }}
                          title="Actions"
                        >
                          <MoreVertical size={18} />
                        </button>
                        {openMenuId === item.id && (
                          <div style={{
                            position: 'absolute',
                            right: '100%',
                            top: data.indexOf(item) >= data.length - 2 ? 'auto' : '50%',
                            bottom: data.indexOf(item) >= data.length - 2 ? '0' : 'auto',
                            transform: data.indexOf(item) >= data.length - 2 ? 'none' : 'translateY(-50%)',
                            backgroundColor: '#fff',
                            border: '1px solid #e0e0e0',
                            borderRadius: '4px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            zIndex: 1000,
                            minWidth: '120px',
                            marginRight: '8px',
                            whiteSpace: 'nowrap'
                          }}>
                            <button
                              onClick={() => {
                                handleEdit(item.id);
                                setOpenMenuId(null);
                              }}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: 'none',
                                background: 'none',
                                textAlign: 'left',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '14px',
                                color: '#333'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                            >
                              <Edit size={14} style={{ color: '#3b82f6' }} />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => {
                                handleDelete(item.id);
                                setOpenMenuId(null);
                              }}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: 'none',
                                background: 'none',
                                textAlign: 'left',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '14px',
                                color: '#333',
                                borderTop: '1px solid #e0e0e0'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                            >
                              <Trash2 size={14} style={{ color: '#ef4444' }} />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add New Third Party Button */}
      <div className="table-actions-bottom" style={{ display: 'flex', gap: '12px', marginTop: '16px', alignItems: 'center', marginLeft: '16px' }}>
        <button
          className="add-btn"
          style={{ width: '150px' }}
          onClick={handleAddThirdParty}
          disabled={loading}
        >
          {(() => {
            if (hasNewRow) return 'Save Third Party';
            return 'Add Third Party';
          })()}
        </button>
      </div>

      {/* Standardized Loading Overlay */}
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
      <SessionExpiredPopup />
    </div>
  );
};

export default ThirdPartyPackTable;
